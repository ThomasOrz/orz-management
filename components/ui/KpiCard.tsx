// ─────────────────────────────────────────────────────────────────────────
// components/ui/KpiCard.tsx — KPI compacto Bloomberg-style (Iter 3)
// ─────────────────────────────────────────────────────────────────────────
// Altura ~70px, label tracking-wide arriba, número mono grande + delta.
// Border-bottom de color según trend.
// ─────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'

export type KpiTrend = 'success' | 'danger' | 'info' | 'warning' | 'neutral'

interface KpiCardProps {
  label: string
  value: ReactNode
  delta?: ReactNode
  trend?: KpiTrend
}

const trendColor: Record<KpiTrend, string> = {
  success: 'var(--profit)',
  danger:  'var(--loss)',
  info:    'var(--accent-primary)',
  warning: 'var(--neutral)',
  neutral: 'var(--text-tertiary)',
}

export function KpiCard({ label, value, delta, trend = 'neutral' }: KpiCardProps) {
  const color = trendColor[trend]
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderBottom: `2px solid ${color}`,
      borderRadius: 'var(--radius-sm)',
      padding: '12px 14px',
      minHeight: 70,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
    }}>
      <div style={{
        fontSize: 9,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
        fontWeight: 600,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <span
          className="tabular-num"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 21,
            fontWeight: 600,
            color: 'var(--text-primary)',
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {delta != null && delta !== '' && (
          <span
            className="tabular-num"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              color,
              lineHeight: 1,
            }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}

export default KpiCard
