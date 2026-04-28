import type { EdgeSegment } from '@/lib/edge-engine'
import { EdgeVeredictoBadge } from './VeredictoBadge'

interface Props {
  segments: EdgeSegment[]
  dimensionLabel: string
}

function fmt2(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2)
}

function rColor(n: number) {
  return n > 0 ? 'var(--profit)' : n < 0 ? 'var(--loss)' : 'var(--text-secondary)'
}

export function EdgeTable({ segments, dimensionLabel }: Props) {
  if (segments.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
        Sin datos suficientes para este análisis
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {[dimensionLabel, 'Trades', 'Win Rate', 'R prom', 'R total', 'Profit Factor', 'Veredicto'].map(h => (
              <th key={h} style={{
                padding: '10px 14px', textAlign: 'left',
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-tertiary)',
                whiteSpace: 'nowrap',
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {segments.map((s, i) => (
            <tr
              key={s.label}
              style={{ borderBottom: i < segments.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
            >
              <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {s.label}
              </td>
              <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {s.n_total}
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>
                  ({s.n_wins}W/{s.n_losses}L/{s.n_breakevens}BE)
                </span>
              </td>
              <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                color: s.win_rate >= 55 ? 'var(--profit)' : s.win_rate < 45 ? 'var(--loss)' : 'var(--text-secondary)' }}>
                {s.win_rate.toFixed(1)}%
              </td>
              <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: rColor(s.avg_r) }}>
                {fmt2(s.avg_r)}R
              </td>
              <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: rColor(s.total_r) }}>
                {fmt2(s.total_r)}R
              </td>
              <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {s.profit_factor !== null ? s.profit_factor.toFixed(2) : '—'}
              </td>
              <td style={{ padding: '10px 14px' }}>
                <EdgeVeredictoBadge veredicto={s.veredicto} n={s.n_total} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default EdgeTable
