'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/DashboardClient.tsx — Dashboard rediseñado (Iteración 1.5)
// ─────────────────────────────────────────────────────────────────────────
// Migrado al sistema de diseño ORZ Professional:
//   • PageHeader, Card, StatCard, Badge, EmptyState (components/ui/*)
//   • Recharts con chart-theme (dark Bloomberg-style)
//   • Mantiene 4 filas: Estado hoy / Rendimiento / Inteligencia / Charts
// ─────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import {
  Activity, TrendingUp, Target, Flame, Lock, Sparkles, AlertTriangle,
  CheckCircle2, BarChart3,
} from 'lucide-react'
import {
  statsByTrigger, statsBySession, statsByEmotion, statsByDayOfWeek,
  detectDangerousPatterns,
} from '@/lib/analytics'
import type { Trade, TraderStats, DangerAlert } from '@/types/trading'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import {
  chartTheme, axisProps, gridProps, tooltipStyle, tooltipLabelStyle, tooltipItemStyle,
} from '@/components/ui/chart-theme'

const MIN_TRADES_FOR_AI = 10

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

  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Dashboard"
        subtitle={
          <span style={{ textTransform: 'capitalize' }}>
            {hoy} · {totalClosed} trades cerrados en tu histórico
          </span>
        }
        action={
          <Link href="/sesion">
            <Button variant="primary" size="sm" icon={<Activity size={14} />}>
              Nueva sesión
            </Button>
          </Link>
        }
      />

      {totalClosed === 0 ? (
        <EmptyState
          icon={<BarChart3 size={28} />}
          title="Aún no hay trades cerrados"
          description={
            <>
              Registra tu primer trade en <Link href="/sesion" style={{ color: 'var(--accent-primary)' }}>Sesión</Link>{' '}
              o valida un setup en <Link href="/validar" style={{ color: 'var(--accent-primary)' }}>Validar</Link> para empezar.
            </>
          }
          action={
            <Link href="/sesion">
              <Button variant="primary">Ir a sesión</Button>
            </Link>
          }
          size="lg"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <Fila1 trades={trades} briefing={briefing} />
          <Fila2 stats={stats} trades={trades} />
          <Fila3 trades={trades} alerts={alerts} enoughData={totalClosed >= MIN_TRADES_FOR_AI} />
          <Fila4 trades={trades} />
        </div>
      )}
    </div>
  )
}

// ─── FILA 1: Estado hoy ──────────────────────────────────────────────────

