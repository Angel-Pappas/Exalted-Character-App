import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CharmMode, LibraryCharm } from '../types/character'
import AbilityChipInput from './AbilityChipInput'

interface CharmAbilityRow { ability: string }
interface CharmModeRow { label: string; mode_text: string | null }
interface CharmPrereqAbilityRow { text: string }
interface CharmPrereqCharmRow { charm_name: string }
interface CharmLibraryRow {
  id: string
  type: string | null
  name: string
  page: number | null
  description: string
  mechanical_key: string | null
  mechanical_description: string | null
  prerequisite_essence: number | null
  charm_abilities: CharmAbilityRow[]
  charm_modes: CharmModeRow[]
  charm_prerequisite_abilities: CharmPrereqAbilityRow[]
  charm_prerequisite_charms: CharmPrereqCharmRow[]
}

function blankCharm(): LibraryCharm {
  return {
    id: '', type: 'Universal', abilities: [], name: '', page: null, description: '',
    mechanicalKey: null, mechanicalDescription: null, prerequisiteAbilities: [],
    prerequisiteEssence: null, prerequisiteCharms: [], modes: [],
  }
}

// A distinct glyph per mode label, so a row with several different Exalt-type
// variants (e.g. Solar, Lunar, Dragon-Blooded) reads as different icons at a
// glance, not a row of identical marks. Falls back to a generic diamond for
// anything unrecognized (one-off labels like a specific charm name).
const MODE_ICONS: Record<string, string> = {
  upgrade: '↑',
  repurchase: '↻',
  solar: '☀',
  lunar: '☾',
  sidereal: '✦',
  abyssal: '☠',
  infernal: '♨',
  liminal: '⚰',
  alchemical: '⚛',
  getimian: '⏣',
  'dragon-blooded': '☉',
  janest: '✿',
  earth: '⛰',
  fire: '🔥',
  water: '💧',
  wood: '🌳',
  air: '🌬',
}

function modeIcon(label: string): { glyph: string; title: string } {
  const glyph = MODE_ICONS[label.toLowerCase()] ?? '◆'
  return { glyph, title: label }
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
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300 transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name.trim()} className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1 rounded transition-colors">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// Fixed widths sized to fit the longest content per column (Name up to 38
// chars, Modes up to 11 icons, etc.) so nothing wraps or hides. The table is
// wider than most viewports as a result — that's fine, the page's own
// overflow-auto container scrolls it horizontally as a single scrollbar.
const GRID_COLS = 'grid-cols-[16rem_7rem_10rem_8rem_10rem_4rem_3.5rem_10rem_2.5rem_4rem]'

