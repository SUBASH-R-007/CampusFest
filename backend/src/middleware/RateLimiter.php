<?php
declare(strict_types=1);
namespace CampusFest;

final class RateLimiter
{
    public function __construct(private JsonStore $store) {}

    public function check(string $action, int $limit, int $window = 600): void
    {
        // REMOTE_ADDR is supplied by the server. Untrusted forwarding headers are ignored.
        $key = hash('sha256', $action . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'local'));
        $allowed = $this->store->transaction(function (array &$state) use ($key, $limit, $window): bool {
            $now = time();
            $entries = array_filter($state['rateLimits'] ?? [], fn ($entry) => ($entry['expires'] ?? 0) > $now);
            if (!isset($entries[$key]) && count($entries) >= 2000) {
                // Fail closed instead of evicting a live bucket that an attacker could reuse.
                $state['rateLimits'] = $entries;
                return false;
            }
            $entry = $entries[$key] ?? ['count' => 0, 'expires' => $now + $window];
            $allowed = $entry['count'] < $limit;
            $entry['count'] = min($limit, $entry['count'] + 1);
            $entries[$key] = $entry;
            $state['rateLimits'] = $entries;
            return $allowed;
        });
        if (!$allowed) {
            header('Retry-After: ' . $window);
            throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a few minutes before trying again.');
        }
    }
}
