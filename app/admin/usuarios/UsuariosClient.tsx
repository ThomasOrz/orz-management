'use client'

// ─────────────────────────────────────────────────────────────────────────
// app/admin/usuarios/UsuariosClient.tsx — Gestión de códigos + lista (Iter 3A)
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { Copy, Check, Plus, Trash2, Users, Ticket, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

interface InvitationCode {
  id: string
  code: string
  email: string | null
  full_name: string | null
  used_by: string | null
  used_at: string | null
  expires_at: string | null
  created_at: string
}

interface StudentProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

interface Props {
  initialCodes: InvitationCode[]
  students: StudentProfile[]
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sin 0/O/1/I

function generateCode(): string {
  let s = ''
  const buf = new Uint8Array(6)
  crypto.getRandomValues(buf)
  for (let i = 0; i < 6; i++) s += CODE_CHARS[buf[i] % CODE_CHARS.length]
  return `ORZ-${s}`
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return 0
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export default function UsuariosClient({ initialCodes, students }: Props) {
  const supabase = createClient()
  const [codes, setCodes] = useState<InvitationCode[]>(initialCodes)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const pending = useMemo(
    () => codes.filter((c) => !c.used_at && (!c.expires_at || new Date(c.expires_at).getTime() > Date.now())),
    [codes],
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCreating(true)

    const code = generateCode()
    const { data, error: err } = await supabase
      .from('invitation_codes')
      .insert({
        code,
        email: email.trim() || null,
        full_name: fullName.trim() || null,
      })
      .select('id, code, email, full_name, used_by, used_at, expires_at, created_at')
      .single()

    if (err || !data) {
      setError(err?.message ?? 'Error al crear el código')
      setCreating(false)
      return
    }

    setCodes((prev) => [data as InvitationCode, ...prev])
    setEmail('')
    setFullName('')
    setCreating(false)
    // Copiar automáticamente
    void copyToClipboard(data.code, data.id)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este código? Esta acción no se puede deshacer.')) return
    const { error: err } = await supabase.from('invitation_codes').delete().eq('id', id)
    if (err) {
      setError(err.message)
      return
    }
    setCodes((prev) => prev.filter((c) => c.id !== id))
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800)
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <PageHeader
        title="Usuarios"
        subtitle="Gestiona códigos de invitación y estudiantes registrados"
      />

      {/* Sección 1: Crear código */}
      <h2 style={sectionTitle}>
        <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Crear código de invitación
      </h2>
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <form onSubmit={handleCreate} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-3)',
          alignItems: 'flex-end',
        }}>
          <div>
            <label style={labelStyle}>Email del estudiante (opcional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="estudiante@correo.com"
              className="input-pro"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Nombre (opcional)</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Juan Pérez"
              className="input-pro"
              style={{ width: '100%' }}
            />
          </div>
          <Button type="submit" variant="primary" loading={creating} icon={<Plus size={14} />}>
            Generar código
          </Button>
        </form>

        {error && (
          <div style={{
            marginTop: 'var(--space-4)',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 8,
            background: 'var(--loss-bg)', border: '1px solid rgba(255,59,74,0.3)',
            color: 'var(--loss)', fontSize: 'var(--text-xs)',
          }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}
      </Card>

      {/* Sección 2: Códigos pendientes */}
      <h2 style={sectionTitle}>
        <Ticket size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Códigos pendientes <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>· {pending.length}</span>
      </h2>

      {pending.length === 0 ? (
        <Card style={{ marginBottom: 'var(--space-6)' }}>
          <EmptyState
            icon={<Ticket size={28} />}
            title="No hay códigos pendientes"
            description="Genera un código para invitar a un nuevo estudiante."
          />
        </Card>
      ) : (
        <Card padding="none" style={{ marginBottom: 'var(--space-6)' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {pending.map((c, i) => {
              const days = daysUntil(c.expires_at)
              return (
                <li key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: i < pending.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  flexWrap: 'wrap',
                }}>
                  <code style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14, fontWeight: 600,
                    color: 'var(--accent-primary)',
                    background: 'var(--accent-primary-bg)',
                    border: '0.5px solid rgba(0,212,255,0.3)',
                    padding: '4px 10px', borderRadius: 6,
                    letterSpacing: '0.06em',
                  }}>
                    {c.code}
                  </code>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {c.full_name || c.email || '—'}
                    </div>
                    {c.email && c.full_name && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{c.email}</div>
                    )}
                  </div>

                  {days !== null && (
                    <Badge
                      variant={days <= 1 ? 'loss' : days <= 3 ? 'neutral' : 'info'}
                      size="sm"
                    >
                      {days === 0 ? 'expira hoy' : `${days}d restante${days === 1 ? '' : 's'}`}
                    </Badge>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    icon={copiedId === c.id ? <Check size={14} /> : <Copy size={14} />}
                    onClick={() => copyToClipboard(c.code, c.id)}
                  >
                    {copiedId === c.id ? 'Copiado' : 'Copiar'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={14} />}
                    onClick={() => handleDelete(c.id)}
                    aria-label="Eliminar código"
                  />
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {/* Sección 3: Estudiantes */}
      <h2 style={sectionTitle}>
        <Users size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
        Estudiantes registrados <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>· {students.length}</span>
      </h2>

      {students.length === 0 ? (
        <Card>
          <EmptyState
            title="Aún no hay estudiantes"
            description="Cuando alguien use un código de invitación aparecerá aquí."
          />
        </Card>
      ) : (
        <Card padding="none">
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {students.map((s, i) => (
              <li key={s.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-4) var(--space-5)',
                borderBottom: i < students.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                gap: 'var(--space-3)', flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {s.full_name || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.email}</div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  Registrado {new Date(s.created_at).toLocaleDateString('es-MX')}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

const sectionTitle: React.CSSProperties = {
  fontSize: 'var(--text-base)',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: 0,
  marginBottom: 'var(--space-3)',
  marginTop: 'var(--space-6)',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11, fontWeight: 600,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: 6,
}