export default function CharmLibraryTab({ isOwner, textInput }: { isOwner: boolean; textInput: string }) {
  const [charms, setCharms] = useState<LibraryCharm[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  const [typeFilter, setTypeFilter] = useState('')
  const [abilityFilter, setAbilityFilter] = useState('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [implId, setImplId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [newCharm, setNewCharm] = useState<LibraryCharm>(blankCharm())

  useEffect(() => {
    supabase.from('charm_library')
      .select('*, charm_abilities(ability), charm_modes(label, mode_text), charm_prerequisite_abilities(text), charm_prerequisite_charms(charm_name)')
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
          modes: (r.charm_modes ?? []).map(m => ({ label: m.label, text: m.mode_text })),
        })))
        setLoaded(true)
      })
  }, [])

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
      setCharms(prev => [...prev, {
        id: row.id, type: row.type ?? 'Universal', abilities: newCharm.abilities, name: row.name,
        page: row.page, description: row.description, mechanicalKey: row.mechanical_key ?? null,
        mechanicalDescription: row.mechanical_description ?? null,
        prerequisiteAbilities: newCharm.prerequisiteAbilities,
        prerequisiteEssence: row.prerequisite_essence ?? null,
        prerequisiteCharms: newCharm.prerequisiteCharms,
        modes: [] as CharmMode[],
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
    setCharms(prev => prev.map(c => c.id === charm.id ? charm : c))
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

  const types = [...new Set(charms.map(c => c.type || 'Universal'))].sort()
  const allAbilities = [...new Set(charms.flatMap(c => c.abilities))].sort()
  const allPrereqAbilities = [...new Set(charms.flatMap(c => c.prerequisiteAbilities))].sort()
  const allCharmNames = [...new Set(charms.map(c => c.name))].sort()
  const abilitiesForType = [...new Set(
    charms.filter(c => !typeFilter || (c.type || 'Universal') === typeFilter).flatMap(c => c.abilities)
  )].sort()
  const q = search.trim().toLowerCase()
  const filtered = charms.filter(c =>
    (!typeFilter || (c.type || 'Universal') === typeFilter) &&
    (!abilityFilter || c.abilities.includes(abilityFilter)) &&
    (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.abilities.some(a => a.toLowerCase().includes(q)))
  )

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, ability, or description…" className={`${textInput} flex-1`} />
        {isOwner && (
          <button onClick={() => setAddingNew(v => !v)} className="text-xs text-stone-500 hover:text-amber-400 transition-colors shrink-0">
            {addingNew ? 'Cancel' : '+ charm'}
          </button>
        )}
      </div>

      {addingNew && isOwner && (
        <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-400">New Charm</p>
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
          <div className="flex justify-end">
            <button onClick={addCharm} disabled={saving || !newCharm.name.trim()} className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1 rounded transition-colors">
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-stone-700 overflow-x-auto">
        <div className="w-max min-w-full">
        <div className={`grid ${GRID_COLS} gap-2 px-3 py-1.5 bg-stone-800 border-b border-stone-700 items-center rounded-t-lg`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Name</span>
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setAbilityFilter('') }} className="bg-stone-900 border border-stone-700 text-stone-300 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:border-amber-500">
            <option value="">Type</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={abilityFilter} onChange={e => setAbilityFilter(e.target.value)} className="bg-stone-900 border border-stone-700 text-stone-300 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:border-amber-500">
            <option value="">Ability</option>
            {abilitiesForType.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Prereq. Ability</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Prereq. Charms</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Prereq. Ess.</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Page</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Modes</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Impl</span>
          <span />
        </div>

        {filtered.length === 0 && <p className="text-xs text-stone-600 px-3 py-2">No charms found.</p>}

        <div className="divide-y divide-stone-800 max-h-[70vh] overflow-y-auto overflow-x-visible">
          {filtered.map(charm => {
            const isExpanded = expandedId === charm.id
            const isImplOpen = implId === charm.id
            const isEditing = editingId === charm.id && isOwner
            const uniqueModes = [...new Map(charm.modes.map(m => [m.label, m])).values()]

            if (isEditing) {
              return (
                <EditCharmRow
                  key={charm.id}
                  charm={charm}
                  onSave={saveCharm}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                  textInput={textInput}
                  abilitySuggestions={allAbilities}
                  charmNameSuggestions={allCharmNames}
                  prereqAbilitySuggestions={allPrereqAbilities}
                />
              )
            }

            return (
              <div key={charm.id}>
                <div className={`grid ${GRID_COLS} gap-2 px-3 py-1.5 items-start text-xs`}>
                  <button onClick={() => setExpandedId(isExpanded ? null : charm.id)} className="text-left font-semibold text-stone-100 hover:text-amber-400 transition-colors whitespace-nowrap">
                    {charm.name}
                  </button>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400 w-fit">{charm.type || 'Universal'}</span>
                  <div className="flex flex-wrap gap-1">
                    {charm.abilities.map(a => (
                      <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400">{a}</span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {charm.prerequisiteAbilities.length === 0 && <span className="text-stone-600">—</span>}
                    {charm.prerequisiteAbilities.map((p, i) => (
                      <span key={i} className="text-stone-500 leading-tight">{p}</span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {charm.prerequisiteCharms.length === 0 && <span className="text-stone-600">—</span>}
                    {charm.prerequisiteCharms.map((p, i) => (
                      <span key={i} className="text-stone-500 leading-tight">{p}</span>
                    ))}
                  </div>
                  <span className="text-stone-500">{charm.prerequisiteEssence ?? '—'}</span>
                  <span className="text-stone-500">{charm.page ? `p.${charm.page}` : '—'}</span>
                  <div className="flex flex-nowrap gap-1">
                    {uniqueModes.map(m => {
                      const icon = modeIcon(m.label)
                      return (
                        <span key={m.label} title={icon.title} className="text-stone-400 cursor-default shrink-0">{icon.glyph}</span>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setImplId(isImplOpen ? null : charm.id)}
                    title={charm.mechanicalKey ? 'Has mechanical implementation' : 'No mechanical implementation'}
                    className={`w-6 h-6 flex items-center justify-center rounded border transition-colors ${charm.mechanicalKey ? 'bg-amber-900/40 border-amber-700/50 text-amber-400' : 'bg-stone-800 border-stone-700 text-stone-600'}`}
                  >
                    ⚙
                  </button>
                  {isOwner ? (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(charm.id)} className="text-stone-600 hover:text-amber-400 transition-colors">edit</button>
                      <button onClick={() => deleteCharm(charm.id)} className="text-stone-600 hover:text-red-400 transition-colors">✕</button>
                    </div>
                  ) : <span />}
                </div>
                {isExpanded && (
                  <div className="px-3 pt-2 pb-3 mt-1 border-t border-stone-800/70">
                    <p className="text-xs text-stone-400 leading-relaxed">{charm.description}</p>
                  </div>
                )}
                {isImplOpen && (
                  <div className="px-3 pt-2 pb-3 mt-1 border-t border-stone-800/70 space-y-1">
                    {charm.mechanicalKey ? (
                      <>
                        <p className="text-xs text-amber-400">Key: <code>{charm.mechanicalKey}</code></p>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          {charm.mechanicalDescription || <em className="text-stone-600">No description set.</em>}
                        </p>
                      </>
                    ) : <p className="text-xs text-stone-600">No mechanical implementation.</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        </div>
      </div>
    </div>
  )
}
