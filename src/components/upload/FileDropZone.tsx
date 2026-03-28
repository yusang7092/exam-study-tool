import { useRef, useState, useCallback, useEffect } from 'react'

interface FileDropZoneProps {
  onFileSelect: (file: File | null) => void
  accept?: string
}

const MAX_SIZE_MB = 50
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

export default function FileDropZone({ onFileSelect, accept = 'application/pdf,image/*' }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
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

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0] ?? null
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] ?? null)
  }, [handleFile])

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
      <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 14, background: '#fff' }}>
        <div style={{ flexShrink: 0 }}>
          {preview ? (
            <img src={preview} alt="preview" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, border: '1px solid #e8e8e8' }} />
          ) : (
            <div style={{ width: 44, height: 44, background: '#f7f7f7', border: '1px solid #e0e0e0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: 0.5 }}>PDF</span>
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13 }}>
            {selectedFile.name}
          </div>
          <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
            {formatSize(selectedFile.size)}
          </div>
        </div>
        <button
          onClick={handleClear}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 16, padding: 4, lineHeight: 1, flexShrink: 0 }}
          aria-label="파일 제거"
        >
          ✕
        </button>
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
          border: `1px dashed ${dragging ? '#111' : '#d0d0d0'}`,
          borderRadius: 8,
          padding: '36px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#f7f7f7' : '#fafafa',
          transition: 'all 0.15s ease',
          userSelect: 'none',
        }}
      >
        <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleChange} />
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 12px' }}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <div style={{ fontWeight: 500, color: '#333', fontSize: 14, marginBottom: 4 }}>
          파일을 끌어다 놓거나 탭하여 선택
        </div>
        <div style={{ color: '#aaa', fontSize: 12 }}>PDF 또는 이미지</div>
      </div>
      {fileError && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#dc2626', padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
          {fileError}
        </div>
      )}
    </div>
  )
}
