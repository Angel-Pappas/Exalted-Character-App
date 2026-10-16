import { describe, it, expect } from 'vitest'
import { buyCharm, charmLine, charmsInEffect, removeCharm, trainingByCharm, undoCharmPurchase } from './charmTraining'
import type { CharacterCharm, LibraryCharm, MilestoneTransaction } from '../types/character'

// Angel, 2026-10-16: buying a charm logs the milestones spent on it, which starts
// a training; the charm shows on the sheet at once, marked in training, and its
// effects wait until the player or Storyteller marks the training done.

const lib = (overrides: Partial<LibraryCharm> = {}): LibraryCharm => ({
  id: 'ox', type: 'Universal', abilities: [], name: 'Ox-Body Technique', page: null, description: 'Text.', summary: null,
  mechanicalKey: 'ox_body', mechanicalDescription: null, prerequisiteAbilities: [], prerequisiteEssence: null,
  prerequisiteCharms: [], modes: [], choiceType: null, choiceOptions: [], targetChoiceType: null, targetOptions: [],
  multiselectCapBasis: null, pickCounts: null,
  commitMotes: 0, commitNeedsRepurchase: false, ongoing: false, purchaseLimit: null, ...overrides,
})
const exalted4 = { kind: 'purchase' as const, amounts: { personal: 0, exalted: 4, minor: 0, major: 0 }, training: true }
const ids = (n: number) => ({ charm: `c${n}`, line: `l${n}` })

function bought(times: number, l: LibraryCharm = lib()) {
  let state = { charms: [] as CharacterCharm[], milestones: [] as MilestoneTransaction[] }
  for (let i = 1; i <= times; i++) state = buyCharm(state, l, null, exalted4, ids(i), `2026-10-0${i}`)
  return state
}

describe('buying a charm logs what paid for it', () => {
  it('adds the charm and an Expense in training, linked to it', () => {
    const { charms, milestones } = bought(1)
    expect(charms).toHaveLength(1)
    expect(milestones).toEqual([{
      id: 'l1', kind: 'purchase', personal: 0, exalted: 4, minor: 0, major: 0,
      description: 'Charm (Ox-Body Technique)', date: '2026-10-01', training: true,
      charm: { libraryId: 'ox', name: 'Ox-Body Technique' },
    }])
  })

  it('names a second purchase a repurchase', () => {
    expect(bought(2).milestones[1].description).toBe('Charm (Ox-Body Technique) repurchase')
    expect(bought(2).charms[0].count).toBe(2)
  })

  it('logs a character-creation charm as a free, undated note with no training', () => {
    const line = charmLine(lib(), false, { kind: 'creation' }, 'l', '2026-10-16')
    expect(line).toMatchObject({ kind: 'creation', exalted: 0, date: '', charm: { libraryId: 'ox' } })
    expect(line.training).toBeUndefined()
  })

  it('can skip the training (e.g. a charm the Storyteller hands out)', () => {
    expect(charmLine(lib(), false, { ...exalted4, training: false }, 'l', '2026-10-16').training).toBeUndefined()
  })
})

describe('undoing and removing take the ledger line with them', () => {
  it('undo drops the latest purchase and its line, keeping the earlier one', () => {
    const { charms, milestones } = undoCharmPurchase(bought(2), lib())
    expect(charms[0].count).toBe(1)
    expect(milestones.map(m => m.id)).toEqual(['l1'])
  })

  it('removing the charm drops every line that paid for it, and nothing else', () => {
    const other: MilestoneTransaction = { id: 'pay', kind: 'gain', personal: 3, exalted: 0, minor: 0, major: 0, description: 'Session', date: '' }
    const state = bought(2)
    const { charms, milestones } = removeCharm({ ...state, milestones: [other, ...state.milestones] }, 'c1')
    expect(charms).toEqual([])
    expect(milestones).toEqual([other])
  })

  it('leaves the ledger alone for a charm bought before the link existed', () => {
    const state = { charms: bought(1).charms, milestones: [] }
    expect(undoCharmPurchase(state, lib()).milestones).toEqual([])
  })
})

describe('effects wait for the training', () => {
  it('a charm whose only purchase is in training has no effect yet', () => {
    const { charms, milestones } = bought(1)
    expect(charmsInEffect(charms, trainingByCharm(milestones, {}))).toEqual([])
  })

  it('works once the training is done', () => {
    const { charms, milestones } = bought(1)
    expect(charmsInEffect(charms, trainingByCharm(milestones, { l1: '2026-10-10' }))).toEqual(charms)
  })

  it('a repurchase in training leaves the earlier purchases working', () => {
    const state = bought(3)
    const withPicks = state.charms.map(c => ({ ...c, oxBodyPicks: ['zero', 'twoInjured', 'zero'] as const }))
    const [ox] = charmsInEffect(withPicks.map(c => ({ ...c, oxBodyPicks: [...c.oxBodyPicks] })), trainingByCharm(state.milestones, { l1: 'x' }))
    expect(ox.count).toBe(1)
    expect(ox.oxBodyPicks).toEqual(['zero'])
  })

  it('keeps only the trained picks (Excellency: one ability per purchase)', () => {
    const excellency = lib({ id: 'ex', name: 'Excellency', mechanicalKey: 'excellency', choiceType: 'ability' })
    let state = { charms: [] as CharacterCharm[], milestones: [] as MilestoneTransaction[] }
    state = buyCharm(state, excellency, 'War', exalted4, ids(1), '2026-10-01')
    state = buyCharm(state, excellency, 'Embassy', exalted4, ids(2), '2026-10-02')
    const [ex] = charmsInEffect(state.charms, trainingByCharm(state.milestones, { l1: 'x' }))
    expect(ex.picks).toEqual(['War'])
  })

  it('charms bought before the link existed are unaffected', () => {
    const { charms } = bought(1)
    expect(charmsInEffect(charms, new Map())).toEqual(charms)
  })
})
