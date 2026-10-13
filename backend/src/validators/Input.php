<?php
declare(strict_types=1);

namespace CampusFest;

class Input
{
    public const IMAGES = ['/images/campus.jpg', '/images/code.jpg', '/images/stage.jpg', '/images/design.jpg'];

    public static function text(array $input, string $key, int $max, bool $required = true): string
    {
        $value = $input[$key] ?? '';
        if (!is_string($value) || strlen(trim($value)) > $max || ($required && trim($value) === '')) {
            self::invalid($key, $required ? "Enter a value of 1–{$max} characters." : "Use at most {$max} characters.");
        }
        return trim($value);
    }

    public static function integer(array $input, string $key, int $min, int $max): int
    {
        $value = $input[$key] ?? null;
        if (!is_int($value) || $value < $min || $value > $max) {
            self::invalid($key, "Enter a whole number from {$min} to {$max}.");
        }
        return $value;
    }

    public static function event(array $input): array
    {
        $event = [];
        foreach (['title' => 120, 'slug' => 100, 'category' => 50, 'description' => 6000,
            'rules' => 4000, 'venue' => 160, 'contact' => 200] as $key => $max) {
            $event[$key] = self::text($input, $key, $max, $key !== 'rules');
        }
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $event['slug'])) {
            self::invalid('slug', 'Use lowercase letters, numbers, and single hyphens.');
        }
        $event['image'] = self::text($input, 'image', 100);
        if (!in_array($event['image'], self::IMAGES, true)) {
            self::invalid('image', 'Choose one of the approved local images.');
        }
        foreach (['registrationOpensAt', 'registrationDeadline', 'startAt', 'endAt'] as $key) {
            $value = self::text($input, $key, 40);
            if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2})$/D', $value)) {
                self::invalid($key, 'Use a complete ISO 8601 date and time with a timezone.');
            }
            try {
                $date = new \DateTimeImmutable($value);
                $errors = \DateTimeImmutable::getLastErrors();
                if ($errors && ($errors['warning_count'] || $errors['error_count'])) {
                    self::invalid($key, 'Enter a valid date and time.');
                }
                $event[$key] = $date->setTimezone(new \DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
            } catch (\Exception) {
                self::invalid($key, 'Enter a valid date and time.');
            }
        }
        if (!($event['registrationOpensAt'] < $event['registrationDeadline'] &&
            $event['registrationDeadline'] <= $event['startAt'] && $event['startAt'] < $event['endAt'])) {
            self::invalid('registrationDeadline', 'Required order: registration opens < deadline ≤ event start < event end.');
        }
        $event['mode'] = $input['mode'] ?? null;
        if (!in_array($event['mode'], ['SOLO', 'TEAM'], true)) {
            self::invalid('mode', 'Choose SOLO or TEAM.');
        }
        $event['capacity'] = self::integer($input, 'capacity', 1, 100000);
        $event['minTeamSize'] = self::integer($input, 'minTeamSize', 1, 20);
        $event['maxTeamSize'] = self::integer($input, 'maxTeamSize', 1, 20);
        if ($event['minTeamSize'] > $event['maxTeamSize'] || ($event['mode'] === 'SOLO' &&
            ($event['minTeamSize'] !== 1 || $event['maxTeamSize'] !== 1))) {
            self::invalid('minTeamSize', 'Solo events require size 1; team minimum cannot exceed maximum.');
        }
        return $event;
    }

    public static function registration(array $input, array $event): array
    {
        if (($input['consent'] ?? null) !== true) {
            self::invalid('consent', 'Confirm that the details are correct and you have permission to submit them.');
        }
        $teamName = self::text($input, 'teamName', 100, $event['mode'] === 'TEAM');
        $members = $input['members'] ?? null;
        if (!is_array($members) || !array_is_list($members) || count($members) < $event['minTeamSize'] || count($members) > $event['maxTeamSize']) {
            self::invalid('members', "Enter {$event['minTeamSize']}–{$event['maxTeamSize']} participants, including the leader once.");
        }
        $seenIds = $seenEmails = [];
        $clean = [];
        foreach ($members as $index => $member) {
            if (!is_array($member) || array_is_list($member)) {
                self::invalid("members.{$index}", 'Enter participant details.');
            }
            try {
                $row = [];
                foreach (['name' => 100, 'studentId' => 40, 'email' => 254, 'department' => 100] as $key => $max) {
                    $row[$key] = self::text($member, $key, $max);
                }
                if (!filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
                    self::invalid('email', 'Enter a valid email address.');
                }
                if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/D', $row['studentId'])) {
                    self::invalid('studentId', 'Use letters, numbers, spaces, dots, hyphens, or underscores.');
                }
                $row['year'] = self::integer($member, 'year', 1, 8);
                $normalizedId = self::studentKey($row['studentId']);
                $normalizedEmail = self::emailKey($row['email']);
                if (isset($seenIds[$normalizedId]) || isset($seenEmails[$normalizedEmail])) {
                    self::invalid('studentId', 'Each participant must have a different student ID and email.');
                }
                $seenIds[$normalizedId] = $seenEmails[$normalizedEmail] = true;
                $row['id'] = 'MEM-' . strtoupper(bin2hex(random_bytes(8)));
                $row['attendance'] = null;
                $clean[] = $row;
            } catch (DomainError $error) {
                $fields = [];
                foreach ($error->fieldErrors as $key => $message) {
                    $fields["members.{$index}.{$key}"] = $message;
                }
                throw new DomainError($error->getMessage(), $error->status, $error->errorCode, $fields);
            }
        }
        return ['teamName' => $event['mode'] === 'SOLO' ? '' : $teamName, 'members' => $clean];
    }

    public static function studentKey(string $value): string { return strtoupper(preg_replace('/\s+/', '', trim($value))); }
    public static function emailKey(string $value): string { return strtolower(trim($value)); }

    public static function invalid(string $key, string $message): never
    {
        throw new DomainError('Please check the highlighted fields.', 422, 'VALIDATION_ERROR', [$key => $message]);
    }
}
