export interface CharmEntry {
  id: string
  name: string
  text: string
}

export interface CharmCategory {
  id: string
  name: string
  charms: CharmEntry[]
}

export interface EffectEntry {
  id: string
  name: string
  text: string
}

export interface EffectCategory {
  id: string
  name: string
  effects: EffectEntry[]
}

export type InventoryItemKind = 'weapon' | 'armor' | 'other'

export type WeaponWeight = 'Light' | 'Medium' | 'Heavy' | 'Unarmed'
export type ArtifactColor = 'red' | 'green' | 'blue' | 'white' | 'silver' | 'gold'

export interface InventoryItem {
  id: string
  kind: InventoryItemKind
  name: string
  type: string          // used by armor + other; not shown for weapons
  equipped: boolean
  // weapon-specific
  weight?: WeaponWeight
  artifact?: boolean
  artifactColor?: ArtifactColor
  accuracy?: number
  damage?: number
  defense?: number
  overwhelming?: number
  // armor fields
  soak?: number
  mobilityPen?: number
  hardness?: number
  // weapon + armor
  tags?: string
  // other
  notes?: string
}

export interface InventoryCategory {
  id: string
  name: string
  items: InventoryItem[]
}

export interface MilestoneTransaction {
  id: string
  kind: 'gain' | 'purchase'
  personal: number
  exalted: number
  minor: number
  major: number
  description: string
  date: string
}

export interface NpcEntry {
  id: string
  name: string
  notes: string
}

export interface Character {
  id: string
  user_id: string
  name: string
  data: CharacterData
  created_at: string
  updated_at: string
}

export interface AbilityData {
  rating: number
  specialty: string
  excellency: boolean
}

export interface MeritEntry {
  id: string
  type: 'Primary' | 'Secondary' | 'Tertiary'
  name: string
}

export interface IntimacyEntry {
  id: string
  intensity: 'Minor' | 'Major' | 'Defining'
  description: string
}

export interface HealthBox {
  penalty: string
  checked: boolean
}

export interface PanelLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export interface SheetData {
  attributes: Record<string, number>
  abilities: Record<string, AbilityData>
  defenses: Record<string, number>
  defenseOther: boolean
  fullDefense: boolean
  languages: string[]
  merits: MeritEntry[]
  intimacies: IntimacyEntry[]
  motes: { current: number; committed: number; total: number }
  health: HealthBox[]
  layout: PanelLayout[]
  charms: CharmCategory[]
  effects: EffectCategory[]
  inventory: InventoryItem[]
}

export interface CharacterData {
  sheet: SheetData
  milestones: MilestoneTransaction[]
  notes: string
  npcs: NpcEntry[]
}

// ── Game Data (character-independent reference tables) ──────────────────────

export interface WeaponTableRow {
  category: string   // e.g. Light, Medium, Heavy, Unarmed — editable label
  accuracy: number
  damage: number
  defense: number
  overwhelming: number
}

export interface GameData {
  weapons: WeaponTableRow[]
}

export const DEFAULT_GAME_DATA: GameData = {
  weapons: [
    { category: 'Light',   accuracy: 2, damage: 0, defense: 1, overwhelming: 1 },
    { category: 'Medium',  accuracy: 1, damage: 1, defense: 1, overwhelming: 1 },
    { category: 'Heavy',   accuracy: 0, damage: 2, defense: 1, overwhelming: 1 },
    { category: 'Unarmed', accuracy: 2, damage: 0, defense: 1, overwhelming: 1 },
  ],
}
