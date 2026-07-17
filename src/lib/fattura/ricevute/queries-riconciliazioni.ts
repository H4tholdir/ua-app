// Query-layer per la pagina /fatture/riconciliazioni (Task 16, spec R1 §6/§7).
// Aggrega in un'unica chiamata i 5 gruppi di pendenze che richiedono
// intervento manuale: claim PEC orfani, invii SMTP stagnanti, storni con
// nota di credito TD04 rifiutata da SdI, saldi credito cliente negativi,
// eventi ricevuta SdI parcheggiati (mai completati).
//
// Fail-closed (pattern fetchMovimentiCreditoValidi, src/lib/contabilita/
// queries.ts): un errore di lettura throw-a, MAI una lista parziale o vuota
// silenziosa — il chiamante (route Task 16) risponde 500.
//
// Query separate per gruppo ma NESSUN N+1: i saldi negativi si aggregano in
// memoria da UNA SOLA select su credito_clienti_movimenti (join clienti +
// pagamenti), esattamente come fetchMovimentiCreditoValidi fa per singolo
// cliente — qui è la stessa formula ma per l'intero laboratorio in un colpo solo.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { calcolaCreditoDisponibile, type MovimentoCreditoRiga } from '@/lib/contabilita/saldo'

export interface PendenzeRiconciliazione {
  claimOrfani: Array<{ id: string; numero: string; smtp_inviata_at: string }>
  smtpStagnanti: Array<{ id: string; numero: string; smtp_inviata_at: string }> // > 7 giorni
  stornateConTd04Rifiutato: Array<{ id: string; numero: string; td04_numero: string }>
  saldiNegativi: Array<{ cliente_id: string; cliente_nome: string; saldo: number }>
  eventiParcheggiati: Array<{
    id: string
    nome_file_ricevuta: string | null
    esito_verifica_firma: string | null
    esito_committente: string | null
    created_at: string
  }>
}

const SOGLIA_STAGNANTE_MS = 7 * 24 * 60 * 60 * 1000
// Finding 3 (review finale Task 17): claimInvioPec valorizza smtp_inviata_at
// PRIMA di sendMail (src/lib/fattura/invio-claim.ts) — durante l'invio reale
// (finestra di secondi) la fattura apparirebbe come claim orfano sbloccabile,
// rischiando un doppio invio concorrente se il titolare sblocca mentre la
// mail sta ancora partendo. 1h è ampiamente conservativa rispetto alla
// finestra reale.
const SOGLIA_CLAIM_ORFANO_MS = 60 * 60 * 1000

interface ClienteSnapMinimo {
  id: string
  nome: string
  cognome: string
  studio_nome: string | null
}

function clienteNome(c: ClienteSnapMinimo): string {
  return c.studio_nome ?? `${c.nome} ${c.cognome}`
}

/**
 * Claim orfani: fattura 'generata' con smtp_inviata_at valorizzato (lock
 * anti-doppio-invio mai rilasciato — vedi src/lib/fattura/invio-claim.ts e
 * la route /api/fatture/[id]/sblocca-claim che li risolve).
 *
 * Soglia d'età (Finding 3, review finale Task 17): claimInvioPec valorizza
 * smtp_inviata_at PRIMA di chiamare sendMail — durante l'invio reale (una
 * finestra di secondi) la fattura sarebbe altrimenti un claim orfano
 * "sbloccabile" a tutti gli effetti, con rischio di doppio invio se il
 * titolare sblocca mentre la mail sta partendo. Solo i claim più vecchi di
 * 1h (soglia ampiamente conservativa) sono considerati orfani reali.
 */
async function fetchClaimOrfani(
  svc: SupabaseClient,
  labId: string
): Promise<PendenzeRiconciliazione['claimOrfani']> {
  const unOraFa = new Date(Date.now() - SOGLIA_CLAIM_ORFANO_MS).toISOString()
  const { data, error } = await svc
    .from('fatture')
    .select('id, numero, smtp_inviata_at')
    .eq('laboratorio_id', labId)
    .eq('stato_sdi', 'generata')
    .not('smtp_inviata_at', 'is', null)
    .lt('smtp_inviata_at', unOraFa)
    .is('deleted_at', null)
  if (error) throw new Error(`[riconciliazioni] lettura claim orfani: ${error.message}`)

  return ((data ?? []) as Array<{ id: string; numero: string; smtp_inviata_at: string }>).map((f) => ({
    id: f.id,
    numero: f.numero,
    smtp_inviata_at: f.smtp_inviata_at,
  }))
}

