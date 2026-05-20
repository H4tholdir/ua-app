import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const LAB_FILIPPO_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
const JSON_PATH = resolve(__dirname, '../../ANALISI/DM_ODONTEC_CATALOG/extracted_data/magazzino_materiali.json')

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

interface MagazzinoItem {
  codice_articolo: string
  descrizione: string
  nome_breve: string | null
  categoria: string | null
  fornitore: string | null
  produttore: string | null
  unita_misura_acquisto: string | null
  unita_misura_scarico: string | null
  quantita_per_confezione: number | null
  costo_confezione: number | null
  costo_unitario: number | null
  prezzo_unitario_vendita: number | null
  scorta_minima: number | null
  dispositivo_medico: string | null
  giacenza_attuale: number | null
}

async function main() {
  let raw: MagazzinoItem[]
  try {
    const content = readFileSync(JSON_PATH, 'utf-8')
    raw = JSON.parse(content) as MagazzinoItem[]
  } catch (e) {
    console.error('Errore lettura JSON:', e)
    process.exit(1)
  }

  console.log(`Import magazzino DentalMaster → UÀ`)
  console.log(`Lab: ${LAB_FILIPPO_ID}`)
  console.log(`Articoli da importare: ${raw.length}\n`)

  const rows = raw
    .filter((item) => item.descrizione || item.nome_breve)
    .map((item) => ({
    laboratorio_id: LAB_FILIPPO_ID,
    codice_articolo: item.codice_articolo,
    nome: item.descrizione ?? item.nome_breve!,
    produttore: item.produttore ?? null,
    categoria: item.categoria ?? null,
    sotto_categoria: item.nome_breve ?? null,
    um_acquisto: item.unita_misura_acquisto ?? 'pz',
    um_scarico: item.unita_misura_scarico ?? 'g',
    quantita_per_confezione: item.quantita_per_confezione ?? 1,
    costo_confezione: item.costo_confezione ?? null,
    costo_unitario: item.costo_unitario ?? null,
    prezzo_unitario: item.prezzo_unitario_vendita ?? null,
    scorta_attuale: item.giacenza_attuale ?? 0,
    scorta_minima: item.scorta_minima ?? 0,
    dispositivo_medico: item.dispositivo_medico === 'si',
    attivo: true,
  }))

  const BATCH = 50
  let inserted = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error, data } = await svc
      .from('magazzino')
      .upsert(batch, { onConflict: 'laboratorio_id,codice_articolo', ignoreDuplicates: true })
      .select('id')

    if (error) {
      console.error(`Errore batch ${i}–${i + batch.length}: ${error.message}`)
      errors += batch.length
    } else {
      const count = data?.length ?? 0
      inserted += count
      skipped += batch.length - count
    }
  }

  console.log(`Inseriti: ${inserted} | Già presenti (skip): ${skipped} | Errori: ${errors}`)

  // FIX ANOMALIA: codice 243 — High-SpanII — giacenza 3620 è errore data entry
  console.log('\nFix anomalia codice 243 (High-SpanII): scorta_attuale → 0')
  const { error: fixErr, data: fixData } = await svc
    .from('magazzino')
    .update({ scorta_attuale: 0 })
    .eq('laboratorio_id', LAB_FILIPPO_ID)
    .eq('codice_articolo', '243')
    .select('id, nome, scorta_attuale')

  if (fixErr) {
    console.error(`Errore fix anomalia: ${fixErr.message}`)
  } else if (!fixData || fixData.length === 0) {
    console.log('Attenzione: articolo 243 non trovato nel DB (potrebbe essere già corretto o non importato)')
  } else {
    console.log(`Fix confermato: "${fixData[0].nome}" → scorta_attuale = ${fixData[0].scorta_attuale}`)
  }

  // Conteggio finale
  const { count } = await svc
    .from('magazzino')
    .select('*', { count: 'exact', head: true })
    .eq('laboratorio_id', LAB_FILIPPO_ID)

  console.log(`\nTotale articoli magazzino lab Filippo: ${count}`)
  if ((count ?? 0) < 187) {
    console.log('ATTENZIONE: conteggio inferiore a 187 — verificare errori sopra')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
