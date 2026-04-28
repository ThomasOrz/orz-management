'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Plus } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SetupCard } from '@/components/lab/SetupCard'
import { computeSetupMetrics } from '@/lib/lab-matching'
import type { LabSetup, SetupEstado } from '@/types/lab'
import type { ClosedTrade } from '@/types/trading'

type FilterEstado = 'todos' | SetupEstado

const FILTROS: { key: FilterEstado; label: string }[] = [
  { key: 'todos',     label: 'Todos' },
  { key: 'draft',     label: 'Borrador' },
  { key: 'testing',   label: 'En testing' },
  { key: 'validated', label: 'Validados' },
  { key: 'discarded', label: 'Descartados' },
  { key: 'paused',    label: 'Pausados' },
]

interface Props {
  setups: LabSetup[]
  closedTrades: ClosedTrade[]
}

export default function LabClient({ setups, closedTrades }: Props) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<FilterEstado>('todos')

  const filtered = useMemo(
    () => filtro === 'todos' ? setups : setups.filter(s => s.estado === filtro),
    [setups, filtro],
  )

  const metricsMap = useMemo(
    () => {
      const m = new Map<string, ReturnType<typeof computeSetupMetrics>>()
      for (const s of setups) {
        m.set(s.id, computeSetupMetrics(s, closedTrades))
      }
      return m
    },
    [setups, closedTrades],
  )

  return (
    <div className="page-content">
      <PageHeader
        title="Laboratorio"
        subtitle="Define y valida tus ventajas estadísticas — hipótesis → testing → veredicto."
        action={
          <Button
            icon={<Plus size={15} />}
            onClick={() => router.push('/laboratorio/nuevo')}
          >
            Crear setup
          </Button>
        }
      />

      {/* Filtros por estado */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {FILTROS.map(f => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            style={{
              padding: '5px 14px',
              borderRadius: 'var(--radius-full)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              border: filtro === f.key
                ? '1px solid var(--accent-primary)'
                : '1px solid var(--border-default)',
              background: filtro === f.key
                ? 'rgba(0,212,255,0.1)'
                : 'var(--bg-surface)',
              color: filtro === f.key
                ? 'var(--accent-primary)'
                : 'var(--text-secondary)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {f.label}
            {f.key === 'todos'
              ? ` (${setups.length})`
              : setups.filter(s => s.estado === f.key).length > 0
              ? ` (${setups.filter(s => s.estado === f.key).length})`
              : ''}
          </button>
        ))}
      </div>

      {setups.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={32} strokeWidth={1.5} />}
          title="Crea tu primera ventaja estadística"
          description="Define un setup, establece sus condiciones y deja que el sistema mida si realmente tienes edge."
          action={
            <Button
              icon={<Plus size={15} />}
              onClick={() => router.push('/laboratorio/nuevo')}
            >
              Crear primer setup
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={`Sin setups en estado "${FILTROS.find(f => f.key === filtro)?.label}"`}
          description="Prueba con otro filtro o crea un nuevo setup."
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(setup => (
            <SetupCard
              key={setup.id}
              setup={setup}
              metrics={metricsMap.get(setup.id)!}
            />
          ))}
        </div>
      )}
    </div>
  )
}
