// Import cicli di produzione da DentalMaster → UÀ
// Fonte: ANALISI/DM_ODONTEC_CATALOG/extracted_data/cicli_produzione.json
// USO: npx tsx scripts/import-cicli-mancanti.ts
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const LAB_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface CicloSource {
  codice: string
  descrizione: string
  tipo_dispositivo: string
  data_revisione?: string
}

async function main() {
  const filePath = resolve(__dirname, '../../ANALISI/DM_ODONTEC_CATALOG/extracted_data/cicli_produzione.json')
  let cicliSource: CicloSource[]
  try {
    cicliSource = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (e) {
    console.error('Errore lettura JSON sorgente:', (e as Error).message)
    process.exit(1)
  }

  // Carica cicli già presenti per questo lab
  const { data: existing, error: fetchError } = await svc
    .from('cicli_produzione')
    .select('codice')
    .eq('laboratorio_id', LAB_ID)
    .is('deleted_at', null)

  if (fetchError) {
    console.error('Errore fetch cicli esistenti:', fetchError.message)
    process.exit(1)
  }

  const existingCodes = new Set((existing ?? []).map((r: { codice: string }) => r.codice))

  const toInsert = cicliSource
    .filter(c => !existingCodes.has(c.codice))
    .map(c => ({
      laboratorio_id: LAB_ID,
      codice: c.codice,
      nome: c.descrizione,
      tipo_dispositivo: c.tipo_dispositivo,
      attivo: true,
    }))

  const alreadyPresent = cicliSource.length - toInsert.length

  if (toInsert.length === 0) {
    console.log(`✅ 0 cicli inseriti | ${alreadyPresent} già presenti`)
    return
  }

  // Upsert con onConflict su (laboratorio_id, codice) — idempotente
  const { error: upsertError } = await svc
    .from('cicli_produzione')
    .upsert(toInsert, { onConflict: 'laboratorio_id,codice', ignoreDuplicates: true })

  if (upsertError) {
    console.error('Errore upsert cicli:', upsertError.message)
    process.exit(1)
  }

  console.log(`✅ ${toInsert.length} cicli inseriti | ${alreadyPresent} già presenti`)
}

main()
