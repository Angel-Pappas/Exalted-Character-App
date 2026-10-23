// The character page's tabs. Each has its own address (/character/:id/milestones…),
// so the browser's Back button, reloads and middle-clicks all work on them.

export const CHARACTER_TABS = [
  { id: 'sheet', label: 'Character Sheet', short: 'Sheet' },
  { id: 'milestones', label: 'Milestones', short: 'Milestones' },
  { id: 'notes', label: 'Notes', short: 'Notes' },
  { id: 'circle', label: 'Circle', short: 'Circle' },
  { id: 'people', label: 'People & Places', short: 'People' },
] as const

export type CharacterTab = typeof CHARACTER_TABS[number]['id']

/** The tab a URL segment names; anything unknown is the sheet. */
export function tabFromPath(segment: string | undefined): CharacterTab {
  return CHARACTER_TABS.find(t => t.id === segment)?.id ?? 'sheet'
}

/** Each tab has its own address, so it can be bookmarked, reloaded or opened in a new browser tab. */
export function tabPath(characterId: string, tab: CharacterTab): string {
  return tab === 'sheet' ? `/character/${characterId}` : `/character/${characterId}/${tab}`
}
