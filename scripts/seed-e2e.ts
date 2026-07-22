/**
 * Script idempotente per seeding fixture E2E.
 *
 * Uso: npx tsx scripts/seed-e2e.ts
 *
 * Cosa fa:
 * 1. Crea laboratorio test (idempotente)
 * 2. Crea cliente/dentista test (idempotente)
 * 3. Crea lavorazioni nel listino test (idempotente)
 * 4. Stampa variabili da aggiungere a .env.test
 *
 * È idempotente: usa upsert con onConflict → rieseguire non crea duplicati.
 * I test E2E usano questi IDs per popolare i dati e garantire coerenza su tenant puliti.
 */
import 'dotenv/config'
// Fallback additivo su .env.local: nel repo esiste solo .env.local (convenzione Next.js),
// non un .env — dotenv/config da solo non troverebbe le chiavi. `config()` NON sovrascrive
// le variabili già presenti in process.env, quindi resta un layer inferiore e sicuro.
// (Assume cwd = root del repo, come tutti gli script in scripts/.)
import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
// Connessione diretta come ruolo `postgres` (owner delle funzioni): serve SOLO per
// public.cassette_purge_lab, la cui EXECUTE è revocata anche a service_role
// (20260721090100_admin_delete_laboratorio_cassette.sql:102). Via PostgREST/service_role
// darebbe 42501: l'unico chiamante legittimo è l'owner (o admin_delete_laboratorio).
const DB_URL = process.env.SUPABASE_DB_URL!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nel .env.local')
  console.error('    Questo script richiede credenziali di servizio Supabase per popolare i dati test.')
  process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// IDs fissi per E2E testing (namespace test: 00000000-0000-0000-0000-XXXXXXXX)
const E2E_LAB_ID = '00000000-0000-0000-0000-000000000001'
const E2E_CLIENT_ID = '00000000-0000-0000-0000-000000000003'
const E2E_LAV_ID = '00000000-0000-0000-0000-000000000010'

// Lavori della fixture Parete delle Cassette (Task 19). Namespace 003X per non collidere.
const E2E_LAVORO_OCC_1 = '00000000-0000-0000-0000-000000000030' // occupa una cassetta (protesi_fissa → corona)
const E2E_LAVORO_OCC_2 = '00000000-0000-0000-0000-000000000031' // occupa una cassetta (protesi_mobile → totale)
const E2E_LAVORO_CONSEGNATO = '00000000-0000-0000-0000-000000000032' // storico chiuso liberato_per='consegna'

/**
 * Purga le tabelle della Parete per il solo lab E2E, via connessione diretta come ruolo
 * `postgres` (owner). `cassette_lavori` è append-only: il trigger rifiuta ogni DELETE, e
 * l'unico varco è la deroga transaction-local che public.cassette_purge_lab apre per quel lab.
 * Il UUID è un letterale hardcoded (non input utente) → query senza parametri: evita il
 * protocollo esteso di node-postgres sul transaction pooler (6543), zero superficie d'iniezione.
 */
async function purgeCassetteLab(): Promise<Record<string, number>> {
  if (!DB_URL) {
    throw new Error(
      'SUPABASE_DB_URL mancante: serve per chiamare cassette_purge_lab come owner ' +
        '(service_role non ha EXECUTE su quella funzione).'
    )
  }
  const pg = new PgClient({ connectionString: DB_URL })
  await pg.connect()
  try {
    const res = await pg.query(
      `SELECT public.cassette_purge_lab('${E2E_LAB_ID}'::uuid) AS counts`
    )
    return res.rows[0]?.counts ?? {}
  } finally {
    await pg.end()
  }
}

/**
 * Ogni scrittura della Parete passa da una RPC che ritorna {esito: '…'} con error: null.
 * Un esito ≠ 'ok' significa fixture malformata: va trattato come fallimento, mai ignorato.
 */
type RpcOk = { esito: string; [k: string]: unknown }
async function callRpc(fn: string, args: Record<string, unknown>): Promise<RpcOk> {
  const { data, error } = await svc.rpc(fn, args)
  if (error) {
    throw new Error(`RPC ${fn} errore: ${error.message} (code ${error.code ?? '—'})`)
  }
  const payload = data as RpcOk | null
  // 'ok' è l'unico esito di successo per crea/assegna/libera usati dal seed.
  if (!payload || payload.esito !== 'ok') {
    throw new Error(`RPC ${fn} esito inatteso: ${JSON.stringify(data)}`)
  }
  return payload
}

