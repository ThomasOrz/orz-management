'use client'

// EdgeFinder — placeholder Iter 9

export function EdgeFinder() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 12, padding: '48px 24px',
      color: 'var(--text-tertiary)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        background: 'var(--accent-primary-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
      }}>
        🔭
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          Edge Finder — Próximamente (Iter 9)
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.5 }}>
          Análisis estadístico multidimensional por setup, sesión, activo y día.<br />
          Se construirá sobre los datos del Laboratorio.
        </p>
      </div>
    </div>
  )
}

export default EdgeFinder
