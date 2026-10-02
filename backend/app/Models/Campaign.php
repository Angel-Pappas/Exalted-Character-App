<?php

namespace App\Models;

use App\Enums\Visibility;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * One story a group plays: a Storyteller, the members, and the characters
 * assigned to it. Being Storyteller has nothing to do with the admin role.
 *
 * @property string $id
 * @property string $name
 * @property string $storyteller_id
 */
#[Fillable(['name', 'storyteller_id'])]
class Campaign extends Model
{
    use HasUuids;

    /**
     * @return BelongsTo<User, $this>
     */
    public function storyteller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'storyteller_id');
    }

    /**
     * Everyone in the campaign, the Storyteller included.
     *
     * @return BelongsToMany<User, $this>
     */
    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'campaign_members')->withTimestamps();
    }

    /**
     * @return BelongsToMany<Character, $this, CampaignCharacter>
     */
    public function characters(): BelongsToMany
    {
        return $this->belongsToMany(Character::class, 'campaign_characters')
            ->using(CampaignCharacter::class)
            ->withPivot('visibility')
            ->withTimestamps();
    }

    public function isStoryteller(User $user): bool
    {
        return $this->storyteller_id === $user->id;
    }

    public function hasMember(User $user): bool
    {
        return $this->members()->whereKey($user->id)->exists();
    }

    /**
     * Whether `$user` may open the sheet of a character in this campaign with
     * this visibility: its owner and the Storyteller always; other members only
     * when it is public here.
     */
    public function letsSee(User $user, Character $character, Visibility $visibility): bool
    {
        return $character->user_id === $user->id
            || $this->isStoryteller($user)
            || ($visibility === Visibility::Public && $this->hasMember($user));
    }
}
