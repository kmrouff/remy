import { supabase } from './supabase'

const STORAGE_KEY = 'remy:savedRecipes'

/**
 * Recipe storage, backed by localStorage for guests and Postgres for
 * signed-in users.
 *
 * Auth is optional, so both backends are live paths, not a migration
 * half-state. Every function here is async — the local branch resolves
 * immediately, but callers can't know which backend they'll hit, so the
 * signature has to be the same either way.
 *
 * The row shape in Postgres is snake_case (`user_id`, `saved_at`); the app
 * speaks camelCase. `toRow`/`fromRow` are the only places that know about it.
 */

// ---------- local (guest) ----------

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(recipes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes))
}

// ---------- remote (signed-in) ----------

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    image: row.image ?? undefined,
    ingredients: row.ingredients ?? [],
    steps: row.steps ?? [],
    progress: row.progress ?? null,
    savedAt: row.saved_at ? new Date(row.saved_at).getTime() : Date.now(),
  }
}

function toRow(recipe, userId) {
  return {
    id: recipe.id,
    user_id: userId,
    title: recipe.title,
    image: recipe.image ?? null,
    ingredients: recipe.ingredients ?? [],
    steps: recipe.steps ?? [],
    progress: recipe.progress ?? null,
    saved_at: new Date(recipe.savedAt ?? Date.now()).toISOString(),
  }
}

/** Resolves to the signed-in user's id, or null when guest / unconfigured. */
async function currentUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

// ---------- public API ----------

export async function getSavedRecipes() {
  const userId = await currentUserId()
  if (!userId) return readLocal()

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('saved_at', { ascending: false })

  if (error) throw new Error(`Couldn't load your recipes: ${error.message}`)
  return (data ?? []).map(fromRow)
}

/**
 * Saves a recipe, assigning an id on first save. Passing an already-saved
 * recipe (one with an id) updates it in place rather than duplicating it.
 */
export async function saveRecipe(recipe) {
  const saved = {
    ...recipe,
    id: recipe.id ?? crypto.randomUUID(),
    savedAt: recipe.savedAt ?? Date.now(),
  }

  const userId = await currentUserId()
  if (!userId) {
    writeLocal([saved, ...readLocal().filter((r) => r.id !== saved.id)])
    return saved
  }

  const { error } = await supabase.from('recipes').upsert(toRow(saved, userId))
  if (error) throw new Error(`Couldn't save that recipe: ${error.message}`)
  return saved
}

export async function removeSavedRecipe(id) {
  const userId = await currentUserId()
  if (!userId) {
    writeLocal(readLocal().filter((r) => r.id !== id))
    return
  }

  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw new Error(`Couldn't remove that recipe: ${error.message}`)
}

/**
 * Saves a recipe with a progress snapshot attached, so it can be resumed
 * later from where the user paused.
 * @param {object} recipe
 * @param {{ mode: string, cookingStepIndex: number, shoppingConfirmations: object }} progress
 */
export async function saveRecipeProgress(recipe, progress) {
  return saveRecipe({ ...recipe, progress: { ...progress, pausedAt: Date.now() } })
}

/** Clears a recipe's progress snapshot (finished or restarted), keeping the recipe. */
export async function clearRecipeProgress(id) {
  const userId = await currentUserId()
  if (!userId) {
    writeLocal(readLocal().map((r) => (r.id === id ? { ...r, progress: null } : r)))
    return
  }

  const { error } = await supabase.from('recipes').update({ progress: null }).eq('id', id)
  if (error) throw new Error(`Couldn't update that recipe: ${error.message}`)
}

/**
 * Moves any on-device recipes into the signed-in account, then clears the
 * local copies.
 *
 * Runs on first authenticated load. Idempotent by construction: it upserts on
 * the recipe's existing id, so re-running can't duplicate rows, and it only
 * clears localStorage once the write has succeeded — a failed claim leaves the
 * recipes exactly where they were rather than dropping them.
 *
 * @returns {Promise<number>} how many recipes were claimed
 */
export async function claimLocalRecipes() {
  const userId = await currentUserId()
  if (!userId) return 0

  const local = readLocal()
  if (local.length === 0) return 0

  const rows = local.map((recipe) => ({
    ...toRow(recipe, userId),
    id: recipe.id ?? crypto.randomUUID(),
  }))

  const { error } = await supabase.from('recipes').upsert(rows)
  if (error) throw new Error(`Couldn't move your saved recipes across: ${error.message}`)

  writeLocal([])
  return rows.length
}

/** Whether this device has guest recipes waiting to be claimed. */
export function hasLocalRecipes() {
  return readLocal().length > 0
}
