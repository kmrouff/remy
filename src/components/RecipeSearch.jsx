import { useState } from 'react'
import { searchRecipes, getRecipeDetails } from '../lib/recipes'
import RecipeThumb from './RecipeThumb'

function formatMeta(result) {
  const parts = []
  if (result.readyInMinutes) parts.push(`${result.readyInMinutes} min`)
  if (result.servings) parts.push(`serves ${result.servings}`)
  return parts.join(' · ')
}

export default function RecipeSearch({ onSelect, onCancel }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [status, setStatus] = useState('idle') // idle | searching | loading | error
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim() || status === 'searching') return
    setStatus('searching')
    setError(null)
    try {
      const found = await searchRecipes(query.trim())
      setResults(found)
      setStatus('idle')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  async function handleSelect(id) {
    setStatus('loading')
    setSelectedId(id)
    setError(null)
    try {
      const recipe = await getRecipeDetails(id)
      onSelect(recipe)
    } catch (e) {
      setError(e.message)
      setStatus('error')
      setSelectedId(null)
    }
  }

  return (
    <div className="recipe-search">
      <div className="topbar">
        <button type="button" className="iconbtn" onClick={onCancel} aria-label="Cancel">
          ‹
        </button>
        <span className="topbar__title" style={{ flex: 'initial' }}>
          Search
        </span>
      </div>

      <form className="recipe-search__form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search recipes by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <button type="submit" className="recipe-input__submit" disabled={status === 'searching'}>
          {status === 'searching' ? 'Searching…' : 'Go'}
        </button>
      </form>

      {error && <p className="recipe-input__error">{error}</p>}

      {results && (
        <>
          <div className="loading__card-label">
            {results.length} result{results.length === 1 ? '' : 's'}
          </div>
          <ul className="recipe-search__results">
            {results.length === 0 && <li className="recipe-search__empty">No recipes found.</li>}
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="recipe-search__result"
                  onClick={() => handleSelect(r.id)}
                  disabled={status === 'loading'}
                >
                  <RecipeThumb recipe={r} base="recipe-search__thumb" />
                  <span className="recipe-search__result-info">
                    <span className="recipe-search__result-title">{r.title}</span>
                    <span className="recipe-search__result-meta">
                      {status === 'loading' && selectedId === r.id ? 'Fetching details…' : formatMeta(r)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
