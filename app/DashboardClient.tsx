'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Trade, TraderStats } from '@/types/trading'
import type { TradingAccount } from '@/types/capital'
import type { DashboardData } from '@/lib/analytics'
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
  dashData: DashboardData
  account: TradingAccount | null
  stats: TraderStats | null
  trades: Trade[]
  briefing?: unknown
  disciplineToday?: unknown
  userEmail?: string
}

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
]

export default function DashboardClient({ dashData, account }: Props) {
  const now = new Date()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear,  setCalYear]  = useState(now.getFullYear())

  const hoy = now.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const calendarData = dashData.activityData
    .filter(d => {
      const dm = new Date(d.date + 'T00:00:00')
      return dm.getFullYear() === calYear && dm.getMonth() === calMonth
    })
    .map(d => ({ date: d.date, pnl: d.pnl, trades: d.count }))

  const { n, wins, losses, winRate, totalR, profitFactor,
          avgWin, avgLoss, avgWinLossRatio, dayWinRate,
          adherencia, maxDD, cumPnlData, ddData, activityData, scatterData } = dashData

  const pnlUsd = account
    ? (account.capital_actual - account.capital_inicial)
    : null

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

      {n === 0 ? (
        <EmptyState
          icon={<span style={{ fontSize: 32 }}>📊</span>}
          title="Aún no hay trades cerrados"
          description={
            <>
              Registra tu primer trade en{' '}
              <Link href="/sesiones" style={{ color: 'var(--accent-primary)' }}>
                Sesiones / Journal
              </Link>{' '}
              y ciérralo para ver tu dashboard.
            </>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {n < 3 && (
            <div style={{
              padding: '10px 16px', borderRadius: 'var(--radius-sm)', fontSize: 12,
              background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)',
              color: 'var(--text-secondary)',
            }}>
              Mínimo 10 trades para estadísticas fiables — llevas {n}.
            </div>
          )}

          {/* ── Row 1: Metric Cards ──────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <MetricCard
              label="Net P&L"
              value={`${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`}
              subtitle={pnlUsd !== null
                ? `${pnlUsd >= 0 ? '+' : ''}$${Math.abs(pnlUsd).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`
                : `${n} trades`}
              color={totalR >= 0 ? 'var(--profit)' : 'var(--loss)'}
            />
            <MetricCard
              label="Trade Win %"
              value={`${winRate.toFixed(1)}%`}
              subtitle={`${wins}W / ${losses}L`}
              gauge
              gaugeValue={winRate}
              color={winRate >= 55 ? 'var(--profit)' : winRate < 45 ? 'var(--loss)' : 'var(--neutral)'}
            />
            <MetricCard
              label="Profit Factor"
              value={profitFactor > 0 ? profitFactor.toFixed(2) : '—'}
              subtitle={profitFactor >= 1.5 ? 'Bueno ✓' : profitFactor >= 1 ? 'Umbral' : 'Bajo'}
              color={profitFactor >= 1.5 ? 'var(--profit)' : profitFactor >= 1 ? 'var(--neutral)' : 'var(--loss)'}
            />
            <MetricCard
              label="Day Win %"
              value={`${dayWinRate.toFixed(1)}%`}
              subtitle="días ganadores"
              gauge
              gaugeValue={dayWinRate}
              color={dayWinRate >= 60 ? 'var(--profit)' : dayWinRate < 50 ? 'var(--loss)' : 'var(--neutral)'}
            />
            <MetricCard
              label="Avg Win / Loss"
              value={avgWinLossRatio > 0 ? `${avgWinLossRatio.toFixed(2)}x` : '—'}
              subtitle={`+${avgWin.toFixed(2)}R / ${avgLoss.toFixed(2)}R`}
              color={avgWinLossRatio >= 1.5 ? 'var(--profit)' : 'var(--text-secondary)'}
            />
            <MetricCard
              label="Adherencia"
              value={`${adherencia.toFixed(0)}%`}
              subtitle="siguió el plan"
              gauge
              gaugeValue={adherencia}
              color={adherencia >= 85 ? 'var(--profit)' : adherencia >= 70 ? 'var(--neutral)' : 'var(--loss)'}
            />
          </div>

          {/* ── Row 2: ORZScore + Activity + Cumulative PnL ─────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            <Card>
              <ORZScore
                winRate={winRate}
                profitFactor={profitFactor}
                avgWinLoss={avgWinLossRatio}
                consistency={dayWinRate}
                maxDD={maxDD}
                adherencia={adherencia}
              />
            </Card>
            <Card>
              <ProgressTracker data={activityData} />
            </Card>
            <Card>
              <DailyCumulativePnL data={cumPnlData} />
            </Card>
          </div>

          {/* ── Row 3: Profit Calendar con navegación ───────────────── */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              gap: 8, marginBottom: 6,
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginRight: 'auto' }}>
                Calendario mensual
              </span>
              <button onClick={prevMonth} style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
              }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 130, textAlign: 'center' }}>
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button onClick={nextMonth} style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)', padding: '4px 8px', cursor: 'pointer',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
              }}>
                <ChevronRight size={14} />
              </button>
            </div>
            <Card>
              <ProfitCalendar data={calendarData} month={calMonth} year={calYear} />
            </Card>
          </div>

          {/* ── Row 4: Drawdown + Scatter ────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
            <Card><DrawdownChart data={ddData} /></Card>
            <Card><TradeTimeScatter data={scatterData} /></Card>
          </div>

        </div>
      )}
    </div>
  )
}
