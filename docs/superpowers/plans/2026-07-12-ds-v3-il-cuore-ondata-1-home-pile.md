# DS v3 «Il cuore» — Ondata 1: Home + pile — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Portare in produzione la Home v3 a 4 pile (rossa·ambra·viola·blu), le pagine-pila, la StrisciaStato gerarchica e la pagina ☰ «Tutto il resto» — fedeli ai mockup Ondata 0 approvati da Francesco il 12/07 — con l'urgenza derivata SOLO dall'adapter `derivaUrgenza` (E4), previo emendamento della legge madre e dei token (viola, faint, verdi).

**Architecture:** Nessuna migration, nessuna API nuova: solo query server-side nuove (`getPileHome`, `getSegnaleStriscia`, `getSezioniTuttoIlResto`) montate su route esistenti (`/dashboard`, `/lavori`) + una route nuova (`/tutto-il-resto`). Le 4 dashboard per ruolo muoiono, sostituite da un'unica composizione con perimetro parametrico. A 1280 la home diventa nav a 3 pannelli con selezione via `searchParams` (architettura validata dallo spike B6, Task 1). Convivenza per pagina (legge §14): scheda `/lavori/[id]`, wizard `/lavori/nuovo` e consegna `/lavori/[id]/consegna` restano v2.3 fino alle Ondate 2/3/4b — i tasti v3 ci navigano.

**Tech Stack:** Next.js 16 App Router (server components + client components) · Supabase (`getServiceClient`) · Motion 12 (`molla` da `v3/motion.ts`) · Vitest + Testing Library (jsdom).

## Global Constraints

- **Spec figlia:** `docs/superpowers/specs/2026-07-09-ds-v3-il-cuore-design.md` (§3 Home, §4 mappatura stati→pile, §6 StrisciaStato) · **Legge madre:** `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (che il Task 2 emenda).
- **Fonte di verità visiva:** SOLO i mockup approvati in `docs/design/mockups/2026-07-09-il-cuore/` (`home.html`, `pila-aperta.html`, `tutto-il-resto.html`, `stati-vuoti-errori.html`, `_base.css`) + decision record `docs/design/decisions/2026-07-09-il-cuore-mockups.md`. I valori CSS si copiano da lì, non si reinterpretano.
- **E4 (vincolo architetturale):** né `getPileHome()` né le pile né alcuna pagina leggono MAI lo stato `in_ritardo` direttamente — solo `derivaUrgenza()` lo conosce. `STATI_CONSEGNABILI` si importa da `src/lib/consegna/costanti.ts` (unica fonte, client-safe).
- **Token only:** colori/ombre/raggi/tipografia da `src/design-system/v3/tokens.ts` e custom property `[data-ds="v3"]`; animazioni SOLO `molla`/`cssEase` da `src/design-system/v3/motion.ts`. MAI hex inline nei componenti (eccezioni di legge già tokenizzate).
- **Pattern pagina v3:** page-root con `data-ds="v3"` e `background: var(--bg)` dipinto INLINE sul root (mai nello scope CSS — gotcha portal risolto in sp.2) + elemento `.ds-grana`.
- **GDPR:** MAI nomi pazienti in UI — solo `pazienti.codice_paziente` (formato `PZ-…`); `paziente_nome_snapshot` NON si seleziona nelle query nuove.
- **Dizionario §2.3:** mai «dashboard», «form», «filtri», «loading»… nel copy UI (i path/route restano `dashboard` — il dizionario governa il testo visibile).
- **A11y (decision doc):** `aria-live="polite"` sulla StrisciaStato · nomi accessibili per i tasti icona (☰ «Tutto il resto», ‹ «Indietro», ⋯ «Altro») · touch target ≥44px · testo lettura ≥17px (sub 16 e testi 14.5/15.5 sono deroghe di legge già scritte in §5).
- **Ruoli:** `titolare`, `tecnico`, `front_desk`, `admin_rete` (MAI `admin`).
- **FASE 3 (BP-2) — dichiarata:** zero migration (FASE 6b non scatta) · zero cambi API (solo letture server-side con `getServiceClient()`, scoping tenant manuale `laboratorio_id` come nelle query esistenti) · nessun payload cambia per client esistenti · rollback = revert del merge (nessno stato persistente nuovo).
- **Worktree dedicato** (FASE 5): `ondata-1-home-pile`. Copiare `.env.local` nel worktree. Prima di OGNI commit: `git rev-parse --show-toplevel` + `git branch --show-current` (lezione incidenti Ondata 2/3 portale).
- **Commit format:** `feat(home): …` · `feat(pile): …` · `docs(ds): …` · un commit per task minimo.
- **Verifica per task:** `npx vitest run` (baseline 1297 pass | 4 skipped) + `npx tsc --noEmit`. FASE 7 completa (build inclusa) al Task 11.
- **QA finale** su lab E2E `00000000-0000-0000-0000-000000000001` — MAI il lab reale di Filippo/Francesco.
- **Firme dei componenti ds:** prima di invocare un componente di `src/components/ds/` (TastoTondo, TastoPiu, TastoSecondario, RigaCerca, CampoTesto, Vuoto, CardInfo/RigaDato, PillStato…), leggere la firma REALE nel file e l'uso nel catalogo `src/app/ds-v3-catalogo/page.tsx` — le prop mostrate in questo piano per quei componenti sono indicative, i valori/varianti di legge no.

## Decisioni di piano (derivate da spec + mockup)

> **P1-P9 RATIFICATE da Francesco il 12/07/2026** (tutte e nove, senza modifiche). La P2 resta comunque soggetta alla validazione sperimentale dello spike B6 (Task 1): se lo spike la confuta, si ri-pianificano i Task 7-9 prima di eseguirli.

| # | Decisione | Fonte |
|---|---|---|
| P1 | **Route pila aperta = `/lavori?pila=rossa\|ambra\|viola\|blu`**; `/lavori` senza param = vista «Le pile» (4 raggruppamenti, dal mockup pila-aperta 1280). Le tab-filtro v2.3 di `/lavori` muoiono. URL invariati, browser-back funziona (§6.2). | spec §1 «route invariate» + mockup |
| P2 | **Desktop 1280 su `/dashboard`**: 3 pannelli, selezione con `searchParams` (`?pila=` default rossa, `?lavoro=` per l'anteprima) — server re-render, niente stato client duplicato, deep-link e back gratis. Lo spike B6 (Task 1) valida o confuta; se confuta, si ri-pianifica dal Task 7 in poi PRIMA di eseguirli. | B6 |
| P3 | **TastoConsegnaInline (pila rossa, primo elemento consegnabile)** naviga a `/lavori/[id]/consegna` (pagina v2.3, server già indurito dalla 4a). La DialogConferma inline arriva con l'Ondata 4b — qui il tasto è il punto d'ingresso, non l'orchestratore. | convivenza §14 madre + E2 |
| P4 | **CTA «Conferma» (pila blu)** naviga a `/lavori/[id]` (scheda v2.3) finché il wizard di conferma non nasce (Ondata 2). | convivenza §14 madre |
| P5 | **Pila viola = stati `in_prova` + `in_prova_esterna`**. I lavori `is_rifacimento` seguono il LORO stato (un rifacimento sul banco è ambra): il nome «Da rifare / In prova» copre il concetto, il mockup mostra solo prove. | mockup + cast README |
| P6 | **Pill dei lavori `in_lavorazione`** = descrizione della fase corrente (prima `lavori_fasi` non eseguita, via `fasi_produzione.descrizione`, MAIUSCOLA); `STA PER FINIRE` se è l'ultima rimasta; fallback (lavoro senza fasi) = PillTempo ambra con la consegna breve («PER VEN 10»). Estensione §5.9 registrata nell'emendamento (Task 2). | mockup pills IN FORNO/IN RIFINITURA/STA PER FINIRE |
| P7 | **Gerarchia StrisciaStato per ruolo**: titolare/admin_rete `1→9`; front_desk `2,3,4,1,5,6,8,9` (parte dagli operativi, spec §3.2); tecnico `2,3,4,6,8,9` (mai fiscale/pagamenti/materiali). | spec §6 + §3.2 |
| P8 | **«Fermo da N giorni»** si misura da `lavori.updated_at` del passaggio a `sospeso` (proxy: ultima modifica del lavoro sospeso — nessuna colonna dedicata esiste e non si aggiunge). | spec §6 segnale 6 |
| P9 | **BottomNavPill**: si nasconde sulle route migrate (`/dashboard`, `/lavori` esatta, `/tutto-il-resto`) e resta su tutte le altre (inclusi `/lavori/[id]` e `/lavori/nuovo`, ancora v2.3). Morirà del tutto a fine sotto-progetto. | spec §1 «muore sulle pagine migrate» |

---

### Task 1: Spike B6 — architettura desktop route↔pannelli (GATE Francesco)

**Files:**
- Create: `docs/design/decisions/2026-07-12-spike-route-pannelli.md`
- (nessun file di `src/` — lo spike è esplorazione + ADR; eventuale codice di prova vive in `scripts/tmp/` e NON si committa)

**Interfaces:**
- Produces: ADR con la decisione ratificata che i Task 7-9 consumano (architettura P2 confermata o sostituita).

- [ ] **Step 1: Verifica sperimentale dei 3 candidati**

Nel worktree, verificare in una pagina di prova (poi scartata) i comportamenti che decidono l'architettura:

1. **`searchParams` server-driven (P2, candidata):** una page `force-dynamic` che legge `searchParams` re-renderizza a ogni cambio di `?pila=`/`?lavoro=` via `<Link>`? Misurare: la navigazione fra pile a 1280 mantiene lo scroll del pannello lista? Il back del browser ripercorre le selezioni?
2. **Parallel routes (`@nav/@lista/@scheda`):** costo di struttura (3 slot + default.tsx per route) contro il beneficio (re-render parziale). Verificare se lo slot `@scheda` può renderizzare contenuto dipendente da `searchParams` senza rifetch degli altri slot.
3. **Master-detail client-only:** stato di selezione in un client component (niente URL). Verificare il costo: back del browser NON ripercorre le selezioni (violazione §6.2) — atteso: scartata per questo.

- [ ] **Step 2: Scrivi l'ADR**

`docs/design/decisions/2026-07-12-spike-route-pannelli.md` con: contesto (B6), i 3 candidati con evidenze misurate, raccomandazione motivata, impatto sulle Ondate 3/4b (la scheda v3 entrerà nel pannello destro; la consegna in-scheda deve funzionare dentro il pannello), e la riga «**Decisione: [X] — ratificata da Francesco il …**» da compilare al gate.

- [ ] **Step 3: GATE — presentare a Francesco**

Presentare l'ADR (2 minuti di lettura). NON procedere ai Task 7-9 senza ratifica. Se la scelta ratificata NON è la P2, fermarsi e ri-pianificare i Task 7-9 (deviazione di piano dichiarata).

- [ ] **Step 4: Commit**

```bash
git add docs/design/decisions/2026-07-12-spike-route-pannelli.md
git commit -m "docs(ds): ADR spike B6 route<->pannelli desktop (Ondata 1)"
```

---

### Task 2: Emendamento della legge madre (docs only)

Le revisioni ratificate da Francesco (bucket B + advisor, decision record `2026-07-09-il-cuore-mockups.md` §«Revisioni di legge») vivono oggi SOLO nei commenti dei mockup: questo task le incide nel testo della legge. Nessun codice.

**Files:**
- Modify: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`

**Interfaces:**
- Produces: legge madre v3.1 — la review di ogni task successivo verifica contro QUESTO testo.

- [ ] **Step 1: Emenda §3 (token) e §3.3 (regole colore)**

Nel changelog in testa al file aggiungere: `**Rev. 3.1 (12/07/2026):** emendamenti Ondata 0 ratificati da Francesco — v. decision record 2026-07-09-il-cuore-mockups.md`. Poi:

- §3.1 tabella light: `--faint` → `#7B6A59` (nota: era `#A69B8C`, WCAG fail 2.40 su `--bg`; ora 4.56 su `--bg`, 5.14 su `--card`). Aggiungere righe: `--purple | #7C3F9C | famiglia di stato «Da rifare / In prova» (pila viola)` e `--purple-tint | #F3EAF7 | SOLO sfondi pill/badge viola`.
- §3.2 tabella dark: `--faint` → `#928778` (era `#6E6457`, fail; ora 5.21/4.75). Aggiungere `--purple | #B98BE8` e `--purple-tint | rgba(185,139,232,.14)`.
- §3.3 regola 2, sostituire il testo con: «**5 famiglie di stato, chiuse:** rosso=urgente · ambra=in corso · blu=nuovo/informazione · verde=fatto · **viola=da rifare/in prova** (rev. 3.1, decisione Francesco 12/07). Vietato un sesto colore di stato.» Rimuovere la frase «Il viola/purple non esiste in questo sistema».
- §3.3.4 (riga WhatsApp): gradiente → `#208650→#17663A` (corsa `#0E4A28`) — era `#1F9E52→#2FBE68`, il bianco falliva AA.

- [ ] **Step 2: Emenda §4.2, §5.4, §5.9, §5.14, §5.17**

