#!/usr/bin/env npx tsx
/**
 * scripts/import-dentalmaster.ts
 *
 * Importa dati da CSV esportati da DentalMaster Advanced in UÀ.
 *
 * PRIMA DI USARE:
 * 1. Apri DentalMaster Advanced
 * 2. File → Esporta Record (per ogni modulo):
 *    - Clienti/Dentisti → clienti.csv
 *    - Pazienti         → pazienti.csv
 *    - Listino          → listino.csv
 *    - Lavori           → lavori.csv (opzionale — storico)
 * 3. Salva i CSV nella directory passata con --dir
 *
 * USO:
 *   npx tsx scripts/import-dentalmaster.ts --dir /path/to/exports --lab-id <uuid>
 *
 * FLAGS OPZIONALI:
 *   --dry-run   → Mostra cosa verrebbe importato senza scrivere nulla
 *
 * PREREQUISITI in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * IDEMPOTENZA:
 *   - Clienti: dedup per (laboratorio_id, partita_iva) se presente, altrimenti
 *     per (laboratorio_id, studio_nome normalizzato). Rieseguire lo script non
 *     crea duplicati per i clienti già importati con lo stesso identificativo.
 *   - Pazienti: dedup per (laboratorio_id, cliente_id, codice_paziente) se
 *     codice_paziente è presente nel CSV. Righe senza codice vengono sempre
 *     inserite (DentalMaster non espone sempre un ID stabile).
 *   - Listino: upsert su UNIQUE(laboratorio_id, codice). Sempre idempotente.
 */
import 'dotenv/config'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const dirIdx    = args.indexOf('--dir')
const labIdx    = args.indexOf('--lab-id')
const dryRunIdx = args.indexOf('--dry-run')

const exportDir = dirIdx  !== -1 ? args[dirIdx + 1]  : null
const labId     = labIdx  !== -1 ? args[labIdx + 1]  : process.env.LAB_FILIPPO_ID ?? null
const dryRun    = dryRunIdx !== -1

if (!exportDir) {
  console.error('Errore: specifica la directory con: --dir /percorso/exports')
  console.error('Esempio: npx tsx scripts/import-dentalmaster.ts --dir ~/Desktop/dm-exports --lab-id <uuid>')
  process.exit(1)
}
if (!labId) {
  console.error('Errore: specifica il lab ID con: --lab-id <uuid>  oppure imposta LAB_FILIPPO_ID nel .env.local')
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Errore: imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nel .env.local')
  process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── Contatori globali ───────────────────────────────────────────────────────
const stats = { imported: 0, skipped: 0, errors: 0 }

// ─── CSV Parser (nessuna dipendenza esterna) ─────────────────────────────────
/**
 * Gestisce i casi più comuni di CSV esportati da FileMaker:
 * - Separatori: tab, punto e virgola, virgola (rilevati automaticamente)
 * - Valori quotati con virgolette doppie (incluse virgolette escaped "")
 * - BOM UTF-8 all'inizio del file
 * - Newline CR+LF o LF
 */
function parseCSV(content: string): Record<string, string>[] {
  // Rimuove BOM UTF-8 se presente
  const cleaned = content.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const lines = cleaned.trim().split('\n')
  if (lines.length < 2) return []

  // Rileva separatore dalla prima riga: tab prima, poi punto e virgola, poi virgola
  const firstLine = lines[0]
  const sep = firstLine.includes('\t') ? '\t'
    : firstLine.includes(';')          ? ';'
    : ','

  /**
   * Parsing rispettoso dei quote CSV (RFC 4180 semplificato).
   * Gestisce "valore con, virgola", "valore con ""quote"" interne".
   */
  function splitLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuote = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          // Virgoletta doppia escaped
          current += '"'
          i++
        } else {
          inQuote = !inQuote
        }
      } else if (ch === sep && !inQuote) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = splitLine(firstLine).map(h => h.toLowerCase().replace(/\s+/g, '_'))

  return lines.slice(1)
    .map(line => {
      const values = splitLine(line)
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
      return obj
    })
    .filter(row => Object.values(row).some(v => v !== ''))
}

