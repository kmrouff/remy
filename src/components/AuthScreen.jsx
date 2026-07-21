import { useState } from 'react'
import remyMark from '../assets/remy-mark.png'
import {
  isAuthConfigured,
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from '../lib/auth'

const GOOGLE_ICON = (
  <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>
)

/**
 * Sign-in / sign-up.
 *
 * Signing in is optional — Remy works as a guest, and an account only adds
 * cross-device sync — so this screen is reachable but never blocks the app.
 *
 * The designed screens also carried a "Continue with Apple" button. Sign in
 * with Apple on the web needs a paid Apple Developer account, so rather than
 * ship a button that fails, it's left out until that's set up.
 */
export default function AuthScreen({ onBack, onSignedIn }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | working | sent | check-email
  const [error, setError] = useState(null)

  const isLogin = mode === 'login'
  const busy = status === 'working'

  function reset(next) {
    setMode(next)
    setError(null)
    setStatus('idle')
  }

  async function run(action) {
    setStatus('working')
    setError(null)
    const result = await action()
    if (result?.error) {
      setError(result.error)
      setStatus('idle')
      return null
    }
    return result ?? {}
  }

  async function handleGoogle() {
    // On success the browser leaves for Google and returns to the app, so
    // there's nothing to do here — the session arrives via onAuthStateChange.
    await run(signInWithGoogle)
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password || busy) return
    const result = await run(() =>
      isLogin ? signInWithPassword(email.trim(), password) : signUpWithPassword(email.trim(), password)
    )
    if (!result) return
    if (result.needsEmailConfirmation) {
      setStatus('check-email')
      return
    }
    onSignedIn?.()
  }

  async function handleMagicLink() {
    if (!email.trim() || busy) {
      if (!email.trim()) setError('Enter your email first, then I can send you a link.')
      return
    }
    const result = await run(() => signInWithMagicLink(email.trim()))
    if (result) setStatus('sent')
  }

  if (status === 'sent' || status === 'check-email') {
    return (
      <div className="auth">
        <div className="topbar">
          <button type="button" className="iconbtn" onClick={onBack} aria-label="Back">
            ‹
          </button>
        </div>
        <div className="auth__brand">
          <img src={remyMark} alt="Remy" />
        </div>
        <h1>Check your email</h1>
        <p className="auth__sub">
          {status === 'sent'
            ? `We sent a sign-in link to ${email}. Open it on this device and you'll be signed in.`
            : `We sent a confirmation link to ${email}. Open it to finish creating your account.`}
        </p>
        <div style={{ flex: 1 }} />
        <p className="auth__foot">
          Wrong address?{' '}
          <a
            href="#back"
            onClick={(e) => {
              e.preventDefault()
              setStatus('idle')
            }}
          >
            Try another
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="auth">
      <div className="topbar">
        <button type="button" className="iconbtn" onClick={onBack} aria-label="Back">
          ‹
        </button>
      </div>

      <div className="auth__brand">
        <img src={remyMark} alt="Remy" />
        {isLogin && (
          <>
            <span className="wordmark">Remy</span>
            <span className="eyebrow" style={{ marginTop: 8 }}>
              Invisible sous-chef
            </span>
          </>
        )}
      </div>

      <h1>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
      <p className="auth__sub">
        {isLogin
          ? 'Sign in to reach your recipes on any device.'
          : 'Your recipes, saved and ready — on any device.'}
      </p>

      {!isAuthConfigured && (
        <p className="recipe-input__error">
          Accounts aren't set up in this environment yet — you can keep cooking as a guest, and your
          recipes stay saved on this device.
        </p>
      )}

      <form className="auth__methods" onSubmit={handlePasswordSubmit}>
        <button
          type="button"
          className="btn-oauth btn-oauth--google"
          onClick={handleGoogle}
          disabled={busy || !isAuthConfigured}
        >
          {GOOGLE_ICON}
          {isLogin ? 'Continue with Google' : 'Sign up with Google'}
        </button>

        <div className="recipe-input__divider">OR</div>

        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          className="recipe-input__field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!isAuthConfigured}
        />
        <input
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          placeholder={isLogin ? 'Password' : 'Choose a password'}
          className="recipe-input__field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={!isAuthConfigured}
        />

        {error && <p className="recipe-input__error">{error}</p>}

        <button type="submit" className="btn-primary" disabled={busy || !isAuthConfigured}>
          {busy ? 'One moment…' : isLogin ? 'Log in' : 'Create account'}
        </button>
        {isLogin && (
          <button type="button" className="auth__magic" onClick={handleMagicLink} disabled={busy || !isAuthConfigured}>
            Email me a magic link instead
          </button>
        )}
      </form>

      {!isLogin && (
        <p className="auth__legal">
          By continuing you agree to our <a href="#terms">Terms</a> &amp; <a href="#privacy">Privacy Policy</a>.
        </p>
      )}

      <div style={{ flex: 1 }} />

      <p className="auth__foot">
        {isLogin ? (
          <>
            New to Remy?{' '}
            <a href="#signup" onClick={(e) => { e.preventDefault(); reset('signup') }}>
              Create account
            </a>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <a href="#login" onClick={(e) => { e.preventDefault(); reset('login') }}>
              Log in
            </a>
          </>
        )}
      </p>
    </div>
  )
}
