import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { cookies } from 'next/headers'
import { GeistSans } from 'geist/font/sans'

export const metadata: Metadata = {
  title: 'ORZ Management',
  description: 'Sistema de Trading — ORZ Academy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Detecta sesión activa leyendo la cookie de Supabase (sin llamada de red).
  // El middleware ya protege las rutas — si el usuario llega aquí está autenticado.
  const cookieStore = cookies()
  const hasSession = cookieStore.getAll().some(
    c => c.name.includes('auth-token') || c.name.startsWith('sb-')
  )

  return (
    <html lang="es" className={GeistSans.className}>
      <body>
        {hasSession ? (
          <div className="app-shell">
            <Sidebar />
            <main className="app-main">
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  )
}
