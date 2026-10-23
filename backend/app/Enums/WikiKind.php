<?php

namespace App\Enums;

/** What a People & Places page is about. */
enum WikiKind: string
{
    case Person = 'person';
    case Place = 'place';
    case Group = 'group';
}