async function seed() {
  console.log('🌱  Seeding E2E fixtures...\n')

  try {
    // 1. Crea laboratorio test (idempotente)
    console.log('📦  Creando laboratorio test...')
    const { error: labErr } = await svc
      .from('laboratori')
      .upsert(
        {
          id: E2E_LAB_ID,
          nome: 'Lab Test E2E',
          partita_iva: '12345678901',
          codice_itca: 'ITCA01000001',
          piano: 'lab',
          stato: 'attivo',
          stripe_customer_id: 'cus_test',
        },
        { onConflict: 'id' }
      )

    if (labErr) {
      console.error('❌  Errore creazione laboratorio:', labErr.message)
      process.exit(1)
    }
    console.log(`✅  Laboratorio creato/aggiornato → ${E2E_LAB_ID}`)

    // 2. Crea cliente (dentista) test (idempotente)
    console.log('👥  Creando cliente test...')
    const { error: clientErr } = await svc
      .from('clienti')
      .upsert(
        {
          id: E2E_CLIENT_ID,
          laboratorio_id: E2E_LAB_ID,
          nome: 'Mario',
          cognome: 'Bianchi',
          studio_nome: 'Studio Bianchi',
          partita_iva: '98765432101',
          listino_numero: 1,
        },
        { onConflict: 'id' }
      )

    if (clientErr) {
      console.error('❌  Errore creazione cliente:', clientErr.message)
      process.exit(1)
    }
    console.log(`✅  Cliente creato/aggiornato → ${E2E_CLIENT_ID}`)

    // 3. Crea lavorazione nel listino test (idempotente)
    console.log('📋  Creando lavorazione listino...')

    const { error: lavErr } = await svc
      .from('listino')
      .upsert(
        {
          id: E2E_LAV_ID,
          laboratorio_id: E2E_LAB_ID,
          codice: 'TEST001',
          nome: 'Corona ceramica test',
          descrizione: 'Corona ceramica test',
          prezzo_1: 110.00,
          categoria: 'protesi_fissa',
        },
        { onConflict: 'id' }
      )

    if (lavErr) {
      console.error('❌  Errore creazione lavorazione:', lavErr.message)
      process.exit(1)
    }
    console.log(`✅  Lavorazione creata/aggiornata → ${E2E_LAV_ID}`)

    // 3b. Crea articolo magazzino sotto scorta minima (per QA /ordini, B16)
    console.log('📦  Creando articolo magazzino sotto scorta minima...')
    const E2E_MAGAZZINO_ID = '00000000-0000-0000-0000-000000000020'
    const { error: magazzinoErr } = await svc
      .from('magazzino')
      .upsert(
        {
          id: E2E_MAGAZZINO_ID,
          laboratorio_id: E2E_LAB_ID,
          codice_articolo: 'TEST-MAG-001',
          nome: 'Gesso tipo IV test',
          scorta_attuale: 2,
          scorta_minima: 5,
          um_acquisto: 'Kg',
          um_scarico: 'g',
          attivo: true,
        },
        { onConflict: 'id' }
      )

    if (magazzinoErr) {
      console.error('❌  Errore creazione articolo magazzino:', magazzinoErr.message)
      process.exit(1)
    }
    console.log(`✅  Articolo magazzino creato/aggiornato → ${E2E_MAGAZZINO_ID}`)

    // 4. Crea utenti E2E per i 3 ruoli dashboard (idempotente via email unica)
    console.log('\n👤  Creando utenti E2E per dashboard RBAC...')

    const dashboardUsers = [
      { email: 'e2e-titolare@ua-test.local', password: 'TestE2E!2026', ruolo: 'titolare' },
      { email: 'e2e-tecnico@ua-test.local',  password: 'TestE2E!2026', ruolo: 'tecnico' },
      { email: 'e2e-frontdesk@ua-test.local',password: 'TestE2E!2026', ruolo: 'front_desk' },
    ]

    for (const u of dashboardUsers) {
      // Crea o recupera utente auth
      const { data: existing } = await svc.auth.admin.listUsers()
      const existingUser = existing?.users?.find(x => x.email === u.email)

      let uid: string

      if (existingUser) {
        uid = existingUser.id
        console.log(`  ↩️  Utente già esistente: ${u.email} → ${uid}`)
      } else {
        const { data: newUser, error: userErr } = await svc.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
        })
        if (userErr || !newUser.user) {
          console.error(`  ❌  Errore creazione utente ${u.email}:`, userErr?.message)
          continue
        }
        uid = newUser.user.id
        console.log(`  ✅  Utente creato: ${u.email} → ${uid}`)
      }

      // Crea o aggiorna profilo in tabella utenti
      const { error: profileErr } = await svc
        .from('utenti')
        .upsert(
          {
            id: uid,
            laboratorio_id: E2E_LAB_ID,
            email: u.email,
            nome: `Test`,
            cognome: u.ruolo,
            ruolo: u.ruolo,
          },
          { onConflict: 'id' }
        )

      if (profileErr) {
        console.error(`  ❌  Errore profilo utente ${u.ruolo}:`, profileErr.message)
      } else {
        console.log(`  ✅  Profilo ${u.ruolo} aggiornato`)
      }
    }

    // 5. Parete delle Cassette (Task 19) — deterministica per il lab E2E.
    //    Idempotente: purge scoped al lab (unico modo, cassette_lavori è append-only) → ricrea.
    console.log('\n🗄️  Seeding Parete delle Cassette (lab E2E)...')

    // 5a. Reset: cassette + storico + audit del lab E2E, via cassette_purge_lab (owner).
    const purged = await purgeCassetteLab()
    console.log(`  🧹  Purga cassette lab E2E → ${JSON.stringify(purged)}`)

    // 5b. Lavori della fixture. I 3 nascono APERTI (in_lavorazione, numero_cassetta NULL) così
    //     assegna/libera possono operare; il consegnato passa a 'consegnato' DOPO la liberazione.
    //     upsert su id fisso → rieseguibile senza duplicati.
    const lavoriFixture = [
      { id: E2E_LAVORO_OCC_1, numero_lavoro: 'E2E-CAS-001', descrizione: 'Corona su 24 (fixture cassette)', tipo_dispositivo: 'protesi_fissa' },
      { id: E2E_LAVORO_OCC_2, numero_lavoro: 'E2E-CAS-002', descrizione: 'Protesi totale sup. (fixture cassette)', tipo_dispositivo: 'protesi_mobile' },
      { id: E2E_LAVORO_CONSEGNATO, numero_lavoro: 'E2E-CAS-003', descrizione: 'Corona consegnata (scenario annullo)', tipo_dispositivo: 'protesi_fissa' },
    ]
    console.log('  📋  Creando lavori aperti della fixture...')
    const { error: lavoriErr } = await svc.from('lavori').upsert(
      lavoriFixture.map((l) => ({
        id: l.id,
        laboratorio_id: E2E_LAB_ID,
        cliente_id: E2E_CLIENT_ID,
        numero_lavoro: l.numero_lavoro,
        descrizione: l.descrizione,
        tipo_dispositivo: l.tipo_dispositivo,
        data_consegna_prevista: '2026-12-31',
        stato: 'in_lavorazione',
        numero_cassetta: null,
      })),
      { onConflict: 'id' }
    )
    if (lavoriErr) {
      console.error('  ❌  Errore creazione lavori fixture:', lavoriErr.message)
      process.exit(1)
    }
    console.log(`  ✅  ${lavoriFixture.length} lavori fixture creati/aggiornati`)

    // 5c. 6 cassette, colori misti incluso un hex custom (MAIUSCOLO, come impone il CHECK
    //     `^#[0-9A-F]{6}$`). Nome esplicito → cassetta_crea_atomica lo usa così com'è.
    const cassetteFixture = [
      { nome: 'C1', colore: 'azzurra' },
      { nome: 'C2', colore: 'rossa' },
      { nome: 'C3', colore: 'verde' },
      { nome: 'C4', colore: 'grigia' },
      { nome: 'C5', colore: '#7C3AED' }, // hex custom
      { nome: 'Banco Ciro', colore: 'blu' },
    ]
    console.log('  🎨  Creando 6 cassette (colori misti + 1 hex custom)...')
    const cassetteId: Record<string, string> = {}
    for (const c of cassetteFixture) {
      const res = await callRpc('cassetta_crea_atomica', {
        p_lab: E2E_LAB_ID,
        p_nome: c.nome,
        p_colore: c.colore,
      })
      const cass = res.cassetta as { id: string; nome: string }
      cassetteId[c.nome] = cass.id
      console.log(`    ✅  ${c.nome} (${c.colore}) → ${cass.id}`)
    }

    // 5d. 2 cassette occupate da lavori aperti (C1 e C3).
    console.log('  🔗  Occupando 2 cassette con lavori aperti...')
    await callRpc('cassetta_assegna_atomica', {
      p_lab: E2E_LAB_ID,
      p_lavoro: E2E_LAVORO_OCC_1,
      p_cassetta_id: cassetteId['C1'],
    })
    await callRpc('cassetta_assegna_atomica', {
      p_lab: E2E_LAB_ID,
      p_lavoro: E2E_LAVORO_OCC_2,
      p_cassetta_id: cassetteId['C3'],
    })
    console.log('    ✅  C1 ← E2E-CAS-001 · C3 ← E2E-CAS-002')

    // 5e. 1 riga storico chiusa (liberato_per='consegna') su «Banco Ciro» — che resta LIBERA:
    //     è la precondizione dello scenario annullo-consegna → cassetta_riassegna_post_annullo
    //     restituisce `riassegnata` solo se la cassetta storica è ancora libera (non occupata).
    console.log('  📦  Storico chiuso (consegna) su «Banco Ciro» per lo scenario annullo...')
    await callRpc('cassetta_assegna_atomica', {
      p_lab: E2E_LAB_ID,
      p_lavoro: E2E_LAVORO_CONSEGNATO,
      p_cassetta_id: cassetteId['Banco Ciro'],
    })
    await callRpc('cassetta_libera_atomica', {
      p_lab: E2E_LAB_ID,
      p_lavoro: E2E_LAVORO_CONSEGNATO,
      p_motivo: 'consegna',
    })
    // il lavoro passa a 'consegnato' (stato di partenza reale dello scenario di annullo)
    const { error: consErr } = await svc
      .from('lavori')
      .update({ stato: 'consegnato' })
      .eq('id', E2E_LAVORO_CONSEGNATO)
      .eq('laboratorio_id', E2E_LAB_ID)
    if (consErr) {
      console.error('  ❌  Errore stato consegnato:', consErr.message)
      process.exit(1)
    }
    console.log('    ✅  «Banco Ciro» libera · storico consegna · lavoro consegnato')

    // 5f. Prova dell'end-state (idempotenza = stesso stato finale, non «girato due volte»).
    const [{ count: cassetteVive }, { count: viveOccupate }, { count: storicoConsegna }] =
      await Promise.all([
        svc.from('cassette').select('*', { count: 'exact', head: true })
          .eq('laboratorio_id', E2E_LAB_ID).is('deleted_at', null),
        svc.from('cassette_lavori').select('*', { count: 'exact', head: true })
          .eq('laboratorio_id', E2E_LAB_ID).is('liberato_at', null),
        svc.from('cassette_lavori').select('*', { count: 'exact', head: true })
          .eq('laboratorio_id', E2E_LAB_ID).eq('liberato_per', 'consegna'),
      ])
    console.log(
      `  📊  End-state: cassette vive=${cassetteVive} · occupate=${viveOccupate} · storico consegna=${storicoConsegna}`
    )
    if (cassetteVive !== 6 || viveOccupate !== 2 || storicoConsegna !== 1) {
      console.error('  ❌  End-state Parete inatteso (atteso 6/2/1). Fixture incoerente.')
      process.exit(1)
    }
    console.log('  ✅  Parete delle Cassette coerente (6 vive · 2 occupate · 1 storico consegna)')

    console.log('\n✅  Seed completato.\n')
    console.log('📝  Aggiungi queste variabili a .env.test (o alla tua configurazione test):\n')
    console.log(`E2E_LAB_ID=${E2E_LAB_ID}`)
    console.log(`E2E_CLIENT_ID=${E2E_CLIENT_ID}`)
    console.log(`E2E_LAV_ID=${E2E_LAV_ID}`)
    console.log(`E2E_MAGAZZINO_ID=${E2E_MAGAZZINO_ID}`)
    console.log('# Lavori fixture Parete delle Cassette')
    console.log(`E2E_LAVORO_OCC_1=${E2E_LAVORO_OCC_1}`)
    console.log(`E2E_LAVORO_OCC_2=${E2E_LAVORO_OCC_2}`)
    console.log(`E2E_LAVORO_CONSEGNATO=${E2E_LAVORO_CONSEGNATO}`)
    console.log('')
    console.log('# Credenziali dashboard RBAC (password comune: TestE2E!2026)')
    console.log('E2E_TITOLARE_EMAIL=e2e-titolare@ua-test.local')
    console.log('E2E_TITOLARE_PASSWORD=TestE2E!2026')
    console.log('E2E_TECNICO_EMAIL=e2e-tecnico@ua-test.local')
    console.log('E2E_TECNICO_PASSWORD=TestE2E!2026')
    console.log('E2E_FRONTDESK_EMAIL=e2e-frontdesk@ua-test.local')
    console.log('E2E_FRONTDESK_PASSWORD=TestE2E!2026')
    console.log('')
    console.log('💡  I tuoi test E2E possono ora usare questi IDs per query deterministiche.')

  } catch (err) {
    console.error('❌  Errore inatteso:', err)
    process.exit(1)
  }
}

seed().catch(err => {
  console.error('❌  Errore inatteso:', err)
  process.exit(1)
})
