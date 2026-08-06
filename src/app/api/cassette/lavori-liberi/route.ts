import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { CHIUSI, derivaAlias } from '@/lib/cassette/parco-shared'
import { adessoRoma } from '@/lib/utils/data-roma'

export interface LavoroLibero {
  id: string
  numero: string
  dentista: string
  pazienteAlias: string | null
  urgenza: number
  // G8 (FIX-I, fix-list ri-collaudo #2) — additivi, MAI rimossi/rinominati campi esistenti: il
  // contratto è quello di `getParete`/`CassettaParete['lavoro']` (`parco-shared.ts`), qui in
  // sola lettura. Servono all'overlay ottimistico di `assegnaLavoro` (`CassettaSheet.tsx`), che
  // prima di questo fix passava sempre `null` a `miniaturaPerLavoro` — la miniatura corretta
  // arrivava solo al prossimo caricamento vero (bug confermato da Francesco, causa nota dal
  // report FIX-E).
  tipoDispositivo: string | null
  descrizione: string | null
}

type RawLavoroLibero = {
  id: string
  numero_lavoro: string
  data_consegna_prevista: string | null
  descrizione: string | null
  tipo_dispositivo: string | null
  clienti: { studio_nome: string | null; nome: string | null; cognome: string | null } | null
  pazienti: { codice_paziente: string | null; nome_cognome: string | null } | null
}

const MS_GIORNO = 24 * 60 * 60 * 1000

/**
 * Giorni alla consegna da `oggi` (negativo se già in ritardo). Un lavoro SENZA data prevista
 * riceve una sentinella grande (9999, non `Infinity`: `JSON.stringify(Infinity)` risolve a
 * `null` e romperebbe il contratto `urgenza: number`) — così finisce sempre in fondo, mai
 * escluso e mai crashato il sort.
 *
 * 🛑 `oggi` DEVE arrivare da `adessoRoma()`, mai da un `new Date()` nudo (D286, 06/08/2026).
 * I getter qui sotto sono quelli SENZA `UTC`, cioè leggono il giorno civile della macchina che
 * esegue — e in produzione quella macchina gira a UTC. Fra le 00:00 e le 02:00 italiane «oggi»
 * era quindi il giorno PRIMA, e ogni `urgenza` usciva di uno: un lavoro scaduto ieri riceveva
 * `urgenza: 0` e PERDEVA il segno di urgenza di `CassettaSheet.tsx:487` (`l.urgenza > 0`).
 * Sulla macchina di sviluppo, che è `Europe/Rome`, il difetto è invisibile — per questo le
 * prove (`tests/unit/lavori-liberi-orologio-roma.test.ts`) forzano `TZ=UTC`.
 *
 * 🔑 La forma è quella già in casa, non una nuova: `deltaGiorni`/`derivaUrgenza`
 * (`src/lib/dashboard/pile-home-shared.ts:58`, `src/lib/lavori/urgenza.ts:30`) fanno lo stesso
 * conto con la stessa firma, e il loro chiamante server (`src/lib/dashboard/pile-home.ts:41`)
 * passa `adessoRoma()` esattamente per questo motivo. Qui mancava solo quel passaggio.
 */
function giorniAllaConsegna(dataISO: string | null, oggi: Date): number {
  if (!dataISO) return 9999
  const [y, m, d] = dataISO.split('-').map(Number)
  const consegna = new Date(y, m - 1, d)
  const oggiZero = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
  return Math.round((consegna.getTime() - oggiZero.getTime()) / MS_GIORNO)
}

