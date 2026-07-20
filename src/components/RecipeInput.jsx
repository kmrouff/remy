import { useRef, useState } from 'react'
import { extractRecipeFromUrl, extractRecipeFromPhotos } from '../lib/recipes'
import { resizeImageFile } from '../lib/image'
import CameraCapture from './CameraCapture'
import RecipeSearch from './RecipeSearch'

const MAX_PHOTOS = 6

export default function RecipeInput({ onExtracted, onUseSample }) {
  const [url, setUrl] = useState('')
  const [photos, setPhotos] = useState([]) // [{ id, dataUrl }]
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const galleryInputRef = useRef(null)
  const nextPhotoId = useRef(0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim() || status === 'loading') return
    setStatus('loading')
    setError(null)
    try {
      const recipe = await extractRecipeFromUrl(url.trim())
      onExtracted(recipe)
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  function addPhotos(dataUrls) {
    setPhotos((prev) => [
      ...prev,
      ...dataUrls.slice(0, MAX_PHOTOS - prev.length).map((dataUrl) => ({ id: nextPhotoId.current++, dataUrl })),
    ])
  }

  async function handleGalleryChange(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow picking the same files again later
    if (files.length === 0) return
    setError(null)
    try {
      const dataUrls = await Promise.all(files.slice(0, MAX_PHOTOS - photos.length).map(resizeImageFile))
      addPhotos(dataUrls)
    } catch (e) {
      setError(e.message)
    }
  }

  function removePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleExtractPhotos() {
    if (photos.length === 0 || status === 'loading') return
    setStatus('loading')
    setError(null)
    try {
      const recipe = await extractRecipeFromPhotos(photos.map((p) => p.dataUrl))
      onExtracted(recipe)
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }

  if (showCamera) {
    return (
      <CameraCapture
        maxNewPhotos={MAX_PHOTOS - photos.length}
        onCancel={() => setShowCamera(false)}
        onDone={(dataUrls) => {
          addPhotos(dataUrls)
          setShowCamera(false)
        }}
      />
    )
  }

  if (showSearch) {
    return (
      <RecipeSearch
        onCancel={() => setShowSearch(false)}
        onSelect={(recipe) => {
          setShowSearch(false)
          onExtracted(recipe)
        }}
      />
    )
  }

  return (
    <form className="recipe-input" onSubmit={handleSubmit}>
      <input
        type="url"
        inputMode="url"
        placeholder="Paste a recipe URL…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="recipe-input__field"
        required
      />
      <button type="submit" className="recipe-input__submit" disabled={status === 'loading'}>
        {status === 'loading' ? 'Extracting…' : 'Extract recipe'}
      </button>

      <div className="recipe-input__divider">or</div>

      {photos.length > 0 && (
        <div className="recipe-input__thumbs">
          {photos.map((photo, i) => (
            <div key={photo.id} className="recipe-input__thumb">
              <img src={photo.dataUrl} alt={`Recipe page ${i + 1}`} />
              <button
                type="button"
                className="recipe-input__thumb-remove"
                onClick={() => removePhoto(photo.id)}
                aria-label={`Remove page ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="recipe-input__photo-actions">
        <button
          type="button"
          className="recipe-input__photo"
          onClick={() => setShowCamera(true)}
          disabled={status === 'loading' || photos.length >= MAX_PHOTOS}
        >
          {photos.length === 0 ? 'Take photos' : `Take more photos (${photos.length}/${MAX_PHOTOS})`}
        </button>
        <button
          type="button"
          className="recipe-input__photo"
          onClick={() => galleryInputRef.current?.click()}
          disabled={status === 'loading' || photos.length >= MAX_PHOTOS}
        >
          Upload from library
        </button>
      </div>
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="recipe-input__file"
        onChange={handleGalleryChange}
      />

      {photos.length > 0 && (
        <button
          type="button"
          className="recipe-input__submit"
          onClick={handleExtractPhotos}
          disabled={status === 'loading'}
        >
          {status === 'loading'
            ? 'Extracting…'
            : `Extract recipe from ${photos.length} photo${photos.length > 1 ? 's' : ''}`}
        </button>
      )}

      {error && <p className="recipe-input__error">{error}</p>}
      <button type="button" className="recipe-input__sample" onClick={() => setShowSearch(true)}>
        Or search recipes by name
      </button>
      <button type="button" className="recipe-input__sample" onClick={onUseSample}>
        Or try a sample recipe
      </button>
    </form>
  )
}
