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
  const cancelRef = useRef(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!url.trim() || status === 'loading') return
    cancelRef.current = false
    setStatus('loading')
    setError(null)
    try {
      const recipe = await extractRecipeFromUrl(url.trim())
      if (cancelRef.current) return
      onExtracted(recipe)
    } catch (e) {
      if (cancelRef.current) return
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
    cancelRef.current = false
    setStatus('loading')
    setError(null)
    try {
      const recipe = await extractRecipeFromPhotos(photos.map((p) => p.dataUrl))
      if (cancelRef.current) return
      onExtracted(recipe)
    } catch (e) {
      if (cancelRef.current) return
      setError(e.message)
      setStatus('error')
    }
  }

  function handleCancelLoading() {
    cancelRef.current = true
    setStatus('idle')
  }

  if (status === 'loading') {
    return (
      <div className="loading">
        <div className="loading__spinner">
          <span className="ring" />
          <span className="ring" />
          <span className="dot" />
        </div>
        <h2>Reading the recipe…</h2>
        <p>Pulling out the ingredients and steps. This usually takes a few seconds.</p>
        <div className="loading__card">
          <div>
            <div className="loading__card-label">Ingredients</div>
            <div className="loading__card-rows">
              <span className="skeleton" style={{ width: '80%' }} />
              <span className="skeleton" style={{ width: '65%' }} />
              <span className="skeleton" style={{ width: '72%' }} />
            </div>
          </div>
          <div>
            <div className="loading__card-label">Steps</div>
            <div className="loading__card-rows">
              <span className="skeleton" style={{ width: '95%' }} />
              <span className="skeleton" style={{ width: '88%' }} />
            </div>
          </div>
        </div>
        <button type="button" className="loading__cancel" onClick={handleCancelLoading}>
          Cancel
        </button>
      </div>
    )
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
      <button type="submit" className="recipe-input__submit">
        Extract recipe
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
          disabled={photos.length >= MAX_PHOTOS}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2l1.2-1.8A1 1 0 0 1 8.5 4.7h7a1 1 0 0 1 .8.5L17.5 7h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
            <circle cx="12" cy="12.3" r="3.3" />
          </svg>
          {photos.length === 0 ? 'Take photos' : `Take more (${photos.length}/${MAX_PHOTOS})`}
        </button>
        <button
          type="button"
          className="recipe-input__photo"
          onClick={() => galleryInputRef.current?.click()}
          disabled={photos.length >= MAX_PHOTOS}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
            <circle cx="8.5" cy="9.5" r="1.5" />
            <path d="M4 16.5l4.5-4 3.3 2.8 3-2.6L20 16" />
          </svg>
          Upload
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
        <button type="button" className="recipe-input__submit" onClick={handleExtractPhotos}>
          {`Extract recipe from ${photos.length} photo${photos.length > 1 ? 's' : ''}`}
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
