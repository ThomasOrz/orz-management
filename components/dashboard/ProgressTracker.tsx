'use client'

// Heatmap estilo GitHub — muestra actividad de los últimos 16 semanas

interface DayData {
  date: string   // ISO date
  count: number  // trades ese día
  pnl: number    // R total ese día
}

interface Props { data: DayData[] }

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function cellColor(count: number, pnl: number): string {
  if (count === 0) return 'var(--bg-elevated)'
  if (pnl > 1)  return 'rgba(0,230,118,0.85)'
  if (pnl > 0)  return 'rgba(0,230,118,0.45)'
  if (pnl < -1) return 'rgba(255,59,74,0.85)'
  if (pnl < 0)  return 'rgba(255,59,74,0.45)'
  return 'rgba(251,191,36,0.5)' // breakeven
}

function buildWeeks(data: DayData[], nWeeks = 16): DayData[][] {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - nWeeks * 7)

  const map = new Map<string, DayData>()
  for (const d of data) map.set(d.date, d)

  const weeks: DayData[][] = []
  const cur = new Date(start)
  // Advance to Monday
  while (cur.getDay() !== 1) cur.setDate(cur.getDate() + 1)

  while (cur <= now) {
    const week: DayData[] = []
    for (let i = 0; i < 7; i++) {
      const iso = cur.toISOString().slice(0, 10)
      week.push(map.get(iso) ?? { date: iso, count: 0, pnl: 0 })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function ProgressTracker({ data }: Props) {
  const weeks = buildWeeks(data)

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
        Actividad de Trading
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 2 }}>
          {DAYS.map(d => (
            <div key={d} style={{ height: 12, fontSize: 8, color: 'var(--text-tertiary)', lineHeight: '12px', width: 10 }}>{d}</div>
          ))}
        </div>
        {/* Weeks grid */}
        <div style={{ display: 'flex', gap: 3, overflowX: 'auto', flex: 1 }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {week.map((day, di) => (
                <div
                  key={di}
                  title={`${day.date}: ${day.count} trades, ${day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(2)}R`}
                  style={{
                    width: 12, height: 12, borderRadius: 2,
                    background: cellColor(day.count, day.pnl),
                    cursor: day.count > 0 ? 'default' : undefined,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Menos</span>
        {['var(--bg-elevated)', 'rgba(0,230,118,0.45)', 'rgba(0,230,118,0.85)'].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Más wins</span>
        {['rgba(255,59,74,0.45)', 'rgba(255,59,74,0.85)'].map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>Losses</span>
      </div>
    </div>
  )
}

export default ProgressTracker
