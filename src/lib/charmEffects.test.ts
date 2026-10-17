import { describe, expect, it } from 'vitest'
import type { AbilityData, CharacterCharm, LibraryCharm } from '../types/character'
import {
  charmHealthLevels, charmStatLines, defenseAbilities, statTotal, woundPenaltyAfterCharms, type EffectContext,
} from './charmEffects'
import type { ModeContext } from './charmUse'

// What charms change on the sheet (charmEffects.ts quotes the charm text for each).

const lib = (id: string, mechanicalKey: string, overrides: Partial<LibraryCharm> = {}): LibraryCharm => ({
  id, type: 'Universal', abilities: [], name: id, page: null, description: '', summary: null,
  mechanicalKey, mechanicalDescription: null, prerequisiteAbilities: [], prerequisiteEssence: null,
  prerequisiteCharms: [], modes: [], choiceType: null, choiceOptions: [], targetChoiceType: null, targetOptions: [],
  multiselectCapBasis: null, pickCounts: null, commitMotes: 1, commitNeedsRepurchase: false, ongoing: true, purchaseLimit: null,
  ...overrides,
})
const LIBS = [
  lib('kettle', 'iron_kettle', { commitMotes: 2, commitNeedsRepurchase: true }),
  lib('endurance', 'endurance_cuts', { commitMotes: 0 }),
  lib('mantis', 'mantis_form'),
  lib('earth', 'earth_dragon_form'),
  lib('viridian', 'viridian_rust'),
  lib('guardian', 'loyal_guardian'),
  lib('undying', 'undying_body', { commitMotes: 2 }),
  lib('fury', 'relentless_fury'),
  lib('maiden', 'heartless_maiden', { commitMotes: 2 }),
  lib('streaming', 'streaming_arrow'),
  lib('games', 'games_of_divinity', { commitMotes: 2 }),
  lib('ebon', 'ebon_shadow_form'),
  lib('joy', 'shining_joy', { commitMotes: 0, ongoing: false }),
  lib('soulfire', 'soul_fire_shaper', { commitMotes: 2 }),
]
const libs = new Map(LIBS.map(l => [l.id, l]))
const charm = (libraryId: string, overrides: Partial<CharacterCharm> = {}): CharacterCharm => ({
  id: libraryId, libraryId, name: libraryId, libraryDescription: '', libraryModes: [], libraryMechanicalKey: null,
  customDescription: null, mechanicalKeyOverride: null, mechanicalEnabled: true, inUse: true, ...overrides,
})
const ability = (rating: number): AbilityData => ({ rating, specialty: '', excellency: false })
const mode: ModeContext = { exaltType: 'Solar Exalted', caste: 'Dawn', essence: 2, abilities: {} }
const ctx = (overrides: Partial<EffectContext> = {}): EffectContext => ({
  ...mode, woundPenalty: 0, defendOther: false, armorEquipped: false, ...overrides,
})

describe('Defense bonuses from charms', () => {
  it('Iron Kettle Body: +1 Soak per lit dot, only while in use', () => {
    expect(charmStatLines([charm('kettle', { count: 2, litDots: 2 })], libs, ctx())).toEqual([{ name: 'kettle', stat: 'soak', value: 2 }])
    expect(charmStatLines([charm('kettle', { count: 2, litDots: 2, inUse: false })], libs, ctx())).toEqual([])
    expect(charmStatLines([charm('kettle', { count: 2, litDots: 0 })], libs, ctx())).toEqual([])
  })

  it('Endurance of a Thousand Cuts: the wound penalty as Soak', () => {
    expect(charmStatLines([charm('endurance')], libs, ctx({ woundPenalty: -2 }))).toEqual([{ name: 'endurance', stat: 'soak', value: 2 }])
    expect(charmStatLines([charm('endurance')], libs, ctx({ woundPenalty: 0 }))).toEqual([])
  })

  it('Mantis Form: +1 Parry, Evasion and Soak, each on its own line', () => {
    const lines = charmStatLines([charm('mantis')], libs, ctx())
    expect(lines.map(l => l.stat)).toEqual(['parry', 'evasion', 'soak'])
    expect(statTotal(lines, 'soak')).toBe(1)
    expect(statTotal(lines, 'hardness')).toBe(0)
  })

  it('Earth Dragon Form: +3 Soak; a Dragon-Blood also +1 Hardness', () => {
    expect(statTotal(charmStatLines([charm('earth')], libs, ctx()), 'soak')).toBe(3)
    expect(statTotal(charmStatLines([charm('earth')], libs, ctx()), 'hardness')).toBe(0)
    expect(statTotal(charmStatLines([charm('earth')], libs, ctx({ exaltType: 'Dragon-Blooded' })), 'hardness')).toBe(1)
  })

  it('Viridian Rust Defense: +2 Soak only while wearing armor', () => {
    expect(statTotal(charmStatLines([charm('viridian')], libs, ctx({ armorEquipped: true })), 'soak')).toBe(2)
    expect(statTotal(charmStatLines([charm('viridian')], libs, ctx()), 'soak')).toBe(0)
  })

  it('Loyal Guardian Approach: only its Alchemical and Janest modes, only while Defend Other is on', () => {
    const lines = (o: Partial<EffectContext>) => charmStatLines([charm('guardian')], libs, ctx({ defendOther: true, ...o }))
    expect(lines({})).toEqual([])
    expect(lines({ exaltType: 'Alchemical Exalted' }).map(l => l.stat)).toEqual(['parry', 'evasion', 'soak'])
    expect(lines({ exaltType: 'Exigents', caste: 'Janest' }).map(l => l.stat)).toEqual(['parry', 'evasion'])
    expect(lines({ exaltType: 'Alchemical Exalted', defendOther: false })).toEqual([])
  })

  it('Soul Fire Shaper Form: Essence counts 2 higher, so Hardness +2', () => {
    expect(statTotal(charmStatLines([charm('soulfire')], libs, ctx()), 'hardness')).toBe(2)
  })

  it('a charm with no in-use icon always applies; its absence from the list (in training) means nothing', () => {
    expect(charmStatLines([], libs, ctx())).toEqual([])
    expect(defenseAbilities([charm('joy', { inUse: false })], libs, mode, { Athletics: ability(1), Performance: ability(4) }).evasion)
      .toEqual({ ability: 'Performance', rating: 4, by: 'joy' })
  })
})

