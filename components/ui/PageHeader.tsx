// ─────────────────────────────────────────────────────────────────────────
// components/ui/PageHeader.tsx — Header de página estandarizado
// ─────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  breadcrumb?: BreadcrumbItem[]
}

export function PageHeader({ title, subtitle, action, breadcrumb }: PageHeaderProps) {
  return (
    <header className="page-header">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="page-breadcrumb" aria-label="Breadcrumb">
          {breadcrumb.map((b, i) => (
            <span key={i} className="page-breadcrumb-item">
              {b.href ? <a href={b.href}>{b.label}</a> : <span>{b.label}</span>}
              {i < breadcrumb.length - 1 && <span className="page-breadcrumb-sep">/</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="page-header-row">
        <div className="page-header-titles">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="page-header-action">{action}</div>}
      </div>
    </header>
  )
}

export default PageHeader
