<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';

use CampusFest\CampusService;
use CampusFest\DemoSeed;
use CampusFest\JsonStore;

$assertions = 0;
$failures = 0;
$tests = [];

$tests['solo registration, private credentials, and durable restart'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture();
    try {
        $result = $service->register('test-studio', registrationInput(1));
        same('CONFIRMED', $result['registration']['status'], 'First participant confirms');
        same('', $result['registration']['teamName'], 'Solo has no team name');
        same(43, strlen($result['managementCode']), 'Code carries 32 random bytes');
        same(false, isset($result['registration']['managementCodeHash']), 'No secret hash returned');
        same(false, str_contains(json_encode($service->listPublicEvents()), 'student1@'), 'Public events contain no member data');
        same(false, str_contains(file_get_contents($directory . '/state.json'), $result['managementCode']), 'Raw management code is never stored');
        expectError('PASS_NOT_FOUND', fn () => $service->lookup($result['registration']['passId'], 'wrong'));
        expectError('PASS_NOT_FOUND', fn () => $service->lookup('CF-MISSING', $result['managementCode']));
        $restarted = new CampusService(new JsonStore($directory), $clock);
        same($result['registration']['passId'], $restarted->lookup($result['registration']['passId'], $result['managementCode'])['registration']['passId'], 'Restart reads same state');
        $rotated = $service->rotateCode('owner', $result['registration']['passId'], true);
        expectError('PASS_NOT_FOUND', fn () => $service->lookup($result['registration']['passId'], $result['managementCode']));
        same('CONFIRMED', $service->lookup($result['registration']['passId'], $rotated['managementCode'])['registration']['status'], 'Rotated code works');
        expectError('VALIDATION_ERROR', fn () => $service->rotateCode('owner', $result['registration']['passId'], false));
    } finally { removeTestDirectory($directory); }
};

$tests['team capacity counts teams and validates leader and participant duplicates'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture(['mode' => 'TEAM', 'minTeamSize' => 2, 'maxTeamSize' => 3]);
    try {
        expectError('VALIDATION_ERROR', fn () => $service->register('test-studio', registrationInput(1)));
        expectError('VALIDATION_ERROR', fn () => $service->register('test-studio', registrationInput(1, [person(1), person(2), person(3), person(4)])));
        expectError('VALIDATION_ERROR', fn () => $service->register('test-studio', registrationInput(1, [person(1), person(2, ['studentId' => ' s- 1 '])])));
        expectError('VALIDATION_ERROR', fn () => $service->register('test-studio', registrationInput(1, [person(1), person(2, ['email' => 'STUDENT1@EXAMPLE.EDU'])])));
        $one = $service->register('test-studio', registrationInput(1, [person(1), person(2), person(3)]));
        same($one['registration']['members'][0]['id'], $one['registration']['leaderId'], 'Leader represented once as first member');
        same(3, count($one['registration']['members']), 'Leader included in size');
        $service->register('test-studio', registrationInput(4, [person(4), person(5)]));
        $three = $service->register('test-studio', registrationInput(6, [person(6), person(7)]));
        same('WAITLISTED', $three['registration']['status'], 'Third team queues');
        same(2, $three['event']['confirmedCount'], 'Two confirmed team units');
        same(7, $three['event']['participantCount'], 'Seven active people across three teams');
        same('teams', $three['event']['unit'], 'Team capacity label');
        expectError('DUPLICATE_PARTICIPANT', fn () => $service->register('test-studio', registrationInput(8, [person(8), person(9, ['studentId' => 's-6'])])));
        expectError('DUPLICATE_PARTICIPANT', fn () => $service->register('test-studio', registrationInput(8, [person(8), person(9, ['email' => 'STUDENT3@example.edu'])])));
        expectError('REGISTRATION_HISTORY_CONFLICT', fn () => $service->saveEvent('owner', eventInput(), $event['id']));
        expectError('REGISTRATION_HISTORY_CONFLICT', fn () => $service->saveEvent('owner', eventInput(['mode' => 'TEAM', 'minTeamSize' => 2, 'maxTeamSize' => 2]), $event['id']));
    } finally { removeTestDirectory($directory); }
};

