import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getPileHome, getPerimetroHome } from '@/lib/dashboard/pile-home'
import { fetchIngressiStriscia, scegliSegnale } from '@/lib/dashboard/striscia'
import { HomeV3 } from '@/components/features/home/HomeV3'
import { HomeDesktop } from '@/components/features/home/HomeDesktop'
import type { Pila } from '@/lib/lavori/urgenza'

export const dynamic = 'force-dynamic'
const PILE_VALIDE = ['rossa', 'ambra', 'viola', 'blu'] as const

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

function adessoRoma(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }))
}
function saluto(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

// Home v3 (§7.1 + rev. 3.1) — UNA composizione per tutti i ruoli (A1): le 4
// dashboard per ruolo escono dalla home QUI (la loro cancellazione fisica dei
// file è al Task 11). Il perimetro dati cambia server-side (getPerimetroHome),
// la UI è sempre la stessa HomeV3. `preferenza_dashboard` non si legge più.
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ pila?: string; lavoro?: string }> }) {
  const { pila: pilaParam, lavoro: lavoroParam } = await searchParams
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')
  const { ruolo, laboratorioId: labId } = context
  if (!['titolare', 'admin_rete', 'tecnico', 'front_desk'].includes(ruolo)) redirect('/login') // admin_sistema usa /admin

  const svc = getServiceClient()
  const perimetro = await getPerimetroHome(svc, labId, context.userId, ruolo)
  const [pile, ingressi] = await Promise.all([
    getPileHome(svc, labId, perimetro),
    fetchIngressiStriscia(svc, labId, ruolo),
  ])
  const segnale = scegliSegnale(ruolo, { ...ingressi, pile: pile.striscia })

  const ora = adessoRoma()
  const eyebrow = `${GIORNI[ora.getDay()]} ${ora.getDate()} ${MESI[ora.getMonth()]}`
  const nome = context.nome ?? context.email?.split('@')[0] ?? 'Utente'

  // Nav a 3 pannelli desktop (Task 9, ADR B6 Candidato A): la selezione vive
  // nell'URL — `pila` default rossa (validata), `lavoro` l'id presente nella
  // pila o il primo. `HomeDesktop` e `HomeV3` sono fratelli, il CSS decide chi
  // si vede (`.ua-home-mobile`/`.ua-home-desk`, breakpoint 1024).
  const pilaSelezionata: Pila = (PILE_VALIDE as readonly string[]).includes(pilaParam ?? '') ? (pilaParam as Pila) : 'rossa'
  const listaSelezionata = pile.liste[pilaSelezionata]
  const lavoroSelezionato = (lavoroParam ? listaSelezionata.find((l) => l.id === lavoroParam) : undefined) ?? listaSelezionata[0] ?? null

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      <HomeV3 nome={nome} eyebrow={eyebrow} saluto={saluto(ora)} pile={pile} segnale={segnale} />
      <HomeDesktop pile={pile} pilaSelezionata={pilaSelezionata} lavoroSelezionato={lavoroSelezionato} segnale={segnale} />
    </div>
  )
}
