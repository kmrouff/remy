import { useState } from 'react'
import remyMark from '../assets/remy-mark.png'

const APPLE_ICON = (
  <svg width="16" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.42 2.2-1.13 2.98-.83.9-2.18 1.6-3.3 1.5-.14-1.1.42-2.28 1.08-3 .74-.82 2.06-1.44 3.35-1.48zM20.94 17.1c-.6 1.38-.88 2-1.65 3.22-1.08 1.7-2.6 3.82-4.48 3.83-1.67.02-2.1-1.08-4.37-1.08-2.27 0-2.74 1.06-4.4 1.09-1.88.03-3.32-1.84-4.4-3.54C-1.4 15.6.9 8.9 4.9 8.75c1.63-.06 2.77 1.06 3.7 1.06.92 0 2.6-1.31 4.38-1.12.74.03 2.82.3 4.16 2.26-3.65 2-3.07 6.6.8 8.15z" />
  </svg>
)

const GOOGLE_ICON = (
  <svg width="17" height="17" viewBox="0 0 48 48">
    <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
    <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
    <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
  </svg>
)

export default function AuthScreen({ onBack }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const isLogin = mode === 'login'

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
        {isLogin ? 'Sign in to pick up where you left off.' : 'Your recipes, saved and ready — on any device.'}
      </p>

      <div className="auth__methods">
        <button type="button" className="btn-oauth btn-oauth--apple">
          {APPLE_ICON}
          {isLogin ? 'Continue with Apple' : 'Sign up with Apple'}
        </button>
        <button type="button" className="btn-oauth btn-oauth--google">
          {GOOGLE_ICON}
          {isLogin ? 'Continue with Google' : 'Sign up with Google'}
        </button>

        <div className="recipe-input__divider">or</div>

        <input type="email" placeholder="Email" className="recipe-input__field" />
        <input type="password" placeholder={isLogin ? 'Password' : 'Choose a password'} className="recipe-input__field" />

        <button type="button" className="btn-primary">
          {isLogin ? 'Log in' : 'Create account'}
        </button>
        {isLogin && (
          <button type="button" className="auth__magic">
            Email me a magic link instead
          </button>
        )}
      </div>

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
            <a href="#signup" onClick={(e) => { e.preventDefault(); setMode('signup') }}>
              Create account
            </a>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <a href="#login" onClick={(e) => { e.preventDefault(); setMode('login') }}>
              Log in
            </a>
          </>
        )}
      </p>
    </div>
  )
}
