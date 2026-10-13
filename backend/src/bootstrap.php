<?php
declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'CampusFest\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $name = substr($class, strlen($prefix));
    foreach (['storage', 'services', 'validators', 'middleware', 'controllers'] as $directory) {
        $file = __DIR__ . '/' . $directory . '/' . str_replace('\\', '/', $name) . '.php';
        if (is_file($file)) {
            require_once $file;
            return;
        }
    }
});
