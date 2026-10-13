<?php
declare(strict_types=1);
// PHP development server: only approved static extensions inside the public root.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$file = realpath(__DIR__ . $path);
if ($file && str_starts_with($file, __DIR__ . DIRECTORY_SEPARATOR) && is_file($file)
    && preg_match('~\.(?:css|js|jpg|jpeg|png|svg|webp|ico|woff2?)$~i', $file)
    && !str_starts_with($path, '/api/')) {
    return false;
}
require __DIR__ . '/index.php';
