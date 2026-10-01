<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property string $type
 * @property string $name
 * @property int|null $page
 * @property string $description
 * @property list<int>|null $pick_counts
 * @property bool $needs_review
 * @property string|null $review_action
 */
#[Table('charm_library')]
#[Fillable([
    'type', 'name', 'page', 'description', 'mechanical_key', 'mechanical_description',
    'prerequisite_essence', 'choice_type', 'target_choice_type', 'multiselect_cap_basis',
    'pick_counts', 'needs_review', 'review_action',
])]
class Charm extends Model
{
    use HasUuids;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'page' => 'integer',
            'prerequisite_essence' => 'integer',
            'pick_counts' => 'array',
            'needs_review' => 'boolean',
        ];
    }
}
