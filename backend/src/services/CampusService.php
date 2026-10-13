<?php
declare(strict_types=1);

namespace CampusFest;

/** Business rules live here so HTTP and CLI clients share exactly one transaction model. */
class CampusService
{
    public function __construct(private JsonStore $store, private $clock = null) {}

    public function listPublicEvents(): array
    {
        $state = $this->store->read();
        $now = $this->now();
        $events = array_filter($state['events'], fn ($event) => in_array($event['status'], ['published', 'cancelled'], true));
        usort($events, fn ($a, $b) => strcmp($a['startAt'], $b['startAt']));
        return array_map(fn ($event) => $this->presentEvent($state, $event, $now), array_values($events));
    }

    public function getPublicEvent(string $slug): array
    {
        $state = $this->store->read();
        $event = $this->eventBySlug($state, $slug);
        return $this->presentEvent($state, $event, $this->now());
    }

    public function register(string $slug, array $input): array
    {
        return $this->store->transaction(function (array &$state) use ($slug, $input): array {
            $now = $this->now();
            $event = $this->eventBySlug($state, $slug);
            if (!$this->canRegister($event, $now)) {
                throw new DomainError('Registration is closed for this event.', 409, 'REGISTRATION_CLOSED');
            }
            $clean = Input::registration($input, $event);
            foreach ($state['registrations'] as $existing) {
                if ($existing['eventId'] !== $event['id'] || $existing['status'] === 'CANCELLED') {
                    continue;
                }
                foreach ($existing['members'] as $member) {
                    foreach ($clean['members'] as $index => $candidate) {
                        if (Input::studentKey($member['studentId']) === Input::studentKey($candidate['studentId']) ||
                            Input::emailKey($member['email']) === Input::emailKey($candidate['email'])) {
                            throw new DomainError('A participant is already in an active registration for this event.', 409, 'DUPLICATE_PARTICIPANT',
                                ["members.{$index}.studentId" => 'This student ID or email is already registered.']);
                        }
                    }
                }
            }
            $this->promote($state, $event, $now);
            $code = self::newManagementCode();
            do {
                $passId = 'CF-' . strtoupper(bin2hex(random_bytes(8)));
                $exists = false;
                foreach ($state['registrations'] as $existing) {
                    $exists = $exists || $existing['passId'] === $passId;
                }
            } while ($exists);
            $registration = [
                'passId' => $passId, 'eventId' => $event['id'], 'teamName' => $clean['teamName'],
                'status' => $this->confirmedCount($state, $event['id']) < $event['capacity'] ? 'CONFIRMED' : 'WAITLISTED',
                'sequence' => $state['nextRegistrationSequence']++, 'leaderId' => $clean['members'][0]['id'],
                'members' => $clean['members'], 'managementCodeHash' => hash('sha256', $code),
                'createdAt' => $now, 'cancelledAt' => null, 'cancellationReason' => null, 'promotedAt' => null,
            ];
            $state['registrations'][] = $registration;
            $this->audit($state, 'registration.created', 'student', $passId, $now);
            return $this->pair($state, $registration, $event, $now) + ['managementCode' => $code];
        });
    }

    public function lookup(string $passId, string $managementCode): array
    {
        $state = $this->store->read();
        $index = $this->privateRegistrationIndex($state, $passId, $managementCode);
        $registration = $state['registrations'][$index];
        return $this->pair($state, $registration, $this->eventById($state, $registration['eventId']), $this->now());
    }

    public function cancelPass(string $passId, string $managementCode): array
    {
        return $this->store->transaction(function (array &$state) use ($passId, $managementCode): array {
            $index = $this->privateRegistrationIndex($state, $passId, $managementCode);
            return $this->cancelAt($state, $index, 'student', $this->now());
        });
    }

    public function organizerEvents(string $ownerId): array
    {
        $state = $this->store->read();
        $now = $this->now();
        $events = array_values(array_filter($state['events'], fn ($event) => $event['ownerId'] === $ownerId));
        usort($events, fn ($a, $b) => strcmp($a['startAt'], $b['startAt']));
        return array_map(fn ($event) => $this->presentEvent($state, $event, $now), $events);
    }

    public function dashboard(string $ownerId): array
    {
        $events = $this->organizerEvents($ownerId);
        return ['stats' => ['events' => count($events), 'confirmed' => array_sum(array_column($events, 'confirmedCount')),
            'waitlisted' => array_sum(array_column($events, 'waitlistedCount')), 'participants' => array_sum(array_column($events, 'participantCount')),
            'checkedIn' => array_sum(array_column($events, 'checkedInCount'))], 'events' => $events];
    }

    public function saveEvent(string $ownerId, array $input, ?string $eventId = null): array
    {
        return $this->store->transaction(function (array &$state) use ($ownerId, $input, $eventId): array {
            $now = $this->now();
            $old = $eventId === null ? null : $this->ownedEvent($state, $ownerId, $eventId);
            if ($old !== null && in_array($old['status'], ['cancelled', 'archived'], true)) {
                throw new DomainError('Cancelled and archived events preserve their event details.', 409, 'EVENT_IMMUTABLE');
            }
            $event = Input::event($input);
            foreach ($state['events'] as $existing) {
                if ($existing['slug'] === $event['slug'] && $existing['id'] !== $eventId) {
                    throw new DomainError('That event slug is already in use.', 409, 'SLUG_TAKEN', ['slug' => 'Choose a unique slug.']);
                }
            }
            if ($old !== null) {
                if ($old['startAt'] <= $now && $event['startAt'] !== $old['startAt']) {
                    throw new DomainError('The start time of an event that has already started cannot be changed.', 409, 'EVENT_STARTED');
                }
                if ($event['capacity'] < $this->confirmedCount($state, $eventId)) {
                    throw new DomainError('Capacity cannot be lower than confirmed registration units.', 409, 'CAPACITY_TOO_LOW', ['capacity' => 'Cancel eligible registrations before reducing capacity.']);
                }
                foreach ($state['registrations'] as $registration) {
                    if ($registration['eventId'] !== $eventId) {
                        continue;
                    }
                    if ($event['mode'] !== $old['mode'] || count($registration['members']) < $event['minTeamSize'] || count($registration['members']) > $event['maxTeamSize']) {
                        throw new DomainError('Mode and team limits must remain compatible with all registration history.', 409, 'REGISTRATION_HISTORY_CONFLICT');
                    }
                }
                $event += ['id' => $old['id'], 'ownerId' => $ownerId, 'status' => $old['status'], 'registrationsEnabled' => $old['registrationsEnabled']];
                foreach ($state['events'] as $index => $existing) {
                    if ($existing['id'] === $eventId) {
                        $state['events'][$index] = $event;
                        break;
                    }
                }
                $this->promote($state, $event, $now);
            } else {
                $event += ['id' => 'EVT-' . strtoupper(bin2hex(random_bytes(8))), 'ownerId' => $ownerId, 'status' => 'draft', 'registrationsEnabled' => true];
                $state['events'][] = $event;
            }
            $this->audit($state, $old ? 'event.updated' : 'event.created', $ownerId, $event['id'], $now);
            return $this->presentEvent($state, $event, $now);
        });
    }

