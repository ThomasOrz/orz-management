import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EstrategiasClient from './EstrategiasClient'
import type { Strategy, StrategyStats } from '@/types/strategy'
import type { Trade } from '@/types/trading'

export const dynamic = 'force-dynamic'

export default async function EstrategiasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load strategies; if empty, seed defaults
  let { data: strategies } = await supabase
    .from('strategies')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!strategies || strategies.length === 0) {
    await supabase.rpc('seed_default_strategies', { p_user_id: user.id })
    const { data: seeded } = await supabase
      .from('strategies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    strategies = seeded ?? []
  }

  // Load trades with strategy_id or trigger to compute stats
  const { data: tradesRaw } = await supabase
    .from('trades')
    .select('strategy_id, resultado, r_obtenido, pnl_net, pnl_usd, trigger')
    .eq('user_id', user.id)
    .eq('trade_cerrado', true)
    .not('resultado', 'is', null)

  const trades = (tradesRaw ?? []) as Array<
    Pick<Trade, 'resultado' | 'r_obtenido'> & {
      strategy_id: string | null
      pnl_net: number | null
      pnl_usd: number | null
      trigger: string | null
    }
  >

  // Compute stats per strategy
  const stats: StrategyStats[] = (strategies ?? []).map(s => {
    const matched = trades.filter(t => t.strategy_id === s.id)
    if (matched.length === 0) {
      return { strategy_id: s.id, total_trades: 0, wins: 0, losses: 0, win_rate: 0, avg_win: 0, avg_loss: 0, total_pnl: 0, profit_factor: 0 }
    }

    const wins   = matched.filter(t => t.resultado === 'Win').length
    const losses = matched.filter(t => t.resultado === 'Loss').length
    const win_rate = (wins / matched.length) * 100

    // Use pnl_net → pnl_usd → r_obtenido as proxy
    const pnls = matched.map(t => t.pnl_net ?? t.pnl_usd ?? (t.r_obtenido ?? 0) * 100)
    const total_pnl  = pnls.reduce((s, x) => s + x, 0)
    const winPnls    = pnls.filter(x => x > 0)
    const lossPnls   = pnls.filter(x => x < 0)
    const avg_win    = winPnls.length > 0 ? winPnls.reduce((s, x) => s + x, 0) / winPnls.length : 0
    const avg_loss   = lossPnls.length > 0 ? lossPnls.reduce((s, x) => s + x, 0) / lossPnls.length : 0
    const grossProfit = winPnls.reduce((s, x) => s + x, 0)
    const grossLoss   = Math.abs(lossPnls.reduce((s, x) => s + x, 0))
    const profit_factor = grossLoss > 0 ? grossProfit / grossLoss : 0

    return { strategy_id: s.id, total_trades: matched.length, wins, losses, win_rate, avg_win, avg_loss, total_pnl, profit_factor }
  })

  return (
    <EstrategiasClient
      strategies={(strategies ?? []) as Strategy[]}
      stats={stats}
    />
  )
}
