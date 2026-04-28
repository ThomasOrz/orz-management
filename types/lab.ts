export type SetupEstado = 'draft' | 'testing' | 'validated' | 'discarded' | 'paused'
export type SetupSesgo = 'long' | 'short' | 'ambos'

export interface LabSetup {
  id: string
  user_id: string
  nombre: string
  descripcion: string | null
  logica_esperada: string | null
  activos: string[]
  sesiones: string[]
  triggers: string[]
  zonas: string[]
  sesgo: SetupSesgo | null
  emociones_permitidas: string[]
  timeframe: string | null
  confluencias_requeridas: string | null
  rr_objetivo: number
  riesgo_pct: number
  reglas_stop: string | null
  reglas_tp: string | null
  reglas_breakeven: string | null
  reglas_invalidacion: string | null
  max_trades_dia: number | null
  estado: SetupEstado
  created_at: string
  updated_at: string
}

export interface SetupMetrics {
  n_total: number
  n_wins: number
  n_losses: number
  n_breakevens: number
  win_rate: number
  r_promedio: number
  r_total: number
  profit_factor: number | null
  max_drawdown_r: number
  veredicto: 'sin_data' | 'insuficiente' | 'tendencia_positiva' | 'tendencia_negativa' | 'confirmado_ganador' | 'confirmado_perdedor'
  significancia: 'sin_data' | 'insuficiente' | 'tendencia' | 'significativo'
}