$tests['two-seat FIFO, cancellation idempotence, and fresh re-registration priority'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture();
    try {
        $a = $service->register('test-studio', registrationInput(1));
        $b = $service->register('test-studio', registrationInput(2));
        $c = $service->register('test-studio', registrationInput(3));
        $d = $service->register('test-studio', registrationInput(4));
        same(['CONFIRMED', 'CONFIRMED', 'WAITLISTED', 'WAITLISTED'], array_map(fn ($row) => $row['registration']['status'], [$a, $b, $c, $d]), 'Capacity two statuses');
        same(1, $c['registration']['waitlistPosition'], 'C first');
        same(2, $d['registration']['waitlistPosition'], 'D second');
        $service->cancelPass($a['registration']['passId'], $a['managementCode']);
        same('CONFIRMED', $service->lookup($c['registration']['passId'], $c['managementCode'])['registration']['status'], 'C promoted');
        same(1, $service->lookup($d['registration']['passId'], $d['managementCode'])['registration']['waitlistPosition'], 'D now first');
        $auditCount = count($store->read()['auditLog']);
        $service->cancelPass($a['registration']['passId'], $a['managementCode']);
        same($auditCount, count($store->read()['auditLog']), 'Repeated cancellation does not promote or audit again');
        $again = $service->register('test-studio', registrationInput(1));
        same(2, $again['registration']['waitlistPosition'], 'Re-registration takes fresh tail priority');
        same(true, $again['registration']['passId'] !== $a['registration']['passId'], 'Fresh public pass');
        same(true, $again['registration']['sequence'] > $d['registration']['sequence'], 'Monotonic fresh sequence');
        $service->cancelPass($d['registration']['passId'], $d['managementCode']);
        same(2, $service->getPublicEvent('test-studio')['confirmedCount'], 'Waitlist cancellation consumes no seat');
        same(1, $service->lookup($again['registration']['passId'], $again['managementCode'])['registration']['waitlistPosition'], 'Queue positions close gap');
    } finally { removeTestDirectory($directory); }
};

$tests['capacity edits fill FIFO and never reduce below occupancy'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture();
    try {
        $rows = [];
        foreach (range(1, 5) as $n) { $rows[] = $service->register('test-studio', registrationInput($n)); }
        expectError('CAPACITY_TOO_LOW', fn () => $service->saveEvent('owner', eventInput(['capacity' => 1]), $event['id']));
        $changed = $service->saveEvent('owner', eventInput(['capacity' => 4]), $event['id']);
        same(4, $changed['confirmedCount'], 'All two available units filled');
        same('CONFIRMED', $service->lookup($rows[2]['registration']['passId'], $rows[2]['managementCode'])['registration']['status'], 'Oldest queued admitted');
        same('CONFIRMED', $service->lookup($rows[3]['registration']['passId'], $rows[3]['managementCode'])['registration']['status'], 'Next queued admitted');
        same(1, $service->lookup($rows[4]['registration']['passId'], $rows[4]['managementCode'])['registration']['waitlistPosition'], 'Final queued remains first');
    } finally { removeTestDirectory($directory); }
};

$tests['registration window boundaries and promotion after closure or deadline'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture(['capacity' => 1]);
    try {
        $clock->value = '2030-10-10T09:59:59Z';
        expectError('REGISTRATION_CLOSED', fn () => $service->register('test-studio', registrationInput(1)));
        $clock->value = '2030-10-10T10:00:00Z';
        $a = $service->register('test-studio', registrationInput(1));
        $b = $service->register('test-studio', registrationInput(2));
        $c = $service->register('test-studio', registrationInput(3));
        $service->eventAction('owner', $event['id'], 'close');
        expectError('REGISTRATION_CLOSED', fn () => $service->register('test-studio', registrationInput(4)));
        $service->cancelPass($a['registration']['passId'], $a['managementCode']);
        same('CONFIRMED', $service->lookup($b['registration']['passId'], $b['managementCode'])['registration']['status'], 'Closing does not freeze promotions');
        $service->eventAction('owner', $event['id'], 'reopen');
        $clock->value = '2030-10-13T10:00:00Z';
        expectError('REGISTRATION_CLOSED', fn () => $service->register('test-studio', registrationInput(4)));
        $service->cancelPass($b['registration']['passId'], $b['managementCode']);
        same('CONFIRMED', $service->lookup($c['registration']['passId'], $c['managementCode'])['registration']['status'], 'Deadline does not freeze pre-start promotions');
    } finally { removeTestDirectory($directory); }
};

