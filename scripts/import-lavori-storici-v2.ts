/**
 * Import DentalMaster → UÀ — Lavori Storici V2
 * Fonte: lavori_storici.json (277 record estratti dal PDF DentalMaster)
 *
 * Filtri applicati:
 * 1. note contiene "intestazione" o "totale parziale" → header/footer, skip
 * 2. tipo_dispositivo E descrizione_lavoro entrambi null/vuoti → skip
 * 3. cliente non presente in CLIENT_MAP → skip (log conteggio)
 * 4. paziente null o vuoto → skip (record non valido)
 * 5. numero_lavoro già presente nel DB per questo lab → skip (idempotenza)
 *
 * USO: npx tsx scripts/import-lavori-storici-v2.ts
 */

import { resolve } from 'path'
import { config } from 'dotenv'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const LAB_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
const JSON_PATH = resolve(__dirname, '../../ANALISI/DM_ODONTEC_CATALOG/extracted_data/lavori_storici.json')

// Mapping codice DM → UUID cliente nel DB (da import-lavori-storici.ts)
const CLIENT_MAP: Record<string, string> = {
  '1':   'f8d3a733-6263-412c-8a67-934611ae9f6f', // Esposito Massimo
  '7':   '22b67ee3-1453-4f3d-95b9-8af58b92bc0a', // C.O.M. s.r.l.
  '6':   'f6e8774d-2618-4d28-9759-b6853dd18c7f', // Barale S.A.S.
  '007': '8a67aec3-ce12-4a8d-b801-b47c06cbd589', // Studi Medici Di Santi Giuseppe
  '07':  '905cdd4f-1f38-4df4-8b68-0d893dcc4a59', // Di Santi Caterina
  'W7':  '76115a50-aed8-4d54-b8ff-1d52c211ae5b', // Dental Center
  '11':  'ee512650-aaf1-4d9f-a795-085cbc170f14', // Dott. Ettore Tufarelli
  '22':  '6b88ba54-b058-4c5d-aebd-fc7012c56ad8', // Maffia
  '16':  'a26ba6f3-ad86-4ac2-86aa-45fff02b6e94', // Leo Mariantonietta
  '30':  '62c7d8a4-f19f-4609-b85f-8faa3c2ad689', // Dottoressa Maione
  '008': '34524a11-c6a9-45f2-a9bd-57011be1366c', // Vuolo Gianfranco
  '09':  '8c1c2e21-7f95-4c76-89b5-4d6c90bbfb9d', // Studio Odontoiatrico Scienga
  '21':  'd7ef4ba2-16a8-419a-8657-3e502ff256a1', // Studio Odontoiatrico (Muro Lucano)
  '19':  '3b14a589-37c8-4cb2-a103-104bde089bf3', // Studio Odontoiatrico Piegari
  '8':   '75da591b-acc7-43f2-b854-fedf28969512', // GDA STP S.R.L.
  'RL':  '0b86ee01-9f5a-4d7b-997a-4f7d72b9467f', // Gianfranco Lanza
  '10':  '95309bd2-73ff-4657-ac6f-2b456e7d9dde', // Studio Odontoiatrico Sica
  '120': 'f8df10db-f2d1-4f95-9f42-39f922ccdbd3', // Dott. Mara Opromolla
}

interface LavoroStorico {
  id: number
  codice_paziente: string | null
  paziente: string | null
  cliente: string | null
  tipo_dispositivo: string | null
  descrizione_lavoro: string | null
  data_ingresso: string | null
  data_consegna: string | null
  stato: string | null
  importo: number | null
  note: string | null
}

// Mappa descrizioni DentalMaster → enum tipo_dispositivo UÀ
function mapTipoDispositivo(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('scheletrat') || d.includes('scheletro')) return 'scheletrato'
  if (d.includes('provvisori') || d.includes('provvisorio')) return 'provvisorio'
  if (d.includes('riparazi') || d.includes('ribasatura') || d.includes('rifacimento')) return 'riparazione'
  if (
    d.includes('implant') || d.includes('avvita') ||
    d.includes('fresatura') || d.includes('perno') ||
    d.includes('abutment') || d.includes('carico immediato')
  ) return 'implantologia'
  if (
    d.includes('mobile') || d.includes('totale') ||
    d.includes('parziale') || d.includes('denti') ||
    d.includes('protesi sup') || d.includes('protesi inf')
  ) return 'protesi_mobile'
  if (d.includes('ortodonz') || d.includes('apparecchio')) return 'ortodonzia'
  if (
    d.includes('zirconia') || d.includes('cad') ||
    d.includes('fresato') || d.includes('disilicato') ||
    d.includes('sinteriz') || d.includes(' zr') ||
    d.includes('ceramizzazione')
  ) return 'cad_cam'
  if (
    d.includes('articolatore') || d.includes('occlusione') ||
    d.includes('ceratura') || d.includes('fusione') ||
    d.includes('maryland') || d.includes('bite') ||
    d.includes('appoggi')
  ) return 'altro'
  // Default: protesi_fissa (corona, ponte, elemento ceramica, ecc.)
  return 'protesi_fissa'
}

