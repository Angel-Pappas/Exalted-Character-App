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

export interface InventoryItem {
  id: string
  name: string
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
  languages: string[]
  merits: MeritEntry[]
  intimacies: IntimacyEntry[]
  motes: { current: number; committed: number; total: number }
  health: HealthBox[]
  layout: PanelLayout[]
  charms: CharmCategory[]
  effects: EffectCategory[]
  inventory: InventoryCategory[]
}

export interface CharacterData {
  sheet: SheetData
  milestones: MilestoneTransaction[]
  notes: string
  npcs: NpcEntry[]
}
