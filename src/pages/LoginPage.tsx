import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function switchMode(m: Mode) {
    setMode(m); setError(null); setPassword(''); setConfirmPassword('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim()) { setError('Username is required.'); return }
    if (mode === 'signup') {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    }
    setLoading(true)
    setError(null)
    const { error } = mode === 'signin'
      ? await signIn(username, password)
      : await signUp(username, password)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400 tracking-wide">Exalted</h1>
          <p className="text-stone-400 mt-1 text-sm">Character Manager</p>
        </div>

        {/* Mode toggle */}
        <div className="flex mb-4 bg-stone-900 border border-stone-700 rounded-lg p-1 gap-1">
          {(['signin', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                mode === m
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {m === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-stone-900 border border-stone-700 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500 placeholder-stone-500"
              placeholder="your_username"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
              placeholder="••••••••"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm text-stone-300 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-stone-800 border border-stone-600 text-stone-100 rounded px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded py-2 text-sm transition-colors"
          >
            {loading
              ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>
      </div>
    </div>
  )
}