describe('Parry and Evasion from another Ability', () => {
  const abilities = {
    'Close Combat': ability(3), Athletics: ability(3), 'Ranged Combat': ability(5), Stealth: ability(1),
    Embassy: ability(2), Sagacity: ability(4), Performance: ability(2),
  }

  it('uses the book\'s Abilities with no charm in use', () => {
    const r = defenseAbilities([], libs, mode, abilities)
    expect(r.parry).toEqual({ ability: 'Close Combat', rating: 3, by: null })
    expect(r.evasion).toEqual({ ability: 'Athletics', rating: 3, by: null })
  })

  it('Streaming Arrow Stance: Ranged Combat for both', () => {
    const r = defenseAbilities([charm('streaming')], libs, mode, abilities)
    expect(r.parry.ability).toBe('Ranged Combat')
    expect(r.evasion.ability).toBe('Ranged Combat')
  })

  it('Ebon Shadow Form replaces Athletics with Stealth even when lower (it says "instead")', () => {
    expect(defenseAbilities([charm('ebon')], libs, mode, abilities).evasion).toEqual({ ability: 'Stealth', rating: 1, by: 'ebon' })
  })

  it('Games of Divinity Form: the higher of Embassy and Sagacity', () => {
    expect(defenseAbilities([charm('games')], libs, mode, abilities).parry).toEqual({ ability: 'Sagacity', rating: 4, by: 'games' })
  })

  it('Defense of Shining Joy only "may" — used when Performance is higher', () => {
    expect(defenseAbilities([charm('joy')], libs, mode, abilities).evasion.ability).toBe('Athletics')
  })

  it('off when not in use', () => {
    expect(defenseAbilities([charm('streaming', { inUse: false })], libs, mode, abilities).parry.ability).toBe('Close Combat')
  })
})

describe('health levels and wound penalty from charms', () => {
  it('Heartless Maiden Trance adds one Bruised level while in use', () => {
    expect(charmHealthLevels([charm('maiden')], libs, mode)).toEqual([{ name: 'maiden', count: 1 }])
    expect(charmHealthLevels([charm('maiden', { inUse: false })], libs, mode)).toEqual([])
  })

  it('Undying Body adds a Bruised level at Essence 3 and another at Essence 5', () => {
    expect(charmHealthLevels([charm('undying')], libs, { ...mode, essence: 2 })).toEqual([])
    expect(charmHealthLevels([charm('undying')], libs, { ...mode, essence: 3 })).toEqual([{ name: 'undying', count: 1 }])
    expect(charmHealthLevels([charm('undying')], libs, { ...mode, essence: 5 })).toEqual([{ name: 'undying', count: 2 }])
  })

  it('Undying Body and Relentless Lunar Fury each take 1 off, never past 0', () => {
    expect(woundPenaltyAfterCharms(-2, [charm('undying')], libs, mode).penalty).toBe(-1)
    expect(woundPenaltyAfterCharms(-2, [charm('undying'), charm('fury')], libs, mode).penalty).toBe(0)
    expect(woundPenaltyAfterCharms(-1, [charm('undying'), charm('fury')], libs, mode).penalty).toBe(0)
  })

  it('names the charms only when there is a penalty to change', () => {
    expect(woundPenaltyAfterCharms(-2, [charm('fury')], libs, mode).lines).toEqual([{ name: 'fury', text: '−1 to the wound penalty' }])
    expect(woundPenaltyAfterCharms(0, [charm('fury')], libs, mode).lines).toEqual([])
  })

  it('Earth Dragon Form lets a Dragon-Blood ignore the penalty', () => {
    expect(woundPenaltyAfterCharms(-4, [charm('earth')], libs, { ...mode, exaltType: 'Dragon-Blooded' }).penalty).toBe(0)
    expect(woundPenaltyAfterCharms(-4, [charm('earth')], libs, mode).penalty).toBe(-4)
  })
})
