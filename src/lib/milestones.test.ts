import { describe, it, expect } from 'vitest'
import {
  MILESTONE_TYPES, MILESTONE_USES, dateKey, entryLabel, formatDay, inTraining, isValidEntry, normalizeLedger, parseAmount, remaining, sortLedger, todayKey, totalEarned, totalSpent,
} from './milestones'
import type { MilestoneTransaction } from '../types/character'

// Each test states a rule of the spreadsheet ledger the app replaces.

const tx = (over: Partial<MilestoneTransaction> & Pick<MilestoneTransaction, 'kind'>): MilestoneTransaction => ({
  id: crypto.randomUUID(), personal: 0, exalted: 0, minor: 0, major: 0, description: '', date: '', ...over,
})

const none = { personal: 0, exalted: 0, minor: 0, major: 0 }

describe('Totals — "Total = income; Remaining = Total minus expenses"', () => {
  const ledger = [
    tx({ kind: 'gain', personal: 5, exalted: 7, minor: 2 }),
    tx({ kind: 'purchase', personal: 1 }),
    tx({ kind: 'purchase', minor: 1 }),
    tx({ kind: 'gain', personal: 1, major: 1 }),
    tx({ kind: 'purchase', major: 1 }),
  ]

  it('Total counts income only', () => {
    expect(totalEarned(ledger, 'personal')).toBe(6)
    expect(totalEarned(ledger, 'exalted')).toBe(7)
    expect(totalEarned(ledger, 'major')).toBe(1)
  })

  it('Remaining subtracts every expense in that column', () => {
    expect(totalSpent(ledger, 'personal')).toBe(1)
    expect(remaining(ledger, 'personal')).toBe(5)
    expect(remaining(ledger, 'minor')).toBe(1)
    expect(remaining(ledger, 'major')).toBe(0)
  })

  it('each milestone type is tracked separately', () => {
    expect(remaining(ledger, 'exalted')).toBe(7) // no exalted expenses
  })

  it('Free and Char. Creation expenses never touch the totals, even if they carry numbers', () => {
    const withFree = [...ledger,
      tx({ kind: 'purchase', cost: 'creation', personal: 3, description: 'Charm (Bulwark Stance)' }),
      tx({ kind: 'purchase', cost: 'free', personal: 2, description: 'Charm ([Presence] Excellency)' }),
    ]
    expect(totalEarned(withFree, 'personal')).toBe(6)
    expect(totalSpent(withFree, 'personal')).toBe(1)
    expect(remaining(withFree, 'personal')).toBe(5)
  })

  it('an empty ledger is all zeroes', () => {
    expect(totalEarned([], 'minor')).toBe(0)
    expect(remaining([], 'minor')).toBe(0)
  })
})

describe('Entry validation', () => {
  it('income must award at least one milestone', () => {
    expect(isValidEntry('gain', none, 'Session 3/1/26')).toBe(false)
    expect(isValidEntry('gain', { ...none, minor: 1 }, '')).toBe(true)
  })

  it('an expense must spend at least one milestone, and say what on', () => {
    expect(isValidEntry('purchase', none, 'Racing Hare Method')).toBe(false)
    expect(isValidEntry('purchase', { ...none, exalted: 1 }, 'Racing Hare Method')).toBe(true)
    expect(isValidEntry('purchase', { ...none, personal: 1 }, '   ')).toBe(false)
  })

  it('something bought on the sheet names the entry, but an expense still has to spend', () => {
    expect(isValidEntry('purchase', { ...none, minor: 1 }, '', true)).toBe(true)
    expect(isValidEntry('purchase', none, '', true)).toBe(false)
    expect(isValidEntry('purchase', none, '', true, 'creation')).toBe(true)
  })

  it('an expense may spend nothing only when deliberately Free or Char. Creation, and still needs a description', () => {
    expect(isValidEntry('purchase', none, 'Charm ([Presence] Excellency)', false, 'free')).toBe(true)
    expect(isValidEntry('purchase', none, 'Charm (Ox Body Technique)', false, 'creation')).toBe(true)
    expect(isValidEntry('purchase', none, '', false, 'free')).toBe(false)
  })

  it('income is never free: Free does not make an empty income valid', () => {
    expect(isValidEntry('gain', none, 'Session', false, 'free')).toBe(false)
  })
})

describe('Type tags and old ledgers', () => {
  it('a line reads Income, Expense, Free or Char. Creation', () => {
    expect(entryLabel({ kind: 'gain' })).toBe('Income')
    expect(entryLabel({ kind: 'purchase' })).toBe('Expense')
    expect(entryLabel({ kind: 'purchase', cost: 'free' })).toBe('Free')
    expect(entryLabel({ kind: 'purchase', cost: 'creation' })).toBe('Char. Creation')
  })

  it('turns an old Char. Creation line into an Expense marked creation, and leaves every other line alone', () => {
    const old = { ...tx({ kind: 'purchase', description: 'cc' }), kind: 'creation' } as unknown as MilestoneTransaction
    const paid = tx({ kind: 'purchase', exalted: 1 })
    const income = tx({ kind: 'gain', minor: 1 })
    const [converted, ...rest] = normalizeLedger([old, paid, income])
    expect(converted).toMatchObject({ kind: 'purchase', cost: 'creation', description: 'cc' })
    expect(rest).toEqual([paid, income])
  })
})

