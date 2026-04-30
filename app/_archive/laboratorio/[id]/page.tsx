import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SetupDetailClient from './SetupDetailClient'
import type { LabSetup } from '@/types/lab'
import type { ClosedTrade } from '@/types/trading'

export default async function SetupDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: setup }, { data: trades }] = await Promise.all([
    supabase
      .from('lab_setups')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('trade_cerrado', true)
      .not('resultado', 'is', null)
      .order('created_at', { ascending: true }),
  ])

  if (!setup) notFound()

  return (
    <SetupDetailClient
      setup={setup as LabSetup}
      allClosedTrades={(trades ?? []) as ClosedTrade[]}
    />
  )
}
