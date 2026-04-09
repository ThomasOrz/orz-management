import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EvaluacionClient from './EvaluacionClient'

export default async function EvaluacionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: historial } = await supabase
    .from('session_reviews')
    .select('*')
    .eq('user_id', user.id)
    .order('fecha', { ascending: false })
    .limit(10)

  return <EvaluacionClient userId={user.id} historial={historial ?? []} />
}
