import { useState } from 'react'
import VoiceSession from './components/VoiceSession'
import ModeToggle from './components/ModeToggle'
import RecipeInput from './components/RecipeInput'
import RecipeLibrary from './components/RecipeLibrary'
import { getSavedRecipes, saveRecipe, removeSavedRecipe } from './lib/savedRecipes'
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

export default function App() {
  const [screen, setScreen] = useState('input') // 'input' | 'confirm' | 'session' | 'library'
  const [recipe, setRecipe] = useState(null)
  const [savedRecipes, setSavedRecipes] = useState(() => getSavedRecipes())
  const [mode, setMode] = useState('shopping') // 'shopping' | 'cooking'
  const [cookingStepIndex, setCookingStepIndex] = useState(0)
  const [shoppingConfirmations, setShoppingConfirmations] = useState({})
  const [sessionKey, setSessionKey] = useState(0)

  function handleExtracted(extracted) {
    setRecipe(extracted)
    setScreen('confirm')
  }

  function handleEndSession() {
    setCookingStepIndex(0)
    setShoppingConfirmations({})
    setRecipe(null)
    setScreen('input')
  }

  function handleBackToRecipe() {
    setCookingStepIndex(0)
    setShoppingConfirmations({})
    setScreen('confirm')
  }

  function handleRetry() {
    setSessionKey((k) => k + 1)
  }

  function handleSaveRecipe() {
    const saved = saveRecipe(recipe)
    setRecipe(saved)
    setSavedRecipes(getSavedRecipes())
  }

  function handleRemoveSaved(id) {
    removeSavedRecipe(id)
    setSavedRecipes(getSavedRecipes())
  }

  function handleSelectSaved(saved) {
    setRecipe(saved)
    setScreen('confirm')
  }

  if (screen === 'session' && recipe) {
    return (
      <VoiceSession
        key={sessionKey}
        recipe={recipe}
        mode={mode}
        cookingStepIndex={cookingStepIndex}
        setCookingStepIndex={setCookingStepIndex}
        shoppingConfirmations={shoppingConfirmations}
        setShoppingConfirmations={setShoppingConfirmations}
        onEnd={handleEndSession}
        onRetry={handleRetry}
        onBack={handleBackToRecipe}
      />
    )
  }

  if (screen === 'library') {
    return (
      <RecipeLibrary
        recipes={savedRecipes}
        onSelect={handleSelectSaved}
        onRemove={handleRemoveSaved}
        onBack={() => setScreen('input')}
      />
    )
  }

  if (screen === 'confirm' && recipe) {
    const isSaved = Boolean(recipe.id) && savedRecipes.some((r) => r.id === recipe.id)
    return (
      <main className="landing">
        <h1>Remy</h1>
        <ModeToggle mode={mode} onChange={setMode} />
        <div className="landing__card">
          <h2>{recipe.title}</h2>
          <p>{recipe.ingredients.length} ingredients · {recipe.steps.length} steps</p>
          <button type="button" className="landing__start" onClick={() => setScreen('session')}>
            Start {mode === 'shopping' ? 'shopping' : 'cooking'}
          </button>
          <button type="button" className="landing__save" onClick={handleSaveRecipe} disabled={isSaved}>
            {isSaved ? 'Saved ✓' : 'Save recipe'}
          </button>
          <button
            type="button"
            className="landing__back"
            onClick={() => {
              setRecipe(null)
              setScreen('input')
            }}
          >
            Try a different recipe
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="landing">
      <h1>Remy</h1>
      <p className="landing__tagline">Your hands-free cooking companion.</p>
      <RecipeInput onExtracted={handleExtracted} onUseSample={() => handleExtracted(SAMPLE_RECIPE)} />
      <button type="button" className="landing__library-link" onClick={() => setScreen('library')}>
        My saved recipes{savedRecipes.length > 0 ? ` (${savedRecipes.length})` : ''}
      </button>
    </main>
  )
}
