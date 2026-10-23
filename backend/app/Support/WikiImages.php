<?php

namespace App\Support;

use App\Models\Character;
use Illuminate\Support\Facades\Storage;

/**
 * Where People & Places images live: the private local disk, one folder per
 * character, served only through the API to the character's owner. The
 * database rows go when a character goes (a cascade); these files are removed
 * here, because a cascade never reaches the disk.
 */
final class WikiImages
{
    public static function folder(string $characterId): string
    {
        return "wiki/{$characterId}";
    }

    public static function forgetCharacter(Character $character): void
    {
        Storage::disk('local')->deleteDirectory(self::folder($character->id));
    }
}
