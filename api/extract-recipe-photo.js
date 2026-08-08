import Anthropic from '@anthropic-ai/sdk'
import { RECIPE_SCHEMA } from '../lib/recipeSchema.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_IMAGES = 6

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { images } = req.body ?? {}
  if (!Array.isArray(images) || images.length === 0) {
    res.status(400).json({ error: 'Missing "images" (array of data URLs) in request body' })
    return
  }
  if (images.length > MAX_IMAGES) {
    res.status(400).json({ error: `Too many photos — send at most ${MAX_IMAGES}` })
    return
  }

  const imageBlocks = []
  for (const image of images) {
    const match = typeof image === 'string' && image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
    if (!match || !ALLOWED_MEDIA_TYPES.has(match[1])) {
      res.status(400).json({ error: 'Each image must be a base64 data URL (jpeg, png, webp, or gif)' })
      return
    }
    const [, mediaType, base64Data] = match
    imageBlocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } })
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools: [
        {
          name: 'extract_recipe',
          description: 'Extract structured recipe data from one or more photos of a recipe',
          input_schema: RECIPE_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'extract_recipe' },
      messages: [
        {
          role: 'user',
          content: [
            ...imageBlocks,
            {
              type: 'text',
              text:
                imageBlocks.length > 1
                  ? `Extract the recipe shown across these ${imageBlocks.length} photos (consecutive pages of the same cookbook, card, or screenshot — combine them into one recipe). Split each ingredient into item/quantity/unit, always filling in quantity even when the recipe is vague ("to taste", "a pinch"), and write each step as one clear imperative instruction.`
                  : 'Extract the recipe shown in this photo (a cookbook page, handwritten card, or screenshot). Split each ingredient into item/quantity/unit, always filling in quantity even when the recipe is vague ("to taste", "a pinch"), and write each step as one clear imperative instruction.',
            },
          ],
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
