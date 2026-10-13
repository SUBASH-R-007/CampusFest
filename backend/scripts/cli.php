<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/src/bootstrap.php';

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

function cliOptions(array $arguments): array
{
    $options = [];
    foreach ($arguments as $argument) {
        if (str_starts_with($argument, '--')) {
            $parts = explode('=', substr($argument, 2), 2);
            $options[$parts[0]] = $parts[1] ?? true;
        }
    }
    return $options;
}

function cliStorage(array $options): string
{
    $directory = $options['storage'] ?? getenv('CAMPUSFEST_STORAGE') ?: dirname(__DIR__) . '/storage';
    if (!is_string($directory) || trim($directory) === '') {
        throw new \InvalidArgumentException('Supply --storage=PATH with a private local directory.');
    }
    return $directory;
}

function cliRun(callable $run): void
{
    try {
        $run();
    } catch (Throwable $error) {
        fwrite(STDERR, 'Error: ' . $error->getMessage() . PHP_EOL);
        exit(1);
    }
}
