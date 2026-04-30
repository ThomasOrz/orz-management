'use client'

import type { Strategy, StrategyStats } from '@/types/strategy'

interface Props {
  strategies: Strategy[]
  stats: StrategyStats[]
  onSelect?: (id: string) => void
  selectedId?: string | null
}

function fmt(n: number) {
  const abs = Math.abs(n)
  const s = abs >= 1000 ? `$${(abs / 1000).toFixed(1)}k` : `$${abs.toFixed(0)}`
  return n < 0 ? `-${s}` : s
}

function pctColor(n: number) {
  return n > 50 ? 'var(--profit)' : n < 40 ? 'var(--loss)' : 'var(--neutral)'
}

function rColor(n: number) {
  return n > 0 ? 'var(--profit)' : n < 0 ? 'var(--loss)' : 'var(--text-secondary)'
}

export function EstrategiasList({ strategies, stats, onSelect, selectedId }: Props) {
  // Find top stats for the 4 highlight cards
  const withStats = strategies.map(s => ({
    ...s,
    st: stats.find(x => x.strategy_id === s.id) ?? {
      strategy_id: s.id, total_trades: 0, wins: 0, losses: 0,
      win_rate: 0, avg_win: 0, avg_loss: 0, total_pnl: 0, profit_factor: 0,
    } satisfies StrategyStats,
  })).filter(x => x.st.total_trades > 0)

  const best      = [...withStats].sort((a, b) => b.st.total_pnl - a.st.total_pnl)[0]
  const worst     = [...withStats].sort((a, b) => a.st.total_pnl - b.st.total_pnl)[0]
  const mostActive= [...withStats].sort((a, b) => b.st.total_trades - a.st.total_trades)[0]
  const bestWR    = [...withStats].sort((a, b) => b.st.win_rate - a.st.win_rate)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 4 highlight cards */}
      {withStats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          <HighlightCard
            title="Best Performing"
            name={best?.name}
            emoji={best?.emoji}
            metric={best ? fmt(best.st.total_pnl) : '—'}
            sub="P&L total"
            color="var(--profit)"
          />
          <HighlightCard
            title="Least Performing"
            name={worst?.name}
            emoji={worst?.emoji}
            metric={worst ? fmt(worst.st.total_pnl) : '—'}
            sub="P&L total"
            color="var(--loss)"
          />
          <HighlightCard
            title="Most Active"
            name={mostActive?.name}
            emoji={mostActive?.emoji}
            metric={mostActive ? `${mostActive.st.total_trades} trades` : '—'}
            sub="operaciones"
            color="var(--accent-primary)"
          />
          <HighlightCard
            title="Best Win Rate"
            name={bestWR?.name}
            emoji={bestWR?.emoji}
            metric={bestWR ? `${bestWR.st.win_rate.toFixed(1)}%` : '—'}
            sub="win rate"
            color="var(--profit)"
          />
        </div>
      )}

      {/* Tabla principal */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
              {['Strategy', 'Trades', 'Win Rate', 'Avg Win', 'Avg Loss', 'Total P&L', 'Profit Factor'].map(h => (
                <th key={h} style={{
                  padding: '10px 14px', textAlign: 'left',
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: 'var(--text-tertiary)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strategies.map((s, i) => {
              const st = stats.find(x => x.strategy_id === s.id)
              const isSelected = selectedId === s.id
              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: i < strategies.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    cursor: onSelect ? 'pointer' : 'default',
                    background: isSelected ? 'var(--accent-primary-bg)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => onSelect?.(s.id)}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-elevated)' }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{s.emoji}</span>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>{s.name}</div>
                        {s.description && (
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>
                            {s.description.slice(0, 60)}{s.description.length > 60 ? '…' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {st?.total_trades ?? 0}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                    color: st ? pctColor(st.win_rate) : 'var(--text-tertiary)' }}>
                    {st ? `${st.win_rate.toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--profit)' }}>
                    {st && st.avg_win !== 0 ? fmt(st.avg_win) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--loss)' }}>
                    {st && st.avg_loss !== 0 ? fmt(Math.abs(st.avg_loss)) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                    color: st ? rColor(st.total_pnl) : 'var(--text-tertiary)' }}>
                    {st ? fmt(st.total_pnl) : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)',
                    color: st && st.profit_factor > 1 ? 'var(--profit)' : 'var(--text-secondary)' }}>
                    {st && st.profit_factor > 0 ? st.profit_factor.toFixed(2) : '—'}
                  </td>
                </tr>
              )
            })}
            {strategies.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  No hay estrategias configuradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HighlightCard({ title, name, emoji, metric, sub, color }: {
  title: string; name?: string; emoji?: string; metric: string; sub: string; color: string
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderTop: `2px solid ${color}`,
      borderRadius: 'var(--radius-sm)',
      padding: '14px',
    }}>
      <div style={{ fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 8 }}>
        {title}
      </div>
      {name ? (
        <>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{emoji}</span> {name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color }}>
            {metric}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Sin datos aún</div>
      )}
    </div>
  )
}

export default EstrategiasList
