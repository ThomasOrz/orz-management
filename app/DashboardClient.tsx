'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/DashboardClient.tsx — UI del Dashboard (Fase 4)
// ─────────────────────────────────────────────────────────────────────────
// 4 filas:
//   FILA 1 · Estado hoy     (¿Puedo operar? / Riesgo / Sesgo)
//   FILA 2 · Rendimiento    (WR30d / PF / R mes / Racha)
//   FILA 3 · Inteligencia   (Insights Tefa / Mejor setup / Punto débil)
//   FILA 4 · Gráficas       (Equity / WR día semana / Dist. trigger)
// ─────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import {
  statsBySession,
  statsByTrigger,
  statsByEmotion,
  statsByDayOfWeek,
  disciplineScore,
  detectDangerousPatterns,
} from '@/lib/analytics'
import type { Trade, TraderStats, DangerAlert, SegmentStats } from '@/types/trading'

const ACCENT = '#1A9BD7'
const GREEN  = '#22c55e'
const YELLOW = '#eab308'
const RED    = '#ef4444'
const MIN_TRADES_FOR_AI = 10

// ─────────────────────────────────────────────────────────────────────────

interface Props {
  stats: TraderStats | null
  trades: Trade[]
  briefing: {
    condicion?: string | null
    sesgo_nas100?: string | null
    sesgo_xauusd?: string | null
    narrativa?: string | null
    plan_accion?: unknown
    fecha?: string | null
  } | null
  disciplineToday: { [k: string]: unknown } | null
  userEmail: string
}

export default function DashboardClient({ stats, trades, briefing }: Props) {
  const totalClosed = trades.filter((t) => t.resultado !== null).length
  const alerts = detectDangerousPatterns(trades)

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Header totalClosed={totalClosed} />

      {totalClosed === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Fila1 trades={trades} briefing={briefing} />
          <Fila2 stats={stats} trades={trades} />
          <Fila3 trades={trades} alerts={alerts} enoughData={totalClosed >= MIN_TRADES_FOR_AI} />
          <Fila4 trades={trades} />
        </>
      )}
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────

function Header({ totalClosed }: { totalClosed: number }) {
  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  return (
    <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: -0.5 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, margin: '4px 0 0', textTransform: 'capitalize' }}>{hoy}</p>
      </div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
        {totalClosed} trades cerrados en tu histórico
      </div>
    </div>
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
      <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>Sin trades aún</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
        Registra tu primer trade en la <Link href="/sesion" style={{ color: ACCENT }}>sesión</Link> o
        valida un setup en <Link href="/validar" style={{ color: ACCENT }}>Validar</Link> para empezar.
      </p>
    </div>
  )
}

// ─── FILA 1 ───────────────────────────────────────────────────────────────

