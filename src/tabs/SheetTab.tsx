import { useState, useRef } from 'react' // useState used by CharmPanel and other local state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { GridLayout, useContainerWidth, noCompactor } from 'react-grid-layout'
// noCompactor has allowOverlap:false which causes panels to push each other during drag.
// Override it so panels can freely overlap — no collision resolution, no compaction.
const freeCompactor = { ...noCompactor, allowOverlap: true }
import 'react-grid-layout/css/styles.css'
import type { SheetData, AbilityData, MeritEntry, IntimacyEntry, HealthBox, PanelLayout, CharmCategory, CharmEntry, EffectCategory, EffectEntry, InventoryCategory} from '../types/character'

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
  { i: 'defenses',   x: 16, y: 0,  w: 16, h: 11, minW: 4, minH: 8 },
  { i: 'motes',      x: 16, y: 11, w: 16, h: 8,  minW: 4, minH: 8 },
  { i: 'health',     x: 16, y: 19, w: 16, h: 8,  minW: 4, minH: 8 },
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
    languages: [], merits: [], intimacies: [],
    motes: { current: 0, committed: 0, total: 0 },
    health: DEFAULT_HEALTH.map(h => ({ ...h })),
    layout: DEFAULT_LAYOUT.map(l => ({ ...l })),
    charms: [],
    effects: [],
    inventory: [],
  }
}

interface Props {
  sheet: SheetData
  editMode: boolean
  onChange: (sheet: SheetData) => void
}

function SectionHeader({ title }: { title: string }) {
  return <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">{title}</div>
}

const inputCls = "w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500"
const inputActive = "w-full bg-stone-800 border border-amber-500 text-stone-100 rounded px-2 py-0.5 text-xs focus:outline-none"

