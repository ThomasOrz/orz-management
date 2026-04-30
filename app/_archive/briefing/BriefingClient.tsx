'use client'

import { useState } from 'react'
import { Zap, FileText, AlertTriangle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import TradingViewChart from '@/components/TradingViewChart'
import TradingViewTechnicalAnalysis from '@/components/TradingViewTechnicalAnalysis'
import TradingViewEconomicCalendar from '@/components/TradingViewEconomicCalendar'

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

const condicionMap: Record<string, { variant: 'profit' | 'loss' | 'info' | 'neutral' | 'accent'; label: string }> = {
  risk_on:   { variant: 'profit', label: 'Risk On' },
  risk_off:  { variant: 'loss',   label: 'Risk Off' },
  mixto:     { variant: 'accent', label: 'Mixto' },
  favorable: { variant: 'profit', label: 'Favorable' },
  neutral:   { variant: 'neutral', label: 'Neutral' },
  adverso:   { variant: 'loss',   label: 'Adverso' },
}

function sesgoTexto(sesgo: string | SesgoObj | null | undefined): string {
  if (!sesgo) return '—'
  if (typeof sesgo === 'string') return sesgo
  const partes: string[] = []
  if (sesgo.direccion) partes.push(sesgo.direccion)
  if (sesgo.razon) partes.push(sesgo.razon)
  return partes.join(' — ') || '—'
}

const labelStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--accent-primary)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: 0,
  marginBottom: 'var(--space-3)',
}

const bodyStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: 'var(--text-sm)',
  lineHeight: 1.55,
  margin: 0,
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

      const rawText = await response.text()
      let data: Record<string, unknown>
      try {
        data = JSON.parse(rawText)
      } catch {
        throw new Error(`Respuesta inválida (${response.status}): ${rawText.slice(0, 200)}`)
      }
      if (!response.ok) {
        throw new Error(String(data.error ?? data.message ?? `Error ${response.status}`))
      }
      const raw = (data.briefing ?? data) as Briefing
      setBriefing(raw)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const condicion = briefing?.condicion
    ? (condicionMap[briefing.condicion.toLowerCase()] ?? condicionMap.neutral)
    : null

  const eventos = briefing?.eventos ?? briefing?.eventos_dia ?? []
  const correlaciones = briefing?.correlaciones
  const correlacionesEntradas = correlaciones && typeof correlaciones === 'object'
    ? Object.entries(correlaciones as Record<string, string>)
    : null
  const correlacionesTexto = typeof correlaciones === 'string' ? correlaciones : null
  const zonas = briefing?.zonas_clave
  const plan = briefing?.plan_accion

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Briefing Diario"
        subtitle={today}
        action={
          briefing ? (
            <Button
              variant="secondary"
              size="sm"
              loading={loading}
              icon={<RefreshCw size={14} />}
              onClick={generarBriefing}
            >
              Regenerar
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              loading={loading}
              icon={<Zap size={14} />}
              onClick={generarBriefing}
            >
              Generar Briefing
            </Button>
          )
        }
      />

      {error && (
        <Card padding="sm" style={{
          marginBottom: 'var(--space-5)',
          background: 'var(--loss-bg)',
          borderColor: 'var(--loss)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--loss)', fontSize: 'var(--text-sm)' }}>
            <AlertTriangle size={14} />
            {error}
          </div>
        </Card>
      )}

      {!briefing && !loading && (
        <EmptyState
          icon={<FileText size={28} />}
          title="No hay briefing para hoy"
          description="Genera el briefing del día para ver el análisis de mercado."
        />
      )}

      {briefing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Narrativa + condición */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)', fontWeight: 600, margin: 0 }}>Narrativa del Mercado</h2>
              {condicion && <Badge variant={condicion.variant}>{condicion.label}</Badge>}
            </div>
            <p style={bodyStyle}>{briefing.narrativa}</p>
          </Card>

          {/* Sesgos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-5)' }}>
            <Card>
              <h3 style={labelStyle}>Sesgo NAS100</h3>
              <p style={bodyStyle}>{sesgoTexto(briefing.sesgo_nas100)}</p>
            </Card>
            <Card>
              <h3 style={labelStyle}>Sesgo XAUUSD</h3>
              <p style={bodyStyle}>{sesgoTexto(briefing.sesgo_xauusd)}</p>
            </Card>
          </div>

          {/* Eventos */}
          {eventos.length > 0 && (
            <Card>
              <h3 style={labelStyle}>Eventos del Día</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', listStyle: 'none', padding: 0, margin: 0 }}>
                {eventos.map((e, i) => {
                  if (typeof e === 'string') {
                    return (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        <span style={{ marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }} />
                        {e}
                      </li>
                    )
                  }
                  const impactoVariant: Record<string, 'loss' | 'neutral' | 'profit'> = {
                    alto: 'loss', medio: 'neutral', bajo: 'profit',
                  }
                  const v = impactoVariant[(e.impacto ?? '').toLowerCase()] ?? 'neutral'
                  return (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                      {e.hora && (
                        <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', width: 56, flexShrink: 0 }}>{e.hora}</span>
                      )}
                      <span style={{ color: 'var(--text-secondary)', flex: 1 }}>{e.evento ?? '—'}</span>
                      {e.impacto && <Badge variant={v} size="sm">{e.impacto}</Badge>}
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          {/* Correlaciones */}
          {(correlacionesEntradas || correlacionesTexto) && (
            <Card>
              <h3 style={labelStyle}>Correlaciones</h3>
              {correlacionesTexto && <p style={bodyStyle}>{correlacionesTexto}</p>}
              {correlacionesEntradas && (
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', listStyle: 'none', padding: 0, margin: 0 }}>
                  {correlacionesEntradas.map(([key, val]) => (
                    <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', width: 56, flexShrink: 0 }}>{key}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{val}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Zonas clave */}
          {zonas && (
            <Card>
              <h3 style={labelStyle}>Zonas Clave</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)' }}>
                {(['nas100', 'xauusd'] as const).map((act) => {
                  const z = zonas[act]
                  if (!z) return null
                  return (
                    <div key={act}>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 'var(--space-2)' }}>{act.toUpperCase()}</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {z.soporte && (
                          <div style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                            <span style={{ color: 'var(--profit)', width: 70, flexShrink: 0 }}>Soporte</span>
                            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{z.soporte}</span>
                          </div>
                        )}
                        {z.resistencia && (
                          <div style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                            <span style={{ color: 'var(--loss)', width: 70, flexShrink: 0 }}>Resist.</span>
                            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{z.resistencia}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Gráficos en vivo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-4)' }}>
            <Card padding="none">
              <p style={{ ...labelStyle, padding: 'var(--space-3) var(--space-4) 0' }}>NAS100 — 15m</p>
              <TradingViewChart symbol="OANDA:NAS100USD" interval="15" height={500} />
            </Card>
            <Card padding="none">
              <p style={{ ...labelStyle, padding: 'var(--space-3) var(--space-4) 0' }}>XAUUSD — 15m</p>
              <TradingViewChart symbol="OANDA:XAUUSD" interval="15" height={500} />
            </Card>
          </div>

          {/* Análisis Técnico */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-4)' }}>
            <Card padding="none">
              <p style={{ ...labelStyle, padding: 'var(--space-3) var(--space-4) 0' }}>Análisis Técnico — NAS100</p>
              <TradingViewTechnicalAnalysis symbol="OANDA:NAS100USD" interval="15m" height={425} />
            </Card>
            <Card padding="none">
              <p style={{ ...labelStyle, padding: 'var(--space-3) var(--space-4) 0' }}>Análisis Técnico — XAUUSD</p>
              <TradingViewTechnicalAnalysis symbol="OANDA:XAUUSD" interval="15m" height={425} />
            </Card>
          </div>

          {/* Calendario */}
          <Card padding="none">
            <p style={{ ...labelStyle, padding: 'var(--space-3) var(--space-4) 0' }}>Calendario Económico — US · EU · JP</p>
            <TradingViewEconomicCalendar height={400} />
          </Card>

          {/* Plan de acción */}
          {plan && (
            <Card>
              <h3 style={labelStyle}>Plan de Acción</h3>
              {typeof plan === 'string' && <p style={bodyStyle}>{plan}</p>}
              {typeof plan === 'object' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-6)' }}>
                  {plan.buscar && plan.buscar.length > 0 && (
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--profit)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Buscar</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', listStyle: 'none', padding: 0, margin: 0 }}>
                        {plan.buscar.map((item, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                            <span style={{ marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--profit)', flexShrink: 0 }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {plan.evitar && plan.evitar.length > 0 && (
                    <div>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--loss)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Evitar</p>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', listStyle: 'none', padding: 0, margin: 0 }}>
                        {plan.evitar.map((item, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                            <span style={{ marginTop: 6, width: 6, height: 6, borderRadius: '50%', background: 'var(--loss)', flexShrink: 0 }} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
