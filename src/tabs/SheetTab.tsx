import { useState, useRef, useEffect, useLayoutEffect } from 'react' // useState used by CharmPanel and other local state
import { GridLayout, useContainerWidth, noCompactor } from 'react-grid-layout'
// noCompactor has allowOverlap:false which causes panels to push each other during drag.
// Override it so panels can freely overlap — no collision resolution, no compaction.
const freeCompactor = { ...noCompactor, allowOverlap: true }
import 'react-grid-layout/css/styles.css'
import type { MilestoneTransaction, TrainingDone } from '../types/character'
import type { SheetData, FoiState, AbilityData, MeritEntry, IntimacyEntry, OxBodyPick, PanelLayout, CharacterCharm, CharmGroup, LibraryCharm, EffectCategory, EffectEntry, InventoryItem, InventoryItemKind, WeaponWeight, ArtifactColor, GameData } from '../types/character'
import { DEFAULT_GAME_DATA } from '../types/character'
import {
  abilityRank, baseAbility, isModeInScope, isTypeInScope, isUnpickedChoiceMode, modeIcon, modeLockReasons,
  sortAbilities, sortModes, typeRank,
} from '../lib/charmRules'
import {
  DEFAULT_GROUP_COLOR, GROUP_COLORS, deleteGroup, editGroup, filterCharms, groupColor, groupOf, isGroupColor, moveCharm, moveGroup, newGroup, partitionCharms,
} from '../lib/charmGroups'
import type { GroupColor } from '../lib/charmGroups'
import { ALL, sameSelection, visibleSections } from '../lib/charmSelection'
import type { CharmSelection } from '../lib/charmSelection'
import { asksForChoice, canBuyAgain, cardSummary } from '../lib/charmPurchase'
import { buyCharm, charmsInEffect, removeCharm as removeCharmAndLines, trainingByCharm, undoCharmPurchase, type CharmCost, type CharmsAndLedger } from '../lib/charmTraining'
import { ratingToStore, trainedAbilities, trainedAttributes, trainingHint, traitTraining } from '../lib/traitTraining'
import { formatDay, todayKey } from '../lib/milestones'
import CharmCostModal from '../components/CharmCostModal'
import {
  FISTS_OF_IRON, RIGHTEOUS_LION, UNCONQUERED_SIGHT, WARD_OF_THE_SUN, charmKey, charmProblems, clickDot, dotCount, hasInUseIcon, litDots,
  protectable, protectedIntimacies, toggleInUse, type ModeContext, type Pools, type ProblemContext,
} from '../lib/charmUse'
import { charmHealthLevels, charmStatLines, defenseAbilities, statTotal, woundPenaltyAfterCharms, type DefenseStat } from '../lib/charmEffects'
import { IntimacyPickModal, NamePromptModal } from '../components/CharmChoiceModals'
import type { ChoicePick } from '../lib/charmPurchase'
import { cachedCharmLibrary, loadCharmLibrary } from '../lib/charmLibrary'
import PhoneSheet from '../components/PhoneSheet'
import { ROW_HEIGHT, STACK_BELOW_PX, fitPanelHeight, gridLayoutChange, rowsToFit } from '../lib/panelLayout'
import { bestEquipped, calculateDefenses, STATIC_BONUS_CAP } from '../lib/defenses'
import {
  DEFAULT_OX_BODY_PICK, LEVEL_NAMES, buildHealthTrack, clampDamage, currentWound, damageAfterClick,
  legacyDamage, oxBodyGrant, oxBodyHasChoice, woundPenalty,
} from '../lib/health'
import ModalPortal from '../components/ModalPortal'
import { CircleAlert, FolderInput, Pencil, RefreshCw, RotateCcw, Trash2, Undo2, X, Zap } from 'lucide-react'
import { Tooltip, TooltipLayer } from '../components/Tooltip'

const ATTRIBUTE_GROUPS = [
  { label: 'Physical', attrs: ['Strength', 'Dexterity', 'Stamina'] },
  { label: 'Social', attrs: ['Charisma', 'Manipulation', 'Appearance'] },
  { label: 'Mental', attrs: ['Perception', 'Intelligence', 'Wits'] },
]

const ABILITIES = [
  'Athletics', 'Awareness', 'Close Combat', 'Craft', 'Embassy',
  'Integrity', 'Navigate', 'Performance', 'Physique', 'Presence',
  'Ranged Combat', 'Sagacity', 'Stealth', 'War',
]

const DEFENSES = ['Parry', 'Evasion', 'Soak', 'Hardness', 'Resolve']

// A charm's implementation is live whenever it carries one of the keys the sheet
// computes (ox_body, foi, excellency); there is no on/off switch.
const activeKey = (c: CharacterCharm) => c.mechanicalKeyOverride ?? c.libraryMechanicalKey
const OX_BODY_KEY = 'ox_body'
const findOxBody = (charms: CharacterCharm[]) => charms.find(c => activeKey(c) === OX_BODY_KEY)

// Rows the Essence panel needs to show Essence/Power/Will, Motes and Anima without
// scrolling. LEGACY_ESSENCE_H is the height the first merge assigned when it folded
// Motes and Anima in, back when the panel still carried the Identity rows.
const ESSENCE_H = 24
const LEGACY_ESSENCE_H = 34

// Around the Charms panel's measured content: the grid cell's 2px padding, the
// panel's 8px padding and 1px border, each top and bottom.
const CHARMS_CHROME_PX = 2 * (2 + 8 + 1)
const CHARMS_MIN_ROWS = 8
// Stacked on a phone, panels take their natural height; nothing to fit or save.
const noFit = () => {}

const DEFAULT_LAYOUT: PanelLayout[] = [
  { i: 'attributes', x: 0,  y: 0,  w: 16, h: 22, minW: 4, minH: 8 },
  { i: 'abilities',  x: 0,  y: 22, w: 16, h: 38, minW: 4, minH: 8 },
  { i: 'defenses',   x: 16, y: 0,  w: 16, h: 12, minW: 4, minH: 8 },
  { i: 'essence',    x: 16, y: 12, w: 16, h: ESSENCE_H, minW: 6, minH: 12 },
  { i: 'health',     x: 16, y: 36, w: 16, h: 16, minW: 4, minH: 8 },
  { i: 'merits',     x: 32, y: 0,  w: 28, h: 18, minW: 4, minH: 8 },
  { i: 'languages',  x: 32, y: 18, w: 28, h: 10, minW: 4, minH: 8 },
  { i: 'intimacies', x: 32, y: 28, w: 28, h: 18, minW: 4, minH: 8 },
  { i: 'charms',     x: 60, y: 0,  w: 40, h: 46, minW: 4, minH: 8 },
  { i: 'effects',    x: 60, y: 46, w: 40, h: 40, minW: 4, minH: 8 },
  { i: 'inventory',  x: 100, y: 0, w: 28, h: 40, minW: 4, minH: 8 },
]

const defaultAbility: AbilityData = { rating: 0, specialty: '', excellency: false }

function defaultSheet(): SheetData {
  const attributes: Record<string, number> = {}
  for (const g of ATTRIBUTE_GROUPS) for (const a of g.attrs) attributes[a] = 0
  const abilities: Record<string, AbilityData> = {}
  for (const a of ABILITIES) abilities[a] = { ...defaultAbility }
  const defenses: Record<string, number> = {}
  for (const d of DEFENSES) defenses[d] = 0
  return {
    attributes, abilities, defenses,
    defenseOther: false, fullDefense: false,
    essence: 1,
    anima: 0,
    power: 0,
    will: 0,
    defenseBonus: { parry: 0, evasion: 0, soak: 0, hardness: 0, resolve: 0 },
    languages: [], merits: [], intimacies: [],
    motes: { current: 0, committed: 0, total: 0 },
    damage: 0,
    layout: DEFAULT_LAYOUT.map(l => ({ ...l })),
    charms: [],
    charmGroups: [],
    effects: [],
    inventory: [],
    foi: { active: false, weight: null, tag: null, artifact: false },
    foiOriginals: {},
    exaltType: '',
    caste: '',
  }
}

interface Props {
  sheet: SheetData
  editMode: boolean
  // Someone else's character: nothing can be dragged or changed (the page also
  // disables every control and never saves).
  readOnly?: boolean
  // Every change names only the fields it touched; the page merges them onto the
  // latest sheet, so a change made from an older render can't undo a newer one.
  onChange: (patch: Partial<SheetData>) => void
  gameData?: GameData
  // The milestone ledger and which trainings are done: a charm purchase or dots
  // still in training show on the sheet but count for nothing yet.
  milestones: MilestoneTransaction[]
  trainingDone: TrainingDone
  // Charm purchases change the sheet and the ledger together.
  onLedgerChange: (patch: Partial<SheetData>, milestones: MilestoneTransaction[]) => void
  onTrainingDone: (lineId: string) => void
}

function SectionHeader({ title }: { title: string }) {
  return <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">{title}</div>
}

const inputCls = "w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500"
const inputActive = "w-full bg-stone-800 border border-amber-500 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none"

const selectCls = "w-full bg-stone-800 border border-stone-700 text-stone-100 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500"

// ModalPortal (shared) renders into document.body — needed here because react-grid-layout
// positions panels with a CSS transform, which creates a new containing block for
// position:fixed descendants; without the portal a "fixed" modal inside a panel would
// center on the panel instead of the viewport. It also locks background scroll.

// A single pick is a plain string (ability/attribute/custom/freetext); a
// string[] is multiple simultaneous picks made in one purchase, for a
// pickCounts-scheduled charm (e.g. Sharpshooter's Clever Tricks picks 2 at
// once on its first purchase); a multiselect pick binds a target (e.g. a
// companion) to a set of options chosen from the charm's list, capped by
// Essence or the target's own rating.

const TARGET_LABEL: Record<import('../types/character').MultiselectTargetType, string> = {
  ability: 'Target Ability',
  attribute: 'Target Attribute',
  custom: 'Target',
  freetext: 'Target (e.g. companion name)',
}

const CHOICE_PROMPT: Record<import('../types/character').CharmChoiceType, string> = {
  ability: 'Choose an Ability',
  attribute: 'Choose an Attribute',
  custom: 'Choose an option',
  freetext: 'Enter a choice',
  multiselect: 'Bind a target and choose benefits',
}