function Fila1({ trades, briefing }: { trades: Trade[]; briefing: Props['briefing'] }) {
  const hoy = new Date().toISOString().slice(0, 10)
  const tradesHoy = trades.filter((t) => t.created_at.slice(0, 10) === hoy && t.resultado !== null)
  const rHoy = tradesHoy.reduce((a, t) => a + (t.r_obtenido ?? 0), 0)
  const lossesHoy = tradesHoy.filter((t) => t.resultado === 'Loss').length

  const lastTrade = trades[0]
  const ultimaEmocion = lastTrade?.emocion ?? null
  const emocionPeligrosa =
    ultimaEmocion === 'Revanchista' || ultimaEmocion === 'Frustrado' || ultimaEmocion === 'Eufórico'

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

  let riesgoTexto = '1R estándar'
  let riesgoVariant: 'default' | 'profit' | 'loss' | 'neutral' = 'default'
  if (rHoy <= -3) { riesgoTexto = 'Pausado';      riesgoVariant = 'loss' }
  else if (lossesHoy >= 2 || rHoy <= -2) { riesgoTexto = '0.5R reducido'; riesgoVariant = 'neutral' }

  return (
    <div className="grid-dashboard">
      {/* ¿Puedo operar? */}
      <Card>
        <div className="stat-row">
          <span className="stat-label">¿Puedo operar hoy?</span>
          <Semaforo color={semaforo} />
        </div>
        <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>
          {semaforo === 'green' ? 'Verde' : semaforo === 'yellow' ? 'Amarillo' : 'Rojo'}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
          {semaforoTexto}
        </div>
        <div className="divider" style={{ margin: '14px 0 12px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          <span>Trades hoy: <b className="tabular-num" style={{ color: 'var(--text-secondary)' }}>{tradesHoy.length}</b></span>
          <span>
            R hoy:{' '}
            <b className="tabular-num" style={{ color: rHoy >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
              {rHoy >= 0 ? '+' : ''}{rHoy.toFixed(2)}R
            </b>
          </span>
        </div>
      </Card>

      {/* Riesgo permitido */}
      <StatCard
        label="Riesgo permitido hoy"
        value={riesgoTexto}
        variant={riesgoVariant}
        size="sm"
        icon={<Target size={16} />}
        hint={
          riesgoTexto === 'Pausado'
            ? 'DD diario excedido. Día cerrado para proteger capital.'
            : riesgoTexto.startsWith('0.5')
              ? 'Recuperación mode — mitad de riesgo hasta recomponer.'
              : 'Sin restricciones. Respetá tu plan.'
        }
      />

      {/* Sesgo del día */}
      <Card>
        <div className="stat-row">
          <span className="stat-label">Sesgo del día</span>
        </div>
        {briefing ? (
          <>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <SesgoPill label="NAS100" value={briefing.sesgo_nas100 ?? '—'} />
              <SesgoPill label="XAUUSD" value={briefing.sesgo_xauusd ?? '—'} />
            </div>
            {briefing.condicion && (
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 12 }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Condición: </span>
                {briefing.condicion}
              </div>
            )}
            <Link href="/briefing" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', marginTop: 12, display: 'inline-block' }}>
              Ver briefing completo →
            </Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 12 }}>
              Sin briefing generado hoy
            </div>
            <Link href="/briefing" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-primary)', marginTop: 10, display: 'inline-block' }}>
              Generar briefing →
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}

function Semaforo({ color }: { color: 'green' | 'yellow' | 'red' }) {
  const c = color === 'green' ? 'var(--profit)' : color === 'yellow' ? 'var(--neutral)' : 'var(--loss)'
  const glow = color === 'green' ? 'rgba(0,230,118,0.3)' : color === 'yellow' ? 'rgba(251,191,36,0.3)' : 'rgba(255,59,74,0.3)'
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%',
      background: c, boxShadow: `0 0 16px ${glow}`,
    }} />
  )
}

function SesgoPill({ label, value }: { label: string; value: string }) {
  const v = value.toLowerCase()
  const variant: 'profit' | 'loss' | 'default' =
    v.includes('alcista') || v.includes('long') ? 'profit'
    : v.includes('bajista') || v.includes('short') ? 'loss'
    : 'default'
  return (
    <div style={{
      flex: 1, minWidth: 110,
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-elevated)',
    }}>
      <div className="stat-label" style={{ fontSize: 10 }}>{label}</div>
      <div style={{ marginTop: 4 }}>
        <Badge variant={variant} size="md">{value}</Badge>
      </div>
    </div>
  )
}

// ─── FILA 2: Rendimiento ─────────────────────────────────────────────────

