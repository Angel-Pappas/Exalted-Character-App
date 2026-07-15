import { Fragment, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CharmChoiceType, CharmMode, LibraryCharm, MultiselectCapBasis, MultiselectTargetType } from '../types/character'
import { baseAbility, abilityRank, modeIcon, sortAbilities, sortModes, typeRank } from '../lib/charmRules'
import AbilityChipInput from './AbilityChipInput'
import ModalPortal from './ModalPortal'

interface CharmAbilityRow { ability: string }
interface CharmModePrereqAbilityRow { text: string }
interface CharmModeRow {
  label: string
  mode_text: string | null
  prerequisite_essence: number | null
  charm_mode_prerequisite_abilities: CharmModePrereqAbilityRow[]
}
interface CharmPrereqAbilityRow { text: string }
interface CharmPrereqCharmRow { charm_name: string }
interface CharmChoiceOptionRow { option: string; sort_order: number }
interface CharmTargetOptionRow { option: string; sort_order: number }

// Raw shape of a charm_library row with every join this app selects. The sheet's
// own query selects a subset of the joins — see SheetCharmRow in SheetTab.
export interface CharmLibraryRow {
  id: string
  type: string | null
  name: string
  page: number | null
  description: string
  mechanical_key: string | null
  mechanical_description: string | null
  prerequisite_essence: number | null
  choice_type: CharmChoiceType | null
  target_choice_type: MultiselectTargetType | null
  multiselect_cap_basis: MultiselectCapBasis | null
  pick_counts: number[] | null
  needs_review: boolean
  review_action: ReviewAction
  charm_abilities: CharmAbilityRow[]
  charm_modes: CharmModeRow[]
  charm_prerequisite_abilities: CharmPrereqAbilityRow[]
  charm_prerequisite_charms: CharmPrereqCharmRow[]
  charm_choice_options: CharmChoiceOptionRow[]
  charm_target_options: CharmTargetOptionRow[]
}

// Temporary review workflow (not part of the app's real data model): flags a
// charm as possibly needing a purchase choice, and records what to do about
// it. Remove needs_review/review_action from the DB and this UI once the
// whole library has been triaged.
type ReviewAction = 'freetext' | 'set_list' | 'ask_admin' | 'no_action' | null
type AdminCharm = LibraryCharm & { needsReview: boolean; reviewAction: ReviewAction }

const CHOICE_TYPE_LABELS: Record<CharmChoiceType, string> = {
  ability: 'Ability',
  attribute: 'Attribute',
  custom: 'Custom List',
  freetext: 'Free Text',
  multiselect: 'Multi-select (target + scaling benefits)',
}

const TARGET_TYPE_LABELS: Record<MultiselectTargetType, string> = {
  ability: 'Ability',
  attribute: 'Attribute',
  custom: 'Custom List',
  freetext: 'Free Text',
}

const CAP_BASIS_LABELS: Record<MultiselectCapBasis, string> = {
  essence: "Character's Essence",
  target_rating: "Target's rating (Ability/Attribute target only)",
}

// 'custom' and 'multiselect' both draw from an admin-authored option list
// (charm_choice_options); the others don't need one.
function usesOptionList(choiceType: CharmChoiceType | null): boolean {
  return choiceType === 'custom' || choiceType === 'multiselect'
}

// A pick schedule only makes sense for the list-based choice types (you pick
// N of a fixed list); ability/attribute/custom all qualify, freetext doesn't
// (nothing to count out of), multiselect has its own per-target cap system.
function supportsPickSchedule(choiceType: CharmChoiceType | null): boolean {
  return choiceType === 'ability' || choiceType === 'attribute' || choiceType === 'custom'
}

function parsePickCounts(text: string): number[] | null {
  const nums = text.split(',').map(s => parseInt(s.trim(), 10)).filter(n => Number.isFinite(n) && n > 0)
  return nums.length ? nums : null
}

function blankCharm(): LibraryCharm {
  return {
    id: '', type: 'Universal', abilities: [], name: '', page: null, description: '',
    mechanicalKey: null, mechanicalDescription: null, prerequisiteAbilities: [],
    prerequisiteEssence: null, prerequisiteCharms: [], modes: [],
    choiceType: null, choiceOptions: [],
    targetChoiceType: null, targetOptions: [], multiselectCapBasis: null,
    pickCounts: null,
  }
}

