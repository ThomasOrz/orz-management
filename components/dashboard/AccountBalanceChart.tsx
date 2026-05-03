'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface BalancePoint {
  date: string    // 'MM/DD'
  balance: number // USD
}

interface Props {
  data: BalancePoint[]
  currency?: string
  initialBalance?: number
}

function CustomTooltip({ active, payload, label, currency, initialBalance }: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  currency?: string
  initialBalance?: number
}) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  const isProfit = initialBalance !== undefined ? val >= initialBalance : val >= 0
  return (
    <div style={{
      background: 'var(--bg-overlay)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isProfit ? 'var(--profit)' : 'var(--loss)' }}>
        {currency ?? '$'}{val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>
    </div>
  )
}

export function AccountBalanceChart({ data, currency = '$', initialBalance }: Props) {
  if (data.length === 0) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12 }}>
        Sin datos de balance
      </div>
    )
  }

  const last = data[data.length - 1].balance
  const first = data[0].balance
  const isUp = last >= first
  const gradientId = 'balanceGrad'

  const TooltipContent = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => (
    <CustomTooltip active={active} payload={payload} label={label} currency={currency} initialBalance={initialBalance} />
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Balance de cuenta
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: isUp ? 'var(--profit)' : 'var(--loss)' }}>
          {currency}{last.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isUp ? 'var(--profit)' : 'var(--loss)'} stopOpacity={0.25} />
              <stop offset="95%" stopColor={isUp ? 'var(--profit)' : 'var(--loss)'} stopOpacity={0} />
            </linearGradient>
          </defs>
          {initialBalance !== undefined && (
            <ReferenceLine y={initialBalance} stroke="var(--border-default)" strokeDasharray="3 3" />
          )}
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false}
            tickFormatter={v => `${currency}${(v / 1000).toFixed(0)}k`} />
          <Tooltip content={<TooltipContent />} />
          <Area
            type="monotone" dataKey="balance"
            stroke={isUp ? 'var(--profit)' : 'var(--loss)'}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
