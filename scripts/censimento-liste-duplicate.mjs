// Censimento delle LISTE SCRITTE PIÙ VOLTE in src/.
//
// 🔧 SI LANCIA A MANO — non è agganciato al commit e non è una guardia:
//    `node scripts/censimento-liste-duplicate.mjs src`
//    Non sa distinguere una copia pericolosa da una innocua: quello lo fa chi
//    legge, col criterio qui sotto. Agganciarlo al pre-commit lo renderebbe un
//    allarme che suona sempre, e un allarme che suona sempre non avvisa più.
//
// 🔑 IL CRITERIO CHE SEPARA LE COPIE, e non è un'opinione (05/08/2026):
//    **una copia è pericolosa quando la divergenza è SILENZIOSA.** In pratica:
//    l'array che gira a runtime porta un'annotazione che lo lega alla union?
//      const VALID_STATES: LaboStatoValue[] = [...]  → PROTETTA (divergere = errore di compilazione)
//      const METODI_VALIDI = [...]                   → LIBERA   (divergere = niente, e il buco non si vede)
//    ⚠️ Attenzione al terzo caso, il più insidioso: una protezione che nasce
//    PER RIMBALZO (un `Record<Union, string>` accanto che pretende una chiave
//    per membro) non è una rete — difende sé stessa, e smette il giorno in cui
//    quella struttura cambia per un motivo qualsiasi. Storia: il difetto
//    `type Campo` chiuso il 05/08/2026.
//
// 📌 ESITO DEL PRIMO GIRO (05/08/2026, 635 file): **14 gruppi** con lo stesso
//    contenuto in più file. Classificazione e destinazione:
//    `docs/roadmap/2026-08-05-censimento-liste-duplicate.md`.
//    Falsi positivi noti e da NON riaprire: `PageProps` (5) e `RouteContext`
//    (33) sono boilerplate per-file che descrive parametri DIVERSI, non una
//    regola in molte copie.
// Cerca due forme, e la seconda è quella che un grep per nome NON trova:
//   ① stesso NOME di tipo definito in file diversi
//   ② stesso CONTENUTO (union di stringhe letterali, o array `as const`) in
//      file diversi, ANCHE con nomi diversi.
// Il criterio di «copia» è il contenuto normalizzato: membri ordinati, spazi e
// virgolette tolti. Due liste identiche in due file sono una regola in due copie.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const RADICE = process.argv[2] ?? 'src'
const file = []
;(function cammina(dir) {
  for (const voce of readdirSync(dir)) {
    const p = join(dir, voce)
    if (statSync(p).isDirectory()) cammina(p)
    else if (/\.tsx?$/.test(p)) file.push(p)
  }
})(RADICE)

const perNome = new Map()      // nome -> [{file, riga, corpo}]
const perContenuto = new Map() // contenuto normalizzato -> [{file, riga, nome, tipo}]

function normalizza(membri) {
  return membri
    .map((m) => m.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter(Boolean)
    .sort()
    .join('|')
}

for (const f of file) {
  const testo = readFileSync(f, 'utf8')
  const righe = testo.split('\n')
  righe.forEach((riga, i) => {
    // ① type NOME = ... (su una riga)
    const t = riga.match(/^\s*(?:export\s+)?type\s+([A-Za-z0-9_]+)\s*=\s*(.+?)\s*$/)
    if (t) {
      const [, nome, corpo] = t
      if (!perNome.has(nome)) perNome.set(nome, [])
      perNome.get(nome).push({ file: relative('.', f), riga: i + 1, corpo })
      // union di stringhe letterali: almeno DUE membri fra virgolette
      const letterali = corpo.match(/'[^']+'/g)
      if (letterali && letterali.length >= 2) {
        const chiave = normalizza(letterali)
        if (!perContenuto.has(chiave)) perContenuto.set(chiave, [])
        perContenuto.get(chiave).push({ file: relative('.', f), riga: i + 1, nome, tipo: 'union' })
      }
    }
    // ② const NOME = ['a','b',...] (as const o no), su una riga
    const c = riga.match(/^\s*(?:export\s+)?const\s+([A-Za-z0-9_]+)(?::[^=]+)?\s*=\s*\[(.+?)\]/)
    if (c) {
      const [, nome, dentro] = c
      const letterali = dentro.match(/'[^']+'/g)
      if (letterali && letterali.length >= 2) {
        const chiave = normalizza(letterali)
        if (!perContenuto.has(chiave)) perContenuto.set(chiave, [])
        perContenuto.get(chiave).push({ file: relative('.', f), riga: i + 1, nome, tipo: 'array' })
      }
    }
  })
}

console.log(`File esaminati: ${file.length}\n`)

console.log('═══ ① STESSO NOME DI TIPO IN PIÙ FILE ═══')
let n1 = 0
for (const [nome, occorrenze] of perNome) {
  const files = new Set(occorrenze.map((o) => o.file))
  if (files.size < 2) continue
  const corpiUnici = new Set(occorrenze.map((o) => o.corpo.replace(/\s+/g, '')))
  const identici = corpiUnici.size === 1
  n1++
  console.log(`\n${identici ? '🔴 IDENTICI' : '🟡 stesso nome, corpo DIVERSO'} — type ${nome} (${files.size} file)`)
  for (const o of occorrenze) console.log(`   ${o.file}:${o.riga}  = ${o.corpo.slice(0, 90)}`)
}
if (n1 === 0) console.log('nessuno')

console.log('\n\n═══ ② STESSO CONTENUTO IN PIÙ FILE (anche con NOMI DIVERSI) ═══')
let n2 = 0
for (const [chiave, occorrenze] of perContenuto) {
  const files = new Set(occorrenze.map((o) => o.file))
  if (files.size < 2) continue
  n2++
  const membri = chiave.split('|')
  console.log(`\n🔴 stessa lista in ${files.size} file — ${membri.length} membri: ${membri.slice(0, 8).join(', ')}${membri.length > 8 ? ' …' : ''}`)
  for (const o of occorrenze) console.log(`   ${o.file}:${o.riga}  ${o.tipo} ${o.nome}`)
}
if (n2 === 0) console.log('nessuno')
