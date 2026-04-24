// ─────────────────────────────────────────────────────────────────────────
// components/ui/Badge.tsx — Badge / pill semántico
// ─────────────────────────────────────────────────────────────────────────

import type { HTMLAttributes, ReactNode } from 'react'

export type BadgeVariant = 'default' | 'profit' | 'loss' | 'neutral' | 'info' | 'accent'
export type BadgeSize = 'sm' | 'md'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: ReactNode
  children: ReactNode
}

export function Badge({
  variant = 'default',
  size = 'sm',
  icon,
  className = '',
  children,
  ...rest
}: BadgeProps) {
  const cls = [
    'badge',
    `badge-${variant}`,
    size === 'md' ? 'badge-md' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <span className={cls} {...rest}>
      {icon && <span className="badge-icon">{icon}</span>}
      {children}
    </span>
  )
}

export default Badge
