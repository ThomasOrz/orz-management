'use client'

// ─────────────────────────────────────────────────────────────────────────
// components/ui/Tabs.tsx — Tabs accesible (underline | pills)
// ─────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  badge?: ReactNode
  disabled?: boolean
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  variant?: 'underline' | 'pills'
  ariaLabel?: string
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  ariaLabel = 'Tabs',
}: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`tabs ${variant === 'pills' ? 'tabs-pills' : ''}`}
    >
      {tabs.map((t) => {
        const active = t.id === activeTab
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`tabpanel-${t.id}`}
            id={`tab-${t.id}`}
            tabIndex={active ? 0 : -1}
            disabled={t.disabled}
            onClick={() => onChange(t.id)}
            className={`tab ${active ? 'active' : ''}`}
          >
            {t.icon && <span className="tab-icon">{t.icon}</span>}
            <span>{t.label}</span>
            {t.badge && <span className="tab-badge">{t.badge}</span>}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
