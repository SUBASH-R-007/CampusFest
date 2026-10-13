<?php
declare(strict_types=1);

namespace CampusFest;

class DomainError extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly int $status = 422,
        public readonly string $errorCode = 'VALIDATION_ERROR',
        public readonly array $fieldErrors = [],
    ) {
        parent::__construct($message);
    }
}