$tests['event start blocks cancellations and promotions without mutating GET'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture(['capacity' => 1]);
    try {
        $a = $service->register('test-studio', registrationInput(1));
        $b = $service->register('test-studio', registrationInput(2));
        $clock->value = '2030-10-14T10:00:00Z';
        expectError('CANCELLATION_CLOSED', fn () => $service->cancelPass($a['registration']['passId'], $a['managementCode']));
        expectError('CANCELLATION_CLOSED', fn () => $service->cancelRegistration('owner', $a['registration']['passId']));
        $service->saveEvent('owner', eventInput(['capacity' => 2]), $event['id']);
        same('WAITLISTED', $service->lookup($b['registration']['passId'], $b['managementCode'])['registration']['status'], 'No post-start promotion');
        $before = file_get_contents($directory . '/state.json');
        $service->listPublicEvents(); $service->roster('owner', $event['id']); $service->dashboard('owner');
        same($before, file_get_contents($directory . '/state.json'), 'Reads never mutate state');
        expectError('EVENT_STARTED', fn () => $service->saveEvent('owner', eventInput(['startAt' => '2030-10-15T10:00:00Z', 'endAt' => '2030-10-15T12:00:00Z']), $event['id']));
    } finally { removeTestDirectory($directory); }
};

$tests['attendance is per member, idempotent, audited, and preserves cancelled event history'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture(['mode' => 'TEAM', 'minTeamSize' => 2, 'maxTeamSize' => 2, 'capacity' => 1]);
    try {
        $a = $service->register('test-studio', registrationInput(1, [person(1), person(2)]));
        $b = $service->register('test-studio', registrationInput(3, [person(3), person(4)]));
        $pass = $a['registration']['passId']; $member = $a['registration']['members'][1]['id'];
        expectError('ATTENDANCE_UNAVAILABLE', fn () => $service->attendance('owner', $pass, $member));
        $clock->value = '2030-10-14T10:00:00Z';
        $first = $service->attendance('owner', $pass, $member);
        same(1, $first['event']['checkedInCount'], 'One member checked in');
        same('owner', $first['registration']['members'][1]['attendance']['organizerId'], 'Recorder saved');
        $auditCount = count($store->read()['auditLog']);
        $second = $service->attendance('owner', $pass, $member);
        same($first, $second, 'Repeated check-in harmless');
        same($auditCount, count($store->read()['auditLog']), 'Repeated check-in not duplicated');
        expectError('ATTENDANCE_UNAVAILABLE', fn () => $service->attendance('owner', $b['registration']['passId'], $b['registration']['members'][0]['id']));
        $undo = $service->attendance('owner', $pass, $member, true);
        same(0, $undo['event']['checkedInCount'], 'Undo clears attendance');
        same('attendance.undone', $store->read()['auditLog'][array_key_last($store->read()['auditLog'])]['action'], 'Undo audited');
        $service->attendance('owner', $pass, $member);
        $cancelled = $service->eventAction('owner', $event['id'], 'cancel', 'Demo weather closure');
        same(0, $cancelled['confirmedCount'], 'Event cancellation cancels confirmed units');
        same(0, $cancelled['waitlistedCount'], 'Event cancellation cancels queue without promotions');
        same(1, $cancelled['checkedInCount'], 'Attendance history preserved');
        same('CANCELLED', $service->lookup($b['registration']['passId'], $b['managementCode'])['registration']['status'], 'Queued pass cancelled');
        expectError('ATTENDANCE_UNAVAILABLE', fn () => $service->attendance('owner', $pass, $member));
        $service->eventAction('owner', $event['id'], 'archive');
        expectError('NOT_FOUND', fn () => $service->getPublicEvent('test-studio'));
        same('archived', $service->lookup($pass, $a['managementCode'])['event']['status'], 'Private history remains accessible');
    } finally { removeTestDirectory($directory); }
};

