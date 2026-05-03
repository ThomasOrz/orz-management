import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SesionesClient from './SesionesClient'
import type { Trade } from '@/types/trading'
import type { Strategy } from '@/types/strategy'

export const dynamic = 'force-dynamic'

export default async function SesionesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [tradesRes, strategiesRes] = await Promise.all([
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('strategies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  const trades     = ((tradesRes.data ?? []) as Trade[]).map(t => ({
    ...t,
    r_obtenido: t.r_obtenido ?? t.r_multiple ?? null,
  }))
  const strategies = (strategiesRes.data ?? []) as Strategy[]

  return (
    <SesionesClient
      userId={user.id}
      trades={trades}
      strategies={strategies}
    />
  )
}
