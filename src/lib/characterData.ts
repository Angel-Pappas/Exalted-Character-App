import type { CharacterData, SheetData } from '../types/character'

// One change to a character, as a tab sends it: only the parts it touched. The
// sheet is merged field by field, never replaced whole.
export type CharacterChange = Omit<Partial<CharacterData>, 'sheet'> & { sheet?: Partial<SheetData> }

/**
 * Applies a change on top of the latest data. Changes are queued and applied in
 * order, and one may have been made from a render that hasn't seen the change
 * before it (the Charms panel resizes itself from an effect). Merging only the
 * fields each change names keeps both: a layout resize can't put back a charm
 * that was just removed.
 */
export function applyChange(prev: CharacterData, change: CharacterChange): CharacterData {
  const { sheet, ...rest } = change
  return { ...prev, ...rest, ...(sheet ? { sheet: { ...prev.sheet, ...sheet } } : {}) }
}
