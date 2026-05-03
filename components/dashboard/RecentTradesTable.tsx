'use client'

import type { Trade } from '@/types/trading'

interface Props {
  trades: Trade[]
  limit?: number
}

function getPnl(t: Trade): number | null {
  return t.pnl_net ?? t.pnl_usd ?? null
}

function getR(t: Trade): number | null {
  return t.r_obtenido ?? t.r_multiple ?? null
}

function getSymbol(t: Trade): string {
  return t.symbol ?? t.activo ?? '—'
}

function getSide(t: Trade): string {
  return t.side ?? (t.sesgo === 'Alcista' ? 'Long' : t.sesgo === 'Bajista' ? 'Short' : '—')
}

function getSetup(t: Trade): string {
  return t.setup ?? t.trigger ?? '—'
}

function getCloseDate(t: Trade): string {
  const iso = t.exit_time ?? t.fecha_cierre ?? t.created_at
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' })
}

export function RecentTradesTable({ trades, limit = 10 }: Props) {
  const closed = trades
    .filter(t => t.resultado !== null)
    .slice(0, limit)

  if (closed.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
        Sin trades cerrados recientes
      </div>
    )
  }

  const thSt: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'left',
    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: 'var(--text-tertiary)',
    whiteSpace: 'nowrap',
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Últimos trades
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <th style={thSt}>Fecha cierre</th>
            <th style={thSt}>Símbolo</th>
            <th style={thSt}>Side</th>
            <th style={thSt}>Setup</th>
            <th style={{ ...thSt, textAlign: 'right' }}>Net P&L</th>
            <th style={{ ...thSt, textAlign: 'right' }}>R</th>
            <th style={{ ...thSt, textAlign: 'center' }}>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {closed.map((t, i) => {
            const pnl = getPnl(t)
            const r   = getR(t)
            const side = getSide(t)
            const isWin  = t.resultado === 'Win'  || t.won === true
            const isLoss = t.resultado === 'Loss' || t.won === false
            const resBg    = isWin ? 'rgba(0,230,118,0.12)' : isLoss ? 'rgba(255,59,74,0.12)' : 'rgba(251,191,36,0.12)'
            const resColor = isWin ? 'var(--profit)' : isLoss ? 'var(--loss)' : 'var(--neutral)'
            const resLabel = isWin ? 'Win' : isLoss ? 'Loss' : 'B/E'

            return (
              <tr
                key={t.id}
                style={{ borderBottom: i < closed.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {getCloseDate(t)}
                </td>
                <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {getSymbol(t)}
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: side === 'Long' ? 'var(--profit)' : side === 'Short' ? 'var(--loss)' : 'var(--text-tertiary)',
                  }}>
                    {side === 'Long' ? '↑' : side === 'Short' ? '↓' : ''} {side}
                  </span>
                </td>
                <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', fontSize: 11 }}>
                  {getSetup(t)}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {pnl !== null ? (
                    <span style={{ color: pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 600 }}>
                      {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {r !== null ? (
                    <span style={{ color: r >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 600 }}>
                      {r >= 0 ? '+' : ''}{r.toFixed(2)}R
                    </span>
                  ) : '—'}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    color: resColor, background: resBg,
                    border: `1px solid ${resColor}33`,
                  }}>
                    {resLabel}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
