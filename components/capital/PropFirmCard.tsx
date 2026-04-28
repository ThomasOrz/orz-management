interface Props {
  title: string
  value: string
  subtitle?: string
  progress?: number      // 0-100
  inverted?: boolean     // true = rojo cuando alto (límites)
  unit?: string
}

export function PropFirmCard({ title, value, subtitle, progress, inverted = false, unit }: Props) {
  const pct = Math.min(100, Math.max(0, progress ?? 0))

  let barColor = 'var(--accent-primary)'
  if (progress !== undefined) {
    if (inverted) {
      barColor = pct >= 100 ? 'var(--loss)' : pct >= 80 ? '#ff6b2b' : pct >= 60 ? 'var(--neutral)' : 'var(--profit)'
    } else {
      barColor = pct >= 100 ? 'var(--profit)' : pct >= 60 ? 'var(--accent-primary)' : 'var(--text-tertiary)'
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)',
      padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase',
        color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700,
        color: 'var(--text-primary)', lineHeight: 1, marginBottom: subtitle ? 4 : 0,
      }}>
        {value}
        {unit && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 3 }}>{unit}</span>}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 10 }}>
          {subtitle}
        </div>
      )}
      {progress !== undefined && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            height: 4, borderRadius: 2,
            background: 'var(--bg-elevated)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: barColor,
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: barColor, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>100%</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PropFirmCard
