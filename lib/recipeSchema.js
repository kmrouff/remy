export const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'The name of the finished dish' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: {
            type: 'string',
            description: 'The ingredient itself, with no amount. e.g. "plain flour"',
          },
          // Required, and deliberately a string: someone shopping needs to hear
          // "how much?" answered for every line. Left optional the model dropped
          // it on most items, so the checklist rendered amount-less rows.
          quantity: {
            type: 'string',
            description:
              'How much, always filled in. Use the recipe\'s own wording, including vague amounts like "to taste" or "a pinch". Use "as needed" only if the recipe truly gives no amount.',
          },
          unit: {
            type: 'string',
            description: 'Unit of measure if there is one, e.g. "g", "cups", "tbsp". Omit for countable items.',
          },
        },
        required: ['item', 'quantity'],
      },
    },
    steps: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'ingredients', 'steps'],
}
