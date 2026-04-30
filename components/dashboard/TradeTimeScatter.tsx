'use client'

import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

interface Point {
  hour: number       // 0-23
  r: number          // resultado en R
  label: string      // "09:30 NAS100 +1.2R"
}

interface Props { data: Point[] }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Point }> }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-tertiary)' }}>{Math.floor(p.hour)}:00h</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.r >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
        {p.r >= 0 ? '+' : ''}{p.r.toFixed(2)}R
      </div>
    </div>
  )
}

export function TradeTimeScatter({ data }: Props) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
        Trades por Hora del Día
      </div>
      {data.length === 0 ? (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
          Sin datos
        </div>
      ) : (
        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
              <XAxis dataKey="hour" type="number" domain={[0, 23]} name="Hora"
                tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false}
                tickFormatter={(h: number) => `${h}h`} />
              <YAxis dataKey="r" name="R" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="var(--border-default)" />
              <Scatter data={data}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.r >= 0 ? 'var(--profit)' : 'var(--loss)'} fillOpacity={0.7} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default TradeTimeScatter
