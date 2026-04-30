'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/evaluacion/EvaluacionClient.tsx — Evaluación semanal (Iter 2)
// ─────────────────────────────────────────────────────────────────────────
// Sección 1 · Resumen semanal automático (últimos 7 días)
// Sección 2 · Conclusiones operativas (Claude · weekly-insights EF)
// Sección 3 · Historial de session_reviews
// ─────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import {
  Sparkles, CheckCircle2, AlertTriangle, Target, ShieldOff,
  TrendingUp, BarChart3, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Trade } from '@/types/trading'

interface SessionReview {
  id: string
  fecha: string
  [key: string]: unknown
}

interface WeeklyInsights {
  bien?: string[]
  mal?: string[]
  aplicar?: string[]
  evitar?: string[]
  resumen?: string
}

interface Props {
  userId: string
  historial: SessionReview[]
  weeklyTrades: Trade[]
}

function toNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = parseFloat(v); return isNaN(n) ? null : n }
  return null
}

function toStr(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return String(v)
}

function toStrArr(v: unknown): string[] {
  if (!v) return []
  if (Array.isArray(v)) return v.map(toStr).filter((s) => s && s !== '—')
  if (typeof v === 'string') return [v]
  return []
}

// ─── Cálculo de métricas semanales (puro, sin red) ───────────────────────
function computeWeeklyStats(trades: Trade[]) {
  const cerrados = trades.filter((t) => t.resultado !== null && t.r_obtenido !== null)
  const total = cerrados.length
  const wins = cerrados.filter((t) => (t.r_obtenido ?? 0) > 0).length
  const losses = cerrados.filter((t) => (t.r_obtenido ?? 0) < 0).length
  const totalR = cerrados.reduce((s, t) => s + (t.r_obtenido ?? 0), 0)
  const winRate = total > 0 ? (wins / total) * 100 : 0
  const promR = total > 0 ? totalR / total : 0
  const disciplinados = cerrados.filter((t) => t.siguio_reglas).length
  const disciplina = total > 0 ? (disciplinados / total) * 100 : 0
  return { total, wins, losses, totalR, winRate, promR, disciplina }
}

