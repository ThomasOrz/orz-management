import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CapitalClient from './CapitalClient'
import type { TradingAccount, CapitalMovement } from '@/types/capital'

export const dynamic = 'force-dynamic'

export default async function CapitalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await supabase
    .from('trading_account')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!account) redirect('/capital/setup')

  const { data: movements } = await supabase
    .from('capital_movements')
    .select('*')
    .eq('user_id', user.id)
    .order('fecha', { ascending: true })
    .limit(500)

  return (
    <CapitalClient
      account={account as TradingAccount}
      movements={(movements ?? []) as CapitalMovement[]}
      userId={user.id}
    />
  )
}
