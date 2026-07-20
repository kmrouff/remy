import { Conversation } from '@elevenlabs/client'

/**
 * Starts a voice session against a public ElevenLabs Conversational AI agent.
 * No API key needed client-side — the agent must be public in the ElevenLabs
 * dashboard. If it's private, this needs a signed-url exchange through a
 * server route instead (not implemented — see README).
 *
 * @param {object} params
 * @param {string} params.agentId
 * @param {Record<string, (parameters: any) => Promise<string> | string>} params.clientTools
 * @param {import('@elevenlabs/client').Callbacks} params.callbacks
 * @param {{ agent?: { firstMessage?: string } }} [params.overrides] - Per-session
 *   overrides of agent config. Requires the corresponding override to be
 *   enabled in the agent's Security settings in the ElevenLabs dashboard,
 *   otherwise it's silently ignored and the dashboard default is used.
 * @returns {Promise<import('@elevenlabs/client').Conversation>}
 */
export async function startVoiceSession({ agentId, clientTools, callbacks, overrides }) {
  return Conversation.startSession({
    agentId,
    clientTools,
    overrides,
    ...callbacks,
  })
}
