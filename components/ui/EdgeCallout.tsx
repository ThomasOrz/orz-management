// ─────────────────────────────────────────────────────────────────────────
// components/ui/EdgeCallout.tsx — Mini card "Tu edge top" (Iter 3)
// ─────────────────────────────────────────────────────────────────────────

import { Sparkles } from 'lucide-react'

interface Props {
  segments: string[]      // e.g. ['T2 (V85)', 'Nueva York', 'Tranquilo']
  winRate: number         // 0-100
  avgR: number
  sampleSize: number
  caption?: string
}

export function EdgeCallout({ segments, winRate, avgR, sampleSize, caption }: Props) {
  const segs = segments.slice(0, 3)
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      minHeight: 200,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
      }}>
        <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
        Tu edge top
      </div>

      {segs.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {segs.map((s, i) => (
              <span
                key={`${s}-${i}`}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'rgba(0,212,255,0.08)',
                  border: '0.5px solid rgba(0,212,255,0.3)',
                  color: 'var(--accent-primary)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                }}
              >
                {s}
              </span>
            ))}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12, marginTop: 'auto', paddingTop: 8,
            borderTop: '0.5px solid var(--border-subtle)',
          }}>
            <Stat label="Win Rate" value={`${winRate.toFixed(0)}%`} color="var(--profit)" />
            <Stat label="R prom." value={`${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R`} color={avgR >= 0 ? 'var(--profit)' : 'var(--loss)'} />
            <Stat label="Muestra" value={`${sampleSize}`} color="var(--text-primary)" />
          </div>

          {caption && (
            <div style={{ fontSize: 11, color: '#666' }}>{caption}</div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          Aún no tienes una combinación dominante. Necesitamos más muestra (≥3 trades por segmento) para identificar tu edge.
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{
        fontSize: 9, letterSpacing: '0.5px',
        textTransform: 'uppercase', color: 'var(--text-tertiary)',
        fontWeight: 600, marginBottom: 4,
      }}>
        {label}
      </div>
      <div className="tabular-num" style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 18, fontWeight: 600, color, lineHeight: 1,
      }}>
        {value}
      </div>
    </div>
  )
}

export default EdgeCallout
