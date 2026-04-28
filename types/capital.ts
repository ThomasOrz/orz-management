export type TipoCuenta = 'personal' | 'ftmo' | 'fundednext' | 'myforexfunds' | 'topstep' | 'otra'
export type TipoMovimiento = 'deposito' | 'retiro' | 'ajuste' | 'trade_pnl'

export interface TradingAccount {
  id: string
  user_id: string
  capital_inicial: number
  capital_actual: number
  divisa: string
  tipo_cuenta: TipoCuenta
  nombre_broker: string | null
  limite_diario_pct: number | null
  limite_total_pct: number | null
  profit_target_pct: number | null
  dias_minimos: number | null
  fecha_inicio: string | null
  fecha_limite: string | null
  riesgo_default_pct: number
  created_at: string
  updated_at: string
}

export interface CapitalMovement {
  id: string
  user_id: string
  tipo: TipoMovimiento
  monto: number
  trade_id: string | null
  nota: string | null
  fecha: string
}

export interface CapitalMetrics {
  capital_inicial: number
  capital_actual: number
  pnl_total: number
  pnl_total_pct: number
  pnl_hoy: number
  pnl_hoy_pct: number
  drawdown_actual: number
  drawdown_actual_pct: number
  drawdown_max_historico: number
  drawdown_max_historico_pct: number
  peak_equity: number
  // Prop firm tracking
  profit_target_pct: number | null
  profit_target_progreso_pct: number | null
  limite_diario_pct: number | null
  limite_diario_usado_pct: number | null
  limite_total_pct: number | null
  limite_total_usado_pct: number | null
  dias_operados: number
  dias_minimos: number | null
  estado_alerta: 'ok' | 'warning' | 'danger' | 'limite_excedido'
}

export interface EquityPoint {
  fecha: string
  equity: number
}
