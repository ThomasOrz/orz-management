'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import TradingViewChart from '@/components/TradingViewChart'

// ── Tipos ─────────────────────────────────────────────────────────────────

type Zona    = 'Baja' | 'Media' | 'Alta'
type Sesgo   = 'Alcista' | 'Bajista'
type Tendencia = 'Alcista' | 'Bajista' | 'Lateral'
type EmasAlineadas = 'Sí' | 'No' | 'Parcial'
type Clasificacion = 'A+' | 'A' | 'B' | 'C'

interface ReglaValidacion {
  id:       string
  nombre:   string
  cumple:   boolean | 'parcial'
  mensaje:  string
  critica:  boolean
}

interface ResultadoValidacion {
  clasificacion: Clasificacion
  puntos:        number
  maxPuntos:     number
  reglas:        ReglaValidacion[]
  veredicto:     string
  puedeOperar:   boolean
}

interface Props { userId: string }

// ── Helpers de diseño ─────────────────────────────────────────────────────

const S = {
  bg: '#0A0A0A', card: '#111111',
  border: 'rgba(255,255,255,0.031)', muted: '#1E1E1E',
  accent: '#1A9BD7', accentBg: 'rgba(26,155,215,0.082)',
  t1: '#FFFFFF', t2: '#999999', t3: '#666666',
}

const TV_SYMBOL: Record<string, string> = {
  NAS100: 'OANDA:NAS100USD',
  XAUUSD: 'OANDA:XAUUSD',
}

const CLASIFICACION_CONFIG: Record<Clasificacion, { color: string; bg: string; label: string }> = {
  'A+': { color: '#4ade80', bg: '#4ade8018', label: 'A+ — Setup Óptimo'   },
  'A':  { color: '#86efac', bg: '#4ade8010', label: 'A — Setup Sólido'    },
  'B':  { color: '#fbbf24', bg: '#fbbf2415', label: 'B — Setup Aceptable' },
  'C':  { color: '#f87171', bg: '#f8717115', label: 'C — No Operar'       },
}

// ── Lógica de matriz sesgo ────────────────────────────────────────────────

function getSesgoSugerido(diario: Zona, h4: Zona): Sesgo {
  if (diario === 'Alta') return 'Alcista'
  if (diario === 'Baja') return 'Bajista'
  return h4 === 'Baja' ? 'Bajista' : 'Alcista'
}

// ── Lógica de validación ORZ ──────────────────────────────────────────────

