'use client'

import Link from 'next/link'
import type { LabSetup, SetupMetrics } from '@/types/lab'
import { EstadoBadge } from './EstadoBadge'
import { VeredictoBadge } from './VeredictoBadge'

interface Props {
  setup: LabSetup
  metrics: SetupMetrics
}

export function SetupCard({ setup, metrics }: Props) {
  return (
    <Link href={`/laboratorio/${setup.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px 18px',
        cursor: 'pointer',
        transition: 'border-color var(--transition-fast), background var(--transition-fast)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-elevated)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-subtle)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1.3,
            flex: 1,
          }}>
            {setup.nombre}
          </div>
          <EstadoBadge estado={setup.estado} />
        </div>

        {setup.descripcion && (
          <div style={{
            fontSize: 12,
            color: 'var(--text-tertiary)',
            lineHeight: 1.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {setup.descripcion}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16 }}>
          <Stat label="Trades" value={metrics.n_total === 0 ? '—' : String(metrics.n_total)} />
          <Stat
            label="Win rate"
            value={metrics.n_total === 0 ? '—' : `${metrics.win_rate.toFixed(0)}%`}
            color={metrics.n_total > 0 ? (metrics.win_rate >= 50 ? 'var(--profit)' : 'var(--loss)') : undefined}
          />
          <Stat
            label="R prom."
            value={metrics.n_total === 0 ? '—' : `${metrics.r_promedio >= 0 ? '+' : ''}${metrics.r_promedio.toFixed(2)}R`}
            color={metrics.n_total > 0 ? (metrics.r_promedio >= 0 ? 'var(--profit)' : 'var(--loss)') : undefined}
          />
        </div>

        <VeredictoBadge veredicto={metrics.veredicto} n={metrics.n_total > 0 ? metrics.n_total : undefined} />
      </div>
    </Link>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: color ?? 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}

export default SetupCard
