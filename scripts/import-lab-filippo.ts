/**
 * Script idempotente per importare i dati reali del laboratorio di Filippo.
 *
 * USO: npx tsx scripts/import-lab-filippo.ts
 *
 * Prerequisiti:
 *   NEXT_PUBLIC_SUPABASE_URL   — nel .env.local
 *   SUPABASE_SERVICE_ROLE_KEY  — nel .env.local
 *   LAB_FILIPPO_ID             — UUID della riga laboratori di Filippo (da Supabase dashboard)
 *
 * Idempotente: usa upsert con onConflict. Rieseguire non crea duplicati.
 *
 * Dati reali Lab Opromolla:
 *   Titolare : Filippo Opromolla
 *   P.IVA    : 03508740655
 *   ITCA     : ITCA01051686
 *   Indirizzo: Via Roma 12, 84028 Serre (SA)
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Errore: Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nel .env.local')
  process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const LAB_FILIPPO_ID = process.env.LAB_FILIPPO_ID

async function importLab() {
  if (!LAB_FILIPPO_ID) {
    console.error('Errore: Imposta LAB_FILIPPO_ID nel .env.local (UUID del laboratorio Filippo)')
    console.error('   Puoi trovarlo nella tabella laboratori del tuo progetto Supabase.')
    process.exit(1)
  }

  console.log('Aggiornando dati laboratorio Filippo Opromolla...')

  const { error: labErr } = await svc
    .from('laboratori')
    .update({
      nome: 'Laboratorio Opromolla',
      ragione_sociale: 'Laboratorio Odontotecnico Opromolla',
      partita_iva: '03508740655',
      codice_itca: 'ITCA01051686',
      indirizzo: 'Via Roma 12',
      cap: '84028',
      citta: 'Serre',
      provincia: 'SA',
      paese: 'IT',
      // PRRC — Filippo e sia titolare che PRRC
      prrc_nome: 'Filippo Opromolla',
      prrc_qualifica: 'Odontotecnico abilitato - Direttore Tecnico',
      // Regime fiscale
      regime_fiscale: 'RF01',
      codice_iva_default: 'N4',
    })
    .eq('id', LAB_FILIPPO_ID)

  if (labErr) {
    console.error('Errore aggiornamento laboratorio:', labErr.message)
    process.exit(1)
  }
  console.log(`Laboratorio aggiornato -> ${LAB_FILIPPO_ID}`)

  // ─── Listino base — 10 lavorazioni piu comuni ─────────────────────────────
  // Il listino completo (72 lavorazioni) va importato manualmente da DentalMaster.
  // Questo seed crea le 10 piu comuni come punto di partenza.

  console.log('\nImportando listino base (10 lavorazioni comuni)...')

  const lavorazioniBase = [
    { codice: 'CF-001', nome: 'Corona in metallo-ceramica', categoria: 'protesi_fissa', prezzo_1: 120.00 },
    { codice: 'CF-002', nome: 'Corona in zirconia', categoria: 'protesi_fissa', prezzo_1: 180.00 },
    { codice: 'CF-003', nome: 'Corona provvisoria', categoria: 'protesi_fissa', prezzo_1: 45.00 },
    { codice: 'CF-004', nome: 'Impianto su moncone', categoria: 'protesi_fissa', prezzo_1: 220.00 },
    { codice: 'CF-005', nome: 'Ponte (per elemento)', categoria: 'protesi_fissa', prezzo_1: 110.00 },
    { codice: 'PM-001', nome: 'Protesi totale (per arcata)', categoria: 'protesi_mobile', prezzo_1: 350.00 },
    { codice: 'PM-002', nome: 'Protesi parziale scheletrata', categoria: 'protesi_mobile', prezzo_1: 280.00 },
    { codice: 'PM-003', nome: 'Riparazione protesi', categoria: 'protesi_mobile', prezzo_1: 60.00 },
    { codice: 'OR-001', nome: 'Apparecchio ortodontico rimovibile', categoria: 'ortodonzia', prezzo_1: 220.00 },
    { codice: 'AL-001', nome: 'Allineatore trasparente (per set)', categoria: 'ortodonzia', prezzo_1: 180.00 },
  ]

  for (const lav of lavorazioniBase) {
    const { error } = await svc
      .from('listino')
      .upsert(
        {
          laboratorio_id: LAB_FILIPPO_ID,
          codice: lav.codice,
          nome: lav.nome,
          descrizione: lav.nome,
          categoria: lav.categoria,
          prezzo_1: lav.prezzo_1,
          attivo: true,
        },
        { onConflict: 'laboratorio_id,codice' }
      )

    if (error) {
      console.error(`  Attenzione lavorazione ${lav.codice}: ${error.message}`)
    } else {
      console.log(`  ${lav.codice} — ${lav.nome}`)
    }
  }

  console.log('\nImport completato.')
  console.log('\nProssimi passi:')
  console.log('   1. Importa il listino completo (72 lavorazioni) da DentalMaster')
  console.log('   2. Aggiungi i clienti dentisti di Filippo (almeno 5 per il go-live)')
  console.log('   3. Configura PEC SMTP nelle impostazioni laboratorio')
  console.log('   4. Esegui una consegna di test con lavoro reale')
  console.log('\n   Script: npx tsx scripts/import-clienti-filippo.ts (da creare con i dati reali)')
}

importLab().catch(err => {
  console.error('Errore inatteso:', err)
  process.exit(1)
})
