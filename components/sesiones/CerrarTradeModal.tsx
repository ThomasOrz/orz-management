'use client'

// ─────────────────────────────────────────────────────────────────────────────
// components/sesiones/CerrarTradeModal.tsx — Cierre de trade con cálculo live
// ─────────────────────────────────────────────────────────────────────────────
// Al confirmar el cierre ejecuta 3 operaciones:
//   1. UPDATE trades — exit_price, exit_time, pnl_net, r_multiple/r_obtenido,
//      won, resultado, trade_cerrado=true, fecha_cierre, hold_time_min
//   2. INSERT capital_movements — tipo='trade_pnl', monto=pnl_net
//   3. UPDATE trading_account — capital_actual += pnl_net
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { X, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import type { Trade, Resultado } from '@/types/trading'

interface Props {
  trade: Trade
  userId: string
  onClose: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtHold(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function fmtMoney(n: number, sign = true): string {
  const abs = Math.abs(n).toFixed(2)
  if (!sign) return `$${abs}`
  return `${n >= 0 ? '+' : '-'}$${abs}`
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const labelSt: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: 'var(--text-tertiary)',
  marginBottom: 5, display: 'block',
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', boxSizing: 'border-box',
  background: 'var(--bg-overlay)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
  outline: 'none',
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CerrarTradeModal({ trade, userId, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const now   = new Date()
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16)

  // Preferir columnas v2, caer a legacy
  const entryPrice  = trade.entry_price_v2  ?? trade.precio_entrada
  const entrySymbol = trade.symbol          ?? trade.activo
  const entrySide   = trade.side            ?? (trade.sesgo === 'Alcista' ? 'Long' : 'Short')
  const entrySize   = trade.size
  const entrySetup  = trade.setup           ?? trade.trigger ?? '—'
  const entryTimeStr = trade.entry_time     ?? trade.created_at

  // Stop loss real = distinto al precio entrada (el placeholder es igual)
  const hasRealSL = trade.stop_loss !== trade.precio_entrada && trade.stop_loss !== 0

  // ── Form state ─────────────────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [exitPriceStr, setExitPriceStr] = useState('')
  const [exitTime,   setExitTime]   = useState(localISO)
  const [riesgoUsd,  setRiesgoUsd]  = useState('')
  const [resultado,  setResultado]  = useState<Resultado | null>(null)
  const [notas,      setNotas]      = useState('')

  // ── Cálculos live ──────────────────────────────────────────────────────────
  const exitP   = parseFloat(exitPriceStr) || null
  const riesgoP = parseFloat(riesgoUsd)    || null

  let pnlNet:    number | null = null
  let riskUsd:   number | null = null
  let rMultiple: number | null = null
  let holdMin:   number | null = null

  // P&L neto
  if (exitP !== null && entrySize !== null && entrySize > 0) {
    const diff = entrySide === 'Long' ? exitP - entryPrice : entryPrice - exitP
    pnlNet = parseFloat((diff * entrySize).toFixed(2))
  }

  // Riesgo en USD → R múltiple
  if (hasRealSL && entrySize !== null && entrySize > 0) {
    riskUsd = parseFloat((Math.abs(entryPrice - trade.stop_loss) * entrySize).toFixed(2))
  } else if (riesgoP !== null && riesgoP > 0) {
    riskUsd = riesgoP
  }
  if (pnlNet !== null && riskUsd !== null && riskUsd > 0) {
    rMultiple = parseFloat((pnlNet / riskUsd).toFixed(2))
  }

  // Duración
  if (exitTime && entryTimeStr) {
    const ms = new Date(exitTime).getTime() - new Date(entryTimeStr).getTime()
    if (ms > 0) holdMin = Math.round(ms / 60000)
  }

  // Auto-setear resultado desde signo del P&L
  useEffect(() => {
    if (pnlNet === null) return
    if (pnlNet > 0.0001)  setResultado('Win')
    else if (pnlNet < -0.0001) setResultado('Loss')
    else                  setResultado('Breakeven')
  }, [pnlNet])

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!exitPriceStr)  { setError('Exit price es requerido'); return }
    if (!resultado)     { setError('Selecciona el resultado'); return }
    setError(null)
    setLoading(true)

    const exitPFinal    = parseFloat(exitPriceStr)
    const won           = resultado === 'Win' ? true : resultado === 'Loss' ? false : null
    const fechaCierre   = new Date(exitTime).toISOString().slice(0, 10)
    const notaFinal     = notas.trim() || trade.notas || null

    try {
      // 1. Actualizar trade
      const { error: updErr } = await supabase
        .from('trades')
        .update({
          // v2
          exit_price:    exitPFinal,
          exit_time:     new Date(exitTime).toISOString(),
          pnl_net:       pnlNet,
          pnl_gross:     pnlNet,
          pnl_usd:       pnlNet,
          r_multiple:    rMultiple,
          won,
          hold_time_min: holdMin,
          // legacy
          take_profit:   exitPFinal,
          r_obtenido:    rMultiple,
          resultado,
          trade_cerrado: true,
          fecha_cierre:  fechaCierre,
          notas:         notaFinal,
          notes:         notas.trim() || null,
        })
        .eq('id', trade.id)

      if (updErr) throw new Error(updErr.message)

      // 2. Registrar movimiento de capital (solo con P&L calculado)
      if (pnlNet !== null) {
        const { error: movErr } = await supabase
          .from('capital_movements')
          .insert({
            user_id:  userId,
            tipo:     'trade_pnl',
            monto:    pnlNet,
            trade_id: trade.id,
            fecha:    fechaCierre,
            nota:     `${entrySymbol} ${entrySide} — ${resultado}${rMultiple != null
              ? ` (${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R)` : ''}`,
          })
        if (movErr) console.error('[CerrarTrade] capital_movements error:', movErr)

        // 3. Actualizar capital_actual de la cuenta
        const { data: acc } = await supabase
          .from('trading_account')
          .select('capital_actual')
          .eq('user_id', userId)
          .maybeSingle()

        if (acc) {
          await supabase
            .from('trading_account')
            .update({ capital_actual: parseFloat((acc.capital_actual + pnlNet).toFixed(2)) })
            .eq('user_id', userId)
        }
      }

      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cerrar trade')
    } finally {
      setLoading(false)
    }
  }

  // ── Colores live ───────────────────────────────────────────────────────────
  const isWin  = pnlNet !== null && pnlNet > 0.0001
  const isLoss = pnlNet !== null && pnlNet < -0.0001
  const pnlColor = isWin ? 'var(--profit)' : isLoss ? 'var(--loss)' : 'var(--text-secondary)'
  const panelBg  = isWin
    ? 'rgba(0,230,118,0.07)' : isLoss
    ? 'rgba(255,59,74,0.07)' : 'var(--bg-overlay)'
  const panelBorder = isWin
    ? 'rgba(0,230,118,0.25)' : isLoss
    ? 'rgba(255,59,74,0.25)' : 'var(--border-subtle)'

  const sideColor = entrySide === 'Long' ? 'var(--profit)' : 'var(--loss)'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: '20px 24px 16px',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                {entrySymbol}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 9px',
                borderRadius: 'var(--radius-full)',
                color: sideColor,
                background: isWin || (!isWin && !isLoss && entrySide === 'Long') ? 'rgba(0,230,118,0.1)' : 'rgba(255,59,74,0.1)',
                border: `1px solid ${sideColor}33`,
              }}>
                {entrySide === 'Long' ? '↑' : '↓'} {entrySide}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{entrySetup}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>
              Abierto {fmtDate(entryTimeStr)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-tertiary)', padding: 4,
              display: 'flex', alignItems: 'center',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Resumen de entrada ───────────────────────────────────────────── */}
        <div style={{
          margin: '14px 24px 0',
          padding: '11px 16px',
          background: 'var(--bg-overlay)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', gap: 24, flexWrap: 'wrap',
        }}>
          {([
            { label: 'Entry',  value: entryPrice.toFixed(entrySymbol === 'XAUUSD' ? 2 : 1) },
            { label: 'Size',   value: entrySize != null ? `${entrySize} lotes` : '—' },
            { label: 'Stop',   value: hasRealSL ? trade.stop_loss.toFixed(2) : '—' },
            ...(hasRealSL && riskUsd != null
              ? [{ label: 'Riesgo', value: `$${riskUsd.toFixed(0)}` }]
              : []),
          ] as { label: string; value: string }[]).map(({ label, value }) => (
            <div key={label}>
              <span style={{ ...labelSt, marginBottom: 1 }}>{label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* ── Panel P&L live ────────────────────────────────────────────────── */}
        {exitP !== null && (
          <div style={{
            margin: '10px 24px 0',
            padding: '14px 16px',
            background: panelBg,
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${panelBorder}`,
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                {
                  label: 'P&L neto',
                  value: pnlNet !== null ? fmtMoney(pnlNet) : '—',
                  color: pnlColor,
                },
                {
                  label: 'R múltiple',
                  value: rMultiple !== null
                    ? `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R`
                    : riskUsd === null ? 'Ingresa riesgo' : '—',
                  color: rMultiple !== null ? pnlColor : 'var(--text-tertiary)',
                },
                {
                  label: 'Duración',
                  value: holdMin !== null ? fmtHold(holdMin) : '—',
                  color: 'var(--text-secondary)',
                },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <span style={{ ...labelSt, marginBottom: 2 }}>{label}</span>
                  <span style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Formulario ────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Exit price + time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelSt}>Exit Price *</label>
                <input
                  type="number"
                  step="0.001"
                  placeholder={entrySymbol === 'XAUUSD' ? '2345.00' : '19800'}
                  value={exitPriceStr}
                  onChange={e => setExitPriceStr(e.target.value)}
                  style={inputSt}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label style={labelSt}>Exit Time</label>
                <input
                  type="datetime-local"
                  value={exitTime}
                  onChange={e => setExitTime(e.target.value)}
                  style={inputSt}
                />
              </div>
            </div>

            {/* Riesgo (solo si no hay SL real) */}
            {!hasRealSL && (
              <div>
                <label style={labelSt}>
                  Riesgo inicial ($){' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, opacity: 0.65 }}>
                    — opcional, para calcular R
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 50.00"
                  value={riesgoUsd}
                  onChange={e => setRiesgoUsd(e.target.value)}
                  style={{ ...inputSt, maxWidth: 180 }}
                />
              </div>
            )}

            {/* Resultado */}
            <div>
              <label style={labelSt}>Resultado</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Win', 'Loss', 'Breakeven'] as Resultado[]).map(r => {
                  const sel = resultado === r
                  const col = r === 'Win' ? 'var(--profit)' : r === 'Loss' ? 'var(--loss)' : 'var(--neutral)'
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setResultado(r)}
                      style={{
                        padding: '7px 18px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${sel ? col : 'var(--border-subtle)'}`,
                        background: sel ? `${col}18` : 'transparent',
                        color: sel ? col : 'var(--text-tertiary)',
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {r === 'Breakeven' ? 'B/E' : r}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notas del cierre */}
            <div>
              <label style={labelSt}>Notas del cierre</label>
              <textarea
                placeholder="¿Saliste según el plan? ¿Qué pasó con el precio? Lección aprendida…"
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={3}
                style={{
                  ...inputSt,
                  resize: 'vertical', minHeight: 68, lineHeight: 1.5,
                  fontFamily: 'var(--font-family)',
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '9px 13px',
                background: 'var(--loss-bg)',
                border: '1px solid var(--loss)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--loss)',
                fontSize: 12,
              }}>
                {error}
              </div>
            )}

            {/* Acciones */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
              <Button type="button" variant="ghost" size="md" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                icon={<Zap size={13} />}
              >
                Cerrar Trade
              </Button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}
