/**
 * Seed globale per la tabella lookup_valori.
 *
 * Uso: npx tsx scripts/seed-lookup-globali.ts
 *
 * Cosa fa:
 * - Inserisce campionari colore (VITA Classic, VITA 3D-Master, IVOCLAR IPS Chromascop)
 * - Inserisce tipi lega, tipi pagamento, tipi impronte
 * - Inserisce categorie magazzino e rischi MDR non eliminabili
 *
 * Idempotente: usa upsert con onConflict 'tipo,codice' + ignoreDuplicates.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Carica .env.local esplicitamente (non .env)
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nel .env.local')
  process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─────────────────────────────────────────────────────────────
// DEFINIZIONE DATI
// ─────────────────────────────────────────────────────────────

interface LookupRecord {
  tipo: string
  codice: string
  valore_it: string
  ordine: number
  note?: string
}

// ── CAMPIONARIO COLORE ────────────────────────────────────────

const VITA_CLASSIC_CODICI = [
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
]

const VITA_3D_MASTER_CODICI = [
  '0M1', '0M2', '0M3',
  '1M1', '1M2',
  '2L1.5', '2L2.5', '2M1', '2M2', '2M3', '2R1.5', '2R2.5',
  '3L1.5', '3L2.5', '3M1', '3M2', '3M3', '3R1.5', '3R2.5',
  '4L1.5', '4L2.5', '4M1', '4M2', '4M3', '4R1.5', '4R2.5',
  '5M1', '5M2', '5M3',
]

const IVOCLAR_CHROMASCOP_CODICI = [
  '110', '120', '130', '140',
  '210', '220', '230', '240',
  '310', '320', '330', '340',
  '410', '420', '430',
  '510', '520', '530', '540',
]

const campionariColore: LookupRecord[] = [
  // VITA Classic
  ...VITA_CLASSIC_CODICI.map((codice, i) => ({
    tipo: 'campionario_colore',
    codice: `VITA_CLASSIC_${codice.replace('.', '_')}`,
    valore_it: `VITA Classic ${codice}`,
    ordine: i + 1,
    note: 'VITA Classic',
  })),
  // VITA 3D-Master
  ...VITA_3D_MASTER_CODICI.map((codice, i) => ({
    tipo: 'campionario_colore',
    codice: `VITA_3D_${codice.replace('.', '_')}`,
    valore_it: `VITA 3D-Master ${codice}`,
    ordine: 100 + i + 1,
    note: 'VITA 3D-Master',
  })),
  // IVOCLAR IPS Chromascop
  ...IVOCLAR_CHROMASCOP_CODICI.map((codice, i) => ({
    tipo: 'campionario_colore',
    codice: `IVOCLAR_CHROMASCOP_${codice}`,
    valore_it: `IVOCLAR IPS Chromascop ${codice}`,
    ordine: 200 + i + 1,
    note: 'IVOCLAR IPS Chromascop',
  })),
]

// ── TIPO LEGA ─────────────────────────────────────────────────

const tipiLega: LookupRecord[] = [
  { tipo: 'tipo_lega', codice: 'ORO_GIALLA',      valore_it: 'Lega oro gialla',           ordine: 1 },
  { tipo: 'tipo_lega', codice: 'ORO_BIANCA',       valore_it: 'Lega oro bianca',            ordine: 2 },
  { tipo: 'tipo_lega', codice: 'PALLADIATA',        valore_it: 'Lega palladiata',            ordine: 3 },
  { tipo: 'tipo_lega', codice: 'NON_PREZIOSA',      valore_it: 'Lega non preziosa',          ordine: 4 },
  { tipo: 'tipo_lega', codice: 'OSSIDO_ZIRCONIO',   valore_it: 'Ossido di zirconio',         ordine: 5 },
  { tipo: 'tipo_lega', codice: 'AGC',               valore_it: 'AGC (Argento-Palladio)',     ordine: 6 },
  { tipo: 'tipo_lega', codice: 'TITANIO',           valore_it: 'Titanio',                    ordine: 7 },
  { tipo: 'tipo_lega', codice: 'ALTRO',             valore_it: 'Altro',                      ordine: 8 },
]

// ── TIPO PAGAMENTO ────────────────────────────────────────────

const tipiPagamento: LookupRecord[] = [
  { tipo: 'tipo_pagamento', codice: 'RIBA',            valore_it: 'Ricevuta Bancaria (Ri.Ba.)', ordine: 1 },
  { tipo: 'tipo_pagamento', codice: 'TRATTA',          valore_it: 'Tratta',                     ordine: 2 },
  { tipo: 'tipo_pagamento', codice: 'PAGHERO',         valore_it: 'Pagherò',                    ordine: 3 },
  { tipo: 'tipo_pagamento', codice: 'BONIFICO',        valore_it: 'Bonifico bancario',          ordine: 4 },
  { tipo: 'tipo_pagamento', codice: 'CONTRASSEGNO',    valore_it: 'Contrassegno',               ordine: 5 },
  { tipo: 'tipo_pagamento', codice: 'RIMESSA_DIRETTA', valore_it: 'Rimessa diretta',            ordine: 6 },
  { tipo: 'tipo_pagamento', codice: 'EFFETTUATO',      valore_it: 'Pagamento effettuato',       ordine: 7 },
]

// ── TIPO IMPRONTE ─────────────────────────────────────────────

const tipiImpronte: LookupRecord[] = [
  { tipo: 'tipo_impronte', codice: 'ALGINATO',               valore_it: 'Alginato',                        ordine: 1 },
  { tipo: 'tipo_impronte', codice: 'SILICONE_ADDIZIONE',     valore_it: 'Silicone per addizione',          ordine: 2 },
  { tipo: 'tipo_impronte', codice: 'SILICONE_CONDENSAZIONE', valore_it: 'Silicone per condensazione',      ordine: 3 },
  { tipo: 'tipo_impronte', codice: 'PVS',                    valore_it: 'PVS (Polivinilsilossano)',         ordine: 4 },
  { tipo: 'tipo_impronte', codice: 'GESSO',                  valore_it: 'Gesso',                           ordine: 5 },
  { tipo: 'tipo_impronte', codice: 'POLISULFURO',            valore_it: 'Polisulfuro',                     ordine: 6 },
]

// ── CATEGORIA MAGAZZINO ───────────────────────────────────────

const categorieMagazzino: LookupRecord[] = [
  { tipo: 'categoria_magazzino', codice: '1',  valore_it: 'Gessi',                ordine: 1 },
  { tipo: 'categoria_magazzino', codice: '2',  valore_it: 'Ceramiche',             ordine: 2 },
  { tipo: 'categoria_magazzino', codice: '3',  valore_it: 'Leghe preziose',        ordine: 3 },
  { tipo: 'categoria_magazzino', codice: '4',  valore_it: 'Leghe non preziose',    ordine: 4 },
  { tipo: 'categoria_magazzino', codice: '5',  valore_it: 'Resine',                ordine: 5 },
  { tipo: 'categoria_magazzino', codice: '6',  valore_it: 'Zirconia',              ordine: 6 },
  { tipo: 'categoria_magazzino', codice: '7',  valore_it: 'Compositi',             ordine: 7 },
  { tipo: 'categoria_magazzino', codice: '8',  valore_it: 'Rivestimenti',          ordine: 8 },
  { tipo: 'categoria_magazzino', codice: '9',  valore_it: 'Componentistica',       ordine: 9 },
  { tipo: 'categoria_magazzino', codice: '10', valore_it: 'Consumabili',           ordine: 10 },
  { tipo: 'categoria_magazzino', codice: '11', valore_it: 'Disinfettanti',         ordine: 11 },
  { tipo: 'categoria_magazzino', codice: '12', valore_it: 'Attrezzature',          ordine: 12 },
  { tipo: 'categoria_magazzino', codice: '13', valore_it: 'Altro',                 ordine: 13 },
]

// ── RISCHIO MDR ───────────────────────────────────────────────

const rischiMdr: LookupRecord[] = [
  {
    tipo: 'rischio_mdr',
    codice: 'ROTTURA_MECCANICA',
    valore_it: 'Possibile rottura meccanica per stress occlusale elevato',
    ordine: 1,
    note: 'Rischio residuo non eliminabile — MDR 2017/745 Allegato XIII',
  },
  {
    tipo: 'rischio_mdr',
    codice: 'REAZIONE_ALLERGICA',
    valore_it: 'Possibile reazione allergica individuale ai materiali',
    ordine: 2,
    note: 'Rischio residuo non eliminabile — MDR 2017/745 Allegato XIII',
  },
  {
    tipo: 'rischio_mdr',
    codice: 'USURA_FISIOLOGICA',
    valore_it: 'Usura fisiologica del dispositivo nel tempo',
    ordine: 3,
    note: 'Rischio residuo non eliminabile — MDR 2017/745 Allegato XIII',
  },
  {
    tipo: 'rischio_mdr',
    codice: 'VARIAZIONE_MORFOLOGICA',
    valore_it: 'Variazione morfologica per riassorbimento osseo',
    ordine: 4,
    note: 'Rischio residuo non eliminabile — MDR 2017/745 Allegato XIII',
  },
]

// ─────────────────────────────────────────────────────────────
// ESECUZIONE SEED
// ─────────────────────────────────────────────────────────────

const TUTTI_I_VALORI: LookupRecord[] = [
  ...campionariColore,
  ...tipiLega,
  ...tipiPagamento,
  ...tipiImpronte,
  ...categorieMagazzino,
  ...rischiMdr,
]

async function seed() {
  console.log('🌱  Seeding lookup_valori...\n')

  // Upsert in batch da 100 per sicurezza
  const BATCH_SIZE = 100
  let totalInserted = 0
  let totalSkipped = 0

  for (let i = 0; i < TUTTI_I_VALORI.length; i += BATCH_SIZE) {
    const batch = TUTTI_I_VALORI.slice(i, i + BATCH_SIZE)
    const { error, count } = await svc
      .from('lookup_valori')
      .upsert(batch, {
        onConflict: 'tipo,codice',
        ignoreDuplicates: true,
        count: 'exact',
      })

    if (error) {
      console.error(`❌  Errore batch ${i / BATCH_SIZE + 1}:`, error.message)
      process.exit(1)
    }

    totalInserted += count ?? 0
    totalSkipped += batch.length - (count ?? 0)
    console.log(`   Batch ${i / BATCH_SIZE + 1}: ${count ?? 0} inseriti, ${batch.length - (count ?? 0)} già presenti`)
  }

  // Conteggio finale per tipo
  console.log('\n📊  Riepilogo per tipo:')
  const tipi = [...new Set(TUTTI_I_VALORI.map(v => v.tipo))]
  for (const tipo of tipi) {
    const { count } = await svc
      .from('lookup_valori')
      .select('*', { count: 'exact', head: true })
      .eq('tipo', tipo)
    console.log(`   ${tipo.padEnd(25)} → ${count} valori`)
  }

  // COUNT totale
  const { count: totale } = await svc
    .from('lookup_valori')
    .select('*', { count: 'exact', head: true })

  console.log(`\n✅  Seed completato. Totale righe in lookup_valori: ${totale}`)

  if ((totale ?? 0) < 50) {
    console.warn('⚠️  ATTENZIONE: meno di 50 valori nella tabella — verifica manualmente.')
  }
}

seed().catch(err => {
  console.error('❌  Errore inatteso:', err)
  process.exit(1)
})