- §4.2: aggiungere «**Deroga device-corti (rev. 3.1):** nel solo regime viewport height ≤ 700px sono ammessi i passi intermedi **10** e **14** (scala compressa della home, v. §7.1).»
- §5.4 PillFase: gradiente → `linear-gradient(180deg, #1F8544, #166B39)` con nota «stop PINNATI in hex, MAI `var(--green)` come faccia (in dark risolveva a #34C468: bianco 2.27 ✗); corsa `#14602C` invariata».
- §5.9 vocabolario: aggiungere `IN PROVA` (famiglia viola) · `FERMO` · `DA IERI` · `−N GIORNI` (PillTempo negative, famiglia rossa) e la nota: «per i lavori in lavorazione la PillStato mostra la fase corrente del ciclo del lab (MAIUSCOLA), `STA PER FINIRE` sull'ultima fase (rev. 3.1 — P6 piano Ondata 1)».
- §5.14 Avatar: il viola `#7A4DB8` degli avatar resta; aggiungere nota «il divieto "viola solo avatar" decade (rev. 3.1): `--purple #7C3F9C` è famiglia di stato — i due viola restano valori distinti».
- §5.17 DialogConferma: aggiungere «**Deroga (rev. 3.1):** per azioni NON distruttive (conferma di consegna) l'ordine si inverte — primario sopra, via di fuga sotto.»

- [ ] **Step 3: Emenda §5.7/§7.1 (4 pile + regola subline + scala corta) e Appendice B**

- §5.7: «Le pile sono SEMPRE **quattro**, sempre queste, sempre in quest'ordine: 1 rossa (Da consegnare oggi) · 2 ambra (Sul banco) · **3 viola (Da rifare / In prova)** · 4 blu (Appena arrivati).» + **Regola subline:** «una riga; il numero lavoro sempre per primo; ellissi ammessa SOLO sulla coda descrittiva — il dato essenziale non si tronca mai a metà (es. "alle 16", non "alle 16:0…")».
- §7.1: aggiungere la **scala device-corti dichiarata** (dal commento di `home.html`): viewport height ≤ 700 → numero pila 52→**42** · padding pila 20/22→14/18 · gap pile 16→10 · gap blocchi 16→10 · padding pagina 24→14 · gap foot 8→6; larghezze, raggi, corpi ≥ heading e TastoPiù invariati.
- §7.2: nota 4 raggruppamenti (rossa·ambra·viola·blu) nella pila aperta / vista «Le pile».
- Appendice B: `--c-purple → SOLO avatar` diventa `--c-purple → famiglia --purple (stato) + avatar` .

- [ ] **Step 4: Registra i ~8 pattern nuovi come sezioni §5.x**

Aggiungere in coda a §5 (anatomie dai mockup approvati, valori citati dai file):

- **§5.28 `MorphPila`** — header di pila aperta (stato morphato di §8.3.1): numero display 52/800 tabulare colore-famiglia (min-width 56) + label 13/800/+0.16em + sub 16/600 muted 1 riga ellissi. Da `pila-aperta.html` `.morph`.
- **§5.29 `TastoWhatsApp`** — gradiente §3.3.4 emendato, riservato alle azioni «apri WhatsApp». Da `consegna.html` `.wa-btn` (l'implementazione React arriva in Ondata 4b).
- **§5.30 `RigaBloccante`** — sheet «Prima di consegnare»: SOLO i bloccanti, ciascuno tappabile. Da `consegna.html` (React in 4b).
- **§5.31 `ChipScelta`** — chip di decisione rapida del wizard. Da `wizard.html` (React in Ondata 2).
- **§5.32 `ProgressDots`** — dots wizard 11px, attivo 30px rosso, fatti verdi. Da `wizard.html` (React in Ondata 2).
- **§5.33 `FotoStrip`** — strip thumbnail 72, radius 12, max 1 riga. Da `scheda-lavoro.html` (React in Ondata 3).
- **§5.34 `MenuVoce`** — voce del menu ⋯ della scheda. Da `scheda-lavoro.html` (React in Ondata 3).
- **§5.35 `NavDesk`** — nav desktop 240px `--bg-deep`: logo `UÀ.` 26/800 (punto rosso) · «+ Nuovo lavoro» TastoPrimario H 52 · voci H 48 radius 12 (16/600 muted; selezionata: bg `--bg` ink 700) · badge 24px pill (tint famiglia per le pile, neutro `--bg-deep`+inset line per le sezioni) · footer StrisciaStato. Da `home.html` `.nav-desk`.

Ogni sezione cita il mockup sorgente come fonte di verità visiva.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md
git commit -m "docs(ds): legge madre v3.1 — emendamenti Ondata 0 ratificati (viola, faint, verdi, 4 pile, subline, device-corti, §5.28-5.35)"
```

---

### Task 3: Token v3 in codice — viola, faint, verdi (PRIMA dei componenti)

**Files:**
- Modify: `src/app/ds-v3.css` (blocchi `[data-ds="v3"]` e `[data-theme="dark"] [data-ds="v3"]`)
- Modify: `src/design-system/v3/tokens.ts`
- Modify: `src/components/ds/Pill.tsx` (famiglia `purple` + vocabolario)
- Test: `tests/unit/tokens-v3-ondata1.test.ts`

**Interfaces:**
- Consumes: valori verbatim da `docs/design/mockups/2026-07-09-il-cuore/_base.css` (righe 35-89) — già AA-verificati.
- Produces: `luce.purple/purpleTint/faint`, `notte.purple/purpleTint/faint`, `gradiente.pillFase` pinnato, `gradiente.whatsapp`/`gradiente.corsaWhatsApp`; CSS var `--purple`/`--purple-tint` in entrambi i temi; tipo `Famiglia` esteso con `'purple'` esportato da `Pill.tsx`.

- [ ] **Step 1: Scrivi il test che fallisce**

```ts
// tests/unit/tokens-v3-ondata1.test.ts
import { readFileSync } from 'node:fs'
import { luce, notte, gradiente } from '@/design-system/v3/tokens'

describe('token Ondata 1 — revisioni di legge v3.1 (bucket B)', () => {
  it('espone la famiglia viola in entrambi i temi (§3 rev. 3.1)', () => {
    expect(luce.purple).toBe('#7C3F9C')
    expect(luce.purpleTint).toBe('#F3EAF7')
    expect(notte.purple).toBe('#B98BE8')
    expect(notte.purpleTint).toBe('rgba(185,139,232,.14)')
  })

  it('ha il --faint scurito AA (§3 rev. 3.1)', () => {
    expect(luce.faint).toBe('#7B6A59')
    expect(notte.faint).toBe('#928778')
  })

  it('pinna gli stop del gradiente PillFase (§5.4 rev. 3.1 — mai var(--green) come faccia)', () => {
    expect(gradiente.pillFase).toBe('linear-gradient(180deg, #1F8544, #166B39)')
    expect(gradiente.pillFase).not.toContain('var(')
    expect(gradiente.corsaPillFase).toBe('#14602C')
  })

  it('espone il verde WhatsApp scurito (§3.3.4 rev. 3.1)', () => {
    expect(gradiente.whatsapp).toBe('linear-gradient(180deg, #208650, #17663A)')
    expect(gradiente.corsaWhatsApp).toBe('#0E4A28')
  })

  it('ds-v3.css porta gli stessi valori nei due blocchi scope', () => {
    const css = readFileSync('src/app/ds-v3.css', 'utf8')
    // light
    expect(css).toContain('--faint: #7B6A59')
    expect(css).toContain('--purple: #7C3F9C')
    expect(css).toContain('--purple-tint: #F3EAF7')
    // dark
    expect(css).toContain('--faint: #928778')
    expect(css).toContain('--purple: #B98BE8')
    expect(css).toContain('--purple-tint: rgba(185,139,232,.14)')
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/tokens-v3-ondata1.test.ts`
Expected: FAIL (`purple` non esiste su `luce`, `--faint` vecchio nel CSS).

- [ ] **Step 3: Aggiorna `ds-v3.css` e `tokens.ts`**

`src/app/ds-v3.css` — nel blocco light: `--faint: #7B6A59` (riga 15) e, dopo la riga dei tint (19), `--purple: #7C3F9C; --purple-tint: #F3EAF7;`. Nel blocco dark: `--faint: #928778` (riga 46) e `--purple: #B98BE8; --purple-tint: rgba(185,139,232,.14);` dopo la riga 50. Ogni aggiunta con commento `/* rev. 3.1 (bucket B 12/07) — v. decision record 2026-07-09-il-cuore-mockups.md */`.

`src/design-system/v3/tokens.ts`:

```ts
// dentro `luce` (sostituire faint, aggiungere in coda):
  faint: '#7B6A59', // rev. 3.1 — era #A69B8C (WCAG fail 2.40 su --bg)
  purple: '#7C3F9C', purpleTint: '#F3EAF7', // rev. 3.1 — famiglia «Da rifare / In prova»

// dentro `notte`:
  faint: '#928778', // rev. 3.1 — era #6E6457 (WCAG fail)
  purple: '#B98BE8', purpleTint: 'rgba(185,139,232,.14)', // rev. 3.1

// dentro `gradiente` (sostituire pillFase, aggiungere whatsapp):
  pillFase: 'linear-gradient(180deg, #1F8544, #166B39)', // §5.4 rev. 3.1 — stop pinnati, mai var(--green) come faccia
  corsaPillFase: '#14602C',
  whatsapp: 'linear-gradient(180deg, #208650, #17663A)', // §3.3.4 rev. 3.1 — consumato dall'Ondata 4b
  corsaWhatsApp: '#0E4A28',
```

Nota: `notte` non ha oggi i tint (vivono solo nel CSS) — aggiungere `purpleTint` a ENTRAMBI per simmetria di questo giro; gli altri tint dark restano solo CSS (non li tokenizziamo qui: YAGNI).

- [ ] **Step 4: Estendi `Pill.tsx`**

In `src/components/ds/Pill.tsx`: `type Famiglia = 'red' | 'amber' | 'blue' | 'green' | 'purple'` ed **esportarlo** (`export type Famiglia`) — i Task 4-9 lo importano. Estendere `StatoBanco` con `'IN PROVA' | 'FERMO' | 'STA PER FINIRE'` (se `STA PER FINIRE` già c'è, solo i primi due) e `MAPPA_STATO_FAMIGLIA`: `'IN PROVA': 'purple'`, `'FERMO': 'amber'`. Le PillTempo negative (`DA IERI`, `−N GIORNI`) NON entrano in `StatoBanco`: sono PillTempo (testo libero temporale, famiglia decisa dal chiamante — §5.9).

- [ ] **Step 5: Esegui i test — devono passare**

Run: `npx vitest run tests/unit/tokens-v3-ondata1.test.ts && npx vitest run && npx tsc --noEmit`
Expected: PASS, suite intera verde (1297+5), tsc pulito.

- [ ] **Step 6: Aggiorna il catalogo**

In `src/app/ds-v3-catalogo/page.tsx`, sezione Pill: aggiungere `<PillStato stato="IN PROVA" />` e `<PillStato stato="FERMO" />` accanto alle esistenti (il catalogo è la vetrina di ogni variante di legge — carry-over sp.2).

- [ ] **Step 7: Commit**

```bash
git add src/app/ds-v3.css src/design-system/v3/tokens.ts src/components/ds/Pill.tsx src/app/ds-v3-catalogo/page.tsx tests/unit/tokens-v3-ondata1.test.ts
git commit -m "feat(ds): token rev. 3.1 — famiglia viola, faint AA, PillFase pinnata, verde WhatsApp"
```

---

### Task 4: Adapter `derivaUrgenza` (E4) — l'unico che conosce `in_ritardo`

**Files:**
- Create: `src/lib/lavori/urgenza.ts` (client-safe: niente `server-only` — lo importano anche componenti client per i tipi)
- Test: `tests/unit/derivaUrgenza.test.ts`

**Interfaces:**
- Consumes: `isStatoConsegnabile` da `@/lib/consegna/costanti` · tipo `StatoLavoro` da `@/types/domain` · tipo `Famiglia` da `@/components/ds/Pill`.
- Produces (i Task 5-9 dipendono da queste firme ESATTE):

```ts
export type Pila = 'rossa' | 'ambra' | 'viola' | 'blu'
export type LavoroPerUrgenza = {
  stato: StatoLavoro
  data_consegna_prevista: string   // YYYY-MM-DD
  ora_consegna: string | null      // HH:mm o HH:mm:ss
}
export type Urgenza = {
  pila: Pila | null                            // null = fuori dalla home
  giorniRitardo: number                        // 0 se non in ritardo
  inCima: boolean                              // ritardi in cima alla pila
  inFondo: boolean                             // sospesi in fondo all'ambra
  consegnabile: boolean                        // via STATI_CONSEGNABILI (unica fonte)
  pillTempo: { testo: string; famiglia: Famiglia } | null  // null = pill decisa dal chiamante (fase)
}
export function derivaUrgenza(lavoro: LavoroPerUrgenza, oggi: Date): Urgenza
export function confrontaUrgenza(
  a: { urgenza: Urgenza; data: string; ora: string | null },
  b: { urgenza: Urgenza; data: string; ora: string | null },
): number
```

- [ ] **Step 1: Scrivi i test che falliscono**

```ts
// tests/unit/derivaUrgenza.test.ts
import { derivaUrgenza, confrontaUrgenza } from '@/lib/lavori/urgenza'

const OGGI = new Date('2026-07-09T10:00:00') // giovedì 9 luglio (l'ancora del cast)
const base = { ora_consegna: null as string | null }

describe('derivaUrgenza — mappatura stati→pile (spec §4 + bucket B3)', () => {
  it('consegnato e annullato sono fuori dalla home', () => {
    for (const stato of ['consegnato', 'annullato'] as const) {
      expect(derivaUrgenza({ ...base, stato, data_consegna_prevista: '2026-07-09' }, OGGI).pila).toBeNull()
    }
  })

  it('ricevuto → blu, APPENA ARRIVATO', () => {
    const u = derivaUrgenza({ ...base, stato: 'ricevuto', data_consegna_prevista: '2026-07-14' }, OGGI)
    expect(u.pila).toBe('blu')
    expect(u.pillTempo).toEqual({ testo: 'APPENA ARRIVATO', famiglia: 'blue' })
    expect(u.consegnabile).toBe(false)
  })

  it('in_prova e in_prova_esterna → viola, IN PROVA (P5)', () => {
    for (const stato of ['in_prova', 'in_prova_esterna'] as const) {
      const u = derivaUrgenza({ ...base, stato, data_consegna_prevista: '2026-07-14' }, OGGI)
      expect(u.pila).toBe('viola')
      expect(u.pillTempo).toEqual({ testo: 'IN PROVA', famiglia: 'purple' })
    }
  })

  it('sospeso → ambra in fondo, FERMO', () => {
    const u = derivaUrgenza({ ...base, stato: 'sospeso', data_consegna_prevista: '2026-07-14' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.inFondo).toBe(true)
    expect(u.pillTempo).toEqual({ testo: 'FERMO', famiglia: 'amber' })
  })

  it('pronto con consegna oggi → rossa, OGGI · hh:mm, consegnabile', () => {
    const u = derivaUrgenza({ stato: 'pronto', data_consegna_prevista: '2026-07-09', ora_consegna: '16:00:00' }, OGGI)
    expect(u.pila).toBe('rossa')
    expect(u.inCima).toBe(false)
    expect(u.pillTempo).toEqual({ testo: 'OGGI · 16:00', famiglia: 'red' })
    expect(u.consegnabile).toBe(true)
  })

  it('pronto senza ora → OGGI secco', () => {
    const u = derivaUrgenza({ stato: 'pronto', data_consegna_prevista: '2026-07-09', ora_consegna: null }, OGGI)
    expect(u.pillTempo).toEqual({ testo: 'OGGI', famiglia: 'red' })
  })

  it('pronto in ritardo di 1 giorno → rossa in cima, DA IERI (il ritardo si legge dalle DATE, mai dallo stato)', () => {
    const u = derivaUrgenza({ ...base, stato: 'pronto', data_consegna_prevista: '2026-07-08' }, OGGI)
    expect(u.pila).toBe('rossa')
    expect(u.inCima).toBe(true)
    expect(u.giorniRitardo).toBe(1)
    expect(u.pillTempo).toEqual({ testo: 'DA IERI', famiglia: 'red' })
    expect(u.consegnabile).toBe(true)
  })

  it('pronto in ritardo di 2+ giorni → −N GIORNI', () => {
    const u = derivaUrgenza({ ...base, stato: 'pronto', data_consegna_prevista: '2026-07-07' }, OGGI)
    expect(u.pillTempo).toEqual({ testo: '−2 GIORNI', famiglia: 'red' })
  })

  it('pronto con consegna futura → ambra, PRONTA ✓ (sale in rossa la mattina della consegna)', () => {
    const u = derivaUrgenza({ ...base, stato: 'pronto', data_consegna_prevista: '2026-07-10' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.pillTempo).toEqual({ testo: 'PRONTA ✓', famiglia: 'green' })
  })

  it('in_lavorazione puntuale → ambra, pill delegata al chiamante (fase corrente, P6)', () => {
    const u = derivaUrgenza({ ...base, stato: 'in_lavorazione', data_consegna_prevista: '2026-07-10' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.pillTempo).toBeNull()
    expect(u.consegnabile).toBe(false)
  })

  it('in_lavorazione con data passata → ambra IN CIMA con pill rossa (segnale, non pila rossa)', () => {
    const u = derivaUrgenza({ ...base, stato: 'in_lavorazione', data_consegna_prevista: '2026-07-08' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.inCima).toBe(true)
    expect(u.pillTempo).toEqual({ testo: 'DA IERI', famiglia: 'red' })
  })

  it('lo stato in_ritardo (trigger, nasce solo da in_lavorazione) → ambra in cima anche se la data non è ancora passata', () => {
    const u = derivaUrgenza({ ...base, stato: 'in_ritardo', data_consegna_prevista: '2026-07-09' }, OGGI)
    expect(u.pila).toBe('ambra')
    expect(u.inCima).toBe(true)
    expect(u.giorniRitardo).toBeGreaterThanOrEqual(1)
    expect(u.consegnabile).toBe(true) // in_ritardo ∈ STATI_CONSEGNABILI
  })
})

describe('confrontaUrgenza — ordinamento dentro la pila (§4.1)', () => {
  const el = (stato: string, data: string, ora: string | null) => ({
    urgenza: derivaUrgenza({ stato: stato as never, data_consegna_prevista: data, ora_consegna: ora }, OGGI),
    data, ora,
  })

  it('ritardi in cima (più giorni di ritardo prima), poi data+ora asc, sospesi in fondo', () => {
    const fermo = el('sospeso', '2026-07-06', null)
    const moltoInRitardo = el('in_lavorazione', '2026-07-07', null)
    const daIeri = el('in_lavorazione', '2026-07-08', null)
    const perVenerdi = el('in_lavorazione', '2026-07-10', null)
    const perLunedi = el('in_lavorazione', '2026-07-13', null)
    const ordinati = [perLunedi, fermo, daIeri, perVenerdi, moltoInRitardo].sort(confrontaUrgenza)
    expect(ordinati).toEqual([moltoInRitardo, daIeri, perVenerdi, perLunedi, fermo])
  })

  it('a parità, ora presente prima di ora assente e ora più vicina prima', () => {
    const alle14 = el('pronto', '2026-07-09', '14:00:00')
    const alle16 = el('pronto', '2026-07-09', '16:00:00')
    const senzaOra = el('pronto', '2026-07-09', null)
    expect([senzaOra, alle16, alle14].sort(confrontaUrgenza)).toEqual([alle14, alle16, senzaOra])
  })
})
```

- [ ] **Step 2: Esegui — deve fallire**

Run: `npx vitest run tests/unit/derivaUrgenza.test.ts`
Expected: FAIL — `Cannot find module '@/lib/lavori/urgenza'`.

- [ ] **Step 3: Implementa `src/lib/lavori/urgenza.ts`**

```ts
// E4 — adapter urgenza: l'UNICO modulo dell'app che conosce lo stato
// `in_ritardo` (condizione temporale travestita da fase — deprecazione
// tracciata in spec §11). Le pile, le query e il server passano da qui.
// Client-safe: pure function, nessun accesso a rete o env.

import type { StatoLavoro } from '@/types/domain'
import { isStatoConsegnabile } from '@/lib/consegna/costanti'
import type { Famiglia } from '@/components/ds/Pill'

export type Pila = 'rossa' | 'ambra' | 'viola' | 'blu'

export type LavoroPerUrgenza = {
  stato: StatoLavoro
  data_consegna_prevista: string
  ora_consegna: string | null
}

export type Urgenza = {
  pila: Pila | null
  giorniRitardo: number
  inCima: boolean
  inFondo: boolean
  consegnabile: boolean
  pillTempo: { testo: string; famiglia: Famiglia } | null
}

const MS_GIORNO = 24 * 60 * 60 * 1000

/** Giorni INTERI di ritardo della consegna rispetto a `oggi` (date-only, tz locale). */
function giorniDiRitardo(dataConsegna: string, oggi: Date): number {
  const [y, m, d] = dataConsegna.split('-').map(Number)
  const consegna = new Date(y, m - 1, d)
  const oggiZero = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
  return Math.max(0, Math.round((oggiZero.getTime() - consegna.getTime()) / MS_GIORNO))
}

function pillRitardo(giorni: number): { testo: string; famiglia: Famiglia } {
  return { testo: giorni === 1 ? 'DA IERI' : `−${giorni} GIORNI`, famiglia: 'red' }
}

function oraBreve(ora: string | null): string | null {
  if (!ora) return null
  const [h, m] = ora.split(':')
  return `${h}:${m}`
}

export function derivaUrgenza(lavoro: LavoroPerUrgenza, oggi: Date): Urgenza {
  const { stato, data_consegna_prevista, ora_consegna } = lavoro
  const consegnabile = isStatoConsegnabile(stato)
  const vuota: Urgenza = { pila: null, giorniRitardo: 0, inCima: false, inFondo: false, consegnabile, pillTempo: null }

  if (stato === 'consegnato' || stato === 'annullato') return vuota

  if (stato === 'in_prova' || stato === 'in_prova_esterna') {
    return { ...vuota, pila: 'viola', pillTempo: { testo: 'IN PROVA', famiglia: 'purple' } }
  }

  if (stato === 'ricevuto') {
    return { ...vuota, pila: 'blu', pillTempo: { testo: 'APPENA ARRIVATO', famiglia: 'blue' } }
  }

  if (stato === 'sospeso') {
    return { ...vuota, pila: 'ambra', inFondo: true, pillTempo: { testo: 'FERMO', famiglia: 'amber' } }
  }

  // Da qui: pronto · in_lavorazione · in_ritardo — il ritardo si CALCOLA dalle
  // date; lo stato `in_ritardo` (scritto dal trigger solo da in_lavorazione,
  // P2-7) vale come ritardo di almeno 1 giorno anche se la data non è passata.
  const dalleDate = giorniDiRitardo(data_consegna_prevista, oggi)
  const giorniRitardo = stato === 'in_ritardo' ? Math.max(1, dalleDate) : dalleDate

  if (stato === 'pronto') {
    if (giorniRitardo > 0) {
      return { ...vuota, pila: 'rossa', inCima: true, giorniRitardo, pillTempo: pillRitardo(giorniRitardo) }
    }
    if (giorniDiRitardo(data_consegna_prevista, new Date(oggi.getTime() + MS_GIORNO)) > 0) {
      // consegna == oggi (domani sarebbe in ritardo)
      const ora = oraBreve(ora_consegna)
      return { ...vuota, pila: 'rossa', pillTempo: { testo: ora ? `OGGI · ${ora}` : 'OGGI', famiglia: 'red' } }
    }
    return { ...vuota, pila: 'ambra', pillTempo: { testo: 'PRONTA ✓', famiglia: 'green' } }
  }

  // in_lavorazione / in_ritardo: sul banco; se in ritardo, in cima con pill rossa.
  if (giorniRitardo > 0) {
    return { ...vuota, pila: 'ambra', inCima: true, giorniRitardo, pillTempo: pillRitardo(giorniRitardo) }
  }
  return { ...vuota, pila: 'ambra', pillTempo: null } // pill fase: la decide il chiamante (P6)
}

/** Ordinamento dentro una pila (§4.1): ritardi in cima (più gravi prima),
 *  poi consegna data+ora ascendente (senza ora = fine giornata), sospesi in fondo. */
export function confrontaUrgenza(
  a: { urgenza: Urgenza; data: string; ora: string | null },
  b: { urgenza: Urgenza; data: string; ora: string | null },
): number {
  const fascia = (x: { urgenza: Urgenza }) => (x.urgenza.inFondo ? 2 : x.urgenza.inCima ? 0 : 1)
  if (fascia(a) !== fascia(b)) return fascia(a) - fascia(b)
  if (a.urgenza.inCima && b.urgenza.inCima && a.urgenza.giorniRitardo !== b.urgenza.giorniRitardo) {
    return b.urgenza.giorniRitardo - a.urgenza.giorniRitardo
  }
  const chiave = (x: { data: string; ora: string | null }) => `${x.data}T${x.ora ?? '23:59:59'}`
  return chiave(a) < chiave(b) ? -1 : chiave(a) > chiave(b) ? 1 : 0
}
```

- [ ] **Step 4: Esegui — deve passare**

Run: `npx vitest run tests/unit/derivaUrgenza.test.ts && npx tsc --noEmit`
Expected: PASS, tsc pulito.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lavori/urgenza.ts tests/unit/derivaUrgenza.test.ts
git commit -m "feat(lavori): adapter derivaUrgenza + confrontaUrgenza (E4) — in_ritardo incapsulato"
```

---

### Task 5: Data layer — `getPileHome()` + `getSegnaleStriscia()`

**Files:**
- Create: `src/lib/dashboard/pile-home.ts` (query + mapping puro + formattatori sub)
- Create: `src/lib/dashboard/striscia.ts` (gerarchia segnali §6 — `scegliSegnale` puro + fetch)
- Test: `tests/unit/pile-home.test.ts`, `tests/unit/striscia.test.ts`

**Interfaces:**
- Consumes: `derivaUrgenza`, `confrontaUrgenza`, `Pila` da `@/lib/lavori/urgenza` · `Famiglia` da `@/components/ds/Pill` · `getMaterialiEsaurimento`, `getPagamentiScadutiTop` da `@/lib/dashboard/queries`.
- Produces (i Task 7-9 dipendono da queste firme ESATTE):

```ts
// pile-home.ts
export type LavoroPila = {
  id: string; numero: string; dentista: string; paziente: string; tipoLavoro: string
  pill: { testo: string; famiglia: Famiglia }
  consegnabile: boolean
  consegna: { data: string; ora: string | null }
}
export type DatiPileStriscia = {
  ritardoPiuGrave: { numero: string; giorni: number } | null
  consegnaOggiNonPronta: { numero: string; ora: string | null } | null
  provaRientroOggi: string | null
  arrivoVecchio: string | null
  fermo: { id: string; numero: string; giorni: number } | null
  consegneOggiTotali: number
  prossimaOra: string | null
}
export type PileHome = { liste: Record<Pila, LavoroPila[]>; sub: Record<Pila, string>; striscia: DatiPileStriscia }
export function mapPileHome(rows: RawLavoroPila[], oggi: Date): PileHome        // PURO — testabile
export async function getPileHome(svc: SupabaseClient, labId: string, opts?: { tecnicoId?: string | null }): Promise<PileHome>
export async function getPerimetroHome(svc: SupabaseClient, labId: string, userId: string, ruolo: string): Promise<{ tecnicoId: string | null }>

// striscia.ts
export type SegnaleStriscia = {
  attenzione: boolean
  forte: string | null                                   // parte in grassetto --ink
  testo: string                                          // resto della riga (1 riga, ellissi CSS)
  azione: { etichetta: string; href: string } | null     // CTA mai troncata
}
export type IngressiStriscia = {
  fatturaScartata: { id: string; numero: string } | null
  materialeRosso: string | null
  pagamentoScaduto: string | null
  ddcOggi: number
  pile: DatiPileStriscia
}
export function scegliSegnale(ruolo: string, i: IngressiStriscia): SegnaleStriscia   // PURO — testabile
export async function getSegnaleStriscia(svc: SupabaseClient, labId: string, ruolo: string, pile: PileHome): Promise<SegnaleStriscia>
```

- [ ] **Step 1: Verifica i contratti esistenti (binding, prima dei test)**

Run: `sed -n '230,300p' src/lib/dashboard/queries.ts`
Annotare i campi ESATTI restituiti da `getPagamentiScadutiTop` (display del cliente) e `getMaterialiEsaurimento` (nome materiale): `getSegnaleStriscia` li consuma. Run: `grep -n "stato_sdi" src/app/api/fatture -r | head` per confermare i valori runtime «scartata»/«mancata_consegna»/«rifiutata» usati dal codice fattura (spec §6 segnale 1: valori runtime, non solo CHECK schema) — la costante `SDI_SCARTATE` del file usa i valori confermati qui.

- [ ] **Step 2: Scrivi i test che falliscono — `pile-home.test.ts`**

I test coprono `mapPileHome` (puro). La riga raw riproduce la SELECT del Step 4.

```ts
// tests/unit/pile-home.test.ts
import { mapPileHome, type RawLavoroPila } from '@/lib/dashboard/pile-home'

const OGGI = new Date('2026-07-09T10:00:00') // giovedì 9 luglio — l'ancora del cast mockup

function raw(p: Partial<RawLavoroPila>): RawLavoroPila {
  return {
    id: 'id-1', numero_lavoro: '147', stato: 'pronto',
    data_consegna_prevista: '2026-07-09', ora_consegna: '16:00:00',
    descrizione: 'Corona zirconia', created_at: '2026-07-01T08:00:00Z', updated_at: '2026-07-08T08:00:00Z',
    clienti: { nome: 'Aldo', cognome: 'Esposito', studio_nome: 'Studio Esposito' },
    pazienti: { codice_paziente: 'PZ-0412' },
    lavori_fasi: [], lavoro_prove: [],
    ...p,
  }
}

describe('mapPileHome — il cast del mockup, riprodotto (home.html + pila-aperta.html)', () => {
  const rows: RawLavoroPila[] = [
    raw({ id: 'l147' }), // pronto oggi 16:00 → rossa
    raw({ id: 'l144', numero_lavoro: '144', stato: 'pronto', data_consegna_prevista: '2026-07-08', ora_consegna: null,
          descrizione: 'Ponte 3 elementi', clienti: { nome: 'Anna', cognome: 'Bianchi', studio_nome: null }, pazienti: { codice_paziente: 'PZ-0398' } }),
    raw({ id: 'l149', numero_lavoro: '149', stato: 'in_lavorazione', data_consegna_prevista: '2026-07-10', ora_consegna: null,
          descrizione: 'Scheletrato', pazienti: { codice_paziente: 'PZ-0421' },
          lavori_fasi: [
            { eseguita_at: '2026-07-08T10:00:00Z', deleted_at: null, fase: { descrizione: 'Fusione', ordine: 1 } },
            { eseguita_at: null, deleted_at: null, fase: { descrizione: 'Rifinitura', ordine: 2 } },
          ] }), // ultima fase rimasta → STA PER FINIRE
    raw({ id: 'l148', numero_lavoro: '148', stato: 'in_lavorazione', data_consegna_prevista: '2026-07-14', ora_consegna: null,
          descrizione: 'Faccette in ceramica', pazienti: { codice_paziente: 'PZ-0424' },
          lavori_fasi: [
            { eseguita_at: '2026-07-08T10:00:00Z', deleted_at: null, fase: { descrizione: 'Modellazione', ordine: 1 } },
            { eseguita_at: null, deleted_at: null, fase: { descrizione: 'In forno', ordine: 2 } },
            { eseguita_at: null, deleted_at: null, fase: { descrizione: 'Rifinitura', ordine: 3 } },
          ] }), // fase corrente non ultima → IN FORNO
    raw({ id: 'l150', numero_lavoro: '150', stato: 'sospeso', data_consegna_prevista: '2026-07-06', ora_consegna: null,
          descrizione: 'Corona metallo-ceramica', updated_at: '2026-07-03T08:00:00Z', pazienti: { codice_paziente: 'PZ-0430' } }),
    raw({ id: 'l145', numero_lavoro: '145', stato: 'in_prova_esterna', data_consegna_prevista: '2026-07-15', ora_consegna: null,
          descrizione: 'Corona in disilicato', pazienti: { codice_paziente: 'PZ-0408' },
          lavoro_prove: [{ data_rientro_prevista: '2026-07-13', data_rientro_effettiva: null }] }),
    raw({ id: 'l151', numero_lavoro: '151', stato: 'ricevuto', data_consegna_prevista: '2026-07-16', ora_consegna: null,
          descrizione: 'Protesi totale', created_at: '2026-07-09T07:00:00Z', pazienti: { codice_paziente: 'PZ-0433' } }),
    raw({ id: 'l152', numero_lavoro: '152', stato: 'ricevuto', data_consegna_prevista: '2026-07-16', ora_consegna: null,
          descrizione: 'Intarsio', created_at: '2026-07-08T07:00:00Z', pazienti: { codice_paziente: 'PZ-0435' } }),
    raw({ id: 'fuori', numero_lavoro: '130', stato: 'consegnato' }),
  ]
  const pile = mapPileHome(rows, OGGI)

  it('distribuisce nelle 4 pile: rossa 2 · ambra 3 · viola 1 · blu 2 (consegnato fuori)', () => {
    expect(pile.liste.rossa.map((l) => l.numero)).toEqual(['144', '147']) // ritardo in cima
    expect(pile.liste.ambra.map((l) => l.numero)).toEqual(['149', '148', '150']) // sospeso in fondo
    expect(pile.liste.viola.map((l) => l.numero)).toEqual(['145'])
    expect(pile.liste.blu.map((l) => l.numero)).toEqual(['151', '152'])
  })

  it('pill: DA IERI · OGGI · 16:00 · STA PER FINIRE · IN FORNO · FERMO · IN PROVA · APPENA ARRIVATO', () => {
    expect(pile.liste.rossa[0].pill).toEqual({ testo: 'DA IERI', famiglia: 'red' })
    expect(pile.liste.rossa[1].pill).toEqual({ testo: 'OGGI · 16:00', famiglia: 'red' })
    expect(pile.liste.ambra[0].pill).toEqual({ testo: 'STA PER FINIRE', famiglia: 'amber' })
    expect(pile.liste.ambra[1].pill).toEqual({ testo: 'IN FORNO', famiglia: 'amber' })
    expect(pile.liste.ambra[2].pill).toEqual({ testo: 'FERMO', famiglia: 'amber' })
    expect(pile.liste.viola[0].pill).toEqual({ testo: 'IN PROVA', famiglia: 'purple' })
    expect(pile.liste.blu[0].pill).toEqual({ testo: 'APPENA ARRIVATO', famiglia: 'blue' })
  })

  it('consegnabile SOLO sui consegnabili (per il TastoConsegnaInline del primo della rossa)', () => {
    expect(pile.liste.rossa[0].consegnabile).toBe(true)
    expect(pile.liste.ambra.every((l) => !l.consegnabile)).toBe(true)
  })

  it('dentista = studio_nome ?? nome cognome · paziente = codice_paziente (mai nome in chiaro)', () => {
    expect(pile.liste.rossa[1].dentista).toBe('Studio Esposito')
    expect(pile.liste.rossa[0].dentista).toBe('Anna Bianchi')
    expect(pile.liste.rossa[0].paziente).toBe('PZ-0398')
  })

  it('sub della home: regola subline — numero primo, mai troncato (§5.7 rev. 3.1)', () => {
    expect(pile.sub.rossa).toBe('n.144 da ieri · n.147 alle 16')
    expect(pile.sub.ambra).toBe('n.149 per venerdì')
    expect(pile.sub.viola).toBe('n.145 torna lunedì')
    expect(pile.sub.blu).toBe('n.151 e n.152 da confermare')
  })

  it('sub di sollievo a pila vuota (L5 — le pile non si nascondono mai)', () => {
    const vuote = mapPileHome([], OGGI)
    expect(vuote.sub.rossa).toBe('Tutte consegnate ✓')
    expect(vuote.sub.ambra).toBe('Niente sul banco')
    expect(vuote.sub.viola).toBe('Nessuna prova in giro')
    expect(vuote.sub.blu).toBe('Nessun nuovo arrivo')
  })

  it('dati striscia: ritardo più grave, fermo ≥5gg, arrivo >24h, prossima ora', () => {
    expect(pile.striscia.ritardoPiuGrave).toEqual({ numero: '144', giorni: 1 })
    expect(pile.striscia.fermo).toEqual({ id: 'l150', numero: '150', giorni: 6 })
    expect(pile.striscia.arrivoVecchio).toBe('152') // creato ieri, >24h fa
    expect(pile.striscia.consegneOggiTotali).toBe(2) // n.144 (dovuta ieri, va gestita oggi) + n.147
    expect(pile.striscia.prossimaOra).toBe('16:00')
  })
})
```

- [ ] **Step 3: Scrivi i test che falliscono — `striscia.test.ts`**

```ts
// tests/unit/striscia.test.ts
import { scegliSegnale, type IngressiStriscia } from '@/lib/dashboard/striscia'

const VUOTO: IngressiStriscia = {
  fatturaScartata: null, materialeRosso: null, pagamentoScaduto: null, ddcOggi: 0,
  pile: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null,
          arrivoVecchio: null, fermo: null, consegneOggiTotali: 0, prossimaOra: null },
}

describe('scegliSegnale — gerarchia §6, una riga alla volta', () => {
  it('titolare: la fattura scartata vince su tutto (segnale 1)', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' },
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s).toEqual({ attenzione: true, forte: 'Fattura n.2026-0139', testo: 'scartata',
      azione: { etichetta: 'Sistemala ›', href: '/fatture/f1' } })
  })

  it('front_desk: parte dagli operativi — il ritardo vince sulla fattura scartata (P7, §3.2)', () => {
    const s = scegliSegnale('front_desk', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' },
      pile: { ...VUOTO.pile, ritardoPiuGrave: { numero: '144', giorni: 1 } } })
    expect(s.forte).toBe('n.144')
    expect(s.testo).toBe('doveva uscire ieri')
    expect(s.azione).toEqual({ etichetta: 'Apri ›', href: '/lavori?pila=rossa' })
  })

  it('tecnico: mai segnali fiscali/pagamenti/materiali (P7)', () => {
    const s = scegliSegnale('tecnico', { ...VUOTO,
      fatturaScartata: { id: 'f1', numero: '2026-0139' }, materialeRosso: 'Zirconia', pagamentoScaduto: 'Studio Verdi' })
    expect(s.attenzione).toBe(false) // cade sul segnale 9
  })

  it('segnale 2b: consegna di oggi non pronta', () => {
    const s = scegliSegnale('titolare', { ...VUOTO,
      pile: { ...VUOTO.pile, consegnaOggiNonPronta: { numero: '147', ora: '16:00' }, consegneOggiTotali: 1, prossimaOra: '16:00' } })
    expect(s).toEqual({ attenzione: true, forte: 'n.147',
      testo: 'non è ancora pronto per le 16:00', azione: { etichetta: 'Apri ›', href: '/lavori?pila=ambra' } })
  })

  it('segnali 3→8 in cascata quando i precedenti sono risolti', () => {
    const base = { ...VUOTO }
    expect(scegliSegnale('titolare', { ...base, pile: { ...base.pile, provaRientroOggi: '145' } }).testo).toBe('torna oggi dalla prova')
    expect(scegliSegnale('titolare', { ...base, pile: { ...base.pile, arrivoVecchio: '151' } }).testo).toBe('aspetta conferma da ieri')
    expect(scegliSegnale('titolare', { ...base, materialeRosso: 'Zirconia' })).toEqual({
      attenzione: true, forte: 'Zirconia', testo: 'sta per finire', azione: { etichetta: 'Riordina ›', href: '/magazzino' } })
    expect(scegliSegnale('titolare', { ...base, pile: { ...base.pile, fermo: { id: 'l150', numero: '150', giorni: 6 } } })).toEqual({
      attenzione: true, forte: 'n.150', testo: 'è fermo da 6 giorni', azione: { etichetta: 'Apri ›', href: '/lavori/l150' } })
    expect(scegliSegnale('titolare', { ...base, pagamentoScaduto: 'Studio Verdi' })).toEqual({
      attenzione: true, forte: 'Studio Verdi', testo: 'ha un pagamento scaduto', azione: { etichetta: 'Guarda ›', href: '/scadenzario' } })
    expect(scegliSegnale('titolare', { ...base, ddcOggi: 2 })).toEqual({
      attenzione: false, forte: null, testo: 'Oggi ho preparato 2 DdC ✓', azione: null })
  })

  it('segnale 6 sotto soglia (<5 giorni) NON scatta', () => {
    const s = scegliSegnale('titolare', { ...VUOTO, pile: { ...VUOTO.pile, fermo: { id: 'x', numero: '150', giorni: 4 } } })
    expect(s.attenzione).toBe(false)
  })

  it('segnale 9 — sereno, coi numeri del giorno', () => {
    expect(scegliSegnale('titolare', { ...VUOTO, pile: { ...VUOTO.pile, consegneOggiTotali: 2, prossimaOra: '16:00' } }))
      .toEqual({ attenzione: false, forte: 'Tutto a posto:', testo: '2 consegne oggi, la prossima alle 16:00', azione: null })
    expect(scegliSegnale('titolare', VUOTO).testo).toBe('nessuna consegna oggi')
  })
})
```

- [ ] **Step 4: Esegui — devono fallire** · Run: `npx vitest run tests/unit/pile-home.test.ts tests/unit/striscia.test.ts` · Expected: FAIL (moduli inesistenti).

- [ ] **Step 5: Implementa `src/lib/dashboard/pile-home.ts`**

```ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StatoLavoro } from '@/types/domain'
import { derivaUrgenza, confrontaUrgenza, type Pila } from '@/lib/lavori/urgenza'
import type { Famiglia } from '@/components/ds/Pill'

export type RawLavoroPila = {
  id: string; numero_lavoro: string; stato: StatoLavoro
  data_consegna_prevista: string; ora_consegna: string | null
  descrizione: string; created_at: string; updated_at: string
  clienti: { nome: string; cognome: string; studio_nome: string | null } | null
  pazienti: { codice_paziente: string | null } | null
  lavori_fasi: Array<{ eseguita_at: string | null; deleted_at: string | null; fase: { descrizione: string; ordine: number } | null }>
  lavoro_prove: Array<{ data_rientro_prevista: string | null; data_rientro_effettiva: string | null }>
}

export type LavoroPila = { /* firma in Interfaces */ }
export type DatiPileStriscia = { /* firma in Interfaces */ }
export type PileHome = { liste: Record<Pila, LavoroPila[]>; sub: Record<Pila, string>; striscia: DatiPileStriscia }

const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato']
const MS_GIORNO = 24 * 60 * 60 * 1000

function dataLocale(iso: string): Date { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
function deltaGiorni(iso: string, oggi: Date): number {
  const zero = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate())
  return Math.round((dataLocale(iso).getTime() - zero.getTime()) / MS_GIORNO)
}
/** «oggi» · «domani» · «venerdì» (o «venerdì 10» con conNumero) — parole del banco §2.1. */
export function giornoBreve(iso: string, oggi: Date, conNumero = false): string {
  const delta = deltaGiorni(iso, oggi)
  if (delta === 0) return 'oggi'
  if (delta === 1) return 'domani'
  const d = dataLocale(iso)
  return conNumero ? `${GIORNI[d.getDay()]} ${d.getDate()}` : GIORNI[d.getDay()]
}
/** «alle 16» · «alle 16:30» — il minuto :00 si omette (regola subline: il dato non si tronca, si accorcia). */
function oraBrevissima(ora: string | null): string | null {
  if (!ora) return null
  const [h, m] = ora.split(':')
  return m === '00' ? `alle ${Number(h)}` : `alle ${Number(h)}:${m}`
}

function fraseRossa(l: { numero: string; giorniRitardo: number; ora: string | null }): string {
  if (l.giorniRitardo === 1) return `n.${l.numero} da ieri`
  if (l.giorniRitardo > 1) return `n.${l.numero} da ${l.giorniRitardo} giorni`
  return `n.${l.numero} ${oraBrevissima(l.ora) ?? 'oggi'}`
}

export function mapPileHome(rows: RawLavoroPila[], oggi: Date): PileHome {
  type Interno = LavoroPila & { _u: ReturnType<typeof derivaUrgenza>; _raw: RawLavoroPila }
  const liste: Record<Pila, Interno[]> = { rossa: [], ambra: [], viola: [], blu: [] }

  for (const r of rows) {
    const u = derivaUrgenza({ stato: r.stato, data_consegna_prevista: r.data_consegna_prevista, ora_consegna: r.ora_consegna }, oggi)
    if (!u.pila) continue
    liste[u.pila].push({
      id: r.id, numero: r.numero_lavoro,
      dentista: r.clienti?.studio_nome ?? `${r.clienti?.nome ?? ''} ${r.clienti?.cognome ?? ''}`.trim() || '—',
      paziente: r.pazienti?.codice_paziente ?? '—',
      tipoLavoro: r.descrizione,
      pill: u.pillTempo ?? pillFase(r, oggi),
      consegnabile: u.consegnabile,
      consegna: { data: r.data_consegna_prevista, ora: r.ora_consegna },
      _u: u, _raw: r,
    })
  }
  for (const pila of Object.keys(liste) as Pila[]) {
    liste[pila].sort((a, b) => confrontaUrgenza(
      { urgenza: a._u, data: a.consegna.data, ora: a.consegna.ora },
      { urgenza: b._u, data: b.consegna.data, ora: b.consegna.ora },
    ))
  }
  return { liste: pulisci(liste), sub: costruisciSub(liste, oggi), striscia: costruisciStriscia(liste, oggi) }
}
```

`pillFase(r, oggi)` (P6): fasi vive = `r.lavori_fasi.filter(f => !f.deleted_at && f.fase)` ordinate per `fase.ordine`; `daFare = vive.filter(f => !f.eseguita_at)`; se `daFare.length === 1` → `{ testo: 'STA PER FINIRE', famiglia: 'amber' }`; se `>1` → `{ testo: daFare[0].fase.descrizione.toUpperCase(), famiglia: 'amber' }`; se `0` (nessuna fase configurata) → `{ testo: `PER ${giornoBreve(r.data_consegna_prevista, oggi, true).toUpperCase()}`, famiglia: 'amber' }`.

`costruisciSub` (regola subline §5.7 rev. 3.1 — numero primo, coda descrittiva ellidibile via CSS):
- rossa: prime 2 → `fraseRossa` unite con ` · `; vuota → `'Tutte consegnate ✓'`.
- ambra: primo NON in fondo → `` `n.${numero} per ${giornoBreve(consegna.data, oggi)}` ``; se il primo è in ritardo → `fraseRossa`; vuota → `'Niente sul banco'`.
- viola: primo → `` `n.${numero} torna ${giornoBreve(rientro, oggi)}` `` dove `rientro` = `data_rientro_prevista` della prima `lavoro_prove` con `data_rientro_effettiva === null` (fallback: senza prova aperta → `` `n.${numero} in prova` ``); vuota → `'Nessuna prova in giro'`.
- blu: 1 → `n.151 da confermare` · 2 → `n.151 e n.152 da confermare` · ≥3 → `` `n.A, n.B e altri ${n} da confermare` ``; vuota → `'Nessun nuovo arrivo'`.

`costruisciStriscia`:
- `ritardoPiuGrave`: primo elemento inCima della ROSSA (pronto in ritardo) — o, se rossa pulita, il primo inCima dell'ambra; `{numero, giorni: _u.giorniRitardo}`.
- `consegnaOggiNonPronta`: primo dell'ambra con `deltaGiorni(consegna.data)===0` e non inFondo → `{numero, ora: ora HH:mm o null}`.
- `provaRientroOggi`: primo viola con rientro previsto ≤ oggi (non rientrato) → numero.
- `arrivoVecchio`: primo blu con `created_at` più vecchio di 24h rispetto a `oggi` → numero.
- `fermo`: primo inFondo dell'ambra con `giorni = floor((oggi − updated_at)/86400000)` ≥ 5 → `{id, numero, giorni}` (P8; sotto soglia → null).
- `consegneOggiTotali`: `liste.rossa.length` («da consegnare oggi» = va gestito oggi, ritardi inclusi — spec §4).
- `prossimaOra`: prima `ora_consegna` non-null della rossa non in ritardo, formato `HH:mm`.

`getPileHome` (fetch — nessun filtro su `in_ritardo`, E4):

```ts
export async function getPileHome(svc: SupabaseClient, labId: string, opts: { tecnicoId?: string | null } = {}): Promise<PileHome> {
  let q = svc
    .from('lavori')
    .select(`id, numero_lavoro, stato, data_consegna_prevista, ora_consegna, descrizione, created_at, updated_at,
      clienti(nome, cognome, studio_nome), pazienti(codice_paziente),
      lavori_fasi(eseguita_at, deleted_at, fase:fasi_produzione(descrizione, ordine)),
      lavoro_prove(data_rientro_prevista, data_rientro_effettiva)`)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .not('stato', 'in', '("consegnato","annullato")')
    .not('numero_lavoro', 'ilike', 'STOR/%')
    .limit(500)
  if (opts.tecnicoId) q = q.eq('tecnico_id', opts.tecnicoId)
  const { data, error } = await q
  if (error) throw new Error(`getPileHome: lettura lavori fallita — ${error.message}`) // fail-closed, mai pile vuote silenziose
  return mapPileHome((data ?? []) as unknown as RawLavoroPila[], new Date())
}

export async function getPerimetroHome(svc: SupabaseClient, labId: string, userId: string, ruolo: string): Promise<{ tecnicoId: string | null }> {
  if (ruolo !== 'tecnico') return { tecnicoId: null } // titolare/admin_rete/front_desk: tutto il lab (§3.2; l'ibrido usa il perimetro titolare)
  const { data } = await svc.from('tecnici').select('id').eq('laboratorio_id', labId).eq('utente_id', userId).is('deleted_at', null).maybeSingle()
  return { tecnicoId: data?.id ?? null }
}
```

- [ ] **Step 6: Implementa `src/lib/dashboard/striscia.ts`**

```ts
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMaterialiEsaurimento, getPagamentiScadutiTop } from '@/lib/dashboard/queries'
import type { DatiPileStriscia, PileHome } from './pile-home'

export type SegnaleStriscia = { /* firma in Interfaces */ }
export type IngressiStriscia = { /* firma in Interfaces */ }

const SDI_SCARTATE = ['scartata', 'mancata_consegna', 'rifiutata'] // valori runtime confermati allo Step 1

type Candidato = (i: IngressiStriscia) => SegnaleStriscia | null
const s1: Candidato = (i) => i.fatturaScartata && { attenzione: true, forte: `Fattura n.${i.fatturaScartata.numero}`, testo: 'scartata', azione: { etichetta: 'Sistemala ›', href: `/fatture/${i.fatturaScartata.id}` } }
const s2: Candidato = (i) => {
  const r = i.pile.ritardoPiuGrave
  if (r) return { attenzione: true, forte: `n.${r.numero}`, testo: r.giorni === 1 ? 'doveva uscire ieri' : `doveva uscire ${r.giorni} giorni fa`, azione: { etichetta: 'Apri ›', href: '/lavori?pila=rossa' } }
  const c = i.pile.consegnaOggiNonPronta
  if (c) return { attenzione: true, forte: `n.${c.numero}`, testo: c.ora ? `non è ancora pronto per le ${c.ora}` : 'non è ancora pronto per oggi', azione: { etichetta: 'Apri ›', href: '/lavori?pila=ambra' } }
  return null
}
const s3: Candidato = (i) => i.pile.provaRientroOggi ? { attenzione: true, forte: `n.${i.pile.provaRientroOggi}`, testo: 'torna oggi dalla prova', azione: { etichetta: 'Apri ›', href: '/lavori?pila=viola' } } : null
const s4: Candidato = (i) => i.pile.arrivoVecchio ? { attenzione: true, forte: `n.${i.pile.arrivoVecchio}`, testo: 'aspetta conferma da ieri', azione: { etichetta: 'Conferma ›', href: '/lavori?pila=blu' } } : null
const s5: Candidato = (i) => i.materialeRosso ? { attenzione: true, forte: i.materialeRosso, testo: 'sta per finire', azione: { etichetta: 'Riordina ›', href: '/magazzino' } } : null
const s6: Candidato = (i) => i.pile.fermo && i.pile.fermo.giorni >= 5 ? { attenzione: true, forte: `n.${i.pile.fermo.numero}`, testo: `è fermo da ${i.pile.fermo.giorni} giorni`, azione: { etichetta: 'Apri ›', href: `/lavori/${i.pile.fermo.id}` } } : null
const s7: Candidato = (i) => i.pagamentoScaduto ? { attenzione: true, forte: i.pagamentoScaduto, testo: 'ha un pagamento scaduto', azione: { etichetta: 'Guarda ›', href: '/scadenzario' } } : null
const s8: Candidato = (i) => i.ddcOggi > 0 ? { attenzione: false, forte: null, testo: `Oggi ho preparato ${i.ddcOggi} DdC ✓`, azione: null } : null
const s9: Candidato = (i) => ({ attenzione: false, forte: 'Tutto a posto:', testo: i.pile.consegneOggiTotali > 0 ? `${i.pile.consegneOggiTotali} consegne oggi${i.pile.prossimaOra ? `, la prossima alle ${i.pile.prossimaOra}` : ''}` : 'nessuna consegna oggi', azione: null })

// P7 — gerarchie per ruolo (spec §6 tabella Ruoli + §3.2 front_desk «parte dagli operativi»)
const GERARCHIE: Record<string, Candidato[]> = {
  titolare: [s1, s2, s3, s4, s5, s6, s7, s8, s9],
  admin_rete: [s1, s2, s3, s4, s5, s6, s7, s8, s9],
  front_desk: [s2, s3, s4, s1, s5, s6, s8, s9],
  tecnico: [s2, s3, s4, s6, s8, s9],
}

export function scegliSegnale(ruolo: string, i: IngressiStriscia): SegnaleStriscia {
  for (const candidato of GERARCHIE[ruolo] ?? GERARCHIE.tecnico) {
    const s = candidato(i)
    if (s) return s
  }
  return s9(i) as SegnaleStriscia
}
```

`getSegnaleStriscia(svc, labId, ruolo, pile)`: raccoglie gli ingressi SOLO se il ruolo li usa (niente query fiscali per il tecnico) e delega a `scegliSegnale`:
- `fatturaScartata` (tit/fd): `svc.from('fatture').select('id, numero').eq('laboratorio_id', labId).in('stato_sdi', SDI_SCARTATE).order('created_at', { ascending: false }).limit(1)`.
- `materialeRosso` (tit/fd): `(await getMaterialiEsaurimento(svc, labId, 1))[0]?.<campo nome verificato allo Step 1> ?? null`.
- `pagamentoScaduto` (solo titolare/admin_rete): `(await getPagamentiScadutiTop(svc, labId, 1))[0]?.<campo display verificato allo Step 1> ?? null`.
- `ddcOggi` (tutti): `svc.from('dichiarazioni_conformita').select('id', { count: 'exact', head: true }).eq('laboratorio_id', labId).neq('stato', 'annullata').gte('created_at', <oggi 00:00 ISO>)` → `count ?? 0`.
- errori di lettura: `console.error` + ingresso `null`/`0` — la striscia degrada al segnale successivo, MAI un crash della home (il segnale 9 esiste sempre).

- [ ] **Step 7: Esegui — devono passare** · Run: `npx vitest run tests/unit/pile-home.test.ts tests/unit/striscia.test.ts && npx tsc --noEmit` · Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/dashboard/pile-home.ts src/lib/dashboard/striscia.ts tests/unit/pile-home.test.ts tests/unit/striscia.test.ts
git commit -m "feat(home): data layer pile v3 — getPileHome + gerarchia StrisciaStato (E4, P6-P8)"
```

---

### Task 6: Componenti ds — Pila viola, CardLavoro canonico, StrisciaStato a riga, MorphPila

**Files:**
- Modify: `src/components/ds/Pila.tsx` (4° tipo + famiglia purple)
- Modify: `src/components/ds/CardLavoro.tsx` (margini canonici 12/3 + famiglia purple + href)
- Modify: `src/components/ds/StrisciaStato.tsx` (aria-live + forte/azione — anatomia mockup)
- Create: `src/components/ds/MorphPila.tsx` (§5.28)
- Modify: `src/app/ds-v3-catalogo/page.tsx` (nuove varianti in vetrina)
- Test: `tests/unit/ds-ondata1-componenti.test.tsx`

**Interfaces:**
- Produces (consumate dai Task 7-9):
  - `Pila`: `tipo: 'daConsegnare' | 'sulBanco' | 'daRifareInProva' | 'appenaArrivati'` (label `DA RIFARE / IN PROVA`, famiglia `purple`).
  - `CardLavoro`: prop `tempo.famiglia` accetta anche `'purple'`; spaziatura riga2 `marginTop 12` / riga3 `marginTop 3` (canonico 12/3 — il fork 10/2 della home desktop si chiude qui, decision doc).
  - `StrisciaStato`: `props: { forte?: string | null; children: ReactNode; attenzione?: boolean; azione?: { etichetta: string; href: string } | null }` — testo 1 riga con ellissi, CTA flex-none MAI troncata con hit-area ≥44 (schema margin negativo del mockup), wrapper `role="status"` + `aria-live="polite"`.
  - `MorphPila`: `props: { pila: 'rossa'|'ambra'|'viola'|'blu'; numero: number; label: string; sub?: string }` — numero display 52 colore famiglia, label 13/800, sub 16/600 muted 1 riga (omessa se undefined, come il vuoto ambra del mockup).

- [ ] **Step 1: Scrivi i test che falliscono**

```tsx
// tests/unit/ds-ondata1-componenti.test.tsx
import { render, screen } from '@testing-library/react'
import { Pila } from '@/components/ds/Pila'
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import { MorphPila } from '@/components/ds/MorphPila'

describe('Pila — 4ª pila viola (rev. 3.1)', () => {
  it('renderizza DA RIFARE / IN PROVA in famiglia purple', () => {
    render(<Pila tipo="daRifareInProva" numero={1} sub="n.145 torna lunedì" onClick={() => {}} />)
    expect(screen.getByText('DA RIFARE / IN PROVA')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('1')
  })
})

describe('StrisciaStato — anatomia mockup (forte + azione mai troncata, aria-live)', () => {
  it('è una region viva educata', () => {
    render(<StrisciaStato forte="Tutto a posto:">nessuna consegna oggi</StrisciaStato>)
    const region = screen.getByRole('status')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Tutto a posto:')).toBeInTheDocument()
  })
  it('la CTA è un link separato dal blocco troncabile', () => {
    render(<StrisciaStato attenzione forte="Fattura n.139" azione={{ etichetta: 'Sistemala ›', href: '/fatture/f1' }}>scartata</StrisciaStato>)
    const cta = screen.getByRole('link', { name: 'Sistemala ›' })
    expect(cta).toHaveAttribute('href', '/fatture/f1')
  })
})

describe('MorphPila — header pila aperta (§5.28)', () => {
  it('numero + label famiglia + sub', () => {
    render(<MorphPila pila="viola" numero={1} label="Da rifare / In prova" sub="1 lavoro · torna lunedì 13" />)
    expect(screen.getByText('1 lavoro · torna lunedì 13')).toBeInTheDocument()
  })
  it('sub omessa non renderizza un nodo vuoto (pila vuota, mockup stati-vuoti)', () => {
    const { container } = render(<MorphPila pila="ambra" numero={0} label="Sul banco" />)
    expect(container.querySelectorAll('span').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Esegui — deve fallire** · Run: `npx vitest run tests/unit/ds-ondata1-componenti.test.tsx` · Expected: FAIL.

- [ ] **Step 3: Implementa**

`Pila.tsx`: `type Famiglia = 'red' | 'amber' | 'blue' | 'purple'`; `MAPPA_PILA` + `daRifareInProva: { label: 'DA RIFARE / IN PROVA', famiglia: 'purple' }` (ordine di montaggio: responsabilità della home — commento già presente). Aggiornare il commento di testa: «le QUATTRO pile di legge (rev. 3.1)».

`CardLavoro.tsx`: sostituire il `gap: spazio.s` del flex column con `gap: 0` + `marginTop: 12` sulla riga dentista e `marginTop: 3` sulla riga tipo (canonico 12/3 — commento: «decision doc 12/07: il fork home 10/2 si chiude qui»); `type Famiglia` → aggiungere `'purple'` (o importare `Famiglia` da `./Pill` ora che è esportato — preferito, un solo tipo).

`StrisciaStato.tsx` — riscrittura dell'anatomia (il componente attuale non ha né `forte` né `azione`):

```tsx
export function StrisciaStato(props: {
  children: ReactNode
  forte?: string | null
  attenzione?: boolean
  azione?: { etichetta: string; href: string } | null
}) { … }
```

Layout dal mockup `home.html` `.striscia`: contenitore `div role="status" aria-live="polite"` flex `gap 12` `minWidth: 0` · icona Ø26 (check verde / triangolo `!` rosso — resta il glifo testuale attuale) · testo `flex: 1 1 auto; minWidth: 0; whiteSpace: nowrap; overflow: hidden; textOverflow: ellipsis` 14.5/500 muted con `<b style={{ color: 'var(--ink)', fontWeight: 700 }}>{forte}</b> {children}` · se `azione`: `<Link href>` flex-none 14.5/800 `--red`, `minHeight: 44, margin: '-13px 0'` (hit-area senza cambiare l'altezza visiva — schema mockup). Niente più variante `onClick` su tutta la riga: il tap vive SOLO sulla CTA (il mockup approvato non ha la riga-bottone). `vibra('selection')` sul click della CTA.

`MorphPila.tsx` (nuovo, §5.28 — valori dal mockup `.morph`):

```tsx
'use client'
// DS v3 §5.28 (rev. 3.1) — MorphPila: la card-pila «salita» a testata della lista
// aperta (stato finale del morph §8.3.1 — l'animazione condivisa arriverà con la
// scheda; qui lo stato morphato, statico). Fonte visiva: pila-aperta.html .morph.
import { tipografia } from '@/design-system/v3/tokens'

const FAMIGLIA: Record<'rossa' | 'ambra' | 'viola' | 'blu', string> = {
  rossa: 'var(--red)', ambra: 'var(--amber)', viola: 'var(--purple)', blu: 'var(--blue)',
}

export function MorphPila(props: { pila: keyof typeof FAMIGLIA; numero: number; label: string; sub?: string }) {
  const { pila, numero, label, sub } = props
  const colore = FAMIGLIA[pila]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
      <span style={{ fontSize: tipografia.size.display, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.display, lineHeight: 1, minWidth: 56, textAlign: 'center', fontVariantNumeric: 'tabular-nums', color: colore }}>
        {numero}
      </span>
      <span style={{ flex: 1, minWidth: 0, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: tipografia.size.label, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.label, textTransform: 'uppercase', color: colore }}>{label}</span>
        {sub && <span style={{ fontSize: 16, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Ripara i consumatori esistenti** — `grep -rn "StrisciaStato" src/ tests/` : il catalogo (e ogni test esistente) va adeguato alla nuova firma. Aggiungere al catalogo: pila viola, MorphPila (4 famiglie), StrisciaStato serena + allerta con CTA.

- [ ] **Step 5: Esegui TUTTO — deve passare** · Run: `npx vitest run && npx tsc --noEmit` · Expected: suite verde (nessun consumatore rotto).

- [ ] **Step 6: Commit**

```bash
git add src/components/ds/ src/app/ds-v3-catalogo/page.tsx tests/unit/ds-ondata1-componenti.test.tsx
git commit -m "feat(ds): Pila viola, CardLavoro canonico 12/3, StrisciaStato con forte+azione aria-live, MorphPila (§5.28)"
```

---

### Task 7: Home v3 — `/dashboard` (390/768 + variante corta + banco libero)

Le 4 dashboard per ruolo escono dalla home QUI (la loro cancellazione fisica è al Task 11). Il desktop 1280 arriva al Task 9: fino ad allora, a 1280 la home mostra la colonna centrata (come 768).

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx` (riscrittura completa)
- Create: `src/components/features/home/HomeV3.tsx`
- Test: `tests/unit/HomeV3.test.tsx`

**Interfaces:**
- Consumes: `getPileHome`, `getPerimetroHome`, `PileHome` da `@/lib/dashboard/pile-home` · `getSegnaleStriscia`, `SegnaleStriscia` da `@/lib/dashboard/striscia` · `Pila`, `TastoPiu`, `TastoTondo`, `StrisciaStato` da `@/components/ds`.
- Produces: `HomeV3(props: { nome: string; eyebrow: string; saluto: string; pile: PileHome; segnale: SegnaleStriscia })` (client component).

- [ ] **Step 1: Scrivi i test che falliscono**

```tsx
// tests/unit/HomeV3.test.tsx
import { render, screen } from '@testing-library/react'
import { HomeV3 } from '@/components/features/home/HomeV3'
import type { PileHome } from '@/lib/dashboard/pile-home'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const SEGNALE = { attenzione: false, forte: 'Tutto a posto:', testo: '2 consegne oggi, la prossima alle 16:00', azione: null }
const lavoro = (numero: string): PileHome['liste']['rossa'][number] => ({
  id: `l${numero}`, numero, dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: true, consegna: { data: '2026-07-09', ora: '16:00:00' },
})
const PILE: PileHome = {
  liste: { rossa: [lavoro('147')], ambra: [], viola: [], blu: [] },
  sub: { rossa: 'n.147 alle 16', ambra: 'Niente sul banco', viola: 'Nessuna prova in giro', blu: 'Nessun nuovo arrivo' },
  striscia: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null, arrivoVecchio: null, fermo: null, consegneOggiTotali: 1, prossimaOra: '16:00' },
}

describe('HomeV3 — la home di legge (§7.1 + rev. 3.1)', () => {
  it('saluto, eyebrow, ☰, 4 pile in ordine di legge, TastoPiù', () => {
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} />)
    expect(screen.getByRole('heading', { name: /Buon pomeriggio.*Francesco/s })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tutto il resto' })).toBeInTheDocument()
    const labels = ['DA CONSEGNARE OGGI', 'SUL BANCO', 'DA RIFARE / IN PROVA', 'APPENA ARRIVATI']
    const testi = labels.map((l) => screen.getByText(l))
    expect(testi).toHaveLength(4)
    // ordine nel DOM: rossa, ambra, viola, blu
    expect(testi[0].compareDocumentPosition(testi[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: /nuovo lavoro/i })).toBeInTheDocument()
  })

  it('tap sulla pila → /lavori?pila=…', async () => {
    const { userEvent } = await import('@testing-library/user-event').then((m) => ({ userEvent: m.default.setup() }))
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} />)
    await userEvent.click(screen.getByText('DA RIFARE / IN PROVA'))
    expect(push).toHaveBeenCalledWith('/lavori?pila=viola')
  })

  it('banco libero: con tutte le pile a 0 lo stack lascia il posto al blocco sereno (mockup stati-vuoti)', () => {
    const vuote: PileHome = { ...PILE, liste: { rossa: [], ambra: [], viola: [], blu: [] } }
    render(<HomeV3 nome="Francesco" eyebrow="Martedì 15 luglio" saluto="Buongiorno" pile={vuote} segnale={SEGNALE} />)
    expect(screen.getByText('Il banco è libero')).toBeInTheDocument()
    expect(screen.queryByText('DA CONSEGNARE OGGI')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Esegui — deve fallire** · Run: `npx vitest run tests/unit/HomeV3.test.tsx` · Expected: FAIL.

- [ ] **Step 3: Implementa `HomeV3.tsx`**

Layout dal mockup `home.html` (classi `.home*`, `.pila-wrap`) — media query nel `<style>` del componente:

```tsx
'use client'

// Home v3 (§7.1 + rev. 3.1) — UNA composizione per tutti i ruoli, cambia solo il
// perimetro dati (deciso server-side). Eyebrow+saluto · StrisciaStato · 4 Pile ·
// TastoPiù. NIENT'ALTRO, per legge. No-scroll: il frame è 100dvh a <768 e la
// fascia pile assorbe lo slack; scala device-corti (≤700px) da §7.1 rev. 3.1.
import { useRouter } from 'next/navigation'
import { Pila as PilaCard } from '@/components/ds/Pila'
import { TastoPiu } from '@/components/ds/TastoPiu'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import { tipografia } from '@/design-system/v3/tokens'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'
import type { Pila } from '@/lib/lavori/urgenza'

const ORDINE: Array<{ pila: Pila; tipo: 'daConsegnare' | 'sulBanco' | 'daRifareInProva' | 'appenaArrivati' }> = [
  { pila: 'rossa', tipo: 'daConsegnare' },
  { pila: 'ambra', tipo: 'sulBanco' },
  { pila: 'viola', tipo: 'daRifareInProva' },
  { pila: 'blu', tipo: 'appenaArrivati' },
]

export function HomeV3(props: { nome: string; eyebrow: string; saluto: string; pile: PileHome; segnale: SegnaleStriscia }) {
  const { nome, eyebrow, saluto, pile, segnale } = props
  const router = useRouter()
  const bancoLibero = ORDINE.every(({ pila }) => pile.liste[pila].length === 0)

  return (
    <main className="ua-home">
      <style>{`
        .ua-home { position: relative; z-index: 1; width: 100%; max-width: 480px; margin: 0 auto;
                   padding: 24px; display: flex; flex-direction: column; min-height: 100dvh; }
        .ua-home .pile { flex: 1; display: flex; flex-direction: column; gap: 16px; justify-content: center; margin-top: 16px; }
        .ua-home .foot { margin-top: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        @media (max-width: 767px) { .ua-home { height: 100dvh; overflow: hidden; } } /* §3.3 no-scroll */
        @media (max-height: 700px) { /* §7.1 rev. 3.1 — scala device-corti */
          .ua-home { padding: 14px 24px; }
          .ua-home .striscia-slot { margin-top: 10px; }
          .ua-home .pile { gap: 10px; margin-top: 10px; }
          .ua-home .pile .ds-pila { padding: 14px 18px; }
          .ua-home .pile .ds-pila-num { font-size: 42px; }
          .ua-home .foot { margin-top: 10px; gap: 6px; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: tipografia.size.label, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.label, textTransform: 'uppercase', color: 'var(--faint)' }}>{eyebrow}</div>
          <h1 style={{ fontSize: tipografia.size.largeTitle, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.titoli, lineHeight: 1.1, marginTop: 6, color: 'var(--ink)' }}>
            {saluto},<br />{nome}
          </h1>
        </div>
        <TastoTondo glifo="☰" ariaLabel="Tutto il resto" onClick={() => router.push('/tutto-il-resto')} />
      </div>

      <div className="striscia-slot" style={{ marginTop: 16 }}>
        <StrisciaStato attenzione={segnale.attenzione} forte={segnale.forte} azione={segnale.azione}>
          {segnale.testo}
        </StrisciaStato>
      </div>

      {bancoLibero ? (
        <div className="pile" style={{ alignItems: 'center', textAlign: 'center', gap: 14 }}>
          {/* mockup stati-vuoti frame 1 — icona NEUTRA (mai tint di stato) */}
          <span aria-hidden style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', color: 'var(--faint)', fontSize: 34 }}>▭</span>
          <div style={{ fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)' }}>Il banco è libero</div>
          <div style={{ fontSize: 16, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', maxWidth: 300, lineHeight: 1.4 }}>Quando arriva un lavoro, lo vedi qui.</div>
        </div>
      ) : (
        <div className="pile">
          {ORDINE.map(({ pila, tipo }) => (
            <PilaCard key={pila} tipo={tipo} numero={pile.liste[pila].length} sub={pile.sub[pila]} onClick={() => router.push(`/lavori?pila=${pila}`)} />
          ))}
        </div>
      )}

      <div className="foot">
        <TastoPiu onClick={() => router.push('/lavori/nuovo')} />
      </div>
    </main>
  )
}
```

Note vincolanti: l'icona del banco libero è il line-SVG del mockup (`stati-vuoti-errori.html` riga 218) — copiarlo come SVG inline, NON il carattere `▭` (qui abbreviato); la scala corta agisce sulle classi `.ds-pila`/`.ds-pila-num` → `Pila.tsx` deve esporre `className="ds-pila-num"` sul numero (aggiunta di 1 riga al Task 6 se mancata). `TastoPiu` porta già etichetta e suono.

- [ ] **Step 4: Riscrivi `dashboard/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getPileHome, getPerimetroHome } from '@/lib/dashboard/pile-home'
import { getSegnaleStriscia } from '@/lib/dashboard/striscia'
import { HomeV3 } from '@/components/features/home/HomeV3'

export const dynamic = 'force-dynamic'

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

function adessoRoma(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }))
}
function saluto(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

export default async function DashboardPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo, laboratorio_id, nome').eq('id', user.id).is('deleted_at', null).single()
  if (!utente) redirect('/login')
  const { ruolo, laboratorio_id: labId } = utente
  if (!['titolare', 'admin_rete', 'tecnico', 'front_desk'].includes(ruolo)) redirect('/login') // admin_sistema usa /admin

  const perimetro = await getPerimetroHome(svc, labId, user.id, ruolo)
  const pile = await getPileHome(svc, labId, perimetro)
  const segnale = await getSegnaleStriscia(svc, labId, ruolo, pile)

  const ora = adessoRoma()
  const eyebrow = `${GIORNI[ora.getDay()]} ${ora.getDate()} ${MESI[ora.getMonth()]}`
  const nome = utente.nome ?? user.email?.split('@')[0] ?? 'Utente'

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      <HomeV3 nome={nome} eyebrow={eyebrow} saluto={saluto(ora)} pile={pile} segnale={segnale} />
    </div>
  )
}
```

Gli import delle 4 dashboard e delle query KPI spariscono da questa pagina (la cancellazione dei file è al Task 11). `preferenza_dashboard` non si legge più (la home è una, A1).

- [ ] **Step 5: Esegui — deve passare** · Run: `npx vitest run && npx tsc --noEmit` · Expected: suite verde. Se test esistenti coprivano il dispatch delle 4 dashboard, si adeguano/eliminano QUI (documentarlo nel commit).

- [ ] **Step 6: Verifica visiva rapida (dev server del worktree)**

Run: `PORT=3013 npm run dev` → browser 390×844 e 390×667 su `/dashboard` (lab E2E): nessuno scroll verticale, 4 pile, entrambi i temi. Confronto fianco-a-fianco col mockup `home.html`.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx" src/components/features/home/HomeV3.tsx tests/unit/HomeV3.test.tsx
git commit -m "feat(home): Home v3 — 4 pile + StrisciaStato + TastoPiu, unica composizione per ruoli (muoiono le 4 dashboard)"
```

---

### Task 8: Pila aperta — `/lavori` v3 (frames 390 + «Le pile» + cerca + vuoti)

**Files:**
- Modify: `src/app/(app)/lavori/page.tsx` (riscrittura completa — muoiono le tab-filtro v2.3)
- Create: `src/components/features/pile/PilaAperta.tsx`
- Create: `src/components/features/pile/LePile.tsx`
- Modify: `src/components/ds/CardLavoro.tsx` (prop `conferma` per la pila blu)
- Modify: `src/lib/dashboard/pile-home.ts` (export `subMorph`)
- Test: `tests/unit/PilaAperta.test.tsx`

**Interfaces:**
- Consumes: `PileHome`, `LavoroPila`, `giornoBreve` da `pile-home` · `MorphPila`, `CardLavoro`, `TastoTondo`, `RigaCerca`, `Vuoto` da ds · `CampoTesto` da `@/components/ds/Campo`.
- Produces:
  - `subMorph(pila: Pila, pile: PileHome, oggi: Date): string | undefined` — «2 lavori · il più vicino alle 16:00» / «4 lavori · il più vicino venerdì 10» / «1 lavoro · torna lunedì 13» / «2 lavori · da confermare»; `undefined` se la pila è vuota (la sub si omette — mockup stati-vuoti).
  - `PilaAperta(props: { pila: Pila; lista: LavoroPila[]; sub?: string })` — client.
  - `LePile(props: { conteggi: Record<Pila, number>; pilaAperta?: Pila; children?: ReactNode })` — i 4 raggruppamenti-link (`/lavori?pila=…`), ring di selezione su quello aperto.
  - `CardLavoro`: nuova prop opzionale `conferma?: { onClick: () => void }` → riga 4 alternativa `TastoSecondario` full-width «Conferma» (mai insieme a `onConsegna`).

- [ ] **Step 1: Scrivi i test che falliscono**

```tsx
// tests/unit/PilaAperta.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PilaAperta } from '@/components/features/pile/PilaAperta'
import type { LavoroPila } from '@/lib/dashboard/pile-home'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }))
beforeEach(() => push.mockClear())

const lav = (numero: string, extra: Partial<LavoroPila> = {}): LavoroPila => ({
  id: `l${numero}`, numero, dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: false, consegna: { data: '2026-07-09', ora: '16:00:00' }, ...extra,
})

describe('PilaAperta — la lista di legge (§4.1)', () => {
  it('morph header + card in ordine · tap card → scheda', async () => {
    render(<PilaAperta pila="rossa" sub="2 lavori · il più vicino alle 16:00" lista={[lav('144', { consegnabile: true, pill: { testo: 'DA IERI', famiglia: 'red' } }), lav('147')]} />)
    expect(screen.getByText('2 lavori · il più vicino alle 16:00')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Apri lavoro n.147' }))
    expect(push).toHaveBeenCalledWith('/lavori/l147')
  })

  it('TastoConsegnaInline SOLO sul primo elemento consegnabile della rossa → /lavori/[id]/consegna (P3)', async () => {
    render(<PilaAperta pila="rossa" sub="x" lista={[lav('144', { consegnabile: true }), lav('147', { consegnabile: true })]} />)
    const tasti = screen.getAllByRole('button', { name: 'CONSEGNA' })
    expect(tasti).toHaveLength(1)
    await userEvent.setup().click(tasti[0])
    expect(push).toHaveBeenCalledWith('/lavori/l144/consegna')
  })

  it('pila blu: CTA Conferma su OGNI card → scheda (P4)', () => {
    render(<PilaAperta pila="blu" sub="x" lista={[lav('151', { pill: { testo: 'APPENA ARRIVATO', famiglia: 'blue' } }), lav('152', { pill: { testo: 'APPENA ARRIVATO', famiglia: 'blue' } })]} />)
    expect(screen.getAllByRole('button', { name: 'Conferma' })).toHaveLength(2)
  })

  it('RigaCerca compare SOLO oltre 15 lavori e filtra per contains', async () => {
    const tanti = Array.from({ length: 16 }, (_, i) => lav(String(200 + i), { tipoLavoro: i === 3 ? 'Scheletrato' : 'Corona' }))
    render(<PilaAperta pila="ambra" sub="x" lista={tanti} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /cerca/i }))
    await user.type(screen.getByRole('textbox'), 'schele')
    expect(screen.getByText(/n\.203/)).toBeInTheDocument()
    expect(screen.queryByText(/n\.204/)).not.toBeInTheDocument()
  })

  it('pila vuota: morph a 0 senza sub + messaggio quieto (mockup stati-vuoti)', () => {
    render(<PilaAperta pila="ambra" lista={[]} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Niente sul banco')).toBeInTheDocument()
  })
})
```

E in `tests/unit/pile-home.test.ts` aggiungere (stesso cast del Task 5):

```ts
  it('subMorph — i numeri utili del morph header', () => {
    expect(subMorph('rossa', pile, OGGI)).toBe('2 lavori · il più vicino alle 16:00')
    expect(subMorph('ambra', pile, OGGI)).toBe('3 lavori · il più vicino venerdì 10')
    expect(subMorph('viola', pile, OGGI)).toBe('1 lavoro · torna lunedì 13')
    expect(subMorph('blu', pile, OGGI)).toBe('2 lavori · da confermare')
    expect(subMorph('rossa', mapPileHome([], OGGI), OGGI)).toBeUndefined()
  })
```

(`subMorph` rossa usa l'ora della prossima consegna NON in ritardo in formato `HH:MM`; ambra il `giornoBreve(..., conNumero=true)` del primo non-in-fondo; viola il rientro `conNumero=true`; blu «da confermare». Singolare/plurale: «1 lavoro» / «N lavori».)

- [ ] **Step 2: Esegui — deve fallire** · Run: `npx vitest run tests/unit/PilaAperta.test.tsx` · Expected: FAIL.

- [ ] **Step 3: Implementa**

`CardLavoro.tsx` — prop `conferma`: dopo la riga tipo, `conferma && <span onClick/keydown stopPropagation><TastoSecondario etichetta="Conferma" onClick={conferma.onClick} style full-width marginTop 16 /></span>` (stesso schema anti-nesting del TastoConsegnaInline; verificare la firma reale di `TastoSecondario` nel file e adattare l'invocazione).

`pile-home.ts` — `subMorph` come da Interfaces (pure function, riusa `giornoBreve`; per la rossa l'ora si prende da `striscia.prossimaOra`; per la viola serve il rientro: salvarlo su `LavoroPila` come campo `rientro: string | null` valorizzato in `mapPileHome` — aggiornare il tipo e i test del Task 5 di conseguenza).

`PilaAperta.tsx` (client) — struttura dal mockup `pila-aperta.html` frames 390:

```tsx
'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MorphPila } from '@/components/ds/MorphPila'
import { CardLavoro } from '@/components/ds/CardLavoro'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { RigaCerca } from '@/components/ds/RigaCerca'
import { CampoTesto } from '@/components/ds/Campo'
import type { LavoroPila } from '@/lib/dashboard/pile-home'
import type { Pila } from '@/lib/lavori/urgenza'

const LABEL: Record<Pila, string> = {
  rossa: 'Da consegnare oggi', ambra: 'Sul banco', viola: 'Da rifare / In prova', blu: 'Appena arrivati',
}
const VUOTO: Record<Pila, string> = {
  rossa: 'Tutte consegnate ✓', ambra: 'Niente sul banco', viola: 'Nessuna prova in giro', blu: 'Nessun nuovo arrivo',
}

function normalizza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function PilaAperta(props: { pila: Pila; lista: LavoroPila[]; sub?: string }) {
  const { pila, lista, sub } = props
  const router = useRouter()
  const [cerca, setCerca] = useState<string | null>(null) // null = riga chiusa
  const filtrata = useMemo(() => {
    if (!cerca) return lista
    const q = normalizza(cerca)
    return lista.filter((l) => normalizza(`n.${l.numero} ${l.dentista} ${l.paziente} ${l.tipoLavoro}`).includes(q))
  }, [lista, cerca])
  const idPrimoConsegnabile = pila === 'rossa' ? lista.find((l) => l.consegnabile)?.id : undefined

  return (
    <section style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: '8px 24px 40px' }}>
      <div style={{ marginBottom: 18 }}>
        <TastoTondo glifo="‹" ariaLabel="Indietro" onClick={() => router.push('/dashboard')} />
      </div>
      <MorphPila pila={pila} numero={lista.length} label={LABEL[pila]} sub={sub} />

      {lista.length === 0 ? (
        <div style={{ padding: '48px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: 16, fontWeight: 600 }}>
          {VUOTO[pila]}
        </div>
      ) : (
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {lista.length > 15 && (cerca === null
            ? <RigaCerca totale={lista.length} cosa="lavori" onApri={() => setCerca('')} />
            : <CampoTesto label="Cerca" valore={cerca} onChange={setCerca} />)}
          {filtrata.map((l) => (
            <CardLavoro
              key={l.id}
              numero={l.numero} dentista={l.dentista} paziente={l.paziente} tipoLavoro={l.tipoLavoro}
              tempo={l.pill}
              onApri={() => router.push(`/lavori/${l.id}`)}
              onConsegna={l.id === idPrimoConsegnabile ? () => router.push(`/lavori/${l.id}/consegna`) : undefined}
              conferma={pila === 'blu' ? { onClick: () => router.push(`/lavori/${l.id}`) } : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}
```

(Verificare le firme reali di `RigaCerca`/`CampoTesto` nei file e adattare le prop; il blocco vuoto usa titolo+guida del mockup stati-vuoti — per l'ambra: `Vuoto` con glifo tazzina, «Niente sul banco», «Goditi il caffè. Al prossimo lavoro ci pensa UÀ.».)

`LePile.tsx` — i 4 raggruppamenti (mockup `pila-aperta.html` `.grp-tabs`): titolo «Le pile» 21/800, hint «Tocca un raggruppamento per aprirlo» 14.5/600 muted, 4 `<Link href="/lavori?pila=…">` card 18 con label 15/800/+0.12em colore-famiglia + conteggio pill 30px tint; ring `inset 0 0 0 2.5px var(--red)` su quello aperto (`pilaAperta`), `children` (le card) sotto.

`lavori/page.tsx` (riscrittura):

```tsx
import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getPileHome, getPerimetroHome, subMorph } from '@/lib/dashboard/pile-home'
import { PilaAperta } from '@/components/features/pile/PilaAperta'
import { LePile } from '@/components/features/pile/LePile'
import type { Pila } from '@/lib/lavori/urgenza'

export const dynamic = 'force-dynamic'
const PILE_VALIDE = ['rossa', 'ambra', 'viola', 'blu'] as const

export default async function LavoriPage({ searchParams }: { searchParams: Promise<{ pila?: string }> }) {
  const { pila: pilaParam } = await searchParams
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')
  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo, laboratorio_id').eq('id', user.id).is('deleted_at', null).single()
  if (!utente) redirect('/login')

  const perimetro = await getPerimetroHome(svc, utente.laboratorio_id, user.id, utente.ruolo)
  const pile = await getPileHome(svc, utente.laboratorio_id, perimetro)
  const pila = (PILE_VALIDE as readonly string[]).includes(pilaParam ?? '') ? (pilaParam as Pila) : null
  const conteggi = { rossa: pile.liste.rossa.length, ambra: pile.liste.ambra.length, viola: pile.liste.viola.length, blu: pile.liste.blu.length }

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      {pila
        ? <PilaAperta pila={pila} lista={pile.liste[pila]} sub={subMorph(pila, pile, new Date())} />
        : <LePile conteggi={conteggi} />}
    </div>
  )
}
```

I componenti v2.3 orfani (`LavoriSearchBar`, uso locale di `LavoroCard`) si rimuovono al Task 11 dopo grep dei consumatori.

- [ ] **Step 4: Esegui TUTTO — deve passare** · Run: `npx vitest run && npx tsc --noEmit` · Expected: verde (test v2.3 della lista lavori adeguati/eliminati, documentato nel commit).

- [ ] **Step 5: Verifica visiva** — dev server: `/lavori?pila=rossa|ambra|viola|blu` a 390 × 2 temi contro i 4 frame del mockup; `/lavori` senza param → «Le pile».

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/lavori/page.tsx" src/components/features/pile/ src/components/ds/CardLavoro.tsx src/lib/dashboard/pile-home.ts tests/unit/PilaAperta.test.tsx tests/unit/pile-home.test.ts
git commit -m "feat(pile): pila aperta /lavori?pila= + vista Le pile — morph, consegna inline P3, conferma P4, cerca >15"
```

---

### Task 9: Desktop 1280 (nav a 3 pannelli) + tablet 768 (split) — consuma l'ADR del Task 1

**Prerequisito:** ADR Task 1 ratificato su architettura `searchParams` (P2). Se l'ADR dice altro, STOP e ri-pianificare questo task.

**Files:**
- Create: `src/components/features/home/NavDesk.tsx` (§5.35)
- Create: `src/components/features/home/HomeDesktop.tsx`
- Create: `src/components/features/pile/SchedaAnteprima.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx` (searchParams `pila`/`lavoro`, monta HomeDesktop)
- Modify: `src/app/(app)/lavori/page.tsx` (regime 768 split)
- Modify: `src/lib/dashboard/pile-home.ts` (`LavoroPila.fasi` + `LavoroPila.tecnico`)
- Test: `tests/unit/SchedaAnteprima.test.tsx`, `tests/unit/NavDesk.test.tsx`

**Interfaces:**
- Consumes: `PileHome`, `LavoroPila` · ds components · ADR Task 1.
- Produces:
  - `LavoroPila.fasi: Array<{ nome: string; fatta: boolean }>` (da `lavori_fasi` già nell'embed, ordinate per `ordine`) e `LavoroPila.tecnico: string | null` (embed `tecnico:tecnici(nome)` — verificare il campo nome su `tecnici` in `database.types.ts` PRIMA di scrivere la select; se il nome vive su `utenti`, usare `tecnico:tecnici(utente:utenti(nome))` e appiattire).
  - `NavDesk(props: { conteggi: Record<Pila, number>; pilaSelezionata: Pila; segnale: SegnaleStriscia })`.
  - `SchedaAnteprima(props: { lavoro: LavoroPila })`.
  - `HomeDesktop(props: { pile: PileHome; pilaSelezionata: Pila; lavoroSelezionato: LavoroPila | null; segnale: SegnaleStriscia })`.

- [ ] **Step 1: Test che falliscono**

```tsx
// tests/unit/SchedaAnteprima.test.tsx
import { render, screen } from '@testing-library/react'
import { SchedaAnteprima } from '@/components/features/pile/SchedaAnteprima'
import type { LavoroPila } from '@/lib/dashboard/pile-home'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const lavoro: LavoroPila = {
  id: 'l147', numero: '147', dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: false,
  consegna: { data: '2026-07-09', ora: '16:00:00' }, rientro: null, tecnico: 'Ciro',
  fasi: [{ nome: 'Fresatura', fatta: true }, { nome: 'Sinterizzazione', fatta: true }, { nome: 'Glasatura', fatta: true }, { nome: 'Controllo finale', fatta: false }],
}

describe('SchedaAnteprima — pannello destro (mockup home.html 1280)', () => {
  it('CardInfo con le RigheDato + fasi + CONSEGNA disabled con callout (§5.1: MAI nascosto)', () => {
    render(<SchedaAnteprima lavoro={lavoro} />)
    expect(screen.getByText('PZ-0412')).toBeInTheDocument()
    expect(screen.getByText('Controllo finale')).toBeInTheDocument()
    const consegna = screen.getByRole('button', { name: /consegna/i })
    expect(consegna).toBeDisabled()
    expect(screen.getByText('Completa il controllo finale per consegnare')).toBeInTheDocument()
  })

  it('consegnabile → CONSEGNA attivo che naviga alla consegna (P3)', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    render(<SchedaAnteprima lavoro={{ ...lavoro, consegnabile: true, fasi: lavoro.fasi.map((f) => ({ ...f, fatta: true })) }} />)
    const consegna = screen.getByRole('button', { name: /consegna/i })
    expect(consegna).toBeEnabled()
    await user.click(consegna)
    expect(push).toHaveBeenCalledWith('/lavori/l147/consegna')
  })
})
```

```tsx
// tests/unit/NavDesk.test.tsx
import { render, screen } from '@testing-library/react'
import { NavDesk } from '@/components/features/home/NavDesk'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
const SEGNALE = { attenzione: false, forte: 'Tutto a posto:', testo: 'nessuna consegna oggi', azione: null }

describe('NavDesk (§5.35) — la nav sostituisce home+☰ su desktop', () => {
  it('voci pile con badge numerici + sezioni + Nuovo lavoro', () => {
    render(<NavDesk conteggi={{ rossa: 2, ambra: 4, viola: 1, blu: 2 }} pilaSelezionata="rossa" segnale={SEGNALE} />)
    expect(screen.getByRole('link', { name: /Oggi.*2/s })).toHaveAttribute('href', '/dashboard?pila=rossa')
    expect(screen.getByRole('link', { name: /Da rifare.*1/s })).toHaveAttribute('href', '/dashboard?pila=viola')
    expect(screen.getByRole('link', { name: 'Agenda' })).toHaveAttribute('href', '/agenda')
    expect(screen.getByRole('link', { name: 'Dentisti' })).toHaveAttribute('href', '/clienti')
    expect(screen.getByRole('button', { name: '+ Nuovo lavoro' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Esegui — deve fallire.**

- [ ] **Step 3: Implementa**

`pile-home.ts`: in `mapPileHome` valorizzare `fasi` (da `lavori_fasi` vive ordinate: `{ nome: fase.descrizione, fatta: !!eseguita_at }`) e `tecnico`; estendere la select di `getPileHome` con l'embed tecnico verificato. Aggiornare `raw()` nei test del Task 5 (`tecnici: null`).

`NavDesk.tsx` (valori da `home.html` `.nav-desk`): aside 240px `background: var(--bg-deep)`, `padding: '24px 16px'`, flex column gap 20 — logo `UÀ` 26/800 con `<em>` rosso sul punto · `TastoPrimario` H 52 testo 16 «+ Nuovo lavoro» → `/lavori/nuovo` · voci = `<Link>` H 48 radius 12, 16/600 muted (selezionata: bg `var(--bg)`, ink, 700): `Oggi→?pila=rossa` (badge `red-tint`), `Sul banco→?pila=ambra` (amber), `Da rifare→?pila=viola` (purple), `Appena arrivati→?pila=blu` (blue), poi `Agenda→/agenda`, `Dentisti→/clienti`, `Fatture→/fatture`, `Magazzino→/magazzino`, `Documenti→/qualita` (badge neutro assente) · footer `marginTop: auto` con `<StrisciaStato …/>`. Badge: 24px pill 13/800 tabular.

`SchedaAnteprima.tsx`: header `n.{numero}` 27/800 + `PillStato` dal `pill` del lavoro · `CardInfo`/`RigaDato` (Dentista, Paziente, Lavoro, Consegna — `giornoBreve`+ora, valore `urgente` se ≤ domani —, Tecnico se presente) · card «Le fasi» con `RigaFase`-like rows (CheckTondo fatta/da-fare + nome; senza chi·quando — l'anteprima è read-only, la scheda completa arriva in Ondata 3: deviazione dichiarata in PR) · `TastoPrimario` CONSEGNA (H 60 desktop, max 340) `disabled={!lavoro.consegnabile}` con callout §5.1; attivo → `/lavori/{id}/consegna` · `LinkQuieto` «Apri la scheda completa» → `/lavori/{id}`.

`HomeDesktop.tsx`: `<div className="ua-home-desk">` grid `240px 400px 1fr`, `height: 100dvh; overflow: hidden`; `<style>`: `.ua-home-desk { display: none } @media (min-width: 1024px) { .ua-home-desk { display: grid } .ua-home-mobile { display: none } }` (HomeV3 riceve `className="ua-home-mobile"` sul wrapper — 1 riga al Task 7). Pannello lista: titolo colore-famiglia + sub (`subMorph`) + CardLavoro con ring selezione `inset 0 0 0 2.5px var(--red)` su `lavoroSelezionato` (in dark il ring è l'UNICA shadow — mockup riga 219). Click card → `router.push('/dashboard?pila=X&lavoro=Y')`. Pannello destro: `SchedaAnteprima` (o, senza selezione, il primo della pila; pila vuota → messaggio quieto `VUOTO[pila]`). **Tastiera** (`useEffect` keydown, ignorando input/textarea): `↑/↓` spostano `?lavoro=` nella lista · `Invio` apre `/lavori/{id}` · `n` → `/lavori/nuovo` · `/` porta il focus alla RigaCerca se montata.

`dashboard/page.tsx`: legge `searchParams` `pila` (default `rossa`, validata) e `lavoro` (id presente nella pila, altrimenti primo); monta `<HomeV3 …/>` + `<HomeDesktop …/>` fratelli (CSS decide chi si vede).

`lavori/page.tsx` — regime 768 (mockup split): con `?pila=`, a ≥768 e <1024 due colonne `360px 1fr` (sinistra `var(--bg-deep)`: MorphPila + lista con ring sul selezionato `?lavoro=`; destra: SchedaAnteprima). Stesso pattern CSS show/hide.

- [ ] **Step 4: Esegui TUTTO** · Run: `npx vitest run && npx tsc --noEmit` · Expected: verde.

- [ ] **Step 5: Verifica visiva** — dev server 1280×800: nav+lista+scheda, selezione con frecce, badge; 768×1024: `/lavori?pila=rossa` split. Confronto coi mockup (`home.html` 1280, `pila-aperta.html` 768) in entrambi i temi.

- [ ] **Step 6: Commit**

```bash
git add src/components/features/home/ src/components/features/pile/SchedaAnteprima.tsx "src/app/(app)/dashboard/page.tsx" "src/app/(app)/lavori/page.tsx" src/lib/dashboard/pile-home.ts tests/unit/SchedaAnteprima.test.tsx tests/unit/NavDesk.test.tsx tests/unit/pile-home.test.ts
git commit -m "feat(home): desktop 1280 a 3 pannelli (NavDesk §5.35 + SchedaAnteprima) e split 768 — architettura ADR B6"
```

---

### Task 10: ☰ «Tutto il resto» + ritiro BottomNavPill dalle pagine migrate

**Files:**
- Create: `src/app/(app)/tutto-il-resto/page.tsx`
- Create: `src/lib/dashboard/tutto-il-resto.ts`
- Modify: `src/components/layout/BottomNavPill.tsx` (P9)
- Test: `tests/unit/tutto-il-resto.test.ts`

**Interfaces:**
- Produces: `getSezioniTuttoIlResto(svc, labId, ruolo): Promise<Sezione[]>` con `type Sezione = { chiave: string; emoji: string; nome: string; sub: string; href: string }`.

- [ ] **Step 1: Test che falliscono**

```ts
// tests/unit/tutto-il-resto.test.ts
import { componiSezioni } from '@/lib/dashboard/tutto-il-resto'

const DATI = { dentisti: ['Esposito', 'Bianchi', 'Russo', 'Verdi'], fattureDaSistemare: 0, materialiRossi: 0, consegneOggi: 2, prossimaOra: '16:00', persone: ['Francesco', 'Ciro', 'Salvatore'] }

describe('Tutto il resto — le 9 voci chiuse di §6.1, nell ordine di legge', () => {
  it('titolare: 8 voci (niente rete), ordine §6.1, href reali', () => {
    const sezioni = componiSezioni('titolare', DATI)
    expect(sezioni.map((s) => s.nome)).toEqual(['Dentisti', 'Fatture', 'Magazzino', 'Agenda', 'Documenti e qualità', 'Persone', 'Listino', 'Il mio laboratorio'])
    expect(sezioni.map((s) => s.href)).toEqual(['/clienti', '/fatture', '/magazzino', '/agenda', '/qualita', '/tecnici', '/listino', '/impostazioni'])
  })
  it('admin_rete: compare «La mia rete» prima di «Il mio laboratorio»', () => {
    const nomi = componiSezioni('admin_rete', DATI).map((s) => s.nome)
    expect(nomi).toContain('La mia rete')
    expect(nomi.indexOf('La mia rete')).toBe(nomi.length - 2)
  })
  it('sub in parole del banco, dai dati veri', () => {
    const s = componiSezioni('titolare', DATI)
    expect(s[0].sub).toBe('Esposito, Bianchi, Russo e Verdi')
    expect(s[1].sub).toBe('Tutto a posto questo mese ✓')
    expect(s[3].sub).toBe('Oggi 2 consegne · la prossima alle 16:00')
    expect(componiSezioni('titolare', { ...DATI, fattureDaSistemare: 1 })[1].sub).toBe('1 fattura da sistemare')
    expect(componiSezioni('titolare', { ...DATI, materialiRossi: 0 })[2].sub).toBe('Tutto rifornito ✓')
  })
})
```

- [ ] **Step 2: Esegui — deve fallire.**

- [ ] **Step 3: Implementa `tutto-il-resto.ts`**

`componiSezioni(ruolo, dati)` puro: le 9 voci di §6.1 nell'ordine del mockup (`tutto-il-resto.html`), emoji come nel mockup (licenza §4.4: UNICO contesto app dove l'emoji è lecita), `La mia rete` (`/rete`) SOLO `admin_rete`, penultima. Sub: Dentisti = elenco `a, b, c e d`; Fatture = `fattureDaSistemare > 0 ? '${n} fattura/e da sistemare' : 'Tutto a posto questo mese ✓'`; Magazzino = `materialiRossi > 0 ? '${n} materiale/i da riordinare' : 'Tutto rifornito ✓'`; Agenda = `consegneOggi > 0 ? 'Oggi ${n} consegne · la prossima alle ${ora}' : 'Oggi niente in agenda'`; Documenti = `'DdC generata a ogni consegna ✓'` (copy advisor normativo, MAI verdetti di conformità); Persone = `'Tu, Ciro e Salvatore'`-style dall'elenco (il primo è sempre «Tu»); Listino = `'I tuoi prezzi per ogni lavorazione'`; Il mio laboratorio = `'Profilo, PEC, abbonamento'` (senza ✓: nessun verdetto non verificato — deviazione dal mockup dichiarata in PR).

`getSezioniTuttoIlResto(svc, labId, ruolo)`: raccoglie i dati con query leggere e delega — dentisti: ultimi 20 `lavori` con `clienti(nome, cognome, studio_nome)` → primi 4 display distinti; fatture: count `stato_sdi IN SDI_SCARTATE` (riusare la costante da `striscia.ts` — esportarla); materiali: `getMaterialiEsaurimento(svc, labId, 5).length`; consegne oggi: count `lavori` `data_consegna_prevista = oggi` stati attivi + prima `ora_consegna`; persone: `utenti` del lab attivi (nome, limit 3). Errori → default sereni + `console.error` (la pagina non crasha mai).

Pagina `tutto-il-resto/page.tsx` (server): auth+ruolo come le altre; root `data-ds="v3"` + bg inline + grana; testa: `TastoTondo ‹` (→ `/dashboard`, client wrapper minimo) + titolo «Tutto il resto» 27/800; lista card-sezione dal mockup: `<Link>` card radius 22 padding 15/16, glifo emoji su chip Ø46 `--bg-deep`, nome 17.5/700, sub 14/500 muted ellissi, chevron `›` faint; a ≥1024 la pagina si nasconde e appare la nota quieta del mockup («Su desktop “Tutto il resto” non è una pagina: le sue voci sono nella nav a sinistra»).

- [ ] **Step 4: BottomNavPill — ritiro dalle pagine migrate (P9)**

In `BottomNavPill.tsx`, dopo `const pathname = usePathname()`:

```tsx
// Ondata 1 (spec sp.3 §1): sulle pagine migrate a v3 la BottomNavPill muore —
// il pollice in basso appartiene al TastoPiù (home). Restano le pagine v2.3.
const ROUTE_MIGRATE_V3 = ['/dashboard', '/tutto-il-resto']
if (ROUTE_MIGRATE_V3.includes(pathname) || pathname === '/lavori') return null
```

(`/lavori/[id]` e `/lavori/nuovo` restano v2.3 e conservano la pill; il confronto è ESATTO, non prefix.)

- [ ] **Step 5: Esegui TUTTO** · Run: `npx vitest run && npx tsc --noEmit` · Expected: verde.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/tutto-il-resto/" src/lib/dashboard/tutto-il-resto.ts src/components/layout/BottomNavPill.tsx tests/unit/tutto-il-resto.test.ts
git commit -m "feat(home): pagina Tutto il resto (§6.1) + BottomNavPill ritirata dalle route migrate"
```

---

### Task 11: Pulizia dead code + FASE 7 completa + QA browser 3×2 (FASE 9)

**Files:**
- Delete (SOLO dopo grep zero-consumatori): `src/components/features/dashboard/DashboardTitolare.tsx`, `DashboardTecnico.tsx`, `DashboardFrontDesk.tsx`, `DashboardHybrid.tsx`, `DashboardShell.tsx`, `KpiCard.tsx`, `SpotlightCard.tsx`, `TaskItem.tsx`, `LavoroUrgente.tsx` + test relativi (`DashboardFrontDesk.whatsapp.test.tsx`, …)
- Modify: `src/lib/dashboard/queries.ts` (rimuovere export orfani)
- Modify: `src/components/features/lavori/` (rimuovere `LavoriSearchBar` e residui orfani della lista v2.3)

- [ ] **Step 1: Cancellazione grep-driven**

Per OGNI file candidato: `grep -rn "<NomeComponente>" src/ tests/ --include='*.ts*' | grep -v <il-file-stesso>` → cancellare SOLO se zero consumatori. Per `queries.ts`: `getTitolareKpi`, `mapTitolareKpiRow`, `getTecnicoDashboard`, `getLavoriTecnicoOggi`, `getFrontDeskDashboard`, `mapFrontDeskConsegneRows`, `mapTecnicoLavoriRows`, `getLavoriInProvaRientro`, `getLavoriDaFatturare`, `getTrendMensile`, `isCacheStale` — rimuovere SOLO gli orfani (attenzione: `/analytics` e altre pagine possono consumarne alcuni; `getMaterialiEsaurimento` e `getPagamentiScadutiTop` RESTANO — li usa la striscia). I test dei moduli rimossi si rimuovono con loro. `dashboard_kpi_cache` e il job pg_cron NON si toccano (servono a «I conti», sp.4).

- [ ] **Step 2: Enforcement e verifica completa (FASE 7)**

Run, in ordine, con output reale:
```bash
bash scripts/check-ds-compliance.sh
npx tsc --noEmit
npx vitest run
npx next build
```
Expected: 0 violazioni DS · 0 errori tsc · suite verde (annotare il nuovo totale ≥ baseline 1297−test-rimossi+test-nuovi) · build pulita.

- [ ] **Step 3: QA browser (FASE 9) — lab E2E `00000000-…-0001`, dev server del worktree (`PORT=3013 npm run dev`)**

Checklist (2 temi ciascuna):
- **Home 390×844 e 390×667:** NESSUNO scroll (assert: `document.scrollingElement.scrollHeight <= window.innerHeight` via console) · 4 pile ordine rossa/ambra/viola/blu · saluto coerente con l'ora · scala corta attiva a 667 (numero 42px).
- **Home 768:** colonna centrata max 480 (le pile NON si affiancano).
- **Home 1280:** nav 240 + lista 400 + anteprima · badge = conteggi · frecce ↑↓ spostano la selezione, Invio apre la scheda, N apre il wizard · voce selezionata evidenziata.
- **Pile:** `/lavori?pila=…` per le 4 · ritardi in cima, sospesi in fondo · TastoConsegnaInline SOLO primo consegnabile della rossa → naviga alla consegna v2.3 · Conferma (blu) → scheda · pila vuota → morph 0 + messaggio · >15 lavori → RigaCerca filtra (seed extra se serve, poi cleanup).
- **StrisciaStato:** con una fattura scartata seed → segnale 1 con «Sistemala ›» (poi cleanup a baseline ESATTO); senza → segnale 9 coi numeri veri.
- **Tutto il resto 390/768:** 8 voci (9 da admin_rete), sub coi dati veri, ogni voce naviga; 1280 → nota quieta.
- **BottomNavPill:** assente su `/dashboard`, `/lavori`, `/tutto-il-resto`; presente su `/lavori/nuovo` e `/lavori/[id]`.
- **Ruoli:** login tecnico E2E → pile = soli lavori assegnati, striscia senza segnali fiscali.
- **Screenshot** di ogni schermata → `docs/design/screenshots/2026-07-XX-ondata-1/` (o cartella QA della sessione) per la review finale.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(home): rimozione dashboard v2.3 e residui lista lavori — grep-verified, suite e build verdi"
```

- [ ] **Step 5: Review finale whole-branch + gate**

Review indipendente dell'intero branch (le 7 Leggi L1-L7 verificate una per una, L1 in testa — vincolo spec §12) → fix → merge fast-forward su `main` SOLO con autorizzazione di Francesco → push → CI → smoke prod. FASE 11 (MEMORY.md + ROADMAP + decision record aggiornati) prima di chiudere.

---

## Note per il review di ogni task (dalla spec, non negoziabili)

- L1: ogni vista risponde a «qual è LA cosa da fare qui?» — home: il TastoPiù; pila rossa: consegnare il primo; blu: confermare.
- L3: mai solo colore — ogni pila ha etichetta, ogni pill ha parola.
- L5: subline e striscia raccontano fatti osservabili, MAI verdetti («DdC generata a ogni consegna ✓», mai «tutto in regola»).
- L7: in questa ondata NIENTE coreografie nuove — il morph pila→lista animato (§8.3.1) arriva quando nasce la transizione condivisa; qui lo stato morphato è statico. Le uniche animazioni: pressioni (`molla.press`) già dentro i componenti ds.
- Il rosso è scarso (§3.3): in home l'unico rosso pieno è il TastoPiù (glifo); nelle pile il TastoConsegnaInline è l'unico primario rosso della vista.
