import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ProduttivitaTecnico } from '@/components/features/tecnici/ProduttivitaTecnico'
import type { ProduttivitaResponse } from '@/app/api/tecnici/[id]/produttivita/route'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ mese?: string }>
}

export default async function ProduttivitaTecnicoPage({ params, searchParams }: Props) {
  const { id: tecnicoId } = await params
  const { mese: meseParam } = await searchParams

  const meseCorrente = new Date().toISOString().slice(0, 7)
  const mese = meseParam && /^\d{4}-\d{2}$/.test(meseParam) ? meseParam : meseCorrente

  // ─── Auth ────────────────────────────────────────────────────────────────
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .is('deleted_at', null)
    .single()

  if (!utente?.laboratorio_id) redirect('/login')

  const labId: string = utente.laboratorio_id

  // ─── RBAC — server-side ───────────────────────────────────────────────────
  if (utente.ruolo === 'tecnico') {
    // Un tecnico può vedere solo la propria produttività
    const { data: mioTecnico } = await svc
      .from('tecnici')
      .select('id')
      .eq('laboratorio_id', labId)
      .eq('utente_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!mioTecnico || mioTecnico.id !== tecnicoId) {
      redirect('/dashboard')
    }
  } else if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    redirect('/dashboard')
  }

  // ─── Dati tecnico (per nome header + compenso_base target, letto secondo tipo_compenso) ───────────────
  const { data: tecnico } = await svc
    .from('tecnici')
    .select('id, nome, cognome, compenso_base, tipo_compenso')
    .eq('id', tecnicoId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!tecnico) redirect('/tecnici')

  // ─── Fetch produttività da API (riusa la stessa logica) ──────────────────
  // Chiamata interna server-to-server è costosa; usiamo le query dirette dal DB.
  // Per semplicità e coerenza con il design, eseguiamo la stessa logica dell'API
  // direttamente qui come server component fetch via absolute URL.
  // Nota: l'API già gestisce RBAC, quindi qui usiamo direttamente il DB.

  function meseBoundaries(m: string) {
    const [year, month] = m.split('-').map(Number)
    const from = new Date(Date.UTC(year, month - 1, 1))
    const to   = new Date(Date.UTC(year, month, 1))
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }
  }

  const MESI_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']

  function ultimi4Mesi(m: string): string[] {
    const [year, month] = m.split('-').map(Number)
    const result: string[] = []
    for (let i = 3; i >= 0; i--) {
      let mm = month - i
      let yy = year
      while (mm <= 0) { mm += 12; yy-- }
      result.push(`${yy}-${String(mm).padStart(2, '0')}`)
    }
    return result
  }

  const { from, to } = meseBoundaries(mese)

  // Lavori completati + puntualità
  const { data: lavoriMese } = await svc
    .from('lavori')
    .select('id, data_consegna_effettiva, data_consegna_prevista')
    .eq('laboratorio_id', labId)
    .eq('tecnico_id', tecnicoId)
    .eq('stato', 'consegnato')
    .is('deleted_at', null)
    .gte('data_consegna_effettiva', from)
    .lt('data_consegna_effettiva', to)

  const lavoriCompletati = lavoriMese?.length ?? 0
  let inTempo = 0
  for (const lav of lavoriMese ?? []) {
    if (lav.data_consegna_effettiva && lav.data_consegna_prevista &&
        lav.data_consegna_effettiva <= lav.data_consegna_prevista) {
      inTempo++
    }
  }
  const puntualitaPct = lavoriCompletati > 0 ? Math.round((inTempo / lavoriCompletati) * 100) : 0

  // Tipo helper per join row
  type LavRow = {
    quantita: number
    lavori: { stato: string; tecnico_id: string | null; laboratorio_id: string; data_consegna_effettiva: string | null }
    listino: { compenso_tecnico: number | null }
  }
  type LavDetRow = {
    id: string
    quantita: number
    lavori: { id: string; numero_lavoro: string; data_consegna_effettiva: string | null; stato: string; tecnico_id: string | null; laboratorio_id: string }
    listino: { nome: string; compenso_tecnico: number | null }
  }

  // Compenso + lavorazioni dettaglio (ultime 10)
  const { data: lavorazioniRaw } = await svc
    .from('lavori_lavorazioni')
    .select(`id, quantita, lavori!inner(id, numero_lavoro, data_consegna_effettiva, stato, tecnico_id, laboratorio_id), listino!inner(nome, compenso_tecnico)`)
    .eq('laboratorio_id', labId)
    .eq('lavori.tecnico_id', tecnicoId)
    .eq('lavori.stato', 'consegnato')
    .eq('lavori.laboratorio_id', labId)
    .gte('lavori.data_consegna_effettiva', from)
    .lt('lavori.data_consegna_effettiva', to)
    .not('listino.compenso_tecnico', 'is', null)
    .order('lavori.data_consegna_effettiva', { ascending: false })
    .limit(10)

  const { data: tutteConCompenso } = await svc
    .from('lavori_lavorazioni')
    .select(`quantita, lavori!inner(stato, tecnico_id, laboratorio_id, data_consegna_effettiva), listino!inner(compenso_tecnico)`)
    .eq('laboratorio_id', labId)
    .eq('lavori.tecnico_id', tecnicoId)
    .eq('lavori.stato', 'consegnato')
    .eq('lavori.laboratorio_id', labId)
    .gte('lavori.data_consegna_effettiva', from)
    .lt('lavori.data_consegna_effettiva', to)
    .not('listino.compenso_tecnico', 'is', null)

  let compensoMaturato = 0
  for (const r of (tutteConCompenso ?? []) as unknown as LavRow[]) {
    compensoMaturato += (r.listino?.compenso_tecnico ?? 0) * (r.quantita ?? 1)
  }

  const lavorazioniDettaglio = ((lavorazioniRaw ?? []) as unknown as LavDetRow[]).map((r) => ({
    lavoro_id: r.lavori.id,
    numero_lavoro: r.lavori.numero_lavoro,
    nome_lavorazione: r.listino.nome,
    quantita: r.quantita,
    compenso_unitario: r.listino.compenso_tecnico ?? 0,
    compenso_totale: (r.listino.compenso_tecnico ?? 0) * r.quantita,
    data_consegna: r.lavori.data_consegna_effettiva ?? '',
  }))

  // Storico 4 mesi
  const mesiList = ultimi4Mesi(mese)
  const storico4Mesi = await Promise.all(
    mesiList.map(async (m) => {
      const { from: f, to: t } = meseBoundaries(m)
      const [, mm] = m.split('-').map(Number)
      const label = MESI_IT[mm - 1] ?? m
      const { data: rowsM } = await svc
        .from('lavori_lavorazioni')
        .select(`quantita, lavori!inner(stato, tecnico_id, laboratorio_id, data_consegna_effettiva), listino!inner(compenso_tecnico)`)
        .eq('laboratorio_id', labId)
        .eq('lavori.tecnico_id', tecnicoId)
        .eq('lavori.stato', 'consegnato')
        .eq('lavori.laboratorio_id', labId)
        .gte('lavori.data_consegna_effettiva', f)
        .lt('lavori.data_consegna_effettiva', t)
        .not('listino.compenso_tecnico', 'is', null)
      let comp = 0
      for (const r of (rowsM ?? []) as unknown as LavRow[]) {
        comp += (r.listino?.compenso_tecnico ?? 0) * (r.quantita ?? 1)
      }
      return { mese: m, compenso: comp, label }
    })
  )

  // ─── Streak settimanale — giorni con lavori consegnati ────────────────────
  // Calcola lunedì/venerdì della settimana corrente (o ultima se weekend)
  const oggiDate = new Date()
  const dow = oggiDate.getDay()
  const offsetMon = dow === 0 ? -6 : dow === 6 ? -5 : 1 - dow
  const lunediDate = new Date(oggiDate)
  lunediDate.setDate(oggiDate.getDate() + offsetMon)
  const venerdiDate = new Date(lunediDate)
  venerdiDate.setDate(lunediDate.getDate() + 4)
  const lunediIso = lunediDate.toISOString().split('T')[0]
  const venerdiIso = venerdiDate.toISOString().split('T')[0]

  const { data: weekRows } = await svc
    .from('lavori')
    .select('data_consegna_effettiva')
    .eq('laboratorio_id', labId)
    .eq('tecnico_id', tecnicoId)
    .eq('stato', 'consegnato')
    .is('deleted_at', null)
    .gte('data_consegna_effettiva', lunediIso)
    .lte('data_consegna_effettiva', venerdiIso)

  const giorniConLavori = [...new Set(
    (weekRows ?? [])
      .map((r) => r.data_consegna_effettiva)
      .filter((d): d is string => d !== null)
  )]

  const prodData: ProduttivitaResponse = {
    tecnico: { id: tecnico.id, nome: tecnico.nome, cognome: tecnico.cognome },
    mese,
    lavori_completati: lavoriCompletati,
    puntualita_pct: puntualitaPct,
    compenso_maturato: compensoMaturato,
    lavorazioni_dettaglio: lavorazioniDettaglio,
    storico_4_mesi: storico4Mesi,
  }

  const isProprioTecnico = utente.ruolo === 'tecnico'

  return (
    <PageWrapper>
      <AppHeader
        title={isProprioTecnico ? 'La mia settimana' : `${tecnico.nome} ${tecnico.cognome}`}
        backHref="/tecnici"
      />
      <ProduttivitaTecnico
        data={prodData}
        meseCorrente={meseCorrente}
        compensoBase={tecnico.compenso_base}
        tipoCompenso={tecnico.tipo_compenso as 'fisso' | 'percentuale' | 'per_lavorazione' | null}
        giorniConLavori={giorniConLavori}
      />
    </PageWrapper>
  )
}
