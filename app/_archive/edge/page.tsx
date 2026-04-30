import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { TrendingUp } from 'lucide-react'
import EdgeClient from './EdgeClient'
import type { ClosedTrade } from '@/types/trading'

export const dynamic = 'force-dynamic'

const MIN_TRADES = 10

export default async function EdgePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .eq('trade_cerrado', true)
    .not('resultado', 'is', null)
    .not('r_obtenido', 'is', null)
    .order('created_at', { ascending: true })

  const closed = (trades ?? []) as ClosedTrade[]

  if (closed.length < MIN_TRADES) {
    return (
      <div className="page-content">
        <EmptyState
          icon={<TrendingUp size={32} strokeWidth={1.5} />}
          title="Muestra insuficiente"
          description={`Necesitas al menos ${MIN_TRADES} trades cerrados para activar el Motor de Ventaja. Llevas ${closed.length}.`}
        />
      </div>
    )
  }

  return <EdgeClient trades={closed} />
}
