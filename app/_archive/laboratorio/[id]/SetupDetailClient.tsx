'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2, FlaskConical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { EstadoBadge } from '@/components/lab/EstadoBadge'
import { VeredictoBadge } from '@/components/lab/VeredictoBadge'
import { tradeMatchesSetup, computeSetupMetrics } from '@/lib/lab-matching'
import type { LabSetup, SetupEstado } from '@/types/lab'
import type { ClosedTrade } from '@/types/trading'

const ESTADO_OPTS: { val: SetupEstado; label: string }[] = [
  { val: 'draft',     label: 'Borrador' },
  { val: 'testing',   label: 'En testing' },
  { val: 'validated', label: 'Validado' },
  { val: 'discarded', label: 'Descartado' },
  { val: 'paused',    label: 'Pausado' },
]

interface Props {
  setup: LabSetup
  allClosedTrades: ClosedTrade[]
}

function Sparkline({ trades }: { trades: ClosedTrade[] }) {
  if (trades.length < 2) return null
  const W = 400, H = 70, pad = 8
  const cumulative = trades.reduce<number[]>((acc, t) => {
    const prev = acc[acc.length - 1] ?? 0
    return [...acc, prev + (t.r_obtenido ?? 0)]
  }, [0])
  const min = Math.min(...cumulative)
  const max = Math.max(...cumulative)
  const range = max - min || 1
  const pts = cumulative.map((v, i) => {
    const x = pad + (i / (cumulative.length - 1)) * (W - pad * 2)
    const y = pad + ((max - v) / range) * (H - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const clampedZero = Math.max(min, Math.min(max, 0))
  const zeroY = pad + ((max - clampedZero) / range) * (H - pad * 2)
  const lastR = cumulative[cumulative.length - 1] ?? 0
  const lineColor = lastR >= 0 ? 'var(--profit)' : 'var(--loss)'
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 70 }}>
      <line x1={pad} y1={zeroY.toFixed(1)} x2={W - pad} y2={zeroY.toFixed(1)}
        stroke="var(--border-subtle)" strokeWidth={1} strokeDasharray="4 4" />
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {value}
      </div>
    </div>
  )
}

