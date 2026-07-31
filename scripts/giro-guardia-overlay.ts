/**
 * Il RICAMBIO che rende ripetibile il primo braccio di
 * `scripts/guardia-navigazione-overlay.mjs`: prepara la fixture → lancia la
 * guardia → RIMETTE la riga com'era.
 *
 * Sta qui, e non fra i file usa-e-getta, per una ragione precisa: fino al
 * 03/08/2026 la ricetta della fixture viveva SOLO come due `UPDATE` scritti in un
 * commento, e il primo braccio non era mai stato eseguito. Una procedura che esiste
 * solo come istruzione da copiare a mano è una procedura che nessuno esegue — e i
 * suoi valori invecchiano in silenzio rispetto al dato vero.
 *
 * 🔑 Il ripristino NON usa i valori scritti nella ricetta dello script (che sono
 * un'annotazione del 26/07 e possono essere invecchiati): legge la riga vera
 * subito prima di toccarla e riscrive quei valori. E il `finally` gira comunque,
 * anche se la guardia trova un difetto o esplode.
 *
 * Uso: npx tsx scripts/giro-guardia-overlay.ts
 *      (serve l'app in esecuzione su BASE — di norma una build di produzione su :3020)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const env: Record<string, string> = {}
for (const r of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = r.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

const NUMERO = 'E2E-CAS-002'
const LAB = '00000000-0000-0000-0000-000000000001'
const LAVORO_CON_FOTO = '7dba9a57-15bc-400e-a36f-28440980556f'

function oggiRoma(): string {
  // la stessa data che vede l'app (Europe/Rome), nel formato di una colonna date
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date())
}

async function leggi() {
  const { data, error } = await svc
    .from('lavori')
    .select('id, numero_lavoro, stato, data_consegna_prevista, paziente_id, paziente_nome_snapshot, numero_cassetta')
    .eq('numero_lavoro', NUMERO)
    .eq('laboratorio_id', LAB)
    .single()
  if (error) throw error
  return data
}

async function main() {
  const originale = await leggi()
  console.log("=== com'era PRIMA (questi valori vanno rimessi) ===")
  console.log(JSON.stringify(originale, null, 2))

  const ripristino = `update lavori set stato='${originale.stato}', data_consegna_prevista=${
    originale.data_consegna_prevista ? `'${originale.data_consegna_prevista}'` : 'null'
  } where numero_lavoro='${NUMERO}' and laboratorio_id='${LAB}';`
  console.log(`\n🛟 SE QUESTO PROCESSO MUORE PRIMA DELLA FINE, la riparazione è:\n   ${ripristino}\n`)

  let uscita = -1
  try {
    const { error: errUp } = await svc
      .from('lavori')
      .update({ stato: 'pronto', data_consegna_prevista: oggiRoma() })
      .eq('numero_lavoro', NUMERO)
      .eq('laboratorio_id', LAB)
    if (errUp) throw errUp
    console.log(`✅ fixture applicata: stato='pronto', data_consegna_prevista='${oggiRoma()}'`)
    console.log(JSON.stringify(await leggi(), null, 2))

    console.log('\n=== GUARDIA ===\n')
    // (un percorso passato come primo argomento sostituisce la guardia: serve a provare
    //  una copia strumentata senza toccare l'originale)
    uscita = await new Promise<number>((ris) => {
      const p = spawn('node', [process.argv[2] ?? 'scripts/guardia-navigazione-overlay.mjs'], {
        stdio: 'inherit',
        env: { ...process.env, LAVORO_ID: LAVORO_CON_FOTO, BASE: 'http://localhost:3020' },
      })
      p.on('close', (code) => ris(code ?? -1))
      p.on('error', (e) => {
        console.error('guardia non avviata:', e)
        ris(-1)
      })
    })
    console.log(`\n=== la guardia è uscita con ${uscita} ===`)
  } finally {
    const { error: errGiu } = await svc
      .from('lavori')
      .update({ stato: originale.stato, data_consegna_prevista: originale.data_consegna_prevista })
      .eq('numero_lavoro', NUMERO)
      .eq('laboratorio_id', LAB)
    console.log('\n=== RIPRISTINO ===')
    if (errGiu) console.error('🔴 ripristino FALLITO:', errGiu.message, '\n   rimedio a mano:', ripristino)
    const dopo = await leggi()
    console.log(JSON.stringify(dopo, null, 2))
    const tornato =
      dopo.stato === originale.stato && dopo.data_consegna_prevista === originale.data_consegna_prevista
    console.log(tornato ? "✅ la riga è tornata esattamente com'era" : `🔴 NON è tornata com'era — ${ripristino}`)
  }

  process.exit(uscita === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
