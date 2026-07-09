# DS v3 «Il cuore» — Ondata 0: Mockup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produrre i mockup HTML approvabili di tutte le superfici del sotto-progetto 3 (Home, Pila aperta, Wizard, Scheda lavoro, Consegna, ☰ Tutto il resto), con screenshot 3 viewport × 2 temi, per l'approvazione schermata-per-schermata di Francesco — PRIMA di qualsiasi React.

**Architecture:** Mockup statici self-hosted in `docs/design/mockups/2026-07-09-il-cuore/` con un foglio `_base.css` condiviso (token copiati verbatim da `src/app/ds-v3.css` + classi componente derivate dalla legge §5). Screenshot automatizzati via Playwright su `file://` con assert anti-scroll per la home. Nessun codice applicativo viene toccato.

**Tech Stack:** HTML/CSS statici · Playwright (`@playwright/test` già in devDependencies) · Node ESM script.

## Global Constraints (dalla spec + legge madre)

- **Spec figlia (legge attuativa):** `docs/superpowers/specs/2026-07-09-ds-v3-il-cuore-design.md` — ogni contenuto dei mockup viene da lì (§3–§8).
- **Legge madre:** `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` — misure §5 NON negoziabili, dizionario §2.3, colori §3 (light «Carta», dark «Notte in laboratorio» FLAT), tipografia §4.1.
- **Principio-guida (vincolo di review):** ogni schermata risponde a «qual è LA cosa da fare qui?» — una sola azione primaria per vista.
- **Fonti di verità visive già approvate:** `docs/design/mockups/2026-07-07-redesign-A-materico-full.html` (frames) · classe `.tpB` in `2026-07-09-tastopiu-v3-due-varianti.html` (TastoPiu «punto rosso») · classe `.pvA` in `2026-07-09-pillvoce-v2-due-varianti.html` (PillVoce «pill di carta»). I valori CSS di queste classi si copiano VERBATIM, non si reinterpretano.
- **Token:** copiare i valori da `src/app/ds-v3.css` (blocchi light e dark) — MAI inventare hex. Font: Plus Jakarta Sans (Google Fonts nel mockup; nel prodotto è self-hosted).
- **Dati simulati realistici, MAI placeholder** («Lorem», «TODO», «xxx» vietati). Cast condiviso (§Task 1). MAI nomi pazienti in chiaro: solo codici `PZ-…`.
- **Dizionario §2.3:** mai «dashboard», «form», «submit», «record», «errore di validazione»… — parole del banco.
- **Vocabolario pill esteso dalla spec figlia §4:** ammessi anche `FERMO`, `DA IERI`, `−N GIORNI`.
- Ogni mockup implementa **entrambi i temi** leggendo `data-theme` su `<html>` (toggle incluso nel file, fixed in alto a destra, fuori dal frame di screenshot).
- Commit frequenti: un commit per task, formato `feat(design): mockup <schermata> il-cuore ondata 0`.

---

### Task 1: Kit base — cartella, `_base.css`, script screenshot, cast dati

**Files:**
- Create: `docs/design/mockups/2026-07-09-il-cuore/_base.css`
- Create: `docs/design/mockups/2026-07-09-il-cuore/README.md`
- Create: `scripts/screenshot-mockups.mjs`

**Interfaces:**
- Produces: `_base.css` con custom property v3 (light su `:root`/`[data-theme="light"]`, dark su `[data-theme="dark"]`) e classi condivise `.card`, `.pill`, `.tasto-primario`, `.tasto-secondario`, `.tasto-tondo`, `.link-quieto`, `.riga-dato`, `.riga-fase`, `.tile-scelta`, `.sheet`, `.scrim`, `.avviso`, `.tp` (punto rosso, da `.tpB`), `.pv` (pill voce, da `.pvA`) — nomi esatti che i Task 2-7 useranno.
- Produces: `node scripts/screenshot-mockups.mjs <file.html> [--short]` → PNG in `docs/design/mockups/2026-07-09-il-cuore/screenshots/<nome>-<viewport>-<tema>.png`.

- [ ] **Step 1: Crea cartella e `_base.css`**

