import { useState, useRef, useEffect } from 'react' // useState used by CharmPanel and other local state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { GridLayout, useContainerWidth, noCompactor } from 'react-grid-layout'
// noCompactor has allowOverlap:false which causes panels to push each other during drag.
// Override it so panels can freely overlap — no collision resolution, no compaction.
const freeCompactor = { ...noCompactor, allowOverlap: true }
import 'react-grid-layout/css/styles.css'
import type { SheetData, FoiState, AbilityData, MeritEntry, IntimacyEntry, HealthBox, PanelLayout, CharacterCharm, EffectCategory, EffectEntry, InventoryItem, InventoryItemKind, WeaponWeight, ArtifactColor, GameData } from '../types/character'
import { DEFAULT_GAME_DATA } from '../types/character'

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

const DEFAULT_HEALTH: HealthBox[] = [
  { penalty: '-0', checked: false },
  { penalty: '-1', checked: false },
  { penalty: '-1', checked: false },
  { penalty: '-2', checked: false },
  { penalty: '-2', checked: false },
  { penalty: '-4', checked: false },
  { penalty: 'Incap', checked: false },
]

const DEFAULT_LAYOUT: PanelLayout[] = [
  { i: 'attributes', x: 0,  y: 0,  w: 16, h: 22, minW: 4, minH: 8 },
  { i: 'abilities',  x: 0,  y: 22, w: 16, h: 38, minW: 4, minH: 8 },
  { i: 'defenses',   x: 16, y: 0,  w: 16, h: 12, minW: 4, minH: 8 },
  { i: 'essence',    x: 16, y: 12, w: 16, h: 6,  minW: 4, minH: 6 },
  { i: 'motes',      x: 16, y: 18, w: 16, h: 10, minW: 4, minH: 8 },
  { i: 'anima',      x: 16, y: 28, w: 16, h: 10, minW: 4, minH: 8 },
  { i: 'health',     x: 16, y: 38, w: 16, h: 8,  minW: 4, minH: 8 },
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
    defenseBonus: { parry: 0, evasion: 0, soak: 0, hardness: 0, resolve: 0 },
    languages: [], merits: [], intimacies: [],
    motes: { current: 0, committed: 0, total: 0 },
    health: DEFAULT_HEALTH.map(h => ({ ...h })),
    layout: DEFAULT_LAYOUT.map(l => ({ ...l })),
    charms: [],
    effects: [],
    inventory: [],
    foi: { active: false, weight: null, tag: null, artifact: false },
    foiOriginals: {},
  }
}

interface Props {
  sheet: SheetData
  editMode: boolean
  onChange: (sheet: SheetData) => void
  gameData?: GameData
}

function SectionHeader({ title }: { title: string }) {
  return <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">{title}</div>
}

const inputCls = "w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500"
const inputActive = "w-full bg-stone-800 border border-amber-500 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none"

