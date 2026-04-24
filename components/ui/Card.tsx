// ─────────────────────────────────────────────────────────────────────────
// components/ui/Card.tsx — Card primitivo del sistema de diseño ORZ
// ─────────────────────────────────────────────────────────────────────────

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

type CardVariant = 'default' | 'elevated' | 'hover'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  children: ReactNode
}

const variantClass: Record<CardVariant, string> = {
  default: 'card',
  elevated: 'card card-elevated',
  hover: 'card card-hover',
}

const paddingClass: Record<CardPadding, string> = {
  none: 'card-pad-none',
  sm: 'card-pad-sm',
  md: '',
  lg: 'card-pad-lg',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { variant = 'default', padding = 'md', className = '', children, ...rest },
  ref,
) {
  const cls = [variantClass[variant], paddingClass[padding], className].filter(Boolean).join(' ')
  return (
    <div ref={ref} className={cls} {...rest}>
      {children}
    </div>
  )
})

export function CardHeader({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-header ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-body ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card-footer ${className}`} {...rest}>
      {children}
    </div>
  )
}

export default Card
