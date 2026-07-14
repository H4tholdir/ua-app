/**
 * n4-reconciliation.ts
 *
 * Script diagnostico READ-ONLY per l'audit pre-deploy della feature N4
 * (prezzo effettivo lavoro). NON esegue alcuna scrittura sul database:
 * solo SELECT.
 *
 * Cosa fa:
 * 1. Carica tutti i laboratori (o uno solo con --lab <uuid>).
 * 2. Per ciascun laboratorio, carica i lavori non soft-deleted con le
 *    relative righe di lavorazione (lavori_lavorazioni), filtrando in
 *    codice le righe soft-deleted (deleted_at non null).
 * 3. Usa GLI STESSI helper di produzione (prezzoEffettivoLavoro,
 *    divergenzaPrezzo da @/lib/domain/prezzo-lavoro) per calcolare il
 *    prezzo effettivo e rilevare eventuali divergenze rispetto a
 *    prezzo_unitario — così l'audit rispecchia esattamente la logica
 *    a runtime, senza reimplementarla.
 * 4. Stampa un report riassuntivo: quanti lavori hanno righe attive,
 *    quali di questi divergono, e un suggerimento sulla postura di
 *    rollout (cold rollout se ~0 divergenti).
 *
 * Uso:
 *   npx tsx scripts/n4-reconciliation.ts                # scansiona tutti i lab
 *   npx tsx scripts/n4-reconciliation.ts --lab <uuid>    # scansiona un solo lab
 *
 * Sicurezza:
 *   - Solo operazioni .select(...) sul client Supabase (service role).
 *   - Nessun .insert/.update/.upsert/.delete in questo file.
 *   - Nessun secret viene loggato (solo conferma booleana di presenza).
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { prezzoEffettivoLavoro, divergenzaPrezzo } from '@/lib/domain/prezzo-lavoro'

// Carica .env.local prima di tutto (stesso pattern di scripts/seed-new-lab.ts)
config({ path: resolve(__dirname, '../.env.local') })

// ─── Env ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nel .env.local')
  console.error('    Questo script richiede credenziali di servizio Supabase (sola lettura) per l\'audit.')
  process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── Args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const labIdx = args.indexOf('--lab')
const labIdArg = labIdx !== -1 ? args[labIdx + 1] : undefined

// ─── Tipi locali ────────────────────────────────────────────────────────────

type RigaLavorazione = { importo: number | null; deleted_at: string | null }

type LavoroRow = {
  id: string
  numero_lavoro: string | null
  prezzo_unitario: number | null
  laboratorio_id: string
  lavorazioni: RigaLavorazione[] | null
}

type Divergenza = {
  labId: string
  labNome: string
  lavoroId: string
  numeroLavoro: string | null
  prezzoUnitario: number | null
  totaleEffettivo: number
  deltaCents: number
}

// ─── Core ───────────────────────────────────────────────────────────────────

async function scanLab(labId: string, labNome: string) {
  // Sola lettura: SELECT su lavori + embed read-only di lavori_lavorazioni.
  // deleted_at delle righe non è filtrabile in modo affidabile via embed
  // PostgREST in questo schema (vedi altri consumer in src/lib/contabilita),
  // quindi lo richiediamo esplicitamente e filtriamo in codice.
  const { data, error } = await svc
    .from('lavori')
    .select(
      `id, numero_lavoro, prezzo_unitario, laboratorio_id,
       lavorazioni:lavori_lavorazioni(importo, deleted_at)`
    )
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)

  if (error) {
    console.error(`❌  Errore lettura lavori per lab ${labId}: ${error.message}`)
    return { totaleLavori: 0, lavoriConRighe: 0, divergenze: [] as Divergenza[] }
  }

  const lavori = (data ?? []) as unknown as LavoroRow[]
  let lavoriConRighe = 0
  const divergenze: Divergenza[] = []

  for (const l of lavori) {
    const righeAttive = (l.lavorazioni ?? []).filter((r) => r.deleted_at === null)
    if (righeAttive.length === 0) continue
    lavoriConRighe++

    // IMPORTANTE: stessi helper di produzione, nessuna reimplementazione della regola.
    const forHelper = { prezzo_unitario: l.prezzo_unitario, lavorazioni: righeAttive }
    const { divergente, deltaCents } = divergenzaPrezzo(forHelper)

    if (divergente) {
      divergenze.push({
        labId,
        labNome,
        lavoroId: l.id,
        numeroLavoro: l.numero_lavoro,
        prezzoUnitario: l.prezzo_unitario,
        totaleEffettivo: prezzoEffettivoLavoro(forHelper),
        deltaCents,
      })
    }
  }

  return { totaleLavori: lavori.length, lavoriConRighe, divergenze }
}

async function main() {
  console.log('🔎  N4 reconciliation — audit READ-ONLY prezzo effettivo lavoro\n')
  console.log(`    Env caricato: NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL ? 'OK' : 'MANCANTE'}, SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY ? 'OK' : 'MANCANTE'}\n`)

  let labs: Array<{ id: string; nome: string }>

  if (labIdArg) {
    const { data, error } = await svc
      .from('laboratori')
      .select('id, nome')
      .eq('id', labIdArg)
      .single()

    if (error || !data) {
      console.error(`❌  Laboratorio non trovato per id ${labIdArg}: ${error?.message ?? 'nessun risultato'}`)
      process.exit(1)
    }
    labs = [data]
  } else {
    const { data, error } = await svc.from('laboratori').select('id, nome').order('nome')
    if (error) {
      console.error(`❌  Errore lettura laboratori: ${error.message}`)
      process.exit(1)
    }
    labs = data ?? []
  }

  console.log(`📦  Laboratori da scansionare: ${labs.length}\n`)

  let totaleLavoriGlobale = 0
  let totaleConRigheGlobale = 0
  const tutteLeDivergenze: Divergenza[] = []

  for (const lab of labs) {
    const { totaleLavori, lavoriConRighe, divergenze } = await scanLab(lab.id, lab.nome ?? lab.id)
    totaleLavoriGlobale += totaleLavori
    totaleConRigheGlobale += lavoriConRighe
    tutteLeDivergenze.push(...divergenze)

    console.log(
      `  • ${lab.nome ?? lab.id} (${lab.id}) — lavori: ${totaleLavori}, con righe attive: ${lavoriConRighe}, divergenti: ${divergenze.length}`
    )
  }

  console.log('\n──────────────────────────────────────────────────────────')
  console.log(`Totale lavori scansionati (non soft-deleted): ${totaleLavoriGlobale}`)
  console.log(`Totale lavori CON righe attive:                ${totaleConRigheGlobale}`)
  console.log('──────────────────────────────────────────────────────────\n')

  if (tutteLeDivergenze.length > 0) {
    console.log('⚠️  Lavori con prezzo divergente (prezzo_unitario vs somma righe attive):\n')
    for (const d of tutteLeDivergenze) {
      console.log(
        `  - lab=${d.labNome} (${d.labId}) | lavoro_id=${d.lavoroId} | numero_lavoro=${d.numeroLavoro ?? 'N/D'} | ` +
          `prezzo_unitario=${d.prezzoUnitario ?? 'N/D'} | totale_effettivo=${d.totaleEffettivo.toFixed(2)} | deltaCents=${d.deltaCents}`
      )
    }
    console.log('')
  }

  const n = tutteLeDivergenze.length
  const m = totaleConRigheGlobale
  console.log(`${n} divergenti su ${m} lavori-con-righe`)

  if (n === 0) {
    console.log('✅  ~0 divergenti → rollout a freddo plausibile.')
  } else {
    console.log('⚠️  >0 divergenti → serve scrutinio su registra-pagamento prima del deploy.')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌  Errore inatteso durante la riconciliazione:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
