import type { SheetData, AbilityData } from '../types/character'

const ATTRIBUTE_GROUPS = [
  { label: 'Physical', attrs: ['Strength', 'Dexterity', 'Stamina'] },
  { label: 'Social', attrs: ['Charisma', 'Manipulation', 'Appearance'] },
  { label: 'Mental', attrs: ['Perception', 'Intelligence', 'Wits'] },
]

const ABILITIES = [
  'Athletics',
  'Awareness',
  'Close Combat [Unarmed]',
  'Craft',
  'Embassy',
  'Integrity',
  'Navigate',
  'Performance',
  'Physique',
  'Presence',
  'Ranged Combat',
  'Sagacity',
  'Stealth',
  'War',
]

const defaultAbility: AbilityData = { rating: 0, specialty: '', excellency: false }

function defaultSheet(): SheetData {
  const attributes: Record<string, number> = {}
  for (const g of ATTRIBUTE_GROUPS)
    for (const a of g.attrs)
      attributes[a] = 0

  const abilities: Record<string, AbilityData> = {}
  for (const a of ABILITIES)
    abilities[a] = { ...defaultAbility }

  return { attributes, abilities }
}

interface Props {
  sheet: SheetData
  onChange: (sheet: SheetData) => void
}

export default function SheetTab({ sheet, onChange }: Props) {
  const data: SheetData = {
    attributes: { ...defaultSheet().attributes, ...sheet.attributes },
    abilities: { ...defaultSheet().abilities, ...sheet.abilities },
  }

  function setAttr(name: string, value: number) {
    onChange({ ...data, attributes: { ...data.attributes, [name]: value } })
  }

  function setAbility(name: string, patch: Partial<AbilityData>) {
    onChange({
      ...data,
      abilities: {
        ...data.abilities,
        [name]: { ...(data.abilities[name] ?? defaultAbility), ...patch },
      },
    })
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">

      {/* Attributes */}
      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Attributes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ATTRIBUTE_GROUPS.map(group => (
            <div key={group.label} className="bg-stone-900 border border-stone-700 rounded-lg p-4">
              <div className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-3">{group.label}</div>
              <div className="space-y-2">
                {group.attrs.map(attr => (
                  <div key={attr} className="flex items-center justify-between">
                    <span className="text-sm text-stone-200">{attr}</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={data.attributes[attr] ?? 0}
                      onChange={e => setAttr(attr, parseInt(e.target.value) || 0)}
                      className="w-14 text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Abilities */}
      <section>
        <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">Abilities</h2>
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
                  <tr
                    key={ability}
                    className={`border-b border-stone-800 transition-colors ${
                      ab.excellency
                        ? 'bg-amber-950/40 hover:bg-amber-950/60'
                        : 'hover:bg-stone-800/50'
                    }`}
                  >
                    <td className={`py-2 px-4 font-medium ${ab.excellency ? 'text-amber-300' : 'text-stone-200'}`}>
                      {ability}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={ab.rating}
                        onChange={e => setAbility(ability, { rating: parseInt(e.target.value) || 0 })}
                        className="w-12 text-center bg-stone-800 border border-stone-600 text-stone-100 rounded px-1 py-1 text-sm focus:outline-none focus:border-amber-500"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={ab.specialty}
                        onChange={e => setAbility(ability, { specialty: e.target.value })}
                        placeholder="—"
                        className="w-full bg-transparent border-b border-stone-700 text-stone-300 placeholder-stone-600 text-sm focus:outline-none focus:border-amber-500 px-1 py-0.5"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => setAbility(ability, { excellency: !ab.excellency })}
                        title={ab.excellency ? 'Excellency active' : 'No excellency'}
                        className={`w-5 h-5 rounded-full border-2 transition-colors ${
                          ab.excellency
                            ? 'bg-amber-400 border-amber-400'
                            : 'bg-transparent border-stone-600 hover:border-amber-500'
                        }`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
