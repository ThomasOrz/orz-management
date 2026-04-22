// ─────────────────────────────────────────────────────────────────────────
// types/trading.ts — Tipado estricto del dominio de trading ORZ
// ─────────────────────────────────────────────────────────────────────────
// Refleja el schema de la tabla `trades` (migración 001) y la vista
// `trader_stats` (migración 004). Usar SIEMPRE estos tipos en lugar de
// `any` o tipos ad-hoc en componentes/funciones.
// ─────────────────────────────────────────────────────────────────────────

export type Activo = 'XAUUSD' | 'NAS100'

export type Sesion = 'Londres' | 'Nueva York' | 'Overlap'

export type Sesgo = 'Alcista' | 'Bajista' | 'Neutral'

export type Zona = 'Premium' | 'Descuento' | 'Media'

export type TipoVela = 'V85' | 'V50' | 'V100' | 'Doji' | 'Martillo' | 'Estrella'

export type Trigger =
  | 'T1 (V85+V50)'
  | 'T2 (V85)'
  | 'T3 (V85+EMAs)'
  | 'Acumulación'

export type Resultado = 'Win' | 'Loss' | 'Breakeven'

export type Emocion =
  | 'Tranquilo'
  | 'Confiado'
  | 'Ansioso'
  | 'Revanchista'
  | 'Eufórico'
  | 'Dudoso'
  | 'Frustrado'

export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes'

// ─────────────────────────────────────────────────────────────────────────
// Trade (fila de la tabla `trades`)
// ─────────────────────────────────────────────────────────────────────────

export interface Trade {
  id: string
  user_id: string
  activo: Activo
  sesion: Sesion
  sesgo: Sesgo
  zona_diario: Zona
  zona_h4: Zona | null
  tipo_vela: TipoVela
  trigger: Trigger
  precio_entrada: number
  stop_loss: number
  take_profit: number
  resultado: Resultado | null            // null = trade abierto
  r_obtenido: number | null              // null si abierto o sin cerrar
  siguio_reglas: boolean | null
  regla_rota: string | null
  emocion: Emocion | null
  notas: string | null
  created_at: string                     // ISO timestamp
  updated_at: string

  // ── Iteración 1: contexto de mercado ─────────────────────────────
  precio_activo_entrada: number | null
  vix_entrada: number | null
  dxy_entrada: number | null
  spread_pips: number | null
  hora_exacta_trigger: string | null     // ISO timestamp

  // ── Iteración 1: contexto operativo ──────────────────────────────
  capital_cuenta: number | null
  riesgo_pct: number | null
  riesgo_r: number | null                // 0.5 | 1 | 1.5 | 2 (default 1)

  // ── Iteración 1: MAE/MFE (post-cierre) ───────────────────────────
  mae_r: number | null
  mfe_r: number | null
  tiempo_hasta_cierre_min: number | null

  // ── Iteración 1: justificación estructurada ──────────────────────
  razon_entrada: string | null
  plan_invalidacion: string | null
  leccion_aprendida: string | null

  // ── Iteración 1: screenshot + metadata cierre ────────────────────
  screenshot_url: string | null
  trade_cerrado: boolean
  fecha_cierre: string | null
}

// Trade cerrado: garantiza resultado y r_obtenido no-null
export interface ClosedTrade extends Trade {
  resultado: Resultado
  r_obtenido: number
}

// ─────────────────────────────────────────────────────────────────────────
// TraderStats (fila de la vista `trader_stats`)
// ─────────────────────────────────────────────────────────────────────────

export interface TraderStats {
  user_id: string
  total_trades: number
  wins: number
  losses: number
  breakevens: number
  win_rate: number                       // 0-100
  avg_r: number
  profit_factor: number | null           // null si no hay pérdidas
  max_drawdown_r: number                 // negativo o 0
  current_streak: number                 // signo: + wins, - losses
  best_streak: number
  worst_streak: number
  trades_last_7_days: number
  trades_last_30_days: number
  total_r: number
  discipline_pct: number                 // 0-100
}

// ─────────────────────────────────────────────────────────────────────────
// Tipos auxiliares para analytics
// ─────────────────────────────────────────────────────────────────────────

export interface SegmentStats {
  segment: string                        // ej: "Londres", "T1 (V85+V50)", "Revanchista"
  total: number                          // trades en este segmento
  wins: number
  losses: number
  breakevens: number
  win_rate: number                       // 0-100
  avg_r: number
  total_r: number
}

export interface PatternStats {
  total: number                          // # de eventos con el patrón
  next_total: number                     // # de trades siguientes analizados
  next_wins: number
  next_losses: number
  next_win_rate: number                  // 0-100
  next_avg_r: number
}

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface DangerAlert {
  severity: AlertSeverity
  code: string                           // ej: 'low_wr_revanchista'
  title: string
  detail: string
  metric?: number                        // valor numérico relevante
}
