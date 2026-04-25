'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/login/page.tsx — Login con email/password + Google OAuth (Iter 3A)
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import {
  AuthShell, Field, ErrorBanner, Divider, GoogleIcon,
  authTitle, authSubtitle, authLink, traducirError,
} from './_shared'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(traducirError(error.message))
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  async function handleGoogle() {
    setError(null)
    setOauthLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(traducirError(error.message))
      setOauthLoading(false)
    }
  }

  return (
    <AuthShell>
      <h2 style={authTitle}>Iniciar sesión</h2>
      <p style={authSubtitle}>Accede a tu sistema de trading</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Field icon={<Mail size={14} />} type="email" label="Correo electrónico"
          value={email} onChange={setEmail} placeholder="tu@correo.com" required autoComplete="email" />
        <Field icon={<Lock size={14} />} type="password" label="Contraseña"
          value={password} onChange={setPassword} placeholder="••••••••" required autoComplete="current-password" />

        {error && <ErrorBanner text={error} />}

        <Button type="submit" variant="primary" size="md" loading={loading} fullWidth>
          Iniciar sesión
        </Button>
      </form>

      <Divider />

      <Button type="button" variant="secondary" size="md" loading={oauthLoading}
        onClick={handleGoogle} fullWidth icon={<GoogleIcon />}>
        Continuar con Google
      </Button>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        marginTop: 'var(--space-5)', textAlign: 'center',
      }}>
        <Link href="/auth/reset-password" style={authLink}>
          ¿Olvidaste tu contraseña?
        </Link>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0 }}>
          ¿No tienes cuenta?{' '}
          <Link href="/registro" style={{ ...authLink, fontWeight: 600 }}>
            Regístrate
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
