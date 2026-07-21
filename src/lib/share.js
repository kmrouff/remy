import { APP_URL } from './config'

// Best-effort image attach — recipe images are remote (Spoonacular only;
// URL/photo extraction never set one), so the fetch can fail on CORS. That's
// fine: the share still goes through as text, just without the photo.
async function tryBuildImageFile(imageUrl) {
  if (!imageUrl) return null
  try {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    return new File([blob], 'recipe.jpg', { type: blob.type || 'image/jpeg' })
  } catch {
    return null
  }
}

async function share({ title, text, imageUrl }) {
  const file = await tryBuildImageFile(imageUrl)
  const payload = { title, text, url: APP_URL }
  if (file && navigator.canShare?.({ files: [file] })) {
    payload.files = [file]
  }

  if (navigator.share) {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled'
      // fall through to the clipboard fallback below
    }
  }

  try {
    await navigator.clipboard.writeText(`${text} ${APP_URL}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function shareRecipe(recipe) {
  return share({
    title: recipe.title,
    text: `Cooked ${recipe.title} with the assistance of Remy.`,
    imageUrl: recipe.image,
  })
}

export function shareApp() {
  return share({
    title: 'Remy',
    text: 'Remy — a hands-free cooking assistant. Talk to it while you cook or shop, no tapping needed.',
  })
}
