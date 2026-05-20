// Import fasi di produzione da DentalMaster → UÀ (ciclo LIBRERIA_OL)
// Fonte: ANALISI/DM_ODONTEC_CATALOG/extracted_data/fasi_produzione.json
// USO: npx tsx scripts/import-fasi-produzione.ts
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const LAB_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
const CICLO_CODICE = 'LIBRERIA_OL'
const CICLO_NOME = 'Libreria Fasi OL'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface FaseSource {
  codice: string
  descrizione: string
}

async function main() {
  // 1. Trova o crea il ciclo LIBRERIA_OL
  let { data: ciclo, error: cicloError } = await svc
    .from('cicli_produzione')
    .select('id')
    .eq('laboratorio_id', LAB_ID)
    .eq('codice', CICLO_CODICE)
    .is('deleted_at', null)
    .maybeSingle()

  if (cicloError) {
    console.error('Errore fetch ciclo:', cicloError.message)
    process.exit(1)
  }

  if (!ciclo) {
    const { data: newCiclo, error: insertCicloError } = await svc
      .from('cicli_produzione')
      .insert({
        laboratorio_id: LAB_ID,
        codice: CICLO_CODICE,
        nome: CICLO_NOME,
        tipo_dispositivo: 'Libreria',
        attivo: true,
      })
      .select('id')
      .single()

    if (insertCicloError) {
      console.error('Errore creazione ciclo LIBRERIA_OL:', insertCicloError.message)
      process.exit(1)
    }
    ciclo = newCiclo
    console.log(`Ciclo ${CICLO_CODICE} creato con id ${ciclo!.id}`)
  }

  const cicloId = ciclo!.id

  // 2. Leggi fasi dal JSON
  const filePath = resolve(__dirname, '../../ANALISI/DM_ODONTEC_CATALOG/extracted_data/fasi_produzione.json')
  let fasiSource: FaseSource[]
  try {
    fasiSource = JSON.parse(readFileSync(filePath, 'utf-8'))
  } catch (e) {
    console.error('Errore lettura JSON sorgente:', (e as Error).message)
    process.exit(1)
  }

  // 3. Carica fasi già presenti per questo ciclo
  const { data: existing, error: fetchError } = await svc
    .from('fasi_produzione')
    .select('codice_fase, ordine')
    .eq('ciclo_id', cicloId)
    .is('deleted_at', null)

  if (fetchError) {
    console.error('Errore fetch fasi esistenti:', fetchError.message)
    process.exit(1)
  }

  const existingCodes = new Set((existing ?? []).map((r: { codice_fase: string }) => r.codice_fase))
  const maxOrdine = (existing ?? []).reduce(
    (max: number, r: { ordine: number }) => Math.max(max, r.ordine ?? 0),
    0
  )

  // 4. Filtra fasi mancanti
  const fasiDaInserire = fasiSource.filter(f => !existingCodes.has(f.codice))
  const alreadyPresent = fasiSource.length - fasiDaInserire.length

  if (fasiDaInserire.length === 0) {
    console.log(`✅ 0 fasi inserite | ${alreadyPresent} già presenti | 0 errori`)
    return
  }

  // 5. Inserisci con ordine incrementale partendo da maxOrdine + 1
  const toInsert = fasiDaInserire.map((f, i) => ({
    laboratorio_id: LAB_ID,
    ciclo_id: cicloId,
    codice_fase: f.codice,
    descrizione: f.descrizione,
    ordine: maxOrdine + i + 1,
    obbligatoria: true,
  }))

  let errori = 0

  // Batch in chunk da 50 per evitare timeout
  const CHUNK = 50
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    const { error: insertError } = await svc
      .from('fasi_produzione')
      .insert(chunk)

    if (insertError) {
      console.error(`Errore inserimento chunk ${i}-${i + chunk.length}:`, insertError.message)
      errori += chunk.length
    }
  }

  const inserite = toInsert.length - errori
  console.log(`✅ ${inserite} fasi inserite | ${alreadyPresent} già presenti | ${errori} errori`)
}

main()
