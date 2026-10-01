<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * One-off move from Supabase: loads the game content (charm library with its
 * lists, essence tiers, exalt types) from a JSON export, replacing what is
 * there. IDs are kept so anything that refers to a charm still finds it.
 *
 * Expects in the directory, as returned by Supabase's REST API:
 *  - charms.json: charm_library rows with their child lists embedded, in the
 *    order the old app displayed them (that order becomes `position`)
 *  - essence_tiers.json, exalt_types.json: plain rows
 */
#[Signature('exalted:import-content {directory : Folder holding the Supabase JSON export}')]
#[Description('Replace the charm library and exalt types with a Supabase export')]
class ImportSupabaseContent extends Command
{
    /** Child tables, deleted before their parents. */
    private const TABLES = [
        'charm_essence_tiers', 'charm_mode_prerequisite_abilities', 'charm_modes',
        'charm_abilities', 'charm_prerequisite_abilities', 'charm_prerequisite_charms',
        'charm_choice_options', 'charm_target_options', 'charm_library', 'exalt_types',
    ];

    public function handle(): int
    {
        $directory = rtrim((string) $this->argument('directory'), '/');
        $charms = $this->read("{$directory}/charms.json");
        $tiers = $this->read("{$directory}/essence_tiers.json");
        $exaltTypes = $this->read("{$directory}/exalt_types.json");

        $rows = $this->rows($charms, $tiers, $exaltTypes);

        DB::transaction(function () use ($rows) {
            foreach (self::TABLES as $table) {
                DB::table($table)->delete();
            }
            foreach (array_reverse(self::TABLES) as $table) {
                foreach (array_chunk($rows[$table], 200) as $chunk) {
                    DB::table($table)->insert($chunk);
                }
            }
            foreach (self::TABLES as $table) {
                $count = DB::table($table)->count();
                if ($count !== count($rows[$table])) {
                    throw new RuntimeException("{$table}: expected ".count($rows[$table])." rows, found {$count}.");
                }
            }
        });

        $this->table(['Table', 'Rows'], array_map(fn (string $t) => [$t, count($rows[$t])], self::TABLES));
        $this->info('Game content imported.');

        return self::SUCCESS;
    }

    /**
     * @param  list<array<string, mixed>>  $charms
     * @param  list<array<string, mixed>>  $tiers
     * @param  list<array<string, mixed>>  $exaltTypes
     * @return array<string, list<array<string, mixed>>>
     */
    private function rows(array $charms, array $tiers, array $exaltTypes): array
    {
        $rows = array_fill_keys(self::TABLES, []);

        foreach ($charms as $charm) {
            $rows['charm_library'][] = [
                'id' => $charm['id'],
                'type' => $charm['type'],
                'name' => $charm['name'],
                'page' => $charm['page'],
                'description' => $charm['description'],
                'mechanical_key' => $charm['mechanical_key'],
                'mechanical_description' => $charm['mechanical_description'],
                'prerequisite_essence' => $charm['prerequisite_essence'],
                'choice_type' => $charm['choice_type'],
                'target_choice_type' => $charm['target_choice_type'],
                'multiselect_cap_basis' => $charm['multiselect_cap_basis'],
                'pick_counts' => $charm['pick_counts'] === null ? null : json_encode($charm['pick_counts']),
                'needs_review' => (bool) $charm['needs_review'],
                'review_action' => $charm['review_action'],
                'created_at' => $this->timestamp($charm['created_at']),
                'updated_at' => $this->timestamp($charm['updated_at']),
            ];

            foreach ($charm['charm_abilities'] as $i => $row) {
                $rows['charm_abilities'][] = ['charm_id' => $charm['id'], 'ability' => $row['ability'], 'position' => $i];
            }
            foreach ($charm['charm_prerequisite_abilities'] as $i => $row) {
                $rows['charm_prerequisite_abilities'][] = ['id' => $row['id'], 'charm_id' => $charm['id'], 'text' => $row['text'], 'position' => $i];
            }
            foreach ($charm['charm_prerequisite_charms'] as $i => $row) {
                $rows['charm_prerequisite_charms'][] = ['id' => $row['id'], 'charm_id' => $charm['id'], 'charm_name' => $row['charm_name'], 'position' => $i];
            }
            foreach (['charm_choice_options', 'charm_target_options'] as $table) {
                foreach ($charm[$table] as $row) {
                    $rows[$table][] = ['charm_id' => $charm['id'], 'option' => $row['option'], 'sort_order' => $row['sort_order']];
                }
            }
            foreach ($charm['charm_modes'] as $i => $mode) {
                $rows['charm_modes'][] = [
                    'id' => $mode['id'],
                    'charm_id' => $charm['id'],
                    'label' => $mode['label'],
                    'mode_text' => $mode['mode_text'],
                    'prerequisite_essence' => $mode['prerequisite_essence'],
                    'position' => $i,
                ];
                foreach ($mode['charm_mode_prerequisite_abilities'] as $j => $row) {
                    $rows['charm_mode_prerequisite_abilities'][] = ['id' => $row['id'], 'mode_id' => $mode['id'], 'text' => $row['text'], 'position' => $j];
                }
            }
        }

        foreach ($tiers as $tier) {
            $rows['charm_essence_tiers'][] = [
                'id' => $tier['id'],
                'charm_id' => $tier['charm_id'],
                'mode_id' => $tier['mode_id'],
                'essence_threshold' => $tier['essence_threshold'],
                'effect_text' => $tier['effect_text'],
            ];
        }

        foreach ($exaltTypes as $type) {
            $rows['exalt_types'][] = [
                'id' => $type['id'],
                'name' => $type['name'],
                'caste_label' => $type['caste_label'],
                'castes' => json_encode($type['castes']),
                'sort_order' => $type['sort_order'],
                'created_at' => $this->timestamp($type['created_at']),
                'updated_at' => $this->timestamp($type['updated_at']),
            ];
        }

        return $rows;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function read(string $path): array
    {
        if (! is_file($path)) {
            throw new RuntimeException("Missing export file: {$path}");
        }

        $rows = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($rows) || ! array_is_list($rows)) {
            throw new RuntimeException("{$path} is not a JSON list of rows.");
        }

        /** @var list<array<string, mixed>> $rows */
        return $rows;
    }

    /** Supabase timestamps carry a UTC offset; MySQL stores them as plain UTC. */
    private function timestamp(?string $value): ?string
    {
        return $value === null ? null : Carbon::parse($value)->utc()->format('Y-m-d H:i:s');
    }
}
