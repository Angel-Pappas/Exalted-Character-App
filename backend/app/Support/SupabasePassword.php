<?php

namespace App\Support;

use InvalidArgumentException;

/**
 * Supabase Auth (Go's bcrypt) stores hashes with the `$2a$` prefix. They are
 * ordinary, correct bcrypt hashes; PHP labels the same algorithm `$2y$`, and
 * Laravel's bcrypt hasher only accepts that label. Relabelling keeps every
 * user's existing password working after the move.
 */
final class SupabasePassword
{
    public static function toLaravel(string $hash): string
    {
        if (str_starts_with($hash, '$2y$')) {
            return $hash;
        }

        if (! str_starts_with($hash, '$2a$') && ! str_starts_with($hash, '$2b$')) {
            throw new InvalidArgumentException('Not a bcrypt hash.');
        }

        return '$2y$'.substr($hash, 4);
    }
}
