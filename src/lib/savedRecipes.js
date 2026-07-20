const STORAGE_KEY = 'remy:savedRecipes'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(recipes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}

export function getSavedRecipes() {
  return readAll()
}

/**
 * Saves a recipe, assigning it an id on first save. Passing an
 * already-saved recipe (has an id) updates it in place instead of
 * duplicating it.
 */
export function saveRecipe(recipe) {
  const saved = { ...recipe, id: recipe.id ?? crypto.randomUUID(), savedAt: recipe.savedAt ?? Date.now() }
  writeAll([saved, ...readAll().filter((r) => r.id !== saved.id)])
  return saved
}

export function removeSavedRecipe(id) {
  writeAll(readAll().filter((r) => r.id !== id))
}
