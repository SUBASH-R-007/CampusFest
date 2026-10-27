<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/backend/src/bootstrap.php';

try {
    $directory = getenv('CAMPUSFEST_STORAGE');
    if (!$directory) { throw new RuntimeException('CAMPUSFEST_STORAGE is required.'); }
    $store = new \CampusFest\JsonStore($directory);
    if (file_exists($directory . '/state.json')) {
        $store->read(); // Corruption is an error, never a reason to reset state.
        echo "Existing storage retained. No accounts or passwords changed.\n";
        exit;
    }
    $email = strtolower(trim(getenv('CAMPUSFEST_ORGANIZER_EMAIL') ?: ''));
    $name = trim(getenv('CAMPUSFEST_ORGANIZER_NAME') ?: '');
    $password = getenv('CAMPUSFEST_ORGANIZER_PASSWORD') ?: '';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
        throw new RuntimeException('Set a valid organizer email in Render.');
    }
    if ($name === '' || strlen($name) > 100 || strlen($password) < 12 || strlen($password) > 72) {
        throw new RuntimeException('Set an organizer name and a 12–72 byte password in Render.');
    }
    $state = \CampusFest\JsonStore::emptyState();
    $state['organizers'][] = ['id' => 'ORG-' . strtoupper(bin2hex(random_bytes(8))),
        'name' => $name, 'email' => $email, 'passwordHash' => password_hash($password, PASSWORD_DEFAULT)];
    $store->initialize($state);
    echo "Initialized empty application storage and its organizer account.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "Initialization failed: " . $error->getMessage() . "\n");
    exit(1);
}
