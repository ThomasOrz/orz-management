// ─────────────────────────────────────────────────────────────────────────
// app/auth/callback/route.ts — OAuth + email confirmation callback
// ─────────────────────────────────────────────────────────────────────────
// 1) intercambia el ?code por una sesión
// 2) si llega ?invitation=ORZ-XXX, valida y marca el código como usado
// 3) redirige al dashboard

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const invitation = url.searchParams.get('invitation')
  const next = url.searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=missing_code', request.url))
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
    )
  }

  // Si viene de /registro con código de invitación → validar + marcar usado
  if (invitation) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const trimmed = invitation.trim().toUpperCase()
      const { data: inv } = await supabase
        .from('invitation_codes')
        .select('id, used_at, expires_at')
        .eq('code', trimmed)
        .maybeSingle()

      if (
        !inv ||
        inv.used_at ||
        (inv.expires_at && new Date(inv.expires_at).getTime() <= Date.now())
      ) {
        // Código inválido → cerrar sesión y volver a registro
        await supabase.auth.signOut()
        return NextResponse.redirect(
          new URL('/registro?error=invalid_code', request.url),
        )
      }

      await supabase
        .from('invitation_codes')
        .update({ used_by: user.id, used_at: new Date().toISOString() })
        .eq('id', inv.id)
    }
  }

  return NextResponse.redirect(new URL(next, request.url))
}
