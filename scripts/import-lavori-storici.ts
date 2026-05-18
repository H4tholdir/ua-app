/**
 * Import DentalMaster → UÀ — Lavori Storici
 * Fonte: LISTA LAVORI.pdf (3 pagine, 2018-2021)
 *
 * Regole import:
 * - Tutti importati come stato='consegnato' (lavori storici)
 * - Fatturato → incluso_in_fattura=true
 * - Attivo → incluso_in_fattura=false (non fatturati in DM)
 * - Clienti sconosciuti (codice DM "4", "W7YVJK9") → skippati
 * - numero_lavoro: formato STOR/YYYY/NNN
 * - note_interne: "IMPORT DentalMaster"
 *
 * USO: npx tsx scripts/import-lavori-storici.ts
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const LAB_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Mapping codice DM → UUID cliente nel DB
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

type Stato = 'consegnato' | 'sospeso'

interface LavoroStorico {
  dm_cliente: string
  dispositivo: string
  data_ingresso: string     // DD/MM/YY
  data_consegna?: string    // DD/MM/YY, opzionale
  status: 'Fatturato' | 'Attivo'
  importo?: number
  cod_paz?: string
}

// Tutti i lavori estratti da LISTA LAVORI.pdf
const LAVORI_STORICI: LavoroStorico[] = [
  // PAGINA 1 — 2018/2019
  { dm_cliente: '1', dispositivo: 'Ponte di cinque elementi in metallo ceramica', data_ingresso: '13/02/19', status: 'Attivo', cod_paz: '132191147 ADESSO ANIELLO' },
  { dm_cliente: '1', dispositivo: 'Sviluppo scheletrato con ganci', data_ingresso: '13/02/19', status: 'Attivo', importo: 700, cod_paz: '132191155 LORITO VITTORIO' },
  { dm_cliente: '1', dispositivo: 'Elemento ceramica', data_ingresso: '16/01/19', data_consegna: '06/02/19', status: 'Fatturato', importo: 373.45, cod_paz: "16119900 D'AMICO ALFONSO" },
  { dm_cliente: '7', dispositivo: 'Elemento provvisorio in metallo resina', data_ingresso: '14/02/19', data_consegna: '06/02/19', status: 'Fatturato', importo: 350.50, cod_paz: '142191033 RUSSO ANTONIO' },
  { dm_cliente: '7', dispositivo: 'Elemento provvisorio in resina rinforzato', data_ingresso: '15/02/19', data_consegna: '06/02/19', status: 'Fatturato', importo: 186.70, cod_paz: '62191053 Giordano Vito' },
  { dm_cliente: '1', dispositivo: 'Corona in metallo ceramica e armatura per ceramica', data_ingresso: '20/02/19', status: 'Fatturato', importo: 265.25, cod_paz: '20219855 SIRICO LUISA' },
  { dm_cliente: '1', dispositivo: 'Elemento ceramica e bite-plane', data_ingresso: '16/01/19', data_consegna: '06/02/19', status: 'Fatturato', importo: 447, cod_paz: "132191428 D'AMICO ALFONSO" },
  { dm_cliente: '1', dispositivo: 'Elemento ceramica', data_ingresso: '15/01/19', data_consegna: '06/02/19', status: 'Fatturato', importo: 90, cod_paz: '15119937 BISOGNI MONICA' },
  { dm_cliente: '1', dispositivo: 'Protesi superiore o inferiore compreso denti', data_ingresso: '25/02/19', data_consegna: '25/02/19', status: 'Fatturato', importo: 700.05, cod_paz: '2119956' },
  { dm_cliente: '1', dispositivo: 'Elemento ceramica e fresatura impianto', data_ingresso: '04/01/19', data_consegna: '27/02/19', status: 'Fatturato', importo: 183.35, cod_paz: '4119824 CRISCUOLO ANNA' },
  // PAGINA 2 — 2019
  { dm_cliente: '1', dispositivo: 'Corona a giacca', data_ingresso: '23/01/19', data_consegna: '27/02/19', status: 'Attivo', importo: 151.75, cod_paz: '23119839 COPPOLA ANNA' },
  { dm_cliente: '1', dispositivo: 'Elemento ceramica e perno moncone', data_ingresso: '02/03/19', status: 'Attivo', importo: 206.85, cod_paz: '2319908 DI DIO NUNZIA' },
  { dm_cliente: '7', dispositivo: 'Elemento ceramica', data_ingresso: '02/03/19', status: 'Fatturato', importo: 90, cod_paz: '23191007 LETTIERI ANNA' },
  { dm_cliente: '1', dispositivo: 'Capsule in metallo-ceramica e perni monconi fresati', data_ingresso: '19/02/19', data_consegna: '12/03/19', status: 'Fatturato', cod_paz: '19219922 ADESSO ANIELLO' },
  { dm_cliente: '7', dispositivo: 'Lavoro su articolatore Gnatomat', data_ingresso: '11/10/18', data_consegna: '20/03/19', status: 'Fatturato', importo: 93.35, cod_paz: '1110181523 Scovotto Maria Antonietta' },
  { dm_cliente: '7', dispositivo: 'Ceramizzazione struttura zr', data_ingresso: '31/01/19', data_consegna: '04/04/19', status: 'Fatturato', cod_paz: '84191814 Cembalo Gloria' },
  { dm_cliente: '7', dispositivo: 'Corona in metallo ceramica', data_ingresso: '27/02/19', status: 'Attivo', cod_paz: '84191823 Polisciano Giovanni' },
  { dm_cliente: '7', dispositivo: 'Protesi avvitata struttura ceramica', data_ingresso: '01/05/19', status: 'Attivo', cod_paz: '15191614 KUYKURI76Y' },
  { dm_cliente: '1', dispositivo: 'Armatura per ceramica e fresatura impianto', data_ingresso: '18/04/19', data_consegna: '29/05/19', status: 'Fatturato', importo: 20, cod_paz: '18419832 MARCIGLIANO GISEPPINA' },
  { dm_cliente: '1', dispositivo: 'Elemento ceramica', data_ingresso: '02/04/19', data_consegna: '28/05/19', status: 'Fatturato', importo: 80, cod_paz: '2419851 ESPOSITO ASSUNTA' },
  { dm_cliente: '1', dispositivo: 'Elemento ceramica e fresatura impianto', data_ingresso: '28/03/19', data_consegna: '22/05/19', status: 'Fatturato', importo: 100, cod_paz: '28319902 DE PRISCO ANNAMARIA' },
  { dm_cliente: '1', dispositivo: 'Elemento ceramica', data_ingresso: '29/05/19', status: 'Fatturato', importo: 80, cod_paz: '29519937 CAROL HABERKORN' },
  // PAGINA 3 — 2019/2020/2021
  { dm_cliente: '7', dispositivo: 'Elemento ceramica', data_ingresso: '31/05/19', status: 'Fatturato', importo: 80, cod_paz: '315191059 LEONESSA ANDREA' },
  { dm_cliente: '7', dispositivo: 'Armatura per ceramica', data_ingresso: '04/07/19', data_consegna: '16/07/19', status: 'Fatturato', importo: 0, cod_paz: '4719850 Pandolfi Daniela' },
  { dm_cliente: '6', dispositivo: 'Armatura per ceramica', data_ingresso: '21/08/19', data_consegna: '24/09/19', status: 'Fatturato', importo: 0, cod_paz: '218191009 CAPUANO ANTONIETTA' },
  { dm_cliente: '6', dispositivo: 'Elemento ceramica', data_ingresso: '28/08/19', data_consegna: '24/09/19', status: 'Fatturato', importo: 80, cod_paz: '249191031 PESCE ENRICO' },
  { dm_cliente: '6', dispositivo: 'Disilicato di litio pressato finito', data_ingresso: '30/08/19', data_consegna: '24/09/19', status: 'Fatturato', importo: 120, cod_paz: '249191040 RENZI GAETANA' },
  { dm_cliente: '007', dispositivo: 'Elemento ceramica', data_ingresso: '15/05/20', data_consegna: '30/05/20', status: 'Fatturato', importo: 80, cod_paz: '305201843 SALVITELLI LUIGI' },
  { dm_cliente: '007', dispositivo: 'Elemento provvisorio in resina', data_ingresso: '01/06/20', data_consegna: '22/05/20', status: 'Fatturato', importo: 58.40, cod_paz: '16201323 CALANDRIELLO LUCIA' },
  { dm_cliente: '007', dispositivo: 'Elemento ceramica', data_ingresso: '01/06/20', data_consegna: '12/06/20', status: 'Fatturato', importo: 80, cod_paz: '126201700 CALANDRIELLO LUCIA' },
  { dm_cliente: '007', dispositivo: 'Elemento ceramica', data_ingresso: '15/07/20', data_consegna: '31/07/20', status: 'Attivo', importo: 80, cod_paz: '317201808 AQUINO ROSA' },
  { dm_cliente: '007', dispositivo: 'Elemento ceramica', data_ingresso: '15/07/20', data_consegna: '08/08/20', status: 'Fatturato', importo: 80, cod_paz: '15820958 LONGO GIUSEPPA' },
  { dm_cliente: '007', dispositivo: 'Elemento ceramica', data_ingresso: '19/08/20', data_consegna: '04/09/20', status: 'Fatturato', importo: 80, cod_paz: '19820902 LONGO ROSSANA' },
  { dm_cliente: '007', dispositivo: 'Ponte di sei elementi in metallo ceramica', data_ingresso: '07/12/20', data_consegna: '14/12/20', status: 'Attivo', cod_paz: '1812201349 CUOCO ANTONIA' },
  { dm_cliente: '007', dispositivo: 'Fusione perno diretto', data_ingresso: '23/11/20', data_consegna: '21/12/20', status: 'Fatturato', cod_paz: '2212201908 VIGNUOLO BRUNO' },
  { dm_cliente: '007', dispositivo: 'Elemento ceramica', data_ingresso: '14/12/20', data_consegna: '11/01/21', status: 'Fatturato', importo: 80, cod_paz: '131211820 GRIECO EUFEMIA' },
  { dm_cliente: '007', dispositivo: 'Elemento ceramica', data_ingresso: '01/03/21', data_consegna: '15/03/21', status: 'Fatturato', importo: 80, cod_paz: '203211913 CORONATO FRANCESCO' },
  { dm_cliente: '007', dispositivo: 'Elemento ceramica', data_ingresso: '01/03/21', data_consegna: '15/03/21', status: 'Attivo', importo: 80, cod_paz: '203211924 GRANATA FILOMENA' },
  { dm_cliente: '007', dispositivo: 'Elemento provvisorio in resina', data_ingresso: '01/03/21', data_consegna: '15/03/21', status: 'Attivo', importo: 58.40, cod_paz: '203211940 VIGNUOLO BRUNO' },
  { dm_cliente: '007', dispositivo: 'Elemento provvisorio in resina', data_ingresso: '01/03/21', data_consegna: '15/03/21', status: 'Attivo', importo: 58.40, cod_paz: '203211952 LUPO LUCIA' },
  { dm_cliente: '07', dispositivo: 'Elemento ceramica', data_ingresso: '01/02/21', data_consegna: '15/03/21', status: 'Fatturato', importo: 80, cod_paz: '22321813 COCILOVA MARIA' },
  { dm_cliente: '007', dispositivo: 'Elemento ceramica', data_ingresso: '08/02/21', data_consegna: '26/02/21', status: 'Attivo', importo: 80, cod_paz: '14211016 GRIECO EUFEMIA' },
]

// Mappa descrizioni DentalMaster → enum tipo_dispositivo UÀ
function mapTipoDispositivo(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('scheletrat') || d.includes('scheletro')) return 'scheletrato'
  if (d.includes('provvisori') || d.includes('provvisorio')) return 'provvisorio'
  if (d.includes('riparazi') || d.includes('ribasatura') || d.includes('rifacimento')) return 'riparazione'
  if (d.includes('implant') || d.includes('avvita') || d.includes('fresatura') || d.includes('perno') || d.includes('abutment')) return 'implantologia'
  if (d.includes('mobile') || d.includes('totale') || d.includes('parziale') || d.includes('denti')) return 'protesi_mobile'
  if (d.includes('ortodonz') || d.includes('apparecchio')) return 'ortodonzia'
  if (d.includes('zirconia') || d.includes('cad') || d.includes('fresato') || d.includes('disilicato') || d.includes('sinteriz') || d.includes('zr')) return 'cad_cam'
  if (d.includes('articolatore') || d.includes('occlusione') || d.includes('supercolori') || d.includes('fusione') || d.includes('ceratura')) return 'altro'
  // Default: protesi_fissa (corona, ponte, elemento ceramica, ecc.)
  return 'protesi_fissa'
}

function parseDMDate(ddmmyy: string): string {
  // DD/MM/YY → YYYY-MM-DD
  const [dd, mm, yy] = ddmmyy.split('/')
  const year = parseInt(yy) >= 90 ? `19${yy}` : `20${yy}`
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

async function main() {
  console.log('🔄 Import Lavori Storici DentalMaster → UÀ')
  console.log(`   Lab: ${LAB_ID}`)
  console.log(`   ${LAVORI_STORICI.length} lavori da importare\n`)

  let ok = 0, skip = 0, err = 0
  let counter = 1

  for (const l of LAVORI_STORICI) {
    const clienteId = CLIENT_MAP[l.dm_cliente]
    if (!clienteId) {
      console.log(`  ⏭️  Skip (cliente DM ${l.dm_cliente} non trovato): ${l.dispositivo}`)
      skip++
      continue
    }

    const dataIngresso = parseDMDate(l.data_ingresso)
    const anno = parseInt(dataIngresso.split('-')[0])
    const dataConsegna = l.data_consegna ? parseDMDate(l.data_consegna) : dataIngresso

    const numeroLavoro = `STOR/${anno}/${String(counter).padStart(3, '0')}`
    counter++

    const { error } = await svc.from('lavori').insert({
      laboratorio_id: LAB_ID,
      numero_lavoro: numeroLavoro,
      anno_lavoro: anno,
      cliente_id: clienteId,
      tipo_dispositivo: mapTipoDispositivo(l.dispositivo),
      descrizione: l.cod_paz ? `${l.dispositivo} — Paz: ${l.cod_paz}` : l.dispositivo,
      stato: 'consegnato' as const,
      priorita: 'normale' as const,
      data_ingresso: dataIngresso,
      data_consegna_prevista: dataConsegna,
      data_consegna_effettiva: dataConsegna,
      classe_rischio: 'classe_iia',
      da_conformare: false,
      conformato: true,
      incluso_in_fattura: l.status === 'Fatturato',
      codice_iva: 'N4',
      natura_iva: 'N4',
      prezzo_unitario: l.importo ?? null,
      note_interne: `IMPORT DentalMaster | Status DM: ${l.status}`,
    })

    if (error) {
      console.error(`  ❌ ${numeroLavoro} — ${l.dispositivo}: ${error.message}`)
      err++
    } else {
      console.log(`  ✅ ${numeroLavoro} | ${l.dm_cliente} | ${l.status} | ${l.dispositivo.substring(0, 40)}`)
      ok++
    }
  }

  console.log(`\n🎉 Lavori storici: ${ok} inseriti | ${skip} skippati | ${err} errori`)
}

main().catch(e => { console.error(e); process.exit(1) })
