<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A training marked done: `entry_id` is the Expense line in the character's
 * milestone ledger, `completed_by` whoever marked it (owner, Storyteller or admin).
 *
 * @property string $character_id
 * @property string $entry_id
 * @property Carbon $completed_on
 * @property string|null $completed_by
 */
#[Fillable(['character_id', 'entry_id', 'completed_on', 'completed_by'])]
class TrainingCompletion extends Model
{
    public $incrementing = false;

    protected $primaryKey = null;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['completed_on' => 'date'];
    }
}
