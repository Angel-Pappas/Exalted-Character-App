// ── Charm Library (global, stored in Supabase charm_library table) ──────────

export interface CharmMode {
  label: string
  text: string | null
  prerequisiteAbilities: string[]
  prerequisiteEssence: number | null
}

// A charm that requires a choice at purchase time (e.g. "choose an Ability",
// or Enhanced Senses' "choose a sense") gets one of these tags. Untagged (null)
// charms need no choice. 'custom' draws from choiceOptions; 'ability'/'attribute'
// draw from the character's own sheet; 'freetext' is a player-written pick.
// 'multiselect' is for charms like Beast-Uplifting Harmony: each purchase binds
// a target and multi-selects from choiceOptions, capped by multiselectCapBasis
// — see CharacterCharm.groupedPicks.
export type CharmChoiceType = 'ability' | 'attribute' | 'custom' | 'freetext' | 'multiselect'

// How a multiselect charm's target is picked (defaults to freetext if unset,
// e.g. a companion name). 'ability'/'attribute' draw from the sheet just like
// the top-level choiceType does; 'custom' draws from targetOptions.
export type MultiselectTargetType = 'ability' | 'attribute' | 'custom' | 'freetext'

// What bounds the number of benefits selectable per target: the character's
// current Essence (default), or the numeric rating of whatever was picked as
// the target (only meaningful when targetChoiceType is 'ability'/'attribute').
export type MultiselectCapBasis = 'essence' | 'target_rating'

export interface LibraryCharm {
  id: string
  type: string
  abilities: string[]
  name: string
  page: number | null
  description: string
  mechanicalKey: string | null
  mechanicalDescription: string | null
  prerequisiteAbilities: string[]
  prerequisiteEssence: number | null
  prerequisiteCharms: string[]
  modes: CharmMode[]
  choiceType: CharmChoiceType | null
  choiceOptions: string[]   // only meaningful when choiceType === 'custom' or 'multiselect' (benefit list)
  targetChoiceType: MultiselectTargetType | null   // only meaningful when choiceType === 'multiselect'; null = freetext
  targetOptions: string[]                          // only meaningful when targetChoiceType === 'custom'
  multiselectCapBasis: MultiselectCapBasis | null  // only meaningful when choiceType === 'multiselect'; null = essence
  // How many options to pick per successive purchase, for list-based choice types
  // (ability/attribute/custom) — e.g. Sharpshooter's Clever Tricks picks 2 on the
  // first purchase then 1 more on a single repurchase: [2, 1]. Once the
  // character has bought it pickCounts.length times, no further purchase is
  // possible even if unchosen options remain. null/undefined = always pick 1
  // per purchase, uncapped by a schedule (the common case).
  pickCounts: number[] | null
}

// Known charm types from the book, used to populate type pickers. Admin can still free-type others.
export const CHARM_TYPE_OPTIONS = [
  'Universal', 'Solar', 'Lunar', 'Sidereal', 'Abyssal', 'Infernal', 'Dragon-Blooded',
  'Liminal', 'Getimian', 'Alchemical', 'Martial Arts', 'Strawmaiden Janest',
]

// ── Per-character charm (references library) ─────────────────────────────────

