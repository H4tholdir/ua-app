/**
 * seed-new-lab.ts
 *
 * Onboarding script: copia i dati standard dal lab template (Filippo Opromolla)
 * a un nuovo laboratorio. Garantisce che ogni nuovo lab abbia cicli di produzione
 * e fasi funzionanti dal primo accesso.
 *
 * Cosa copia:
 *   1. cicli_produzione   — cicli di produzione del lab template
 *   2. fasi_produzione    — fasi associate ai cicli (con remap ciclo_id e responsabile_id=null)
 *
 * Cosa NON copia:
 *   - lookup_valori: tabella globale senza laboratorio_id, seeded una volta sola
 *     via scripts/seed-lookup-globali.ts
 *   - clienti/pazienti/lavori: dati operativi del lab sorgente, non da copiare
 *
 * ⚠️  IDEMPOTENZA: lo script NON è idempotente.
 *     Non eseguire due volte sullo stesso lab senza prima cancellare i dati.
 *     Verifica prima: SELECT count(*) FROM cicli_produzione WHERE laboratorio_id = '<target>';
 *
 * Uso:
 *   cd ua-app
 *   npx tsx scripts/seed-new-lab.ts <laboratorio_id>
 *
 * Esempio:
 *   npx tsx scripts/seed-new-lab.ts 314cd040-0893-4e9d-9ad8-786e4eefd75f
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Carica .env.local prima di tutto
config({ path: resolve(__dirname, '../.env.local') })

// ─── Env ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Mancano NEXT_PUBLIC_SUPABASE_URL e/o SUPABASE_SERVICE_ROLE_KEY nel .env.local')
  process.exit(1)
}

// ─── Costanti ─────────────────────────────────────────────────────────────────

/**
 * Lab Filippo Opromolla — fonte di verità per cicli e fasi di produzione.
 * Tutti i nuovi lab ricevono una copia di questi dati al momento del onboarding.
 */
const TEMPLATE_LAB_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'

// ─── Client Supabase (service role — bypassa RLS) ─────────────────────────────

const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── Step 1 + 2: Cicli di produzione + Fasi ───────────────────────────────────

/**
 * Copia cicli_produzione dal template al target lab.
 *
 * @returns Mappa old ciclo id → new ciclo id (per il remap delle fasi)
 */
async function seedCicliProduzione(
  targetLabId: string
): Promise<Map<string, string>> {
  console.log('\n  📋  Leggo cicli_produzione dal lab template...')

  const { data: cicli, error } = await svc
    .from('cicli_produzione')
    .select('*')
    .eq('laboratorio_id', TEMPLATE_LAB_ID)

  if (error) throw new Error(`cicli_produzione read: ${error.message}`)
  if (!cicli?.length) {
    console.log('  ⚠   Nessun ciclo trovato nel lab template — skip')
    return new Map()
  }

  // Genera nuovi UUID per ogni ciclo e costruisce la mappa old → new
  const idMap = new Map<string, string>()
  for (const c of cicli) idMap.set(c.id, randomUUID())

  const toInsert = cicli.map(c => ({
    id: idMap.get(c.id)!,
    laboratorio_id: targetLabId,
    codice: c.codice,
    nome: c.nome,
    tipo_dispositivo: c.tipo_dispositivo,
    classe_rischio: c.classe_rischio,
    normative_json: c.normative_json,
    attivo: c.attivo,
    deleted_at: c.deleted_at,
    // created_at e updated_at omessi → DEFAULT now() del DB
  }))

  const { error: insertErr } = await svc.from('cicli_produzione').insert(toInsert)
  if (insertErr) throw new Error(`cicli_produzione insert: ${insertErr.message}`)

  console.log(`  ✓   ${toInsert.length} cicli di produzione copiati`)
  return idMap
}

/**
 * Copia fasi_produzione dal template al target lab.
 *
 * - Rimappa ciclo_id con la mappa old→new generata da seedCicliProduzione
 * - Azzera responsabile_id (FK a tecnici — il nuovo lab non ha i tecnici di Filippo)
 *
 * @param cicloIdMap Mappa old ciclo id → new ciclo id
 */
