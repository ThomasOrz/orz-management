'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Los campos pueden venir como objetos desde Supabase — usar unknown
interface SessionReview {
  id: string
  fecha: string
  [key: string]: unknown
}

interface Props {
  userId: string
  historial: SessionReview[]
}

/** Convierte cualquier valor a número o null */
function toNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? null : n }
  return null
}

/** Convierte cualquier valor a string legible */
function toStr(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Convierte cualquier valor a array de strings */
function toStrArr(v: unknown): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v.map(toStr)
  if (typeof v === 'string') return [v]
  return []
}

export default function EvaluacionClient({ userId, historial: initialHistorial }: Props) {
  const supabase = createClient()
  const [historial, setHistorial] = useState<SessionReview[]>(initialHistorial)
  const [evaluacion, setEvaluacion] = useState<SessionReview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  async function handleEvaluar() {
    setError(null)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesión activa')

      const res = await fetch(
        'https://ymosnytxyveedpsubdke.supabase.co/functions/v1/evaluate-session',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ fecha: today, user_id: userId }),
        }
      )

      const rawText = await res.text()
      console.log('[evaluacion] raw:', rawText.slice(0, 500))

      let data: Record<string, unknown>
      try { data = JSON.parse(rawText) } catch {
        throw new Error(`Respuesta inválida (${res.status}): ${rawText.slice(0, 200)}`)
      }

      if (!res.ok) throw new Error(String(data.error ?? data.message ?? `Error ${res.status}`))

      const nueva = (data.evaluacion ?? data) as SessionReview
      console.log('[evaluacion] parsed:', nueva)
      setEvaluacion(nueva)
      setHistorial(prev => [nueva, ...prev.filter(h => h.fecha !== today)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const displayed = evaluacion ?? historial.find(h => h.fecha === today) ?? null

  function renderMetricas(d: SessionReview) {
    const trades = toNum(d.total_trades) ?? '—'
    const wr = toNum(d.win_rate)
    const rr = toNum(d.rr_promedio)
    const pnl = toNum(d.pnl)

    const metricas = [
      { label: 'Trades', value: trades },
      { label: 'Win Rate', value: wr != null ? `${wr}%` : '—' },
      { label: 'R:R Prom.', value: rr != null ? rr.toFixed(2) : '—' },
      { label: 'P&L', value: pnl != null ? (pnl >= 0 ? `+${pnl}` : `${pnl}`) : '—' },
    ]

    return (
      <div className="grid grid-cols-4 gap-4">
        {metricas.map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{String(value)}</p>
          </div>
        ))}
      </div>
    )
  }

  function renderLista(items: string[], color: string) {
    return (
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            {item}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Evaluación</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{todayLabel}</p>
        </div>
        <button
          onClick={handleEvaluar}
          disabled={loading}
          className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-60 flex items-center gap-2"
          style={{ backgroundColor: '#1A9BD7' }}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Evaluando...
            </>
          ) : 'Evaluar sesión de hoy'}
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg text-red-400 text-sm" style={{ backgroundColor: '#dc262620' }}>
          {error}
        </div>
      )}

      {/* Evaluación de hoy */}
      {displayed && (
        <div className="space-y-5 mb-10">
          {renderMetricas(displayed)}

          {/* Errores */}
          {toStrArr(displayed.errores).length > 0 && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 text-red-400">Errores detectados</h3>
              {renderLista(toStrArr(displayed.errores), '#f87171')}
            </div>
          )}

          {/* Patrones */}
          <div className="grid grid-cols-2 gap-4">
            {toStrArr(displayed.patrones_positivos).length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 text-green-400">Patrones positivos</h3>
                {renderLista(toStrArr(displayed.patrones_positivos), '#4ade80')}
              </div>
            )}
            {toStrArr(displayed.patrones_negativos).length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 text-yellow-400">Patrones negativos</h3>
                {renderLista(toStrArr(displayed.patrones_negativos), '#fbbf24')}
              </div>
            )}
          </div>

          {/* Acción mañana */}
          {!!displayed.accion_manana && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#1A9BD710', border: '1px solid #1A9BD730' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#1A9BD7' }}>
                Acción para mañana
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{toStr(displayed.accion_manana)}</p>
            </div>
          )}
        </div>
      )}

      {!displayed && !loading && (
        <div className="rounded-2xl p-12 text-center mb-10"
          style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
          <p className="text-gray-600 text-sm">Aún no hay evaluación para hoy. Pulsa el botón para generarla.</p>
        </div>
      )}

      {/* Historial */}
      {historial.filter(h => h.fecha !== today).length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#1A9BD7' }}>
            Historial reciente
          </h3>
          <ul className="space-y-3">
            {historial.filter(h => h.fecha !== today).map(h => {
              const pnl = toNum(h.pnl)
              const rr = toNum(h.rr_promedio)
              const wr = toNum(h.win_rate)
              const trades = toNum(h.total_trades)
              return (
                <li key={h.id}
                  className="flex items-center justify-between py-3 px-4 rounded-xl"
                  style={{ backgroundColor: '#0a0a0a', border: '1px solid #222' }}>
                  <span className="text-sm text-gray-400">{String(h.fecha)}</span>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{trades ?? '—'} trades</span>
                    <span>{wr ?? '—'}% WR</span>
                    <span>R:R {rr != null ? rr.toFixed(2) : '—'}</span>
                    <span className={pnl != null && pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {pnl != null ? (pnl >= 0 ? `+${pnl}` : `${pnl}`) : '—'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