    public function eventAction(string $ownerId, string $eventId, string $action, string $reason = ''): array
    {
        return $this->store->transaction(function (array &$state) use ($ownerId, $eventId, $action, $reason): array {
            $event = $this->ownedEvent($state, $ownerId, $eventId);
            $now = $this->now();
            switch ($action) {
                case 'publish':
                    if ($event['status'] !== 'draft' || $now >= $event['endAt']) {
                        throw new DomainError('Only a draft event that has not ended can be published.', 409, 'INVALID_EVENT_ACTION');
                    }
                    $event['status'] = 'published';
                    break;
                case 'close':
                case 'reopen':
                    if ($event['status'] !== 'published' || ($action === 'reopen' && $now >= $event['startAt'])) {
                        throw new DomainError('This event cannot change registration availability now.', 409, 'INVALID_EVENT_ACTION');
                    }
                    $event['registrationsEnabled'] = $action === 'reopen';
                    break;
                case 'cancel':
                    if ($event['status'] === 'archived') {
                        throw new DomainError('Archived events cannot be cancelled.', 409, 'INVALID_EVENT_ACTION');
                    }
                    if ($event['status'] !== 'cancelled') {
                        $reason = trim($reason);
                        if ($reason === '' || strlen($reason) > 500) {
                            Input::invalid('reason', 'Give an event cancellation reason of 1–500 characters.');
                        }
                        $event['status'] = 'cancelled';
                        $event['registrationsEnabled'] = false;
                        $event['cancellationReason'] = $reason;
                        $event['cancelledAt'] = $now;
                        foreach ($state['registrations'] as &$registration) {
                            if ($registration['eventId'] === $eventId && $registration['status'] !== 'CANCELLED') {
                                $registration['status'] = 'CANCELLED';
                                $registration['cancelledAt'] = $now;
                                $registration['cancellationReason'] = 'Event cancelled: ' . $reason;
                            }
                        }
                        unset($registration);
                    }
                    break;
                case 'archive':
                    if ($event['status'] !== 'cancelled' && $now < $event['endAt']) {
                        throw new DomainError('Only ended or cancelled events can be archived.', 409, 'INVALID_EVENT_ACTION');
                    }
                    $event['status'] = 'archived';
                    $event['registrationsEnabled'] = false;
                    break;
                default:
                    Input::invalid('action', 'Choose a supported event action.');
            }
            foreach ($state['events'] as $index => $existing) {
                if ($existing['id'] === $eventId) {
                    $state['events'][$index] = $event;
                    break;
                }
            }
            // Closing new entries does not freeze pre-start FIFO promotions.
            $this->promote($state, $event, $now);
            $this->audit($state, 'event.' . $action, $ownerId, $eventId, $now);
            return $this->presentEvent($state, $event, $now);
        });
    }

    public function roster(string $ownerId, string $eventId, array $filters = []): array
    {
        $state = $this->store->read();
        $event = $this->ownedEvent($state, $ownerId, $eventId);
        $filters = $this->filters($filters);
        $registrations = array_filter($state['registrations'], fn ($registration) => $registration['eventId'] === $eventId && $this->matches($registration, $filters));
        usort($registrations, fn ($a, $b) => $a['sequence'] <=> $b['sequence']);
        return ['event' => $this->presentEvent($state, $event, $this->now()),
            'registrations' => array_map(fn ($registration) => $this->presentRegistration($state, $registration), array_values($registrations))];
    }

    public function cancelRegistration(string $ownerId, string $passId): array
    {
        return $this->store->transaction(function (array &$state) use ($ownerId, $passId): array {
            $index = $this->registrationIndex($state, $passId);
            $this->ownedEvent($state, $ownerId, $state['registrations'][$index]['eventId']);
            return $this->cancelAt($state, $index, $ownerId, $this->now());
        });
    }

    public function rotateCode(string $ownerId, string $passId, mixed $verified): array
    {
        return $this->store->transaction(function (array &$state) use ($ownerId, $passId, $verified): array {
            $index = $this->registrationIndex($state, $passId);
            $this->ownedEvent($state, $ownerId, $state['registrations'][$index]['eventId']);
            if ($verified !== true) {
                Input::invalid('verified', 'Confirm that you verified the participant in person.');
            }
            $code = self::newManagementCode();
            $state['registrations'][$index]['managementCodeHash'] = hash('sha256', $code);
            $this->audit($state, 'registration.code_rotated', $ownerId, $passId, $this->now());
            return ['managementCode' => $code];
        });
    }