/**
 * Parsa date nei formati DD/MM/YY, DD/MM/YYYY, o ISO.
 * Restituisce stringa YYYY-MM-DD, oppure null se non parsabile.
 */
function parseDMDate(raw: string | null): string | null {
  if (!raw) return null
  raw = raw.trim()
  if (!raw) return null

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.substring(0, 10)
  }

  // DD/MM/YY or DD/MM/YYYY
  const parts = raw.split('/')
  if (parts.length === 3) {
    const [dd, mm, yy] = parts
    let year: number
    if (yy.length === 4) {
      year = parseInt(yy)
    } else {
      year = parseInt(yy) >= 90 ? 1900 + parseInt(yy) : 2000 + parseInt(yy)
    }
    const month = mm.padStart(2, '0')
    const day = dd.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return null
}

/**
 * Estrae l'anno da una stringa data DM.
 * Fallback: 2020.
 */
function extractYear(raw: string | null): number {
  const parsed = parseDMDate(raw)
  if (!parsed) return 2020
  return parseInt(parsed.split('-')[0])
}

/**
 * Mappa lo stato DM → stato UÀ
 */
function mapStato(stato: string | null): string {
  if (!stato) return 'consegnato'
  switch (stato) {
    case 'Fatturato': return 'consegnato'
    case 'Attivo':    return 'in_lavorazione'
    case 'Eseguito':  return 'pronto'
    default:          return 'consegnato'
  }
}

