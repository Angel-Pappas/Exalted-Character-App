<?php

namespace App\Models;

use App\Enums\WikiKind;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * One page of a character's People & Places wiki: a person, a place or a group.
 * Only the character's owner ever reads or writes it.
 *
 * @property string $id
 * @property string $character_id
 * @property WikiKind $kind
 * @property string $name
 * @property string|null $place_id
 * @property mixed $body
 * @property mixed $sections
 * @property string|null $image_path
 * @property Carbon|null $updated_at
 */
#[Fillable(['character_id', 'kind', 'name', 'place_id', 'body', 'sections', 'image_path'])]
class WikiPage extends Model
{
    use HasUuids;

    /**
     * The editor's JSON is opaque to the server. Decoding it as objects keeps
     * `{}` and `[]` distinct, so a save → load round trip is exact.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['kind' => WikiKind::class, 'body' => 'object', 'sections' => 'object'];
    }

    /**
     * The groups this page belongs to.
     *
     * @return BelongsToMany<WikiPage, $this>
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'wiki_page_groups', 'page_id', 'group_id');
    }
}