Copiare VERBATIM da `src/app/ds-v3.css` tutte le custom property dei blocchi `[data-ds="v3"]` (light) e `[data-theme="dark"] [data-ds="v3"]` (dark), riportandole su `:root` e `[data-theme="dark"]` (nei mockup lo scope v3 non serve: tutto il file è v3). Aggiungere:

```css
/* _base.css — SOLO per i mockup Ondata 0. Fonte token: src/app/ds-v3.css (copiati verbatim). */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
  min-height: 100vh;
}
/* Toggle tema (chrome del mockup, escluso dagli screenshot via [data-mockup-chrome]) */
[data-mockup-chrome] { position: fixed; top: 8px; right: 8px; z-index: 999; }
```

Poi le classi componente, ciascuna con le misure di legge §5 in commento accanto (es. `.tasto-primario { height: 70px; border-radius: 20px; /* §5.1: H 70 mobile, 60 desktop */ }`), i gradienti/ombre copiati da §5.1-5.27 della legge madre e — per `.tp` e `.pv` — copiati verbatim dalle classi `.tpB` e `.pvA` dei mockup sorgente citati nei Global Constraints (light E dark).

- [ ] **Step 2: Scrivi `scripts/screenshot-mockups.mjs`**

Derivato da `scripts/screenshot-catalogo.mjs` (stessa struttura VIEWPORT×TEMI), con tre differenze: naviga `file://`, nasconde `[data-mockup-chrome]`, e per la home fa l'assert anti-scroll.

```js
// Screenshot dei mockup Ondata 0 (DS v3 «Il cuore») — 3 viewport × 2 temi.
// Uso: node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/home.html [--short] [--no-scroll]
//   --short     aggiunge il viewport 390×667 (variante device corti — solo home)
//   --no-scroll fallisce se il documento scrolla verticalmente (vincolo home §3.3 spec)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const fileArg = process.argv[2]
if (!fileArg) { console.error('Manca il path del mockup .html'); process.exit(1) }
const short = process.argv.includes('--short')
const noScroll = process.argv.includes('--no-scroll')
const filePath = resolve(root, fileArg)
const nome = basename(filePath, '.html')
const outDir = resolve(dirname(filePath), 'screenshots')
mkdirSync(outDir, { recursive: true })

const VIEWPORT = [
  { width: 390, height: 844, label: '390' },
  ...(short ? [{ width: 390, height: 667, label: '390corto' }] : []),
  { width: 768, height: 1024, label: '768' },
  { width: 1280, height: 800, label: '1280' },
]
const TEMI = ['light', 'dark']

async function main() {
  const browser = await chromium.launch()
  const page = await (await browser.newContext()).newPage()
  for (const vp of VIEWPORT) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    for (const tema of TEMI) {
      await page.goto(`file://${filePath}`, { waitUntil: 'networkidle' })
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), tema)
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(150)
      await page.evaluate(() => {
        document.querySelectorAll('[data-mockup-chrome]').forEach((el) => el.remove())
      })
      if (noScroll && vp.width === 390) {
        const { scrollH, innerH } = await page.evaluate(() => ({
          scrollH: document.scrollingElement.scrollHeight, innerH: window.innerHeight,
        }))
        if (scrollH > innerH) {
          console.error(`✗ ${nome} ${vp.label} ${tema}: la home scrolla (${scrollH}px > ${innerH}px) — vietato (§3.3)`)
          process.exit(1)
        }
      }
      const filepath = resolve(outDir, `${nome}-${vp.label}-${tema}.png`)
      await page.screenshot({ path: filepath, fullPage: !noScroll })
      console.log(`✓ ${nome}-${vp.label}-${tema}.png`)
    }
  }
  await browser.close()
}
main().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 3: Scrivi `README.md` della cartella con il cast dati condiviso**

Tutti i mockup usano ESATTAMENTE questo cast (coerenza tra schermate — Francesco deve ritrovare gli stessi lavori ovunque):

