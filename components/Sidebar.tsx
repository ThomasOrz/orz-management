'use client'

// ─────────────────────────────────────────────────────────────────────────
// components/Sidebar.tsx — Navegación lateral con iconos Lucide
// ─────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, FileText, CheckSquare, Zap, BarChart3, MessageCircle, LogOut,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

const navLinks: NavLink[] = [
  { href: '/',           label: 'Dashboard',       icon: Home },
  { href: '/briefing',   label: 'Briefing Diario', icon: FileText },
  { href: '/validar',    label: 'Validar Setup',   icon: CheckSquare },
  { href: '/sesion',     label: 'Sesión',          icon: Zap },
  { href: '/evaluacion', label: 'Evaluación',      icon: BarChart3 },
  { href: '/chat',       label: 'Chat Mentor',     icon: MessageCircle },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">ORZ</div>
        <div className="sidebar-logo-sub">Sistema de Trading</div>
      </div>

      <nav className="sidebar-nav">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
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
        <button className="sidebar-signout" onClick={handleSignOut} type="button">
          <LogOut size={16} strokeWidth={1.8} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
