'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { TipoCuenta } from '@/types/capital'

interface PropFirmFields {
  limite_diario_pct: string
  limite_total_pct: string
  profit_target_pct: string
  dias_minimos: string
}

interface FormData extends PropFirmFields {
  capital_inicial: string
  divisa: string
  tipo_cuenta: TipoCuenta
  nombre_broker: string
  riesgo_default_pct: string
  fecha_inicio: string
  fecha_limite: string
}

const TIPO_OPTS: { val: TipoCuenta; label: string }[] = [
  { val: 'personal',     label: 'Personal' },
  { val: 'ftmo',         label: 'FTMO' },
  { val: 'fundednext',   label: 'FundedNext' },
  { val: 'myforexfunds', label: 'MyForexFunds' },
  { val: 'topstep',      label: 'TopStep' },
  { val: 'otra',         label: 'Otra' },
]

const PRESETS: Record<TipoCuenta, Partial<PropFirmFields>> = {
  personal:     {},
  ftmo:         { limite_diario_pct: '5', limite_total_pct: '10', profit_target_pct: '10', dias_minimos: '10' },
  fundednext:   { limite_diario_pct: '5', limite_total_pct: '10', profit_target_pct: '10', dias_minimos: '0' },
  myforexfunds: { limite_diario_pct: '4', limite_total_pct: '8',  profit_target_pct: '8',  dias_minimos: '0' },
  topstep:      { limite_diario_pct: '3', limite_total_pct: '6',  profit_target_pct: '6',  dias_minimos: '10' },
  otra:         {},
}

const EMPTY: FormData = {
  capital_inicial: '', divisa: 'USD', tipo_cuenta: 'personal',
  nombre_broker: '', riesgo_default_pct: '1',
  fecha_inicio: '', fecha_limite: '',
  limite_diario_pct: '', limite_total_pct: '', profit_target_pct: '', dias_minimos: '',
}

function applyPreset(tipo: TipoCuenta, form: FormData): FormData {
  const p = PRESETS[tipo]
  return {
    ...form,
    tipo_cuenta: tipo,
    limite_diario_pct:  p.limite_diario_pct  ?? '',
    limite_total_pct:   p.limite_total_pct   ?? '',
    profit_target_pct:  p.profit_target_pct  ?? '',
    dias_minimos:       p.dias_minimos        ?? '',
  }
}

interface Props {
  userId: string
  initialData?: FormData
  accountId?: string
  isEdit?: boolean
}

