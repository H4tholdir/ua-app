/**
 * Import DentalMaster → UÀ — COMPLETO
 * Clienti + Listino (4 prezzi) + Magazzino
 *
 * USO: npx tsx scripts/import-dm-completo.ts --lab-id <UUID>
 *
 * Prerequisiti:
 *   - /tmp/dm-listino-completo.json  (da parser PDF)
 *   - /tmp/dm-magazzino.json         (da parser PDF)
 *   - NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'

const args = process.argv.slice(2)
const labIdx = args.indexOf('--lab-id')
const labId  = labIdx !== -1 ? args[labIdx + 1] : process.env.LAB_FILIPPO_ID

if (!labId) { console.error('❌  Specifica --lab-id <UUID>'); process.exit(1) }

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ─── 19 Clienti estratti da DentalMaster (CLIENTI.tab + LISTA CLIENTI.pdf) ──
const CLIENTI = [
  { studio_nome: 'Dental Center s.r.l. uninominale', indirizzo: 'via Nazionale n. 4', cap: '84028', citta: 'Serre', provincia: 'SA', partita_iva: '05089210651', listino_numero: 1 },
  { studio_nome: 'ESPOSITO MASSIMO', indirizzo: 'Via Generale Gonzaga 8', cap: '84091', citta: 'Battipaglia', provincia: 'SA', partita_iva: '02659500652', codice_fiscale: 'SPSMSM60M08A717G', listino_numero: 1 },
  { studio_nome: 'C.O.M. s.r.l. uninominale', indirizzo: 'Via Fravita, snc', cap: '84044', citta: 'Matinella di Albanella', provincia: 'SA', partita_iva: '02900490653', listino_numero: 1 },
  { studio_nome: 'BARALE S.A.S.', indirizzo: 'Via C. Colombo', cap: '84043', citta: 'Agropoli', provincia: 'SA', partita_iva: '04732740651', listino_numero: 1 },
  { studio_nome: 'STUDI MEDICI DI SANTI GIUSEPPE', indirizzo: 'Via San Paolo 16/A', cap: '58018', citta: 'Porto Ercole', provincia: 'GR', partita_iva: '00877510537', codice_fiscale: 'DSNGPP56R01A484S', listino_numero: 1 },
  { studio_nome: 'DI SANTI CATERINA', indirizzo: 'VIA SANTA MARIA 47', cap: '84030', citta: 'ATENA LUCANA', provincia: 'SA', partita_iva: '05675390651', codice_fiscale: 'DSNCRN85R69I726N', listino_numero: 1 },
  { studio_nome: 'DOTT. ETTORE TUFARELLI', indirizzo: 'VIA ROMA 45', cap: '83040', citta: 'FLUMERI', codice_fiscale: 'TFRTTR65S03L418A', listino_numero: 1 },
  { studio_nome: 'MAFFIA', indirizzo: 'VIA G.B. VICO 2', cap: '84043', citta: 'AGROPOLI', provincia: 'SA', partita_iva: '02783910652', codice_fiscale: 'MFFVTR59A25I648Q', listino_numero: 1 },
  { studio_nome: 'LEO MARIANTONIETTA', indirizzo: 'VIA ROMA 57', cap: '84020', citta: 'SAN GREGORIO MAGNO', provincia: 'SA', partita_iva: '05011280657', listino_numero: 1 },
  { studio_nome: 'DOTTORESSA MAIONE', indirizzo: "PIAZZA SALVO D'AQUISTO 1", cap: '84091', citta: 'BATTIPAGLIA', codice_fiscale: 'MNALSS87M48B563L', listino_numero: 1 },
  { studio_nome: 'VUOLO GIANFRANCO', indirizzo: 'VIA M.TESTA', cap: '84127', citta: 'SALERNO', provincia: 'SA', partita_iva: '03328870658', codice_fiscale: 'VLUGFR72C15H703M', listino_numero: 1 },
  { studio_nome: 'STUDIO ODONTOIATRICO SCIENGA FRANCO', indirizzo: 'VIA MAGNA GRECIA 737', cap: '84047', citta: 'CAPACCIO PAESTUM', provincia: 'SA', partita_iva: '02431820659', codice_fiscale: 'SCIFNC61L26B644W', listino_numero: 1 },
  { studio_nome: 'STUDIO ODONTOIATRICO', indirizzo: 'VIA ROMA', cap: '85054', citta: 'MURO LUCANO', provincia: 'PZ', partita_iva: '05708210652', listino_numero: 1 },
  { studio_nome: 'STUDIO ODONTOIATRICO PIEGARI GIANFRANCO', indirizzo: 'VIA ROMA, 12', cap: '85054', citta: 'MURO LUCANO', provincia: 'PZ', telefono: '097671439', listino_numero: 1 },
  { studio_nome: 'GDA STP S.R.L.', indirizzo: 'VIA VITTORIO VENETO', cap: '00168', citta: 'ROMA', provincia: 'RM', partita_iva: '16755911001', listino_numero: 1 },
  { studio_nome: 'GIANFRANCO LANZA', indirizzo: 'VIA SAN LEONARDO 52', cap: '84131', citta: 'SALERNO', partita_iva: '05933490657', listino_numero: 1 },
  { studio_nome: 'STUDIO ODONTOIATRICO SICA FRANCESCO', partita_iva: '02431820659', listino_numero: 1 },
  { studio_nome: 'DOTT. MARA OPROMOLLA', listino_numero: 1 },
]

async function main() {
  console.log('\n🦷  UÀ — Import DentalMaster COMPLETO')
  console.log(`🏥  Lab ID: ${labId}`)

  // ── 1. Clienti ─────────────────────────────────────────────────────────────
  console.log(`\n👥  Importando ${CLIENTI.length} clienti...`)
  let ok = 0, skip = 0

  for (const c of CLIENTI) {
    const { error } = await svc.from('clienti').insert({
      laboratorio_id: labId,
      studio_nome:    c.studio_nome,
      nome:           c.studio_nome.split(' ')[0] || 'N/A',
      cognome:        c.studio_nome.split(' ').slice(1).join(' ') || 'N/A',
      indirizzo:      (c as any).indirizzo ?? null,
      cap:            (c as any).cap ?? null,
      citta:          (c as any).citta ?? null,
      provincia:      (c as any).provincia ?? null,
      partita_iva:    (c as any).partita_iva ?? null,
      codice_fiscale: (c as any).codice_fiscale ?? null,
      telefono:       (c as any).telefono ?? null,
      listino_numero: c.listino_numero ?? 1,
      non_soggetto_fe: false,
    })
    if (error) { console.error(`  ⚠️  ${c.studio_nome}: ${error.message}`); skip++ }
    else { console.log(`  ✅  ${c.studio_nome}`); ok++ }
  }
  console.log(`  → ${ok} importati, ${skip} saltati`)

  // ── 2. Listino con 4 fasce prezzo ─────────────────────────────────────────
  const listino = JSON.parse(fs.readFileSync('/tmp/dm-listino-completo.json', 'utf-8'))
  console.log(`\n📋  Importando ${listino.length} lavorazioni (4 fasce prezzo)...`)
  ok = 0; skip = 0

  for (const l of listino) {
    const { error } = await svc.from('listino').upsert(
      {
        laboratorio_id: labId,
        codice:      l.codice.replace(/^﻿/, '').trim(),
        nome:        l.nome,
        descrizione: l.nome,
        categoria:   categorizza(l.nome),
        prezzo_1:    l.prezzo_1 || 0,
        prezzo_2:    l.prezzo_2 || 0,
        prezzo_3:    l.prezzo_3 || 0,
        attivo:      true,
      },
      { onConflict: 'laboratorio_id,codice' }
    )
    if (error) { skip++ } else { ok++ }
  }
  console.log(`  → ${ok} importate, ${skip} saltate`)

  // ── 3. Magazzino ──────────────────────────────────────────────────────────
  const magazzino = JSON.parse(fs.readFileSync('/tmp/dm-magazzino.json', 'utf-8'))
  console.log(`\n📦  Importando ${magazzino.length} articoli magazzino...`)
  ok = 0; skip = 0

  for (const m of magazzino) {
    const { error } = await svc.from('magazzino').upsert(
      {
        laboratorio_id: labId,
        codice:         m.codice,
        nome:           m.nome,
        scorta_attuale: m.scorta_attuale || 0,
        scorta_minima:  m.scorta_minima || 0,
        um_acquisto:    'pz',
        attivo:         true,
      },
      { onConflict: 'laboratorio_id,codice' }
    )
    if (error) { skip++ } else { ok++ }
  }
  console.log(`  → ${ok} importati, ${skip} saltati`)

  console.log('\n✅  Import completo!')
  console.log('\n📊  Riepilogo:')
  console.log(`   • ${CLIENTI.length} clienti (dentisti/studi)`)
  console.log(`   • ${listino.length} lavorazioni con 4 fasce prezzo`)
  console.log(`   • ${magazzino.length} articoli magazzino`)
  console.log('\n⚠️  Da completare manualmente:')
  console.log('   • 4 lavorazioni senza prezzo (cod. 2, 19, 28, 50)')
  console.log('   • Codice SDI / PEC per clienti senza FatturaPA')
  console.log('   • Scorte minime magazzino (attualmente 0 o 1)')
}

function categorizza(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('impianto') || n.includes('avvitata') || n.includes('moncone')) return 'implantoprotesi'
  if (n.includes('scheletrat') || n.includes('gancio') || n.includes('mobile') || n.includes('protesi sup') || n.includes('protesi inf')) return 'protesi_mobile'
  if (n.includes('ceramica') || n.includes('corona') || n.includes('intarsio') || n.includes('faccetta') || n.includes('richmond') || n.includes('giacca') || n.includes('disilicato') || n.includes('armatura') || n.includes('perno') || n.includes('ponte') || n.includes('elemento')) return 'protesi_fissa'
  if (n.includes('ortodonz') || n.includes('allineator')) return 'ortodonzia'
  if (n.includes('articolatore') || n.includes('masticazione') || n.includes('ceratura')) return 'gnatologia'
  if (n.includes('riparazione') || n.includes('aggiunta') || n.includes('saldatura')) return 'riparazione'
  return 'altro'
}

main().catch(err => { console.error('❌', err); process.exit(1) })
