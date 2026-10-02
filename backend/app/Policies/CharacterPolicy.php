<?php

namespace App\Policies;

use App\Models\CampaignCharacter;
use App\Models\Character;
use App\Models\User;

/**
 * Players manage their own characters; admins can read, edit and delete any.
 * Campaigns add read-only access: a campaign's Storyteller can open every
 * character in it, and its other members the ones that are public there.
 */
class CharacterPolicy
{
    public function view(User $user, Character $character): bool
    {
        if ($this->ownsOrAdmin($user, $character)) {
            return true;
        }

        foreach ($character->campaigns as $campaign) {
            /** @var CampaignCharacter $place */
            $place = $campaign->getRelation('pivot');
            if ($campaign->letsSee($user, $character, $place->visibility)) {
                return true;
            }
        }

        return false;
    }

    public function update(User $user, Character $character): bool
    {
        return $this->ownsOrAdmin($user, $character);
    }

    public function delete(User $user, Character $character): bool
    {
        return $this->ownsOrAdmin($user, $character);
    }

    private function ownsOrAdmin(User $user, Character $character): bool
    {
        return $character->user_id === $user->id || $user->isAdmin();
    }
}
