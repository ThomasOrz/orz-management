// ─────────────────────────────────────────────────────────────────────────
// components/ui/Input.tsx — Input + Textarea con label/hint/error
// ─────────────────────────────────────────────────────────────────────────

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

interface BaseFieldProps {
  label?: string
  hint?: string
  error?: string | null
  icon?: ReactNode
  fullWidth?: boolean
}

type InputProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, icon, fullWidth = true, className = '', id, ...rest },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const describedBy = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined

  return (
    <div className={`field ${fullWidth ? 'field-full' : ''}`}>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      )}
      <div className={`field-control${icon ? ' input-with-icon' : ''}`}>
        {icon && <span className="input-icon" aria-hidden="true">{icon}</span>}
        <input
          ref={ref}
          id={fieldId}
          className={`input-pro${error ? ' has-error' : ''} ${className}`}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </div>
      {error ? (
        <p id={`${fieldId}-err`} className="field-error">{error}</p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="field-hint">{hint}</p>
      ) : null}
    </div>
  )
})

type TextareaProps = BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, fullWidth = true, className = '', id, ...rest },
  ref,
) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const describedBy = error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined

  return (
    <div className={`field ${fullWidth ? 'field-full' : ''}`}>
      {label && (
        <label htmlFor={fieldId} className="field-label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        className={`input-pro textarea-pro${error ? ' has-error' : ''} ${className}`}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
        {...rest}
      />
      {error ? (
        <p id={`${fieldId}-err`} className="field-error">{error}</p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="field-hint">{hint}</p>
      ) : null}
    </div>
  )
})

export default Input
