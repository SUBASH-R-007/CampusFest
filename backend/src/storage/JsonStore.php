<?php
declare(strict_types=1);

namespace CampusFest;

/** One local filesystem, one canonical state, and a separate stable lock inode. */
class JsonStore
{
    private string $file;
    private string $lockFile;

    /** $beforeReplace is a test seam for exercising interrupted commits. */
    public function __construct(private string $directory, private $beforeReplace = null)
    {
        $this->directory = rtrim($directory, '/\\');
        $this->file = $this->directory . '/state.json';
        $this->lockFile = $this->directory . '/state.lock';
    }

    public static function emptyState(): array
    {
        return ['schemaVersion' => 1, 'nextRegistrationSequence' => 1,
            'organizers' => [], 'events' => [], 'registrations' => [], 'auditLog' => []];
    }

    public function read(): array
    {
        return $this->locked(LOCK_SH, fn (): array => $this->decode());
    }

    public function transaction(callable $callback): mixed
    {
        return $this->locked(LOCK_EX, function () use ($callback): mixed {
            $state = $this->decode();
            $result = $callback($state);
            $this->commit($state);
            return $result;
        });
    }

    /** Initialization is deliberately unavailable from normal application startup. */
    public function initialize(array $state): void
    {
        if (!is_dir($this->directory) && !@mkdir($this->directory, 0700, true) && !is_dir($this->directory)) {
            throw $this->unavailable();
        }
        $this->locked(LOCK_EX, function () use ($state): void {
            if (file_exists($this->file)) {
                throw new DomainError('Storage already exists. Initialization will not overwrite it.', 409, 'ALREADY_INITIALIZED');
            }
            $this->commit($state);
        });
    }

    private function locked(int $mode, callable $callback): mixed
    {
        if (!is_dir($this->directory)) {
            throw new DomainError('Storage has not been initialized. Run the setup command.', 503, 'STORAGE_UNAVAILABLE');
        }
        $resolved = realpath($this->directory);
        $public = realpath(dirname(__DIR__, 2) . '/public');
        if ($resolved !== false && $public !== false) {
            $resolved = str_replace('\\', '/', $resolved);
            $public = str_replace('\\', '/', $public);
            if (PHP_OS_FAMILY === 'Windows') { $resolved = strtolower($resolved); $public = strtolower($public); }
            if ($resolved === $public || str_starts_with($resolved, $public . '/')) {
                throw new DomainError('State storage must be outside the public web directory.', 503, 'STORAGE_UNSAFE');
            }
        }
        $lock = @fopen($this->lockFile, 'c+b');
        if ($lock === false) {
            throw $this->unavailable();
        }
        try {
            if (!flock($lock, $mode)) {
                throw $this->unavailable();
            }
            return $callback();
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    private function decode(): array
    {
        if (!is_file($this->file)) {
            throw new DomainError('The initialized state file is missing. Restore it or run explicit setup.', 503, 'STORAGE_UNAVAILABLE');
        }
        $json = @file_get_contents($this->file);
        if ($json === false) {
            throw $this->unavailable();
        }
        try {
            $state = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw new DomainError('Stored data is invalid. Restore a valid state file; it has not been reset.', 503, 'STORAGE_CORRUPT');
        }
        $this->validateState($state);
        return $state;
    }

    private function validateState(mixed $state): void
    {
        if (!is_array($state) || ($state['schemaVersion'] ?? null) !== 1 ||
            !is_int($state['nextRegistrationSequence'] ?? null) || $state['nextRegistrationSequence'] < 1) {
            throw new DomainError('Stored data has an unsupported schema.', 503, 'STORAGE_CORRUPT');
        }
        foreach (['organizers', 'events', 'registrations', 'auditLog'] as $key) {
            if (!isset($state[$key]) || !is_array($state[$key]) || !array_is_list($state[$key])) {
                throw new DomainError('Stored data has an invalid collection.', 503, 'STORAGE_CORRUPT');
            }
        }
    }

    private function commit(array $state): void
    {
        $this->validateState($state);
        try {
            $json = json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
        } catch (\JsonException) {
            throw $this->unavailable();
        }
        $temporary = $this->directory . '/.state-' . bin2hex(random_bytes(12)) . '.tmp';
        $handle = @fopen($temporary, 'x+b');
        if ($handle === false) {
            throw $this->unavailable();
        }
        try {
            @chmod($temporary, 0600);
            $written = 0;
            $length = strlen($json);
            while ($written < $length) {
                $count = fwrite($handle, substr($json, $written));
                if ($count === false || $count === 0) {
                    throw $this->unavailable();
                }
                $written += $count;
            }
            if (!fflush($handle) || (function_exists('fsync') && !fsync($handle))) {
                throw $this->unavailable();
            }
            fclose($handle);
            $handle = null;
            if ($this->beforeReplace !== null) {
                ($this->beforeReplace)($temporary, $this->file);
            }
            // Never unlink the previous state: a failed replacement must preserve it.
            $replaced = false;
            // Windows scanners may briefly hold the destination. Retrying the same
            // atomic replacement under the lock is safe; never remove the old file.
            for ($attempt = 0; $attempt < 6; $attempt++) {
                if (@rename($temporary, $this->file)) { $replaced = true; break; }
                if (!is_file($temporary)) { break; }
                usleep(20000 * ($attempt + 1));
            }
            if (!$replaced) {
                throw $this->unavailable();
            }
        } finally {
            if (is_resource($handle)) {
                fclose($handle);
            }
            if (is_file($temporary)) {
                @unlink($temporary);
            }
        }
    }

    private function unavailable(): DomainError
    {
        return new DomainError('Storage is temporarily unavailable. No successful change has been reported.', 503, 'STORAGE_UNAVAILABLE');
    }
}
