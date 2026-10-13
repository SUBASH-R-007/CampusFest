<?php
declare(strict_types=1);
namespace CampusFest;

/** Cookie sessions identify organizers; anonymous sessions provide CSRF only. */
final class SessionAuth
{
    private int $idle;

    public function __construct(private JsonStore $store, string $directory)
    {
        $this->idle = max(1, (int) (getenv('CAMPUSFEST_SESSION_IDLE_SECONDS') ?: 1800));
        $path = $directory . '/sessions';
        if (!is_dir($directory) || (!is_dir($path) && !@mkdir($path, 0700, true))) {
            throw new HttpError(503, 'SETUP_REQUIRED', 'Private storage is unavailable. Run the setup command.');
        }
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.gc_maxlifetime', (string) $this->idle);
        ini_set('session.gc_probability', '1');
        ini_set('session.gc_divisor', '100');
        session_save_path($path);
        session_cache_limiter(''); // The HTTP entry point sets an explicit no-store policy.
        session_name('campusfest_session');
        session_set_cookie_params([
            'lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax',
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        ]);
        if (!session_start()) {
            throw new HttpError(503, 'SESSION_UNAVAILABLE', 'A secure session could not be started.');
        }
        if (isset($_SESSION['organizerId']) && time() - ($_SESSION['lastActivity'] ?? 0) >= $this->idle) {
            $_SESSION = [];
            session_regenerate_id(true);
        }
        $_SESSION['csrfToken'] ??= bin2hex(random_bytes(32));
    }

    public function csrf(): void
    {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($token) || !hash_equals($_SESSION['csrfToken'], $token)) {
            throw new HttpError(403, 'CSRF_INVALID', 'Your security token expired. Refresh the page and try again.');
        }
    }

    public function organizer(bool $required = false): ?array
    {
        $organizer = null;
        if (isset($_SESSION['organizerId'])) {
            foreach ($this->store->read()['organizers'] as $candidate) {
                if ($candidate['id'] === $_SESSION['organizerId'] && hash_equals(hash('sha256', $candidate['passwordHash']), $_SESSION['credentialFingerprint'] ?? '')) {
                    $organizer = array_intersect_key($candidate, array_flip(['id', 'name', 'email']));
                    $_SESSION['lastActivity'] = time();
                    break;
                }
            }
            if (!$organizer) {
                unset($_SESSION['organizerId'], $_SESSION['credentialFingerprint'], $_SESSION['lastActivity']);
            }
        }
        if ($required && !$organizer) {
            throw new HttpError(401, 'AUTH_REQUIRED', 'Sign in to your organizer account to continue.');
        }
        return $organizer;
    }

    public function info(): array
    {
        $logo = getenv('CAMPUSFEST_LOGO') ?: '';
        if ($logo && !preg_match('~^/images/[a-zA-Z0-9_.-]+$~', $logo)) {
            $logo = '';
        }
        return [
            'csrfToken' => $_SESSION['csrfToken'], 'organizer' => $this->organizer(),
            'config' => ['campusName' => getenv('CAMPUSFEST_CAMPUS_NAME') ?: 'The campus collective', 'logo' => $logo],
        ];
    }

    public function login(array $input): array
    {
        $email = $input['email'] ?? null;
        $password = $input['password'] ?? null;
        if (!is_string($email) || !is_string($password) || strlen($email) > 254 || strlen($password) > 256) {
            throw new HttpError(422, 'VALIDATION', 'Enter a valid email and password.');
        }
        $match = null;
        foreach ($this->store->read()['organizers'] as $candidate) {
            if (strtolower(trim($email)) === strtolower($candidate['email'])) {
                $match = $candidate;
            }
        }
        // Fixed dummy hash keeps nonexistent accounts on the password verification path.
        $hash = $match['passwordHash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
        if (!password_verify($password, $hash) || !$match) {
            throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
        }
        if (!session_regenerate_id(true)) {
            throw new HttpError(503, 'SESSION_UNAVAILABLE', 'Sign in could not be completed.');
        }
        $_SESSION['organizerId'] = $match['id'];
        $_SESSION['credentialFingerprint'] = hash('sha256', $match['passwordHash']);
        $_SESSION['lastActivity'] = time();
        $_SESSION['csrfToken'] = bin2hex(random_bytes(32));
        return $this->info();
    }

    public function logout(): array
    {
        $_SESSION = [];
        $params = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 42000, 'path' => '/', 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Lax']);
        session_destroy();
        return ['loggedOut' => true];
    }
}