// Opens for every purchase (first buy included) of a charm with a choiceType.
// Already-picked options for this specific charm instance are shown disabled
// so the same option can't be picked twice; free text instead shows past
// entries as reference alongside a box for the new one. Multiselect charms
// (e.g. Beast-Uplifting Harmony) bind a target each purchase — free text by
// default, or drawn from abilities/attributes/a custom list if the charm's
// targetChoiceType says so — then let the player pick benefits up to a cap
// based on either the character's Essence or the target's own rating.
function ChoicePickerModal({ charm, existingPicks, existingTargets, purchaseIndex, abilities, attributes, essence, onConfirm, onClose }: {
  charm: import('../types/character').LibraryCharm
  existingPicks: string[]
  existingTargets: string[]
  purchaseIndex: number
  abilities: Record<string, AbilityData>
  attributes: Record<string, number>
  essence: number
  onConfirm: (pick: ChoicePick) => void
  onClose: () => void
}) {
  const [freeText, setFreeText] = useState('')
  const [target, setTarget] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const options: { value: string; label: string; chosen: boolean }[] =
    charm.choiceType === 'custom' ? charm.choiceOptions.map(o => ({ value: o, label: o, chosen: existingPicks.includes(o) })) :
    charm.choiceType === 'ability' ? [...ABILITIES].sort().map(a => ({ value: a, label: `${a} (${abilities[a]?.rating ?? 0})`, chosen: existingPicks.includes(a) })) :
    charm.choiceType === 'attribute' ? Object.keys(attributes).sort().map(a => ({ value: a, label: `${a} (${attributes[a]})`, chosen: existingPicks.includes(a) })) :
    []

  // How many of the list above must be picked in this single purchase, per
  // the charm's pick schedule (e.g. [2, 1] for Sharpshooter's Clever Tricks).
  // Unscheduled charms always need exactly 1 (the plain click-to-confirm path).
  const neededPicks = charm.pickCounts?.[purchaseIndex] ?? 1
  const isScheduledMultiPick = neededPicks > 1 && charm.choiceType !== 'freetext' && charm.choiceType !== 'multiselect'

  function toggleScheduledPick(value: string) {
    setSelected(s => s.includes(value) ? s.filter(v => v !== value) : (s.length < neededPicks ? [...s, value] : s))
  }

  const targetType = charm.targetChoiceType ?? 'freetext'
  const targetOptions: { value: string; label: string; chosen: boolean }[] =
    targetType === 'custom' ? charm.targetOptions.map(o => ({ value: o, label: o, chosen: existingTargets.includes(o) })) :
    targetType === 'ability' ? [...ABILITIES].sort().map(a => ({ value: a, label: `${a} (${abilities[a]?.rating ?? 0})`, chosen: existingTargets.includes(a) })) :
    targetType === 'attribute' ? Object.keys(attributes).sort().map(a => ({ value: a, label: `${a} (${attributes[a]})`, chosen: existingTargets.includes(a) })) :
    []

  // Cap defaults to Essence; 'target_rating' instead uses the chosen target's
  // own Ability/Attribute rating (falls back to Essence until a target with a
  // known rating has been picked).
  const targetRating =
    targetType === 'ability' ? abilities[target]?.rating :
    targetType === 'attribute' ? attributes[target] :
    undefined
  const capBasis = charm.multiselectCapBasis ?? 'essence'
  const essenceCap = capBasis === 'target_rating' && targetRating !== undefined ? targetRating : essence
  const multiselectCap = Math.min(essenceCap, charm.choiceOptions.length)

  function toggleSelected(option: string) {
    setSelected(s => s.includes(option) ? s.filter(o => o !== option) : (s.length < multiselectCap ? [...s, option] : s))
  }

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div className="bg-stone-900 border border-stone-700 rounded-xl w-[420px] max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
            <span className="text-sm font-semibold text-amber-400">{charm.name} — {charm.choiceType ? CHOICE_PROMPT[charm.choiceType] : ''}</span>
            <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-1.5">
            {charm.choiceType === 'freetext' ? (
              <>
                {existingPicks.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-stone-500 mb-1">Previous picks</p>
                    <ul className="space-y-0.5">
                      {existingPicks.map((p, i) => <li key={i} className="text-xs text-stone-400">{p}</li>)}
                    </ul>
                  </div>
                )}
                <input
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && freeText.trim()) onConfirm(freeText.trim()) }}
                  placeholder="Enter your choice…"
                  autoFocus
                  className={selectCls}
                />
              </>
            ) : charm.choiceType === 'multiselect' ? (
              <>
                <div>
                  <p className="text-[10px] text-stone-500 mb-1">{TARGET_LABEL[targetType]}</p>
                  {targetType === 'freetext' ? (
                    <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Enter a name…" autoFocus className={selectCls} />
                  ) : (
                    <>
                      {targetOptions.length === 0 && <p className="text-xs text-stone-500">No options available.</p>}
                      {targetOptions.map(o => (
                        <button
                          key={o.value}
                          disabled={o.chosen}
                          onClick={() => setTarget(o.value)}
                          className={`w-full text-left text-xs px-3 py-1.5 rounded border mb-1 transition-colors ${o.chosen ? 'bg-stone-800/50 border-stone-800 text-stone-600 cursor-not-allowed' : target === o.value ? 'bg-amber-900/40 border-amber-500 text-amber-200' : 'bg-stone-800 border-stone-700 text-stone-200 hover:border-amber-500'}`}
                        >
                          {o.label}{o.chosen ? ' (chosen)' : ''}
                        </button>
                      ))}
                    </>
                  )}
                </div>
                <div className="pt-1">
                  <p className="text-[10px] text-stone-500 mb-1">
                    Benefits — choose up to {multiselectCap} ({capBasis === 'target_rating' ? `${target || 'target'}'s rating ${targetRating ?? '?'}` : `Essence ${essence}`})
                  </p>
                  {charm.choiceOptions.map(o => {
                    const isSelected = selected.includes(o)
                    const disabled = !isSelected && selected.length >= multiselectCap
                    return (
                      <label key={o} className={`flex items-center gap-2 px-3 py-1.5 rounded border mb-1 text-xs transition-colors ${disabled ? 'opacity-40 cursor-not-allowed border-stone-800 bg-stone-800/50' : 'cursor-pointer border-stone-700 bg-stone-800 hover:border-amber-500'}`}>
                        <input type="checkbox" checked={isSelected} disabled={disabled} onChange={() => toggleSelected(o)} className="accent-amber-500" />
                        <span className="text-stone-200">{o}</span>
                      </label>
                    )
                  })}
                </div>
              </>
            ) : isScheduledMultiPick ? (
              <>
                {options.length === 0 && <p className="text-xs text-stone-500">No options available.</p>}
                <p className="text-[10px] text-stone-500 mb-1">Choose {neededPicks}</p>
                {options.map(o => {
                  const isSelected = selected.includes(o.value)
                  const disabled = o.chosen || (!isSelected && selected.length >= neededPicks)
                  return (
                    <label key={o.value} className={`flex items-center gap-2 px-3 py-1.5 rounded border mb-1 text-xs transition-colors ${disabled ? 'opacity-40 cursor-not-allowed border-stone-800 bg-stone-800/50' : 'cursor-pointer border-stone-700 bg-stone-800 hover:border-amber-500'}`}>
                      <input type="checkbox" checked={isSelected} disabled={disabled} onChange={() => toggleScheduledPick(o.value)} className="accent-amber-500" />
                      <span className="text-stone-200">{o.label}{o.chosen ? ' (chosen)' : ''}</span>
                    </label>
                  )
                })}
              </>
            ) : (
              <>
                {options.length === 0 && <p className="text-xs text-stone-500">No options available.</p>}
                {options.map(o => (
                  <button
                    key={o.value}
                    disabled={o.chosen}
                    onClick={() => onConfirm(o.value)}
                    className={`w-full text-left text-xs px-3 py-1.5 rounded border transition-colors ${o.chosen ? 'bg-stone-800/50 border-stone-800 text-stone-600 cursor-not-allowed' : 'bg-stone-800 border-stone-700 text-stone-200 hover:border-amber-500'}`}
                  >
                    {o.label}{o.chosen ? ' (chosen)' : ''}
                  </button>
                ))}
              </>
            )}
          </div>
          {charm.choiceType === 'freetext' && (
            <div className="flex justify-end px-4 py-3 border-t border-stone-800 shrink-0">
              <button
                onClick={() => freeText.trim() && onConfirm(freeText.trim())}
                disabled={!freeText.trim()}
                className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 px-3 py-1 rounded transition-colors"
              >
                Confirm
              </button>
            </div>
          )}
          {charm.choiceType === 'multiselect' && (
            <div className="flex justify-end px-4 py-3 border-t border-stone-800 shrink-0">
              <button
                onClick={() => target.trim() && selected.length > 0 && onConfirm({ target: target.trim(), selected })}
                disabled={!target.trim() || selected.length === 0}
                className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 px-3 py-1 rounded transition-colors"
              >
                Confirm
              </button>
            </div>
          )}
          {isScheduledMultiPick && (
            <div className="flex justify-end px-4 py-3 border-t border-stone-800 shrink-0">
              <button
                onClick={() => selected.length === neededPicks && onConfirm(selected)}
                disabled={selected.length !== neededPicks}
                className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 px-3 py-1 rounded transition-colors"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}

// Also used by the Milestones tab, to pick the charm an Expense bought (no onRemove there).
export function CharmBrowseModal({ library, loading, existing, exaltType, caste, abilities, attributes, essence, onAdd, onRemove, onClose }: {
  library: LibraryCharm[]
  loading: boolean
  existing: import('../types/character').CharacterCharm[]
  exaltType: string
  caste: string
  abilities: Record<string, AbilityData>
  attributes: Record<string, number>
  essence: number
  onAdd: (charm: import('../types/character').LibraryCharm, pick: ChoicePick | null) => void
  onRemove?: (charm: import('../types/character').LibraryCharm) => void
  onClose: () => void
}) {
  const [type, setType] = useState('')
  const [ability, setAbility] = useState('')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [pickingCharm, setPickingCharm] = useState<import('../types/character').LibraryCharm | null>(null)
  const existingByLib = new Map(existing.map(c => [c.libraryId, c]))

  function startPurchase(charm: import('../types/character').LibraryCharm) {
    if (asksForChoice(charm, existingByLib.get(charm.id))) {
      setPickingCharm(charm)
    } else {
      onAdd(charm, null)
    }
  }

  const inScope = library.filter(c => isTypeInScope(c.type || 'Universal', exaltType, showAll))

  const types = [...new Set(inScope.map(c => c.type || 'Universal'))].sort((a, b) => {
    const rankDiff = typeRank(a) - typeRank(b)
    if (rankDiff !== 0) return rankDiff
    return typeRank(a) === 3 ? a.localeCompare(b) : 0
  })
  const abilitiesForType = sortAbilities([...new Set(
    inScope.filter(c => !type || (c.type || 'Universal') === type).flatMap(c => c.abilities.map(baseAbility))
  )])

  const q = search.trim().toLowerCase()
  const narrowed = !!q || !!ability || !!type
  // Excellency-ability charms lead the results; the rest keep the query's
  // type/page/name order (Array.sort is stable).
  const hasExcellency = (c: import('../types/character').LibraryCharm) => c.abilities.some(a => abilityRank(a) === 0)
  const charms = narrowed ? inScope.filter(c =>
    (!type || (c.type || 'Universal') === type) &&
    (!ability || c.abilities.some(a => baseAbility(a) === ability)) &&
    (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.abilities.some(a => a.toLowerCase().includes(q)))
  ).sort((a, b) => Number(hasExcellency(b)) - Number(hasExcellency(a))) : []

  const allExpanded = charms.length > 0 && charms.every(c => expandedIds.has(c.id))
  function toggleExpanded(id: string) {
    setExpandedIds(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-12" onClick={onClose}>
        <div className="bg-stone-900 border border-stone-700 rounded-xl w-[960px] max-w-[95vw] max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
            <span className="text-sm font-semibold text-amber-400">Add Charm</span>
            <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
          </div>
          <div className="px-4 py-2 border-b border-stone-800 shrink-0">
            <div className="flex gap-2">
              <select value={type} onChange={e => setType(e.target.value)} className={`${selectCls} !w-44 shrink-0`}>
                <option value="">Type…</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={ability} onChange={e => setAbility(e.target.value)} className={`${selectCls} !w-44 shrink-0`}>
                <option value="">Ability…</option>
                {abilitiesForType.map(a => <option key={a || '__none__'} value={a}>{a || 'General'}</option>)}
              </select>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ability, or description…" className={`${selectCls} flex-1 min-w-0`} />
              <button
                onClick={() => setShowAll(s => !s)}
                data-tip="Show charms from every Exalt type and mode"
                className={`shrink-0 text-xs px-2 py-1 rounded border transition-colors ${showAll ? 'bg-amber-600 border-amber-500 text-stone-950' : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-amber-500'}`}
              >
                Show All
              </button>
              <button
                onClick={() => setExpandedIds(allExpanded ? new Set() : new Set(charms.map(c => c.id)))}
                data-tip="Expand every charm to read its full text"
                className={`shrink-0 text-xs px-2 py-1 rounded border transition-colors whitespace-nowrap ${allExpanded ? 'bg-amber-600 border-amber-500 text-stone-950' : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-amber-500'}`}
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 no-scrollbar">
            {loading && <p className="text-xs text-stone-500 p-4">Loading…</p>}
            {!loading && !narrowed && <p className="text-xs text-stone-500 p-4">Choose a type/ability, or search, to see charms.</p>}
            {!loading && narrowed && charms.length === 0 && <p className="text-xs text-stone-500 p-4">No charms found.</p>}
            {charms.map(charm => {
              const ownedCharm = existingByLib.get(charm.id)
              const owned = !!ownedCharm
              const count = ownedCharm?.count ?? (owned ? 1 : 0)
              const buyAgain = canBuyAgain(charm, ownedCharm, ABILITIES, Object.keys(attributes))
              const visibleModes = [...new Map(
                charm.modes.filter(m => isModeInScope(m.label, exaltType, caste, showAll)).map(m => [m.label, m])
              ).values()]
              return (
                <div key={charm.id} className="px-4 py-2 border-b border-stone-800 last:border-0 hover:bg-stone-800/40">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpanded(charm.id)} data-tip="Click to expand/collapse">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${owned ? 'text-amber-300' : 'text-stone-100'}`}>{charm.name}</span>
                        {count > 1 && <span data-tip={`Purchased ${count}×`} className="text-[9px] px-1 py-0.5 rounded bg-stone-800 border border-stone-600 text-stone-300">×{count}</span>}
                        {charm.mechanicalKey && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/40 border border-amber-700/50 text-amber-400">{charm.mechanicalKey}</span>}
                        {visibleModes.map(m => {
                          const icon = modeIcon(m.label)
                          return <span key={m.label} data-tip={icon.title} className="text-stone-400 cursor-default shrink-0">{icon.glyph}</span>
                        })}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {!owned && (
                        <button onClick={() => startPurchase(charm)} data-tip="Add" aria-label="Add" className="bg-amber-600 hover:bg-amber-500 text-stone-950 w-6 h-6 rounded transition-colors">+</button>
                      )}
                      {owned && buyAgain && (
                        <button onClick={() => startPurchase(charm)} data-tip="Repurchase (buy again)" aria-label="Repurchase (buy again)" className="bg-amber-600 hover:bg-amber-500 text-stone-950 w-6 h-6 rounded transition-colors">↻</button>
                      )}
                      {owned && onRemove && (
                        <button onClick={() => onRemove(charm)} data-tip="Remove (undo a purchase)" aria-label="Remove (undo a purchase)" className="w-6 h-6 rounded border border-stone-600 text-stone-400 hover:border-stone-400 hover:text-stone-200 transition-colors">✕</button>
                      )}
                    </div>
                  </div>
                  {expandedIds.has(charm.id) && (
                    <div className="mt-1.5 space-y-1.5">
                      <p className="text-xs text-stone-400 leading-relaxed whitespace-normal">{charm.description}</p>
                      {visibleModes.map(m => (
                        <div key={m.label}>
                          <p className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <span>{modeIcon(m.label).glyph}</span>
                            {m.label}
                          </p>
                          {m.text && <p className="text-xs text-stone-400 leading-relaxed whitespace-normal">{m.text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {pickingCharm && (
        <ChoicePickerModal
          charm={pickingCharm}
          existingPicks={existingByLib.get(pickingCharm.id)?.picks ?? []}
          existingTargets={existingByLib.get(pickingCharm.id)?.groupedPicks?.map(g => g.target) ?? []}
          purchaseIndex={existingByLib.get(pickingCharm.id)?.count ?? 0}
          abilities={abilities}
          attributes={attributes}
          essence={essence}
          onConfirm={pick => { onAdd(pickingCharm, pick); setPickingCharm(null) }}
          onClose={() => setPickingCharm(null)}
        />
      )}
    </ModalPortal>
  )
}

// What is being dragged in the Charms panel: a charm card, or a whole group by its button.
type CharmDrag = { kind: 'charm' | 'group'; id: string }
// Where a drop would land, for highlighting: a group's button ('' = Ungrouped),
// or just before a card.
type CharmDropHint = { kind: 'group' | 'card'; id: string } | null

// Name and colour fields shared by "New group" and editing a group.
function CharmGroupForm({ initial, submitLabel, onSubmit, onCancel }: {
  initial: { name: string; color: GroupColor }
  submitLabel: string
  onSubmit: (values: { name: string; color: GroupColor }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial.name)
  const [color, setColor] = useState<GroupColor>(initial.color)
  const [error, setError] = useState(false)

  function submit() {
    if (!name.trim()) { setError(true); return }
    onSubmit({ name, color })
  }

  return (
    <div className="rounded border border-stone-600 bg-stone-950/40 p-1.5 space-y-1.5">
      <input autoFocus type="text" value={name} placeholder="Group name, e.g. Social"
        onChange={e => { setName(e.target.value); setError(false) }}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel() }}
        className={inputCls} />
      {error && <p className="text-xs text-red-400">Give the group a name first.</p>}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(Object.keys(GROUP_COLORS) as GroupColor[]).map(c => (
          <button key={c} type="button" onClick={() => setColor(c)} data-tip={GROUP_COLORS[c].label} aria-label={GROUP_COLORS[c].label}
            className={`w-4 h-4 rounded-full ${GROUP_COLORS[c].dot} ${color === c ? 'ring-2 ring-offset-1 ring-offset-stone-900 ring-stone-200' : 'opacity-60 hover:opacity-100'}`} />
        ))}
        <span className="flex-1" />
        <button onClick={submit} className="bg-amber-600 hover:bg-amber-500 text-stone-950 rounded px-2 py-0.5 text-xs">{submitLabel}</button>
        <button onClick={onCancel} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button>
      </div>
    </div>
  )
}

// A charm's full text: its choices, text (the player's edit if any), and the modes
// in scope for this character, locked ones dimmed with the reason. Shown in the
// card's hover pop-up and in the charm window.
function CharmText({ charm, choiceOptions, exaltType, caste, essence, abilities }: {
  charm: CharacterCharm
  choiceOptions: string[]   // the library's purchase choices: modes that are choices show only if picked
  exaltType: string
  caste: string
  essence: number
  abilities: Record<string, AbilityData>
}) {
  const modes = sortModes((charm.libraryModes ?? []).filter(m => isModeInScope(m.label, exaltType, caste, false)
    && !isUnpickedChoiceMode(m.label, choiceOptions, charm.picks ?? [])))
  return (
    <div className="space-y-1.5">
      {charm.picks && charm.picks.length > 0 && (
        <p className="text-xs text-stone-500">Choices: <span className="text-amber-300">{charm.picks.join(', ')}</span></p>
      )}
      {charm.groupedPicks && charm.groupedPicks.length > 0 && (
        <div className="text-xs text-stone-500 space-y-0.5">
          {charm.groupedPicks.map((g, i) => (
            <p key={i}><span className="text-stone-300">{g.target}</span>: <span className="text-amber-300">{g.selected.join(', ')}</span></p>
          ))}
        </div>
      )}
      <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-wrap">{charm.customDescription ?? charm.libraryDescription}</p>
      {modes.map((m, i) => {
        const lockReasons = modeLockReasons(m, charm.libraryModes, charm.count ?? 1, essence, abilities)
        const locked = lockReasons.length > 0
        return (
          // An unlocked mode is part of the charm the character has, so its text looks
          // exactly like the charm's own text (Angel, 2026-10-22: the dimmer grey made
          // him unsure whether he had it). Only a locked mode is dimmed.
          <div key={`${m.label}-${i}`} className={locked ? 'opacity-50' : undefined}>
            <p className={`text-xs font-bold flex items-center gap-1 ${locked ? 'text-stone-500' : 'text-amber-400'}`}>
              <span>{modeIcon(m.label).glyph}</span>
              {m.label}
            </p>
            <p className={`text-xs leading-relaxed whitespace-pre-wrap ${locked ? 'text-stone-400' : 'text-stone-300'}`}>{m.text}</p>
            {locked && <p className="text-xs text-stone-500">Locked: {lockReasons.join(', ')}</p>}
          </div>
        )
      })}
    </div>
  )
}

// Text box with Save / Cancel, used for a charm's summary and its full text.
function CharmTextEditor({ initial, rows, onSave, onCancel }: {
  initial: string
  rows: number
  onSave: (text: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(initial)
  return (
    <div className="space-y-1">
      <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={rows}
        className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 resize-y" />
      <div className="flex items-center justify-end gap-1">
        <button onClick={() => onSave(text)} className="bg-amber-600 hover:bg-amber-500 text-stone-950 rounded px-2 py-0.5 text-xs">Save</button>
        <button onClick={onCancel} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button>
      </div>
    </div>
  )
}

// The charm window: opens over the sheet when a charm card is clicked. Everything
// about the charm, and everything that can be done to it, lives here, so the cards
// themselves carry no buttons.
function CharmWindow({ charm, lib, groups, exaltType, caste, essence, abilities, attributes, training, onTrainingDone, problems, intimacies, onSetAlly, onChange, onMoveToGroup, onRepurchase, onUndoPurchase, onRemove, onClose }: {
  charm: CharacterCharm
  training: MilestoneTransaction[]   // this charm's purchases still in training, longest-waiting first
  onTrainingDone: (lineId: string) => void
  problems: string[]                 // what its "!" asks the player to fix
  intimacies: IntimacyEntry[]
  onSetAlly: (index: number, name: string) => void   // Unconquered Sun's Sight: the ally of repurchase `index`
  lib: LibraryCharm | undefined   // undefined while the library loads, or if the charm was deleted from it
  groups: CharmGroup[]
  exaltType: string
  caste: string
  essence: number
  abilities: Record<string, AbilityData>
  attributes: Record<string, number>
  onChange: (charm: CharacterCharm) => void
  onMoveToGroup: (groupId: string | null) => void   // null = Ungrouped; joins the end of the group
  onRepurchase: (lib: LibraryCharm) => void
  onUndoPurchase: (lib: LibraryCharm) => void
  onRemove: () => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState<'summary' | 'text' | null>(null)
  const count = charm.count ?? 1
  const key = charmKey(charm, lib)
  const summary = cardSummary(charm, lib?.summary)
  const meta = lib ? [lib.type, lib.abilities.join(', '), lib.page ? `p. ${lib.page}` : ''].filter(Boolean).join(' · ') : ''
  const requires = lib ? [
    lib.prerequisiteEssence ? `Essence ${lib.prerequisiteEssence}` : '',
    ...lib.prerequisiteAbilities,
    ...lib.prerequisiteCharms,
  ].filter(Boolean) : []
  const buyAgain = lib !== undefined && canBuyAgain(lib, charm, ABILITIES, Object.keys(attributes))
  const [armedRemove, setArmedRemove] = useState(false)
  const sectionLabel = 'text-[10px] font-semibold uppercase tracking-wider text-stone-500'
  // Icon-only buttons; data-tip names them (and says why when one can't be used).
  // An unavailable one stays in place, dimmed, so the icons never shift around.
  const iconBtn = (available: boolean) => `w-7 h-7 shrink-0 inline-flex items-center justify-center rounded border transition-colors ${
    available ? 'border-transparent text-stone-400 hover:border-stone-600 hover:text-stone-100' : 'border-transparent text-stone-700 cursor-default'}`
  const smallIconBtn = 'w-5 h-5 inline-flex items-center justify-center rounded text-stone-500 hover:text-amber-400 transition-colors'
  const divider = <span className="w-px h-5 bg-stone-700 mx-1 shrink-0" />

  function setOxBodyPick(index: number, pick: OxBodyPick) {
    const picks = Array.from({ length: count }, (_, i) => charm.oxBodyPicks?.[i] ?? DEFAULT_OX_BODY_PICK)
    picks[index] = pick
    onChange({ ...charm, oxBodyPicks: picks })
  }

  return (
    <ModalPortal onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-16" onClick={onClose}>
        <div role="dialog" aria-label={charm.name} onClick={e => e.stopPropagation()}
          className="bg-stone-900 border border-stone-700 rounded-xl w-[52rem] max-w-[95vw] max-h-[85vh] flex flex-col shadow-2xl">
          {/* Header: who the charm is on the left (wraps as long as it needs), every
              control for it on the right, which never wraps or squeezes the text. */}
          <div className="flex items-start gap-3 px-4 py-3 border-b border-stone-700 shrink-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-amber-400 break-words">
                {charm.name}
                {count > 1 && <span className="ml-2 align-middle text-[11px] font-normal px-1.5 rounded bg-stone-800 border border-stone-600 text-stone-300">×{count}</span>}
              </h2>
              {meta && <p className="text-xs text-stone-400 mt-0.5">{meta}</p>}
              {requires.length > 0 && <p className="text-xs text-stone-500 mt-0.5">Requires {requires.join(' · ')}</p>}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <span data-tip="Group" className="text-stone-500 mr-1"><FolderInput size={15} aria-hidden /></span>
              <select value={groupOf(charm, groups) ?? ''} aria-label="Group" className={`${selectCls} !w-32 !py-1`}
                onChange={e => onMoveToGroup(e.target.value || null)}>
                <option value="">Ungrouped</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {divider}
              <button onClick={() => lib && buyAgain && onRepurchase(lib)} aria-label="Repurchase"
                data-tip={buyAgain ? 'Repurchase (buy again)' : 'Repurchase — not available for this charm'}
                className={iconBtn(buyAgain)}><RefreshCw size={15} aria-hidden /></button>
              <button onClick={() => lib && count > 1 && onUndoPurchase(lib)} aria-label="Undo last purchase"
                data-tip={count > 1 ? 'Undo last purchase' : 'Undo last purchase — bought only once'}
                className={iconBtn(lib !== undefined && count > 1)}><Undo2 size={15} aria-hidden /></button>
              <button onClick={() => { if (armedRemove) onRemove(); else setArmedRemove(true) }} onBlur={() => setArmedRemove(false)}
                aria-label={armedRemove ? 'Click again to remove the charm' : 'Remove charm'}
                data-tip={armedRemove ? 'Click again to remove' : 'Remove charm'}
                className={armedRemove
                  ? 'w-7 h-7 shrink-0 inline-flex items-center justify-center rounded border border-red-500/70 bg-red-950/50 text-red-400 transition-colors'
                  : 'w-7 h-7 shrink-0 inline-flex items-center justify-center rounded border border-transparent text-stone-400 hover:border-red-900/70 hover:text-red-400 transition-colors'}>
                <Trash2 size={15} aria-hidden />
              </button>
              {divider}
              <button onClick={onClose} aria-label="Close" data-tip="Close" className={iconBtn(true)}><X size={16} aria-hidden /></button>
            </div>
          </div>

          <div className="overflow-y-auto no-scrollbar px-4 py-3 space-y-4">
            {problems.length > 0 && (
              <section className="flex gap-2 rounded border border-red-900/70 bg-red-950/30 px-3 py-2 text-xs text-red-300">
                <CircleAlert size={14} className="shrink-0 mt-px" aria-hidden />
                <div className="space-y-0.5">{problems.map(p => <p key={p}>{p}</p>)}</div>
              </section>
            )}
            {key === RIGHTEOUS_LION && (
              <section className="space-y-1">
                <label htmlFor="lion-intimacy" className={sectionLabel}>Protects</label>
                <select id="lion-intimacy" value={charm.protectedIntimacyId ?? ''} className={selectCls}
                  onChange={e => onChange({ ...charm, protectedIntimacyId: e.target.value || undefined })}>
                  <option value="">Choose a Major or Defining Intimacy…</option>
                  {intimacies.filter(protectable).map(i => <option key={i.id} value={i.id}>{i.intensity}: {i.description}</option>)}
                </select>
              </section>
            )}
            {key === UNCONQUERED_SIGHT && count > 1 && (
              <section className="space-y-1">
                <span className={sectionLabel}>Allies (one per repurchase)</span>
                {Array.from({ length: count - 1 }, (_, i) => (
                  <input key={i} id={`sight-ally-${i}`} aria-label={`Ally of repurchase ${i + 1}`} placeholder={`Repurchase ${i + 1}: ally's name`}
                    defaultValue={charm.repurchaseAllies?.[i] ?? ''} onBlur={e => { if (e.target.value.trim() !== (charm.repurchaseAllies?.[i] ?? '')) onSetAlly(i, e.target.value.trim()) }}
                    className={inputCls} />
                ))}
              </section>
            )}
            {key === WARD_OF_THE_SUN && charm.wardName && (
              <p className="text-sm text-stone-300"><span className={sectionLabel}>Ward</span> <span className="ml-2 text-amber-300">{charm.wardName}</span></p>
            )}
            {training.length > 0 && (
              <section className="rounded border border-amber-700/40 bg-amber-950/20 px-3 py-2 space-y-1">
                {training.map(line => (
                  <div key={line.id} className="flex items-center gap-3 text-xs">
                    <span className="text-amber-300 flex-1">
                      {training.length < count ? 'Repurchase in training' : 'In training'}
                      {line.date && <span className="text-stone-400"> since {formatDay(line.date.slice(0, 10))}</span>}
                      <span className="text-stone-500"> — {training.length < count ? 'only the trained purchases work' : 'its effects start when it is done'}</span>
                    </span>
                    <button onClick={() => onTrainingDone(line.id)}
                      className="px-2 py-0.5 rounded border border-stone-600 text-stone-300 hover:text-amber-300 hover:border-amber-500 transition-colors">Done</button>
                  </div>
                ))}
              </section>
            )}
            <section className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={sectionLabel}>Summary</span>
                {editing !== 'summary' && (
                  <button onClick={() => setEditing('summary')} data-tip="Edit summary" aria-label="Edit summary" className={smallIconBtn}><Pencil size={12} aria-hidden /></button>
                )}
                {editing !== 'summary' && charm.customSummary != null && (
                  <button onClick={() => onChange({ ...charm, customSummary: null })} data-tip="Revert to the suggested summary" aria-label="Revert to the suggested summary" className={smallIconBtn}><RotateCcw size={12} aria-hidden /></button>
                )}
              </div>
              {editing === 'summary' ? (
                <CharmTextEditor initial={summary ?? ''} rows={2}
                  onSave={text => { onChange({ ...charm, customSummary: text.trim() || null }); setEditing(null) }}
                  onCancel={() => setEditing(null)} />
              ) : summary ? (
                <p className="text-sm text-stone-200">{summary}</p>
              ) : (
                <p className="text-xs text-stone-500 italic">No summary yet. The card shows the start of the text until one is written.</p>
              )}
            </section>

            <section className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={sectionLabel}>Charm text</span>
                {editing !== 'text' && (
                  <button onClick={() => setEditing('text')} data-tip="Edit charm text" aria-label="Edit charm text" className={smallIconBtn}><Pencil size={12} aria-hidden /></button>
                )}
                {editing !== 'text' && charm.customDescription !== null && (
                  <button onClick={() => onChange({ ...charm, customDescription: null })} data-tip="Revert to the original text" aria-label="Revert to the original text" className={smallIconBtn}><RotateCcw size={12} aria-hidden /></button>
                )}
              </div>
              {editing === 'text' ? (
                <CharmTextEditor initial={charm.customDescription ?? charm.libraryDescription ?? ''} rows={8}
                  onSave={text => { onChange({ ...charm, customDescription: text.trim() || null }); setEditing(null) }}
                  onCancel={() => setEditing(null)} />
              ) : (
                <CharmText charm={charm} choiceOptions={lib?.choiceOptions ?? []} exaltType={exaltType} caste={caste} essence={essence} abilities={abilities} />
              )}
            </section>

            {key === OX_BODY_KEY && (
              <section className="rounded border border-amber-900/50 bg-amber-950/20 px-2 py-1.5 space-y-1">
                <p className={sectionLabel}>Health levels gained</p>
                {oxBodyHasChoice(exaltType, caste) ? (
                  Array.from({ length: count }, (_, i) => {
                    const pick = charm.oxBodyPicks?.[i] ?? DEFAULT_OX_BODY_PICK
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        <span className="text-stone-500 w-20 shrink-0 whitespace-nowrap">Purchase {i + 1}</span>
                        {([['zero', 'One 0'], ['twoInjured', 'Two −1']] as const).map(([value, label]) => (
                          <button key={value} onClick={() => setOxBodyPick(i, value)}
                            className={`px-1.5 py-0.5 rounded border text-[11px] transition-colors ${
                              pick === value ? 'bg-amber-600 border-amber-500 text-stone-950' : 'border-stone-600 text-stone-400 hover:border-amber-500 hover:text-amber-300'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-stone-400">
                    Each purchase adds {oxBodyGrant(exaltType, caste, DEFAULT_OX_BODY_PICK).map(l => l === 0 ? '0' : `−${-l}`).join(' and ')} ({count}×)
                  </p>
                )}
                <p className="text-[10px] text-stone-500">Plus 1 base Soak, counted once.</p>
              </section>
            )}
          </div>

        </div>
      </div>
    </ModalPortal>
  )
}

function CharmPanel({ library, libraryLoaded, charms, milestones, training, onLedgerChange, onTrainingDone, pools, onSheetChange, problemContext, foiActive, groups, onChange, onGroupsChange, onContentHeight, dragEnabled, exaltType, caste, abilities, attributes, essence }: {
  // The library gives the cards their suggested summaries and settings, and the
  // charm window its details; the Add Charm browser lists it. Loaded by the sheet.
  library: LibraryCharm[]
  libraryLoaded: boolean
  charms: CharacterCharm[]
  milestones: MilestoneTransaction[]
  training: Map<string, MilestoneTransaction[]>   // purchases still in training, by library id
  // Buying, undoing or removing a charm also changes the ledger line that paid for it.
  onLedgerChange: (next: CharmsAndLedger) => void
  onTrainingDone: (lineId: string) => void
  // Commit dots commit motes in the Essence panel, so a click changes the charm,
  // the motes and anima together.
  pools: Pools
  onSheetChange: (patch: Partial<SheetData>) => void
  problemContext: ProblemContext   // what the "!" checks against (Essence, ratings, Intimacies)
  foiActive: boolean               // Fists of Iron is on in the Inventory (its in-use icon shows it)
  groups: CharmGroup[]
  // Reports the natural height (px) of everything inside the panel, so the sheet
  // can size the panel to fit it and the panel never scrolls.
  onContentHeight: (px: number) => void
  onChange: (c: CharacterCharm[]) => void
  // Group edits that also touch charms (deleting a group ungroups its charms)
  // pass both, so they land in one save.
  onGroupsChange: (groups: CharmGroup[], charms?: CharacterCharm[]) => void
  dragEnabled: boolean
  exaltType: string
  caste: string
  abilities: Record<string, AbilityData>
  attributes: Record<string, number>
  essence: number
}) {
  const [browsing, setBrowsing] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [picking, setPicking] = useState<LibraryCharm | null>(null)
  const [paying, setPaying] = useState<{ lib: LibraryCharm; pick: ChoicePick | null } | null>(null)
  // Choices a charm asks for after it is bought or used (see CharmChoiceModals).
  const [wardFor, setWardFor] = useState<string | null>(null)                         // charm id
  const [allyFor, setAllyFor] = useState<{ charmId: string; index: number } | null>(null)
  const [lionFor, setLionFor] = useState<string | null>(null)                         // charm id
  const [query, setQuery] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [selection, setSelection] = useState<CharmSelection>(ALL)
  const [dropHint, setDropHint] = useState<CharmDropHint>(null)
  const [dragging, setDragging] = useState<CharmDrag | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  const libById = new Map(library.map(l => [l.id, l]))
  const modeCtx: ModeContext = { exaltType, caste, essence, abilities }

  // Watch the content's natural height; it changes with charms, filtering, the
  // chosen group, and the panel's width (cards wrap onto more rows when narrower).
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setContentHeight(el.getBoundingClientRect().height))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Sized only once the library is in: until then the cards lack their summaries,
  // so the panel would shrink and then grow back (and save both) on every visit.
  // The height is read from the page here, not from contentHeight, which can
  // still hold the measurement from before the summaries arrived.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!libraryLoaded || !el || contentHeight === 0) return
    onContentHeight(el.getBoundingClientRect().height)
  }, [libraryLoaded, contentHeight, onContentHeight])

  // Every purchase first asks what paid for it (CharmCostModal), then lands with its ledger line.
  function addCharm(lib: LibraryCharm, pick: ChoicePick | null) {
    setPaying({ lib, pick })
  }

  function pay(cost: CharmCost) {
    if (!paying) return
    const ids = { charm: crypto.randomUUID(), line: crypto.randomUUID() }
    const next = buyCharm({ charms, milestones }, paying.lib, paying.pick, cost, ids, todayKey())
    onLedgerChange(next)
    setPaying(null)
    // Some charms ask for a choice as soon as they are bought.
    const bought = next.charms.find(c => c.libraryId === paying.lib.id)
    const key = bought ? charmKey(bought, paying.lib) : null
    if (bought && key === RIGHTEOUS_LION && (bought.count ?? 1) === 1) setLionFor(bought.id)
    if (bought && key === UNCONQUERED_SIGHT && (bought.count ?? 1) > 1) setAllyFor({ charmId: bought.id, index: (bought.count ?? 1) - 2 })
  }

  function setCharm(id: string, change: (c: CharacterCharm) => CharacterCharm) {
    onChange(charms.map(c => c.id === id ? change(c) : c))
  }

  // A commit dot: commits or releases a mote in the Essence panel, as the
  // Committed counter does by hand. Lighting Ward of the Sun asks who is warded.
  function clickCharmDot(charm: CharacterCharm, index: number) {
    const lib = libById.get(charm.libraryId)
    const result = clickDot(charm, lib, index, pools, modeCtx)
    if (!result) return
    onSheetChange({ charms: charms.map(c => c.id === charm.id ? result.charm : c), motes: result.pools.motes, anima: result.pools.anima })
    if (charmKey(charm, lib) === WARD_OF_THE_SUN && litDots(charm, lib, modeCtx) === 0) setWardFor(charm.id)
  }

  function setAlly(charmId: string, index: number, name: string) {
    setCharm(charmId, c => {
      const allies = [...(c.repurchaseAllies ?? [])]
      while (allies.length < index) allies.push('')
      allies[index] = name
      return { ...c, repurchaseAllies: allies }
    })
  }

  function undoLast(lib: LibraryCharm) {
    onLedgerChange(undoCharmPurchase({ charms, milestones }, lib))
  }

  // Repurchase from the charm window: charms with a purchase choice ask for it first.
  function repurchase(lib: LibraryCharm) {
    if (asksForChoice(lib, charms.find(c => c.libraryId === lib.id))) setPicking(lib)
    else addCharm(lib, null)
  }

  function updateCharm(next: CharacterCharm) {
    onChange(charms.map(c => c.id === next.id ? next : c))
  }

  function removeCharm(id: string) {
    onLedgerChange(removeCharmAndLines({ charms, milestones }, id))
    if (openId === id) setOpenId(null)
  }

  function removeGroup(id: string) {
    const next = deleteGroup(groups, charms, id)
    onGroupsChange(next.groups, next.charms)
  }

  // ── Drag and drop: cards onto cards or group buttons, groups among themselves ──
  function onDragStart(e: React.DragEvent, drag: CharmDrag) {
    setDragging(drag)
    e.dataTransfer.effectAllowed = 'move'
    e.stopPropagation()
  }
  function onDragEnd() { setDragging(null); setDropHint(null) }

  // A drop that changes nothing (e.g. a card onto itself) skips the save.
  function dropCharm(charmId: string, target: { groupId: string | null; beforeId?: string }) {
    const next = moveCharm(charms, charmId, target)
    if (next !== charms) onChange(next)
    onDragEnd()
  }

  // Over a card: a charm lands just before it, in its group.
  function onCardDragOver(e: React.DragEvent, cardId: string) {
    if (dragging?.kind !== 'charm') return
    e.preventDefault(); e.stopPropagation()
    setDropHint({ kind: 'card', id: cardId })
  }
  function onCardDrop(e: React.DragEvent, card: CharacterCharm) {
    if (dragging?.kind !== 'charm') return
    e.preventDefault(); e.stopPropagation()
    dropCharm(dragging.id, { groupId: groupOf(card, groups), beforeId: card.id })
  }

  // Over a group's button: a charm joins the end of that group; a group moves before it.
  function onChipDragOver(e: React.DragEvent, groupId: string | null) {
    if (!dragging || (dragging.kind === 'group' && groupId === null)) return
    e.preventDefault()
    setDropHint({ kind: 'group', id: groupId ?? '' })
  }
  function onChipDrop(e: React.DragEvent, groupId: string | null) {
    const drag = dragging
    if (!drag) return
    e.preventDefault()
    if (drag.kind === 'charm') { dropCharm(drag.id, { groupId }); return }
    if (groupId === null) return
    const next = moveGroup(groups, drag.id, groupId)
    if (next !== groups) onGroupsChange(next)
    onDragEnd()
  }

  const { grouped, ungrouped } = partitionCharms(charms, groups)
  const filtering = query.trim() !== ''
  const shown = visibleSections(grouped, ungrouped, selection)
  const selected = shown.selection
  const selectedGroup = selected.kind === 'group' ? groups.find(g => g.id === selected.id) ?? null : null
  const openCharm = openId ? charms.find(c => c.id === openId) ?? null : null

  // One group button. `target` undefined = All (not a drop target); null = Ungrouped.
  function chip(sel: CharmSelection, label: string, dot: string | null, count: number, target: string | null | undefined, group?: CharmGroup) {
    const on = sameSelection(sel, selected)
    const droppable = target !== undefined
    const hinted = droppable && dropHint?.kind === 'group' && dropHint.id === (target ?? '')
    return (
      <button key={group?.id ?? label} onClick={() => setSelection(sel)}
        draggable={!!group && dragEnabled}
        onDragStart={e => group && dragEnabled && onDragStart(e, { kind: 'group', id: group.id })}
        onDragEnd={onDragEnd}
        onDragOver={droppable ? e => onChipDragOver(e, target) : undefined}
        onDragLeave={droppable ? () => setDropHint(null) : undefined}
        onDrop={droppable ? e => onChipDrop(e, target) : undefined}
        className={`flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] transition-colors ${
          hinted ? 'border-amber-400 bg-amber-500/20 text-amber-100'
            : on ? 'border-amber-500/70 bg-amber-500/10 text-amber-200'
            : 'border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500'}`}>
        {dot && <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />}
        {label}
        <span className="text-stone-500">{count}</span>
      </button>
    )
  }

  // A card: colour bar, name, purchase count and
  // the summary (or the start of the text). Hover shows the full text; a click
  // opens the charm window.
  function card(charm: CharacterCharm, group: CharmGroup | null) {
    const summary = cardSummary(charm, libById.get(charm.libraryId)?.summary)
    const dropBefore = dropHint?.kind === 'card' && dropHint.id === charm.id
    const count = charm.count ?? 1
    const waiting = training.get(charm.libraryId)?.length ?? 0
    const allWaiting = waiting >= count
    const lib = libById.get(charm.libraryId)
    const dots = dotCount(charm, lib, modeCtx)
    const lit = litDots(charm, lib, modeCtx)
    const isFoi = charmKey(charm, lib) === FISTS_OF_IRON
    const inUse = isFoi ? foiActive : !!charm.inUse
    const problems = charmProblems(charm, lib, problemContext)
    // Clicks on the card's own controls must not open the charm window.
    const own = (e: React.SyntheticEvent) => e.stopPropagation()
    return (
      <Tooltip key={charm.id} wide delayed content={
        <div className="space-y-1.5">
          <p className="font-semibold text-stone-100">{charm.name}{count > 1 ? ` ×${count}` : ''}</p>
          {charm.wardName && <p className="text-amber-300">Ward: {charm.wardName}</p>}
          <CharmText charm={charm} choiceOptions={lib?.choiceOptions ?? []} exaltType={exaltType} caste={caste} essence={essence} abilities={abilities} />
        </div>
      }>
        <div role="button" tabIndex={0}
          draggable={dragEnabled}
          onDragStart={e => dragEnabled && onDragStart(e, { kind: 'charm', id: charm.id })}
          onDragEnd={onDragEnd}
          onDragOver={e => onCardDragOver(e, charm.id)}
          onDrop={e => onCardDrop(e, charm)}
          onClick={() => setOpenId(charm.id)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(charm.id) } }}
          className={`h-full cursor-pointer rounded border border-t-[3px] bg-stone-800/60 hover:bg-stone-800 px-1.5 py-1 space-y-0.5 break-words transition-colors
            ${group ? groupColor(group).bar : 'border-t-stone-600'}
            ${dropBefore ? 'border-amber-400/80 border-l-2' : allWaiting ? 'border-dashed border-amber-700/60' : 'border-stone-700'}
            ${allWaiting ? 'opacity-60' : ''}`}>
          <div className="flex items-start gap-1">
            <span className="text-xs font-semibold text-stone-100 leading-snug flex-1 min-w-0">{charm.name}</span>
            {waiting > 0 && (
              <span className="text-[10px] px-1 rounded bg-amber-950/60 border border-amber-700/60 text-amber-300 shrink-0"
                data-tip={allWaiting ? 'In training — no effect until it is done' : `${waiting} purchase${waiting > 1 ? 's' : ''} in training`}>
                {allWaiting ? 'Training' : `+${waiting} training`}
              </span>
            )}
            {dots > 0 && (
              <span className="flex items-center gap-0.5 shrink-0 h-4" onClick={own} onKeyDown={own}>
                {Array.from({ length: dots }, (_, i) => (
                  <button key={i} type="button" onClick={() => clickCharmDot(charm, i)}
                    aria-label={i < lit ? 'Release a committed mote' : 'Commit a mote'}
                    data-tip={i < lit ? 'Committed — click to release the mote' : 'Click to commit a mote'}
                    className={`w-2.5 h-2.5 rounded-full border transition-colors ${i < lit ? 'bg-amber-400 border-amber-400' : 'border-stone-500 hover:border-amber-400'}`} />
                ))}
              </span>
            )}
            {hasInUseIcon(charm, lib, modeCtx) && (isFoi ? (
              <span data-tip={inUse ? 'In use: Fists of Iron is on (switched in the Inventory)' : 'Not in use: switch Fists of Iron on in the Inventory'}
                className={`shrink-0 h-4 inline-flex items-center ${inUse ? 'text-amber-400' : 'text-stone-600'}`}>
                <Zap size={13} aria-hidden fill={inUse ? 'currentColor' : 'none'} />
              </span>
            ) : (
              <button type="button" onClick={e => { own(e); setCharm(charm.id, toggleInUse) }} onKeyDown={own}
                aria-label={inUse ? 'In use — click to turn off' : 'Not in use — click to turn on'} aria-pressed={inUse}
                data-tip={inUse ? 'In use — click to turn off' : 'Not in use — click to turn on'}
                className={`shrink-0 h-4 inline-flex items-center transition-colors ${inUse ? 'text-amber-400' : 'text-stone-600 hover:text-stone-300'}`}>
                <Zap size={13} aria-hidden fill={inUse ? 'currentColor' : 'none'} />
              </button>
            ))}
            {problems.length > 0 && (
              <span data-tip={problems.join(' ')} aria-label={problems.join(' ')} role="img" className="shrink-0 h-4 inline-flex items-center text-red-400">
                <CircleAlert size={13} aria-hidden />
              </span>
            )}
            {count > 1 && <span className="text-[10px] px-1 rounded bg-stone-900 border border-stone-600 text-stone-300 shrink-0">×{count}</span>}
          </div>
          {/* The summary always shows in full — reading it at a glance is the card's job.
              Without one, the start of the charm text stands in, cut to two lines. */}
          {summary
            ? <p className="text-xs leading-snug text-stone-300">{summary}</p>
            : <p className="text-xs leading-snug line-clamp-2 text-stone-500">{charm.customDescription ?? charm.libraryDescription}</p>}
        </div>
      </Tooltip>
    )
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-clip h-full">
      {browsing && (
        <CharmBrowseModal
          library={library}
          loading={!libraryLoaded}
          existing={charms}
          exaltType={exaltType}
          caste={caste}
          abilities={abilities}
          attributes={attributes}
          essence={essence}
          onAdd={addCharm}
          onRemove={undoLast}
          onClose={() => setBrowsing(false)}
        />
      )}
      {openCharm && (
        <CharmWindow
          charm={openCharm}
          lib={libById.get(openCharm.libraryId)}
          groups={groups}
          exaltType={exaltType}
          caste={caste}
          essence={essence}
          abilities={abilities}
          attributes={attributes}
          onChange={updateCharm}
          onMoveToGroup={groupId => onChange(moveCharm(charms, openCharm.id, { groupId }))}
          training={training.get(openCharm.libraryId) ?? []}
          onTrainingDone={onTrainingDone}
          problems={charmProblems(openCharm, libById.get(openCharm.libraryId), problemContext)}
          intimacies={problemContext.intimacies}
          onSetAlly={(index, name) => setAlly(openCharm.id, index, name)}
          onRepurchase={repurchase}
          onUndoPurchase={undoLast}
          onRemove={() => removeCharm(openCharm.id)}
          onClose={() => setOpenId(null)}
        />
      )}
      {wardFor && (
        <NamePromptModal title="Ward of the Sun" hint="Who is the ally you ward? Shown when you rest the mouse on the card, until the charm is turned off."
          label="Ward's name" onClose={() => setWardFor(null)}
          onSave={name => { setCharm(wardFor, c => ({ ...c, wardName: name })); setWardFor(null) }} />
      )}
      {allyFor && (
        <NamePromptModal title="Unconquered Sun's Sight — repurchase" hint="Name the ally this repurchase covers."
          label="Ally's name" onClose={() => setAllyFor(null)}
          onSave={name => { setAlly(allyFor.charmId, allyFor.index, name); setAllyFor(null) }} />
      )}
      {lionFor && (
        <IntimacyPickModal intimacies={problemContext.intimacies} onClose={() => setLionFor(null)}
          onPick={id => { setCharm(lionFor, c => ({ ...c, protectedIntimacyId: id })); setLionFor(null) }} />
      )}
      {paying && (
        <CharmCostModal
          charmName={paying.lib.name}
          repurchase={charms.some(c => c.libraryId === paying.lib.id)}
          onConfirm={pay}
          onClose={() => setPaying(null)}
        />
      )}
      {picking && (
        <ChoicePickerModal
          charm={picking}
          existingPicks={charms.find(c => c.libraryId === picking.id)?.picks ?? []}
          existingTargets={charms.find(c => c.libraryId === picking.id)?.groupedPicks?.map(g => g.target) ?? []}
          purchaseIndex={charms.find(c => c.libraryId === picking.id)?.count ?? 0}
          abilities={abilities}
          attributes={attributes}
          essence={essence}
          onConfirm={pick => { addCharm(picking, pick); setPicking(null) }}
          onClose={() => setPicking(null)}
        />
      )}

      {/* Everything measured for the panel's height lives in this wrapper. */}
      <div ref={contentRef} className="flow-root">
        <div className="flex items-start gap-2 mb-2">
          <SectionHeader title="Charms" />
          {/* Group buttons: All, each group, Ungrouped (shown while it holds charms, or
              while a charm is dragged so it can be dropped out of its group). */}
          <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
            {charms.length > 0 && chip(ALL, 'All', null, charms.length, undefined)}
            {grouped.map(({ group, charms: members }) => chip({ kind: 'group', id: group.id }, group.name, groupColor(group).dot, members.length, group.id, group))}
            {(ungrouped.length > 0 || dragging?.kind === 'charm') && chip({ kind: 'ungrouped' }, 'Ungrouped', 'bg-stone-600', ungrouped.length, null)}
            {selectedGroup && (
              <>
                <button onClick={() => setEditingGroupId(selectedGroup.id)} data-tip="Edit group" aria-label="Edit group" className="text-xs text-stone-500 hover:text-amber-400 transition-colors px-0.5">✎</button>
                <button onClick={() => removeGroup(selectedGroup.id)} data-tip="Delete group (its charms become ungrouped)" aria-label="Delete group" className="text-xs text-stone-600 hover:text-red-400 transition-colors px-0.5">✕</button>
              </>
            )}
          </div>
          {charms.length > 0 && (
            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter…" aria-label="Filter charms"
              className="w-24 bg-stone-800 border border-stone-600 text-stone-100 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-amber-500 placeholder-stone-500" />
          )}
          <button onClick={() => setAddingGroup(v => !v)} data-tip="New group" aria-label="New group" className="text-stone-500 hover:text-amber-400 transition-colors text-[11px] border border-stone-700 hover:border-amber-500 rounded px-1">+ Group</button>
          <button onClick={() => setBrowsing(true)} data-tip="Add charm" aria-label="Add charm" className="text-stone-500 hover:text-amber-400 transition-colors text-base font-bold leading-none">+</button>
        </div>

        {/* No scroll area in here: the panel always fits its content, and an inner
            scroller captures the mouse wheel and stalls the page's scrolling. */}
        <div className="space-y-2">
          {addingGroup && (
            <div className="w-[19.25rem]">
              <CharmGroupForm submitLabel="Create group"
                initial={{ name: '', color: DEFAULT_GROUP_COLOR }}
                onSubmit={v => {
                  const group = newGroup(crypto.randomUUID(), v.name, v.color)
                  if (group) onGroupsChange([...groups, group])
                  setAddingGroup(false)
                }}
                onCancel={() => setAddingGroup(false)} />
            </div>
          )}
          {selectedGroup && editingGroupId === selectedGroup.id && (
            <div className="w-[19.25rem]">
              <CharmGroupForm submitLabel="Save"
                initial={{ name: selectedGroup.name, color: isGroupColor(selectedGroup.color) ? selectedGroup.color : DEFAULT_GROUP_COLOR }}
                onSubmit={v => { onGroupsChange(editGroup(groups, selectedGroup.id, v)); setEditingGroupId(null) }}
                onCancel={() => setEditingGroupId(null)} />
            </div>
          )}
          {charms.length === 0 && <p className="text-xs text-stone-500">No charms. Click + to browse the library.</p>}
          {/* The chosen group's cards; under All, each group under its own small heading. */}
          {shown.sections.map(({ group, charms: members }) => {
            const list = filterCharms(members, query)
            if (filtering && list.length === 0) return null
            return (
              <div key={group?.id ?? ''} className="space-y-1">
                {selected.kind === 'all' && (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${group ? groupColor(group).dot : 'bg-stone-600'}`} />
                    <span className="text-xs font-semibold text-stone-300">{group?.name ?? 'Ungrouped'}</span>
                  </div>
                )}
                {list.length === 0 ? (
                  <p className="text-xs text-stone-500">No charms in this group yet. Drag one onto its button above.</p>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-1.5">
                    {list.map(c => card(c, group))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// EffectPanel — same structure as CharmPanel (categories + entries with name & description)
function EffectPanel({ categories, onChange, dragEnabled, anima }: {
  categories: EffectCategory[]
  onChange: (c: EffectCategory[]) => void
  dragEnabled: boolean
  anima?: number
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingEffectCatId, setAddingEffectCatId] = useState<string | null>(null)
  const [newEffectName, setNewEffectName] = useState('')
  const [newEffectText, setNewEffectText] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editingEffect, setEditingEffect] = useState<{ catId: string; effect: EffectEntry } | null>(null)
  const [editEffectName, setEditEffectName] = useState('')
  const [editEffectText, setEditEffectText] = useState('')
  const [dropTargetCatId, setDropTargetCatId] = useState<string | null>(null)
  const [catDropBeforeId, setCatDropBeforeId] = useState<string | null>(null)
  const dragging = useRef<{ fromCatId: string; effectId: string } | null>(null)
  const draggingCat = useRef<string | null>(null)

  function onCatDragStart(e: React.DragEvent, catId: string) { draggingCat.current = catId; dragging.current = null; e.dataTransfer.effectAllowed = 'move'; e.stopPropagation() }
  function onCatDragOver(e: React.DragEvent, catId: string) { if (!draggingCat.current || draggingCat.current === catId) return; e.preventDefault(); e.stopPropagation(); setCatDropBeforeId(catId) }
  function onCatDrop(e: React.DragEvent, beforeCatId: string) {
    e.preventDefault(); e.stopPropagation()
    if (!draggingCat.current || draggingCat.current === beforeCatId) { draggingCat.current = null; setCatDropBeforeId(null); return }
    const fromId = draggingCat.current; const next = categories.filter(c => c.id !== fromId); const moving = categories.find(c => c.id === fromId)!
    const idx = next.findIndex(c => c.id === beforeCatId); next.splice(idx < 0 ? next.length : idx, 0, moving); onChange(next)
    draggingCat.current = null; setCatDropBeforeId(null)
  }
  function onCatDragEnd() { draggingCat.current = null; setCatDropBeforeId(null) }

  function addCat() { if (!newCatName.trim()) return; onChange([...categories, { id: crypto.randomUUID(), name: newCatName.trim(), effects: [] }]); setNewCatName(''); setAddingCat(false) }
  function removeCat(id: string) { onChange(categories.filter(c => c.id !== id)) }
  function saveCat() { if (!editingCatId || !editCatName.trim()) return; onChange(categories.map(c => c.id === editingCatId ? { ...c, name: editCatName.trim() } : c)); setEditingCatId(null) }
  function addEffect(catId: string) {
    if (!newEffectName.trim()) return
    onChange(categories.map(c => c.id === catId ? { ...c, effects: [...c.effects, { id: crypto.randomUUID(), name: newEffectName.trim(), text: newEffectText }] } : c))
    setNewEffectName(''); setNewEffectText(''); setAddingEffectCatId(null)
  }
  function removeEffect(catId: string, effectId: string) { onChange(categories.map(c => c.id === catId ? { ...c, effects: c.effects.filter(e => e.id !== effectId) } : c)); setExpandedIds(s => { const n = new Set(s); n.delete(effectId); return n }) }
  function saveEffect() {
    if (!editingEffect || !editEffectName.trim()) return
    onChange(categories.map(c => c.id === editingEffect.catId ? { ...c, effects: c.effects.map(e => e.id === editingEffect.effect.id ? { ...e, name: editEffectName.trim(), text: editEffectText } : e) } : c))
    setEditingEffect(null)
  }
  function onDragStart(e: React.DragEvent, fromCatId: string, effectId: string) { dragging.current = { fromCatId, effectId }; e.dataTransfer.effectAllowed = 'move' }
  function onDrop(e: React.DragEvent, toCatId: string, beforeId?: string) {
    e.preventDefault(); e.stopPropagation()
    if (!dragging.current) return
    const { fromCatId, effectId } = dragging.current
    const effect = categories.find(c => c.id === fromCatId)?.effects.find(e => e.id === effectId)
    if (!effect) return
    onChange(categories.map(c => {
      if (c.id === fromCatId && c.id === toCatId) { const f = c.effects.filter(e => e.id !== effectId); const i = beforeId ? f.findIndex(e => e.id === beforeId) : f.length; f.splice(i < 0 ? f.length : i, 0, effect); return { ...c, effects: f } }
      if (c.id === fromCatId) return { ...c, effects: c.effects.filter(e => e.id !== effectId) }
      if (c.id === toCatId) { const i = beforeId ? c.effects.findIndex(e => e.id === beforeId) : c.effects.length; const n = [...c.effects]; n.splice(i < 0 ? n.length : i, 0, effect); return { ...c, effects: n } }
      return c
    }))
    dragging.current = null; setDropTargetCatId(null)
  }

  const g = "text-stone-500 hover:text-amber-400 transition-colors text-xs"
  const gPlus = "text-stone-500 hover:text-amber-400 transition-colors text-base font-bold leading-none"
  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col no-scrollbar">
      <div className="flex items-center justify-between mb-2 shrink-0"><SectionHeader title="Effects" /><button onClick={() => setAddingCat(v => !v)} data-tip="Add category" aria-label="Add category" className={gPlus}>+</button></div>
      {addingCat && <div className="flex gap-1 mb-2 shrink-0"><input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCat(); if (e.key === 'Escape') setAddingCat(false) }} placeholder="Category name…" className={inputCls} /><button onClick={addCat} className="bg-amber-600 hover:bg-amber-500 text-stone-950 rounded px-2 py-0.5 text-xs">✓</button><button onClick={() => setAddingCat(false)} className="text-stone-500 hover:text-stone-300 text-xs px-1">✕</button></div>}
      <div className="space-y-2 overflow-y-auto no-scrollbar flex-1">
        {categories.length === 0 && <p className="text-xs text-stone-500">No categories yet.</p>}
        {categories.map(cat => (
          <div key={cat.id}
            onDragOver={e => { if (draggingCat.current) onCatDragOver(e, cat.id); else { e.preventDefault(); setDropTargetCatId(cat.id) } }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { setDropTargetCatId(null); setCatDropBeforeId(null) } }}
            onDrop={e => { if (draggingCat.current) onCatDrop(e, cat.id); else onDrop(e, cat.id) }}
            onDragEnd={onCatDragEnd}
            className={`rounded border transition-colors ${catDropBeforeId === cat.id ? 'border-amber-400 border-t-2' : dropTargetCatId === cat.id ? 'border-amber-500/60 bg-amber-500/5' : 'border-stone-700/50'}`}
          >
            <div
              draggable={dragEnabled}
              onDragStart={e => dragEnabled && onCatDragStart(e, cat.id)}
              className={`flex items-center justify-between px-1.5 py-1 ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              {editingCatId === cat.id ? <div className="flex gap-1 flex-1"><input autoFocus type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveCat(); if (e.key === 'Escape') setEditingCatId(null) }} className={inputActive} /><button onClick={saveCat} className="bg-amber-600 hover:bg-amber-500 text-stone-950 rounded px-1.5 py-0.5 text-xs">✓</button><button onClick={() => setEditingCatId(null)} className="text-stone-500 hover:text-stone-300 text-xs">✕</button></div>
              : <><span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">{cat.name}</span><div className="flex items-center gap-2"><button onClick={() => setAddingEffectCatId(cat.id === addingEffectCatId ? null : cat.id)} data-tip="Add effect" aria-label="Add effect" className={gPlus}>+</button><button onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name) }} data-tip="Edit" aria-label="Edit" className={g}>✎</button><button onClick={() => removeCat(cat.id)} data-tip="Delete" aria-label="Delete" className="text-stone-500 hover:text-red-400 transition-colors text-xs">✕</button></div></>}
            </div>
            {addingEffectCatId === cat.id && <div className="px-1.5 pb-1.5 space-y-1 border-t border-stone-700/50 pt-1"><input autoFocus type="text" value={newEffectName} onChange={e => setNewEffectName(e.target.value)} placeholder="Effect name…" className={inputCls} /><textarea value={newEffectText} onChange={e => setNewEffectText(e.target.value)} placeholder="Description…" rows={3} className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500 resize-none" /><div className="flex gap-1 justify-end"><button onClick={() => addEffect(cat.id)} className="bg-amber-600 hover:bg-amber-500 text-stone-950 rounded px-2 py-0.5 text-xs">Add</button><button onClick={() => { setAddingEffectCatId(null); setNewEffectName(''); setNewEffectText('') }} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button></div></div>}
            <div>
              {cat.effects.length === 0 && addingEffectCatId !== cat.id && <p className="text-xs text-stone-600 px-1.5 pb-1">No effects.</p>}
              {cat.effects.map(effect => (
                <div key={effect.id} draggable={dragEnabled} onDragStart={e => dragEnabled && onDragStart(e, cat.id, effect.id)} onDragOver={e => { e.preventDefault(); e.stopPropagation() }} onDrop={e => onDrop(e, cat.id, effect.id)} className={`border-t border-stone-800 px-1.5 ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                  {(() => {
                    const isDawnCat = cat.name.toLowerCase().includes('dawn')
                    const eName = effect.name.toLowerCase()
                    let dotLit: boolean | null = null
                    if (isDawnCat) {
                      if (eName.startsWith('passive')) dotLit = true
                      else if (eName.startsWith('active')) dotLit = (anima ?? 0) >= 3
                      else if (eName.startsWith('iconic')) dotLit = (anima ?? 0) === 10
                    }
                    return (
                      <div className="flex items-center justify-between py-1 text-xs gap-1">
                        {dotLit !== null && <span className={`shrink-0 w-2 h-2 rounded-full ${dotLit ? 'bg-amber-400 shadow-[0_0_4px_1px_rgba(251,191,36,0.7)]' : 'bg-stone-700'}`} />}
                        <button onClick={() => setExpandedIds(s => { const n = new Set(s); if (n.has(effect.id)) n.delete(effect.id); else n.add(effect.id); return n })} className="text-left text-stone-200 hover:text-amber-300 transition-colors flex-1 min-w-0 truncate">{effect.name}</button>
                        <div className="flex gap-1 shrink-0"><button onClick={() => { setEditingEffect({ catId: cat.id, effect }); setEditEffectName(effect.name); setEditEffectText(effect.text) }} data-tip="Edit" aria-label="Edit" className="text-stone-500 hover:text-amber-400 transition-colors">✎</button><button onClick={() => removeEffect(cat.id, effect.id)} data-tip="Delete" aria-label="Delete" className="text-stone-500 hover:text-red-400 transition-colors">✕</button></div>
                      </div>
                    )
                  })()}
                  {expandedIds.has(effect.id) && editingEffect?.effect.id !== effect.id && <p className="text-xs text-stone-400 pb-1.5 whitespace-pre-wrap leading-relaxed">{effect.text || <em className="text-stone-600">No description.</em>}</p>}
                  {editingEffect?.effect.id === effect.id && <div className="pb-1.5 space-y-1"><input type="text" value={editEffectName} onChange={e => setEditEffectName(e.target.value)} className={inputActive} /><textarea value={editEffectText} onChange={e => setEditEffectText(e.target.value)} rows={4} className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 resize-none" /><div className="flex gap-1 justify-end"><button onClick={saveEffect} className="bg-amber-600 hover:bg-amber-500 text-stone-950 rounded px-2 py-0.5 text-xs">Save</button><button onClick={() => setEditingEffect(null)} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button></div></div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Inventory ──────────────────────────────────────────────────────────────

function ItemModal({ item, onSave, onClose, gameData }: {
  item: Partial<InventoryItem> & { kind: InventoryItemKind }
  onSave: (item: InventoryItem) => void
  onClose: () => void
  gameData: GameData
}) {
  const normTags = (t: unknown): string[] =>
    Array.isArray(t) ? t : typeof t === 'string' && t ? t.split(',').map(s => s.trim()).filter(Boolean) : []

  const [form, setForm] = useState<InventoryItem>({
    id: item.id ?? crypto.randomUUID(),
    kind: item.kind,
    name: item.name ?? '',
    type: item.type ?? '',
    equipped: item.equipped ?? false,
    weight: item.weight,
    artifact: item.artifact ?? false,
    artifactColor: item.artifactColor,
    accuracy: item.accuracy,
    damage: item.damage,
    defense: item.defense,
    overwhelming: item.overwhelming,
    soak: item.soak,
    mobilityPen: item.mobilityPen,
    hardness: item.hardness,
    tags: normTags(item.tags),
    notes: item.notes ?? '',
  })
  const [customTag, setCustomTag] = useState('')
  const initTags = normTags(item.tags)
  const [weaponCombatType, setWeaponCombatType] = useState<'melee' | 'ranged' | null>(
    initTags.includes('Ranged') ? 'ranged' : initTags.includes('Melee') ? 'melee' : null
  )

  const set = (patch: Partial<InventoryItem>) => setForm(f => ({ ...f, ...patch }))
  const nf = "w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500"
  const nfNum = "w-16 text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-1 text-xs focus:outline-none focus:border-amber-500"
  const row = "flex items-center justify-between gap-2"
  const lbl = "text-xs text-stone-400 shrink-0"

  const ARTIFACT_COLORS: { value: ArtifactColor; bg: string; ring: string; label: string }[] = [
    { value: 'red',    bg: 'bg-red-500',    ring: 'ring-red-400',    label: 'Red' },
    { value: 'green',  bg: 'bg-green-500',  ring: 'ring-green-400',  label: 'Green' },
    { value: 'blue',   bg: 'bg-blue-500',   ring: 'ring-blue-400',   label: 'Blue' },
    { value: 'white',  bg: 'bg-white',      ring: 'ring-white',      label: 'White' },
    { value: 'silver', bg: 'bg-slate-300',  ring: 'ring-slate-300',  label: 'Silver' },
    { value: 'gold',   bg: 'bg-amber-400',  ring: 'ring-amber-400',  label: 'Gold' },
  ]

  const kindBadge: Record<InventoryItemKind, string> = {
    weapon: 'bg-red-900/60 text-red-300',
    armor: 'bg-blue-900/60 text-blue-300',
    other: 'bg-stone-700 text-stone-300',
  }

  function selectWeightRow(category: string) {
    const r = gameData.weapons.find(w => w.category === category)
    const a = form.artifact ? 1 : 0
    const s = (form.tags ?? []).includes('Shield') ? 1 : 0
    set({
      weight: category as WeaponWeight,
      ...(r ? { accuracy: r.accuracy + a, damage: Math.max(0, r.damage + a - s), defense: r.defense + a, overwhelming: r.overwhelming + a } : {}),
    })
  }

  function selectArmorRow(category: string) {
    const r = gameData.armor.find(a => a.category === category)
    const a = form.artifact ? 1 : 0
    set({
      type: category,
      ...(r ? { soak: r.soak + a, mobilityPen: r.mobilityPenalty, hardness: r.hardness + a } : {}),
    })
  }

  function toggleTag(name: string) {
    const tags = form.tags ?? []
    const adding = !tags.includes(name)
    const patch: Partial<InventoryItem> = { tags: adding ? [...tags, name] : tags.filter(t => t !== name) }
    if (name === 'Shield') {
      patch.damage = adding
        ? Math.max(0, (form.damage ?? 0) - 1)
        : (form.damage ?? 0) + 1
    }
    if (name === 'Balanced') {
      patch.overwhelming = adding
        ? (form.overwhelming ?? 0) + 1
        : Math.max(0, (form.overwhelming ?? 0) - 1)
    }
    if (name === 'Improvised') {
      patch.accuracy = adding
        ? Math.max(0, (form.accuracy ?? 0) - 2)
        : (form.accuracy ?? 0) + 2
    }
    if (name === 'Defensive') {
      patch.defense = adding
        ? (form.defense ?? 0) + 1
        : Math.max(0, (form.defense ?? 0) - 1)
    }
    set(patch)
  }

  function addCustomTag() {
    const name = customTag.trim()
    if (!name) return
    const tags = form.tags ?? []
    if (!tags.includes(name)) set({ tags: [...tags, name] })
    setCustomTag('')
  }

  function selectCombatType(ct: 'melee' | 'ranged') {
    const current = weaponCombatType
    const next = current === ct ? null : ct
    setWeaponCombatType(next)
    // Swap the Type Tag in the tags array
    const base = (form.tags ?? []).filter(t => t !== 'Melee' && t !== 'Ranged')
    set({ tags: next ? [...base, next === 'melee' ? 'Melee' : 'Ranged'] : base })
  }

  const f0 = (n: number) => Math.max(0, n)

  function toggleArtifact() {
    const on = !form.artifact
    const delta = on ? 1 : -1
    const patch: Partial<InventoryItem> = {
      artifact: on,
      artifactColor: on ? (form.artifactColor ?? 'gold') : undefined,
    }
    if (form.kind === 'weapon') {
      patch.accuracy     = f0((form.accuracy     ?? 0) + delta)
      patch.damage       = f0((form.damage       ?? 0) + delta)
      patch.defense      = f0((form.defense      ?? 0) + delta)
      patch.overwhelming = f0((form.overwhelming ?? 0) + delta)
    } else if (form.kind === 'armor') {
      patch.soak     = f0((form.soak     ?? 0) + delta)
      patch.hardness = f0((form.hardness ?? 0) + delta)
    }
    set(patch)
  }

  function renderTagPicker() {
    const visibleGroups = gameData.tagGroups.filter(g => {
      const name = g.group.toLowerCase()
      if (name.includes('type')) return false   // Artifact/Melee/Ranged handled by UI controls
      if (form.kind === 'weapon') {
        if (name.includes('armor')) return false
        if (name.includes('melee')) return weaponCombatType === 'melee'
        if (name.includes('ranged')) return weaponCombatType === 'ranged'
        return true
      }
      if (form.kind === 'armor') {
        if (name.includes('melee') || name.includes('ranged')) return false
        return true
      }
      return false
    })
    return (
      <div className="space-y-2">
        {visibleGroups.map((group, gi) => (
          <div key={gi}>
            <p className="text-[9px] uppercase tracking-wider text-stone-500 mb-1">{group.group}</p>
            <div className="flex flex-wrap gap-1">
              {group.tags.map(tag => {
                const active = (form.tags ?? []).includes(tag.name)
                return (
                  <button key={tag.name} data-tip={tag.description} onClick={() => toggleTag(tag.name)}
                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors border ${active ? 'bg-amber-600/30 border-amber-500 text-amber-300' : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-stone-400'}`}>
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <div className="flex gap-1 pt-0.5">
          <input type="text" value={customTag} onChange={e => setCustomTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomTag()}
            placeholder="Custom tag…" className="flex-1 bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500" />
          <button onClick={addCustomTag} className="px-2 py-0.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-300 rounded transition-colors">+</button>
        </div>
        {(form.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {(form.tags ?? []).map(t => (
              <span key={t} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-600/20 border border-amber-600/40 text-amber-300 text-[10px]">
                {t}
                <button onClick={() => set({ tags: (form.tags ?? []).filter(x => x !== t) })} className="text-amber-500 hover:text-red-400 ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <ModalPortal onClose={onClose}>
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-stone-900 border border-stone-600 rounded-xl w-[480px] shadow-2xl flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${kindBadge[form.kind]}`}>{form.kind}</span>
            <span className="text-sm font-semibold text-stone-100">{form.name || 'New Item'}</span>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-sm">✕</button>
        </div>

        <div className="px-4 py-3 space-y-2.5 overflow-y-auto no-scrollbar flex-1">
          {/* Kind selector */}
          <div className={row}>
            <span className={lbl}>Kind</span>
            <div className="flex gap-1">
              {(['weapon', 'armor', 'other'] as InventoryItemKind[]).map(k => (
                <button key={k} onClick={() => set({ kind: k })}
                  className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${form.kind === k ? 'bg-amber-600 text-stone-950' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-0.5">
            <span className={lbl}>Name</span>
            <input autoFocus type="text" value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Item name…" className={nf} />
          </div>

          {/* Weapon fields */}
          {form.kind === 'weapon' && <>
            {/* Weight — buttons from gameData */}
            <div className="space-y-1">
              <span className={lbl}>Weight</span>
              <div className="flex flex-wrap gap-1">
                {gameData.weapons.map(w => (
                  <button key={w.category} onClick={() => selectWeightRow(w.category)}
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${form.weight === w.category ? 'bg-amber-600 text-stone-950' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                    {w.category}
                  </button>
                ))}
              </div>
            </div>

            {/* Combat Type + Artifact inline */}
            <div className="space-y-1">
              <div className={row}>
                <span className={lbl}>Combat Type</span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {(['melee', 'ranged'] as const).map(ct => (
                      <button key={ct} onClick={() => selectCombatType(ct)}
                        className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${weaponCombatType === ct ? 'bg-amber-600 text-stone-950' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                        {ct}
                      </button>
                    ))}
                  </div>
                  <button onClick={toggleArtifact} data-tip="Artifact (+1 to all stats)"
                    className={`px-2 py-0.5 rounded text-xs transition-colors border ${form.artifact ? 'bg-amber-600/30 border-amber-500 text-amber-300' : 'bg-stone-700 border-stone-600 text-stone-400 hover:border-stone-400'}`}>
                    Artifact
                  </button>
                  {form.artifact && ARTIFACT_COLORS.map(c => (
                    <button key={c.value} data-tip={c.label} aria-label={c.label} onClick={() => set({ artifactColor: c.value })}
                      className={`w-4 h-4 rounded-full ${c.bg} transition-all ${form.artifactColor === c.value ? `ring-2 ${c.ring} ring-offset-1 ring-offset-stone-900` : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-2">
              {([['accuracy', 'Accuracy'], ['damage', 'Damage'], ['defense', 'Defense'], ['overwhelming', 'Overwhlm.']] as const).map(([k, label]) => (
                <div key={k} className={row}>
                  <span className={lbl}>{label}</span>
                  <input type="number" value={form[k] ?? 0} onChange={e => set({ [k]: parseInt(e.target.value) || 0 })} className={nfNum} />
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <span className={lbl}>Tags</span>
              {renderTagPicker()}
            </div>
          </>}

          {/* Armor fields */}
          {form.kind === 'armor' && <>
            {/* Category + Artifact inline */}
            <div className="space-y-1">
              <div className={row}>
                <span className={lbl}>Category</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-wrap gap-1">
                    {gameData.armor.map(a => (
                      <button key={a.category} onClick={() => selectArmorRow(a.category)}
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${form.type === a.category ? 'bg-amber-600 text-stone-950' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                        {a.category}
                      </button>
                    ))}
                  </div>
                  <button onClick={toggleArtifact} data-tip="Artifact (+1 Soak & Hardness)"
                    className={`px-2 py-0.5 rounded text-xs transition-colors border ${form.artifact ? 'bg-amber-600/30 border-amber-500 text-amber-300' : 'bg-stone-700 border-stone-600 text-stone-400 hover:border-stone-400'}`}>
                    Artifact
                  </button>
                  {form.artifact && ARTIFACT_COLORS.map(c => (
                    <button key={c.value} data-tip={c.label} aria-label={c.label} onClick={() => set({ artifactColor: c.value })}
                      className={`w-4 h-4 rounded-full ${c.bg} transition-all ${form.artifactColor === c.value ? `ring-2 ${c.ring} ring-offset-1 ring-offset-stone-900` : 'opacity-60 hover:opacity-100'}`} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {([['soak', 'Soak'], ['mobilityPen', 'Mobility Pen'], ['hardness', 'Hardness']] as const).map(([k, label]) => (
                <div key={k} className={row}>
                  <span className={lbl}>{label}</span>
                  <input type="number" value={form[k] ?? 0} onChange={e => set({ [k]: parseInt(e.target.value) || 0 })} className={nfNum} />
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <span className={lbl}>Tags</span>
              {renderTagPicker()}
            </div>
          </>}

          {/* Other fields */}
          {form.kind === 'other' && <>
            <div className="space-y-0.5">
              <span className={lbl}>Type</span>
              <input type="text" value={form.type} onChange={e => set({ type: e.target.value })} placeholder="e.g. Tool, Artifact…" className={nf} />
            </div>
            <div className="space-y-0.5">
              <span className={lbl}>Notes</span>
              <textarea value={form.notes ?? ''} onChange={e => set({ notes: e.target.value })} rows={3} placeholder="Description…" className={`${nf} resize-none`} />
            </div>
          </>}

          {/* Equipped */}
          <div className={row}>
            <span className={lbl}>Equipped</span>
            <button onClick={() => set({ equipped: !form.equipped })}
              className={`w-8 h-4 rounded-full transition-colors relative ${form.equipped ? 'bg-amber-500' : 'bg-stone-600'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${form.equipped ? 'left-4' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-stone-700 shrink-0">
          <button onClick={onClose} className="px-3 py-1 text-xs text-stone-400 hover:text-stone-200 transition-colors">Cancel</button>
          <button onClick={() => { if (form.name.trim()) onSave(form) }}
            className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-stone-950 rounded transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

const INVENTORY_KINDS: { kind: InventoryItemKind; label: string }[] = [
  { kind: 'weapon', label: 'Weapons' },
  { kind: 'armor',  label: 'Armor' },
  { kind: 'other',  label: 'Other' },
]

function FoiModal({ current, foiWeights, foiTags, onSave, onClose }: {
  current: FoiState
  foiWeights: import('../types/character').WeaponTableRow[]
  foiTags: import('../types/character').TagEntry[]
  onSave: (s: FoiState) => void
  onClose: () => void
}) {
  const [active, setActive] = useState(current.active)
  const [weight, setWeight] = useState<string | null>(current.weight)
  const [tag, setTag] = useState<string | null>(current.tag)
  const [artifact, setArtifact] = useState(current.artifact)
  const canSave = !active || (!!weight && !!tag)

  return (
    <ModalPortal onClose={onClose}>
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-stone-900 border border-orange-700/60 rounded-xl w-[420px] shadow-2xl flex flex-col max-h-full" onClick={e => e.stopPropagation()}>
        {/* Header with toggle */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-orange-300">Fists of Iron Technique</p>
            <button onClick={() => setActive(v => !v)}
              className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${active ? 'bg-orange-500' : 'bg-stone-600'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-4' : 'left-0.5'}`} />
            </button>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-sm">✕</button>
        </div>

        <div className="px-4 py-3 space-y-3 overflow-y-auto no-scrollbar flex-1">
          {/* Weight */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-stone-400">Count as</p>
            <div className="flex flex-wrap gap-1 items-center">
              {foiWeights.map(w => (
                <button key={w.category} onClick={() => setWeight(w.category)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${weight === w.category ? 'bg-orange-600 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                  {w.category}
                </button>
              ))}
              <div className="w-px h-3 bg-stone-700 mx-0.5" />
              <button onClick={() => setArtifact(a => !a)}
                data-tip="Grant unarmed attacks the Artifact tag (+1 all stats)"
                className={`px-2 py-0.5 rounded text-xs transition-colors border ${artifact ? 'bg-amber-600/30 border-amber-500 text-amber-300' : 'bg-stone-700 border-stone-600 text-stone-400 hover:border-amber-500'}`}>
                Artifact
              </button>
            </div>
          </div>

          {/* Tag — single select */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-stone-400">Tag</p>
            <div className="flex flex-wrap gap-1">
              {foiTags.map(t => (
                <button key={t.name} data-tip={t.description} onClick={() => setTag(tag === t.name ? null : t.name)}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-colors border ${tag === t.name ? 'bg-orange-600/30 border-orange-500 text-orange-300' : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-orange-400'}`}>
                  {t.name}
                </button>
              ))}
            </div>
            {tag && (() => { const entry = foiTags.find(t => t.name === tag); return entry ? (
              <p className="text-[10px] text-stone-400 leading-relaxed pt-0.5">{entry.description}</p>
            ) : null })()}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-stone-700 shrink-0">
          <button onClick={onClose} className="px-3 py-1 text-xs text-stone-400 hover:text-stone-200 transition-colors">Cancel</button>
          <button onClick={() => canSave && onSave({ active, weight, tag, artifact })} disabled={!canSave}
            className={`px-3 py-1 text-xs rounded transition-colors ${canSave ? 'bg-amber-600 hover:bg-amber-500 text-stone-950' : 'bg-stone-700 text-stone-500 cursor-not-allowed'}`}>
            Save
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  )
}

function InventoryPanel({ items, onChange, foi, foiOriginals, onFoiChange, dragEnabled, gameData, charms }: {
  items: InventoryItem[]
  onChange: (items: InventoryItem[]) => void
  foi: FoiState
  foiOriginals: Record<string, Partial<InventoryItem>>
  onFoiChange: (foi: FoiState, originals: Record<string, Partial<InventoryItem>>, items: InventoryItem[]) => void
  dragEnabled: boolean
  gameData: GameData
  charms: CharacterCharm[]
}) {
  const [modal, setModal] = useState<Partial<InventoryItem> & { kind: InventoryItemKind } | null>(null)
  const [foiModalOpen, setFoiModalOpen] = useState(false)
  const [dropBeforeId, setDropBeforeId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const dragging = useRef<string | null>(null)
  const migrationDone = useRef(false)

  function computeWeaponStats(item: InventoryItem): Partial<InventoryItem> {
    const row = gameData.weapons.find(w => w.category === item.weight)
    if (!row) return {}
    const a = item.artifact ? 1 : 0
    const tags = Array.isArray(item.tags) ? item.tags : []
    let ac = row.accuracy + a
    let da = row.damage + a
    let de = row.defense + a
    let ov = row.overwhelming + a
    if (tags.includes('Shield'))     da = Math.max(0, da - 1)
    if (tags.includes('Balanced'))   ov += 1
    if (tags.includes('Improvised')) ac = Math.max(0, ac - 2)
    if (tags.includes('Defensive'))  de += 1
    return { accuracy: Math.max(0, ac), damage: Math.max(0, da), defense: Math.max(0, de), overwhelming: Math.max(0, ov) }
  }

  function computeArmorStats(item: InventoryItem): Partial<InventoryItem> {
    const row = gameData.armor.find(r => r.category === item.type)
    if (!row) return {}
    const a = item.artifact ? 1 : 0
    return { soak: row.soak + a, mobilityPen: row.mobilityPenalty, hardness: Math.max(0, row.hardness + a) }
  }

  // On first load, recompute all weapon/armor stats from source of truth (table + artifact + tags).
  // This ensures items are always correct regardless of when they were saved.
  useEffect(() => {
    if (migrationDone.current || items.length === 0) return
    migrationDone.current = true
    let anyChanged = false
    const next = items.map(item => {
      // Skip unarmed weapons when FoI is active — FoI has intentionally modified their stats
      if (item.kind === 'weapon' && item.weight === 'Unarmed' && foi.active) return item
      if (item.kind === 'weapon' && item.weight) {
        const computed = computeWeaponStats(item)
        if (Object.entries(computed).some(([k, v]) => item[k as keyof InventoryItem] !== v)) {
          anyChanged = true
          return { ...item, ...computed }
        }
      }
      if (item.kind === 'armor' && item.type) {
        const computed = computeArmorStats(item)
        if (Object.entries(computed).some(([k, v]) => item[k as keyof InventoryItem] !== v)) {
          anyChanged = true
          return { ...item, ...computed }
        }
      }
      return item
    })
    if (anyChanged) onChange(next)
    // migrationDone gates this to a single run on the first non-empty items, so the
    // other values it closes over are read once, at that moment, and can't go stale.
    // Listing them would only re-arm an effect that refuses to run twice anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  const weightBadgeCls: Record<string, string> = {
    L: 'bg-blue-600 text-white',
    M: 'bg-green-600 text-white',
    H: 'bg-yellow-500 text-stone-900',
  }
  const artifactRowCls: Record<ArtifactColor, string> = {
    red:    'bg-red-900/15',
    green:  'bg-green-900/15',
    blue:   'bg-blue-900/15',
    white:  'bg-stone-600/15',
    silver: 'bg-slate-700/15',
    gold:   'bg-amber-900/15',
  }
  const artifactTextCls: Record<ArtifactColor, string> = {
    red:    'text-red-400',
    green:  'text-green-400',
    blue:   'text-blue-400',
    white:  'text-white',
    silver: 'text-slate-300',
    gold:   'text-amber-400',
  }

  // All tags available for FoI: Universal + Melee, excluding Artifact
  const foiTags = gameData.tagGroups
    .filter(g => { const n = g.group.toLowerCase(); return n.includes('universal') || n.includes('melee') })
    .flatMap(g => g.tags)
    .filter(t => t.name !== 'Artifact')

  // Weights available for FoI override: everything except Unarmed
  const foiWeights = gameData.weapons.filter(w => w.category !== 'Unarmed')

  function applyFoi(newFoi: FoiState) {
    // Restore originals to get a clean base (in case FoI was already active)
    const base = foi.active
      ? items.map(i => foiOriginals[i.id] ? { ...i, ...foiOriginals[i.id] } : i)
      : items

    // Save originals on first activation only
    const newOriginals: Record<string, Partial<InventoryItem>> = foi.active
      ? foiOriginals
      : Object.fromEntries(
          base.filter(i => i.kind === 'weapon' && i.weight === 'Unarmed').map(i => [
            i.id,
            { accuracy: i.accuracy, damage: i.damage, defense: i.defense, overwhelming: i.overwhelming, tags: [...(i.tags ?? [])] }
          ])
        )

    const weightRow = newFoi.weight ? gameData.weapons.find(w => w.category === newFoi.weight) : null

    const newItems = base.map(i => {
      if (i.kind !== 'weapon' || i.weight !== 'Unarmed') return i
      const art = i.artifact ? 1 : 0
      const foiArt = newFoi.artifact ? 1 : 0
      let acc = weightRow ? weightRow.accuracy + art + foiArt : (i.accuracy ?? 0) + foiArt
      let dmg = weightRow ? weightRow.damage + art + foiArt : (i.damage ?? 0) + foiArt
      let def = weightRow ? weightRow.defense + art + foiArt : (i.defense ?? 0) + foiArt
      let ovw = weightRow ? weightRow.overwhelming + art + foiArt : (i.overwhelming ?? 0) + foiArt
      // Remove old FoI tag and old FoI artifact tag before re-applying
      const baseTags = (i.tags ?? []).filter(t => t !== foi.tag && !(foi.artifact && t === 'Artifact'))
      let newTags = newFoi.tag ? [...baseTags, newFoi.tag] : baseTags
      if (newFoi.artifact) newTags = [...newTags, 'Artifact']
      if (newFoi.tag === 'Shield')     dmg = Math.max(0, dmg - 1)
      if (newFoi.tag === 'Balanced')   ovw += 1
      if (newFoi.tag === 'Improvised') acc = Math.max(0, acc - 2)
      if (newFoi.tag === 'Defensive')  def += 1
      return { ...i, accuracy: Math.max(0, acc), damage: Math.max(0, dmg), defense: Math.max(0, def), overwhelming: Math.max(0, ovw), tags: newTags }
    })

    onFoiChange(newFoi, newOriginals, newItems)
  }

  function deactivateFoi() {
    const restored = items.map(i => foiOriginals[i.id] ? { ...i, ...foiOriginals[i.id] } : i)
    onFoiChange({ active: false, weight: null, tag: null, artifact: false }, {}, restored)
  }

  function saveItem(item: InventoryItem) {
    // _tagsApplied is a vestigial key from an older version — nothing writes it now,
    // but strip it so any item still carrying one from a previously saved sheet
    // doesn't keep round-tripping it back into Supabase.
    let final: InventoryItem & { _tagsApplied?: boolean } = { ...item }
    delete final._tagsApplied
    if (item.kind === 'weapon' && item.weight) {
      final = { ...final, ...computeWeaponStats(item) }
    } else if (item.kind === 'armor' && item.type) {
      final = { ...final, ...computeArmorStats(item) }
    }
    const exists = items.some(i => i.id === final.id)
    onChange(exists ? items.map(i => i.id === final.id ? final : i) : [...items, final])
    setModal(null)
  }
  function removeItem(id: string) {
    const newItems = items.filter(i => i.id !== id)
    const stillHasUnarmed = newItems.some(i => i.kind === 'weapon' && i.weight === 'Unarmed')
    if (foi.active && !stillHasUnarmed) {
      onFoiChange({ active: false, weight: null, tag: null, artifact: false }, {}, newItems)
    } else {
      onChange(newItems)
    }
  }
  function toggleEquipped(id: string) {
    const target = items.find(i => i.id === id)
    if (!target) return
    const equipping = !target.equipped
    onChange(items.map(i => {
      if (i.id === id) return { ...i, equipped: equipping }
      if (equipping && i.kind === 'armor' && target.kind === 'armor') return { ...i, equipped: false }
      return i
    }))
  }

  function onDragStart(e: React.DragEvent, id: string) { dragging.current = id; e.dataTransfer.effectAllowed = 'move' }
  function onDragOver(e: React.DragEvent, beforeId: string) { if (!dragging.current || dragging.current === beforeId) return; e.preventDefault(); e.stopPropagation(); setDropBeforeId(beforeId) }
  function onDrop(e: React.DragEvent, kind: InventoryItemKind, beforeId?: string) {
    e.preventDefault(); e.stopPropagation()
    const id = dragging.current; if (!id) return
    const item = items.find(i => i.id === id); if (!item || item.kind !== kind) return
    const rest = items.filter(i => i.id !== id)
    const idx = beforeId ? rest.findIndex(i => i.id === beforeId) : rest.filter(i => i.kind === kind).length + rest.findIndex(i => i.kind !== kind && items.indexOf(i) > items.indexOf(item))
    const insertAt = beforeId ? (idx < 0 ? rest.length : idx) : rest.length
    rest.splice(insertAt, 0, item)
    onChange(rest)
    dragging.current = null; setDropBeforeId(null)
  }
  function onDragEnd() { dragging.current = null; setDropBeforeId(null) }

  const artifactCheckboxCls: Record<ArtifactColor, string> = {
    red:    'bg-red-500 border-red-500',
    green:  'bg-green-500 border-green-500',
    blue:   'bg-blue-500 border-blue-500',
    white:  'bg-white border-white',
    silver: 'bg-slate-300 border-slate-300',
    gold:   'bg-amber-400 border-amber-400',
  }

  return (
    <>
      {modal && <ItemModal item={modal} onSave={saveItem} onClose={() => setModal(null)} gameData={gameData} />}
      {foiModalOpen && (
        <FoiModal
          current={foi}
          foiWeights={foiWeights}
          foiTags={foiTags}
          onSave={s => { if (s.active) applyFoi(s); else deactivateFoi(); setFoiModalOpen(false) }}
          onClose={() => setFoiModalOpen(false)}
        />
      )}
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <SectionHeader title="Inventory" />
          <button onClick={() => setModal({ kind: 'weapon' })} data-tip="Add item" aria-label="Add item" className="text-stone-500 hover:text-amber-400 transition-colors text-base font-bold leading-none">+</button>
        </div>
        <div className="space-y-2 overflow-y-auto no-scrollbar flex-1">
          {INVENTORY_KINDS.map(({ kind, label }) => {
            const kindItems = items.filter(i => i.kind === kind)
            return (
              <div key={kind}
                onDragOver={e => { if (dragging.current) { e.preventDefault(); } }}
                onDrop={e => onDrop(e, kind)}
                className="rounded border border-stone-700/50"
              >
                <div className="flex items-center justify-between px-1.5 py-1">
                  <span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">{label}</span>
                  <div className="flex items-center gap-1.5">
                    {kind === 'weapon' && (() => {
                      const foiCharm = charms.find(c => activeKey(c) === 'foi')
                      if (!foiCharm) return null
                      const hasUnarmed = kindItems.some(i => i.weight === 'Unarmed')
                      return (
                        <button
                          onClick={() => hasUnarmed && setFoiModalOpen(true)}
                          data-tip={hasUnarmed ? 'Fists of Iron Technique' : 'You need an unarmed weapon'}
                          className={`text-[9px] px-1 py-0.5 rounded border transition-colors ${foi.active ? 'bg-orange-600/30 border-orange-500 text-orange-300' : hasUnarmed ? 'border-stone-600 text-stone-500 hover:border-orange-500 hover:text-orange-400' : 'border-stone-700 text-stone-700 cursor-not-allowed'}`}>
                          FoI
                        </button>
                      )
                    })()}
                    <span className="text-[9px] text-stone-600">{kindItems.length}</span>
                  </div>
                </div>
                <div>
                  {kindItems.length === 0 && <p className="text-xs text-stone-600 px-1.5 pb-1">None.</p>}
                  {kindItems.map(item => {
                    const isUnarmed = item.kind === 'weapon' && item.weight === 'Unarmed'
                    const foiTagEntry = foi.active && foi.tag ? foiTags.find(t => t.name === foi.tag) : null
                    const isExpanded = expanded[item.id] ?? false
                    const wLetter = foi.weight?.[0]?.toUpperCase() ?? ''
                    const wBadge = weightBadgeCls[wLetter] ?? 'bg-stone-600 text-stone-100'
                    const rowArtifactBg = item.artifact && item.artifactColor ? artifactRowCls[item.artifactColor] : ''
                    const nameTextCls = item.artifact && item.artifactColor ? artifactTextCls[item.artifactColor] : 'text-stone-200'
                    return (
                      <div key={item.id}
                        draggable={dragEnabled}
                        onDragStart={e => dragEnabled && onDragStart(e, item.id)}
                        onDragOver={e => dragEnabled && onDragOver(e, item.id)}
                        onDrop={e => onDrop(e, kind, item.id)}
                        onDragEnd={onDragEnd}
                        className={`border-t border-stone-800 transition-colors ${dropBeforeId === item.id ? 'border-t-amber-400' : ''} ${rowArtifactBg}`}
                      >
                        {/* Main row */}
                        <div className={`px-1.5 py-1 flex items-center gap-1.5 ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                          <button onClick={() => toggleEquipped(item.id)}
                            className={`w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center transition-colors ${item.equipped ? (item.artifact && item.artifactColor ? artifactCheckboxCls[item.artifactColor] : 'bg-amber-500 border-amber-500') : 'border-stone-500 hover:border-amber-500'}`}>
                            {item.equipped && <span className="text-[8px] text-stone-950 font-bold">✓</span>}
                          </button>
                          <button
                            onClick={() => item.kind === 'other'
                              ? setExpanded(e => ({ ...e, [item.id]: !e[item.id] }))
                              : setModal(item)}
                            className={`text-xs hover:brightness-125 transition-all flex-1 min-w-0 truncate text-left rounded px-0.5 ${nameTextCls}`}>
                            {item.kind === 'other' && <span className="mr-0.5 text-stone-500">{isExpanded ? '▾' : '▸'}</span>}
                            {item.name}
                          </button>

                          {/* FoI active: tag chip + weight badge — shown before stats so numbers stay in the same column */}
                          {isUnarmed && foi.active && foiTagEntry && (
                            <span data-tip={foiTagEntry.description}
                              className="text-[9px] px-1 py-0.5 rounded bg-orange-900/40 border border-orange-600/50 text-orange-300 cursor-help shrink-0">
                              {foiTagEntry.name}
                            </span>
                          )}
                          {isUnarmed && foi.active && foi.weight && (
                            <span className={`text-[9px] w-4 h-4 rounded flex items-center justify-center font-bold shrink-0 ${wBadge}`}>
                              {wLetter}
                            </span>
                          )}

                          {/* Weapon stats */}
                          {item.kind === 'weapon' && (
                            <span className="text-[9px] shrink-0 flex gap-1.5">
                              {([['Ac', item.accuracy], ['Da', item.damage], ['De', item.defense], ['Ov', item.overwhelming]] as [string, number|undefined][]).map(([l, v]) => (
                                <span key={l}><span className="text-stone-500">{l} </span><span className="text-stone-300">{v ?? 0}</span></span>
                              ))}
                            </span>
                          )}

                          {/* Armor stats */}
                          {item.kind === 'armor' && (
                            <span className="text-[9px] shrink-0 flex gap-1.5">
                              {([['So', item.soak], ['MP', item.mobilityPen], ['Ha', item.hardness]] as [string, number|undefined][]).map(([l, v]) => (
                                <span key={l}><span className="text-stone-500">{l} </span><span className="text-stone-300">{v ?? 0}</span></span>
                              ))}
                            </span>
                          )}

                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => setModal(item)} data-tip="Edit" aria-label="Edit" className="text-stone-500 hover:text-amber-400 transition-colors text-xs">✎</button>
                            <button onClick={() => removeItem(item.id)} data-tip="Delete" aria-label="Delete" className="text-stone-500 hover:text-red-400 transition-colors text-xs">✕</button>
                          </div>
                        </div>

                        {/* Other: expanded notes */}
                        {item.kind === 'other' && isExpanded && (
                          <div className="px-3 pb-2 space-y-0.5">
                            {item.type && <p className="text-[9px] uppercase tracking-wider text-stone-500">{item.type}</p>}
                            <p className="text-xs text-stone-400 leading-relaxed whitespace-pre-wrap">{item.notes || '—'}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

const numInput = "w-[30px] text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-amber-500"

const counterBtnCls = "w-5 h-5 flex items-center justify-center rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700 transition-colors text-sm font-bold shrink-0"

// Header for a section inside the Essence panel — one step down from SectionHeader,
// which titles a whole panel.
// One row of a Defenses tooltip: where part of the number comes from.
interface BreakdownLine {
  label: string
  value: number
  /** Show as a modifier ("+2") rather than a plain number ("4"). */
  signed?: boolean
  /** Contributes nothing right now — shown dimmed rather than hidden, so it's clear it exists. */
  muted?: boolean
  detail?: string
}

// The hover card for a defence: a receipt that adds up to the number on the sheet.
function DefenseBreakdown({ title, total, lines }: { title: string; total: number; lines: BreakdownLine[] }) {
  const fmt = (l: BreakdownLine) => l.signed ? (l.value < 0 ? `−${-l.value}` : `+${l.value}`) : `${l.value}`
  // The only way the lines fail to add up is the Dice Limit floor lifting a
  // penalised value back to its minimum, so a gap is always that.
  const floored = lines.reduce((sum, l) => sum + l.value, 0) !== total
  return (
    <div className="w-60">
      <div className="flex items-baseline justify-between pb-1.5 mb-1.5 border-b border-stone-700">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">{title}</span>
        <span className="text-lg font-bold leading-none text-stone-50">{total}</span>
      </div>
      <div className="space-y-1">
        {lines.map(l => (
          <div key={l.label} className={l.muted ? 'opacity-45' : undefined}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-stone-200">{l.label}</span>
              <span className="font-semibold tabular-nums text-stone-100">{fmt(l)}</span>
            </div>
            {l.detail && <div className="text-[10px] leading-tight text-stone-400">{l.detail}</div>}
          </div>
        ))}
      </div>
      {floored && (
        <div className="mt-1.5 pt-1.5 border-t border-stone-700 text-[10px] text-amber-300/80">
          Raised to the minimum of 1
        </div>
      )}
    </div>
  )
}

function SubHeader({ title, right, onReset }: { title: string; right?: React.ReactNode; onReset?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-1 mb-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 truncate">{title}</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {right}
        {onReset && (
          <button onClick={onReset} data-tip="Reset" aria-label="Reset"
            className="text-xs leading-none text-stone-600 hover:text-amber-400 transition-colors">↺</button>
        )}
      </div>
    </div>
  )
}

function Counter({ value, onStep, size = 'lg', valueCls = 'text-stone-100' }: {
  value: number
  onStep: (delta: number) => void
  size?: 'sm' | 'lg'
  valueCls?: string
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button onClick={() => onStep(-1)} className={counterBtnCls}>−</button>
      <span className={`font-bold text-center tabular-nums ${size === 'lg' ? 'text-3xl w-9' : 'text-xl w-8'} ${valueCls}`}>{value}</span>
      <button onClick={() => onStep(+1)} className={counterBtnCls}>+</button>
    </div>
  )
}

export default function SheetTab({ sheet, onChange, editMode, readOnly = false, gameData: gd, milestones, trainingDone, onLedgerChange, onTrainingDone }: Props) {
  const gameData = gd ?? DEFAULT_GAME_DATA
  const dragEnabled = !editMode && !readOnly
  const def = defaultSheet()
  const data: SheetData = {
    attributes: { ...def.attributes, ...sheet.attributes },
    abilities: { ...def.abilities, ...sheet.abilities },
    defenses: { ...def.defenses, ...sheet.defenses },
    essence: sheet.essence ?? 1,
    anima: sheet.anima ?? 0,
    power: sheet.power ?? 0,
    will: sheet.will ?? 0,
    defenseBonus: { ...def.defenseBonus, ...sheet.defenseBonus },
    languages: sheet.languages ?? [],
    merits: sheet.merits ?? [],
    intimacies: sheet.intimacies ?? [],
    motes: { ...def.motes, ...sheet.motes },
    damage: sheet.damage ?? legacyDamage(sheet.health),
    layout: (() => {
      const saved = sheet.layout?.length ? sheet.layout.map(l => ({ ...l })) : DEFAULT_LAYOUT.map(l => ({ ...l }))
      const known = new Set(DEFAULT_LAYOUT.map(l => l.i))
      const base = saved.filter(l => known.has(l.i))
      const essence = base.find(l => l.i === 'essence')

      // Two older shapes of this panel need resizing to ESSENCE_H, and both then need
      // the rest of the column reflowed so nothing overlaps or leaves a hole:
      //   1. Motes and Anima as their own panels, from before they were folded in.
      //   2. An Essence box still at the height that fold assigned, from before
      //      Identity moved out to the page header.
      // Only the machine-assigned LEGACY_ESSENCE_H is touched — any other height is
      // one the player chose, so it is left alone.
      const legacy = [saved.find(l => l.i === 'motes'), saved.find(l => l.i === 'anima')]
        .filter((l): l is PanelLayout => !!l)
      if (essence && (legacy.length > 0 || essence.h === LEGACY_ESSENCE_H)) {
        const oldBottom = Math.max(essence.y + essence.h, ...legacy.map(l => l.y + l.h))
        if (legacy.length > 0) essence.w = Math.max(essence.w, ...legacy.map(l => l.w))
        essence.h = ESSENCE_H
        const delta = (essence.y + essence.h) - oldBottom
        if (delta !== 0) {
          for (const l of base) {
            const sharesColumn = l.x < essence.x + essence.w && essence.x < l.x + l.w
            if (l.i !== 'essence' && sharesColumn && l.y >= oldBottom) l.y = Math.max(0, l.y + delta)
          }
        }
      }

      const existingIds = new Set(base.map(l => l.i))
      const missing = DEFAULT_LAYOUT.filter(l => !existingIds.has(l.i))
      return [...base, ...missing]
    })(),
    charms: sheet.charms ?? [],
    charmGroups: sheet.charmGroups ?? [],
    effects: sheet.effects ?? [],
    inventory: sheet.inventory ?? [],
    defenseOther: sheet.defenseOther ?? false,
    fullDefense: sheet.fullDefense ?? false,
    foi: sheet.foi ?? { active: false, weight: null, tag: null, artifact: false },
    foiOriginals: sheet.foiOriginals ?? {},
    exaltType: sheet.exaltType ?? '',
    caste: sheet.caste ?? '',
  }

  const [newLanguage, setNewLanguage] = useState('')
  const [newMeritType, setNewMeritType] = useState<MeritEntry['type']>('Primary')
  const [newMeritName, setNewMeritName] = useState('')
  const [newIntensity, setNewIntensity] = useState<IntimacyEntry['intensity']>('Minor')
  const [newIntimacyDesc, setNewIntimacyDesc] = useState('')

  // Edit state
  const [editingMeritId, setEditingMeritId] = useState<string | null>(null)
  const [editMeritType, setEditMeritType] = useState<MeritEntry['type']>('Primary')
  const [editMeritName, setEditMeritName] = useState('')
  const [editingLangIdx, setEditingLangIdx] = useState<number | null>(null)
  const [editLangValue, setEditLangValue] = useState('')
  const [editingIntimacyId, setEditingIntimacyId] = useState<string | null>(null)
  const [editIntimacyIntensity, setEditIntimacyIntensity] = useState<IntimacyEntry['intensity']>('Minor')
  const [editIntimacyDesc, setEditIntimacyDesc] = useState('')

  // The charm library: the Charms panel's cards and browser, and each charm's live
  // mechanical key and settings (commit dots, in-use icon, purchase limit).
  const [library, setLibrary] = useState<LibraryCharm[]>(() => cachedCharmLibrary() ?? [])
  const [libraryLoaded, setLibraryLoaded] = useState(() => cachedCharmLibrary() !== null)
  useEffect(() => {
    loadCharmLibrary().then(charms => {
      setLibrary(charms)
      setLibraryLoaded(true)
    })
  }, [])
  const libById = new Map(library.map(l => [l.id, l]))

  function update(partial: Partial<SheetData>) { onChange(partial) }
  function setAttr(name: string, value: number) { update({ attributes: { ...data.attributes, [name]: value } }) }
  function setAbility(name: string, patch: Partial<AbilityData>) {
    update({ abilities: { ...data.abilities, [name]: { ...(data.abilities[name] ?? defaultAbility), ...patch } } })
  }

  function addLanguage() {
    if (!newLanguage.trim()) return
    update({ languages: [...data.languages, newLanguage.trim()] })
    setNewLanguage('')
  }
  function removeLanguage(i: number) { update({ languages: data.languages.filter((_, idx) => idx !== i) }) }
  function saveLang() {
    if (editingLangIdx === null || !editLangValue.trim()) return
    update({ languages: data.languages.map((l, i) => i === editingLangIdx ? editLangValue.trim() : l) })
    setEditingLangIdx(null)
  }
  function addMerit() {
    if (!newMeritName.trim()) return
    update({ merits: [...data.merits, { id: crypto.randomUUID(), type: newMeritType, name: newMeritName.trim() }] })
    setNewMeritName('')
  }
  function removeMerit(id: string) { update({ merits: data.merits.filter(m => m.id !== id) }) }
  function saveMerit() {
    if (!editingMeritId || !editMeritName.trim()) return
    update({ merits: data.merits.map(m => m.id === editingMeritId ? { ...m, type: editMeritType, name: editMeritName.trim() } : m) })
    setEditingMeritId(null)
  }
  function addIntimacy() {
    if (!newIntimacyDesc.trim()) return
    update({ intimacies: [...data.intimacies, { id: crypto.randomUUID(), intensity: newIntensity, description: newIntimacyDesc.trim() }] })
    setNewIntimacyDesc('')
  }
  function removeIntimacy(id: string) { update({ intimacies: data.intimacies.filter(i => i.id !== id) }) }
  function saveIntimacy() {
    if (!editingIntimacyId || !editIntimacyDesc.trim()) return
    update({ intimacies: data.intimacies.map(i => i.id === editingIntimacyId ? { ...i, intensity: editIntimacyIntensity, description: editIntimacyDesc.trim() } : i) })
    setEditingIntimacyId(null)
  }
  // What is still in training shows on the sheet but counts for nothing: every
  // calculation below reads these instead of the raw charms and ratings.
  const charmTraining = trainingByCharm(milestones, trainingDone)
  const traitsInTraining = traitTraining(milestones, trainingDone)
  // Mechanical keys are read live from the library, so a charm bought before its
  // key was set still works (charmKey); every effect below uses these.
  const liveCharms = data.charms.map(c => {
    const key = charmKey(c, libById.get(c.libraryId))
    return key !== activeKey(c) && c.mechanicalKeyOverride === null ? { ...c, libraryMechanicalKey: key } : c
  })
  const effectCharms = charmsInEffect(liveCharms, charmTraining)
  const calcAttributes = trainedAttributes(data.attributes, traitsInTraining)
  const calcAbilities = trainedAbilities(data.abilities, traitsInTraining)
  const trainingInput = (n: number | undefined) => n ? ' !border-dashed !border-amber-600' : ''

  // The track is rebuilt from Ox Body on every render, so it can't drift from the charm.
  // Charms change the track, the wound penalty and the Defenses in that order: the
  // penalty depends on the track, and Endurance of a Thousand Cuts on the penalty.
  const effectCtx: ModeContext = { exaltType: data.exaltType, caste: data.caste, essence: data.essence ?? 1, abilities: calcAbilities }
  const oxBody = findOxBody(effectCharms)
  const healthTrack = buildHealthTrack(data.exaltType, data.caste, oxBody ? (oxBody.count ?? 1) : 0, oxBody?.oxBodyPicks ?? [],
    charmHealthLevels(effectCharms, libById, effectCtx))
  const damage = clampDamage(data.damage, healthTrack.length)
  const wound = woundPenaltyAfterCharms(woundPenalty(healthTrack, damage), effectCharms, libById, effectCtx)
  const charmLines = charmStatLines(effectCharms, libById, {
    ...effectCtx, woundPenalty: wound.penalty, defendOther: data.defenseOther,
    armorEquipped: data.inventory.some(i => i.kind === 'armor' && i.equipped),
  })
  const defenseAbility = defenseAbilities(effectCharms, libById, effectCtx, calcAbilities)
  const unbreakableIntimacies = protectedIntimacies(effectCharms, libById)
  const setDamage = (n: number) => update({ damage: clampDamage(n, healthTrack.length) })

  const panelBase = "bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-y-auto no-scrollbar h-full"

  // The Charms panel is always exactly as tall as its content and never scrolls;
  // panels below it in the same columns move with it.
  function fitCharmsPanel(contentPx: number) {
    const h = rowsToFit(contentPx, CHARMS_CHROME_PX, CHARMS_MIN_ROWS)
    const next = fitPanelHeight(data.layout, 'charms', h)
    if (next !== data.layout) update({ layout: next })
  }

  // Measure the grid container's exact pixel width so GridLayout snap points line up.
  // Measured before the grid mounts, so panels open at their real width instead of
  // animating from a default one (which made the Charms panel resize as it opened).
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true })
  const stacked = width < STACK_BELOW_PX

  const panels: Record<string, React.ReactNode> = {
    attributes: (
      <div className={panelBase}>
        <SectionHeader title="Attributes" />
        <div className="space-y-2">
          {ATTRIBUTE_GROUPS.map(group => (
            <div key={group.label}>
              <div className="text-xs text-stone-500 font-semibold uppercase tracking-wider mb-1">{group.label}</div>
              <div className="space-y-1">
                {group.attrs.map(attr => (
                  <div key={attr} className="flex items-center justify-between">
                    <span className="text-xs text-stone-200">{attr}</span>
                    {/* Dots in training aren't shown until done; the hint says where they lead. */}
                    <span data-tip={trainingHint(calcAttributes[attr] ?? 0, traitsInTraining.attributes[attr])}>
                      <input type="number" min={0} max={10} value={calcAttributes[attr] ?? 0}
                        onChange={e => setAttr(attr, ratingToStore(parseInt(e.target.value) || 0, traitsInTraining.attributes[attr]))}
                        className={numInput + trainingInput(traitsInTraining.attributes[attr])} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    abilities: (() => {
      // Excellency is purchased per-ability (choiceType 'ability'), one pick per
      // purchase; while its implementation is active, the Ex tags are derived
      // from those picks instead of being manually toggled — see CLAUDE.md /
      // the mechanicalKey gating pattern used by FoI in InventoryPanel above.
      const excellencyCharms = effectCharms.filter(c => activeKey(c) === 'excellency')
      const excellencyManaged = excellencyCharms.length > 0
      const excellencyAbilities = new Set(excellencyCharms.flatMap(c => c.picks ?? []))

      return (
        <div className={panelBase}>
          <SectionHeader title="Abilities" />
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-500 border-b border-stone-700">
                <th className="text-left py-1 px-1 font-medium w-[80px]">Ability</th>
                <th className="text-center py-1 px-1 font-medium w-[38px]">Rtg</th>
                <th className="text-left py-1 px-1 font-medium">Specialty</th>
                <th className="text-center py-1 px-1 font-medium w-[20px]" data-tip="Excellency">Ex</th>
              </tr>
            </thead>
            <tbody>
              {ABILITIES.map(ability => {
                const ab = data.abilities[ability] ?? defaultAbility
                const hasEx = excellencyManaged ? excellencyAbilities.has(ability) : ab.excellency
                return (
                  <tr key={ability} className={`border-b border-stone-800 transition-colors ${hasEx ? 'bg-amber-950/40' : 'hover:bg-stone-800/50'}`}>
                    <td className={`py-1 px-1 font-medium ${hasEx ? 'text-amber-300' : 'text-stone-200'}`}>{ability}</td>
                    <td className="py-1 px-1 text-center" data-tip={trainingHint(calcAbilities[ability]?.rating ?? 0, traitsInTraining.abilities[ability])}>
                      <input type="number" min={0} max={10} value={calcAbilities[ability]?.rating ?? 0}
                        onChange={e => setAbility(ability, { rating: ratingToStore(parseInt(e.target.value) || 0, traitsInTraining.abilities[ability]) })}
                        className={numInput + trainingInput(traitsInTraining.abilities[ability])} />
                    </td>
                    <td className="py-1 px-1" data-tip={traitsInTraining.specialties.has(ability) ? 'Specialty in training — not counted until done' : undefined}>
                      <input type="text" value={ab.specialty}
                        onChange={e => setAbility(ability, { specialty: e.target.value })}
                        placeholder="—"
                        className={`w-full bg-transparent border-b text-xs focus:outline-none focus:border-amber-500 px-1 py-0.5 placeholder-stone-600 ${
                          traitsInTraining.specialties.has(ability) ? 'border-dashed border-amber-600 text-amber-200/70 italic' : 'border-stone-700 text-stone-300'}`} />
                    </td>
                    <td className="py-1 px-1 text-center">
                      {excellencyManaged ? (
                        <span data-tip={hasEx ? 'Granted by [Ability] Excellency' : undefined}
                          className={`inline-block w-3 h-3 rounded-full border-2 ${hasEx ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-stone-700'}`} />
                      ) : (
                        <button onClick={() => setAbility(ability, { excellency: !ab.excellency })}
                          className={`w-3 h-3 rounded-full border-2 transition-colors ${ab.excellency ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-stone-600 hover:border-amber-500'}`} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    })(),

    defenses: (() => {
      const stamina = calcAttributes['Stamina']   ?? 0
      const dex     = calcAttributes['Dexterity']  ?? 0
      const phys    = calcAbilities['Physique']?.rating     ?? 0
      const integ   = calcAbilities['Integrity']?.rating    ?? 0
      const bestWpnDef    = bestEquipped(data.inventory, 'weapon', 'defense')
      const bestArmorSoak = bestEquipped(data.inventory, 'armor', 'soak')
      const bestArmorHard = bestEquipped(data.inventory, 'armor', 'hardness')
      const db = data.defenseBonus
      const {
        parry, evasion, soak, hardness, resolve,
        parryBase, evasionBase, soakBase, hardnessBase, resolveBase, oxBodySoak, weaponBonus: wpnBonus, capped,
      } = calculateDefenses({
        stamina, dexterity: dex, closeCombat: defenseAbility.parry.rating, athletics: defenseAbility.evasion.rating, physique: phys,
        integrity: integ, essence: data.essence ?? 1,
        bestWeaponDefense: bestWpnDef, bestArmorSoak, bestArmorHardness: bestArmorHard,
        oxBody: !!oxBody,
        charmBonus: {
          parry: statTotal(charmLines, 'parry'), evasion: statTotal(charmLines, 'evasion'), soak: statTotal(charmLines, 'soak'),
          hardness: statTotal(charmLines, 'hardness'), resolve: statTotal(charmLines, 'resolve'),
        },
        fullDefense: data.fullDefense, defendOther: data.defenseOther,
        bonus: {
          parry: db.parry ?? 0, evasion: db.evasion ?? 0, soak: db.soak ?? 0,
          hardness: db.hardness ?? 0, resolve: db.resolve ?? 0,
        },
      })
      const bonusInput = (key: keyof typeof db) => (
        <input type="number" value={db[key] ?? 0}
          onChange={e => update({ defenseBonus: { ...db, [key]: parseInt(e.target.value) || 0 } })}
          className="w-[30px] text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-amber-500" />
      )
      // Line order in every breakdown (Angel, 2026-09-27): Base (the book formula only),
      // then item bonuses, then each other source (charms etc.) on its own line, and
      // Manual bonus always last. A new bonus source gets a new line — never folded
      // into Base's text.
      // Display only: every number here is read from calculateDefenses' result or its
      // inputs. The one piece of arithmetic is showing gear at the +5 it was trimmed
      // to, which is what `capped` reports; any gap left after that is the floor.
      const gearLine = (label: string, source: string, gear: number, isCapped: boolean): BreakdownLine => ({
        label, value: isCapped ? STATIC_BONUS_CAP : gear, signed: true,
        detail: isCapped ? `${source} ${gear}, capped at +${STATIC_BONUS_CAP}` : source,
      })
      const weaponLine = (key: 'parry' | 'evasion'): BreakdownLine => wpnBonus
        ? gearLine('Weapon', 'Best equipped weapon', bestWpnDef, capped[key])
        : { label: 'Weapon', value: 0, signed: true, muted: true, detail: 'Only with Full Defense or Defend Other' }
      // Each charm in use on its own line, after gear and Ox Body, before the manual bonus.
      const charmLinesFor = (stat: DefenseStat): BreakdownLine[] => charmLines.filter(l => l.stat === stat)
        .map(l => ({ label: l.name, value: l.value, signed: true, detail: 'In use' }))
      // A charm can make Parry or Evasion use another Ability; Base names it.
      const abilityText = (a: typeof defenseAbility.parry) => `${a.ability} ${a.rating}${a.by ? ` (${a.by})` : ''}`
      const bonusLine = (key: keyof typeof db): BreakdownLine =>
        ({ label: 'Manual bonus', value: db[key] ?? 0, signed: true, muted: !db[key], detail: 'Typed into the box beside it' })
      const calcRow = (label: string, total: number, lines: BreakdownLine[], bonus: ReturnType<typeof bonusInput>) => (
        <Tooltip className="flex items-center gap-1.5" content={<DefenseBreakdown title={label} total={total} lines={lines} />}>
          <span className="text-xs text-stone-400 w-16 shrink-0">{label}</span>
          <span className="text-sm font-semibold text-stone-100 flex-1 cursor-default">{total}</span>
          {bonus}
        </Tooltip>
      )
      return (
        <div className={panelBase}>
          <SectionHeader title="Defenses" />
          <div className="space-y-1.5">
            {calcRow('Parry', parry, [
              { label: 'Base', value: parryBase, detail: `Stamina ${stamina} + ${abilityText(defenseAbility.parry)}, halved, rounded up` },
              weaponLine('parry'), ...charmLinesFor('parry'), bonusLine('parry'),
            ], bonusInput('parry'))}
            {calcRow('Evasion', evasion, [
              { label: 'Base', value: evasionBase, detail: `Dexterity ${dex} + ${abilityText(defenseAbility.evasion)}, halved, rounded up` },
              weaponLine('evasion'), ...charmLinesFor('evasion'), bonusLine('evasion'),
            ], bonusInput('evasion'))}
            {calcRow('Soak', soak, [
              { label: 'Base', value: soakBase, detail: `1, plus 1 at Physique 3+ (you have ${phys})` },
              gearLine('Armor', 'Best equipped armor', bestArmorSoak, capped.soak),
              ...(oxBodySoak ? [{ label: 'Ox Body', value: oxBodySoak, signed: true, detail: 'Ox Body Technique, counted once' }] : []),
              ...charmLinesFor('soak'),
              bonusLine('soak'),
            ], bonusInput('soak'))}
            {calcRow('Hardness', hardness, [
              { label: 'Base', value: hardnessBase, detail: `2 + Essence ${data.essence ?? 1}` },
              gearLine('Armor', 'Best equipped armor', bestArmorHard, capped.hardness), ...charmLinesFor('hardness'), bonusLine('hardness'),
            ], bonusInput('hardness'))}
            {calcRow('Resolve', resolve, [
              { label: 'Base', value: resolveBase, detail: `From Integrity ${integ}` },
              ...charmLinesFor('resolve'), bonusLine('resolve'),
            ], bonusInput('resolve'))}
            <div className="border-t border-stone-700 pt-1 mt-1 space-y-1">
              {([['defenseOther', 'Defend Other'], ['fullDefense', 'Full Defense']] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-stone-300">{label}</span>
                  <button
                    onClick={() => update({ [key]: !data[key] })}
                    className={`w-8 h-4 rounded-full transition-colors relative ${data[key] ? 'bg-amber-500' : 'bg-stone-600'}`}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${data[key] ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    })(),

    essence: (() => {
      const essence = data.essence ?? 1
      const moteTable = gameData.essenceMotes ?? DEFAULT_GAME_DATA.essenceMotes
      const totalMotes = moteTable.find(r => r.essence === essence)?.motes
        ?? moteTable.reduce((best, r) => r.essence <= essence ? r : best, moteTable[0])?.motes
        ?? 0
      const current   = data.motes.current
      const committed = data.motes.committed
      const resetMotes = () => update({ motes: { current: totalMotes, committed: 0, total: totalMotes } })
      const setCommitted = (delta: number) => {
        const newCommitted = committed + delta
        if (newCommitted < 0) return
        const newCurrent = current - delta
        if (newCurrent < 0) return
        const newAnima = delta > 0 ? Math.min(10, (data.anima ?? 0) + 1) : data.anima ?? 0
        update({ motes: { ...data.motes, committed: newCommitted, current: newCurrent }, anima: newAnima })
      }
      const setCurrent = (delta: number) => {
        const newCurrent = current + delta
        if (newCurrent < 0 || newCurrent > totalMotes) return
        const newAnima = delta < 0 ? Math.min(10, (data.anima ?? 0) + 1) : data.anima ?? 0
        update({ motes: { ...data.motes, current: newCurrent }, anima: newAnima })
      }

      const animaLevel = data.anima ?? 0
      const animaTable = gameData.animaStates ?? DEFAULT_GAME_DATA.animaStates
      const animaState = animaTable.find(r => r.level === animaLevel)?.label ?? ''
      const animaColor =
        animaLevel === 0  ? 'text-stone-500' :
        animaLevel <= 2   ? 'text-blue-400' :
        animaLevel <= 4   ? 'text-amber-300' :
        animaLevel <= 6   ? 'text-orange-400' :
        animaLevel <= 9   ? 'text-red-400' :
                            'text-amber-400'
      const setAnima = (delta: number) => {
        update({ anima: Math.max(0, Math.min(10, animaLevel + delta)) })
      }

      const power = data.power ?? 0
      const will = data.will ?? 0
      const setEssence = (delta: number) => update({ essence: Math.max(1, Math.min(5, essence + delta)) })
      const setPower = (delta: number) => update({ power: Math.max(0, Math.min(10, power + delta)) })
      const setWill = (delta: number) => update({ will: Math.max(0, Math.min(10, will + delta)) })

      const divider = <div className="border-t border-stone-700/60" />
      const vRule = <div className="hidden @[12rem]:block w-px self-stretch bg-stone-700/60" />

      // No panel-level SectionHeader here: the Essence label below would sit directly
      // under an identical "Essence" title.
      // Layout is a 2-column grid of three rows: Essence | Anima, then Motes (whose
      // Current | Committed pair fills both columns), then Power | Will. A panel too
      // narrow for two counters side by side stacks each pair instead, so no label
      // is cut off (a container query on the panel's own width).
      return (
        <div className={`${panelBase} @container`}>
          <div className="space-y-2">

            <div className="flex flex-col @[12rem]:flex-row items-stretch @[12rem]:items-start gap-2 @[12rem]:gap-1">
              <div className="flex-1 min-w-0">
                <SubHeader title="Essence" />
                <Counter value={essence} onStep={setEssence} />
              </div>
              {vRule}
              <div className="flex-1 min-w-0">
                <SubHeader title="Anima" onReset={() => update({ anima: 0 })} />
                <div className="flex flex-col items-center gap-0.5">
                  <Counter value={animaLevel} onStep={setAnima} valueCls={animaColor} />
                  <span className={`text-xs font-medium text-center ${animaColor}`}>{animaState}</span>
                </div>
              </div>
            </div>

            {divider}

            <div>
              <SubHeader
                title="Motes"
                onReset={resetMotes}
                right={<span className="text-[10px] text-stone-500">Total <span className="text-stone-300 font-semibold">{totalMotes}</span></span>}
              />
              <div className="flex flex-col @[12rem]:flex-row items-stretch @[12rem]:items-start gap-1.5 @[12rem]:gap-0">
                <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500">Current</span>
                  <Counter value={current} onStep={setCurrent} size="sm" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-stone-500">Committed</span>
                  <Counter value={committed} onStep={setCommitted} size="sm" />
                </div>
              </div>
            </div>

            {divider}

            <div className="flex flex-col @[12rem]:flex-row items-stretch @[12rem]:items-start gap-2 @[12rem]:gap-1">
              <div className="flex-1 min-w-0">
                <SubHeader title="Power" onReset={() => update({ power: 0 })} />
                <Counter value={power} onStep={setPower} />
              </div>
              {vRule}
              <div className="flex-1 min-w-0">
                <SubHeader title="Will" onReset={() => update({ will: 0 })} />
                <Counter value={will} onStep={setWill} />
              </div>
            </div>

          </div>
        </div>
      )
    })(),

    health: (() => {
      const level = currentWound(healthTrack, damage)
      const penalty = wound.penalty
      // No badge while unhurt; otherwise the rightmost filled level's name and the
      // penalty after charms (Undying Body…), which its hint names.
      const status = level === null ? null
        : level === 'incap' ? { text: 'Incapacitated', cls: 'bg-red-950 text-red-300 border-red-700' }
        : level === 0 ? { text: 'Bruised', cls: 'bg-amber-950 text-amber-300 border-amber-800' }
        : { text: `${LEVEL_NAMES[String(level)]}${penalty < 0 ? ` −${-penalty}` : ', no penalty'}`, cls: 'bg-red-950 text-red-300 border-red-800' }
      const statusTip = wound.lines.length ? wound.lines.map(l => `${l.name}: ${l.text}`).join('. ') : undefined
      // Consecutive levels of the same kind form one labelled group.
      const groups: { level: typeof healthTrack[number]['level']; start: number; boxes: typeof healthTrack }[] = []
      healthTrack.forEach((box, idx) => {
        const last = groups[groups.length - 1]
        if (last && last.level === box.level) last.boxes.push(box)
        else groups.push({ level: box.level, start: idx, boxes: [box] })
      })
      return (
        <div className={panelBase}>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest">Health</div>
            <span className="text-xs text-stone-500 font-mono" data-tip="Damage taken / health levels">
              <span className="text-stone-200">{damage}</span>/{healthTrack.length}
            </span>
            {status && <span data-tip={statusTip} className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${status.cls}`}>{status.text}</span>}
            {damage > 0 && (
              <button onClick={() => setDamage(0)} data-tip="Heal all" aria-label="Heal all"
                className="text-stone-500 hover:text-emerald-400 transition-colors text-sm leading-none">↺</button>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-2">
            {groups.map(g => (
              <div key={g.start} className="flex flex-col gap-1">
                <span className="text-[10px] text-stone-500 whitespace-nowrap">
                  {LEVEL_NAMES[String(g.level)]}{g.level !== 'incap' && <span className="text-stone-600"> {g.level === 0 ? '0' : `−${-g.level}`}</span>}
                </span>
                <div className="flex gap-1">
                  {g.boxes.map((box, j) => {
                    const idx = g.start + j
                    const filled = idx < damage
                    return (
                      <button key={idx} onClick={() => setDamage(damageAfterClick(damage, idx))}
                        aria-label={`${LEVEL_NAMES[String(box.level)]} level ${idx + 1}${filled ? ', damaged' : ''}`}
                        data-tip={box.oxBody ? 'From Ox Body Technique' : box.charm ? `From ${box.charm}, while in use` : undefined}
                        className={`relative w-5 h-5 rounded border-2 transition-colors ${
                          filled
                            ? (box.level === 'incap' ? 'bg-red-800 border-red-600' : 'bg-red-600 border-red-500')
                            : 'bg-transparent border-stone-600 hover:border-red-400'
                        }`}>
                        {(box.oxBody || box.charm) && <span className={`absolute top-0.5 right-0.5 w-1 h-1 rounded-full ${box.oxBody ? 'bg-amber-500' : 'bg-sky-400'}`} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    })(),

    merits: (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col">
        <SectionHeader title="Merits" />
        <div className="space-y-1 mb-2 overflow-y-auto no-scrollbar flex-1">
          {data.merits.map(merit => (
            <div key={merit.id}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`shrink-0 font-semibold px-1 py-0.5 rounded ${merit.type === 'Primary' ? 'bg-amber-900 text-amber-300' : merit.type === 'Secondary' ? 'bg-sky-900 text-sky-300' : 'bg-stone-700 text-stone-300'}`}>{merit.type[0]}</span>
                  <span className="text-stone-200 truncate">{merit.name}</span>
                </div>
                <div className="flex gap-1 ml-1 shrink-0">
                  <button onClick={() => { setEditingMeritId(merit.id); setEditMeritType(merit.type); setEditMeritName(merit.name) }} className="text-stone-500 hover:text-amber-400 transition-colors">✎</button>
                  <button onClick={() => removeMerit(merit.id)} className="text-stone-500 hover:text-red-400 transition-colors">✕</button>
                </div>
              </div>
              {editingMeritId === merit.id && (
                <div className="flex gap-1 mt-1">
                  <select value={editMeritType} onChange={e => setEditMeritType(e.target.value as MeritEntry['type'])}
                    className="bg-stone-800 border border-amber-500 text-stone-100 rounded px-1 py-0.5 text-xs focus:outline-none">
                    <option>Primary</option><option>Secondary</option><option>Tertiary</option>
                  </select>
                  <input type="text" value={editMeritName} onChange={e => setEditMeritName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveMerit(); if (e.key === 'Escape') setEditingMeritId(null) }}
                    className="flex-1 min-w-0 bg-stone-800 border border-amber-500 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none" />
                  <button onClick={saveMerit} className="bg-amber-600 hover:bg-amber-500 text-stone-950 rounded px-2 py-0.5 text-xs transition-colors">✓</button>
                  <button onClick={() => setEditingMeritId(null)} className="text-stone-500 hover:text-stone-300 text-xs px-1">✕</button>
                </div>
              )}
            </div>
          ))}
          {data.merits.length === 0 && <p className="text-xs text-stone-500">None.</p>}
        </div>
        <div className="flex gap-1">
          <select value={newMeritType} onChange={e => setNewMeritType(e.target.value as MeritEntry['type'])}
            className="bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-amber-500">
            <option>Primary</option><option>Secondary</option><option>Tertiary</option>
          </select>
          <input type="text" value={newMeritName} onChange={e => setNewMeritName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMerit()} placeholder="Merit name…"
            className="flex-1 min-w-0 bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500" />
          <button onClick={addMerit} className="bg-stone-700 hover:bg-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs transition-colors">+</button>
        </div>
      </div>
    ),

    languages: (
      <div className={panelBase}>
        <SectionHeader title="Languages" />
        <div className="space-y-1 mb-2">
          {data.languages.map((lang, i) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs text-stone-200">
                <span>{lang}</span>
                <div className="flex gap-1 ml-1 shrink-0">
                  <button onClick={() => { setEditingLangIdx(i); setEditLangValue(lang) }} className="text-stone-500 hover:text-amber-400 transition-colors">✎</button>
                  <button onClick={() => removeLanguage(i)} className="text-stone-500 hover:text-red-400 transition-colors">✕</button>
                </div>
              </div>
              {editingLangIdx === i && (
                <div className="flex gap-1 mt-1">
                  <input type="text" value={editLangValue} onChange={e => setEditLangValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveLang(); if (e.key === 'Escape') setEditingLangIdx(null) }}
                    className="flex-1 min-w-0 bg-stone-800 border border-amber-500 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none" />
                  <button onClick={saveLang} className="bg-amber-600 hover:bg-amber-500 text-stone-950 rounded px-2 py-0.5 text-xs transition-colors">✓</button>
                  <button onClick={() => setEditingLangIdx(null)} className="text-stone-500 hover:text-stone-300 text-xs px-1">✕</button>
                </div>
              )}
            </div>
          ))}
          {data.languages.length === 0 && <p className="text-xs text-stone-500">None.</p>}
        </div>
        <div className="flex gap-1">
          <input type="text" value={newLanguage} onChange={e => setNewLanguage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addLanguage()} placeholder="Add language…"
            className="flex-1 min-w-0 bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500" />
          <button onClick={addLanguage} className="bg-stone-700 hover:bg-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs transition-colors">+</button>
        </div>
      </div>
    ),

    intimacies: (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col">
        <SectionHeader title="Intimacies" />
        <div className="space-y-1 mb-2 overflow-y-auto no-scrollbar flex-1">
          {data.intimacies.map(intimacy => {
            // Marked gold like an Excellency's Ability while Righteous Lion Spirit protects it.
            const unbreakable = unbreakableIntimacies.has(intimacy.id) && protectable(intimacy)
            return (
            <div key={intimacy.id} className={unbreakable ? 'bg-amber-950/40 rounded' : undefined}
              data-tip={unbreakable ? 'Unbreakable — Righteous Lion Spirit' : undefined}>
              <div className="flex items-start justify-between text-xs gap-1">
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className={`self-center shrink-0 font-semibold px-1 py-0.5 rounded ${intimacy.intensity === 'Defining' ? 'bg-purple-900 text-purple-300' : intimacy.intensity === 'Major' ? 'bg-amber-900 text-amber-300' : 'bg-stone-700 text-stone-300'}`}>{intimacy.intensity[0]}</span>
                  <span className={`break-words min-w-0 ${unbreakable ? 'text-amber-300' : 'text-stone-200'}`}>{intimacy.description}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditingIntimacyId(intimacy.id); setEditIntimacyIntensity(intimacy.intensity); setEditIntimacyDesc(intimacy.description) }} className="text-stone-500 hover:text-amber-400 transition-colors">✎</button>
                  <button onClick={() => removeIntimacy(intimacy.id)} className="text-stone-500 hover:text-red-400 transition-colors">✕</button>
                </div>
              </div>
              {editingIntimacyId === intimacy.id && (
                <div className="flex gap-1 mt-1">
                  <select value={editIntimacyIntensity} onChange={e => setEditIntimacyIntensity(e.target.value as IntimacyEntry['intensity'])}
                    className="bg-stone-800 border border-amber-500 text-stone-100 rounded px-1 py-0.5 text-xs focus:outline-none">
                    <option>Minor</option><option>Major</option><option>Defining</option>
                  </select>
                  <input type="text" value={editIntimacyDesc} onChange={e => setEditIntimacyDesc(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveIntimacy(); if (e.key === 'Escape') setEditingIntimacyId(null) }}
                    className="flex-1 min-w-0 bg-stone-800 border border-amber-500 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none" />
                  <button onClick={saveIntimacy} className="bg-amber-600 hover:bg-amber-500 text-stone-950 rounded px-2 py-0.5 text-xs transition-colors">✓</button>
                  <button onClick={() => setEditingIntimacyId(null)} className="text-stone-500 hover:text-stone-300 text-xs px-1">✕</button>
                </div>
              )}
            </div>
            )
          })}
          {data.intimacies.length === 0 && <p className="text-xs text-stone-500">None.</p>}
        </div>
        <div className="flex gap-1">
          <select value={newIntensity} onChange={e => setNewIntensity(e.target.value as IntimacyEntry['intensity'])}
            className="bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-amber-500">
            <option>Minor</option><option>Major</option><option>Defining</option>
          </select>
          <input type="text" value={newIntimacyDesc} onChange={e => setNewIntimacyDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addIntimacy()} placeholder="Describe…"
            className="flex-1 min-w-0 bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500" />
          <button onClick={addIntimacy} className="bg-stone-700 hover:bg-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs transition-colors">+</button>
        </div>
      </div>
    ),

    charms: (
      <CharmPanel
        library={library}
        libraryLoaded={libraryLoaded}
        pools={{ motes: data.motes, anima: data.anima }}
        onSheetChange={update}
        problemContext={{
          essence: data.essence ?? 1, attributes: data.attributes, abilities: data.abilities,
          intimacies: data.intimacies, oxBodyHasChoice: oxBodyHasChoice(data.exaltType, data.caste),
        }}
        foiActive={!!data.foi?.active}
        charms={data.charms}
        milestones={milestones}
        training={charmTraining}
        onLedgerChange={next => onLedgerChange({ charms: next.charms }, next.milestones)}
        onTrainingDone={onTrainingDone}
        groups={data.charmGroups}
        onContentHeight={stacked ? noFit : fitCharmsPanel}
        onChange={c => update({ charms: c })}
        onGroupsChange={(charmGroups, charms) => update(charms ? { charmGroups, charms } : { charmGroups })}
        dragEnabled={dragEnabled}
        exaltType={data.exaltType}
        caste={data.caste}
        abilities={calcAbilities}
        attributes={calcAttributes}
        essence={data.essence ?? 1}
      />
    ),

    effects: (
      <EffectPanel
        categories={data.effects}
        onChange={c => update({ effects: c })}
        dragEnabled={dragEnabled}
        anima={data.anima}
      />
    ),

    inventory: (
      <InventoryPanel
        items={data.inventory}
        onChange={items => update({ inventory: items })}
        foi={data.foi ?? { active: false, weight: null, tag: null, artifact: false }}
        foiOriginals={data.foiOriginals ?? {}}
        onFoiChange={(foi, foiOriginals, inventory) => update({ foi, foiOriginals, inventory })}
        dragEnabled={dragEnabled}
        gameData={gameData}
        charms={effectCharms}
      />
    ),
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Phones: one page of panels at a time, each panel as tall as its content; the
          saved desktop layout is never changed there. */}
      {mounted && stacked && <PhoneSheet panels={panels} />}
      {mounted && !stacked && (
        <GridLayout
          width={width}
          gridConfig={{ cols: 128, rowHeight: ROW_HEIGHT, margin: [0, 0], containerPadding: [0, 0] }}
          dragConfig={{ enabled: editMode, handle: '.drag-handle' }}
          resizeConfig={{ enabled: editMode }}
          compactor={freeCompactor}
          // The Charms panel's height follows its content, so it only resizes sideways.
          layout={data.layout.map(l => l.i === 'charms' ? { ...l, resizeHandles: ['e' as const] } : l)}
          onLayoutChange={newLayout => {
            const next = gridLayoutChange(data.layout, newLayout, 'charms')
            if (next !== data.layout) update({ layout: next })
          }}
          autoSize={false}
          style={{
            // As tall as the panels reach (no scrolling into empty space below them);
            // while editing, room below to drag a panel further down.
            height: `${Math.max(0, ...data.layout.map(l => l.y + l.h)) * ROW_HEIGHT + (editMode ? 600 : 8)}px`,
            ...(editMode ? {
              backgroundImage: 'linear-gradient(rgba(251,191,36,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.08) 1px, transparent 1px)',
              backgroundSize: `${width / 128}px ${ROW_HEIGHT}px`,
            } : {}),
          }}
        >
          {Object.entries(panels).map(([key, content]) => (
            <div key={key} className="relative p-[2px]">
              {editMode && (
                <div className="drag-handle absolute inset-x-0 top-0 h-5 bg-amber-500/20 hover:bg-amber-500/40 cursor-grab active:cursor-grabbing rounded-t-lg flex items-center justify-center z-[5]">
                  <div className="flex gap-0.5">
                    {[...Array(4)].map((_, i) => <div key={i} className="w-0.5 h-2.5 bg-amber-400/60 rounded" />)}
                  </div>
                </div>
              )}
              {content}
            </div>
          ))}
        </GridLayout>
      )}
      <TooltipLayer />
    </div>
  )
}
