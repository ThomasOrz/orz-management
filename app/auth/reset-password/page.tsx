'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/auth/reset-password/page.tsx — Solicitar email de reset (Iter 3A)
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import {
  AuthShell, Field, ErrorBanner, SuccessBanner,
  authTitle, authSubtitle, authLink, traducirError,
} from '../../login/_shared'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setMessage(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/`,
    })
    if (error) {
      setError(traducirError(error.message))
    } else {
      setMessage('Si el email existe en nuestra base, recibirás un enlace para restablecer tu contraseña en los próximos minutos.')
    }
    setLoading(false)
  }

  return (
    <AuthShell>
      <h2 style={authTitle}>Restablecer contraseña</h2>
      <p style={authSubtitle}>Te enviaremos un enlace para crear una nueva</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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

        {error && <ErrorBanner text={error} />}
        {message && <SuccessBanner text={message} />}

        <Button type="submit" variant="primary" size="md" loading={loading} fullWidth>
          Enviar enlace
        </Button>
      </form>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: 0, marginTop: 'var(--space-5)', textAlign: 'center' }}>
        <Link href="/login" style={{ ...authLink, fontWeight: 600 }}>
          ← Volver al inicio de sesión
        </Link>
      </p>
    </AuthShell>
  )
}
