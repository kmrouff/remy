export default function RecipeLibrary({ recipes, onSelect, onRemove, onBack }) {
  return (
    <main className="landing">
      <h1>Remy</h1>
      <p className="landing__tagline">Your saved recipes.</p>

      {recipes.length === 0 ? (
        <p className="recipe-library__empty">No saved recipes yet.</p>
      ) : (
        <ul className="recipe-library__list">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="recipe-library__item">
              <button type="button" className="recipe-library__item-button" onClick={() => onSelect(recipe)}>
                <span className="recipe-library__item-title">{recipe.title}</span>
                <span className="recipe-library__item-meta">
                  {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
                  {recipe.progress && (
                    <>
                      {' '}
                      · <span className="recipe-library__paused">Paused</span>
                    </>
                  )}
                </span>
              </button>
              <button
                type="button"
                className="recipe-library__item-remove"
                onClick={() => onRemove(recipe.id)}
                aria-label={`Remove ${recipe.title}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="landing__back" onClick={onBack}>
        Back
      </button>
    </main>
  )
}
