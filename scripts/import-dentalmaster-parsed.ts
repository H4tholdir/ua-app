/**
 * Import DentalMaster → UÀ Supabase
 * Usa i dati già estratti e parsati da CLIENTI.tab e LISTINO.tab
 *
 * USO: npx tsx scripts/import-dentalmaster-parsed.ts --lab-id <UUID>
 *
 * Prerequisiti .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import * as path from 'node:path'

const args = process.argv.slice(2)
const labIdx = args.indexOf('--lab-id')
const labId  = labIdx !== -1 ? args[labIdx + 1] : process.env.LAB_FILIPPO_ID

if (!labId) {
  console.error('❌  Imposta --lab-id <UUID> oppure LAB_FILIPPO_ID nel .env.local')
  process.exit(1)
}

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ─── Dati estratti da CLIENTI.tab (17/05/2026) ───────────────────────────────
const CLIENTI = [
  { codice_dm: 'W7YVJK9', studio_nome: 'Dental Center s.r.l. uninominale', indirizzo: 'via Nazionale n. 4', cap: '84028', citta: 'Serre', provincia: 'SA', partita_iva: '05089210651' },
  { codice_dm: '1', studio_nome: 'ESPOSITO MASSIMO', indirizzo: 'Via Generale Gonzaga 8', cap: '84091', citta: 'Battipaglia', provincia: 'SA', codice_fiscale: 'SPSMSM60M08A717G' },
  { codice_dm: '7', studio_nome: 'C.O.M. s.r.l. uninominale', indirizzo: 'Via Fravita, snc', cap: '84044', citta: 'Matinella di Albanella', provincia: 'SA', partita_iva: '02900490653' },
  { codice_dm: '6', studio_nome: 'BARALE S.A.S.', indirizzo: 'Via C. Colombo', cap: '84043', citta: 'Agropoli', provincia: 'SA', partita_iva: '04732740651' },
  { codice_dm: '007', studio_nome: 'STUDI MEDICI DI SANTI GIUSEPPE', indirizzo: 'Via San Paolo 16/A', cap: '58018', citta: 'Porto Ercole', provincia: 'GR', codice_fiscale: 'DSNGPP56R01A484S' },
  { codice_dm: '07', studio_nome: 'DI SANTI CATERINA', indirizzo: 'VIA SANTA MARIA 47', cap: '84030', citta: 'ATENA LUCANA', provincia: 'SA', codice_fiscale: 'DSNCRN85R69I726N' },
  { codice_dm: '11', studio_nome: 'DOTT. ETTORE TUFARELLI', indirizzo: 'VIA ROMA 45', cap: '83040', citta: 'FLUMERI', provincia: null, codice_fiscale: 'TFRTTR65S03L418A' },
  { codice_dm: '22', studio_nome: 'MAFFIA', indirizzo: 'VIA G.B. VICO 2', cap: '84043', citta: 'AGROPOLI', provincia: 'SA', codice_fiscale: 'MFFVTR59A25I648Q' },
  { codice_dm: '16', studio_nome: 'LEO MARIANTONIETTA', indirizzo: 'VIA ROMA 57', cap: '84020', citta: 'SAN GREGORIO MAGNO', provincia: 'SA', partita_iva: '05011280657' },
  { codice_dm: '30', studio_nome: 'DOTTORESSA MAIONE', indirizzo: 'PIAZZA SALVO D\'AQUISTO 1', cap: '84091', citta: 'BATTIPAGLIA', provincia: null, codice_fiscale: 'MNALSS87M48B563L' },
  { codice_dm: '008', studio_nome: 'VUOLO GIANFRANCO', indirizzo: 'VIA M.TESTA', cap: '84127', citta: 'SALERNO', provincia: 'SA', codice_fiscale: 'VLUGFR72C15H703M' },
  { codice_dm: '09', studio_nome: 'STUDIO ODONTOIATRICO SCIENGA FRANCO', indirizzo: 'VIA MAGNA GRECIA 737', cap: '84047', citta: 'CAPACCIO PAESTUM', provincia: 'SA', partita_iva: '02431820659', codice_fiscale: 'SCIFNC61L26B644W' },
  { codice_dm: '21', studio_nome: 'STUDIO ODONTOIATRICO', indirizzo: 'VIA ROMA', cap: '85054', citta: 'MURO LUCANO', provincia: 'PZ', partita_iva: '05708210652' },
  { codice_dm: '19', studio_nome: 'STUDIO ODONTOIATRICO PIEGARI GIANFRANCO', indirizzo: 'VIA ROMA,12', cap: '85054', citta: 'MURO LUCANO', provincia: 'PZ', telefono: '097671439' },
  { codice_dm: '8', studio_nome: 'GDA STP S.R.L.', indirizzo: 'VIA VITTORIO VENETO', cap: '00168', citta: 'ROMA', provincia: 'RM', partita_iva: '16755911001' },
  { codice_dm: 'RLGKQUU', studio_nome: 'GIANFRANCO LANZA', indirizzo: 'VIA SAN LEONARDO 52', cap: '84131', citta: 'SALERNO', provincia: null, partita_iva: '05933490657' },
  { codice_dm: '10', studio_nome: 'STUDIO ODONTOIATRICO SICA FRANCESCO', partita_iva: '02431820659' },
  { codice_dm: '120', studio_nome: 'DOTT. MARA OPROMOLLA' },
] as const

// ─── Listino (72 lavorazioni da LISTINO.tab) ─────────────────────────────────
// Formato: { codice, nome, prezzo_1 }
// File completo estratto in /tmp/dm-listino-parsed.json
// Incluse le prime 20 per dimostrazione — script legge il JSON completo

async function main() {
  console.log('\n🦷  UÀ — Import DentalMaster Advanced')
  console.log(`🏥  Lab ID: ${labId}`)

  // ── 1. Import Clienti ──────────────────────────────────────────────────────
  console.log(`\n👥  Importando ${CLIENTI.length} clienti...`)
  let ok = 0, skip = 0

  for (const c of CLIENTI) {
    const data: Record<string, unknown> = {
      laboratorio_id: labId,
      studio_nome:   c.studio_nome,
      nome:          c.studio_nome.split(' ')[0] || 'N/A',
      cognome:       c.studio_nome.split(' ').slice(1).join(' ') || 'N/A',
      indirizzo:     (c as { indirizzo?: string }).indirizzo ?? null,
      cap:           (c as { cap?: string }).cap ?? null,
      citta:         (c as { citta?: string }).citta ?? null,
      provincia:     (c as { provincia?: string | null }).provincia ?? null,
      partita_iva:   (c as { partita_iva?: string }).partita_iva ?? null,
      codice_fiscale:(c as { codice_fiscale?: string }).codice_fiscale ?? null,
      telefono:      (c as { telefono?: string }).telefono ?? null,
      listino_numero: 1,
      non_soggetto_fe: false,
    }

    const { error } = await svc.from('clienti').insert(data)
    if (error) {
      console.error(`  ⚠️  ${c.studio_nome}: ${error.message}`)
      skip++
    } else {
      console.log(`  ✅  ${c.studio_nome}`)
      ok++
    }
  }
  console.log(`  → ${ok} importati, ${skip} saltati`)

  // ── 2. Import Listino ──────────────────────────────────────────────────────
  const fs = await import('node:fs')
  let lavorazioni: Array<{ codice: string; nome: string; unita_misura: string; prezzo_1: number }> = []

  try {
    lavorazioni = JSON.parse(fs.default.readFileSync('/tmp/dm-listino-parsed.json', 'utf-8'))
  } catch {
    console.error('❌  File /tmp/dm-listino-parsed.json non trovato. Riesegui il parser prima.')
    process.exit(1)
  }

  console.log(`\n📋  Importando ${lavorazioni.length} lavorazioni listino...`)
  ok = 0; skip = 0

  for (const l of lavorazioni) {
    const { error } = await svc.from('listino').upsert(
      {
        laboratorio_id: labId,
        codice:      l.codice,
        nome:        l.nome,
        descrizione: l.nome,
        categoria:   categoriaDa(l.nome),
        prezzo_1:    l.prezzo_1,
        attivo:      true,
      },
      { onConflict: 'laboratorio_id,codice' }
    )
    if (error) { skip++ } else { ok++ }
  }
  console.log(`  → ${ok} importate, ${skip} saltate`)

  console.log('\n✅  Import completato!')
  console.log('\n📝  Prossimi passi:')
  console.log('   • Verifica clienti in Supabase Dashboard → clienti')
  console.log('   • Aggiungi P.IVA mancanti per clienti senza FatturaPA')
  console.log('   • Le 4 lavorazioni senza prezzo (cod. 2,19,28,50) vanno completate')
}

function categoriaDa(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('impianto') || n.includes('avvitata') || n.includes('moncone')) return 'implantoprotesi'
  if (n.includes('scheletrat') || n.includes('gancio') || n.includes('denti')) return 'protesi_mobile'
  if (n.includes('ceramica') || n.includes('corona') || n.includes('intarsio') || n.includes('faccetta') || n.includes('richmond') || n.includes('giacca') || n.includes('disilicato') || n.includes('armatura') || n.includes('perno') || n.includes('ponte')) return 'protesi_fissa'
  if (n.includes('protesi') && (n.includes('sup') || n.includes('inf') || n.includes('provvisoria') || n.includes('completa'))) return 'protesi_mobile'
  if (n.includes('ortodonz') || n.includes('allineator')) return 'ortodonzia'
  if (n.includes('gnatologia') || n.includes('articolatore') || n.includes('masticazione') || n.includes('ceratura')) return 'gnatologia'
  if (n.includes('riparazione') || n.includes('aggiunta') || n.includes('saldatura')) return 'riparazione'
  return 'altro'
}

main().catch(err => { console.error('❌', err); process.exit(1) })
