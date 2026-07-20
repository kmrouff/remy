/**
 * @param {string} url
 * @returns {Promise<{title: string, ingredients: Array<{item: string, quantity?: string, unit?: string}>, steps: string[]}>}
 */
export async function extractRecipeFromUrl(url) {
  const response = await fetch('/api/extract-recipe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to extract recipe')
  }
  return data
}

/**
 * @param {string[]} dataUrls - base64 image data URLs (e.g. from resizeImageFile), one per page
 * @returns {Promise<{title: string, ingredients: Array<{item: string, quantity?: string, unit?: string}>, steps: string[]}>}
 */
export async function extractRecipeFromPhotos(dataUrls) {
  const response = await fetch('/api/extract-recipe-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: dataUrls }),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to extract recipe from photo')
  }
  return data
}

/**
 * @param {string} query
 * @returns {Promise<Array<{id: number, title: string, image: string|null}>>}
 */
export async function searchRecipes(query) {
  const response = await fetch(`/api/search-recipes?q=${encodeURIComponent(query)}`)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to search recipes')
  }
  return data.results
}

/**
 * @param {number} id - Spoonacular recipe id, from searchRecipes results
 * @returns {Promise<{title: string, ingredients: Array<{item: string, quantity?: string, unit?: string}>, steps: string[]}>}
 */
export async function getRecipeDetails(id) {
  const response = await fetch(`/api/recipe-details?id=${encodeURIComponent(id)}`)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || 'Failed to load recipe details')
  }
  return data
}
