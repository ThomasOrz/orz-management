'use client'

// ─────────────────────────────────────────────────────────────────────────────
// app/DashboardClient.tsx — Dashboard v2 (Iter 7) — Estilo TradeZella
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Trade, TraderStats } from '@/types/trading'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ORZScore } from '@/components/dashboard/ORZScore'
import { DailyCumulativePnL } from '@/components/dashboard/DailyCumulativePnL'
import { ProgressTracker } from '@/components/dashboard/ProgressTracker'
import { ProfitCalendar } from '@/components/dashboard/ProfitCalendar'
import { DrawdownChart } from '@/components/dashboard/DrawdownChart'
import { TradeTimeScatter } from '@/components/dashboard/TradeTimeScatter'

interface Props {
  stats: TraderStats | null
  trades: Trade[]
  briefing?: unknown
  disciplineToday?: unknown
  userEmail?: string
}

// ─── Data derivation ────────────────────────────────────────────────────────

type ClosedTrade = Trade & { resultado: NonNullable<Trade['resultado']>; r_obtenido: number }

function deriveMetrics(trades: Trade[]) {
  const closed = trades.filter(
    (t): t is ClosedTrade => t.resultado !== null && t.r_obtenido !== null
  )
  const n = closed.length
  if (n === 0) return null

  const wins   = closed.filter(t => t.resultado === 'Win').length
  const losses = closed.filter(t => t.resultado === 'Loss').length
  const winRate = (wins / n) * 100

  const totalR  = closed.reduce((s, t) => s + t.r_obtenido, 0)

  const winRs  = closed.filter(t => t.r_obtenido > 0).map(t => t.r_obtenido)
  const lossRs = closed.filter(t => t.r_obtenido < 0).map(t => t.r_obtenido)
  const avgWin  = winRs.length  > 0 ? winRs.reduce((s, x) => s + x, 0)  / winRs.length  : 0
  const avgLoss = lossRs.length > 0 ? lossRs.reduce((s, x) => s + x, 0) / lossRs.length : 0
  const grossProfit = winRs.reduce((s, x) => s + x, 0)
  const grossLoss   = Math.abs(lossRs.reduce((s, x) => s + x, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0
  const avgWinLossRatio = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0

  // Day win rate
  const byDay = new Map<string, number>()
  for (const t of closed) {
    const d = t.created_at.slice(0, 10)
    byDay.set(d, (byDay.get(d) ?? 0) + t.r_obtenido)
  }
  const dayWins    = Array.from(byDay.values()).filter(v => v > 0).length
  const dayWinRate = byDay.size > 0 ? (dayWins / byDay.size) * 100 : 0

  // Adherencia
  const withRules  = closed.filter(t => t.siguio_reglas !== null)
  const adherencia = withRules.length > 0
    ? (withRules.filter(t => t.siguio_reglas).length / withRules.length) * 100 : 0

  // Cumulative PnL by day
  const sortedByDay = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  let cumR = 0
  const cumPnlData = sortedByDay.map(([date, r]) => {
    cumR += r
    return { date: date.slice(5).replace('-', '/'), cumPnl: parseFloat(cumR.toFixed(2)) }
  })

  // Drawdown
  let peak = 0, runningR = 0
  const ddData = sortedByDay.map(([date, r]) => {
    runningR += r
    if (runningR > peak) peak = runningR
    const dd = peak > 0 ? ((peak - runningR) / peak) * 100 * -1 : 0
    return { date: date.slice(5).replace('-', '/'), dd: parseFloat(dd.toFixed(2)) }
  })
  const maxDD = Math.abs(Math.min(0, ...ddData.map(d => d.dd)))

  // Heatmap
  const tradesByDay = new Map<string, number>()
  for (const t of closed) {
    const d = t.created_at.slice(0, 10)
    tradesByDay.set(d, (tradesByDay.get(d) ?? 0) + 1)
  }
  const heatmap = Array.from(byDay.entries()).map(([date, pnl]) => ({
    date, pnl: parseFloat(pnl.toFixed(2)), count: tradesByDay.get(date) ?? 0,
  }))

  // Calendar (current month)
  const now = new Date()
  const calendarData = heatmap
    .filter(d => {
      const dm = new Date(d.date)
      return dm.getFullYear() === now.getFullYear() && dm.getMonth() === now.getMonth()
    })
    .map(d => ({ date: d.date, pnl: d.pnl, trades: d.count }))

  // Scatter (hour of day)
  const scatterData = closed.map(t => {
    const dt = new Date(t.created_at)
    return { hour: dt.getHours() + dt.getMinutes() / 60, r: t.r_obtenido, label: t.activo }
  })

  return {
    n, wins, losses, winRate, totalR, avgWin, avgLoss, profitFactor,
    avgWinLossRatio, dayWinRate, adherencia, maxDD,
    cumPnlData, ddData, heatmap, calendarData, scatterData,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardClient({ trades }: Props) {
  const m = deriveMetrics(trades)

  const hoy = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Dashboard"
        subtitle={<span style={{ textTransform: 'capitalize' }}>{hoy}</span>}
        action={
          <Link href="/sesiones">
            <Button variant="primary" size="sm" icon={<Plus size={14} />}>
              Registrar trade
            </Button>
          </Link>
        }
      />

      {!m ? (
        <EmptyState
          icon={<span style={{ fontSize: 32 }}>📊</span>}
          title="Aún no hay trades cerrados"
          description={
            <>
              Registra tu primer trade en{' '}
              <Link href="/sesiones" style={{ color: 'var(--accent-primary)' }}>
                Sesiones / Journal
              </Link>{' '}
              para ver tu dashboard.
            </>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── 5 MetricCards ──────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <MetricCard
              label="Net P&L"
              value={`${m.totalR >= 0 ? '+' : ''}${m.totalR.toFixed(2)}R`}
              subtitle={`${m.n} trades`}
              color={m.totalR >= 0 ? 'var(--profit)' : 'var(--loss)'}
            />
            <MetricCard
              label="Trade Win %"
              value={`${m.winRate.toFixed(1)}%`}
              subtitle={`${m.wins}W / ${m.losses}L`}
              gauge
              gaugeValue={m.winRate}
              color={m.winRate >= 55 ? 'var(--profit)' : m.winRate < 45 ? 'var(--loss)' : 'var(--neutral)'}
            />
            <MetricCard
              label="Profit Factor"
              value={m.profitFactor > 0 ? m.profitFactor.toFixed(2) : '—'}
              subtitle={m.profitFactor >= 1.5 ? 'Bueno ✓' : m.profitFactor >= 1 ? 'Umbral' : 'Bajo'}
              color={m.profitFactor >= 1.5 ? 'var(--profit)' : m.profitFactor >= 1 ? 'var(--neutral)' : 'var(--loss)'}
            />
            <MetricCard
              label="Day Win %"
              value={`${m.dayWinRate.toFixed(1)}%`}
              subtitle="días ganadores"
              gauge
              gaugeValue={m.dayWinRate}
              color={m.dayWinRate >= 60 ? 'var(--profit)' : m.dayWinRate < 50 ? 'var(--loss)' : 'var(--neutral)'}
            />
            <MetricCard
              label="Avg Win / Loss"
              value={m.avgWinLossRatio > 0 ? `${m.avgWinLossRatio.toFixed(2)}x` : '—'}
              subtitle={`+${m.avgWin.toFixed(2)}R / ${m.avgLoss.toFixed(2)}R`}
              color={m.avgWinLossRatio >= 1.5 ? 'var(--profit)' : 'var(--text-secondary)'}
            />
          </div>

          {/* ── Fila 2: Radar + Heatmap + Cumulative PnL ──────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr', gap: 10 }}>
            <Card>
              <ORZScore
                winRate={m.winRate}
                profitFactor={m.profitFactor}
                avgWinLoss={m.avgWinLossRatio}
                consistency={m.dayWinRate}
                maxDD={m.maxDD}
                adherencia={m.adherencia}
              />
            </Card>
            <Card>
              <ProgressTracker data={m.heatmap} />
            </Card>
            <Card>
              <DailyCumulativePnL data={m.cumPnlData} />
            </Card>
          </div>

          {/* ── Profit Calendar ────────────────────────────────────────── */}
          <Card>
            <ProfitCalendar data={m.calendarData} />
          </Card>

          {/* ── Fila 4: Drawdown + Scatter ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Card><DrawdownChart data={m.ddData} /></Card>
            <Card><TradeTimeScatter data={m.scatterData} /></Card>
          </div>

        </div>
      )}
    </div>
  )
}