// ─── Helper: risolve un campo dai suoi alias ─────────────────────────────────
function getField(row: Record<string, string>, aliases: string[]): string {
  for (const alias of aliases) {
    // Prova sia con underscore che con spazio come separatore di parola
    const val = row[alias] ?? row[alias.replace(/_/g, ' ')] ?? ''
    if (val.trim()) return val.trim()
  }
  return ''
}

// ─── Normalizzazione testo per dedup ────────────────────────────────────────
function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

// ─── Import CLIENTI (dentisti/studi) ────────────────────────────────────────
/**
 * Dedup strategy:
 *   1. Se partita_iva presente → confronta con (laboratorio_id, partita_iva)
 *   2. Altrimenti → confronta con (laboratorio_id, normalize(studio_nome))
 *      e come fallback (laboratorio_id, normalize(cognome + nome))
 * In entrambi i casi, se già esiste → skip (non aggiorna — l'utente può
 * correggere manualmente i dati dopo l'import).
 *
 * @returns Map di (studio_nome normalizzato → uuid) per uso in importPazienti
 */
async function importClienti(filePath: string): Promise<Map<string, string>> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSV(content)
  console.log(`\n[CLIENTI] ${rows.length} righe trovate in ${path.basename(filePath)}`)

  const fieldMap = {
    studio_nome:  ['studio', 'studio_nome', 'denominazione', 'nome_studio', 'ragione_sociale', 'studio_dentistico'],
    nome:         ['nome', 'nome_dottore', 'nome_dentista', 'firstname', 'first_name'],
    cognome:      ['cognome', 'cognome_dottore', 'cognome_dentista', 'lastname', 'last_name', 'surname'],
    telefono:     ['telefono', 'tel', 'phone', 'telefono_1', 'cell', 'cellulare', 'telefono_studio'],
    email:        ['email', 'e-mail', 'mail', 'email_studio'],
    indirizzo:    ['indirizzo', 'via', 'address', 'strada', 'indirizzo_studio'],
    cap:          ['cap', 'cap_', 'postal_code', 'zip', 'c.a.p.'],
    citta:        ['citta', 'città', 'comune', 'city', 'localita', 'località'],
    provincia:    ['provincia', 'prov', 'state', 'pr'],
    partita_iva:  ['partita_iva', 'p_iva', 'piva', 'vat', 'p.iva', 'partitaiva'],
    codice_sdi:   ['codice_sdi', 'sdi', 'codice_destinatario', 'dest_code', 'codicesdi'],
    pec:          ['pec', 'email_pec', 'pec_email', 'e-mail_pec'],
    note:         ['note', 'notes', 'annotazioni', 'osservazioni'],
  }

  let imported = 0
  let skipped  = 0
  let errors   = 0
  const clientiMap = new Map<string, string>()

  // Pre-carica tutti i clienti esistenti per questo lab (per dedup efficiente)
  const { data: existing, error: fetchErr } = await svc
    .from('clienti')
    .select('id, studio_nome, nome, cognome, partita_iva')
    .eq('laboratorio_id', labId!)
    .is('deleted_at', null)

  if (fetchErr) {
    console.error(`  [ERRORE] impossibile caricare clienti esistenti: ${fetchErr.message}`)
    process.exit(1)
  }

  // Indici per dedup rapido
  const byPiva    = new Map<string, string>() // partita_iva → id
  const byStudio  = new Map<string, string>() // normalize(studio_nome) → id

  for (const c of (existing ?? [])) {
    if (c.partita_iva) byPiva.set(c.partita_iva.replace(/\s/g, ''), c.id)
    if (c.studio_nome) {
      byStudio.set(normalize(c.studio_nome), c.id)
      // Aggiungi alla mappa per pazienti
      clientiMap.set(normalize(c.studio_nome), c.id)
    }
    const nomeKey = normalize(`${c.cognome ?? ''} ${c.nome ?? ''}`)
    if (nomeKey.trim()) byStudio.set(nomeKey, c.id)
  }

  for (const row of rows) {
    const studioNome  = getField(row, fieldMap.studio_nome)
    const nome        = getField(row, fieldMap.nome)
    const cognome     = getField(row, fieldMap.cognome)
    const partitaIva  = getField(row, fieldMap.partita_iva).replace(/\s/g, '')

    // Skip righe vuote: nessun identificativo utile
    if (!studioNome && !cognome && !nome) {
      skipped++
      continue
    }

    // Dedup check
    let existingId: string | undefined
    if (partitaIva) {
      existingId = byPiva.get(partitaIva)
    }
    if (!existingId && studioNome) {
      existingId = byStudio.get(normalize(studioNome))
    }
    if (!existingId && cognome) {
      existingId = byStudio.get(normalize(`${cognome} ${nome}`))
    }

    if (existingId) {
      // Cliente già presente: aggiorna mappa ma non scrivere
      if (studioNome) clientiMap.set(normalize(studioNome), existingId)
      if (cognome)    clientiMap.set(normalize(cognome), existingId)
      skipped++
      continue
    }

    const clienteData = {
      laboratorio_id:  labId!,
      studio_nome:     studioNome || null,
      nome:            nome    || 'N/A',
      cognome:         cognome || 'N/A',
      telefono:        getField(row, fieldMap.telefono)   || null,
      email:           getField(row, fieldMap.email)      || null,
      indirizzo:       getField(row, fieldMap.indirizzo)  || null,
      cap:             getField(row, fieldMap.cap)        || null,
      citta:           getField(row, fieldMap.citta)      || null,
      provincia:       getField(row, fieldMap.provincia)?.toUpperCase().slice(0, 2) || null,
      partita_iva:     partitaIva || null,
      codice_sdi:      getField(row, fieldMap.codice_sdi)?.toUpperCase() || null,
      pec:             getField(row, fieldMap.pec)?.toLowerCase() || null,
      note:            getField(row, fieldMap.note)       || null,
      listino_numero:  1,
      non_soggetto_fe: false,
    }

    const displayName = clienteData.studio_nome ?? `${clienteData.cognome} ${clienteData.nome}`

    if (dryRun) {
      console.log(`  [DRY-RUN] Cliente: ${displayName}${partitaIva ? ` (P.IVA ${partitaIva})` : ''}`)
      // Nella dry-run genera un UUID deterministico fittizio per non bloccare il flow pazienti
      const fakeId = `dry-run-${imported}`
      if (studioNome) clientiMap.set(normalize(studioNome), fakeId)
      if (cognome)    clientiMap.set(normalize(cognome), fakeId)
      imported++
      continue
    }

    const { data: inserted, error } = await svc
      .from('clienti')
      .insert(clienteData)
      .select('id')
      .single()

    if (error) {
      console.error(`  [ERRORE] Cliente "${displayName}": ${error.message}`)
      errors++
    } else {
      if (studioNome) clientiMap.set(normalize(studioNome), inserted.id)
      if (cognome)    clientiMap.set(normalize(cognome), inserted.id)
      imported++
    }
  }

  console.log(`  Risultato: ${imported} importati, ${skipped} saltati (già presenti), ${errors} errori`)
  stats.imported += imported
  stats.skipped  += skipped
  stats.errors   += errors

  return clientiMap
}

