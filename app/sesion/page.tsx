import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SesionClient from './SesionClient'

export default async function SesionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const { data: trades } = await supabase
    .from('trade_executions')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)
    .order('created_at', { ascending: false })

  return <SesionClient userId={user.id} initialTrades={trades ?? []} />
}