function Fila1({ trades, briefing }: { trades: Trade[]; briefing: Props['briefing'] }) {
  const hoy = new Date().toISOString().slice(0, 10)
  const tradesHoy = trades.filter((t) => t.created_at.slice(0, 10) === hoy && t.resultado !== null)
  const rHoy = tradesHoy.reduce((a, t) => a + (t.r_obtenido ?? 0), 0)
  const lossesHoy = tradesHoy.filter((t) => t.resultado === 'Loss').length

  // Última emoción registrada
  const lastTrade = trades[0]
  const ultimaEmocion = lastTrade?.emocion ?? null
  const emocionPeligrosa = ultimaEmocion === 'Revanchista' || ultimaEmocion === 'Frustrado' || ultimaEmocion === 'Eufórico'

  // Semáforo
  let semaforo: 'green' | 'yellow' | 'red' = 'green'
  let semaforoTexto = 'Operar con normalidad'
  if (rHoy <= -3) {
    semaforo = 'red'
    semaforoTexto = `STOP — drawdown diario ${rHoy.toFixed(2)}R. Cerrá el día.`
  } else if (rHoy <= -2 || lossesHoy >= 2 || emocionPeligrosa) {
    semaforo = 'yellow'
    semaforoTexto = emocionPeligrosa
      ? `Precaución — última emoción: ${ultimaEmocion}`
      : `Precaución — ${lossesHoy} losses hoy (${rHoy.toFixed(2)}R)`
  }

  // Riesgo permitido hoy
  let riesgoTexto = '1R estándar por trade'
  if (rHoy <= -3) riesgoTexto = 'Pausado'
  else if (lossesHoy >= 2 || rHoy <= -2) riesgoTexto = '0.5R reducido'

  return (
    <Row>
      {/* ¿Puedo operar hoy? */}
      <Card>
        <CardLabel>¿Puedo operar hoy?</CardLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <Semaforo color={semaforo} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 600 }}>
              {semaforo === 'green' ? 'Verde' : semaforo === 'yellow' ? 'Amarillo' : 'Rojo'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {semaforoTexto}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-muted)', fontSize: 12, color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Trades hoy: <b style={{ color: 'var(--text-secondary)' }}>{tradesHoy.length}</b></span>
          <span>R hoy: <b style={{ color: rHoy >= 0 ? GREEN : RED }}>{rHoy >= 0 ? '+' : ''}{rHoy.toFixed(2)}R</b></span>
        </div>
      </Card>

      {/* Riesgo */}
      <Card>
        <CardLabel>Riesgo permitido hoy</CardLabel>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 14, color: riesgoTexto === 'Pausado' ? RED : riesgoTexto.startsWith('0.5') ? YELLOW : 'var(--text-primary)' }}>
          {riesgoTexto}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
          {riesgoTexto === 'Pausado'
            ? 'DD diario excedido. Día cerrado para proteger capital.'
            : riesgoTexto.startsWith('0.5')
              ? 'Recuperación mode — mitad de riesgo hasta recomponer.'
              : 'Sin restricciones. Respetá tu plan.'}
        </div>
      </Card>

      {/* Sesgo del día */}
      <Card>
        <CardLabel>Sesgo del día</CardLabel>
        {briefing ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <SesgoPill label="NAS100" value={briefing.sesgo_nas100 ?? '—'} />
              <SesgoPill label="XAUUSD" value={briefing.sesgo_xauusd ?? '—'} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {briefing.condicion && <span style={{ color: 'var(--text-tertiary)' }}>Condición: </span>}
              {briefing.condicion ?? 'Sin briefing hoy'}
            </div>
            <Link href="/briefing" style={{ fontSize: 12, color: ACCENT, marginTop: 10, display: 'inline-block' }}>
              Ver briefing completo →
            </Link>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Sin briefing generado hoy</div>
            <Link href="/briefing" style={{ fontSize: 12, color: ACCENT, marginTop: 10, display: 'inline-block' }}>
              Generar briefing →
            </Link>
          </div>
        )}
      </Card>
    </Row>
  )
}

function Semaforo({ color }: { color: 'green' | 'yellow' | 'red' }) {
  const c = color === 'green' ? GREEN : color === 'yellow' ? YELLOW : RED
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: `radial-gradient(circle at 30% 30%, ${c}, ${c}aa)`,
      boxShadow: `0 0 24px ${c}55`,
      flexShrink: 0,
    }} />
  )
}

