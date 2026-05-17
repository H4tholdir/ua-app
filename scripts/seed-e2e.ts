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
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

    console.log('\n✅  Seed completato.\n')
    console.log('📝  Aggiungi queste variabili a .env.test (o alla tua configurazione test):\n')
    console.log(`E2E_LAB_ID=${E2E_LAB_ID}`)
    console.log(`E2E_CLIENT_ID=${E2E_CLIENT_ID}`)
    console.log(`E2E_LAV_ID=${E2E_LAV_ID}`)
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
