<?php
declare(strict_types=1);
require_once __DIR__ . '/cli.php';

cliRun(static function (): void {
    $options = cliOptions(array_slice($_SERVER['argv'], 1));
    $directory = cliStorage($options);
    $store = new \CampusFest\JsonStore($directory);
    $seed = \CampusFest\DemoSeed::build();
    if (isset($options['reset-demo'])) {
        if ($options['reset-demo'] !== true) {
            throw new \InvalidArgumentException('Use the exact --reset-demo flag.');
        }
        $store->transaction(static function (array &$state) use ($seed): void {
            if (($state['demo'] ?? false) !== true) {
                throw new \RuntimeException('Reset refused: selected storage is not explicitly marked as demo data.');
            }
            $state = $seed;
        });
    } else {
        $store->initialize($seed);
    }
    echo "Seeded fictional local demo in {$directory}.\n";
    echo "Technology organizer: organizer@campusfest.test / CampusFest!2026\n";
    echo "Arts organizer: arts@campusfest.test / ArtsFest!2026\n";
    echo "Disposable local-only credentials. Never use this demo state for a public service.\n";
    echo "Two-seat demo: /events/two-seat-lab; attendance: RoboRally (technology organizer).\n";
});
