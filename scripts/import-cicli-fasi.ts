/**
 * Import DentalMaster → UÀ — Cicli e Fasi di Produzione
 * Fonte: LISTA CICLI DI PRODUZIONE.pdf + LISTA FASI DI PRODUZIONE.pdf
 *
 * Strategia:
 * 1. Inserisce tutti i cicli produzione da DentalMaster
 * 2. Crea un ciclo "Libreria Fasi" e vi associa tutte le 71 fasi OL
 *    (Filippo potrà poi riorganizzarle per ciclo specifico)
 *
 * USO: npx tsx scripts/import-cicli-fasi.ts
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const LAB_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// ─── Cicli di produzione da DentalMaster ─────────────────────────────────────
const CICLI = [
  { codice: 'Zirc01', nome: 'Corona in zirconia e ceramica', tipo: 'Protesi fissa' },
  { codice: 'StrZ01', nome: 'Struttura in zirconia di un elemento', tipo: 'Protesi fissa' },
  { codice: 'PonteZir', nome: 'Ponte in zirconia-ceramica', tipo: 'Protesi fissa' },
  { codice: 'StrZ02', nome: 'Struttura in zirconia', tipo: 'Protesi fissa' },
  { codice: 'MetCer', nome: 'Metallo ceramica', tipo: 'Protesi fissa' },
  { codice: 'Intarsio', nome: 'Intarsio in ceromer', tipo: 'Protesi fissa' },
  { codice: 'PI', nome: 'Portaimpronte individuale per protesi fissa', tipo: 'Protesi fissa' },
  { codice: 'Provv', nome: 'Provvisorio singolo immediato', tipo: 'Protesi provvisoria' },
  { codice: 'PM.Zr.Dir', nome: 'Perno moncone in zirconia su resina diretta', tipo: 'Protesi fissa' },
  { codice: 'Facc.Cer.Pitt', nome: 'Faccetta in ceramica di pittura', tipo: 'Protesi fissa' },
  { codice: 'Abt.Zr', nome: 'Abutment da calcinabile o da sovrafondibile per zirconia', tipo: 'Protesi fissa' },
  { codice: 'Dima', nome: 'Dima chirurgica per impianti', tipo: 'Protesi fissa' },
  { codice: 'El.fcc.crm.sch', nome: 'Elemento faccetta in Ceromer su scheletro', tipo: 'Protesi mobile' },
  { codice: 'Mss.cr', nome: 'Massone per occlusione su base in cera', tipo: 'Protesi mobile' },
  { codice: 'Mss.rs', nome: 'Massone per occlusione su base in resina', tipo: 'Protesi mobile' },
  { codice: 'Prt.cnm.scn', nome: 'Parte conometrica secondaria su scheletro', tipo: 'Protesi combinata' },
  { codice: 'Frss.prt.fss', nome: 'Fresaggio su parte fissa', tipo: 'Protesi fissa' },
  { codice: 'Tst.fs', nome: 'Testa fusa', tipo: 'Protesi combinata' },
  { codice: 'Provv.sec', nome: 'Provvisorio singolo secondario', tipo: 'Protesi provvisoria' },
  { codice: 'Pnt.provv.sec', nome: 'Ponte provvisorio secondario', tipo: 'Protesi provvisoria' },
  { codice: 'Pnt.provv.Imm', nome: 'Ponte provvisorio immediato', tipo: 'Protesi provvisoria' },
  { codice: 'Pl.Imp', nome: 'Portaimpronte individuale per impianti', tipo: 'Protesi fissa' },
  { codice: 'PM.Zr.Ind', nome: 'Perno moncone in zirconia su resina indiretta', tipo: 'Protesi fissa' },
  { codice: 'PM.Met.Dir', nome: 'Perno moncone in metallo su resina diretta', tipo: 'Protesi fissa' },
  { codice: 'PM.Met.Ind', nome: 'Perno moncone in metallo su resina indiretta', tipo: 'Protesi fissa' },
  { codice: 'Pl.Mob', nome: 'Portaimpronte individuale per protesi mobile', tipo: 'Protesi mobile' },
  { codice: 'Pl.Sch', nome: 'Portaimpronte individuale per protesi scheletrica', tipo: 'Protesi scheletrica' },
  { codice: 'Pl.Comb', nome: 'Portaimpronte individuale per protesi combinata', tipo: 'Protesi combinata' },
  { codice: 'Crn.unt.Zr', nome: 'Corone unite in zirconia-ceramica', tipo: 'Protesi fissa' },
  { codice: 'Crn.unt.Met', nome: 'Corone unite in metallo ceramica', tipo: 'Protesi fissa' },
  { codice: 'P.OT.cap', nome: 'Perno OT-cap', tipo: 'Protesi fissa' },
  { codice: 'Zirc.geng', nome: 'Corona in zirconia-ceramica con massa gengiva', tipo: 'Protesi fissa' },
  { codice: 'PonteZirc.geng', nome: 'Ponte in zirconia-ceramica con massa gengiva', tipo: 'Protesi fissa' },
  { codice: 'P.OT.cap.Rhein', nome: 'Perno OT-cap con perno Rhein', tipo: 'Protesi fissa' },
  { codice: 'MetCer.Marg.Cer', nome: 'Metallo ceramica con chiusura marginale in ceramica', tipo: 'Protesi fissa' },
  { codice: 'Ponte.MeTCer', nome: 'Ponte in metallo ceramica', tipo: 'Protesi fissa' },
  { codice: 'Ponte.', nome: 'Ponte in metallo ceramica con chiusura marginale in ceramica', tipo: 'Protesi fissa' },
  { codice: 'Abt.Met', nome: 'Abutment da calcinabile o da sovrafondibile per metallo', tipo: 'Protesi fissa' },
  { codice: 'Facc.Ceromer', nome: 'Faccetta in ceromer', tipo: 'Protesi fissa' },
  { codice: 'Facc.Cer.Strat', nome: 'Faccetta in ceramica da stratificazione', tipo: 'Protesi fissa' },
  { codice: 'Int.Cer.Strat', nome: 'Intarsio in ceramica da stratificazione', tipo: 'Protesi fissa' },
  { codice: 'Int.Cer.Pitt', nome: 'Intarsio in ceramica di pittura', tipo: 'Protesi fissa' },
  { codice: 'Crn.Ceromer', nome: 'Corona in ceromer', tipo: 'Protesi fissa' },
  { codice: 'Crn.Cer.Strat', nome: 'Corona in ceramica integrale da stratificazione', tipo: 'Protesi fissa' },
  { codice: 'Crn.Cer.Pitt', nome: 'Corona in ceramica integrale di pittura', tipo: 'Protesi fissa' },
  { codice: 'Crn.unt.strat', nome: 'Corone unite in ceramica integrale da stratificazione', tipo: 'Protesi fissa' },
  { codice: 'Crn.unt.pitt', nome: 'Corone unite in ceramica integrale da pittura', tipo: 'Protesi fissa' },
  { codice: 'Crn.avv.met', nome: 'Corona in metallo ceramica avvitata su impianto', tipo: 'Protesi fissa' },
  { codice: 'Pnt.avv.met', nome: 'Ponte in metallo ceramica su impianti', tipo: 'Protesi fissa' },
  { codice: 'Crn.avv.zirc', nome: 'Corona in zirconia-ceramica avvitata su impianto', tipo: 'Protesi fissa' },
  { codice: 'Crn.met.imp', nome: 'Corona metallo-ceramica su impianto', tipo: 'Protesi fissa' },
  { codice: 'Pnt.met.imp', nome: 'Ponte in metallo ceramica su impianti', tipo: 'Protesi fissa' },
  { codice: 'Crn.zirc.imp', nome: 'Corona in zirconia-ceramica su impianto', tipo: 'Protesi fissa' },
  { codice: 'Pnt.zirc.imp', nome: 'Ponte in zirconia-ceramica su impianti', tipo: 'Protesi fissa' },
  { codice: 'Pnt.avv.zirc', nome: 'Ponte in zirconia-ceramica avvitata su impianti', tipo: 'Protesi fissa' },
  { codice: 'Schel.gancio', nome: 'Scheletrato con gancio', tipo: 'Protesi scheletrica' },
  { codice: 'Schel.senza', nome: 'Scheletrato senza ganci', tipo: 'Protesi scheletrica' },
  { codice: 'Rete.rinf', nome: 'Rete di rinforzo', tipo: 'Protesi scheletrica' },
  { codice: 'Placca.pal', nome: 'Placca palatale', tipo: 'Protesi scheletrica' },
  { codice: 'Pro.Tot.Inf.Sup', nome: 'Protesi mobile totale', tipo: 'Protesi mobile' },
  { codice: 'Pro.Mob.Rinf', nome: 'Protesi mobile con struttura di rinforzo', tipo: 'Protesi mobile' },
  { codice: 'Pro.Par', nome: 'Protesi parziale in resina con ganci a filo', tipo: 'Protesi mobile' },
  { codice: 'Pro.Par.Gan.Fuso', nome: 'Protesi parziale in resina con gancio fuso', tipo: 'Protesi scheletrica' },
  { codice: 'Ganc.Fuso', nome: 'Gancio fuso', tipo: 'Protesi scheletrica' },
  { codice: 'Prt.cnm.prm', nome: 'Parte conometrica primaria', tipo: 'Protesi combinata' },
  { codice: 'Pr.Mb.Rinf.Att', nome: 'Protesi mobile combinata con struttura di rinforzo e attacchi', tipo: 'Protesi combinata' },
  { codice: 'Montaggio', nome: 'Montaggio denti su scheletro', tipo: 'Protesi scheletrica' },
  { codice: 'Fre', nome: 'Fresaggio su abutment in titanio', tipo: 'Protesi fissa' },
  { codice: 'Cera', nome: 'Ceratura diagnostica', tipo: 'Protesi fissa' },
  { codice: 'Toronto.Zir', nome: 'Toronto implantbridge in zirconia', tipo: 'Protesi fissa' },
  { codice: 'Toronto.Res', nome: 'Toronto implantbridge in resina e metallo', tipo: 'Protesi fissa' },
  { codice: 'Crn.unt.avv.zirc', nome: 'Corone unite in zirconia-ceramica avvitate su impianto', tipo: 'Protesi fissa' },
  { codice: 'PonteZirInt', nome: 'Ponte in zirconia-ceramica su corona e intarsio', tipo: 'Protesi fissa' },
]

// ─── 71 Fasi di produzione da DentalMaster ────────────────────────────────────
const FASI = [
  { codice: 'OL01', desc: 'Ricevimento impronte o modelli, codifica portaimpronta e controllo prescrizione' },
  { codice: 'OL02', desc: 'Disinfezione' },
  { codice: 'OL03', desc: 'Analisi impronte' },
  { codice: 'OL04', desc: 'Sviluppo modelli' },
  { codice: 'OL05', desc: 'Sviluppo modello master con sistema Accu-Trac' },
  { codice: 'OL06', desc: 'Sviluppo modelli di posizione' },
  { codice: 'OL07', desc: 'Analisi e progettazione' },
  { codice: 'OL08', desc: 'Progettazione tecnica dell\'apparecchio' },
  { codice: 'OL09', desc: 'Analisi rischi' },
  { codice: 'OL10', desc: 'Disegno modelli progettazione' },
  { codice: 'OL11', desc: 'Rifinitura modelli' },
  { codice: 'OL12', desc: 'Taglio e sezionatura del modello master' },
  { codice: 'OL13', desc: 'Rifinitura modelli di posizione' },
  { codice: 'OL14', desc: 'Scontornatura degli elementi preparati' },
  { codice: 'OL15', desc: 'Lucidatura modelli' },
  { codice: 'OL16', desc: 'Codifica modelli' },
  { codice: 'OL17', desc: 'Stesura isolante' },
  { codice: 'OL18', desc: 'Squadratura modelli' },
  { codice: 'OL19', desc: 'Collocamento cera di occlusione' },
  { codice: 'OL20', desc: 'Trasferimento dei modelli in articolatore con piano di occlusione' },
  { codice: 'OL21', desc: 'Trasferimento in articolatore semi individuale' },
  { codice: 'OL22', desc: 'Duplicatura e colatura modello' },
  { codice: 'OL23', desc: 'Modellazione gnatologica in cera' },
  { codice: 'OL24', desc: 'Modellazione in cera-resina' },
  { codice: 'OL25', desc: 'Modellazione degli spessori in cera' },
  { codice: 'OL26', desc: 'Supercolori' },
  { codice: 'OL27', desc: 'Ceratura preliminare' },
  { codice: 'OL28', desc: 'Ceratura finale' },
  { codice: 'OL29', desc: 'Ceratura armatura' },
  { codice: 'OL30', desc: 'Ceratura protesi' },
  { codice: 'OL31', desc: 'Rifinitura e chiusura bordi' },
  { codice: 'OL32', desc: 'Rifinitura e controllo occlusale' },
  { codice: 'OL33', desc: 'Rifinitura resina' },
  { codice: 'OL34', desc: 'Preparazione margine di chiusura' },
  { codice: 'OL35', desc: 'Preparazione post-dam' },
  { codice: 'OL36', desc: 'Modellazione cappucci in cera-resina' },
  { codice: 'OL37', desc: 'Costruzione mascherina in silicone' },
  { codice: 'OL38', desc: 'Costruzione mascherina in gesso' },
  { codice: 'OL39', desc: 'Riposizionamento denti nella mascherina' },
  { codice: 'OL40', desc: 'Costruzione mascherina in resina' },
  { codice: 'OL41', desc: 'Preparazione dosi resina ed impasto' },
  { codice: 'OL42', desc: 'Iniezione resina per provvisori' },
  { codice: 'OL43', desc: 'Zeppatura resina a caldo' },
  { codice: 'OL44', desc: 'Zeppatura resina a freddo' },
  { codice: 'OL45', desc: 'Polimerizzazione provvisori' },
  { codice: 'OL46', desc: 'Polimerizzazione protesi' },
  { codice: 'OL47', desc: 'Polimerizzazione in acqua a 40° per 15 min e 3,5 ATM' },
  { codice: 'OL48', desc: 'Polimerizzazione resina a caldo in acqua da t. amb. a 100°C (tenuta per 45min)' },
  { codice: 'OL49', desc: 'Rifinitura provvisori' },
  { codice: 'OL50', desc: 'Imperniatura e allestimento cilindro' },
  { codice: 'OL51', desc: 'Allestimento canale di colata e riserva' },
  { codice: 'OL52', desc: 'Colatura rivestimento' },
  { codice: 'OL53', desc: 'Preriscaldo cilindro' },
  { codice: 'OL54', desc: 'Fusione con preriscaldo lento' },
  { codice: 'OL55', desc: 'Fusione con preriscaldo veloce' },
  { codice: 'OL56', desc: 'Smuffolatura' },
  { codice: 'OL57', desc: 'Smuffol. e pulitura' },
  { codice: 'OL58', desc: 'Sabbiatura' },
  { codice: 'OL59', desc: 'Sabbiatura con silano' },
  { codice: 'OL60', desc: 'Analisi fusione' },
  { codice: 'OL61', desc: 'Taglio perni di fusione' },
  { codice: 'OL62', desc: 'Adattamento fusione e rifinitura' },
  { codice: 'OL63', desc: 'Messa in muffola' },
  { codice: 'OL64', desc: 'Messa in muffola Trasformer' },
  { codice: 'OL65', desc: 'Fissaggio parti Trasformer' },
  { codice: 'OL66', desc: 'Modellazione scheletro in cera-resina' },
  { codice: 'OL67', desc: 'Modellazione placca in cera per montaggio denti' },
  { codice: 'OL68', desc: 'Modellazione foglio cera per porta impronta individuale' },
  { codice: 'OL69', desc: 'Modellazione provvisorio su modello prelimatura' },
  { codice: 'OL70', desc: 'Modellazione gancio in cera-resina' },
  { codice: 'OL71', desc: 'Modellazione gancio a filo' },
]

async function main() {
  console.log('🔄 Import Cicli e Fasi di Produzione DentalMaster → UÀ')
  console.log(`   Lab: ${LAB_ID}`)

  // 1. Inserisci cicli di produzione
  console.log(`\n📦 Import ${CICLI.length} cicli di produzione...`)
  let cicliOk = 0, cicliSkip = 0
  for (const c of CICLI) {
    const { error } = await svc.from('cicli_produzione').insert({
      laboratorio_id: LAB_ID,
      codice: c.codice,
      nome: c.nome,
      tipo_dispositivo: c.tipo,
      attivo: true,
    })
    if (error) {
      if (error.code === '23505') { cicliSkip++; continue } // duplicate
      console.error(`  ❌ Ciclo ${c.codice}: ${error.message}`)
    } else { cicliOk++ }
  }
  console.log(`  ✅ Cicli inseriti: ${cicliOk} | Già presenti: ${cicliSkip}`)

  // 2. Crea ciclo "Libreria Fasi" se non esiste
  console.log('\n📚 Crea ciclo "Libreria Fasi OL"...')
  let libreriaId: string

  const { data: existing } = await svc
    .from('cicli_produzione')
    .select('id')
    .eq('laboratorio_id', LAB_ID)
    .eq('codice', 'LIBRERIA_OL')
    .maybeSingle()

  if (existing) {
    libreriaId = existing.id
    console.log('  ℹ️  Libreria già esistente')
  } else {
    const { data: libreria, error } = await svc.from('cicli_produzione').insert({
      laboratorio_id: LAB_ID,
      codice: 'LIBRERIA_OL',
      nome: 'Libreria Fasi DentalMaster (OL01-OL71)',
      tipo_dispositivo: 'Riferimento',
      attivo: true,
    }).select('id').single()
    if (error || !libreria) { console.error('❌ Errore creazione libreria:', error?.message); process.exit(1) }
    libreriaId = libreria.id
    console.log(`  ✅ Libreria creata: ${libreriaId}`)
  }

  // 3. Inserisci fasi collegate alla libreria
  console.log(`\n⚙️  Import ${FASI.length} fasi di produzione...`)
  let fasiOk = 0, fasiSkip = 0
  for (let i = 0; i < FASI.length; i++) {
    const f = FASI[i]
    const { error } = await svc.from('fasi_produzione').insert({
      laboratorio_id: LAB_ID,
      ciclo_id: libreriaId,
      codice_fase: f.codice,
      descrizione: f.desc,
      ordine: i + 1,
      obbligatoria: true,
    })
    if (error) {
      if (error.code === '23505') { fasiSkip++; continue }
      console.error(`  ❌ Fase ${f.codice}: ${error.message}`)
    } else { fasiOk++ }
  }
  console.log(`  ✅ Fasi inserite: ${fasiOk} | Già presenti: ${fasiSkip}`)

  console.log('\n🎉 Import completato!')
  console.log('   Nota: Le fasi sono nella "Libreria Fasi OL". Filippo può riassegnarle ai cicli specifici.')
}

main().catch(e => { console.error(e); process.exit(1) })
