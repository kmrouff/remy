/**
 * Saved recipes.
 *
 * The thumbnail sits on the *right* of each row. Only Spoonacular supplies an
 * image — URL and photo extraction never do — so a left-hand thumbnail would
 * either need a placeholder in most rows, or would shift the title's left edge
 * between rows that have one and rows that don't. On the right it can simply
 * be absent, and titles stay on a fixed left edge to scan down.
 */
export default function RecipeLibrary({ recipes, onSelect, onRemove, onBack }) {
  return (
    <main className="recipe-library">
      <div className="recipe-library__head">
        <button type="button" className="iconbtn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <span className="wordmark">Saved recipes</span>
      </div>

      {recipes.length === 0 ? (
        <p className="recipe-library__empty">No saved recipes yet.</p>
      ) : (
        <>
          <div className="recipe-library__count">
            {recipes.length} recipe{recipes.length === 1 ? '' : 's'}
          </div>
          <ul className="recipe-library__list">
            {recipes.map((recipe) => (
              <li key={recipe.id} className="recipe-library__item">
                <button type="button" className="recipe-library__item-button" onClick={() => onSelect(recipe)}>
                  <span className="recipe-library__item-title">{recipe.title}</span>
                  <span className="recipe-library__item-meta">
                    {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
                    {recipe.progress && (
                      <span className={`recipe-library__paused is-${recipe.progress.mode}`}>
                        <span className="pause-bars" aria-hidden="true">
                          <span />
                          <span />
                        </span>
                        {recipe.progress.mode === 'cooking' ? `Step ${recipe.progress.cookingStepIndex + 1}` : 'Shopping'}
                      </span>
                    )}
                  </span>
                </button>
                {recipe.image && <img src={recipe.image} alt="" className="recipe-library__thumb" />}
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
        </>
      )}
    </main>
  )
}
