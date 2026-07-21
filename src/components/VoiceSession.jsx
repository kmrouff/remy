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

function formatQty(ing) {
  return [ing.quantity, ing.unit].filter(Boolean).join(' ')
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
  isSaved,
  onSave,
  onPause,
  onFinish,
  onSaveAndEnd,
  onRetry,
  onBack,
}) {
  const [status, setStatus] = useState('connecting') // disconnected | connecting | connected | disconnecting
  const [agentMode, setAgentMode] = useState('listening') // listening | speaking
  const [log, setLog] = useState([])
  const [error, setError] = useState(null)
  const [showWrapUp, setShowWrapUp] = useState(false)

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
          appendLog({ type: 'tool', text: `Checked the shopping list — ${list.length} items` })
          return JSON.stringify(list)
        },
        confirm_ingredient: async ({ ingredient, status, note }) => {
          setShoppingConfirmations((prev) => ({
            ...prev,
            [ingredient]: { status, note },
          }))
          appendLog({
            type: 'tool',
            text: `Marked ${ingredient} as ${status}${note ? ` (${note})` : ''}`,
          })
          return 'ok'
        },
        get_next_step: async () => {
          const { recipe, cookingStepIndex } = stateRef.current
          const step = recipe.steps[cookingStepIndex]
          if (step) {
            setCookingStepIndex((i) => i + 1)
            appendLog({ type: 'tool', text: `Moved on to step ${cookingStepIndex + 1}` })
            return step
          }
          appendLog({ type: 'tool', text: 'Reached the end of the recipe' })
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
            ? 'Your microphone needs permission. Allow access in your browser settings, then try again.'
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

  async function handleChangeMode() {
    setStatus('disconnecting')
    await conversationRef.current?.endSession()
    onBack()
  }

  async function handleCancelConnecting() {
    await conversationRef.current?.endSession()
    onBack()
  }

  async function endThenRun(action) {
    setShowWrapUp(false)
    setStatus('disconnecting')
    await conversationRef.current?.endSession()
    action()
  }

  function handleSkipIngredient(item) {
    setShoppingConfirmations((prev) => ({ ...prev, [item]: { status: 'missing', note: '' } }))
  }

  function handleUndoIngredient(item) {
    setShoppingConfirmations((prev) => {
      const next = { ...prev }
      delete next[item]
      return next
    })
  }

  // ---- Connecting screen ----
  if (status === 'connecting') {
    return (
      <div className={`app-screen theme-${mode}`}>
        <div className="topbar">
          <button type="button" className="iconbtn" onClick={handleCancelConnecting} aria-label="Cancel">
            ‹
          </button>
          <span className="topbar__title">{recipe.title}</span>
        </div>
        <div className="connecting">
          <div className="connecting__orb">
            <span className="ring" />
            <span className="ring" />
            <span className="core">
              <span style={{ width: 3, height: 10, background: '#fff', borderRadius: 2 }} />
              <span style={{ width: 3, height: 17, background: '#fff', borderRadius: 2 }} />
              <span style={{ width: 3, height: 10, background: '#fff', borderRadius: 2 }} />
            </span>
          </div>
          <h2>Waking up Remy…</h2>
          <p>Connecting your microphone. Allow access if your browser asks — then just start talking.</p>
        </div>
      </div>
    )
  }

  // ---- Recovery / error screen ----
  if (status === 'disconnected' && error) {
    return (
      <div className="app-screen">
        <div className="topbar">
          <span className="topbar__title">{recipe.title}</span>
        </div>
        <div className="recovery">
          <div className="recovery__icon">!</div>
          <h2>Couldn't reach Remy</h2>
          <p>{error}</p>
        </div>
        <button type="button" className="voice-session__retry" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="voice-session__back" onClick={onBack}>
          Back to recipe
        </button>
      </div>
    )
  }

  // ---- Active session ----
  const currentStep = recipe.steps[cookingStepIndex]
  const sortedCount = recipe.ingredients.filter((ing) => shoppingConfirmations[ing.item]).length
  const toGo = recipe.ingredients.length - sortedCount

  return (
    <div className={`app-screen theme-${mode}`}>
      <div className="topbar">
        <button type="button" className="iconbtn" onClick={handleChangeMode} aria-label="Change mode">
          ‹
        </button>
        <span className="topbar__title">{recipe.title}</span>
        <button type="button" className="voice-session__save" onClick={onSave} disabled={isSaved}>
          {isSaved ? 'Saved ✓' : 'Save'}
        </button>
      </div>

      {error && <p className="voice-session__error">{error}</p>}

      {mode === 'cooking' ? (
        <div className="step-hero">
          <div className="step-hero__meta">
            <span className="step-hero__label">
              STEP {Math.min(cookingStepIndex + 1, recipe.steps.length)} OF {recipe.steps.length}
            </span>
            <div className="step-hero__dots">
              {recipe.steps.map((_, i) => (
                <span key={i} className={i <= cookingStepIndex ? 'done' : ''} />
              ))}
            </div>
          </div>
          <div className="step-hero__text">{currentStep ?? "That's the last step — enjoy!"}</div>
        </div>
      ) : (
        <>
          <div className="shop-progress">
            <div className="shop-progress__row">
              <span className="shop-progress__count">
                {sortedCount} <small>of {recipe.ingredients.length} sorted</small>
              </span>
              <span className="shop-progress__togo">{toGo > 0 ? `${toGo} to go` : 'All set'}</span>
            </div>
            <div className="shop-progress__bar">
              <span style={{ width: `${(sortedCount / recipe.ingredients.length) * 100}%` }} />
            </div>
          </div>

          <ul className="check-list">
            {recipe.ingredients.map((ing) => {
              const conf = shoppingConfirmations[ing.item]
              const qty = formatQty(ing)

              if (conf?.status === 'confirmed') {
                return (
                  <li key={ing.item} className="check-row is-have">
                    <span className="check-row__mark">✓</span>
                    <span className="check-row__name">{ing.item}</span>
                    <span className="check-row__qty">{qty}</span>
                  </li>
                )
              }
              if (conf?.status === 'partial') {
                return (
                  <li key={ing.item} className="check-row is-partial">
                    <span className="check-row__mark">!</span>
                    <span className="check-row__name">
                      {ing.item}
                      <span className="check-row__sub">{conf.note || 'Not quite enough'}</span>
                    </span>
                    <span className="check-row__qty">{qty}</span>
                  </li>
                )
              }
              if (conf?.status === 'substituted') {
                return (
                  <li key={ing.item} className="check-row is-swap">
                    <span className="check-row__mark">⇄</span>
                    <span className="check-row__name">
                      <span className="old">{ing.item}</span> → <span className="new">{conf.note || 'substituted'}</span>
                      <span className="check-row__sub">Swapped</span>
                    </span>
                    <span className="check-row__qty">{qty}</span>
                  </li>
                )
              }
              if (conf?.status === 'missing') {
                return (
                  <li key={ing.item} className="check-row is-skip">
                    <span className="check-row__mark">✕</span>
                    <span className="check-row__name">
                      {ing.item}
                      <span className="check-row__sub">Couldn't find — skipped</span>
                    </span>
                    <button type="button" className="check-row__action" onClick={() => handleUndoIngredient(ing.item)}>
                      Undo
                    </button>
                  </li>
                )
              }
              return (
                <li key={ing.item} className="check-row">
                  <span className="check-row__mark" />
                  <span className="check-row__name">{ing.item}</span>
                  <span className="check-row__qty">{qty}</span>
                  <button type="button" className="check-row__skip" onClick={() => handleSkipIngredient(ing.item)}>
                    Skip
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* Cooking leads with the step, so the transcript sits beneath it.
          Shopping's hero *is* the checklist — it carries the same state the
          transcript would, so the log is omitted there (see handoff §10/§11). */}
      {mode === 'cooking' && (
        <div className="log">
          <div className="log__label">Conversation</div>
          {log.map((entry, i) =>
            entry.type === 'agent' || entry.type === 'user' ? (
              <div key={i} className={`log-entry log-entry--${entry.type}`}>
                {entry.text}
              </div>
            ) : (
              <div key={i} className="log-entry log-entry--tool">
                <span className="dot" aria-hidden="true" />
                {entry.text}
              </div>
            )
          )}
        </div>
      )}

      <div className="live-bar">
        {agentMode === 'speaking' ? (
          <div className="bars">
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : (
          <span className="pulse" />
        )}
        <span className="live-bar__label">{agentMode === 'speaking' ? 'Remy is speaking…' : 'Listening…'}</span>
        <button type="button" className="live-bar__wrap-up" onClick={() => setShowWrapUp(true)}>
          Wrap up
        </button>
      </div>

      {showWrapUp && (
        <>
          <div className="wrap-up__scrim" onClick={() => setShowWrapUp(false)} />
          <div className="wrap-up">
            <div className="wrap-up__handle" />
            <div className="wrap-up__title">Wrap up?</div>
            <div className="wrap-up__sub">
              {mode === 'cooking'
                ? `You're on step ${Math.min(cookingStepIndex + 1, recipe.steps.length)} of ${recipe.steps.length}. Nothing's lost either way.`
                : "Nothing's lost either way."}
            </div>
            <button type="button" className="wrap-up__opt wrap-up__opt--primary" onClick={() => endThenRun(onPause)}>
              <span className="wrap-up__opt-icon">⏸</span>
              <span>
                <span className="wrap-up__opt-title">Pause &amp; resume later</span>
                <span className="wrap-up__opt-note">
                  {mode === 'cooking'
                    ? `I'll remember you're at step ${Math.min(cookingStepIndex + 1, recipe.steps.length)}`
                    : "I'll remember where you left off"}
                </span>
              </span>
            </button>
            <button type="button" className="wrap-up__opt" onClick={() => endThenRun(onSaveAndEnd)}>
              <span className="wrap-up__opt-icon">♥</span>
              <span>
                <span className="wrap-up__opt-title">Save recipe &amp; end</span>
                <span className="wrap-up__opt-note">Keep it in your library</span>
              </span>
            </button>
            <button type="button" className="wrap-up__opt" onClick={() => endThenRun(onFinish)}>
              <span className="wrap-up__opt-icon">✓</span>
              <span>
                <span className="wrap-up__opt-title">Finish — all done</span>
                <span className="wrap-up__opt-note">Clear this session</span>
              </span>
            </button>
            <button type="button" className="wrap-up__keep" onClick={() => setShowWrapUp(false)}>
              Keep going
            </button>
          </div>
        </>
      )}
    </div>
  )
}
