const SPOONACULAR_BASE = 'https://api.spoonacular.com'

function htmlToSteps(html) {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Spoonacular API key is not configured' })
    return
  }

  const id = typeof req.query.id === 'string' ? req.query.id.trim() : ''
  if (!id || !/^\d+$/.test(id)) {
    res.status(400).json({ error: 'Missing or invalid "id" query parameter' })
    return
  }

  try {
    const url = new URL(`${SPOONACULAR_BASE}/recipes/${id}/information`)
    url.searchParams.set('apiKey', apiKey)

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error(`Spoonacular responded with ${response.status}`)
    const data = await response.json()

    const ingredients = (data.extendedIngredients ?? []).map((ing) => ({
      item: ing.nameClean || ing.name || ing.original,
      quantity: ing.amount ? String(ing.amount) : '',
      unit: ing.unit ?? '',
    }))

    let steps = (data.analyzedInstructions?.[0]?.steps ?? []).map((s) => s.step)
    if (steps.length === 0 && data.instructions) {
      steps = htmlToSteps(data.instructions)
    }

    if (ingredients.length === 0 || steps.length === 0) {
      throw new Error('This recipe is missing structured ingredients or steps')
    }

    res.status(200).json({ title: data.title, ingredients, steps })
  } catch (e) {
    res.status(502).json({ error: `Could not load recipe details: ${e.message}` })
  }
}
