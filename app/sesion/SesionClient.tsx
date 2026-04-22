'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/sesion/SesionClient.tsx — Bitácora enriquecida (Iteración 1)
// ─────────────────────────────────────────────────────────────────────────
// Secciones:
//   A · Contexto Pre-Trade  (activo / sesión / fecha / zonas / sesgo
//                             + capital + riesgo R)
//   B · Setup               (tipo vela / T1 fallido / trigger)
//   C · Gestión             (entrada / SL / TP / resultado opcional)
//   D · Justificación       (razón entrada + plan invalidación) — OBLIG.
//   E · Screenshot          (upload Supabase Storage) — OPCIONAL
//   F · Disciplina          (siguió reglas / emoción / notas)
//
// Al guardar: llama Edge Function `market-snapshot` para capturar
// precio/vix/dxy/spread. Si falla, continúa con nulls.
//
// Lista de trades del día: los abiertos (trade_cerrado=false) exponen
// botón "Cerrar trade" que abre CerrarTradeModal con resultado + MAE +
// MFE + lección aprendida.
// ─────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import TradingViewMiniChart from '@/components/TradingViewMiniChart'

const TV_SYMBOL: Record<string, string> = {
  NAS100: 'OANDA:NAS100USD',
  XAUUSD: 'OANDA:XAUUSD',
}

// ── Tipos locales (mapea a types/trading.ts pero evita ciclos) ────────────

interface Trade {
  id: string
  activo: string
  sesion: string
  fecha_entrada: string
  zona_diario: string
  zona_h4: string
  sesgo: string
  tipo_vela: string
  trigger: string
  t1_fallido_previo: boolean
  precio_entrada: number
  stop_loss: number
  take_profit: number
  resultado: string | null
  r_obtenido: number | null
  siguio_reglas: boolean
  regla_rota: string | null
  emocion: string
  notas: string | null
  created_at: string
  // Iteración 1
  precio_activo_entrada: number | null
  vix_entrada: number | null
  dxy_entrada: number | null
  spread_pips: number | null
  hora_exacta_trigger: string | null
  capital_cuenta: number | null
  riesgo_pct: number | null
  riesgo_r: number | null
  mae_r: number | null
  mfe_r: number | null
  tiempo_hasta_cierre_min: number | null
  razon_entrada: string | null
  plan_invalidacion: string | null
  leccion_aprendida: string | null
  screenshot_url: string | null
  trade_cerrado: boolean
  fecha_cierre: string | null
}

interface Props {
  userId: string
  initialTrades: Trade[]
}

// ── Constantes ────────────────────────────────────────────────────────────

type Zona = 'Baja' | 'Media' | 'Alta'
type Sesgo = 'Alcista' | 'Bajista'

const TRIGGERS = ['T1 (V85+V50)', 'T2 (V85)', 'T3 (V85+EMAs)', 'Acumulación'] as const

const RIESGO_R_OPTIONS = [0.5, 1, 1.5, 2] as const

const EMOCIONES: { value: string; color: string }[] = [
  { value: 'Tranquilo',     color: '#4ade80' },
  { value: 'Ansioso',       color: '#fbbf24' },
  { value: 'Revanchista',   color: '#f87171' },
  { value: 'Sobreconfiado', color: '#fb923c' },
  { value: 'Con miedo',     color: '#a78bfa' },
]

const RESULTADO_CONFIG: Record<string, { label: string; color: string; r: number }> = {
  Win:       { label: 'Win',       color: '#4ade80', r:  2 },
  Loss:      { label: 'Loss',      color: '#f87171', r: -1 },
  Breakeven: { label: 'Breakeven', color: '#fbbf24', r:  0 },
}

const MIN_RAZON = 20
const MIN_PLAN = 15
const MIN_LECCION = 20
const MARKET_SNAPSHOT_URL =
  'https://ymosnytxyveedpsubdke.supabase.co/functions/v1/market-snapshot'

// ── Lógica de matriz sesgo ────────────────────────────────────────────────

function getSesgoSugerido(diario: Zona, h4: Zona): Sesgo {
  if (diario === 'Alta') return 'Alcista'
  if (diario === 'Baja') return 'Bajista'
  return h4 === 'Baja' ? 'Bajista' : 'Alcista'
}

// ── Tokens ────────────────────────────────────────────────────────────────

