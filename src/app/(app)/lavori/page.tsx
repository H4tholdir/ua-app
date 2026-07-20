import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getPileHome, getPerimetroHome, subMorph } from '@/lib/dashboard/pile-home'
import { getCassetteSuggerite } from '@/lib/lavori/cassette'
import { PilaAperta } from '@/components/features/pile/PilaAperta'
import { PilaSplit } from '@/components/features/pile/PilaSplit'
import type { Pila } from '@/lib/lavori/urgenza'

export const dynamic = 'force-dynamic'
const PILE_VALIDE = ['rossa', 'ambra', 'viola', 'blu'] as const

// /lavori v3 (§4.1, Task 8) — sostituisce integralmente la lista a tab-filtro
// v2.3: P1 `?pila=…` apre la pila (PilaAperta). Task 7 (ondata A
// mini-triage) — morte di «Le pile»: senza `?pila=` valido la route non
// renderizza più nulla di suo, fa redirect a `/dashboard` (decisione
// ratificata, vedi commit). Stesso schema auth/perimetro di /dashboard
// (HomeV3): la sorgente dati (`getPileHome`) usa il service client (bypassa
// RLS) — il ruolo va validato qui, non lasciato al database.
//
// Regime 768 (Task 9, ADR B6): con `?pila=`, a ≥768 e <1024 lo split a due
// colonne (`PilaSplit`) sostituisce la lista mobile a colonna singola — stesso
// pattern show/hide CSS di `HomeDesktop` (`.ua-lavori-mobile`/`.ua-lavori-split`).
// A ≥1024 resta il regime mobile a colonna singola (fuori scope di questo task).
export default async function LavoriPage({ searchParams }: { searchParams: Promise<{ pila?: string; lavoro?: string }> }) {
  const { pila: pilaParam, lavoro: lavoroParam } = await searchParams
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')
  const { ruolo, laboratorioId: labId } = context
  if (!['titolare', 'admin_rete', 'tecnico', 'front_desk'].includes(ruolo)) redirect('/login') // admin_sistema usa /admin

  const svc = getServiceClient()
  const perimetro = await getPerimetroHome(svc, labId, context.userId, ruolo)
  const pile = await getPileHome(svc, labId, perimetro)
  const pila = (PILE_VALIDE as readonly string[]).includes(pilaParam ?? '') ? (pilaParam as Pila) : null
  if (!pila) redirect('/dashboard')
  const lista = pile.liste[pila]
  const lavoroSelezionato = (lavoroParam ? lista.find((l) => l.id === lavoroParam) : undefined) ?? lista[0] ?? null
  // A14 (Task 5) — le chip dello sheet conferma-cassetta servono SOLO alla
  // pila blu (dove il Conferma le apre): fetch condizionale, mai sprecata
  // sulle altre pile.
  const cassetteSuggerite = pila === 'blu' ? await getCassetteSuggerite(svc, labId) : []

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      <div className="ua-lavori-mobile">
        <PilaAperta pila={pila} lista={lista} sub={subMorph(pila, pile, new Date())} cassetteSuggerite={cassetteSuggerite} />
      </div>
      <PilaSplit pila={pila} lista={lista} sub={subMorph(pila, pile, new Date())} lavoroSelezionato={lavoroSelezionato} cassetteSuggerite={cassetteSuggerite} />
    </div>
  )
}
