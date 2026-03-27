import { supabase } from '@/lib/supabase'

export async function uploadPageImages(
  userId: string,
  problemSetId: string,
  pageBlobs: Blob[]
): Promise<string[]> {
  const paths: string[] = []
  for (let i = 0; i < pageBlobs.length; i++) {
    const paddedNum = String(i + 1).padStart(3, '0')
    const path = `${userId}/${problemSetId}/page-${paddedNum}.jpg`
    const { error } = await supabase.storage.from('page-images').upload(path, pageBlobs[i], {
      contentType: 'image/jpeg',
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
