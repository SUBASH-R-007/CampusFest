<?php
declare(strict_types=1);
namespace CampusFest;

final class ApiController
{
    public function __construct(private CampusService $service, private SessionAuth $auth, private RateLimiter $limiter) {}

    public function dispatch(string $method, string $path): array|string
    {
        $body = [];
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $this->auth->csrf();
            if (strtolower(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]) !== 'application/json') {
                throw new HttpError(415, 'JSON_REQUIRED', 'Send this request as application/json.');
            }
            if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 65536) {
                throw new HttpError(413, 'REQUEST_TOO_LARGE', 'The request is too large.');
            }
            $raw = file_get_contents('php://input', false, null, 0, 65537);
            if ($raw === false || strlen($raw) > 65536) {
                throw new HttpError(413, 'REQUEST_TOO_LARGE', 'The request is too large.');
            }
            try {
                $decoded = json_decode($raw, false, 32, JSON_THROW_ON_ERROR);
                if (!$decoded instanceof \stdClass) {
                    throw new \JsonException();
                }
                $body = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                throw new HttpError(400, 'INVALID_JSON', 'Send a valid JSON object.');
            }
        }
        if ($method === 'GET' && $path === '/session') {
            return $this->auth->info();
        }
        if ($method === 'POST' && $path === '/session/login') {
            $this->limiter->check('login', 15);
            return $this->auth->login($body);
        }
        if ($method === 'POST' && $path === '/session/logout') {
            return $this->auth->logout();
        }
        if ($method === 'GET' && $path === '/events') {
            return $this->service->listPublicEvents();
        }
        if ($method === 'GET' && preg_match('~^/events/([a-z0-9-]+)$~', $path, $m)) {
            return $this->service->getPublicEvent($m[1]);
        }
        if ($method === 'POST' && preg_match('~^/events/([a-z0-9-]+)/registrations$~', $path, $m)) {
            $this->limiter->check('registration', 30);
            $result = $this->service->register($m[1], $body);
            http_response_code(201);
            return $result;
        }
        if ($method === 'POST' && in_array($path, ['/passes/lookup', '/passes/cancel'], true)) {
            $this->limiter->check('pass', 60);
            $passId = self::string($body, 'passId', 100);
            $code = self::string($body, 'managementCode', 256);
            return $path === '/passes/lookup' ? $this->service->lookup($passId, $code) : $this->service->cancelPass($passId, $code);
        }
        if (str_starts_with($path, '/organizer/')) {
            $owner = $this->auth->organizer(true)['id'];
            if ($method === 'GET' && $path === '/organizer/dashboard') {
                return $this->service->dashboard($owner);
            }
            if ($path === '/organizer/events') {
                if ($method === 'GET') {
                    return $this->service->organizerEvents($owner);
                }
                if ($method === 'POST') {
                    $result = $this->service->saveEvent($owner, $body);
                    http_response_code(201);
                    return $result;
                }
            }
            if (preg_match('~^/organizer/events/([a-zA-Z0-9_-]+)(?:/(action|registrations|export\.csv))?$~', $path, $m)) {
                $id = $m[1];
                $action = $m[2] ?? '';
                if ($method === 'PUT' && $action === '') {
                    return $this->service->saveEvent($owner, $body, $id);
                }
                if ($method === 'POST' && $action === 'action') {
                    return $this->service->eventAction($owner, $id, self::string($body, 'action', 30), self::string($body, 'reason', 1000, false));
                }
                if ($method === 'GET' && in_array($action, ['registrations', 'export.csv'], true)) {
                    $filters = [];
                    foreach (['search', 'status', 'attendance'] as $key) {
                        if (isset($_GET[$key])) {
                            $filters[$key] = self::string($_GET, $key, 200);
                        }
                    }
                    return $action === 'export.csv' ? $this->service->exportCsv($owner, $id, $filters) : $this->service->roster($owner, $id, $filters);
                }
            }
            if ($method === 'POST' && preg_match('~^/organizer/registrations/([a-zA-Z0-9_-]+)/(cancel|rotate-code|attendance)$~', $path, $m)) {
                if ($m[2] === 'cancel') {
                    return $this->service->cancelRegistration($owner, $m[1]);
                }
                if ($m[2] === 'rotate-code') {
                    return $this->service->rotateCode($owner, $m[1], ($body['verified'] ?? false) === true);
                }
                if (isset($body['undo']) && !is_bool($body['undo'])) {
                    throw new HttpError(422, 'VALIDATION', 'Undo must be true or false.');
                }
                return $this->service->attendance($owner, $m[1], self::string($body, 'memberId', 100), $body['undo'] ?? false);
            }
        }
        throw new HttpError(404, 'NOT_FOUND', 'This API route does not exist.');
    }

    private static function string(array $data, string $key, int $max, bool $required = true): string
    {
        $value = $data[$key] ?? '';
        if (!is_string($value) || strlen($value) > $max || ($required && trim($value) === '')) {
            throw new HttpError(422, 'VALIDATION', 'Please check the submitted fields.', [$key => 'Enter a valid value.']);
        }
        return trim($value);
    }
}
