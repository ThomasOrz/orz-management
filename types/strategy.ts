// types/strategy.ts

export interface Strategy {
  id: string
  user_id: string
  name: string
  description: string | null
  emoji: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface StrategyStats {
  strategy_id: string
  total_trades: number
  wins: number
  losses: number
  win_rate: number       // 0-100
  avg_win: number        // USD
  avg_loss: number       // USD (negative)
  total_pnl: number      // USD
  profit_factor: number
}
