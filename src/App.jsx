import { useCallback, useEffect, useState } from 'react'
import VoiceSession from './components/VoiceSession'
import ModeToggle from './components/ModeToggle'
import RecipeInput from './components/RecipeInput'
import RecipeLibrary from './components/RecipeLibrary'
import WelcomeCarousel from './components/WelcomeCarousel'
import AuthScreen from './components/AuthScreen'
import AppMenu from './components/AppMenu'
import { useSession } from './lib/auth'
import {
  getSavedRecipes,
  saveRecipe,
  removeSavedRecipe,
  saveRecipeProgress,
  clearRecipeProgress,
  claimLocalRecipes,
} from './lib/savedRecipes'
import remyMark from './assets/remy-mark.png'
import './App.css'

// Fallback so the voice loop can still be tested/demoed without a working
// extraction pipeline (e.g. no ANTHROPIC_API_KEY set yet).
const SAMPLE_RECIPE = {
  title: 'Garlic Butter Pasta',
  ingredients: [
    { item: 'spaghetti', quantity: '1', unit: 'lb' },
    { item: 'butter', quantity: '4', unit: 'tbsp' },
    { item: 'garlic', quantity: '6', unit: 'cloves' },
    { item: 'parmesan', quantity: '1', unit: 'cup' },
    { item: 'red pepper flakes', quantity: '1', unit: 'tsp' },
    { item: 'parsley', quantity: '2', unit: 'tbsp' },
  ],
  steps: [
    'Bring a large pot of salted water to a boil and cook the spaghetti until al dente.',
    'While the pasta cooks, melt the butter in a large skillet over medium heat.',
    'Add the minced garlic and red pepper flakes, and cook until fragrant, about 1 minute.',
    'Drain the pasta, reserving a cup of pasta water, then add it to the skillet.',
    'Toss the pasta with the garlic butter, adding pasta water as needed to loosen the sauce.',
    'Remove from heat, stir in the parmesan and parsley, and serve immediately.',
  ],
}

const PITCH = {
  shopping: (recipe) => ({
    quote: `Let's gather your ${recipe.ingredients.length} ingredients.`,
    note: "Tell me what you already have and what you're looking at — I'll track down the rest, hands-free.",
  }),
  cooking: () => ({
    quote: "Let's cook. I'll read you each step.",
    note: "I'll walk you through each step, wait for you, and adjust timings out loud — no need to touch the screen.",
  }),
}

function formatIngredient(ing) {
  return [ing.quantity, ing.unit, ing.item].filter(Boolean).join(' ')
}

