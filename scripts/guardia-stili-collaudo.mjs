// Guardia contro il server di collaudo che serve una build stantia: quando un rebuild invalida
// i chunk CSS ma il browser (o il server dev) continua a servire quelli vecchi/mancanti, la
// pagina SEMBRA comunque corretta — ogni stile inline usa var(--x, FALLBACK), quindi il layout
// non si rompe visibilmente — ma il body resta trasparente e i token veri non esistono.
// Qualunque misura o screenshot preso in quello stato è FALSO (ci è già capitato due volte in
// questo progetto: lezione del 26/07 — v. `.superpowers/sdd/`).
//
// Uso: avviare il server di collaudo (`npm run dev`, di default sulla porta sotto — se il tuo
// worktree usa una porta diversa, cambia l'URL alla riga del `goto`), poi:
//   node scripts/guardia-stili-collaudo.mjs
// Esce con un messaggio ✅ (build vera, misura affidabile) o ❌ (build stantia, NON misurare)
// controllando: 1) nessuna risposta CSS in errore, 2) il token colore `--bg` è valorizzato,
// 3) il background del body non è trasparente.
import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2 })).newPage()
const rotti = []
p.on('response', (r) => { if (r.url().endsWith('.css') && r.status() >= 400) rotti.push(`${r.status()} ${r.url()}`) })
await p.goto('http://localhost:3020/login', { waitUntil:'networkidle' }) // porta del collaudo — adegua se diversa
await p.waitForTimeout(800)
const s = await p.evaluate(() => ({
  uaBg: getComputedStyle(document.querySelector('.login-root') ?? document.body).getPropertyValue('--ua-bg').trim(),
  bodyBg: getComputedStyle(document.body).backgroundColor,
  bgToken: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
}))
console.log('CSS con errore:', rotti.length ? rotti : 'nessuno')
console.log('stato:', JSON.stringify(s))
console.log(s.bgToken && s.bodyBg !== 'rgba(0, 0, 0, 0)' && !rotti.length
  ? '✅ stili applicati davvero — il server serve la build corrente'
  : '❌ STILI NON APPLICATI — non misurare in questo stato')
await b.close()