const S = {
  bg:       '#0A0A0A',
  card:     '#111111',
  border:   'rgba(255,255,255,0.031)',
  accent:   '#1A9BD7',
  accentBg: 'rgba(26,155,215,0.082)',
  muted:    '#1E1E1E',
  t1:       '#FFFFFF',
  t2:       '#999999',
  t3:       '#666666',
  green:    '#4ade80',
  red:      '#f87171',
  yellow:   '#fbbf24',
}

// ── UI Primitives ─────────────────────────────────────────────────────────

function SectionHeader({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <p style={{ color: S.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
      {icon && <span style={{ marginRight: 6 }}>{icon}</span>}
      {children}
    </p>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ color: S.t3, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{children}</p>
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
        const isActive = value === opt.value
        const isDisabled = disabled?.(opt.value) ?? false
        return (
          <button
            key={opt.value}
            type="button"
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(opt.value)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.35 : 1,
              backgroundColor: isActive ? S.accentBg : 'transparent',
              color: isActive ? S.accent : S.t3,
              border: `1px solid ${isActive ? S.accent + '50' : S.muted}`,
              transition: 'all 0.12s',
            }}
          >
            {opt.label ?? opt.value}
          </button>
        )
      })}
    </div>
  )
}

function Input({
  label, value, onChange, type = 'text', placeholder, readOnly, hint,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  type?: string
  placeholder?: string
  readOnly?: boolean
  hint?: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <Label>{label}</Label>
        {hint && <span style={{ fontSize: 11, color: S.accent }}>{hint}</span>}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 10,
          fontSize: 13,
          backgroundColor: readOnly ? 'rgba(26,155,215,0.04)' : S.bg,
          border: `1px solid ${readOnly ? S.accent + '30' : S.muted}`,
          color: readOnly ? S.accent : S.t1,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

function Textarea({
  value, onChange, placeholder, minChars, rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  minChars?: number
  rows?: number
}) {
  const len = value.length
  const ok = minChars ? len >= minChars : true
  return (
    <>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
          backgroundColor: S.bg,
          border: `1px solid ${len === 0 ? S.muted : ok ? S.accent + '40' : S.yellow + '60'}`,
          color: S.t1, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
          boxSizing: 'border-box', minHeight: 70,
        }}
      />
      {minChars !== undefined && (
        <p style={{
          fontSize: 11, marginTop: 4,
          color: len === 0 ? S.t3 : ok ? S.green : S.yellow,
        }}>
          {len}/{minChars} caracteres {ok ? '✓' : `(faltan ${minChars - len})`}
        </p>
      )}
    </>
  )
}

// ── Collapsible Section (Fila A/B/C/D/E/F) ────────────────────────────────

