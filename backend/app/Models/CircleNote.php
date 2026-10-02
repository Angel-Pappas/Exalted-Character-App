<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * A character owner's own notes about another PC in its Circle. Only the
 * owner of `character_id` ever reads or writes them.
 *
 * @property string $character_id
 * @property string $subject_id
 * @property string $notes
 */
#[Fillable(['character_id', 'subject_id', 'notes'])]
class CircleNote extends Model
{
    public $incrementing = false;

    protected $primaryKey = null;
}
