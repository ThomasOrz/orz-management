'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Trade {
  id: string
  activo: string
  direccion: string
  precio_entrada: number
  stop_loss: number
  take_profit: number
  emocion_pre_trade: string
  created_at: string
}

interface Props {
  userId: string
  initialTrades: Trade[]
}

const EMOCIONES = [
  { value: 'calma', label: 'Calma' },
  { value: 'ansiedad', label: 'Ansiedad' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'frustracion', label: 'Frustración' },
  { value: 'confianza', label: 'Confianza' },
  { value: 'revenge', label: 'Revenge' },
]

const emocionColors: Record<string, string> = {
  calma: '#4ade80',
  confianza: '#60a5fa',
  ansiedad: '#fbbf24',
  fomo: '#fb923c',
  frustracion: '#f87171',
  revenge: '#e879f9',
}

export default function SesionClient({ userId, initialTrades }: Props) {
  const supabase = createClient()
  const [trades, setTrades] = useState<Trade[]>(initialTrades)
  const [activo, setActivo] = useState('NAS100')
  const [direccion, setDireccion] = useState('Long')
  const [precioEntrada, setPrecioEntrada] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [emocion, setEmocion] = useState('calma')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const selectStyle = { backgroundColor: '#0a0a0a', border: '1px solid #333' }
  const inputStyle = { backgroundColor: '#0a0a0a', border: '1px solid #333' }

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    const { error: insertError, data } = await supabase
      .from('trade_executions')
      .insert({
        user_id: userId,
        activo,
        direccion,
        precio_entrada: parseFloat(precioEntrada),
        stop_loss: parseFloat(stopLoss),
        take_profit: parseFloat(takeProfit),
        emocion_pre_trade: emocion,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
    } else {
      setTrades(prev => [data, ...prev])
      setPrecioEntrada('')
      setStopLoss('')
      setTakeProfit('')
      setEmocion('calma')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Sesión</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{today}</p>
        </div>
        <div
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: '#1A9BD720', color: '#1A9BD7' }}
        >
          {trades.length}/3 trades
        </div>
      </div>

      {/* Formulario */}
      <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
        <h2 className="text-white font-semibold mb-5">Registrar trade</h2>
        <form onSubmit={handleRegistrar} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Activo</label>
              <select
                value={activo}
                onChange={e => setActivo(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none appearance-none"
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
                className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none appearance-none"
                style={selectStyle}
              >
                <option value="Long">Long</option>
                <option value="Short">Short</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Precio entrada', value: precioEntrada, set: setPrecioEntrada, placeholder: '0.00' },
              { label: 'Stop Loss', value: stopLoss, set: setStopLoss, placeholder: '0.00' },
              { label: 'Take Profit', value: takeProfit, set: setTakeProfit, placeholder: '0.00' },
            ].map(({ label, value, set, placeholder }) => (
              <div key={label}>
                <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
                <input
                  type="number"
                  step="any"
                  value={value}
                  onChange={e => set(e.target.value)}
                  required
                  placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-lg text-white text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Emoción pre-trade</label>
            <div className="flex flex-wrap gap-2">
              {EMOCIONES.map(em => (
                <button
                  key={em.value}
                  type="button"
                  onClick={() => setEmocion(em.value)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: emocion === em.value ? `${emocionColors[em.value]}20` : '#0a0a0a',
                    color: emocion === em.value ? emocionColors[em.value] : '#666',
                    border: `1px solid ${emocion === em.value ? emocionColors[em.value] : '#333'}`,
                  }}
                >
                  {em.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-3">{error}</p>
          )}
          {success && (
            <p className="text-green-400 text-sm bg-green-400/10 rounded-lg px-4 py-3">Trade registrado correctamente.</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-white font-semibold text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#1A9BD7' }}
          >
            {loading ? 'Registrando...' : 'Registrar trade'}
          </button>
        </form>
      </div>

      {/* Lista trades del día */}
      {trades.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#1A9BD7' }}>
            Trades del día
          </h3>
          <ul className="space-y-3">
            {trades.map((t, i) => {
              const rr = Math.abs((t.take_profit - t.precio_entrada) / (t.precio_entrada - t.stop_loss))
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between py-3 px-4 rounded-xl"
                  style={{ backgroundColor: '#0a0a0a', border: '1px solid #222' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs font-mono">#{i + 1}</span>
                    <div>
                      <span className="text-white text-sm font-medium">{t.activo}</span>
                      <span
                        className="ml-2 text-xs font-semibold px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: t.direccion === 'Long' ? '#16a34a20' : '#dc262620',
                          color: t.direccion === 'Long' ? '#4ade80' : '#f87171',
                        }}
                      >
                        {t.direccion}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>R:R {isFinite(rr) ? rr.toFixed(2) : '—'}</span>
                    <span
                      className="px-2 py-0.5 rounded"
                      style={{ backgroundColor: `${emocionColors[t.emocion_pre_trade] ?? '#666'}20`, color: emocionColors[t.emocion_pre_trade] ?? '#666' }}
                    >
                      {t.emocion_pre_trade}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {trades.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ backgroundColor: '#111111', border: '1px solid #222222' }}
        >
          <p className="text-gray-600 text-sm">No hay trades registrados hoy.</p>
        </div>
      )}
    </div>
  )
}
