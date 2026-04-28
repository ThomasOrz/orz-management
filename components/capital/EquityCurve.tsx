import type { EquityPoint } from '@/types/capital'

interface Props {
  points: EquityPoint[]
  height?: number
  divisa?: string
}

function fmt(n: number, divisa = 'USD') {
  return n.toLocaleString('en-US', { style: 'currency', currency: divisa, maximumFractionDigits: 0 })
}

export function EquityCurve({ points, height = 180, divisa = 'USD' }: Props) {
  if (points.length < 2) {
    return (
      <div style={{
        height, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-tertiary)', fontSize: 13,
      }}>
        Registra movimientos para ver la curva de equity
      </div>
    )
  }

  const W = 600
  const H = height
  const padX = 8
  const padY = 14

  const equities = points.map(p => p.equity)
  const min = Math.min(...equities)
  const max = Math.max(...equities)
  const range = max - min || 1

  const toX = (i: number) => padX + (i / (points.length - 1)) * (W - padX * 2)
  const toY = (v: number) => padY + ((max - v) / range) * (H - padY * 2)

  const polylinePoints = points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.equity).toFixed(1)}`).join(' ')

  const first = points[0].equity
  const last = points[points.length - 1].equity
  const positive = last >= first
  const lineColor = positive ? 'var(--profit)' : 'var(--loss)'
  const gradId = `ec-grad-${positive ? 'pos' : 'neg'}`

  // Zero line Y
  const clampedZero = Math.max(min, Math.min(max, first))
  const zeroY = toY(clampedZero)

  // Fill path: poly down to bottom and back
  const fillPath = `M ${toX(0).toFixed(1)},${toY(points[0].equity).toFixed(1)} ` +
    points.slice(1).map((p, i) => `L ${toX(i + 1).toFixed(1)},${toY(p.equity).toFixed(1)}`).join(' ') +
    ` L ${toX(points.length - 1).toFixed(1)},${H} L ${toX(0).toFixed(1)},${H} Z`

  // Axis labels: first, last, min, max
  const labelFirst = points[0].fecha
  const labelLast = points[points.length - 1].fecha
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height, display: 'block' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Zero / baseline */}
        <line
          x1={padX} y1={zeroY.toFixed(1)}
          x2={W - padX} y2={zeroY.toFixed(1)}
          stroke="var(--border-subtle)" strokeWidth={1} strokeDasharray="4 4"
        />

        {/* Fill */}
        <path d={fillPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Last point dot */}
        <circle
          cx={toX(points.length - 1).toFixed(1)}
          cy={toY(last).toFixed(1)}
          r={3}
          fill={lineColor}
        />
      </svg>

      {/* X-axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtDate(labelFirst)}</span>
        <span style={{
          fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600,
          color: positive ? 'var(--profit)' : 'var(--loss)',
        }}>
          {fmt(last, divisa)}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{fmtDate(labelLast)}</span>
      </div>
    </div>
  )
}

export default EquityCurve
