import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import NuevoSetupClient from '@/app/laboratorio/nuevo/NuevoSetupClient'
import type { LabSetup } from '@/types/lab'

export default async function EditarSetupPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: setup } = await supabase
    .from('lab_setups')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!setup) notFound()

  return <NuevoSetupClient userId={user.id} initialData={setup as LabSetup} />
}
