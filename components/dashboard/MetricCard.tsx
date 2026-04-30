'use client'

// MetricCard — KPI card con soporte de gauge SVG circular
import type { ReactNode } from 'react'

interface Props {
  label: string
  value: string | number
  subtitle?: string
  color?: string
  gauge?: boolean     // muestra arco circular
  gaugeValue?: number // 0-100
  icon?: ReactNode
}

const RADIUS = 28
const CIRCUM = 2 * Math.PI * RADIUS

function GaugeArc({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value))
  const dash = (pct / 100) * CIRCUM
  const gap  = CIRCUM - dash
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={36} cy={36} r={RADIUS} fill="none" stroke="var(--border-default)" strokeWidth={5} />
      <circle
        cx={36} cy={36} r={RADIUS} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${gap}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text x={36} y={40} textAnchor="middle" fontSize={13} fontWeight={700}
        fill={color} fontFamily="var(--font-mono)">
        {pct.toFixed(0)}%
      </text>
    </svg>
  )
}

export function MetricCard({ label, value, subtitle, color, gauge, gaugeValue }: Props) {
  const c = color ?? 'var(--accent-primary)'
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '16px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>
        {label}
      </div>

      {gauge && gaugeValue !== undefined ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <GaugeArc value={gaugeValue} color={c} />
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
              {value}
            </div>
            {subtitle && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{subtitle}</div>}
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>
            {value}
          </div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{subtitle}</div>}
        </>
      )}
    </div>
  )
}

export default MetricCard
