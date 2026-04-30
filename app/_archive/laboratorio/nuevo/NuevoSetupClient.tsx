'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Save, FlaskConical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { MultiSelectChips } from '@/components/lab/MultiSelectChips'
import type { LabSetup, SetupSesgo, SetupEstado } from '@/types/lab'

const ACTIVOS = ['XAUUSD', 'NAS100']
const SESIONES = ['Londres', 'Nueva York', 'Overlap']
const TRIGGERS = ['T1 (V85+V50)', 'T2 (V85)', 'T3 (V85+EMAs)', 'Acumulación']
const ZONAS = ['Premium', 'Descuento', 'Media']
const EMOCIONES = ['Tranquilo', 'Confiado', 'Ansioso', 'Revanchista', 'Eufórico', 'Dudoso', 'Frustrado']
const SESGO_OPTS: { val: SetupSesgo; label: string }[] = [
  { val: 'long',  label: 'Long' },
  { val: 'short', label: 'Short' },
  { val: 'ambos', label: 'Ambos' },
]

interface FormData {
  nombre: string
  descripcion: string
  logica_esperada: string
  activos: string[]
  sesiones: string[]
  triggers: string[]
  zonas: string[]
  sesgo: SetupSesgo | ''
  emociones_permitidas: string[]
  timeframe: string
  confluencias_requeridas: string
  rr_objetivo: string
  riesgo_pct: string
  reglas_stop: string
  reglas_tp: string
  reglas_breakeven: string
  reglas_invalidacion: string
  max_trades_dia: string
}

const EMPTY_FORM: FormData = {
  nombre: '', descripcion: '', logica_esperada: '',
  activos: [], sesiones: [], triggers: [], zonas: [],
  sesgo: '', emociones_permitidas: [],
  timeframe: '', confluencias_requeridas: '',
  rr_objetivo: '2', riesgo_pct: '1',
  reglas_stop: '', reglas_tp: '', reglas_breakeven: '',
  reglas_invalidacion: '', max_trades_dia: '',
}

function formFromSetup(s: LabSetup): FormData {
  return {
    nombre: s.nombre,
    descripcion: s.descripcion ?? '',
    logica_esperada: s.logica_esperada ?? '',
    activos: s.activos,
    sesiones: s.sesiones,
    triggers: s.triggers,
    zonas: s.zonas,
    sesgo: s.sesgo ?? '',
    emociones_permitidas: s.emociones_permitidas,
    timeframe: s.timeframe ?? '',
    confluencias_requeridas: s.confluencias_requeridas ?? '',
    rr_objetivo: String(s.rr_objetivo),
    riesgo_pct: String(s.riesgo_pct),
    reglas_stop: s.reglas_stop ?? '',
    reglas_tp: s.reglas_tp ?? '',
    reglas_breakeven: s.reglas_breakeven ?? '',
    reglas_invalidacion: s.reglas_invalidacion ?? '',
    max_trades_dia: s.max_trades_dia != null ? String(s.max_trades_dia) : '',
  }
}

interface Props {
  userId: string
  initialData?: LabSetup
}

