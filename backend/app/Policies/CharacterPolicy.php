<?php

namespace App\Policies;

use App\Models\Character;
use App\Models\User;

/**
 * Players manage their own characters; admins can read, edit and delete any.
 */
class CharacterPolicy
{
    public function view(User $user, Character $character): bool
    {
        return $this->ownsOrAdmin($user, $character);
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