describe('parseAmount', () => {
  it('reads whole numbers and treats blank, junk and negatives as 0', () => {
    expect(parseAmount('2')).toBe(2)
    expect(parseAmount('')).toBe(0)
    expect(parseAmount('abc')).toBe(0)
    expect(parseAmount('-3')).toBe(0)
  })
})

describe('Dates', () => {
  it('accepts both day-only and older full-timestamp dates', () => {
    expect(dateKey('2026-01-03')).toBe('2026-01-03')
    expect(dateKey('2026-01-03T14:22:00.000Z')).toBe('2026-01-03')
  })

  it('treats missing or malformed dates as undated', () => {
    expect(dateKey('')).toBe('')
    expect(dateKey(undefined)).toBe('')
    expect(dateKey('3/1/26')).toBe('')
  })

  it('today is taken in local time, zero-padded', () => {
    expect(todayKey(new Date(2026, 0, 3, 23, 59))).toBe('2026-01-03')
  })
})

describe('Ledger order', () => {
  const start = tx({ kind: 'gain', description: 'start' })
  const s1 = tx({ kind: 'gain', description: 's1', date: '2026-01-03' })
  const buy1a = tx({ kind: 'purchase', description: 'buy1a', date: '2026-01-03' })
  const buy1b = tx({ kind: 'purchase', description: 'buy1b', date: '2026-01-03' })
  const s2 = tx({ kind: 'gain', description: 's2', date: '2026-01-30T10:00:00.000Z' })
  const cc1 = tx({ kind: 'purchase', cost: 'creation', description: 'cc1' })
  const cc2 = tx({ kind: 'purchase', cost: 'creation', description: 'cc2', date: '2026-09-01' }) // a date never moves a creation row
  const logged = [s2, cc1, buy1a, start, s1, cc2, buy1b] // deliberately scrambled across dates
  const names = (list: MilestoneTransaction[]) => list.map(t => t.description)

  it('oldest-first: creation rows on top, then undated rows, then by date, same-day rows in logged order', () => {
    expect(names(sortLedger(logged, 'oldest'))).toEqual(['cc1', 'cc2', 'start', 'buy1a', 's1', 'buy1b', 's2'])
  })

  it('newest-first is the exact reverse, so creation rows sit at the bottom', () => {
    expect(names(sortLedger(logged, 'newest'))).toEqual(['s2', 'buy1b', 's1', 'buy1a', 'start', 'cc2', 'cc1'])
  })

  it('does not mutate the stored list', () => {
    const copy = [...logged]
    sortLedger(logged, 'newest')
    expect(logged).toEqual(copy)
  })
})

describe('Spend options', () => {
  it('every milestone type lists at least one thing it can buy', () => {
    for (const t of MILESTONE_TYPES) expect(MILESTONE_USES[t].length).toBeGreaterThan(0)
  })
})

describe('Training — "spending milestones starts a training; the player or ST marks it done"', () => {
  const old = tx({ kind: 'purchase', description: 'Bought before training existed', date: '2026-09-01' })
  const late = tx({ kind: 'purchase', training: true, description: 'Excellent Strike', date: '2026-10-14' })
  const early = tx({ kind: 'purchase', training: true, description: 'Ox Body', date: '2026-10-02' })
  const finished = tx({ kind: 'purchase', training: true, description: 'Awareness 3', date: '2026-10-01' })
  const income = tx({ kind: 'gain', training: true, personal: 2 })
  const ledger = [old, late, income, early, finished]

  it('lists what is in training, the longest-waiting first', () => {
    expect(inTraining(ledger, { [finished.id]: '2026-10-10' })).toEqual([early, late])
  })

  it('treats Expenses logged before training existed as done', () => {
    expect(inTraining([old], {})).toEqual([])
  })

  it('only Expenses train — never Income or the starting build', () => {
    expect(inTraining([income, tx({ kind: 'purchase', cost: 'creation', training: true })], {})).toEqual([])
  })

  it('a Free expense can still be in training', () => {
    const gift = tx({ kind: 'purchase', cost: 'free', training: true, date: '2026-10-22' })
    expect(inTraining([gift], {})).toEqual([gift])
  })

  it('keeps logging order for trainings started the same day', () => {
    const a = tx({ kind: 'purchase', training: true, date: '2026-10-05' })
    const b = tx({ kind: 'purchase', training: true, date: '2026-10-05' })
    expect(inTraining([b, a], {})).toEqual([b, a])
  })

  it('shows days as "12 Oct", adding the year only when it is not this year', () => {
    expect(formatDay('2026-10-12', '2026-10-16')).toBe('12 Oct')
    expect(formatDay('2025-01-03', '2026-10-16')).toBe('3 Jan 2025')
    expect(formatDay('', '2026-10-16')).toBe('')
  })
})
