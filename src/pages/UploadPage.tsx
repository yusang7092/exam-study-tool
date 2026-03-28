import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSubjects } from '@/hooks/useSubjects'
import { useProblemSets } from '@/hooks/useProblemSets'
import { useApiKeyStatus } from '@/hooks/useApiKeyStatus'
import { pdfToImages } from '@/lib/pdfToImages'
import { uploadPageImages, uploadSourceFile } from '@/lib/uploadHelpers'
import { extractProblemsFromBlob } from '@/lib/extractProblems'
import { supabase } from '@/lib/supabase'
import FileDropZone from '@/components/upload/FileDropZone'
import SubjectSelector from '@/components/upload/SubjectSelector'
import UploadProgress from '@/components/upload/UploadProgress'

type UploadStep = 1 | 2 | 3

export default function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { subjects } = useSubjects()
  const { createProblemSet, updateProblemSetStatus } = useProblemSets()

  const hasApiKey = useApiKeyStatus()
  const [showApiKeyPopup, setShowApiKeyPopup] = useState(false)

  const [persistedError, setPersistedError] = useState<string | null>(null)

  useEffect(() => {
    const e = localStorage.getItem('__upload_error')
    if (e) {
      localStorage.removeItem('__upload_error')
      setPersistedError(e)
    }
  }, [])

  const [file, setFile] = useState<File | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadAttempted, setUploadAttempted] = useState(false)
  const [step, setStep] = useState<UploadStep>(1)
  const [error, setError] = useState<string | null>(null)
  const [problemSetId, setProblemSetId] = useState<string | null>(null)
  const [progressText, setProgressText] = useState('')

  const isImage = file ? file.type.startsWith('image/') : false
  const isPDF = file ? file.type === 'application/pdf' : false
  const canSubmit = file !== null && title.trim().length > 0 && subjectId !== null && !isUploading

  const handleSubmit = async () => {
    if (!file || !user) return

    if (hasApiKey === false) {
      setShowApiKeyPopup(true)
      setTimeout(() => setShowApiKeyPopup(false), 4000)
      return
    }

    if (!subjectId) {
      setError('과목을 선택해주세요.')
      return
    }

    setIsUploading(true)
    setUploadAttempted(true)
    setError(null)
    setStep(1)

    let psId: string | null = null

    try {
      // Step 1: Create problem_set row + upload files
      const fileType: 'pdf' | 'image' = isPDF ? 'pdf' : 'image'
      const ps = await createProblemSet({
        subject_id: subjectId!,
        title,
        file_type: fileType,
      })

      if (!ps) throw new Error('문제 세트를 생성하지 못했습니다.')
      psId = ps.id
      setProblemSetId(ps.id)

      let pageBlobs: Blob[] = []

      try {
        if (isPDF) {
          pageBlobs = await pdfToImages(file)
          if (!pageBlobs.length) throw new Error('PDF에서 이미지를 추출하지 못했습니다.')
          await uploadPageImages(user.id, ps.id, pageBlobs)
        } else if (isImage) {
          pageBlobs = [file]
          await uploadPageImages(user.id, ps.id, pageBlobs)
        }
        await uploadSourceFile(user.id, ps.id, file)
      } catch (uploadErr) {
        const detail = uploadErr instanceof Error && uploadErr.message ? uploadErr.message : '파일 업로드 실패'
        throw new Error(`파일 업로드 오류: ${detail}`)
      }

      // Step 2: AI extraction — runs in browser (no Edge Function compute limits)
      await updateProblemSetStatus(ps.id, 'extracting')
      setStep(2)

      // Prevent screen sleep during long extraction
      let wakeLock: WakeLockSentinel | null = null
      try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen')
      } catch { /* not supported on this device */ }

      // Fetch user's Gemini API key
      const { data: settings } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('id', user.id)
        .single()
      const geminiKey = settings?.gemini_api_key
      if (!geminiKey) throw new Error('Gemini API 키가 설정되지 않았습니다. 설정 페이지에서 등록해주세요.')

      // Use the blobs already in memory from Step 1 (no re-render needed)
      const blobsForExtraction: Blob[] = pageBlobs

      const allDebugRaw: string[] = []
      let globalSeq = 1
      let problemCount = 0
      const total = blobsForExtraction.length

      for (let i = 0; i < total; i++) {
        const blob = blobsForExtraction[i]
        setProgressText(`페이지 ${i + 1} / ${total} 분석 중...`)

        // Rate limit: Gemini free tier = 15 RPM → 4s between requests
        if (i > 0) await new Promise(r => setTimeout(r, 4000))

        let result: { problems: import('@/lib/extractProblems').ExtractedProblem[]; rawText: string } | undefined
        let succeeded = false
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            result = await extractProblemsFromBlob(geminiKey, blob)
            succeeded = true
            break
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            if (msg.includes('429') && attempt < 2) {
              // Rate limited — wait 60s then retry
              setProgressText(`페이지 ${i + 1} / ${total} — 잠시 대기 중 (요청 한도)...`)
              await new Promise(r => setTimeout(r, 62000))
            } else {
              allDebugRaw.push(`page ${i + 1} error: ${msg.slice(0, 200)}`)
              break
            }
          }
        }
        if (!succeeded || !result!) continue

        allDebugRaw.push(result!.rawText.slice(0, 500))

        if (result!.problems.length === 0) continue

        const rows = result!.problems.map(p => ({
          problem_set_id: ps.id,
          user_id: user.id,
          subject_id: subjectId!,
          sequence_num: globalSeq++,
          question_text: p.question_text,
          answer_type: p.answer_type,
          options: p.answer_type === 'mcq' ? (p.options ?? null) : null,
          correct_answer: null,
          image_url: null,
          crop_rect: (p.bbox_y_min != null && p.bbox_x_min != null && p.bbox_y_max != null && p.bbox_x_max != null)
            ? { x: p.bbox_x_min / 1000, y: p.bbox_y_min / 1000, w: (p.bbox_x_max - p.bbox_x_min) / 1000, h: (p.bbox_y_max - p.bbox_y_min) / 1000 }
            : null,
          source_page: i + 1,
          explanation: null,
        }))

        const { error: insertErr } = await supabase.from('problems').insert(rows)
        if (insertErr) throw new Error(`문제 저장 실패: ${insertErr.message}`)
        problemCount += rows.length
      }

      if (problemCount === 0) {
        localStorage.setItem('__ai_debug_raw', JSON.stringify(allDebugRaw))
      }

      wakeLock?.release().catch(() => {})

      // Step 3: Done
      await updateProblemSetStatus(ps.id, 'reviewing')
      setStep(3)

      // Brief pause to show "완료!" before navigating
      await new Promise((r) => setTimeout(r, 800))

      navigate(
        `/review-extraction?setId=${ps.id}${problemCount === 0 ? '&note=no_problems' : ''}`
      )
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      const msg = raw || '알 수 없는 오류가 발생했습니다.'
      setError(msg)
      localStorage.setItem('__upload_error', msg)

      // Attempt to mark failed problem_set
      if (psId) {
        try {
          await updateProblemSetStatus(psId, 'failed')
        } catch {
          // ignore
        }
      }
    } finally {
      setIsUploading(false)
      setProgressText('')
    }
  }

  const handleRetry = async () => {
    if (problemSetId) {
      await supabase.from('problem_sets').delete().eq('id', problemSetId)
    }
    setProblemSetId(null)
    setStep(1)
    setError(null)
    setIsUploading(false)
    setUploadAttempted(false)
  }

  if (isUploading || uploadAttempted) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
          padding: '32px 20px',
          fontFamily: 'system-ui, sans-serif',
          color: '#374151',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: '#1F2937' }}>
          {step === 3 ? '업로드 완료!' : '업로드 중...'}
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
          {step === 3 ? '문제 추출이 완료되었습니다.' : '잠시만 기다려 주세요.'}
        </p>

        <UploadProgress step={step} error={error ?? undefined} progressText={progressText} />

        {error && (
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button
              onClick={() => { void handleRetry() }}
              style={{
                padding: '10px 20px',
                background: '#6366F1',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
            {problemSetId && (
              <button
                onClick={() => navigate(`/review-extraction?setId=${problemSetId}&note=upload_error`)}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#6366F1',
                  border: '1.5px solid #6366F1',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                검토 페이지로 이동
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: '32px 20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#374151',
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: '#1F2937' }}>
        문제 업로드
      </h1>
      <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 28 }}>
        시험지 PDF 또는 이미지를 업로드하면 AI가 문제를 자동으로 추출합니다.
      </p>

      {/* Persisted error from previous attempt */}
      {persistedError && !error && (
        <div style={{
          marginBottom: 20, padding: '14px 16px',
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 10, color: '#DC2626', fontSize: 14,
        }}>
          <strong>이전 시도 오류:</strong> {persistedError}
        </div>
      )}

      {/* Error display in form view */}
      {error && (
        <div style={{
          marginBottom: 20, padding: '14px 16px',
          background: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 10, color: '#DC2626', fontSize: 14,
        }}>
          <strong>오류 발생:</strong> {error}
        </div>
      )}

      {/* File drop zone */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#374151' }}>
          파일 선택 <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <FileDropZone onFileSelect={setFile} />
      </div>

      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <label
          htmlFor="title"
          style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#374151' }}
        >
          제목 <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 2024 수능 수학 영역"
          maxLength={100}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            border: '1.5px solid #D1D5DB',
            borderRadius: 8,
            outline: 'none',
            boxSizing: 'border-box',
            color: '#1F2937',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#6366F1' }}
          onBlur={(e) => { e.target.style.borderColor = '#D1D5DB' }}
        />
      </div>

      {/* Subject selector */}
      <div style={{ marginBottom: 32 }}>
        <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#374151' }}>
          과목 <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <SubjectSelector
          subjects={subjects}
          selectedId={subjectId}
          onSelect={setSubjectId}
        />
      </div>

      {/* Submit button */}
      <button
        onClick={() => { void handleSubmit() }}
        disabled={!canSubmit}
        style={{
          width: '100%',
          padding: '14px',
          background: canSubmit ? '#6366F1' : '#E5E7EB',
          color: canSubmit ? 'white' : '#9CA3AF',
          border: 'none',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          transition: 'background 0.15s',
        }}
      >
        문제 추출 시작
      </button>

      {!file && (
        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 12 }}>
          파일을 선택해주세요
        </p>
      )}
      {file && !title.trim() && (
        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 12 }}>
          제목을 입력해주세요
        </p>
      )}

      {/* API key missing bottom popup */}
      {showApiKeyPopup && (
        <div
          style={{
            position: 'fixed', bottom: 'calc(80px + env(safe-area-inset-bottom))',
            left: '50%', transform: 'translateX(-50%)',
            background: '#1f2937', color: '#fff',
            borderRadius: 16, padding: '16px 20px',
            width: 'calc(100% - 40px)', maxWidth: 480,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', gap: 12,
            zIndex: 999,
            animation: 'slideUp 0.25s ease',
          }}
        >
          <span style={{ fontSize: 24, flexShrink: 0 }}>🔑</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>AI API 키가 필요해요</div>
            <div style={{ fontSize: 13, color: '#d1d5db' }}>문제 추출을 위해 먼저 API 키를 등록해주세요</div>
          </div>
          <button
            onClick={() => navigate('/settings')}
            style={{
              background: '#6366f1', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 14px', fontSize: 13,
              fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            등록하기
          </button>
        </div>
      )}
    </div>
  )
}
