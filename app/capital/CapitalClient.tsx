'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { EquityCurve } from '@/components/capital/EquityCurve'
import { PropFirmCard } from '@/components/capital/PropFirmCard'
import { MovimientoModal } from '@/components/capital/MovimientoModal'
import { computeCapitalMetrics, buildEquityCurve } from '@/lib/capital-metrics'
import type { TradingAccount, CapitalMovement } from '@/types/capital'

const TIPO_CUENTA_LABEL: Record<string, string> = {
  personal:     'Personal',
  ftmo:         'FTMO',
  fundednext:   'FundedNext',
  myforexfunds: 'MyForexFunds',
  topstep:      'TopStep',
  otra:         'Prop Firm',
}

const TIPO_MOV_LABEL: Record<string, string> = {
  deposito:  'Depósito',
  retiro:    'Retiro',
  ajuste:    'Ajuste',
  trade_pnl: 'Trade PnL',
}

const TIPO_MOV_COLOR: Record<string, string> = {
  deposito:  'var(--profit)',
  retiro:    'var(--loss)',
  ajuste:    'var(--accent-primary)',
  trade_pnl: 'var(--text-secondary)',
}

interface Props {
  account: TradingAccount
  movements: CapitalMovement[]
  userId: string
}

function fmt(n: number, divisa = 'USD') {
  const abs = Math.abs(n)
  const s = abs.toLocaleString('en-US', { style: 'currency', currency: divisa, maximumFractionDigits: 0 })
  return n < 0 ? `-${s}` : s
}

