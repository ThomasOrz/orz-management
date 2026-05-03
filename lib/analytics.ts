// ─────────────────────────────────────────────────────────────────────────
// lib/analytics.ts — Motor analítico (Fase 3.2)
// ─────────────────────────────────────────────────────────────────────────
// Funciones puras sobre arrays de Trade. Sin side-effects, sin I/O.
// Las queries a Supabase se hacen en el server component / page; estas
// funciones solo procesan los datos en memoria.
//
// Convenciones:
// - Solo se consideran trades cerrados (resultado !== null) salvo que se
//   indique lo contrario.
// - Win rate excluye breakevens del denominador (WR "puro").
// - R = múltiplo del riesgo (1R = pérdida típica).
// - Todas las funciones devuelven valores numéricos redondeados a 2 dec
//   en el caller, NO aquí (mantenemos precisión interna).
// ─────────────────────────────────────────────────────────────────────────

import type {
  Trade,
  ClosedTrade,
  Sesion,
  Trigger,
  Emocion,
  DiaSemana,
  SegmentStats,
  PatternStats,
  DangerAlert,
} from '@/types/trading'

export interface DashboardData {
  n: number
  wins: number
  losses: number
  winRate: number
  totalR: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  avgWinLossRatio: number
  dayWinRate: number
  adherencia: number
  maxDD: number
  cumPnlData: { date: string; cumPnl: number }[]
  ddData: { date: string; dd: number }[]
  activityData: { date: string; pnl: number; count: number }[]
  scatterData: { hour: number; r: number; label: string }[]
  durationData: { min: number; r: number; label: string }[]
  pnlNetByDay: { date: string; pnlNet: number }[]
}

// ─── Helpers internos ─────────────────────────────────────────────────────

function isClosed(t: Trade): t is ClosedTrade {
  return t.resultado !== null && t.r_obtenido !== null
}

function closedOnly(trades: Trade[]): ClosedTrade[] {
  return trades.filter(isClosed)
}

