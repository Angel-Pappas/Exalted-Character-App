<?php

namespace App\Models;

use App\Enums\CharacterKind;
use Database\Factories\CharacterFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * @property string $id
 * @property string $user_id
 * @property string $name
 * @property CharacterKind $kind
 * @property \stdClass $data
 */
#[Fillable(['user_id', 'name', 'kind', 'data'])]
class Character extends Model
{
    /** @use HasFactory<CharacterFactory> */
    use HasFactory, HasUuids;

    /** @var array<string, mixed> */
    protected $attributes = ['kind' => 'pc'];

    /**
     * The sheet is opaque to the server. Decoding it as objects (not PHP arrays)
     * keeps `{}` and `[]` distinct, so a save → load round trip is exact.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['data' => 'object', 'kind' => CharacterKind::class];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsToMany<Campaign, $this, CampaignCharacter>
     */
    public function campaigns(): BelongsToMany
    {
        return $this->belongsToMany(Campaign::class, 'campaign_characters')
            ->using(CampaignCharacter::class)
            ->withPivot('visibility')
            ->withTimestamps();
    }
}
