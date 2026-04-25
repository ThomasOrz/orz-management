// ─────────────────────────────────────────────────────────────────────────
// components/ui/ActivityHeatmap.tsx — Heatmap GitHub-style (Iter 3)
// ─────────────────────────────────────────────────────────────────────────
// Cuadritos por día. Color según R neto, opacidad escalada por percentile.
// ─────────────────────────────────────────────────────────────────────────

import { Calendar } from 'lucide-react'

export interface HeatmapDay {
  date: string  // YYYY-MM-DD
  r: number
  trades: number
}

interface Props {
  data: HeatmapDay[]
  days?: number
  title?: string
  minDaysToRender?: number
}

const EMPTY_COLOR = '#1a1d24'

function opacityForMagnitude(magnitude: number, max: number): number {
  if (max <= 0) return 0.3
  const ratio = magnitude / max
  if (ratio >= 0.8) return 0.9
  if (ratio >= 0.55) return 0.7
  if (ratio >= 0.3) return 0.5
  return 0.3
}

export function ActivityHeatmap({ data, days = 90, title = 'Actividad últimos 90 días', minDaysToRender = 14 }: Props) {
  // Construimos un diccionario por fecha
  const byDate = new Map<string, HeatmapDay>()
  for (const d of data) byDate.set(d.date, d)

  // Generamos los últimos `days` días en orden ascendente
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cells: HeatmapDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    cells.push(byDate.get(iso) ?? { date: iso, r: 0, trades: 0 })
  }

  const operados = cells.filter((c) => c.trades > 0)
  const totalR = operados.reduce((s, c) => s + c.r, 0)
  const maxAbs = Math.max(...cells.map((c) => Math.abs(c.r)), 0.01)

  const enoughData = operados.length >= minDaysToRender

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      padding: 20,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#888', fontSize: 12, fontWeight: 500 }}>
          <Calendar size={14} />
          {title}
        </div>
        {enoughData && (
          <div style={{ fontSize: 11, color: '#666', fontFamily: 'var(--font-mono)' }}>
            {operados.length} días operados ·{' '}
            <span style={{ color: totalR >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
              {totalR >= 0 ? '+' : ''}{totalR.toFixed(2)}R
            </span>{' '}
            total
          </div>
        )}
      </div>

      {!enoughData ? (
        <div style={{
          padding: '32px 16px', textAlign: 'center',
          color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1.6,
        }}>
          Este heatmap se llenará a medida que registres trades.
          <br />
          <span style={{ fontSize: 11, color: '#555' }}>
            Llevas {operados.length} día{operados.length !== 1 ? 's' : ''} operado{operados.length !== 1 ? 's' : ''} de los últimos {days}. Necesitamos al menos {minDaysToRender} días para detectar patrones.
          </span>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(14px, 1fr))`,
            gap: 3,
          }}>
            {cells.map((c) => <Cell key={c.date} day={c} maxAbs={maxAbs} />)}
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginTop: 14, fontSize: 10, color: 'var(--text-tertiary)',
          }}>
            <span>Menos</span>
            <Swatch color={EMPTY_COLOR} />
            <Swatch color="var(--loss)" opacity={0.5} />
            <Swatch color="var(--loss)" opacity={0.9} />
            <Swatch color="var(--profit)" opacity={0.5} />
            <Swatch color="var(--profit)" opacity={0.9} />
            <span>Más</span>
          </div>
        </>
      )}
    </div>
  )
}

function Cell({ day, maxAbs }: { day: HeatmapDay; maxAbs: number }) {
  let bg = EMPTY_COLOR
  let title = `${day.date} · sin trades`
  if (day.trades > 0) {
    const op = opacityForMagnitude(Math.abs(day.r), maxAbs)
    const baseColor = day.r >= 0 ? '0,230,118' : '255,59,74'
    bg = `rgba(${baseColor}, ${op})`
    title = `${day.date} · ${day.trades} trades · ${day.r >= 0 ? '+' : ''}${day.r.toFixed(2)}R`
  }
  return (
    <div
      title={title}
      style={{
        aspectRatio: '1 / 1',
        background: bg,
        borderRadius: 2,
        minWidth: 10,
      }}
    />
  )
}

function Swatch({ color, opacity = 1 }: { color: string; opacity?: number }) {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: 2,
      background: color, opacity,
    }} />
  )
}

export default ActivityHeatmap
