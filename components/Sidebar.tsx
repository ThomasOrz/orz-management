'use client'

// ─────────────────────────────────────────────────────────────────────────
// components/Sidebar.tsx — Navegación lateral con iconos Lucide
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, FileText, CheckSquare, Zap, BarChart3, MessageCircle, LogOut,
  Users, FlaskConical,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
  adminOnly?: boolean
}

const navLinks: NavLink[] = [
  { href: '/',                label: 'Dashboard',       icon: Home },
  { href: '/briefing',        label: 'Briefing Diario', icon: FileText },
  { href: '/validar',         label: 'Validar Setup',   icon: CheckSquare },
  { href: '/sesion',          label: 'Sesión',          icon: Zap },
  { href: '/evaluacion',      label: 'Evaluación',      icon: BarChart3 },
  { href: '/laboratorio',     label: 'Laboratorio',     icon: FlaskConical },
  { href: '/chat',            label: 'Chat Mentor',     icon: MessageCircle },
  { href: '/admin/usuarios',  label: 'Usuarios',        icon: Users, adminOnly: true },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<'admin' | 'student' | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !mounted) return
      setEmail(user.email ?? null)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (mounted && profile?.role) {
        setRole(profile.role as 'admin' | 'student')
      }
    }
    load()
    return () => { mounted = false }
  }, [supabase])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleLinks = navLinks.filter((l) => !l.adminOnly || role === 'admin')

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">ORZ</div>
        <div className="sidebar-logo-sub">Sistema de Trading</div>
      </div>

      <nav className="sidebar-nav">
        {visibleLinks.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/'
              ? pathname === '/'
              : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        {email && (
          <div style={{
            fontSize: 11, color: 'var(--text-tertiary)',
            padding: '8px 12px', marginBottom: 6,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {role === 'admin' && (
              <span style={{
                display: 'inline-block',
                fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '2px 6px', borderRadius: 4,
                background: 'var(--accent-primary-bg)',
                color: 'var(--accent-primary)',
                border: '0.5px solid rgba(0,212,255,0.3)',
                marginRight: 6,
              }}>
                Admin
              </span>
            )}
            {email}
          </div>
        )}
        <button className="sidebar-signout" onClick={handleSignOut} type="button">
          <LogOut size={16} strokeWidth={1.8} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
