import { useState } from 'react'
import { searchRecipes, getRecipeDetails } from '../lib/recipes'

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
      <form className="recipe-search__form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search recipes by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="recipe-input__field"
          required
        />
        <button type="submit" className="recipe-input__submit" disabled={status === 'searching'}>
          {status === 'searching' ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <p className="recipe-input__error">{error}</p>}

      {results && (
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
                {r.image && <img src={r.image} alt="" className="recipe-search__thumb" />}
                <span>{status === 'loading' && selectedId === r.id ? 'Loading…' : r.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="recipe-input__sample" onClick={onCancel}>
        Cancel
      </button>
    </div>
  )
}