```markdown
# Mockup Ondata 0 — DS v3 «Il cuore» (spec 2026-07-09)
Cast condiviso (usare identico in ogni schermata):
- Lab: «Laboratorio Formicola», utente «Francesco» (titolare)
- Dentisti: Dr. Esposito (Studio Esposito, 12 lavori/30gg) · Dr.ssa Bianchi (8) · Dr. Russo (5) · Studio Verdi (3)
- Lavori: n.147 Corona zirconia · Dr. Esposito · PZ-0412 · consegna OGGI 16:00 · stato pronto
          n.144 Ponte 3 elementi · Dr.ssa Bianchi · PZ-0398 · DA IERI · pronto (in ritardo)
          n.149 Scheletrato · Dr. Russo · PZ-0421 · consegna ven 11 · in lavorazione
          n.150 Corona metallo-ceramica · Studio Verdi · PZ-0430 · FERMO (sospeso da 6 giorni)
          n.151 Protesi totale · Dr. Esposito · PZ-0433 · appena arrivato, da confermare
          n.152 Intarsio · Dr.ssa Bianchi · PZ-0435 · arrivato ieri, da confermare
- Pile: rossa 2 (n.144, n.147) · ambra 5 (n.149, n.150, +3) · blu 2 (n.151, n.152)
- Fasi n.147: Modellazione ✓ (Ciro, ieri 14:20) · Fusione ✓ (Ciro, oggi 9:05) · Rifinitura ✓ (Salvatore, oggi 11:40) · Controllo finale ← prossima
- Tecnici: Ciro, Salvatore
Screenshot: node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/<file>.html
```

- [ ] **Step 4: Smoke test dello script**

Creare un `home.html` provvisorio con solo `<link rel="stylesheet" href="_base.css">` + un `.card` di prova, poi:
Run: `node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/home.html`
Expected: 6 PNG in `screenshots/`, nessun errore. (Il file verrà sostituito dal Task 2.)

- [ ] **Step 5: Commit**

```bash
git add docs/design/mockups/2026-07-09-il-cuore/ scripts/screenshot-mockups.mjs
git commit -m "feat(design): kit base mockup il-cuore ondata 0 (_base.css, screenshot script, cast)"
```

---

### Task 2: Mockup Home (`home.html`)

**Files:**
- Create/Replace: `docs/design/mockups/2026-07-09-il-cuore/home.html`

**Interfaces:**
- Consumes: `_base.css` (Task 1), cast README.
- Produces: la home approvabile — riferimento visivo per l'Ondata 1.

**Inventario contenuti (spec §3 + legge §7.1):**
1. **390×844:** eyebrow data «GIOVEDÌ 9 LUGLIO» (13/800 +0.16em faint) · «Buon pomeriggio, Francesco» (large-title) · TastoTondo ☰ in alto a destra · StrisciaStato (variante attenzione: «⚠️ La fattura di n.139 è stata scartata → Sistemala») · 3 Pile di legge §5.7 (rossa «DA CONSEGNARE OGGI» 2 «n.144 da ieri — poi n.147 alle 16:00»; ambra «SUL BANCO» 5 «n.149 per venerdì»; blu «APPENA ARRIVATI» 2 «n.151 del Dr. Esposito da confermare») · TastoPiu `.tp` in basso al centro con etichetta «Nuovo lavoro».
2. **390×667 (variante corta §3.3):** stessa struttura, numero display 52→44, gap compressi — dichiarare in un commento HTML la scala esatta usata (es. gap 20→14, padding pile 20/22→16/18) perché diventerà legge.
3. **768:** colonna singola centrata max 480.
4. **1280 (§12.3):** nav sinistra 240px `--bg-deep` (logo UÀ. + «+ Nuovo lavoro» TastoPrimario H 52 + voci con badge: Oggi 2 · Sul banco 5 · Appena arrivati 2 · Agenda · Dentisti · Fatture · Magazzino · Documenti + footer StrisciaStato) · pannello lista 400px (pila rossa selezionata, CardLavoro compatte, ring selezione 2.5 `--red`) · pannello scheda (anteprima n.147 — versione ridotta della scheda Task 5).
5. **Seconda variante StrisciaStato** (in fondo al file, sezione separata marcata «— variante —»): stato sereno «✓ Tutto a posto: 2 consegne oggi, la prossima alle 16:00».
6. I layout 390/768/1280 convivono nello stesso file con media query (lo script scatta ai 3 viewport).

- [ ] **Step 1: Costruisci `home.html`** secondo l'inventario, dati SOLO dal cast, parole SOLO dal dizionario (+ estensioni spec §4).
- [ ] **Step 2: Screenshot con assert anti-scroll**