function validarSetup(state: {
  activo: string; zonaDiario: Zona; zonaH4: Zona
  tendencia: Tendencia; sesgo: Sesgo; sesgoManual: boolean
  hayV85: boolean; dirV85: string; trigger: string
  t1Fallido: boolean; emasAlineadas: EmasAlineadas
  entrada: string; sl: string; tp: string; notas: string
}): ResultadoValidacion {
  const { sesgo, hayV85, dirV85, trigger, t1Fallido, emasAlineadas, entrada, sl, tp, zonaDiario, zonaH4 } = state
  const e = parseFloat(entrada), s = parseFloat(sl), t = parseFloat(tp)
  const preciosOk = !isNaN(e) && !isNaN(s) && !isNaN(t) && e !== s

  // Calcular RR real
  const risk   = preciosOk ? Math.abs(e - s) : 0
  const reward = preciosOk ? Math.abs(t - e) : 0
  const rr     = risk > 0 ? reward / risk : 0

  // Dirección V85 coincide con sesgo
  const v85AlignedWithSesgo = !hayV85 || (
    sesgo === 'Alcista' ? dirV85 === 'V85 alcista' : dirV85 === 'V85 bajista'
  )

  // Sesgo tiene confluencia real (ambas zonas apuntan al sesgo)
  const sesgoConfluo = getSesgoSugerido(zonaDiario, zonaH4) === sesgo

  // Trigger permitido
  const triggerPermitido = !(t1Fallido && trigger === 'T1 (V85+V50)')

  const reglas: ReglaValidacion[] = [
    {
      id: 'v85',
      nombre: 'V85 identificada',
      cumple: hayV85,
      critica: true,
      mensaje: hayV85
        ? 'Vela V85 presente — estructura técnica válida'
        : '❌ Sin V85 identificada — no hay setup ORZ',
    },
    {
      id: 'v85-direccion',
      nombre: 'V85 alineada con sesgo',
      cumple: hayV85 ? v85AlignedWithSesgo : false,
      critica: true,
      mensaje: !hayV85
        ? 'Requiere V85 primero'
        : v85AlignedWithSesgo
          ? `V85 ${dirV85} coincide con sesgo ${sesgo}`
          : `❌ V85 ${dirV85} contradice el sesgo ${sesgo}`,
    },
    {
      id: 'sesgo-confluencia',
      nombre: 'Confluencia Diario + H4',
      cumple: sesgoConfluo ? true : 'parcial',
      critica: false,
      mensaje: sesgoConfluo
        ? `Zona Diario ${state.zonaDiario} + H4 ${state.zonaH4} → sesgo ${sesgo} confirmado`
        : `⚠ Diario ${state.zonaDiario} y H4 ${state.zonaH4} no apuntan claramente al sesgo — sesgo editado manualmente`,
    },
    {
      id: 'trigger',
      nombre: 'Trigger permitido',
      cumple: triggerPermitido,
      critica: true,
      mensaje: !triggerPermitido
        ? '❌ Regla post-pérdida: T1 fallido previo — solo T2 / T3 permitidos'
        : t1Fallido
          ? `Usando ${trigger} correctamente (T1 bloqueado por pérdida previa)`
          : `${trigger} habilitado`,
    },
    {
      id: 'emas',
      nombre: 'EMAs 8/20/40/200 alineadas',
      cumple: emasAlineadas === 'Sí' ? true : emasAlineadas === 'Parcial' ? 'parcial' : false,
      critica: false,
      mensaje: emasAlineadas === 'Sí'
        ? 'Todas las EMAs alineadas con el sesgo — máxima confluencia'
        : emasAlineadas === 'Parcial'
          ? '⚠ EMAs parcialmente alineadas — confluencia reducida'
          : '❌ EMAs no alineadas con sesgo — evitar este setup',
    },
    {
      id: 'rr',
      nombre: 'Ratio R:R mínimo 1:2',
      cumple: !preciosOk ? 'parcial' : rr >= 1.95,
      critica: true,
      mensaje: !preciosOk
        ? 'Completa entrada, SL y TP para verificar R:R'
        : rr >= 1.95
          ? `R:R ${rr.toFixed(2)} ✓ — riesgo/beneficio correcto`
          : `❌ R:R ${rr.toFixed(2)} — debe ser ≥ 1:2 (ajusta TP o SL)`,
    },
    {
      id: 'gestion',
      nombre: 'Gestión definida',
      cumple: preciosOk,
      critica: false,
      mensaje: preciosOk
        ? `Entrada ${e} | SL ${s} | TP ${t}`
        : '⚠ Completa todos los precios de gestión',
    },
  ]

  // Puntuación
  let puntos = 0
  const maxPuntos = reglas.length
  const criticasFallidas: string[] = []

  for (const r of reglas) {
    if (r.cumple === true)      { puntos += 1 }
    else if (r.cumple === 'parcial') { puntos += 0.5 }
    if (r.critica && r.cumple !== true) { criticasFallidas.push(r.id) }
  }

  // Clasificación
  let clasificacion: Clasificacion
  const pct = puntos / maxPuntos

  if (criticasFallidas.length > 0) {
    clasificacion = criticasFallidas.length >= 2 ? 'C' : 'B'
  } else if (pct >= 0.92) {
    clasificacion = 'A+'
  } else if (pct >= 0.72) {
    clasificacion = 'A'
  } else if (pct >= 0.5) {
    clasificacion = 'B'
  } else {
    clasificacion = 'C'
  }

  // Veredicto
  const veredictos: Record<Clasificacion, string> = {
    'A+': `Setup ORZ óptimo. Todas las confluencias alineadas: V85 ${dirV85}, trigger ${trigger}, sesgo ${sesgo} confirmado por Diario + H4, EMAs en orden. Puedes operar con gestión completa.`,
    'A':  `Setup sólido con algunas observaciones menores. La estructura técnica es válida y el R:R es correcto. Procede con gestión estricta.`,
    'B':  `Setup aceptable pero incompleto. ${criticasFallidas.length > 0 ? 'Hay reglas críticas que no se cumplen. ' : ''}Evalúa si esperar mejor confluencia antes de entrar.`,
    'C':  `Setup no cumple los criterios ORZ mínimos. ${criticasFallidas.includes('trigger') ? 'Regla post-pérdida activa. ' : ''}${criticasFallidas.includes('v85') ? 'Sin V85 identificada. ' : ''}No operes este setup.`,
  }

  return {
    clasificacion,
    puntos,
    maxPuntos,
    reglas,
    veredicto: veredictos[clasificacion],
    puedeOperar: clasificacion === 'A+' || clasificacion === 'A',
  }
}

