// ─────────────────────────────────────────────────────────────────────────
// components/ui/StatCard.tsx — Métrica grande con label, valor, delta
// ─────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from './Card'

export type StatVariant = 'default' | 'profit' | 'loss' | 'neutral' | 'info'
export type StatSize = 'sm' | 'md' | 'lg'
export type StatTrend = 'up' | 'down' | 'flat'

interface StatCardProps {
  label: string
  value: ReactNode
  delta?: ReactNode
  trend?: StatTrend
  icon?: ReactNode
  variant?: StatVariant
  size?: StatSize
  hint?: ReactNode
}

const variantClass: Record<StatVariant, string> = {
  default: '',
  profit: 'profit-text',
  loss: 'loss-text',
  neutral: 'neutral-text',
  info: 'info-text',
}

function TrendIcon({ trend }: { trend: StatTrend }) {
  if (trend === 'up') return <TrendingUp size={12} />
  if (trend === 'down') return <TrendingDown size={12} />
  return <Minus size={12} />
}

export function StatCard({
  label,
  value,
  delta,
  trend,
  icon,
  variant = 'default',
  size = 'md',
  hint,
}: StatCardProps) {
  const numberClass = size === 'lg'
    ? 'stat-number-xl'
    : size === 'sm'
    ? 'stat-number stat-number-sm'
    : 'stat-number'

  return (
    <Card>
      <div className="stat-row">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className={`${numberClass} ${variantClass[variant]}`}>
        {value}
      </div>
      {delta !== undefined && delta !== null && (
        <div className={`stat-delta ${trend ? `stat-delta-${trend}` : ''}`}>
          {trend && <TrendIcon trend={trend} />}
          <span>{delta}</span>
        </div>
      )}
      {hint && <div className="stat-hint">{hint}</div>}
    </Card>
  )
}

export default StatCard
