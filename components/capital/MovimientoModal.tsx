'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { TipoMovimiento } from '@/types/capital'

const TIPOS: { val: 'deposito' | 'retiro' | 'ajuste'; label: string; sign: 1 | -1 | 0; color: string }[] = [
  { val: 'deposito', label: 'Depósito',  sign:  1, color: 'var(--profit)' },
  { val: 'retiro',   label: 'Retiro',    sign: -1, color: 'var(--loss)' },
  { val: 'ajuste',   label: 'Ajuste',    sign:  0, color: 'var(--accent-primary)' },
]

interface Props {
  open: boolean
  onClose: () => void
  userId: string
  accountId: string
}

export function MovimientoModal({ open, onClose, userId, accountId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [tipo, setTipo] = useState<'deposito' | 'retiro' | 'ajuste'>('deposito')
  const [monto, setMonto] = useState('')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    setTipo('deposito')
    setMonto('')
    setNota('')
    setError(null)
    onClose()
  }

  async function handleSubmit() {
    setError(null)
    const raw = parseFloat(monto)
    if (isNaN(raw) || raw === 0) { setError('Ingresa un monto válido diferente de 0.'); return }

    const cfg = TIPOS.find(t => t.val === tipo)!
    // Para retiro el monto se guarda negativo, para ajuste el usuario ingresa el monto (puede ser + o -)
    const montoFinal = tipo === 'retiro' ? -Math.abs(raw) : tipo === 'deposito' ? Math.abs(raw) : raw

    setSaving(true)
    const { error: err } = await supabase.from('capital_movements').insert({
      user_id: userId,
      tipo: tipo as TipoMovimiento,
      monto: montoFinal,
      nota: nota.trim() || `${cfg.label} manual`,
    })

    if (err) { setError(err.message); setSaving(false); return }

    const { data: acctData, error: fetchErr } = await supabase
      .from('trading_accounts')
      .select('capital_actual')
      .eq('id', accountId)
      .single()

    if (fetchErr) { setError(fetchErr.message); setSaving(false); return }

    const newCapital = parseFloat((acctData.capital_actual + montoFinal).toFixed(2))
    const { error: updateErr } = await supabase
      .from('trading_accounts')
      .update({ capital_actual: newCapital })
      .eq('id', accountId)

    if (updateErr) { setError(updateErr.message); setSaving(false); return }

    setSaving(false)
    handleClose()
    router.refresh()
  }

  const selectedCfg = TIPOS.find(t => t.val === tipo)!

  return (
    <Modal open={open} onClose={handleClose} title="Registrar movimiento" size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Tipo */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
            Tipo de movimiento
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {TIPOS.map(t => (
              <button
                key={t.val}
                type="button"
                onClick={() => setTipo(t.val)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: tipo === t.val ? `1px solid ${t.color}` : '1px solid var(--border-default)',
                  background: tipo === t.val ? `${t.color}18` : 'var(--bg-surface)',
                  color: tipo === t.val ? t.color : 'var(--text-secondary)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Monto */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
            Monto (USD)
            {tipo === 'retiro' && <span style={{ color: 'var(--loss)', marginLeft: 4 }}>— se registrará negativo</span>}
            {tipo === 'ajuste' && <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>— usa valor negativo para pérdida</span>}
          </label>
          <input
            type="number"
            step="0.01"
            value={monto}
            onChange={e => setMonto(e.target.value)}
            placeholder={tipo === 'ajuste' ? 'ej: -500 o 300' : 'ej: 1000'}
            className="input-pro"
            style={{ width: '100%' }}
          />
        </div>

        {/* Nota */}
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
            Nota (opcional)
          </label>
          <input
            type="text"
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="ej: Retiro para gastos personales"
            className="input-pro"
            style={{ width: '100%' }}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(255,59,74,0.1)', border: '1px solid rgba(255,59,74,0.3)',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px',
            color: 'var(--loss)', fontSize: 12,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            loading={saving}
            onClick={handleSubmit}
            style={{ background: selectedCfg.color !== 'var(--accent-primary)' ? selectedCfg.color : undefined }}
          >
            Registrar {selectedCfg.label.toLowerCase()}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default MovimientoModal
