/**
 * Downscales an image file to a JPEG data URL before upload, so phone photos
 * (often several MB) stay well under the serverless function body-size limit
 * and don't burn extra vision tokens on resolution the model doesn't need.
 * @param {File} file
 * @returns {Promise<string>} data URL
 */
export function resizeImageFile(file, { maxDimension = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      let { width, height } = img
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not load the selected image'))
    }
    img.src = objectUrl
  })
}
