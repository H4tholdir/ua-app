/** SALVATAGGIO DELL'ARCHIVIO DEI FILE — la metà che il database non contiene.
 *
 *  🔑 PERCHÉ ESISTE: il salvataggio del database copia righe, non file. I
 *  contratti in PDF che i dentisti firmano e le FOTO CLINICHE dei pazienti
 *  stanno nell'archivio di Supabase, e un ripristino del solo database li
 *  lascerebbe fuori. Misurato provando il ripristino il 04/08/2026.
 *
 *  Uso:  npx tsx scripts/salvataggio-archivio.ts <cartella di destinazione>
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'

const env: Record<string, string> = {}
for (const r of readFileSync(resolve(process.cwd(), '.env.local'), 'utf8').split('\n')) {
  const m = r.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const DEST = process.argv[2]
if (!DEST) { console.error('🛑 manca la cartella di destinazione'); process.exit(1) }

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

/** L'elenco dei file non arriva in un colpo: si scende cartella per cartella. */
async function elenca(secchio: string, prefisso = ''): Promise<string[]> {
  const trovati: string[] = []
  const { data, error } = await svc.storage.from(secchio).list(prefisso, { limit: 1000 })
  if (error) throw new Error(`${secchio}/${prefisso}: ${error.message}`)
  for (const v of data ?? []) {
    const percorso = prefisso ? `${prefisso}/${v.name}` : v.name
    // una "cartella" non ha metadati: si riconosce da lì, non dal nome
    if (v.id === null) trovati.push(...await elenca(secchio, percorso))
    else trovati.push(percorso)
  }
  return trovati
}

async function main() {
  const { data: secchi, error } = await svc.storage.listBuckets()
  if (error) throw error
  mkdirSync(DEST, { recursive: true })

  let totale = 0
  let byte = 0
  const inventario: { secchio: string; percorso: string; byte: number }[] = []

  for (const s of secchi ?? []) {
    const percorsi = await elenca(s.name)
    for (const p of percorsi) {
      const { data: blob, error: e } = await svc.storage.from(s.name).download(p)
      if (e || !blob) { console.error(`  🛑 non scaricato: ${s.name}/${p} — ${e?.message}`); continue }
      const buf = Buffer.from(await blob.arrayBuffer())
      const dove = join(DEST, s.name, p)
      mkdirSync(dirname(dove), { recursive: true })
      writeFileSync(dove, buf)
      inventario.push({ secchio: s.name, percorso: p, byte: buf.length })
      totale++; byte += buf.length
    }
    console.log(`     ${s.name}: ${percorsi.length} file`)
  }

  // 🔑 L'inventario serve al RIPRISTINO: dice dove ogni file deve tornare.
  writeFileSync(join(DEST, 'inventario.json'), JSON.stringify(inventario, null, 2))
  console.log(`  ✅ archivio: ${totale} file, ${(byte / 1024 / 1024).toFixed(1)} MB`)
  if (totale === 0) { console.error('  🛑 ZERO file scaricati — non fidarsene'); process.exit(1) }
}

main().catch((e) => { console.error(e); process.exit(1) })
