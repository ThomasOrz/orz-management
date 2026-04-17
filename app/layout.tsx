import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { cookies } from 'next/headers'

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
    <html lang="es">
      <body className="antialiased" style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>
        {hasSession ? (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-64 p-8">
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
