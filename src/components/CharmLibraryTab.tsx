import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import type { CharmMode, LibraryCharm } from '../types/character'
import AbilityChipInput from './AbilityChipInput'

function ModalPortal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body)
}

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

function baseAbility(ability: string): string {
  return ability.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

function modeRank(label: string): number {
  const lower = label.toLowerCase()
  if (lower === 'upgrade') return 0
  if (lower === 'repurchase') return 1
  if (lower === 'solar') return 2
  return 3
}

function sortModes(modes: CharmMode[]): CharmMode[] {
  return [...modes].sort((a, b) => {
    const rankDiff = modeRank(a.label) - modeRank(b.label)
    if (rankDiff !== 0) return rankDiff
    return modeRank(a.label) === 3 ? a.label.localeCompare(b.label) : 0
  })
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

const COL_COUNT = 10
const th = 'px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-stone-400 bg-stone-800 border-b border-stone-700 sticky top-0 z-10 whitespace-nowrap'

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

  const typeRank = (t: string) => {
    const lower = t.toLowerCase()
    if (lower === 'universal') return 0
    if (lower === 'solar') return 1
    if (lower === 'martial arts') return 2
    return 3
  }
  const types = [...new Set(charms.map(c => c.type || 'Universal'))].sort((a, b) => {
    const rankDiff = typeRank(a) - typeRank(b)
    if (rankDiff !== 0) return rankDiff
    return typeRank(a) === 3 ? a.localeCompare(b) : 0
  })
  const sortAbilities = (abilities: string[]) => [...abilities].sort((a, b) => {
    const aStyle = a.includes('Style')
    const bStyle = b.includes('Style')
    if (aStyle !== bStyle) return aStyle ? 1 : -1
    return a.localeCompare(b)
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
    (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.abilities.some(a => a.toLowerCase().includes(q)))
  ).sort((a, b) => {
    const rankDiff = typeRank(a.type || 'Universal') - typeRank(b.type || 'Universal')
    if (rankDiff !== 0) return rankDiff
    if (typeRank(a.type || 'Universal') === 3) {
      const typeCmp = (a.type || 'Universal').localeCompare(b.type || 'Universal')
      if (typeCmp !== 0) return typeCmp
    }
    const firstAbility = (c: LibraryCharm) => [...c.abilities].sort()[0] ?? ''
    const abilityCmp = firstAbility(a).localeCompare(firstAbility(b))
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
      </div>

      {addingNew && isOwner && (
        <ModalPortal>
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
