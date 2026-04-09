'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Mensaje {
  rol: 'usuario' | 'tefa'
  texto: string
}

export default function ChatPage() {
  const supabase = createClient()
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { rol: 'tefa', texto: '¡Hola! Soy Tefa, tu mentor de trading. ¿En qué puedo ayudarte hoy?' },
  ])
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

      const res = await fetch(
        'https://ymosnytxyveedpsubdke.supabase.co/functions/v1/chat-mentor',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mensaje: texto }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
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

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#1A9BD720' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#1A9BD7" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Chat Mentor</h1>
            <p className="text-gray-500 text-xs">Tefa — IA de ORZ Academy</p>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      <div
        className="flex-1 overflow-y-auto rounded-2xl p-5 space-y-4 mb-4"
        style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
      >
        {mensajes.map((m, i) => (
          <div key={i} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
            {m.rol === 'tefa' && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
                style={{ backgroundColor: '#1A9BD720' }}
              >
                <span className="text-xs font-bold" style={{ color: '#1A9BD7' }}>T</span>
              </div>
            )}
            <div
              className="max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
              style={
                m.rol === 'usuario'
                  ? { backgroundColor: '#1A9BD7', color: '#fff' }
                  : { backgroundColor: '#1a1a1a', color: '#d1d5db', border: '1px solid #2a2a2a' }
              }
            >
              {m.texto}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
              style={{ backgroundColor: '#1A9BD720' }}
            >
              <span className="text-xs font-bold" style={{ color: '#1A9BD7' }}>T</span>
            </div>
            <div
              className="px-4 py-3 rounded-2xl flex gap-1 items-center"
              style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ backgroundColor: '#555', animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-xs text-center bg-red-400/10 rounded-lg px-4 py-2">{error}</p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 rounded-2xl p-3 flex gap-3 items-end"
        style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu pregunta... (Enter para enviar, Shift+Enter para nueva línea)"
          rows={1}
          className="flex-1 bg-transparent text-white text-sm outline-none resize-none placeholder-gray-600 py-2 px-1"
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={() => handleEnviar()}
          disabled={loading || !input.trim()}
          className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40"
          style={{ backgroundColor: '#1A9BD7' }}
        >
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
