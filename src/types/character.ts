export type MilestoneType = 'personal' | 'exalted' | 'minor' | 'major'

export interface MilestoneEntry {
  id: string
  type: MilestoneType
  description: string
  amount: number
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

export interface CharacterData {
  sheet: Record<string, unknown>
  milestones: MilestoneEntry[]
  notes: string
  npcs: NpcEntry[]
}
