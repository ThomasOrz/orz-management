/*
  SQL — ejecutar en Supabase si la tabla 'trades' no existe:

  CREATE TABLE IF NOT EXISTS trades (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Contexto pre-trade
    activo              TEXT        NOT NULL CHECK (activo IN ('XAUUSD', 'NAS100')),
    sesion              TEXT        NOT NULL CHECK (sesion IN ('Londres', 'Nueva York', 'Overlap')),
    fecha_entrada       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    zona_diario         TEXT        NOT NULL CHECK (zona_diario IN ('Baja', 'Media', 'Alta')),
    zona_h4             TEXT        NOT NULL CHECK (zona_h4 IN ('Baja', 'Media', 'Alta')),
    sesgo               TEXT        NOT NULL CHECK (sesgo IN ('Alcista', 'Bajista')),

    -- Setup
    tipo_vela           TEXT        NOT NULL CHECK (tipo_vela IN ('V85 alcista', 'V85 bajista')),
    trigger             TEXT        NOT NULL CHECK (trigger IN ('T1 (V85+V50)', 'T2 (V85)', 'T3 (V85+EMAs)', 'Acumulación')),
    t1_fallido_previo   BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Gestión
    precio_entrada      NUMERIC     NOT NULL,
    stop_loss           NUMERIC     NOT NULL,
    take_profit         NUMERIC     NOT NULL,
    resultado           TEXT        CHECK (resultado IN ('Win', 'Loss', 'Breakeven')),
    r_obtenido          NUMERIC,

    -- Disciplina
    siguio_reglas       BOOLEAN     NOT NULL DEFAULT TRUE,
    regla_rota          TEXT,
    emocion             TEXT        NOT NULL CHECK (emocion IN ('Tranquilo', 'Ansioso', 'Revanchista', 'Sobreconfiado', 'Con miedo')),
    notas               TEXT,

    created_at          TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can manage own trades"
    ON trades FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
*/

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import TradingViewMiniChart from '@/components/TradingViewMiniChart'

const TV_SYMBOL: Record<string, string> = {
  NAS100: 'OANDA:NAS100USD',
  XAUUSD: 'OANDA:XAUUSD',
}

// ── Tipos ─────────────────────────────────────────────────────────────────

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
}

interface Props {
  userId: string
  initialTrades: Trade[]
}

// ── Constantes ────────────────────────────────────────────────────────────

type Zona = 'Baja' | 'Media' | 'Alta'
type Sesgo = 'Alcista' | 'Bajista'

const TRIGGERS = ['T1 (V85+V50)', 'T2 (V85)', 'T3 (V85+EMAs)', 'Acumulación'] as const

const EMOCIONES: { value: string; color: string }[] = [
  { value: 'Tranquilo',      color: '#4ade80' },
  { value: 'Ansioso',        color: '#fbbf24' },
  { value: 'Revanchista',    color: '#f87171' },
  { value: 'Sobreconfiado',  color: '#fb923c' },
  { value: 'Con miedo',      color: '#a78bfa' },
]

const RESULTADO_CONFIG: Record<string, { label: string; color: string; r: number }> = {
  Win:       { label: 'Win',       color: '#4ade80', r:  2 },
  Loss:      { label: 'Loss',      color: '#f87171', r: -1 },
  Breakeven: { label: 'Breakeven', color: '#fbbf24', r:  0 },
}

// ── Lógica de matriz sesgo ─────────────────────────────────────────────

function getSesgoSugerido(diario: Zona, h4: Zona): Sesgo {
  if (diario === 'Alta') return 'Alcista'
  if (diario === 'Baja') return 'Bajista'
  // Media: H4 decide
  return h4 === 'Baja' ? 'Bajista' : 'Alcista'
}

// ── Helpers visuales ───────────────────────────────────────────────────

