/**
 * seed-arturo-pepe.ts
 *
 * Importa dati storici da Dental Project rel. 3.0 (OdonTec)
 * per il laboratorio Arturo Pepe (ITCA01050077, Angri SA).
 *
 * Cosa fa:
 * 1. Importa 19 medici come clienti nel lab Arturo Pepe
 * 2. Crea un cliente placeholder "Pazienti Storici pre-UÀ" (legacy senza mappatura medico)
 * 3. Importa 911 pazienti pseudonimizzati collegati al placeholder
 *
 * ⚠️  GDPR: I nomi reali dei pazienti NON vengono mai scritti nel DB.
 *     Il campo nome_cognome contiene esclusivamente il codice PAZ/2026/NNN.
 *     Il JSON sorgente deve restare locale e non deve essere committato.
 *
 *     NOTA: la pseudonimizzazione è basata su ordinamento alfabetico del JSON.
 *     Chi ha accesso al JSON sorgente può re-identificare i pazienti per posizione.
 *     Per produzione valutare cifratura via pgsodium + shuffle pre-import.
 *
 * Idempotente: usa UUID v5 deterministici → upsert on conflict id.
 * Rieseguire non crea duplicati.
 *
 * Uso:
 *   cd ua-app
 *   npx tsx scripts/seed-arturo-pepe.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// Carica .env.local prima di tutto
config({ path: resolve(__dirname, '../.env.local') })

// ─── Costanti ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Mancano NEXT_PUBLIC_SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY nel .env.local')
  process.exit(1)
}

/** Lab ID del laboratorio Arturo Pepe — già presente nel DB */
const LAB_ID = '314cd040-0893-4e9d-9ad8-786e4eefd75f'

/**
 * Namespace per UUID deterministici (implementazione UUID v5 senza dipendenze).
 * Derivato dal LAB_ID — garantisce unicità per-tenant.
 * ⚠️ Non cambiare: ogni modifica invalida gli ID già inseriti.
 */
const NS = LAB_ID

/**
 * UUID v5 (SHA-1) — implementazione pura Node.js senza dipendenze esterne.
 * Conforme RFC 4122 §4.3.
 */
function uuidv5(name: string, namespace: string): string {
  // Converti il namespace UUID in 16 byte
  const nsHex = namespace.replace(/-/g, '')
  const nsBytes = Buffer.from(nsHex, 'hex')
  const nameBytes = Buffer.from(name, 'utf-8')

  // SHA-1 di namespace + name
  const hash = createHash('sha1')
    .update(nsBytes)
    .update(nameBytes)
    .digest()

  // Imposta version (5) e variant (RFC 4122)
  hash[6] = (hash[6] & 0x0f) | 0x50
  hash[8] = (hash[8] & 0x3f) | 0x80

  const hex = hash.toString('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-')
}

/** Anno di importazione (usato nei codici PAZ/2026/NNN) */
const IMPORT_YEAR = 2026

/** Batch size per upsert pazienti */
const BATCH_SIZE = 100

// ─── Client Supabase (service role — bypassa RLS) ────────────────────────

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── Parsing medici ────────────────────────────────────────────────────────

interface MedicoRaw {
  codice: string
  nome_breve: string
  ragione_sociale: string
}

interface ClienteRow {
  id: string
  laboratorio_id: string
  studio_nome: string
  nome: string
  cognome: string
  indirizzo: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  note: string | null
}

/** Titoli professionali da rimuovere prima di split nome/cognome */
const TITOLI_RE = /\b(prof\.?|dr\.?|dott\.?|d\.ssa|dott\.ssa|prof\.ssa|sig\.?|sig\.ra)\s*/gi

/**
 * Analizza la ragione_sociale multiriga e ricava i campi UÀ.
 *
 * Formato tipico nel JSON:
 *   riga 0: nome / ragione sociale
 *   riga 1: indirizzo
 *   riga 2: CAP + città (+ provincia)
 */
