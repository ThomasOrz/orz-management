// supabase/functions/chat-mentor/index.ts — Tefa nutrida con contexto completo
// Deno runtime — no npm imports

import Anthropic from 'npm:@anthropic-ai/sdk@0.36.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─────────────────────────────────────────────────────────────────────────────
// Types (simplified — mirrors types/trading.ts and types/capital.ts)
// ─────────────────────────────────────────────────────────────────────────────

interface ClosedTrade {
  activo: string
  sesion: string
  trigger: string
  zona_diario: string
  resultado: 'Win' | 'Loss' | 'Breakeven'
  r_obtenido: number
  emocion: string | null
  siguio_reglas: boolean | null
  created_at: string
}

interface EdgeSegmentLight {
  label: string
  n_total: number
  win_rate: number
  avg_r: number
  veredicto: string
}

interface CapitalCtx {
  capital_inicial: number
  capital_actual: number
  pnl_pct: number
  drawdown_actual_pct: number
  tipo_cuenta: string
  divisa: string
}

interface LabSetupLight {
  nombre: string
  estado: string
  n_total: number
  win_rate: number
  avg_r: number
}

interface RequestPayload {
  message: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  // Context bundles (all optional — graceful degradation)
  recentTrades?: ClosedTrade[]
  capital?: CapitalCtx | null
  labSetups?: LabSetupLight[]
  edgeSegments?: EdgeSegmentLight[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge computation (lightweight — avoids importing lib/edge-engine.ts)
// ─────────────────────────────────────────────────────────────────────────────

function computeLightEdge(trades: ClosedTrade[], dim: keyof ClosedTrade): EdgeSegmentLight[] {
  const groups = new Map<string, ClosedTrade[]>()
  for (const t of trades) {
    const key = String(t[dim] ?? 'desconocido')
    const list = groups.get(key) ?? []
    list.push(t)
    groups.set(key, list)
  }
  return Array.from(groups.entries())
    .map(([label, ts]) => {
      const n = ts.length
      const wins = ts.filter(t => t.resultado === 'Win').length
      const avg_r = ts.reduce((s, t) => s + t.r_obtenido, 0) / n
      const win_rate = (wins / n) * 100
      const sig = n < 10 ? 'sin_data' : n < 30 ? 'insuficiente' : n < 50 ? 'tendencia' : 'significativo'
      const veredicto =
        sig === 'sin_data'      ? 'sin_data' :
        sig === 'insuficiente'  ? 'insuficiente' :
        sig === 'tendencia'     ? (win_rate >= 55 ? 'tendencia_positiva' : win_rate < 45 ? 'tendencia_negativa' : 'insuficiente') :
        (win_rate >= 55 && avg_r >= 0.5) ? 'edge_confirmado' :
        (win_rate < 40 || avg_r < 0)     ? 'drenaje_confirmado' : 'insuficiente'
      return { label, n_total: n, win_rate, avg_r, veredicto }
    })
    .sort((a, b) => b.avg_r - a.avg_r)
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompt builder
// ─────────────────────────────────────────────────────────────────────────────

function buildSystemPrompt(payload: RequestPayload): string {
  const sections: string[] = []

  sections.push(`Eres Tefa, mentora de trading de ORZ Academy. Tu rol es ayudar a traders de NAS100 y XAUUSD a mejorar su rendimiento con análisis objetivo, directo y empático. Hablas siempre en español. Eres experta en price action, gestión de riesgo, psicología del trading y análisis estadístico de resultados.

Reglas de comportamiento:
- Respuestas concisas y accionables (máx 4-5 párrafos salvo que se pida más detalle)
- Cita métricas específicas del contexto cuando sean relevantes
- Nunca especules — si no tienes datos, dilo
- Prioriza la disciplina y el proceso sobre los resultados puntuales`)

  if (payload.capital) {
    const c = payload.capital
    sections.push(`## Estado de cuenta actual
Tipo: ${c.tipo_cuenta.toUpperCase()} | Divisa: ${c.divisa}
Capital inicial: ${c.capital_inicial.toLocaleString('en-US', { style: 'currency', currency: c.divisa })}
Capital actual: ${c.capital_actual.toLocaleString('en-US', { style: 'currency', currency: c.divisa })}
PnL: ${c.pnl_pct >= 0 ? '+' : ''}${c.pnl_pct.toFixed(2)}%
Drawdown actual: ${c.drawdown_actual_pct.toFixed(2)}%`)
  }

  if (payload.recentTrades && payload.recentTrades.length > 0) {
    const t = payload.recentTrades
    const n = t.length
    const wins = t.filter(x => x.resultado === 'Win').length
    const totalR = t.reduce((s, x) => s + x.r_obtenido, 0)
    const disciplina = t.filter(x => x.siguio_reglas === true).length

    sections.push(`## Últimos ${n} trades
Win Rate: ${((wins / n) * 100).toFixed(1)}% | R total: ${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R | Disciplina: ${((disciplina / n) * 100).toFixed(0)}%
Desglose reciente: ${t.slice(0, 10).map(x => `${x.resultado === 'Win' ? '✓' : x.resultado === 'Loss' ? '✗' : '='} ${x.r_obtenido >= 0 ? '+' : ''}${x.r_obtenido.toFixed(1)}R (${x.activo} ${x.sesion})`).join(' | ')}`)

    // Edge ligero por sesión y trigger
    const porSesion = computeLightEdge(t, 'sesion')
    const porTrigger = computeLightEdge(t, 'trigger')
    sections.push(`## Edge estadístico (${n} trades)
Por sesión: ${porSesion.map(s => `${s.label}: WR ${s.win_rate.toFixed(0)}% avg ${s.avg_r.toFixed(2)}R [${s.veredicto}]`).join(' | ')}
Por trigger: ${porTrigger.map(s => `${s.label}: WR ${s.win_rate.toFixed(0)}% avg ${s.avg_r.toFixed(2)}R [${s.veredicto}]`).join(' | ')}`)
  }

  if (payload.edgeSegments && payload.edgeSegments.length > 0) {
    const confirmed = payload.edgeSegments.filter(s => s.veredicto === 'edge_confirmado')
    const drains = payload.edgeSegments.filter(s => s.veredicto === 'drenaje_confirmado')
    if (confirmed.length > 0 || drains.length > 0) {
      sections.push(`## Análisis de ventaja (Motor de Ventaja)
Edges confirmados: ${confirmed.map(s => `${s.label} (WR ${s.win_rate.toFixed(0)}%, +${s.avg_r.toFixed(2)}R, n=${s.n_total})`).join(', ') || 'ninguno'}
Drenajes confirmados: ${drains.map(s => `${s.label} (WR ${s.win_rate.toFixed(0)}%, ${s.avg_r.toFixed(2)}R, n=${s.n_total})`).join(', ') || 'ninguno'}`)
    }
  }

  if (payload.labSetups && payload.labSetups.length > 0) {
    const active = payload.labSetups.filter(s => s.estado === 'testing' || s.estado === 'validated')
    if (active.length > 0) {
      sections.push(`## Setups en laboratorio (activos)
${active.map(s => `• ${s.nombre} [${s.estado}]: n=${s.n_total}, WR ${s.win_rate.toFixed(0)}%, R prom ${s.avg_r.toFixed(2)}`).join('\n')}`)
    }
  }

  return sections.join('\n\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada')

    const payload: RequestPayload = await req.json()
    const { message, history } = payload

    const client = new Anthropic({ apiKey })
    const systemPrompt = buildSystemPrompt(payload)

    const messages: Anthropic.MessageParam[] = [
      ...history.map(h => ({ role: h.role, content: h.content } as Anthropic.MessageParam)),
      { role: 'user', content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    return new Response(JSON.stringify({ reply: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
