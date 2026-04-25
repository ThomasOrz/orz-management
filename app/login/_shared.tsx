'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/login/_shared.tsx — UI compartida entre /login, /registro y /auth/*
// ─────────────────────────────────────────────────────────────────────────

import { AlertTriangle } from 'lucide-react'

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 'var(--space-5)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 12,
            background: 'var(--accent-primary-bg)',
            border: '1px solid rgba(0,212,255,0.3)',
            marginBottom: 'var(--space-3)',
          }}>
            <span style={{
              color: 'var(--accent-primary)', fontWeight: 700, fontSize: 18, letterSpacing: '0.05em',
            }}>
              ORZ
            </span>
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 'var(--text-xl)', fontWeight: 600, margin: 0 }}>
            ORZ Academy
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', margin: 0, marginTop: 4 }}>
            Sistema de Trading Profesional
          </p>
        </div>

        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14,
          padding: 'var(--space-8)',
        }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export const authTitle: React.CSSProperties = {
  fontSize: 'var(--text-lg)',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: 0,
  marginBottom: 4,
}

export const authSubtitle: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  color: 'var(--text-secondary)',
  margin: 0,
  marginBottom: 'var(--space-6)',
}

export const authLink: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--accent-primary)',
  textDecoration: 'none',
}

interface FieldProps {
  icon?: React.ReactNode
  type: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  autoComplete?: string
  hint?: string
  uppercase?: boolean
}

export function Field({
  icon, type, label, value, onChange, placeholder, required, autoComplete, hint, uppercase,
}: FieldProps) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6,
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <span style={{
            position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)', display: 'flex',
          }}>
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="input-pro"
          style={{
            width: '100%',
            paddingLeft: icon ? 36 : 12,
            fontFamily: uppercase ? 'var(--font-mono)' : 'var(--font-family)',
            letterSpacing: uppercase ? '0.1em' : 'normal',
          }}
        />
      </div>
      {hint && (
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, marginTop: 6 }}>
          {hint}
        </p>
      )}
    </div>
  )
}

export function ErrorBanner({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px', borderRadius: 8,
      background: 'var(--loss-bg)', border: '1px solid rgba(255,59,74,0.3)',
      color: 'var(--loss)', fontSize: 'var(--text-xs)',
    }}>
      <AlertTriangle size={14} style={{ flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  )
}

export function SuccessBanner({ text }: { text: string }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: 'var(--profit-bg)', border: '1px solid rgba(0,230,118,0.3)',
      color: 'var(--profit)', fontSize: 'var(--text-xs)', lineHeight: 1.5,
    }}>
      {text}
    </div>
  )
}

export function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>O</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
    </div>
  )
}

export function GoogleIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export function traducirError(msg: string): string {
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.'
  if (/email not confirmed/i.test(msg)) return 'Confirma tu email antes de iniciar sesión.'
  if (/user already registered/i.test(msg)) return 'Ya existe una cuenta con este email.'
  if (/password.*at least|password.*should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.'
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Espera un minuto.'
  return msg
}
