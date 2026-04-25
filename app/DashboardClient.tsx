'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/DashboardClient.tsx — Dashboard Híbrido ORZ (Iter 3)
// ─────────────────────────────────────────────────────────────────────────
// FILA 1 · 4 KpiCards compactos (Bloomberg)
// FILA 2 · StatCardLarge equity (2/3) + EdgeCallout (1/3)
// FILA 3 · ActivityHeatmap full
// FILA 4 · Insights de Tefa (3 cards limpias)
// ─────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import {
  Activity, Lock, Sparkles, AlertTriangle, CheckCircle2, TrendingUp, BarChart3,
} from 'lucide-react'
import {
  statsByTrigger, statsBySession, statsByEmotion, statsByZoneConfluence,
  detectDangerousPatterns,
} from '@/lib/analytics'
import type { Trade, TraderStats, DangerAlert } from '@/types/trading'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatCardLarge } from '@/components/ui/StatCardLarge'
import { ActivityHeatmap, type HeatmapDay } from '@/components/ui/ActivityHeatmap'
import { EdgeCallout } from '@/components/ui/EdgeCallout'

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

export default function DashboardClient({ stats, trades }: Props) {
  const cerrados = trades.filter((t) => t.resultado !== null && t.r_obtenido !== null)
  const totalClosed = cerrados.length
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
              Registra tu primer trade en{' '}
              <Link href="/sesion" style={{ color: 'var(--accent-primary)' }}>Sesión</Link>{' '}
              o valida un setup en{' '}
              <Link href="/validar" style={{ color: 'var(--accent-primary)' }}>Validar</Link> para empezar.
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
          <Fila1Kpis trades={trades} stats={stats} />
          <Fila2EquityEdge trades={trades} cerrados={cerrados} />
          <Fila3Heatmap cerrados={cerrados} />
          <Fila4Insights trades={trades} alerts={alerts} enoughData={totalClosed >= MIN_TRADES_FOR_AI} />
        </div>
      )}
    </div>
  )
}

// ─── FILA 1 · KPIs compactos ─────────────────────────────────────────────

function Fila1Kpis({ trades, stats }: { trades: Trade[]; stats: TraderStats | null }) {
  const now = Date.now()
  const d30 = 30 * 24 * 3600 * 1000
  const cerrados = trades.filter((t) => t.resultado !== null && t.r_obtenido !== null)

  const wr = (arr: Trade[]) => {
    const decisivos = arr.filter((t) => t.resultado === 'Win' || t.resultado === 'Loss')
    if (!decisivos.length) return null
    return (decisivos.filter((t) => t.resultado === 'Win').length / decisivos.length) * 100
  }

  const last30 = cerrados.filter((t) => now - new Date(t.created_at).getTime() <= d30)
  const prev30 = cerrados.filter((t) => {
    const diff = now - new Date(t.created_at).getTime()
    return diff > d30 && diff <= 2 * d30
  })
  const wr30 = wr(last30)
  const wrPrev = wr(prev30)
  const wrDelta = wr30 != null && wrPrev != null ? wr30 - wrPrev : null

  const pf = stats?.profit_factor ?? null

  // R del mes y mes anterior
  const mesAct = new Date().toISOString().slice(0, 7)
  const mesPrevDate = new Date()
  mesPrevDate.setMonth(mesPrevDate.getMonth() - 1)
  const mesPrev = mesPrevDate.toISOString().slice(0, 7)
  const rMes = cerrados.filter((t) => t.created_at.slice(0, 7) === mesAct).reduce((a, t) => a + (t.r_obtenido ?? 0), 0)
  const rPrev = cerrados.filter((t) => t.created_at.slice(0, 7) === mesPrev).reduce((a, t) => a + (t.r_obtenido ?? 0), 0)
  const rDelta = rMes - rPrev

  // Drawdown actual: peor caída desde el último pico en R acumulado
  const sortedAsc = [...cerrados].sort((a, b) => a.created_at.localeCompare(b.created_at))
  let peak = 0
  let acc = 0
  let curDD = 0
  for (const t of sortedAsc) {
    acc += t.r_obtenido ?? 0
    if (acc > peak) peak = acc
    const dd = peak - acc
    curDD = dd
  }
  const ddLimit = 10  // ej: máximo 10R drawdown permitido (heurístico)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: 'var(--space-3)',
    }}>
      <KpiCard
        label="WR · 30d"
        value={wr30 != null ? `${wr30.toFixed(1)}%` : '—'}
        delta={wrDelta != null ? `${wrDelta >= 0 ? '+' : ''}${wrDelta.toFixed(1)}` : null}
        trend={wrDelta == null ? 'neutral' : wrDelta >= 0 ? 'success' : 'danger'}
      />
      <KpiCard
        label="Profit Factor"
        value={pf != null ? pf.toFixed(2) : '∞'}
        delta={pf != null ? (pf >= 1.5 ? 'sano' : 'bajo') : 'sin pérdidas'}
        trend={pf != null && pf >= 1.5 ? 'success' : pf != null ? 'warning' : 'info'}
      />
      <KpiCard
        label="R del mes"
        value={`${rMes >= 0 ? '+' : ''}${rMes.toFixed(2)}R`}
        delta={`${rDelta >= 0 ? '+' : ''}${rDelta.toFixed(2)} vs mes ant.`}
        trend={rMes >= 0 ? 'success' : 'danger'}
      />
      <KpiCard
        label="Drawdown actual"
        value={`-${curDD.toFixed(2)}R`}
        delta={`${((curDD / ddLimit) * 100).toFixed(0)}% de ${ddLimit}R`}
        trend={curDD >= ddLimit * 0.8 ? 'danger' : curDD >= ddLimit * 0.5 ? 'warning' : 'success'}
      />
    </div>
  )
}

