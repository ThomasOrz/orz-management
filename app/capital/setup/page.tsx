import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SetupCuentaClient from './SetupCuentaClient'

export default async function SetupCuentaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Si ya existe cuenta, redirigir a /capital
  const { data: account } = await supabase
    .from('trading_account')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (account) redirect('/capital')

  return <SetupCuentaClient userId={user.id} />
}