function parseMedico(m: MedicoRaw): ClienteRow {
  const righe = m.ragione_sociale.split('\n').map(r => r.trim()).filter(Boolean)

  const rigaNome   = righe[0] ?? m.nome_breve
  const rigaInd    = righe[1] ?? null
  const rigaCitta  = righe[2] ?? null

  // Ragione sociale → studio_nome
  const studio_nome = rigaNome

  // Parsing nome/cognome — rimuovi titoli, separa primo token (cognome) dal resto
  const senzaTitoli = rigaNome
    .replace(TITOLI_RE, ' ')
    // Rimuovi suffissi come "e D.ssa Laura Sisalli" (nomi multipli: prendi solo il primo)
    .replace(/\s+e\s+.*/i, '')
    // Caratteri non-alfa-spazio
    .replace(/[^A-Za-zÀ-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const parti = senzaTitoli.split(/\s+/)

  let nome    = 'N.D.'
  let cognome = 'N.D.'

  if (parti.length >= 2) {
    // Il secondo token (o ultimo) è spesso il cognome in stile italiano
    // Convenzione: primo token → cognome, restanti → nome
    // (es. "GUIDA LUIGI" → cognome=GUIDA, nome=LUIGI)
    // Ma "STUDIO TEDESCO" → cognome=TEDESCO, nome=STUDIO (accettabile per dati legacy)
    cognome = parti[0]
    nome    = parti.slice(1).join(' ')
  } else if (parti.length === 1 && parti[0]) {
    cognome = parti[0]
    nome    = '—'
  }

  // Indirizzo (riga 1)
  const indirizzo = rigaInd ?? null

  // Città + provincia dalla riga 2 — es. "80058 Torre Annunziata (Na)"
  let cap      : string | null = null
  let citta    : string | null = null
  let provincia: string | null = null

  if (rigaCitta) {
    const capMatch  = rigaCitta.match(/\b(\d{5})\b/)
    const provMatch = rigaCitta.match(/\(([A-Za-z]{2})\)/)

    cap       = capMatch  ? capMatch[1]  : null
    provincia = provMatch ? provMatch[1].toUpperCase() : null

    // Rimuovi CAP e (XX) dalla stringa per ottenere la città
    citta = rigaCitta
      .replace(/\b\d{5}\b/, '')
      .replace(/\([A-Za-z]{2}\)/, '')
      .trim()
      .replace(/^[,\s]+|[,\s]+$/g, '')
      || null
  }

  return {
    id: uuidv5(`medico:${m.codice}`, NS),
    laboratorio_id: LAB_ID,
    studio_nome,
    nome,
    cognome,
    indirizzo,
    cap,
    citta,
    provincia,
    note: `Importato da Dental Project OdonTec — codice medico ${m.codice}`,
  }
}

// ─── Generazione ID placeholder pazienti ──────────────────────────────────

/** UUID deterministico per il cliente placeholder */
const PLACEHOLDER_CLIENT_ID = uuidv5('cliente:STORICO_PAZIENTI_LEGACY', NS)

/** Genera codice paziente PAZ/ANNO/NNN (zero-padded 4 cifre) */
function codicePaziente(idx: number): string {
  return `PAZ/${IMPORT_YEAR}/${String(idx + 1).padStart(4, '0')}`
}

// ─── Funzione principale ───────────────────────────────────────────────────

async function seed() {
  console.log('🌱  Seed Arturo Pepe — avvio\n')
  console.log(`    Lab ID : ${LAB_ID}`)
  console.log(`    Namespace UUID v5 : ${NS}\n`)

  // Carica JSON sorgente
  let raw: any
  try {
    const jsonPath = resolve(
      __dirname,
      '../../ANALISI/DM_ODONTEC_CATALOG/extracted_data/odontec_dental_project_completo.json'
    )
    raw = JSON.parse(readFileSync(jsonPath, 'utf-8'))
  } catch (err: any) {
    console.error('❌  Impossibile leggere il JSON sorgente:', err.message)
    process.exit(1)
  }

  const mediciRaw: MedicoRaw[] = raw.medici ?? []
  const tuttiPazienti: string[] = raw.tutti_pazienti ?? []

  console.log(`📄  Dati sorgente trovati:`)
  console.log(`    Medici    : ${mediciRaw.length}`)
  console.log(`    Pazienti  : ${tuttiPazienti.length}\n`)

  // ── STEP 1: Importa medici come clienti ───────────────────────────────

  console.log('👥  Step 1/3 — Importo medici come clienti...')

  const clientiRows: ClienteRow[] = mediciRaw.map(parseMedico)

  const { error: clientiErr, data: clientiData } = await svc
    .from('clienti')
    .upsert(clientiRows, { onConflict: 'id', ignoreDuplicates: false })
    .select('id')

  if (clientiErr) {
    console.error('❌  Errore upsert clienti:', clientiErr.message)
    process.exit(1)
  }

  const clientiCount = clientiData?.length ?? clientiRows.length
  console.log(`✅  Clienti (medici) inseriti/aggiornati: ${clientiCount}`)

  // Debug: mostra mapping
  for (const c of clientiRows) {
    console.log(`    [${c.id.slice(0, 8)}…]  ${c.studio_nome}`)
  }

  // ── STEP 2: Crea cliente placeholder per pazienti storici ─────────────

  console.log('\n🗂️   Step 2/3 — Creo cliente placeholder pazienti storici...')

  const placeholderRow = {
    id: PLACEHOLDER_CLIENT_ID,
    laboratorio_id: LAB_ID,
    studio_nome: 'Pazienti Storici pre-UÀ — Da Assegnare',
    nome: 'STORICO',
    cognome: 'LEGACY',
    indirizzo: null as string | null,
    cap: null as string | null,
    citta: null as string | null,
    provincia: null as string | null,
    note: [
      'Cliente placeholder per pazienti importati da Dental Project OdonTec.',
      'I pazienti storici non avevano mappatura diretta a un singolo medico.',
      'In fase di creazione di nuovi lavori, riassegnare il paziente al medico corretto.',
      '⚠️ Non usare questo record come cliente reale per fatturazione.',
    ].join(' '),
  }

  const { error: phErr } = await svc
    .from('clienti')
    .upsert(placeholderRow, { onConflict: 'id', ignoreDuplicates: false })

  if (phErr) {
    console.error('❌  Errore upsert cliente placeholder:', phErr.message)
    process.exit(1)
  }

  console.log(`✅  Cliente placeholder creato/aggiornato → ${PLACEHOLDER_CLIENT_ID}`)

  // ── STEP 3: Importa pazienti pseudonimizzati ──────────────────────────

  console.log('\n🔒  Step 3/3 — Importo pazienti pseudonimizzati (GDPR)...')
  console.log('    I nomi reali NON vengono scritti nel DB.')
  console.log('    Campo nome_cognome = codice PAZ/2026/NNN\n')

  // Costruisci righe pazienti
  const pazientiRows = tuttiPazienti.map((_, idx) => {
    const codice = codicePaziente(idx)
    return {
      id: uuidv5(`paziente:${codice}`, NS),
      laboratorio_id: LAB_ID,
      cliente_id: PLACEHOLDER_CLIENT_ID,
      codice_paziente: codice,
      // ⚠️ GDPR: nome_cognome = solo il codice, mai il nome reale
      nome_cognome: codice,
      data_nascita: null as string | null,
      codice_fiscale: null as string | null,
      note: null as string | null,
      anamnesi: null as string | null,
    }
  })

  // Upsert in batch da BATCH_SIZE
  let pazientiUpserted = 0
  const totalBatches = Math.ceil(pazientiRows.length / BATCH_SIZE)

  for (let i = 0; i < pazientiRows.length; i += BATCH_SIZE) {
    const batch = pazientiRows.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    process.stdout.write(`    Batch ${batchNum}/${totalBatches} (${batch.length} record)… `)

    const { error: pazErr, data: pazData } = await svc
      .from('pazienti')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })
      .select('id')

    if (pazErr) {
      console.error(`\n❌  Errore batch ${batchNum}:`, pazErr.message)
      process.exit(1)
    }

    const inserted = pazData?.length ?? batch.length
    pazientiUpserted += inserted
    console.log(`OK (${inserted})`)
  }

  // ── Riepilogo finale ──────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(60))
  console.log('✅  Seed completato.\n')
  console.log('📊  Riepilogo:')
  console.log(`    Medici importati come clienti : ${clientiCount}`)
  console.log(`    Cliente placeholder            : 1`)
  console.log(`    Pazienti pseudonimizzati       : ${pazientiUpserted}`)
  console.log()
  console.log('🔍  Verifica con SQL:')
  console.log(`    SELECT COUNT(*) FROM clienti WHERE laboratorio_id = '${LAB_ID}';`)
  console.log(`    -- Atteso: ${clientiCount + 1} (${clientiCount} medici + 1 placeholder)`)
  console.log()
  console.log(`    SELECT COUNT(*) FROM pazienti WHERE laboratorio_id = '${LAB_ID}';`)
  console.log(`    -- Atteso: ${pazientiUpserted}`)
  console.log()
  console.log('⚠️   NOTE GDPR/MDR:')
  console.log('    1. I pazienti sono pseudonimizzati: nome_cognome = codice PAZ/ANNO/NNN')
  console.log('    2. La pseudonimizzazione è REVERSIBILE per chi possiede il JSON sorgente')
  console.log('       (corrispondenza posizionale alfabetica). Non committare il JSON.')
  console.log('    3. Il cliente placeholder deve essere riassegnato lavoro per lavoro.')
  console.log('    4. DELETE bloccato su pazienti (protezione MDR 10 anni).')
  console.log('    5. Il DB manca di UNIQUE(laboratorio_id, codice_cliente) su clienti;')
  console.log('       valutare migration futura per rafforzare idempotenza.')
  console.log('─'.repeat(60))
}

// ─── Entry point ──────────────────────────────────────────────────────────

seed().catch(err => {
  console.error('❌  Errore inatteso:', err)
  process.exit(1)
})