/**
 * SMTP stagnanti: fattura in 'smtp_inviata' (mail partita, ricevuta SdI mai
 * arrivata) da oltre 7 giorni — probabile ricevuta persa/mai processata.
 */
async function fetchSmtpStagnanti(
  svc: SupabaseClient,
  labId: string
): Promise<PendenzeRiconciliazione['smtpStagnanti']> {
  const settGiorniFa = new Date(Date.now() - SOGLIA_STAGNANTE_MS).toISOString()
  const { data, error } = await svc
    .from('fatture')
    .select('id, numero, smtp_inviata_at')
    .eq('laboratorio_id', labId)
    .eq('stato_sdi', 'smtp_inviata')
    .lt('smtp_inviata_at', settGiorniFa)
    .is('deleted_at', null)
  if (error) throw new Error(`[riconciliazioni] lettura SMTP stagnanti: ${error.message}`)

  return ((data ?? []) as Array<{ id: string; numero: string; smtp_inviata_at: string }>).map((f) => ({
    id: f.id,
    numero: f.numero,
    smtp_inviata_at: f.smtp_inviata_at,
  }))
}

/**
 * Storni con TD04 rifiutato: fattura originale stornata (stornata_at valorizzato)
 * la cui nota di credito TD04 collegata (fattura_collegata_id → id originale,
 * vedi route /api/fatture/[id]/nota-credito) è stata rifiutata da SdI — il
 * credito compensativo NON è mai stato emesso validamente, serve intervento.
 *
 * Finding 1 (review finale Task 17): dopo un re-storno legittimo (TD04-A
 * rifiutata → nuova TD04-B emessa che ri-valorizza stornata_at sull'originale)
 * l'originale ha ANCORA un TD04-A rifiutata collegato, quindi resterebbe nel
 * gruppo per sempre anche a TD04-B accettata. Un'originale è esclusa se ha,
 * oltre al TD04 rifiutato, un ALTRO TD04 collegato con stato_sdi <> 'rifiutata'
 * (stessa semantica della guardia anti-collisione del trigger
 * annulla_effetti_storno_td04, migration 20260716091000: un TD04 non-rifiutato
 * collegato indica che il ciclo storno è stato ri-risolto).
 *
 * Task 12 (R2d, spec §D-5): 2 query indipendenti → 1 self-join embed.
 * Un'unica select su 'fatture' (originali stornate) con embed `td04:
 * fatture!fattura_collegata_id(...)` — self-join sulla stessa tabella via la
 * FK fattura_collegata_id → id. L'embed è filtrato SOLO su
 * tipo_documento='TD04' e deleted_at IS NULL (MAI su stato_sdi: serve
 * l'INTERO set dei TD04 collegati per la regola anti-loop, altrimenti un
 * TD04-B non-rifiutato verrebbe scartato prima del match in memoria e
 * l'originale resterebbe erroneamente nel gruppo). Nessun `!inner`: le
 * originali senza alcun TD04 collegato devono restare nel risultato con
 * `td04: []`, per essere scartate dal match in memoria (nessun rifiutato).
 * laboratorio_id sui figli embed: implicito per invariante same-lab (il
 * trigger annulla_effetti_storno_td04, migration 20260716091000, garantisce
 * che fattura_collegata_id punti sempre a una fattura dello stesso
 * laboratorio) — nessun filtro esplicito necessario sull'embed.
 * Match in memoria invariato (stessa regola anti-loop), ora su `riga.td04`
 * invece della Map costruita dalla seconda query: nessun N+1.
 */
