// Ingestione applicativa di una ricevuta SdI caricata manualmente (spec R1
// §3.2/§4.3/§5, Task 10). Logica pura di orchestrazione (I/O verso Supabase),
// testabile indipendentemente dalla route HTTP.
//
// Pipeline (fail-closed ad ogni step — errori DB/storage → throw, MAI un 200
// silenzioso):
//   1. sha256 del contenuto → dedup per (laboratorio_id, sha) → 'duplicata'
//      (idempotenza forte, spec §3.2: nessun vincolo sul nome file).
//   2. cap anti-abuso: max 20 upload/24h per lab (COUNT origine=
//      'upload_verificato') → 'cap_superato'. Controllato PRIMA di parse/
//      firma/match per non sprecare lavoro su un lab già al tetto.
//   3. parse (Task 7) — XML non riconosciuto/malformato → 'non_valida',
//      NESSUN insert (fail-closed anti-injection nella tabella eventi).
//   4. verifica firma XAdES (Task 8 — fallback quarantena-all finché il
//      motore reale non è attivo, vedi verifica-firma.ts).
//   5. match fattura SEMPRE filtrato per laboratorio_id (mai cross-tenant,
//      invariante 4 del piano). Mismatch identificativo_sdi vs quello già
//      persistito sulla fattura → fail-closed: evento parcheggiato
//      (fattura_id NULL), MAI associato alla fattura sospetta (spec §4.3).
//   6. upload storage: nome oggetto SERVER-GENERATED
//      `<lab>/ricevute-sdi/<sha256>.xml` — il filename client entra SOLO nel
//      metadato `nome_file_ricevuta`, mai nel path (anti-path-traversal/
//      squatting).
//   7. INSERT riga «proposta» (stato_da/stato_a NULL — completata solo dalla
//      RPC applica_ricevuta_sdi, Task 9). transizioneProposta è un preview
//      calcolato con la STESSA mappa della RPC, SOLO se firma 'valida' E
//      fattura matchata senza mismatch — la RPC ricalcola comunque dallo
//      stato letto al momento dell'applica (mai fidarsi del preview).
import 'server-only'
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  parseRicevutaSdI,
  RicevutaNonValidaError,
  type TipoRicevutaSdI,
} from '@/lib/fattura/ricevute/parse-ricevuta-sdi'
import { verificaFirmaRicevuta } from '@/lib/fattura/ricevute/verifica-firma'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Svc = SupabaseClient<any, any, any>

export interface IngestRicevutaFile {
  buffer: Buffer
  filename: string
}

export type EsitoIngestRicevuta = 'proposta' | 'duplicata' | 'non_valida' | 'cap_superato'

export interface IngestRicevutaResult {
  esito: EsitoIngestRicevuta
  ricevutaId?: string
  tipo?: TipoRicevutaSdI
  fattura?: { id: string; numero: string; stato_sdi: string }
  transizioneProposta?: string | null
  esitoVerificaFirma?: 'valida' | 'fallita'
}

/** Cap anti-abuso applicativo (spec §5): oltre 20 upload/24h per lab → 429. */
const CAP_UPLOAD_24H = 20

/**
 * Transizione RICALCOLATA con la stessa mappa di `applica_ricevuta_sdi`
 * (supabase/migrations/20260716100000_ricevute_sdi_rpc.sql). SOLO preview:
 * la RPC ricalcola sempre dallo stato_sdi letto al momento dell'applica.
 */
function calcolaTransizioneProposta(
  tipo: TipoRicevutaSdI,
  esitoCommittente: 'EC01' | 'EC02' | null
): string | null {
  switch (tipo) {
    case 'RC':
      return 'accettata'
    case 'MC':
      return 'accettata'
    case 'NS':
      return 'rifiutata'
    case 'NE':
      return esitoCommittente === 'EC01' ? 'accettata' : null
    default:
      // EC02 già gestito sopra (NE); DT/AT: mai transizione automatica (D-5).
      return null
  }
}

