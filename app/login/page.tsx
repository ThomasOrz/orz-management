'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'login' | 'registro'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/briefing')
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setMessage('Revisa tu correo para confirmar tu cuenta.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: '#1A9BD7' }}>
            <span className="text-white font-bold text-2xl">ORZ</span>
          </div>
          <h1 className="text-white text-2xl font-bold">ORZ Academy</h1>
          <p className="text-gray-400 text-sm mt-1">Sistema de Trading</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
          {/* Tabs */}
          <div className="flex rounded-lg overflow-hidden mb-8" style={{ backgroundColor: '#0a0a0a' }}>
            <button
              onClick={() => { setMode('login'); setError(null); setMessage(null) }}
              className="flex-1 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === 'login' ? '#1A9BD7' : 'transparent',
                color: mode === 'login' ? '#fff' : '#888',
              }}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setMode('registro'); setError(null); setMessage(null) }}
              className="flex-1 py-2.5 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === 'registro' ? '#1A9BD7' : 'transparent',
                color: mode === 'registro' ? '#fff' : '#888',
              }}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="tu@correo.com"
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none transition-all"
                style={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #333',
                }}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #333',
                }}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-3">{error}</p>
            )}
            {message && (
              <p className="text-green-400 text-sm bg-green-400/10 rounded-lg px-4 py-3">{message}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#1A9BD7' }}
            >
              {loading ? 'Cargando...' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
