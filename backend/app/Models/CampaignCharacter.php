<?php

namespace App\Models;

use App\Enums\Visibility;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * A character's place in one campaign.
 *
 * @property string $campaign_id
 * @property string $character_id
 * @property Visibility $visibility
 */
class CampaignCharacter extends Pivot
{
    protected $table = 'campaign_characters';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['visibility' => Visibility::class];
    }
}