$tests['ownership enforced on every domain operation'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture();
    try {
        $a = $service->register('test-studio', registrationInput(1));
        $pass = $a['registration']['passId'];
        expectError('NOT_FOUND', fn () => $service->saveEvent('intruder', eventInput(), $event['id']));
        expectError('NOT_FOUND', fn () => $service->eventAction('intruder', $event['id'], 'cancel', 'Bad request'));
        expectError('NOT_FOUND', fn () => $service->roster('intruder', $event['id']));
        expectError('NOT_FOUND', fn () => $service->cancelRegistration('intruder', $pass));
        expectError('NOT_FOUND', fn () => $service->rotateCode('intruder', $pass, true));
        expectError('NOT_FOUND', fn () => $service->attendance('intruder', $pass, $a['registration']['members'][0]['id']));
        expectError('NOT_FOUND', fn () => $service->exportCsv('intruder', $event['id']));
        same(0, $service->dashboard('intruder')['stats']['events'], 'Dashboard only owns own events');
        $forged = $service->saveEvent('owner', eventInput(['slug' => 'forged', 'ownerId' => 'intruder', 'status' => 'published', 'confirmedCount' => 100]));
        same('owner', $forged['ownerId'], 'Client owner ignored');
        same('draft', $forged['status'], 'Client published state ignored');
        same(0, $forged['confirmedCount'], 'Client counts ignored');
    } finally { removeTestDirectory($directory); }
};

$tests['schedule, JSON types, lifecycle, and approved local image validation'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture();
    try {
        expectError('VALIDATION_ERROR', fn () => $service->saveEvent('owner', eventInput(['slug' => 'bad', 'capacity' => '2'])));
        expectError('VALIDATION_ERROR', fn () => $service->saveEvent('owner', eventInput(['slug' => 'bad', 'image' => 'https://example.com/pic.jpg'])));
        expectError('VALIDATION_ERROR', fn () => $service->saveEvent('owner', eventInput(['slug' => 'bad', 'registrationDeadline' => '2030-10-14T11:00:00Z'])));
        expectError('VALIDATION_ERROR', fn () => $service->saveEvent('owner', eventInput(['slug' => 'bad', 'startAt' => '2030-02-30T10:00:00Z'])));
        expectError('SLUG_TAKEN', fn () => $service->saveEvent('owner', eventInput()));
        expectError('VALIDATION_ERROR', fn () => $service->register('test-studio', ['consent' => 'true', 'members' => [person(1)]]));
        expectError('VALIDATION_ERROR', fn () => $service->register('test-studio', registrationInput(1, [person(1, ['year' => '2'])])));
        expectError('INVALID_EVENT_ACTION', fn () => $service->eventAction('owner', $event['id'], 'archive'));
        $draft = $service->saveEvent('owner', eventInput(['slug' => 'draft']));
        expectError('NOT_FOUND', fn () => $service->register('draft', registrationInput(1)));
        same('published', $service->eventAction('owner', $draft['id'], 'publish')['status'], 'Publish draft');
        expectError('VALIDATION_ERROR', fn () => $service->eventAction('owner', $event['id'], 'cancel', ''));
    } finally { removeTestDirectory($directory); }
};

$tests['CSV quoting, formula defense, filters, and secret omission'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture();
    try {
        $a = $service->register('test-studio', registrationInput(1, [person(1, ['name' => '=SUM(1,2)', 'department' => "Creative, \"Media\"\nStudio"])]));
        $service->register('test-studio', registrationInput(2, [person(2, ['name' => ' +FORMULA'])]));
        $csv = $service->exportCsv('owner', $event['id']);
        $handle = fopen('php://temp', 'w+'); fwrite($handle, $csv); rewind($handle);
        $header = fgetcsv($handle, null, ',', '"', ''); $row = fgetcsv($handle, null, ',', '"', ''); $second = fgetcsv($handle, null, ',', '"', ''); fclose($handle);
        same(12, count($header), 'Twelve useful columns');
        same("'=SUM(1,2)", $row[4], 'Formula prefixed with apostrophe');
        same("Creative, \"Media\"\nStudio", $row[7], 'Comma quote newline round trip');
        same("'+FORMULA", $second[4], 'Plus formula protected');
        same(false, str_contains($csv, $a['managementCode']), 'Secret omitted');
        same(false, str_contains($csv, 'managementCodeHash'), 'Hash omitted');
        same(1, count($service->roster('owner', $event['id'], ['search' => 'student1@'])['registrations']), 'Search filter');
        same(0, count($service->roster('owner', $event['id'], ['status' => 'WAITLISTED'])['registrations']), 'Status filter');
        same(0, count($service->roster('owner', $event['id'], ['attendance' => 'checked-in'])['registrations']), 'Attendance filter');
        $service->cancelPass($a['registration']['passId'], $a['managementCode']);
        same(1, count($service->roster('owner', $event['id'], ['status' => 'CANCELLED'])['registrations']), 'Cancelled remains exportable');
    } finally { removeTestDirectory($directory); }
};