// Shared by EditCharmRow and the New Charm form: how a multiselect charm's
// target is picked (freetext/ability/attribute/custom), plus what caps the
// number of benefits selectable per target.
function MultiselectTargetConfig({ charm, onChange, textInput }: {
  charm: Pick<LibraryCharm, 'targetChoiceType' | 'targetOptions' | 'multiselectCapBasis'>
  onChange: (patch: Partial<Pick<LibraryCharm, 'targetChoiceType' | 'targetOptions' | 'multiselectCapBasis'>>) => void
  textInput: string
}) {
  return (
    <div className="pl-3 border-l-2 border-stone-700 space-y-1.5">
      <div>
        <p className="text-[10px] text-stone-500 mb-0.5">How is the target picked? (e.g. a companion, an Ability)</p>
        <select
          value={charm.targetChoiceType ?? 'freetext'}
          onChange={e => onChange({ targetChoiceType: e.target.value as MultiselectTargetType, targetOptions: e.target.value === 'custom' ? charm.targetOptions : [] })}
          className={textInput}
        >
          {(Object.keys(TARGET_TYPE_LABELS) as MultiselectTargetType[]).map(t => <option key={t} value={t}>{TARGET_TYPE_LABELS[t]}</option>)}
        </select>
        {charm.targetChoiceType === 'custom' && (
          <div className="mt-1">
            <p className="text-[10px] text-stone-500 mb-0.5">Target options</p>
            <AbilityChipInput abilities={charm.targetOptions} onChange={targetOptions => onChange({ targetOptions })} suggestions={[]} />
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] text-stone-500 mb-0.5">Benefit cap based on</p>
        <select
          value={charm.multiselectCapBasis ?? 'essence'}
          onChange={e => onChange({ multiselectCapBasis: e.target.value as MultiselectCapBasis })}
          className={textInput}
        >
          {(Object.keys(CAP_BASIS_LABELS) as MultiselectCapBasis[]).map(b => <option key={b} value={b}>{CAP_BASIS_LABELS[b]}</option>)}
        </select>
      </div>
    </div>
  )
}

// Shared by EditCharmRow and the New Charm form: how many options to pick on
// each successive purchase, e.g. "2, 1" for Sharpshooter's Clever Tricks
// (pick 2 on the first purchase, 1 more on a single repurchase, then no more
// purchases regardless of unchosen options remaining). Blank = pick 1 per
// purchase, uncapped by a schedule (the default for every other charm).
function PickScheduleConfig({ pickCounts, onChange, textInput }: {
  pickCounts: number[] | null
  onChange: (pickCounts: number[] | null) => void
  textInput: string
}) {
  return (
    <div>
      <p className="text-[10px] text-stone-500 mb-0.5">Pick schedule (optional — options to pick per successive purchase, e.g. "2, 1"; blank = always 1)</p>
      <input
        defaultValue={pickCounts?.join(', ') ?? ''}
        onBlur={e => onChange(parsePickCounts(e.target.value))}
        placeholder="e.g. 2, 1"
        className={textInput}
      />
    </div>
  )
}

function EditCharmRow({ charm, onSave, onCancel, saving, textInput, abilitySuggestions, charmNameSuggestions, prereqAbilitySuggestions }: {
  charm: LibraryCharm
  onSave: (c: LibraryCharm) => void
  onCancel: () => void
  saving: boolean
  textInput: string
  abilitySuggestions: string[]
  charmNameSuggestions: string[]
  prereqAbilitySuggestions: string[]
}) {
  const [form, setForm] = useState({ ...charm })
  const set = (patch: Partial<LibraryCharm>) => setForm(f => ({ ...f, ...patch }))
  return (
    <div className="px-3 py-2 space-y-1.5 bg-stone-800/50">
      <input value={form.type} onChange={e => set({ type: e.target.value })} placeholder="Type (Universal, Solar, Lunar, …)…" list="charm-type-options" className={textInput} />
      <AbilityChipInput abilities={form.abilities} onChange={abilities => set({ abilities })} suggestions={abilitySuggestions} />
      <input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Name…" className={textInput} />
      <div>
        <p className="text-[10px] text-stone-500 mb-0.5">Prerequisite abilities (e.g. "Integrity 2")</p>
        <AbilityChipInput abilities={form.prerequisiteAbilities} onChange={prerequisiteAbilities => set({ prerequisiteAbilities })} suggestions={prereqAbilitySuggestions} />
      </div>
      <div>
        <p className="text-[10px] text-stone-500 mb-0.5">Prerequisite charms</p>
        <AbilityChipInput abilities={form.prerequisiteCharms} onChange={prerequisiteCharms => set({ prerequisiteCharms })} suggestions={charmNameSuggestions} />
      </div>
      <input type="number" value={form.prerequisiteEssence ?? ''} onChange={e => set({ prerequisiteEssence: e.target.value ? parseInt(e.target.value) : null })} placeholder="Prerequisite Essence…" className={textInput} />
      <input type="number" value={form.page ?? ''} onChange={e => set({ page: e.target.value ? parseInt(e.target.value) : null })} placeholder="Page…" className={textInput} />
      <textarea value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Description…" rows={3} className={`${textInput} resize-none`} />
      <input value={form.mechanicalKey ?? ''} onChange={e => set({ mechanicalKey: e.target.value || null })} placeholder="Mechanical key (optional)…" className={textInput} />
      <textarea value={form.mechanicalDescription ?? ''} onChange={e => set({ mechanicalDescription: e.target.value || null })} placeholder="Mechanical implementation description (optional)…" rows={2} className={`${textInput} resize-none`} />
      <div>
        <p className="text-[10px] text-stone-500 mb-0.5">Purchase choice (optional — a pick required each time the charm is bought)</p>
        <select
          value={form.choiceType ?? ''}
          onChange={e => set({ choiceType: (e.target.value || null) as CharmChoiceType | null, choiceOptions: usesOptionList(e.target.value as CharmChoiceType) ? form.choiceOptions : [] })}
          className={textInput}
        >
          <option value="">None</option>
          {(Object.keys(CHOICE_TYPE_LABELS) as CharmChoiceType[]).map(t => <option key={t} value={t}>{CHOICE_TYPE_LABELS[t]}</option>)}
        </select>
        {usesOptionList(form.choiceType) && (
          <div className="mt-1">
            <p className="text-[10px] text-stone-500 mb-0.5">{form.choiceType === 'multiselect' ? 'Benefit options' : 'Choice options (e.g. Sight, Hearing, Touch, Smell, Taste)'}</p>
            <AbilityChipInput abilities={form.choiceOptions} onChange={choiceOptions => set({ choiceOptions })} suggestions={[]} />
          </div>
        )}
        {form.choiceType === 'multiselect' && (
          <div className="mt-1.5">
            <MultiselectTargetConfig charm={form} onChange={patch => set(patch)} textInput={textInput} />
          </div>
        )}
        {supportsPickSchedule(form.choiceType) && (
          <div className="mt-1.5">
            <PickScheduleConfig pickCounts={form.pickCounts} onChange={pickCounts => set({ pickCounts })} textInput={textInput} />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300 transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name.trim()} className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1 rounded transition-colors">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

const COL_COUNT = 14
const th = 'px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-800 border-b border-stone-700 sticky top-0 z-10 whitespace-nowrap'

export default function CharmLibraryTab({ isOwner, textInput }: { isOwner: boolean; textInput: string }) {
  const [charms, setCharms] = useState<AdminCharm[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  const [typeFilter, setTypeFilter] = useState('')
  const [abilityFilter, setAbilityFilter] = useState('')
  const [search, setSearch] = useState('')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [implId, setImplId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newCharm, setNewCharm] = useState<LibraryCharm>(blankCharm())

  useEffect(() => {
    supabase.from('charm_library')
      .select('*, charm_abilities(ability), charm_modes(label, mode_text, prerequisite_essence, charm_mode_prerequisite_abilities(text)), charm_prerequisite_abilities(text), charm_prerequisite_charms(charm_name), charm_choice_options(option, sort_order), charm_target_options(option, sort_order)')
      .order('type').order('page').order('name')
      .then(({ data: rows }) => {
        if (rows) setCharms((rows as unknown as CharmLibraryRow[]).map(r => ({
          id: r.id,
          type: r.type ?? 'Universal',
          abilities: (r.charm_abilities ?? []).map(a => a.ability),
          name: r.name,
          page: r.page,
          description: r.description,
          mechanicalKey: r.mechanical_key ?? null,
          mechanicalDescription: r.mechanical_description ?? null,
          prerequisiteAbilities: (r.charm_prerequisite_abilities ?? []).map(p => p.text),
          prerequisiteEssence: r.prerequisite_essence ?? null,
          prerequisiteCharms: (r.charm_prerequisite_charms ?? []).map(p => p.charm_name),
          modes: (r.charm_modes ?? []).map(m => ({
            label: m.label,
            text: m.mode_text,
            prerequisiteEssence: m.prerequisite_essence,
            prerequisiteAbilities: (m.charm_mode_prerequisite_abilities ?? []).map(p => p.text),
          })),
          choiceType: r.choice_type ?? null,
          choiceOptions: (r.charm_choice_options ?? []).sort((a, b) => a.sort_order - b.sort_order).map(o => o.option),
          targetChoiceType: r.target_choice_type ?? null,
          targetOptions: (r.charm_target_options ?? []).sort((a, b) => a.sort_order - b.sort_order).map(o => o.option),
          multiselectCapBasis: r.multiselect_cap_basis ?? null,
          pickCounts: r.pick_counts ?? null,
          needsReview: r.needs_review,
          reviewAction: r.review_action,
        })))
        setLoaded(true)
      })
  }, [])

  async function setReviewAction(id: string, action: ReviewAction) {
    const next = charms.find(c => c.id === id)?.reviewAction === action ? null : action
    await supabase.from('charm_library').update({ review_action: next }).eq('id', id)
    setCharms(prev => prev.map(c => c.id === id ? { ...c, reviewAction: next } : c))
  }

  async function addCharm() {
    if (!newCharm.name.trim()) return
    setSaving(true)
    const { data: row } = await supabase.from('charm_library').insert({
      type: newCharm.type.trim() || 'Universal',
      name: newCharm.name.trim(),
      page: newCharm.page,
      description: newCharm.description.trim(),
      mechanical_key: newCharm.mechanicalKey || null,
      mechanical_description: newCharm.mechanicalDescription || null,
      prerequisite_essence: newCharm.prerequisiteEssence,
      choice_type: newCharm.choiceType,
      target_choice_type: newCharm.choiceType === 'multiselect' ? newCharm.targetChoiceType : null,
      multiselect_cap_basis: newCharm.choiceType === 'multiselect' ? newCharm.multiselectCapBasis : null,
      pick_counts: supportsPickSchedule(newCharm.choiceType) ? newCharm.pickCounts : null,
    }).select().single()
    if (row) {
      if (newCharm.abilities.length) {
        await supabase.from('charm_abilities').insert(newCharm.abilities.map(a => ({ charm_id: row.id, ability: a })))
      }
      if (newCharm.prerequisiteAbilities.length) {
        await supabase.from('charm_prerequisite_abilities').insert(newCharm.prerequisiteAbilities.map(text => ({ charm_id: row.id, text })))
      }
      if (newCharm.prerequisiteCharms.length) {
        await supabase.from('charm_prerequisite_charms').insert(newCharm.prerequisiteCharms.map(charm_name => ({ charm_id: row.id, charm_name })))
      }
      if (usesOptionList(newCharm.choiceType) && newCharm.choiceOptions.length) {
        await supabase.from('charm_choice_options').insert(newCharm.choiceOptions.map((option, i) => ({ charm_id: row.id, option, sort_order: i })))
      }
      if (newCharm.choiceType === 'multiselect' && newCharm.targetChoiceType === 'custom' && newCharm.targetOptions.length) {
        await supabase.from('charm_target_options').insert(newCharm.targetOptions.map((option, i) => ({ charm_id: row.id, option, sort_order: i })))
      }
      setCharms(prev => [...prev, {
        id: row.id, type: row.type ?? 'Universal', abilities: newCharm.abilities, name: row.name,
        page: row.page, description: row.description, mechanicalKey: row.mechanical_key ?? null,
        mechanicalDescription: row.mechanical_description ?? null,
        prerequisiteAbilities: newCharm.prerequisiteAbilities,
        prerequisiteEssence: row.prerequisite_essence ?? null,
        prerequisiteCharms: newCharm.prerequisiteCharms,
        modes: [] as CharmMode[],
        choiceType: row.choice_type ?? null,
        choiceOptions: usesOptionList(newCharm.choiceType) ? newCharm.choiceOptions : [],
        targetChoiceType: row.target_choice_type ?? null,
        targetOptions: newCharm.choiceType === 'multiselect' && newCharm.targetChoiceType === 'custom' ? newCharm.targetOptions : [],
        multiselectCapBasis: row.multiselect_cap_basis ?? null,
        pickCounts: row.pick_counts ?? null,
        needsReview: false,
        reviewAction: null,
      }])
    }
    setNewCharm(blankCharm())
    setAddingNew(false)
    setSaving(false)
  }

  async function saveCharm(charm: LibraryCharm) {
    setSaving(true)
    await supabase.from('charm_library').update({
      type: charm.type, name: charm.name, page: charm.page, description: charm.description,
      mechanical_key: charm.mechanicalKey || null, mechanical_description: charm.mechanicalDescription || null,
      prerequisite_essence: charm.prerequisiteEssence,
      choice_type: charm.choiceType,
      target_choice_type: charm.choiceType === 'multiselect' ? charm.targetChoiceType : null,
      multiselect_cap_basis: charm.choiceType === 'multiselect' ? charm.multiselectCapBasis : null,
      pick_counts: supportsPickSchedule(charm.choiceType) ? charm.pickCounts : null,
    }).eq('id', charm.id)
    await supabase.from('charm_abilities').delete().eq('charm_id', charm.id)
    if (charm.abilities.length) {
      await supabase.from('charm_abilities').insert(charm.abilities.map(a => ({ charm_id: charm.id, ability: a })))
    }
    await supabase.from('charm_prerequisite_abilities').delete().eq('charm_id', charm.id)
    if (charm.prerequisiteAbilities.length) {
      await supabase.from('charm_prerequisite_abilities').insert(charm.prerequisiteAbilities.map(text => ({ charm_id: charm.id, text })))
    }
    await supabase.from('charm_prerequisite_charms').delete().eq('charm_id', charm.id)
    if (charm.prerequisiteCharms.length) {
      await supabase.from('charm_prerequisite_charms').insert(charm.prerequisiteCharms.map(charm_name => ({ charm_id: charm.id, charm_name })))
    }
    await supabase.from('charm_choice_options').delete().eq('charm_id', charm.id)
    if (usesOptionList(charm.choiceType) && charm.choiceOptions.length) {
      await supabase.from('charm_choice_options').insert(charm.choiceOptions.map((option, i) => ({ charm_id: charm.id, option, sort_order: i })))
    }
    await supabase.from('charm_target_options').delete().eq('charm_id', charm.id)
    if (charm.choiceType === 'multiselect' && charm.targetChoiceType === 'custom' && charm.targetOptions.length) {
      await supabase.from('charm_target_options').insert(charm.targetOptions.map((option, i) => ({ charm_id: charm.id, option, sort_order: i })))
    }
    setCharms(prev => prev.map(c => c.id === charm.id ? { ...charm, needsReview: c.needsReview, reviewAction: c.reviewAction } : c))
    setEditingId(null)
    setSaving(false)
  }

  async function deleteCharm(id: string) {
    setSaving(true)
    await supabase.from('charm_library').delete().eq('id', id)
    setCharms(prev => prev.filter(c => c.id !== id))
    setSaving(false)
  }

  if (!loaded) return <p className="text-xs text-stone-500">Loading…</p>

  const types = [...new Set(charms.map(c => c.type || 'Universal'))].sort((a, b) => {
    const rankDiff = typeRank(a) - typeRank(b)
    if (rankDiff !== 0) return rankDiff
    return typeRank(a) === 3 ? a.localeCompare(b) : 0
  })
  const allAbilities = sortAbilities([...new Set(charms.flatMap(c => c.abilities))])
  const allPrereqAbilities = [...new Set(charms.flatMap(c => c.prerequisiteAbilities))].sort()
  const allCharmNames = [...new Set(charms.map(c => c.name))].sort()
  const abilitiesForType = sortAbilities([...new Set(
    charms.filter(c => !typeFilter || (c.type || 'Universal') === typeFilter).flatMap(c => c.abilities.map(baseAbility))
  )])
  const q = search.trim().toLowerCase()
  const filtered = charms.filter(c =>
    (!typeFilter || (c.type || 'Universal') === typeFilter) &&
    (!abilityFilter || c.abilities.some(a => baseAbility(a) === abilityFilter)) &&
    (!flaggedOnly || c.needsReview) &&
    (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.abilities.some(a => a.toLowerCase().includes(q)))
  ).sort((a, b) => {
    const rankDiff = typeRank(a.type || 'Universal') - typeRank(b.type || 'Universal')
    if (rankDiff !== 0) return rankDiff
    if (typeRank(a.type || 'Universal') === 3) {
      const typeCmp = (a.type || 'Universal').localeCompare(b.type || 'Universal')
      if (typeCmp !== 0) return typeCmp
    }
    const firstAbility = (c: LibraryCharm) => sortAbilities(c.abilities)[0] ?? ''
    const fa = firstAbility(a), fb = firstAbility(b)
    const abilityRankDiff = abilityRank(fa) - abilityRank(fb)
    if (abilityRankDiff !== 0) return abilityRankDiff
    const abilityCmp = fa.localeCompare(fb)
    if (abilityCmp !== 0) return abilityCmp
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ability, or description…" className={`${textInput} !w-1/4`} />
        {isOwner && (
          <button onClick={() => setAddingNew(true)} title="Add charm" className="text-stone-500 hover:text-amber-400 transition-colors shrink-0 text-base font-bold leading-none">
            +
          </button>
        )}
        {isOwner && (
          <label className="flex items-center gap-1.5 text-[10px] text-stone-400 cursor-pointer select-none">
            <input type="checkbox" checked={flaggedOnly} onChange={e => setFlaggedOnly(e.target.checked)} className="accent-amber-500" />
            Flagged for review only ({charms.filter(c => c.needsReview).length})
          </label>
        )}
      </div>

      {addingNew && isOwner && (
        <ModalPortal onClose={() => setAddingNew(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setAddingNew(false)}>
            <div className="bg-stone-900 border border-stone-700 rounded-xl w-[480px] max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
                <span className="text-sm font-semibold text-amber-400">New Charm</span>
                <button onClick={() => setAddingNew(false)} title="Close" className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
              </div>
              <div className="px-4 py-3 space-y-2 overflow-y-auto">
                <input value={newCharm.type} onChange={e => setNewCharm(f => ({ ...f, type: e.target.value }))} placeholder="Type (Universal, Solar, Lunar, …)…" list="charm-type-options" className={textInput} />
                <AbilityChipInput abilities={newCharm.abilities} onChange={abilities => setNewCharm(f => ({ ...f, abilities }))} suggestions={allAbilities} />
                <input value={newCharm.name} onChange={e => setNewCharm(f => ({ ...f, name: e.target.value }))} placeholder="Name…" className={textInput} />
                <div>
                  <p className="text-[10px] text-stone-500 mb-0.5">Prerequisite abilities (e.g. "Integrity 2")</p>
                  <AbilityChipInput abilities={newCharm.prerequisiteAbilities} onChange={prerequisiteAbilities => setNewCharm(f => ({ ...f, prerequisiteAbilities }))} suggestions={allPrereqAbilities} />
                </div>
                <div>
                  <p className="text-[10px] text-stone-500 mb-0.5">Prerequisite charms</p>
                  <AbilityChipInput abilities={newCharm.prerequisiteCharms} onChange={prerequisiteCharms => setNewCharm(f => ({ ...f, prerequisiteCharms }))} suggestions={allCharmNames} />
                </div>
                <input type="number" value={newCharm.prerequisiteEssence ?? ''} onChange={e => setNewCharm(f => ({ ...f, prerequisiteEssence: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Prerequisite Essence…" className={textInput} />
                <input type="number" value={newCharm.page ?? ''} onChange={e => setNewCharm(f => ({ ...f, page: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Page…" className={textInput} />
                <textarea value={newCharm.description} onChange={e => setNewCharm(f => ({ ...f, description: e.target.value }))} placeholder="Description…" rows={3} className={`${textInput} resize-none`} />
                <input value={newCharm.mechanicalKey ?? ''} onChange={e => setNewCharm(f => ({ ...f, mechanicalKey: e.target.value || null }))} placeholder="Mechanical key (optional, e.g. foi)…" className={textInput} />
                <textarea value={newCharm.mechanicalDescription ?? ''} onChange={e => setNewCharm(f => ({ ...f, mechanicalDescription: e.target.value || null }))} placeholder="Mechanical implementation description (optional)…" rows={2} className={`${textInput} resize-none`} />
                <div>
                  <p className="text-[10px] text-stone-500 mb-0.5">Purchase choice (optional — a pick required each time the charm is bought)</p>
                  <select
                    value={newCharm.choiceType ?? ''}
                    onChange={e => setNewCharm(f => ({ ...f, choiceType: (e.target.value || null) as CharmChoiceType | null, choiceOptions: usesOptionList(e.target.value as CharmChoiceType) ? f.choiceOptions : [] }))}
                    className={textInput}
                  >
                    <option value="">None</option>
                    {(Object.keys(CHOICE_TYPE_LABELS) as CharmChoiceType[]).map(t => <option key={t} value={t}>{CHOICE_TYPE_LABELS[t]}</option>)}
                  </select>
                  {usesOptionList(newCharm.choiceType) && (
                    <div className="mt-1">
                      <p className="text-[10px] text-stone-500 mb-0.5">{newCharm.choiceType === 'multiselect' ? 'Benefit options' : 'Choice options (e.g. Sight, Hearing, Touch, Smell, Taste)'}</p>
                      <AbilityChipInput abilities={newCharm.choiceOptions} onChange={choiceOptions => setNewCharm(f => ({ ...f, choiceOptions }))} suggestions={[]} />
                    </div>
                  )}
                  {newCharm.choiceType === 'multiselect' && (
                    <div className="mt-1.5">
                      <MultiselectTargetConfig charm={newCharm} onChange={patch => setNewCharm(f => ({ ...f, ...patch }))} textInput={textInput} />
                    </div>
                  )}
                  {supportsPickSchedule(newCharm.choiceType) && (
                    <div className="mt-1.5">
                      <PickScheduleConfig pickCounts={newCharm.pickCounts} onChange={pickCounts => setNewCharm(f => ({ ...f, pickCounts }))} textInput={textInput} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end px-4 py-3 border-t border-stone-800 shrink-0">
                <button onClick={addCharm} disabled={saving || !newCharm.name.trim()} className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1 rounded transition-colors">
                  {saving ? 'Saving…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="rounded-lg border border-stone-700 overflow-auto max-h-[70vh] w-fit max-w-full">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className={th}>Name</th>
              <th className={th}>
                <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setAbilityFilter('') }} className="bg-stone-900 border border-stone-700 text-stone-300 rounded px-1 py-0.5 text-[10px] font-normal normal-case tracking-normal focus:outline-none focus:border-amber-500">
                  <option value="">Type</option>
                  {types.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </th>
              <th className={th}>
                <select value={abilityFilter} onChange={e => setAbilityFilter(e.target.value)} className="bg-stone-900 border border-stone-700 text-stone-300 rounded px-1 py-0.5 text-[10px] font-normal normal-case tracking-normal focus:outline-none focus:border-amber-500">
                  <option value="">Ability</option>
                  {abilitiesForType.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </th>
              <th className={th}>Prereq. Ability</th>
              <th className={th}>Prereq. Charms</th>
              <th className={th}>Prereq. Ess.</th>
              <th className={th}>Page</th>
              <th className={th}>Modes</th>
              <th className={th}>Impl</th>
              <th className={th}>Free Text</th>
              <th className={th}>Set List</th>
              <th className={th}>Ask Admin</th>
              <th className={th}>No Action</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={COL_COUNT} className="px-3 py-2 text-stone-600">No charms found.</td></tr>
            )}
            {filtered.map(charm => {
              const isExpanded = expandedId === charm.id
              const isImplOpen = implId === charm.id
              const isEditing = editingId === charm.id && isOwner
              const uniqueModes = [...new Map(charm.modes.map(m => [m.label, m])).values()]

              if (isEditing) {
                return (
                  <tr key={charm.id}>
                    <td colSpan={COL_COUNT} className="p-0">
                      <EditCharmRow
                        charm={charm}
                        onSave={saveCharm}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                        textInput={textInput}
                        abilitySuggestions={allAbilities}
                        charmNameSuggestions={allCharmNames}
                        prereqAbilitySuggestions={allPrereqAbilities}
                      />
                    </td>
                  </tr>
                )
              }

              return (
                <Fragment key={charm.id}>
                  <tr
                    onClick={() => setExpandedId(isExpanded ? null : charm.id)}
                    className="border-b border-stone-800 align-top cursor-pointer hover:bg-stone-800/50"
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className="text-left font-semibold text-stone-100">
                        {charm.name}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400">{charm.type || 'Universal'}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {charm.abilities.map(a => (
                          <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400 whitespace-nowrap">{a}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        {charm.prerequisiteAbilities.length === 0 && <span className="text-stone-600">—</span>}
                        {charm.prerequisiteAbilities.map((p, i) => (
                          <span key={i} className="text-stone-500 leading-tight">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        {charm.prerequisiteCharms.length === 0 && <span className="text-stone-600">—</span>}
                        {charm.prerequisiteCharms.map((p, i) => (
                          <span key={i} className="text-stone-500 leading-tight">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-stone-500 whitespace-nowrap">{charm.prerequisiteEssence ?? '—'}</td>
                    <td className="px-3 py-1.5 text-stone-500 whitespace-nowrap">{charm.page ? `p.${charm.page}` : '—'}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <div className="flex flex-nowrap gap-1">
                        {uniqueModes.map(m => {
                          const icon = modeIcon(m.label)
                          return (
                            <span key={m.label} title={icon.title} className="text-stone-400 cursor-default shrink-0">{icon.glyph}</span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <button
                        onClick={e => { e.stopPropagation(); setImplId(isImplOpen ? null : charm.id) }}
                        title={charm.mechanicalKey ? 'Has mechanical implementation' : 'No mechanical implementation'}
                        className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${charm.mechanicalKey ? 'bg-amber-900/40 border-amber-700/50 text-amber-400' : 'bg-stone-800 border-stone-700 text-stone-600'}`}
                      >
                        ⚙
                      </button>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {isOwner && charm.needsReview && (
                        <button
                          onClick={e => { e.stopPropagation(); setReviewAction(charm.id, 'freetext') }}
                          className={`w-6 h-6 rounded border transition-colors ${charm.reviewAction === 'freetext' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-500 hover:border-amber-500'}`}
                          title="Mark as a free-text choice"
                        >
                          T
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {isOwner && charm.needsReview && (
                        <button
                          onClick={e => { e.stopPropagation(); setReviewAction(charm.id, 'set_list') }}
                          className={`w-6 h-6 rounded border transition-colors ${charm.reviewAction === 'set_list' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-500 hover:border-amber-500'}`}
                          title="Mark as needing a generated choice list"
                        >
                          ☰
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {isOwner && charm.needsReview && (
                        <button
                          onClick={e => { e.stopPropagation(); setReviewAction(charm.id, 'ask_admin') }}
                          className={`w-6 h-6 rounded border transition-colors ${charm.reviewAction === 'ask_admin' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-500 hover:border-amber-500'}`}
                          title="Park for manual case-by-case review"
                        >
                          ?
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {isOwner && charm.needsReview && (
                        <button
                          onClick={e => { e.stopPropagation(); setReviewAction(charm.id, 'no_action') }}
                          className={`w-6 h-6 rounded border transition-colors ${charm.reviewAction === 'no_action' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-stone-800 border-stone-700 text-stone-500 hover:border-amber-500'}`}
                          title="No choice needed — false positive from the scan"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {isOwner && (
                        <div className="flex gap-2 justify-end">
                          <button onClick={e => { e.stopPropagation(); setEditingId(charm.id) }} title="Edit" className="text-stone-600 hover:text-amber-400 transition-colors">✎</button>
                          <button onClick={e => { e.stopPropagation(); deleteCharm(charm.id) }} title="Delete" className="text-stone-600 hover:text-red-400 transition-colors">✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-stone-800">
                      <td colSpan={COL_COUNT} className="px-3 pt-2 pb-3 w-px space-y-3">
                        <p className="text-xs text-stone-400 leading-relaxed whitespace-normal">{charm.description}</p>
                        {charm.choiceType && (
                          <p className="text-xs text-stone-500">
                            Purchase choice: <span className="text-amber-400">{CHOICE_TYPE_LABELS[charm.choiceType]}</span>
                            {usesOptionList(charm.choiceType) && charm.choiceOptions.length > 0 && (
                              <span> — {charm.choiceOptions.join(', ')}</span>
                            )}
                          </p>
                        )}
                        {sortModes(charm.modes).map((m, i) => (
                          <div key={`${m.label}-${i}`}>
                            <p className="text-xs font-bold text-amber-400 flex items-center gap-1">
                              <span>{modeIcon(m.label).glyph}</span>
                              {m.label}
                            </p>
                            <p className="text-xs text-stone-400 leading-relaxed whitespace-normal">{m.text}</p>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                  {isImplOpen && (
                    <tr className="border-b border-stone-800">
                      <td colSpan={COL_COUNT} className="px-3 pt-2 pb-3 space-y-1 w-px">
                        {charm.mechanicalKey ? (
                          <>
                            <p className="text-xs text-amber-400">Key: <code>{charm.mechanicalKey}</code></p>
                            <p className="text-xs text-stone-400 leading-relaxed">
                              {charm.mechanicalDescription || <em className="text-stone-600">No description set.</em>}
                            </p>
                          </>
                        ) : <p className="text-xs text-stone-600">No mechanical implementation.</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
