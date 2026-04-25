'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/sesion/SesionAnalysisTab.tsx — Bitácora inteligente Híbrido (Iter 3)
// ─────────────────────────────────────────────────────────────────────────
// Sección A · ¿Cómo ganás dinero?  → EdgeCallout + Top3 listas
// Sección B · ¿Cómo perdés dinero? → Card roja + Top3 perdedoras
// Sección C · Estado financiero    → 4 KpiCards + StatCardLarge sparkline + Pie
// ─────────────────────────────────────────────────────────────────────────

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Lock, TrendingUp, TrendingDown } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatCardLarge } from '@/components/ui/StatCardLarge'
import { EdgeCallout } from '@/components/ui/EdgeCallout'
import {
  chartTheme, tooltipStyle, tooltipItemStyle,
} from '@/components/ui/chart-theme'
import {
  statsBySession, statsByTrigger, statsByEmotion,
} from '@/lib/analytics'
import type { Trade, SegmentStats } from '@/types/trading'

const MIN_TRADES = 10

interface Props { trades: Trade[] }

export default function SesionAnalysisTab({ trades }: Props) {
  const cerrados = trades.filter((t) => t.resultado !== null && t.r_obtenido !== null)

  if (cerrados.length < MIN_TRADES) {
    return (
      <EmptyState
        icon={<Lock size={28} />}
        title={`Registra ${MIN_TRADES} trades para desbloquear el análisis`}
        description={`Llevas ${cerrados.length} trades cerrados. Necesitamos muestra mínima para detectar patrones reales.`}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <ComoGano trades={trades} />
      <ComoPierdo trades={trades} />
      <EstadoFinanciero cerrados={cerrados} />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function topByWinRate(stats: SegmentStats[], minTotal = 3): SegmentStats | null {
  const filt = stats.filter((s) => s.total >= minTotal)
  if (!filt.length) return null
  return [...filt].sort((a, b) => b.win_rate - a.win_rate)[0]
}

function bottomByAvgR(stats: SegmentStats[], minTotal = 3): SegmentStats | null {
  const filt = stats.filter((s) => s.total >= minTotal)
  if (!filt.length) return null
  return [...filt].sort((a, b) => a.avg_r - b.avg_r)[0]
}

const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
  margin: 0, marginBottom: 'var(--space-3)',
  display: 'flex', alignItems: 'center', gap: 8,
}

// ─── Sección A: ¿Cómo gano? ───────────────────────────────────────────────

function ComoGano({ trades }: { trades: Trade[] }) {
  const sessions = statsBySession(trades)
  const triggers = statsByTrigger(trades)
  const emotions = statsByEmotion(trades)

  const bestTrigger = topByWinRate(triggers)
  const bestSession = topByWinRate(sessions)
  const bestEmotion = topByWinRate(emotions)

  const cerrados = trades.filter((t) => t.resultado !== null)
  const winningCombos = bestTrigger && bestSession && bestEmotion
    ? cerrados.filter((t) =>
        t.trigger === bestTrigger.segment &&
        t.sesion === bestSession.segment &&
        t.emocion === bestEmotion.segment
      )
    : []
  const winsCombo = winningCombos.filter((t) => t.resultado === 'Win').length
  const decisivosCombo = winningCombos.filter((t) => t.resultado === 'Win' || t.resultado === 'Loss').length
  const wrCombo = decisivosCombo > 0 ? (winsCombo / decisivosCombo) * 100 : (bestTrigger?.win_rate ?? 0)
  const avgRCombo = winningCombos.length > 0
    ? winningCombos.reduce((a, t) => a + (t.r_obtenido ?? 0), 0) / winningCombos.length
    : (bestTrigger?.avg_r ?? 0)

  const top3Triggers = [...triggers].filter((s) => s.total >= 3).sort((a, b) => b.win_rate - a.win_rate).slice(0, 3)
  const top3Sessions = [...sessions].filter((s) => s.total >= 3).sort((a, b) => b.win_rate - a.win_rate).slice(0, 3)

  const segments = [bestTrigger?.segment, bestSession?.segment, bestEmotion?.segment].filter(Boolean) as string[]
  const sample = winningCombos.length || (bestTrigger?.total ?? 0)

  return (
    <div>
      <h2 style={sectionTitle}>
        <TrendingUp size={14} style={{ color: 'var(--profit)' }} />
        ¿Cómo ganás dinero?
      </h2>

      {bestTrigger && bestSession && bestEmotion ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 'var(--space-4)' }}>
          <EdgeCallout
            segments={segments}
            winRate={wrCombo}
            avgR={avgRCombo}
            sampleSize={sample}
            caption={
              winningCombos.length >= 2
                ? `Combinación exacta repetida ${winningCombos.length} veces`
                : 'Mejor segmento individual detectado'
            }
          />

          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 14, padding: 18,
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <RankList title="Top triggers" stats={top3Triggers} color="var(--profit)" metric="win_rate" />
            <RankList title="Top sesiones" stats={top3Sessions} color="var(--accent-primary)" metric="win_rate" />
          </div>
        </div>
      ) : (
        <NotEnoughCard text="Sin combinación dominante detectada (cada categoría necesita ≥3 trades)." />
      )}
    </div>
  )
}

// ─── Sección B: ¿Cómo pierdo? ─────────────────────────────────────────────

