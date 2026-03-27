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
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}월 ${day}일`
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
    <div style={{
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        borderBottom: '1px solid #f3f4f6',
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 20,
          background: subjectColor + '22',
          color: subjectColor,
          fontSize: 12,
          fontWeight: 600,
        }}>
          <span style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: subjectColor,
          }} />
          {subjectName}
        </span>
        <span style={{
          padding: '3px 10px',
          borderRadius: 20,
          background: '#f3f4f6',
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 500,
        }}>
          {answerTypeLabel(problem.answer_type)}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
          {formatDate(attempt.attempted_at)}
        </span>
      </div>

      {/* Image */}
      {imageUrl && (
        <div style={{ padding: '10px 16px 0' }}>
          <img
            src={imageUrl}
            alt="문제 이미지"
            style={{
              maxWidth: '100%',
              maxHeight: 160,
              objectFit: 'contain',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}
          />
        </div>
      )}

      {/* Question text */}
      {problem.question_text && (
        <div style={{ padding: '12px 16px 0' }}>
          <p style={{
            fontSize: 14,
            color: '#374151',
            lineHeight: 1.6,
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: expanded ? undefined : 3,
            WebkitBoxOrient: 'vertical',
            overflow: expanded ? 'visible' : 'hidden',
          }}>
            {problem.question_text}
          </p>
          {hasLongText && (
            <button
              className="small"
              onClick={() => setExpanded(prev => !prev)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 0',
                marginTop: 2,
              }}
            >
              {expanded ? '접기' : '더 보기'}
            </button>
          )}
        </div>
      )}

      {/* Answers */}
      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          padding: '8px 12px',
          background: '#fef2f2',
          borderRadius: 8,
          fontSize: 13,
          color: '#dc2626',
        }}>
          <span style={{ fontWeight: 600 }}>내 답변: </span>
          {attempt.user_answer ?? '(미입력)'}
        </div>
        <div style={{
          padding: '8px 12px',
          background: '#f0fdf4',
          borderRadius: 8,
          fontSize: 13,
          color: '#16a34a',
        }}>
          <span style={{ fontWeight: 600 }}>정답: </span>
          {problem.correct_answer ?? '(정답 없음)'}
        </div>

        {/* AI feedback */}
        {attempt.ai_feedback && (
          <div style={{
            padding: '8px 12px',
            background: '#f9fafb',
            borderRadius: 8,
            fontSize: 12,
            color: '#6b7280',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}>
            {attempt.ai_feedback}
          </div>
        )}
      </div>
    </div>
  )
}
