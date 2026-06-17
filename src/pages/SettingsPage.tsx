import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const SECTIONS = ['Account', 'Appearance'] as const
type Section = typeof SECTIONS[number]

export default function SettingsPage() {
  const navigate = useNavigate()
  const { role, user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [active, setActive] = useState<Section>('Account')

  const [username, setUsername] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameMsg, setUsernameMsg] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; error: boolean } | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.display_name) setUsername(data.display_name)
      })
  }, [user])

  async function saveUsername() {
    if (!user || !username.trim()) return
    setUsernameSaving(true)
    setUsernameMsg(null)
    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: username.trim() })
      .eq('user_id', user.id)
    setUsernameSaving(false)
    setUsernameMsg(error ? 'Failed to save.' : 'Saved.')
    setTimeout(() => setUsernameMsg(null), 2000)
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Passwords do not match.', error: true })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'Minimum 6 characters.', error: true })
      return
    }
    setPasswordSaving(true)
    setPasswordMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordMsg({ text: error.message, error: true })
    } else {
      setPasswordMsg({ text: 'Password updated.', error: false })
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordMsg(null), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-700 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm">← Back</button>
          <h1 className="text-amber-400 font-semibold">Settings</h1>
        </div>
        {role === 'admin' && (
          <button onClick={() => navigate('/setup')} className="text-xs text-stone-400 hover:text-stone-200 transition-colors">
            Setup
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-44 shrink-0 border-r border-stone-700 py-4 px-2 space-y-0.5">
          {SECTIONS.map(s => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                active === s
                  ? 'bg-stone-800 text-stone-100 font-medium'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              {s}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-6 max-w-xl space-y-6">
          {active === 'Account' && (
            <>
              <h2 className="text-base font-semibold text-stone-200">Account</h2>

              {/* Read-only info */}
              <div className="bg-stone-900 border border-stone-700 rounded-lg divide-y divide-stone-700">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-stone-400">Email</span>
                  <span className="text-sm text-stone-300">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-stone-400">Role</span>
                  <span className="text-sm text-stone-300 capitalize">{role ?? '—'}</span>
                </div>
              </div>

              {/* Username */}
              <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
                <label className="text-sm font-medium text-stone-300">Username</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveUsername()}
                    placeholder="Display name…"
                    className="flex-1 bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
                  />
                  <button
                    onClick={saveUsername}
                    disabled={usernameSaving}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
                  >
                    {usernameSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {usernameMsg && <p className="text-xs text-stone-400">{usernameMsg}</p>}
              </div>

              {/* Password */}
              <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
                <label className="text-sm font-medium text-stone-300">Change Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password…"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && savePassword()}
                  placeholder="Confirm password…"
                  className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={savePassword}
                    disabled={passwordSaving || !newPassword}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
                  >
                    {passwordSaving ? 'Updating…' : 'Update Password'}
                  </button>
                  {passwordMsg && (
                    <span className={`text-xs ${passwordMsg.error ? 'text-red-400' : 'text-stone-400'}`}>
                      {passwordMsg.text}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {active === 'Appearance' && (
            <>
              <h2 className="text-base font-semibold text-stone-200">Appearance</h2>
              <div className="bg-stone-900 border border-stone-700 rounded-lg">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-stone-400">Theme</span>
                  <div className="flex gap-1">
                    {(['light', 'dark'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
                          theme === t
                            ? 'bg-amber-500 text-stone-950'
                            : 'bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-600'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
