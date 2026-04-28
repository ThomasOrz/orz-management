import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminCapitalClient from './AdminCapitalClient'
import type { TradingAccount, CapitalMovement } from '@/types/capital'

export const dynamic = 'force-dynamic'

interface AccountWithProfile extends TradingAccount {
  email: string
  full_name: string | null
}

export default async function AdminCapitalPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') redirect('/')

  const [{ data: accounts }, { data: profiles }, { data: movements }] = await Promise.all([
    supabase.from('trading_account').select('*'),
    supabase.from('profiles').select('id, email, full_name').eq('role', 'student'),
    supabase.from('capital_movements').select('*').order('fecha', { ascending: true }),
  ])

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const enriched: AccountWithProfile[] = (accounts ?? []).map(acc => {
    const p = profileMap.get(acc.user_id)
    return {
      ...(acc as TradingAccount),
      email: p?.email ?? 'Desconocido',
      full_name: p?.full_name ?? null,
    }
  })

  return (
    <AdminCapitalClient
      accounts={enriched}
      allMovements={(movements ?? []) as CapitalMovement[]}
    />
  )
}
