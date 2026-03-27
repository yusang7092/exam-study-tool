interface ShortAnswerInputProps {
  value: string
  onChange: (val: string) => void
  disabled: boolean
  placeholder?: string
  onSubmit?: () => void
}

export default function ShortAnswerInput({
  value,
  onChange,
  disabled,
  placeholder = '답을 입력하세요',
  onSubmit,
}: ShortAnswerInputProps) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      onKeyDown={e => {
        if (e.key === 'Enter' && onSubmit) onSubmit()
      }}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        padding: '14px 16px',
        fontSize: 18,
        border: '2px solid #d1d5db',
        borderRadius: 12,
        outline: 'none',
        background: disabled ? '#f9fafb' : '#fff',
        color: '#111827',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s ease',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = '#6366f1' }}
      onBlur={e => { e.currentTarget.style.borderColor = '#d1d5db' }}
    />
  )
}
