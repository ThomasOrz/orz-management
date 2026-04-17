'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Tipos reales devueltos por la Edge Function generate-briefing
interface SesgoObj { direccion?: string; razon?: string }
interface ZonasActivo { soporte?: string; resistencia?: string }
interface EventoObj { hora?: string; evento?: string; impacto?: string }

interface Briefing {
  id: string
  fecha?: string
  narrativa: string
  condicion: string
  sesgo_nas100: string | SesgoObj | null
  sesgo_xauusd: string | SesgoObj | null
  eventos?: (string | EventoObj)[]
  eventos_dia?: (string | EventoObj)[]
  correlaciones?: Record<string, string> | string | null
  zonas_clave?: { nas100?: ZonasActivo; xauusd?: ZonasActivo } | null
  plan_accion?: { buscar?: string[]; evitar?: string[] } | string | null
}

interface Props {
  initialBriefing: Briefing | null
  userId: string
}

const condicionColors: Record<string, { bg: string; text: string; label: string }> = {
  favorable: { bg: '#16a34a20', text: '#4ade80', label: 'Favorable' },
  neutral:   { bg: '#ca8a0420', text: '#fbbf24', label: 'Neutral' },
  adverso:   { bg: '#dc262620', text: '#f87171', label: 'Adverso' },
  mixto:     { bg: '#7c3aed20', text: '#a78bfa', label: 'Mixto' },
}

