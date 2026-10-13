<?php
declare(strict_types=1);
require_once __DIR__ . '/helpers.php';

$assertions = 0;
$children = [];
$exitStatus = 0;

/** Starts independent PHP OS processes behind one barrier, bypassing the HTTP server. */
function runRace(string $directory, string $round, int $count, array $configuration): array
{
    global $children;
    file_put_contents($directory . '/race-' . $round . '.json', json_encode($configuration, JSON_THROW_ON_ERROR));
    $children = [];
    for ($worker = 0; $worker < $count; $worker++) {
        $process = proc_open([PHP_BINARY, __DIR__ . '/concurrency-worker.php', $directory, $round, (string) $worker],
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, dirname(__DIR__, 2), null, ['bypass_shell' => true]);
        if (!is_resource($process)) { throw new RuntimeException('Could not start independent PHP worker.'); }
        fclose($pipes[0]);
        $children[] = ['process' => $process, 'output' => $pipes[1], 'error' => $pipes[2]];
    }
    $deadline = microtime(true) + 20;
    while (count(glob($directory . '/ready-' . $round . '-*')) !== $count) {
        if (microtime(true) > $deadline) { throw new RuntimeException('Not all workers reached the start barrier.'); }
        usleep(1000);
    }
    file_put_contents($directory . '/go-' . $round, 'go');
    $results = [];
    foreach ($children as &$child) {
        $output = stream_get_contents($child['output']);
        $error = stream_get_contents($child['error']);
        fclose($child['output']); fclose($child['error']);
        $exit = proc_close($child['process']); $child['process'] = null;
        if ($exit !== 0 || $error !== '') { throw new RuntimeException("Worker failed ({$exit}): {$error}"); }
        $results[] = json_decode($output, true, 512, JSON_THROW_ON_ERROR);
    }
    unset($child);
    $children = [];
    return $results;
}

[$directory, $store, $clock, $service, $event] = fixture();
try {
    $original = $service->register('test-studio', registrationInput(1));
    $results = runRace($directory, 'last-seat', 12, ['operation' => 'register']);
    same(12, count(array_filter($results, fn ($row) => $row['ok'])), 'All distinct registrations persisted');
    same(1, count(array_filter($results, fn ($row) => ($row['registration']['status'] ?? null) === 'CONFIRMED')), 'Exactly one process wins the last seat');
    same(11, count(array_filter($results, fn ($row) => ($row['registration']['status'] ?? null) === 'WAITLISTED')), 'Every other process waitlists');
    $state = $store->read();
    same(13, count($state['registrations']), 'No lost updates');
    same(2, $service->getPublicEvent('test-studio')['confirmedCount'], 'Capacity never oversold');
    $sequences = array_column($state['registrations'], 'sequence'); sort($sequences);
    same(range(1, 13), $sequences, 'Unique gap-free lock-allocated sequences');
    same(13, count(array_unique(array_column($state['registrations'], 'passId'))), 'Unique pass IDs');
    echo "PASS 12 independent PHP processes racing for one remaining seat: 1 confirmed, 11 waitlisted.\n";

    $duplicates = runRace($directory, 'duplicate', 8, ['operation' => 'duplicate']);
    same(1, count(array_filter($duplicates, fn ($row) => $row['ok'])), 'Only one duplicate attempt persists');
    same(7, count(array_filter($duplicates, fn ($row) => ($row['code'] ?? null) === 'DUPLICATE_PARTICIPANT')), 'Concurrent duplicates rejected inside lock');
    same(14, count($store->read()['registrations']), 'Duplicate attempts cause no writes or sequence gaps');
    echo "PASS 8 independent PHP processes submitting the same participant: 1 stored, 7 rejected.\n";

    $queued = array_values(array_filter($store->read()['registrations'], fn ($row) => $row['status'] === 'WAITLISTED'));
    usort($queued, fn ($a, $b) => $a['sequence'] <=> $b['sequence']);
    $cancellations = runRace($directory, 'cancel', 8, ['operation' => 'cancel', 'passId' => $original['registration']['passId'], 'managementCode' => $original['managementCode']]);
    same(8, count(array_filter($cancellations, fn ($row) => $row['ok'] && $row['registration']['status'] === 'CANCELLED')), 'Concurrent cancellations all return same final state');
    $state = $store->read();
    $promotions = array_values(array_filter($state['auditLog'], fn ($row) => $row['action'] === 'registration.promoted'));
    same(1, count($promotions), 'Repeated concurrent cancellation promotes exactly once');
    same($queued[0]['passId'], $promotions[0]['target'], 'Oldest sequence is promoted');
    same(2, $service->getPublicEvent('test-studio')['confirmedCount'], 'Capacity remains exactly two');
    same(1, count(array_filter($state['auditLog'], fn ($row) => $row['action'] === 'registration.cancelled')), 'One cancellation audit');
    echo "PASS 8 independent PHP processes cancelling the same pass: 1 cancellation, 1 FIFO promotion.\n";
    echo "Concurrency suite: 28 child processes, {$assertions} assertions passed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, "FAIL {$error->getMessage()}\n{$error->getTraceAsString()}\n");
    $exitStatus = 1;
} finally {
    foreach ($children as $child) {
        if (is_resource($child['process'])) { proc_terminate($child['process']); proc_close($child['process']); }
        foreach (['output', 'error'] as $stream) { if (is_resource($child[$stream])) { fclose($child[$stream]); } }
    }
    removeTestDirectory($directory);
}

exit($exitStatus);
