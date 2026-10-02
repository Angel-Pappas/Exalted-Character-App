<?php

namespace App\Enums;

/**
 * Whether a character's sheet is open to the other members of one campaign.
 * The owner and that campaign's Storyteller can always open it.
 */
enum Visibility: string
{
    case Public = 'public';
    case Private = 'private';
}