$tests['malformed/missing storage and failed commit preserve canonical state'] = static function (): void {
    $directory = testDirectory('domain');
    try {
        expectError('STORAGE_UNSAFE', fn () => (new JsonStore(dirname(__DIR__) . '/public'))->read());
        $store = new JsonStore($directory);
        expectError('STORAGE_UNAVAILABLE', fn () => $store->read());
        $store->initialize(JsonStore::emptyState());
        expectError('ALREADY_INITIALIZED', fn () => $store->initialize(JsonStore::emptyState()));
        $before = file_get_contents($directory . '/state.json');
        $fault = new JsonStore($directory, static function (): void { throw new RuntimeException('Injected replacement failure'); });
        try { $fault->transaction(static function (array &$state): void { $state['nextRegistrationSequence'] = 99; }); throw new LogicException('Fault did not fire'); }
        catch (RuntimeException $error) { same('Injected replacement failure', $error->getMessage(), 'Fault triggered before replacement'); }
        same($before, file_get_contents($directory . '/state.json'), 'Previous valid state preserved after failed commit');
        same([], glob($directory . '/.state-*.tmp'), 'Incomplete temporary files cleaned up');
        $replacementFailure = new JsonStore($directory, static function (string $temporary): void { unlink($temporary); });
        expectError('STORAGE_UNAVAILABLE', fn () => $replacementFailure->transaction(static function (array &$state): void { $state['nextRegistrationSequence'] = 100; }));
        same($before, file_get_contents($directory . '/state.json'), 'Actual rename failure preserves canonical file');
        file_put_contents($directory . '/state.json', '{broken');
        expectError('STORAGE_CORRUPT', fn () => $store->read());
        same('{broken', file_get_contents($directory . '/state.json'), 'Corrupt file not reset');
        file_put_contents($directory . '/state.json', '{}');
        expectError('STORAGE_CORRUPT', fn () => $store->read());
    } finally { removeTestDirectory($directory); }
};

$tests['audit history is bounded without exposing secrets'] = static function (): void {
    [$directory, $store, $clock, $service, $event] = fixture();
    try {
        $store->transaction(static function (array &$state): void {
            $state['auditLog'] = array_fill(0, 1000, ['at' => '2030-10-12T10:00:00Z', 'action' => 'test.fixture', 'actor' => 'test', 'target' => 'test', 'details' => []]);
        });
        $result = $service->register('test-studio', registrationInput(1));
        $audit = $store->read()['auditLog'];
        same(1000, count($audit), 'Audit retains at most 1000 entries');
        same('registration.created', $audit[999]['action'], 'Most recent event retained');
        same(false, str_contains(json_encode($audit), $result['managementCode']), 'No management secret in audit');
    } finally { removeTestDirectory($directory); }
};

$tests['relative demo seed includes real ownership and all demonstration states'] = static function (): void {
    $state = DemoSeed::build(new DateTimeImmutable('2030-10-12T10:00:00Z'));
    $events = array_column($state['events'], null, 'slug');
    same(2, count($state['organizers']), 'Two organizers');
    same(2, $events['two-seat-lab']['capacity'], 'Two-seat fixture');
    same(0, count(array_filter($state['registrations'], fn ($row) => $row['eventId'] === $events['two-seat-lab']['id'])), 'Two-seat starts empty');
    same('2030-10-14T10:00:00Z', $events['two-seat-lab']['startAt'], 'Dates relative to invocation');
    same('ORG-DEMO-TECH', $events['robo-rally']['ownerId'], 'Same demo organizer owns attendance fixture');
    same(true, password_verify('CampusFest!2026', $state['organizers'][0]['passwordHash']), 'Hashed demo password works');
    same(false, $events['lenscraft']['registrationsEnabled'], 'Closed event seeded');
    same('draft', $events['debate-arena']['status'], 'Draft seeded');
};

