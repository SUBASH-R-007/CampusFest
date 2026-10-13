<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/src/bootstrap.php';

use CampusFest\CampusService;
use CampusFest\DomainError;
use CampusFest\JsonStore;

final class TestClock
{
    public function __construct(public string $value = '2030-10-12T10:00:00Z') {}
    public function __invoke(): DateTimeImmutable { return new DateTimeImmutable($this->value); }
}

function testDirectory(string $prefix): string
{
    $root = dirname(__DIR__, 2) . '/.runtime';
    if (!is_dir($root)) { mkdir($root, 0700, true); }
    $directory = $root . '/campusfest-' . $prefix . '-' . bin2hex(random_bytes(8));
    if (!mkdir($directory, 0700)) { throw new RuntimeException('Cannot create isolated test directory.'); }
    return $directory;
}

function removeTestDirectory(string $directory): void
{
    $root = realpath(dirname(__DIR__, 2) . '/.runtime');
    $path = realpath($directory);
    if ($root === false || $path === false || !str_starts_with($path, $root . DIRECTORY_SEPARATOR . 'campusfest-')) {
        throw new RuntimeException('Refusing cleanup outside a uniquely named test directory.');
    }
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($iterator as $file) {
        if ($file->isDir()) { rmdir($file->getPathname()); } else { unlink($file->getPathname()); }
    }
    rmdir($path);
}

function eventInput(array $changes = []): array
{
    return array_replace(['title' => 'Test Studio', 'slug' => 'test-studio', 'category' => 'Workshop',
        'description' => 'Fictional test event.', 'rules' => 'Be kind.', 'venue' => 'Lab A', 'image' => '/images/design.jpg',
        'startAt' => '2030-10-14T10:00:00Z', 'endAt' => '2030-10-14T12:00:00Z',
        'registrationOpensAt' => '2030-10-10T10:00:00Z', 'registrationDeadline' => '2030-10-13T10:00:00Z',
        'mode' => 'SOLO', 'capacity' => 2, 'minTeamSize' => 1, 'maxTeamSize' => 1,
        'contact' => 'test@example.edu'], $changes);
}

function person(int $number, array $changes = []): array
{
    return array_replace(['name' => 'Student ' . $number, 'studentId' => 'S-' . $number,
        'email' => 'student' . $number . '@example.edu', 'department' => 'Computer Science', 'year' => 2], $changes);
}

function registrationInput(int $number, array $members = []): array
{
    return ['teamName' => 'Team ' . $number, 'members' => $members ?: [person($number)], 'consent' => true];
}

function fixture(array $eventChanges = []): array
{
    $directory = testDirectory('domain');
    $store = new JsonStore($directory);
    $state = JsonStore::emptyState();
    $state['organizers'] = [['id' => 'owner', 'name' => 'Test Owner', 'email' => 'owner@example.edu', 'passwordHash' => password_hash('TestingOnly!2030', PASSWORD_DEFAULT)]];
    $store->initialize($state);
    $clock = new TestClock();
    $service = new CampusService($store, $clock);
    $event = $service->saveEvent('owner', eventInput($eventChanges));
    $event = $service->eventAction('owner', $event['id'], 'publish');
    return [$directory, $store, $clock, $service, $event];
}

function same(mixed $expected, mixed $actual, string $message): void
{
    global $assertions;
    $assertions++;
    if ($expected !== $actual) { throw new RuntimeException($message . ': expected ' . json_encode($expected) . ', got ' . json_encode($actual)); }
}

function expectError(string $code, callable $operation): DomainError
{
    try { $operation(); } catch (DomainError $error) {
        same($code, $error->errorCode, 'Correct domain error');
        return $error;
    }
    throw new RuntimeException('Expected domain error ' . $code);
}
