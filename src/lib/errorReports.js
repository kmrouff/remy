import { supabase } from './supabase'

/**
 * Voice-session failures, sorted by whose problem they are.
 *
 * Almost everything the ElevenLabs SDK surfaces as an "error" is on our side
 * of the fence — quota exhausted, agent misconfigured, their platform down.
 * The one genuinely user-side failure is a denied microphone. The app's error
 * screen phrases each accordingly: a user should never be left wondering what
 * *they* broke when the answer is "nothing".
 */
export function classifyVoiceError(raw) {
  const text = String(raw ?? '')
  if (/quota|exceeds.*limit|credit/i.test(text)) return 'quota'
  if (/NotAllowed|permission|microphone/i.test(text)) return 'mic'
  return 'server'
}

export function friendlyVoiceError(kind, detail) {
  if (kind === 'mic') {
    return 'Your microphone needs permission. Allow access in your browser settings, then try again.'
  }
  if (kind === 'quota') {
    return "This one's entirely on our side — Remy's voice service hit its usage limit. It's been reported to us automatically. Please try again later."
  }
  return `Something went wrong on our side, not yours — it's been reported to us automatically. Please try again in a moment. (${detail || 'unknown error'})`
}

/**
 * Fire-and-forget failure report, written to the error_reports table (see
 * supabase/schema.sql — insert-only for the browser key, readable only from
 * the Supabase dashboard). No accounts involved and nothing personal beyond
 * the user agent. Skips silently when Supabase isn't configured, and must
 * never throw: reporting a failure can't be allowed to cause one.
 */
export async function reportVoiceError({ kind, detail, mode }) {
  if (!supabase) return
  try {
    await supabase.from('error_reports').insert({
      kind,
      detail: String(detail ?? '').slice(0, 500),
      mode,
      user_agent: (navigator.userAgent || '').slice(0, 200),
    })
  } catch {
    // deliberately swallowed
  }
}