Run: `node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/home.html --short --no-scroll`
Expected: 8 PNG (4 viewport × 2 temi), assert no-scroll superato a 390×844 E 390×667.

- [ ] **Step 3: Autoverifica L1 + checklist** — una sola azione primaria (il TastoPiu); il rosso appare SOLO su punto rosso + label pila rossa + eventuale StrisciaStato d'allarme; dark FLAT (nessuna ombra raised); contrasto testi ≥ AA a campione (muted su bg).
- [ ] **Step 4: Commit**

```bash
git add docs/design/mockups/2026-07-09-il-cuore/
git commit -m "feat(design): mockup home il-cuore ondata 0"
```

---

### Task 3: Mockup Pila aperta (`pila-aperta.html`)

**Files:**
- Create: `docs/design/mockups/2026-07-09-il-cuore/pila-aperta.html`

**Inventario (spec §4/§4.1 + legge §7.2, §5.8):**
1. **Frame 1 — Pila rossa aperta (390):** header-morph (numero 2 + «DA CONSEGNARE OGGI» rosso) + sub «2 lavori · il più vicino alle 16:00» · TastoTondo ‹ back · CardLavoro n.144 IN CIMA con PillTempo `DA IERI` (tint rossa) + **TastoConsegnaInline H 54** (primo elemento) · CardLavoro n.147 con PillTempo `OGGI·16:00`.
2. **Frame 2 — Pila ambra (390):** n.149 in cima (per venerdì) … n.150 in fondo con pill `FERMO` · card restanti del cast.
3. **Frame 3 — Pila blu (390):** n.151/n.152 con CTA «Conferma» sulla card (wizard di conferma: solo accennato come bottone, il flusso è dell'Ondata 2).
4. **768:** split-view — lista pila rossa a sinistra 360px, scheda n.147 a destra.
5. **1280:** già coperta dal mockup home (pannelli); qui solo la lista 400px con i 3 raggruppamenti selezionabili.
6. Card: MAX 4 righe (§5.8) — niente progress bar, niente icone stato extra.

- [ ] **Step 1: Costruisci `pila-aperta.html`** (frame multipli in verticale, separatori «— frame —»).
- [ ] **Step 2: Screenshot** — Run: `node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/pila-aperta.html` · Expected: 6 PNG.
- [ ] **Step 3: Autoverifica** — ordinamento per urgenza visibile (ritardo in cima); il TastoConsegnaInline SOLO sul primo elemento della rossa; pill dal vocabolario chiuso + estensioni.
- [ ] **Step 4: Commit** — `git commit -m "feat(design): mockup pila-aperta il-cuore ondata 0"`

---

### Task 4: Mockup Wizard (`wizard.html`)

**Files:**
- Create: `docs/design/mockups/2026-07-09-il-cuore/wizard.html`

**Inventario (spec §5 + legge §7.3, §5.12, §5.15, §5.27):**
1. **Frame 1 — Passo 1 Dentista:** back + progress dots (attivo 30px rosso) + domanda «Per quale dentista?» (35/800) + hint + griglia TileScelta 2×2 per frequenza (Esposito 12 · Bianchi 8 · Russo 5 · Verdi 3) + TileNuovo dashed + RigaCerca «🔍 Cerca fra tutti i 23 dentisti…» + PillVoce `.pv` in fondo.
2. **Frame 2 — Passo 2 Tipo:** «Che lavoro è?» + tile per frequenza (Corona zirconia · Ponte · Scheletrato · Protesi totale) + TileNuovo + RigaCerca + PillVoce.
3. **Frame 3 — Passo 3 Paziente e dettagli:** «Chi è il paziente?» + CampoTesto codice PZ con default proposto «PZ-0436» + campi opzionali elemento/colore con LinkQuieto «Salta» + foto impronta opzionale + PillVoce.
4. **Frame 4 — Fatto!:** check grande + riepilogo (dentista, tipo, PZ) + **consegna suggerita** «Di solito ci mettete 6 giorni: pronta per giovedì 16 luglio» + chip «Va bene ✓» / «Decido dopo» + TastoPrimario «FOTOGRAFA IMPRONTA E PRESCRIZIONE» + LinkQuieto «Torna alla home».
5. **Frame 5 — Ripresa abbandono:** sheet «Riprendo da dove eri? Corona per il Dr. Esposito, ti mancava il paziente» + «Riprendi» / LinkQuieto «Ricomincia».
6. **768/1280:** full-screen identico (L1 non si negozia col viewport) — un solo frame di esempio a 1280 per mostrare il centraggio max 480.

- [ ] **Step 1: Costruisci `wizard.html`**.
- [ ] **Step 2: Screenshot** — Run: `node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/wizard.html` · Expected: 6 PNG.
- [ ] **Step 3: Autoverifica** — ogni passo UNA domanda; 4 tocchi contabili sul percorso minimo (tile → tile → «Va bene ✓» → fatto); PillVoce presente in ogni passo; il rosso vive solo nel CerchioMic e nel dot attivo.
- [ ] **Step 4: Commit** — `git commit -m "feat(design): mockup wizard il-cuore ondata 0"`

---

### Task 5: Mockup Scheda lavoro (`scheda-lavoro.html`)

**Files:**
- Create: `docs/design/mockups/2026-07-09-il-cuore/scheda-lavoro.html`

**Inventario (spec §7 + legge §7.4, §5.10, §5.11):**
1. **Frame 1 — Scheda completa n.147 (390):** header (‹ · «n.147» + PillStato `PRONTA ✓` · ⋯) · CardInfo 5 RigheDato (DENTISTA Dr. Esposito · PAZIENTE PZ-0412 · LAVORO Corona zirconia · CONSEGNA Oggi 16:00 in rosso §5.10 · TECNICO Ciro) · NotaDentista «"Il paziente morde forte, occhio allo spessore" — Dr. Esposito» · strip 3 foto (thumbnail 72) · CardFasi (4 RigheFase del cast: 3 fatte + «Controllo finale» con PillFase FATTA) · TastoPrimario CONSEGNA **attivo**.
2. **Frame 2 — CONSEGNA disabled:** stessa scheda ma con «Controllo finale» da fare → tasto disabled `--bg-deep` + callout «Completa il controllo finale per consegnare».
3. **Frame 3 — Sheet modifica (§7.1 spec):** sheet aperto su «Quando va consegnata?» con CampoData a scelte rapide «Oggi · Domani · Lun 14 · Scegli…» — la scheda sotto scala .96 con scrim.
4. **Frame 4 — Menu ⋯ aperto:** voci Prezzi e lavorazioni · Dati clinici · Prove · Foto · Documenti · Butta via (rossa in fondo).
5. **Frame 5 — «È tornata» (§4.2 spec):** scheda di un lavoro `in_prova` con TastoSecondario «È tornata» al posto del CONSEGNA.
6. **768/1280:** scheda nel pannello destro; a 1280 CardInfo + CardFasi affiancate (grid 2col §12.3), TastoPrimario 340px in basso a sinistra.

- [ ] **Step 1: Costruisci `scheda-lavoro.html`**.
- [ ] **Step 2: Screenshot** — Run: `node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/scheda-lavoro.html` · Expected: 6 PNG.
- [ ] **Step 3: Autoverifica** — UNA sola PillFase FATTA visibile; disabled MAI nascosto; l'unico valore rosso in CardInfo è la consegna imminente; RigheDato max 5.
- [ ] **Step 4: Commit** — `git commit -m "feat(design): mockup scheda-lavoro il-cuore ondata 0"`

---

### Task 6: Mockup Consegna (`consegna.html`)

**Files:**
- Create: `docs/design/mockups/2026-07-09-il-cuore/consegna.html`

**Inventario (spec §8-§9 + legge §7.5, §5.17, §5.22):**
1. **Frame 1 — DialogConferma:** card centrata max 340 su scrim · «Consegno?» · **«Corona n.147 → Dr. Esposito»** in evidenza massima (21/800) · TastoPrimario «CONSEGNA» + TastoSecondario «Non ancora» (sicura sopra? NO — qui l'azione NON è distruttiva: primario CONSEGNA sopra, quieta sotto — annotare la deroga a §5.17 in commento).
2. **Frame 2 — Sheet «Prima di consegnare»:** 2 bloccanti tappabili («⚠️ Manca il lotto del disilicato → Registralo», «⚠️ Manca la firma sul controllo finale → Completa») + LinkQuieto «Chiudi».
3. **Frame 3 — Consegnato!:** check grande (cerchio verde, il path si disegnerà §8.3.4) + «Consegnato!» + CardUAHaFatto («UÀ HA GIÀ FATTO PER TE»: ✓ Dichiarazione di Conformità pronta · ✓ Buono di consegna pronto · ⏳ Fattura in preparazione) + bottone WhatsApp verde «Avvisa lo studio su WhatsApp» + LinkQuieto «Aspetta, annulla la consegna» con countdown «(9:47)».
4. **Frame 4 — Banner annullo in scheda:** la scheda n.147 post-consegna con la riga countdown e LinkQuieto.
5. **768/1280:** dialog e sheet identici (il dialog è l'unica eccezione modale ammessa).

- [ ] **Step 1: Costruisci `consegna.html`**.
- [ ] **Step 2: Screenshot** — Run: `node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/consegna.html` · Expected: 6 PNG.
- [ ] **Step 3: Autoverifica** — CardUAHaFatto elenca SOLO cose realmente avvenute (fattura = «in preparazione», MAI «fatta» — emissione differita §9 spec); WhatsApp esplicito, mai auto-popup; countdown 10 minuti.
- [ ] **Step 4: Commit** — `git commit -m "feat(design): mockup consegna il-cuore ondata 0"`

---

### Task 7: Mockup ☰ Tutto il resto (`tutto-il-resto.html`)

**Files:**
- Create: `docs/design/mockups/2026-07-09-il-cuore/tutto-il-resto.html`

**Inventario (legge §6.1-6.2 + spec §1/§11):**
1. Pagina (non drawer), TastoTondo ‹ back · titolo «Tutto il resto» · card-sezione stile CardUAHaFatto-descrittiva: Dentisti · Fatture · Magazzino · Agenda · Documenti e qualità · Persone · Listino · La mia rete (solo admin_rete, annotare) · Il mio laboratorio. Ogni card: glifo + nome 17.5/700 + sub descrittivo in parole del banco («Fatture — tutto a posto questo mese ✓»).
2. **NIENTE «I conti» / «Il mio compenso»** (sotto-progetto 4 — spec §11): il mockup NON deve mostrarle.
3. **768/1280:** a 1280 la pagina non esiste (la nav la sostituisce) — solo 390/768.

- [ ] **Step 1: Costruisci `tutto-il-resto.html`**.
- [ ] **Step 2: Screenshot** — Run: `node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/tutto-il-resto.html` · Expected: 6 PNG (a 1280 la pagina mostra una nota «su desktop questa pagina è la nav»).
- [ ] **Step 3: Autoverifica** — nessuna voce fuori mappa §6.1; sub in parole del banco.
- [ ] **Step 4: Commit** — `git commit -m "feat(design): mockup tutto-il-resto il-cuore ondata 0"`

---

### Task 8: Presentazione a Francesco (GATE — nessun codice oltre questo punto)

**Files:**
- Create (dopo approvazione): `docs/design/decisions/2026-07-09-il-cuore-mockups.md`

- [ ] **Step 1: Verifica finale incrociata** — stesso cast ovunque; stesse misure per gli stessi componenti tra file; `grep -riE "lorem|todo|placeholder|dashboard|submit" docs/design/mockups/2026-07-09-il-cuore/` → zero match (eccetto README).
- [ ] **Step 2: Presenta a Francesco** gli screenshot schermata per schermata (Home → Pila → Wizard → Scheda → Consegna → Tutto il resto), per ciascuna: cosa mostra, quale Legge L1-L7 rischia e come la rispetta. **ATTENDERE l'ok esplicito su OGNI schermata.** I feedback si applicano al mockup e si ri-screenshotta finché non c'è l'ok (pattern punto-rosso/pill-di-carta).
- [ ] **Step 3: Scrivi la decision doc** con l'elenco degli ok, le modifiche richieste e le eventuali revisioni di legge emerse (pattern `docs/design/decisions/2026-07-09-tastopiu-punto-rosso.md`).
- [ ] **Step 4: Commit** — `git commit -m "docs(design): decision record mockup il-cuore ondata 0 approvati"`

**Solo dopo questo gate** si scrivono i piani delle Ondate 1-4 (React), ciascuno derivato dai mockup approvati.
