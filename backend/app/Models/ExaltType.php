<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * @property string $id
 * @property string $name
 * @property string $caste_label
 * @property list<string> $castes
 * @property int $sort_order
 */
#[Fillable(['name', 'caste_label', 'castes', 'sort_order'])]
class ExaltType extends Model
{
    use HasUuids;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['castes' => 'array', 'sort_order' => 'integer'];
    }
}
