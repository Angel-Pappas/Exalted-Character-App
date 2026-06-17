import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth, usernameToEmail } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const SECTIONS = ['Account', 'Appearance'] as const
type Section = typeof SECTIONS[number]

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function PasswordInput({
  value, onChange, onKeyDown, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 pr-9 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
        tabIndex={-1}
      >
        <EyeIcon visible={show} />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, user, username } = useAuth()
  const { theme, setTheme } = useTheme()
  const [active, setActive] = useState<Section>(
    (location.state as { section?: Section } | null)?.section ?? 'Account'
  )

  const [displayName, setDisplayName] = useState('')
  const [displayNameSaving, setDisplayNameSaving] = useState(false)
  const [displayNameMsg, setDisplayNameMsg] = useState<string | null>(null)

  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [usernameSaving, setUsernameSaving] = useState(false)
  const [usernameMsg, setUsernameMsg] = useState<{ text: string; error: boolean } | null>(null)

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
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
        if (data?.display_name) setDisplayName(data.display_name)
      })
  }, [user])

  async function saveDisplayName() {
    if (!user || !displayName.trim()) return
    setDisplayNameSaving(true)
    setDisplayNameMsg(null)
    const { error } = await supabase
      .from('user_profiles')
      .update({ display_name: displayName.trim() })
      .eq('user_id', user.id)
    setDisplayNameSaving(false)
    setDisplayNameMsg(error ? 'Failed to save.' : 'Saved.')
    setTimeout(() => setDisplayNameMsg(null), 2000)
  }

  function closeUsernameModal() {
    setShowUsernameModal(false)
    setNewUsername('')
    setUsernameMsg(null)
  }

  async function saveUsername() {
    const trimmed = newUsername.trim()
    if (!trimmed) { setUsernameMsg({ text: 'Enter a username.', error: true }); return }
    if (trimmed.includes(' ')) { setUsernameMsg({ text: 'No spaces allowed.', error: true }); return }
    setUsernameSaving(true)
    setUsernameMsg(null)
    const newEmail = trimmed.includes('@') ? trimmed : usernameToEmail(trimmed)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setUsernameSaving(false)
    if (error) {
      setUsernameMsg({ text: error.message, error: true })
    } else {
      setUsernameMsg({ text: 'Username updated.', error: false })
      setTimeout(() => closeUsernameModal(), 1500)
    }
  }

  function closeModal() {
    setShowPasswordModal(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMsg(null)
  }

  async function savePassword() {
    if (!currentPassword) {
      setPasswordMsg({ text: 'Enter your current password.', error: true })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'Minimum 6 characters.', error: true })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Passwords do not match.', error: true })
      return
    }
    setPasswordSaving(true)
    setPasswordMsg(null)
    // Re-authenticate first — support both real emails and @exalted.local usernames
    const loginEmail = username.includes('@') ? username : usernameToEmail(username)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: currentPassword,
    })
    if (signInError) {
      setPasswordSaving(false)
      setPasswordMsg({ text: 'Current password is incorrect.', error: true })
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordMsg({ text: error.message, error: true })
    } else {
      setPasswordMsg({ text: 'Password updated.', error: false })
      setTimeout(() => closeModal(), 1500)
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
                  <span className="text-sm text-stone-400">Username</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-stone-300">{username}</span>
                    <button
                      onClick={() => setShowUsernameModal(true)}
                      className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-stone-400">Role</span>
                  <span className="text-sm text-stone-300 capitalize">{role ?? '—'}</span>
                </div>
              </div>

              {/* Display Name */}
              <div className="bg-stone-900 border border-stone-700 rounded-lg p-4 space-y-3">
                <label className="text-sm font-medium text-stone-300">Display Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                    placeholder="Display name…"
                    className="flex-1 bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
                  />
                  <button
                    onClick={saveDisplayName}
                    disabled={displayNameSaving}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
                  >
                    {displayNameSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {displayNameMsg && <p className="text-xs text-stone-400">{displayNameMsg}</p>}
              </div>

              {/* Password panel */}
              <div className="bg-stone-900 border border-stone-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-300">Password</p>
                    <p className="text-xs text-stone-500 mt-0.5">••••••••••••</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 text-sm rounded transition-colors"
                  >
                    Change Password
                  </button>
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

      {/* Change Username Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-stone-200">Change Username</h3>
            <div className="space-y-1">
              <label className="text-xs text-stone-400">New Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveUsername()}
                placeholder="new_username"
                autoFocus
                className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
              />
              <p className="text-xs text-stone-500 pt-0.5">You'll log in with this name going forward.</p>
            </div>
            {usernameMsg && (
              <p className={`text-xs ${usernameMsg.error ? 'text-red-400' : 'text-green-400'}`}>
                {usernameMsg.text}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveUsername}
                disabled={usernameSaving}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
              >
                {usernameSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={closeUsernameModal}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-stone-200">Change Password</h3>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Current Password</label>
                <PasswordInput
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Current password…"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">New Password</label>
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="New password…"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-400">Confirm New Password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  onKeyDown={e => e.key === 'Enter' && savePassword()}
                  placeholder="Confirm password…"
                />
              </div>
            </div>

            {passwordMsg && (
              <p className={`text-xs ${passwordMsg.error ? 'text-red-400' : 'text-green-400'}`}>
                {passwordMsg.text}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={savePassword}
                disabled={passwordSaving}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
              >
                {passwordSaving ? 'Updating…' : 'Update Password'}
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