async function main() {
  console.log('📋 Import Lavori Storici V2 — Lab Filippo')
  console.log(`   Lab ID: ${LAB_ID}`)
  console.log()

  // --- Leggi il JSON ---
  let rawData: LavoroStorico[]
  try {
    const content = readFileSync(JSON_PATH, 'utf-8')
    rawData = JSON.parse(content)
  } catch (e) {
    console.error(`❌ Errore lettura JSON: ${JSON_PATH}`)
    console.error(e)
    process.exit(1)
  }
  console.log(`   Letti: ${rawData.length} record`)

  // --- Connessione Supabase ---
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // --- Carica i numero_lavoro già presenti nel DB (idempotenza) ---
  // is_storico non esiste nel DB reale: usiamo like su note_interne per il conteggio finale
  const { data: existing, error: existingErr } = await svc
    .from('lavori')
    .select('numero_lavoro')
    .eq('laboratorio_id', LAB_ID)
    .is('deleted_at', null)

  if (existingErr) {
    console.error('❌ Errore query DB esistenti:', existingErr.message)
    process.exit(1)
  }
  const existingSet = new Set((existing ?? []).map((r: { numero_lavoro: string }) => r.numero_lavoro))
  console.log(`   Già presenti nel DB (tutti i lavori): ${existingSet.size}`)

  // --- Fase 1: Filtraggio ---
  let filteredHeader = 0
  let filteredNoTipo = 0
  let filteredNoCliente = 0
  let filteredNoPaziente = 0

  const toProcess: LavoroStorico[] = []

  for (const r of rawData) {
    // Regola 1: note intestazione/totale parziale
    const note = (r.note ?? '').toLowerCase()
    if (note.includes('intestazione') || note.includes('totale parziale')) {
      filteredHeader++
      continue
    }

    // Regola 2: tipo_dispositivo E descrizione_lavoro entrambi null/vuoti
    const hasTipo = Boolean(r.tipo_dispositivo && r.tipo_dispositivo.trim())
    const hasDesc = Boolean(r.descrizione_lavoro && r.descrizione_lavoro.trim())
    if (!hasTipo && !hasDesc) {
      filteredNoTipo++
      continue
    }

    // Regola 3: cliente non nel CLIENT_MAP
    const cl = r.cliente ?? null
    if (!cl || !(cl in CLIENT_MAP)) {
      filteredNoCliente++
      continue
    }

    // Regola 4: paziente null o vuoto
    if (!r.paziente || !r.paziente.trim()) {
      filteredNoPaziente++
      continue
    }

    toProcess.push(r)
  }

  console.log()
  console.log('   --- Filtri applicati ---')
  console.log(`   Filtrati (header/footer): ${filteredHeader}`)
  console.log(`   Filtrati (no tipo+desc): ${filteredNoTipo}`)
  console.log(`   Filtrati (cliente non mappato): ${filteredNoCliente}`)
  console.log(`   Filtrati (no paziente): ${filteredNoPaziente}`)
  console.log(`   Da elaborare dopo filtri: ${toProcess.length}`)

  // --- Fase 2: Generazione numero_lavoro e verifica duplicati ---
  // Progressivo per anno, separato per anno
  const counterByYear: Record<number, number> = {}
  // Pre-calcola i numeri per vedere quanti saltare
  interface WorkItem {
    record: LavoroStorico
    numero_lavoro: string
    anno: number
    clienteId: string
    statoUa: string
    tipoDispositivo: string
    dataIngresso: string | null
    dataConsegna: string | null
    incluso_in_fattura: boolean
  }

  const workItems: WorkItem[] = []
  let skippedDuplicate = 0

  for (const r of toProcess) {
    const anno = extractYear(r.data_ingresso) || extractYear(r.data_consegna) || 2020
    if (!counterByYear[anno]) counterByYear[anno] = 1
    const nnn = String(counterByYear[anno]++).padStart(3, '0')
    const numero_lavoro = `STOR/${anno}/${nnn}`

    // Verifica duplicato
    if (existingSet.has(numero_lavoro)) {
      skippedDuplicate++
      continue
    }

    const cl = r.cliente!
    const clienteId = CLIENT_MAP[cl]
    const statoUa = mapStato(r.stato)
    const tipoRaw = (r.tipo_dispositivo || r.descrizione_lavoro || '').trim()
    const tipoDispositivo = mapTipoDispositivo(tipoRaw)
    const dataIngresso = parseDMDate(r.data_ingresso)
    const dataConsegna = parseDMDate(r.data_consegna)
    const incluso_in_fattura = r.stato === 'Fatturato'

    workItems.push({
      record: r,
      numero_lavoro,
      anno,
      clienteId,
      statoUa,
      tipoDispositivo,
      dataIngresso,
      dataConsegna,
      incluso_in_fattura,
    })
  }

  console.log(`   Già presenti nel DB (STOR/*): ${skippedDuplicate}`)
  console.log(`   Da importare: ${workItems.length}`)
  console.log()

  if (workItems.length === 0) {
    console.log('✅ Nessun nuovo lavoro da importare (tutti già presenti).')
  } else {
    // --- Fase 3: Import bulk ---
    let inserted = 0
    let errors = 0

    for (const item of workItems) {
      const r = item.record
      const tipoRaw = (r.tipo_dispositivo || r.descrizione_lavoro || '').trim()
      const descrizione = r.paziente
        ? `${tipoRaw} — Paz: ${r.paziente.trim()}${r.codice_paziente ? ` (${r.codice_paziente})` : ''}`
        : tipoRaw

      const { error } = await svc.from('lavori').insert({
        laboratorio_id: LAB_ID,
        numero_lavoro: item.numero_lavoro,
        anno_lavoro: item.anno,
        cliente_id: item.clienteId,
        tipo_dispositivo: item.tipoDispositivo,
        descrizione,
        stato: item.statoUa,
        priorita: 'normale',
        data_ingresso: item.dataIngresso ?? `${item.anno}-01-01`,
        data_consegna_prevista: item.dataConsegna ?? item.dataIngresso ?? `${item.anno}-01-01`,
        data_consegna_effettiva:
          item.statoUa === 'consegnato'
            ? (item.dataConsegna ?? item.dataIngresso ?? `${item.anno}-01-01`)
            : undefined,
        classe_rischio: 'classe_iia',
        da_conformare: false,
        conformato: true,
        incluso_in_fattura: item.incluso_in_fattura,
        codice_iva: 'N4',
        natura_iva: 'N4',
        prezzo_unitario: r.importo ?? undefined,
        note_interne: `IMPORT DentalMaster | Status DM: ${r.stato ?? 'null'} | JSON id: ${r.id}`,
      })

      if (error) {
        console.error(`   ❌ ${item.numero_lavoro} — ${tipoRaw.substring(0, 40)}: ${error.message}`)
        errors++
      } else {
        console.log(`   ✅ ${item.numero_lavoro} | cl=${r.cliente} | ${item.statoUa} | ${tipoRaw.substring(0, 35)}`)
        inserted++
      }
    }

    console.log()
    console.log(`   ✅ Inseriti: ${inserted} | ❌ Errori: ${errors}`)
  }

  // --- Verifica finale dal DB ---
  // Identifichiamo i lavori storici tramite note_interne (is_storico non esiste nel DB reale)
  console.log()
  const { count, error: countErr } = await svc
    .from('lavori')
    .select('*', { count: 'exact', head: true })
    .eq('laboratorio_id', LAB_ID)
    .ilike('note_interne', '%IMPORT DentalMaster%')
    .is('deleted_at', null)

  if (countErr) {
    console.error('❌ Errore verifica finale:', countErr.message)
  } else {
    console.log(`📊 COUNT finale lavori storici nel DB (note_interne LIKE IMPORT DentalMaster): ${count}`)
  }

  // Count totale lavori per lab
  const { count: countAll, error: countAllErr } = await svc
    .from('lavori')
    .select('*', { count: 'exact', head: true })
    .eq('laboratorio_id', LAB_ID)
    .is('deleted_at', null)

  if (!countAllErr) {
    console.log(`📊 COUNT totale lavori lab Filippo: ${countAll}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
