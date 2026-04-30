'use client'

interface DayPnL {
  date: string   // ISO 'YYYY-MM-DD'
  pnl: number    // R o USD
  trades: number
}

interface Props {
  data: DayPnL[]
  month?: number  // 0-11, defaults to current
  year?: number
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DOW_LABELS  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function getDayOfWeek(date: Date): number {
  // 0=Mon ... 6=Sun
  return (date.getDay() + 6) % 7
}

function cellBg(pnl: number, hasTrades: boolean): string {
  if (!hasTrades) return 'transparent'
  if (pnl > 0)  return `rgba(0,230,118,${Math.min(0.8, 0.15 + pnl * 0.1)})`
  if (pnl < 0)  return `rgba(255,59,74,${Math.min(0.8, 0.15 + Math.abs(pnl) * 0.1)})`
  return 'rgba(251,191,36,0.2)'
}

export function ProfitCalendar({ data, month, year }: Props) {
  const now   = new Date()
  const m     = month ?? now.getMonth()
  const y     = year  ?? now.getFullYear()
  const days  = getDaysInMonth(y, m)
  const startDow = getDayOfWeek(days[0])

  const map = new Map<string, DayPnL>()
  for (const d of data) map.set(d.date, d)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
          {MONTH_NAMES[m]} {y}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Profit Calendar</div>
      </div>

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 4 }}>
        {DOW_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {/* Empty cells before first day */}
        {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} />)}

        {days.map(day => {
          const iso  = day.toISOString().slice(0, 10)
          const info = map.get(iso)
          const bg   = cellBg(info?.pnl ?? 0, !!info)
          const isToday = iso === now.toISOString().slice(0, 10)

          return (
            <div
              key={iso}
              title={info ? `${iso}: ${info.trades} trades, ${info.pnl >= 0 ? '+' : ''}${info.pnl.toFixed(2)}R` : iso}
              style={{
                background: bg || 'var(--bg-elevated)',
                border: isToday ? '1px solid var(--accent-primary)' : '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 4px',
                minHeight: 52,
                display: 'flex', flexDirection: 'column', gap: 2,
              }}
            >
              <span style={{ fontSize: 11, color: isToday ? 'var(--accent-primary)' : 'var(--text-tertiary)', fontWeight: isToday ? 700 : 400 }}>
                {day.getDate()}
              </span>
              {info && (
                <>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                    color: info.pnl > 0 ? 'var(--profit)' : info.pnl < 0 ? 'var(--loss)' : 'var(--neutral)',
                  }}>
                    {info.pnl >= 0 ? '+' : ''}{info.pnl.toFixed(1)}R
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{info.trades}t</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ProfitCalendar
