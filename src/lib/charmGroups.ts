import type { CharacterCharm, CharmColumn, CharmGroup } from '../types/character'

// Player-made groups for the Charms panel. Groups belong to one character and
// a charm sits in at most one group (CharacterCharm.groupId); a charm with no
// groupId — or one pointing at a group that no longer exists — is ungrouped.
// Each group stacks its cards in two columns (CharacterCharm.column); order
// within a column is the charms' order in the character's charms array.

// The colours a group can take, as Tailwind classes for its accent stripe and dot.
export const GROUP_COLORS = {
  amber:   { label: 'Amber',   bar: 'border-t-amber-500',   dot: 'bg-amber-500' },
  red:     { label: 'Red',     bar: 'border-t-red-500',     dot: 'bg-red-500' },
  emerald: { label: 'Green',   bar: 'border-t-emerald-500', dot: 'bg-emerald-500' },
  sky:     { label: 'Blue',    bar: 'border-t-sky-500',     dot: 'bg-sky-500' },
  violet:  { label: 'Purple',  bar: 'border-t-violet-500',  dot: 'bg-violet-500' },
  pink:    { label: 'Pink',    bar: 'border-t-pink-500',    dot: 'bg-pink-500' },
  stone:   { label: 'Grey',    bar: 'border-t-stone-500',   dot: 'bg-stone-500' },
} as const

export type GroupColor = keyof typeof GROUP_COLORS

export const DEFAULT_GROUP_COLOR: GroupColor = 'amber'

export function isGroupColor(value: string): value is GroupColor {
  return Object.hasOwn(GROUP_COLORS, value)
}

// The colour classes to draw a group with; an unknown stored colour falls back
// to the default rather than rendering unstyled.
export function groupColor(group: CharmGroup) {
  return GROUP_COLORS[isGroupColor(group.color) ? group.color : DEFAULT_GROUP_COLOR]
}

// Splits charms into one bucket per group (in group order) plus the ungrouped
// rest, keeping each charm's array order inside its bucket.
export function partitionCharms(charms: CharacterCharm[], groups: CharmGroup[]): {
  grouped: { group: CharmGroup; charms: CharacterCharm[] }[]
  ungrouped: CharacterCharm[]
} {
  const known = new Set(groups.map(g => g.id))
  return {
    grouped: groups.map(group => ({ group, charms: charms.filter(c => c.groupId === group.id) })),
    ungrouped: charms.filter(c => !c.groupId || !known.has(c.groupId)),
  }
}

// Case-insensitive name match; an empty query keeps everything.
export function filterCharms(charms: CharacterCharm[], query: string): CharacterCharm[] {
  const q = query.trim().toLowerCase()
  return q ? charms.filter(c => c.name.toLowerCase().includes(q)) : charms
}

// A new group, or null when the name is blank.
export function newGroup(id: string, name: string, color: GroupColor): CharmGroup | null {
  const trimmed = name.trim()
  return trimmed ? { id, name: trimmed, color } : null
}

// Applies an edit to one group. A blank name keeps the old one.
export function editGroup(groups: CharmGroup[], id: string, changes: { name: string; color: GroupColor }): CharmGroup[] {
  return groups.map(g => g.id === id
    ? { ...g, name: changes.name.trim() || g.name, color: changes.color }
    : g)
}

// Deleting a group never deletes charms: its charms become ungrouped.
export function deleteGroup(groups: CharmGroup[], charms: CharacterCharm[], id: string): { groups: CharmGroup[]; charms: CharacterCharm[] } {
  return {
    groups: groups.filter(g => g.id !== id),
    charms: charms.map(c => c.groupId === id ? withoutGroup(c) : c),
  }
}

// Moves a group so it sits just before `beforeId` (or last when null/unknown).
export function moveGroup(groups: CharmGroup[], id: string, beforeId: string | null): CharmGroup[] {
  const moving = groups.find(g => g.id === id)
  if (!moving || id === beforeId) return groups
  const rest = groups.filter(g => g.id !== id)
  const at = beforeId === null ? -1 : rest.findIndex(g => g.id === beforeId)
  rest.splice(at < 0 ? rest.length : at, 0, moving)
  return rest
}

// Splits one group's charms into its two columns, keeping array order inside
// each. A charm with no column yet (new, or never dragged) goes to whichever
// column has fewer cards so far, ties to the left.
export function splitColumns(members: CharacterCharm[]): [CharacterCharm[], CharacterCharm[]] {
  const columns: [CharacterCharm[], CharacterCharm[]] = [[], []]
  for (const c of members) {
    const col: CharmColumn = c.column ?? (columns[1].length < columns[0].length ? 1 : 0)
    columns[col].push(c)
  }
  return columns
}

// The column with fewer cards, where a charm dropped on a group's header goes.
export function shorterColumn(members: CharacterCharm[]): CharmColumn {
  const [left, right] = splitColumns(members)
  return right.length < left.length ? 1 : 0
}

// Writes every charm's on-screen column into it, so moving one card can never
// make an automatically placed card hop to the other column.
export function pinColumns(charms: CharacterCharm[], groups: CharmGroup[]): CharacterCharm[] {
  const { grouped, ungrouped } = partitionCharms(charms, groups)
  const column = new Map<string, CharmColumn>()
  for (const members of [...grouped.map(g => g.charms), ungrouped]) {
    splitColumns(members).forEach((cards, col) => { for (const c of cards) column.set(c.id, col as CharmColumn) })
  }
  return charms.map(c => {
    const col = column.get(c.id) ?? 0
    return c.column === col ? c : { ...c, column: col }
  })
}

// Puts a charm into a group's column (groupId null = Ungrouped): just above
// `beforeId` when dropped on a card, otherwise at the bottom of that column.
// A column's order is the charms' array order, so the end of the array is the
// bottom of every column.
export function moveCharm(
  charms: CharacterCharm[],
  groups: CharmGroup[],
  charmId: string,
  target: { groupId: string | null; column: CharmColumn; beforeId?: string | null },
): CharacterCharm[] {
  const charm = charms.find(c => c.id === charmId)
  const beforeId = target.beforeId ?? null
  if (!charm || charmId === beforeId) return charms
  const base = target.groupId === null ? withoutGroup(charm) : { ...charm, groupId: target.groupId }
  const moved = { ...base, column: target.column }
  const rest = pinColumns(charms, groups).filter(c => c.id !== charmId)
  const at = beforeId === null ? -1 : rest.findIndex(c => c.id === beforeId)
  rest.splice(at < 0 ? rest.length : at, 0, moved)
  return rest
}

// Leaving a group also forgets the column, so the charm is placed afresh.
function withoutGroup(charm: CharacterCharm): CharacterCharm {
  const copy = { ...charm }
  delete copy.groupId
  delete copy.column
  return copy
}
