import { useRef, useState, useEffect } from 'react'

interface EssayInputProps {
  value: string
  onTextChange: (val: string) => void
  onPhotoCapture: (blob: Blob) => void
  disabled: boolean
}

export default function EssayInput({ value, onTextChange, onPhotoCapture, disabled }: EssayInputProps) {
  const [mode, setMode] = useState<'text' | 'camera'>('text')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
    onPhotoCapture(file)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setMode('text')}
          style={{
            flex: 1,
            padding: '10px',
            border: `2px solid ${mode === 'text' ? '#6366f1' : '#d1d5db'}`,
            borderRadius: 8,
            background: mode === 'text' ? '#eef2ff' : '#fff',
            color: mode === 'text' ? '#4338ca' : '#374151',
            fontWeight: mode === 'text' ? 600 : 400,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          텍스트 입력
        </button>
        <button
          onClick={() => setMode('camera')}
          style={{
            flex: 1,
            padding: '10px',
            border: `2px solid ${mode === 'camera' ? '#6366f1' : '#d1d5db'}`,
            borderRadius: 8,
            background: mode === 'camera' ? '#eef2ff' : '#fff',
            color: mode === 'camera' ? '#4338ca' : '#374151',
            fontWeight: mode === 'camera' ? 600 : 400,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          카메라 촬영
        </button>
      </div>

      {mode === 'text' ? (
        <textarea
          value={value}
          onChange={e => onTextChange(e.target.value)}
          disabled={disabled}
          placeholder="서술형 답안을 입력하세요"
          rows={5}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '12px 16px',
            fontSize: 16,
            border: '2px solid #d1d5db',
            borderRadius: 12,
            outline: 'none',
            resize: 'vertical',
            background: disabled ? '#f9fafb' : '#fff',
            color: '#111827',
            fontFamily: 'inherit',
            lineHeight: 1.6,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#6366f1' }}
          onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db' }}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          {photoPreview ? (
            <>
              <img
                src={photoPreview}
                alt="촬영된 답안"
                style={{ width: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'contain', background: '#f3f4f6' }}
              />
              <button
                onClick={() => {
                  if (photoPreview) URL.revokeObjectURL(photoPreview)
                  setPhotoPreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                disabled={disabled}
                style={{
                  padding: '8px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  background: '#fff',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                다시 찍기
              </button>
            </>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              style={{
                width: '100%',
                padding: '24px',
                border: '2px dashed #d1d5db',
                borderRadius: 12,
                background: '#f9fafb',
                color: '#6b7280',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 32 }}>📷</span>
              <span>카메라로 답안 촬영</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
