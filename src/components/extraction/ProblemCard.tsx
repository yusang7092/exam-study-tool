import { useState, useEffect } from 'react'
import type { Problem } from '@/types/index'
import AnswerTypeSelector from './AnswerTypeSelector'
import MCQAnswerInput from './MCQAnswerInput'

interface Props {
  problem: Problem
  onUpdate: (updates: Partial<Pick<Problem, 'question_text' | 'answer_type' | 'correct_answer' | 'options'>>) => void | Promise<void>
  onDelete: () => void
}

export default function ProblemCard({ problem, onUpdate, onDelete }: Props) {
  const [questionText, setQuestionText] = useState(problem.question_text ?? '')
  const [options, setOptions] = useState<string[]>(
    problem.options ?? ['①', '②', '③', '④', '⑤']
  )
  const [localAnswer, setLocalAnswer] = useState(problem.correct_answer ?? '')

  useEffect(() => setLocalAnswer(problem.correct_answer ?? ''), [problem.correct_answer])

  const handleQuestionBlur = () => {
    if (questionText !== problem.question_text) {
      onUpdate({ question_text: questionText })
    }
  }

  const handleOptionChange = (index: number, val: string) => {
    const updated = options.map((o, i) => (i === index ? val : o))
    setOptions(updated)
  }

  const handleOptionBlur = () => {
    if (JSON.stringify(options) !== JSON.stringify(problem.options)) {
      onUpdate({ options })
    }
  }

  const handleAnswerTypeChange = (val: Problem['answer_type']) => {
    const updates: Partial<Pick<Problem, 'answer_type' | 'options' | 'correct_answer'>> = {
      answer_type: val,
      correct_answer: null,
    }
    if (val === 'mcq' && !problem.options) {
      updates.options = ['①', '②', '③', '④', '⑤']
      setOptions(['①', '②', '③', '④', '⑤'])
    }
    onUpdate(updates)
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    fontSize: 14,
    border: '1.5px solid #E5E7EB',
    borderRadius: 8,
    outline: 'none',
    color: '#1F2937',
    boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 12,
        border: '1.5px solid #E5E7EB',
        padding: '20px',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#6366F1',
            color: 'white',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {problem.sequence_num}
        </div>

        <button
          type="button"
          onClick={onDelete}
          title="문제 삭제"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9CA3AF',
            fontSize: 18,
            lineHeight: 1,
            padding: '2px 4px',
            borderRadius: 4,
          }}
          aria-label="문제 삭제"
        >
          ✕
        </button>
      </div>

      {/* Page image */}
      {problem.image_url && (
        <div
          style={{
            marginBottom: 14,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #E5E7EB',
            background: '#F9FAFB',
            maxHeight: 240,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={problem.image_url}
            alt={`문제 ${problem.sequence_num} 이미지`}
            style={{
              maxWidth: '100%',
              maxHeight: 240,
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      )}

      {/* Question text */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>문제</label>
        <textarea
          value={questionText}
          rows={3}
          placeholder="문제 텍스트를 입력하세요..."
          style={{
            ...inputBaseStyle,
            resize: 'vertical',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1.5,
          }}
          onChange={e => setQuestionText(e.target.value)}
          onFocus={e => { e.target.style.borderColor = '#6366F1' }}
          onBlur={e => {
            e.target.style.borderColor = '#E5E7EB'
            handleQuestionBlur()
          }}
        />
      </div>

      {/* Answer type */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>유형</label>
        <AnswerTypeSelector value={problem.answer_type} onChange={handleAnswerTypeChange} id={problem.id} />
      </div>

      {/* MCQ options + correct answer */}
      {problem.answer_type === 'mcq' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>보기</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 16,
                      width: 20,
                      textAlign: 'center',
                      flexShrink: 0,
                      color: '#6B7280',
                    }}
                  >
                    {['①', '②', '③', '④', '⑤'][i]}
                  </span>
                  <input
                    type="text"
                    value={opt}
                    placeholder={`${i + 1}번 보기`}
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      fontSize: 14,
                      border: '1.5px solid #E5E7EB',
                      borderRadius: 6,
                      outline: 'none',
                      color: '#1F2937',
                      boxSizing: 'border-box',
                    }}
                    onChange={e => handleOptionChange(i, e.target.value)}
                    onFocus={e => { e.target.style.borderColor = '#6366F1' }}
                    onBlur={e => {
                      e.target.style.borderColor = '#E5E7EB'
                      handleOptionBlur()
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <MCQAnswerInput
            value={problem.correct_answer}
            onChange={val => onUpdate({ correct_answer: val })}
          />
        </>
      )}

      {/* Short answer */}
      {problem.answer_type === 'short' && (
        <div>
          <label style={labelStyle}>정답</label>
          <input
            type="text"
            value={localAnswer}
            placeholder="정답을 입력하세요"
            style={inputBaseStyle}
            onChange={e => setLocalAnswer(e.target.value)}
            onFocus={e => { e.target.style.borderColor = '#6366F1' }}
            onBlur={e => {
              e.target.style.borderColor = '#E5E7EB'
              if (e.target.value !== problem.correct_answer) {
                void onUpdate({ correct_answer: e.target.value })
              }
            }}
          />
        </div>
      )}

      {/* Essay rubric */}
      {problem.answer_type === 'essay' && (
        <div>
          <label style={labelStyle}>채점 기준 / 모범 답안</label>
          <textarea
            value={localAnswer}
            rows={3}
            placeholder="채점 기준이나 모범 답안을 입력하세요..."
            style={{
              ...inputBaseStyle,
              resize: 'vertical',
              fontFamily: 'system-ui, sans-serif',
              lineHeight: 1.5,
            }}
            onChange={e => setLocalAnswer(e.target.value)}
            onFocus={e => { e.target.style.borderColor = '#6366F1' }}
            onBlur={e => {
              e.target.style.borderColor = '#E5E7EB'
              if (e.target.value !== problem.correct_answer) {
                void onUpdate({ correct_answer: e.target.value })
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
