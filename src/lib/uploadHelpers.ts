import { supabase } from '@/lib/supabase'

export async function uploadPageImages(
  userId: string,
  problemSetId: string,
  pageBlobs: Blob[]
): Promise<string[]> {
  const urls: string[] = []

  for (let i = 0; i < pageBlobs.length; i++) {
    const paddedNum = String(i + 1).padStart(3, '0')
    const path = `${userId}/${problemSetId}/page-${paddedNum}.jpg`

    const { error } = await supabase.storage
      .from('page-images')
      .upload(path, pageBlobs[i], { contentType: 'image/jpeg', upsert: true })

    if (error) throw new Error(`Failed to upload page ${i + 1}: ${error.message}`)

    const { data: signedData, error: signedError } = await supabase.storage
      .from('page-images')
      .createSignedUrl(path, 60 * 60 * 24 * 365)

    if (signedError || !signedData?.signedUrl) {
      throw new Error(`Failed to get signed URL for page ${i + 1}: ${signedError?.message}`)
    }

    urls.push(signedData.signedUrl)
  }

  return urls
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
