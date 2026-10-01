import type { CharmChoiceType, LibraryCharm } from '../types/character'

// 'custom' and 'multiselect' both draw from an admin-authored option list
// (charm_choice_options); the others don't need one.
export function usesOptionList(choiceType: CharmChoiceType | null): boolean {
  return choiceType === 'custom' || choiceType === 'multiselect'
}

// A pick schedule only makes sense for the list-based choice types (you pick
// N of a fixed list); ability/attribute/custom all qualify, freetext doesn't
// (nothing to count out of), multiselect has its own per-target cap system.
export function supportsPickSchedule(choiceType: CharmChoiceType | null): boolean {
  return choiceType === 'ability' || choiceType === 'attribute' || choiceType === 'custom'
}

/**
 * The body the API takes to create or save a library charm: the charm's own
 * fields plus every editable list. Settings that don't apply to the charm's
 * choice type are sent empty, so switching type clears stale options.
 */
export function charmPayload(charm: LibraryCharm) {
  const multiselect = charm.choiceType === 'multiselect'
  return {
    type: charm.type.trim() || 'Universal',
    name: charm.name.trim(),
    page: charm.page,
    description: charm.description.trim(),
    mechanical_key: charm.mechanicalKey || null,
    mechanical_description: charm.mechanicalDescription || null,
    prerequisite_essence: charm.prerequisiteEssence,
    choice_type: charm.choiceType,
    target_choice_type: multiselect ? charm.targetChoiceType : null,
    multiselect_cap_basis: multiselect ? charm.multiselectCapBasis : null,
    pick_counts: supportsPickSchedule(charm.choiceType) ? charm.pickCounts : null,
    abilities: charm.abilities,
    prerequisite_abilities: charm.prerequisiteAbilities,
    prerequisite_charms: charm.prerequisiteCharms,
    choice_options: usesOptionList(charm.choiceType) ? charm.choiceOptions : [],
    target_options: multiselect && charm.targetChoiceType === 'custom' ? charm.targetOptions : [],
  }
}
