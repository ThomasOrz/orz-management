import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EvaluacionClient from './EvaluacionClient'

export default async function EvaluacionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Últimos 7 días (incluyendo hoy)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekIso = weekAgo.toISOString()

  const [{ data: historial }, { data: weeklyTrades }] = await Promise.all([
    supabase
      .from('session_reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('fecha', { ascending: false })
      .limit(10),
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', weekIso)
      .order('created_at', { ascending: false }),
  ])

  return (
    <EvaluacionClient
      userId={user.id}
      historial={historial ?? []}
      weeklyTrades={weeklyTrades ?? []}
    />
  )
}
