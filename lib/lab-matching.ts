import type { LabSetup, SetupMetrics } from '@/types/lab'
import type { ClosedTrade } from '@/types/trading'

/**
 * Determina si un trade coincide con un setup.
 * Campos vacíos en el setup no filtran (matchean todo).
 * Match estricto: todas las condiciones definidas deben cumplirse.
 */
export function tradeMatchesSetup(trade: ClosedTrade, setup: LabSetup): boolean {
  if (setup.activos.length > 0 && !setup.activos.includes(trade.activo)) return false
  if (setup.sesiones.length > 0 && !setup.sesiones.includes(trade.sesion)) return false
  if (setup.triggers.length > 0 && !setup.triggers.includes(trade.trigger)) return false
  if (setup.zonas.length > 0 && !setup.zonas.includes(trade.zona_diario)) return false

  if (setup.sesgo && setup.sesgo !== 'ambos') {
    const tradeDir = trade.sesgo === 'Alcista' ? 'long' : trade.sesgo === 'Bajista' ? 'short' : null
    if (tradeDir !== setup.sesgo) return false
  }

  if (
    setup.emociones_permitidas.length > 0 &&
    trade.emocion &&
    !setup.emociones_permitidas.includes(trade.emocion)
  ) return false

  return true
}

/**
 * Calcula métricas de un setup contra todos los trades cerrados del usuario.
 * Auto-match silencioso: cualquier trade que coincida en características cuenta.
 */
export function computeSetupMetrics(setup: LabSetup, allClosedTrades: ClosedTrade[]): SetupMetrics {
  const matchingTrades = allClosedTrades.filter(t => tradeMatchesSetup(t, setup))
  const n = matchingTrades.length

  if (n === 0) {
    return {
      n_total: 0, n_wins: 0, n_losses: 0, n_breakevens: 0,
      win_rate: 0, r_promedio: 0, r_total: 0,
      profit_factor: null, max_drawdown_r: 0,
      veredicto: 'sin_data', significancia: 'sin_data',
    }
  }

  const wins = matchingTrades.filter(t => t.resultado === 'Win')
  const losses = matchingTrades.filter(t => t.resultado === 'Loss')
  const breakevens = matchingTrades.filter(t => t.resultado === 'Breakeven')

  const r_total = matchingTrades.reduce((sum, t) => sum + (t.r_obtenido ?? 0), 0)
  const r_promedio = r_total / n
  const win_rate = (wins.length / n) * 100

  const totalGain = wins.reduce((s, t) => s + (t.r_obtenido ?? 0), 0)
  const totalLoss = Math.abs(losses.reduce((s, t) => s + (t.r_obtenido ?? 0), 0))
  const profit_factor = totalLoss > 0 ? totalGain / totalLoss : null

  let peak = 0, equity = 0, max_dd = 0
  for (const t of matchingTrades) {
    equity += t.r_obtenido ?? 0
    if (equity > peak) peak = equity
    const dd = peak - equity
    if (dd > max_dd) max_dd = dd
  }

  let significancia: SetupMetrics['significancia']
  let veredicto: SetupMetrics['veredicto']

  if (n < 30) {
    significancia = 'insuficiente'
    veredicto = r_promedio > 0 ? 'tendencia_positiva' : 'tendencia_negativa'
    if (n < 10) veredicto = 'insuficiente'
  } else if (n < 50) {
    significancia = 'tendencia'
    veredicto = r_promedio > 0 ? 'tendencia_positiva' : 'tendencia_negativa'
  } else {
    significancia = 'significativo'
    veredicto = r_promedio > 0 ? 'confirmado_ganador' : 'confirmado_perdedor'
  }

  return {
    n_total: n,
    n_wins: wins.length,
    n_losses: losses.length,
    n_breakevens: breakevens.length,
    win_rate,
    r_promedio,
    r_total,
    profit_factor,
    max_drawdown_r: max_dd,
    veredicto,
    significancia,
  }
}
