import { useEffect, useState } from 'react'
import { getSignedUrl } from '@/lib/uploadHelpers'
import type { Problem } from '@/types/index'

interface ProblemDisplayProps {
  problem: Problem
}

export default function ProblemDisplay({ problem }: ProblemDisplayProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!problem.image_url) {
      setSignedUrl(null)
      return
    }
    let cancelled = false
    getSignedUrl('page-images', problem.image_url)
      .then(url => { if (!cancelled) setSignedUrl(url) })
      .catch(() => { if (!cancelled) setSignedUrl(null) })
    return () => { cancelled = true }
  }, [problem.image_url])

  const hasCrop = problem.crop_rect !== null
  const crop = problem.crop_rect

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      {signedUrl && (
        <div
          style={{
            marginBottom: 16,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#f3f4f6',
            position: 'relative',
          }}
        >
          {hasCrop && crop ? (
            <div
              style={{
                overflow: 'hidden',
                width: '100%',
                position: 'relative',
              }}
            >
              <img
                src={signedUrl}
                alt="문제 이미지"
                style={{
                  display: 'block',
                  width: `${100 / crop.w}%`,
                  marginLeft: `-${(crop.x / crop.w) * 100}%`,
                  marginTop: `-${(crop.y / crop.h) * 100}%`,
                  maxWidth: 'none',
                }}
              />
            </div>
          ) : (
            <img
              src={signedUrl}
              alt="문제 이미지"
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          )}
        </div>
      )}

      {problem.question_text && (
        <p
          style={{
            fontSize: 18,
            fontWeight: 500,
            lineHeight: 1.6,
            color: '#111827',
            margin: 0,
            whiteSpace: 'pre-wrap',
          }}
        >
          {problem.question_text}
        </p>
      )}

      {!signedUrl && !problem.question_text && (
        <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>문제 내용이 없습니다.</p>
      )}
    </div>
  )
}
