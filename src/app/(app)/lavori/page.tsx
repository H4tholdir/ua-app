import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getPileHome, getPerimetroHome, subMorph } from '@/lib/dashboard/pile-home'
import { PilaAperta } from '@/components/features/pile/PilaAperta'
import { LePile } from '@/components/features/pile/LePile'
import type { Pila } from '@/lib/lavori/urgenza'

export const dynamic = 'force-dynamic'
const PILE_VALIDE = ['rossa', 'ambra', 'viola', 'blu'] as const

// /lavori v3 (§4.1, Task 8) — sostituisce integralmente la lista a tab-filtro
// v2.3: P1 `?pila=…` apre la pila (PilaAperta), senza param → «Le pile»
// (LePile). Stesso schema auth/perimetro di /dashboard (HomeV3): la sorgente
// dati (`getPileHome`) usa il service client (bypassa RLS) — il ruolo va
// validato qui, non lasciato al database.
export default async function LavoriPage({ searchParams }: { searchParams: Promise<{ pila?: string }> }) {
  const { pila: pilaParam } = await searchParams
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo, laboratorio_id').eq('id', user.id).is('deleted_at', null).single()
  if (!utente) redirect('/login')
  const { ruolo, laboratorio_id: labId } = utente
  if (!['titolare', 'admin_rete', 'tecnico', 'front_desk'].includes(ruolo)) redirect('/login') // admin_sistema usa /admin

  const perimetro = await getPerimetroHome(svc, labId, user.id, ruolo)
  const pile = await getPileHome(svc, labId, perimetro)
  const pila = (PILE_VALIDE as readonly string[]).includes(pilaParam ?? '') ? (pilaParam as Pila) : null
  const conteggi = { rossa: pile.liste.rossa.length, ambra: pile.liste.ambra.length, viola: pile.liste.viola.length, blu: pile.liste.blu.length }

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      {pila
        ? <PilaAperta pila={pila} lista={pile.liste[pila]} sub={subMorph(pila, pile, new Date())} />
        : <LePile conteggi={conteggi} />}
    </div>
  )
}
