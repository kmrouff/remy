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