    public function attendance(string $ownerId, string $passId, string $memberId, bool $undo = false): array
    {
        return $this->store->transaction(function (array &$state) use ($ownerId, $passId, $memberId, $undo): array {
            $index = $this->registrationIndex($state, $passId);
            $event = $this->ownedEvent($state, $ownerId, $state['registrations'][$index]['eventId']);
            $now = $this->now();
            $registration = &$state['registrations'][$index];
            if (!$undo && ($event['status'] !== 'published' || $now < $event['startAt'] || $registration['status'] !== 'CONFIRMED')) {
                throw new DomainError('Check-in requires a confirmed registration in a published event that has started.', 409, 'ATTENDANCE_UNAVAILABLE');
            }
            foreach ($registration['members'] as &$member) {
                if ($member['id'] !== $memberId) {
                    continue;
                }
                if ($undo && $member['attendance'] !== null) {
                    $previous = $member['attendance'];
                    $member['attendance'] = null;
                    $this->audit($state, 'attendance.undone', $ownerId, $passId, $now, ['memberId' => $memberId, 'previous' => $previous]);
                } elseif (!$undo && $member['attendance'] === null) {
                    $member['attendance'] = ['at' => $now, 'organizerId' => $ownerId];
                    $this->audit($state, 'attendance.checked_in', $ownerId, $passId, $now, ['memberId' => $memberId]);
                }
                unset($member);
                return $this->pair($state, $registration, $event, $now);
            }
            unset($member);
            throw new DomainError('Participant not found in this registration.', 404, 'NOT_FOUND');
        });
    }

    public function exportCsv(string $ownerId, string $eventId, array $filters = []): string
    {
        $roster = $this->roster($ownerId, $eventId, $filters);
        $handle = fopen('php://temp', 'w+b');
        if ($handle === false) {
            throw new DomainError('The export could not be prepared.', 503, 'EXPORT_UNAVAILABLE');
        }
        $columns = ['Event', 'Pass ID', 'Registration status', 'Team name', 'Participant name', 'Student ID', 'Email',
            'Department', 'Year', 'Registered at (UTC)', 'Attendance', 'Checked in at (UTC)'];
        fputcsv($handle, $columns, ',', '"', '', "\r\n");
        foreach ($roster['registrations'] as $registration) {
            foreach ($registration['members'] as $member) {
                $row = [$roster['event']['title'], $registration['passId'], $registration['status'], $registration['teamName'],
                    $member['name'], $member['studentId'], $member['email'], $member['department'], (string) $member['year'],
                    $registration['createdAt'], $member['attendance'] ? 'Checked in' : 'Not checked in', $member['attendance']['at'] ?? ''];
                fputcsv($handle, array_map(self::csvSafe(...), $row), ',', '"', '', "\r\n");
            }
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);
        if ($csv === false) {
            throw new DomainError('The export could not be prepared.', 503, 'EXPORT_UNAVAILABLE');
        }
        return $csv;
    }

    private function cancelAt(array &$state, int $index, string $actor, string $now): array
    {
        $registration = $state['registrations'][$index];
        $event = $this->eventById($state, $registration['eventId']);
        if ($registration['status'] === 'CANCELLED') {
            return $this->pair($state, $registration, $event, $now);
        }
        if ($now >= $event['startAt']) {
            throw new DomainError('Registration cancellation is only available before the event starts.', 409, 'CANCELLATION_CLOSED');
        }
        foreach ($registration['members'] as $member) {
            if ($member['attendance'] !== null) {
                throw new DomainError('A registration with attendance records cannot be cancelled individually.', 409, 'ATTENDANCE_EXISTS');
            }
        }
        $registration['status'] = 'CANCELLED';
        $registration['cancelledAt'] = $now;
        $registration['cancellationReason'] = $actor === 'student' ? 'Cancelled by participant' : 'Cancelled by organizer';
        $state['registrations'][$index] = $registration;
        $this->audit($state, 'registration.cancelled', $actor, $registration['passId'], $now);
        $this->promote($state, $event, $now);
        return $this->pair($state, $registration, $event, $now);
    }