export async function ingestRicevuta(
  svc: Svc,
  labId: string,
  userId: string,
  file: IngestRicevutaFile
): Promise<IngestRicevutaResult> {
  const sha = createHash('sha256').update(file.buffer).digest('hex')

  // 1. Dedup — idempotenza forte, unica chiave ammessa (spec §3.2).
  const { data: esistente, error: dedupErr } = await svc
    .from('fatture_sdi_eventi')
    .select('id')
    .eq('laboratorio_id', labId)
    .eq('content_sha256', sha)
    .maybeSingle()
  if (dedupErr) {
    throw new Error(`ricerca duplicati fallita: ${dedupErr.message}`)
  }
  if (esistente) {
    return { esito: 'duplicata', ricevutaId: esistente.id }
  }

  // 2. Cap anti-abuso (spec §5) — prima di spendere lavoro su parse/firma.
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: capErr } = await svc
    .from('fatture_sdi_eventi')
    .select('id', { count: 'exact', head: true })
    .eq('laboratorio_id', labId)
    .eq('origine', 'upload_verificato')
    .gte('created_at', since24h)
  if (capErr) {
    throw new Error(`conteggio cap upload fallito: ${capErr.message}`)
  }
  if ((count ?? 0) >= CAP_UPLOAD_24H) {
    return { esito: 'cap_superato' }
  }

  // 3. Parse — XML non valido/non riconosciuto → non_valida, nessun insert.
  let parsed
  try {
    parsed = parseRicevutaSdI(file.buffer)
  } catch (err) {
    if (err instanceof RicevutaNonValidaError) {
      return { esito: 'non_valida' }
    }
    throw err
  }

  // 4. Verifica firma XAdES (Task 8 — fallback quarantena-all).
  const esitoVerificaFirma = await verificaFirmaRicevuta(file.buffer)

  // 5. Match fattura — SEMPRE scoped al laboratorio (mai cross-tenant).
  const { data: fatturaTrovata, error: matchErr } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi, identificativo_sdi')
    .eq('laboratorio_id', labId)
    .eq('nome_file_xml', parsed.nomeFileFattura)
    .is('deleted_at', null)
    .maybeSingle()
  if (matchErr) {
    throw new Error(`match fattura fallito: ${matchErr.message}`)
  }

  // Mismatch identificativo_sdi vs quello già persistito sulla fattura →
  // fail-closed: NON si associa la fattura sospetta (spec §4.3).
  const mismatchIdentificativo =
    !!fatturaTrovata?.identificativo_sdi &&
    !!parsed.identificativoSdI &&
    fatturaTrovata.identificativo_sdi !== parsed.identificativoSdI

  const fatturaAssociata = fatturaTrovata && !mismatchIdentificativo ? fatturaTrovata : null

  // 6. Upload storage — nome oggetto SERVER-GENERATED, filename client SOLO
  // nel metadato dell'evento (mai nel path). `upsert: true` è sicuro qui: il
  // path è content-addressed (sha256 del contenuto), quindi un retry dopo un
  // INSERT fallito (file già caricato, riga mancante) riscrive esattamente
  // gli stessi byte invece di restare bloccato su "resource already exists".
  const ricevutaStoragePath = `${labId}/ricevute-sdi/${sha}.xml`
  const { error: uploadErr } = await svc.storage
    .from('fatture-pdf')
    .upload(ricevutaStoragePath, file.buffer, { contentType: 'application/xml', upsert: true })
  if (uploadErr) {
    throw new Error(`upload ricevuta su storage fallito: ${uploadErr.message}`)
  }

  // 7. Preview transizione — SOLO se firma valida E fattura matchata senza
  // mismatch. La RPC ricalcola comunque dallo stato letto (mai dal preview).
  const transizioneProposta =
    esitoVerificaFirma === 'valida' && fatturaAssociata
      ? calcolaTransizioneProposta(parsed.tipo, parsed.esitoCommittente)
      : null

  const { data: evento, error: insertErr } = await svc
    .from('fatture_sdi_eventi')
    .insert({
      laboratorio_id: labId,
      fattura_id: fatturaAssociata?.id ?? null,
      origine: 'upload_verificato',
      tipo_ricevuta: parsed.tipo,
      nome_file_fattura: parsed.nomeFileFattura,
      nome_file_ricevuta: file.filename,
      identificativo_sdi: parsed.identificativoSdI,
      esito_committente: parsed.esitoCommittente,
      lista_errori: parsed.listaErrori.length > 0 ? parsed.listaErrori : null,
      esito_verifica_firma: esitoVerificaFirma,
      ricevuta_storage_path: ricevutaStoragePath,
      content_sha256: sha,
      registrato_da: userId,
    })
    .select('id')
    .single()
  if (insertErr) {
    throw new Error(`inserimento evento ricevuta fallito: ${insertErr.message}`)
  }

  return {
    esito: 'proposta',
    ricevutaId: evento.id,
    tipo: parsed.tipo,
    fattura: fatturaAssociata
      ? {
          id: fatturaAssociata.id,
          numero: fatturaAssociata.numero,
          stato_sdi: fatturaAssociata.stato_sdi,
        }
      : undefined,
    transizioneProposta,
    esitoVerificaFirma,
  }
}
