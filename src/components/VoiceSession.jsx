import { useEffect, useRef, useState } from 'react'
import { startVoiceSession } from '../lib/elevenlabs'
import { shareRecipe } from '../lib/share'

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID

// Sent via sendContextualUpdate right after connecting. Deliberately just a
// mode announcement: the agent's full behavioral spec (shopping/cooking flow,
// wake-word rules, tool contracts) lives in the dashboard system prompt —
// one source of truth, so the two can't drift apart. The system prompt
// promises "the app tells you which mode this session is in"; this is that.
const MODE_CONTEXT = {
  shopping:
    'This session is Shopping mode — the user is gathering ingredients for this recipe. Follow your Shopping instructions.',
  cooking:
    'This session is Cooking mode — the user is ready to cook. Follow your Cooking instructions.',
}

// Greeting spoken when the session first connects, matched to the mode
// picked on the confirm screen. Only takes effect if "first message"
// overrides are enabled for the agent in the ElevenLabs dashboard.
const FIRST_MESSAGE = {
  shopping:
    "Hey, I'm Remy, your invisible sous chef. Quick thing first — are you already at the store, or still planning from home? And whenever it goes quiet, just say my name to bring me back — I'll stay out of anything that's not meant for me.",
  cooking:
    "Hey, I'm Remy, ready to guide you through this hands-free. Take your time getting set up — I'll wait quietly, just say 'Remy' when you want to start.",
}

// Hand off a few minutes short of the agent's configured max conversation
// duration, so the close is a deliberate pause rather than the platform
// cutting the call mid-sentence. Raise the dashboard cap and this together.
const SESSION_SOFT_LIMIT_MS = 25 * 60 * 1000
const LIMIT_ANNOUNCE_MS = 9000

const LIMIT_NOTICE =
  'SYSTEM: this call is about to reach its maximum length, which is a platform limit and has ' +
  'nothing to do with the user. Right now, in one short friendly line, tell them a single call ' +
  "can't run any longer, that nothing is lost, and that they can tap the button on screen to " +
  'pick up exactly where they are. Then stop talking. Do not ask a question, do not say goodbye ' +
  'as though the cooking is finished, and do not start any new step.'

function formatQty(ing) {
  return [ing.quantity, ing.unit].filter(Boolean).join(' ')
}

// The agent cannot see the screen, so the dish has to be said outright. Without
// this it only ever received bare ingredient names and bare step text, and would
// infer the dish from whatever step it had just read: "boil and mash the
// potatoes" made it believe the recipe was mashed potatoes. Sent once on connect
// and repeated in every tool return, so a long conversation can't drift off it.
function recipeContext(recipe, { mode, cookingStepIndex, resumed }) {
  const ingredients = recipe.ingredients
    .map((ing) => {
      const qty = formatQty(ing)
      return qty ? `${ing.item} (${qty})` : ing.item
    })
    .join(', ')
  let text =
    `The recipe for this whole session is "${recipe.title}" — ${recipe.ingredients.length} ingredients, ` +
    `${recipe.steps.length} steps. The full ingredient list is: ${ingredients}. ` +
    `Refer to the dish by that name. Never infer what is being cooked from a single step; ` +
    `an early step may only describe one component of the finished dish.`

  if (mode === 'cooking') {
    text += ` They are currently on step ${Math.min(cookingStepIndex + 1, recipe.steps.length)} of ${recipe.steps.length}.`
  }
  // A resumed session is a brand new call to the API but the same cook to the
  // user — without this the agent re-introduces itself and offers to start over.
  if (resumed) {
    text +=
      ` This is a reconnection of a session already in progress, not a new one. Do not introduce` +
      ` yourself, do not start from the beginning, and do not re-run the prep questions. Greet them` +
      ` in one short line that picks up exactly where they left off, then wait.`
  }
  return text
}