    private function promote(array &$state, array $event, string $now): void
    {
        if ($event['status'] !== 'published' || $now >= $event['startAt']) {
            return;
        }
        $available = $event['capacity'] - $this->confirmedCount($state, $event['id']);
        if ($available <= 0) {
            return;
        }
        $queue = [];
        foreach ($state['registrations'] as $index => $registration) {
            if ($registration['eventId'] === $event['id'] && $registration['status'] === 'WAITLISTED') {
                $queue[$index] = $registration['sequence'];
            }
        }
        asort($queue, SORT_NUMERIC);
        foreach ($queue as $index => $sequence) {
            if ($available-- <= 0) {
                break;
            }
            $state['registrations'][$index]['status'] = 'CONFIRMED';
            $state['registrations'][$index]['promotedAt'] = $now;
            $this->audit($state, 'registration.promoted', 'system', $state['registrations'][$index]['passId'], $now);
        }
    }

    private function presentEvent(array $state, array $event, string $now): array
    {
        $confirmed = $waitlisted = $participants = $checkedIn = 0;
        foreach ($state['registrations'] as $registration) {
            if ($registration['eventId'] !== $event['id']) {
                continue;
            }
            $confirmed += (int) ($registration['status'] === 'CONFIRMED');
            $waitlisted += (int) ($registration['status'] === 'WAITLISTED');
            if ($registration['status'] !== 'CANCELLED') {
                $participants += count($registration['members']);
            }
            foreach ($registration['members'] as $member) {
                $checkedIn += (int) ($member['attendance'] !== null);
            }
        }
        $canRegister = $this->canRegister($event, $now);
        return $event + ['confirmedCount' => $confirmed, 'waitlistedCount' => $waitlisted, 'participantCount' => $participants,
            'checkedInCount' => $checkedIn, 'availableUnits' => max(0, $event['capacity'] - $confirmed),
            'unit' => $event['mode'] === 'TEAM' ? 'teams' : 'seats',
            'phase' => $now < $event['startAt'] ? 'upcoming' : ($now < $event['endAt'] ? 'ongoing' : 'completed'),
            'canRegister' => $canRegister, 'availability' => !$canRegister ? 'closed' : ($confirmed >= $event['capacity'] ? 'waitlist' : 'available'), 'serverNow' => $now];
    }

    private function presentRegistration(array $state, array $registration): array
    {
        $position = null;
        if ($registration['status'] === 'WAITLISTED') {
            $position = 1;
            foreach ($state['registrations'] as $other) {
                if ($other['eventId'] === $registration['eventId'] && $other['status'] === 'WAITLISTED' && $other['sequence'] < $registration['sequence']) {
                    $position++;
                }
            }
        }
        unset($registration['managementCodeHash']);
        return $registration + ['waitlistPosition' => $position];
    }

    private function pair(array $state, array $registration, array $event, string $now): array
    {
        return ['registration' => $this->presentRegistration($state, $registration), 'event' => $this->presentEvent($state, $event, $now)];
    }

    private function canRegister(array $event, string $now): bool
    {
        return $event['status'] === 'published' && $event['registrationsEnabled'] === true &&
            $now >= $event['registrationOpensAt'] && $now < $event['registrationDeadline'] && $now < $event['startAt'];
    }

    private function eventBySlug(array $state, string $slug): array
    {
        foreach ($state['events'] as $event) {
            if ($event['slug'] === $slug && in_array($event['status'], ['published', 'cancelled'], true)) {
                return $event;
            }
        }
        throw new DomainError('Event not found.', 404, 'NOT_FOUND');
    }

    private function eventById(array $state, string $id): array
    {
        foreach ($state['events'] as $event) {
            if ($event['id'] === $id) {
                return $event;
            }
        }
        throw new DomainError('Event not found.', 404, 'NOT_FOUND');
    }

