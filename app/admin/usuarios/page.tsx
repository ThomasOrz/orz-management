// ─────────────────────────────────────────────────────────────────────────
// app/admin/usuarios/page.tsx — Panel admin de invitaciones (Iter 3A)
// ─────────────────────────────────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UsuariosClient from './UsuariosClient'

export const dynamic = 'force-dynamic'

export default async function AdminUsuariosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') redirect('/')

  const [{ data: codes }, { data: students }] = await Promise.all([
    supabase
      .from('invitation_codes')
      .select('id, code, email, full_name, used_by, used_at, expires_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return (
    <UsuariosClient
      initialCodes={codes ?? []}
      students={students ?? []}
    />
  )
}
