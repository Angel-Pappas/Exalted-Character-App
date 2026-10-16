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
 * @property string|null $summary
 * @property list<int>|null $pick_counts
 * @property bool $needs_review
 * @property string|null $review_action
 * @property int $commit_motes
 * @property bool $commit_needs_repurchase
 * @property bool $ongoing
 * @property string|null $purchase_limit
 */
#[Table('charm_library')]
#[Fillable([
    'type', 'name', 'page', 'description', 'summary', 'mechanical_key', 'mechanical_description',
    'prerequisite_essence', 'choice_type', 'target_choice_type', 'multiselect_cap_basis',
    'pick_counts', 'needs_review', 'review_action',
    'commit_motes', 'commit_needs_repurchase', 'ongoing', 'purchase_limit',
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
            'commit_motes' => 'integer',
            'commit_needs_repurchase' => 'boolean',
            'ongoing' => 'boolean',
        ];
    }
}