function CharmPanel({ categories, onChange, dragEnabled }: {
  categories: CharmCategory[]
  onChange: (c: CharmCategory[]) => void
  dragEnabled: boolean
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCharmCatId, setAddingCharmCatId] = useState<string | null>(null)
  const [newCharmName, setNewCharmName] = useState('')
  const [newCharmText, setNewCharmText] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editingCharm, setEditingCharm] = useState<{ catId: string; charm: CharmEntry } | null>(null)
  const [editCharmName, setEditCharmName] = useState('')
  const [editCharmText, setEditCharmText] = useState('')
  const [dropTargetCatId, setDropTargetCatId] = useState<string | null>(null)

  const dragging = useRef<{ fromCatId: string; charmId: string } | null>(null)

  function addCategory() {
    if (!newCatName.trim()) return
    onChange([...categories, { id: crypto.randomUUID(), name: newCatName.trim(), charms: [] }])
    setNewCatName(''); setAddingCat(false)
  }
  function removeCategory(id: string) { onChange(categories.filter(c => c.id !== id)) }
  function saveCategory() {
    if (!editingCatId || !editCatName.trim()) return
    onChange(categories.map(c => c.id === editingCatId ? { ...c, name: editCatName.trim() } : c))
    setEditingCatId(null)
  }
  function addCharm(catId: string) {
    if (!newCharmName.trim()) return
    onChange(categories.map(c => c.id === catId
      ? { ...c, charms: [...c.charms, { id: crypto.randomUUID(), name: newCharmName.trim(), text: newCharmText }] }
      : c))
    setNewCharmName(''); setNewCharmText(''); setAddingCharmCatId(null)
  }
  function removeCharm(catId: string, charmId: string) {
    onChange(categories.map(c => c.id === catId ? { ...c, charms: c.charms.filter(ch => ch.id !== charmId) } : c))
    if (expandedId === charmId) setExpandedId(null)
  }
  function saveCharm() {
    if (!editingCharm || !editCharmName.trim()) return
    onChange(categories.map(c => c.id === editingCharm.catId
      ? { ...c, charms: c.charms.map(ch => ch.id === editingCharm.charm.id ? { ...ch, name: editCharmName.trim(), text: editCharmText } : ch) }
      : c))
    setEditingCharm(null)
  }

  function onCharmDragStart(e: React.DragEvent, fromCatId: string, charmId: string) {
    dragging.current = { fromCatId, charmId }
    e.dataTransfer.effectAllowed = 'move'
  }
  function onCharmDrop(e: React.DragEvent, toCatId: string, beforeCharmId?: string) {
    e.preventDefault(); e.stopPropagation()
    if (!dragging.current) return
    const { fromCatId, charmId } = dragging.current
    const charm = categories.find(c => c.id === fromCatId)?.charms.find(ch => ch.id === charmId)
    if (!charm) return
    onChange(categories.map(c => {
      if (c.id === fromCatId && c.id === toCatId) {
        const filtered = c.charms.filter(ch => ch.id !== charmId)
        const idx = beforeCharmId ? filtered.findIndex(ch => ch.id === beforeCharmId) : filtered.length
        filtered.splice(idx < 0 ? filtered.length : idx, 0, charm)
        return { ...c, charms: filtered }
      }
      if (c.id === fromCatId) return { ...c, charms: c.charms.filter(ch => ch.id !== charmId) }
      if (c.id === toCatId) {
        const idx = beforeCharmId ? c.charms.findIndex(ch => ch.id === beforeCharmId) : c.charms.length
        const next = [...c.charms]; next.splice(idx < 0 ? next.length : idx, 0, charm)
        return { ...c, charms: next }
      }
      return c
    }))
    dragging.current = null; setDropTargetCatId(null)
  }

  const btnGhost = "text-stone-500 hover:text-amber-400 transition-colors text-xs"

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <SectionHeader title="Charms" />
        <button onClick={() => setAddingCat(v => !v)} className={btnGhost}>+ category</button>
      </div>

      {addingCat && (
        <div className="flex gap-1 mb-2 shrink-0">
          <input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setAddingCat(false) }}
            placeholder="Category name…" className={inputCls} />
          <button onClick={addCategory} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">✓</button>
          <button onClick={() => setAddingCat(false)} className="text-stone-500 hover:text-stone-300 text-xs px-1">✕</button>
        </div>
      )}

      <div className="space-y-2 overflow-y-auto flex-1">
        {categories.length === 0 && <p className="text-xs text-stone-500">No categories yet.</p>}
        {categories.map(cat => (
          <div key={cat.id}
            onDragOver={e => { e.preventDefault(); setDropTargetCatId(cat.id) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetCatId(null) }}
            onDrop={e => onCharmDrop(e, cat.id)}
            className={`rounded border transition-colors ${dropTargetCatId === cat.id ? 'border-amber-500/60 bg-amber-500/5' : 'border-stone-700/50'}`}
          >
            {/* Category header */}
            <div className="flex items-center justify-between px-1.5 py-1">
              {editingCatId === cat.id ? (
                <div className="flex gap-1 flex-1">
                  <input autoFocus type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCategory(); if (e.key === 'Escape') setEditingCatId(null) }}
                    className={inputActive} />
                  <button onClick={saveCategory} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-1.5 py-0.5 text-xs">✓</button>
                  <button onClick={() => setEditingCatId(null)} className="text-stone-500 hover:text-stone-300 text-xs">✕</button>
                </div>
              ) : (
                <>
                  <span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">{cat.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setAddingCharmCatId(cat.id === addingCharmCatId ? null : cat.id)} className={btnGhost}>+ charm</button>
                    <button onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name) }} className={btnGhost}>✎</button>
                    <button onClick={() => removeCategory(cat.id)} className="text-stone-500 hover:text-red-400 transition-colors text-xs">✕</button>
                  </div>
                </>
              )}
            </div>

            {/* Add charm form */}
            {addingCharmCatId === cat.id && (
              <div className="px-1.5 pb-1.5 space-y-1 border-t border-stone-700/50 pt-1">
                <input autoFocus type="text" value={newCharmName} onChange={e => setNewCharmName(e.target.value)}
                  placeholder="Charm name…" className={inputCls} />
                <textarea value={newCharmText} onChange={e => setNewCharmText(e.target.value)}
                  placeholder="Description…" rows={3}
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500 resize-none" />
                <div className="flex gap-1 justify-end">
                  <button onClick={() => addCharm(cat.id)} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">Add</button>
                  <button onClick={() => { setAddingCharmCatId(null); setNewCharmName(''); setNewCharmText('') }} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button>
                </div>
              </div>
            )}

            {/* Charm list */}
            <div>
              {cat.charms.length === 0 && addingCharmCatId !== cat.id && (
                <p className="text-xs text-stone-600 px-1.5 pb-1">No charms.</p>
              )}
              {cat.charms.map(charm => (
                <div key={charm.id}
                  draggable={dragEnabled}
                  onDragStart={e => dragEnabled && onCharmDragStart(e, cat.id, charm.id)}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                  onDrop={e => onCharmDrop(e, cat.id, charm.id)}
                  className={`border-t border-stone-800 px-1.5 ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <div className="flex items-center justify-between py-1 text-xs gap-1">
                    <button onClick={() => setExpandedId(expandedId === charm.id ? null : charm.id)}
                      className="text-left text-stone-200 hover:text-amber-300 transition-colors flex-1 min-w-0 truncate">
                      {charm.name}
                    </button>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditingCharm({ catId: cat.id, charm }); setEditCharmName(charm.name); setEditCharmText(charm.text) }}
                        className="text-stone-500 hover:text-amber-400 transition-colors">✎</button>
                      <button onClick={() => removeCharm(cat.id, charm.id)}
                        className="text-stone-500 hover:text-red-400 transition-colors">✕</button>
                    </div>
                  </div>

                  {expandedId === charm.id && editingCharm?.charm.id !== charm.id && (
                    <p className="text-xs text-stone-400 pb-1.5 whitespace-pre-wrap leading-relaxed">
                      {charm.text || <em className="text-stone-600">No description.</em>}
                    </p>
                  )}

                  {editingCharm?.charm.id === charm.id && (
                    <div className="pb-1.5 space-y-1">
                      <input type="text" value={editCharmName} onChange={e => setEditCharmName(e.target.value)}
                        className={inputActive} />
                      <textarea value={editCharmText} onChange={e => setEditCharmText(e.target.value)}
                        rows={4}
                        className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 resize-none" />
                      <div className="flex gap-1 justify-end">
                        <button onClick={saveCharm} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">Save</button>
                        <button onClick={() => setEditingCharm(null)} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// EffectPanel — same structure as CharmPanel (categories + entries with name & description)
function EffectPanel({ categories, onChange, dragEnabled }: {
  categories: EffectCategory[]
  onChange: (c: EffectCategory[]) => void
  dragEnabled: boolean
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
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
  const dragging = useRef<{ fromCatId: string; effectId: string } | null>(null)

  function addCat() { if (!newCatName.trim()) return; onChange([...categories, { id: crypto.randomUUID(), name: newCatName.trim(), effects: [] }]); setNewCatName(''); setAddingCat(false) }
  function removeCat(id: string) { onChange(categories.filter(c => c.id !== id)) }
  function saveCat() { if (!editingCatId || !editCatName.trim()) return; onChange(categories.map(c => c.id === editingCatId ? { ...c, name: editCatName.trim() } : c)); setEditingCatId(null) }
  function addEffect(catId: string) {
    if (!newEffectName.trim()) return
    onChange(categories.map(c => c.id === catId ? { ...c, effects: [...c.effects, { id: crypto.randomUUID(), name: newEffectName.trim(), text: newEffectText }] } : c))
    setNewEffectName(''); setNewEffectText(''); setAddingEffectCatId(null)
  }
  function removeEffect(catId: string, effectId: string) { onChange(categories.map(c => c.id === catId ? { ...c, effects: c.effects.filter(e => e.id !== effectId) } : c)); if (expandedId === effectId) setExpandedId(null) }
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
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0"><SectionHeader title="Effects" /><button onClick={() => setAddingCat(v => !v)} className={g}>+ category</button></div>
      {addingCat && <div className="flex gap-1 mb-2 shrink-0"><input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCat(); if (e.key === 'Escape') setAddingCat(false) }} placeholder="Category name…" className={inputCls} /><button onClick={addCat} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">✓</button><button onClick={() => setAddingCat(false)} className="text-stone-500 hover:text-stone-300 text-xs px-1">✕</button></div>}
      <div className="space-y-2 overflow-y-auto flex-1">
        {categories.length === 0 && <p className="text-xs text-stone-500">No categories yet.</p>}
        {categories.map(cat => (
          <div key={cat.id} onDragOver={e => { e.preventDefault(); setDropTargetCatId(cat.id) }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetCatId(null) }} onDrop={e => onDrop(e, cat.id)} className={`rounded border transition-colors ${dropTargetCatId === cat.id ? 'border-amber-500/60 bg-amber-500/5' : 'border-stone-700/50'}`}>
            <div className="flex items-center justify-between px-1.5 py-1">
              {editingCatId === cat.id ? <div className="flex gap-1 flex-1"><input autoFocus type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveCat(); if (e.key === 'Escape') setEditingCatId(null) }} className={inputActive} /><button onClick={saveCat} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-1.5 py-0.5 text-xs">✓</button><button onClick={() => setEditingCatId(null)} className="text-stone-500 hover:text-stone-300 text-xs">✕</button></div>
              : <><span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">{cat.name}</span><div className="flex gap-2"><button onClick={() => setAddingEffectCatId(cat.id === addingEffectCatId ? null : cat.id)} className={g}>+ effect</button><button onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name) }} className={g}>✎</button><button onClick={() => removeCat(cat.id)} className="text-stone-500 hover:text-red-400 transition-colors text-xs">✕</button></div></>}
            </div>
            {addingEffectCatId === cat.id && <div className="px-1.5 pb-1.5 space-y-1 border-t border-stone-700/50 pt-1"><input autoFocus type="text" value={newEffectName} onChange={e => setNewEffectName(e.target.value)} placeholder="Effect name…" className={inputCls} /><textarea value={newEffectText} onChange={e => setNewEffectText(e.target.value)} placeholder="Description…" rows={3} className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 placeholder-stone-500 resize-none" /><div className="flex gap-1 justify-end"><button onClick={() => addEffect(cat.id)} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">Add</button><button onClick={() => { setAddingEffectCatId(null); setNewEffectName(''); setNewEffectText('') }} className="text-stone-500 hover:text-stone-300 text-xs px-1">Cancel</button></div></div>}
            <div>
              {cat.effects.length === 0 && addingEffectCatId !== cat.id && <p className="text-xs text-stone-600 px-1.5 pb-1">No effects.</p>}
              {cat.effects.map(effect => (
                <div key={effect.id} draggable={dragEnabled} onDragStart={e => dragEnabled && onDragStart(e, cat.id, effect.id)} onDragOver={e => { e.preventDefault(); e.stopPropagation() }} onDrop={e => onDrop(e, cat.id, effect.id)} className={`border-t border-stone-800 px-1.5 ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                  <div className="flex items-center justify-between py-1 text-xs gap-1">
                    <button onClick={() => setExpandedId(expandedId === effect.id ? null : effect.id)} className="text-left text-stone-200 hover:text-amber-300 transition-colors flex-1 min-w-0 truncate">{effect.name}</button>
                    <div className="flex gap-1 shrink-0"><button onClick={() => { setEditingEffect({ catId: cat.id, effect }); setEditEffectName(effect.name); setEditEffectText(effect.text) }} className="text-stone-500 hover:text-amber-400 transition-colors">✎</button><button onClick={() => removeEffect(cat.id, effect.id)} className="text-stone-500 hover:text-red-400 transition-colors">✕</button></div>
                  </div>
                  {expandedId === effect.id && editingEffect?.effect.id !== effect.id && <p className="text-xs text-stone-400 pb-1.5 whitespace-pre-wrap leading-relaxed">{effect.text || <em className="text-stone-600">No description.</em>}</p>}
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

// InventoryPanel — categories + items (name only for now)
function InventoryPanel({ categories, onChange, dragEnabled }: {
  categories: InventoryCategory[]
  onChange: (c: InventoryCategory[]) => void
  dragEnabled: boolean
}) {
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingItemCatId, setAddingItemCatId] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [editingItem, setEditingItem] = useState<{ catId: string; itemId: string } | null>(null)
  const [editItemName, setEditItemName] = useState('')
  const [dropTargetCatId, setDropTargetCatId] = useState<string | null>(null)
  const dragging = useRef<{ fromCatId: string; itemId: string } | null>(null)

  function addCat() { if (!newCatName.trim()) return; onChange([...categories, { id: crypto.randomUUID(), name: newCatName.trim(), items: [] }]); setNewCatName(''); setAddingCat(false) }
  function removeCat(id: string) { onChange(categories.filter(c => c.id !== id)) }
  function saveCat() { if (!editingCatId || !editCatName.trim()) return; onChange(categories.map(c => c.id === editingCatId ? { ...c, name: editCatName.trim() } : c)); setEditingCatId(null) }
  function addItem(catId: string) {
    if (!newItemName.trim()) return
    onChange(categories.map(c => c.id === catId ? { ...c, items: [...c.items, { id: crypto.randomUUID(), name: newItemName.trim() }] } : c))
    setNewItemName(''); setAddingItemCatId(null)
  }
  function removeItem(catId: string, itemId: string) { onChange(categories.map(c => c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c)) }
  function saveItem() {
    if (!editingItem || !editItemName.trim()) return
    onChange(categories.map(c => c.id === editingItem.catId ? { ...c, items: c.items.map(i => i.id === editingItem.itemId ? { ...i, name: editItemName.trim() } : i) } : c))
    setEditingItem(null)
  }
  function onDragStart(e: React.DragEvent, fromCatId: string, itemId: string) { dragging.current = { fromCatId, itemId }; e.dataTransfer.effectAllowed = 'move' }
  function onDrop(e: React.DragEvent, toCatId: string, beforeId?: string) {
    e.preventDefault(); e.stopPropagation()
    if (!dragging.current) return
    const { fromCatId, itemId } = dragging.current
    const item = categories.find(c => c.id === fromCatId)?.items.find(i => i.id === itemId)
    if (!item) return
    onChange(categories.map(c => {
      if (c.id === fromCatId && c.id === toCatId) { const f = c.items.filter(i => i.id !== itemId); const idx = beforeId ? f.findIndex(i => i.id === beforeId) : f.length; f.splice(idx < 0 ? f.length : idx, 0, item); return { ...c, items: f } }
      if (c.id === fromCatId) return { ...c, items: c.items.filter(i => i.id !== itemId) }
      if (c.id === toCatId) { const idx = beforeId ? c.items.findIndex(i => i.id === beforeId) : c.items.length; const n = [...c.items]; n.splice(idx < 0 ? n.length : idx, 0, item); return { ...c, items: n } }
      return c
    }))
    dragging.current = null; setDropTargetCatId(null)
  }

  const g = "text-stone-500 hover:text-amber-400 transition-colors text-xs"
  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0"><SectionHeader title="Inventory" /><button onClick={() => setAddingCat(v => !v)} className={g}>+ category</button></div>
      {addingCat && <div className="flex gap-1 mb-2 shrink-0"><input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCat(); if (e.key === 'Escape') setAddingCat(false) }} placeholder="Category name…" className={inputCls} /><button onClick={addCat} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs">✓</button><button onClick={() => setAddingCat(false)} className="text-stone-500 hover:text-stone-300 text-xs px-1">✕</button></div>}
      <div className="space-y-2 overflow-y-auto flex-1">
        {categories.length === 0 && <p className="text-xs text-stone-500">No categories yet.</p>}
        {categories.map(cat => (
          <div key={cat.id} onDragOver={e => { e.preventDefault(); setDropTargetCatId(cat.id) }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetCatId(null) }} onDrop={e => onDrop(e, cat.id)} className={`rounded border transition-colors ${dropTargetCatId === cat.id ? 'border-amber-500/60 bg-amber-500/5' : 'border-stone-700/50'}`}>
            <div className="flex items-center justify-between px-1.5 py-1">
              {editingCatId === cat.id ? <div className="flex gap-1 flex-1"><input autoFocus type="text" value={editCatName} onChange={e => setEditCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveCat(); if (e.key === 'Escape') setEditingCatId(null) }} className={inputActive} /><button onClick={saveCat} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-1.5 py-0.5 text-xs">✓</button><button onClick={() => setEditingCatId(null)} className="text-stone-500 hover:text-stone-300 text-xs">✕</button></div>
              : <><span className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider">{cat.name}</span><div className="flex gap-2"><button onClick={() => setAddingItemCatId(cat.id === addingItemCatId ? null : cat.id)} className={g}>+ item</button><button onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name) }} className={g}>✎</button><button onClick={() => removeCat(cat.id)} className="text-stone-500 hover:text-red-400 transition-colors text-xs">✕</button></div></>}
            </div>
            {addingItemCatId === cat.id && <div className="px-1.5 pb-1.5 border-t border-stone-700/50 pt-1 flex gap-1"><input autoFocus type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addItem(cat.id); if (e.key === 'Escape') { setAddingItemCatId(null); setNewItemName('') } }} placeholder="Item name…" className={inputCls} /><button onClick={() => addItem(cat.id)} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-2 py-0.5 text-xs shrink-0">Add</button></div>}
            <div>
              {cat.items.length === 0 && addingItemCatId !== cat.id && <p className="text-xs text-stone-600 px-1.5 pb-1">No items.</p>}
              {cat.items.map(item => (
                <div key={item.id} draggable={dragEnabled} onDragStart={e => dragEnabled && onDragStart(e, cat.id, item.id)} onDragOver={e => { e.preventDefault(); e.stopPropagation() }} onDrop={e => onDrop(e, cat.id, item.id)} className={`border-t border-stone-800 px-1.5 ${dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                  {editingItem?.itemId === item.id
                    ? <div className="flex gap-1 py-1"><input autoFocus type="text" value={editItemName} onChange={e => setEditItemName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveItem(); if (e.key === 'Escape') setEditingItem(null) }} className={inputActive} /><button onClick={saveItem} className="bg-amber-600 hover:bg-amber-500 text-white rounded px-1.5 py-0.5 text-xs shrink-0">✓</button><button onClick={() => setEditingItem(null)} className="text-stone-500 text-xs px-1">✕</button></div>
                    : <div className="flex items-center justify-between py-1 text-xs gap-1"><span className="text-stone-200 flex-1 min-w-0 truncate">{item.name}</span><div className="flex gap-1 shrink-0"><button onClick={() => { setEditingItem({ catId: cat.id, itemId: item.id }); setEditItemName(item.name) }} className="text-stone-500 hover:text-amber-400 transition-colors">✎</button><button onClick={() => removeItem(cat.id, item.id)} className="text-stone-500 hover:text-red-400 transition-colors">✕</button></div></div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const numInput = "w-[30px] text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-amber-500"

export default function SheetTab({ sheet, onChange, editMode }: Props) {
  const def = defaultSheet()
  const data: SheetData = {
    attributes: { ...def.attributes, ...sheet.attributes },
    abilities: { ...def.abilities, ...sheet.abilities },
    defenses: { ...def.defenses, ...sheet.defenses },
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
  function setDefense(name: string, value: number) { update({ defenses: { ...data.defenses, [name]: value } }) }
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

    defenses: (
      <div className={panelBase}>
        <SectionHeader title="Defenses" />
        <div className="space-y-1">
          {DEFENSES.map(d => (
            <div key={d} className="flex items-center justify-between">
              <span className="text-xs text-stone-300">{d}</span>
              <input type="number" min={0} value={data.defenses[d] ?? 0}
                onChange={e => setDefense(d, parseInt(e.target.value) || 0)}
                className={numInput} />
            </div>
          ))}
        </div>
      </div>
    ),

    motes: (
      <div className={panelBase}>
        <SectionHeader title="Motes" />
        <div className="space-y-1">
          {(['current', 'committed', 'total'] as const).map(key => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-xs text-stone-300 capitalize">{key}</span>
              <input type="number" min={0} value={data.motes[key]}
                onChange={e => update({ motes: { ...data.motes, [key]: parseInt(e.target.value) || 0 } })}
                className={numInput} />
            </div>
          ))}
        </div>
      </div>
    ),

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
      <div className={panelBase}>
        <SectionHeader title="Merits" />
        <div className="space-y-1 mb-2">
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
      <div className={panelBase}>
        <SectionHeader title="Intimacies" />
        <div className="space-y-1 mb-2">
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
        categories={data.charms}
        onChange={c => update({ charms: c })}
        dragEnabled={!editMode}
      />
    ),

    effects: (
      <EffectPanel
        categories={data.effects}
        onChange={c => update({ effects: c })}
        dragEnabled={!editMode}
      />
    ),

    inventory: (
      <InventoryPanel
        categories={data.inventory}
        onChange={c => update({ inventory: c })}
        dragEnabled={!editMode}
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
