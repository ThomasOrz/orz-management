// ─────────────────────────────────────────────────────────────────────────
// components/ui/chart-theme.ts — Tema dark compartido para Recharts
// ─────────────────────────────────────────────────────────────────────────

export const chartTheme = {
  colors: {
    accent: '#00d4ff',
    accentSecondary: '#7c4dff',
    profit: '#00e676',
    loss: '#ff3b4a',
    neutral: '#fbbf24',
    info: '#38bdf8',
    text: '#9aa0a6',
    textMuted: '#5f6368',
    grid: 'rgba(255,255,255,0.04)',
    axis: '#3a4050',
    surface: '#181b22',
    border: '#2a2f3a',
  },
  font: {
    family: 'var(--font-mono, ui-monospace, monospace)',
    size: 11,
  },
} as const

// Props comunes para ejes
export const axisProps = {
  stroke: chartTheme.colors.textMuted,
  fontSize: chartTheme.font.size,
  tickLine: false,
  axisLine: { stroke: chartTheme.colors.axis, strokeWidth: 1 },
} as const

// Props para grid
export const gridProps = {
  stroke: chartTheme.colors.grid,
  vertical: false,
} as const

// Style base para Tooltip de Recharts
export const tooltipStyle = {
  backgroundColor: chartTheme.colors.surface,
  border: `1px solid ${chartTheme.colors.border}`,
  borderRadius: 8,
  fontSize: 12,
  padding: '8px 12px',
  color: '#e8eaed',
  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
} as const

export const tooltipLabelStyle = {
  color: chartTheme.colors.text,
  fontWeight: 500,
  marginBottom: 4,
} as const

export const tooltipItemStyle = {
  color: '#e8eaed',
  fontFamily: chartTheme.font.family,
  fontVariantNumeric: 'tabular-nums',
} as const
