'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/registro/page.tsx — Auto-registro con código de invitación (Iter 3A)
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Ticket, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import {
  AuthShell, Field, ErrorBanner, SuccessBanner, Divider, GoogleIcon,
  authTitle, authSubtitle, authLink, traducirError,
} from '../login/_shared'

interface InvitationRow {
  id: string
  code: string
  email: string | null
  full_name: string | null
  used_at: string | null
  expires_at: string | null
}

export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()

  const [code, setCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  async function validateCode(): Promise<InvitationRow | null> {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError('Ingresa tu código de invitación.')
      return null
    }
    const { data, error } = await supabase
      .from('invitation_codes')
      .select('id, code, email, full_name, used_at, expires_at')
      .eq('code', trimmed)
      .maybeSingle()

    if (error) {
      console.error('[validateCode] Supabase error:', error)
      setError(`Error al verificar el código (${error.code ?? error.message}). Intenta de nuevo.`)
      return null
    }
    if (!data) {
      setError('Código no encontrado. Verifica con tu mentor.')
      return null
    }
    if (data.used_at) {
      setError('Este código ya fue usado.')
      return null
    }
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      setError('Este código expiró. Pídele uno nuevo a tu mentor.')
      return null
    }
    return data as InvitationRow
  }

  async function markCodeUsed(invitationId: string, userId: string) {
    await supabase
      .from('invitation_codes')
      .update({ used_by: userId, used_at: new Date().toISOString() })
      .eq('id', invitationId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const invitation = await validateCode()
    if (!invitation) { setLoading(false); return }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false); return
    }

    const { data, error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupErr) {
      setError(traducirError(signupErr.message))
      setLoading(false); return
    }

    // Marca el código como usado si tenemos user (puede ser null si requiere confirmación de email)
    if (data.user) {
      await markCodeUsed(invitation.id, data.user.id)
    }

    if (data.session) {
      router.push('/')
      router.refresh()
    } else {
      setMessage('Cuenta creada. Revisa tu correo para confirmar tu email y luego inicia sesión.')
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setMessage(null)
    const invitation = await validateCode()
    if (!invitation) return

    setOauthLoading(true)
    // Pasamos el código en el redirectTo para validarlo en el callback
    const redirectTo = `${window.location.origin}/auth/callback?invitation=${invitation.code}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      setError(traducirError(error.message))
      setOauthLoading(false)
    }
  }

  return (
    <AuthShell>
      <h2 style={authTitle}>Crear cuenta</h2>
      <p style={authSubtitle}>Necesitas un código de invitación de ORZ Academy</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Field
          icon={<Ticket size={14} />}
          type="text"
          label="Código de invitación"
          value={code}
          onChange={setCode}
          placeholder="ORZ-A4K9X2"
          required
          uppercase
          hint="Tu mentor te envió este código por WhatsApp o email"
        />
        <Field
          icon={<User size={14} />}
          type="text"
          label="Nombre completo"
          value={fullName}
          onChange={setFullName}
          placeholder="Juan Pérez"
          autoComplete="name"
        />
        <Field
          icon={<Mail size={14} />}
          type="email"
          label="Correo electrónico"
          value={email}
          onChange={setEmail}
          placeholder="tu@correo.com"
          required
          autoComplete="email"
        />
        <Field
          icon={<Lock size={14} />}
          type="password"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          placeholder="Mínimo 6 caracteres"
          required
          autoComplete="new-password"
        />

        {error && <ErrorBanner text={error} />}
        {message && <SuccessBanner text={message} />}

        <Button type="submit" variant="primary" size="md" loading={loading} fullWidth>
          Crear cuenta
        </Button>
      </form>

      <Divider />

      <Button type="button" variant="secondary" size="md" loading={oauthLoading}
        onClick={handleGoogle} fullWidth icon={<GoogleIcon />}>
        Continuar con Google
      </Button>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0, marginTop: 'var(--space-5)', textAlign: 'center' }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" style={{ ...authLink, fontWeight: 600 }}>
          Inicia sesión
        </Link>
      </p>
    </AuthShell>
  )
}