// Right-hand status column on the checklist. The agent records a status plus
// a free-text note; "missing" covers both "buying it later" and "skipping it
// this time", which read very differently to someone standing in a shop, so
// the note is sniffed to tell them apart. Falls back to the safer "Skipped".
function statusLabel(conf) {
  if (!conf) return 'To get'
  if (conf.status === 'missing') {
    return /\b(buy|buying|later|pick up|grab)\b/i.test(conf.note || '') ? 'Buy later' : 'Skipped'
  }
  return { confirmed: 'Got it', partial: 'Partial', substituted: 'Swapped' }[conf.status] ?? 'To get'
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
  onSwitchToCooking,
  resumed,
  onSessionLimit,
}) {
  const [status, setStatus] = useState('connecting') // disconnected | connecting | connected | disconnecting
  const [agentMode, setAgentMode] = useState('listening') // listening | speaking
  const [log, setLog] = useState([])
  const [error, setError] = useState(null)
  const [showWrapUp, setShowWrapUp] = useState(false)
  const [shareStatus, setShareStatus] = useState(null) // null | 'copied' | 'failed'

  const conversationRef = useRef(null)
  // Mirror of the latest props/state so the client-tool closures (registered
  // once at startSession time) never read stale values.
  const stateRef = useRef({ recipe, cookingStepIndex, shoppingConfirmations, mode })
  stateRef.current = { recipe, cookingStepIndex, shoppingConfirmations, mode }
  // Set right before *we* deliberately end the call (back button, wrap-up
  // actions), so the effect below can tell that apart from the agent (or
  // the network) ending it on its own.
  const intentionalDisconnectRef = useRef(false)
  const limitTimerRef = useRef(null)
  // cookingStepIndex means "the step you're on", so the card on screen always
  // matches what Remy just read. That requires knowing whether a step has
  // been read *this session*: the first call serves the current index (on a
  // resume, that re-reads the step you paused on), and only later calls
  // advance. Without this the screen sat one step ahead of the voice.
  const hasReadAStepRef = useRef(false)

  // A disconnect we didn't initiate — the agent's own end-call tool, or a
  // dropped connection — would otherwise leave the last screen frozen on
  // screen with no indication the call is over and no chance to save
  // progress. Surface the same wrap-up choice used for a deliberate exit.
  useEffect(() => {
    if (status === 'disconnected' && !error && !intentionalDisconnectRef.current) {
      setShowWrapUp(true)
    }
  }, [status, error])

  // ElevenLabs caps a single conversation's wall-clock duration, and this app
  // burns that budget on waiting rather than talking: the walk to the shop, a
  // pan on a low simmer. Rather than be cut off mid-recipe, hand off before the
  // cap — the agent says why, we close the call, and the user taps to come
  // back. Progress survives because it lives in App, not in this component.
  useEffect(() => {
    if (status !== 'connected' || limitTimerRef.current) return
    limitTimerRef.current = setTimeout(async () => {
      intentionalDisconnectRef.current = true
      conversationRef.current?.sendContextualUpdate(LIMIT_NOTICE)
      // Give it room to actually say the line before the line goes dead.
      await new Promise((resolve) => setTimeout(resolve, LIMIT_ANNOUNCE_MS))
      await conversationRef.current?.endSession()
      onSessionLimit?.()
    }, SESSION_SOFT_LIMIT_MS)
  }, [status, onSessionLimit])

  useEffect(() => () => clearTimeout(limitTimerRef.current), [])

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
            note: shoppingConfirmations[ing.item]?.note ?? undefined,
          }))
          appendLog({ type: 'tool', text: `Checked the shopping list — ${list.length} items` })
          // Titled, so re-checking the list mid-conversation also re-grounds
          // the agent on which dish this is.
          return JSON.stringify({ recipe: recipe.title, items: list })
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
          const { recipe, cookingStepIndex, mode } = stateRef.current
          // Mode can't change mid-call — the screen stays on the shopping
          // checklist regardless of what gets said, so reading a step here
          // would narrate a UI the user isn't looking at. Refuse instead of
          // relying on the prompt alone to avoid this.
          if (mode !== 'cooking') {
            return "not available — still in Shopping mode. If the user is done shopping, tell them to use the 'Done shopping' option to move to Cooking; don't describe recipe steps yet."
          }
          const nextIndex = hasReadAStepRef.current ? cookingStepIndex + 1 : cookingStepIndex
          const step = recipe.steps[nextIndex]
          if (step) {
            hasReadAStepRef.current = true
            setCookingStepIndex(nextIndex)
            appendLog({ type: 'tool', text: `Moved on to step ${nextIndex + 1}` })
            // Numbered and titled: a bare step string reads like the whole
            // recipe, which is how the agent used to mistake step one for the
            // finished dish.
            return JSON.stringify({
              recipe: recipe.title,
              step: nextIndex + 1,
              of: recipe.steps.length,
              instruction: step,
            })
          }
          appendLog({ type: 'tool', text: 'Reached the end of the recipe' })
          return JSON.stringify({
            recipe: recipe.title,
            done: true,
            message: `no more steps — ${recipe.title} is complete`,
          })
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
        const { recipe: r, mode: m, cookingStepIndex: i } = stateRef.current
        conversation.sendContextualUpdate(
          `${recipeContext(r, { mode: m, cookingStepIndex: i, resumed })}\n\n${MODE_CONTEXT[m]}`
        )
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
    intentionalDisconnectRef.current = true
    setStatus('disconnecting')
    await conversationRef.current?.endSession()
    onBack()
  }

  async function handleCancelConnecting() {
    intentionalDisconnectRef.current = true
    await conversationRef.current?.endSession()
    onBack()
  }

  // Tapping Pause closes the call *before* the sheet opens, rather than
  // leaving it live while the user reads their options. The session is what
  // costs money and burns the call-length budget, and none of it is being
  // used while a menu is up.
  async function handlePauseTap() {
    intentionalDisconnectRef.current = true
    clearTimeout(limitTimerRef.current)
    setStatus('disconnecting')
    await conversationRef.current?.endSession()
    setShowWrapUp(true)
  }

  async function endThenRun(action) {
    intentionalDisconnectRef.current = true
    setShowWrapUp(false)
    setStatus('disconnecting')
    await conversationRef.current?.endSession()
    action()
  }

  // Shares as a side action, not an end state — the wrap-up sheet stays open.
  async function handleShare() {
    const result = await shareRecipe(recipe)
    if (result === 'copied' || result === 'failed') {
      setShareStatus(result)
      setTimeout(() => setShareStatus(null), 2000)
    }
  }

  // Card arrows are a peer of the agent's own stepping, not a separate
  // pointer: moving here tells Remy where the user went, so the next
  // get_next_step continues from the new position rather than snapping back.
  function goToStep(target) {
    const clamped = Math.max(0, Math.min(target, recipe.steps.length - 1))
    if (clamped === cookingStepIndex) return
    hasReadAStepRef.current = true
    setCookingStepIndex(clamped)
    conversationRef.current?.sendContextualUpdate(
      `The user moved to step ${clamped + 1} of ${recipe.steps.length} themselves on screen: "${recipe.steps[clamped]}". Don't re-read it unless they ask — just carry on from here.`
    )
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
  const isPaused = status === 'disconnecting' || status === 'disconnected'
  const onLastStep = mode === 'cooking' && cookingStepIndex >= recipe.steps.length - 1
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
        <div className="step-card">
          <div className="step-card__meta">
            <span className="step-hero__label">
              STEP {Math.min(cookingStepIndex + 1, recipe.steps.length)} OF {recipe.steps.length}
            </span>
            <div className="step-hero__dots">
              {recipe.steps.map((_, i) => (
                <span key={i} className={i <= cookingStepIndex ? 'done' : ''} />
              ))}
            </div>
          </div>
          <div className="step-card__text">{currentStep ?? "That's the last step — enjoy!"}</div>
          <div className="step-card__nav">
            <button
              type="button"
              className="step-card__arrow"
              onClick={() => goToStep(cookingStepIndex - 1)}
              disabled={cookingStepIndex === 0}
              aria-label="Previous step"
            >
              ‹
            </button>
            <span className="step-card__hint">Remy moves these as you cook</span>
            <button
              type="button"
              className="step-card__arrow"
              onClick={() => goToStep(cookingStepIndex + 1)}
              disabled={cookingStepIndex >= recipe.steps.length - 1}
              aria-label="Next step"
            >
              ›
            </button>
          </div>
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

          {/* One row shape for every state — the status column on the right
              is what changes, so the list stays scannable at a glance while
              Remy mutates it mid-conversation. */}
          <ul className="check-list">
            {recipe.ingredients.map((ing) => {
              const conf = shoppingConfirmations[ing.item]
              const qty = formatQty(ing)
              const status = conf?.status ?? 'pending'
              const mark = { confirmed: '✓', partial: '!', substituted: '⇄', missing: '✕' }[status] ?? ''
              const rowClass = {
                confirmed: 'is-have',
                partial: 'is-partial',
                substituted: 'is-swap',
                missing: 'is-skip',
              }[status]

              return (
                <li key={ing.item} className={`check-row${rowClass ? ` ${rowClass}` : ''}`}>
                  <span className="check-row__mark">{mark}</span>
                  <span className="check-row__name">
                    {/* the label is struck on its own, never the sub-line —
                        text-decoration bleeds into descendants and can't be
                        turned off from the child, so they stay siblings */}
                    <span className="check-row__label">
                      {status === 'substituted' ? (
                        <>
                          <span className="old">{ing.item}</span> → <span className="new">{conf.note || 'substituted'}</span>
                        </>
                      ) : (
                        ing.item
                      )}
                    </span>
                    <span className="check-row__sub">
                      {qty}
                      {status === 'partial' && conf.note ? ` · ${conf.note}` : ''}
                      {status === 'missing' && conf.note ? ` · ${conf.note}` : ''}
                    </span>
                  </span>
                  <span className="check-row__status">{statusLabel(conf)}</span>
                  {conf ? (
                    <button
                      type="button"
                      className="check-row__action"
                      onClick={() => handleUndoIngredient(ing.item)}
                      aria-label={`Undo ${ing.item}`}
                    >
                      ↺
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="check-row__action"
                      onClick={() => handleSkipIngredient(ing.item)}
                      aria-label={`Skip ${ing.item}`}
                    >
                      ✕
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {/* The step card is what you orient by; this is just enough transcript
          to catch a line you missed over a running tap. Last few turns only,
          spoken words only — tool bookkeeping isn't worth the space here.
          Shopping omits it entirely: its checklist already shows that state. */}
      {mode === 'cooking' && (
        <div className="log log--compact">
          {log
            .filter((entry) => entry.type === 'agent' || entry.type === 'user')
            .slice(-3)
            .map((entry, i) => (
              <div key={i} className={`log-entry log-entry--${entry.type}`}>
                {entry.text}
              </div>
            ))}
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
        <span className="live-bar__label">
          {isPaused ? 'Paused' : agentMode === 'speaking' ? 'Remy is speaking…' : 'Listening…'}
        </span>
        <button type="button" className="live-bar__wrap-up" onClick={handlePauseTap} disabled={isPaused}>
          {onLastStep ? 'Finish' : 'Pause'}
        </button>
      </div>

      {showWrapUp && (
        <>
          {/* No scrim dismiss: the call is already closed by the time this is
              up, so tapping away would leave a dead session behind a live-
              looking screen. Every exit from here is an explicit choice. */}
          <div className="wrap-up__scrim" />
          <div className="wrap-up">
            <div className="wrap-up__handle" />
            <div className="wrap-up__title">Paused</div>
            <div className="wrap-up__sub">
              {mode === 'cooking'
                ? `You're on step ${Math.min(cookingStepIndex + 1, recipe.steps.length)} of ${recipe.steps.length}. Remy's off the clock until you pick back up.`
                : "Your list is as you left it. Remy's off the clock until you pick back up."}
            </div>
            <button type="button" className="wrap-up__opt wrap-up__opt--primary" onClick={onResume}>
              <span className="wrap-up__opt-icon">▸</span>
              <span>
                <span className="wrap-up__opt-title">Resume</span>
                <span className="wrap-up__opt-note">Carry on from right here</span>
              </span>
            </button>
            {mode === 'shopping' && (
              <button type="button" className="wrap-up__opt" onClick={() => endThenRun(onSwitchToCooking)}>
                <span className="wrap-up__opt-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="M13 5l7 7-7 7" />
                  </svg>
                </span>
                <span>
                  <span className="wrap-up__opt-title">Done shopping — start cooking</span>
                  <span className="wrap-up__opt-note">
                    {toGo > 0 ? `${toGo} item${toGo === 1 ? '' : 's'} still unsorted` : 'Everything sorted — head to the stove'}
                  </span>
                </span>
              </button>
            )}
            <button type="button" className="wrap-up__opt" onClick={() => endThenRun(onPause)}>
              <span className="wrap-up__opt-icon">
                <span className="pause-bars" aria-hidden="true">
                  <span />
                  <span />
                </span>
              </span>
              <span>
                <span className="wrap-up__opt-title">Save &amp; come back later</span>
                <span className="wrap-up__opt-note">
                  {mode === 'cooking'
                    ? `I'll remember you're at step ${Math.min(cookingStepIndex + 1, recipe.steps.length)}`
                    : "I'll remember where you left off"}
                </span>
              </span>
            </button>
            <button type="button" className="wrap-up__opt" onClick={() => endThenRun(onSaveAndEnd)}>
              <span className="wrap-up__opt-icon wrap-up__opt-icon--save">♥</span>
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
            <button type="button" className="wrap-up__opt" onClick={handleShare}>
              <span className="wrap-up__opt-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
                  <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
                </svg>
              </span>
              <span>
                <span className="wrap-up__opt-title">
                  {shareStatus === 'copied' ? 'Link copied' : shareStatus === 'failed' ? "Couldn't share" : 'Share what you cooked'}
                </span>
                <span className="wrap-up__opt-note">Tell a friend you used Remy</span>
              </span>
            </button>
            <button type="button" className="wrap-up__keep" onClick={onBack}>
              Back to the recipe
            </button>
          </div>
        </>
      )}
    </div>
  )
}