// ─── Import PAZIENTI ────────────────────────────────────────────────────────
/**
 * Dedup strategy:
 *   Se codice_paziente è presente nel CSV e non vuoto:
 *     verifica (laboratorio_id, cliente_id, codice_paziente) → skip se esiste
 *   Se codice_paziente assente → sempre insert (nessuna chiave stabile da DentalMaster)
 *
 * NOT NULL obbligatori:
 *   - cliente_id: se non trovato → skip con warning
 *   - nome_cognome: se entrambi nome/cognome vuoti → usa codice_paziente come fallback
 */
async function importPazienti(filePath: string, clientiMap: Map<string, string>) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSV(content)
  console.log(`\n[PAZIENTI] ${rows.length} righe trovate in ${path.basename(filePath)}`)

  const fieldMap = {
    nome:           ['nome', 'nome_paziente', 'firstname', 'first_name'],
    cognome:        ['cognome', 'cognome_paziente', 'lastname', 'last_name', 'surname'],
    codice:         ['codice', 'id', 'codice_paziente', 'cod_paziente', 'numero'],
    studio:         ['studio', 'dentista', 'studio_nome', 'dottore', 'medico', 'cliente'],
    note:           ['note', 'notes', 'annotazioni'],
    data_nascita:   ['data_nascita', 'nascita', 'birthday', 'dob', 'data_di_nascita'],
    codice_fiscale: ['codice_fiscale', 'cf', 'fiscal_code', 'cod_fiscale'],
    sesso:          ['sesso', 'sex', 'gender', 'm_f', 'genere'],
  }

  let imported = 0
  let skipped  = 0
  let errors   = 0

  // Pre-carica codici_paziente esistenti per questo lab (solo quelli con codice stabile)
  const { data: existingPazienti } = await svc
    .from('pazienti')
    .select('id, cliente_id, codice_paziente')
    .eq('laboratorio_id', labId!)
    .not('codice_paziente', 'is', null)

  // Set per dedup: "cliente_id::codice_paziente"
  const existingKeys = new Set<string>()
  for (const p of (existingPazienti ?? [])) {
    if (p.codice_paziente) {
      existingKeys.add(`${p.cliente_id}::${p.codice_paziente}`)
    }
  }

  for (const row of rows) {
    const nome          = getField(row, fieldMap.nome)
    const cognome       = getField(row, fieldMap.cognome)
    const codicePaz     = getField(row, fieldMap.codice) || null
    const studioKey     = normalize(getField(row, fieldMap.studio))
    const notaRaw       = getField(row, fieldMap.note)
    const dataNascita   = getField(row, fieldMap.data_nascita) || null
    const codiceFiscale = getField(row, fieldMap.codice_fiscale) || null
    const sessoRaw      = getField(row, fieldMap.sesso).toUpperCase()
    const sesso         = sessoRaw === 'M' || sessoRaw === 'F' ? sessoRaw : null

    // NOT NULL: cliente_id — se mancante, saltiamo la riga
    const clienteId = clientiMap.get(studioKey) ?? null
    if (!clienteId) {
      const pazLabel = cognome || nome || codicePaz || '(senza nome)'
      console.warn(`  [SKIP] Paziente "${pazLabel}" — studio/dentista "${studioKey}" non trovato tra i clienti importati`)
      skipped++
      continue
    }

    // NOT NULL: nome_cognome — costruiamo un valore garantito non vuoto
    const nomeCognome = [nome, cognome].filter(Boolean).join(' ').trim()
      || codicePaz
      || `Paziente-${Date.now()}`

    // Dedup per codice_paziente stabile
    if (codicePaz) {
      const key = `${clienteId}::${codicePaz}`
      if (existingKeys.has(key)) {
        skipped++
        continue
      }
      existingKeys.add(key) // previene duplicati nello stesso batch
    }

    // Normalizza data_nascita in formato ISO se necessario (DD/MM/YYYY → YYYY-MM-DD)
    let dataNascitaISO: string | null = null
    if (dataNascita) {
      const ddmmyyyy = dataNascita.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/)
      if (ddmmyyyy) {
        dataNascitaISO = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(dataNascita)) {
        dataNascitaISO = dataNascita
      }
      // Formato non riconosciuto → null (meglio ignorare che mettere dati sbagliati)
    }

    const pazienteData = {
      laboratorio_id:  labId!,
      cliente_id:      clienteId,
      codice_paziente: codicePaz,
      nome:            nome    || null,
      cognome:         cognome || null,
      nome_cognome:    nomeCognome,    // NOT NULL
      data_nascita:    dataNascitaISO,
      codice_fiscale:  codiceFiscale,
      sesso:           sesso as 'M' | 'F' | null,
      note:            notaRaw || null,
      archiviato:      false,
    }

    if (dryRun) {
      console.log(`  [DRY-RUN] Paziente: ${nomeCognome} (cliente: ${studioKey})`)
      imported++
      continue
    }

    const { error } = await svc.from('pazienti').insert(pazienteData)

    if (error) {
      console.error(`  [ERRORE] Paziente "${nomeCognome}": ${error.message}`)
      errors++
    } else {
      imported++
    }
  }

  console.log(`  Risultato: ${imported} importati, ${skipped} saltati, ${errors} errori`)
  stats.imported += imported
  stats.skipped  += skipped
  stats.errors   += errors
}

