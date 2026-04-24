'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/sesion/SesionAnalysisTab.tsx — Bitácora inteligente (Iter 2)
// ─────────────────────────────────────────────────────────────────────────
// Tres preguntas operativas: ¿Cómo gano? ¿Cómo pierdo? Estado financiero.
// ─────────────────────────────────────────────────────────────────────────

import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts'
import { Lock, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  chartTheme, axisProps, gridProps, tooltipStyle, tooltipLabelStyle, tooltipItemStyle,
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
      <EstadoFinanciero trades={trades} cerrados={cerrados} />
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

// ─── Sección 1: ¿Cómo gano? ───────────────────────────────────────────────

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
  const wrCombo = decisivosCombo > 0 ? (winsCombo / decisivosCombo) * 100 : null
  const avgRCombo = winningCombos.length > 0
    ? winningCombos.reduce((a, t) => a + (t.r_obtenido ?? 0), 0) / winningCombos.length
    : null

  const top3Triggers = [...triggers].filter((s) => s.total >= 3).sort((a, b) => b.win_rate - a.win_rate).slice(0, 3)
  const top3Sessions = [...sessions].filter((s) => s.total >= 3).sort((a, b) => b.win_rate - a.win_rate).slice(0, 3)

  return (
    <Card>
      <div className="stat-row">
        <span className="stat-label">¿Cómo ganás dinero?</span>
        <TrendingUp size={16} style={{ color: 'var(--profit)' }} />
      </div>

      {bestTrigger && bestSession && bestEmotion ? (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
            Cuando operás <b style={{ color: 'var(--text-primary)' }}>{bestTrigger.segment}</b> en{' '}
            <b style={{ color: 'var(--text-primary)' }}>{bestSession.segment}</b> con emoción{' '}
            <b style={{ color: 'var(--text-primary)' }}>{bestEmotion.segment}</b>,
            ganás el <b className="profit-text">{bestTrigger.win_rate.toFixed(1)}%</b> con promedio{' '}
            <b className="profit-text">{bestTrigger.avg_r >= 0 ? '+' : ''}{bestTrigger.avg_r.toFixed(2)}R</b>.
          </p>

          {wrCombo !== null && winningCombos.length >= 2 && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--profit-bg)', border: '1px solid rgba(0,230,118,0.2)',
            }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 4 }}>
                COMBINACIÓN GANADORA · {winningCombos.length} trades
              </div>
              <div className="tabular-num" style={{ fontSize: 'var(--text-base)', color: 'var(--profit)', fontWeight: 600 }}>
                {wrCombo.toFixed(1)}% WR · {avgRCombo !== null ? `${avgRCombo >= 0 ? '+' : ''}${avgRCombo.toFixed(2)}R` : '—'} promedio
              </div>
            </div>
          )}

          <div className="divider" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
            <BarStats title="Top triggers · WR" stats={top3Triggers} color="var(--profit)" />
            <BarStats title="Top sesiones · WR" stats={top3Sessions} color="var(--accent-primary)" />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 8 }}>
          Sin combinación dominante detectada (cada categoría necesita ≥3 trades).
        </p>
      )}
    </Card>
  )
}

// ─── Sección 2: ¿Cómo pierdo? ─────────────────────────────────────────────

function ComoPierdo({ trades }: { trades: Trade[] }) {
  const sessions = statsBySession(trades)
  const triggers = statsByTrigger(trades)
  const emotions = statsByEmotion(trades)

  const worstEmotion = bottomByAvgR(emotions)
  const worstTrigger = bottomByAvgR(triggers)
  const worstSession = bottomByAvgR(sessions)

  const top3LossEmotions = [...emotions].filter((s) => s.total >= 3).sort((a, b) => a.avg_r - b.avg_r).slice(0, 3)
  const top3LossTriggers = [...triggers].filter((s) => s.total >= 3).sort((a, b) => a.avg_r - b.avg_r).slice(0, 3)

  return (
    <Card>
      <div className="stat-row">
        <span className="stat-label">¿Cómo perdés dinero?</span>
        <TrendingDown size={16} style={{ color: 'var(--loss)' }} />
      </div>

      {worstEmotion && worstTrigger && worstSession ? (
        <>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
            Tus peores trades ocurren cuando operás con emoción{' '}
            <b style={{ color: 'var(--loss)' }}>{worstEmotion.segment}</b>, usando{' '}
            <b style={{ color: 'var(--loss)' }}>{worstTrigger.segment}</b> en sesión{' '}
            <b style={{ color: 'var(--loss)' }}>{worstSession.segment}</b>. Evitalo.
          </p>

          <div style={{
            marginTop: 12, padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--loss-bg)', border: '1px solid rgba(255,59,74,0.2)',
          }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 4 }}>
              EMOCIÓN MÁS COSTOSA · {worstEmotion.total} trades
            </div>
            <div className="tabular-num" style={{ fontSize: 'var(--text-base)', color: 'var(--loss)', fontWeight: 600 }}>
              {worstEmotion.win_rate.toFixed(1)}% WR · {worstEmotion.avg_r >= 0 ? '+' : ''}{worstEmotion.avg_r.toFixed(2)}R promedio
            </div>
          </div>

          <div className="divider" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
            <BarStats title="Emociones que más pierden · R prom." stats={top3LossEmotions} color="var(--loss)" metric="avg_r" />
            <BarStats title="Triggers que más pierden · R prom." stats={top3LossTriggers} color="var(--loss)" metric="avg_r" />
          </div>
        </>
      ) : (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 8 }}>
          Sin patrón perdedor claro (cada categoría necesita ≥3 trades).
        </p>
      )}
    </Card>
  )
}

