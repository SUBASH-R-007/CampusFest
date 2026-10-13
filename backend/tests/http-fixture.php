<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';
use CampusFest\JsonStore;
if (PHP_SAPI !== 'cli' || !isset($argv[1])) { exit(1); }
$state = JsonStore::emptyState();
foreach (['one', 'two'] as $id) {
    $state['organizers'][] = ['id' => 'ORG-' . $id, 'name' => 'Test ' . $id,
        'email' => $id . '@example.test', 'passwordHash' => password_hash('Test-password-42!', PASSWORD_DEFAULT)];
}
(new JsonStore($argv[1]))->initialize($state);
