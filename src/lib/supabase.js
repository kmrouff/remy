import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Auth is optional in Remy — you can cook as a guest, and an account only
 * buys cross-device sync. So the whole surface has to behave when Supabase
 * isn't configured at all: `supabase` is null, `isAuthConfigured` is false,
 * and storage quietly stays on localStorage. Nothing should throw.
 *
 * The anon key is meant to be public — it identifies the project, it doesn't
 * grant access. Row-level security in supabase/schema.sql is what actually
 * keeps one account's recipes away from another's.
 */
export const isAuthConfigured = Boolean(url && anonKey)

export const supabase = isAuthConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Magic links and OAuth both come back as a URL fragment we need read.
        detectSessionInUrl: true,
      },
    })
  : null
