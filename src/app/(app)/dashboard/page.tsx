import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getPileHome, getPerimetroHome } from '@/lib/dashboard/pile-home'
import { fetchIngressiStriscia, scegliSegnale, leggiTecniciSenzaAnagrafica } from '@/lib/dashboard/striscia'
import { HomeV3 } from '@/components/features/home/HomeV3'
import { HomeDesktop } from '@/components/features/home/HomeDesktop'
import { PasskeyPromptOnDashboard } from '@/components/features/auth/PasskeyPromptOnDashboard'
import type { Pila } from '@/lib/lavori/urgenza'
import { adessoRoma, saluto, GIORNI, MESI } from '@/lib/utils/data-roma'

export const dynamic = 'force-dynamic'
const PILE_VALIDE = ['rossa', 'ambra', 'viola', 'blu'] as const

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
  // O1f (Task 11): la query tecnici-senza-anagrafica gira SOLO per
  // titolare/admin_rete (unici ruoli con `sTitTecnici` in gerarchia, v.
  // striscia.ts) — front_desk/tecnico non pagano il round-trip.
  const usaTecniciSenzaAnagrafica = ruolo === 'titolare' || ruolo === 'admin_rete'
  const [pile, ingressi, tecniciSenzaAnagrafica] = await Promise.all([
    getPileHome(svc, labId, perimetro),
    fetchIngressiStriscia(svc, labId, ruolo),
    usaTecniciSenzaAnagrafica ? leggiTecniciSenzaAnagrafica(svc, labId) : Promise.resolve([] as string[]),
  ])
  const segnale = scegliSegnale(ruolo, { ...ingressi, senzaAnagrafica: perimetro.senzaAnagrafica, tecniciSenzaAnagrafica, pile: pile.striscia })

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
      <PasskeyPromptOnDashboard />
    </div>
  )
}
