import type { CharmLibraryRow } from '../components/CharmLibraryTab'
import type { LibraryCharm } from '../types/character'

// A charm library row from the API as the character sheet uses it (the Add Charm
// browser and the charm window).
export function sheetLibraryCharm(r: CharmLibraryRow): LibraryCharm {
  return {
    id: r.id, type: r.type ?? 'Universal',
    abilities: (r.charm_abilities ?? []).map(a => a.ability),
    name: r.name, page: r.page, description: r.description, summary: r.summary ?? null,
    mechanicalKey: r.mechanical_key ?? null, mechanicalDescription: r.mechanical_description ?? null,
    prerequisiteAbilities: (r.charm_prerequisite_abilities ?? []).map(p => p.text),
    prerequisiteEssence: r.prerequisite_essence ?? null,
    prerequisiteCharms: (r.charm_prerequisite_charms ?? []).map(p => p.charm_name),
    modes: (r.charm_modes ?? []).map(m => ({
      label: m.label, text: m.mode_text, prerequisiteEssence: m.prerequisite_essence,
      prerequisiteAbilities: (m.charm_mode_prerequisite_abilities ?? []).map(p => p.text),
    })),
    choiceType: r.choice_type ?? null,
    choiceOptions: (r.charm_choice_options ?? []).sort((a, b) => a.sort_order - b.sort_order).map(o => o.option),
    targetChoiceType: r.target_choice_type ?? null,
    targetOptions: (r.charm_target_options ?? []).sort((a, b) => a.sort_order - b.sort_order).map(o => o.option),
    multiselectCapBasis: r.multiselect_cap_basis ?? null,
    pickCounts: r.pick_counts ?? null,
  }
}
