'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SessionReview {
  id: string
  fecha: string
  total_trades: number
  win_rate: number
  rr_promedio: number
  pnl: number
  errores: string[]
  patrones_positivos: string[]
  patrones_negativos: string[]
  accion_manana: string
}

interface Props {
  userId: string
  historial: SessionReview[]
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }

      const data = await res.json()
      const nueva: SessionReview = data.evaluacion ?? data
      setEvaluacion(nueva)
      setHistorial(prev => [nueva, ...prev.filter(h => h.fecha !== today)])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const displayed = evaluacion ?? historial.find(h => h.fecha === today) ?? null

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
          {/* Métricas */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Trades', value: displayed.total_trades },
              { label: 'Win Rate', value: `${displayed.win_rate ?? 0}%` },
              { label: 'R:R Prom.', value: (displayed.rr_promedio ?? 0).toFixed(2) },
              { label: 'P&L', value: displayed.pnl != null ? (displayed.pnl >= 0 ? `+${displayed.pnl}` : `${displayed.pnl}`) : '—' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl p-4 text-center"
                style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
              >
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Errores */}
          {displayed.errores && displayed.errores.length > 0 && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 text-red-400">Errores detectados</h3>
              <ul className="space-y-2">
                {displayed.errores.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-400" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Patrones */}
          <div className="grid grid-cols-2 gap-4">
            {displayed.patrones_positivos && displayed.patrones_positivos.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 text-green-400">Patrones positivos</h3>
                <ul className="space-y-2">
                  {displayed.patrones_positivos.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-green-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {displayed.patrones_negativos && displayed.patrones_negativos.length > 0 && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 text-yellow-400">Patrones negativos</h3>
                <ul className="space-y-2">
                  {displayed.patrones_negativos.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-yellow-400" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Acción mañana */}
          {displayed.accion_manana && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#1A9BD710', border: '1px solid #1A9BD730' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#1A9BD7' }}>
                Acción para mañana
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{displayed.accion_manana}</p>
            </div>
          )}
        </div>
      )}

      {!displayed && !loading && (
        <div
          className="rounded-2xl p-12 text-center mb-10"
          style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
        >
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
            {historial.filter(h => h.fecha !== today).map(h => (
              <li
                key={h.id}
                className="flex items-center justify-between py-3 px-4 rounded-xl"
                style={{ backgroundColor: '#0a0a0a', border: '1px solid #222' }}
              >
                <span className="text-sm text-gray-400">{h.fecha}</span>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>{h.total_trades} trades</span>
                  <span>{h.win_rate ?? 0}% WR</span>
                  <span>R:R {(h.rr_promedio ?? 0).toFixed(2)}</span>
                  <span className={h.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {h.pnl >= 0 ? '+' : ''}{h.pnl}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