// ─── Sección 3: Estado financiero ─────────────────────────────────────────

function EstadoFinanciero({ trades, cerrados }: { trades: Trade[]; cerrados: Trade[] }) {
  const totalR = cerrados.reduce((a, t) => a + (t.r_obtenido ?? 0), 0)

  const capitales = cerrados.map((t) => t.capital_cuenta).filter((c): c is number => c !== null)
  const capitalActual = capitales.length > 0 ? capitales[capitales.length - 1] : null

  // Distribución mensual
  const porMes = new Map<string, number>()
  for (const t of cerrados) {
    const mes = t.created_at.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) ?? 0) + (t.r_obtenido ?? 0))
  }
  const mesesData = Array.from(porMes.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([mes, r]) => ({ mes: mes.slice(5), r: parseFloat(r.toFixed(2)) }))

  const wins = cerrados.filter((t) => t.resultado === 'Win').length
  const losses = cerrados.filter((t) => t.resultado === 'Loss').length
  const breakevens = cerrados.filter((t) => t.resultado === 'Breakeven').length
  const pieData = [
    { name: 'Wins', value: wins, color: chartTheme.colors.profit },
    { name: 'Losses', value: losses, color: chartTheme.colors.loss },
    { name: 'BE', value: breakevens, color: chartTheme.colors.textMuted },
  ].filter((d) => d.value > 0)

  return (
    <>
      <div className="grid-dashboard">
        <StatCard
          label="R acumulado total"
          value={`${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`}
          variant={totalR >= 0 ? 'profit' : 'loss'}
          size="sm"
          icon={<Wallet size={16} />}
          hint={`${cerrados.length} trades cerrados`}
        />
        {capitalActual !== null && (
          <StatCard
            label="Capital simulado"
            value={`$${capitalActual.toLocaleString('es-MX')}`}
            size="sm"
            icon={<Wallet size={16} />}
            hint="Último capital registrado"
          />
        )}
        <StatCard
          label="Disciplina"
          value={`${wins + losses + breakevens > 0 ? ((wins / (wins + losses + breakevens)) * 100).toFixed(0) : 0}%`}
          size="sm"
          hint={`${wins}W · ${losses}L · ${breakevens}BE`}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
        <Card>
          <div className="stat-row">
            <span className="stat-label">Distribución mensual · R</span>
          </div>
          {mesesData.length > 0 ? (
            <div style={{ height: 240, marginTop: 12 }}>
              <ResponsiveContainer>
                <BarChart data={mesesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="mes" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    itemStyle={tooltipItemStyle}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    formatter={(v) => [`${Number(v) >= 0 ? '+' : ''}${v}R`, 'R mes']}
                  />
                  <Bar dataKey="r" radius={[6, 6, 0, 0]}>
                    {mesesData.map((d, i) => (
                      <Cell key={i} fill={d.r >= 0 ? chartTheme.colors.profit : chartTheme.colors.loss} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              Sin datos
            </div>
          )}
        </Card>

        <Card>
          <div className="stat-row">
            <span className="stat-label">Distribución por resultado</span>
          </div>
          {pieData.length > 0 ? (
            <div style={{ height: 240, marginTop: 12 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="var(--bg-surface)" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: chartTheme.colors.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              Sin datos
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

// ─── Bar list helper ──────────────────────────────────────────────────────

function BarStats({
  title, stats, color, metric = 'win_rate',
}: { title: string; stats: SegmentStats[]; color: string; metric?: 'win_rate' | 'avg_r' }) {
  if (!stats.length) return null
  const max = metric === 'win_rate' ? 100 : Math.max(...stats.map((s) => Math.abs(s[metric])), 1)

  return (
    <div>
      <div className="stat-label" style={{ marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stats.map((s) => {
          const v = s[metric]
          const pct = metric === 'win_rate' ? v : Math.min((Math.abs(v) / max) * 100, 100)
          return (
            <div key={s.segment}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', marginBottom: 4 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{s.segment}</span>
                <span className="tabular-num" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {metric === 'win_rate'
                    ? `${v.toFixed(1)}%`
                    : `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`}
                  {' '}
                  <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>· {s.total}</span>
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 250ms' }} />
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
        <Badge size="sm">muestra ≥ 3 trades</Badge>
      </div>
    </div>
  )
}
