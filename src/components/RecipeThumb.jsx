/**
 * Recipe thumbnail, with a designed fallback for the common no-image case.
 *
 * Only Spoonacular supplies an image — recipes extracted from a URL or a
 * photo have none, so the empty state is the norm, not the exception. It
 * keeps the tile (dropping it would ragged-edge the text in a mixed list)
 * and fills it with the title's initial in the display serif: quiet,
 * per-recipe, and legible as a deliberate choice rather than a gap.
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
