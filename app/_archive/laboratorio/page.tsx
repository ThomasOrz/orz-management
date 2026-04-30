import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LabClient from './LabClient'
import type { LabSetup } from '@/types/lab'
import type { ClosedTrade } from '@/types/trading'

export default async function LaboratorioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: setups }, { data: trades }] = await Promise.all([
    supabase
      .from('lab_setups')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('trade_cerrado', true)
      .not('resultado', 'is', null)
      .order('created_at', { ascending: true }),
  ])

  return (
    <LabClient
      setups={(setups ?? []) as LabSetup[]}
      closedTrades={(trades ?? []) as ClosedTrade[]}
    />
  )
}
