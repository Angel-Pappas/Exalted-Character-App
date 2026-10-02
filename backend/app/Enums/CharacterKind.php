<?php

namespace App\Enums;

/** A player's character (PC) or one the table plays as part of the world (NPC). */
enum CharacterKind: string
{
    case Pc = 'pc';
    case Npc = 'npc';

    /** How a character starts out in a campaign it joins: PCs public, NPCs private. */
    public function defaultVisibility(): Visibility
    {
        return $this === self::Pc ? Visibility::Public : Visibility::Private;
    }
}
