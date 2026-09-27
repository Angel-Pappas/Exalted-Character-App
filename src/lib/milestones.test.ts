import { describe, it, expect } from 'vitest'
import {
  dateKey, formatDate, isValidEntry, parseAmount, remaining, sortLedger, todayKey, totalEarned, totalSpent,
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

  it('Character Creation rows never touch the totals, even if they carry numbers', () => {
    const withCreation = [...ledger, tx({ kind: 'creation', personal: 3, description: 'Charm (Bulwark Stance)' })]
    expect(totalEarned(withCreation, 'personal')).toBe(6)
    expect(remaining(withCreation, 'personal')).toBe(5)
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

  it('an expense needs a description but may cost nothing (free charms)', () => {
    expect(isValidEntry('purchase', none, 'Racing Hare Method')).toBe(true)
    expect(isValidEntry('purchase', { ...none, personal: 1 }, '   ')).toBe(false)
  })

  it('a creation note needs only a description', () => {
    expect(isValidEntry('creation', none, 'Charm (Ox-Body Technique)')).toBe(true)
    expect(isValidEntry('creation', none, '')).toBe(false)
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

  it('formats day-first like the spreadsheet, without month/day ambiguity', () => {
    expect(formatDate('2026-01-03')).toBe('3 Jan 2026')
    expect(formatDate('2026-09-26')).toBe('26 Sep 2026')
    expect(formatDate('')).toBe('—')
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
  const logged = [s2, buy1a, start, s1, buy1b] // deliberately scrambled across dates
  const names = (list: MilestoneTransaction[]) => list.map(t => t.description)

  it('oldest-first puts undated rows on top, then by date, same-day rows in logged order', () => {
    expect(names(sortLedger(logged, 'oldest'))).toEqual(['start', 'buy1a', 's1', 'buy1b', 's2'])
  })

  it('newest-first is the exact reverse', () => {
    expect(names(sortLedger(logged, 'newest'))).toEqual(['s2', 'buy1b', 's1', 'buy1a', 'start'])
  })

  it('does not mutate the stored list', () => {
    const copy = [...logged]
    sortLedger(logged, 'newest')
    expect(logged).toEqual(copy)
  })
})
