import type { SetupEstado } from '@/types/lab'

const CONFIG: Record<SetupEstado, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Borrador',    color: 'var(--text-tertiary)',  bg: 'rgba(255,255,255,0.06)' },
  testing:   { label: 'En testing',  color: 'var(--accent-primary)', bg: 'rgba(0,212,255,0.1)' },
  validated: { label: 'Validado',    color: 'var(--profit)',         bg: 'rgba(0,230,118,0.1)' },
  discarded: { label: 'Descartado',  color: 'var(--loss)',           bg: 'rgba(255,59,74,0.1)' },
  paused:    { label: 'Pausado',     color: 'var(--neutral)',        bg: 'rgba(251,191,36,0.1)' },
}

interface Props {
  estado: SetupEstado
  size?: 'sm' | 'md'
}

export function EstadoBadge({ estado, size = 'sm' }: Props) {
  const { label, color, bg } = CONFIG[estado]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: size === 'md' ? '4px 10px' : '2px 8px',
      borderRadius: 'var(--radius-full)',
      fontSize: size === 'md' ? 12 : 10,
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color,
      background: bg,
      border: `1px solid ${color}33`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

export default EstadoBadge
