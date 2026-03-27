import { useRef, useState, useCallback, useEffect } from 'react'

interface FileDropZoneProps {
  onFileSelect: (file: File | null) => void
  accept?: string
}

const PDF_ICON = (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="32" height="40" rx="4" fill="#EF4444" />
    <rect x="8" y="4" width="32" height="40" rx="4" fill="url(#pdfGrad)" />
    <text x="24" y="30" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="system-ui">PDF</text>
    <defs>
      <linearGradient id="pdfGrad" x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#EF4444" />
        <stop offset="1" stopColor="#B91C1C" />
      </linearGradient>
    </defs>
  </svg>
)

const MAX_SIZE_MB = 50
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export default function FileDropZone({ onFileSelect, accept = 'application/pdf,image/*' }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  // Clean up object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const handleFile = useCallback(
    (file: File | null) => {
      setFileError(null)

      if (!file) {
        setSelectedFile(null)
        onFileSelect(null)
        if (preview) URL.revokeObjectURL(preview)
        setPreview(null)
        return
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError('PDF 또는 이미지 파일만 업로드 가능합니다.')
        return
      }

      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setFileError(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`)
        return
      }

      setSelectedFile(file)
      onFileSelect(file)

      if (file.type.startsWith('image/')) {
        if (preview) URL.revokeObjectURL(preview)
        setPreview(URL.createObjectURL(file))
      } else {
        if (preview) URL.revokeObjectURL(preview)
        setPreview(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0] ?? null
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0] ?? null)
    },
    [handleFile]
  )

  const handleClear = useCallback(() => {
    handleFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [handleFile])

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (selectedFile) {
    return (
      <div>
        <div
          style={{
            border: '2px solid #6366F1',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: '#F5F3FF',
          }}
        >
          <div style={{ flexShrink: 0 }}>
            {preview ? (
              <img
                src={preview}
                alt="preview"
                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }}
              />
            ) : (
              PDF_ICON
            )}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                fontWeight: 600,
                color: '#1F2937',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: 14,
              }}
            >
              {selectedFile.name}
            </div>
            <div style={{ color: '#6B7280', fontSize: 12, marginTop: 2 }}>
              {formatSize(selectedFile.size)}
            </div>
          </div>
          <button
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              fontSize: 20,
              padding: 4,
              lineHeight: 1,
              flexShrink: 0,
            }}
            aria-label="파일 제거"
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? '#6366F1' : '#D1D5DB'}`,
          borderRadius: 12,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#EEF2FF' : '#FAFAFA',
          transition: 'all 0.15s ease',
          userSelect: 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={handleChange}
        />
        <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
        <div style={{ fontWeight: 600, color: '#374151', fontSize: 15, marginBottom: 4 }}>
          파일을 여기에 끌어다 놓거나 탭하여 선택
        </div>
        <div style={{ color: '#9CA3AF', fontSize: 13 }}>PDF 또는 이미지 파일 지원</div>
      </div>
      {fileError && (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: '#DC2626',
            padding: '8px 12px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
          }}
        >
          {fileError}
        </div>
      )}
    </div>
  )
}