const S = {
  bg:      '#0A0A0A',
  card:    '#111111',
  border:  'rgba(255,255,255,0.031)',
  accent:  '#1A9BD7',
  accentBg:'rgba(26,155,215,0.082)',
  muted:   '#1E1E1E',
  t1:      '#FFFFFF',
  t2:      '#999999',
  t3:      '#666666',
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: S.accent, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </p>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: S.t3, fontSize: 12, fontWeight: 500, marginBottom: 6 }}>{children}</p>
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

// ── Componente principal ───────────────────────────────────────────────

export default function SesionClient({ userId, initialTrades }: Props) {
  const supabase = createClient()
  const [trades, setTrades] = useState<Trade[]>(initialTrades)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // ── Estado del formulario ──────────────────────────────────────────

  // Contexto
  const [activo, setActivo]         = useState<'XAUUSD' | 'NAS100'>('NAS100')
  const [sesion, setSesion]         = useState<string>('Nueva York')
  const [fechaEntrada, setFechaEntrada] = useState<string>(
    new Date().toISOString().slice(0, 16)
  )
  const [zonaDiario, setZonaDiario] = useState<Zona>('Alta')
  const [zonaH4, setZonaH4]         = useState<Zona>('Alta')
  const [sesgo, setSesgo]           = useState<Sesgo>('Alcista')
  const [sesgoManual, setSesgoManual] = useState(false)

  // Setup
  const [tipoVela, setTipoVela]     = useState<string>('V85 alcista')
  const [trigger, setTrigger]       = useState<string>('T2 (V85)')
  const [t1Fallido, setT1Fallido]   = useState(false)

  // Gestión
  const [entrada, setEntrada]       = useState('')
  const [sl, setSl]                 = useState('')
  const [tp, setTp]                 = useState('')
  const [resultado, setResultado]   = useState<string>('')
  const [rObtenido, setRObtenido]   = useState<string>('')

  // Disciplina
  const [siguioReglas, setSiguioReglas] = useState(true)
  const [reglaRota, setReglaRota]   = useState('')
  const [emocion, setEmocion]       = useState('Tranquilo')
  const [notas, setNotas]           = useState('')

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  // ── Efectos reactivos ────────────────────────────────────────────

  // Auto-sugerir sesgo desde la matriz (solo si no fue editado manualmente)
  useEffect(() => {
    if (!sesgoManual) {
      setSesgo(getSesgoSugerido(zonaDiario, zonaH4))
    }
  }, [zonaDiario, zonaH4, sesgoManual])

  // Auto-alinear tipo de vela con sesgo
  useEffect(() => {
    setTipoVela(sesgo === 'Alcista' ? 'V85 alcista' : 'V85 bajista')
  }, [sesgo])

  // Si T1 fallido → cambiar trigger si era T1
  useEffect(() => {
    if (t1Fallido && trigger === 'T1 (V85+V50)') {
      setTrigger('T2 (V85)')
    }
  }, [t1Fallido, trigger])

  // Auto-calcular TP con RR 1:2
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

  // Auto-calcular R obtenido según resultado
  useEffect(() => {
    if (resultado && RESULTADO_CONFIG[resultado]) {
      setRObtenido(String(RESULTADO_CONFIG[resultado].r))
    } else {
      setRObtenido('')
    }
  }, [resultado])

  // ── Submit ───────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    const precioEntradaN = parseFloat(entrada)
    const stopLossN      = parseFloat(sl)
    const takeProfitN    = parseFloat(tp)

    if (isNaN(precioEntradaN) || isNaN(stopLossN) || isNaN(takeProfitN)) {
      setError('Verifica los precios — deben ser números válidos.')
      setLoading(false)
      return
    }

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
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
    } else {
      setTrades(prev => [data, ...prev])
      // Reset gestión y disciplina (mantener contexto/setup para trades seguidos)
      setEntrada('')
      setSl('')
      setTp('')
      setResultado('')
      setRObtenido('')
      setSiguioReglas(true)
      setReglaRota('')
      setNotas('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setLoading(false)
  }

  // ── Render ───────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    backgroundColor: S.card,
    border: `1px solid ${S.border}`,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  }

  const dividerStyle: React.CSSProperties = {
    borderBottom: `1px solid ${S.muted}`,
    marginBottom: 20,
    paddingBottom: 20,
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: S.t1, margin: 0 }}>Sesión</h1>
          <p style={{ fontSize: 13, color: S.t3, marginTop: 4, textTransform: 'capitalize' }}>{today}</p>
        </div>
        <div style={{ padding: '6px 14px', borderRadius: 10, backgroundColor: S.accentBg, color: S.accent, fontSize: 13, fontWeight: 600 }}>
          {trades.length} trade{trades.length !== 1 ? 's' : ''} hoy
        </div>
      </div>

      <form onSubmit={handleSubmit}>

        {/* ── SECCIÓN 1: Contexto Pre-Trade ── */}
        <div style={cardStyle}>
          <SectionHeader>Contexto Pre-Trade</SectionHeader>

          <div style={{ ...dividerStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

          <div style={{ ...dividerStyle }}>
            <Input
              label="Fecha y hora de entrada"
              type="datetime-local"
              value={fechaEntrada}
              onChange={setFechaEntrada}
            />
          </div>

          <div style={{ ...dividerStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Label>Sesgo resultante</Label>
              {!sesgoManual && (
                <span style={{ fontSize: 10, color: S.t3, backgroundColor: S.muted, padding: '2px 8px', borderRadius: 4 }}>
                  auto
                </span>
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
        </div>

        {/* ── Mini Chart del activo seleccionado ── */}
        <div
          key={activo}
          style={{
            backgroundColor: '#111111',
            border: 'rgba(255,255,255,0.031) 1px solid',
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          <div style={{ padding: '10px 16px 0', fontSize: 11, fontWeight: 600, color: '#1A9BD7', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {activo} — Sesión actual
          </div>
          <TradingViewMiniChart
            key={activo}
            symbol={TV_SYMBOL[activo] ?? 'OANDA:NAS100USD'}
            height={220}
            dateRange="1D"
          />
        </div>

        {/* ── SECCIÓN 2: Setup ── */}
        <div style={cardStyle}>
          <SectionHeader>Setup</SectionHeader>

          <div style={{ ...dividerStyle }}>
            <Label>Tipo de vela</Label>
            <ToggleGroup
              options={[{ value: 'V85 alcista' }, { value: 'V85 bajista' }]}
              value={tipoVela}
              onChange={setTipoVela}
            />
          </div>

          <div style={{ ...dividerStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Label>¿Hubo T1 fallido previo?</Label>
              <button
                type="button"
                onClick={() => setT1Fallido(p => !p)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  backgroundColor: t1Fallido ? S.accent : S.muted,
                  position: 'relative', transition: 'background-color 0.2s',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: t1Fallido ? 23 : 3,
                  width: 18, height: 18, borderRadius: 9,
                  backgroundColor: '#fff', transition: 'left 0.2s',
                }} />
              </button>
            </div>
            {t1Fallido && (
              <p style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>
                T1 bloqueado — ya hubo un intento fallido en esta zona
              </p>
            )}
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
        </div>

        {/* ── SECCIÓN 3: Gestión ── */}
        <div style={cardStyle}>
          <SectionHeader>Gestión</SectionHeader>

          <div style={{ ...dividerStyle, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <Input label="Precio entrada" value={entrada} onChange={setEntrada} type="number" placeholder="0.00" />
            <Input label="Stop Loss" value={sl} onChange={setSl} type="number" placeholder="0.00" />
            <Input label="Take Profit" value={tp} onChange={setTp} type="number" placeholder="0.00" hint="1:2 auto" />
          </div>

          <div style={{ ...dividerStyle }}>
            <Label>Resultado</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(RESULTADO_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setResultado(key)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: resultado === key ? `${cfg.color}18` : 'transparent',
                    color: resultado === key ? cfg.color : S.t3,
                    border: `1px solid ${resultado === key ? cfg.color + '50' : S.muted}`,
                    transition: 'all 0.12s',
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: S.t2 }}>R obtenido:</span>
            <span style={{
              fontSize: 18, fontWeight: 700,
              color: rObtenido === ''
                ? S.t3
                : parseFloat(rObtenido) > 0 ? '#4ade80'
                : parseFloat(rObtenido) < 0 ? '#f87171'
                : '#fbbf24',
            }}>
              {rObtenido === '' ? '—' : parseFloat(rObtenido) > 0 ? `+${rObtenido}R` : `${rObtenido}R`}
            </span>
          </div>
        </div>

        {/* ── SECCIÓN 4: Disciplina ── */}
        <div style={cardStyle}>
          <SectionHeader>Disciplina</SectionHeader>

          <div style={{ ...dividerStyle }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Label>¿Siguió todas las reglas?</Label>
              <button
                type="button"
                onClick={() => setSiguioReglas(p => !p)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                  backgroundColor: siguioReglas ? '#4ade8080' : '#f8717180',
                  position: 'relative', transition: 'background-color 0.2s',
                  flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: siguioReglas ? 23 : 3,
                  width: 18, height: 18, borderRadius: 9,
                  backgroundColor: '#fff', transition: 'left 0.2s',
                }} />
              </button>
            </div>
            <p style={{ fontSize: 12, color: siguioReglas ? '#4ade80' : '#f87171', marginTop: 6 }}>
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

          <div style={{ ...dividerStyle }}>
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
                    transition: 'all 0.12s',
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
                color: S.t1, resize: 'none', outline: 'none', fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Feedback + Submit */}
        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, backgroundColor: '#f8717115', color: '#f87171', fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, backgroundColor: '#4ade8015', color: '#4ade80', fontSize: 13 }}>
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
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? 'Registrando...' : 'Registrar trade'}
        </button>
      </form>

      {/* ── Lista de trades del día ── */}
      {trades.length > 0 ? (
        <div style={{ ...cardStyle, marginBottom: 0 }}>
          <SectionHeader>Trades del día</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trades.map((t, i) => {
              const rCfg = t.resultado ? RESULTADO_CONFIG[t.resultado] : null
              const emojiEm = EMOCIONES.find(e => e.value === t.emocion)
              return (
                <div
                  key={t.id}
                  style={{
                    padding: '14px 16px', borderRadius: 12,
                    backgroundColor: S.bg, border: `1px solid ${S.muted}`,
                  }}
                >
                  {/* Fila superior */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: S.t3, fontFamily: 'monospace' }}>#{i + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: S.t1 }}>{t.activo}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        backgroundColor: t.sesgo === 'Alcista' ? '#4ade8015' : '#f8717115',
                        color: t.sesgo === 'Alcista' ? '#4ade80' : '#f87171',
                      }}>
                        {t.sesgo}
                      </span>
                      <span style={{ fontSize: 11, color: S.t3 }}>{t.trigger}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {rCfg && (
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                          backgroundColor: `${rCfg.color}15`, color: rCfg.color,
                        }}>
                          {rCfg.label} {rCfg.r > 0 ? `+${rCfg.r}R` : rCfg.r < 0 ? `${rCfg.r}R` : '0R'}
                        </span>
                      )}
                      {!t.siguio_reglas && (
                        <span style={{ fontSize: 11, color: '#f87171' }}>⚠ regla rota</span>
                      )}
                    </div>
                  </div>
                  {/* Fila inferior */}
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: S.t3 }}>
                    <span>E: {t.precio_entrada}</span>
                    <span>SL: {t.stop_loss}</span>
                    <span>TP: {t.take_profit}</span>
                    <span style={{ marginLeft: 'auto', color: emojiEm?.color ?? S.t3 }}>{t.emocion}</span>
                  </div>
                  {t.notas && (
                    <p style={{ fontSize: 12, color: S.t3, marginTop: 8, fontStyle: 'italic' }}>{t.notas}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40, marginBottom: 0 }}>
          <p style={{ color: S.t3, fontSize: 13 }}>No hay trades registrados hoy.</p>
        </div>
      )}
    </div>
  )
}