// ─── FILA 2 · Equity Curve + EdgeCallout ─────────────────────────────────

function Fila2EquityEdge({ trades, cerrados }: { trades: Trade[]; cerrados: Trade[] }) {
  const now = Date.now()
  const d30 = 30 * 24 * 3600 * 1000

  const sorted = [...cerrados].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const last30Sorted = sorted.filter((t) => now - new Date(t.created_at).getTime() <= d30)

  let acc = 0
  const sparkData: number[] = []
  for (const t of last30Sorted) {
    acc += t.r_obtenido ?? 0
    sparkData.push(parseFloat(acc.toFixed(2)))
  }
  const totalR30 = sparkData.length > 0 ? sparkData[sparkData.length - 1] : 0
  const trend = totalR30 >= 0 ? 'success' : 'danger'

  // Edge: best combo (zone confluence × trigger × sesion)
  const zoneStats = statsByZoneConfluence(trades).filter((s) => s.total >= 3)
  const triggerStats = statsByTrigger(trades).filter((s) => s.total >= 3)
  const sessionStats = statsBySession(trades).filter((s) => s.total >= 3)
  const emotionStats = statsByEmotion(trades).filter((s) => s.total >= 3)

  const bestZone = [...zoneStats].sort((a, b) => b.win_rate - a.win_rate)[0]
  const bestTrigger = [...triggerStats].sort((a, b) => b.win_rate - a.win_rate)[0]
  const bestSession = [...sessionStats].sort((a, b) => b.win_rate - a.win_rate)[0]
  const bestEmotion = [...emotionStats].sort((a, b) => b.win_rate - a.win_rate)[0]

  const segments = [bestTrigger?.segment, bestSession?.segment, bestEmotion?.segment].filter(Boolean) as string[]
  const edgeStats = bestZone ?? bestTrigger
  const winRate = edgeStats?.win_rate ?? 0
  const avgR = edgeStats?.avg_r ?? 0
  const sample = edgeStats?.total ?? 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-5)' }}>
      <StatCardLarge
        label="Equity Curve · R acumulado · 30d"
        value={`${totalR30 >= 0 ? '+' : ''}${totalR30.toFixed(2)}R`}
        delta={`${last30Sorted.length} trades`}
        trend={trend}
        sparklineData={sparkData}
        caption={
          last30Sorted.length === 0
            ? 'Sin trades cerrados en los últimos 30 días.'
            : `Desde ${last30Sorted[0].created_at.slice(0, 10)} · ${last30Sorted.length} operaciones registradas`
        }
        rightSlot={<TabPills active="30D" />}
      />
      <EdgeCallout
        segments={segments}
        winRate={winRate}
        avgR={avgR}
        sampleSize={sample}
        caption={
          edgeStats
            ? `Tu mejor combinación detectada · WR vs base ${winRate.toFixed(0)}%`
            : undefined
        }
      />
    </div>
  )
}

function TabPills({ active }: { active: string }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {['30D', '90D', 'YTD'].map((t) => (
        <span
          key={t}
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: t === active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
            background: t === active ? 'var(--accent-primary-bg)' : 'transparent',
            border: `0.5px solid ${t === active ? 'rgba(0,212,255,0.3)' : 'var(--border-subtle)'}`,
            cursor: 'default',
          }}
        >
          {t}
        </span>
      ))}
    </div>
  )
}

// ─── FILA 3 · Heatmap ────────────────────────────────────────────────────

function Fila3Heatmap({ cerrados }: { cerrados: Trade[] }) {
  const byDate = new Map<string, { r: number; trades: number }>()
  for (const t of cerrados) {
    const d = t.created_at.slice(0, 10)
    const cur = byDate.get(d) ?? { r: 0, trades: 0 }
    cur.r += t.r_obtenido ?? 0
    cur.trades += 1
    byDate.set(d, cur)
  }
  const data: HeatmapDay[] = Array.from(byDate.entries()).map(([date, v]) => ({
    date, r: v.r, trades: v.trades,
  }))

  return <ActivityHeatmap data={data} days={90} />
}