export default function SetupCuentaClient({ userId, initialData, accountId, isEdit = false }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState<FormData>(initialData ?? EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  function selectTipo(tipo: TipoCuenta) {
    setForm(prev => applyPreset(tipo, prev))
  }

  async function handleSubmit() {
    setError(null)
    const capital = parseFloat(form.capital_inicial)
    if (isNaN(capital) || capital <= 0) { setError('Ingresa un capital inicial válido.'); return }

    setSaving(true)
    const payload = {
      capital_inicial:    capital,
      capital_actual:     capital,
      divisa:             form.divisa || 'USD',
      tipo_cuenta:        form.tipo_cuenta,
      nombre_broker:      form.nombre_broker.trim() || null,
      riesgo_default_pct: parseFloat(form.riesgo_default_pct) || 1,
      fecha_inicio:       form.fecha_inicio || null,
      fecha_limite:       form.fecha_limite || null,
      limite_diario_pct:  form.limite_diario_pct  ? parseFloat(form.limite_diario_pct)  : null,
      limite_total_pct:   form.limite_total_pct   ? parseFloat(form.limite_total_pct)   : null,
      profit_target_pct:  form.profit_target_pct  ? parseFloat(form.profit_target_pct)  : null,
      dias_minimos:       form.dias_minimos        ? parseInt(form.dias_minimos, 10)      : null,
    }

    if (isEdit && accountId) {
      const { error: err } = await supabase
        .from('trading_account')
        .update(payload)
        .eq('id', accountId)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { error: err } = await supabase
        .from('trading_account')
        .insert({ ...payload, user_id: userId })
      if (err) { setError(err.message); setSaving(false); return }
    }

    router.push('/capital')
    router.refresh()
  }

  const hasPropFirm = form.tipo_cuenta !== 'personal'

  return (
    <div className="page-content" style={{ maxWidth: 600 }}>
      <PageHeader
        title={isEdit ? 'Configurar cuenta' : 'Nueva cuenta de trading'}
        subtitle={isEdit ? 'Actualiza los parámetros de tu cuenta.' : 'Configura tu cuenta para activar el tracking de capital.'}
        breadcrumb={isEdit ? [{ label: 'Capital', href: '/capital' }, { label: 'Configuración' }] : undefined}
      />

      {error && (
        <div style={{
          background: 'rgba(255,59,74,0.1)', border: '1px solid rgba(255,59,74,0.3)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          color: 'var(--loss)', fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <Card style={{ marginBottom: 12 }}>
        <SectionLabel>Tipo de cuenta</SectionLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {TIPO_OPTS.map(opt => (
            <button
              key={opt.val}
              type="button"
              onClick={() => selectTipo(opt.val)}
              style={{
                padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                border: form.tipo_cuenta === opt.val ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                background: form.tipo_cuenta === opt.val ? 'rgba(0,212,255,0.12)' : 'var(--bg-surface)',
                color: form.tipo_cuenta === opt.val ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {hasPropFirm && (
          <p style={{ fontSize: 11, color: 'var(--accent-primary)', marginBottom: 0 }}>
            Preset aplicado — ajusta las reglas si difieren de tu cuenta específica.
          </p>
        )}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <SectionLabel>Datos de la cuenta</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Input
            label="Capital inicial *"
            type="number"
            min="1"
            placeholder="ej: 10000"
            value={form.capital_inicial}
            onChange={e => set('capital_inicial', e.target.value)}
          />
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              Divisa
            </label>
            <select
              value={form.divisa}
              onChange={e => set('divisa', e.target.value)}
              className="input-pro"
              style={{ width: '100%' }}
            >
              {['USD', 'EUR', 'GBP', 'MXN'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <Input
            label="Broker / firma (opcional)"
            placeholder="ej: FTMO Challenge"
            value={form.nombre_broker}
            onChange={e => set('nombre_broker', e.target.value)}
          />
          <Input
            label="Riesgo default por trade (%)"
            type="number"
            step="0.1"
            min="0.1"
            value={form.riesgo_default_pct}
            onChange={e => set('riesgo_default_pct', e.target.value)}
            hint="para sugerencia en bitácora"
          />
        </div>
      </Card>

      {hasPropFirm && (
        <Card style={{ marginBottom: 12 }}>
          <SectionLabel>Reglas prop firm</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input
              label="Límite pérdida diaria (%)"
              type="number" step="0.1" min="0"
              placeholder="ej: 5"
              value={form.limite_diario_pct}
              onChange={e => set('limite_diario_pct', e.target.value)}
            />
            <Input
              label="Límite pérdida total (%)"
              type="number" step="0.1" min="0"
              placeholder="ej: 10"
              value={form.limite_total_pct}
              onChange={e => set('limite_total_pct', e.target.value)}
            />
            <Input
              label="Profit target (%)"
              type="number" step="0.1" min="0"
              placeholder="ej: 10"
              value={form.profit_target_pct}
              onChange={e => set('profit_target_pct', e.target.value)}
            />
            <Input
              label="Días mínimos a operar"
              type="number" min="0"
              placeholder="ej: 10"
              value={form.dias_minimos}
              onChange={e => set('dias_minimos', e.target.value)}
            />
            <Input
              label="Fecha inicio (opcional)"
              type="date"
              value={form.fecha_inicio}
              onChange={e => set('fecha_inicio', e.target.value)}
            />
            <Input
              label="Fecha límite (opcional)"
              type="date"
              value={form.fecha_limite}
              onChange={e => set('fecha_limite', e.target.value)}
            />
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <Button icon={<Wallet size={15} />} loading={saving} onClick={handleSubmit}>
          {isEdit ? 'Guardar cambios' : 'Crear cuenta'}
        </Button>
        {isEdit && (
          <Button variant="ghost" onClick={() => router.back()} disabled={saving}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', marginBottom: 12 }}>
      {children}
    </div>
  )
}