export default function EvaluacionClient({
  userId, historial: initialHistorial, weeklyTrades,
}: Props) {
  const supabase = createClient()
  const [historial, setHistorial] = useState<SessionReview[]>(initialHistorial)
  const [insights, setInsights] = useState<WeeklyInsights | null>(null)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [errorInsights, setErrorInsights] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const todayLabel = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const stats = computeWeeklyStats(weeklyTrades)
  const hasData = stats.total >= 3

  async function generarInsights() {
    setErrorInsights(null)
    setLoadingInsights(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sin sesión activa')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/weekly-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ user_id: userId, fecha: today }),
        }
      )

      const rawText = await res.text()
      let data: Record<string, unknown>
      try { data = JSON.parse(rawText) } catch {
        throw new Error(`Respuesta inválida (${res.status}): ${rawText.slice(0, 200)}`)
      }
      if (!res.ok) throw new Error(String(data.error ?? data.message ?? `Error ${res.status}`))

      const ins = (data.insights ?? data) as WeeklyInsights
      setInsights(ins)

      // Si la EF también guarda en session_reviews, agregamos al historial
      if (data.review) {
        const review = data.review as SessionReview
        setHistorial((prev) => [review, ...prev.filter((h) => h.fecha !== review.fecha)])
      }
    } catch (err) {
      setErrorInsights(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoadingInsights(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Evaluación"
        subtitle={todayLabel}
        action={
          <Button
            variant="primary"
            size="md"
            loading={loadingInsights}
            disabled={!hasData}
            icon={<Sparkles size={14} />}
            onClick={generarInsights}
          >
            Generar conclusiones
          </Button>
        }
      />

      {/* ── SECCIÓN 1: Resumen semanal ─────────────────────────────── */}
      <h2 style={sectionTitle}>
        <BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Resumen semanal · últimos 7 días
      </h2>

      {hasData ? (
        <div className="grid-dashboard" style={{ marginBottom: 'var(--space-8)' }}>
          <StatCard
            label="Trades cerrados"
            value={stats.total}
            hint={`${stats.wins}W · ${stats.losses}L`}
            icon={<TrendingUp size={14} />}
          />
          <StatCard
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            variant={stats.winRate >= 50 ? 'profit' : 'loss'}
            icon={<Target size={14} />}
          />
          <StatCard
            label="R Total"
            value={`${stats.totalR >= 0 ? '+' : ''}${stats.totalR.toFixed(2)}R`}
            variant={stats.totalR >= 0 ? 'profit' : 'loss'}
            delta={`${stats.promR >= 0 ? '+' : ''}${stats.promR.toFixed(2)}R prom.`}
            trend={stats.promR >= 0 ? 'up' : 'down'}
          />
          <StatCard
            label="Disciplina"
            value={`${stats.disciplina.toFixed(0)}%`}
            variant={stats.disciplina >= 80 ? 'profit' : stats.disciplina >= 60 ? 'neutral' : 'loss'}
            icon={<CheckCircle2 size={14} />}
            hint="Reglas seguidas"
          />
        </div>
      ) : (
        <Card style={{ marginBottom: 'var(--space-8)' }}>
          <EmptyState
            icon={<Clock size={28} />}
            title="Aún no hay suficiente data semanal"
            description={`Llevas ${stats.total} trades cerrados esta semana. Con 3 o más generamos el resumen y las conclusiones.`}
          />
        </Card>
      )}

      {/* ── SECCIÓN 2: Conclusiones operativas (Claude) ────────────── */}
      <h2 style={sectionTitle}>
        <Sparkles size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Conclusiones operativas
      </h2>

      {errorInsights && (
        <Card padding="sm" style={{
          marginBottom: 'var(--space-5)',
          background: 'var(--loss-bg)',
          borderColor: 'var(--loss)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--loss)', fontSize: 'var(--text-sm)' }}>
            <AlertTriangle size={14} />
            {errorInsights}
          </div>
        </Card>
      )}

      {!insights && !loadingInsights && (
        <Card style={{ marginBottom: 'var(--space-8)' }}>
          <EmptyState
            icon={<Sparkles size={28} />}
            title="Tefa no ha analizado tu semana aún"
            description={hasData
              ? 'Pulsa “Generar conclusiones” para que Tefa identifique patrones y te diga qué aplicar mañana.'
              : 'Necesitamos al menos 3 trades cerrados para generar conclusiones útiles.'}
          />
        </Card>
      )}

      {insights && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          {insights.resumen && (
            <Card style={{ marginBottom: 'var(--space-4)' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', lineHeight: 1.55, margin: 0 }}>
                {insights.resumen}
              </p>
            </Card>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}>
            <BulletCard
              icon={<CheckCircle2 size={14} />}
              title="Qué hiciste bien"
              items={toStrArr(insights.bien)}
              color="var(--profit)"
            />
            <BulletCard
              icon={<AlertTriangle size={14} />}
              title="Qué repetiste mal"
              items={toStrArr(insights.mal)}
              color="var(--loss)"
            />
            <BulletCard
              icon={<Target size={14} />}
              title="Qué aplicar la próxima sesión"
              items={toStrArr(insights.aplicar)}
              color="var(--accent-primary)"
            />
            <BulletCard
              icon={<ShieldOff size={14} />}
              title="Qué evitar"
              items={toStrArr(insights.evitar)}
              color="var(--loss)"
            />
          </div>
        </div>
      )}

      {/* ── SECCIÓN 3: Historial ───────────────────────────────────── */}
      <h2 style={sectionTitle}>
        <Clock size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Historial de evaluaciones
      </h2>

      {historial.length === 0 ? (
        <Card>
          <EmptyState
            title="Sin evaluaciones previas"
            description="Cada conclusión generada quedará registrada aquí."
          />
        </Card>
      ) : (
        <Card padding="none">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {historial.map((h, i) => {
              const pnl = toNum(h.pnl) ?? toNum(h.pnl_neto)
              const rr = toNum(h.rr_promedio)
              const wr = toNum(h.win_rate)
              const trades = toNum(h.total_trades)
              return (
                <li key={h.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: i < historial.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  flexWrap: 'wrap', gap: 'var(--space-3)',
                }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {String(h.fecha)}
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', alignItems: 'center' }}>
                    <span>{trades ?? '—'} trades</span>
                    <span>{wr != null ? `${wr.toFixed(0)}% WR` : '— WR'}</span>
                    <span>R:R {rr != null ? rr.toFixed(2) : '—'}</span>
                    {pnl != null && (
                      <Badge variant={pnl >= 0 ? 'profit' : 'loss'} size="sm">
                        {pnl >= 0 ? `+${pnl.toFixed(2)}R` : `${pnl.toFixed(2)}R`}
                      </Badge>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

// ─── Helpers visuales ────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontSize: 'var(--text-base)',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: 0,
  marginBottom: 'var(--space-4)',
  marginTop: 'var(--space-6)',
}

function BulletCard({
  icon, title, items, color,
}: { icon: React.ReactNode; title: string; items: string[]; color: string }) {
  return (
    <Card>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        marginBottom: 'var(--space-3)', color,
      }}>
        {icon}
        <span style={{
          fontSize: 'var(--text-xs)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {title}
        </span>
      </div>
      {items.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', margin: 0 }}>—</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)',
              fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>
              <span style={{
                marginTop: 7, width: 5, height: 5, borderRadius: '50%',
                background: color, flexShrink: 0,
              }} />
              {item}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