function Fila2({ stats, trades }: { stats: TraderStats | null; trades: Trade[] }) {
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

  const mesActual = new Date().toISOString().slice(0, 7)
  const tradesMes = cerrados.filter((t) => t.created_at.slice(0, 7) === mesActual)
  const rMes = tradesMes.reduce((a, t) => a + (t.r_obtenido ?? 0), 0)

  return (
    <div className="grid-dashboard">
      <StatCard
        label="Win Rate · 30d"
        value={wr30 !== null ? `${wr30.toFixed(1)}%` : '—'}
        size="sm"
        icon={<Target size={16} />}
        delta={delta !== null ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts vs anterior` : last30.length > 0 ? `${last30.length} trades` : 'sin datos'}
        trend={delta === null ? 'flat' : delta >= 0 ? 'up' : 'down'}
        hint={`${last30.length} trades en ventana`}
      />
      <StatCard
        label="Profit Factor"
        value={stats?.profit_factor != null ? stats.profit_factor.toFixed(2) : '∞'}
        size="sm"
        icon={<TrendingUp size={16} />}
        variant={stats?.profit_factor != null && stats.profit_factor > 1.5 ? 'profit' : 'default'}
        delta={
          stats?.profit_factor != null && stats.profit_factor > 1.5
            ? '✓ saludable'
            : stats?.profit_factor != null
              ? 'debajo de 1.5'
              : 'sin pérdidas'
        }
        trend={stats?.profit_factor != null && stats.profit_factor > 1.5 ? 'up' : 'flat'}
      />
      <StatCard
        label={`R · ${new Date().toLocaleDateString('es-ES', { month: 'long' })}`}
        value={`${rMes >= 0 ? '+' : ''}${rMes.toFixed(2)}R`}
        variant={rMes >= 0 ? 'profit' : 'loss'}
        size="sm"
        icon={<Activity size={16} />}
        hint={`${tradesMes.length} trades este mes`}
      />
      <StatCard
        label="Racha actual"
        value={
          stats?.current_streak
            ? `${stats.current_streak > 0 ? '+' : ''}${stats.current_streak}`
            : '0'
        }
        variant={
          stats?.current_streak && stats.current_streak > 0 ? 'profit'
          : stats?.current_streak && stats.current_streak < 0 ? 'loss'
          : 'default'
        }
        size="sm"
        icon={<Flame size={16} />}
        delta={stats ? `Mejor: ${stats.best_streak}W · Peor: ${stats.worst_streak}L` : null}
        hint={
          stats?.current_streak && stats.current_streak > 0 ? 'wins consecutivos'
          : stats?.current_streak && stats.current_streak < 0 ? 'losses consecutivos'
          : 'sin racha activa'
        }
      />
    </div>
  )
}

// ─── FILA 3: Inteligencia ────────────────────────────────────────────────

function Fila3({
  trades, alerts, enoughData,
}: { trades: Trade[]; alerts: DangerAlert[]; enoughData: boolean }) {
  if (!enoughData) {
    return (
      <EmptyState
        icon={<Lock size={28} />}
        title={`Registra ${MIN_TRADES_FOR_AI} trades para desbloquear insights de IA`}
        description="Tefa necesita una muestra mínima para detectar patrones confiables. Seguí cargando trades en sesión."
      />
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
    <div className="grid-dashboard">
      {/* Insights */}
      <Card>
        <div className="stat-row">
          <span className="stat-label">Insights de Tefa</span>
          <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
        </div>
        {topAlerts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {topAlerts.map((a) => <AlertItem key={a.code} alert={a} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 8 }}>
            <CheckCircle2 size={16} style={{ color: 'var(--profit)' }} />
            Sin patrones peligrosos detectados. Seguí así.
          </div>
        )}
      </Card>

      {/* Mejor setup */}
      <Card>
        <div className="stat-row">
          <span className="stat-label">Tu mejor setup</span>
          <TrendingUp size={16} style={{ color: 'var(--profit)' }} />
        </div>
        {bestTrigger && bestSession ? (
          <>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
              {bestTrigger.segment}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
              en sesión <b style={{ color: 'var(--text-primary)' }}>{bestSession.segment}</b>
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
              <Stat label="WR trigger" value={`${bestTrigger.win_rate.toFixed(1)}%`} color="var(--profit)" />
              <Stat label="WR sesión" value={`${bestSession.win_rate.toFixed(1)}%`} color="var(--profit)" />
              <Stat label="Promedio" value={`${bestTrigger.avg_r >= 0 ? '+' : ''}${bestTrigger.avg_r.toFixed(2)}R`} />
            </div>
          </>
        ) : (
          <div style={{ marginTop: 14, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Muestra insuficiente por segmento.
          </div>
        )}
      </Card>

      {/* Punto débil */}
      <Card>
        <div className="stat-row">
          <span className="stat-label">Tu punto débil</span>
          <AlertTriangle size={16} style={{ color: 'var(--loss)' }} />
        </div>
        {worstPattern && worstPattern.total >= 3 ? (
          <>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--loss)', marginTop: 4 }}>
              {worstPattern.segment}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
              {worstPattern.total} trades · {worstPattern.wins}W / {worstPattern.losses}L
            </div>
            <div style={{ display: 'flex', gap: 18, marginTop: 14, flexWrap: 'wrap' }}>
              <Stat label="WR" value={`${worstPattern.win_rate.toFixed(1)}%`} color="var(--loss)" />
              <Stat label="Promedio" value={`${worstPattern.avg_r >= 0 ? '+' : ''}${worstPattern.avg_r.toFixed(2)}R`} color="var(--loss)" />
              <Stat label="Total" value={`${worstPattern.total_r >= 0 ? '+' : ''}${worstPattern.total_r.toFixed(1)}R`} color={worstPattern.total_r >= 0 ? 'var(--profit)' : 'var(--loss)'} />
            </div>
          </>
        ) : (
          <div style={{ marginTop: 14, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Sin muestra suficiente para detectar patrón.
          </div>
        )}
      </Card>
    </div>
  )
}

function AlertItem({ alert }: { alert: DangerAlert }) {
  const variant = alert.severity === 'critical' ? 'loss' : alert.severity === 'warning' ? 'neutral' : 'info'
  const colorVar = alert.severity === 'critical' ? 'var(--loss)' : alert.severity === 'warning' ? 'var(--neutral)' : 'var(--info)'
  return (
    <div style={{
      padding: '10px 12px',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${colorVar}33`,
      background: `${colorVar}0A`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Badge variant={variant} size="sm">{alert.severity}</Badge>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: colorVar }}>{alert.title}</div>
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{alert.detail}</div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="stat-label" style={{ fontSize: 10 }}>{label}</div>
      <div className="tabular-num" style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: color ?? 'var(--text-primary)', marginTop: 4 }}>
        {value}
      </div>
    </div>
  )
}

