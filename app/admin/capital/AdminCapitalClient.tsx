'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { EquityCurve } from '@/components/capital/EquityCurve'
import { computeCapitalMetrics, buildEquityCurve } from '@/lib/capital-metrics'
import type { TradingAccount, CapitalMovement, CapitalMetrics } from '@/types/capital'

interface AccountWithProfile extends TradingAccount {
  email: string
  full_name: string | null
}

interface Props {
  accounts: AccountWithProfile[]
  allMovements: CapitalMovement[]
}

const ESTADO_CONFIG: Record<CapitalMetrics['estado_alerta'], { label: string; color: string }> = {
  ok:              { label: 'OK',             color: 'var(--profit)' },
  warning:         { label: 'Atención',       color: 'var(--neutral)' },
  danger:          { label: 'Peligro',        color: '#ff6b2b' },
  limite_excedido: { label: 'Límite excedido', color: 'var(--loss)' },
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function pctColor(n: number) {
  return n > 0 ? 'var(--profit)' : n < 0 ? 'var(--loss)' : 'var(--text-secondary)'
}

export default function AdminCapitalClient({ accounts, allMovements }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const movsByUser = useMemo(() => {
    const map = new Map<string, CapitalMovement[]>()
    for (const m of allMovements) {
      const list = map.get(m.user_id) ?? []
      list.push(m)
      map.set(m.user_id, list)
    }
    return map
  }, [allMovements])

  const accountMetrics = useMemo(() => {
    return accounts.map(acc => ({
      account: acc,
      metrics: computeCapitalMetrics(acc, movsByUser.get(acc.user_id) ?? []),
      equityPoints: buildEquityCurve(acc.capital_inicial, movsByUser.get(acc.user_id) ?? []),
    }))
  }, [accounts, movsByUser])

  // Agregados
  const totalCapital = accountMetrics.reduce((s, a) => s + a.account.capital_actual, 0)
  const avgPnlPct = accountMetrics.length > 0
    ? accountMetrics.reduce((s, a) => s + a.metrics.pnl_total_pct, 0) / accountMetrics.length
    : 0
  const alertCount = accountMetrics.filter(a => a.metrics.estado_alerta !== 'ok').length

  return (
    <div className="page-content">
      <PageHeader
        title="Capital — Admin"
        subtitle={`${accounts.length} estudiante${accounts.length !== 1 ? 's' : ''} con cuenta activa`}
      />

      {/* KPIs agregados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <KpiCard label="Estudiantes" value={accounts.length} trend="neutral" />
        <KpiCard
          label="Capital total"
          value={fmt(totalCapital)}
          trend="info"
        />
        <KpiCard
          label="PnL promedio"
          value={`${avgPnlPct >= 0 ? '+' : ''}${avgPnlPct.toFixed(2)}%`}
          trend={avgPnlPct >= 0 ? 'success' : 'danger'}
        />
        <KpiCard
          label="Cuentas con alerta"
          value={alertCount}
          trend={alertCount > 0 ? 'danger' : 'success'}
        />
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={<Wallet size={32} strokeWidth={1.5} />}
          title="Ningún estudiante ha configurado su cuenta"
          description="Cuando un estudiante cree su cuenta en /capital/setup aparecerá aquí."
        />
      ) : (
        <Card padding="none">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Estudiante', 'Capital inicial', 'Capital actual', 'PnL total', 'DD actual', 'Estado', ''].map(h => (
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
              {accountMetrics.map(({ account, metrics, equityPoints }, i) => {
                const isExpanded = expandedId === account.id
                const estadoCfg = ESTADO_CONFIG[metrics.estado_alerta]
                return (
                  <>
                    <tr
                      key={account.id}
                      style={{
                        borderBottom: isExpanded ? 'none' : (i < accountMetrics.length - 1 ? '1px solid var(--border-subtle)' : 'none'),
                        background: isExpanded ? 'var(--bg-elevated)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : account.id)}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                          {account.full_name ?? account.email}
                        </div>
                        {account.full_name && (
                          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{account.email}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {fmt(account.capital_inicial)}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fmt(account.capital_actual)}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: pctColor(metrics.pnl_total_pct) }}>
                        {metrics.pnl_total_pct >= 0 ? '+' : ''}{metrics.pnl_total_pct.toFixed(2)}%
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', color: metrics.drawdown_actual_pct > 0 ? 'var(--loss)' : 'var(--text-secondary)' }}>
                        {metrics.drawdown_actual_pct.toFixed(2)}%
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                          color: estadoCfg.color, background: `${estadoCfg.color}18`,
                          border: `1px solid ${estadoCfg.color}33`,
                        }}>
                          {estadoCfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-tertiary)' }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </td>
                    </tr>

                    {/* Detalle expandido */}
                    {isExpanded && (
                      <tr key={`${account.id}-detail`} style={{ borderBottom: i < accountMetrics.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                        <td colSpan={7} style={{ padding: '0 14px 16px', background: 'var(--bg-elevated)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                            <MiniKpi label="PnL hoy" value={`${metrics.pnl_hoy >= 0 ? '+' : ''}${fmt(metrics.pnl_hoy)}`} color={pctColor(metrics.pnl_hoy)} />
                            <MiniKpi label="DD máx histórico" value={`${metrics.drawdown_max_historico_pct.toFixed(2)}%`} color="var(--loss)" />
                            <MiniKpi label="Días operados" value={String(metrics.dias_operados)} />
                            <MiniKpi
                              label="Tipo cuenta"
                              value={account.tipo_cuenta.toUpperCase()}
                            />
                          </div>
                          <EquityCurve points={equityPoints} height={120} divisa={account.divisa} />
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}

function MiniKpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-sm)', padding: '10px 12px',
    }}>
      <div style={{ fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 14, color: color ?? 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}
