// Campaigns, as the API (backend/app/Http/Controllers/CampaignController.php) returns them.

export type CharacterKind = 'pc' | 'npc'
export type Visibility = 'public' | 'private'

export interface Person {
  id: string
  username: string
}

export interface CampaignSummary {
  id: string
  name: string
  storyteller: Person
  is_storyteller: boolean
  member_count: number
}

// A character as one member sees it in a campaign: every PC by name, NPCs only
// when the member may open them. `can_view` says whether the sheet opens.
export interface CampaignCharacter {
  id: string
  name: string
  kind: CharacterKind
  visibility: Visibility
  owner: Person
  mine: boolean
  can_view: boolean
}

// One training not yet done: an Expense line from the character's milestone ledger.
export interface TrainingEntry {
  id: string
  description: string
  date: string   // YYYY-MM-DD it started; '' = undated
  personal: number
  exalted: number
  minor: number
  major: number
}

// For the Storyteller: a character with trainings still going, the longest-waiting first.
export interface CampaignTraining {
  character_id: string
  character_name: string
  owner: string
  entries: TrainingEntry[]
}

export interface CampaignDetail {
  id: string
  name: string
  storyteller: Person
  is_storyteller: boolean
  members: Person[]
  characters: CampaignCharacter[]
  training: CampaignTraining[]   // Storyteller only; empty for everyone else
}

// One of the owner's campaigns, and this character's place in it (if any).
export interface CharacterCampaign {
  id: string
  name: string
  joined: boolean
  visibility: Visibility | null
}

// A character's Circle: the other players' PCs in each of its campaigns.
export interface CircleCampaign {
  id: string
  name: string
  characters: { id: string; name: string; owner: string; can_view: boolean; notes: string }[]
}

export const KIND_LABEL: Record<CharacterKind, string> = { pc: 'PC', npc: 'NPC' }
