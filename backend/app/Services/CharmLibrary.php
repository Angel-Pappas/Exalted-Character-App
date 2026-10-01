<?php

namespace App\Services;

use App\Models\Charm;
use Illuminate\Support\Facades\DB;

/**
 * Reads and writes the charm library together with its child lists.
 *
 * The JSON shape matches what the front end received from Supabase (each charm
 * row with its child rows nested under the child table's name), so the React
 * code that maps it did not have to change.
 */
class CharmLibrary
{
    /**
     * Every charm, ordered by type, page (charms without a page last), then
     * name, with the id as a tie-breaker so identical entries keep a stable order.
     *
     * @return list<array<string, mixed>>
     */
    public function all(): array
    {
        $charms = Charm::query()
            ->orderBy('type')
            ->orderByRaw('page is null')
            ->orderBy('page')
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        $lists = [
            'charm_abilities' => $this->grouped('charm_abilities', 'charm_id', ['ability'], 'position'),
            'charm_modes' => $this->modesByCharm(),
            'charm_prerequisite_abilities' => $this->grouped('charm_prerequisite_abilities', 'charm_id', ['text'], 'position'),
            'charm_prerequisite_charms' => $this->grouped('charm_prerequisite_charms', 'charm_id', ['charm_name'], 'position'),
            'charm_choice_options' => $this->grouped('charm_choice_options', 'charm_id', ['option', 'sort_order'], 'sort_order'),
            'charm_target_options' => $this->grouped('charm_target_options', 'charm_id', ['option', 'sort_order'], 'sort_order'),
        ];

        $result = [];
        foreach ($charms as $charm) {
            $row = $charm->toArray();
            foreach ($lists as $key => $byCharm) {
                $row[$key] = $byCharm[$charm->id] ?? [];
            }
            $result[] = $row;
        }

        return $result;
    }

    /**
     * Create a charm (no `$charm`) or replace an existing charm's fields and
     * editable lists. Modes and essence tiers are not edited through the app, so
     * they are left untouched.
     *
     * @param  array<string, mixed>  $fields
     * @param  array{abilities: list<string>, prerequisite_abilities: list<string>, prerequisite_charms: list<string>, choice_options: list<string>, target_options: list<string>}  $lists
     */
    public function save(array $fields, array $lists, ?Charm $charm = null): Charm
    {
        return DB::transaction(function () use ($fields, $lists, $charm) {
            $charm ??= new Charm;
            $charm->fill($fields)->save();

            $this->replace($charm, 'charm_abilities', 'ability', 'position', $lists['abilities']);
            $this->replace($charm, 'charm_prerequisite_abilities', 'text', 'position', $lists['prerequisite_abilities'], withId: true);
            $this->replace($charm, 'charm_prerequisite_charms', 'charm_name', 'position', $lists['prerequisite_charms'], withId: true);
            $this->replace($charm, 'charm_choice_options', 'option', 'sort_order', $lists['choice_options']);
            $this->replace($charm, 'charm_target_options', 'option', 'sort_order', $lists['target_options']);

            return $charm;
        });
    }

    /**
     * @param  list<string>  $values
     */
    private function replace(Charm $charm, string $table, string $column, string $orderColumn, array $values, bool $withId = false): void
    {
        DB::table($table)->where('charm_id', $charm->id)->delete();

        $rows = array_map(fn (string $value, int $i) => [
            ...($withId ? ['id' => (string) str()->uuid()] : []),
            'charm_id' => $charm->id,
            $column => $value,
            $orderColumn => $i,
        ], $values, array_keys($values));

        if ($rows !== []) {
            DB::table($table)->insert($rows);
        }
    }

    /**
     * Child rows of one table keyed by their parent's id, each reduced to
     * `$columns`, in `$orderColumn` order.
     *
     * @param  list<string>  $columns
     * @return array<string, list<array<string, mixed>>>
     */
    private function grouped(string $table, string $parentColumn, array $columns, string $orderColumn): array
    {
        $rows = DB::table($table)
            ->orderBy($parentColumn)
            ->orderBy($orderColumn)
            ->get([$parentColumn, ...$columns]);

        $grouped = [];
        foreach ($rows as $row) {
            $item = [];
            foreach ($columns as $column) {
                $item[$column] = $column === 'sort_order' ? (int) $row->{$column} : $row->{$column};
            }
            $grouped[(string) $row->{$parentColumn}][] = $item;
        }

        return $grouped;
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function modesByCharm(): array
    {
        $prereqs = $this->grouped('charm_mode_prerequisite_abilities', 'mode_id', ['text'], 'position');

        $modes = DB::table('charm_modes')
            ->orderBy('charm_id')
            ->orderBy('position')
            ->get(['id', 'charm_id', 'label', 'mode_text', 'prerequisite_essence']);

        $grouped = [];
        foreach ($modes as $mode) {
            $grouped[(string) $mode->charm_id][] = [
                'label' => $mode->label,
                'mode_text' => $mode->mode_text,
                'prerequisite_essence' => $mode->prerequisite_essence === null ? null : (int) $mode->prerequisite_essence,
                'charm_mode_prerequisite_abilities' => $prereqs[(string) $mode->id] ?? [],
            ];
        }

        return $grouped;
    }
}
