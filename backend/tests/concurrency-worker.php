<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';

use CampusFest\CampusService;
use CampusFest\DomainError;
use CampusFest\JsonStore;

try {
    $directory = $argv[1];
    $round = $argv[2];
    $worker = (int) $argv[3];
    $config = json_decode(file_get_contents($directory . '/race-' . $round . '.json'), true, 512, JSON_THROW_ON_ERROR);
    $service = new CampusService(new JsonStore($directory), new TestClock());
    file_put_contents($directory . '/ready-' . $round . '-' . $worker, 'ready');
    $deadline = microtime(true) + 20;
    do {
        clearstatcache(true, $directory . '/go-' . $round);
        if (is_file($directory . '/go-' . $round)) { break; }
        if (microtime(true) >= $deadline) { throw new RuntimeException('Start barrier timed out.'); }
        usleep(1000);
    } while (true);
    if ($config['operation'] === 'cancel') {
        $result = $service->cancelPass($config['passId'], $config['managementCode']);
    } else {
        $number = $config['operation'] === 'duplicate' ? 500 : $worker + 10;
        $result = $service->register('test-studio', registrationInput($number));
    }
    echo json_encode(['ok' => true, 'registration' => $result['registration']], JSON_THROW_ON_ERROR);
} catch (DomainError $error) {
    echo json_encode(['ok' => false, 'code' => $error->errorCode], JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage());
    exit(1);
}