function ComoPierdo({ trades }: { trades: Trade[] }) {
  const triggers = statsByTrigger(trades)
  const emotions = statsByEmotion(trades)

  const worstEmotion = bottomByAvgR(emotions)
  const worstTrigger = bottomByAvgR(triggers)

  const top3LossEmotions = [...emotions].filter((s) => s.total >= 3).sort((a, b) => a.avg_r - b.avg_r).slice(0, 3)
  const top3LossTriggers = [...triggers].filter((s) => s.total >= 3).sort((a, b) => a.avg_r - b.avg_r).slice(0, 3)

  return (
    <div>
      <h2 style={sectionTitle}>
        <TrendingDown size={14} style={{ color: 'var(--loss)' }} />
        ¿Cómo perdés dinero?
      </h2>

      {worstEmotion && worstTrigger ? (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderLeft: '3px solid var(--loss)',
          borderRadius: 14, padding: 18,
        }}>
          <p style={{
            fontSize: 13, color: 'var(--text-secondary)',
            lineHeight: 1.6, margin: 0, marginBottom: 16,
          }}>
            Tus peores trades aparecen con emoción{' '}
            <b style={{ color: 'var(--loss)' }}>{worstEmotion.segment}</b> y trigger{' '}
            <b style={{ color: 'var(--loss)' }}>{worstTrigger.segment}</b>.{' '}
            <span style={{ color: 'var(--text-tertiary)' }}>R prom.{' '}
              <span className="tabular-num" style={{ color: 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                {worstEmotion.avg_r >= 0 ? '+' : ''}{worstEmotion.avg_r.toFixed(2)}R
              </span>{' '}
              · WR{' '}
              <span className="tabular-num" style={{ color: 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                {worstEmotion.win_rate.toFixed(0)}%
              </span>.
            </span>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
            <RankList title="Emociones que más pierden" stats={top3LossEmotions} color="var(--loss)" metric="avg_r" />
            <RankList title="Triggers que más pierden" stats={top3LossTriggers} color="var(--loss)" metric="avg_r" />
          </div>
        </div>
      ) : (
        <NotEnoughCard text="Sin patrón perdedor claro (cada categoría necesita ≥3 trades)." />
      )}
    </div>
  )
}

// ─── Sección C: Estado financiero ─────────────────────────────────────────

function EstadoFinanciero({ cerrados }: { cerrados: Trade[] }) {
  const totalR = cerrados.reduce((a, t) => a + (t.r_obtenido ?? 0), 0)
  const promR = cerrados.length > 0 ? totalR / cerrados.length : 0
  const rs = cerrados.map((t) => t.r_obtenido ?? 0)
  const mejor = rs.length > 0 ? Math.max(...rs) : 0
  const peor = rs.length > 0 ? Math.min(...rs) : 0

  // Sparkline acumulado
  const sortedAsc = [...cerrados].sort((a, b) => a.created_at.localeCompare(b.created_at))
  let acc = 0
  const sparkData = sortedAsc.map((t) => {
    acc += t.r_obtenido ?? 0
    return parseFloat(acc.toFixed(2))
  })

  // Pie W/L/BE
  const wins = cerrados.filter((t) => t.resultado === 'Win').length
  const losses = cerrados.filter((t) => t.resultado === 'Loss').length
  const breakevens = cerrados.filter((t) => t.resultado === 'Breakeven').length
  const pieData = [
    { name: 'Wins', value: wins, color: chartTheme.colors.profit },
    { name: 'Losses', value: losses, color: chartTheme.colors.loss },
    { name: 'BE', value: breakevens, color: chartTheme.colors.textMuted },
  ].filter((d) => d.value > 0)

  return (
    <div>
      <h2 style={sectionTitle}>
        <TrendingUp size={14} style={{ color: 'var(--accent-primary)' }} />
        Estado financiero
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}>
        <KpiCard
          label="R Total"
          value={`${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`}
          delta={`${cerrados.length} trades`}
          trend={totalR >= 0 ? 'success' : 'danger'}
        />
        <KpiCard
          label="R Promedio"
          value={`${promR >= 0 ? '+' : ''}${promR.toFixed(2)}R`}
          trend={promR >= 0 ? 'success' : 'danger'}
        />
        <KpiCard
          label="Mejor trade"
          value={`+${mejor.toFixed(2)}R`}
          trend="success"
        />
        <KpiCard
          label="Peor trade"
          value={`${peor.toFixed(2)}R`}
          trend="danger"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-4)' }}>
        <StatCardLarge
          label="Evolución R acumulado"
          value={`${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`}
          delta={`${cerrados.length} trades`}
          trend={totalR >= 0 ? 'success' : 'danger'}
          sparklineData={sparkData}
          caption={`Desde ${sortedAsc[0]?.created_at.slice(0, 10) ?? '—'} hasta hoy`}
        />

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14, padding: 18,
          minHeight: 200, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 8 }}>
            Distribución por resultado
          </div>
          {pieData.length > 0 ? (
            <div style={{ flex: 1, minHeight: 180 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="var(--bg-surface)" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 11, color: chartTheme.colors.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
              Sin datos
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Lista ranqueada compacta (reemplaza BarStats) ───────────────────────

function RankList({
  title, stats, color, metric,
}: { title: string; stats: SegmentStats[]; color: string; metric: 'win_rate' | 'avg_r' }) {
  if (!stats.length) {
    return (
      <div>
        <div style={listTitle}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>Sin muestra suficiente.</div>
      </div>
    )
  }
  return (
    <div>
      <div style={listTitle}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stats.map((s) => {
          const v = s[metric]
          const fmt = metric === 'win_rate'
            ? `${v.toFixed(0)}%`
            : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`
          return (
            <div
              key={s.segment}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 8,
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                {s.segment}
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="tabular-num" style={{
                  fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color,
                }}>
                  {fmt}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>n={s.total}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const listTitle: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'var(--text-tertiary)',
  fontWeight: 600,
  marginBottom: 8,
}

function NotEnoughCard({ text }: { text: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14, padding: 18,
      fontSize: 13, color: 'var(--text-secondary)',
    }}>
      {text}
    </div>
  )
}
