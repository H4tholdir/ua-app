/**
 * Import DentalMaster → UÀ — Attrezzature lab
 * Fonte: ATTREZZATURE.pdf (40 pezzi ATT01-ATT40)
 * Destinazione: tabella magazzino con categoria='Attrezzatura'
 *
 * USO: npx tsx scripts/import-attrezzature.ts
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const LAB_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const ATTREZZATURE = [
  { codice: 'ATT01', desc: 'Stereomicroscopio videocompiuterizzato', nome_commerciale: 'Zenit Szr 12' },
  { codice: 'ATT02', desc: 'Occhialini ingrandimento 2,5x', nome_commerciale: 'Escemberg' },
  { codice: 'ATT03', desc: 'Compressore', nome_commerciale: 'Fiac' },
  { codice: 'ATT04', desc: 'Micromotore da banco', nome_commerciale: 'Anyxing Micro-nx' },
  { codice: 'ATT05', desc: 'Forno di sinterizzazione', nome_commerciale: 'Forno 1500' },
  { codice: 'ATT06', desc: 'Forno per ceramica', nome_commerciale: 'Lui8' },
  { codice: 'ATT07', desc: 'Forno per ceramica', nome_commerciale: 'Luxor ceramic' },
  { codice: 'ATT08', desc: 'Isoparallelometro', nome_commerciale: 'Isoparallelometro' },
  { codice: 'ATT09', desc: 'Microscopio ed ecobox', nome_commerciale: 'Ecobox aspiratore e stereomicroscopio Trianon' },
  { codice: 'ATT10', desc: 'Forno a luce', nome_commerciale: 'Sibari' },
  { codice: 'ATT11', desc: 'Forno di preriscaldo', nome_commerciale: 'Manfredi L7D' },
  { codice: 'ATT12', desc: 'Lampada essiccatrice', nome_commerciale: 'ZirKonlampe 250' },
  { codice: 'ATT13', desc: 'Pantografo per zirconia', nome_commerciale: 'Zirkongraph' },
  { codice: 'ATT14', desc: 'Forno a luce', nome_commerciale: 'Yeti' },
  { codice: 'ATT15', desc: 'Squadramodelli a secco', nome_commerciale: 'SQ 145 S' },
  { codice: 'ATT16', desc: 'Vaporizzatrice', nome_commerciale: 'SR 903' },
  { codice: 'ATT17', desc: 'Miscelatore sottovuoto', nome_commerciale: 'IN MIX SR 330' },
  { codice: 'ATT18', desc: 'Miscelatore sottovuoto con colata in vuoto', nome_commerciale: 'SPEEDY MIX SR 350' },
  { codice: 'ATT19', desc: 'Micromotore', nome_commerciale: 'SR 250' },
  { codice: 'ATT20', desc: 'Foragesso', nome_commerciale: 'Drill 9000' },
  { codice: 'ATT21', desc: 'Seghetto taglia monconi con puntatore laser', nome_commerciale: 'Omec TR 87' },
  { codice: 'ATT22', desc: 'Fonditrice ad induzione', nome_commerciale: 'Unicast' },
  { codice: 'ATT23', desc: 'Termopressa', nome_commerciale: 'MiniMajor' },
  { codice: 'ATT24', desc: 'Termospatola', nome_commerciale: 'Amann Thermojet' },
  { codice: 'ATT25', desc: 'Termospatola', nome_commerciale: 'Renfert Waxlectric' },
  { codice: 'ATT26', desc: 'Forno a luce', nome_commerciale: 'Metalight Qx1' },
  { codice: 'ATT27', desc: 'Forno per pressatura', nome_commerciale: 'Ep500' },
  { codice: 'ATT28', desc: 'Pulitore Magnetico', nome_commerciale: 'Ecoclean' },
  { codice: 'ATT29', desc: 'Sabbiatrice', nome_commerciale: 'Dune2' },
  { codice: 'ATT30', desc: 'Sabbiatrice', nome_commerciale: 'Matic' },
  { codice: 'ATT31', desc: 'Sigillatrice', nome_commerciale: 'Me-200h' },
  { codice: 'ATT32', desc: 'Vasca ultrasuoni', nome_commerciale: 'Digital ultrasonic cleaner' },
  { codice: 'ATT33', desc: 'Articolatore a valori medi', nome_commerciale: 'Asa' },
  { codice: 'ATT34', desc: 'Articolatore a valore semiindividuale', nome_commerciale: 'Gnatus' },
  { codice: 'ATT35', desc: 'Articolatore a valore semiindividuale', nome_commerciale: 'Ktd' },
  { codice: 'ATT36', desc: 'Apparecchio a luce per polimerizzare', nome_commerciale: 'Quick' },
  { codice: 'ATT37', desc: 'Vasca disinfettante', nome_commerciale: '' },
  { codice: 'ATT38', desc: 'Scanner tridimensionale', nome_commerciale: 'Optical Revenge Dental-Open Technologies' },
  { codice: 'ATT39', desc: 'Forno di essiccazione', nome_commerciale: '' },
  { codice: 'ATT40', desc: 'Forno di polimerizzazione Eclipse', nome_commerciale: '' },
]

async function main() {
  console.log('🔄 Import Attrezzature DentalMaster → UÀ magazzino')
  console.log(`   Lab: ${LAB_ID}`)
  console.log(`   ${ATTREZZATURE.length} attrezzature da importare\n`)

  let ok = 0, skip = 0, err = 0

  for (const att of ATTREZZATURE) {
    const nome = att.nome_commerciale
      ? `${att.desc} — ${att.nome_commerciale}`
      : att.desc

    const { error } = await svc.from('magazzino').insert({
      laboratorio_id: LAB_ID,
      codice_articolo: att.codice,
      nome: nome,
      produttore: att.nome_commerciale || null,
      categoria: 'Attrezzatura',
      sotto_categoria: 'Lab DentalMaster',
      um_acquisto: 'pz',
      um_scarico: 'pz',
      quantita_per_confezione: 1,
      scorta_attuale: 1,
      scorta_minima: 0,
      dispositivo_medico: false,
      traccia_lotto: false,
      attivo: true,
    })

    if (error) {
      if (error.code === '23505') { skip++; continue } // duplicate
      console.error(`  ❌ ${att.codice}: ${error.message}`)
      err++
    } else {
      console.log(`  ✅ ${att.codice} — ${att.desc}`)
      ok++
    }
  }

  console.log(`\n🎉 Attrezzature: ${ok} inserite | ${skip} già presenti | ${err} errori`)
}

main().catch(e => { console.error(e); process.exit(1) })
