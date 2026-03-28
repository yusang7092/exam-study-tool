import { useState, useEffect } from 'react'
import type { Problem, Attempt } from '@/types/index'
import { getSignedUrl } from '@/lib/uploadHelpers'

interface WrongAnswerCardProps {
  problem: Problem
  attempt: Attempt
  subjectName: string
  subjectColor: string
}

const answerTypeLabel = (type: Problem['answer_type']) => {
  if (type === 'mcq') return '객관식'
  if (type === 'short') return '단답형'
  return '서술형'
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function WrongAnswerCard({ problem, attempt, subjectName, subjectColor }: WrongAnswerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!problem.image_url) return
    let cancelled = false
    getSignedUrl('page-images', problem.image_url)
      .then(url => { if (!cancelled) setImageUrl(url) })
      .catch(() => { if (!cancelled) setImageUrl(null) })
    return () => { cancelled = true }
  }, [problem.image_url])

  const hasLongText = problem.question_text && problem.question_text.length > 60

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: subjectColor }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>{subjectName}</span>
        </div>
        <span style={{ padding: '2px 8px', background: '#f5f5f5', color: '#888', borderRadius: 4, fontSize: 11, fontWeight: 400 }}>
          {answerTypeLabel(problem.answer_type)}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#bbb' }}>
          {formatDate(attempt.attempted_at)}
        </span>
      </div>

      {/* Image */}
      {imageUrl && (
        <div style={{ padding: '10px 14px 0' }}>
          <img src={imageUrl} alt="문제 이미지" style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 6, border: '1px solid #e8e8e8' }} />
        </div>
      )}

      {/* Question */}
      {problem.question_text && (
        <div style={{ padding: '11px 14px 0' }}>
          <p style={{ fontSize: 13, color: '#333', lineHeight: 1.6, margin: 0, display: '-webkit-box', WebkitLineClamp: expanded ? undefined : 3, WebkitBoxOrient: 'vertical', overflow: expanded ? 'visible' : 'hidden' }}>
            {problem.question_text}
          </p>
          {hasLongText && (
            <button
              onClick={() => setExpanded(prev => !prev)}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: 12, cursor: 'pointer', padding: '4px 0', marginTop: 2, fontFamily: 'inherit' }}
            >
              {expanded ? '접기' : '더 보기'}
            </button>
          )}
        </div>
      )}

      {/* Answers */}
      <div style={{ padding: '11px 14px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ padding: '7px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 5, fontSize: 12, color: '#dc2626' }}>
          <span style={{ fontWeight: 600 }}>내 답변 </span>{attempt.user_answer ?? '(미입력)'}
        </div>
        <div style={{ padding: '7px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 5, fontSize: 12, color: '#16a34a' }}>
          <span style={{ fontWeight: 600 }}>정답 </span>{problem.correct_answer ?? '(정답 없음)'}
        </div>
        {attempt.ai_feedback && (
          <div style={{ padding: '7px 10px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 5, fontSize: 12, color: '#666', fontStyle: 'italic', lineHeight: 1.5 }}>
            {attempt.ai_feedback}
          </div>
        )}
      </div>
    </div>
  )
}