function CollapsibleSection({
  title, icon, defaultOpen = true, required, children,
}: {
  title: string
  icon?: string
  defaultOpen?: boolean
  required?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      backgroundColor: S.card, border: `1px solid ${S.border}`, borderRadius: 16,
      marginBottom: 16, overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '18px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: S.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}
      >
        <span>
          {icon && <span style={{ marginRight: 8 }}>{icon}</span>}
          {title}
          {required && <span style={{ marginLeft: 8, color: S.red, fontSize: 10 }}>• obligatorio</span>}
        </span>
        <span style={{ fontSize: 14, color: S.t3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>⌄</span>
      </button>
      {open && (
        <div style={{ padding: '0 24px 24px' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────

export default function SesionClient({ userId, initialTrades }: Props) {
  const supabase = createClient()
  const [trades, setTrades] = useState<Trade[]>(initialTrades)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── A · Contexto ────────────────────────────────────────────────
  const [activo, setActivo]         = useState<'XAUUSD' | 'NAS100'>('NAS100')
  const [sesion, setSesion]         = useState<string>('Nueva York')
  const [fechaEntrada, setFechaEntrada] = useState<string>(new Date().toISOString().slice(0, 16))
  const [zonaDiario, setZonaDiario] = useState<Zona>('Alta')
  const [zonaH4, setZonaH4]         = useState<Zona>('Alta')
  const [sesgo, setSesgo]           = useState<Sesgo>('Alcista')
  const [sesgoManual, setSesgoManual] = useState(false)
  const [capital, setCapital]       = useState<string>('')
  const [riesgoR, setRiesgoR]       = useState<number>(1)

  // ── B · Setup ───────────────────────────────────────────────────
  const [tipoVela, setTipoVela]     = useState<string>('V85 alcista')
  const [trigger, setTrigger]       = useState<string>('T2 (V85)')
  const [t1Fallido, setT1Fallido]   = useState(false)

  // ── C · Gestión ─────────────────────────────────────────────────
  const [entrada, setEntrada]       = useState('')
  const [sl, setSl]                 = useState('')
  const [tp, setTp]                 = useState('')
  const [resultado, setResultado]   = useState<string>('')
  const [rObtenido, setRObtenido]   = useState<string>('')

  // ── D · Justificación ──────────────────────────────────────────
  const [razonEntrada, setRazonEntrada]       = useState('')
  const [planInvalidacion, setPlanInvalidacion] = useState('')

  // ── E · Screenshot ─────────────────────────────────────────────
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── F · Disciplina ─────────────────────────────────────────────
  const [siguioReglas, setSiguioReglas] = useState(true)
  const [reglaRota, setReglaRota]   = useState('')
  const [emocion, setEmocion]       = useState('Tranquilo')
  const [notas, setNotas]           = useState('')

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Efectos reactivos ───────────────────────────────────────────
  useEffect(() => {
    if (!sesgoManual) setSesgo(getSesgoSugerido(zonaDiario, zonaH4))
  }, [zonaDiario, zonaH4, sesgoManual])

  useEffect(() => {
    setTipoVela(sesgo === 'Alcista' ? 'V85 alcista' : 'V85 bajista')
  }, [sesgo])

  useEffect(() => {
    if (t1Fallido && trigger === 'T1 (V85+V50)') setTrigger('T2 (V85)')
  }, [t1Fallido, trigger])

  useEffect(() => {
    const e = parseFloat(entrada)
    const s = parseFloat(sl)
    if (!isNaN(e) && !isNaN(s) && e !== s) {
      const risk = Math.abs(e - s)
      const calc = sesgo === 'Alcista' ? e + risk * 2 : e - risk * 2
      setTp(calc.toFixed(2))
    } else {
      setTp('')
    }
  }, [entrada, sl, sesgo])

  useEffect(() => {
    if (resultado && RESULTADO_CONFIG[resultado]) {
      setRObtenido(String(RESULTADO_CONFIG[resultado].r))
    } else {
      setRObtenido('')
    }
  }, [resultado])

  // ── Screenshot preview ──────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) {
      setError('El screenshot debe ser PNG, JPEG o WebP.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('El screenshot no puede superar 5 MB.')
      return
    }
    setScreenshotFile(f)
    setScreenshotPreview(URL.createObjectURL(f))
    setError(null)
  }

  function clearScreenshot() {
    setScreenshotFile(null)
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview)
    setScreenshotPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Market snapshot ─────────────────────────────────────────────
  async function fetchMarketSnapshot(): Promise<{
    precio_activo: number | null
    vix: number | null
    dxy: number | null
    spread_estimado: number | null
    timestamp: string | null
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return empty()
      const res = await fetch(MARKET_SNAPSHOT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ activo }),
      })
      if (!res.ok) return empty()
      return await res.json()
    } catch {
      return empty()
    }
    function empty() {
      return { precio_activo: null, vix: null, dxy: null, spread_estimado: null, timestamp: null }
    }
  }

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    // Validación campos obligatorios
    const precioEntradaN = parseFloat(entrada)
    const stopLossN      = parseFloat(sl)
    const takeProfitN    = parseFloat(tp)
    if (isNaN(precioEntradaN) || isNaN(stopLossN) || isNaN(takeProfitN)) {
      setError('Verifica los precios — deben ser números válidos.')
      return
    }
    if (razonEntrada.length < MIN_RAZON) {
      setError(`La razón de entrada necesita al menos ${MIN_RAZON} caracteres.`)
      return
    }
    if (planInvalidacion.length < MIN_PLAN) {
      setError(`El plan de invalidación necesita al menos ${MIN_PLAN} caracteres.`)
      return
    }

    setLoading(true)

    try {
      // 1) Market snapshot
      const snap = await fetchMarketSnapshot()

      // 2) Screenshot upload (opcional)
      let screenshotUrl: string | null = null
      if (screenshotFile) {
        setUploadProgress('Subiendo screenshot...')
        const ts = Date.now()
        const ext = screenshotFile.name.split('.').pop()?.toLowerCase() ?? 'png'
        const path = `${userId}/${ts}.${ext}`
        const { error: upErr } = await supabase
          .storage.from('trade-screenshots')
          .upload(path, screenshotFile, { contentType: screenshotFile.type })
        if (upErr) {
          setUploadProgress(null)
          setError(`Error subiendo screenshot: ${upErr.message}`)
          setLoading(false)
          return
        }
        const { data: pub } = supabase.storage.from('trade-screenshots').getPublicUrl(path)
        // Bucket privado → guardamos el path; la URL firmada se genera al ver
        screenshotUrl = pub?.publicUrl ?? path
        setUploadProgress(null)
      }

      // 3) Riesgo %
      const capitalN = capital ? parseFloat(capital) : null
      const riskInPrice = Math.abs(precioEntradaN - stopLossN)
      const riesgoPct = capitalN && capitalN > 0 && riskInPrice > 0
        ? +(((riskInPrice / capitalN) * 100).toFixed(4))
        : null

      // 4) Insert
      const trade_cerrado = !!resultado
      const nowIso = new Date().toISOString()

      const { data, error: insertError } = await supabase
        .from('trades')
        .insert({
          user_id:           userId,
          activo,
          sesion,
          fecha_entrada:     new Date(fechaEntrada).toISOString(),
          zona_diario:       zonaDiario,
          zona_h4:           zonaH4,
          sesgo,
          tipo_vela:         tipoVela,
          trigger,
          t1_fallido_previo: t1Fallido,
          precio_entrada:    precioEntradaN,
          stop_loss:         stopLossN,
          take_profit:       takeProfitN,
          resultado:         resultado || null,
          r_obtenido:        rObtenido !== '' ? parseFloat(rObtenido) : null,
          siguio_reglas:     siguioReglas,
          regla_rota:        !siguioReglas ? reglaRota || null : null,
          emocion,
          notas:             notas || null,
          // Iteración 1
          precio_activo_entrada: snap.precio_activo,
          vix_entrada:           snap.vix,
          dxy_entrada:           snap.dxy,
          spread_pips:           snap.spread_estimado,
          hora_exacta_trigger:   nowIso,
          capital_cuenta:        capitalN,
          riesgo_pct:            riesgoPct,
          riesgo_r:              riesgoR,
          razon_entrada:         razonEntrada,
          plan_invalidacion:     planInvalidacion,
          screenshot_url:        screenshotUrl,
          trade_cerrado,
          fecha_cierre:          trade_cerrado ? nowIso : null,
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
      } else {
        setTrades(prev => [data, ...prev])
        // Reset sin tocar el contexto A/B
        setEntrada(''); setSl(''); setTp('')
        setResultado(''); setRObtenido('')
        setRazonEntrada(''); setPlanInvalidacion('')
        setSiguioReglas(true); setReglaRota(''); setNotas('')
        clearScreenshot()
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }

    setLoading(false)
  }

  // ── Cerrar trade (modal) ────────────────────────────────────────
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null)
  function handleClosed(updated: Trade) {
    setTrades(prev => prev.map(t => t.id === updated.id ? updated : t))
    setClosingTrade(null)
  }

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: S.t1, margin: 0 }}>Sesión</h1>
          <p style={{ fontSize: 13, color: S.t3, marginTop: 4, textTransform: 'capitalize' }}>{today}</p>
        </div>
        <div style={{ padding: '6px 14px', borderRadius: 10, backgroundColor: S.accentBg, color: S.accent, fontSize: 13, fontWeight: 600 }}>
          {trades.length} trade{trades.length !== 1 ? 's' : ''} hoy
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* A — Contexto Pre-Trade */}
        <CollapsibleSection title="A · Contexto Pre-Trade" icon="🎯">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
            <div>
              <Label>Activo</Label>
              <ToggleGroup
                options={[{ value: 'NAS100' }, { value: 'XAUUSD' }]}
                value={activo}
                onChange={v => setActivo(v as 'NAS100' | 'XAUUSD')}
              />
            </div>
            <div>
              <Label>Sesión</Label>
              <ToggleGroup
                options={[{ value: 'Londres' }, { value: 'Nueva York' }, { value: 'Overlap' }]}
                value={sesion}
                onChange={setSesion}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Input
              label="Fecha y hora de entrada"
              type="datetime-local"
              value={fechaEntrada}
              onChange={setFechaEntrada}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
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

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Label>Sesgo resultante</Label>
              {!sesgoManual && (
                <span style={{ fontSize: 10, color: S.t3, backgroundColor: S.muted, padding: '2px 8px', borderRadius: 4 }}>auto</span>
              )}
              {sesgoManual && (
                <button
                  type="button"
                  onClick={() => { setSesgoManual(false); setSesgo(getSesgoSugerido(zonaDiario, zonaH4)) }}
                  style={{ fontSize: 10, color: S.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  restablecer auto
                </button>
              )}
            </div>
            <ToggleGroup<Sesgo>
              options={[{ value: 'Alcista' }, { value: 'Bajista' }]}
              value={sesgo}
              onChange={v => { setSesgo(v); setSesgoManual(true) }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <Input
              label="Capital en cuenta (opcional)"
              type="number"
              value={capital}
              onChange={setCapital}
              placeholder="ej: 10000"
              hint="para % riesgo"
            />
            <div>
              <Label>Riesgo (R)</Label>
              <ToggleGroup
                options={RIESGO_R_OPTIONS.map(r => ({ value: String(r), label: `${r}R` }))}
                value={String(riesgoR)}
                onChange={v => setRiesgoR(parseFloat(v))}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Mini chart */}
        <div
          key={activo}
          style={{
            backgroundColor: S.card, border: `1px solid ${S.border}`,
            borderRadius: 16, overflow: 'hidden', marginBottom: 16,
          }}
        >
          <div style={{ padding: '10px 16px 0', fontSize: 11, fontWeight: 600, color: S.accent, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {activo} — Sesión actual
          </div>
          <TradingViewMiniChart key={activo} symbol={TV_SYMBOL[activo] ?? 'OANDA:NAS100USD'} height={220} dateRange="1D" />
        </div>

        {/* B — Setup */}
        <CollapsibleSection title="B · Setup" icon="🕯️">
          <div style={{ marginBottom: 20 }}>
            <Label>Tipo de vela</Label>
            <ToggleGroup
              options={[{ value: 'V85 alcista' }, { value: 'V85 bajista' }]}
              value={tipoVela}
              onChange={setTipoVela}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Label>¿Hubo T1 fallido previo?</Label>
              <button
                type="button"
                onClick={() => setT1Fallido(p => !p)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  backgroundColor: t1Fallido ? S.accent : S.muted,
                  position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: t1Fallido ? 23 : 3,
                  width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', transition: 'left 0.2s',
                }} />
              </button>
            </div>
            {t1Fallido && <p style={{ fontSize: 11, color: S.red, marginTop: 4 }}>T1 bloqueado — ya hubo un intento fallido en esta zona</p>}
          </div>

          <div>
            <Label>Trigger</Label>
            <ToggleGroup
              options={TRIGGERS.map(t => ({ value: t }))}
              value={trigger}
              onChange={setTrigger}
              disabled={v => t1Fallido && v === 'T1 (V85+V50)'}
            />
          </div>
        </CollapsibleSection>

        {/* C — Gestión */}
        <CollapsibleSection title="C · Gestión" icon="📏">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 20 }}>
            <Input label="Precio entrada" value={entrada} onChange={setEntrada} type="number" placeholder="0.00" />
            <Input label="Stop Loss" value={sl} onChange={setSl} type="number" placeholder="0.00" />
            <Input label="Take Profit" value={tp} onChange={setTp} type="number" placeholder="0.00" hint="1:2 auto" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <Label>Resultado (opcional — déjalo vacío si el trade sigue abierto)</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setResultado('')}
                style={{
                  flex: 1, minWidth: 80, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: resultado === '' ? S.accentBg : 'transparent',
                  color: resultado === '' ? S.accent : S.t3,
                  border: `1px solid ${resultado === '' ? S.accent + '50' : S.muted}`,
                }}
              >
                Abierto
              </button>
              {Object.entries(RESULTADO_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setResultado(key)}
                  style={{
                    flex: 1, minWidth: 80, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: resultado === key ? `${cfg.color}18` : 'transparent',
                    color: resultado === key ? cfg.color : S.t3,
                    border: `1px solid ${resultado === key ? cfg.color + '50' : S.muted}`,
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {resultado && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: S.t2 }}>R obtenido:</span>
              <span style={{
                fontSize: 18, fontWeight: 700,
                color: parseFloat(rObtenido) > 0 ? S.green : parseFloat(rObtenido) < 0 ? S.red : S.yellow,
              }}>
                {parseFloat(rObtenido) > 0 ? `+${rObtenido}R` : `${rObtenido}R`}
              </span>
            </div>
          )}
        </CollapsibleSection>

        {/* D — Justificación */}
        <CollapsibleSection title="D · Justificación" icon="🧠" required>
          <div style={{ marginBottom: 16 }}>
            <Label>¿Qué viste que te hizo entrar?</Label>
            <Textarea
              value={razonEntrada}
              onChange={setRazonEntrada}
              placeholder="¿Qué viste en el chart que te hizo entrar? Sé específico: confluencia de zonas, rechazos, estructura, volumen..."
              minChars={MIN_RAZON}
              rows={3}
            />
          </div>
          <div>
            <Label>¿Qué invalidaría tu setup?</Label>
            <Textarea
              value={planInvalidacion}
              onChange={setPlanInvalidacion}
              placeholder="¿Qué precio o estructura invalidaría tu setup? ej: cierre H1 debajo de 4200..."
              minChars={MIN_PLAN}
              rows={2}
            />
          </div>
        </CollapsibleSection>

        {/* E — Screenshot */}
        <CollapsibleSection title="E · Screenshot del chart" icon="📸" defaultOpen={false}>
          {!screenshotPreview ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%', padding: '24px', borderRadius: 12,
                  border: `1px dashed ${S.muted}`,
                  backgroundColor: 'transparent', color: S.t2,
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
                <div>Hacé click para subir screenshot</div>
                <div style={{ fontSize: 11, color: S.t3, marginTop: 4 }}>PNG / JPEG / WebP · máx 5MB</div>
              </button>
            </>
          ) : (
            <div style={{ position: 'relative' }}>
              <img
                src={screenshotPreview}
                alt="preview"
                style={{ width: '100%', borderRadius: 12, border: `1px solid ${S.muted}` }}
              />
              <button
                type="button"
                onClick={clearScreenshot}
                style={{
                  position: 'absolute', top: 8, right: 8, padding: '6px 12px',
                  borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff',
                  border: 'none', cursor: 'pointer', fontSize: 12,
                }}
              >
                Quitar
              </button>
              {screenshotFile && (
                <p style={{ fontSize: 11, color: S.t3, marginTop: 8 }}>
                  {screenshotFile.name} · {(screenshotFile.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
          )}
          {uploadProgress && (
            <p style={{ fontSize: 12, color: S.accent, marginTop: 10 }}>{uploadProgress}</p>
          )}
        </CollapsibleSection>

        {/* F — Disciplina */}
        <CollapsibleSection title="F · Disciplina" icon="⚖️">
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Label>¿Siguió todas las reglas?</Label>
              <button
                type="button"
                onClick={() => setSiguioReglas(p => !p)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  backgroundColor: siguioReglas ? '#4ade8080' : '#f8717180',
                  position: 'relative', transition: 'background-color 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: siguioReglas ? 23 : 3,
                  width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', transition: 'left 0.2s',
                }} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: siguioReglas ? S.green : S.red, marginTop: 6 }}>
              {siguioReglas ? 'Sí — todas las reglas respetadas' : 'No — especifica qué regla rompió'}
            </p>
            {!siguioReglas && (
              <input
                type="text"
                value={reglaRota}
                onChange={e => setReglaRota(e.target.value)}
                placeholder="¿Qué regla rompió?"
                style={{
                  marginTop: 10, width: '100%', padding: '10px 14px',
                  borderRadius: 10, fontSize: 13, outline: 'none',
                  backgroundColor: '#f8717110', border: '1px solid #f8717140',
                  color: S.t1, boxSizing: 'border-box',
                }}
              />
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <Label>Emoción al operar</Label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOCIONES.map(em => (
                <button
                  key={em.value}
                  type="button"
                  onClick={() => setEmocion(em.value)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer',
                    backgroundColor: emocion === em.value ? `${em.color}18` : 'transparent',
                    color: emocion === em.value ? em.color : S.t3,
                    border: `1px solid ${emocion === em.value ? em.color + '50' : S.muted}`,
                  }}
                >
                  {em.value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Notas del trade</Label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones, contexto adicional, aprendizajes..."
              rows={3}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13,
                backgroundColor: S.bg, border: `1px solid ${S.muted}`,
                color: S.t1, resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </CollapsibleSection>

        {/* Feedback + Submit */}
        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, backgroundColor: '#f8717115', color: S.red, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, backgroundColor: '#4ade8015', color: S.green, fontSize: 13 }}>
            Trade registrado correctamente.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12,
            backgroundColor: loading ? S.accentBg : S.accent,
            color: '#fff', fontSize: 14, fontWeight: 600,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginBottom: 32,
          }}
        >
          {loading ? (uploadProgress ?? 'Registrando...') : 'Registrar trade'}
        </button>
      </form>

      {/* Lista de trades del día */}
      {trades.length > 0 ? (
        <div style={{
          backgroundColor: S.card, border: `1px solid ${S.border}`,
          borderRadius: 16, padding: 24, marginBottom: 24,
        }}>
          <SectionHeader>Trades del día</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trades.map((t, i) => (
              <TradeRow key={t.id} trade={t} index={i} onClose={() => setClosingTrade(t)} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: S.card, border: `1px solid ${S.border}`,
          borderRadius: 16, padding: 40, textAlign: 'center', marginBottom: 24,
        }}>
          <p style={{ color: S.t3, fontSize: 13 }}>No hay trades registrados hoy.</p>
        </div>
      )}

      {/* Modal cerrar trade */}
      {closingTrade && (
        <CerrarTradeModal
          trade={closingTrade}
          onClose={() => setClosingTrade(null)}
          onSaved={handleClosed}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// TradeRow
// ─────────────────────────────────────────────────────────────────────────

function TradeRow({ trade, index, onClose }: { trade: Trade; index: number; onClose: () => void }) {
  const t = trade
  const rCfg = t.resultado ? RESULTADO_CONFIG[t.resultado] : null
  const emojiEm = EMOCIONES.find(e => e.value === t.emocion)
  const isOpen = !t.trade_cerrado

  return (
    <div
      style={{
        padding: '14px 16px', borderRadius: 12,
        backgroundColor: S.bg, border: `1px solid ${isOpen ? S.accent + '40' : S.muted}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: S.t3, fontFamily: 'monospace' }}>#{index + 1}</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: S.t1 }}>{t.activo}</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
            backgroundColor: t.sesgo === 'Alcista' ? '#4ade8015' : '#f8717115',
            color: t.sesgo === 'Alcista' ? S.green : S.red,
          }}>{t.sesgo}</span>
          <span style={{ fontSize: 11, color: S.t3 }}>{t.trigger}</span>
          {t.riesgo_r != null && t.riesgo_r !== 1 && (
            <span style={{ fontSize: 11, color: S.accent }}>{t.riesgo_r}R</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isOpen ? (
            <>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6, backgroundColor: S.accentBg, color: S.accent }}>
                Abierto
              </span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                  backgroundColor: S.accent, color: '#fff', border: 'none', cursor: 'pointer',
                }}
              >
                Cerrar trade
              </button>
            </>
          ) : (
            rCfg && (
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                backgroundColor: `${rCfg.color}15`, color: rCfg.color,
              }}>
                {rCfg.label} {t.r_obtenido != null ? (t.r_obtenido > 0 ? `+${t.r_obtenido}R` : `${t.r_obtenido}R`) : ''}
              </span>
            )
          )}
          {!t.siguio_reglas && <span style={{ fontSize: 11, color: S.red }}>⚠ regla rota</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: S.t3, flexWrap: 'wrap' }}>
        <span>E: {t.precio_entrada}</span>
        <span>SL: {t.stop_loss}</span>
        <span>TP: {t.take_profit}</span>
        {t.mae_r != null && <span>MAE: {t.mae_r}R</span>}
        {t.mfe_r != null && <span>MFE: {t.mfe_r}R</span>}
        <span style={{ marginLeft: 'auto', color: emojiEm?.color ?? S.t3 }}>{t.emocion}</span>
      </div>
      {t.razon_entrada && (
        <p style={{ fontSize: 12, color: S.t2, marginTop: 8, lineHeight: 1.45 }}>
          <span style={{ color: S.t3 }}>Razón: </span>{t.razon_entrada}
        </p>
      )}
      {t.leccion_aprendida && (
        <p style={{ fontSize: 12, color: S.t2, marginTop: 4, lineHeight: 1.45, fontStyle: 'italic' }}>
          <span style={{ color: S.t3 }}>Lección: </span>{t.leccion_aprendida}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// CerrarTradeModal
// ─────────────────────────────────────────────────────────────────────────

function CerrarTradeModal({
  trade, onClose, onSaved,
}: {
  trade: Trade
  onClose: () => void
  onSaved: (t: Trade) => void
}) {
  const supabase = createClient()
  const [resultado, setResultado] = useState<string>('')
  const [maeR, setMaeR] = useState<string>('')
  const [mfeR, setMfeR] = useState<string>('')
  const [leccion, setLeccion] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inicio = trade.hora_exacta_trigger ?? trade.created_at
  const minutosTranscurridos = Math.max(
    0,
    Math.round((Date.now() - new Date(inicio).getTime()) / 60000),
  )

  async function handleGuardar() {
    setError(null)
    if (!resultado) { setError('Elegí el resultado final.'); return }
    if (leccion.length < MIN_LECCION) {
      setError(`La lección necesita al menos ${MIN_LECCION} caracteres.`); return
    }
    const maeN = maeR !== '' ? parseFloat(maeR) : null
    const mfeN = mfeR !== '' ? parseFloat(mfeR) : null
    if (maeR !== '' && isNaN(maeN as number)) { setError('MAE inválido.'); return }
    if (mfeR !== '' && isNaN(mfeN as number)) { setError('MFE inválido.'); return }

    setLoading(true)
    const rFinal = RESULTADO_CONFIG[resultado]?.r ?? 0
    const nowIso = new Date().toISOString()

    const { data, error: upErr } = await supabase
      .from('trades')
      .update({
        resultado,
        r_obtenido: rFinal,
        mae_r: maeN,
        mfe_r: mfeN,
        tiempo_hasta_cierre_min: minutosTranscurridos,
        leccion_aprendida: leccion,
        trade_cerrado: true,
        fecha_cierre: nowIso,
      })
      .eq('id', trade.id)
      .select()
      .single()

    setLoading(false)
    if (upErr) { setError(upErr.message); return }
    onSaved(data as Trade)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20,
    }}>
      <div style={{
        backgroundColor: S.card, border: `1px solid ${S.muted}`,
        borderRadius: 16, padding: 24, maxWidth: 520, width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: S.t1, margin: 0 }}>
            Cerrar trade · {trade.activo}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: S.t3, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 12, color: S.t3, marginBottom: 20 }}>
          Registrá MAE, MFE y la lección para que Tefa pueda analizar tu edge real.
        </p>

        <div style={{ marginBottom: 16 }}>
          <Label>Resultado final</Label>
          <div style={{ display: 'flex', gap: 8 }}>
            {Object.entries(RESULTADO_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setResultado(key)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: resultado === key ? `${cfg.color}20` : 'transparent',
                  color: resultado === key ? cfg.color : S.t3,
                  border: `1px solid ${resultado === key ? cfg.color + '60' : S.muted}`,
                }}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <Input
            label="MAE (en R)"
            type="number"
            value={maeR}
            onChange={setMaeR}
            placeholder="-0.6"
            hint="máx. en contra"
          />
          <Input
            label="MFE (en R)"
            type="number"
            value={mfeR}
            onChange={setMfeR}
            placeholder="1.8"
            hint="máx. a favor"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Label>Tiempo en trade</Label>
            <span style={{ fontSize: 12, color: S.accent }}>
              {minutosTranscurridos} min (auto)
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Label>Lección aprendida</Label>
          <Textarea
            value={leccion}
            onChange={setLeccion}
            placeholder="¿Qué aprendiste? ¿Qué harías diferente? ¿Qué hiciste bien?"
            minChars={MIN_LECCION}
            rows={4}
          />
        </div>

        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, backgroundColor: '#f8717115', color: S.red, fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10,
              backgroundColor: 'transparent', color: S.t2,
              border: `1px solid ${S.muted}`, cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={loading}
            style={{
              flex: 2, padding: '12px 0', borderRadius: 10,
              backgroundColor: S.accent, color: '#fff', border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Guardando...' : 'Cerrar y guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
