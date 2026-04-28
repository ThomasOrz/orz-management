import type { TradingAccount, CapitalMovement, CapitalMetrics, EquityPoint } from '@/types/capital'

export function computeCapitalMetrics(
  account: TradingAccount,
  movements: CapitalMovement[],
): CapitalMetrics {
  const sorted = [...movements].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  )

  // Equity curve para peak y drawdown máximo histórico
  let equity = account.capital_inicial
  let peak = account.capital_inicial
  let maxDD = 0

  for (const mov of sorted) {
    equity += mov.monto
    if (equity > peak) peak = equity
    const dd = peak - equity
    if (dd > maxDD) maxDD = dd
  }

  const drawdown_actual = peak - account.capital_actual
  const pnl_total = account.capital_actual - account.capital_inicial
  const pnl_total_pct = (pnl_total / account.capital_inicial) * 100

  // PnL hoy (solo trade_pnl del día actual)
  const hoy = new Date().toISOString().split('T')[0]
  const movsHoy = sorted.filter(m => m.fecha.startsWith(hoy) && m.tipo === 'trade_pnl')
  const pnl_hoy = movsHoy.reduce((s, m) => s + m.monto, 0)
  const pnl_hoy_pct = (pnl_hoy / account.capital_inicial) * 100

  // Días operados (días distintos con al menos un trade_pnl)
  const diasUnicos = new Set(
    sorted.filter(m => m.tipo === 'trade_pnl').map(m => m.fecha.split('T')[0]),
  )
  const dias_operados = diasUnicos.size

  // Progreso hacia profit target
  let profit_target_progreso_pct: number | null = null
  if (account.profit_target_pct && account.profit_target_pct > 0) {
    profit_target_progreso_pct = (pnl_total_pct / account.profit_target_pct) * 100
  }

  // Límite diario usado (solo si hay pérdida hoy)
  let limite_diario_usado_pct: number | null = null
  if (account.limite_diario_pct && pnl_hoy < 0) {
    limite_diario_usado_pct = (Math.abs(pnl_hoy_pct) / account.limite_diario_pct) * 100
  }

  // Límite total usado (drawdown vs limite total)
  let limite_total_usado_pct: number | null = null
  if (account.limite_total_pct && account.limite_total_pct > 0) {
    const dd_pct = (drawdown_actual / account.capital_inicial) * 100
    limite_total_usado_pct = (dd_pct / account.limite_total_pct) * 100
  }

  // Estado de alerta
  const usados = [limite_diario_usado_pct, limite_total_usado_pct].filter(
    (x): x is number => x !== null,
  )
  let estado_alerta: CapitalMetrics['estado_alerta'] = 'ok'
  if (usados.some(u => u >= 100)) estado_alerta = 'limite_excedido'
  else if (usados.some(u => u >= 80)) estado_alerta = 'danger'
  else if (usados.some(u => u >= 60)) estado_alerta = 'warning'

  return {
    capital_inicial: account.capital_inicial,
    capital_actual: account.capital_actual,
    pnl_total,
    pnl_total_pct,
    pnl_hoy,
    pnl_hoy_pct,
    drawdown_actual,
    drawdown_actual_pct: (drawdown_actual / account.capital_inicial) * 100,
    drawdown_max_historico: maxDD,
    drawdown_max_historico_pct: (maxDD / account.capital_inicial) * 100,
    peak_equity: peak,
    profit_target_pct: account.profit_target_pct,
    profit_target_progreso_pct,
    limite_diario_pct: account.limite_diario_pct,
    limite_diario_usado_pct,
    limite_total_pct: account.limite_total_pct,
    limite_total_usado_pct,
    dias_operados,
    dias_minimos: account.dias_minimos,
    estado_alerta,
  }
}

export function buildEquityCurve(
  capitalInicial: number,
  movements: CapitalMovement[],
): EquityPoint[] {
  const sorted = [...movements].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  )
  const points: EquityPoint[] = [
    { fecha: sorted[0]?.fecha ?? new Date().toISOString(), equity: capitalInicial },
  ]
  let equity = capitalInicial
  for (const mov of sorted) {
    equity += mov.monto
    points.push({ fecha: mov.fecha, equity })
  }
  return points
}
