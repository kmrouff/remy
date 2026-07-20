import { parseHTML } from 'linkedom'
import { Readability } from '@mozilla/readability'
import Anthropic from '@anthropic-ai/sdk'
import { RECIPE_SCHEMA } from '../lib/recipeSchema.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { url } = req.body ?? {}
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing "url" in request body' })
    return
  }

  let html
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RemyRecipeBot/1.0)' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error(`page responded with ${response.status}`)
    html = await response.text()
  } catch (e) {
    res.status(502).json({ error: `Could not fetch that page: ${e.message}` })
    return
  }

  let article
  try {
    const { document } = parseHTML(html, { location: new URL(url) })
    article = new Readability(document).parse()
    if (!article?.textContent?.trim()) throw new Error('no readable article content found')
  } catch (e) {
    res.status(422).json({ error: `Could not read a recipe from that page: ${e.message}` })
    return
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools: [
        {
          name: 'extract_recipe',
          description: 'Extract structured recipe data from page content',
          input_schema: RECIPE_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'extract_recipe' },
      messages: [
        {
          role: 'user',
          content:
            `Extract the recipe from this page content. Split each ingredient into item/quantity/unit where possible, and write each step as one clear imperative instruction.\n\n` +
            `Page title: ${article.title}\n\n${article.textContent.slice(0, 15_000)}`,
        },
      ],
    })

    const toolUse = message.content.find((block) => block.type === 'tool_use')
    if (!toolUse) throw new Error('model did not return structured recipe data')

    res.status(200).json(toolUse.input)
  } catch (e) {
    res.status(500).json({ error: `Could not extract the recipe: ${e.message}` })
  }
}
