// ─────────────────────────────────────────────────────────────────────────
// app/page.tsx — Dashboard Principal (Fase 4)
// ─────────────────────────────────────────────────────────────────────────
// Server Component: auth + fetch de trader_stats + últimos 200 trades
// (para equity curve y analytics) + briefing de hoy + discipline_log de
// hoy. Pasa todo a DashboardClient.
// ─────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import type { Trade, TraderStats } from '@/types/trading'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().slice(0, 10)

  const [statsRes, tradesRes, briefingRes, disciplineRes] = await Promise.all([
    supabase
      .from('trader_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('briefings')
      .select('condicion, sesgo_nas100, sesgo_xauusd, narrativa, plan_accion, fecha')
      .eq('fecha', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('discipline_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('fecha', today)
      .maybeSingle(),
  ])

  const stats: TraderStats | null = (statsRes.data ?? null) as TraderStats | null
  // Normalizar r_obtenido: usar r_multiple (v2) como fallback para trades
  // cerrados via el nuevo modal que siempre escribe ambas columnas
  const trades: Trade[] = ((tradesRes.data ?? []) as Trade[]).map(t => ({
    ...t,
    r_obtenido: t.r_obtenido ?? t.r_multiple ?? null,
  }))
  const briefing = briefingRes.data ?? null
  const disciplineToday = disciplineRes.data ?? null

  return (
    <DashboardClient
      stats={stats}
      trades={trades}
      briefing={briefing}
      disciplineToday={disciplineToday}
      userEmail={user.email ?? ''}
    />
  )
}
