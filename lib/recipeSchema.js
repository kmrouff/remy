export const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          quantity: { type: 'string' },
          unit: { type: 'string' },
        },
        required: ['item'],
      },
    },
    steps: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['title', 'ingredients', 'steps'],
}
