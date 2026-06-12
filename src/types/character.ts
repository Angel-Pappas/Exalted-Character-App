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

export interface SheetData {
  attributes: Record<string, number>
  abilities: Record<string, AbilityData>
}

export interface CharacterData {
  sheet: SheetData
  milestones: MilestoneTransaction[]
  notes: string
  npcs: NpcEntry[]
}
