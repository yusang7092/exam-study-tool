import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

export async function pdfToImages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  const blobs: Blob[] = []
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 2.0 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      page.cleanup()

      // Enhance contrast for better AI OCR accuracy
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d = imageData.data
      for (let i = 0; i < d.length; i += 4) {
        // Contrast enhancement: factor 1.2, brightness slight boost
        d[i]   = Math.min(255, Math.max(0, (d[i]   - 128) * 1.2 + 128 + 5))
        d[i+1] = Math.min(255, Math.max(0, (d[i+1] - 128) * 1.2 + 128 + 5))
        d[i+2] = Math.min(255, Math.max(0, (d[i+2] - 128) * 1.2 + 128 + 5))
      }
      ctx.putImageData(imageData, 0, 0)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', 0.85)
      })
      // Release GPU buffer immediately after blob is captured
      canvas.width = 0
      canvas.height = 0
      blobs.push(blob)
      onProgress?.(i, pdf.numPages)
    }
  } finally {
    await pdf.destroy()
  }
  return blobs
}

export async function getPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  const count = pdf.numPages
  await pdf.destroy()
  return count
}