export default function App() {
  // 'input' | 'confirm' | 'session' | 'library' | 'auth'
  // Auth has no entry point in the design (it isn't part of the real flow yet),
  // so it's reachable at #auth purely for demoing the screens.
  const [screen, setScreen] = useState(() =>
    window.location.hash === '#auth' ? 'auth' : 'input'
  )
  const [recipe, setRecipe] = useState(null)
  const [savedRecipes, setSavedRecipes] = useState([])
  const [mode, setMode] = useState('shopping') // 'shopping' | 'cooking'
  const [cookingStepIndex, setCookingStepIndex] = useState(0)
  const [shoppingConfirmations, setShoppingConfirmations] = useState({})
  const [sessionKey, setSessionKey] = useState(0)
  const [hasSeenWelcome, setHasSeenWelcome] = useState(() => localStorage.getItem('remy:hasSeenWelcome') === 'true')
  const [storageError, setStorageError] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [markPulsing, setMarkPulsing] = useState(false)
  const [justOnboarded, setJustOnboarded] = useState(false)

  // Only the arrival right after onboarding gets the entrance animation —
  // it's a one-time "you made it" beat, not something to replay every time
  // someone lands back here mid-session.
  useEffect(() => {
    if (!justOnboarded) return
    const t = setTimeout(() => setJustOnboarded(false), 1200)
    return () => clearTimeout(t)
  }, [justOnboarded])

  function handleOpenMenu() {
    setMenuOpen(true)
    setMarkPulsing(true)
    setTimeout(() => setMarkPulsing(false), 500)
  }

  const { user, loading: sessionLoading } = useSession()

  function handleWelcomeDone() {
    localStorage.setItem('remy:hasSeenWelcome', 'true')
    setHasSeenWelcome(true)
    setJustOnboarded(true)
  }

  const refreshSavedRecipes = useCallback(async () => {
    try {
      setSavedRecipes(await getSavedRecipes())
      setStorageError(null)
    } catch (e) {
      setStorageError(e.message)
    }
  }, [])

  // Load the library once we know whether we're a guest or signed in, and
  // reload whenever that changes. On the first authenticated load, any
  // recipes saved on this device get claimed into the account first, so
  // signing in never looks like it wiped them.
  useEffect(() => {
    if (sessionLoading) return
    let cancelled = false

    ;(async () => {
      try {
        if (user) await claimLocalRecipes()
      } catch (e) {
        if (!cancelled) setStorageError(e.message)
      }
      if (!cancelled) await refreshSavedRecipes()
    })()

    return () => {
      cancelled = true
    }
  }, [user, sessionLoading, refreshSavedRecipes])

  function resetProgressState() {
    setCookingStepIndex(0)
    setShoppingConfirmations({})
  }

  function handleExtracted(extracted) {
    setRecipe(extracted)
    setScreen('confirm')
  }

  function handleBackToRecipe() {
    resetProgressState()
    setScreen('confirm')
  }

  function handleRetry() {
    setSessionKey((k) => k + 1)
  }

  async function handleSaveRecipe() {
    try {
      const saved = await saveRecipe(recipe)
      setRecipe(saved)
      await refreshSavedRecipes()
    } catch (e) {
      setStorageError(e.message)
    }
  }

  async function handleRemoveSaved(id) {
    try {
      await removeSavedRecipe(id)
      await refreshSavedRecipes()
    } catch (e) {
      setStorageError(e.message)
    }
  }

  function handleSelectSaved(saved) {
    setRecipe(saved)
    setScreen('confirm')
  }

  function handleResume(progress) {
    setMode(progress.mode)
    setCookingStepIndex(progress.cookingStepIndex)
    setShoppingConfirmations(progress.shoppingConfirmations)
    setScreen('session')
  }

  async function handleStartOver() {
    if (recipe.id) {
      try {
        await clearRecipeProgress(recipe.id)
        setRecipe((prev) => (prev ? { ...prev, progress: null } : prev))
        await refreshSavedRecipes()
      } catch (e) {
        setStorageError(e.message)
      }
    }
    resetProgressState()
    setScreen('session')
  }

  function handleTryAnother() {
    setRecipe(null)
    setScreen('input')
  }

  // Called from within an active VoiceSession, which ends its own call
  // before invoking these — App just needs to persist state and navigate.
  // Navigation happens regardless of whether the write succeeds: someone
  // leaving a session should never be held there by a storage error.
  async function handlePause() {
    try {
      setRecipe(await saveRecipeProgress(recipe, { mode, cookingStepIndex, shoppingConfirmations }))
      await refreshSavedRecipes()
    } catch (e) {
      setStorageError(e.message)
    }
    resetProgressState()
    setScreen('input')
  }

  async function handleFinish() {
    if (recipe.id) {
      try {
        await clearRecipeProgress(recipe.id)
        await refreshSavedRecipes()
      } catch (e) {
        setStorageError(e.message)
      }
    }
    resetProgressState()
    setRecipe(null)
    setScreen('input')
  }

  async function handleSaveAndEnd() {
    try {
      setRecipe(await saveRecipe(recipe))
      await refreshSavedRecipes()
    } catch (e) {
      setStorageError(e.message)
    }
    resetProgressState()
    setScreen('input')
  }

  if (!hasSeenWelcome) {
    return <WelcomeCarousel onDone={handleWelcomeDone} />
  }

  if (screen === 'session' && recipe) {
    const isSaved = Boolean(recipe.id) && savedRecipes.some((r) => r.id === recipe.id)
    return (
      <VoiceSession
        key={sessionKey}
        recipe={recipe}
        mode={mode}
        cookingStepIndex={cookingStepIndex}
        setCookingStepIndex={setCookingStepIndex}
        shoppingConfirmations={shoppingConfirmations}
        setShoppingConfirmations={setShoppingConfirmations}
        isSaved={isSaved}
        onSave={handleSaveRecipe}
        onPause={handlePause}
        onFinish={handleFinish}
        onSaveAndEnd={handleSaveAndEnd}
        onRetry={handleRetry}
        onBack={handleBackToRecipe}
      />
    )
  }

  if (screen === 'library') {
    return (
      <RecipeLibrary
        recipes={savedRecipes}
        user={user}
        storageError={storageError}
        onSelect={handleSelectSaved}
        onRemove={handleRemoveSaved}
        onBack={() => setScreen('input')}
        onSignIn={() => setScreen('auth')}
        onSignedOut={() => refreshSavedRecipes()}
      />
    )
  }

  if (screen === 'auth') {
    // Signing in returns you to the library, where the newly synced recipes
    // (including any just claimed off this device) are the thing to see.
    return <AuthScreen onBack={() => setScreen('input')} onSignedIn={() => setScreen('library')} />
  }

  if (screen === 'confirm' && recipe) {
    const isSaved = Boolean(recipe.id) && savedRecipes.some((r) => r.id === recipe.id)
    const progress = recipe.progress
    const pitch = PITCH[mode](recipe)

    return (
      <main className={`app-screen theme-${mode}`}>
        <div className="topbar">
          <button type="button" className="iconbtn" onClick={handleTryAnother} aria-label="Back">
            ‹
          </button>
          <span className="topbar__title" style={{ flex: 'initial', margin: '0 auto' }}>
            Remy
          </span>
          <span style={{ width: 38, flexShrink: 0 }} aria-hidden="true" />
        </div>

        <ModeToggle mode={mode} onChange={setMode} />

        {progress ? (
          <>
            <div className="confirm__head">
              <div className="eyebrow">Welcome back</div>
              <div className="confirm__title">{recipe.title}</div>
              <div className="confirm__meta">
                {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
              </div>
            </div>
            <div className="resume__card">
              <div className="resume__tag">
                <span className="dot" aria-hidden="true" />
                PAUSED IN {progress.mode.toUpperCase()}
              </div>
              <div className="resume__headline">
                {progress.mode === 'cooking'
                  ? `You left off at step ${progress.cookingStepIndex + 1}.`
                  : "You've started sorting your ingredients."}
              </div>
              <div className="resume__excerpt">
                {progress.mode === 'cooking' && recipe.steps[progress.cookingStepIndex]
                  ? `"${recipe.steps[progress.cookingStepIndex]}" Everything's saved — pick up right where you were.`
                  : "Everything's saved — pick up right where you were."}
              </div>
              {progress.mode === 'cooking' && (
                <div className="resume__progress">
                  {recipe.steps.map((_, i) => (
                    <span key={i} className={i <= progress.cookingStepIndex ? 'done' : ''} />
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn-mode" onClick={() => handleResume(progress)}>
              Resume{progress.mode === 'cooking' ? ` at step ${progress.cookingStepIndex + 1}` : ''}
            </button>
            <button type="button" className="btn-mode-outline" onClick={handleStartOver}>
              Start over from the top
            </button>
          </>
        ) : (
          <>
            <div className="confirm__head">
              <div className="eyebrow">{mode} mode</div>
              <h1 className="confirm__title">{recipe.title}</h1>
              <div className="confirm__meta">
                {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
              </div>
            </div>
            <div className="confirm__pitch">
              <div className="confirm__pitch-quote">"{pitch.quote}"</div>
              <div className="confirm__pitch-note">{pitch.note}</div>
            </div>
            {mode === 'shopping' && recipe.ingredients[0] && (
              <div className="confirm__first">
                First on the list: <strong>{formatIngredient(recipe.ingredients[0])}.</strong>
              </div>
            )}
            {mode === 'cooking' && recipe.steps[0] && (
              <div className="confirm__first">
                First up: <strong>{recipe.steps[0]}</strong>
              </div>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn-mode" onClick={() => setScreen('session')}>
              Start {mode === 'shopping' ? 'shopping' : 'cooking'}
            </button>
            <div className="confirm__foot">
              <button type="button" onClick={handleSaveRecipe} disabled={isSaved}>
                {isSaved ? 'Saved ✓' : 'Save recipe'}
              </button>
              <span className="sep" aria-hidden="true" />
              <button type="button" onClick={handleTryAnother}>
                Try another
              </button>
            </div>
          </>
        )}
      </main>
    )
  }

  return (
    <>
      <main className={`landing${justOnboarded ? ' is-entering' : ''}`}>
        <div className="landing__brand">
          <span className="landing__brand-lockup">
            <button
              type="button"
              className={`landing__mark-btn${markPulsing ? ' is-pulsing' : ''}`}
              onClick={handleOpenMenu}
              aria-label="Open menu"
            >
              <img src={remyMark} alt="" />
            </button>
            <span className="wordmark">Remy</span>
          </span>
          <button type="button" className="landing__saved-link" onClick={() => setScreen('library')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
            </svg>
            My recipes
            {savedRecipes.length > 0 && <span>{savedRecipes.length}</span>}
          </button>
        </div>
        <h1>
          What are we
          <br />
          making today?
        </h1>
        <RecipeInput onExtracted={handleExtracted} onUseSample={() => handleExtracted(SAMPLE_RECIPE)} />
      </main>
      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}
