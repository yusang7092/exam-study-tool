import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface CropRect { x: number; y: number; w: number; h: number }

interface Props {
  userId: string
  problemSetId: string
  sourcePage: number
  cropRect: CropRect
}

export default function CroppedProblemImage({ userId, problemSetId, sourcePage, cropRect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const draw = async () => {
      setLoading(true)
      setError(false)
      try {
        // Try jpg first, then png/webp
        const ext = ['jpg', 'png', 'webp']
        let signedUrl: string | null = null
        for (const e of ext) {
          const path = `${userId}/${problemSetId}/page-${String(sourcePage).padStart(3, '0')}.${e}`
          const { data } = await supabase.storage.from('page-images').createSignedUrl(path, 300)
          if (data?.signedUrl) { signedUrl = data.signedUrl; break }
        }
        if (!signedUrl || cancelled) return

        const img = new Image()
        img.crossOrigin = 'anonymous'
        await new Promise<void>((res, rej) => {
          img.onload = () => res()
          img.onerror = () => rej(new Error('img load failed'))
          img.src = signedUrl!
        })
        if (cancelled) return

        const canvas = canvasRef.current
        if (!canvas) return

        const srcX = Math.round(cropRect.x * img.naturalWidth)
        const srcY = Math.round(cropRect.y * img.naturalHeight)
        const srcW = Math.round(cropRect.w * img.naturalWidth)
        const srcH = Math.round(cropRect.h * img.naturalHeight)

        // Clamp to image bounds
        const cX = Math.max(0, srcX)
        const cY = Math.max(0, srcY)
        const cW = Math.min(srcW, img.naturalWidth - cX)
        const cH = Math.min(srcH, img.naturalHeight - cY)

        if (cW <= 0 || cH <= 0) { setError(true); return }

        // Scale down for display (max width 600px)
        const scale = Math.min(1, 600 / cW)
        canvas.width = Math.round(cW * scale)
        canvas.height = Math.round(cH * scale)

        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, cX, cY, cW, cH, 0, 0, canvas.width, canvas.height)
        setLoading(false)
      } catch {
        if (!cancelled) setError(true)
        setLoading(false)
      }
    }

    void draw()
    return () => { cancelled = true }
  }, [userId, problemSetId, sourcePage, cropRect])

  if (error) return null

  return (
    <div style={{ marginTop: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f9fafb' }}>
      {loading && (
        <div style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>이미지 로딩 중...</div>
      )}
      <canvas
        ref={canvasRef}
        style={{ display: loading ? 'none' : 'block', width: '100%', height: 'auto' }}
      />
    </div>
  )
}
