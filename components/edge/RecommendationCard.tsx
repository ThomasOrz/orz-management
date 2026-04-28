import type { EdgeRecommendation } from '@/lib/edge-engine'

const TYPE_CONFIG: Record<EdgeRecommendation['type'], { color: string; label: string; icon: string }> = {
  foco:   { color: 'var(--profit)',         label: 'Foco',    icon: '▲' },
  evitar: { color: 'var(--loss)',           label: 'Evitar',  icon: '✕' },
  mejorar:{ color: 'var(--neutral)',        label: 'Revisar', icon: '↻' },
  neutro: { color: 'var(--text-secondary)', label: 'Neutro',  icon: '·' },
}

interface Props {
  rec: EdgeRecommendation
}

export function RecommendationCard({ rec }: Props) {
  const { color, label, icon } = TYPE_CONFIG[rec.type]
  return (
    <div style={{
      borderLeft: `3px solid ${color}`,
      background: 'var(--bg-surface)',
      border: `1px solid var(--border-subtle)`,
      borderLeftColor: color,
      borderRadius: 'var(--radius-sm)',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '2px 8px', borderRadius: 'var(--radius-full)',
          color, background: `${color}18`, border: `1px solid ${color}33`,
        }}>
          {icon} {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
          {rec.dimension}: {rec.label}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
          n={rec.n} · WR {rec.win_rate.toFixed(1)}% · {rec.avg_r >= 0 ? '+' : ''}{rec.avg_r.toFixed(2)}R
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {rec.mensaje}
      </p>
    </div>
  )
}

export default RecommendationCard
