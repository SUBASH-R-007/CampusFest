<?php
declare(strict_types=1);
require_once __DIR__ . '/cli.php';

cliRun(static function (): void {
    $directory = cliStorage(cliOptions(array_slice($_SERVER['argv'], 1)));
    (new \CampusFest\JsonStore($directory))->initialize(\CampusFest\JsonStore::emptyState());
    echo "Initialized empty private storage at {$directory}.\nCreate an organizer with organizer.php create.\n";
});
