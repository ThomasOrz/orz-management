'use client'

import { useState } from 'react'
import { Plus, ExternalLink } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { ProfitCalendar } from '@/components/dashboard/ProfitCalendar'
import { RegistrarTradeModal } from '@/components/sesiones/RegistrarTradeModal'
import type { Trade } from '@/types/trading'
import type { Strategy } from '@/types/strategy'

interface Props {
  userId: string
  trades: Trade[]
  strategies: Strategy[]
}

type TabId = 'tabla' | 'calendario'

const TABS = [
  { id: 'tabla',      label: 'Tabla' },
  { id: 'calendario', label: 'Calendario' },
]

// Map legacy fields → display values
function getSymbol(t: Trade): string {
  return (t as Trade & { symbol?: string }).symbol ?? t.activo ?? '—'
}
function getSide(t: Trade): string {
  const s = (t as Trade & { side?: string }).side
  if (s) return s
  return t.sesgo === 'Alcista' ? 'Long' : t.sesgo === 'Bajista' ? 'Short' : '—'
}
function getPnl(t: Trade): number | null {
  const v = (t as Trade & { pnl_net?: number | null }).pnl_net
    ?? (t as Trade & { pnl_usd?: number | null }).pnl_usd
  return v ?? null
}
function getSetup(t: Trade): string {
  return (t as Trade & { setup?: string | null }).setup ?? t.trigger ?? '—'
}
function getEmoji(t: Trade): string {
  const e = (t as Trade & { emotion_pre?: number | null }).emotion_pre
  const map: Record<number, string> = { 1: '😰', 2: '😐', 3: '🙂', 4: '😊', 5: '🔥' }
  return e ? (map[e] ?? '—') : t.emocion ?? '—'
}

function ResultBadge({ resultado, won, pnl }: { resultado: string | null; won?: boolean | null; pnl?: number | null }) {
  const isWin = resultado === 'Win' || won === true || (pnl !== null && pnl !== undefined && pnl > 0)
  const isLoss = resultado === 'Loss' || won === false || (pnl !== null && pnl !== undefined && pnl < 0)
  const isBE  = resultado === 'Breakeven'

  const color = isWin ? 'var(--profit)' : isLoss ? 'var(--loss)' : isBE ? 'var(--neutral)' : 'var(--text-tertiary)'
  const bg    = isWin ? 'rgba(0,230,118,0.12)' : isLoss ? 'rgba(255,59,74,0.12)' : isBE ? 'rgba(251,191,36,0.12)' : 'transparent'
  const label = isWin ? 'Win' : isLoss ? 'Loss' : isBE ? 'BE' : resultado === null ? 'Abierto' : resultado

  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      color, background: bg, border: `1px solid ${color}33`,
    }}>
      {label}
    </span>
  )
}

export default function SesionesClient({ userId, trades, strategies }: Props) {
  const [tab, setTab] = useState<TabId>('tabla')
  const [showModal, setShowModal] = useState(false)

  // Calendar data from trades
  const byDay = new Map<string, { pnl: number; trades: number }>()
  for (const t of trades) {
    if (t.resultado === null) continue
    const d = t.created_at.slice(0, 10)
    const r = t.r_obtenido ?? 0
    const prev = byDay.get(d) ?? { pnl: 0, trades: 0 }
    byDay.set(d, { pnl: prev.pnl + r, trades: prev.trades + 1 })
  }
  const calData = Array.from(byDay.entries()).map(([date, { pnl, trades: cnt }]) => ({
    date, pnl: parseFloat(pnl.toFixed(2)), trades: cnt,
  }))

  return (
    <>
      <div className="page-content">
        <PageHeader
          title="Sesiones / Journal"
          subtitle={`${trades.length} trades en tu historial`}
          action={
            <Button
              variant="primary" size="sm" icon={<Plus size={14} />}
              onClick={() => setShowModal(true)}
            >
              Registrar trade
            </Button>
          }
        />

        <div style={{ marginBottom: 16 }}>
          <Tabs tabs={TABS} activeTab={tab} onChange={(id) => setTab(id as TabId)} />
        </div>

        {tab === 'tabla' && (
          <Card padding="none">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  {['Fecha', 'Símbolo', 'Setup', 'Side', 'Entry', 'Exit', 'P&L / R', 'Emoc.', 'Plan', 'Notas'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: 'left',
                      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--text-tertiary)',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                      No hay trades registrados todavía. ¡Registra tu primer trade!
                    </td>
                  </tr>
                )}
                {trades.map((t, i) => {
                  const pnl = getPnl(t)
                  const r   = t.r_obtenido
                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: i < trades.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(t.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--text-tertiary)' }}>
                          {new Date(t.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {getSymbol(t)}
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                        {getSetup(t)}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: getSide(t) === 'Long' ? 'var(--profit)' : 'var(--loss)',
                        }}>
                          {getSide(t) === 'Long' ? '↑' : '↓'} {getSide(t)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {t.precio_entrada?.toFixed(2) ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        {t.take_profit !== t.precio_entrada ? t.take_profit?.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <ResultBadge resultado={t.resultado} pnl={pnl} />
                        {r !== null && (
                          <span style={{
                            marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                            color: r >= 0 ? 'var(--profit)' : 'var(--loss)',
                          }}>
                            {r >= 0 ? '+' : ''}{r.toFixed(2)}R
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 14, textAlign: 'center' }}>
                        {getEmoji(t)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {t.siguio_reglas === true
                          ? <span style={{ color: 'var(--profit)', fontWeight: 700 }}>✓</span>
                          : t.siguio_reglas === false
                            ? <span style={{ color: 'var(--loss)', fontWeight: 700 }}>✕</span>
                            : <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)', maxWidth: 180 }}>
                        {t.notas ? (
                          <span title={t.notas}>
                            {t.notas.slice(0, 40)}{t.notas.length > 40 ? '…' : ''}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        )}

        {tab === 'calendario' && (
          <Card>
            <ProfitCalendar data={calData} />
          </Card>
        )}

        {/* Link to legacy sesion page */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <a href="/sesion" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
            <ExternalLink size={12} /> Vista clásica de sesión
          </a>
        </div>
      </div>

      {showModal && (
        <RegistrarTradeModal
          userId={userId}
          strategies={strategies}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
