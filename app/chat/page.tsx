'use client'

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

interface TraderContext {
  recentTrades?: Array<{
    activo: string; sesion: string; trigger: string; zona_diario: string
    resultado: 'Win' | 'Loss' | 'Breakeven'; r_obtenido: number
    emocion: string | null; siguio_reglas: boolean | null; created_at: string
  }>
  capital?: {
    capital_inicial: number; capital_actual: number; pnl_pct: number
    drawdown_actual_pct: number; tipo_cuenta: string; divisa: string
  } | null
  labSetups?: Array<{
    nombre: string; estado: string; n_total: number; win_rate: number; avg_r: number
  }>
}

const SALUDO_INICIAL: Mensaje = {
  rol: 'tefa',
  texto: '¡Hola! Soy Tefa, tu mentora de trading en ORZ Academy. Tengo acceso a tu historial, capital y análisis de ventaja. ¿En qué puedo ayudarte hoy?',
}

export default function ChatPage() {
  const supabase = createClient()
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO_INICIAL])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ctx, setCtx] = useState<TraderContext>({})
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load trader context once on mount
  useEffect(() => {
    async function loadCtx() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [
        { data: trades },
        { data: account },
        { data: setups },
        { data: movements },
      ] = await Promise.all([
        supabase.from('trades').select('activo,sesion,trigger,zona_diario,resultado,r_obtenido,emocion,siguio_reglas,created_at')
          .eq('user_id', user.id).eq('trade_cerrado', true).not('resultado', 'is', null).not('r_obtenido', 'is', null)
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('trading_account').select('capital_inicial,capital_actual,tipo_cuenta,divisa,limite_diario_pct').eq('user_id', user.id).maybeSingle(),
        supabase.from('lab_setups').select('nombre,estado').eq('user_id', user.id).in('estado', ['testing', 'validated']),
        supabase.from('capital_movements').select('monto,tipo,fecha').eq('user_id', user.id).order('fecha', { ascending: true }),
      ])

      // Compute PnL and drawdown from account + movements
      let capitalCtx: TraderContext['capital'] = null
      if (account) {
        const pnl_pct = account.capital_inicial > 0
          ? ((account.capital_actual - account.capital_inicial) / account.capital_inicial) * 100
          : 0
        // Simple drawdown: peak is capital_actual max across movements
        const movs = (movements ?? []) as Array<{ monto: number; tipo: string; fecha: string }>
        let peak = account.capital_inicial
        let running = account.capital_inicial
        let maxDD = 0
        for (const m of movs) {
          running += m.monto
          if (running > peak) peak = running
          const dd = peak > 0 ? ((peak - running) / peak) * 100 : 0
          if (dd > maxDD) maxDD = dd
        }
        // Current drawdown vs peak
        if (running > peak) peak = running
        const drawdown_actual_pct = peak > 0 ? ((peak - account.capital_actual) / peak) * 100 : 0

        capitalCtx = {
          capital_inicial: account.capital_inicial,
          capital_actual: account.capital_actual,
          pnl_pct,
          drawdown_actual_pct,
          tipo_cuenta: account.tipo_cuenta,
          divisa: account.divisa,
        }
      }

      // Compute light setup metrics
      const closedTrades = (trades ?? []) as TraderContext['recentTrades'] & object[]
      const labSetups: TraderContext['labSetups'] = (setups ?? []).map(s => {
        // simplified — pass 0s, EF does the heavy lifting
        return { nombre: s.nombre, estado: s.estado, n_total: 0, win_rate: 0, avg_r: 0 }
      })

      setCtx({ recentTrades: closedTrades ?? [], capital: capitalCtx, labSetups })
    }
    loadCtx()
  }, [supabase])

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

      const history = mensajes.slice(-20).map((m) => ({
        role: m.rol === 'usuario' ? 'user' : 'assistant',
        content: m.texto,
      }))

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-mentor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          // `message`/`history` → new EF (Iter 6); `mensaje`/`historial` → old EF still deployed
          body: JSON.stringify({ message: texto, history, mensaje: texto, historial: history, ...ctx }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }

      const data = await res.json()
      const respuesta: string = data.reply ?? data.respuesta ?? JSON.stringify(data)
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
                description="Preguntale sobre tu metodología, tus últimos trades, gestión de riesgo o psicología. Tiene acceso a todo tu contexto de trading."
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
