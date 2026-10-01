<?php

namespace App\Models;

use Database\Factories\CharacterFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $user_id
 * @property string $name
 * @property \stdClass $data
 */
#[Fillable(['user_id', 'name', 'data'])]
class Character extends Model
{
    /** @use HasFactory<CharacterFactory> */
    use HasFactory, HasUuids;

    /**
     * The sheet is opaque to the server. Decoding it as objects (not PHP arrays)
     * keeps `{}` and `[]` distinct, so a save → load round trip is exact.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['data' => 'object'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