// ─── FILA 4: Gráficas ────────────────────────────────────────────────────

function Fila4({ trades }: { trades: Trade[] }) {
  const cerrados = trades
    .filter((t) => t.resultado !== null && t.r_obtenido !== null)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  let acc = 0
  const equityData = cerrados.map((t, i) => {
    acc += t.r_obtenido ?? 0
    return { n: i + 1, r: parseFloat(acc.toFixed(2)) }
  })

  const dayStats = statsByDayOfWeek(trades).filter((s) => s.total > 0)
  const dayData = dayStats.map((s) => ({
    dia: s.segment.slice(0, 3),
    wr: parseFloat(s.win_rate.toFixed(1)),
    trades: s.total,
  }))

  const triggerStats = statsByTrigger(trades).filter((s) => s.total > 0)
  const triggerData = triggerStats.map((s) => ({
    trigger: s.segment.split(' ')[0],
    wins: s.wins,
    losses: s.losses,
    breakevens: s.breakevens,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <Card>
        <div className="stat-row">
          <span className="stat-label">Equity curve · R acumulado</span>
        </div>
        {equityData.length > 0 ? (
          <div style={{ height: 280, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={equityData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="n" {...axisProps} />
                <YAxis {...axisProps} />
                <ReferenceLine y={0} stroke={chartTheme.colors.axis} strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(v) => {
                    const n = Number(v)
                    return [`${n >= 0 ? '+' : ''}${n}R`, 'Acumulado']
                  }}
                  labelFormatter={(n) => `Trade #${n}`}
                />
                <Line
                  type="monotone"
                  dataKey="r"
                  stroke={chartTheme.colors.accent}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: chartTheme.colors.accent }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart />
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
        <Card>
          <div className="stat-row">
            <span className="stat-label">Win rate por día de la semana</span>
          </div>
          {dayData.length > 0 ? (
            <div style={{ height: 240, marginTop: 12 }}>
              <ResponsiveContainer>
                <BarChart data={dayData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="dia" {...axisProps} />
                  <YAxis {...axisProps} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    formatter={(v, _k, item) => {
                      const t = (item as { payload?: { trades?: number } })?.payload?.trades ?? 0
                      return [`${v}% (${t} trades)`, 'WR']
                    }}
                  />
                  <Bar dataKey="wr" fill={chartTheme.colors.accent} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </Card>

        <Card>
          <div className="stat-row">
            <span className="stat-label">Resultados por trigger</span>
          </div>
          {triggerData.length > 0 ? (
            <div style={{ height: 240, marginTop: 12 }}>
              <ResponsiveContainer>
                <BarChart data={triggerData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="trigger" {...axisProps} />
                  <YAxis {...axisProps} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="wins"       stackId="a" fill={chartTheme.colors.profit} />
                  <Bar dataKey="breakevens" stackId="a" fill={chartTheme.colors.textMuted} />
                  <Bar dataKey="losses"     stackId="a" fill={chartTheme.colors.loss} radius={[6, 6, 0, 0]} />
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
    <div style={{
      height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)',
    }}>
      Sin datos suficientes
    </div>
  )
}