function CharmBrowseModal({ existing, onAdd, onClose }: {
  existing: import('../types/character').CharacterCharm[]
  onAdd: (charm: import('../types/character').LibraryCharm) => void
  onClose: () => void
}) {
  const [library, setLibrary] = useState<import('../types/character').LibraryCharm[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const existingIds = new Set(existing.map(c => c.libraryId))

  useEffect(() => {
    import('../lib/supabase').then(({ supabase }) =>
      supabase.from('charm_library').select('*').order('ability').order('sort_order').order('name')
        .then(({ data }) => {
          if (data) setLibrary(data.map((r: any) => ({ id: r.id, ability: r.ability, name: r.name, description: r.description, mechanicalKey: r.mechanical_key ?? null, sort_order: r.sort_order })))
          setLoading(false)
        })
    )
  }, [])

  const filtered = library.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.ability.toLowerCase().includes(search.toLowerCase())
  )
  const abilities = [...new Set(filtered.map(c => c.ability))].sort()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-stone-900 border border-stone-700 rounded-xl w-[480px] max-h-[80vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
          <span className="text-sm font-semibold text-amber-400">Add Charm</span>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
        </div>
        <div className="px-4 py-2 border-b border-stone-800 shrink-0">
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search charms…"
            className="w-full bg-stone-800 border border-stone-700 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500" />
        </div>
        <div className="overflow-y-auto flex-1 no-scrollbar">
          {loading && <p className="text-xs text-stone-500 p-4">Loading…</p>}
          {!loading && filtered.length === 0 && <p className="text-xs text-stone-500 p-4">No charms found.</p>}
          {abilities.map(ability => (
            <div key={ability || '__none__'}>
              <div className="px-4 py-1.5 bg-stone-800/50 border-b border-stone-700/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">{ability || 'General'}</span>
              </div>
              {filtered.filter(c => c.ability === ability).map(charm => {
                const owned = existingIds.has(charm.id)
                return (
                  <div key={charm.id} className={`px-4 py-2 border-b border-stone-800 last:border-0 ${owned ? 'opacity-40' : 'hover:bg-stone-800/40'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-stone-100">{charm.name}</span>
                          {charm.mechanicalKey && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-900/40 border border-amber-700/50 text-amber-400">{charm.mechanicalKey}</span>}
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5 leading-relaxed line-clamp-2">{charm.description}</p>
                      </div>
                      {!owned && (
                        <button onClick={() => onAdd(charm)} className="shrink-0 text-xs bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded transition-colors">Add</button>
                      )}
                      {owned && <span className="shrink-0 text-xs text-stone-600">Added</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CharmPanel({ charms, onChange }: {
  charms: import('../types/character').CharacterCharm[]
  onChange: (c: import('../types/character').CharacterCharm[]) => void
}) {
  const [browsing, setBrowsing] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')

  function addCharm(lib: import('../types/character').LibraryCharm) {
    onChange([...charms, {
      id: crypto.randomUUID(),
      libraryId: lib.id,
      name: lib.name,
      libraryMechanicalKey: lib.mechanicalKey,
      customDescription: null,
      mechanicalKeyOverride: null,
      mechanicalEnabled: true,
    }])
  }

  function removeCharm(id: string) {
    onChange(charms.filter(c => c.id !== id))
    setExpandedIds(s => { const n = new Set(s); n.delete(id); return n })
  }

  function startEdit(charm: import('../types/character').CharacterCharm, libraryDesc: string) {
    setEditingId(charm.id)
    setEditDesc(charm.customDescription ?? libraryDesc)
  }

  function saveEdit(charm: import('../types/character').CharacterCharm) {
    onChange(charms.map(c => c.id === charm.id ? { ...c, customDescription: editDesc.trim() || null } : c))
    setEditingId(null)
  }

  function revert(id: string) {
    onChange(charms.map(c => c.id === id ? { ...c, customDescription: null } : c))
  }

  function toggleMechanical(id: string) {
    onChange(charms.map(c => c.id === id ? { ...c, mechanicalEnabled: !c.mechanicalEnabled } : c))
  }

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col">
      {browsing && <CharmBrowseModal existing={charms} onAdd={charm => { addCharm(charm); }} onClose={() => setBrowsing(false)} />}

      <div className="flex items-center justify-between mb-2 shrink-0">
        <SectionHeader title="Charms" />
        <button onClick={() => setBrowsing(true)} className="text-stone-500 hover:text-amber-400 transition-colors text-xs">+ add</button>
      </div>

      <div className="space-y-px overflow-y-auto no-scrollbar flex-1">
        {charms.length === 0 && <p className="text-xs text-stone-500">No charms. Click + add to browse the library.</p>}
        {charms.map(charm => (
          <div key={charm.id} className="rounded border border-stone-700/50">
            {/* Row */}
            <div className="flex items-center gap-1 px-1.5 py-1 text-xs">
              <button onClick={() => setExpandedIds(s => { const n = new Set(s); n.has(charm.id) ? n.delete(charm.id) : n.add(charm.id); return n })}
                className="text-left text-stone-200 hover:text-amber-300 transition-colors flex-1 min-w-0 truncate">
                {charm.name}
              </button>
              {charm.customDescription !== null && (
                <span title="Customized" className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
              {(charm.mechanicalKeyOverride ?? null) !== null || charms.find(c => c.id === charm.id)?.mechanicalEnabled !== undefined ? null : null}
              <button onClick={() => removeCharm(charm.id)} className="text-stone-600 hover:text-red-400 transition-colors shrink-0">✕</button>
            </div>

            {/* Expanded */}
            {expandedIds.has(charm.id) && (
              <div className="border-t border-stone-800 px-1.5 pb-1.5 pt-1 space-y-1.5">
                {editingId === charm.id ? (
                  <>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4}
                      className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 resize-none" />
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => saveEdit(charm)} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-stone-400 leading-relaxed whitespace-pre-wrap">
                      {charm.customDescription ?? <em className="text-stone-600">No description loaded — library text shown in browse.</em>}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => startEdit(charm, charm.customDescription ?? '')} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">edit</button>
                      {charm.customDescription !== null && (
                        <button onClick={() => revert(charm.id)} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">revert to original</button>
                      )}
                      {(charm.mechanicalKeyOverride ?? null) !== null || charm.mechanicalEnabled !== undefined ? (
                        <button onClick={() => toggleMechanical(charm.id)}
                          className={`text-xs transition-colors ${charm.mechanicalEnabled ? 'text-amber-500 hover:text-stone-400' : 'text-stone-600 hover:text-amber-400'}`}>
                          {charm.mechanicalEnabled ? 'implementation on' : 'implementation off'}
                        </button>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
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
  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col no-scrollbar">
      <div className="flex items-center justify-between mb-2 shrink-0"><SectionHeader title="Effects" /><button onClick={() => setAddingCat(v => !v)} className={g}>+ category</button></div>
      {addingCat && <div className="flex gap-1 mb-2 shrink-0"><input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCat(); if (e.key === 'Escape') setAddingCat(false) }} placeholder="Category name…" className={inputCls} /><button onClick={addCat} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">✓</button><button onClick={() => setAddingCat(false)} className="text-stone-500 hover:text-stone-300 text-xs px-1">✕</button></div>}
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
              {editingCatId === cat.id ? <div className="flex gap-1 flex-1"><input autoFocus type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveCat(); if (e.key === 'Escape') setEditingCatId(null) }} className={inputActive} /><button onClick={saveCat} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-1.5 py-0.5 text-xs">✓</button><button onClick={() => setEditingCatId(null)} className="text-stone-500 hover:text-stone-300 text-xs">✕</button></div>
              : <><span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">{cat.name}</span><div className="flex gap-2"><button onClick={() => setAddingEffectCatId(cat.id === addingEffectCatId ? null : cat.id)} className={g}>+ effect</button><button onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name) }} className={g}>✎</button><button onClick={() => removeCat(cat.id)} className="text-stone-500 hover:text-red-400 transition-colors text-xs">✕</button></div></>}
            </div>
            {addingEffectCatId === cat.id && <div className="px-1.5 pb-1.5 space-y-1 border-t border-stone-700/50 pt-1"><input autoFocus type="text" value={newEffectName} onChange={e => setNewEffectName(e.target.value)} placeholder="Effect name…" className={inputCls} /><textarea value={newEffectText} onChange={e => setNewEffectText(e.target.value)} placeholder="Description…" rows={3} className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500 resize-none" /><div className="flex gap-1 justify-end"><button onClick={() => addEffect(cat.id)} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">Add</button><button onClick={() => { setAddingEffectCatId(null); setNewEffectName(''); setNewEffectText('') }} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button></div></div>}
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
                        <button onClick={() => setExpandedIds(s => { const n = new Set(s); n.has(effect.id) ? n.delete(effect.id) : n.add(effect.id); return n })} className="text-left text-stone-200 hover:text-amber-300 transition-colors flex-1 min-w-0 truncate">{effect.name}</button>
                        <div className="flex gap-1 shrink-0"><button onClick={() => { setEditingEffect({ catId: cat.id, effect }); setEditEffectName(effect.name); setEditEffectText(effect.text) }} className="text-stone-500 hover:text-amber-400 transition-colors">✎</button><button onClick={() => removeEffect(cat.id, effect.id)} className="text-stone-500 hover:text-red-400 transition-colors">✕</button></div>
                      </div>
                    )
                  })()}
                  {expandedIds.has(effect.id) && editingEffect?.effect.id !== effect.id && <p className="text-xs text-stone-400 pb-1.5 whitespace-pre-wrap leading-relaxed">{effect.text || <em className="text-stone-600">No description.</em>}</p>}
                  {editingEffect?.effect.id === effect.id && <div className="pb-1.5 space-y-1"><input type="text" value={editEffectName} onChange={e => setEditEffectName(e.target.value)} className={inputActive} /><textarea value={editEffectText} onChange={e => setEditEffectText(e.target.value)} rows={4} className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 resize-none" /><div className="flex gap-1 justify-end"><button onClick={saveEffect} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">Save</button><button onClick={() => setEditingEffect(null)} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button></div></div>}
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
                  <button key={tag.name} title={tag.description} onClick={() => toggleTag(tag.name)}
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
                  className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${form.kind === k ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
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
                    className={`px-2 py-0.5 rounded text-xs transition-colors ${form.weight === w.category ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
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
                        className={`px-2 py-0.5 rounded text-xs capitalize transition-colors ${weaponCombatType === ct ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                        {ct}
                      </button>
                    ))}
                  </div>
                  <button onClick={toggleArtifact} title="Artifact (+1 to all stats)"
                    className={`px-2 py-0.5 rounded text-xs transition-colors border ${form.artifact ? 'bg-amber-600/30 border-amber-500 text-amber-300' : 'bg-stone-700 border-stone-600 text-stone-400 hover:border-stone-400'}`}>
                    Artifact
                  </button>
                  {form.artifact && ARTIFACT_COLORS.map(c => (
                    <button key={c.value} title={c.label} onClick={() => set({ artifactColor: c.value })}
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
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${form.type === a.category ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-400 hover:bg-stone-600'}`}>
                        {a.category}
                      </button>
                    ))}
                  </div>
                  <button onClick={toggleArtifact} title="Artifact (+1 Soak & Hardness)"
                    className={`px-2 py-0.5 rounded text-xs transition-colors border ${form.artifact ? 'bg-amber-600/30 border-amber-500 text-amber-300' : 'bg-stone-700 border-stone-600 text-stone-400 hover:border-stone-400'}`}>
                    Artifact
                  </button>
                  {form.artifact && ARTIFACT_COLORS.map(c => (
                    <button key={c.value} title={c.label} onClick={() => set({ artifactColor: c.value })}
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
            className="px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
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
                title="Grant unarmed attacks the Artifact tag (+1 all stats)"
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
                <button key={t.name} title={t.description} onClick={() => setTag(tag === t.name ? null : t.name)}
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
            className={`px-3 py-1 text-xs rounded transition-colors ${canSave ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-stone-700 text-stone-500 cursor-not-allowed'}`}>
            Save
          </button>
        </div>
      </div>
    </div>
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
        if (Object.entries(computed).some(([k, v]) => (item as any)[k] !== v)) {
          anyChanged = true
          return { ...item, ...computed }
        }
      }
      if (item.kind === 'armor' && item.type) {
        const computed = computeArmorStats(item)
        if (Object.entries(computed).some(([k, v]) => (item as any)[k] !== v)) {
          anyChanged = true
          return { ...item, ...computed }
        }
      }
      return item
    })
    if (anyChanged) onChange(next)
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
    let final = { ...item } as any
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
          onSave={s => { s.active ? applyFoi(s) : deactivateFoi(); setFoiModalOpen(false) }}
          onClose={() => setFoiModalOpen(false)}
        />
      )}
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <SectionHeader title="Inventory" />
          <button onClick={() => setModal({ kind: 'weapon' })} className="text-stone-500 hover:text-amber-400 transition-colors text-xs">+ item</button>
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
                      const activeKey = (c: CharacterCharm) => c.mechanicalKeyOverride ?? c.libraryMechanicalKey
                      const foiCharm = charms.find(c => activeKey(c) === 'foi' && c.mechanicalEnabled)
                      if (!foiCharm) return null
                      const hasUnarmed = kindItems.some(i => i.weight === 'Unarmed')
                      return (
                        <button
                          onClick={() => hasUnarmed && setFoiModalOpen(true)}
                          title={hasUnarmed ? 'Fists of Iron Technique' : 'You need an unarmed weapon'}
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
                            <span title={foiTagEntry.description}
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
                            <button onClick={() => setModal(item)} className="text-stone-500 hover:text-amber-400 transition-colors text-xs">✎</button>
                            <button onClick={() => removeItem(item.id)} className="text-stone-500 hover:text-red-400 transition-colors text-xs">✕</button>
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

export default function SheetTab({ sheet, onChange, editMode, gameData: gd }: Props) {
  const gameData = gd ?? DEFAULT_GAME_DATA
  const def = defaultSheet()
  const data: SheetData = {
    attributes: { ...def.attributes, ...sheet.attributes },
    abilities: { ...def.abilities, ...sheet.abilities },
    defenses: { ...def.defenses, ...sheet.defenses },
    essence: sheet.essence ?? 1,
    anima: sheet.anima ?? 0,
    defenseBonus: { ...def.defenseBonus, ...sheet.defenseBonus },
    languages: sheet.languages ?? [],
    merits: sheet.merits ?? [],
    intimacies: sheet.intimacies ?? [],
    motes: { ...def.motes, ...sheet.motes },
    health: sheet.health ?? DEFAULT_HEALTH.map(h => ({ ...h })),
    layout: (() => {
      const base = sheet.layout?.length ? sheet.layout.map(l => ({ ...l })) : DEFAULT_LAYOUT.map(l => ({ ...l }))
      const existingIds = new Set(base.map(l => l.i))
      const missing = DEFAULT_LAYOUT.filter(l => !existingIds.has(l.i))
      return [...base, ...missing]
    })(),
    charms: sheet.charms ?? [],
    effects: sheet.effects ?? [],
    inventory: sheet.inventory ?? [],
    defenseOther: sheet.defenseOther ?? false,
    fullDefense: sheet.fullDefense ?? false,
    foi: sheet.foi ?? { active: false, weight: null, tag: null, artifact: false },
    foiOriginals: sheet.foiOriginals ?? {},
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

  function update(partial: Partial<SheetData>) { onChange({ ...data, ...partial }) }
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
  function toggleHealth(i: number) {
    update({ health: data.health.map((h, idx) => idx === i ? { ...h, checked: !h.checked } : h) })
  }

  const panelBase = "bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full"

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
                    <input type="number" min={0} max={10} value={data.attributes[attr] ?? 0}
                      onChange={e => setAttr(attr, parseInt(e.target.value) || 0)}
                      className={numInput} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),

    abilities: (
      <div className={panelBase}>
        <SectionHeader title="Abilities" />
        <table className="w-full text-xs">
          <thead>
            <tr className="text-stone-500 border-b border-stone-700">
              <th className="text-left py-1 px-1 font-medium w-[80px]">Ability</th>
              <th className="text-center py-1 px-1 font-medium w-[38px]">Rtg</th>
              <th className="text-left py-1 px-1 font-medium">Specialty</th>
              <th className="text-center py-1 px-1 font-medium w-[20px]" title="Excellency">Ex</th>
            </tr>
          </thead>
          <tbody>
            {ABILITIES.map(ability => {
              const ab = data.abilities[ability] ?? defaultAbility
              return (
                <tr key={ability} className={`border-b border-stone-800 transition-colors ${ab.excellency ? 'bg-amber-950/40' : 'hover:bg-stone-800/50'}`}>
                  <td className={`py-1 px-1 font-medium ${ab.excellency ? 'text-amber-300' : 'text-stone-200'}`}>{ability}</td>
                  <td className="py-1 px-1 text-center">
                    <input type="number" min={0} max={10} value={ab.rating}
                      onChange={e => setAbility(ability, { rating: parseInt(e.target.value) || 0 })}
                      className={numInput} />
                  </td>
                  <td className="py-1 px-1">
                    <input type="text" value={ab.specialty}
                      onChange={e => setAbility(ability, { specialty: e.target.value })}
                      placeholder="—"
                      className="w-full bg-transparent border-b border-stone-700 text-stone-300 placeholder-stone-600 text-xs focus:outline-none focus:border-amber-500 px-1 py-0.5" />
                  </td>
                  <td className="py-1 px-1 text-center">
                    <button onClick={() => setAbility(ability, { excellency: !ab.excellency })}
                      className={`w-3 h-3 rounded-full border-2 transition-colors ${ab.excellency ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-stone-600 hover:border-amber-500'}`} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    ),

    defenses: (() => {
      const stamina = data.attributes['Stamina']   ?? 0
      const dex     = data.attributes['Dexterity']  ?? 0
      const cc      = data.abilities['Close Combat']?.rating ?? 0
      const ath     = data.abilities['Athletics']?.rating    ?? 0
      const phys    = data.abilities['Physique']?.rating     ?? 0
      const integ   = data.abilities['Integrity']?.rating    ?? 0
      const equippedWeapons = data.inventory.filter(i => i.kind === 'weapon' && i.equipped)
      const equippedArmors  = data.inventory.filter(i => i.kind === 'armor'  && i.equipped)
      const bestWpnDef  = equippedWeapons.length ? Math.max(...equippedWeapons.map(i => i.defense ?? 0)) : 0
      const bestArmorSoak = equippedArmors.length ? Math.max(...equippedArmors.map(i => i.soak ?? 0)) : 0
      const bestArmorHard = equippedArmors.length ? Math.max(...equippedArmors.map(i => i.hardness ?? 0)) : 0
      const db = data.defenseBonus
      const parryBase    = Math.ceil((stamina + cc) / 2)
      const evasionBase  = Math.ceil((dex + ath) / 2)
      const soakBase     = 1 + (phys >= 3 ? 1 : 0)
      const hardnessBase = 2 + (data.essence ?? 1)
      const resolveBase  = (integ >= 3 ? 4 : integ >= 1 ? 3 : 2) + (db.resolve ?? 0)
      const wpnBonus = (data.fullDefense || data.defenseOther) ? bestWpnDef : 0
      const parry    = parryBase   + wpnBonus + (db.parry   ?? 0)
      const evasion  = evasionBase + wpnBonus + (db.evasion ?? 0)
      const soak     = soakBase     + bestArmorSoak                        + (db.soak     ?? 0)
      const hardness = hardnessBase + bestArmorHard                        + (db.hardness ?? 0)
      const bonusInput = (key: keyof typeof db) => (
        <input type="number" value={db[key] ?? 0}
          onChange={e => update({ defenseBonus: { ...db, [key]: parseInt(e.target.value) || 0 } })}
          className="w-[30px] text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-amber-500" />
      )
      const calcRow = (label: string, total: number, tip: string, bonus: ReturnType<typeof bonusInput>) => (
        <div className="flex items-center gap-1.5 group/row relative">
          <span className="text-xs text-stone-400 w-16 shrink-0">{label}</span>
          <span className="text-sm font-semibold text-stone-100 flex-1 cursor-default">{total}</span>
          {bonus}
          <div className="absolute bottom-full left-0 mb-1.5 z-50 pointer-events-none opacity-0 group-hover/row:opacity-100 transition-opacity">
            <div className="bg-stone-800 border border-stone-600 rounded-lg px-3 py-1.5 text-xs text-stone-300 whitespace-nowrap shadow-xl">
              {tip}
            </div>
          </div>
        </div>
      )
      return (
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-visible h-full" data-tooltip-panel>
          <SectionHeader title="Defenses" />
          <div className="space-y-1.5">
            {calcRow('Parry',    parry,    `ceil((Stamina ${stamina} + Close Combat ${cc}) / 2)${wpnBonus ? ` + Weapon Defense ${bestWpnDef}` : ' (no Full/Defend Other)'} + Bonus ${db.parry ?? 0}`, bonusInput('parry'))}
            {calcRow('Evasion',  evasion,  `ceil((Dexterity ${dex} + Athletics ${ath}) / 2)${wpnBonus ? ` + Weapon Defense ${bestWpnDef}` : ' (no Full/Defend Other)'} + Bonus ${db.evasion ?? 0}`, bonusInput('evasion'))}
            {calcRow('Soak',     soak,     `${soakBase} base + Best Armor Soak ${bestArmorSoak} + Bonus ${db.soak ?? 0}`, bonusInput('soak'))}
            {calcRow('Hardness', hardness, `${hardnessBase} base (2 + Essence ${data.essence ?? 1}) + Best Armor Hardness ${bestArmorHard} + Bonus ${db.hardness ?? 0}`, bonusInput('hardness'))}
            {calcRow('Resolve', resolveBase, `2 base + Integrity ${integ} bonus`, bonusInput('resolve'))}
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

    essence: (
      <div className={panelBase}>
        <SectionHeader title="Essence" />
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-300">Essence</span>
            <input type="number" min={1} value={data.essence ?? 1}
              onChange={e => update({ essence: parseInt(e.target.value) || 1 })}
              className={numInput} />
          </div>
        </div>
      </div>
    ),

    motes: (() => {
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
      const counterBtn = "w-5 h-5 flex items-center justify-center rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700 transition-colors text-sm font-bold shrink-0"
      return (
        <div className={panelBase}>
          <div className="relative flex items-center justify-center mb-0.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Motes</span>
            <button onClick={resetMotes} className="absolute right-0 text-[10px] text-stone-500 hover:text-amber-400 transition-colors px-1.5 py-0.5 rounded border border-stone-700 hover:border-amber-500">Reset</button>
          </div>
          <div className="flex flex-col items-center mb-1.5">
            <span className="text-[10px] text-stone-500">Total</span>
            <span className="text-stone-300 font-semibold text-2xl">{totalMotes}</span>
          </div>
          <div className="flex justify-around items-start gap-2">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-stone-500">Current</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrent(-1)} className={counterBtn}>−</button>
                <span className="text-xl font-bold text-stone-100 w-8 text-center">{current}</span>
                <button onClick={() => setCurrent(+1)} className={counterBtn}>+</button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-stone-500">Committed</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setCommitted(-1)} className={counterBtn}>−</button>
                <span className="text-xl font-bold text-stone-100 w-8 text-center">{committed}</span>
                <button onClick={() => setCommitted(+1)} className={counterBtn}>+</button>
              </div>
            </div>
          </div>
        </div>
      )
    })(),

    anima: (() => {
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
        const next = Math.max(0, Math.min(10, animaLevel + delta))
        update({ anima: next })
      }
      const counterBtn = "w-5 h-5 flex items-center justify-center rounded text-stone-400 hover:text-stone-100 hover:bg-stone-700 transition-colors text-sm font-bold shrink-0"
      return (
        <div className={panelBase}>
          <div className="flex items-center justify-between mb-2">
            <SectionHeader title="Anima" />
            <button onClick={() => update({ anima: 0 })} className="text-[10px] text-stone-500 hover:text-amber-400 transition-colors px-1.5 py-0.5 rounded border border-stone-700 hover:border-amber-500">Reset</button>
          </div>
          <div className="flex flex-col items-center gap-1 pt-1">
            <div className="flex items-center gap-1">
              <button onClick={() => setAnima(-1)} className={counterBtn}>−</button>
              <span className={`text-3xl font-bold w-10 text-center ${animaColor}`}>{animaLevel}</span>
              <button onClick={() => setAnima(+1)} className={counterBtn}>+</button>
            </div>
            <span className={`text-xs font-medium ${animaColor}`}>{animaState}</span>
          </div>
        </div>
      )
    })(),

    health: (
      <div className={panelBase}>
        <SectionHeader title="Health" />
        <div className="flex flex-wrap gap-2">
          {data.health.map((box, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="text-xs text-stone-500">{box.penalty}</span>
              <button onClick={() => toggleHealth(i)}
                className={`w-6 h-6 rounded border-2 transition-colors ${box.checked ? 'bg-red-600 border-red-500' : 'bg-transparent border-stone-600 hover:border-red-400'}`} />
            </div>
          ))}
        </div>
      </div>
    ),

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
                  <button onClick={saveMerit} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs transition-colors">✓</button>
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
          <button onClick={addMerit} className="bg-stone-700 hover:bg-stone-600 text-white rounded px-2 py-0.5 text-xs transition-colors">+</button>
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
                  <button onClick={saveLang} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs transition-colors">✓</button>
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
          <button onClick={addLanguage} className="bg-stone-700 hover:bg-stone-600 text-white rounded px-2 py-0.5 text-xs transition-colors">+</button>
        </div>
      </div>
    ),

    intimacies: (
      <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col">
        <SectionHeader title="Intimacies" />
        <div className="space-y-1 mb-2 overflow-y-auto no-scrollbar flex-1">
          {data.intimacies.map(intimacy => (
            <div key={intimacy.id}>
              <div className="flex items-start justify-between text-xs gap-1">
                <div className="flex items-start gap-1.5 min-w-0">
                  <span className={`self-center shrink-0 font-semibold px-1 py-0.5 rounded ${intimacy.intensity === 'Defining' ? 'bg-purple-900 text-purple-300' : intimacy.intensity === 'Major' ? 'bg-amber-900 text-amber-300' : 'bg-stone-700 text-stone-300'}`}>{intimacy.intensity[0]}</span>
                  <span className="text-stone-200 break-words min-w-0">{intimacy.description}</span>
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
                  <button onClick={saveIntimacy} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs transition-colors">✓</button>
                  <button onClick={() => setEditingIntimacyId(null)} className="text-stone-500 hover:text-stone-300 text-xs px-1">✕</button>
                </div>
              )}
            </div>
          ))}
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
          <button onClick={addIntimacy} className="bg-stone-700 hover:bg-stone-600 text-white rounded px-2 py-0.5 text-xs transition-colors">+</button>
        </div>
      </div>
    ),

    charms: (
      <CharmPanel
        charms={data.charms}
        onChange={c => update({ charms: c })}
      />
    ),

    effects: (
      <EffectPanel
        categories={data.effects}
        onChange={c => update({ effects: c })}
        dragEnabled={!editMode}
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
        dragEnabled={!editMode}
        gameData={gameData}
        charms={data.charms}
      />
    ),
  }

  // Measure the grid container's exact pixel width so GridLayout snap points
  const { width, containerRef, mounted } = useContainerWidth()

  return (
    <div className="relative" ref={containerRef}>
      {mounted && (
        <GridLayout
          width={width}
          gridConfig={{ cols: 128, rowHeight: 10, margin: [0, 0], containerPadding: [0, 0] }}
          dragConfig={{ enabled: editMode, handle: '.drag-handle' }}
          resizeConfig={{ enabled: editMode }}
          compactor={freeCompactor}
          layout={data.layout}
          onLayoutChange={(newLayout) => update({ layout: newLayout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })) })}
          autoSize={false}
          style={{
            minHeight: '2000px',
            ...(editMode ? {
              backgroundImage: 'linear-gradient(rgba(251,191,36,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.08) 1px, transparent 1px)',
              backgroundSize: `${width / 128}px 10px`,
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
    </div>
  )
}
