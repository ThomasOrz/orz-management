'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Tabs } from '@/components/ui/Tabs'
import { EdgeTable } from '@/components/edge/EdgeTable'
import { RecommendationCard } from '@/components/edge/RecommendationCard'
import {
  analyzeBy, analyzeBy2D, generateRecommendations,
  type Dimension1D, type Dimension2D,
} from '@/lib/edge-engine'
import type { ClosedTrade } from '@/types/trading'

interface Props {
  trades: ClosedTrade[]
}

const TABS_1D = [
  { id: 'activo',   label: 'Activo' },
  { id: 'sesion',   label: 'Sesión' },
  { id: 'trigger',  label: 'Trigger' },
  { id: 'zona',     label: 'Zona' },
  { id: 'dia',      label: 'Día de semana' },
]

const TABS_2D = [
  { id: 'activo_sesion',   label: 'Activo × Sesión' },
  { id: 'sesion_trigger',  label: 'Sesión × Trigger' },
  { id: 'zona_trigger',    label: 'Zona × Trigger' },
]

const SECTION_TABS = [
  { id: '1d',     label: 'Análisis 1D' },
  { id: '2d',     label: 'Análisis 2D' },
  { id: 'recs',   label: 'Recomendaciones' },
]

const DIM_LABELS: Record<Dimension1D, string> = {
  activo: 'Activo', sesion: 'Sesión', trigger: 'Trigger', zona: 'Zona', dia: 'Día',
}

const DIM_LABELS_2D: Record<Dimension2D, string> = {
  activo_sesion: 'Activo × Sesión',
  sesion_trigger: 'Sesión × Trigger',
  zona_trigger: 'Zona × Trigger',
}

export default function EdgeClient({ trades }: Props) {
  const [section, setSection] = useState('1d')
  const [tab1d, setTab1d] = useState<Dimension1D>('sesion')
  const [tab2d, setTab2d] = useState<Dimension2D>('sesion_trigger')

  const n = trades.length
  const wins = trades.filter(t => t.resultado === 'Win').length
  const totalR = trades.reduce((s, t) => s + t.r_obtenido, 0)
  const winRate = n > 0 ? (wins / n) * 100 : 0
  const avgR = n > 0 ? totalR / n : 0

  const segments1d = analyzeBy(trades, tab1d)
  const segments2d = analyzeBy2D(trades, tab2d)
  const recs = generateRecommendations(trades)

  const confirmedEdge = recs.filter(r => r.type === 'foco').length
  const drenajesConf = recs.filter(r => r.type === 'evitar').length

  return (
    <div className="page-content">
      <PageHeader
        title="Motor de Ventaja"
        subtitle={`Análisis estadístico sobre ${n} trades cerrados`}
      />

      {/* KPIs globales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        <KpiCard label="Trades analizados" value={n} trend="info" />
        <KpiCard
          label="Win Rate global"
          value={`${winRate.toFixed(1)}%`}
          trend={winRate >= 55 ? 'success' : winRate < 45 ? 'danger' : 'neutral'}
        />
        <KpiCard
          label="R promedio"
          value={`${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R`}
          trend={avgR > 0 ? 'success' : avgR < 0 ? 'danger' : 'neutral'}
        />
        <KpiCard
          label="Edges confirmados"
          value={confirmedEdge}
          trend={confirmedEdge > 0 ? 'success' : 'neutral'}
        />
        <KpiCard
          label="Drenajes confirmados"
          value={drenajesConf}
          trend={drenajesConf > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Navegación de secciones */}
      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={SECTION_TABS} activeTab={section} onChange={setSection} variant="pills" />
      </div>

      {/* ── Análisis 1D ────────────────────────────────────────────────── */}
      {section === '1d' && (
        <Card>
          <div style={{ marginBottom: 16 }}>
            <Tabs
              tabs={TABS_1D}
              activeTab={tab1d}
              onChange={(id) => setTab1d(id as Dimension1D)}
              ariaLabel="Dimensión 1D"
            />
          </div>
          <EdgeTable segments={segments1d} dimensionLabel={DIM_LABELS[tab1d]} />
        </Card>
      )}

      {/* ── Análisis 2D ────────────────────────────────────────────────── */}
      {section === '2d' && (
        <Card>
          <div style={{ marginBottom: 4 }}>
            <Tabs
              tabs={TABS_2D}
              activeTab={tab2d}
              onChange={(id) => setTab2d(id as Dimension2D)}
              ariaLabel="Dimensión 2D"
            />
          </div>
          <p style={{ margin: '12px 0 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Solo se muestran combinaciones con ≥ 10 trades.
          </p>
          <EdgeTable segments={segments2d} dimensionLabel={DIM_LABELS_2D[tab2d]} />
        </Card>
      )}

      {/* ── Recomendaciones ─────────────────────────────────────────────── */}
      {section === 'recs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {recs.length === 0 ? (
            <Card>
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13, padding: '24px 0' }}>
                Acumula más trades para generar recomendaciones estadísticas.
              </p>
            </Card>
          ) : (
            recs.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
