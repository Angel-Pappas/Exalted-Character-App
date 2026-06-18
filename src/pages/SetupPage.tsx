import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { GameData, WeaponTableRow, ArmorTableRow, TagEntry, EssenceMoteRow, AnimaStateRow, LibraryCharm, ExaltType } from '../types/character'
import { DEFAULT_GAME_DATA } from '../types/character'

const TABS = ['Tables', 'Charms', 'Users'] as const
type Tab = typeof TABS[number]

interface UserProfile {
  user_id: string
  username: string | null
  display_name: string | null
  role: 'admin' | 'player'
}

interface CharacterRow {
  id: string
  name: string
  user_id: string
  data?: { sheet?: { exaltType?: string; caste?: string } }
}

// Tooltip shown on column header hover
function Tooltip({ text }: { text: string }) {
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-xs text-stone-300 leading-relaxed shadow-xl pointer-events-none">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-600" />
    </div>
  )
}

function ColHeader({ label, tip }: { label: string; tip?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="relative inline-flex items-center gap-1 cursor-default select-none"
      onMouseEnter={() => tip && setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{label}</span>
      {tip && <span className="text-stone-600 text-[9px]">?</span>}
      {show && tip && <Tooltip text={tip} />}
    </div>
  )
}

const STAT_TIPS: Record<string, string> = {
  Accuracy: "A weapon's accuracy adds successes to the attack roll.",
  Damage: "A weapon's damage adds successes to the damage roll.",
  Defense: "A weapon's defense increases the character's Defense by its rating when taking the defend other or full defense actions.",
  Overwhelming: "A weapon's Overwhelming is the minimum Power generated through a withering attack's extra successes (even if the attack misses). Overwhelming cannot exceed 4 through any combination of effects.",
  Soak: "An armor's Soak value adds to the character's Soak, which subtracts successes from incoming damage rolls.",
  'Mobility Penalty': "Mobility penalties are success-based and apply to Athletics or Stealth rolls involving movement and Physique rolls where enduring fatigue or the environment apply.",
  Hardness: "An armor's Hardness increases the amount of Power required for a character to make a decisive attack against the wearer.",
}

function EditCharmRow({ charm, onSave, onCancel, saving, textInput }: {
  charm: LibraryCharm
  onSave: (c: LibraryCharm) => void
  onCancel: () => void
  saving: boolean
  textInput: string
}) {
  const [form, setForm] = useState({ ...charm })
  const set = (patch: Partial<LibraryCharm>) => setForm(f => ({ ...f, ...patch }))
  return (
    <div className="px-3 py-2 space-y-1.5 bg-stone-800/50">
      <input value={form.ability} onChange={e => set({ ability: e.target.value })} placeholder="Ability group…" className={textInput} />
      <input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Name…" className={textInput} />
      <textarea value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Description…" rows={3} className={`${textInput} resize-none`} />
      <input value={form.mechanicalKey ?? ''} onChange={e => set({ mechanicalKey: e.target.value || null })} placeholder="Mechanical key (optional)…" className={textInput} />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300 transition-colors">Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving || !form.name.trim()} className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1 rounded transition-colors">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function EditExaltRow({ et, onSave, onCancel, saving, textInput }: {
  et: ExaltType
  onSave: (et: ExaltType, castesText: string) => void
  onCancel: () => void
  saving: boolean
  textInput: string
}) {
  const [form, setForm] = useState({ ...et })
  const [castesText, setCastesText] = useState(et.castes.join(', '))
  return (
    <div className="px-3 py-2 space-y-1.5 bg-stone-800/50">
      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name…" className={textInput} />
      <div className="flex gap-2 items-center">
        <span className="text-xs text-stone-400 shrink-0">Label:</span>
        {(['Caste', 'Aspect'] as const).map(l => (
          <button key={l} onClick={() => setForm(f => ({ ...f, casteLabel: l }))}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${form.casteLabel === l ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 border border-stone-600 text-stone-400 hover:text-stone-200'}`}>
            {l}
          </button>
        ))}
      </div>
      <input value={castesText} onChange={e => setCastesText(e.target.value)} placeholder="Castes/Aspects, comma-separated…" className={textInput} />
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="text-xs text-stone-500 hover:text-stone-300 transition-colors">Cancel</button>
        <button onClick={() => onSave(form, castesText)} disabled={saving || !form.name.trim()} className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1 rounded transition-colors">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function SetupPage() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('Tables')
  const [data, setData] = useState<GameData>(DEFAULT_GAME_DATA)
  const [saving, setSaving] = useState(false)
  const [saveTimeout, setSaveTimeoutState] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Users tab
  const [users, setUsers] = useState<UserProfile[]>([])
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [userChars, setUserChars] = useState<CharacterRow[]>([])
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [roleChanging, setRoleChanging] = useState<string | null>(null)

  async function loadUsers() {
    const [{ data: profiles }, { data: chars }] = await Promise.all([
      supabase.from('user_profiles').select('user_id, username, display_name, role'),
      supabase.from('characters').select('id, name, user_id, data'),
    ])
    setUsers((profiles ?? []) as UserProfile[])
    setUserChars((chars ?? []) as CharacterRow[])
    setUsersLoaded(true)
  }

  async function changeRole(userId: string, newRole: 'admin' | 'player') {
    setRoleChanging(userId)
    await supabase.from('user_profiles').update({ role: newRole }).eq('user_id', userId)
    setUsers(us => us.map(u => u.user_id === userId ? { ...u, role: newRole } : u))
    setRoleChanging(null)
  }

  function toggleExpand(userId: string) {
    setExpandedUsers(s => {
      const next = new Set(s)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  // Charm library
  const [charms, setCharms] = useState<LibraryCharm[]>([])
  const [charmsLoaded, setCharmsLoaded] = useState(false)
  const [charmSaving, setCharmSaving] = useState(false)
  const isOwner = role === 'admin'

  // New charm form
  const [newCharmAbility, setNewCharmAbility] = useState('')
  const [newCharmName, setNewCharmName] = useState('')
  const [newCharmDesc, setNewCharmDesc] = useState('')
  const [newCharmKey, setNewCharmKey] = useState('')
  const [addingCharm, setAddingCharm] = useState(false)
  const [editingCharmId, setEditingCharmId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('game_data')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row?.data) {
          setData({
            weapons:   row.data.weapons   ?? DEFAULT_GAME_DATA.weapons,
            armor:     row.data.armor     ?? DEFAULT_GAME_DATA.armor,
            tagGroups:    row.data.tagGroups    ?? DEFAULT_GAME_DATA.tagGroups,
            essenceMotes: row.data.essenceMotes ?? DEFAULT_GAME_DATA.essenceMotes,
            animaStates:  row.data.animaStates  ?? DEFAULT_GAME_DATA.animaStates,
          })
        }
        setLoaded(true)
      })
  }, [user])

  const save = useCallback(async (next: GameData) => {
    if (!user) return
    setSaving(true)
    await supabase.from('game_data').upsert({ user_id: user.id, data: next }, { onConflict: 'user_id' })
    setSaving(false)
  }, [user])

  function update(next: GameData) {
    setData(next)
    if (saveTimeout) clearTimeout(saveTimeout)
    setSaveTimeoutState(setTimeout(() => save(next), 1000))
  }

  function updateWeapon(idx: number, patch: Partial<WeaponTableRow>) {
    update({ ...data, weapons: data.weapons.map((r, i) => i === idx ? { ...r, ...patch } : r) })
  }
  function addWeaponRow() {
    update({ ...data, weapons: [...data.weapons, { category: '', accuracy: 0, damage: 0, defense: 0, overwhelming: 1 }] })
  }
  function removeWeaponRow(idx: number) {
    update({ ...data, weapons: data.weapons.filter((_, i) => i !== idx) })
  }

  function updateArmor(idx: number, patch: Partial<ArmorTableRow>) {
    update({ ...data, armor: data.armor.map((r, i) => i === idx ? { ...r, ...patch } : r) })
  }
  function addArmorRow() {
    update({ ...data, armor: [...data.armor, { category: '', soak: 0, mobilityPenalty: 0, hardness: 0 }] })
  }
  function removeArmorRow(idx: number) {
    update({ ...data, armor: data.armor.filter((_, i) => i !== idx) })
  }

  function updateEssenceMote(idx: number, patch: Partial<EssenceMoteRow>) {
    update({ ...data, essenceMotes: data.essenceMotes.map((r, i) => i === idx ? { ...r, ...patch } : r) })
  }
  function addEssenceMoteRow() {
    update({ ...data, essenceMotes: [...data.essenceMotes, { essence: 0, motes: 0 }] })
  }
  function removeEssenceMoteRow(idx: number) {
    update({ ...data, essenceMotes: data.essenceMotes.filter((_, i) => i !== idx) })
  }

  function updateAnimaState(idx: number, patch: Partial<AnimaStateRow>) {
    update({ ...data, animaStates: data.animaStates.map((r, i) => i === idx ? { ...r, ...patch } : r) })
  }
  function addAnimaStateRow() {
    const nextLevel = (data.animaStates ?? []).length
    update({ ...data, animaStates: [...(data.animaStates ?? []), { level: nextLevel, label: '' }] })
  }
  function removeAnimaStateRow(idx: number) {
    update({ ...data, animaStates: (data.animaStates ?? []).filter((_, i) => i !== idx) })
  }

  function updateTag(gIdx: number, tIdx: number, patch: Partial<TagEntry>) {
    const tagGroups = data.tagGroups.map((g, gi) => gi !== gIdx ? g : { ...g, tags: g.tags.map((t, ti) => ti !== tIdx ? t : { ...t, ...patch }) })
    update({ ...data, tagGroups })
  }
  function addTag(gIdx: number) {
    const tagGroups = data.tagGroups.map((g, gi) => gi !== gIdx ? g : { ...g, tags: [...g.tags, { name: '', description: '' }] })
    update({ ...data, tagGroups })
  }
  function removeTag(gIdx: number, tIdx: number) {
    const tagGroups = data.tagGroups.map((g, gi) => gi !== gIdx ? g : { ...g, tags: g.tags.filter((_, ti) => ti !== tIdx) })
    update({ ...data, tagGroups })
  }
  function addTagGroup() {
    update({ ...data, tagGroups: [...data.tagGroups, { group: '', tags: [] }] })
  }
  function updateTagGroupName(gIdx: number, name: string) {
    const tagGroups = data.tagGroups.map((g, gi) => gi !== gIdx ? g : { ...g, group: name })
    update({ ...data, tagGroups })
  }
  function removeTagGroup(gIdx: number) {
    update({ ...data, tagGroups: data.tagGroups.filter((_, gi) => gi !== gIdx) })
  }

  // Exalt types
  const [exaltTypes, setExaltTypes] = useState<ExaltType[]>([])
  const [exaltTypesLoaded, setExaltTypesLoaded] = useState(false)
  const [exaltSaving, setExaltSaving] = useState(false)
  const [editingExaltId, setEditingExaltId] = useState<string | null>(null)
  const [addingExalt, setAddingExalt] = useState(false)
  const [newExalt, setNewExalt] = useState<Omit<ExaltType, 'id' | 'sort_order'>>({ name: '', casteLabel: 'Caste', castes: [] })
  const [newExaltCastesText, setNewExaltCastesText] = useState('')

  useEffect(() => {
    supabase.from('exalt_types').select('*').order('sort_order').order('name')
      .then(({ data: rows }) => {
        if (rows) setExaltTypes(rows.map(r => ({
          id: r.id, name: r.name, casteLabel: r.caste_label as 'Caste' | 'Aspect',
          castes: r.castes ?? [], sort_order: r.sort_order,
        })))
        setExaltTypesLoaded(true)
      })
  }, [])

  async function addExaltType() {
    if (!newExalt.name.trim()) return
    setExaltSaving(true)
    const castesArr = newExaltCastesText.split(',').map(s => s.trim()).filter(Boolean)
    const { data: row } = await supabase.from('exalt_types').insert({
      name: newExalt.name.trim(),
      caste_label: newExalt.casteLabel,
      castes: castesArr,
      sort_order: exaltTypes.length,
    }).select().single()
    if (row) setExaltTypes(prev => [...prev, { id: row.id, name: row.name, casteLabel: row.caste_label, castes: row.castes, sort_order: row.sort_order }])
    setNewExalt({ name: '', casteLabel: 'Caste', castes: [] })
    setNewExaltCastesText('')
    setAddingExalt(false)
    setExaltSaving(false)
  }

  async function saveExaltType(et: ExaltType, castesText: string) {
    setExaltSaving(true)
    const castesArr = castesText.split(',').map(s => s.trim()).filter(Boolean)
    await supabase.from('exalt_types').update({
      name: et.name, caste_label: et.casteLabel, castes: castesArr,
    }).eq('id', et.id)
    setExaltTypes(prev => prev.map(e => e.id === et.id ? { ...et, castes: castesArr } : e))
    setEditingExaltId(null)
    setExaltSaving(false)
  }

  async function deleteExaltType(id: string) {
    setExaltSaving(true)
    await supabase.from('exalt_types').delete().eq('id', id)
    setExaltTypes(prev => prev.filter(e => e.id !== id))
    setExaltSaving(false)
  }

  useEffect(() => {
    if (activeTab === 'Users' && !usersLoaded) loadUsers()
  }, [activeTab])

  // Load charm library (all users)
  useEffect(() => {
    supabase.from('charm_library').select('*').order('ability').order('sort_order').order('name')
      .then(({ data: rows }) => {
        if (rows) setCharms(rows.map(r => ({
          id: r.id, ability: r.ability, name: r.name,
          description: r.description, mechanicalKey: r.mechanical_key ?? null, sort_order: r.sort_order,
        })))
        setCharmsLoaded(true)
      })
  }, [])

  async function addCharm() {
    if (!newCharmName.trim()) return
    setCharmSaving(true)
    const { data: row } = await supabase.from('charm_library').insert({
      ability: newCharmAbility.trim(),
      name: newCharmName.trim(),
      description: newCharmDesc.trim(),
      mechanical_key: newCharmKey.trim() || null,
      sort_order: charms.filter(c => c.ability === newCharmAbility.trim()).length,
    }).select().single()
    if (row) setCharms(prev => [...prev, { id: row.id, ability: row.ability, name: row.name, description: row.description, mechanicalKey: row.mechanical_key ?? null, sort_order: row.sort_order }])
    setNewCharmName(''); setNewCharmDesc(''); setNewCharmKey(''); setAddingCharm(false)
    setCharmSaving(false)
  }

  async function saveCharm(charm: LibraryCharm) {
    setCharmSaving(true)
    await supabase.from('charm_library').update({
      ability: charm.ability, name: charm.name, description: charm.description,
      mechanical_key: charm.mechanicalKey ?? null,
    }).eq('id', charm.id)
    setCharms(prev => prev.map(c => c.id === charm.id ? charm : c))
    setEditingCharmId(null)
    setCharmSaving(false)
  }

  async function deleteCharm(id: string) {
    setCharmSaving(true)
    await supabase.from('charm_library').delete().eq('id', id)
    setCharms(prev => prev.filter(c => c.id !== id))
    setCharmSaving(false)
  }

  const textInput = "bg-stone-800 border border-stone-700 text-stone-100 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 w-full"
  const numInput  = "bg-stone-800 border border-stone-700 text-stone-100 rounded px-1 py-1 text-xs focus:outline-none focus:border-amber-500 text-center w-14"

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm">← Back</button>
          <h1 className="text-amber-400 font-semibold">Admin</h1>
        </div>
        {saving && <span className="text-xs text-stone-500">Saving…</span>}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-44 shrink-0 border-r border-stone-700 py-4 px-2 space-y-0.5">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${activeTab === tab ? 'bg-stone-800 text-stone-100 font-medium' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'}`}>
              {tab}
            </button>
          ))}
        </nav>

      <div className="flex-1 overflow-auto p-4">
        {!loaded ? <p className="text-stone-500 text-sm">Loading…</p> : activeTab === 'Tables' ? (
          <div className="max-w-2xl space-y-5">

            {/* ── Weapons ── */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-base font-semibold text-amber-400">Weapons</h2>
                <button onClick={addWeaponRow} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">+ row</button>
              </div>
              <div className="rounded-lg border border-stone-700 overflow-visible">
                <div className="grid grid-cols-[1fr_4rem_4rem_4rem_5.5rem_1.5rem] gap-2 px-3 py-1 bg-stone-800 border-b border-stone-700">
                  {(['Category', 'Accuracy', 'Damage', 'Defense', 'Overwhelming', ''] as const).map(h => (
                    <ColHeader key={h} label={h} tip={STAT_TIPS[h]} />
                  ))}
                </div>
                {data.weapons.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_4rem_4rem_4rem_5.5rem_1.5rem] gap-2 px-3 py-0.5 items-center border-b border-stone-800 last:border-0">
                    <input type="text" value={row.category} onChange={e => updateWeapon(idx, { category: e.target.value })} placeholder="Category…" className={textInput} />
                    {(['accuracy', 'damage', 'defense', 'overwhelming'] as const).map(f => (
                      <input key={f} type="number" value={row[f]} onChange={e => updateWeapon(idx, { [f]: parseInt(e.target.value) || 0 })} className={numInput} />
                    ))}
                    <button onClick={() => removeWeaponRow(idx)} className="text-stone-600 hover:text-red-400 transition-colors text-xs text-center">✕</button>
                  </div>
                ))}
                {data.weapons.length === 0 && <p className="text-xs text-stone-600 px-3 py-2">No rows.</p>}
              </div>
              <p className="text-xs text-stone-600 mt-1.5">Values shown as modifiers. Hover column headers for descriptions.</p>
            </section>

            {/* ── Armor ── */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-base font-semibold text-amber-400">Armor</h2>
                <button onClick={addArmorRow} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">+ row</button>
              </div>
              <div className="rounded-lg border border-stone-700 overflow-visible">
                <div className="grid grid-cols-[1fr_4rem_5.5rem_4rem_1.5rem] gap-2 px-3 py-1 bg-stone-800 border-b border-stone-700">
                  {(['Category', 'Soak', 'Mobility Penalty', 'Hardness', ''] as const).map(h => (
                    <ColHeader key={h} label={h} tip={STAT_TIPS[h]} />
                  ))}
                </div>
                {data.armor.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_4rem_5.5rem_4rem_1.5rem] gap-2 px-3 py-0.5 items-center border-b border-stone-800 last:border-0">
                    <input type="text" value={row.category} onChange={e => updateArmor(idx, { category: e.target.value })} placeholder="Category…" className={textInput} />
                    {(['soak', 'mobilityPenalty', 'hardness'] as const).map(f => (
                      <input key={f} type="number" value={row[f]} onChange={e => updateArmor(idx, { [f]: parseInt(e.target.value) || 0 })} className={numInput} />
                    ))}
                    <button onClick={() => removeArmorRow(idx)} className="text-stone-600 hover:text-red-400 transition-colors text-xs text-center">✕</button>
                  </div>
                ))}
                {data.armor.length === 0 && <p className="text-xs text-stone-600 px-3 py-2">No rows.</p>}
              </div>
              <p className="text-xs text-stone-600 mt-1.5">Values shown as modifiers. Hover column headers for descriptions.</p>
            </section>

            {/* ── Essence & Motes ── */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-base font-semibold text-amber-400">Essence &amp; Motes</h2>
                <button onClick={addEssenceMoteRow} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">+ row</button>
              </div>
              <div className="rounded-lg border border-stone-700 overflow-hidden">
                <div className="grid grid-cols-[1fr_4rem_1.5rem] gap-2 px-3 py-1 bg-stone-800 border-b border-stone-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Essence</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Motes</span>
                  <span />
                </div>
                {(data.essenceMotes ?? DEFAULT_GAME_DATA.essenceMotes).map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_4rem_1.5rem] gap-2 px-3 py-0.5 items-center border-b border-stone-800 last:border-0">
                    <input type="number" value={row.essence} onChange={e => updateEssenceMote(idx, { essence: parseInt(e.target.value) || 0 })} className={numInput} />
                    <input type="number" value={row.motes}   onChange={e => updateEssenceMote(idx, { motes:   parseInt(e.target.value) || 0 })} className={numInput} />
                    <button onClick={() => removeEssenceMoteRow(idx)} className="text-stone-600 hover:text-red-400 transition-colors text-xs text-center">✕</button>
                  </div>
                ))}
                {(data.essenceMotes ?? []).length === 0 && <p className="text-xs text-stone-600 px-3 py-2">No rows.</p>}
              </div>
            </section>

            {/* ── Anima States ── */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-base font-semibold text-amber-400">Anima States</h2>
                <button onClick={addAnimaStateRow} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">+ row</button>
              </div>
              <div className="rounded-lg border border-stone-700 overflow-hidden">
                <div className="grid grid-cols-[3rem_1fr_1.5rem] gap-2 px-3 py-1 bg-stone-800 border-b border-stone-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Level</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Label</span>
                  <span />
                </div>
                {(data.animaStates ?? DEFAULT_GAME_DATA.animaStates).map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[3rem_1fr_1.5rem] gap-2 px-3 py-0.5 items-center border-b border-stone-800 last:border-0">
                    <input type="number" value={row.level} onChange={e => updateAnimaState(idx, { level: parseInt(e.target.value) || 0 })} className={numInput} />
                    <input type="text"   value={row.label} onChange={e => updateAnimaState(idx, { label: e.target.value })} placeholder="Label…" className={textInput} />
                    <button onClick={() => removeAnimaStateRow(idx)} className="text-stone-600 hover:text-red-400 transition-colors text-xs text-center">✕</button>
                  </div>
                ))}
                {(data.animaStates ?? []).length === 0 && <p className="text-xs text-stone-600 px-3 py-2">No rows.</p>}
              </div>
            </section>

            {/* ── Equipment Tags ── */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-base font-semibold text-amber-400">Equipment Tags</h2>
                <button onClick={addTagGroup} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">+ group</button>
              </div>
              <div className="space-y-2">
                {data.tagGroups.map((group, gIdx) => (
                  <div key={gIdx} className="rounded-lg border border-stone-700 overflow-hidden">
                    {/* Group header */}
                    <div className="flex items-center justify-between px-3 py-1 bg-stone-800 border-b border-stone-700 gap-2">
                      <input
                        type="text"
                        value={group.group}
                        onChange={e => updateTagGroupName(gIdx, e.target.value)}
                        placeholder="Group name…"
                        className="bg-transparent text-xs font-bold uppercase tracking-wider text-amber-400/80 focus:outline-none placeholder-stone-600 flex-1"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => addTag(gIdx)} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">+ tag</button>
                        <button onClick={() => removeTagGroup(gIdx)} className="text-stone-600 hover:text-red-400 transition-colors text-xs">✕</button>
                      </div>
                    </div>
                    {/* Tags */}
                    {group.tags.length === 0 && <p className="text-xs text-stone-600 px-3 py-2">No tags. Add one above.</p>}
                    {group.tags.map((tag, tIdx) => (
                      <div key={tIdx} className="border-b border-stone-800 last:border-0 px-3 py-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tag.name}
                            onChange={e => updateTag(gIdx, tIdx, { name: e.target.value })}
                            placeholder="Tag name…"
                            className="bg-stone-800 border border-stone-700 text-stone-100 font-semibold rounded px-2 py-0.5 text-xs focus:outline-none focus:border-amber-500 w-36"
                          />
                          <button onClick={() => removeTag(gIdx, tIdx)} className="text-stone-600 hover:text-red-400 transition-colors text-xs ml-auto">✕</button>
                        </div>
                        <textarea
                          value={tag.description}
                          onChange={e => updateTag(gIdx, tIdx, { description: e.target.value })}
                          placeholder="Description…"
                          rows={2}
                          className="w-full bg-stone-800 border border-stone-700 text-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 resize-none placeholder-stone-600"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            {/* ── Exalt Types ── */}
            <section>
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="text-base font-semibold text-amber-400">Exalt Types</h2>
                {isOwner && <button onClick={() => setAddingExalt(v => !v)} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">{addingExalt ? 'Cancel' : '+ type'}</button>}
              </div>

              {addingExalt && isOwner && (
                <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-2 mb-2">
                  <p className="text-xs font-semibold text-amber-400">New Exalt Type</p>
                  <input value={newExalt.name} onChange={e => setNewExalt(f => ({ ...f, name: e.target.value }))} placeholder="Name… (e.g. Solar Exalted)" className={textInput} />
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-stone-400 shrink-0">Label:</span>
                    {(['Caste', 'Aspect'] as const).map(l => (
                      <button key={l} onClick={() => setNewExalt(f => ({ ...f, casteLabel: l }))}
                        className={`px-2 py-0.5 rounded text-xs transition-colors ${newExalt.casteLabel === l ? 'bg-amber-500 text-stone-950' : 'bg-stone-800 border border-stone-600 text-stone-400 hover:text-stone-200'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <input value={newExaltCastesText} onChange={e => setNewExaltCastesText(e.target.value)} placeholder="Castes/Aspects, comma-separated… (e.g. Dawn, Zenith, Twilight)" className={textInput} />
                  <div className="flex justify-end">
                    <button onClick={addExaltType} disabled={exaltSaving || !newExalt.name.trim()} className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1 rounded transition-colors">
                      {exaltSaving ? 'Saving…' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {!exaltTypesLoaded ? <p className="text-xs text-stone-500">Loading…</p> : (
                <div className="rounded-lg border border-stone-700 overflow-hidden divide-y divide-stone-800">
                  {exaltTypes.length === 0 && <p className="text-xs text-stone-600 px-3 py-2">No exalt types yet.</p>}
                  {exaltTypes.map(et => (
                    editingExaltId === et.id && isOwner
                      ? <EditExaltRow key={et.id} et={et} onSave={saveExaltType} onCancel={() => setEditingExaltId(null)} saving={exaltSaving} textInput={textInput} />
                      : (
                        <div key={et.id} className="px-3 py-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-stone-100">{et.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400">{et.casteLabel}</span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5">{et.castes.length ? et.castes.join(', ') : <em>No {et.casteLabel.toLowerCase()}s</em>}</p>
                          </div>
                          {isOwner && (
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => setEditingExaltId(et.id)} className="text-stone-600 hover:text-amber-400 text-xs transition-colors">edit</button>
                              <button onClick={() => deleteExaltType(et.id)} className="text-stone-600 hover:text-red-400 text-xs transition-colors">✕</button>
                            </div>
                          )}
                        </div>
                      )
                  ))}
                </div>
              )}
            </section>

          </div>
        ) : activeTab === 'Charms' ? (
          <div className="max-w-2xl space-y-4">
            {!charmsLoaded ? <p className="text-xs text-stone-500">Loading…</p> : (() => {
              const abilities = [...new Set(charms.map(c => c.ability))].sort()
              const ungrouped = charms.filter(c => !c.ability)
              const groups = [...abilities.filter(a => a), ...(ungrouped.length ? [''] : [])]
              return (
                <>
                  {isOwner && (
                    <div className="flex justify-end">
                      <button onClick={() => setAddingCharm(v => !v)} className="text-xs text-stone-500 hover:text-amber-400 transition-colors">
                        {addingCharm ? 'Cancel' : '+ charm'}
                      </button>
                    </div>
                  )}

                  {addingCharm && isOwner && (
                    <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-2">
                      <p className="text-xs font-semibold text-amber-400">New Charm</p>
                      <input value={newCharmAbility} onChange={e => setNewCharmAbility(e.target.value)} placeholder="Ability group…" className={textInput} />
                      <input value={newCharmName} onChange={e => setNewCharmName(e.target.value)} placeholder="Name…" className={textInput} />
                      <textarea value={newCharmDesc} onChange={e => setNewCharmDesc(e.target.value)} placeholder="Description…" rows={3} className={`${textInput} resize-none`} />
                      <input value={newCharmKey} onChange={e => setNewCharmKey(e.target.value)} placeholder="Mechanical key (optional, e.g. foi)…" className={textInput} />
                      <div className="flex justify-end">
                        <button onClick={addCharm} disabled={charmSaving || !newCharmName.trim()} className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1 rounded transition-colors">
                          {charmSaving ? 'Saving…' : 'Add'}
                        </button>
                      </div>
                    </div>
                  )}

                  {groups.length === 0 && <p className="text-xs text-stone-600">No charms yet.</p>}

                  {groups.map(ability => (
                    <section key={ability || '__none__'}>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400/70 mb-1.5">{ability || 'Ungrouped'}</h2>
                      <div className="rounded-lg border border-stone-700 overflow-hidden divide-y divide-stone-800">
                        {charms.filter(c => c.ability === ability).map(charm => (
                          editingCharmId === charm.id && isOwner ? (
                            <EditCharmRow key={charm.id} charm={charm} onSave={saveCharm} onCancel={() => setEditingCharmId(null)} saving={charmSaving} textInput={textInput} />
                          ) : (
                            <div key={charm.id} className="px-3 py-2 space-y-0.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-stone-100">{charm.name}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                  {charm.mechanicalKey && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-700/50 text-amber-400">{charm.mechanicalKey}</span>}
                                  {isOwner && <>
                                    <button onClick={() => setEditingCharmId(charm.id)} className="text-stone-600 hover:text-amber-400 text-xs transition-colors">edit</button>
                                    <button onClick={() => deleteCharm(charm.id)} className="text-stone-600 hover:text-red-400 text-xs transition-colors">✕</button>
                                  </>}
                                </div>
                              </div>
                              <p className="text-xs text-stone-400 leading-relaxed">{charm.description}</p>
                            </div>
                          )
                        ))}
                      </div>
                    </section>
                  ))}
                </>
              )
            })()}
          </div>
        ) : activeTab === 'Users' ? (
          <div className="max-w-2xl space-y-2">
            {!usersLoaded ? (
              <p className="text-stone-500 text-sm">Loading…</p>
            ) : users.length === 0 ? (
              <p className="text-stone-500 text-sm">No users found.</p>
            ) : users.map(u => {
              const chars = userChars.filter(c => c.user_id === u.user_id)
              const expanded = expandedUsers.has(u.user_id)
              return (
                <div key={u.user_id} className="bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleExpand(u.user_id)}
                        className="text-stone-500 hover:text-stone-300 transition-colors text-xs w-4 shrink-0"
                      >
                        {expanded ? '▼' : '▶'}
                      </button>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-stone-200">{u.username ?? '—'}</span>
                        {u.display_name && <span className="text-xs text-stone-500 ml-2">({u.display_name})</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-stone-500">{chars.length} char{chars.length !== 1 ? 's' : ''}</span>
                      {(() => {
                        const isSelf = u.user_id === user?.id
                        const adminCount = users.filter(x => x.role === 'admin').length
                        const isLastAdmin = u.role === 'admin' && adminCount === 1
                        const locked = isSelf || isLastAdmin
                        const tip = isSelf ? 'Cannot change your own role' : isLastAdmin ? 'Cannot demote the last admin' : undefined
                        return (
                          <div className="relative group/role">
                            <select
                              value={u.role}
                              onChange={e => changeRole(u.user_id, e.target.value as 'admin' | 'player')}
                              disabled={roleChanging === u.user_id || locked}
                              className="bg-stone-800 border border-stone-600 text-stone-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <option value="player">Player</option>
                              <option value="admin">Admin</option>
                            </select>
                            {locked && tip && (
                              <div className="absolute bottom-full right-0 mb-1.5 w-44 bg-stone-800 border border-stone-600 rounded px-2 py-1.5 text-xs text-stone-400 hidden group-hover/role:block z-10 pointer-events-none">
                                {tip}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                  {expanded && chars.length > 0 && (
                    <div className="border-t border-stone-700 divide-y divide-stone-800">
                      {chars.map(c => {
                        const exaltType = c.data?.sheet?.exaltType
                        const caste = c.data?.sheet?.caste
                        return (
                          <div key={c.id} className="px-4 py-2 pl-11 flex items-center gap-2">
                            <span className="text-sm text-stone-300">{c.name}</span>
                            {(exaltType || caste) && (
                              <span className="text-xs text-stone-600">{[exaltType, caste].filter(Boolean).join(' · ')}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {expanded && chars.length === 0 && (
                    <div className="border-t border-stone-700 px-4 py-2 pl-11">
                      <span className="text-xs text-stone-600">No characters</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
      </div>
    </div>
  )
}