// ── Sub-componentes ───────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: S.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </p>
  )
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
      <p style={{ color: S.t3, fontSize: 12, fontWeight: 500, margin: 0 }}>{children}</p>
      {hint && <span style={{ fontSize: 11, color: S.accent }}>{hint}</span>}
    </div>
  )
}

function ToggleGroup<T extends string>({
  options, value, onChange, disabled,
}: {
  options: { value: T; label?: string }[]
  value: T
  onChange: (v: T) => void
  disabled?: (v: T) => boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const isActive   = value === opt.value
        const isDisabled = disabled?.(opt.value) ?? false
        return (
          <button key={opt.value} type="button" disabled={isDisabled}
            onClick={() => !isDisabled && onChange(opt.value)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.3 : 1,
              backgroundColor: isActive ? S.accentBg : 'transparent',
              color: isActive ? S.accent : S.t3,
              border: `1px solid ${isActive ? S.accent + '50' : S.muted}`,
              transition: 'all 0.12s', boxSizing: 'border-box',
            }}>
            {opt.label ?? opt.value}
          </button>
        )
      })}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
        backgroundColor: value ? S.accent : S.muted, position: 'relative', transition: 'background-color 0.2s',
      }}>
      <span style={{
        position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: 9,
        backgroundColor: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  )
}

