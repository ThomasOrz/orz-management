'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Clasificacion = 'A+' | 'A' | 'B' | 'C' | string

interface Criterio {
  nombre: string
  cumple: boolean
  detalle?: string
}

interface ValidacionResult {
  criterios: Criterio[]
  clasificacion: Clasificacion
  puntos_ciegos: string[]
  veredicto: string
}

const clasificacionStyles: Record<string, { bg: string; text: string }> = {
  'A+': { bg: '#16a34a20', text: '#4ade80' },
  'A':  { bg: '#16a34a20', text: '#4ade80' },
  'B':  { bg: '#ca8a0420', text: '#fbbf24' },
  'C':  { bg: '#dc262620', text: '#f87171' },
}

export default function ValidarPage() {
  const supabase = createClient()

  const [activo, setActivo] = useState('NAS100')
  const [direccion, setDireccion] = useState('Long')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ValidacionResult | null>(null)

  async function handleValidar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesión activa')

      const res = await fetch(
        'https://ymosnytxyveedpsubdke.supabase.co/functions/v1/validate-setup',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ activo, direccion, descripcion }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status}`)
      }

      const data = await res.json()
      setResultado(data.validacion ?? data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const clsStyle = resultado
    ? (clasificacionStyles[resultado.clasificacion] ?? { bg: '#1A9BD720', text: '#1A9BD7' })
    : null

  const selectClass = "w-full px-4 py-3 rounded-lg text-white text-sm outline-none appearance-none"
  const selectStyle = { backgroundColor: '#0a0a0a', border: '1px solid #333' }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Validar Setup</h1>
        <p className="text-gray-500 text-sm mt-1">Analiza si tu setup cumple los criterios de calidad</p>
      </div>

      {/* Formulario */}
      <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
        <form onSubmit={handleValidar} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Activo</label>
              <select
                value={activo}
                onChange={e => setActivo(e.target.value)}
                className={selectClass}
                style={selectStyle}
              >
                <option value="NAS100">NAS100</option>
                <option value="XAUUSD">XAUUSD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Dirección</label>
              <select
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                className={selectClass}
                style={selectStyle}
              >
                <option value="Long">Long</option>
                <option value="Short">Short</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Descripción del setup</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              required
              rows={5}
              placeholder="Describe el contexto del mercado, estructura, zona de entrada, confluencias..."
              className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none resize-none"
              style={{ backgroundColor: '#0a0a0a', border: '1px solid #333' }}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !descripcion.trim()}
            className="w-full py-3 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#1A9BD7' }}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Validando...
              </>
            ) : 'Validar Setup'}
          </button>
        </form>
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="space-y-5">
          {/* Clasificación + veredicto */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Resultado</h2>
              {clsStyle && (
                <span
                  className="px-4 py-1.5 rounded-full text-sm font-bold"
                  style={{ backgroundColor: clsStyle.bg, color: clsStyle.text }}
                >
                  {resultado.clasificacion}
                </span>
              )}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{resultado.veredicto}</p>
          </div>

          {/* Criterios */}
          {resultado.criterios && resultado.criterios.length > 0 && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#1A9BD7' }}>
                Checklist de criterios
              </h3>
              <ul className="space-y-3">
                {resultado.criterios.map((c, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0">
                      {c.cumple ? (
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </span>
                    <div>
                      <p className={`text-sm font-medium ${c.cumple ? 'text-white' : 'text-gray-400'}`}>{c.nombre}</p>
                      {c.detalle && <p className="text-xs text-gray-500 mt-0.5">{c.detalle}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Puntos ciegos */}
          {resultado.puntos_ciegos && resultado.puntos_ciegos.length > 0 && (
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#fbbf24' }}>
                Puntos ciegos
              </h3>
              <ul className="space-y-2">
                {resultado.puntos_ciegos.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-yellow-400" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end pb-4">
            <button
              onClick={() => { setResultado(null); setDescripcion('') }}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-500 hover:text-white transition-colors"
              style={{ border: '1px solid #333' }}
            >
              Nuevo análisis
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