export interface CharacterCharm {
  id: string               // local uuid for list operations
  libraryId: string
  name: string             // denormalized snapshot
  libraryDescription: string  // denormalized from library at add time
  libraryModes: CharmMode[]  // denormalized from library at add time
  libraryMechanicalKey: string | null  // denormalized from library at add time
  customDescription: string | null
  mechanicalKeyOverride: string | null  // null = use libraryMechanicalKey
  mechanicalEnabled: boolean
  count?: number           // number of times purchased (1 + repurchases); absent = 1
  picks?: string[]         // one entry per purchase; only used when the library charm has a choiceType
  groupedPicks?: { target: string; selected: string[] }[]  // used instead of picks for choiceType === 'multiselect'; one entry per purchase/target
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
  tags?: string[]
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

export interface FoiState {
  active: boolean
  weight: string | null
  tag: string | null
  artifact: boolean
}

export interface SheetData {
  attributes: Record<string, number>
  abilities: Record<string, AbilityData>
  defenses: Record<string, number>
  defenseOther: boolean
  fullDefense: boolean
  essence: number
  anima: number
  defenseBonus: { parry: number; evasion: number; soak: number; hardness: number; resolve: number }
  languages: string[]
  merits: MeritEntry[]
  intimacies: IntimacyEntry[]
  motes: { current: number; committed: number; total: number }
  health: HealthBox[]
  layout: PanelLayout[]
  charms: CharacterCharm[]
  effects: EffectCategory[]
  inventory: InventoryItem[]
  foi: FoiState
  foiOriginals: Record<string, Partial<InventoryItem>>
  exaltType: string
  caste: string
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

export interface ArmorTableRow {
  category: string
  soak: number
  mobilityPenalty: number
  hardness: number
}

export interface TagEntry {
  name: string
  description: string
}

export interface TagGroup {
  group: string
  tags: TagEntry[]
}

export interface EssenceMoteRow {
  essence: number
  motes: number
}

export interface AnimaStateRow {
  level: number
  label: string
}

export interface ExaltType {
  id: string
  name: string
  casteLabel: 'Caste' | 'Aspect'
  castes: string[]
  sort_order: number
}

export interface GameData {
  weapons: WeaponTableRow[]
  armor: ArmorTableRow[]
  tagGroups: TagGroup[]
  essenceMotes: EssenceMoteRow[]
  animaStates: AnimaStateRow[]
}

export const DEFAULT_GAME_DATA: GameData = {
  weapons: [
    { category: 'Light',   accuracy: 2, damage: 0, defense: 1, overwhelming: 1 },
    { category: 'Medium',  accuracy: 1, damage: 1, defense: 1, overwhelming: 1 },
    { category: 'Heavy',   accuracy: 0, damage: 2, defense: 1, overwhelming: 1 },
    { category: 'Unarmed', accuracy: 2, damage: 0, defense: 1, overwhelming: 1 },
  ],
  armor: [
    { category: 'Light Armor', soak: 1, mobilityPenalty:  0, hardness: 0 },
    { category: 'Heavy Armor', soak: 2, mobilityPenalty: -1, hardness: 0 },
  ],
  tagGroups: [
    {
      group: 'Type Tags',
      tags: [
        { name: 'Artifact',  description: 'Artifacts are ancient weapons and armor with fantastical effects. Increase all weapon or armor stats (Accuracy, Damage, Defense, and Overwhelming, or Soak and Hardness) by one.' },
        { name: 'Melee',     description: 'This weapon uses the Close Combat Ability to make attacks against targets in close range and requires the use of one or two hands.' },
        { name: 'Ranged',    description: 'This weapon uses the Ranged Combat Ability. It requires two hands and loses any Defense bonus but can attack out to long range.' },
      ],
    },
    {
      group: 'Universal Tags',
      tags: [
        { name: 'Balanced',      description: 'A superbly balanced weapon. It increases its Overwhelming by 1 and adds two dice when using the weapon to enact gambits.' },
        { name: 'Concealable',   description: 'The weapon is easily hidden on the person (difficulty 1 to do so with Stealth).' },
        { name: 'Flexible',      description: 'The weapon ignores the Defense bonus granted by cover. Flexible weapons reduce the cost of the ensnare gambit by one.' },
        { name: 'Improvised',    description: 'A weapon made of anything available. Reduce the accuracy rating by 2, to a minimum of 0.' },
        { name: 'Natural/Worn',  description: "The weapon is part of the user's body and cannot be disarmed, lost, or stolen. If worn, increase the cost of the disarm gambit by one." },
        { name: 'Paired',        description: 'Weapons meant to be used as a set. Successful withering attacks generate 1 additional Power. These are typically identical weapons.' },
        { name: 'Piercing',      description: "The weapon is especially good at defeating armor. Enables a piercing attack: Decrease the wielder's Defense by 1 until the start of her next turn. Reduce the opponent's Soak by 2." },
        { name: 'Pulling',       description: 'This weapon may make ranged attacks with the Physique Ability. If a melee weapon, it can attack out to short range. These weapons also allow the character to take the pull gambit as a ranged attack on the target.' },
        { name: 'Thrown',        description: 'Usable as a melee weapon in close combat or a ranged weapon out to medium range. Attacking at range uses Ranged Combat. The wielder may draw a replacement thrown weapon as part of a Ranged Combat attack.' },
      ],
    },
    {
      group: 'Armor Tags',
      tags: [
        { name: 'Buoyant', description: 'Armor that is lighter than most. Does not apply mobility penalties to swimming.' },
        { name: 'Silent',  description: 'Armor that does not make noise when moving. Does not apply mobility penalties to silent movement.' },
      ],
    },
    {
      group: 'Melee Tags',
      tags: [
        { name: 'Chopping',    description: "Enables chopping attack for melee weapons. Decrease the wielder's Defense by one until the start of her next turn. Gain two bonus dice to a withering attack or decrease an opponent's Hardness by 1 for the purpose of a decisive attack." },
        { name: 'Defensive',   description: "The melee weapon increases the character's Defense by an additional 1 when taking the defend other or full defense actions." },
        { name: 'Disarming',   description: 'The melee weapon reduces the Power cost by 1 for disarm gambits.' },
        { name: 'Off-Hand',    description: "The melee weapon can be used in the off-hand along with a one-handed weapon. The weapon does not add its accuracy or damage rating to an attack; instead, when making an attack action as part of a flurry, reduce the attack's dice pool by one die instead of three dice." },
        { name: 'Reaching',    description: 'A melee weapon that negates the advantages of mounted combatants and the penalty from enormous size.' },
        { name: 'Shield',      description: "A medium or heavy melee weapon that acts to protect the wielder and allows him to flurry the full defense action. Shields reduce the weapon's damage rating by 1 to a minimum of 0." },
        { name: 'Smashing',    description: 'A melee weapon meant to unbalance an enemy. Reduce the cost of knockback and knockdown gambits made with this weapon by 1.' },
        { name: 'Two-Handed',  description: 'A melee weapon that must be wielded with two hands, preventing the character from dual wielding or carrying a shield. Two-handed weapons have +1 damage. Heavy weapons with this tag increase Overwhelming by one.' },
      ],
    },
    {
      group: 'Ranged Tags',
      tags: [
        { name: 'Flame',      description: 'A ranged weapon that shoots a narrow blast of fire, which can ignite flammable objects. Attacks made at close range with this weapon gain +1 damage, but they cannot attack past medium range.' },
        { name: 'Mounted',    description: 'This ranged weapon is designed to be used while mounted on a steed, granting two bonus dice to attacks while mounted.' },
        { name: 'One-Handed', description: "A ranged weapon that can be wielded in one hand, leaving the user's other hand free." },
        { name: 'Powerful',   description: "Enables a point-blank attack for ranged weapons. Decrease the wielder's Defense by 1 until the start of her next turn. Gain two bonus dice to withering attacks or decrease an opponent's Hardness by 1 for the purpose of making decisive attacks." },
      ],
    },
  ],
  essenceMotes: [
    { essence: 1, motes: 5 },
    { essence: 2, motes: 7 },
    { essence: 3, motes: 10 },
    { essence: 4, motes: 12 },
    { essence: 5, motes: 15 },
  ],
  animaStates: [
    { level: 0,  label: 'No Anima' },
    { level: 1,  label: 'Dim' },
    { level: 2,  label: 'Dim' },
    { level: 3,  label: 'Glowing' },
    { level: 4,  label: 'Glowing' },
    { level: 5,  label: 'Burning' },
    { level: 6,  label: 'Burning' },
    { level: 7,  label: 'Bonfire' },
    { level: 8,  label: 'Bonfire' },
    { level: 9,  label: 'Bonfire' },
    { level: 10, label: 'Iconic' },
  ],
}