function ChipList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {items.map(item => (
          <span key={item} style={{
            padding: '3px 10px', borderRadius: 'var(--radius-full)',
            fontSize: 11, fontWeight: 500,
            background: 'rgba(0,212,255,0.08)',
            color: 'var(--accent-primary)',
            border: '1px solid rgba(0,212,255,0.2)',
          }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function SetupDetailClient({ setup: initialSetup, allClosedTrades }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [setup, setSetup] = useState<LabSetup>(initialSetup)
  const [deleting, setDeleting] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const metrics = useMemo(() => computeSetupMetrics(setup, allClosedTrades), [setup, allClosedTrades])
  const matchingTrades = useMemo(
    () => allClosedTrades.filter(t => tradeMatchesSetup(t, setup)),
    [setup, allClosedTrades],
  )

  async function handleEstadoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newEstado = e.target.value as SetupEstado
    setStatusSaving(true)
    const { error } = await supabase
      .from('lab_setups')
      .update({ estado: newEstado })
      .eq('id', setup.id)
    if (error) { setErr(error.message); setStatusSaving(false); return }
    setSetup(prev => ({ ...prev, estado: newEstado }))
    setStatusSaving(false)
  }

  async function handleDelete() {
    if (!window.confirm('¿Eliminar este setup? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    const { error } = await supabase.from('lab_setups').delete().eq('id', setup.id)
    if (error) { setErr(error.message); setDeleting(false); return }
    router.push('/laboratorio')
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const rPromedioTrend = metrics.r_promedio > 0 ? 'success' : metrics.r_promedio < 0 ? 'danger' : 'neutral'
  const winRateTrend = metrics.win_rate >= 50 ? 'success' : metrics.win_rate > 0 ? 'warning' : 'neutral'

  return (
    <div className="page-content">
      <PageHeader
        title={setup.nombre}
        breadcrumb={[{ label: 'Laboratorio', href: '/laboratorio' }, { label: setup.nombre }]}
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <EstadoBadge estado={setup.estado} size="md" />
            <select
              value={setup.estado}
              onChange={handleEstadoChange}
              disabled={statusSaving}
              style={{
                padding: '5px 10px', borderRadius: 'var(--radius-sm)',
                fontSize: 12, fontWeight: 500,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {ESTADO_OPTS.map(o => (
                <option key={o.val} value={o.val}>{o.label}</option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              icon={<Edit2 size={13} />}
              onClick={() => router.push(`/laboratorio/${setup.id}/editar`)}
            >
              Editar
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={13} />}
              loading={deleting}
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </div>
        }
      />

      {err && (
        <div style={{
          background: 'rgba(255,59,74,0.1)', border: '1px solid rgba(255,59,74,0.3)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          color: 'var(--loss)', fontSize: 13, marginBottom: 16,
        }}>
          {err}
        </div>
      )}

      {/* ── Métricas en tiempo real ── */}
      <section style={{ marginBottom: 24 }}>
        <SectionTitle>Métricas en tiempo real</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          <KpiCard label="Trades" value={metrics.n_total} trend="neutral" />
          <KpiCard
            label="Win rate"
            value={metrics.n_total === 0 ? '—' : `${metrics.win_rate.toFixed(1)}%`}
            trend={winRateTrend}
          />
          <KpiCard
            label="R promedio"
            value={metrics.n_total === 0 ? '—' : `${metrics.r_promedio >= 0 ? '+' : ''}${metrics.r_promedio.toFixed(2)}R`}
            trend={rPromedioTrend}
          />
          <KpiCard
            label="R total"
            value={metrics.n_total === 0 ? '—' : `${metrics.r_total >= 0 ? '+' : ''}${metrics.r_total.toFixed(2)}R`}
            trend={rPromedioTrend}
          />
        </div>

        {/* Veredicto */}
        <Card style={{ marginBottom: 14, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 6 }}>
                Veredicto estadístico
              </div>
              <VeredictoBadge veredicto={metrics.veredicto} n={metrics.n_total} size="lg" />
            </div>
            {metrics.n_total > 0 && (
              <div style={{ display: 'flex', gap: 24, marginLeft: 'auto', flexWrap: 'wrap' }}>
                <MiniStat label="Profit factor" value={metrics.profit_factor != null ? metrics.profit_factor.toFixed(2) : 'N/A'} />
                <MiniStat label="Max drawdown" value={`${metrics.max_drawdown_r.toFixed(2)}R`} negative />
                <MiniStat label="W/L/BE" value={`${metrics.n_wins}/${metrics.n_losses}/${metrics.n_breakevens}`} />
              </div>
            )}
          </div>
        </Card>

        {/* Sparkline R acumulado */}
        {matchingTrades.length >= 2 && (
          <Card style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 8 }}>
              R acumulado
            </div>
            <Sparkline trades={matchingTrades} />
          </Card>
        )}
      </section>

      {/* ── Hipótesis y reglas ── */}
      <section style={{ marginBottom: 24 }}>
        <SectionTitle>Hipótesis y reglas</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Card>
            <InfoRow label="Descripción" value={setup.descripcion} />
            <InfoRow label="Lógica esperada" value={setup.logica_esperada} />
            <InfoRow label="Timeframe" value={setup.timeframe} />
            <InfoRow label="Confluencias requeridas" value={setup.confluencias_requeridas} />
            <ChipList label="Activos" items={setup.activos} />
            <ChipList label="Sesiones" items={setup.sesiones} />
            <ChipList label="Triggers" items={setup.triggers} />
            <ChipList label="Zonas" items={setup.zonas} />
            {setup.sesgo && <InfoRow label="Sesgo" value={setup.sesgo} />}
            <ChipList label="Emociones permitidas" items={setup.emociones_permitidas} />
          </Card>
          <Card>
            <InfoRow label="RR objetivo" value={`${setup.rr_objetivo}:1`} />
            <InfoRow label="Riesgo por trade" value={`${setup.riesgo_pct}%`} />
            {setup.max_trades_dia && <InfoRow label="Máx. trades/día" value={String(setup.max_trades_dia)} />}
            <InfoRow label="Reglas de Stop Loss" value={setup.reglas_stop} />
            <InfoRow label="Reglas de Take Profit" value={setup.reglas_tp} />
            <InfoRow label="Reglas de Breakeven" value={setup.reglas_breakeven} />
            <InfoRow label="Reglas de invalidación" value={setup.reglas_invalidacion} />
          </Card>
        </div>
      </section>

      {/* ── Trades vinculados ── */}
      <section>
        <SectionTitle>Trades vinculados ({matchingTrades.length})</SectionTitle>
        {matchingTrades.length === 0 ? (
          <EmptyState
            icon={<FlaskConical size={28} strokeWidth={1.5} />}
            title="Sin trades vinculados aún"
            description="Cuando registres trades que coincidan con las condiciones de este setup, aparecerán aquí automáticamente."
            size="sm"
          />
        ) : (
          <Card padding="none">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Fecha', 'Activo', 'Sesión', 'Trigger', 'Resultado', 'R obtenido'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--text-tertiary)',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matchingTrades.map((t, i) => (
                    <tr key={t.id} style={{
                      borderBottom: i < matchingTrades.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{formatDate(t.created_at)}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>{t.activo}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{t.sesion}</td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{t.trigger}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{
                          fontWeight: 600, fontSize: 11,
                          color: t.resultado === 'Win' ? 'var(--profit)' : t.resultado === 'Loss' ? 'var(--loss)' : 'var(--neutral)',
                        }}>
                          {t.resultado}
                        </span>
                      </td>
                      <td style={{
                        padding: '9px 14px',
                        fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: t.r_obtenido >= 0 ? 'var(--profit)' : 'var(--loss)',
                      }}>
                        {t.r_obtenido >= 0 ? '+' : ''}{t.r_obtenido.toFixed(2)}R
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--text-tertiary)', marginBottom: 12,
    }}>
      {children}
    </h2>
  )
}

function MiniStat({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600,
        color: negative ? 'var(--loss)' : 'var(--text-primary)',
      }}>
        {value}
      </div>
    </div>
  )
}
