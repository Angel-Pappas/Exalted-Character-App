import { useState } from 'react'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { GridLayout, useContainerWidth, noCompactor } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import type { SheetData, AbilityData, MeritEntry, IntimacyEntry, HealthBox, PanelLayout } from '../types/character'

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
  { i: 'attributes', x: 0,  y: 0,  w: 8,  h: 22, minW: 4, minH: 8 },
  { i: 'abilities',  x: 0,  y: 22, w: 8,  h: 38, minW: 4, minH: 8 },
  { i: 'defenses',   x: 8,  y: 0,  w: 8,  h: 11, minW: 4, minH: 8 },
  { i: 'motes',      x: 8,  y: 11, w: 8,  h: 8,  minW: 4, minH: 8 },
  { i: 'health',     x: 8,  y: 19, w: 8,  h: 8,  minW: 4, minH: 8 },
  { i: 'merits',     x: 16, y: 0,  w: 14, h: 18, minW: 4, minH: 8 },
  { i: 'languages',  x: 16, y: 18, w: 14, h: 10, minW: 4, minH: 8 },
  { i: 'intimacies', x: 16, y: 28, w: 14, h: 18, minW: 4, minH: 8 },
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
  }
}

interface Props {
  sheet: SheetData
  onChange: (sheet: SheetData) => void
}

function SectionHeader({ title }: { title: string }) {
  return <div className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-2">{title}</div>
}

const numInput = "w-[30px] text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-amber-500"

export default function SheetTab({ sheet, onChange }: Props) {
  const [editMode, setEditMode] = useState(false)
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
    layout: sheet.layout ?? DEFAULT_LAYOUT.map(l => ({ ...l })),
  }

  const [newLanguage, setNewLanguage] = useState('')
  const [newMeritType, setNewMeritType] = useState<MeritEntry['type']>('Primary')
  const [newMeritName, setNewMeritName] = useState('')
  const [newIntensity, setNewIntensity] = useState<IntimacyEntry['intensity']>('Minor')
  const [newIntimacyDesc, setNewIntimacyDesc] = useState('')

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
  function addMerit() {
    if (!newMeritName.trim()) return
    update({ merits: [...data.merits, { id: crypto.randomUUID(), type: newMeritType, name: newMeritName.trim() }] })
    setNewMeritName('')
  }
  function removeMerit(id: string) { update({ merits: data.merits.filter(m => m.id !== id) }) }
  function addIntimacy() {
    if (!newIntimacyDesc.trim()) return
    update({ intimacies: [...data.intimacies, { id: crypto.randomUUID(), intensity: newIntensity, description: newIntimacyDesc.trim() }] })
    setNewIntimacyDesc('')
  }
  function removeIntimacy(id: string) { update({ intimacies: data.intimacies.filter(i => i.id !== id) }) }
  function toggleHealth(i: number) {
    update({ health: data.health.map((h, idx) => idx === i ? { ...h, checked: !h.checked } : h) })
  }

  const panelBase = "bg-stone-900 border border-stone-700 rounded-lg p-2 overflow-auto h-full"

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
            <div key={merit.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`shrink-0 font-semibold px-1 py-0.5 rounded ${merit.type === 'Primary' ? 'bg-amber-900 text-amber-300' : merit.type === 'Secondary' ? 'bg-sky-900 text-sky-300' : 'bg-stone-700 text-stone-300'}`}>{merit.type[0]}</span>
                <span className="text-stone-200 truncate">{merit.name}</span>
              </div>
              <button onClick={() => removeMerit(merit.id)} className="text-stone-600 hover:text-red-400 ml-1 shrink-0 transition-colors">✕</button>
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
            <div key={i} className="flex items-center justify-between text-xs text-stone-200">
              <span>{lang}</span>
              <button onClick={() => removeLanguage(i)} className="text-stone-600 hover:text-red-400 transition-colors">✕</button>
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
            <div key={intimacy.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`shrink-0 font-semibold px-1 py-0.5 rounded ${intimacy.intensity === 'Defining' ? 'bg-purple-900 text-purple-300' : intimacy.intensity === 'Major' ? 'bg-amber-900 text-amber-300' : 'bg-stone-700 text-stone-300'}`}>{intimacy.intensity[0]}</span>
                <span className="text-stone-200 truncate">{intimacy.description}</span>
              </div>
              <button onClick={() => removeIntimacy(intimacy.id)} className="text-stone-600 hover:text-red-400 ml-1 shrink-0 transition-colors">✕</button>
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
  }

  // Measure the grid container's exact pixel width so GridLayout snap points
  const { width, containerRef, mounted } = useContainerWidth()

  return (
    <div className="relative" ref={containerRef}>
      {/* Edit layout toggle */}
      <div className="absolute top-2 right-4 z-10">
        <button
          onClick={() => setEditMode(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            editMode
              ? 'bg-amber-500 text-stone-950 hover:bg-amber-400'
              : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {editMode ? 'Done' : 'Edit Layout'}
        </button>
      </div>

      {mounted && (
        <GridLayout
          width={width}
          gridConfig={{ cols: 64, rowHeight: 10, margin: [0, 0], containerPadding: [0, 0] }}
          dragConfig={{ enabled: editMode, handle: '.drag-handle' }}
          resizeConfig={{ enabled: editMode }}
          compactor={noCompactor}
          layout={data.layout}
          onLayoutChange={(newLayout) => update({ layout: newLayout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })) })}
          style={editMode ? {
            backgroundImage: 'linear-gradient(rgba(251,191,36,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.08) 1px, transparent 1px)',
            backgroundSize: `${width / 64}px 10px`,
          } : undefined}
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
