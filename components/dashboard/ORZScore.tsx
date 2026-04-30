'use client'

import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
} from 'recharts'

interface Props {
  winRate: number        // 0-100
  profitFactor: number   // e.g. 1.5 → scale to 100
  avgWinLoss: number     // ratio avg_win/avg_loss → scale to 100
  consistency: number    // % days followed plan → 0-100
  maxDD: number          // % max drawdown (inverted: 100 - dd_pct)
  adherencia: number     // % trades siguio_reglas → 0-100
}

function scalePF(pf: number) {
  // 0 → 0, 1 → 50, 2 → 75, 3+ → 90+
  return Math.min(100, (pf / 3) * 90)
}
function scaleWL(ratio: number) {
  // ratio = avg_win / |avg_loss|; 0→0, 1→50, 2→75, 3+→90+
  return Math.min(100, (ratio / 3) * 90)
}

export function ORZScore({ winRate, profitFactor, avgWinLoss, consistency, maxDD, adherencia }: Props) {
  const data = [
    { axis: 'Win Rate',       value: Math.max(0, Math.min(100, winRate)) },
    { axis: 'Profit Factor',  value: scalePF(profitFactor) },
    { axis: 'Avg Win/Loss',   value: scaleWL(avgWinLoss) },
    { axis: 'Consistency',    value: Math.max(0, Math.min(100, consistency)) },
    { axis: 'Max DD',         value: Math.max(0, Math.min(100, 100 - maxDD)) },
    { axis: 'Adherencia',     value: Math.max(0, Math.min(100, adherencia)) },
  ]

  const score = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length)

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
        ORZ Score
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 700,
          color: score >= 70 ? 'var(--profit)' : score >= 50 ? 'var(--neutral)' : 'var(--loss)' }}>
          {score}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>/100</span>
      </div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid stroke="var(--border-default)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: 'var(--font-family)' }}
            />
            <Radar
              dataKey="value"
              stroke="var(--accent-primary)"
              fill="var(--accent-primary)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ORZScore