function sortByDateAsc(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

function summarize(trades: ClosedTrade[], segment: string): SegmentStats {
  const wins = trades.filter((t) => t.resultado === 'Win').length
  const losses = trades.filter((t) => t.resultado === 'Loss').length
  const breakevens = trades.filter((t) => t.resultado === 'Breakeven').length
  const decisivos = wins + losses
  const winRate = decisivos > 0 ? (wins / decisivos) * 100 : 0
  const totalR = trades.reduce((acc, t) => acc + t.r_obtenido, 0)
  const avgR = trades.length > 0 ? totalR / trades.length : 0

  return {
    segment,
    total: trades.length,
    wins,
    losses,
    breakevens,
    win_rate: winRate,
    avg_r: avgR,
    total_r: totalR,
  }
}

function groupBy<K extends string>(
  trades: ClosedTrade[],
  keyFn: (t: ClosedTrade) => K | null,
): Map<K, ClosedTrade[]> {
  const map = new Map<K, ClosedTrade[]>()
  for (const t of trades) {
    const k = keyFn(t)
    if (k === null) continue
    const arr = map.get(k) ?? []
    arr.push(t)
    map.set(k, arr)
  }
  return map
}

const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']

function getDiaSemana(iso: string): DiaSemana | null {
  // 0=Domingo, 1=Lunes, ..., 6=Sábado
  const d = new Date(iso).getUTCDay()
  if (d === 0 || d === 6) return null
  return DIAS_SEMANA[d - 1]
}

// ─────────────────────────────────────────────────────────────────────────
// 1. Stats por sesión (Londres / Nueva York / Overlap)
// ─────────────────────────────────────────────────────────────────────────

export function statsBySession(trades: Trade[]): SegmentStats[] {
  const closed = closedOnly(trades)
  const sesiones: Sesion[] = ['Londres', 'Nueva York', 'Overlap']
  return sesiones.map((s) =>
    summarize(closed.filter((t) => t.sesion === s), s),
  )
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Stats por trigger (T1 / T2 / T3 / Acumulación)
// ─────────────────────────────────────────────────────────────────────────

export function statsByTrigger(trades: Trade[]): SegmentStats[] {
  const closed = closedOnly(trades)
  const triggers: Trigger[] = [
    'T1 (V85+V50)',
    'T2 (V85)',
    'T3 (V85+EMAs)',
    'Acumulación',
  ]
  return triggers.map((tr) =>
    summarize(closed.filter((t) => t.trigger === tr), tr),
  )
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Stats por emoción
// ─────────────────────────────────────────────────────────────────────────

export function statsByEmotion(trades: Trade[]): SegmentStats[] {
  const closed = closedOnly(trades)
  const grupos = groupBy(closed, (t) => t.emocion)
  const result: SegmentStats[] = Array.from(grupos.entries()).map(
    ([emocion, ts]) => summarize(ts, emocion),
  )
  return result.sort((a, b) => a.avg_r - b.avg_r) // peores primero
}

// ─────────────────────────────────────────────────────────────────────────
// 4. Stats por día de la semana
// ─────────────────────────────────────────────────────────────────────────

export function statsByDayOfWeek(trades: Trade[]): SegmentStats[] {
  const closed = closedOnly(trades)
  return DIAS_SEMANA.map((dia) =>
    summarize(
      closed.filter((t) => getDiaSemana(t.created_at) === dia),
      dia,
    ),
  )
}

// ─────────────────────────────────────────────────────────────────────────
// 5. Stats por confluencia de zonas (Diario + H4)
// ─────────────────────────────────────────────────────────────────────────

export function statsByZoneConfluence(trades: Trade[]): SegmentStats[] {
  const closed = closedOnly(trades)
  const grupos = groupBy(closed, (t) => {
    const d = t.zona_diario
    const h = t.zona_h4 ?? 'sin H4'
    return `${d} / ${h}`
  })
  const result: SegmentStats[] = Array.from(grupos.entries()).map(
    ([conf, ts]) => summarize(ts, conf),
  )
  return result.sort((a, b) => b.win_rate - a.win_rate)
}

// ─────────────────────────────────────────────────────────────────────────
// 6. Patrón post-pérdida (qué hace el siguiente trade tras un Loss)
// ─────────────────────────────────────────────────────────────────────────

export function patternAfterLoss(trades: Trade[]): PatternStats {
  return patternAfter(trades, 'Loss')
}

// ─────────────────────────────────────────────────────────────────────────
// 7. Patrón post-ganancia
// ─────────────────────────────────────────────────────────────────────────

export function patternAfterWin(trades: Trade[]): PatternStats {
  return patternAfter(trades, 'Win')
}

function patternAfter(
  trades: Trade[],
  prevResult: 'Win' | 'Loss',
): PatternStats {
  const closed = closedOnly(sortByDateAsc(trades))
  let totalEvents = 0
  const nextTrades: ClosedTrade[] = []

  for (let i = 0; i < closed.length - 1; i++) {
    if (closed[i].resultado === prevResult) {
      totalEvents++
      nextTrades.push(closed[i + 1])
    }
  }

  const wins = nextTrades.filter((t) => t.resultado === 'Win').length
  const losses = nextTrades.filter((t) => t.resultado === 'Loss').length
  const decisivos = wins + losses
  const winRate = decisivos > 0 ? (wins / decisivos) * 100 : 0
  const avgR =
    nextTrades.length > 0
      ? nextTrades.reduce((a, t) => a + t.r_obtenido, 0) / nextTrades.length
      : 0

  return {
    total: totalEvents,
    next_total: nextTrades.length,
    next_wins: wins,
    next_losses: losses,
    next_win_rate: winRate,
    next_avg_r: avgR,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 8. Disciplina (% de trades que siguieron las reglas)
// ─────────────────────────────────────────────────────────────────────────

export function disciplineScore(trades: Trade[]): number {
  const conDato = trades.filter((t) => t.siguio_reglas !== null)
  if (conDato.length === 0) return 0
  const cumplidos = conDato.filter((t) => t.siguio_reglas === true).length
  return (cumplidos / conDato.length) * 100
}

// ─────────────────────────────────────────────────────────────────────────
// 9. Detección de patrones peligrosos
// ─────────────────────────────────────────────────────────────────────────
// Reglas:
// - WR con emoción "Revanchista" < 30%  → critical
// - WR post-pérdida < 30% con muestra ≥ 5  → warning
// - Disciplina global < 70% con ≥ 10 trades  → warning
// - Drawdown actual (racha pérdidas ≥ 4)  → warning
// - Cualquier sesión con WR < 30% y muestra ≥ 5  → warning
// - Cualquier trigger con WR < 30% y muestra ≥ 5  → info
// ─────────────────────────────────────────────────────────────────────────

export function detectDangerousPatterns(trades: Trade[]): DangerAlert[] {
  const alerts: DangerAlert[] = []
  const closed = closedOnly(trades)

  // 1. Revanchista
  const revanchistas = closed.filter((t) => t.emocion === 'Revanchista')
  if (revanchistas.length >= 3) {
    const stat = summarize(revanchistas, 'Revanchista')
    if (stat.win_rate < 30) {
      alerts.push({
        severity: 'critical',
        code: 'low_wr_revanchista',
        title: 'Operar revanchista te destruye',
        detail: `Tu WR cuando operas revanchista es ${stat.win_rate.toFixed(1)}% (${stat.wins}W/${stat.losses}L en ${stat.total} trades). Promedio ${stat.avg_r.toFixed(2)}R por trade. Para esa emoción la regla es no operar.`,
        metric: stat.win_rate,
      })
    }
  }

  // 2. Post-pérdida
  const postLoss = patternAfterLoss(trades)
  if (postLoss.next_total >= 5 && postLoss.next_win_rate < 30) {
    alerts.push({
      severity: 'warning',
      code: 'low_wr_after_loss',
      title: 'Tilt post-pérdida',
      detail: `Después de un Loss, tu WR del siguiente trade cae a ${postLoss.next_win_rate.toFixed(1)}% (muestra ${postLoss.next_total}). Considera pausa obligatoria post-Loss.`,
      metric: postLoss.next_win_rate,
    })
  }

  // 3. Disciplina
  if (trades.length >= 10) {
    const disc = disciplineScore(trades)
    if (disc < 70) {
      alerts.push({
        severity: 'warning',
        code: 'low_discipline',
        title: 'Disciplina baja',
        detail: `Solo seguiste tu plan en ${disc.toFixed(1)}% de los trades. La metodología ORZ exige >85%.`,
        metric: disc,
      })
    }
  }

  // 4. Racha de pérdidas activa
  const sorted = closedOnly(sortByDateAsc(trades))
  let lossStreak = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].resultado === 'Loss') lossStreak++
    else break
  }
  if (lossStreak >= 4) {
    alerts.push({
      severity: 'warning',
      code: 'active_loss_streak',
      title: `Racha de ${lossStreak} pérdidas consecutivas`,
      detail: `Llevas ${lossStreak} Losses seguidos. Detente, revisa tu modelo y haz backtesting antes del próximo trade.`,
      metric: lossStreak,
    })
  }

  // 5. Sesiones débiles
  for (const s of statsBySession(trades)) {
    if (s.total >= 5 && s.win_rate < 30) {
      alerts.push({
        severity: 'warning',
        code: `weak_session_${s.segment.toLowerCase().replace(/\s/g, '_')}`,
        title: `Sesión ${s.segment} no rinde`,
        detail: `WR en ${s.segment}: ${s.win_rate.toFixed(1)}% en ${s.total} trades (${s.total_r.toFixed(2)}R). Considera no operar esta sesión.`,
        metric: s.win_rate,
      })
    }
  }

  // 6. Triggers débiles
  for (const tr of statsByTrigger(trades)) {
    if (tr.total >= 5 && tr.win_rate < 30) {
      alerts.push({
        severity: 'info',
        code: `weak_trigger_${tr.segment}`,
        title: `Trigger ${tr.segment} flojo`,
        detail: `WR ${tr.win_rate.toFixed(1)}% en ${tr.total} trades. Revisa criterios de entrada.`,
        metric: tr.win_rate,
      })
    }
  }

  return alerts
}

// ─────────────────────────────────────────────────────────────────────────
// 10. Dashboard data — computación server-side para DashboardClient
// ─────────────────────────────────────────────────────────────────────────

export function computeDashboardData(trades: Trade[]): DashboardData {
  // Solo requiere resultado != null — r_obtenido puede ser null si el trade
  // fue cerrado sin stop loss. Los cálculos de R usan ?? 0 para esos casos.
  type DC = Trade & { resultado: NonNullable<Trade['resultado']> }
  const closed = trades.filter(
    (t): t is DC => t.resultado !== null
  )
  const n = closed.length

  if (n === 0) {
    return {
      n: 0, wins: 0, losses: 0, winRate: 0, totalR: 0,
      avgWin: 0, avgLoss: 0, profitFactor: 0, avgWinLossRatio: 0,
      dayWinRate: 0, adherencia: 0, maxDD: 0,
      cumPnlData: [], ddData: [], activityData: [], scatterData: [],
      durationData: [], pnlNetByDay: [],
    }
  }

  const wins   = closed.filter(t => t.resultado === 'Win').length
  const losses = closed.filter(t => t.resultado === 'Loss').length
  const winRate = (wins / n) * 100

  const totalR = closed.reduce((s, t) => s + (t.r_obtenido ?? 0), 0)

  const winRs  = closed.filter(t => (t.r_obtenido ?? 0) > 0).map(t => t.r_obtenido as number)
  const lossRs = closed.filter(t => (t.r_obtenido ?? 0) < 0).map(t => t.r_obtenido as number)
  const avgWin  = winRs.length  > 0 ? winRs.reduce((s, x) => s + x, 0)  / winRs.length  : 0
  const avgLoss = lossRs.length > 0 ? lossRs.reduce((s, x) => s + x, 0) / lossRs.length : 0
  const grossProfit = winRs.reduce((s, x) => s + x, 0)
  const grossLoss   = Math.abs(lossRs.reduce((s, x) => s + x, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0
  const avgWinLossRatio = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0

  const byDay = new Map<string, number>()
  const countByDay = new Map<string, number>()
  for (const t of closed) {
    const d = (t.exit_time ?? t.fecha_cierre ?? t.created_at).slice(0, 10)
    byDay.set(d, (byDay.get(d) ?? 0) + (t.r_obtenido ?? 0))
    countByDay.set(d, (countByDay.get(d) ?? 0) + 1)
  }

  const dayWins    = Array.from(byDay.values()).filter(v => v > 0).length
  const dayWinRate = byDay.size > 0 ? (dayWins / byDay.size) * 100 : 0

  const withRules  = closed.filter(t => t.siguio_reglas !== null || t.followed_plan !== null)
  const ruleValue  = (t: DC) => t.siguio_reglas ?? t.followed_plan
  const adherencia = withRules.length > 0
    ? (withRules.filter(t => ruleValue(t) === true).length / withRules.length) * 100
    : 0

  const sortedByDay = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  let cumR = 0
  const cumPnlData = sortedByDay.map(([date, r]) => {
    cumR += r
    return { date: date.slice(5).replace('-', '/'), cumPnl: parseFloat(cumR.toFixed(2)) }
  })

  let peak = 0, runningR = 0
  const ddData = sortedByDay.map(([date, r]) => {
    runningR += r
    if (runningR > peak) peak = runningR
    const dd = peak > 0 ? ((peak - runningR) / peak) * 100 * -1 : 0
    return { date: date.slice(5).replace('-', '/'), dd: parseFloat(dd.toFixed(2)) }
  })
  const maxDD = Math.abs(Math.min(0, ...ddData.map(d => d.dd)))

  const activityData = sortedByDay.map(([date, pnl]) => ({
    date,
    pnl: parseFloat(pnl.toFixed(2)),
    count: countByDay.get(date) ?? 0,
  }))

  const scatterData = closed.map(t => {
    const dt = new Date(t.exit_time ?? t.fecha_cierre ?? t.created_at)
    return {
      hour: dt.getUTCHours() + dt.getUTCMinutes() / 60,
      r: t.r_obtenido ?? 0,
      label: t.symbol ?? t.activo ?? '—',
    }
  })

  const durationData = closed
    .filter(t => t.hold_time_min !== null && t.hold_time_min > 0)
    .map(t => ({
      min: t.hold_time_min as number,
      r: t.r_obtenido ?? 0,
      label: t.symbol ?? t.activo ?? '—',
    }))

  const pnlNetByDayMap = new Map<string, number>()
  for (const t of closed) {
    const d = (t.exit_time ?? t.fecha_cierre ?? t.created_at).slice(0, 10)
    pnlNetByDayMap.set(d, (pnlNetByDayMap.get(d) ?? 0) + (t.pnl_net ?? t.pnl_usd ?? 0))
  }
  const pnlNetByDay = Array.from(pnlNetByDayMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, pnlNet]) => ({ date, pnlNet: parseFloat(pnlNet.toFixed(2)) }))

  return {
    n, wins, losses, winRate, totalR, avgWin, avgLoss,
    profitFactor, avgWinLossRatio, dayWinRate, adherencia, maxDD,
    cumPnlData, ddData, activityData, scatterData, durationData, pnlNetByDay,
  }
}