async function fetchStornateConTd04Rifiutato(
  svc: SupabaseClient,
  labId: string
): Promise<PendenzeRiconciliazione['stornateConTd04Rifiutato']> {
  const { data, error } = await svc
    .from('fatture')
    .select('id, numero, stornata_at, td04:fatture!fattura_collegata_id(id, numero, stato_sdi)')
    .eq('laboratorio_id', labId)
    .not('stornata_at', 'is', null)
    .is('deleted_at', null)
    .eq('td04.tipo_documento', 'TD04')
    .is('td04.deleted_at', null)
  if (error) throw new Error(`[riconciliazioni] lettura fatture stornate + TD04 collegati: ${error.message}`)

  const righe = (data ?? []) as unknown as Array<{
    id: string
    numero: string
    td04: Array<{ id: string; numero: string; stato_sdi: string }> | null
  }>

  const result: PendenzeRiconciliazione['stornateConTd04Rifiutato'] = []
  for (const o of righe) {
    const collegati = o.td04 ?? []
    const rifiutato = collegati.find((t) => t.stato_sdi === 'rifiutata')
    if (!rifiutato) continue
    const riStornoRisolto = collegati.some((t) => t.id !== rifiutato.id && t.stato_sdi !== 'rifiutata')
    if (riStornoRisolto) continue
    result.push({ id: o.id, numero: o.numero, td04_numero: rifiutato.numero })
  }
  return result
}

/**
 * Saldi negativi: aggregazione per cliente della stessa formula di
 * `calcolaCreditoDisponibile` (src/lib/contabilita/saldo.ts — eccedenze +
 * storni - applicazioni - rimborsi - annulli_storno), con lo stesso filtro
 * anti-credito-fantasma di `fetchMovimentiCreditoValidi` (src/lib/
 * contabilita/queries.ts: un'eccedenza il cui pagamento sorgente non è più
 * 'attivo' non conta). UNA sola select su tutto il laboratorio, aggregazione
 * in memoria per cliente_id — nessun N+1 per cliente.
 */
async function fetchSaldiNegativi(
  svc: SupabaseClient,
  labId: string
): Promise<PendenzeRiconciliazione['saldiNegativi']> {
  const { data, error } = await svc
    .from('credito_clienti_movimenti')
    .select('tipo, importo, cliente_id, pagamento_id, pagamenti(stato), clienti(id, nome, cognome, studio_nome)')
    .eq('laboratorio_id', labId)
  if (error) throw new Error(`[riconciliazioni] lettura movimenti credito: ${error.message}`)

  const righe = (data ?? []) as unknown as Array<{
    tipo: MovimentoCreditoRiga['tipo']
    importo: number
    cliente_id: string
    pagamento_id: string | null
    pagamenti: { stato: string } | null
    clienti: ClienteSnapMinimo | null
  }>

  // Stesso gate di fetchMovimentiCreditoValidi: SOLO 'eccedenza' è gated sul
  // pagamento sorgente ancora attivo — storno/applicazione/rimborso/annullo
  // passano sempre (non hanno un pagamento "fantasma" da annullare).
  const validi = righe.filter((r) => r.tipo !== 'eccedenza' || r.pagamenti?.stato === 'attivo')

  const perCliente = new Map<string, { nome: string; movimenti: MovimentoCreditoRiga[] }>()
  for (const r of validi) {
    const nome = r.clienti ? clienteNome(r.clienti) : r.cliente_id
    const existing = perCliente.get(r.cliente_id)
    if (existing) {
      existing.movimenti.push({ tipo: r.tipo, importo: r.importo })
    } else {
      perCliente.set(r.cliente_id, { nome, movimenti: [{ tipo: r.tipo, importo: r.importo }] })
    }
  }

  const result: PendenzeRiconciliazione['saldiNegativi'] = []
  for (const [clienteId, { nome, movimenti }] of perCliente) {
    const saldo = calcolaCreditoDisponibile(movimenti)
    if (saldo < 0) result.push({ cliente_id: clienteId, cliente_nome: nome, saldo })
  }
  return result
}

