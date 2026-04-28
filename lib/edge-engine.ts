import type { ClosedTrade, Activo, Sesion, Zona, Trigger, Emocion, DiaSemana } from '@/types/trading'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EdgeVeredicto =
  | 'sin_data'
  | 'insuficiente'
  | 'tendencia_positiva'
  | 'tendencia_negativa'
  | 'edge_confirmado'
  | 'drenaje_confirmado'

export type EdgeSignificancia = 'sin_data' | 'insuficiente' | 'tendencia' | 'significativo'

export interface EdgeSegment {
  label: string
  n_total: number
  n_wins: number
  n_losses: number
  n_breakevens: number
  win_rate: number       // 0-100
  avg_r: number
  total_r: number
  profit_factor: number | null
  veredicto: EdgeVeredicto
  significancia: EdgeSignificancia
}

export type Dimension1D = 'activo' | 'sesion' | 'trigger' | 'zona' | 'dia'
export type Dimension2D = 'activo_sesion' | 'sesion_trigger' | 'zona_trigger'

export interface EdgeRecommendation {
  type: 'foco' | 'evitar' | 'mejorar' | 'neutro'
  dimension: string
  label: string
  mensaje: string
  avg_r: number
  win_rate: number
  n: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Core computations
// ─────────────────────────────────────────────────────────────────────────────

export function computeSegment(label: string, trades: ClosedTrade[]): EdgeSegment {
  const n = trades.length
  if (n === 0) {
    return {
      label, n_total: 0, n_wins: 0, n_losses: 0, n_breakevens: 0,
      win_rate: 0, avg_r: 0, total_r: 0, profit_factor: null,
      veredicto: 'sin_data', significancia: 'sin_data',
    }
  }

  const wins = trades.filter(t => t.resultado === 'Win').length
  const losses = trades.filter(t => t.resultado === 'Loss').length
  const breakevens = trades.filter(t => t.resultado === 'Breakeven').length
  const total_r = trades.reduce((s, t) => s + t.r_obtenido, 0)
  const avg_r = total_r / n
  const win_rate = (wins / n) * 100

  const grossProfit = trades.filter(t => t.r_obtenido > 0).reduce((s, t) => s + t.r_obtenido, 0)
  const grossLoss = Math.abs(trades.filter(t => t.r_obtenido < 0).reduce((s, t) => s + t.r_obtenido, 0))
  const profit_factor = grossLoss > 0 ? grossProfit / grossLoss : null

  const significancia: EdgeSignificancia =
    n < 10  ? 'sin_data' :
    n < 30  ? 'insuficiente' :
    n < 50  ? 'tendencia' :
              'significativo'

  let veredicto: EdgeVeredicto
  if (significancia === 'sin_data') {
    veredicto = 'sin_data'
  } else if (significancia === 'insuficiente') {
    veredicto = 'insuficiente'
  } else if (significancia === 'tendencia') {
    veredicto = win_rate >= 55 ? 'tendencia_positiva' : win_rate < 45 ? 'tendencia_negativa' : 'insuficiente'
  } else {
    // significativo
    if (win_rate >= 55 && avg_r >= 0.5) veredicto = 'edge_confirmado'
    else if (win_rate < 40 || avg_r < 0) veredicto = 'drenaje_confirmado'
    else if (win_rate >= 55) veredicto = 'tendencia_positiva'
    else if (win_rate < 45) veredicto = 'tendencia_negativa'
    else veredicto = 'insuficiente'
  }

  return { label, n_total: n, n_wins: wins, n_losses: losses, n_breakevens: breakevens,
    win_rate, avg_r, total_r, profit_factor, veredicto, significancia }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1D analysis helpers
// ─────────────────────────────────────────────────────────────────────────────

function groupBy<K extends string>(trades: ClosedTrade[], keyFn: (t: ClosedTrade) => K | null): Map<K, ClosedTrade[]> {
  const map = new Map<K, ClosedTrade[]>()
  for (const t of trades) {
    const k = keyFn(t)
    if (k === null) continue
    const list = map.get(k) ?? []
    list.push(t)
    map.set(k, list)
  }
  return map
}

const DIAS: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
const JS_DAY_TO_DIA: Record<number, DiaSemana> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes',
}

function getDia(trade: ClosedTrade): DiaSemana | null {
  const jsDay = new Date(trade.created_at).getDay()
  return JS_DAY_TO_DIA[jsDay] ?? null
}

export function analyzeBy(trades: ClosedTrade[], dim: Dimension1D): EdgeSegment[] {
  if (dim === 'dia') return analyzeByDia(trades)

  const keyFn: (t: ClosedTrade) => string | null = {
    activo:  (t: ClosedTrade) => t.activo,
    sesion:  (t: ClosedTrade) => t.sesion,
    trigger: (t: ClosedTrade) => t.trigger,
    zona:    (t: ClosedTrade) => t.zona_diario,
  }[dim]

  const allValues: string[] = {
    activo:  ['XAUUSD', 'NAS100'] satisfies Activo[],
    sesion:  ['Londres', 'Nueva York', 'Overlap'] satisfies Sesion[],
    trigger: ['T1 (V85+V50)', 'T2 (V85)', 'T3 (V85+EMAs)', 'Acumulación'] satisfies Trigger[],
    zona:    ['Premium', 'Descuento', 'Media'] satisfies Zona[],
  }[dim]

  const groups = groupBy(trades, keyFn as (t: ClosedTrade) => string | null)
  return allValues.map(v => computeSegment(v, groups.get(v) ?? []))
    .filter(s => s.n_total > 0)
    .sort((a, b) => b.avg_r - a.avg_r)
}

export function analyzeByDia(trades: ClosedTrade[]): EdgeSegment[] {
  const groups = groupBy(trades, getDia)
  return DIAS
    .map(dia => computeSegment(dia, groups.get(dia) ?? []))
    .filter(s => s.n_total > 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// 2D analysis
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeBy2D(trades: ClosedTrade[], dim: Dimension2D): EdgeSegment[] {
  const keyFn: (t: ClosedTrade) => string | null = {
    activo_sesion:  (t: ClosedTrade) => `${t.activo} × ${t.sesion}`,
    sesion_trigger: (t: ClosedTrade) => `${t.sesion} × ${t.trigger}`,
    zona_trigger:   (t: ClosedTrade) => `${t.zona_diario} × ${t.trigger}`,
  }[dim]

  const groups = groupBy(trades, keyFn)
  return Array.from(groups.entries())
    .map(([label, ts]) => computeSegment(label, ts))
    .filter(s => s.n_total >= 10)
    .sort((a, b) => b.avg_r - a.avg_r)
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendations
// ─────────────────────────────────────────────────────────────────────────────

export function generateRecommendations(trades: ClosedTrade[]): EdgeRecommendation[] {
  const recs: EdgeRecommendation[] = []

  const dims: { dim: Dimension1D; label: string }[] = [
    { dim: 'activo',  label: 'Activo' },
    { dim: 'sesion',  label: 'Sesión' },
    { dim: 'trigger', label: 'Trigger' },
    { dim: 'zona',    label: 'Zona' },
    { dim: 'dia',     label: 'Día' },
  ]

  for (const { dim, label } of dims) {
    const segments = analyzeBy(trades, dim)
    for (const s of segments) {
      if (s.significancia === 'sin_data' || s.significancia === 'insuficiente') continue

      if (s.veredicto === 'edge_confirmado') {
        recs.push({
          type: 'foco',
          dimension: label,
          label: s.label,
          mensaje: `${label} "${s.label}" tiene edge estadístico confirmado: WR ${s.win_rate.toFixed(1)}% con R promedio +${s.avg_r.toFixed(2)} en ${s.n_total} trades. Priorizar este segmento.`,
          avg_r: s.avg_r,
          win_rate: s.win_rate,
          n: s.n_total,
        })
      } else if (s.veredicto === 'drenaje_confirmado') {
        recs.push({
          type: 'evitar',
          dimension: label,
          label: s.label,
          mensaje: `${label} "${s.label}" confirma drenaje de capital: WR ${s.win_rate.toFixed(1)}% con R promedio ${s.avg_r.toFixed(2)} en ${s.n_total} trades. Considerar eliminar este segmento.`,
          avg_r: s.avg_r,
          win_rate: s.win_rate,
          n: s.n_total,
        })
      } else if (s.veredicto === 'tendencia_positiva') {
        recs.push({
          type: 'mejorar',
          dimension: label,
          label: s.label,
          mensaje: `${label} "${s.label}" muestra tendencia positiva (WR ${s.win_rate.toFixed(1)}%, R ${s.avg_r.toFixed(2)}). Acumular más muestra para confirmar edge.`,
          avg_r: s.avg_r,
          win_rate: s.win_rate,
          n: s.n_total,
        })
      } else if (s.veredicto === 'tendencia_negativa') {
        recs.push({
          type: 'mejorar',
          dimension: label,
          label: s.label,
          mensaje: `${label} "${s.label}" muestra tendencia negativa (WR ${s.win_rate.toFixed(1)}%, R ${s.avg_r.toFixed(2)}). Revisar lógica o reducir exposición.`,
          avg_r: s.avg_r,
          win_rate: s.win_rate,
          n: s.n_total,
        })
      }
    }
  }

  // Ordenar: foco primero, luego evitar, mejorar, neutro; dentro de cada tipo por avg_r desc
  const order: EdgeRecommendation['type'][] = ['foco', 'evitar', 'mejorar', 'neutro']
  recs.sort((a, b) => {
    const oi = order.indexOf(a.type) - order.indexOf(b.type)
    return oi !== 0 ? oi : b.avg_r - a.avg_r
  })

  return recs.slice(0, 8)
}