function PriceInput({ label, value, onChange, hint, readOnly }: {
  label: string; value: string; onChange?: (v: string) => void
  hint?: string; readOnly?: boolean
}) {
  return (
    <div>
      <Label hint={hint}>{label}</Label>
      <input type="number" step="any" value={value} readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
          backgroundColor: readOnly ? 'rgba(26,155,215,0.05)' : S.bg,
          border: `1px solid ${readOnly ? S.accent + '30' : S.muted}`,
          color: readOnly ? S.accent : S.t1, outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────

export default function ValidarClient({ userId }: Props) {
  const supabase = createClient()

  // Contexto
  const [activo,        setActivo]        = useState<'NAS100' | 'XAUUSD'>('NAS100')
  const [zonaDiario,    setZonaDiario]    = useState<Zona>('Alta')
  const [zonaH4,        setZonaH4]        = useState<Zona>('Alta')
  const [tendencia,     setTendencia]     = useState<Tendencia>('Alcista')
  const [sesgo,         setSesgo]         = useState<Sesgo>('Alcista')
  const [sesgoManual,   setSesgoManual]   = useState(false)

  // Setup
  const [hayV85,        setHayV85]        = useState(false)
  const [dirV85,        setDirV85]        = useState('V85 alcista')
  const [trigger,       setTrigger]       = useState('T2 (V85)')
  const [t1Fallido,     setT1Fallido]     = useState(false)
  const [emasAlineadas, setEmasAlineadas] = useState<EmasAlineadas>('Sí')

  // Gestión
  const [entrada, setEntrada] = useState('')
  const [sl,      setSl]      = useState('')
  const [tp,      setTp]      = useState('')
  const [rrCalc,  setRrCalc]  = useState<number | null>(null)

  // Confluencias
  const [notas, setNotas] = useState('')

  // Resultado
  const [resultado,    setResultado]    = useState<ResultadoValidacion | null>(null)
  const [loadingAI,    setLoadingAI]    = useState(false)
  const [aiVeredicto,  setAiVeredicto]  = useState<string | null>(null)
  const [aiError,      setAiError]      = useState<string | null>(null)

  // ── Efectos ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sesgoManual) setSesgo(getSesgoSugerido(zonaDiario, zonaH4))
  }, [zonaDiario, zonaH4, sesgoManual])

  useEffect(() => {
    setDirV85(sesgo === 'Alcista' ? 'V85 alcista' : 'V85 bajista')
  }, [sesgo])

  useEffect(() => {
    if (t1Fallido && trigger === 'T1 (V85+V50)') setTrigger('T2 (V85)')
  }, [t1Fallido, trigger])

  // Auto-calcular TP (RR 1:2) y RR
  useEffect(() => {
    const e = parseFloat(entrada), s = parseFloat(sl)
    if (!isNaN(e) && !isNaN(s) && e !== s) {
      const risk = Math.abs(e - s)
      const tpCalc = sesgo === 'Alcista' ? e + risk * 2 : e - risk * 2
      setTp(tpCalc.toFixed(2))
      setRrCalc(2.0)
    } else {
      setTp(''); setRrCalc(null)
    }
  }, [entrada, sl, sesgo])

  // Recalcular RR si TP se edita manualmente
  useEffect(() => {
    const e = parseFloat(entrada), s = parseFloat(sl), t = parseFloat(tp)
    if (!isNaN(e) && !isNaN(s) && !isNaN(t) && e !== s) {
      const risk = Math.abs(e - s), reward = Math.abs(t - e)
      setRrCalc(risk > 0 ? reward / risk : null)
    }
  }, [tp, entrada, sl])

  // ── Handlers ────────────────────────────────────────────────────────────

  function handleValidar() {
    const state = {
      activo, zonaDiario, zonaH4, tendencia, sesgo, sesgoManual,
      hayV85, dirV85, trigger, t1Fallido, emasAlineadas,
      entrada, sl, tp, notas,
    }
    setResultado(validarSetup(state))
    setAiVeredicto(null)
    setAiError(null)
    // Scroll al resultado
    setTimeout(() => document.getElementById('resultado-validacion')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function handleValidarConIA() {
    setLoadingAI(true)
    setAiError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesión activa')

      const descripcion = `
Activo: ${activo} | Sesgo: ${sesgo} | Zona Diario: ${zonaDiario} | Zona H4: ${zonaH4} | Tendencia mayor: ${tendencia}
V85: ${hayV85 ? dirV85 : 'No identificada'} | Trigger: ${trigger} | T1 fallido previo: ${t1Fallido ? 'Sí' : 'No'}
EMAs alineadas: ${emasAlineadas} | Entrada: ${entrada || '—'} | SL: ${sl || '—'} | TP: ${tp || '—'} | R:R: ${rrCalc?.toFixed(2) ?? '—'}
Notas: ${notas || 'Ninguna'}
`.trim()

      const res = await fetch(
        'https://ymosnytxyveedpsubdke.supabase.co/functions/v1/validate-setup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ activo, direccion: sesgo === 'Alcista' ? 'Long' : 'Short', descripcion }),
        }
      )
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `Error ${res.status}`) }
      const data = await res.json()
      const v = data.validacion ?? data
      setAiVeredicto(v.veredicto ?? JSON.stringify(v))
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoadingAI(false)
    }
  }

  function handleReset() {
    setResultado(null); setAiVeredicto(null); setAiError(null)
    setEntrada(''); setSl(''); setTp(''); setNotas('')
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    backgroundColor: S.card, border: `1px solid ${S.border}`,
    borderRadius: 16, padding: 24, marginBottom: 16,
  }
  const divider: React.CSSProperties = {
    borderBottom: `1px solid ${S.muted}`, marginBottom: 20, paddingBottom: 20,
  }

  const rrOk   = rrCalc !== null && rrCalc >= 1.95
  const rrWarn = rrCalc !== null && rrCalc >= 1.5 && rrCalc < 1.95

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: S.t1, margin: 0 }}>Validar Setup</h1>
        <p style={{ fontSize: 13, color: S.t3, marginTop: 4 }}>
          Verifica si tu setup cumple los criterios de calidad ORZ antes de operar
        </p>
      </div>

      {/* Gráfico dinámico */}
      <div key={activo} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px 0', fontSize: 11, fontWeight: 600, color: S.accent, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {activo} — 15m en vivo
        </div>
        <TradingViewChart key={activo} symbol={TV_SYMBOL[activo]} interval="15" height={480} />
      </div>

      {/* ── FASE 0: Contexto ── */}
      <div style={cardStyle}>
        <SectionHeader>Fase 0 — Contexto de Mercado</SectionHeader>

        <div style={{ ...divider, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Label>Activo</Label>
            <ToggleGroup
              options={[{ value: 'NAS100' }, { value: 'XAUUSD' }]}
              value={activo}
              onChange={v => setActivo(v as 'NAS100' | 'XAUUSD')}
            />
          </div>
          <div>
            <Label>Tendencia mayor Diario</Label>
            <ToggleGroup<Tendencia>
              options={[{ value: 'Alcista' }, { value: 'Bajista' }, { value: 'Lateral' }]}
              value={tendencia}
              onChange={setTendencia}
            />
          </div>
        </div>

        <div style={{ ...divider, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <Label>Zona Diario</Label>
            <ToggleGroup<Zona>
              options={[{ value: 'Baja' }, { value: 'Media' }, { value: 'Alta' }]}
              value={zonaDiario}
              onChange={v => { setZonaDiario(v); setSesgoManual(false) }}
            />
          </div>
          <div>
            <Label>Zona H4</Label>
            <ToggleGroup<Zona>
              options={[{ value: 'Baja' }, { value: 'Media' }, { value: 'Alta' }]}
              value={zonaH4}
              onChange={v => { setZonaH4(v); setSesgoManual(false) }}
            />
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <Label>Sesgo resultante</Label>
            {!sesgoManual
              ? <span style={{ fontSize: 10, color: S.t3, backgroundColor: S.muted, padding: '2px 8px', borderRadius: 4 }}>auto</span>
              : <button type="button" onClick={() => { setSesgoManual(false); setSesgo(getSesgoSugerido(zonaDiario, zonaH4)) }}
                  style={{ fontSize: 10, color: S.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  restablecer auto
                </button>
            }
          </div>
          <ToggleGroup<Sesgo>
            options={[{ value: 'Alcista' }, { value: 'Bajista' }]}
            value={sesgo}
            onChange={v => { setSesgo(v); setSesgoManual(true) }}
          />
        </div>
      </div>

      {/* ── FASE 1-2: Setup ── */}
      <div style={cardStyle}>
        <SectionHeader>Fases 1–2 — Identificación de Setup</SectionHeader>

        <div style={divider}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Label>¿Hay V85 identificada en el gráfico?</Label>
            <Toggle value={hayV85} onChange={setHayV85} />
          </div>
          <p style={{ fontSize: 12, color: hayV85 ? '#4ade80' : '#f87171', marginTop: 2 }}>
            {hayV85 ? 'Sí — estructura técnica presente' : 'No — sin V85, no hay setup ORZ válido'}
          </p>

          {hayV85 && (
            <div style={{ marginTop: 14 }}>
              <Label>Dirección V85</Label>
              <ToggleGroup
                options={[{ value: 'V85 alcista' }, { value: 'V85 bajista' }]}
                value={dirV85}
                onChange={setDirV85}
              />
              {dirV85 === 'V85 alcista' && sesgo === 'Bajista' && (
                <p style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>⚠ V85 alcista contradice sesgo Bajista</p>
              )}
              {dirV85 === 'V85 bajista' && sesgo === 'Alcista' && (
                <p style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>⚠ V85 bajista contradice sesgo Alcista</p>
              )}
            </div>
          )}
        </div>

        <div style={divider}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Label>¿Tuviste T1 fallido previo hoy?</Label>
            <Toggle value={t1Fallido} onChange={setT1Fallido} />
          </div>
          {t1Fallido && (
            <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: '#f8717112', border: '1px solid #f8717130', marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: '#f87171', margin: 0, fontWeight: 500 }}>
                🚫 Regla post-pérdida activa — solo T2 (V85) o T3 (V85+EMAs) permitidos
              </p>
            </div>
          )}
        </div>

        <div style={divider}>
          <Label>Trigger planeado</Label>
          <ToggleGroup
            options={[
              { value: 'T1 (V85+V50)' }, { value: 'T2 (V85)' },
              { value: 'T3 (V85+EMAs)' }, { value: 'Acumulación' },
            ]}
            value={trigger}
            onChange={setTrigger}
            disabled={v => t1Fallido && v === 'T1 (V85+V50)'}
          />
        </div>

        <div>
          <Label>EMAs 8 / 20 / 40 / 200 alineadas con sesgo</Label>
          <ToggleGroup<EmasAlineadas>
            options={[{ value: 'Sí' }, { value: 'Parcial' }, { value: 'No' }]}
            value={emasAlineadas}
            onChange={setEmasAlineadas}
          />
          <p style={{ fontSize: 11, color: emasAlineadas === 'Sí' ? '#4ade80' : emasAlineadas === 'Parcial' ? '#fbbf24' : '#f87171', marginTop: 6 }}>
            {emasAlineadas === 'Sí'      && 'Todas las EMAs alineadas — máxima confluencia tendencial'}
            {emasAlineadas === 'Parcial' && 'EMAs parcialmente alineadas — confluencia reducida, procede con cautela'}
            {emasAlineadas === 'No'      && 'EMAs en contra del sesgo — setup de baja probabilidad'}
          </p>
        </div>
      </div>

      {/* ── FASE 3: Gestión ── */}
      <div style={cardStyle}>
        <SectionHeader>Fase 3 — Gestión de la Operación</SectionHeader>

        <div style={{ ...divider, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <PriceInput label="Precio de entrada" value={entrada} onChange={setEntrada} />
          <PriceInput label="Stop Loss"         value={sl}      onChange={setSl} />
          <PriceInput label="Take Profit"       value={tp}      onChange={v => setTp(v)} hint="1:2 auto" />
        </div>

        {/* Indicador RR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: S.t2 }}>R:R calculado:</span>
          <span style={{
            fontSize: 20, fontWeight: 700,
            color: rrCalc === null ? S.t3 : rrOk ? '#4ade80' : rrWarn ? '#fbbf24' : '#f87171',
          }}>
            {rrCalc === null ? '—' : `1:${rrCalc.toFixed(2)}`}
          </span>
          {rrCalc !== null && !rrOk && (
            <span style={{ fontSize: 11, color: rrWarn ? '#fbbf24' : '#f87171' }}>
              {rrWarn ? '⚠ cercano — considera ajustar' : '❌ mínimo requerido 1:2'}
            </span>
          )}
          {rrOk && <span style={{ fontSize: 11, color: '#4ade80' }}>✓ cumple mínimo ORZ</span>}
        </div>
      </div>

      {/* ── Confluencias ── */}
      <div style={cardStyle}>
        <SectionHeader>Confluencias adicionales</SectionHeader>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="Contexto adicional, estructura de mercado, confluencias HTF, noticias relevantes..."
          rows={3}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
            backgroundColor: S.bg, border: `1px solid ${S.muted}`,
            color: S.t1, resize: 'none', outline: 'none', fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ── Botones de validación ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 32 }}>
        <button type="button" onClick={handleValidar}
          style={{
            padding: '13px 0', borderRadius: 12, backgroundColor: S.accent,
            color: '#fff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
          }}>
          Validar Setup (reglas ORZ)
        </button>
        <button type="button" onClick={handleValidarConIA} disabled={loadingAI}
          style={{
            padding: '13px 20px', borderRadius: 12, border: `1px solid ${S.muted}`,
            backgroundColor: 'transparent', color: loadingAI ? S.t3 : S.t2,
            fontSize: 13, fontWeight: 500, cursor: loadingAI ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}>
          {loadingAI ? 'Consultando IA...' : '+ Análisis IA'}
        </button>
      </div>

      {/* ── Resultado de validación ── */}
      {resultado && (
        <div id="resultado-validacion">
          {/* Clasificación */}
          {(() => {
            const cfg = CLASIFICACION_CONFIG[resultado.clasificacion]
            return (
              <div style={{ ...cardStyle, border: `1px solid ${cfg.color}30` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: S.t1, margin: 0 }}>Resultado de Validación</h2>
                  <span style={{ padding: '6px 16px', borderRadius: 20, backgroundColor: cfg.bg, color: cfg.color, fontSize: 13, fontWeight: 700 }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Barra de puntuación */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: S.t3, marginBottom: 6 }}>
                    <span>Puntuación ORZ</span>
                    <span>{resultado.puntos.toFixed(1)} / {resultado.maxPuntos}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, backgroundColor: S.muted, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${(resultado.puntos / resultado.maxPuntos) * 100}%`,
                      backgroundColor: cfg.color, transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>

                <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.6, margin: 0 }}>{resultado.veredicto}</p>

                {resultado.puedeOperar
                  ? <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, backgroundColor: '#4ade8010', border: '1px solid #4ade8030' }}>
                      <p style={{ fontSize: 12, color: '#4ade80', margin: 0, fontWeight: 500 }}>✓ Setup habilitado para operar con gestión completa</p>
                    </div>
                  : <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, backgroundColor: '#f8717110', border: '1px solid #f8717130' }}>
                      <p style={{ fontSize: 12, color: '#f87171', margin: 0, fontWeight: 500 }}>🚫 No operar — corrige los criterios fallidos primero</p>
                    </div>
                }
              </div>
            )
          })()}

          {/* Checklist */}
          <div style={cardStyle}>
            <SectionHeader>Checklist de reglas ORZ</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {resultado.reglas.map(regla => {
                const icon  = regla.cumple === true ? '✓' : regla.cumple === 'parcial' ? '◐' : '✗'
                const color = regla.cumple === true ? '#4ade80' : regla.cumple === 'parcial' ? '#fbbf24' : '#f87171'
                const bg    = regla.cumple === true ? '#4ade8010' : regla.cumple === 'parcial' ? '#fbbf2410' : '#f8717110'
                return (
                  <div key={regla.id} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 10, backgroundColor: bg, border: `1px solid ${color}20` }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color, flexShrink: 0, width: 16, textAlign: 'center' }}>{icon}</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: regla.cumple === false ? '#f87171' : S.t1, margin: 0 }}>
                          {regla.nombre}
                        </p>
                        {regla.critica && (
                          <span style={{ fontSize: 10, backgroundColor: '#ffffff15', color: S.t3, padding: '1px 6px', borderRadius: 4 }}>crítica</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: S.t3, margin: 0 }}>{regla.mensaje}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Análisis IA (si se solicitó) */}
          {aiError && (
            <div style={{ ...cardStyle, border: '1px solid #f8717130' }}>
              <p style={{ fontSize: 13, color: '#f87171', margin: 0 }}>Error IA: {aiError}</p>
            </div>
          )}
          {aiVeredicto && (
            <div style={{ ...cardStyle, border: `1px solid ${S.accent}30` }}>
              <SectionHeader>Análisis IA — Tefa</SectionHeader>
              <p style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7, margin: 0 }}>{aiVeredicto}</p>
            </div>
          )}

          {/* Reset */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 32 }}>
            <button type="button" onClick={handleReset}
              style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${S.muted}`, backgroundColor: 'transparent', color: S.t3, fontSize: 12, cursor: 'pointer' }}>
              Nuevo análisis
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
