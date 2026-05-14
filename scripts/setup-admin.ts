/**
 * Script one-shot: crea il primo admin Francesco Formicola.
 * Eseguire UNA SOLA VOLTA: npx tsx scripts/setup-admin.ts
 *
 * Cosa fa:
 * 1. Crea laboratorio "UÀ HQ" (lab admin interno)
 * 2. Crea/invita l'utente francesco.formicola@live.it via Supabase Admin API
 * 3. Crea il record utenti con ruolo admin_sistema
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nel .env.local')
  process.exit(1)
}

const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ADMIN_EMAIL = 'francesco.formicola@live.it'
const ADMIN_NOME  = 'Francesco'
const ADMIN_COGNOME = 'Formicola'

async function run() {
  console.log('🚀  Setup admin UÀ\n')

  // 1. Crea lab admin se non esiste già
  const { data: existingLab } = await svc
    .from('laboratori')
    .select('id')
    .eq('nome', 'UÀ HQ')
    .maybeSingle()

  let labId: string

  if (existingLab) {
    labId = existingLab.id
    console.log(`✅  Lab "UÀ HQ" già esistente → ${labId}`)
  } else {
    const { data: newLab, error: labErr } = await svc
      .from('laboratori')
      .insert({
        nome: 'UÀ HQ',
        ragione_sociale: 'UÀ S.r.l.',
        partita_iva: '00000000000',
        stato: 'attivo',
        piano: 'lab',
      })
      .select('id')
      .single()

    if (labErr || !newLab) {
      console.error('❌  Errore creazione lab:', labErr?.message)
      process.exit(1)
    }
    labId = newLab.id
    console.log(`✅  Lab "UÀ HQ" creato → ${labId}`)
  }

  // 2. Controlla se l'utente auth esiste già
  const { data: existingUsers } = await svc.auth.admin.listUsers()
  const existingUser = existingUsers?.users.find(u => u.email === ADMIN_EMAIL)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    console.log(`✅  Utente auth già esistente → ${userId}`)
  } else {
    // Crea utente con password temporanea — dovrà fare reset password al primo accesso
    const { data: newUser, error: userErr } = await svc.auth.admin.createUser({
      email: ADMIN_EMAIL,
      email_confirm: true,
      user_metadata: { nome: ADMIN_NOME, cognome: ADMIN_COGNOME },
    })

    if (userErr || !newUser?.user) {
      console.error('❌  Errore creazione utente auth:', userErr?.message)
      process.exit(1)
    }
    userId = newUser.user.id
    console.log(`✅  Utente auth creato → ${userId}`)
    console.log(`📧  Email: ${ADMIN_EMAIL}`)
    console.log(`⚠️   Nessuna password impostata — il link di reset verrà inviato`)
  }

  // 3. Crea record utenti con ruolo admin_sistema (upsert idempotente)
  const { error: utentiErr } = await svc
    .from('utenti')
    .upsert({
      id: userId,
      laboratorio_id: labId,
      nome: ADMIN_NOME,
      cognome: ADMIN_COGNOME,
      email: ADMIN_EMAIL,
      ruolo: 'admin_sistema',
    }, { onConflict: 'id' })

  if (utentiErr) {
    console.error('❌  Errore creazione record utenti:', utentiErr.message)
    process.exit(1)
  }
  console.log(`✅  Record utenti creato → ruolo: admin_sistema`)

  // 4. Invia magic link per il primo accesso
  const { error: magicErr } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email: ADMIN_EMAIL,
  })

  if (magicErr) {
    console.warn(`⚠️   Magic link non inviato: ${magicErr.message}`)
    console.log(`    → Usa "Forgot password" su /forgot-password per impostare la password`)
  } else {
    console.log(`📧  Magic link inviato a ${ADMIN_EMAIL}`)
  }

  console.log('\n✅  Setup completato.')
  console.log(`\n📋  Riepilogo:`)
  console.log(`    Email admin: ${ADMIN_EMAIL}`)
  console.log(`    Lab ID:      ${labId}`)
  console.log(`    User ID:     ${userId}`)
  console.log(`    Ruolo:       admin_sistema`)
  console.log(`\n🔑  Vai su http://localhost:3000/forgot-password per impostare la password,`)
  console.log(`    oppure usa il magic link inviato via email.`)
  console.log(`\n    Dopo l'accesso: http://localhost:3000/admin/labs`)
}

run().catch(err => {
  console.error('❌  Errore inatteso:', err)
  process.exit(1)
})
