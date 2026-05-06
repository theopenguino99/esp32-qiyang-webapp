import { useState } from 'react'
import { useAuthContext } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { signUp, signIn } = useAuthContext()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isSupabaseConfigured()) return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <h2 className="auth-title">Not Configured</h2>
        <p className="config-hint">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to enable cloud features.</p>
        <button className="btn btn--secondary" style={{ width: '100%', marginTop: 16 }} onClick={onClose}>Close</button>
      </div>
    </div>
  )

  const [showConfirmMsg, setShowConfirmMsg] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) { setError('Email and password required'); return }
    setSubmitting(true); setError(null); setShowConfirmMsg(false)
    const err = isSignUp ? await signUp(email, password) : await signIn(email, password)
    setSubmitting(false)
    if (err) { setError(err); return }
    // If signup succeeded but user isn't logged in yet → email confirmation is enabled
    if (isSignUp) { setShowConfirmMsg(true); return }
    onClose()
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <h2 className="auth-title">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
        <p className="config-hint">{isSignUp ? 'Sign up to save exercise history to the cloud' : 'Sign in to access your exercise history'}</p>

        <div className="auth-fields">
          <input className="custom-name-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <input className="custom-name-input" type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} autoComplete={isSignUp ? 'new-password' : 'current-password'} />
        </div>

        {error && <div className="auth-error">{error}</div>}

        {showConfirmMsg && (
          <div className="auth-success">
            ✅ Check your email for a confirmation link, then sign in.
          </div>
        )}

        {!showConfirmMsg && (
          <>
            <button className="btn btn--start" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>

            <button className="auth-toggle" onClick={() => { setIsSignUp(!isSignUp); setError(null); setShowConfirmMsg(false) }}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </>
        )}

        {showConfirmMsg && (
          <button className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={() => { setIsSignUp(false); setShowConfirmMsg(false) }}>
            Go to Sign In
          </button>
        )}
      </div>
    </div>
  )
}
