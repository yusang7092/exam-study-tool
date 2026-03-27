import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

export async function pdfToImages(file: File): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  const blobs: Blob[] = []

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 2.0 })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height

    await page.render({ canvas, viewport }).promise

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b)
          else reject(new Error(`Failed to convert page ${pageNum} to blob`))
        },
        'image/jpeg',
        0.85
      )
    })

    blobs.push(blob)
    page.cleanup()
  }

  return blobs
}

export async function getPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise
  return pdf.numPages
}
