'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/chat/page.tsx — Chat Mentor (rediseñado Iteración 1.5)
// ─────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

interface Mensaje {
  rol: 'usuario' | 'tefa'
  texto: string
}

const SALUDO_INICIAL: Mensaje = {
  rol: 'tefa',
  texto: '¡Hola! Soy Tefa, tu mentor de trading. ¿En qué puedo ayudarte hoy?',
}

export default function ChatPage() {
  const supabase = createClient()
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO_INICIAL])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function handleEnviar(e?: React.FormEvent) {
    e?.preventDefault()
    const texto = input.trim()
    if (!texto || loading) return

    setInput('')
    setError(null)
    setMensajes(prev => [...prev, { rol: 'usuario', texto }])
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesión activa')

      const historial = mensajes.slice(-20).map((m) => ({
        role: m.rol === 'usuario' ? 'user' : 'assistant',
        content: m.texto,
      }))

      const res = await fetch(
        'https://ymosnytxyveedpsubdke.supabase.co/functions/v1/chat-mentor',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mensaje: texto, historial }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const stage  = err.stage  ? ` [${err.stage}]`  : ''
        const detail = err.detail ? ` — ${err.detail}` : ''
        throw new Error(`${err.error ?? `Error ${res.status}`}${stage}${detail}`)
      }

      const data = await res.json()
      const respuesta: string = data.respuesta ?? data.message ?? JSON.stringify(data)
      setMensajes(prev => [...prev, { rol: 'tefa', texto: respuesta }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setMensajes(prev => prev.slice(0, -1))
      setInput(texto)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  const sinHistorial = mensajes.length === 1 && mensajes[0].rol === 'tefa'

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--space-12))' }}>
      <PageHeader
        title="Chat Mentor"
        subtitle="Tefa — IA de ORZ Academy"
      />

      <Card padding="none" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* Mensajes */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: 'var(--space-6)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
        }}>
          {sinHistorial ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState
                icon={<Sparkles size={28} />}
                title="Empezá tu conversación con Tefa"
                description="Preguntale sobre tu metodología, tus últimos trades, gestión de riesgo o psicología. Está entrenada con tu data."
              />
            </div>
          ) : (
            mensajes.map((m, i) => <Burbuja key={i} mensaje={m} />)
          )}

          {loading && <BurbujaLoading />}

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--loss-bg)',
              border: '1px solid var(--loss)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--loss)',
              fontSize: 'var(--text-xs)',
              alignSelf: 'center',
              maxWidth: '80%',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleEnviar}
          style={{
            display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end',
            padding: 'var(--space-4) var(--space-5)',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta… (Enter para enviar, Shift+Enter para nueva línea)"
            rows={1}
            className="input-pro"
            style={{
              flex: 1, resize: 'none', maxHeight: 140, minHeight: 44,
              fontFamily: 'var(--font-family)', lineHeight: 1.5,
            }}
            aria-label="Mensaje para Tefa"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={!input.trim() && !loading}
            icon={<Send size={14} />}
            aria-label="Enviar mensaje"
          />
        </form>
      </Card>
    </div>
  )
}

// ─── Burbujas ─────────────────────────────────────────────────────────────

function Avatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 'var(--radius-md)',
      background: 'var(--accent-primary-bg)',
      color: 'var(--accent-primary)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: 11, fontWeight: 700,
    }}>
      T
    </div>
  )
}

function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  const esUsuario = mensaje.rol === 'usuario'
  return (
    <div style={{
      display: 'flex',
      justifyContent: esUsuario ? 'flex-end' : 'flex-start',
      alignItems: 'flex-start',
      gap: 'var(--space-2)',
    }}>
      {!esUsuario && <Avatar />}
      <div style={{
        maxWidth: '76%',
        padding: '10px 14px',
        borderRadius: 'var(--radius-lg)',
        fontSize: 'var(--text-sm)',
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        ...(esUsuario
          ? {
              background: 'var(--accent-primary)',
              color: 'var(--bg-base)',
              borderTopRightRadius: 4,
              fontWeight: 500,
            }
          : {
              background: 'var(--bg-overlay)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderTopLeftRadius: 4,
            }),
      }}>
        {mensaje.texto}
      </div>
    </div>
  )
}

function BurbujaLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
      <Avatar />
      <div style={{
        padding: '12px 16px',
        borderRadius: 'var(--radius-lg)',
        borderTopLeftRadius: 4,
        background: 'var(--bg-overlay)',
        border: '1px solid var(--border-subtle)',
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--text-tertiary)',
              animation: 'bounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
        <style jsx>{`
          @keyframes bounce {
            0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-4px); }
          }
        `}</style>
      </div>
    </div>
  )
}