export default function CapitalClient({ account, movements, userId }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  const metrics = useMemo(() => computeCapitalMetrics(account, movements), [account, movements])
  const equityPoints = useMemo(() => buildEquityCurve(account.capital_inicial, movements), [account, movements])

  const hasPropFirmRules = !!(
    account.profit_target_pct ||
    account.limite_diario_pct ||
    account.limite_total_pct ||
    account.dias_minimos
  )

  const recentMovements = [...movements]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 20)

  const alertColors: Record<string, string> = {
    ok:              'var(--profit)',
    warning:         'var(--neutral)',
    danger:          '#ff6b2b',
    limite_excedido: 'var(--loss)',
  }
  const alertColor = alertColors[metrics.estado_alerta]

  return (
    <div className="page-content">
      <PageHeader
        title="Capital"
        subtitle={`${TIPO_CUENTA_LABEL[account.tipo_cuenta] ?? account.tipo_cuenta}${account.nombre_broker ? ` · ${account.nombre_broker}` : ''}`}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setModalOpen(true)}
            >
              Registrar movimiento
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Settings size={14} />}
              onClick={() => router.push('/capital/configuracion')}
            >
              Configurar
            </Button>
          </div>
        }
      />

      {/* Alerta de estado */}
      {metrics.estado_alerta !== 'ok' && (
        <div style={{
          background: `${alertColor}12`,
          border: `1px solid ${alertColor}40`,
          borderRadius: 'var(--radius-sm)',
          padding: '10px 16px',
          marginBottom: 20,
          fontSize: 13,
          color: alertColor,
          fontWeight: 500,
        }}>
          {metrics.estado_alerta === 'limite_excedido'
            ? '⚠ Límite excedido — revisa tu drawdown o pérdida diaria'
            : metrics.estado_alerta === 'danger'
            ? '⚠ Zona de peligro — te acercas al límite permitido'
            : '⚠ Atención — estás usando más del 60% de tu margen de pérdida'}
        </div>
      )}

      {/* KPIs principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        <KpiCard
          label="Capital actual"
          value={fmt(metrics.capital_actual, account.divisa)}
          delta={`${metrics.pnl_total_pct >= 0 ? '+' : ''}${metrics.pnl_total_pct.toFixed(2)}%`}
          trend={metrics.pnl_total >= 0 ? 'success' : 'danger'}
        />
        <KpiCard
          label="PnL total"
          value={`${metrics.pnl_total >= 0 ? '+' : ''}${fmt(metrics.pnl_total, account.divisa)}`}
          delta={`${metrics.pnl_total_pct >= 0 ? '+' : ''}${metrics.pnl_total_pct.toFixed(2)}%`}
          trend={metrics.pnl_total >= 0 ? 'success' : 'danger'}
        />
        <KpiCard
          label="PnL hoy"
          value={`${metrics.pnl_hoy >= 0 ? '+' : ''}${fmt(metrics.pnl_hoy, account.divisa)}`}
          delta={`${metrics.pnl_hoy_pct >= 0 ? '+' : ''}${metrics.pnl_hoy_pct.toFixed(2)}%`}
          trend={metrics.pnl_hoy >= 0 ? 'success' : metrics.pnl_hoy < 0 ? 'danger' : 'neutral'}
        />
        <KpiCard
          label="Drawdown actual"
          value={`${metrics.drawdown_actual > 0 ? '-' : ''}${fmt(metrics.drawdown_actual, account.divisa)}`}
          delta={`${metrics.drawdown_actual_pct.toFixed(2)}%`}
          trend={metrics.drawdown_actual > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Sección prop firm */}
      {hasPropFirmRules && (
        <div style={{ marginBottom: 20 }}>
          <SectionTitle>Tracking Prop Firm</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {account.profit_target_pct != null && metrics.profit_target_progreso_pct != null && (
              <PropFirmCard
                title="Profit target"
                value={`+${metrics.pnl_total_pct.toFixed(2)}%`}
                subtitle={`Objetivo: ${account.profit_target_pct}%`}
                progress={metrics.profit_target_progreso_pct}
              />
            )}
            {account.limite_diario_pct != null && (
              <PropFirmCard
                title="Límite diario"
                value={`${metrics.pnl_hoy_pct.toFixed(2)}%`}
                subtitle={`Máx. pérdida: ${account.limite_diario_pct}%/día`}
                progress={metrics.limite_diario_usado_pct ?? 0}
                inverted
              />
            )}
            {account.limite_total_pct != null && (
              <PropFirmCard
                title="Límite total"
                value={`${metrics.drawdown_actual_pct.toFixed(2)}%`}
                subtitle={`DD máx: ${account.limite_total_pct}%`}
                progress={metrics.limite_total_usado_pct ?? 0}
                inverted
              />
            )}
            {account.dias_minimos != null && (
              <PropFirmCard
                title="Días operados"
                value={String(metrics.dias_operados)}
                unit={`/ ${account.dias_minimos} mín.`}
                subtitle="Días con al menos un trade"
                progress={(metrics.dias_operados / account.dias_minimos) * 100}
              />
            )}
          </div>
        </div>
      )}

      {/* Equity Curve */}
      <div style={{ marginBottom: 20 }}>
        <SectionTitle>Curva de equity</SectionTitle>
        <Card>
          <EquityCurve points={equityPoints} divisa={account.divisa} />
        </Card>
      </div>

      {/* Movimientos recientes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SectionTitle style={{ margin: 0 }}>Movimientos recientes</SectionTitle>
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => setModalOpen(true)}>
            Registrar
          </Button>
        </div>

        {recentMovements.length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            description="Los trades cerrados con riesgo en USD y los movimientos manuales aparecerán aquí."
            size="sm"
          />
        ) : (
          <Card padding="none">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Fecha', 'Tipo', 'Monto', 'Nota'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: 'var(--text-tertiary)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentMovements.map((m, i) => (
                    <tr key={m.id} style={{
                      borderBottom: i < recentMovements.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    }}>
                      <td style={{ padding: '9px 14px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                        {new Date(m.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: TIPO_MOV_COLOR[m.tipo],
                        }}>
                          {TIPO_MOV_LABEL[m.tipo] ?? m.tipo}
                        </span>
                      </td>
                      <td style={{
                        padding: '9px 14px',
                        fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: m.monto >= 0 ? 'var(--profit)' : 'var(--loss)',
                      }}>
                        {m.monto >= 0 ? '+' : ''}{fmt(m.monto, account.divisa)}
                      </td>
                      <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>
                        {m.nota ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <MovimientoModal open={modalOpen} onClose={() => setModalOpen(false)} userId={userId} />
    </div>
  )
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h2 style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--text-tertiary)', marginBottom: 12, ...style,
    }}>
      {children}
    </h2>
  )
}
