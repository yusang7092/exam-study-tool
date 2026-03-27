import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSubjects } from '@/hooks/useSubjects'
import { useProblemSets } from '@/hooks/useProblemSets'
import { pdfToImages } from '@/lib/pdfToImages'
import { uploadPageImages, uploadSourceFile } from '@/lib/uploadHelpers'
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

  const [file, setFile] = useState<File | null>(null)
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [step, setStep] = useState<UploadStep>(1)
  const [error, setError] = useState<string | null>(null)
  const [problemSetId, setProblemSetId] = useState<string | null>(null)

  const isImage = file ? file.type.startsWith('image/') : false
  const isPDF = file ? file.type === 'application/pdf' : false
  const canSubmit = file !== null && title.trim().length > 0 && !isUploading

  const handleSubmit = async () => {
    if (!file || !user) return

    setIsUploading(true)
    setError(null)
    setStep(1)

    let psId: string | null = null

    try {
      // Step 1: Create problem_set row + upload files
      const fileType: 'pdf' | 'image' = isPDF ? 'pdf' : 'image'
      const ps = await createProblemSet({
        subject_id: subjectId,
        title,
        file_type: fileType,
      })

      if (!ps) throw new Error('문제 세트를 생성하지 못했습니다.')
      psId = ps.id
      setProblemSetId(ps.id)

      let pageImageUrls: string[] = []

      if (isPDF) {
        const blobs = await pdfToImages(file)
        pageImageUrls = await uploadPageImages(user.id, ps.id, blobs)
      } else if (isImage) {
        pageImageUrls = await uploadPageImages(user.id, ps.id, [file])
      }

      await uploadSourceFile(user.id, ps.id, file)

      // Step 2: AI extraction
      await updateProblemSetStatus(ps.id, 'extracting')
      setStep(2)

      let extractionFailed = false
      try {
        const { error: fnError } = await supabase.functions.invoke('extract-problems', {
          body: { problem_set_id: ps.id, page_image_urls: pageImageUrls, user_id: user.id },
        })
        if (fnError) {
          console.warn('Edge function error (non-blocking):', fnError)
          extractionFailed = true
        }
      } catch (fnEx) {
        console.warn('Edge function not available (non-blocking):', fnEx)
        extractionFailed = true
      }

      // Step 3: Done
      await updateProblemSetStatus(ps.id, 'reviewing')
      setStep(3)

      // Brief pause to show "완료!" before navigating
      await new Promise((r) => setTimeout(r, 800))

      navigate(
        `/review-extraction?setId=${ps.id}${extractionFailed ? '&note=extraction_pending' : ''}`
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'
      setError(msg)

      // Attempt to mark failed problem_set
      if (psId) {
        try {
          await updateProblemSetStatus(psId, 'reviewing')
        } catch {
          // ignore
        }
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setIsUploading(false)
    setStep(1)
    setProblemSetId(null)
  }

  if (isUploading || step === 3) {
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
          업로드 중...
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 24 }}>
          잠시만 기다려 주세요.
        </p>

        <UploadProgress step={step} error={error ?? undefined} />

        {error && (
          <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
            <button
              onClick={handleRetry}
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
          과목 (선택)
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
    </div>
  )
}
