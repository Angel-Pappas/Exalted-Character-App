import { useState } from 'react'
import type { SheetData, AbilityData, MeritEntry, IntimacyEntry, HealthBox } from '../types/character'

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
    languages: [],
    merits: [],
    intimacies: [],
    motes: { current: 0, committed: 0, total: 0 },
    health: DEFAULT_HEALTH.map(h => ({ ...h })),
  }
}

interface Props {
  sheet: SheetData
  onChange: (sheet: SheetData) => void
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">{title}</h2>
}

export default function SheetTab({ sheet, onChange }: Props) {
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
  }

  const [newLanguage, setNewLanguage] = useState('')
  const [newMeritType, setNewMeritType] = useState<MeritEntry['type']>('Primary')
  const [newMeritName, setNewMeritName] = useState('')
  const [newIntensity, setNewIntensity] = useState<IntimacyEntry['intensity']>('Minor')
  const [newIntimacyDesc, setNewIntimacyDesc] = useState('')

  function update(partial: Partial<SheetData>) {
    onChange({ ...data, ...partial })
  }

  function setAttr(name: string, value: number) {
    update({ attributes: { ...data.attributes, [name]: value } })
  }

  function setAbility(name: string, patch: Partial<AbilityData>) {
    update({ abilities: { ...data.abilities, [name]: { ...(data.abilities[name] ?? defaultAbility), ...patch } } })
  }

  function setDefense(name: string, value: number) {
    update({ defenses: { ...data.defenses, [name]: value } })
  }

  function addLanguage() {
    if (!newLanguage.trim()) return
    update({ languages: [...data.languages, newLanguage.trim()] })
    setNewLanguage('')
  }

  function removeLanguage(i: number) {
    update({ languages: data.languages.filter((_, idx) => idx !== i) })
  }

  function addMerit() {
    if (!newMeritName.trim()) return
    const entry: MeritEntry = { id: crypto.randomUUID(), type: newMeritType, name: newMeritName.trim() }
    update({ merits: [...data.merits, entry] })
    setNewMeritName('')
  }

  function removeMerit(id: string) {
    update({ merits: data.merits.filter(m => m.id !== id) })
  }

  function addIntimacy() {
    if (!newIntimacyDesc.trim()) return
    const entry: IntimacyEntry = { id: crypto.randomUUID(), intensity: newIntensity, description: newIntimacyDesc.trim() }
    update({ intimacies: [...data.intimacies, entry] })
    setNewIntimacyDesc('')
  }

  function removeIntimacy(id: string) {
    update({ intimacies: data.intimacies.filter(i => i.id !== id) })
  }

  function toggleHealth(i: number) {
    const health = data.health.map((h, idx) => idx === i ? { ...h, checked: !h.checked } : h)
    update({ health })
  }

  const inputCls = "w-14 text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
  const addInputCls = "flex-1 bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
  const selectCls = "bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8">

      {/* Attributes */}
      <section>
        <SectionHeader title="Attributes" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ATTRIBUTE_GROUPS.map(group => (
            <div key={group.label} className="bg-stone-900 border border-stone-700 rounded-lg p-4">
              <div className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-3">{group.label}</div>
              <div className="space-y-2">
                {group.attrs.map(attr => (
                  <div key={attr} className="flex items-center justify-between">
                    <span className="text-sm text-stone-200">{attr}</span>
                    <input type="number" min={0} max={10} value={data.attributes[attr] ?? 0}
                      onChange={e => setAttr(attr, parseInt(e.target.value) || 0)}
                      className={inputCls} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Defenses */}
      <section>
        <SectionHeader title="Defenses" />
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
          <div className="flex flex-wrap gap-6">
            {DEFENSES.map(def => (
              <div key={def} className="flex flex-col items-center gap-1">
                <span className="text-xs text-stone-400">{def}</span>
                <input type="number" min={0} value={data.defenses[def] ?? 0}
                  onChange={e => setDefense(def, parseInt(e.target.value) || 0)}
                  className={inputCls} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Motes */}
      <section>
        <SectionHeader title="Motes" />
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
          <div className="flex flex-wrap gap-6">
            {(['current', 'committed', 'total'] as const).map(key => (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className="text-xs text-stone-400 capitalize">{key}</span>
                <input type="number" min={0} value={data.motes[key]}
                  onChange={e => update({ motes: { ...data.motes, [key]: parseInt(e.target.value) || 0 } })}
                  className={inputCls} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Health */}
      <section>
        <SectionHeader title="Health" />
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
          <div className="flex flex-wrap gap-3">
            {data.health.map((box, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-stone-400">{box.penalty}</span>
                <button
                  onClick={() => toggleHealth(i)}
                  className={`w-7 h-7 rounded border-2 transition-colors ${
                    box.checked
                      ? 'bg-red-600 border-red-500'
                      : 'bg-transparent border-stone-600 hover:border-red-400'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Abilities */}
      <section>
        <SectionHeader title="Abilities" />
        <div className="bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-stone-400 border-b border-stone-700">
                <th className="text-left py-2 px-4 font-medium">Ability</th>
                <th className="text-center py-2 px-3 font-medium w-16">Rating</th>
                <th className="text-left py-2 px-3 font-medium">Specialty</th>
                <th className="text-center py-2 px-3 font-medium w-10" title="Excellency">Ex</th>
              </tr>
            </thead>
            <tbody>
              {ABILITIES.map(ability => {
                const ab = data.abilities[ability] ?? defaultAbility
                return (
                  <tr key={ability} className={`border-b border-stone-800 transition-colors ${
                    ab.excellency ? 'bg-amber-950/40 hover:bg-amber-950/60' : 'hover:bg-stone-800/50'
                  }`}>
                    <td className={`py-2 px-4 font-medium ${ab.excellency ? 'text-amber-300' : 'text-stone-200'}`}>{ability}</td>
                    <td className="py-2 px-3 text-center">
                      <input type="number" min={0} max={10} value={ab.rating}
                        onChange={e => setAbility(ability, { rating: parseInt(e.target.value) || 0 })}
                        className="w-12 text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-1 text-sm focus:outline-none focus:border-amber-500" />
                    </td>
                    <td className="py-2 px-3">
                      <input type="text" value={ab.specialty}
                        onChange={e => setAbility(ability, { specialty: e.target.value })}
                        placeholder="—"
                        className="w-full bg-transparent border-b border-stone-700 text-stone-300 placeholder-stone-600 text-sm focus:outline-none focus:border-amber-500 px-1 py-0.5" />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button onClick={() => setAbility(ability, { excellency: !ab.excellency })}
                        className={`w-5 h-5 rounded-full border-2 transition-colors ${
                          ab.excellency ? 'bg-amber-400 border-amber-400' : 'bg-transparent border-stone-600 hover:border-amber-500'
                        }`} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Languages */}
      <section>
        <SectionHeader title="Languages" />
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-2">
          {data.languages.map((lang, i) => (
            <div key={i} className="flex items-center justify-between text-sm text-stone-200">
              <span>{lang}</span>
              <button onClick={() => removeLanguage(i)} className="text-stone-600 hover:text-red-400 text-xs transition-colors">✕</button>
            </div>
          ))}
          {data.languages.length === 0 && <p className="text-xs text-stone-500">No languages added.</p>}
          <div className="flex gap-2 pt-1">
            <input type="text" value={newLanguage} onChange={e => setNewLanguage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addLanguage()}
              placeholder="Add language…" className={addInputCls} />
            <button onClick={addLanguage} className="bg-stone-700 hover:bg-stone-600 text-white rounded px-3 py-1 text-sm transition-colors">Add</button>
          </div>
        </div>
      </section>

      {/* Merits */}
      <section>
        <SectionHeader title="Merits" />
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-2">
          {data.merits.map(merit => (
            <div key={merit.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  merit.type === 'Primary' ? 'bg-amber-900 text-amber-300' :
                  merit.type === 'Secondary' ? 'bg-sky-900 text-sky-300' :
                  'bg-stone-700 text-stone-300'
                }`}>{merit.type}</span>
                <span className="text-stone-200">{merit.name}</span>
              </div>
              <button onClick={() => removeMerit(merit.id)} className="text-stone-600 hover:text-red-400 text-xs transition-colors">✕</button>
            </div>
          ))}
          {data.merits.length === 0 && <p className="text-xs text-stone-500">No merits added.</p>}
          <div className="flex gap-2 pt-1">
            <select value={newMeritType} onChange={e => setNewMeritType(e.target.value as MeritEntry['type'])} className={selectCls}>
              <option>Primary</option>
              <option>Secondary</option>
              <option>Tertiary</option>
            </select>
            <input type="text" value={newMeritName} onChange={e => setNewMeritName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMerit()}
              placeholder="Merit name…" className={addInputCls} />
            <button onClick={addMerit} className="bg-stone-700 hover:bg-stone-600 text-white rounded px-3 py-1 text-sm transition-colors">Add</button>
          </div>
        </div>
      </section>

      {/* Intimacies */}
      <section>
        <SectionHeader title="Intimacies" />
        <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-2">
          {data.intimacies.map(intimacy => (
            <div key={intimacy.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  intimacy.intensity === 'Defining' ? 'bg-purple-900 text-purple-300' :
                  intimacy.intensity === 'Major' ? 'bg-amber-900 text-amber-300' :
                  'bg-stone-700 text-stone-300'
                }`}>{intimacy.intensity}</span>
                <span className="text-stone-200">{intimacy.description}</span>
              </div>
              <button onClick={() => removeIntimacy(intimacy.id)} className="text-stone-600 hover:text-red-400 text-xs transition-colors">✕</button>
            </div>
          ))}
          {data.intimacies.length === 0 && <p className="text-xs text-stone-500">No intimacies added.</p>}
          <div className="flex gap-2 pt-1">
            <select value={newIntensity} onChange={e => setNewIntensity(e.target.value as IntimacyEntry['intensity'])} className={selectCls}>
              <option>Minor</option>
              <option>Major</option>
              <option>Defining</option>
            </select>
            <input type="text" value={newIntimacyDesc} onChange={e => setNewIntimacyDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIntimacy()}
              placeholder="Describe intimacy…" className={addInputCls} />
            <button onClick={addIntimacy} className="bg-stone-700 hover:bg-stone-600 text-white rounded px-3 py-1 text-sm transition-colors">Add</button>
          </div>
        </div>
      </section>

    </div>
  )
}
