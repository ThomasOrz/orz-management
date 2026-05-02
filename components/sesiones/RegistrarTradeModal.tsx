'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Strategy } from '@/types/strategy'

interface Props {
  userId: string
  strategies: Strategy[]
  onClose: () => void
}

const SYMBOLS  = ['XAUUSD', 'NAS100', 'EURUSD', 'BTCUSD', 'Otro']
const SETUPS   = ['T1 (V85+V50)', 'T2 (V85)', 'T3 (V85+EMAs)', 'Acumulación', 'V85', 'V50', 'Custom']
const EMOJIS   = ['😰', '😐', '🙂', '😊', '🔥']  // 1-5

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
  color: 'var(--text-tertiary)', marginBottom: 5, display: 'block',
}

const rowStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
}

export function RegistrarTradeModal({ userId, strategies, onClose }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const now = new Date()
  const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  const [loading, setLoading]   = useState(false)
  const [error,   setError]     = useState<string | null>(null)

  // Form state
  const [symbol,      setSymbol]      = useState('XAUUSD')
  const [symbolCustom,setSymbolCustom]= useState('')
  const [side,        setSide]        = useState<'Long' | 'Short'>('Long')
  const [entryPrice,  setEntryPrice]  = useState('')
  const [stopLoss,    setStopLoss]    = useState('')
  const [exitPrice,   setExitPrice]   = useState('')
  const [size,        setSize]        = useState('')
  const [entryTime,   setEntryTime]   = useState(localISO)
  const [exitTime,    setExitTime]    = useState('')
  const [setup,       setSetup]       = useState('T1 (V85+V50)')
  const [strategyId,  setStrategyId]  = useState('')
  const [emotionPre,  setEmotionPre]  = useState(3)
  const [confidence,  setConfidence]  = useState(3)
  const [followedPlan,setFollowedPlan]= useState<boolean | null>(null)
  const [notes,       setNotes]       = useState('')
  const [screenshot,  setScreenshot]  = useState<File | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!entryPrice) { setError('Entry price es requerido'); return }

    setLoading(true)
    try {
      const finalSymbol = symbol === 'Otro' ? symbolCustom : symbol
      const entryP = parseFloat(entryPrice)
      const slP    = stopLoss ? parseFloat(stopLoss) : null
      const exitP  = exitPrice ? parseFloat(exitPrice) : null
      const sz     = size ? parseFloat(size) : null

      // Compute derived fields
      let pnlNet: number | null = null
      let rMultiple: number | null = null
      let won: boolean | null = null
      let holdMin: number | null = null

      if (exitP !== null && sz !== null) {
        const diff = side === 'Long' ? exitP - entryP : entryP - exitP
        pnlNet = parseFloat((diff * sz).toFixed(2))
        won = pnlNet > 0
        // R múltiple a partir del stop loss real
        if (slP !== null && Math.abs(entryP - slP) > 0) {
          const riskUsd = Math.abs(entryP - slP) * sz
          rMultiple = parseFloat((pnlNet / riskUsd).toFixed(2))
        }
      }

      if (exitTime && entryTime) {
        const ms = new Date(exitTime).getTime() - new Date(entryTime).getTime()
        holdMin = Math.round(ms / 60000)
      }

      // Upload screenshot if present
      let screenshotUrl: string | null = null
      if (screenshot) {
        const path = `${userId}/${Date.now()}_${screenshot.name}`
        const { error: upErr } = await supabase.storage
          .from('trade-screenshots')
          .upload(path, screenshot)
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('trade-screenshots').getPublicUrl(path)
          screenshotUrl = urlData.publicUrl
        }
      }

      const { error: insErr } = await supabase.from('trades').insert({
        user_id:       userId,
        // v2 columns
        symbol:        finalSymbol,
        side,
        entry_price_v2: entryP,
        exit_price:    exitP,
        size:          sz,
        entry_time:    new Date(entryTime).toISOString(),
        exit_time:     exitTime ? new Date(exitTime).toISOString() : null,
        pnl_net:       pnlNet,
        r_multiple:    rMultiple,
        won,
        hold_time_min: holdMin,
        setup,
        strategy_id:   strategyId || null,
        emotion_pre:   emotionPre,
        confidence,
        followed_plan: followedPlan,
        notes:         notes || null,
        screenshot_url: screenshotUrl,
        broker:        'manual',
        // legacy columns (mapped for backwards compat)
        activo:        (finalSymbol === 'XAUUSD' || finalSymbol === 'NAS100') ? finalSymbol as 'XAUUSD' | 'NAS100' : 'XAUUSD',
        sesion:        'Nueva York',
        sesgo:         side === 'Long' ? 'Alcista' : 'Bajista',
        zona_diario:   'Media',
        tipo_vela:     'V85',
        trigger:       setup as 'T1 (V85+V50)' | 'T2 (V85)' | 'T3 (V85+EMAs)' | 'Acumulación',
        precio_entrada: entryP,
        stop_loss:     slP ?? entryP,   // real SL si fue ingresado, placeholder si no
        take_profit:   exitP ?? entryP,
        resultado:     won === true ? 'Win' : won === false ? 'Loss' : null,
        r_obtenido:    rMultiple,
        siguio_reglas: followedPlan,
        notas:         notes || null,
        trade_cerrado: exitP !== null,
        pnl_usd:       pnlNet,
      })

      if (insErr) throw new Error(insErr.message)
      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 640,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Registrar Trade
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Símbolo + Side */}
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Símbolo</label>
              <select value={symbol} onChange={e => setSymbol(e.target.value)}
                className="input-pro" style={{ width: '100%' }}>
                {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {symbol === 'Otro' && (
                <Input value={symbolCustom} onChange={e => setSymbolCustom(e.target.value)}
                  placeholder="Ej: GBPUSD" style={{ marginTop: 6 }} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Side</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['Long', 'Short'] as const).map(s => (
                  <button key={s} type="button" onClick={() => setSide(s)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                    background: side === s ? (s === 'Long' ? 'rgba(0,230,118,0.15)' : 'rgba(255,59,74,0.15)') : 'var(--bg-elevated)',
                    border: side === s ? `1px solid ${s === 'Long' ? 'var(--profit)' : 'var(--loss)'}` : '1px solid var(--border-subtle)',
                    color: side === s ? (s === 'Long' ? 'var(--profit)' : 'var(--loss)') : 'var(--text-secondary)',
                  }}>
                    {s === 'Long' ? '↑ Long' : '↓ Short'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Entry / Stop Loss / Exit price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Entry Price *</label>
              <Input type="number" step="any" value={entryPrice} onChange={e => setEntryPrice(e.target.value)}
                placeholder="2345.00" required />
            </div>
            <div>
              <label style={labelStyle}>Stop Loss</label>
              <Input type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)}
                placeholder="2338.00" />
            </div>
            <div>
              <label style={labelStyle}>Exit Price</label>
              <Input type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)}
                placeholder="2360.00" />
            </div>
          </div>

          {/* Size + Hold */}
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Size (lotes)</label>
              <Input type="number" step="any" value={size} onChange={e => setSize(e.target.value)} placeholder="0.1" />
            </div>
            <div>
              <label style={labelStyle}>Entry Time</label>
              <Input type="datetime-local" value={entryTime} onChange={e => setEntryTime(e.target.value)} />
            </div>
          </div>

          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Exit Time</label>
              <Input type="datetime-local" value={exitTime} onChange={e => setExitTime(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Setup</label>
              <select value={setup} onChange={e => setSetup(e.target.value)}
                className="input-pro" style={{ width: '100%' }}>
                {SETUPS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Strategy */}
          {strategies.length > 0 && (
            <div>
              <label style={labelStyle}>Estrategia</label>
              <select value={strategyId} onChange={e => setStrategyId(e.target.value)}
                className="input-pro" style={{ width: '100%' }}>
                <option value="">Sin estrategia</option>
                {strategies.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
              </select>
            </div>
          )}

          {/* Emotional state */}
          <div style={rowStyle}>
            <div>
              <label style={labelStyle}>Estado emocional pre (1-5)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setEmotionPre(n)} style={{
                    flex: 1, padding: '6px 0', fontSize: 16, cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    background: emotionPre === n ? 'var(--accent-primary-bg)' : 'var(--bg-elevated)',
                    border: emotionPre === n ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  }}>
                    {EMOJIS[n - 1]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Confianza (1-5)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setConfidence(n)} style={{
                    flex: 1, padding: '6px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    background: confidence === n ? 'var(--accent-primary-bg)' : 'var(--bg-elevated)',
                    border: confidence === n ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    color: confidence === n ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Followed plan */}
          <div>
            <label style={labelStyle}>¿Siguió el plan?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([['Sí', true], ['No', false], ['N/A', null]] as const).map(([label, val]) => (
                <button key={label} type="button"
                  onClick={() => setFollowedPlan(val as boolean | null)}
                  style={{
                    padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    background: followedPlan === val ? 'var(--accent-primary-bg)' : 'var(--bg-elevated)',
                    border: followedPlan === val ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    color: followedPlan === val ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Contexto del mercado, aprendizajes, errores…"
              rows={3}
              className="input-pro"
              style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-family)', lineHeight: 1.5 }}
            />
          </div>

          {/* Screenshot */}
          <div>
            <label style={labelStyle}>Screenshot (opcional)</label>
            <input type="file" accept="image/*"
              onChange={e => setScreenshot(e.target.files?.[0] ?? null)}
              style={{ fontSize: 12, color: 'var(--text-secondary)' }}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--loss-bg)', border: '1px solid var(--loss)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--loss)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <Button type="button" variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</Button>
            <Button type="submit" variant="primary" loading={loading} style={{ flex: 2 }}>
              Guardar trade
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegistrarTradeModal
