import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NuevoSetupClient from './NuevoSetupClient'

export default async function NuevoSetupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <NuevoSetupClient userId={user.id} />
}