/**
 * GET /api/cassette/lavori-liberi (spec redesign §2.5, punto 13) — i lavori vivi del lab SENZA
 * cassetta, per l'azione «Metti un lavoro» dello sheet della cassetta libera (`CassettaSheet`).
 *
 * «Senza cassetta» = nessuna riga viva (`liberato_at IS NULL`) in `cassette_lavori` per quel
 * lavoro — STESSA verità di `getParete`/`deriveParete` (Task 3, `src/lib/cassette/parco.ts`),
 * letta qui con la stessa forma a due query (nessuna FK diretta `cassette_lavori → lavori` da
 * poter attraversare con un join PostgREST).
 *
 * Stati VIVI = non chiusi: `CHIUSI` è lo STESSO Set esportato da `parco-shared.ts` (riuso, non
 * copia) — un domani, se un nuovo stato chiuso si aggiungesse lì, questa route lo eredita senza
 * modifiche qui.
 *
 * Fail-CLOSED (a differenza di `getParete`, che è fail-soft in lettura, spec §9.1b): un errore
 * su una delle due query qui è SEMPRE un 500 esplicito, mai una lista degradata — mostrare
 * "libero" un lavoro che in realtà ha già una cassetta (perché la query `cassette_lavori` è
 * fallita silenziosamente) porterebbe a un tentativo di doppia assegnazione, non a un dato
 * mancante innocuo come nella sola lettura della parete.
 *
 * `isSameOrigin` non è richiesto qui (nessuna mutazione — stesso confine di
 * `lavori/pronti-da-fatturare/route.ts` e delle altre GET di lista dell'app): il vincolo
 * same-origin del piano riguarda le route che scrivono (PATCH/POST/DELETE), non le letture.
 */
export async function GET() {
  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const guard = assertLabOperativo(context, 'GET')
  if (guard) return guard
  const labId: string = context.laboratorioId

  const svc = getServiceClient()
  // Valori tra virgolette (stessa convenzione di `pile-home.ts`/`dashboard/queries.ts`:
  // `'("consegnato","annullato")'`, non `(consegnato,annullato)`) — sintassi letterale
  // dell'array PostgREST per una colonna `text`, non un dettaglio cosmetico.
  const filtroChiusi = `(${[...CHIUSI].map((s) => `"${s}"`).join(',')})`

  const [{ data: vive, error: errVive }, { data: lavori, error: errLavori }] = await Promise.all([
    svc.from('cassette_lavori').select('lavoro_id').eq('laboratorio_id', labId).is('liberato_at', null),
    svc
      .from('lavori')
      .select(
        'id, numero_lavoro, data_consegna_prevista, descrizione, tipo_dispositivo, clienti(studio_nome, nome, cognome), pazienti(codice_paziente, nome_cognome)'
      )
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .not('stato', 'in', filtroChiusi),
  ])

  if (errVive || errLavori) {
    console.error('[GET /api/cassette/lavori-liberi] lettura fallita:', errVive ?? errLavori)
    return NextResponse.json({ errore: 'lettura_fallita' }, { status: 500 })
  }

  const occupati = new Set((vive ?? []).map((v: { lavoro_id: string }) => v.lavoro_id))
  // D286 — l'orologio a muro di Roma, non quello del processo (v. `giorniAllaConsegna`).
  const oggi = adessoRoma()

  const liberi: LavoroLibero[] = ((lavori ?? []) as unknown as RawLavoroLibero[])
    .filter((l) => !occupati.has(l.id))
    .map((l) => ({
      id: l.id,
      numero: l.numero_lavoro,
      dentista: l.clienti?.studio_nome ?? (`${l.clienti?.nome ?? ''} ${l.clienti?.cognome ?? ''}`.trim() || '—'),
      pazienteAlias: derivaAlias(l.pazienti),
      urgenza: -giorniAllaConsegna(l.data_consegna_prevista, oggi),
      tipoDispositivo: l.tipo_dispositivo,
      descrizione: l.descrizione,
    }))
    // Urgenza DECRESCENTE (semantica pile, §2.5): valore più alto = consegna più vicina o già
    // scaduta. Equivalente a "data di consegna crescente" (senza data → in fondo, sentinella
    // 9999 sopra fa sì che -9999 sia il valore più basso possibile).
    .sort((a, b) => b.urgenza - a.urgenza)

  return NextResponse.json({ lavori: liberi })
}