export default function NuevoSetupClient({ userId, initialData }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!initialData

  const [form, setForm] = useState<FormData>(
    initialData ? formFromSetup(initialData) : EMPTY_FORM,
  )
  const [sections, setSections] = useState({
    hipotesis: true,
    condiciones: !isEdit,
    riesgo: false,
    invalidacion: false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  function toggleSection(key: keyof typeof sections) {
    setSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function save(estado: SetupEstado) {
    setError(null)
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      logica_esperada: form.logica_esperada.trim() || null,
      activos: form.activos,
      sesiones: form.sesiones,
      triggers: form.triggers,
      zonas: form.zonas,
      sesgo: (form.sesgo || null) as SetupSesgo | null,
      emociones_permitidas: form.emociones_permitidas,
      timeframe: form.timeframe.trim() || null,
      confluencias_requeridas: form.confluencias_requeridas.trim() || null,
      rr_objetivo: parseFloat(form.rr_objetivo) || 2,
      riesgo_pct: parseFloat(form.riesgo_pct) || 1,
      reglas_stop: form.reglas_stop.trim() || null,
      reglas_tp: form.reglas_tp.trim() || null,
      reglas_breakeven: form.reglas_breakeven.trim() || null,
      reglas_invalidacion: form.reglas_invalidacion.trim() || null,
      max_trades_dia: form.max_trades_dia ? parseInt(form.max_trades_dia, 10) : null,
      estado,
    }

    if (isEdit && initialData) {
      const { error: err } = await supabase
        .from('lab_setups')
        .update(payload)
        .eq('id', initialData.id)
      if (err) { setError(err.message); setSaving(false); return }
      router.push(`/laboratorio/${initialData.id}`)
    } else {
      const { data: newSetup, error: err } = await supabase
        .from('lab_setups')
        .insert({ ...payload, user_id: userId })
        .select()
        .single()
      if (err || !newSetup) { setError(err?.message ?? 'Error al crear el setup'); setSaving(false); return }
      router.push(`/laboratorio/${newSetup.id}`)
    }
  }

  const sectionStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    marginBottom: 10,
  }
  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', cursor: 'pointer', userSelect: 'none',
    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
    background: 'none', border: 'none', width: '100%', textAlign: 'left',
  }
  const sectionBodyStyle = {
    padding: '0 16px 16px',
    display: 'flex', flexDirection: 'column' as const, gap: 14,
  }
  const rowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }

  return (
    <div className="page-content">
      <PageHeader
        title={isEdit ? 'Editar Setup' : 'Nuevo Setup'}
        subtitle={isEdit ? `Editando: ${initialData?.nombre}` : 'Define las condiciones y reglas de tu ventaja estadística.'}
        breadcrumb={[
          { label: 'Laboratorio', href: '/laboratorio' },
          { label: isEdit ? 'Editar' : 'Nuevo' },
        ]}
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

      {/* Sección 1: Hipótesis */}
      <div style={sectionStyle}>
        <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('hipotesis')}>
          Hipótesis
          {sections.hipotesis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {sections.hipotesis && (
          <div style={sectionBodyStyle}>
            <Input
              label="Nombre del setup *"
              placeholder="ej. Retroceso desde zona premium con T1"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
            />
            <Textarea
              label="Descripción"
              placeholder="Explica brevemente en qué consiste este setup..."
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={3}
            />
            <Textarea
              label="Lógica esperada"
              placeholder="¿Por qué debería funcionar este setup? ¿Qué contexto de mercado necesita?"
              value={form.logica_esperada}
              onChange={e => set('logica_esperada', e.target.value)}
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Sección 2: Condiciones de entrada */}
      <div style={sectionStyle}>
        <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('condiciones')}>
          Condiciones de entrada
          {sections.condiciones ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {sections.condiciones && (
          <div style={sectionBodyStyle}>
            <MultiSelectChips label="Activos" options={ACTIVOS} value={form.activos} onChange={v => set('activos', v)} />
            <MultiSelectChips label="Sesiones" options={SESIONES} value={form.sesiones} onChange={v => set('sesiones', v)} />
            <MultiSelectChips label="Triggers" options={TRIGGERS} value={form.triggers} onChange={v => set('triggers', v)} />
            <MultiSelectChips label="Zonas" options={ZONAS} value={form.zonas} onChange={v => set('zonas', v)} />

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 8 }}>
                Sesgo
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {SESGO_OPTS.map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => set('sesgo', form.sesgo === opt.val ? '' : opt.val)}
                    style={{
                      padding: '5px 16px', borderRadius: 'var(--radius-full)', fontSize: 12, fontWeight: 500,
                      cursor: 'pointer',
                      border: form.sesgo === opt.val ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                      background: form.sesgo === opt.val ? 'rgba(0,212,255,0.12)' : 'var(--bg-surface)',
                      color: form.sesgo === opt.val ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <MultiSelectChips label="Emociones permitidas" options={EMOCIONES} value={form.emociones_permitidas} onChange={v => set('emociones_permitidas', v)} />

            <div style={rowStyle}>
              <Input
                label="Timeframe"
                placeholder="ej. M15, H1"
                value={form.timeframe}
                onChange={e => set('timeframe', e.target.value)}
              />
            </div>
            <Textarea
              label="Confluencias requeridas"
              placeholder="Describe las confluencias necesarias para validar la entrada..."
              value={form.confluencias_requeridas}
              onChange={e => set('confluencias_requeridas', e.target.value)}
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Sección 3: Gestión de riesgo */}
      <div style={sectionStyle}>
        <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('riesgo')}>
          Gestión de riesgo
          {sections.riesgo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {sections.riesgo && (
          <div style={sectionBodyStyle}>
            <div style={rowStyle}>
              <Input
                label="RR objetivo"
                type="number"
                step="0.5"
                min="0"
                value={form.rr_objetivo}
                onChange={e => set('rr_objetivo', e.target.value)}
              />
              <Input
                label="Riesgo por trade (%)"
                type="number"
                step="0.1"
                min="0"
                value={form.riesgo_pct}
                onChange={e => set('riesgo_pct', e.target.value)}
              />
            </div>
            <Textarea
              label="Reglas de Stop Loss"
              placeholder="¿Dónde va el SL y por qué?"
              value={form.reglas_stop}
              onChange={e => set('reglas_stop', e.target.value)}
              rows={2}
            />
            <Textarea
              label="Reglas de Take Profit"
              placeholder="¿Dónde va el TP? ¿Parciales?"
              value={form.reglas_tp}
              onChange={e => set('reglas_tp', e.target.value)}
              rows={2}
            />
            <Textarea
              label="Reglas de Breakeven"
              placeholder="¿Cuándo y cómo mover a BE?"
              value={form.reglas_breakeven}
              onChange={e => set('reglas_breakeven', e.target.value)}
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Sección 4: Invalidación */}
      <div style={sectionStyle}>
        <button type="button" style={sectionHeaderStyle} onClick={() => toggleSection('invalidacion')}>
          Invalidación
          {sections.invalidacion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {sections.invalidacion && (
          <div style={sectionBodyStyle}>
            <Textarea
              label="Reglas de invalidación"
              placeholder="¿Qué condiciones invalidan este setup antes de entrar?"
              value={form.reglas_invalidacion}
              onChange={e => set('reglas_invalidacion', e.target.value)}
              rows={3}
            />
            <div style={{ maxWidth: 200 }}>
              <Input
                label="Máx. trades por día"
                type="number"
                min="1"
                placeholder="sin límite"
                value={form.max_trades_dia}
                onChange={e => set('max_trades_dia', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {isEdit ? (
          <Button
            icon={<Save size={15} />}
            loading={saving}
            onClick={() => save(initialData!.estado)}
          >
            Guardar cambios
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              icon={<Save size={15} />}
              loading={saving}
              onClick={() => save('draft')}
            >
              Guardar como borrador
            </Button>
            <Button
              icon={<FlaskConical size={15} />}
              loading={saving}
              onClick={() => save('testing')}
            >
              Empezar a testear
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
