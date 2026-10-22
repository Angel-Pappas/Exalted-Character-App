import type { FreeCost, MilestoneKind, MilestoneTransaction, TrainingDone } from '../types/character'

// The milestone ledger works like Angel's spreadsheet: every row is Income or
// an Expense. Total = all income; Remaining = income minus expenses. An Expense
// that spends nothing says why (`cost`): Free, or Char. Creation (bought with
// the starting build). Neither touches the totals.

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
}

export const FREE_LABELS: Record<FreeCost, string> = {
  free: 'Free',
  creation: 'Char. Creation',
}

/** What a line's type tag reads: Income, Expense, Free or Char. Creation. */
export function entryLabel(entry: Pick<MilestoneTransaction, 'kind' | 'cost'>): string {
  return entry.kind === 'purchase' && entry.cost ? FREE_LABELS[entry.cost] : KIND_LABELS[entry.kind]
}

const isCreation = (e: MilestoneTransaction) => e.kind === 'purchase' && e.cost === 'creation'

/**
 * Ledgers saved before 2026-10-22 have Char. Creation as a kind of its own;
 * it is now an Expense marked `cost: 'creation'`. Converts those lines (and
 * only those), so an old copy of the sheet still reads right.
 */
export function normalizeLedger(entries: MilestoneTransaction[]): MilestoneTransaction[] {
  return entries.map(e => ((e.kind as string) === 'creation' ? { ...e, kind: 'purchase', cost: 'creation' } : e))
}

export function totalEarned(entries: MilestoneTransaction[], type: MilestoneType): number {
  return entries
    .filter(e => e.kind === 'gain')
    .reduce((sum, e) => sum + (e[type] ?? 0), 0)
}

export function totalSpent(entries: MilestoneTransaction[], type: MilestoneType): number {
  return entries
    .filter(e => e.kind === 'purchase' && !e.cost)
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
 * Whether an entry is worth saving. Income must award something. An Expense
 * must spend something unless it is deliberately Free or Char. Creation
 * (Angel, 2026-10-22: spending nothing is a choice, never an accident), and
 * needs a description unless `named`: what it bought on the sheet (a charm,
 * dots, a specialty) names it.
 */
export function isValidEntry(kind: MilestoneKind, amounts: MilestoneAmounts, description: string, named = false, cost?: FreeCost): boolean {
  const spends = MILESTONE_TYPES.some(t => amounts[t] > 0)
  if (kind === 'gain') return spends
  return (spends || cost !== undefined) && (named || description.trim() !== '')
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
  const creation = entries.filter(isCreation)
  const rest = entries
    .map((entry, index) => ({ entry, index, key: dateKey(entry.date) }))
    .filter(x => !isCreation(x.entry))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.index - b.index))
    .map(x => x.entry)
  const oldest = [...creation, ...rest]
  return order === 'oldest' ? oldest : oldest.reverse()
}

/**
 * The Expenses still in training, the longest-waiting first. Only entries
 * flagged `training` count: everything logged before training existed is
 * treated as already done. The starting build never trains.
 */
export function inTraining(entries: MilestoneTransaction[], done: TrainingDone): MilestoneTransaction[] {
  return entries
    .map((entry, index) => ({ entry, index, key: dateKey(entry.date) }))
    .filter(x => x.entry.kind === 'purchase' && !isCreation(x.entry) && x.entry.training === true && !(x.entry.id in done))
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
