// Images for People & Places are shrunk in the browser before upload: the server
// takes at most 2 MB, and a phone photo is often several times that. Redrawing
// the picture also drops its hidden metadata (camera, GPS position).

/** The longest side an uploaded image keeps; enough for the page and its preview. */
export const IMAGE_MAX_SIDE = 1600
/** Stay under the server's 2 MB limit, with room to spare. */
export const IMAGE_MAX_BYTES = 1_900_000

/** The size an image is drawn at: shrunk to fit `max` on its longest side, never enlarged. */
export function fitWithin(width: number, height: number, max = IMAGE_MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** The image redrawn at most IMAGE_MAX_SIDE wide or tall, as WebP (JPEG where WebP can't be made). */
export async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality))
  for (const quality of [0.85, 0.7, 0.5]) {
    let blob = await encode('image/webp', quality)
    if (blob?.type !== 'image/webp') blob = await encode('image/jpeg', quality)
    if (blob && blob.size <= IMAGE_MAX_BYTES) return blob
  }
  throw new Error('That image is too large, even shrunk.')
}
