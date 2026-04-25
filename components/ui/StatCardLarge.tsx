// ─────────────────────────────────────────────────────────────────────────
// components/ui/StatCardLarge.tsx — Stat premium con sparkline (Iter 3)
// ─────────────────────────────────────────────────────────────────────────
// Header (label + delta pill), value 32px, sparkline SVG, footer caption.
// ─────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'

export type StatLargeTrend = 'success' | 'danger' | 'info' | 'warning' | 'neutral'

interface StatCardLargeProps {
  label: string
  value: ReactNode
  delta?: ReactNode
  trend?: StatLargeTrend
  sparklineData?: number[]
  caption?: ReactNode
  rightSlot?: ReactNode
}

const trendColor: Record<StatLargeTrend, string> = {
  success: 'var(--profit)',
  danger:  'var(--loss)',
  info:    'var(--accent-primary)',
  warning: 'var(--neutral)',
  neutral: 'var(--text-tertiary)',
}

const trendBg: Record<StatLargeTrend, string> = {
  success: 'var(--profit-bg)',
  danger:  'var(--loss-bg)',
  info:    'var(--accent-primary-bg)',
  warning: 'var(--neutral-bg)',
  neutral: 'rgba(255,255,255,0.04)',
}

export function StatCardLarge({
  label, value, delta, trend = 'info', sparklineData, caption, rightSlot,
}: StatCardLargeProps) {
  const color = trendColor[trend]
  const bg = trendBg[trend]
  const showSpark = Array.isArray(sparklineData) && sparklineData.length >= 3

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minHeight: 200,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: '#888', fontSize: 12, fontWeight: 500 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {delta != null && delta !== '' && (
            <span style={{
              padding: '3px 9px',
              borderRadius: 999,
              background: bg,
              color,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              border: `0.5px solid ${color}33`,
            }}>
              {delta}
            </span>
          )}
          {rightSlot}
        </div>
      </div>

      {/* Value */}
      <div style={{
        fontSize: 32,
        fontWeight: 600,
        color: 'var(--text-primary)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        {value}
      </div>

      {/* Sparkline */}
      {showSpark && (
        <Sparkline data={sparklineData!} color={color} />
      )}

      {/* Caption */}
      {caption && (
        <div style={{ fontSize: 11, color: '#666', marginTop: showSpark ? 0 : 'auto' }}>
          {caption}
        </div>
      )}
    </div>
  )
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 100
  const h = 50
  const pad = 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0

  const points = data.map((v, i) => {
    const x = pad + i * stepX
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const path = `M ${points.join(' L ')}`
  const area = `${path} L ${(pad + (data.length - 1) * stepX).toFixed(2)},${h} L ${pad},${h} Z`

  // Gradient id único por color
  const gradId = `spark-grad-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={50}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} stroke="none" />
      <path d={path} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default StatCardLarge
