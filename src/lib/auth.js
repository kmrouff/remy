import { useEffect, useState } from 'react'
import { supabase, isAuthConfigured } from './supabase'

/**
 * Auth actions and session state.
 *
 * Every action is a no-op that resolves to a friendly error when Supabase
 * isn't configured, so a half-set-up environment degrades to guest mode
 * rather than throwing somewhere in the UI.
 */

const NOT_CONFIGURED = {
  error: "Accounts aren't set up in this environment yet — you can keep cooking as a guest.",
}

/**
 * Tracks the current session.
 * @returns {{ session: object|null, user: object|null, loading: boolean }}
 *   `loading` is true until the initial session check resolves — the app uses
 *   it to avoid rendering a guest library before we know someone's signed in.
 */
export function useSession() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(isAuthConfigured)

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data?.session ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe()
    }
  }, [])

  return { session, user: session?.user ?? null, loading }
}

export async function signInWithGoogle() {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  return { error: error?.message ?? null }
}

/** Emails a one-time sign-in link. Creates the account if it's a new address. */
export async function signInWithMagicLink(email) {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  return { error: error?.message ?? null }
}

export async function signInWithPassword(email, password) {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return { error: error?.message ?? null }
}

/**
 * Creates an account. Depending on the project's email settings this may
 * require confirming an email before the session becomes active, so the
 * caller is told which happened rather than assuming it's signed in.
 */
export async function signUpWithPassword(email, password) {
  if (!supabase) return NOT_CONFIGURED
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) return { error: error.message }
  return { error: null, needsEmailConfirmation: !data.session }
}

export async function signOut() {
  if (!supabase) return NOT_CONFIGURED
  const { error } = await supabase.auth.signOut()
  return { error: error?.message ?? null }
}

export { isAuthConfigured }
