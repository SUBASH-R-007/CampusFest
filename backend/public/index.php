<?php
declare(strict_types=1);

use CampusFest\{ApiController, CampusService, DomainError, HttpError, JsonStore, RateLimiter, SessionAuth};

ini_set('display_errors', '0');
ini_set('log_errors', '1');
date_default_timezone_set('UTC');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('X-Frame-Options: DENY');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if (!($path === '/api' || str_starts_with($path, '/api/'))) {
    if (preg_match('~^/(?:backend|storage|src|scripts|tests|\.git|\.env|\.tools|\.runtime)(?:/|$)~i', $path) || str_contains($path, '..') || preg_match('~\.(?:json|php|lock|log|tmp|ini|md)$~i', $path)) {
        http_response_code(404);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Not found';
        exit;
    }
    if (!is_file(__DIR__ . '/index.html')) {
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Frontend not built. Run npm run build in frontend, or open the Vite development URL.';
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    readfile(__DIR__ . '/index.html');
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require dirname(__DIR__) . '/src/bootstrap.php';
// Explicit includes also keep the HTTP boundary independent of the domain autoloader.
foreach (['middleware/HttpError.php', 'middleware/SessionAuth.php', 'middleware/RateLimiter.php', 'controllers/ApiController.php'] as $file) {
    require_once dirname(__DIR__) . '/src/' . $file;
}
$directory = getenv('CAMPUSFEST_STORAGE') ?: dirname(__DIR__) . '/storage';
try {
    $store = new JsonStore($directory);
    $store->read(); // Missing/corrupt state must fail; never seed from a request.
    ini_set('error_log', $directory . '/php-errors.log');
    $auth = new SessionAuth($store, $directory);
    $controller = new ApiController(new CampusService($store), $auth, new RateLimiter($store));
    $result = $controller->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', substr($path, 4) ?: '/');
    if (is_string($result)) {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="campusfest-participants.csv"');
        echo $result;
    } else {
        echo json_encode(['ok' => true, 'data' => $result], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    }
} catch (DomainError | HttpError $error) {
    http_response_code($error->status);
    echo json_encode(['ok' => false, 'error' => ['code' => $error->errorCode, 'message' => $error->getMessage(), 'fieldErrors' => (object) $error->fieldErrors]], JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    http_response_code(503);
    // Never log request payloads, secrets, participant fields, or exception messages containing input.
    error_log('CampusFest request failed: ' . get_class($error));
    echo json_encode(['ok' => false, 'error' => ['code' => 'STORAGE_UNAVAILABLE', 'message' => 'The service is temporarily unavailable. Check private storage and setup.', 'fieldErrors' => (object) []]]);
}
