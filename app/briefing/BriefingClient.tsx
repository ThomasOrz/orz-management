'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Briefing {
  id: string
  date: string
  narrativa: string
  condicion: string
  sesgo_nas100: string
  sesgo_xauusd: string
  eventos_dia: string[]
  correlaciones: string
  zonas_clave: string
  plan_accion: string
  [key: string]: unknown
}

interface Props {
  initialBriefing: Briefing | null
  userId: string
}

const condicionColors: Record<string, { bg: string; text: string; label: string }> = {
  favorable: { bg: '#16a34a20', text: '#4ade80', label: 'Favorable' },
  neutral: { bg: '#ca8a0420', text: '#fbbf24', label: 'Neutral' },
  adverso: { bg: '#dc262620', text: '#f87171', label: 'Adverso' },
  mixto: { bg: '#7c3aed20', text: '#a78bfa', label: 'Mixto' },
}

export default function BriefingClient({ initialBriefing, userId }: Props) {
  const [briefing, setBriefing] = useState<Briefing | null>(initialBriefing)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  async function generarBriefing() {
    setLoading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesión activa')

      const response = await fetch(
        'https://ymosnytxyveedpsubdke.supabase.co/functions/v1/generate-briefing',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ user_id: userId }),
        }
      )

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${response.status}`)
      }

      const data = await response.json()
      setBriefing(data.briefing ?? data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const condicion = briefing?.condicion
    ? (condicionColors[briefing.condicion.toLowerCase()] ?? condicionColors.neutral)
    : null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Briefing Diario</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{today}</p>
        </div>
        {!briefing && (
          <button
            onClick={generarBriefing}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-60 flex items-center gap-2"
            style={{ backgroundColor: '#1A9BD7' }}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generar Briefing
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg text-red-400 text-sm" style={{ backgroundColor: '#dc262620' }}>
          {error}
        </div>
      )}

      {/* Sin briefing */}
      {!briefing && !loading && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
        >
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: '#1A9BD720' }}>
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#1A9BD7" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-white font-semibold mb-2">No hay briefing para hoy</p>
          <p className="text-gray-500 text-sm">Genera el briefing del día para ver el análisis de mercado.</p>
        </div>
      )}

      {/* Briefing */}
      {briefing && (
        <div className="space-y-5">
          {/* Narrativa + condición */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-white font-semibold text-lg">Narrativa del Mercado</h2>
              {condicion && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: condicion.bg, color: condicion.text }}
                >
                  {condicion.label}
                </span>
              )}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{briefing.narrativa}</p>
          </div>

          {/* Sesgos */}
          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#1A9BD7' }}>Sesgo NAS100</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{briefing.sesgo_nas100}</p>
            </div>
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#1A9BD7' }}>Sesgo XAUUSD</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{briefing.sesgo_xauusd}</p>
            </div>
          </div>

          {/* Eventos del día */}
          {briefing.eventos_dia && briefing.eventos_dia.length > 0 && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#1A9BD7' }}>Eventos del Día</h3>
              <ul className="space-y-2">
                {briefing.eventos_dia.map((evento, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#1A9BD7' }} />
                    {evento}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Correlaciones */}
          {briefing.correlaciones && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#1A9BD7' }}>Correlaciones</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{briefing.correlaciones}</p>
            </div>
          )}

          {/* Zonas clave */}
          {briefing.zonas_clave && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#1A9BD7' }}>Zonas Clave</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{briefing.zonas_clave}</p>
            </div>
          )}

          {/* Plan de acción */}
          {briefing.plan_accion && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#1A9BD7' }}>Plan de Acción</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{briefing.plan_accion}</p>
            </div>
          )}

          {/* Regenerar */}
          <div className="flex justify-end pb-4">
            <button
              onClick={generarBriefing}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-white transition-colors disabled:opacity-50"
              style={{ border: '1px solid #333' }}
            >
              {loading ? 'Regenerando...' : 'Regenerar briefing'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
