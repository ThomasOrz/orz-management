'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { EstrategiasList } from '@/components/estrategias/EstrategiasList'
import { EstrategiaDetalle } from '@/components/estrategias/EstrategiaDetalle'
import { EdgeFinder } from '@/components/estrategias/EdgeFinder'
import { Card } from '@/components/ui/Card'
import type { Strategy, StrategyStats } from '@/types/strategy'

interface Props {
  strategies: Strategy[]
  stats: StrategyStats[]
}

const TABS = [
  { id: 'lista',      label: 'Mis estrategias' },
  { id: 'edge',       label: 'Edge Finder' },
]

export default function EstrategiasClient({ strategies, stats }: Props) {
  const [tab, setTab] = useState('lista')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedStrategy = strategies.find(s => s.id === selectedId) ?? null
  const selectedStats    = stats.find(s => s.strategy_id === selectedId) ?? null

  return (
    <div className="page-content">
      <PageHeader
        title="Estrategias / Lab"
        subtitle={`${strategies.length} estrategia${strategies.length !== 1 ? 's' : ''} configurada${strategies.length !== 1 ? 's' : ''}`}
      />

      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={TABS} activeTab={tab} onChange={setTab} variant="pills" />
      </div>

      {tab === 'lista' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedId ? '1fr 360px' : '1fr', gap: 16 }}>
          <EstrategiasList
            strategies={strategies}
            stats={stats}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(prev => prev === id ? null : id)}
          />
          {selectedId && selectedStrategy && (
            <EstrategiaDetalle
              strategy={selectedStrategy}
              stats={selectedStats}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      )}

      {tab === 'edge' && (
        <Card>
          <EdgeFinder />
        </Card>
      )}
    </div>
  )
}
