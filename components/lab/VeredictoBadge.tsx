import type { SetupMetrics } from '@/types/lab'

type Veredicto = SetupMetrics['veredicto']

const CONFIG: Record<Veredicto, { label: string; color: string; bg: string; icon: string }> = {
  sin_data:           { label: 'Sin datos',            color: 'var(--text-tertiary)',  bg: 'rgba(255,255,255,0.04)', icon: '—' },
  insuficiente:       { label: 'Muestra insuficiente', color: 'var(--text-secondary)', bg: 'rgba(255,255,255,0.06)', icon: '◌' },
  tendencia_positiva: { label: 'Tendencia positiva',   color: 'var(--neutral)',        bg: 'rgba(251,191,36,0.1)',   icon: '↗' },
  tendencia_negativa: { label: 'Tendencia negativa',   color: 'var(--neutral)',        bg: 'rgba(251,191,36,0.1)',   icon: '↘' },
  confirmado_ganador: { label: 'Edge confirmado',       color: 'var(--profit)',         bg: 'rgba(0,230,118,0.12)',   icon: '✓' },
  confirmado_perdedor:{ label: 'Setup perdedor',        color: 'var(--loss)',           bg: 'rgba(255,59,74,0.12)',   icon: '✕' },
}

interface Props {
  veredicto: Veredicto
  n?: number
  size?: 'sm' | 'lg'
}

export function VeredictoBadge({ veredicto, n, size = 'sm' }: Props) {
  const { label, color, bg, icon } = CONFIG[veredicto]
  const isLarge = size === 'lg'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: isLarge ? 8 : 5,
      padding: isLarge ? '8px 16px' : '3px 10px',
      borderRadius: 'var(--radius-sm)',
      fontSize: isLarge ? 14 : 11,
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${color}33`,
    }}>
      <span style={{ fontSize: isLarge ? 16 : 12, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
      {n !== undefined && (
        <span style={{ fontSize: isLarge ? 11 : 10, fontWeight: 400, opacity: 0.7 }}>
          (n={n})
        </span>
      )}
    </span>
  )
}

export default VeredictoBadge
