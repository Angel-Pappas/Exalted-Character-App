import type { MilestoneKind, MilestoneTransaction, TrainingDone } from '../types/character'

// The milestone ledger works like Angel's spreadsheet: every row is Income,
// Expense, or a Character Creation note. Total = all income; Remaining =
// income minus expenses. Creation notes record what was bought with the
// starting build and never touch the totals.

export const MILESTONE_TYPES = ['personal', 'exalted', 'minor', 'major'] as const
export type MilestoneType = typeof MILESTONE_TYPES[number]

export type MilestoneAmounts = Record<MilestoneType, number>

/** What each milestone type can be spent on (Angel's house table). */
export const MILESTONE_USES: Record<MilestoneType, string[]> = {
  personal: ['New mode or repurchase a Charm', '1–3 dots of an Ability', '1 specialty'],
  exalted: ['New Charm (Universal or Exalt)', 'New mode or repurchase'],
  minor: ['New Universal or Exalt Charm', 'Ability by 1'],
  major: ['Attribute by 1'],
}

export const KIND_LABELS: Record<MilestoneKind, string> = {
  gain: 'Income',
  purchase: 'Expense',
  creation: 'Char. Creation',
}

export function totalEarned(entries: MilestoneTransaction[], type: MilestoneType): number {
  return entries
    .filter(e => e.kind === 'gain')
    .reduce((sum, e) => sum + (e[type] ?? 0), 0)
}

export function totalSpent(entries: MilestoneTransaction[], type: MilestoneType): number {
  return entries
    .filter(e => e.kind === 'purchase')
    .reduce((sum, e) => sum + (e[type] ?? 0), 0)
}

export function remaining(entries: MilestoneTransaction[], type: MilestoneType): number {
  return totalEarned(entries, type) - totalSpent(entries, type)
}

/** Parses a form field; blanks, junk and negatives all count as 0. */
export function parseAmount(raw: string): number {
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Whether an entry is worth saving. Income must award something, and an
 * Expense must spend something (Angel, 2026-10-16: no Expense without a
 * milestone; something free is a Char. Creation note). Expenses and creation
 * notes need a description, unless `named`: what they bought on the sheet
 * (a charm, dots, a specialty) names them.
 */
export function isValidEntry(kind: MilestoneKind, amounts: MilestoneAmounts, description: string, named = false): boolean {
  const spends = MILESTONE_TYPES.some(t => amounts[t] > 0)
  const described = named || description.trim() !== ''
  if (kind === 'gain') return spends
  if (kind === 'purchase') return spends && described
  return described
}

/**
 * The calendar day an entry belongs to, as YYYY-MM-DD, or '' if undated.
 * Older entries stored a full ISO timestamp; newer ones store the day only.
 */
export function dateKey(date: string | undefined): string {
  if (!date) return ''
  const day = date.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ''
}

/** Today's date in the viewer's own timezone, as YYYY-MM-DD. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Ledger order. Oldest-first reads like the spreadsheet: the Char. Creation
 * rows on top, then undated entries (the starting build), then by date;
 * entries sharing a date keep the order they were logged in. Newest-first is
 * the exact reverse, so the creation rows sink to the bottom.
 */
export function sortLedger(entries: MilestoneTransaction[], order: 'oldest' | 'newest'): MilestoneTransaction[] {
  const creation = entries.filter(e => e.kind === 'creation')
  const rest = entries
    .map((entry, index) => ({ entry, index, key: dateKey(entry.date) }))
    .filter(x => x.entry.kind !== 'creation')
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.index - b.index))
    .map(x => x.entry)
  const oldest = [...creation, ...rest]
  return order === 'oldest' ? oldest : oldest.reverse()
}

/**
 * The Expenses still in training, the longest-waiting first. Only entries
 * flagged `training` count: everything logged before training existed is
 * treated as already done.
 */
export function inTraining(entries: MilestoneTransaction[], done: TrainingDone): MilestoneTransaction[] {
  return entries
    .map((entry, index) => ({ entry, index, key: dateKey(entry.date) }))
    .filter(x => x.entry.kind === 'purchase' && x.entry.training === true && !(x.entry.id in done))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.index - b.index))
    .map(x => x.entry)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A YYYY-MM-DD day as "12 Oct", with the year only when it isn't this year's. */
export function formatDay(key: string, today: string = todayKey()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return ''
  const [y, m, d] = key.split('-')
  const day = `${Number(d)} ${MONTHS[Number(m) - 1]}`
  return y === today.slice(0, 4) ? day : `${day} ${y}`
}
