import { supabase } from '@/lib/supabase'

/** Resize an image Blob so its longest side ≤ maxDim, output as JPEG at given quality */
export async function resizeImageBlob(blob: Blob, maxDim = 1600, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { naturalWidth: w, naturalHeight: h } = img
      const scale = Math.min(1, maxDim / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        b => b ? resolve(b) : reject(new Error('resizeImageBlob failed')),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

export async function uploadPageImages(
  userId: string,
  problemSetId: string,
  pageBlobs: Blob[]
): Promise<string[]> {
  const paths: string[] = []
  for (let i = 0; i < pageBlobs.length; i++) {
    const blob = pageBlobs[i]
    const mimeType = blob.type || 'image/jpeg'
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
    const paddedNum = String(i + 1).padStart(3, '0')
    const path = `${userId}/${problemSetId}/page-${paddedNum}.${ext}`
    const { error } = await supabase.storage.from('page-images').upload(path, blob, {
      contentType: mimeType,
      upsert: false,
    })
    if (error) throw new Error(`Failed to upload page ${i + 1}: ${error.message}`)
    paths.push(path)
  }
  return paths
}

export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data) throw new Error(`Failed to create signed URL: ${error?.message}`)
  return data.signedUrl
}

export async function uploadSourceFile(
  userId: string,
  problemSetId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${userId}/${problemSetId}/original.${ext}`

  const { error } = await supabase.storage
    .from('problem-sources')
    .upload(path, file, { upsert: true })

  if (error) throw new Error(`Failed to upload source file: ${error.message}`)

  return path
}