function SesgoPill({ label, value }: { label: string; value: string }) {
  const v = value.toLowerCase()
  const color = v.includes('alcista') || v.includes('long') ? GREEN
              : v.includes('bajista') || v.includes('short') ? RED
              : 'var(--text-secondary)'
  return (
    <div style={{
      flex: 1,
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid var(--border-muted)',
      background: 'rgba(255,255,255,0.02)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color, marginTop: 2 }}>{value}</div>
    </div>
  )
}

// ─── FILA 2 ───────────────────────────────────────────────────────────────

function Fila2({ stats, trades }: { stats: TraderStats | null; trades: Trade[] }) {
  // WR 30 vs 30 previos
  const now = Date.now()
  const d30 = 30 * 24 * 3600 * 1000
  const cerrados = trades.filter((t) => t.resultado !== null)
  const wr = (arr: Trade[]) => {
    const decisivos = arr.filter((t) => t.resultado === 'Win' || t.resultado === 'Loss')
    if (decisivos.length === 0) return null
    const wins = decisivos.filter((t) => t.resultado === 'Win').length
    return (wins / decisivos.length) * 100
  }
  const last30 = cerrados.filter((t) => now - new Date(t.created_at).getTime() <= d30)
  const prev30 = cerrados.filter((t) => {
    const diff = now - new Date(t.created_at).getTime()
    return diff > d30 && diff <= 2 * d30
  })
  const wr30 = wr(last30)
  const wrPrev = wr(prev30)
  const delta = wr30 !== null && wrPrev !== null ? wr30 - wrPrev : null

  // R mes actual
  const mesActual = new Date().toISOString().slice(0, 7)
  const rMes = cerrados
    .filter((t) => t.created_at.slice(0, 7) === mesActual)
    .reduce((a, t) => a + (t.r_obtenido ?? 0), 0)

  return (
    <Row>
      <BigNumber
        label="Win Rate · últimos 30 días"
        value={wr30 !== null ? `${wr30.toFixed(1)}%` : '—'}
        sub={last30.length > 0 ? `${last30.length} trades` : 'sin datos'}
        delta={delta !== null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts vs anterior` : null}
        deltaColor={delta === null ? undefined : delta >= 0 ? GREEN : RED}
      />
      <BigNumber
        label="Profit Factor"
        value={stats?.profit_factor != null ? stats.profit_factor.toFixed(2) : '∞'}
        sub="Ganancia bruta / pérdida bruta"
        delta={stats?.profit_factor != null && stats.profit_factor > 1.5 ? '✓ saludable' : stats?.profit_factor != null ? 'debajo de 1.5' : null}
        deltaColor={stats?.profit_factor != null && stats.profit_factor > 1.5 ? GREEN : YELLOW}
      />
      <BigNumber
        label={`R acumulado · ${new Date().toLocaleDateString('es-ES', { month: 'long' })}`}
        value={`${rMes >= 0 ? '+' : ''}${rMes.toFixed(2)}R`}
        valueColor={rMes >= 0 ? GREEN : RED}
        sub={cerrados.filter((t) => t.created_at.slice(0, 7) === mesActual).length + ' trades este mes'}
      />
      <BigNumber
        label="Racha actual"
        value={
          stats?.current_streak
            ? `${stats.current_streak > 0 ? '+' : ''}${stats.current_streak}`
            : '0'
        }
        valueColor={stats?.current_streak && stats.current_streak > 0 ? GREEN : stats?.current_streak && stats.current_streak < 0 ? RED : undefined}
        sub={
          stats?.current_streak && stats.current_streak > 0 ? 'wins consecutivos'
          : stats?.current_streak && stats.current_streak < 0 ? 'losses consecutivos'
          : 'sin racha'
        }
        delta={stats ? `Mejor: ${stats.best_streak}W · Peor: ${stats.worst_streak}L` : null}
      />
    </Row>
  )
}

// ─── FILA 3 ───────────────────────────────────────────────────────────────

function Fila3({ trades, alerts, enoughData }: { trades: Trade[]; alerts: DangerAlert[]; enoughData: boolean }) {
  if (!enoughData) {
    return (
      <Row>
        <Card style={{ gridColumn: 'span 3' }}>
          <CardLabel>Inteligencia</CardLabel>
          <div style={{ marginTop: 16, padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Registra {MIN_TRADES_FOR_AI} trades para desbloquear insights de IA</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
              Tefa necesita muestra mínima para detectar patrones confiables.
            </div>
          </div>
        </Card>
      </Row>
    )
  }

  const triggers = statsByTrigger(trades).filter((s) => s.total >= 3)
  const sessions = statsBySession(trades).filter((s) => s.total >= 3)
  const emotions = statsByEmotion(trades).filter((s) => s.total >= 3)

  const bestTrigger = [...triggers].sort((a, b) => b.win_rate - a.win_rate)[0]
  const bestSession = [...sessions].sort((a, b) => b.win_rate - a.win_rate)[0]
  const worstPattern = [...emotions, ...triggers, ...sessions].sort((a, b) => a.avg_r - b.avg_r)[0]

  const topAlerts = alerts.slice(0, 3)

  return (
    <Row>
      {/* Insights */}
      <Card>
        <CardLabel>Insights de Tefa</CardLabel>
        {topAlerts.length > 0 ? (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topAlerts.map((a) => (
              <AlertItem key={a.code} alert={a} />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            ✓ Sin patrones peligrosos detectados. Seguí así.
          </div>
        )}
      </Card>

      {/* Mejor setup */}
      <Card>
        <CardLabel>Tu mejor setup</CardLabel>
        {bestTrigger && bestSession ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{bestTrigger.segment}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              en sesión <b>{bestSession.segment}</b>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 18 }}>
              <Stat label="WR trigger" value={`${bestTrigger.win_rate.toFixed(1)}%`} color={GREEN} />
              <Stat label="WR sesión" value={`${bestSession.win_rate.toFixed(1)}%`} color={GREEN} />
              <Stat label="Promedio" value={`${bestTrigger.avg_r >= 0 ? '+' : ''}${bestTrigger.avg_r.toFixed(2)}R`} />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            Muestra insuficiente por segmento.
          </div>
        )}
      </Card>

      {/* Punto débil */}
      <Card>
        <CardLabel>Tu punto débil</CardLabel>
        {worstPattern && worstPattern.total >= 3 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: RED }}>{worstPattern.segment}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {worstPattern.total} trades · {worstPattern.wins}W / {worstPattern.losses}L
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 18 }}>
              <Stat label="WR" value={`${worstPattern.win_rate.toFixed(1)}%`} color={RED} />
              <Stat label="Promedio" value={`${worstPattern.avg_r >= 0 ? '+' : ''}${worstPattern.avg_r.toFixed(2)}R`} color={RED} />
              <Stat label="Total" value={`${worstPattern.total_r >= 0 ? '+' : ''}${worstPattern.total_r.toFixed(1)}R`} color={worstPattern.total_r >= 0 ? GREEN : RED} />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            Sin muestra suficiente para detectar patrón.
          </div>
        )}
      </Card>
    </Row>
  )
}

function AlertItem({ alert }: { alert: DangerAlert }) {
  const color = alert.severity === 'critical' ? RED : alert.severity === 'warning' ? YELLOW : ACCENT
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 10,
      border: `1px solid ${color}33`,
      background: `${color}0A`,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{alert.title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 3, lineHeight: 1.45 }}>{alert.detail}</div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: color ?? 'var(--text-primary)', marginTop: 2 }}>{value}</div>
    </div>
  )
}

// ─── FILA 4 — Gráficas ────────────────────────────────────────────────────

function Fila4({ trades }: { trades: Trade[] }) {
  // Equity curve: R acumulado en orden cronológico
  const cerrados = trades
    .filter((t) => t.resultado !== null && t.r_obtenido !== null)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  let acc = 0
  const equityData = cerrados.map((t, i) => {
    acc += t.r_obtenido ?? 0
    return {
      n: i + 1,
      r: parseFloat(acc.toFixed(2)),
      fecha: t.created_at.slice(0, 10),
    }
  })

  // WR por día de semana
  const dayStats = statsByDayOfWeek(trades).filter((s) => s.total > 0)
  const dayData = dayStats.map((s) => ({
    dia: s.segment.slice(0, 3),
    wr: parseFloat(s.win_rate.toFixed(1)),
    trades: s.total,
  }))

  // Distribución por trigger
  const triggerStats = statsByTrigger(trades).filter((s) => s.total > 0)
  const triggerData = triggerStats.map((s) => ({
    trigger: s.segment.split(' ')[0],
    wins: s.wins,
    losses: s.losses,
    breakevens: s.breakevens,
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, marginBottom: 24 }}>
      {/* Equity full-width */}
      <Card>
        <CardLabel>Equity curve (R acumulado)</CardLabel>
        {equityData.length > 0 ? (
          <div style={{ height: 260, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={equityData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="n" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} />
                <ReferenceLine y={0} stroke="#333" strokeDasharray="2 2" />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#999' }}
                  formatter={(v) => {
                    const n = Number(v)
                    return [`${n >= 0 ? '+' : ''}${n}R`, 'Acumulado']
                  }}
                  labelFormatter={(n) => `Trade #${n}`}
                />
                <Line type="monotone" dataKey="r" stroke={ACCENT} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart />
        )}
      </Card>

      {/* Dos charts lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <Card>
          <CardLabel>Win rate por día de la semana</CardLabel>
          {dayData.length > 0 ? (
            <div style={{ height: 240, marginTop: 12 }}>
              <ResponsiveContainer>
                <BarChart data={dayData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="dia" stroke="#666" fontSize={11} />
                  <YAxis stroke="#666" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#999' }}
                    formatter={(v, _k, item) => {
                      const trades = (item as { payload?: { trades?: number } })?.payload?.trades ?? 0
                      return [`${v}% (${trades} trades)`, 'WR']
                    }}
                  />
                  <Bar dataKey="wr" fill={ACCENT} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </Card>

        <Card>
          <CardLabel>Resultados por trigger</CardLabel>
          {triggerData.length > 0 ? (
            <div style={{ height: 240, marginTop: 12 }}>
              <ResponsiveContainer>
                <BarChart data={triggerData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="trigger" stroke="#666" fontSize={11} />
                  <YAxis stroke="#666" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#999' }}
                  />
                  <Bar dataKey="wins" stackId="a" fill={GREEN} />
                  <Bar dataKey="breakevens" stackId="a" fill="#666" />
                  <Bar dataKey="losses" stackId="a" fill={RED} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </Card>
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
      Sin datos suficientes
    </div>
  )
}

// ─── Primitivas UI ────────────────────────────────────────────────────────

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: 16,
      marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="card" style={style}>{children}</div>
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      color: 'var(--text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: 600,
    }}>
      {children}
    </div>
  )
}

function BigNumber({
  label, value, sub, delta, deltaColor, valueColor,
}: {
  label: string
  value: string
  sub?: string
  delta?: string | null
  deltaColor?: string
  valueColor?: string
}) {
  return (
    <Card>
      <CardLabel>{label}</CardLabel>
      <div style={{
        fontSize: 32, fontWeight: 700, marginTop: 10, letterSpacing: -1,
        color: valueColor ?? 'var(--text-primary)',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>{sub}</div>}
      {delta && (
        <div style={{ fontSize: 11.5, color: deltaColor ?? 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>
          {delta}
        </div>
      )}
    </Card>
  )
}