/** Convierte sesgo (string o {direccion, razon}) a texto legible */
function sesgoTexto(sesgo: string | SesgoObj | null | undefined): string {
  if (!sesgo) return '—'
  if (typeof sesgo === 'string') return sesgo
  const partes: string[] = []
  if (sesgo.direccion) partes.push(sesgo.direccion)
  if (sesgo.razon) partes.push(sesgo.razon)
  return partes.join(' — ') || '—'
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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw new Error(`Error de sesión: ${sessionError.message}`)
      if (!session) throw new Error('Sin sesión activa — vuelve a iniciar sesión')

      console.log('[briefing] Llamando Edge Function con user_id:', userId)

      let response: Response
      try {
        response = await fetch(
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
      } catch (networkErr) {
        throw new Error(`Error de red: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`)
      }

      console.log('[briefing] Status:', response.status)
      const rawText = await response.text()
      console.log('[briefing] Raw:', rawText.slice(0, 500))

      let data: Record<string, unknown>
      try {
        data = JSON.parse(rawText)
      } catch {
        throw new Error(`Respuesta inválida (${response.status}): ${rawText.slice(0, 200)}`)
      }

      console.log('[briefing] Parsed:', data)

      if (!response.ok) {
        throw new Error(String(data.error ?? data.message ?? `Error ${response.status}`))
      }

      const raw = (data.briefing ?? data) as Briefing
      console.log('[briefing] Briefing:', raw)
      setBriefing(raw)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[briefing] Error:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const condicion = briefing?.condicion
    ? (condicionColors[briefing.condicion.toLowerCase()] ?? condicionColors.neutral)
    : null

  // Eventos: la EF usa "eventos", Supabase puede tener "eventos_dia"
  const eventos = briefing?.eventos ?? briefing?.eventos_dia ?? []

  // Correlaciones: puede ser objeto {dxy, vix, us10y} o string
  const correlaciones = briefing?.correlaciones
  const correlacionesEntradas = correlaciones && typeof correlaciones === 'object'
    ? Object.entries(correlaciones as Record<string, string>)
    : null
  const correlacionesTexto = typeof correlaciones === 'string' ? correlaciones : null

  // Zonas clave: objeto {nas100: {soporte, resistencia}, xauusd: {...}}
  const zonas = briefing?.zonas_clave

  // Plan de acción: puede ser objeto {buscar, evitar} o string
  const plan = briefing?.plan_accion

  const card = "rounded-2xl p-6"
  const cardStyle = { backgroundColor: '#111111', border: '1px solid #222222' }
  const labelStyle = { color: '#1A9BD7' }
  const labelClass = "text-xs font-semibold uppercase tracking-wider mb-3"

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
            className="px-5 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-60 flex items-center gap-2"
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
        <div className={card} style={{ ...cardStyle, padding: '3rem', textAlign: 'center' }}>
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
          <div className={card} style={cardStyle}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-white font-semibold text-lg">Narrativa del Mercado</h2>
              {condicion && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: condicion.bg, color: condicion.text }}>
                  {condicion.label}
                </span>
              )}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{briefing.narrativa}</p>
          </div>

          {/* Sesgos */}
          <div className="grid grid-cols-2 gap-5">
            <div className={card} style={cardStyle}>
              <h3 className={labelClass} style={labelStyle}>Sesgo NAS100</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{sesgoTexto(briefing.sesgo_nas100)}</p>
            </div>
            <div className={card} style={cardStyle}>
              <h3 className={labelClass} style={labelStyle}>Sesgo XAUUSD</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{sesgoTexto(briefing.sesgo_xauusd)}</p>
            </div>
          </div>

          {/* Eventos */}
          {eventos.length > 0 && (
            <div className={card} style={cardStyle}>
              <h3 className={labelClass} style={labelStyle}>Eventos del Día</h3>
              <ul className="space-y-3">
                {eventos.map((e, i) => {
                  if (typeof e === 'string') {
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#1A9BD7' }} />
                        {e}
                      </li>
                    )
                  }
                  // Objeto {hora, evento, impacto}
                  const impactoColor: Record<string, string> = {
                    alto: '#f87171', medio: '#fbbf24', bajo: '#4ade80',
                  }
                  const ic = impactoColor[(e.impacto ?? '').toLowerCase()] ?? '#888'
                  return (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      {e.hora && (
                        <span className="text-gray-500 font-mono text-xs w-12 flex-shrink-0 pt-0.5">{e.hora}</span>
                      )}
                      <span className="text-gray-300 flex-1">{e.evento ?? '—'}</span>
                      {e.impacto && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: `${ic}20`, color: ic }}>
                          {e.impacto}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Correlaciones */}
          {(correlacionesEntradas || correlacionesTexto) && (
            <div className={card} style={cardStyle}>
              <h3 className={labelClass} style={labelStyle}>Correlaciones</h3>
              {correlacionesTexto && (
                <p className="text-gray-300 text-sm leading-relaxed">{correlacionesTexto}</p>
              )}
              {correlacionesEntradas && (
                <ul className="space-y-2">
                  {correlacionesEntradas.map(([key, val]) => (
                    <li key={key} className="flex items-start gap-3 text-sm">
                      <span className="text-gray-500 uppercase font-mono w-12 flex-shrink-0">{key}</span>
                      <span className="text-gray-300">{val}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Zonas clave */}
          {zonas && (
            <div className={card} style={cardStyle}>
              <h3 className={labelClass} style={labelStyle}>Zonas Clave</h3>
              <div className="grid grid-cols-2 gap-6">
                {zonas.nas100 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-semibold">NAS100</p>
                    <div className="space-y-1.5">
                      {zonas.nas100.soporte && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-green-400 w-20 flex-shrink-0">Soporte</span>
                          <span className="text-gray-300">{zonas.nas100.soporte}</span>
                        </div>
                      )}
                      {zonas.nas100.resistencia && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-red-400 w-20 flex-shrink-0">Resist.</span>
                          <span className="text-gray-300">{zonas.nas100.resistencia}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {zonas.xauusd && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-semibold">XAUUSD</p>
                    <div className="space-y-1.5">
                      {zonas.xauusd.soporte && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-green-400 w-20 flex-shrink-0">Soporte</span>
                          <span className="text-gray-300">{zonas.xauusd.soporte}</span>
                        </div>
                      )}
                      {zonas.xauusd.resistencia && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-red-400 w-20 flex-shrink-0">Resist.</span>
                          <span className="text-gray-300">{zonas.xauusd.resistencia}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plan de acción */}
          {plan && (
            <div className={card} style={cardStyle}>
              <h3 className={labelClass} style={labelStyle}>Plan de Acción</h3>
              {typeof plan === 'string' && (
                <p className="text-gray-300 text-sm leading-relaxed">{plan}</p>
              )}
              {typeof plan === 'object' && (
                <div className="grid grid-cols-2 gap-6">
                  {plan.buscar && plan.buscar.length > 0 && (
                    <div>
                      <p className="text-xs text-green-400 font-semibold mb-2">Buscar</p>
                      <ul className="space-y-2">
                        {plan.buscar.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-green-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {plan.evitar && plan.evitar.length > 0 && (
                    <div>
                      <p className="text-xs text-red-400 font-semibold mb-2">Evitar</p>
                      <ul className="space-y-2">
                        {plan.evitar.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-400" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
