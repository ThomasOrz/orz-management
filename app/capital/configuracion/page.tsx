import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ConfiguracionClient from './ConfiguracionClient'
import type { TradingAccount } from '@/types/capital'

export default async function ConfiguracionCapitalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await supabase
    .from('trading_account')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!account) redirect('/capital/setup')

  return <ConfiguracionClient account={account as TradingAccount} userId={user.id} />
}
