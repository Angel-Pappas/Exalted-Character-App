import { describe, expect, it } from 'vitest'
import type { LibraryCharm } from '../types/character'
import { charmPayload } from './charmPayload'

function charm(overrides: Partial<LibraryCharm> = {}): LibraryCharm {
  return {
    id: 'c1', type: ' Solar ', abilities: ['Melee'], name: '  Excellent Strike ', page: 255,
    description: ' Text. ', mechanicalKey: null, mechanicalDescription: '', prerequisiteAbilities: ['Melee 1'],
    prerequisiteEssence: 1, prerequisiteCharms: ['Other Charm'], modes: [],
    choiceType: 'custom', choiceOptions: ['A', 'B'], targetChoiceType: 'custom', targetOptions: ['T'],
    multiselectCapBasis: 'essence', pickCounts: [2, 1],
    ...overrides,
  }
}

describe('charmPayload', () => {
  it('trims text, blanks empty optional fields and sends every list', () => {
    expect(charmPayload(charm())).toEqual({
      type: 'Solar', name: 'Excellent Strike', page: 255, description: 'Text.',
      mechanical_key: null, mechanical_description: null, prerequisite_essence: 1,
      choice_type: 'custom', target_choice_type: null, multiselect_cap_basis: null, pick_counts: [2, 1],
      abilities: ['Melee'], prerequisite_abilities: ['Melee 1'], prerequisite_charms: ['Other Charm'],
      choice_options: ['A', 'B'], target_options: [],
    })
  })

  it('falls back to Universal for a blank type', () => {
    expect(charmPayload(charm({ type: '  ' })).type).toBe('Universal')
  })

  it('keeps multiselect target settings only for multiselect charms', () => {
    const payload = charmPayload(charm({ choiceType: 'multiselect' }))
    expect(payload).toMatchObject({
      target_choice_type: 'custom', multiselect_cap_basis: 'essence', target_options: ['T'],
      choice_options: ['A', 'B'], pick_counts: null,
    })
    expect(charmPayload(charm({ choiceType: 'multiselect', targetChoiceType: 'ability' })).target_options).toEqual([])
  })

  it('drops the option list and pick schedule for freetext charms', () => {
    expect(charmPayload(charm({ choiceType: 'freetext' }))).toMatchObject({ choice_options: [], pick_counts: null })
    expect(charmPayload(charm({ choiceType: null }))).toMatchObject({ choice_options: [], pick_counts: null, target_options: [] })
  })
})
