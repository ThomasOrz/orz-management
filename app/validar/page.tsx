import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ValidarClient from './ValidarClient'

export default async function ValidarPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ValidarClient userId={user.id} />
}