    private function ownedEvent(array $state, string $ownerId, string $eventId): array
    {
        $event = $this->eventById($state, $eventId);
        if ($event['ownerId'] !== $ownerId) {
            throw new DomainError('Event not found.', 404, 'NOT_FOUND');
        }
        return $event;
    }

    private function registrationIndex(array $state, string $passId): int
    {
        foreach ($state['registrations'] as $index => $registration) {
            if ($registration['passId'] === strtoupper(trim($passId))) {
                return $index;
            }
        }
        throw new DomainError('Registration not found.', 404, 'NOT_FOUND');
    }

    private function privateRegistrationIndex(array $state, string $passId, string $code): int
    {
        $index = null;
        foreach ($state['registrations'] as $candidate => $registration) {
            if ($registration['passId'] === strtoupper(trim($passId))) {
                $index = $candidate;
                break;
            }
        }
        $stored = $index === null ? str_repeat('0', 64) : $state['registrations'][$index]['managementCodeHash'];
        $matches = hash_equals($stored, hash('sha256', $code));
        if ($index === null || !$matches || strlen($code) > 200) {
            throw new DomainError('The registration ID and management code do not match.', 404, 'PASS_NOT_FOUND');
        }
        return $index;
    }

    private function confirmedCount(array $state, string $eventId): int
    {
        return count(array_filter($state['registrations'], fn ($registration) => $registration['eventId'] === $eventId && $registration['status'] === 'CONFIRMED'));
    }

    private function filters(array $filters): array
    {
        $search = Input::text($filters, 'search', 200, false);
        $status = $filters['status'] ?? '';
        $attendance = $filters['attendance'] ?? 'any';
        if (!in_array($status, ['', 'all', 'CONFIRMED', 'WAITLISTED', 'CANCELLED'], true)) {
            Input::invalid('status', 'Choose a valid registration status.');
        }
        if (!in_array($attendance, ['', 'any', 'checked-in', 'not-checked-in'], true)) {
            Input::invalid('attendance', 'Choose a valid attendance filter.');
        }
        return ['search' => strtolower($search), 'status' => $status, 'attendance' => $attendance];
    }

    private function matches(array $registration, array $filters): bool
    {
        if (!in_array($filters['status'], ['', 'all'], true) && $registration['status'] !== $filters['status']) {
            return false;
        }
        $searchMatches = $filters['search'] === '' || str_contains(strtolower($registration['passId'] . ' ' . $registration['teamName']), $filters['search']);
        $attendanceMatches = in_array($filters['attendance'], ['', 'any'], true);
        foreach ($registration['members'] as $member) {
            $searchMatches = $searchMatches || str_contains(strtolower($member['name'] . ' ' . $member['studentId'] . ' ' . $member['email'] . ' ' . $member['department']), $filters['search']);
            $attendanceMatches = $attendanceMatches || ($filters['attendance'] === 'checked-in' && $member['attendance'] !== null) ||
                ($filters['attendance'] === 'not-checked-in' && $member['attendance'] === null);
        }
        return $searchMatches && $attendanceMatches;
    }

    private function audit(array &$state, string $action, string $actor, string $target, string $now, array $details = []): void
    {
        $state['auditLog'][] = ['at' => $now, 'action' => $action, 'actor' => $actor, 'target' => $target, 'details' => $details];
        $state['auditLog'] = array_slice($state['auditLog'], -1000);
    }

    private static function newManagementCode(): string { return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '='); }

    private static function csvSafe(string $value): string
    {
        // Spaces/control characters can precede formulas in spreadsheet applications.
        return preg_match('/^[\x00-\x20]*[=+@-]|^[\t\r\n]/', $value) ? "'" . $value : $value;
    }

    private function now(): string
    {
        $now = $this->clock === null ? new \DateTimeImmutable('now', new \DateTimeZone('UTC')) : ($this->clock)();
        if (!$now instanceof \DateTimeImmutable) {
            throw new \LogicException('The clock must return DateTimeImmutable.');
        }
        return $now->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    }
}
