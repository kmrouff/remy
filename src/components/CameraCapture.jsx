import { useEffect, useRef, useState } from 'react'

/**
 * Full-screen live camera view for capturing multiple recipe pages in one
 * continuous session (open once, shoot repeatedly), instead of round-
 * tripping through the native camera app per photo.
 */
export default function CameraCapture({ onDone, onCancel, maxNewPhotos }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const nextId = useRef(0)
  const [photos, setPhotos] = useState([]) // [{ id, dataUrl }]
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          // continuous focus mode is a best-effort hint — ignored where the
          // browser doesn't support it (notably Safari/iOS), rather than
          // rejected, so it's safe to always ask for it.
          video: { facingMode: 'environment', advanced: [{ focusMode: 'continuous' }] },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setReady(true)
      } catch (e) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Camera access is required — please allow it in your browser settings and try again.'
            : e?.message || 'Could not access the camera.'
        )
      }
    }

    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function handleCapture() {
    const video = videoRef.current
    if (!video || photos.length >= maxNewPhotos) return

    const maxDimension = 1600
    let { videoWidth: width, videoHeight: height } = video
    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
    setPhotos((prev) => [...prev, { id: nextId.current++, dataUrl }])
  }

  function removePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  function handleDone() {
    stopStream()
    onDone(photos.map((p) => p.dataUrl))
  }

  function handleCancel() {
    stopStream()
    onCancel()
  }

  if (error) {
    return (
      <div className="camera-capture">
        <div className="camera-capture__error-screen">
          <p className="voice-session__error">{error}</p>
          <button type="button" className="voice-session__back" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="camera-capture">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} className="camera-capture__video" autoPlay playsInline muted />

      <div className="camera-capture__scrim-top" aria-hidden="true" />
      <div className="camera-capture__topbar">
        <button type="button" className="camera-capture__close" onClick={handleCancel} aria-label="Cancel">
          ×
        </button>
        <span className="camera-capture__hint">Snap each page</span>
        <span style={{ width: 40, flexShrink: 0 }} aria-hidden="true" />
      </div>

      <div className="camera-capture__guides" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <div className="camera-capture__dock">
        {photos.length > 0 && (
          <div className="camera-capture__thumbs">
            {photos.map((photo, i) => (
              <div key={photo.id} className="camera-capture__thumb">
                <img src={photo.dataUrl} alt={`Page ${i + 1}`} />
                <button
                  type="button"
                  className="camera-capture__thumb-remove"
                  onClick={() => removePhoto(photo.id)}
                  aria-label={`Remove page ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="camera-capture__controls">
          <span className="camera-capture__counter">
            {photos.length} / {maxNewPhotos}
          </span>
          <button
            type="button"
            className="camera-capture__shutter"
            onClick={handleCapture}
            disabled={!ready || photos.length >= maxNewPhotos}
            aria-label="Capture photo"
          />
          <div style={{ width: 64, display: 'flex', justifyContent: 'flex-end' }}>
            {photos.length > 0 && (
              <button type="button" className="camera-capture__done" onClick={handleDone} aria-label="Use these photos">
                ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
