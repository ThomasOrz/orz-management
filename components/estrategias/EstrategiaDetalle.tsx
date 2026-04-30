'use client'

import type { Strategy, StrategyStats } from '@/types/strategy'
import { Card } from '@/components/ui/Card'

interface Props {
  strategy: Strategy
  stats: StrategyStats | null
  onClose: () => void
}

function MetaRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: color ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

export function EstrategiaDetalle({ strategy, stats, onClose }: Props) {
  const pnlColor = stats && stats.total_pnl > 0 ? 'var(--profit)' : stats && stats.total_pnl < 0 ? 'var(--loss)' : 'var(--text-secondary)'

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>{strategy.emoji}</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{strategy.name}</h2>
          </div>
          {strategy.description && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{strategy.description}</p>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 18, lineHeight: 1 }}
          aria-label="Cerrar detalle"
        >
          ✕
        </button>
      </div>

      {stats && stats.total_trades > 0 ? (
        <div>
          <MetaRow label="Total trades" value={String(stats.total_trades)} />
          <MetaRow label="Win Rate" value={`${stats.win_rate.toFixed(1)}%`}
            color={stats.win_rate >= 55 ? 'var(--profit)' : stats.win_rate < 45 ? 'var(--loss)' : 'var(--neutral)'} />
          <MetaRow label="Avg Win" value={stats.avg_win > 0 ? `$${stats.avg_win.toFixed(2)}` : '—'} color="var(--profit)" />
          <MetaRow label="Avg Loss" value={stats.avg_loss !== 0 ? `$${Math.abs(stats.avg_loss).toFixed(2)}` : '—'} color="var(--loss)" />
          <MetaRow label="Total P&L" value={`${stats.total_pnl >= 0 ? '+' : ''}$${stats.total_pnl.toFixed(2)}`} color={pnlColor} />
          <MetaRow label="Profit Factor" value={stats.profit_factor > 0 ? stats.profit_factor.toFixed(2) : '—'}
            color={stats.profit_factor >= 1.5 ? 'var(--profit)' : stats.profit_factor < 1 ? 'var(--loss)' : 'var(--text-primary)'} />
        </div>
      ) : (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
          Sin trades registrados con esta estrategia todavía.
        </div>
      )}
    </Card>
  )
}

export default EstrategiaDetalle
