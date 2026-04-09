import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'ORZ Management',
  description: 'Sistema de Trading — ORZ Academy',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="es">
      <body className="antialiased" style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>
        {user ? (
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
