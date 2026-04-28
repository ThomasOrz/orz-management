'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SetupCuentaClient from '@/app/capital/setup/SetupCuentaClient'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { TradingAccount, TipoCuenta } from '@/types/capital'

interface Props {
  account: TradingAccount
  userId: string
}

export default function ConfiguracionClient({ account, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  async function handleReset() {
    if (!window.confirm(
      '¿Resetear la cuenta? Se eliminarán TODOS los movimientos y el capital volverá al valor inicial.',
    )) return
    if (!window.confirm(
      '¿Confirmas definitivamente el reset? Esta acción NO se puede deshacer.',
    )) return

    setResetting(true)
    setResetError(null)

    const { error: delErr } = await supabase
      .from('capital_movements')
      .delete()
      .eq('user_id', userId)

    if (delErr) { setResetError(delErr.message); setResetting(false); return }

    const { error: updErr } = await supabase
      .from('trading_account')
      .update({ capital_actual: account.capital_inicial })
      .eq('id', account.id)

    if (updErr) { setResetError(updErr.message); setResetting(false); return }

    router.push('/capital')
    router.refresh()
  }

  const initialFormData = {
    capital_inicial:    String(account.capital_inicial),
    divisa:             account.divisa,
    tipo_cuenta:        account.tipo_cuenta as TipoCuenta,
    nombre_broker:      account.nombre_broker ?? '',
    riesgo_default_pct: String(account.riesgo_default_pct),
    fecha_inicio:       account.fecha_inicio ?? '',
    fecha_limite:       account.fecha_limite ?? '',
    limite_diario_pct:  account.limite_diario_pct  != null ? String(account.limite_diario_pct)  : '',
    limite_total_pct:   account.limite_total_pct   != null ? String(account.limite_total_pct)   : '',
    profit_target_pct:  account.profit_target_pct  != null ? String(account.profit_target_pct)  : '',
    dias_minimos:       account.dias_minimos        != null ? String(account.dias_minimos)        : '',
  }

  return (
    <div>
      <SetupCuentaClient
        userId={userId}
        initialData={initialFormData}
        accountId={account.id}
        isEdit
      />

      {/* Zona peligrosa */}
      <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 8 }}>
        <Card style={{ border: '1px solid rgba(255,59,74,0.3)', marginTop: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--loss)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Zona peligrosa
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            El reset elimina todos los movimientos de capital y restablece el capital actual al valor inicial. Esta acción no se puede deshacer.
          </p>
          {resetError && (
            <p style={{ fontSize: 12, color: 'var(--loss)', marginBottom: 10 }}>{resetError}</p>
          )}
          <Button variant="danger" loading={resetting} onClick={handleReset} size="sm">
            Resetear cuenta
          </Button>
        </Card>
      </div>
    </div>
  )
}
