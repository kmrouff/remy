import { useEffect, useRef, useState } from 'react'
import { startVoiceSession } from '../lib/elevenlabs'

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID

// Sent to the agent via sendContextualUpdate right after connecting, so it
// knows which mode was picked on the confirm screen.
const MODE_CONTEXT = {
  shopping:
    "The user has switched to Shopping mode. Focus on helping them gather ingredients: what they already have, what they're looking at in the store or pantry, and how much/many they need for this recipe. Use get_shopping_list to check status and confirm_ingredient to record what they find, substitute, or are missing.",
  cooking:
    "The user has switched to Cooking mode. Focus on guiding them through the recipe step by step: cook times, technique adjustments, and real-time ingredient swaps if something is missing. Use get_next_step to advance through the recipe.",
}

// Greeting spoken when the session first connects, matched to the mode
// picked on the confirm screen. Only takes effect if "first message"
// overrides are enabled for the agent in the ElevenLabs dashboard.
const FIRST_MESSAGE = {
  shopping:
    "Hey, I'm Remy, your invisible sous chef. Let's get your ingredients sorted — tell me what you've already got, or what you're looking at right now, and I'll help you track down the rest.",
  cooking:
    "Hey, I'm Remy, your invisible sous chef, ready to guide you through this recipe hands-free. Just say the word whenever you want your first step.",
}

/**
 * Hands-free voice screen. Owns the ElevenLabs Conversation lifecycle and
 * resolves the four agent tool calls against the recipe state passed down
 * from App. Mode is fixed for the lifetime of the session — to switch
 * Shopping/Cooking the user leaves via "Change mode" and picks again on the
 * confirm screen, rather than toggling mid-call.
 */
export default function VoiceSession({
  recipe,
  mode,
  cookingStepIndex,
  setCookingStepIndex,
  shoppingConfirmations,
  setShoppingConfirmations,
  onEnd,
  onRetry,
  onBack,
}) {
  const [status, setStatus] = useState('connecting') // disconnected | connecting | connected | disconnecting
  const [agentMode, setAgentMode] = useState('listening') // listening | speaking
  const [log, setLog] = useState([])
  const [error, setError] = useState(null)

  const conversationRef = useRef(null)
  // Mirror of the latest props/state so the client-tool closures (registered
  // once at startSession time) never read stale values.
  const stateRef = useRef({ recipe, cookingStepIndex, shoppingConfirmations, mode })
  stateRef.current = { recipe, cookingStepIndex, shoppingConfirmations, mode }

  function appendLog(entry) {
    setLog((prev) => [...prev.slice(-19), entry])
  }

  useEffect(() => {
    let cancelled = false

    async function connect() {
      if (!AGENT_ID) {
        setError('Missing VITE_ELEVENLABS_AGENT_ID — set it in .env.local')
        setStatus('disconnected')
        return
      }

      const clientTools = {
        get_shopping_list: async () => {
          const { recipe, shoppingConfirmations } = stateRef.current
          const list = recipe.ingredients.map((ing) => ({
            ...ing,
            status: shoppingConfirmations[ing.item]?.status ?? 'pending',
          }))
          appendLog({ type: 'tool', text: `get_shopping_list → ${list.length} items` })
          return JSON.stringify(list)
        },
        confirm_ingredient: async ({ ingredient, status, note }) => {
          setShoppingConfirmations((prev) => ({
            ...prev,
            [ingredient]: { status, note },
          }))
          appendLog({
            type: 'tool',
            text: `confirm_ingredient: ${ingredient} → ${status}${note ? ` (${note})` : ''}`,
          })
          return 'ok'
        },
        get_next_step: async () => {
          const { recipe, cookingStepIndex } = stateRef.current
          const step = recipe.steps[cookingStepIndex]
          if (step) {
            setCookingStepIndex((i) => i + 1)
            appendLog({ type: 'tool', text: `get_next_step → step ${cookingStepIndex + 1}: ${step}` })
            return step
          }
          appendLog({ type: 'tool', text: 'get_next_step → no more steps' })
          return 'no more steps — recipe complete'
        },
        log_observation: async ({ observation }) => {
          appendLog({ type: 'observation', text: observation })
          return 'logged'
        },
      }

      try {
        const conversation = await startVoiceSession({
          agentId: AGENT_ID,
          clientTools,
          overrides: {
            agent: { firstMessage: FIRST_MESSAGE[stateRef.current.mode] },
          },
          callbacks: {
            onConnect: () => setStatus('connected'),
            onDisconnect: () => setStatus('disconnected'),
            onModeChange: ({ mode: speakingMode }) => setAgentMode(speakingMode),
            onMessage: ({ message, role }) => appendLog({ type: role, text: message }),
            onError: (message, context) => {
              const detail = [context?.errorType, context?.debugMessage, context?.details]
                .filter(Boolean)
                .join(' — ')
              setError(detail ? `${message} (${detail})` : message)
            },
          },
        })
        if (cancelled) {
          conversation.endSession()
          return
        }
        conversationRef.current = conversation
        conversation.sendContextualUpdate(MODE_CONTEXT[stateRef.current.mode])
      } catch (e) {
        setError(
          e?.name === 'NotAllowedError' || /permission/i.test(String(e?.message))
            ? 'Microphone access is required — please allow it in your browser settings and try again.'
            : e?.message || 'Could not start the voice session.'
        )
        setStatus('disconnected')
      }
    }

    connect()
    return () => {
      cancelled = true
      conversationRef.current?.endSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleEnd() {
    setStatus('disconnecting')
    await conversationRef.current?.endSession()
    onEnd()
  }

  async function handleChangeMode() {
    setStatus('disconnecting')
    await conversationRef.current?.endSession()
    onBack()
  }

  return (
    <section className="voice-session">
      <header className="voice-session__header">
        <h1>{recipe.title}</h1>
        <span className="voice-session__status">
          <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
          {status === 'connected' ? (agentMode === 'speaking' ? 'Agent speaking…' : 'Listening…') : status}
        </span>
      </header>

      {error && <p className="voice-session__error">{error}</p>}

      {mode === 'cooking' && (
        <p className="voice-session__step-indicator">
          Step {Math.min(cookingStepIndex + 1, recipe.steps.length)} of {recipe.steps.length}
        </p>
      )}

      <ul className="voice-session__log">
        {log.map((entry, i) => (
          <li key={i} className={`log-entry log-entry--${entry.type}`}>
            {entry.text}
          </li>
        ))}
      </ul>

      {status === 'disconnected' && error ? (
        <div className="voice-session__recovery">
          <button type="button" className="voice-session__retry" onClick={onRetry}>
            Try again
          </button>
          <button type="button" className="voice-session__back" onClick={onBack}>
            Back to recipe
          </button>
        </div>
      ) : (
        <div className="voice-session__recovery">
          <button type="button" className="voice-session__back" onClick={handleChangeMode}>
            Change mode
          </button>
          <button type="button" className="voice-session__end" onClick={handleEnd}>
            End session
          </button>
        </div>
      )}
    </section>
  )
}
