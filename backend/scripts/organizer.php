<?php
declare(strict_types=1);
require_once __DIR__ . '/cli.php';

cliRun(static function (): void {
    $action = $_SERVER['argv'][1] ?? '';
    if (!in_array($action, ['create', 'reset-password'], true)) {
        throw new \InvalidArgumentException('Usage: organizer.php create|reset-password --email=EMAIL [--name=NAME] [--password=PASSWORD] [--storage=PATH]. Prefer CAMPUSFEST_ORGANIZER_PASSWORD.');
    }
    $options = cliOptions(array_slice($_SERVER['argv'], 2));
    $email = strtolower(trim(is_string($options['email'] ?? null) ? $options['email'] : ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
        throw new \InvalidArgumentException('A valid --email is required.');
    }
    $password = getenv('CAMPUSFEST_ORGANIZER_PASSWORD') ?: ($options['password'] ?? null);
    if (!is_string($password) || strlen($password) < 12 || strlen($password) > 72) {
        throw new \InvalidArgumentException('Password must be 12–72 bytes. Use the environment variable or --password.');
    }
    $name = is_string($options['name'] ?? null) ? trim($options['name']) : '';
    if ($action === 'create' && ($name === '' || strlen($name) > 100)) {
        throw new \InvalidArgumentException('Provide --name with 1–100 characters.');
    }
    $store = new \CampusFest\JsonStore(cliStorage($options));
    $store->transaction(static function (array &$state) use ($action, $email, $password, $name): void {
        $found = null;
        foreach ($state['organizers'] as $index => $organizer) {
            if (strtolower($organizer['email']) === $email) { $found = $index; break; }
        }
        if ($action === 'create') {
            if ($found !== null) { throw new \RuntimeException('An organizer with this email already exists.'); }
            $state['organizers'][] = ['id' => 'ORG-' . strtoupper(bin2hex(random_bytes(8))), 'name' => $name, 'email' => $email,
                'passwordHash' => password_hash($password, PASSWORD_DEFAULT)];
            $target = $state['organizers'][array_key_last($state['organizers'])]['id'];
        } else {
            if ($found === null) { throw new \RuntimeException('Organizer not found.'); }
            $state['organizers'][$found]['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
            $target = $state['organizers'][$found]['id'];
        }
        $state['auditLog'][] = ['at' => gmdate('Y-m-d\TH:i:s\Z'), 'action' => 'organizer.' . $action, 'actor' => 'cli', 'target' => $target, 'details' => []];
        $state['auditLog'] = array_slice($state['auditLog'], -1000);
    });
    echo $action === 'create' ? "Organizer created.\n" : "Password reset. Previous authenticated sessions will expire.\n";
});
