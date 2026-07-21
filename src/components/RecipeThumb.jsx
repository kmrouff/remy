/**
 * Left-hand recipe thumbnail, for lists where the image leads the row.
 *
 * Used by search, whose results are Spoonacular-only and so effectively
 * always have an image; the initial is a rare-miss fallback that stops the
 * row collapsing. The library doesn't use this — its thumbnail sits on the
 * right precisely so it can be absent without disturbing anything.
 */
export default function RecipeThumb({ recipe, base }) {
  if (recipe.image) {
    return <img src={recipe.image} alt="" className={base} />
  }
  const initial = (recipe.title ?? '').trim().charAt(0).toUpperCase()
  return (
    <span className={`${base} ${base}--empty`} aria-hidden="true">
      {initial || '·'}
    </span>
  )
}
