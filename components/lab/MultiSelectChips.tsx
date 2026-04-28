'use client'

interface Props {
  options: string[]
  value: string[]
  onChange: (next: string[]) => void
  label?: string
}

export function MultiSelectChips({ options, value, onChange, label }: Props) {
  function toggle(opt: string) {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt))
    } else {
      onChange([...value, opt])
    }
  }

  return (
    <div>
      {label && (
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--text-tertiary)',
          marginBottom: 8,
        }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => {
          const selected = value.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                border: selected
                  ? '1px solid var(--accent-primary)'
                  : '1px solid var(--border-default)',
                background: selected
                  ? 'rgba(0,212,255,0.12)'
                  : 'var(--bg-surface)',
                color: selected
                  ? 'var(--accent-primary)'
                  : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MultiSelectChips
