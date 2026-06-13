import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { GameData, WeaponTableRow } from '../types/character'
import { DEFAULT_GAME_DATA } from '../types/character'

const TABS = ['Information'] as const
type Tab = typeof TABS[number]

export default function OptionsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('Information')
  const [data, setData] = useState<GameData>(DEFAULT_GAME_DATA)
  const [saving, setSaving] = useState(false)
  const [saveTimeout, setSaveTimeoutState] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('game_data')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.data) {
          const merged: GameData = {
            weapons: row.data.weapons ?? DEFAULT_GAME_DATA.weapons,
          }
          setData(merged)
        }
        setLoaded(true)
      })
  }, [user])

  const save = useCallback(async (next: GameData) => {
    if (!user) return
    setSaving(true)
    await supabase
      .from('game_data')
      .upsert({ user_id: user.id, data: next }, { onConflict: 'user_id' })
    setSaving(false)
  }, [user])

  function update(next: GameData) {
    setData(next)
    if (saveTimeout) clearTimeout(saveTimeout)
    setSaveTimeoutState(setTimeout(() => save(next), 1000))
  }

  function updateWeapon(idx: number, patch: Partial<WeaponTableRow>) {
    const weapons = data.weapons.map((r, i) => i === idx ? { ...r, ...patch } : r)
    update({ ...data, weapons })
  }

  function addWeaponRow() {
    update({ ...data, weapons: [...data.weapons, { category: '', accuracy: 0, damage: 0, defense: 0, overwhelming: 1 }] })
  }

  function removeWeaponRow(idx: number) {
    update({ ...data, weapons: data.weapons.filter((_, i) => i !== idx) })
  }

  const input = "bg-stone-800 border border-stone-700 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 w-full"
  const numInput = "bg-stone-800 border border-stone-700 text-stone-100 rounded px-1 py-1 text-xs focus:outline-none focus:border-amber-500 text-center w-14"

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm">← Back</button>
          <h1 className="text-amber-400 font-semibold">Options</h1>
        </div>
        {saving && <span className="text-xs text-stone-500">Saving…</span>}
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-stone-700 px-4 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!loaded ? (
          <p className="text-stone-500 text-sm">Loading…</p>
        ) : activeTab === 'Information' ? (
          <div className="max-w-2xl space-y-8">

            {/* Weapons table */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-amber-400">Weapons</h2>
                <button
                  onClick={addWeaponRow}
                  className="text-xs text-stone-500 hover:text-amber-400 transition-colors"
                >
                  + row
                </button>
              </div>

              <div className="rounded-lg border border-stone-700 overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_4rem_4rem_4rem_5rem_1.5rem] gap-2 px-3 py-2 bg-stone-800 border-b border-stone-700">
                  {['Category', 'Accuracy', 'Damage', 'Defense', 'Overwhelming', ''].map(h => (
                    <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                {data.weapons.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_4rem_4rem_4rem_5rem_1.5rem] gap-2 px-3 py-1.5 items-center border-b border-stone-800 last:border-0"
                  >
                    <input
                      type="text"
                      value={row.category}
                      onChange={e => updateWeapon(idx, { category: e.target.value })}
                      placeholder="Category…"
                      className={input}
                    />
                    {(['accuracy', 'damage', 'defense', 'overwhelming'] as const).map(field => (
                      <input
                        key={field}
                        type="number"
                        value={row[field]}
                        onChange={e => updateWeapon(idx, { [field]: parseInt(e.target.value) || 0 })}
                        className={numInput}
                      />
                    ))}
                    <button
                      onClick={() => removeWeaponRow(idx)}
                      className="text-stone-600 hover:text-red-400 transition-colors text-xs text-center"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {data.weapons.length === 0 && (
                  <p className="text-xs text-stone-600 px-3 py-2">No rows. Add one above.</p>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-1.5">Values shown as modifiers (e.g. +2 Accuracy).</p>
            </section>

          </div>
        ) : null}
      </div>
    </div>
  )
}