async function seedFasiProduzione(
  targetLabId: string,
  cicloIdMap: Map<string, string>
): Promise<void> {
  if (!cicloIdMap.size) {
    console.log('  ⚠   Nessun ciclo remappato — skip fasi')
    return
  }

  console.log('\n  📋  Leggo fasi_produzione dal lab template...')

  const { data: fasi, error } = await svc
    .from('fasi_produzione')
    .select('*')
    .eq('laboratorio_id', TEMPLATE_LAB_ID)

  if (error) throw new Error(`fasi_produzione read: ${error.message}`)
  if (!fasi?.length) {
    console.log('  ⚠   Nessuna fase trovata nel lab template — skip')
    return
  }

  const toInsert = fasi.map(f => ({
    // id omesso → uuid_generate_v4() DEFAULT
    laboratorio_id: targetLabId,
    ciclo_id: cicloIdMap.get(f.ciclo_id) ?? f.ciclo_id,
    codice_fase: f.codice_fase,
    descrizione: f.descrizione,
    ordine: f.ordine,
    obbligatoria: f.obbligatoria,
    misurazioni_da_rilevare: f.misurazioni_da_rilevare,
    esito_atteso: f.esito_atteso,
    controllo_misura: f.controllo_misura,
    materiali_nota: f.materiali_nota,
    attrezzatura: f.attrezzatura,
    tempo_medio_lavoro: f.tempo_medio_lavoro,
    deleted_at: f.deleted_at,
    // responsabile_id azzerato: i tecnici del template non appartengono al nuovo lab
    responsabile_id: null,
    // created_at e updated_at omessi → DEFAULT now() del DB
  }))

  const { error: insertErr } = await svc.from('fasi_produzione').insert(toInsert)
  if (insertErr) throw new Error(`fasi_produzione insert: ${insertErr.message}`)

  console.log(`  ✓   ${toInsert.length} fasi di produzione copiate`)
}

// ─── Funzione principale ───────────────────────────────────────────────────────

async function seedNewLab(targetLabId: string): Promise<void> {
  console.log(`\n🔬  Seeding lab ${targetLabId}...\n`)

  // Verifica che il lab target esista
  const { data: lab, error: labErr } = await svc
    .from('laboratori')
    .select('nome_laboratorio')
    .eq('id', targetLabId)
    .single()

  if (labErr || !lab) {
    console.error(`❌  Lab ${targetLabId} non trovato nel DB`)
    process.exit(1)
  }

  console.log(`  Lab: ${lab.nome_laboratorio}`)

  // Esegui seed in sequenza (fasi dipende dalla mappa dei cicli)
  const cicloIdMap = await seedCicliProduzione(targetLabId)
  await seedFasiProduzione(targetLabId, cicloIdMap)

  console.log('\n✅  Seed completato!\n')
  console.log('📊  Riepilogo:')
  console.log(`    Cicli copiati : ${cicloIdMap.size}`)
  console.log(`    Lab target    : ${lab.nome_laboratorio} (${targetLabId})`)
  console.log()
  console.log('🔍  Verifica con SQL:')
  console.log(`    SELECT count(*) FROM cicli_produzione WHERE laboratorio_id = '${targetLabId}';`)
  console.log(`    SELECT count(*) FROM fasi_produzione  WHERE laboratorio_id = '${targetLabId}';`)
  console.log()
  console.log('ℹ️   NOTE:')
  console.log('    - lookup_valori NON viene copiato (tabella globale senza laboratorio_id)')
  console.log('    - responsabile_id sulle fasi è stato azzerato (tecnici non trasferibili)')
  console.log('    - lo script NON è idempotente: non eseguire due volte sullo stesso lab\n')
}

// ─── Entry point ──────────────────────────────────────────────────────────────

const labId = process.argv[2]

if (!labId) {
  console.error('Uso: npx tsx scripts/seed-new-lab.ts <laboratorio_id>')
  console.error('Esempio: npx tsx scripts/seed-new-lab.ts 314cd040-0893-4e9d-9ad8-786e4eefd75f')
  process.exit(1)
}

seedNewLab(labId).catch(e => {
  console.error('❌  Errore:', (e as Error).message)
  process.exit(1)
})