/**
 * Eventi parcheggiati: righe «proposta» in fatture_sdi_eventi mai completate
 * (stato_a IS NULL — l'unico writer di stato_a è la RPC applica_ricevuta_sdi,
 * vedi /api/pec/ricevute/[id]/applica) che richiedono intervento perché:
 *   - non matchate a nessuna fattura (fattura_id IS NULL, mismatch identificativo_sdi
 *     o nessuna fattura con quel nome_file_xml — vedi ingest-ricevuta.ts §5), OPPURE
 *   - in quarantena firma (esito_verifica_firma='fallita'), OPPURE
 *   - notifica esito committente negativa (esito_committente='EC02', mai
 *     applicata automaticamente — D-5 in ingest-ricevuta.ts).
 * `stato_a IS NULL` è comune a tutti e tre i rami: filtrato una volta sola,
 * poi l'OR distingue solo i tre motivi di parcheggio.
 *
 * Finding 2 (review finale Task 17): con il fallback quarantena-all, un
 * evento parcheggiato per firma fallita/EC02 su una fattura poi risolta dal
 * titolare via override (stato-sdi-override, che scrive stato_sdi
 * direttamente sulla fattura e NON completa l'evento — stato_a resta NULL)
 * restava "parcheggiato per sempre": badge monotono crescente. Fix minimo:
 * esclude gli eventi con fattura_id valorizzato la cui fattura è già in uno
 * stato terminale ('accettata'/'rifiutata') — il titolare ha già risolto la
 * pendenza fiscale, l'evento stesso è solo un residuo di quarantena. Gli
 * eventi con fattura_id NULL (mai matchati) restano sempre, non hanno una
 * fattura la cui risoluzione osservare.
 *
 * Task 12 (R2d, spec §D-5): guard-then-fetch → 1 embed LEFT. Select unica su
 * 'fatture_sdi_eventi' con embed `fatture(stato_sdi)` sulla FK fattura_id →
 * fatture.id. MAI `!inner`: gli eventi con fattura_id NULL (mai matchati)
 * DEVONO restare nel risultato con `fatture: null` — un inner join li
 * eliminerebbe. laboratorio_id sulla fattura embed: implicito per invariante
 * same-lab (stessa garanzia trigger di cui sopra) — nessun filtro esplicito.
 * Filtro di terminalità replicato ESATTAMENTE in memoria: evento tenuto se
 * `fatture === null` (fattura_id NULL o riga non risolta dall'embed) oppure
 * lo stato non è terminale ('accettata'/'rifiutata') — stessa semantica di
 * prima, ora senza la seconda query né il Set idFattureRisolte.
 */
async function fetchEventiParcheggiati(
  svc: SupabaseClient,
  labId: string
): Promise<PendenzeRiconciliazione['eventiParcheggiati']> {
  const { data, error } = await svc
    .from('fatture_sdi_eventi')
    .select(
      'id, nome_file_ricevuta, esito_verifica_firma, esito_committente, created_at, fattura_id, stato_a, fatture(stato_sdi)'
    )
    .eq('laboratorio_id', labId)
    .is('stato_a', null)
    .or('fattura_id.is.null,esito_verifica_firma.eq.fallita,esito_committente.eq.EC02')
  if (error) throw new Error(`[riconciliazioni] lettura eventi parcheggiati: ${error.message}`)

  const eventi = (data ?? []) as unknown as Array<{
    id: string
    nome_file_ricevuta: string | null
    esito_verifica_firma: string | null
    esito_committente: string | null
    created_at: string
    fattura_id: string | null
    fatture: { stato_sdi: string } | null
  }>

  const TERMINALI = ['accettata', 'rifiutata']
  return eventi
    .filter((e) => e.fatture === null || !TERMINALI.includes(e.fatture.stato_sdi))
    .map((e) => ({
      id: e.id,
      nome_file_ricevuta: e.nome_file_ricevuta,
      esito_verifica_firma: e.esito_verifica_firma,
      esito_committente: e.esito_committente,
      created_at: e.created_at,
    }))
}

export async function fetchPendenzeRiconciliazione(
  svc: SupabaseClient,
  labId: string
): Promise<PendenzeRiconciliazione> {
  const [claimOrfani, smtpStagnanti, stornateConTd04Rifiutato, saldiNegativi, eventiParcheggiati] =
    await Promise.all([
      fetchClaimOrfani(svc, labId),
      fetchSmtpStagnanti(svc, labId),
      fetchStornateConTd04Rifiutato(svc, labId),
      fetchSaldiNegativi(svc, labId),
      fetchEventiParcheggiati(svc, labId),
    ])

  return { claimOrfani, smtpStagnanti, stornateConTd04Rifiutato, saldiNegativi, eventiParcheggiati }
}
