// Guardia contro il server di collaudo che serve una build stantia: quando un rebuild invalida
// i chunk CSS ma il browser (o il server dev) continua a servire quelli vecchi/mancanti, la
// pagina SEMBRA comunque corretta — ogni stile inline usa var(--x, FALLBACK), quindi il layout
// non si rompe visibilmente — ma il body resta trasparente e i token veri non esistono.
// Qualunque misura o screenshot preso in quello stato è FALSO (ci è già capitato due volte in
// questo progetto: lezione del 26/07 — v. `.superpowers/sdd/`).
//
// 🛠️ QUESTA NON È UNA GUARDIA AUTOMATICA, È UNO STRUMENTO DA BANCO. Non va agganciata al commit
// né alla CI: ha bisogno di un server di collaudo acceso, e serve a UNA cosa sola — sapere, prima
// di fotografare o misurare una pagina, se quello che vedi è la build vera.
//
// Uso: avviare il server di collaudo (`npm run dev`, di default sulla porta sotto — se il tuo
// worktree usa una porta diversa, passa BASE=http://localhost:PORTA), poi:
//   node scripts/guardia-stili-collaudo.mjs
// Controlla: 1) nessuna risposta CSS in errore, 2) il token colore `--bg` è valorizzato,
// 3) il background del body non è trasparente.
//
// ⚠️ CORRETTO IL 28/07/2026 — le uscite erano ROVESCIATE, ed era il difetto peggiore dei quattro
// script di verifica. Prima: se il server non c'era, lo script andava in errore e usciva **1**;
// se invece misurava e trovava gli stili rotti, stampava «❌ STILI NON APPLICATI» e usciva **0**.
// Cioè falliva quando NON SAPEVA e approvava quando SAPEVA di un guasto. Ora:
//   0 = build vera, si può misurare · 1 = stili non applicati, NON misurare
//   2 = non ho potuto misurare (server assente): non è un verde, ed è distinto da un guasto.
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3020'

const b = await chromium.launch()
const p = await (await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 })).newPage()
const rotti = []
p.on('response', (r) => { if (r.url().endsWith('.css') && r.status() >= 400) rotti.push(`${r.status()} ${r.url()}`) })
try {
  await p.goto(`${BASE}/login`, { waitUntil:'networkidle', timeout: 20000 })
} catch (e) {
  console.error(`⚠️  NON MISURATO — nessun server di collaudo su ${BASE}: ${String(e).slice(0, 160)}`)
  console.error('   Avvia `npm run dev` (o passa BASE=http://localhost:PORTA) e riprova.')
  await b.close()
  process.exit(2)
}
await p.waitForTimeout(800)
const s = await p.evaluate(() => ({
  uaBg: getComputedStyle(document.querySelector('.login-root') ?? document.body).getPropertyValue('--ua-bg').trim(),
  bodyBg: getComputedStyle(document.body).backgroundColor,
  bgToken: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
}))
console.log('CSS con errore:', rotti.length ? rotti : 'nessuno')
console.log('stato:', JSON.stringify(s))
const applicati = Boolean(s.bgToken) && s.bodyBg !== 'rgba(0, 0, 0, 0)' && rotti.length === 0
await b.close()
if (!applicati) {
  console.error('❌ STILI NON APPLICATI — il server sta servendo una build stantia: NON misurare, NON fare screenshot in questo stato')
  process.exit(1)
}
console.log('✅ stili applicati davvero — il server serve la build corrente, la misura è affidabile')
process.exit(0)