$tests['actual CLI setup, provisioning, password reset, and demo reset safeguards'] = static function (): void {
    $directory = testDirectory('domain-cli');
    $demoDirectory = testDirectory('domain-demo-cli');
    $run = static function (string $script, array $arguments, ?string $password = null): array {
        $environment = getenv();
        unset($environment['CAMPUSFEST_ORGANIZER_PASSWORD']);
        if ($password !== null) { $environment['CAMPUSFEST_ORGANIZER_PASSWORD'] = $password; }
        $process = proc_open([PHP_BINARY, dirname(__DIR__) . '/scripts/' . $script, ...$arguments],
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, dirname(__DIR__, 2), $environment, ['bypass_shell' => true]);
        if (!is_resource($process)) { throw new RuntimeException('Could not start CLI test.'); }
        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]); $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]);
        return [proc_close($process), $stdout, $stderr];
    };
    try {
        same(0, $run('setup.php', ['--storage=' . $directory])[0], 'Explicit empty setup succeeds');
        $store = new JsonStore($directory);
        same([], $store->read()['events'], 'Setup creates no demo events');
        same(1, $run('setup.php', ['--storage=' . $directory])[0], 'Second setup refuses overwrite');
        same(1, $run('seed.php', ['--storage=' . $directory, '--reset-demo'])[0], 'Demo reset refuses ordinary production state');
        same(0, $run('organizer.php', ['create', '--storage=' . $directory, '--email=new@example.edu', '--name=New organizer'], 'LocalOnly!Password1')[0], 'Organizer CLI creates account');
        $firstHash = $store->read()['organizers'][0]['passwordHash'];
        same(true, password_verify('LocalOnly!Password1', $firstHash), 'Provisioned password hashed');
        same(1, $run('organizer.php', ['create', '--storage=' . $directory, '--email=new@example.edu', '--name=Duplicate'], 'LocalOnly!Password1')[0], 'Duplicate organizer rejected');
        same(0, $run('organizer.php', ['reset-password', '--storage=' . $directory, '--email=new@example.edu'], 'LocalOnly!Password2')[0], 'Password reset CLI succeeds');
        $secondHash = $store->read()['organizers'][0]['passwordHash'];
        same(false, password_verify('LocalOnly!Password1', $secondHash), 'Old password invalidated');
        same(true, password_verify('LocalOnly!Password2', $secondHash), 'New password valid');
        same(false, $firstHash === $secondHash, 'Credential fingerprint changes');
        same(0, $run('seed.php', ['--storage=' . $demoDirectory])[0], 'Explicit demo seed succeeds');
        $demo = new JsonStore($demoDirectory);
        $original = $demo->read();
        same(1, $run('seed.php', ['--storage=' . $demoDirectory])[0], 'Demo seed refuses existing state by default');
        same($original, $demo->read(), 'Rejected seed preserves demo state');
        same(1, $run('seed.php', ['--storage=' . $demoDirectory, '--reset-demo=false'])[0], 'Misleading reset option rejected');
        same(0, $run('seed.php', ['--storage=' . $demoDirectory, '--reset-demo'])[0], 'Explicit marked demo reset succeeds');
        same(true, $demo->read()['demo'], 'Reset retains demo marker');
    } finally { removeTestDirectory($directory); removeTestDirectory($demoDirectory); }
};

foreach ($tests as $name => $run) {
    try { $run(); echo "PASS {$name}\n"; }
    catch (Throwable $error) { $failures++; fwrite(STDERR, "FAIL {$name}: {$error->getMessage()}\n{$error->getTraceAsString()}\n"); }
}
echo count($tests) . " domain scenarios, {$assertions} assertions, {$failures} failures.\n";
exit($failures > 0 ? 1 : 0);
