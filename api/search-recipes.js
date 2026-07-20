const SPOONACULAR_BASE = 'https://api.spoonacular.com'

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

  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (!query) {
    res.status(400).json({ error: 'Missing "q" query parameter' })
    return
  }

  try {
    const url = new URL(`${SPOONACULAR_BASE}/recipes/complexSearch`)
    url.searchParams.set('apiKey', apiKey)
    url.searchParams.set('query', query)
    url.searchParams.set('number', '10')
    url.searchParams.set('addRecipeInformation', 'true')

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) throw new Error(`Spoonacular responded with ${response.status}`)
    const data = await response.json()

    const results = (data.results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      image: r.image ?? null,
      readyInMinutes: r.readyInMinutes ?? null,
      servings: r.servings ?? null,
    }))

    res.status(200).json({ results })
  } catch (e) {
    res.status(502).json({ error: `Could not search recipes: ${e.message}` })
  }
}
