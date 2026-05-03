'use client'

import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

interface Point {
  min: number    // hold_time_min
  r: number      // r_obtenido
  label: string  // symbol
}

interface Props { data: Point[] }

function fmtMin(min: number): string {
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={{
      background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-tertiary)', marginBottom: 2 }}>{p.label} · {fmtMin(p.min)}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.r >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
        {p.r >= 0 ? '+' : ''}{p.r.toFixed(2)}R
      </div>
    </div>
  )
}

export function TradeDurationScatter({ data }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
        Sin datos de duración
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          P&L por duración del trade
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <ScatterChart margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="min" type="number" name="Duración"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            axisLine={false} tickLine={false}
            tickFormatter={fmtMin}
          />
          <YAxis
            dataKey="r" type="number" name="R"
            tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}R`}
          />
          <ReferenceLine y={0} stroke="var(--border-default)" strokeDasharray="3 3" />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data}>
            {data.map((p, i) => (
              <Cell key={i} fill={p.r >= 0 ? 'rgba(0,230,118,0.7)' : 'rgba(255,59,74,0.7)'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
