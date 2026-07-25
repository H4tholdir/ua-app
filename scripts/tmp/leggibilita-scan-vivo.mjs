// Scansione delle pagine VIVE su localhost:3020: conferma che i difetti misurati sul mockup
// esistono davvero in produzione, e cerca casi che nessuno aveva elencato.
// Guardia obbligatoria su OGNI rotta: se il chunk CSS non arriva, la pagina SEMBRA giusta
// (ogni stile inline ha un ripiego) ma ogni misura fatta li' e' falsa.
import { chromium } from 'playwright'

const ROTTE = ['/analytics', '/impostazioni', '/qualita/psur', '/qualita', '/ordini', '/fatture', '/scadenzario', '/magazzino']
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } })
const p = await ctx.newPage()

// ── login ──
await p.goto('http://localhost:3020/login', { waitUntil: 'networkidle' })
await p.fill('input[type="email"]', 'e2e-titolare@ua-test.local')
await p.fill('input[type="password"]', 'TestE2E!2026')
await p.click('button[type="submit"]')
await p.waitForURL(u => !u.pathname.includes('/login'), { timeout: 30000 }).catch(() => {})
await p.waitForTimeout(1500)
console.log('dopo login:', p.url(), '\n')

const SONDA = () => {
  // Il browser restituisce i colori in notazioni diverse: rgb(), color(srgb …) da
  // color-mix(), e lab()/oklch() dai token shadcn. Leggerle tutte con la stessa regex
  // faceva scambiare lab(98 0 0) — un bianco — per rgb(98,0,0), un rosso scuro: falsi
  // allarmi a 1,18:1. Le notazioni moderne si fanno convertire dal browser stesso.
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = 1
  const c2d = cvs.getContext('2d', { willReadFrequently: true })
  const viaCanvas = (s) => {
    c2d.clearRect(0, 0, 1, 1); c2d.fillStyle = '#000'; c2d.fillStyle = s
    c2d.fillRect(0, 0, 1, 1); const d = c2d.getImageData(0, 0, 1, 1).data
    return [d[0], d[1], d[2], d[3] / 255]
  }
  const parse = (s) => {
    s = String(s).trim()
    if (s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return [0, 0, 0, 0]
    if (/^rgba?\(/.test(s)) {
      const n = s.match(/-?[\d.]+(?:e-?\d+)?/g).map(Number)
      return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1]
    }
    if (/^color\(srgb/.test(s)) {
      const n = s.match(/-?[\d.]+(?:e-?\d+)?/g).map(Number)
      return [n[0] * 255, n[1] * 255, n[2] * 255, n.length > 3 ? n[3] : 1]
    }
    return viaCanvas(s)          // lab(), oklch(), color(display-p3 …), nomi CSS…
  }
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = (r) => 0.2126 * lin(r[0]) + 0.7152 * lin(r[1]) + 0.0722 * lin(r[2])
  const CR = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
  const sopra = (c, a, s) => [0, 1, 2].map(k => c[k] * a + s[k] * (1 - a))

  const fondo = (el) => {
    const cat = []; for (let n = el; n; n = n.parentElement) cat.push(n)
    let base = [255, 255, 255]
    for (let i = cat.length - 1; i >= 0; i--) {
      const cs = getComputedStyle(cat[i]); const c = parse(cs.backgroundColor)
      let a = c[3]; const o = parseFloat(cs.opacity); if (o < 1) a *= o
      if (a > 0) base = sopra(c, a, base)
    }
    return base
  }

  const out = []
  document.querySelectorAll('*').forEach(el => {
    if (el.children.length && ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return
    const txt = el.textContent.trim(); if (!txt || txt.length > 70) return
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.opacity === '0') return
    const fg = parse(cs.color); if (fg[3] === 0) return
    const px = parseFloat(cs.fontSize), peso = parseInt(cs.fontWeight) || 400
    const grande = px >= 24 || (px >= 18.66 && peso >= 700)
    const soglia = grande ? 3 : 4.5
    const cr = CR(fg.slice(0, 3), fondo(el))
    if (cr >= soglia) return
    out.push({
      t: txt.slice(0, 42), col: cs.color, px, peso, soglia,
      cr: +cr.toFixed(2), fondo: fondo(el).map(Math.round).join(','),
    })
  })
  return out
}

for (const tema of ['light', 'dark']) {
  await p.addInitScript(`try{localStorage.setItem('ua-theme','${tema}')}catch(e){}`)
  console.log('\n══════════════════ TEMA ' + tema.toUpperCase() + ' ══════════════════')
  for (const rotta of ROTTE) {
    const rotti = []
    const onResp = (r) => { if (r.url().includes('.css') && r.status() >= 400) rotti.push(r.status() + ' ' + r.url()) }
    p.on('response', onResp)
    await p.goto('http://localhost:3020' + rotta, { waitUntil: 'networkidle' }).catch(() => {})
    await p.waitForTimeout(900)
    p.off('response', onResp)

    // ── GUARDIA ──
    const g = await p.evaluate(() => ({
      bg: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
      t1: getComputedStyle(document.documentElement).getPropertyValue('--t1').trim(),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      dark: document.documentElement.classList.contains('dark'),
      url: location.pathname,
    }))
    const ok = g.bg && g.t1 && g.bodyBg !== 'rgba(0, 0, 0, 0)' && !rotti.length
    if (!ok) { console.log(`\n  ${rotta} → ❌ GUARDIA FALLITA ${JSON.stringify(g)} css:${rotti}`); continue }
    if (g.url !== rotta) { console.log(`\n  ${rotta} → reindirizzato a ${g.url}, salto`); continue }

    const casi = await p.evaluate(SONDA)
    console.log(`\n  ${rotta}  (--bg ${g.bg}, dark=${g.dark})  → ${casi.length} sotto soglia`)
    const visti = new Set()
    casi.sort((a, b) => a.cr - b.cr).forEach(c => {
      const k = c.col + c.px + c.t
      if (visti.has(k)) return; visti.add(k)
      console.log(`     ${String(c.cr).padStart(5)}:1  (soglia ${c.soglia})  ${c.px}px/${c.peso}  ${c.col.padEnd(20)} su ${c.fondo.padEnd(13)} « ${c.t} »`)
    })
  }
}
await b.close()
