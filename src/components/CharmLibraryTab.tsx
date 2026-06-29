import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { LibraryCharm } from '../types/character'
import AbilityChipInput from './AbilityChipInput'

interface CharmAbilityRow { ability: string }
interface CharmLibraryRow {
  id: string
  type: string | null
  name: string
  page: number | null
  description: string
  mechanical_key: string | null
  mechanical_description: string | null
  charm_abilities: CharmAbilityRow[]
}

function blankCharm(): LibraryCharm {
  return { id: '', type: 'Universal', abilities: [], name: '', page: null, description: '', mechanicalKey: null, mechanicalDescription: null }
}

function EditCharmRow({ charm, onSave, onCancel, saving, textInput, suggestions }: {
  charm: LibraryCharm
  onSave: (c: LibraryCharm) => void
  onCancel: () => void
  saving: boolean
  textInput: string
  suggestions: string[]
}) {
  const [form, setForm] = useState({ ...charm })
  const set = (patch: Partial<LibraryCharm>) => setForm(f => ({ ...f, ...patch }))
  return (
    <div className="px-3 py-2 space-y-1.5 bg-stone-800/50">
      <input value={form.type} onChange={e => set({ type: e.target.value })} placeholder="Type (Universal, Solar, Lunar, …)…" list="charm-type-options" className={textInput} />
      <AbilityChipInput abilities={form.abilities} onChange={abilities => set({ abilities })} suggestions={suggestions} />
      <input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Name…" className={textInput} />
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
    supabase.from('charm_library').select('*, charm_abilities(ability)').order('type').order('page').order('name')
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
    }).select().single()
    if (row) {
      if (newCharm.abilities.length) {
        await supabase.from('charm_abilities').insert(newCharm.abilities.map(a => ({ charm_id: row.id, ability: a })))
      }
      setCharms(prev => [...prev, {
        id: row.id, type: row.type ?? 'Universal', abilities: newCharm.abilities, name: row.name,
        page: row.page, description: row.description, mechanicalKey: row.mechanical_key ?? null,
        mechanicalDescription: row.mechanical_description ?? null,
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
    }).eq('id', charm.id)
    await supabase.from('charm_abilities').delete().eq('charm_id', charm.id)
    if (charm.abilities.length) {
      await supabase.from('charm_abilities').insert(charm.abilities.map(a => ({ charm_id: charm.id, ability: a })))
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
    <div className="max-w-4xl space-y-3">
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

      <div className="rounded-lg border border-stone-700 overflow-hidden">
        <div className="grid grid-cols-[7rem_1fr_1fr_3.5rem_2.5rem_3.5rem] gap-2 px-3 py-1.5 bg-stone-800 border-b border-stone-700 items-center">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setAbilityFilter('') }} className="bg-stone-900 border border-stone-700 text-stone-300 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:border-amber-500">
            <option value="">Type</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={abilityFilter} onChange={e => setAbilityFilter(e.target.value)} className="bg-stone-900 border border-stone-700 text-stone-300 rounded px-1 py-0.5 text-[10px] focus:outline-none focus:border-amber-500">
            <option value="">Ability</option>
            {abilitiesForType.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Name</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Page</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Impl</span>
          <span />
        </div>

        {filtered.length === 0 && <p className="text-xs text-stone-600 px-3 py-2">No charms found.</p>}

        <div className="divide-y divide-stone-800 max-h-[70vh] overflow-auto">
          {filtered.map(charm => {
            const isExpanded = expandedId === charm.id
            const isImplOpen = implId === charm.id
            const isEditing = editingId === charm.id && isOwner

            if (isEditing) {
              return (
                <EditCharmRow
                  key={charm.id}
                  charm={charm}
                  onSave={saveCharm}
                  onCancel={() => setEditingId(null)}
                  saving={saving}
                  textInput={textInput}
                  suggestions={allAbilities}
                />
              )
            }

            return (
              <div key={charm.id}>
                <div className="grid grid-cols-[7rem_1fr_1fr_3.5rem_2.5rem_3.5rem] gap-2 px-3 py-1.5 items-center text-xs">
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400 w-fit">{charm.type || 'Universal'}</span>
                  <div className="flex flex-wrap gap-1">
                    {charm.abilities.map(a => (
                      <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400">{a}</span>
                    ))}
                  </div>
                  <button onClick={() => setExpandedId(isExpanded ? null : charm.id)} className="text-left font-semibold text-stone-100 hover:text-amber-400 transition-colors truncate">
                    {charm.name}
                  </button>
                  <span className="text-stone-500">{charm.page ? `p.${charm.page}` : '—'}</span>
                  <button
                    onClick={() => setImplId(isImplOpen ? null : charm.id)}
                    className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${charm.mechanicalKey ? 'bg-amber-900/40 border-amber-700/50 text-amber-400' : 'bg-stone-800 border-stone-700 text-stone-600'}`}
                  >
                    {charm.mechanicalKey ? 'Impl' : '—'}
                  </button>
                  {isOwner ? (
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(charm.id)} className="text-stone-600 hover:text-amber-400 transition-colors">edit</button>
                      <button onClick={() => deleteCharm(charm.id)} className="text-stone-600 hover:text-red-400 transition-colors">✕</button>
                    </div>
                  ) : <span />}
                </div>
                {isExpanded && (
                  <div className="px-3 pb-2 -mt-1">
                    <p className="text-xs text-stone-400 leading-relaxed">{charm.description}</p>
                  </div>
                )}
                {isImplOpen && (
                  <div className="px-3 pb-2 -mt-1 space-y-1">
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
  )
}