// ─── FILA 4 · Insights ───────────────────────────────────────────────────

function Fila4Insights({
  trades, alerts, enoughData,
}: { trades: Trade[]; alerts: DangerAlert[]; enoughData: boolean }) {
  if (!enoughData) {
    return (
      <EmptyState
        icon={<Lock size={28} />}
        title={`Registra ${MIN_TRADES_FOR_AI} trades para desbloquear insights de Tefa`}
        description="Necesitamos una muestra mínima para detectar patrones confiables."
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

  const sectionTitle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#888',
    margin: 0, display: 'flex', alignItems: 'center', gap: 8,
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 'var(--space-4)',
    }}>
      <CleanCard>
        <div style={sectionTitle}>
          <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
          Insights de Tefa
        </div>
        {topAlerts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {topAlerts.map((a) => <AlertItem key={a.code} alert={a} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--profit)' }} />
            Sin patrones peligrosos detectados.
          </div>
        )}
      </CleanCard>

      <CleanCard>
        <div style={sectionTitle}>
          <TrendingUp size={14} style={{ color: 'var(--profit)' }} />
          Tu mejor setup
        </div>
        {bestTrigger && bestSession ? (
          <>
            <div style={{
              fontSize: 18, fontWeight: 600, color: 'var(--text-primary)',
              marginTop: 12, lineHeight: 1.3,
            }}>
              {bestTrigger.segment}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              en sesión <b style={{ color: 'var(--text-primary)' }}>{bestSession.segment}</b>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10, marginTop: 14, paddingTop: 10,
              borderTop: '0.5px solid var(--border-subtle)',
            }}>
              <MiniStat label="WR" value={`${bestTrigger.win_rate.toFixed(0)}%`} color="var(--profit)" />
              <MiniStat label="R prom" value={`${bestTrigger.avg_r >= 0 ? '+' : ''}${bestTrigger.avg_r.toFixed(2)}`} color="var(--profit)" />
              <MiniStat label="N" value={`${bestTrigger.total}`} />
            </div>
          </>
        ) : (
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            Muestra insuficiente.
          </div>
        )}
      </CleanCard>

      <CleanCard>
        <div style={sectionTitle}>
          <AlertTriangle size={14} style={{ color: 'var(--loss)' }} />
          Tu punto débil
        </div>
        {worstPattern && worstPattern.total >= 3 ? (
          <>
            <div style={{
              fontSize: 18, fontWeight: 600, color: 'var(--loss)',
              marginTop: 12, lineHeight: 1.3,
            }}>
              {worstPattern.segment}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {worstPattern.total} trades · {worstPattern.wins}W / {worstPattern.losses}L
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10, marginTop: 14, paddingTop: 10,
              borderTop: '0.5px solid var(--border-subtle)',
            }}>
              <MiniStat label="WR" value={`${worstPattern.win_rate.toFixed(0)}%`} color="var(--loss)" />
              <MiniStat label="R prom" value={`${worstPattern.avg_r >= 0 ? '+' : ''}${worstPattern.avg_r.toFixed(2)}`} color="var(--loss)" />
              <MiniStat label="Total" value={`${worstPattern.total_r >= 0 ? '+' : ''}${worstPattern.total_r.toFixed(1)}R`} color={worstPattern.total_r >= 0 ? 'var(--profit)' : 'var(--loss)'} />
            </div>
          </>
        ) : (
          <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
            Sin patrón débil claro.
          </div>
        )}
      </CleanCard>
    </div>
  )
}

function CleanCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      padding: 18,
      minHeight: 160,
      display: 'flex', flexDirection: 'column',
    }}>
      {children}
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9, letterSpacing: '0.5px',
        textTransform: 'uppercase', color: 'var(--text-tertiary)',
        fontWeight: 600, marginBottom: 4,
      }}>
        {label}
      </div>
      <div className="tabular-num" style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 14, fontWeight: 600, color: color ?? 'var(--text-primary)', lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}

function AlertItem({ alert }: { alert: DangerAlert }) {
  const variant = alert.severity === 'critical' ? 'loss' : alert.severity === 'warning' ? 'neutral' : 'info'
  const colorVar = alert.severity === 'critical' ? 'var(--loss)' : alert.severity === 'warning' ? 'var(--neutral)' : 'var(--info)'
  return (
    <div style={{
      padding: '8px 10px',
      borderRadius: 8,
      border: `0.5px solid ${colorVar}33`,
      background: `${colorVar}0A`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <Badge variant={variant} size="sm">{alert.severity}</Badge>
        <div style={{ fontSize: 12, fontWeight: 600, color: colorVar }}>{alert.title}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{alert.detail}</div>
    </div>
  )
}