// ─── Import LISTINO ──────────────────────────────────────────────────────────
/**
 * Upsert su UNIQUE(laboratorio_id, codice) — garantito idempotente.
 * Schema conferma: supabase/schema.sql:606 → UNIQUE (laboratorio_id, codice)
 *
 * La categoria in listino è una stringa libera (non enum), quindi il mapping
 * qui è orientativo e non produce errori FK anche se la stringa non corrisponde
 * esattamente ai valori di lavori.tipo_dispositivo.
 */
async function importListino(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCSV(content)
  console.log(`\n[LISTINO] ${rows.length} righe trovate in ${path.basename(filePath)}`)

  // Mapping categorie DentalMaster → categoria listino UÀ (stringa libera)
  const categoriaMap: Array<[string, string]> = [
    ['protesi fissa',      'protesi_fissa'],
    ['corone',             'protesi_fissa'],
    ['ponti',              'protesi_fissa'],
    ['faccette',           'protesi_fissa'],
    ['intarsi',            'protesi_fissa'],
    ['protesi mobile',     'protesi_mobile'],
    ['totale',             'protesi_mobile'],
    ['parziale',           'protesi_mobile'],
    ['scheletrato',        'protesi_mobile'],
    ['ortodonzia',         'ortodonzia'],
    ['ortod',              'ortodonzia'],
    ['implantoprotesi',    'implantoprotesi'],
    ['impianti',           'implantoprotesi'],
    ['gnatologia',         'gnatologia'],
    ['bite',               'gnatologia'],
    ['riparazione',        'riparazione'],
    ['ripar',              'riparazione'],
    ['cad',                'cad_cam'],
    ['cam',                'cad_cam'],
    ['provvisori',         'provvisori'],
    ['provvisorio',        'provvisori'],
  ]

  function mapCategoria(raw: string): string {
    const lower = raw.toLowerCase()
    for (const [key, val] of categoriaMap) {
      if (lower.includes(key)) return val
    }
    return 'altro'
  }

  let imported = 0
  let skipped  = 0
  let errors   = 0
  const seenCodes = new Set<string>() // dedup nello stesso batch per codici duplicati

  for (const row of rows) {
    const nome    = getField(row, ['nome', 'descrizione', 'lavorazione', 'voce', 'denominazione'])
    const codice  = getField(row, ['codice', 'cod', 'id', 'codice_lavorazione', 'codice_voce'])
    const catRaw  = getField(row, ['categoria', 'tipo', 'reparto', 'gruppo', 'categoria_mdr'])
    const prezzo1 = parseFloat((getField(row, ['prezzo', 'prezzo_1', 'listino1', 'listino_1', 'p1']) || '0').replace(',', '.')) || 0
    const prezzo2 = parseFloat((getField(row, ['prezzo_2', 'listino2', 'listino_2', 'p2']) || '0').replace(',', '.')) || null
    const prezzo3 = parseFloat((getField(row, ['prezzo_3', 'listino3', 'listino_3', 'p3']) || '0').replace(',', '.')) || null

    if (!nome) { skipped++; continue }

    // Genera un codice se mancante: usa nome normalizzato per rendere l'upsert idempotente
    const codiceFinal = codice
      || nome.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
      || `IMP-${Date.now()}`

    if (seenCodes.has(codiceFinal)) {
      console.warn(`  [SKIP] Codice duplicato nel CSV: "${codiceFinal}" (${nome}) — saltato`)
      skipped++
      continue
    }
    seenCodes.add(codiceFinal)

    const listinoData = {
      laboratorio_id: labId!,
      codice:         codiceFinal,
      nome,
      descrizione:    getField(row, ['descrizione_estesa', 'note', 'descrizione_completa']) || nome,
      categoria:      mapCategoria(catRaw),
      prezzo_1:       prezzo1,
      prezzo_2:       prezzo2 !== 0 ? prezzo2 : null,
      prezzo_3:       prezzo3 !== 0 ? prezzo3 : null,
      attivo:         true,
    }

    if (dryRun) {
      console.log(`  [DRY-RUN] Listino: ${codiceFinal} — ${nome} @ €${prezzo1.toFixed(2)}`)
      imported++
      continue
    }

    const { error } = await svc.from('listino').upsert(listinoData, {
      onConflict: 'laboratorio_id,codice',
    })

    if (error) {
      console.error(`  [ERRORE] Voce "${nome}" (cod. ${codiceFinal}): ${error.message}`)
      errors++
    } else {
      imported++
    }
  }

  console.log(`  Risultato: ${imported} importati/aggiornati, ${skipped} saltati, ${errors} errori`)
  stats.imported += imported
  stats.skipped  += skipped
  stats.errors   += errors
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nUA — Import DentalMaster Advanced')
  console.log(`Directory: ${exportDir}`)
  console.log(`Lab ID:    ${labId}`)
  if (dryRun) console.log('Modalita: DRY-RUN — nessun dato verra scritto\n')
  else        console.log('')

  if (!fs.existsSync(exportDir!)) {
    console.error(`Errore: la directory "${exportDir}" non esiste.`)
    process.exit(1)
  }

  const allFiles = fs.readdirSync(exportDir!)
  const csvFiles = allFiles.filter(f => /\.(csv|tab|txt)$/i.test(f))

  if (csvFiles.length === 0) {
    console.error(`Nessun file CSV trovato in ${exportDir}`)
    console.error('\nCome esportare da DentalMaster Advanced:')
    console.error('  1. Apri DentalMaster Advanced')
    console.error('  2. Vai al modulo (Clienti, Pazienti, Listino, ecc.)')
    console.error('  3. Menu File → Esporta Record')
    console.error('  4. Formato: CSV con valori separati da virgola o punto e virgola')
    console.error('  5. Includi i nomi delle colonne nella prima riga')
    console.error('  6. Salva come: clienti.csv, pazienti.csv, listino.csv, lavori.csv')
    console.error('\nVedi scripts/export-guide-dentalmaster.md per istruzioni dettagliate.')
    process.exit(1)
  }

  console.log(`File trovati: ${csvFiles.join(', ')}\n`)

  // Ordine di import: clienti prima (i pazienti dipendono dagli ID clienti)
  const importOrder = ['client', 'dentist', 'studio', 'pazient', 'listin', 'tariff', 'prezzar']
  const sorted = [...csvFiles].sort((a, b) => {
    const ai = importOrder.findIndex(o => a.toLowerCase().includes(o))
    const bi = importOrder.findIndex(o => b.toLowerCase().includes(o))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  let clientiMap = new Map<string, string>()

  for (const file of sorted) {
    const filePath = path.join(exportDir!, file)
    const lower    = file.toLowerCase()

    if (lower.includes('client') || lower.includes('dentist') || lower.includes('studio')) {
      clientiMap = await importClienti(filePath)
    } else if (lower.includes('pazient')) {
      await importPazienti(filePath, clientiMap)
    } else if (lower.includes('listin') || lower.includes('tariff') || lower.includes('prezzar')) {
      await importListino(filePath)
    } else {
      console.log(`\n[SKIP] File "${file}" — tipo non riconosciuto.`)
      console.log('  Rinomina il file con un nome che contenga: clienti, pazienti, listino')
    }
  }

  // ─── Riepilogo finale ───────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────')
  console.log(`RIEPILOGO: ${stats.imported} righe importate, ${stats.skipped} saltate, ${stats.errors} errori`)

  if (stats.errors > 0) {
    console.log('\nAttenzione: ci sono stati errori. Controlla i messaggi sopra.')
    console.log('Puoi rieseguire lo script in sicurezza — i record gia importati vengono saltati.')
  }

  if (!dryRun) {
    console.log('\nProssimi passi:')
    console.log('  1. Verifica i dati importati nel pannello Supabase (Table Editor → clienti)')
    console.log('  2. Controlla i clienti con P.IVA mancante e aggiungi codice_sdi / PEC')
    console.log('  3. Imposta il listino_numero corretto per ogni dentista (1 = default)')
    console.log('  4. Esegui una consegna di test con un lavoro reale per validare il flusso')
  }
}

main().catch(err => {
  console.error('Errore inatteso:', err)
  process.exit(1)
})
