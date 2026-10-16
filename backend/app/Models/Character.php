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
use Illuminate\Database\Eloquent\Relations\HasMany;

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
     * The Expense lines in the milestone ledger that start a training, done or
     * not. Lines logged before training existed carry no `training` flag and
     * never count.
     *
     * @return list<array{id: string, description: string, date: string, personal: int, exalted: int, minor: int, major: int}>
     */
    public function trainingEntries(): array
    {
        $ledger = get_object_vars($this->data)['milestones'] ?? [];
        $entries = [];

        foreach (is_array($ledger) ? $ledger : [] as $line) {
            $entry = is_object($line) ? get_object_vars($line) : [];
            if (($entry['kind'] ?? null) !== 'purchase' || ($entry['training'] ?? null) !== true || ! is_string($entry['id'] ?? null)) {
                continue;
            }
            $date = is_string($entry['date'] ?? null) ? substr($entry['date'], 0, 10) : '';
            $entries[] = [
                'id' => $entry['id'],
                'description' => is_string($entry['description'] ?? null) ? $entry['description'] : '',
                'date' => $date,
                'personal' => is_int($entry['personal'] ?? null) ? $entry['personal'] : 0,
                'exalted' => is_int($entry['exalted'] ?? null) ? $entry['exalted'] : 0,
                'minor' => is_int($entry['minor'] ?? null) ? $entry['minor'] : 0,
                'major' => is_int($entry['major'] ?? null) ? $entry['major'] : 0,
            ];
        }

        return $entries;
    }

    /**
     * @return HasMany<TrainingCompletion, $this>
     */
    public function trainingCompletions(): HasMany
    {
        return $this->hasMany(TrainingCompletion::class);
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
