import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BriefingClient from './BriefingClient'

export default async function BriefingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const { data: briefing } = await supabase
    .from('briefings')
    .select('*')
    .eq('date', today)
    .eq('user_id', user.id)
    .maybeSingle()

  return <BriefingClient initialBriefing={briefing} userId={user.id} />
}
