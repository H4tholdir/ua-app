# Nome e cognome del paziente — TAPPA 1 (il dato) · Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** far chiedere al wizard nome e cognome del paziente **separati**, così che la targa della cassetta mostri il cognome per primo — chiudendo le tre trappole di scrittura e rendendo il nome **correggibile** dalla scheda paziente.

**Architecture:** una **sola funzione pura** (`risolviNomePaziente`) incarna la tabella delle quattro combinazioni della spec §5 ed è consumata da **tre** scrittori: il wizard (`crea-lavoro.ts`), `POST /api/pazienti` e `PATCH /api/pazienti/[id]`. Nessuna migration: le colonne `pazienti.nome`/`cognome` esistono e il trigger DB `sync_paziente_nome_cognome` compone `nome_cognome := upper(cognome)||' '||upper(nome)`. `Cassetta.tsx` **non si tocca**.

**Tech Stack:** Next.js 16 (App Router) · Supabase (Postgres + trigger) · TypeScript · React 19 · Vitest + Testing Library · DS v3 (`src/design-system/v3/*`, componenti da `src/components/ds/`).

**Spec di riferimento (LEGGE):** `docs/superpowers/specs/2026-07-27-nome-cognome-paziente-design.md`
**Handoff:** `docs/roadmap/2026-07-27-nome-cognome-paziente-execution-handoff.md`

---

## Scoperta bloccante emersa durante la stesura (da leggere PRIMA di Task 2)

Il trigger è dichiarato **`BEFORE INSERT OR UPDATE`** (`supabase/migrations/002_fase2_schema.sql:132-134`), verificato aprendo il file. Due conseguenze che **cambiano la forma del piano** rispetto alla lista file della spec §6:

1. ✅ **La rettifica funziona davvero.** Un `UPDATE` di `nome`/`cognome` ri-sincronizza `nome_cognome`, quindi la targa si aggiorna e il diritto di rettifica (Art. 16 GDPR, riserva G4) è servito sul serio — non è cosmetico.
2. 🛑 **La trappola 3.1 si apre su una SECONDA porta.** `PazienteEditSheet.handleSave` (`src/components/features/pazienti/PazienteEditSheet.tsx:33-41`) invia **l'intero oggetto `form` a ogni salvataggio**, e la route applica `if (field in body)`. Aggiungere `nome`/`cognome` all'allowlist così com'è significa che un salvataggio con le due caselle vuote scrive `cognome: ''`, `nome: ''` → il trigger compone `' '` (uno spazio) → `precheck.ts:40-43` si ferma su `''` (non è nullish) e non arriva mai a `codice_paziente` → **consegna bloccata**, da un salvataggio che all'utente sembra un no-op.

**Perciò:** la tabella §5 **non è una regola del wizard, è un invariante della tabella `pazienti`**, e dopo la tappa 1 i suoi scrittori sono tre. Da qui la funzione pura del Task 2 e l'applicazione **server-side** nei Task 4 e 5 — che sono un'**aggiunta** alla lista file della spec §6, motivata qui. È anche letteralmente ciò che la spec §6 chiede in «La regola che tiene in piedi tutto» («Una sola funzione compone il nome del paziente»).

**Non serve panel** (`ua-app/CLAUDE.md` §0C, esenzione): è enforcement di un invariante già ratificato, non una decisione nuova.

---

## Global Constraints

Valgono per **ogni** task; non si ripetono nei singoli.

- **Percorso BP-2:** Media. **Nessuna migration** → **FASE 6b NON si applica**, nessun `supabase gen types`.
- **DS:** `/lavori/nuovo` è **v3** → token da `src/design-system/v3/tokens.ts`, motion da `src/design-system/v3/motion.ts`, componenti **solo** da `src/components/ds/`. `/pazienti/[id]` è **v2.3 legacy** → si resta su `src/design-system/{tokens,motion}.ts` e `src/lib/feedback/*` (spec §7: nessuna migrazione per componente).
- **Motion:** mai `duration`/`ease` inline. Token, sempre.
- **Mockup prima del React** (`ua-app/CLAUDE.md` §0B): mockup in `docs/design/mockups/` (**mai** `/tmp`), screenshot in `docs/design/mockups/screenshots/`, **più varianti** light+dark, approvazione esplicita di Francesco, decision record in `docs/design/decisions/`.
- **`.gitignore` riga 62 ignora `*.png`** → gli screenshot si aggiungono con `git add -f`.
- **Prima di ogni commit:** `npx eslint src/` — il pre-commit ferma su `--max-warnings=0` e `tsc` **non** vede un import rimasto senza uso.
- **Nei blocchi `<style>{\`…\`}` dei `.tsx`: niente backtick nei commenti** (`TS1381` oscuro).
- **Invariante 1 (spec §5):** `nome` si manda **sempre** come `''`, **mai** `null`. Con `null` il trigger non compone → `nome_cognome` viola il `NOT NULL` → 500 → creazione del lavoro morta.
- **Invariante 2:** con entrambe le caselle vuote il **codice** continua a finire nel cognome.
- **Invariante 3:** **mai** `cognome: <codice>` quando il nome è pieno (produrrebbe «Pz-0042 Giuseppe» in targa).
- **`Cassetta.tsx`, `parco.ts`, `parco-shared.ts`, `lavori-liberi/route.ts`, la ricerca: NON si toccano.** Sono tappa 2.
- **Verifica finale (FASE 7), output reale obbligatorio:** `npx tsc --noEmit` · `npx vitest run` · `npx next build`.

### Ambiente — decisione presa qui, non a QA time

Il worktree isolato (FASE 5) **non è utilizzabile per il QA browser**: doppio `package-lock.json` → Turbopack sceglie la radice del repo principale → **tutte le route 404** (i file statici di `public/` rispondono e ingannano). E un worktree nuovo nasce senza `.env.local`/`.env.test` → `next build` fallisce su `/api/admin/labs` via Stripe.

**Scelta per questa ondata:** si lavora su un **branch dedicato nel repo principale** (`git switch -c ondata-nome-cognome-paziente` da `main` a `887c969e`), non in worktree. Motivo: questa tappa ha un mockup obbligatorio + FASE 9 su tre viewport × due temi + FASE 9b, cioè molto lavoro di browser, e il costo del worktree qui supera il beneficio. Nessun altro agente lavora sugli stessi file (gli altri due worktree — `ondata-a-mini-triage`, `redesign-parete-home` — toccano superfici diverse).

---

## File Structure

| File | Responsabilità | Task |
|---|---|---|
| `docs/design/mockups/2026-07-27-passo3-cognome-nome.html` | **nuovo** — mockup del passo 3 con la riga che si apre in due caselle, 2 varianti × light/dark | 1 |
| `docs/design/decisions/2026-07-27-passo3-cognome-nome.md` | **nuovo** — verbale della scelta di Francesco | 1 |
| `src/lib/domain/nome-paziente-scrittura.ts` | **nuovo** — `risolviNomePaziente` (tabella §5) + `cognomeEffettivo` (guardia «codice travestito»). **Unica** fonte della regola | 2 |
| `tests/unit/nome-paziente-scrittura.test.ts` | **nuovo** — 4 righe della tabella + 3 invarianti + idempotenza + caso degenere | 2 |
| `src/lib/wizard/crea-lavoro.ts` | consuma la funzione; firma `alias` → `cognome`+`nome`; U9 (paziente già esistente); nota di testa riscritta | 3 |
| `tests/unit/crea-lavoro.test.ts` | 16 chiamate da riscrivere + nuovi test della catena | 3 |
| `src/app/api/pazienti/route.ts` | POST applica l'invariante server-side; non restituisce più `insertError.message` grezzo (G9) | 4 |
| `tests/unit/api-pazienti-post.test.ts` | **nuovo** | 4 |
| `src/app/api/pazienti/[id]/route.ts` | PATCH: `nome`/`cognome` correggibili **passando dalla funzione**, 422 fail-closed (G4) | 5 |
| `tests/unit/api-pazienti-patch.test.ts` | **nuovo** | 5 |
| `src/components/features/wizard/PassoPaziente.tsx` | una riga «Nome o alias» → due caselle impilate, **un solo** «Salta»; dettatura sul Cognome | 6 |
| `tests/unit/PassoPaziente.test.tsx` | 5 riferimenti da aggiornare + nuovi | 6 |
| `src/components/features/wizard/WizardNuovoLavoro.tsx` | `StatoWizard.alias` si sdoppia in `cognome`/`nome`; notice U9 | 7 |
| `src/lib/wizard/persistenza.ts` | `StatoSalvato` sdoppiato + **`v: 1` → `v: 2`** | 7 |
| `tests/unit/wizard-persistenza.test.ts`, `tests/unit/WizardNuovoLavoro.test.tsx` | aggiornati | 7 |
| `src/components/features/pazienti/PazienteEditSheet.tsx` | due caselle Cognome/Nome, prefill che nasconde il «codice travestito» | 8 |
| `src/components/features/pdf/EtichettaTemplate.tsx` | `codice_paziente` per primo, come IFU e Ricevuta (G1) | 9 |
| `../ANALISI/17_adempimenti_lab_2026.md` | annotazione D8 su §pseudonimizzazione + tabella ruoli | 10 |

---

## Task 1: Mockup del passo 3 e approvazione 🛑 GATE

**Files:**
- Create: `docs/design/mockups/2026-07-27-passo3-cognome-nome.html`
- Create: `docs/design/mockups/screenshots/2026-07-27-passo3-*.png`
- Create: `docs/design/decisions/2026-07-27-passo3-cognome-nome.md`

**Interfaces:**
- Consumes: il mockup wizard esistente `docs/design/mockups/` (regime v3), i token v3 reali.
- Produces: **la forma approvata** che il Task 6 implementa fedelmente. Nessun React prima di questo gate.

**Cosa deve mostrare (dalla spec §6, riga `PassoPaziente.tsx:99-105`):**
- Il blocco «Se vuoi, aggiungi» resta con **3 righe** (Elemento, Colore, Nome o alias) — la terza **chiusa si chiama ancora «Nome o alias»** (D4 emendata da U10: la parola *alias* è l'unica affordance che dice all'utente che un nome finto va bene).
- **Aperta**, la terza riga mostra **due caselle impilate, Cognome sopra**, e **un solo** «Salta» (chiude U1 e U5).
- Nessun esempio (`esempio`) sulla riga, come oggi.

- [ ] **Step 1: Copiare la struttura del passo 3 dal mockup wizard esistente**

Aprire `docs/design/mockups/2026-07-26-nomi-paziente.html` per i token e la grana v3 già usati, e ricostruire il frame «Passo 3 · paziente» con: domanda «Chi è il paziente?», hint, campo «Codice paziente» + nota GDPR, blocco «Se vuoi, aggiungi», riga foto dashed, «Continua», PillVoce.

Valori esatti da rispettare (già nel codice, `PassoPaziente.tsx:263-353`): domanda `tipografia.size.question` peso extrabold `line-height 1.08`; hint `callout`/semibold `var(--muted)` margin-top 10; `.opz` margin-top 22; `.opz-cap` caption/extrabold maiuscola `var(--faint)` margin-bottom 12; riga `padding 14px 0`, `border-bottom 1.5px solid var(--line)` tranne l'ultima; nome riga 17/700 `var(--ink)`; esempio 14.5/600 `var(--faint)`.

- [ ] **Step 2: Costruire le due varianti**

**Variante A — «Salta» a destra, allineato in alto.** Le due caselle occupano la colonna sinistra (flex:1), il «Salta» sta a destra allineato alla prima casella (`align-items: flex-start`).

**Variante B — «Salta» a destra, centrato verticalmente sulle due caselle.** Stessa struttura, `align-items: center`.

Motivo per cui servono due varianti: con **una** casella il «Salta» a metà altezza era ovvio; con **due** l'ancoraggio verticale diventa una scelta visibile, e §0B vieta di mostrarne una sola.

Entrambe le varianti in **chiaro e scuro**, ciascuna nei tre stati: riga **chiusa**, riga **aperta vuota**, riga **aperta compilata** (`Bagheria` / `Giuseppe`).

- [ ] **Step 3: Screenshot Playwright a 390 / 768 / 1280, chiaro e scuro**

```bash
npx playwright screenshot --viewport-size=390,844 "file://$(pwd)/docs/design/mockups/2026-07-27-passo3-cognome-nome.html" docs/design/mockups/screenshots/2026-07-27-passo3-390-chiaro.png
```

Ripetere per `768,1024` e `1280,800`, e per il tema scuro (il mockup deve esporre un toggle `data-tema="scuro"` sul root, come gli altri mockup della cartella).

- [ ] **Step 4: 🛑 STOP — mostrare a Francesco e attendere la scelta**

Presentare le due varianti affiancate, chiaro e scuro. **Non scrivere React** finché Francesco non ha scelto. Domande da porre esplicitamente insieme alle immagini:
1. Variante A o B?
2. Le etichette delle due caselle sono «Cognome» e «Nome»? (la riga chiusa resta «Nome o alias»)
3. Il «Salta» singolo svuota **entrambe** le caselle: confermi?

- [ ] **Step 5: Scrivere il decision record**

`docs/design/decisions/2026-07-27-passo3-cognome-nome.md` con: data, variante scelta, le tre risposte, e il motivo dichiarato. Formato dei decision record esistenti (v. `docs/design/decisions/2026-07-26-salva-nome-colore.md`).

- [ ] **Step 6: Commit**

```bash
git add -f docs/design/mockups/2026-07-27-passo3-cognome-nome.html docs/design/mockups/screenshots/2026-07-27-passo3-*.png docs/design/decisions/2026-07-27-passo3-cognome-nome.md
git commit -m "docs(paziente): mockup passo 3 due caselle + decision record"
```

---

## Task 2: La regola di scrittura — funzione pura

**Files:**
- Create: `src/lib/domain/nome-paziente-scrittura.ts`
- Test: `tests/unit/nome-paziente-scrittura.test.ts`

**Interfaces:**
- Consumes: nulla (funzione pura, nessun import).
- Produces:
  - `export type CoppiaNomePaziente = { cognome: string; nome: string }`
  - `export function risolviNomePaziente(input: { cognome?: string | null; nome?: string | null; codice?: string | null }): CoppiaNomePaziente | null`
  - `export function cognomeEffettivo(cognome: string | null | undefined, codice: string | null | undefined): string`

  Usati **letteralmente con questi nomi** dai Task 3, 4, 5, 8.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `tests/unit/nome-paziente-scrittura.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { risolviNomePaziente, cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'

const CODICE = 'PZ-0042'

describe('risolviNomePaziente — la tabella delle quattro combinazioni (spec §5)', () => {
  it('riga 1 — entrambe vuote: il CODICE finisce nel cognome, nome resta stringa vuota', () => {
    expect(risolviNomePaziente({ cognome: '', nome: '', codice: CODICE }))
      .toEqual({ cognome: 'PZ-0042', nome: '' })
  })

  it('riga 2 — solo cognome: il cognome resta dov`è, nome stringa vuota', () => {
    expect(risolviNomePaziente({ cognome: 'Bagheria', nome: '', codice: CODICE }))
      .toEqual({ cognome: 'Bagheria', nome: '' })
  })

  it('riga 3 — solo nome: va nel COGNOME (mai il codice accanto al nome)', () => {
    expect(risolviNomePaziente({ cognome: '', nome: 'Giuseppe', codice: CODICE }))
      .toEqual({ cognome: 'Giuseppe', nome: '' })
  })

  it('riga 4 — entrambe piene: coppia intatta', () => {
    expect(risolviNomePaziente({ cognome: 'Bagheria', nome: 'Giuseppe', codice: CODICE }))
      .toEqual({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })
})

describe('risolviNomePaziente — i tre invarianti (spec §5)', () => {
  it('invariante 1 — `nome` è SEMPRE una stringa, MAI null/undefined', () => {
    for (const caso of [
      { cognome: null, nome: null, codice: CODICE },
      { cognome: undefined, nome: undefined, codice: CODICE },
      { cognome: 'Bagheria', nome: null, codice: CODICE },
    ]) {
      const esito = risolviNomePaziente(caso)
      expect(esito).not.toBeNull()
      expect(typeof esito!.nome).toBe('string')
      expect(typeof esito!.cognome).toBe('string')
    }
  })

  it('invariante 2 — con entrambe vuote il codice NON sparisce (o la consegna si blocca)', () => {
    const esito = risolviNomePaziente({ cognome: '   ', nome: '   ', codice: CODICE })
    expect(esito).toEqual({ cognome: 'PZ-0042', nome: '' })
    // la catena a valle: nome_cognome sarebbe 'PZ-0042 ', mai ' '
    expect(esito!.cognome).not.toBe('')
  })

  it('invariante 3 — MAI il codice nel cognome quando il nome è pieno («Pz-0042 Giuseppe»)', () => {
    const esito = risolviNomePaziente({ cognome: '', nome: 'Giuseppe', codice: CODICE })
    expect(esito!.cognome).not.toBe(CODICE)
    expect(`${esito!.cognome} ${esito!.nome}`.trim()).toBe('Giuseppe')
  })
})

describe('risolviNomePaziente — robustezza', () => {
  it('taglia gli spazi ai bordi', () => {
    expect(risolviNomePaziente({ cognome: '  Del Grosso  ', nome: ' Maria ', codice: CODICE }))
      .toEqual({ cognome: 'Del Grosso', nome: 'Maria' })
  })

  it('è idempotente — riapplicarla non cambia il risultato', () => {
    const primo = risolviNomePaziente({ cognome: '', nome: 'Giuseppe', codice: CODICE })!
    const secondo = risolviNomePaziente({ ...primo, codice: CODICE })
    expect(secondo).toEqual(primo)
  })

  it('caso degenere — tutto vuoto, codice compreso: null (non scrivibile, il chiamante DEVE rifiutare)', () => {
    expect(risolviNomePaziente({ cognome: '', nome: '', codice: '' })).toBeNull()
    expect(risolviNomePaziente({ cognome: null, nome: null, codice: null })).toBeNull()
  })
})

describe('cognomeEffettivo — la guardia del «codice travestito»', () => {
  it('cognome che coincide col codice → stringa vuota (non è un cognome, è il codice)', () => {
    expect(cognomeEffettivo('PZ-0042', 'PZ-0042')).toBe('')
  })

  it('confronto case-insensitive e trim-insensitive (il trigger scrive UPPER)', () => {
    expect(cognomeEffettivo(' pz-0042 ', 'PZ-0042')).toBe('')
  })

  it('cognome vero → resta, ripulito', () => {
    expect(cognomeEffettivo('  Bagheria ', 'PZ-0042')).toBe('Bagheria')
  })

  it('null/undefined → stringa vuota', () => {
    expect(cognomeEffettivo(null, 'PZ-0042')).toBe('')
    expect(cognomeEffettivo(undefined, undefined)).toBe('')
  })
})
```

- [ ] **Step 2: Eseguire il test e verificare che FALLISCA**

```bash
npx vitest run tests/unit/nome-paziente-scrittura.test.ts
```

Atteso: FAIL con `Failed to resolve import "@/lib/domain/nome-paziente-scrittura"`.

- [ ] **Step 3: Scrivere l'implementazione minima**

Creare `src/lib/domain/nome-paziente-scrittura.ts`:

```typescript
// La regola di scrittura di `pazienti.(nome, cognome)` — spec
// `docs/superpowers/specs/2026-07-27-nome-cognome-paziente-design.md` §5,
// «la tabella delle quattro combinazioni».
//
// PERCHÉ QUESTA FUNZIONE ESISTE, e perché è UNA sola: il trigger DB
// `sync_paziente_nome_cognome` (002_fase2_schema.sql:121-134) è dichiarato
// `BEFORE INSERT OR UPDATE` e compone `nome_cognome := upper(cognome) || ' '
// || upper(nome)` SOLO quando nome e cognome sono ENTRAMBI non-null. Da qui
// tre trappole, tutte silenziose (nessun test diventa rosso, nessun errore
// compare):
//
//   1. `nome: null` → il trigger non compone → `nome_cognome` viola il
//      NOT NULL → 500 → `crea-lavoro.ts` lo tratta come bloccante → NESSUN
//      lavoro creato.
//   2. cognome E nome entrambi `''` → `nome_cognome` diventa `' '` (uno
//      spazio). In `src/lib/consegna/precheck.ts:40-43` la catena `??` si
//      ferma su `''` (che NON è nullish) e non arriva mai a
//      `codice_paziente` → elemento 4 dell'Allegato XIII fallito →
//      CONSEGNA BLOCCATA; e `src/lib/pdf/generate-ddc.ts:93` stampa un
//      campo paziente vuoto in un documento firmato.
//   3. cognome = codice mentre il nome è pieno → `nome_cognome` diventa
//      `PZ-0042 GIUSEPPE`, che `derivaAlias` (parco-shared.ts:69-75) NON
//      annulla (non coincide col codice) → la targa scrive «Pz-0042
//      Giuseppe», col codice passato per titleCase contro la regola che lo
//      vuole sempre letterale.
//
// Dopo la tappa 1 gli scrittori di quelle due colonne sono TRE (il wizard,
// `POST /api/pazienti`, `PATCH /api/pazienti/[id]`): la regola vive qui una
// volta sola, e ognuno di loro la applica. Il difetto originale nasceva
// proprio da due pezzi di codice che componevano in modo diverso.

export type CoppiaNomePaziente = { cognome: string; nome: string }

/**
 * Risolve la coppia da scrivere su `pazienti.(cognome, nome)` a partire da
 * ciò che l'utente ha digitato, secondo la tabella §5.
 *
 * Il principio in una riga: **quando è piena una sola casella, ci si comporta
 * esattamente come la casella unica di oggi** — quel valore va nel cognome, il
 * nome resta `''`.
 *
 * Ritorna `null` SOLO nel caso degenere in cui non c'è nulla da scrivere
 * (nemmeno il codice): il chiamante DEVE rifiutare la scrittura invece di
 * lasciar passare una coppia vuota, che produrrebbe la trappola 2.
 * `null` è deliberatamente diverso da `{cognome:'', nome:''}`: quest'ultimo
 * non deve mai poter uscire da qui.
 */
export function risolviNomePaziente(input: {
  cognome?: string | null
  nome?: string | null
  codice?: string | null
}): CoppiaNomePaziente | null {
  const cognome = (input.cognome ?? '').trim()
  const nome = (input.nome ?? '').trim()
  const codice = (input.codice ?? '').trim()

  if (cognome) return { cognome, nome }
  if (nome) return { cognome: nome, nome: '' }
  if (codice) return { cognome: codice, nome: '' }
  return null
}

/**
 * Il cognome «vero», cioè quello da mostrare in un campo etichettato
 * «Cognome». I pazienti creati dal wizard senza nome hanno il CODICE dentro
 * `cognome` (è l'invariante 2): mostrarlo in un campo «Cognome» inviterebbe a
 * cancellarlo, e cancellarlo è esattamente la trappola 2.
 *
 * Gemella di `derivaAlias` (parco-shared.ts:69-75), che fa la stessa guardia
 * a valle su `nome_cognome`. Il confronto è case-insensitive perché il
 * trigger scrive in MAIUSCOLO.
 */
export function cognomeEffettivo(
  cognome: string | null | undefined,
  codice: string | null | undefined
): string {
  const c = (cognome ?? '').trim()
  if (!c) return ''
  const cod = (codice ?? '').trim()
  if (cod && c.toLowerCase() === cod.toLowerCase()) return ''
  return c
}
```

- [ ] **Step 4: Eseguire il test e verificare che PASSI**

```bash
npx vitest run tests/unit/nome-paziente-scrittura.test.ts
```

Atteso: PASS, 12 test.

- [ ] **Step 5: Lint + commit**

```bash
npx eslint src/lib/domain/nome-paziente-scrittura.ts
git add src/lib/domain/nome-paziente-scrittura.ts tests/unit/nome-paziente-scrittura.test.ts
git commit -m "feat(paziente): risolviNomePaziente — la tabella delle quattro combinazioni"
```

---

## Task 3: `crea-lavoro.ts` — il wizard consuma la regola

**Files:**
- Modify: `src/lib/wizard/crea-lavoro.ts:1-38` (nota di testa), `:107-154` (firma + passi 1-2)
- Test: `tests/unit/crea-lavoro.test.ts` (**16 chiamate esistenti da riscrivere** + nuovi test)

**Interfaces:**
- Consumes: `risolviNomePaziente`, `cognomeEffettivo` da `@/lib/domain/nome-paziente-scrittura` (Task 2).
- Produces:
  - `creaLavoroDaWizard(input)` dove `input.alias: string` **è sostituito da** `input.cognome: string` e `input.nome: string`. Consumato dal Task 7 (`WizardNuovoLavoro.tsx:366-375`).
  - `EsitoCreazione` guadagna `nomePazienteNonAggiornato: boolean` — consumato dal Task 7.
  - `type PazienteRiga = { id: string; codice_paziente: string | null; nome: string | null; cognome: string | null }`

⚠️ **`GET /api/pazienti` restituisce già `nome` e `cognome`** (`src/app/api/pazienti/route.ts:31`): nessuna fetch aggiuntiva serve per il caso U9.

- [ ] **Step 1: Aggiornare le 16 chiamate esistenti nel test (compilazione prima di tutto)**

In `tests/unit/crea-lavoro.test.ts`, sostituire **ogni** `alias: '',` con `cognome: '', nome: '',` (14 occorrenze: righe 77, 157, 180, 204, 235, 267, 291, 314, 338, 362, 380, 399, 419, 441).

Riscrivere il test di riga 120-144 così:

```typescript
  it('cognome compilato → cognome = quel valore (non pz), nome stringa vuota', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-2' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-2', numero_lavoro: '2026/0002' } }))

    await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      pz: 'PZ-0002',
      cognome: 'Bagheria',
      nome: '',
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
    })

    expect(JSON.parse(m.mock.calls[1][1].body)).toEqual({
      cliente_id: 'cli-1',
      codice_paziente: 'PZ-0002',
      nome: '',
      cognome: 'Bagheria',
    })
  })
```

Aggiornare anche l'asserzione di riga 99-104 (resta identica: `nome: ''`, `cognome: 'PZ-0001'` — è la riga 1 della tabella) e il commento sopra, che oggi cita il vecchio contratto.

- [ ] **Step 2: Aggiungere i nuovi test — la tabella §5 attraverso il wizard, e la catena a valle**

Aggiungere in coda a `tests/unit/crea-lavoro.test.ts`:

```typescript
import { precheckMDR } from '@/lib/consegna/precheck'
import type { LavoroDettaglio } from '@/types/domain'

describe('creaLavoroDaWizard — la tabella §5 e la catena fino alla consegna', () => {
  /** Ciò che il trigger DB scriverebbe in `nome_cognome` per la coppia inviata. */
  function componiComeIlTrigger(body: { cognome: string; nome: string }): string {
    return `${body.cognome.toUpperCase()} ${body.nome.toUpperCase()}`
  }

  async function bodyPazienteInviato(campi: { pz: string; cognome: string; nome: string }) {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-x' } }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-x', numero_lavoro: '2026/0099' } }))
    await creaLavoroDaWizard({
      cliente: CLIENTE,
      tipo: TIPO_CATALOGO,
      elemento: '',
      colore: '',
      foto: null,
      dataConsegna: DATA_CONSEGNA,
      ...campi,
    })
    return JSON.parse(m.mock.calls[1][1].body) as { cognome: string; nome: string; codice_paziente: string }
  }

  it('riga 1 — entrambe vuote: il codice finisce in nome_cognome e la CONSEGNA NON si blocca', async () => {
    const body = await bodyPazienteInviato({ pz: 'PZ-0042', cognome: '', nome: '' })
    expect(body.cognome).toBe('PZ-0042')
    expect(body.nome).toBe('')

    // La catena a valle: elemento 4 dell'Allegato XIII deve passare.
    const nomeCognome = componiComeIlTrigger(body) // 'PZ-0042 '
    const lavoro = {
      richiedente_nome: 'Studio Rossi',
      paziente_nome_snapshot: null,
      paziente: { nome_cognome: nomeCognome, codice_paziente: 'PZ-0042' },
      descrizione: 'Corona zirconia',
      tipo_dispositivo: 'protesi_fissa',
      classe_rischio: 'classe_iia',
      data_consegna_prevista: '2026-07-16',
    } as unknown as LavoroDettaglio
    const esito = precheckMDR(lavoro)
    expect(esito.errori.find((e) => e.elemento === 4)).toBeUndefined()
  })

  it('riga 3 — solo il nome: va nel COGNOME, mai «PZ-0042 GIUSEPPE» in targa', async () => {
    const body = await bodyPazienteInviato({ pz: 'PZ-0042', cognome: '', nome: 'Giuseppe' })
    expect(body.cognome).toBe('Giuseppe')
    expect(body.nome).toBe('')
    expect(componiComeIlTrigger(body)).not.toContain('PZ-0042')
  })

  it('riga 4 — entrambe: il trigger comporrebbe COGNOME NOME (il cognome davanti)', async () => {
    const body = await bodyPazienteInviato({ pz: 'PZ-0042', cognome: 'Bagheria', nome: 'Giuseppe' })
    expect(componiComeIlTrigger(body)).toBe('BAGHERIA GIUSEPPE')
  })

  // ⚠️ Un `it` per caso, NON un ciclo: `beforeEach` (che rimonta il mock di
  // fetch) gira una volta per `it`, quindi in un ciclo le chiamate si
  // accumulerebbero e `m.mock.calls[1]` punterebbe alla POST sbagliata dalla
  // seconda iterazione in poi. Il test passerebbe per caso.
  it.each([
    ['entrambe vuote', { pz: 'PZ-1', cognome: '', nome: '' }],
    ['solo cognome', { pz: 'PZ-2', cognome: 'Ferro', nome: '' }],
    ['solo nome', { pz: 'PZ-3', cognome: '', nome: 'Anna' }],
    ['entrambe', { pz: 'PZ-4', cognome: 'Ferro', nome: 'Anna' }],
  ] as const)('invariante (%s) — `nome` è SEMPRE presente e stringa, MAI null/assente', async (_etichetta, campi) => {
    const body = await bodyPazienteInviato(campi)
    expect(body).toHaveProperty('nome')
    expect(typeof body.nome).toBe('string')
    expect(body.nome).not.toBeNull()
  })
})

describe('creaLavoroDaWizard — paziente già esistente (riserva U9)', () => {
  it('paziente esistente SENZA nome + caselle compilate → PATCH che riempie, poi il lavoro', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [{ id: 'pz-9', codice_paziente: 'PZ-0042', nome: '', cognome: 'PZ-0042' }] }))
    m.mockResolvedValueOnce(jsonOk(200, { ok: true }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-9', numero_lavoro: '2026/0009' } }))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE, tipo: TIPO_CATALOGO, pz: 'PZ-0042',
      cognome: 'Bagheria', nome: 'Giuseppe',
      elemento: '', colore: '', foto: null, dataConsegna: DATA_CONSEGNA,
    })

    const [urlPatch, optPatch] = m.mock.calls[1]
    expect(urlPatch).toBe('/api/pazienti/pz-9')
    expect(optPatch.method).toBe('PATCH')
    expect(JSON.parse(optPatch.body)).toEqual({ cognome: 'Bagheria', nome: 'Giuseppe' })
    expect(esito.nomePazienteNonAggiornato).toBe(false)
    expect(esito.lavoro).toEqual({ id: 'lav-9', numero_lavoro: '2026/0009' })
  })

  it('paziente esistente CON nome → NON sovrascrive e lo segnala (nessuna PATCH)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [{ id: 'pz-9', codice_paziente: 'PZ-0042', nome: 'Giuseppe', cognome: 'Bagheria' }] }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-9', numero_lavoro: '2026/0009' } }))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE, tipo: TIPO_CATALOGO, pz: 'PZ-0042',
      cognome: 'Bagherra', nome: 'Giuseppe',
      elemento: '', colore: '', foto: null, dataConsegna: DATA_CONSEGNA,
    })

    expect(m).toHaveBeenCalledTimes(2) // GET + POST lavori: nessuna PATCH
    expect(esito.nomePazienteNonAggiornato).toBe(true)
    expect(esito.lavoro).not.toBeNull()
  })

  it('paziente esistente senza nome MA caselle vuote → nessuna PATCH, nessuna segnalazione', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [{ id: 'pz-9', codice_paziente: 'PZ-0042', nome: '', cognome: 'PZ-0042' }] }))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-9', numero_lavoro: '2026/0009' } }))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE, tipo: TIPO_CATALOGO, pz: 'PZ-0042',
      cognome: '', nome: '',
      elemento: '', colore: '', foto: null, dataConsegna: DATA_CONSEGNA,
    })

    expect(m).toHaveBeenCalledTimes(2)
    expect(esito.nomePazienteNonAggiornato).toBe(false)
  })

  it('la PATCH di arricchimento fallisce → il lavoro si crea COMUNQUE (mai bloccante)', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [{ id: 'pz-9', codice_paziente: 'PZ-0042', nome: '', cognome: 'PZ-0042' }] }))
    m.mockResolvedValueOnce(jsonFail(500))
    m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-9', numero_lavoro: '2026/0009' } }))

    const esito = await creaLavoroDaWizard({
      cliente: CLIENTE, tipo: TIPO_CATALOGO, pz: 'PZ-0042',
      cognome: 'Bagheria', nome: '',
      elemento: '', colore: '', foto: null, dataConsegna: DATA_CONSEGNA,
    })

    expect(esito.lavoro).toEqual({ id: 'lav-9', numero_lavoro: '2026/0009' })
  })
})
```

Aggiornare inoltre l'asserzione di riga 84 e ogni `toEqual({ lavoro: ..., accessoriFalliti: [] })` in `toEqual({ lavoro: ..., accessoriFalliti: [], nomePazienteNonAggiornato: false })`, e riga 387/406/426/448 (`{ lavoro: null, accessoriFalliti: [] }` → `{ lavoro: null, accessoriFalliti: [], nomePazienteNonAggiornato: false }`).

- [ ] **Step 3: Eseguire i test e verificare che FALLISCANO**

```bash
npx vitest run tests/unit/crea-lavoro.test.ts
```

Atteso: FAIL — errori di tipo su `cognome`/`nome` non presenti nella firma e `nomePazienteNonAggiornato` inesistente.

- [ ] **Step 4: Riscrivere la nota di testa di `crea-lavoro.ts`**

Sostituire le righe 19-34 (il blocco «DEVIAZIONE dal contratto letterale del piano»), che descrivono un contratto **superato** da questa tappa, con:

```typescript
// LA REGOLA DI SCRITTURA DEL NOME PAZIENTE non vive qui: vive in
// `@/lib/domain/nome-paziente-scrittura` (`risolviNomePaziente`), ed è la
// tabella delle quattro combinazioni della spec
// `docs/superpowers/specs/2026-07-27-nome-cognome-paziente-design.md` §5.
// Da qui passa solo ciò che l'odontotecnico ha digitato (due caselle
// facoltative, Cognome e Nome), mai una composizione fatta a mano: gli
// scrittori di `pazienti.(nome, cognome)` sono tre — questo file,
// `POST /api/pazienti` e `PATCH /api/pazienti/[id]` — e il difetto
// originale nasceva proprio da due pezzi di codice che componevano in modo
// diverso. Le tre trappole che quella funzione chiude (consegna bloccata,
// creazione del lavoro morta, codice ricasato in targa) sono documentate
// nella nota di testa del modulo: leggerla PRIMA di toccare i passi 1-2.
```

- [ ] **Step 5: Implementare — firma, esito, passi 1-2**

In `src/lib/wizard/crea-lavoro.ts`:

```typescript
import { risolviNomePaziente, cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'
```

```typescript
export type EsitoCreazione = {
  lavoro: { id: string; numero_lavoro: string } | null
  accessoriFalliti: Array<'dettagli' | 'foto'>
  /**
   * U9 — il paziente esisteva già con un nome suo e le caselle del wizard
   * ne portavano uno diverso: NON lo si sovrascrive in silenzio, lo si dice.
   */
  nomePazienteNonAggiornato: boolean
}

const ESITO_BLOCCANTE: EsitoCreazione = { lavoro: null, accessoriFalliti: [], nomePazienteNonAggiornato: false }
```

```typescript
type PazienteRiga = {
  id: string
  codice_paziente: string | null
  nome: string | null
  cognome: string | null
}
```

Firma:

```typescript
export async function creaLavoroDaWizard(input: {
  cliente: { id: string }
  tipo: TipoScelto
  pz: string
  cognome: string
  nome: string
  elemento: string
  colore: string
  foto: File | null
  dataConsegna: Date
}): Promise<EsitoCreazione> {
  const { cliente, tipo, pz, cognome, nome, elemento, colore, foto, dataConsegna } = input

  // La regola §5, una volta sola: da qui in poi si usa SOLO `coppia`.
  const coppia = risolviNomePaziente({ cognome, nome, codice: pz })
  if (!coppia) return ESITO_BLOCCANTE // nulla da scrivere: nemmeno il codice

  let nomePazienteNonAggiornato = false
```

Passi 1-2 (sostituiscono `:122-154`):

```typescript
  let pazienteId: string
  try {
    const resGet = await fetch(`/api/pazienti?cliente_id=${encodeURIComponent(cliente.id)}`, {
      credentials: 'same-origin',
    })
    if (!resGet.ok) return ESITO_BLOCCANTE
    const datiGet = (await resGet.json()) as { pazienti: PazienteRiga[] }
    const esistente = datiGet.pazienti.find((p) => p.codice_paziente === pz)

    if (esistente) {
      pazienteId = esistente.id

      // U9 — oggi il wizard riusava il paziente e non aggiornava MAI nome e
      // cognome, in silenzio: chi li scriveva sul secondo lavoro non vedeva
      // cambiare niente. Ora: se sul paziente esistente NON c'è ancora un
      // nome, le caselle lo riempiono; se c'è già, non si sovrascrive e si
      // segnala. `cognomeEffettivo` toglie di mezzo il «codice travestito»
      // (i pazienti-wizard senza nome hanno il CODICE dentro `cognome`).
      const haDigitato = cognome.trim() !== '' || nome.trim() !== ''
      const cognomeGiaSuo = cognomeEffettivo(esistente.cognome, esistente.codice_paziente)
      const nomeGiaSuo = (esistente.nome ?? '').trim()
      const pazienteHaGiaUnNome = cognomeGiaSuo !== '' || nomeGiaSuo !== ''

      if (haDigitato && pazienteHaGiaUnNome) {
        nomePazienteNonAggiornato = true
      } else if (haDigitato) {
        // ⚠️ Si invia `coppia`, cioè la coppia GIÀ RISOLTA dalla regola §5 —
        // non i valori grezzi digitati. Non è ridondanza da semplificare: il
        // server riapplica la stessa funzione (è idempotente), ma se un
        // domani qualcuno rimettesse qui `{cognome, nome}` grezzi, il caso
        // «solo nome» tornerebbe a passare un cognome vuoto e a dipendere
        // interamente dalla guardia server. Due difese, una regola sola.
        //
        // Arricchimento FAIL-SOFT: un fallimento qui non deve MAI impedire
        // la creazione del lavoro (il paziente esiste già, il lavoro è la
        // cosa che conta).
        try {
          await fetch(`/api/pazienti/${esistente.id}`, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cognome: coppia.cognome, nome: coppia.nome }),
          })
        } catch {
          // silenzioso — vedi sopra.
        }
      }
    } else {
      const resPost = await fetch('/api/pazienti', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          codice_paziente: pz,
          nome: coppia.nome,
          cognome: coppia.cognome,
        }),
      })
      if (!resPost.ok) return ESITO_BLOCCANTE
      const datiPost = (await resPost.json()) as { paziente: { id: string } }
      pazienteId = datiPost.paziente.id
    }
  } catch {
    return ESITO_BLOCCANTE
  }
```

E infine i due `return` finali portano il flag:

```typescript
  const accessoriFalliti: Array<'dettagli' | 'foto'> = []
  // …passi 4-5 invariati…
  return { lavoro, accessoriFalliti, nomePazienteNonAggiornato }
```

⚠️ Il `return ESITO_BLOCCANTE` dopo il fallimento del POST lavori resta invariato (riga ~177/182).

- [ ] **Step 6: Eseguire i test e verificare che PASSINO**

```bash
npx vitest run tests/unit/crea-lavoro.test.ts
```

Atteso: PASS (i ~16 esistenti aggiornati + 8 nuovi).

- [ ] **Step 7: Lint + commit**

```bash
npx eslint src/lib/wizard/crea-lavoro.ts
git add src/lib/wizard/crea-lavoro.ts tests/unit/crea-lavoro.test.ts
git commit -m "feat(wizard): crea-lavoro consuma risolviNomePaziente, cognome e nome separati"
```

---

## Task 4: `POST /api/pazienti` — l'invariante anche sul server

**Files:**
- Modify: `src/app/api/pazienti/route.ts:94-121`
- Test: `tests/unit/api-pazienti-post.test.ts` (**nuovo**)

**Interfaces:**
- Consumes: `risolviNomePaziente` (Task 2).
- Produces: `POST /api/pazienti` risponde **422** `{ error: 'Serve almeno il codice paziente' }` quando non c'è nulla da scrivere; non restituisce più `insertError.message` grezzo (riserva G9).

**Perché server-side e non solo nel wizard:** la route è pubblica all'interno della sessione e il wizard non è il suo unico chiamante possibile; la coppia `('', '')` produce `nome_cognome = ' '` e **blocca la consegna** settimane dopo, senza alcun errore visibile. La guardia va dove i dati entrano davvero.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `tests/unit/api-pazienti-post.test.ts`. Seguire lo schema di mock già usato dagli altri test di route del repo (`vi.mock` su `@/lib/supabase/server-service`, `@/lib/supabase/lab-context`, `@/lib/supabase/lab-guard`, `@/lib/utils/csrf`):

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const insertMock = vi.fn()
const fromMock = vi.fn()

vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))
vi.mock('@/lib/supabase/lab-guard', () => ({ assertLabOperativo: () => null }))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: async () => ({ laboratorioId: 'lab-1', ruolo: 'titolare' }),
  getLabContextWithTimings: async () => ({ context: { laboratorioId: 'lab-1' }, timings: {} }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: fromMock }),
}))

import { POST } from '@/app/api/pazienti/route'

function richiesta(body: unknown) {
  return new Request('http://localhost/api/pazienti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  insertMock.mockReset()
  fromMock.mockReset()
  // `clienti` → il cliente esiste; `pazienti` → insert
  fromMock.mockImplementation((tabella: string) => {
    if (tabella === 'clienti') {
      return { select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { id: 'cli-1' } }) }) }) }) }) }
    }
    return {
      insert: (dati: Record<string, unknown>) => {
        insertMock(dati)
        return { select: () => ({ single: async () => ({ data: { id: 'pz-1', ...dati }, error: null }) }) }
      },
    }
  })
})

describe('POST /api/pazienti — la regola §5 applicata server-side', () => {
  it('caselle vuote → scrive il CODICE nel cognome (mai una coppia vuota)', async () => {
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: '', cognome: '' }))
    expect(res.status).toBe(201)
    expect(insertMock.mock.calls[0][0]).toMatchObject({ cognome: 'PZ-0042', nome: '' })
  })

  it('solo il nome → finisce nel COGNOME (mai «PZ-0042 GIUSEPPE»)', async () => {
    await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: 'Giuseppe', cognome: '' }))
    expect(insertMock.mock.calls[0][0]).toMatchObject({ cognome: 'Giuseppe', nome: '' })
  })

  it('entrambe piene → coppia intatta', async () => {
    await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: 'Giuseppe', cognome: 'Bagheria' }))
    expect(insertMock.mock.calls[0][0]).toMatchObject({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })

  it('`nome` mai null: anche se il client manda null, si scrive stringa vuota', async () => {
    await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: null, cognome: null }))
    expect(insertMock.mock.calls[0][0].nome).toBe('')
    expect(insertMock.mock.calls[0][0].nome).not.toBeNull()
  })

  it('niente da scrivere (nemmeno il codice) → 422, nessun insert', async () => {
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: '', nome: '', cognome: '' }))
    expect(res.status).toBe(422)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('errore di insert → messaggio generico, MAI il testo grezzo del DB (G9)', async () => {
    fromMock.mockImplementation((tabella: string) => {
      if (tabella === 'clienti') {
        return { select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { id: 'cli-1' } }) }) }) }) }) }
      }
      return {
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'duplicate key value violates unique constraint "pazienti_pkey"' } }) }) }),
      }
    })
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: '', cognome: '' }))
    expect(res.status).toBe(500)
    const corpo = await res.json()
    expect(corpo.error).not.toContain('pazienti_pkey')
    expect(corpo.error).toBe('Non è stato possibile creare il paziente')
  })
})
```

- [ ] **Step 2: Eseguire e verificare che FALLISCA**

```bash
npx vitest run tests/unit/api-pazienti-post.test.ts
```

Atteso: FAIL sul 422 (oggi la route accetta la coppia vuota) e sul messaggio grezzo.

- [ ] **Step 3: Implementare**

In `src/app/api/pazienti/route.ts`, aggiungere l'import e sostituire `:94-119`:

```typescript
import { risolviNomePaziente } from '@/lib/domain/nome-paziente-scrittura'
```

```typescript
  // La regola §5 (`risolviNomePaziente`) — MAI una coppia grezza: `nome`
  // null farebbe fallire il NOT NULL su `nome_cognome`, e una coppia vuota
  // comporrebbe `' '`, che blocca la consegna (precheck.ts:40-43). La stessa
  // funzione è applicata dal wizard: è idempotente, riapplicarla non cambia
  // nulla.
  const coppia = risolviNomePaziente({
    cognome: typeof body.cognome === 'string' ? body.cognome : null,
    nome: typeof body.nome === 'string' ? body.nome : null,
    codice: typeof body.codice_paziente === 'string' ? body.codice_paziente : null,
  })
  if (!coppia) {
    return NextResponse.json(
      { error: 'Serve almeno il codice paziente' },
      { status: 422 }
    )
  }

  const insertData = {
    laboratorio_id: labId,
    cliente_id: body.cliente_id as string,
    nome: coppia.nome,
    cognome: coppia.cognome,
    // nome_cognome è gestito dal trigger DB — non impostare qui
    codice_paziente: body.codice_paziente ?? null,
    data_nascita: body.data_nascita ?? null,
    codice_fiscale: body.codice_fiscale ?? null,
    sesso: body.sesso ?? null,
    comune_nascita: body.comune_nascita ?? null,
    asl: body.asl ?? null,
    note: body.note ?? null,
    archiviato: false,
  }

  const { data: paziente, error: insertError } = await svc
    .from('pazienti')
    .insert(insertData)
    .select('id, nome, cognome, nome_cognome, cliente_id')
    .single()

  if (insertError) {
    // G9 — mai il testo grezzo del DB al client (nomi di vincoli, di
    // colonne, di indici: superficie di ricognizione gratuita).
    console.error('POST /api/pazienti — insert fallito:', insertError.message)
    return NextResponse.json({ error: 'Non è stato possibile creare il paziente' }, { status: 500 })
  }
```

- [ ] **Step 4: Eseguire e verificare che PASSI**

```bash
npx vitest run tests/unit/api-pazienti-post.test.ts
```

Atteso: PASS, 6 test.

- [ ] **Step 5: Lint + commit**

```bash
npx eslint src/app/api/pazienti/route.ts
git add src/app/api/pazienti/route.ts tests/unit/api-pazienti-post.test.ts
git commit -m "fix(api): POST pazienti applica la regola §5 e non espone l'errore DB"
```

---

## Task 5: `PATCH /api/pazienti/[id]` — il nome diventa correggibile

**Files:**
- Modify: `src/app/api/pazienti/[id]/route.ts:29-40`
- Test: `tests/unit/api-pazienti-patch.test.ts` (**nuovo**)

**Interfaces:**
- Consumes: `risolviNomePaziente`, `cognomeEffettivo` (Task 2).
- Produces: `PATCH /api/pazienti/[id]` accetta `nome` e `cognome`, li fa **passare dalla regola §5**, e risponde **422** se la correzione svuoterebbe tutto.

🛑 **Questa è la porta nuova.** Il trigger è `BEFORE INSERT OR UPDATE`: `nome`/`cognome` messi nell'allowlist **così com'è** farebbero scrivere `' '` in `nome_cognome` al primo salvataggio con le caselle vuote — consegna bloccata. `nome` e `cognome` **NON entrano** nel ciclo `ALLOWED`: hanno un ramo proprio.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `tests/unit/api-pazienti-patch.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const updateMock = vi.fn()
let rigaCorrente: { nome: string | null; cognome: string | null; codice_paziente: string | null } | null

vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))
vi.mock('@/lib/supabase/lab-guard', () => ({ assertLabOperativo: () => null }))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: async () => ({ laboratorioId: 'lab-1', ruolo: 'titolare' }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: rigaCorrente }) }) }) }),
      update: (dati: Record<string, unknown>) => {
        updateMock(dati)
        return { eq: () => ({ eq: async () => ({ error: null }) }) }
      },
    }),
  }),
}))

import { PATCH } from '@/app/api/pazienti/[id]/route'

function richiesta(body: unknown) {
  return new Request('http://localhost/api/pazienti/pz-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const params = Promise.resolve({ id: 'pz-1' })

beforeEach(() => {
  updateMock.mockReset()
  rigaCorrente = { nome: '', cognome: 'PZ-0042', codice_paziente: 'PZ-0042' }
})

describe('PATCH /api/pazienti/[id] — rettifica del nome (G4, Art. 16 GDPR)', () => {
  it('correggere il cognome lo scrive davvero (il trigger risincronizza nome_cognome)', async () => {
    const res = await PATCH(richiesta({ cognome: 'Bagheria', nome: 'Giuseppe' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })

  it('🛑 svuotare ENTRAMBE le caselle NON scrive una coppia vuota: torna il codice', async () => {
    await PATCH(richiesta({ cognome: '', nome: '' }), { params })
    // Senza questa guardia nome_cognome diventerebbe ' ' → consegna bloccata.
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'PZ-0042', nome: '' })
  })

  it('solo il nome → finisce nel cognome (mai il codice accanto al nome)', async () => {
    await PATCH(richiesta({ cognome: '', nome: 'Giuseppe' }), { params })
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Giuseppe', nome: '' })
  })

  it('patch parziale: solo `cognome` nel body → il `nome` esistente non si perde', async () => {
    rigaCorrente = { nome: 'Giuseppe', cognome: 'Bagherra', codice_paziente: 'PZ-0042' }
    await PATCH(richiesta({ cognome: 'Bagheria' }), { params })
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })

  it('il «codice travestito» non fa da cognome: caselle vuote su un paziente-wizard restano il codice', async () => {
    rigaCorrente = { nome: '', cognome: 'PZ-0042', codice_paziente: 'PZ-0042' }
    await PATCH(richiesta({ nome: 'Giuseppe' }), { params })
    // `cognome` non è nel body: quello attuale È il codice → non vale come cognome.
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Giuseppe', nome: '' })
  })

  it('una patch che non tocca il nome NON scrive nome/cognome', async () => {
    await PATCH(richiesta({ note: 'ciao' }), { params })
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('nome')
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('cognome')
    expect(updateMock.mock.calls[0][0]).toMatchObject({ note: 'ciao' })
  })

  it('paziente inesistente in questo laboratorio → 404, nessun update', async () => {
    rigaCorrente = null
    const res = await PATCH(richiesta({ cognome: 'Bagheria' }), { params })
    expect(res.status).toBe(404)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('nulla da scrivere, nemmeno il codice → 422', async () => {
    rigaCorrente = { nome: '', cognome: '', codice_paziente: '' }
    const res = await PATCH(richiesta({ cognome: '', nome: '' }), { params })
    expect(res.status).toBe(422)
    expect(updateMock).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Eseguire e verificare che FALLISCA**

```bash
npx vitest run tests/unit/api-pazienti-patch.test.ts
```

Atteso: FAIL — `nome`/`cognome` non sono nell'allowlist, quindi nessuno dei campi arriva in `update`.

- [ ] **Step 3: Implementare**

In `src/app/api/pazienti/[id]/route.ts`, aggiungere l'import e sostituire `:31-40`:

```typescript
import { risolviNomePaziente, cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'
```

```typescript
  // Allowlist — solo campi sicuri da modificare.
  // `nome` e `cognome` sono DELIBERATAMENTE fuori da questo ciclo: hanno un
  // ramo proprio qui sotto, perché non si possono scrivere grezzi.
  const ALLOWED = ['codice_paziente', 'note', 'anamnesi', 'asl', 'sesso', 'data_nascita'] as const
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of ALLOWED) {
    if (field in body) updates[field] = body[field]
  }

  // Rettifica di nome e cognome (G4 — Art. 16 GDPR: un cognome scritto male
  // finisce in `dichiarazioni_conformita.paziente_nome`, che si conserva 10
  // anni; senza questa via non era correggibile da nessuna parte).
  //
  // 🛑 Perché NON basta metterli nell'allowlist: il trigger
  // `sync_paziente_nome_cognome` è `BEFORE INSERT OR UPDATE`. Il pannello di
  // modifica invia l'intero form a ogni salvataggio, quindi due caselle
  // lasciate vuote scriverebbero `('', '')` → il trigger comporrebbe `' '`
  // (uno spazio) → `precheck.ts:40-43` si ferma lì (`''` non è nullish),
  // non arriva mai a `codice_paziente` → elemento 4 dell'Allegato XIII
  // fallito → CONSEGNA BLOCCATA, da un salvataggio che sembra un no-op.
  // La regola §5 va applicata anche qui, sui valori RISULTANTI (body sopra
  // riga corrente), non solo su quelli inviati.
  if ('nome' in body || 'cognome' in body) {
    const { data: attuale } = await svc
      .from('pazienti')
      .select('nome, cognome, codice_paziente')
      .eq('id', id)
      .eq('laboratorio_id', context.laboratorioId)
      .single()

    if (!attuale) {
      return NextResponse.json({ error: 'Paziente non trovato' }, { status: 404 })
    }

    const codice = 'codice_paziente' in body
      ? (typeof body.codice_paziente === 'string' ? body.codice_paziente : null)
      : attuale.codice_paziente

    const coppia = risolviNomePaziente({
      cognome: 'cognome' in body
        ? (typeof body.cognome === 'string' ? body.cognome : null)
        // `cognomeEffettivo`: sui pazienti creati dal wizard senza nome il
        // CODICE vive dentro `cognome` (invariante 2). Trattarlo come un
        // cognome vero farebbe vincere il codice sul nome appena digitato.
        : cognomeEffettivo(attuale.cognome, attuale.codice_paziente),
      nome: 'nome' in body
        ? (typeof body.nome === 'string' ? body.nome : null)
        : attuale.nome,
      codice,
    })

    if (!coppia) {
      return NextResponse.json({ error: 'Serve almeno il codice paziente' }, { status: 422 })
    }

    updates.cognome = coppia.cognome
    updates.nome = coppia.nome
  }
```

⚠️ Il controllo `if (Object.keys(updates).length === 1)` resta **dopo** questo blocco, invariato.

- [ ] **Step 4: Eseguire e verificare che PASSI**

```bash
npx vitest run tests/unit/api-pazienti-patch.test.ts
```

Atteso: PASS, 8 test.

- [ ] **Step 5: Lint + commit**

```bash
npx eslint "src/app/api/pazienti/[id]/route.ts"
git add "src/app/api/pazienti/[id]/route.ts" tests/unit/api-pazienti-patch.test.ts
git commit -m "feat(api): nome e cognome del paziente rettificabili, passando dalla regola §5"
```

---

## Task 6: `PassoPaziente` — una riga, due caselle, un solo «Salta»

**Files:**
- Modify: `src/components/features/wizard/PassoPaziente.tsx:35-36` (tipi), `:38-68` (props + dettatura), `:99-105` (la riga), `:124-193` (`RigaOpzionale` → nuovo `RigaNomePaziente`)
- Test: `tests/unit/PassoPaziente.test.tsx` (righe 40, 80, 81, 179 + nuovi)

**Interfaces:**
- Consumes: la variante approvata al **Task 1**; `CampoTesto` (`@/components/ds/Campo`, props `{ label, valore, onCambia, placeholder?, autoFocus? }`); `LinkQuieto`.
- Produces: `PassoPaziente` prende `cognome: string` e `nome: string` **al posto di** `alias: string`; chiama `onCambia({ cognome })` / `onCambia({ nome })`. Consumato dal Task 7.

🛑 **Nessun React prima che il Task 1 sia chiuso con l'approvazione di Francesco.**

- [ ] **Step 1: Aggiornare i test esistenti + scrivere i nuovi (che falliscono)**

In `tests/unit/PassoPaziente.test.tsx`:
- riga 40: `alias: '',` → `cognome: '', nome: '',`
- riga 80: resta `expect(screen.getByText('Nome o alias'))` — **la riga chiusa continua a chiamarsi così** (D4 emendata da U10)
- riga 81: `toHaveLength(3)` resta **3** — è il punto di U5: un solo «Salta» anche per due caselle
- riga 179: il test «non mostra un esempio» resta valido

Aggiungere:

```typescript
describe('PassoPaziente — la riga «Nome o alias» si apre in due caselle (U5, D6)', () => {
  it('chiusa, la riga si chiama ancora «Nome o alias» (la parola alias autorizza il nome finto)', () => {
    render(<PassoPaziente {...props()} />)
    expect(screen.getByText('Nome o alias')).toBeInTheDocument()
    expect(screen.queryByLabelText('Cognome')).not.toBeInTheDocument()
  })

  it('aperta, mostra DUE caselle: Cognome sopra, Nome sotto', async () => {
    render(<PassoPaziente {...props()} />)
    await userEvent.setup().click(screen.getByText('Nome o alias'))
    const cognome = screen.getByLabelText('Cognome')
    const nome = screen.getByLabelText('Nome')
    expect(cognome).toBeInTheDocument()
    expect(nome).toBeInTheDocument()
    // Cognome PRIMA di Nome nell'ordine del documento (§ resa 5: il cognome davanti).
    expect(cognome.compareDocumentPosition(nome) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('aprendo, il focus va sul Cognome (la casella che sopravvive sempre)', async () => {
    render(<PassoPaziente {...props()} />)
    await userEvent.setup().click(screen.getByText('Nome o alias'))
    expect(screen.getByLabelText('Cognome')).toHaveFocus()
  })

  it('digitare nel Cognome chiama onCambia({ cognome })', async () => {
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ onCambia })} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Nome o alias'))
    await user.type(screen.getByLabelText('Cognome'), 'B')
    expect(onCambia).toHaveBeenCalledWith({ cognome: 'B' })
  })

  it('digitare nel Nome chiama onCambia({ nome })', async () => {
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ onCambia })} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Nome o alias'))
    await user.type(screen.getByLabelText('Nome'), 'G')
    expect(onCambia).toHaveBeenCalledWith({ nome: 'G' })
  })

  it('«Salta» è UNO SOLO e svuota ENTRAMBE le caselle', async () => {
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ cognome: 'Bagheria', nome: 'Giuseppe', onCambia })} />)
    const salta = screen.getAllByRole('button', { name: 'Salta' })
    expect(salta).toHaveLength(3) // Elemento, Colore, Nome o alias
    await userEvent.setup().click(salta[2])
    expect(onCambia).toHaveBeenCalledWith({ cognome: '', nome: '' })
    expect(screen.queryByLabelText('Cognome')).not.toBeInTheDocument()
  })

  it('riga già valorizzata su UNA sola delle due (tornando indietro) è aperta lo stesso', () => {
    render(<PassoPaziente {...props({ cognome: '', nome: 'Giuseppe' })} />)
    expect(screen.getByLabelText('Nome')).toHaveValue('Giuseppe')
    expect(screen.getByLabelText('Cognome')).toHaveValue('')
  })
})

describe('PassoPaziente — dettatura (U5)', () => {
  it('la dettatura sulla riga aperta va sul COGNOME, non sul nome', async () => {
    const onCambia = vi.fn()
    ;(window as unknown as Record<string, unknown>).SpeechRecognition = MockSpeechRecognition
    render(<PassoPaziente {...props({ onCambia })} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Nome o alias'))
    await user.click(screen.getByRole('button', { name: /detta|voce/i }))
    act(() => {
      ultimaIstanza()?.onresult?.({ results: [[{ transcript: 'Bagheria' }]] })
    })
    expect(onCambia).toHaveBeenCalledWith({ cognome: 'Bagheria' })
  })
})
```

⚠️ Il nome accessibile del bottone di dettatura va letto da `src/components/ds/PillVoce.tsx` prima di scrivere l'ultimo test — se non combacia, adeguare il selettore, **non** il componente.

- [ ] **Step 2: Eseguire e verificare che FALLISCA**

```bash
npx vitest run tests/unit/PassoPaziente.test.tsx
```

Atteso: FAIL — `cognome`/`nome` non esistono nelle props, nessuna label «Cognome».

- [ ] **Step 3: Implementare — tipi, props, dettatura**

In `src/components/features/wizard/PassoPaziente.tsx`:

```typescript
type CampoOpzionale = 'elemento' | 'colore' | 'cognome' | 'nome'
type CampoAttivo = 'pz' | CampoOpzionale

export function PassoPaziente(props: {
  pz: string
  cognome: string
  nome: string
  elemento: string
  colore: string
  foto: File | null
  onCambia: (patch: Partial<StatoWizard>) => void
  onContinua: () => void
  inCreazione: boolean
}) {
  const { pz, cognome, nome, elemento, colore, foto, onCambia, onContinua, inCreazione } = props
  const [campoAttivo, setCampoAttivo] = useState<CampoAttivo>('pz')

  // Instrada il trascritto di PillVoce verso l'ultimo campo su cui è caduto
  // il focus (default 'pz'). U5: aprendo la riga del paziente il focus va sul
  // Cognome, quindi la dettatura parte da lì — la casella che sopravvive
  // sempre (è quella in cui finisce il valore quando se ne compila una sola).
  // Una dettatura che riempia ENTRAMBE le caselle sarebbe una decisione a sé,
  // non implicita: il Nome si compila a mano.
  function pillOnTesto(testo: string) {
    switch (campoAttivo) {
      case 'pz':
        onCambia({ pz: testo })
        break
      case 'elemento':
        onCambia({ elemento: testo })
        break
      case 'colore':
        onCambia({ colore: testo })
        break
      case 'cognome':
        onCambia({ cognome: testo })
        break
      case 'nome':
        onCambia({ nome: testo })
        break
    }
  }
```

- [ ] **Step 4: Implementare — la riga**

Sostituire il terzo `<RigaOpzionale …>` (`:99-105`) con:

```tsx
        <RigaNomePaziente
          cognome={cognome}
          nome={nome}
          onAttivaCognome={() => setCampoAttivo('cognome')}
          onAttivaNome={() => setCampoAttivo('nome')}
          onCambia={(patch) => onCambia(patch)}
        />
```

E aggiungere il componente accanto a `RigaOpzionale` (che resta invariato per Elemento e Colore):

```tsx
/**
 * RigaNomePaziente — la terza riga del blocco «Se vuoi, aggiungi». Gemella di
 * `RigaOpzionale`, con una differenza sola: aperta mostra DUE caselle
 * impilate (Cognome sopra, Nome sotto) invece di una.
 *
 * PERCHÉ UNA RIGA E NON DUE (riserva U5, ratificata D6): due righe
 * significherebbero due «Salta» e due dettature, su un passo che si
 * attraversa col telefono in mano e spesso coi guanti. Una riga sola tiene
 * il passo CHIUSO identico a oggi — tre righe, tre «Salta» — e concentra la
 * novità dentro l'apertura.
 *
 * PERCHÉ SI CHIAMA ANCORA «Nome o alias» (U10): la parola *alias* è l'unica
 * affordance che dice all'odontotecnico che un nome finto va bene. Toglierla
 * per scrivere «Cognome» sarebbe una spinta a raccogliere identità vere,
 * opposta al principio GDPR ratificato — e gratis.
 *
 * IL «Salta» È UNO SOLO e svuota entrambe le caselle: questo chiude anche U1
 * (con due «Salta» separati si arrivava in un tap a cognome vuoto + nome
 * pieno, che senza la regola §5 scriveva «Pz-0042 Giuseppe» in targa).
 *
 * `aperto` parte da "almeno una delle due non è vuota": tornando indietro e
 * poi avanti, la riga non nasconde ciò che è già stato scritto.
 */
function RigaNomePaziente(props: {
  cognome: string
  nome: string
  onAttivaCognome: () => void
  onAttivaNome: () => void
  onCambia: (patch: { cognome?: string; nome?: string }) => void
}) {
  const { cognome, nome, onAttivaCognome, onAttivaNome, onCambia } = props
  const [aperto, setAperto] = useState(cognome !== '' || nome !== '')

  function salta() {
    setAperto(false)
    onCambia({ cognome: '', nome: '' })
  }

  const stileRiga: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start', // ⚠️ VARIANTE APPROVATA AL TASK 1 — se Francesco
    // ha scelto la B, qui va 'center'.
    gap: spazio.sm,
    padding: '14px 0',
    borderBottom: 'none', // ultima riga del blocco
  }

  if (aperto) {
    return (
      <div style={stileRiga}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spazio.sm }}>
          <div onFocus={onAttivaCognome}>
            <CampoTesto label="Cognome" valore={cognome} onCambia={(v) => onCambia({ cognome: v })} autoFocus />
          </div>
          <div onFocus={onAttivaNome}>
            <CampoTesto label="Nome" valore={nome} onCambia={(v) => onCambia({ nome: v })} />
          </div>
        </div>
        <LinkQuieto onClick={salta}>Salta</LinkQuieto>
      </div>
    )
  }

  function apri() {
    setAperto(true)
    onAttivaCognome()
  }

  return (
    <div style={stileRiga}>
      <style>{`
        .ds-riga-nome-paziente:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <button type="button" className="ds-riga-nome-paziente" onClick={apri} style={stileRigaBottone}>
        <span style={stileOpzNome}>Nome o alias</span>
      </button>
      <LinkQuieto onClick={salta}>Salta</LinkQuieto>
    </div>
  )
}
```

⚠️ **La riga «Colore» (`:91-98`) resta `ultima={false}`: non si tocca.** La prop `ultima` di `RigaOpzionale` governa **solo il proprio bordo inferiore**, e Colore ha ancora una riga sotto di sé (quella del paziente): il suo separatore deve restare. È `RigaNomePaziente` a portare `borderBottom: 'none'` per conto proprio, essendo l'ultima del blocco. Esito atteso, da confermare nel QA browser: separatore fra Elemento e Colore ✓ · fra Colore e «Nome o alias» ✓ · sotto «Nome o alias» ✗.

- [ ] **Step 5: Eseguire e verificare che PASSI**

```bash
npx vitest run tests/unit/PassoPaziente.test.tsx
```

Atteso: PASS.

- [ ] **Step 6: Lint + commit**

```bash
npx eslint src/components/features/wizard/PassoPaziente.tsx
git add src/components/features/wizard/PassoPaziente.tsx tests/unit/PassoPaziente.test.tsx
git commit -m "feat(wizard): passo 3 chiede cognome e nome in due caselle, un solo Salta"
```

---

## Task 7: `WizardNuovoLavoro` + persistenza `v: 2`

**Files:**
- Modify: `src/components/features/wizard/WizardNuovoLavoro.tsx:45-65`, `:154-187`, `:360-395`, `:492-503`
- Modify: `src/lib/wizard/persistenza.ts:12-24`, `:57` (guardia di versione)
- Test: `tests/unit/wizard-persistenza.test.ts:16`, `tests/unit/WizardNuovoLavoro.test.tsx:293`

**Interfaces:**
- Consumes: `PassoPaziente` con `cognome`/`nome` (Task 6); `creaLavoroDaWizard` con la firma nuova e `EsitoCreazione.nomePazienteNonAggiornato` (Task 3).
- Produces: `StatoWizard` con `cognome: string` e `nome: string` al posto di `alias`; `StatoSalvato` con `v: 2`.

🛑 **La versione va bumpata, e la catena del fallimento è questa:** aggiungendo `cognome`/`nome` a `StatoSalvato` senza toccare `v`, una bozza salvata **prima** del deploy viene ripresa da `riprendi()` con quei due campi `undefined` → `JSON.stringify` **elimina le chiavi undefined** → il body del POST non porta `nome` → `route.ts` fa `body.nome ?? null` → `nome: null` → il trigger non compone → `nome_cognome` viola il `NOT NULL` → 500 → **nessun lavoro creato**. È la trappola 3.2 raggiunta dalla porta della ripresa, e colpisce solo chi ha abbandonato una bozza nelle 24h a cavallo del deploy: invisibile in test, visibilissima al banco.

- [ ] **Step 1: Aggiornare i test + scrivere quello di regressione sulla ripresa**

`tests/unit/wizard-persistenza.test.ts` riga 16: `alias: '',` → `cognome: '', nome: '',`; e ovunque compaia `v: 1` nei payload di prova → `v: 2`.

Aggiungere in `tests/unit/wizard-persistenza.test.ts`:

```typescript
  it('una bozza della versione VECCHIA viene scartata (mai ripresa con campi mancanti)', () => {
    // Senza questo scarto, `cognome`/`nome` tornerebbero `undefined`, la
    // JSON.stringify li toglierebbe dal body, la route scriverebbe
    // `nome: null` e la creazione del lavoro morirebbe (trappola 3.2).
    window.localStorage.setItem(
      CHIAVE_WIZARD,
      JSON.stringify({ v: 1, salvatoA: Date.now(), userId: 'u1', labId: 'l1', passo: 3, cliente: null, tipo: null, pz: 'PZ-1', alias: 'Bagheria', elemento: '', colore: '' })
    )
    expect(leggiStato('u1', 'l1', Date.now())).toBeNull()
  })
```

`tests/unit/WizardNuovoLavoro.test.tsx` riga 293: `alias: '',` → `cognome: '', nome: '',`.

Aggiungere in `tests/unit/WizardNuovoLavoro.test.tsx`:

```typescript
  it('esito con nomePazienteNonAggiornato → avviso non bloccante, il lavoro resta creato (U9)', async () => {
    // mock di creaLavoroDaWizard che ritorna il flag a true
    // (stesso schema di mock già usato nel file per gli accessori falliti)
    // …arrangiare il mock…
    expect(await screen.findByText(/ha già un nome/i)).toBeInTheDocument()
    expect(screen.getByText('Fatto!')).toBeInTheDocument()
  })
```

⚠️ Adeguare l'arrangiamento del mock allo schema già presente nel file (`vi.mock('@/lib/wizard/crea-lavoro', …)`), senza inventarne uno nuovo.

- [ ] **Step 2: Eseguire e verificare che FALLISCANO**

```bash
npx vitest run tests/unit/wizard-persistenza.test.ts tests/unit/WizardNuovoLavoro.test.tsx
```

- [ ] **Step 3: Implementare — persistenza `v: 2`**

In `src/lib/wizard/persistenza.ts`:

```typescript
export type StatoSalvato = {
  // v2 (27/07/2026): `alias` si è sdoppiato in `cognome` + `nome`. La
  // versione è bumpata apposta: una bozza v1 ripresa in un wizard v2
  // porterebbe `cognome`/`nome` a `undefined`, JSON.stringify li toglierebbe
  // dal body del POST, la route scriverebbe `nome: null` e la creazione del
  // lavoro morirebbe (trappola 3.2 della spec §5). Le bozze v1 si scartano:
  // vivono al massimo 24h, il costo è una ripartenza da capo.
  v: 2
  salvatoA: number
  userId: string
  labId: string
  passo: StatoWizard['passo']
  cliente: StatoWizard['cliente']
  tipo: TipoScelto | null
  pz: string
  cognome: string
  nome: string
  elemento: string
  colore: string
}
```

e in `leggiStato`:

```typescript
  if (!parsed || parsed.v !== 2) return null
```

- [ ] **Step 4: Implementare — lo stato del wizard**

In `src/components/features/wizard/WizardNuovoLavoro.tsx`:

```typescript
export type StatoWizard = {
  passo: 1 | 2 | 3
  cliente: { id: string; label: string } | null
  tipo: TipoScelto | null
  pz: string
  cognome: string
  nome: string
  elemento: string
  colore: string
  foto: File | null
}

const STATO_INIZIALE: StatoWizard = {
  passo: 1, cliente: null, tipo: null, pz: '',
  cognome: '', nome: '',
  elemento: '', colore: '', foto: null,
}
```

- effect di salvataggio (`:156-168`): `v: 1` → `v: 2`; `alias: stato.alias,` → `cognome: stato.cognome, nome: stato.nome,`
- `riprendi` (`:175-184`): `alias: statoSalvato.alias,` → `cognome: statoSalvato.cognome, nome: statoSalvato.nome,`
- commento di riga 259: `pz/alias/elemento/colore/foto` → `pz/cognome/nome/elemento/colore/foto`
- `continuaPaziente` (`:366-375`): `alias: stato.alias,` → `cognome: stato.cognome, nome: stato.nome,`
- `RenderPasso` (`:492-503`): `alias={stato.alias}` → `cognome={stato.cognome} nome={stato.nome}`

- [ ] **Step 5: Implementare — l'avviso U9**

In `CorpoWizard.continuaPaziente`, dopo `azzeraStato()` e prima di `setFatto`, aggiungere `avvisa` alla destrutturazione di `useAvvisi()` (`:352`) e:

```typescript
    // U9 — il paziente esisteva già con un nome suo: non l'abbiamo
    // sovrascritto, ma non lo teniamo nascosto. Avviso NORMALE (non errore):
    // il lavoro è stato creato, non c'è nulla da riparare.
    if (esito.nomePazienteNonAggiornato) {
      avvisa('Questo paziente ha già un nome salvato: non l\'ho cambiato.')
    }
```

⚠️ `useAvvisi()` espone `{ avvisa, errore }` (`src/components/ds/Avviso.tsx:96`): `errore` è rosso e non si auto-chiude — qui **non** è un errore.

- [ ] **Step 6: Eseguire i test e verificare che PASSINO**

```bash
npx vitest run tests/unit/wizard-persistenza.test.ts tests/unit/WizardNuovoLavoro.test.tsx tests/unit/PassoPaziente.test.tsx tests/unit/crea-lavoro.test.ts
```

- [ ] **Step 7: Lint + commit**

```bash
npx eslint src/components/features/wizard/ src/lib/wizard/
git add src/components/features/wizard/WizardNuovoLavoro.tsx src/lib/wizard/persistenza.ts tests/unit/wizard-persistenza.test.ts tests/unit/WizardNuovoLavoro.test.tsx
git commit -m "feat(wizard): stato sdoppiato cognome/nome, bozze salvate alla v2"
```

---

## Task 8: `PazienteEditSheet` — la via di correzione

**Files:**
- Modify: `src/components/features/pazienti/PazienteEditSheet.tsx:8-31` (props + form), `:144-155` (le caselle)
- Modify: `src/app/(app)/pazienti/[id]/page.tsx` (passare `nome`, `cognome` al componente)
- Test: `tests/unit/PazienteEditSheet.test.tsx` (**nuovo**)

**Interfaces:**
- Consumes: `cognomeEffettivo` (Task 2); `PATCH /api/pazienti/[id]` con `nome`/`cognome` (Task 5).
- Produces: nulla a valle.

⚠️ **Questa pagina è v2.3 legacy** (spec §7): si resta su `motionTokens` da `@/design-system/motion` e sugli stili inline già presenti nel file. **Nessun componente `ds/` v3 qui.**

🛑 **Senza il Task 5 questa schermata è la seconda porta della trappola:** `handleSave` invia l'intero `form` a ogni salvataggio. È il Task 5 a renderla sicura — non invertire l'ordine.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `tests/unit/PazienteEditSheet.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PazienteEditSheet } from '@/components/features/pazienti/PazienteEditSheet'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const BASE = {
  id: 'pz-1',
  codice_paziente: 'PZ-0042',
  nome: null as string | null,
  cognome: null as string | null,
  note: null, anamnesi: null, asl: null, sesso: null, data_nascita: null,
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }))) })
afterEach(() => { vi.unstubAllGlobals() })

describe('PazienteEditSheet — correzione di nome e cognome (D9 parte paziente, G4)', () => {
  it('il pannello mostra le caselle Cognome e Nome', async () => {
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'Bagheria', nome: 'Giuseppe' }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /modifica/i }))
    expect(screen.getByLabelText(/Cognome/i)).toHaveValue('Bagheria')
    expect(screen.getByLabelText(/^Nome/i)).toHaveValue('Giuseppe')
  })

  it('🛑 il «codice travestito» NON compare nella casella Cognome (inviterebbe a cancellarlo)', async () => {
    // I pazienti creati dal wizard senza nome hanno il CODICE dentro `cognome`.
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'PZ-0042', nome: '' }} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /modifica/i }))
    expect(screen.getByLabelText(/Cognome/i)).toHaveValue('')
  })

  it('salvare invia nome e cognome nella PATCH', async () => {
    render(<PazienteEditSheet paziente={{ ...BASE, cognome: 'Bagherra', nome: 'Giuseppe' }} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /modifica/i }))
    await user.clear(screen.getByLabelText(/Cognome/i))
    await user.type(screen.getByLabelText(/Cognome/i), 'Bagheria')
    await user.click(screen.getByRole('button', { name: /salva/i }))

    const [url, opt] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/pazienti/pz-1')
    expect(opt.method).toBe('PATCH')
    expect(JSON.parse(opt.body)).toMatchObject({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })
})
```

- [ ] **Step 2: Eseguire e verificare che FALLISCA**

```bash
npx vitest run tests/unit/PazienteEditSheet.test.tsx
```

- [ ] **Step 3: Implementare**

In `src/components/features/pazienti/PazienteEditSheet.tsx`:

```typescript
import { cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'

interface PazienteEditProps {
  paziente: {
    id: string
    codice_paziente: string | null
    nome: string | null
    cognome: string | null
    note: string | null
    anamnesi: string | null
    asl: string | null
    sesso: string | null
    data_nascita: string | null
  }
}
```

```typescript
  const [form, setForm] = useState({
    codice_paziente: paziente.codice_paziente ?? '',
    // `cognomeEffettivo`: sui pazienti creati dal wizard senza nome il CODICE
    // vive dentro `cognome` (invariante 2 della regola §5). Mostrarlo in una
    // casella etichettata «Cognome» inviterebbe a cancellarlo — e cancellarlo
    // è esattamente il gesto che, senza la guardia server (Task 5), bloccava
    // la consegna. Qui lo si nasconde: la casella parte vuota, e se resta
    // vuota il server rimette il codice da sé.
    cognome: cognomeEffettivo(paziente.cognome, paziente.codice_paziente),
    nome: paziente.nome ?? '',
    asl: paziente.asl ?? '',
    sesso: paziente.sesso ?? '',
    data_nascita: paziente.data_nascita ?? '',
    anamnesi: paziente.anamnesi ?? '',
    note: paziente.note ?? '',
  })
```

Aggiungere le due caselle **subito dopo** quella del codice paziente (`:145-154`), con gli stessi `inputStyle`/`labelStyle` del file e `htmlFor`/`id` espliciti (il file usa `<label>` senza associazione: qui serve, per l'accessibilità e per i test):

```tsx
                {/* Cognome + Nome — la via di rettifica (Art. 16 GDPR).
                    Cognome sopra: è la parte che identifica il lavoro. */}
                <div>
                  <label style={labelStyle} htmlFor="paz-cognome">Cognome</label>
                  <input
                    id="paz-cognome"
                    style={inputStyle}
                    value={form.cognome}
                    placeholder="Anche solo un soprannome"
                    onChange={e => setForm(p => ({ ...p, cognome: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={labelStyle} htmlFor="paz-nome">Nome</label>
                  <input
                    id="paz-nome"
                    style={inputStyle}
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  />
                </div>
```

In `src/app/(app)/pazienti/[id]/page.tsx`: aggiungere `nome` e `cognome` alla `select` del paziente e all'oggetto passato a `<PazienteEditSheet paziente={…} />`.

- [ ] **Step 4: Eseguire e verificare che PASSI**

```bash
npx vitest run tests/unit/PazienteEditSheet.test.tsx
```

- [ ] **Step 5: Lint + commit**

```bash
npx eslint src/components/features/pazienti/ "src/app/(app)/pazienti/"
git add src/components/features/pazienti/PazienteEditSheet.tsx "src/app/(app)/pazienti/[id]/page.tsx" tests/unit/PazienteEditSheet.test.tsx
git commit -m "feat(pazienti): cognome e nome correggibili dalla scheda paziente"
```

---

## Task 9: `EtichettaTemplate` — il codice paziente per primo

**Files:**
- Modify: `src/components/features/pdf/EtichettaTemplate.tsx:117-124`
- Test: `tests/unit/etichetta-paziente.test.ts` (**nuovo**)

**Interfaces:**
- Consumes: nulla di nuovo.
- Produces: nulla a valle.

**Il difetto (riserva G1):** dei tre template che stampano il paziente, l'Etichetta è **l'unico che non passa mai da `codice_paziente`**. `IFUTemplate.tsx:169-176` e `RicevutaConsegnaTemplate.tsx:186-193` hanno **la stessa identica funzione** `codiceGDPR`, che prova il codice per primo. Qui si allinea l'Etichetta a loro — **ricopiando il loro ordine, non inventandone uno**.

⚠️ **Cosa cambia in un documento:** oggi l'Etichetta stampa lo snapshot (che nessuno popola, `spec §7`) e ricade su `cognome` + iniziale del nome. Domani stampa `PAZ-<codice>` quando il codice c'è — cioè **meno** dato personale, non di più. È un miglioramento di minimizzazione, non una perdita di informazione utile: il codice è l'identificatore che il laboratorio usa davvero.

- [ ] **Step 1: Scrivere il test che fallisce**

Creare `tests/unit/etichetta-paziente.test.ts`. Estrarre la funzione da testare **esportandola** dal template (oggi è privata):

```typescript
import { describe, it, expect } from 'vitest'
import { pazienteEtichetta } from '@/components/features/pdf/EtichettaTemplate'
import type { LavoroDettaglio } from '@/types/domain'

const l = (p: Partial<LavoroDettaglio>) => p as LavoroDettaglio

describe('EtichettaTemplate — il paziente, allineato a IFU e Ricevuta (G1)', () => {
  it('il CODICE viene per primo, come negli altri due template', () => {
    expect(pazienteEtichetta(l({
      paziente_nome_snapshot: 'BAGHERIA GIUSEPPE',
      paziente: { codice_paziente: 'PZ-0042', nome: 'Giuseppe', cognome: 'Bagheria' },
    }))).toBe('PAZ-PZ-0042')
  })

  it('senza codice: iniziale del nome + cognome (anonimizzazione parziale)', () => {
    expect(pazienteEtichetta(l({
      paziente_nome_snapshot: null,
      paziente: { codice_paziente: null, nome: 'Giuseppe', cognome: 'Bagheria' },
    }))).toBe('G. Bagheria')
  })

  it('senza codice e senza nome/cognome: si ricade sullo snapshot, abbreviato', () => {
    expect(pazienteEtichetta(l({
      paziente_nome_snapshot: 'BAGHERIA GIUSEPPE',
      paziente: { codice_paziente: null, nome: null, cognome: null },
    }))).toBe('B. GIUSEPPE')
  })

  it('niente di niente → la stessa sentinella degli altri due', () => {
    expect(pazienteEtichetta(l({ paziente_nome_snapshot: null, paziente: null })))
      .toBe('N.A. (GDPR)')
  })
})
```

- [ ] **Step 2: Eseguire e verificare che FALLISCA**

```bash
npx vitest run tests/unit/etichetta-paziente.test.ts
```

Atteso: FAIL — `pazienteEtichetta` non è esportata.

- [ ] **Step 3: Implementare**

⚠️ **Leggere prima `src/components/features/pdf/IFUTemplate.tsx:169-185`** e ricopiarne il corpo verbatim. Sostituire `inizialeCognomePaziente` (`:117-124`) con:

```typescript
/**
 * Il paziente sull'etichetta. Allineata verbatim a `codiceGDPR` di
 * IFUTemplate.tsx:169-185 e RicevutaConsegnaTemplate.tsx:186-193 (riserva
 * G1): dei tre template questo era l'UNICO che non passava mai da
 * `codice_paziente`, e stampava direttamente cognome + iniziale. Ora l'ordine
 * è lo stesso ovunque: prima il codice pseudonimizzato, poi (solo se manca)
 * l'iniziale + cognome, poi lo snapshot abbreviato.
 *
 * Esportata per il test; il template la usa internamente.
 */
export function pazienteEtichetta(lavoro: LavoroDettaglio): string {
  if (lavoro.paziente?.codice_paziente) return `PAZ-${lavoro.paziente.codice_paziente}`
  if (lavoro.paziente) {
    const iniziale = lavoro.paziente.nome ? lavoro.paziente.nome.charAt(0).toUpperCase() + '.' : ''
    const cognome = lavoro.paziente.cognome ?? ''
    if (iniziale || cognome) return `${iniziale} ${cognome}`.trim()
  }
  if (lavoro.paziente_nome_snapshot) {
    const parts = lavoro.paziente_nome_snapshot.split(' ')
    if (parts.length > 1) return `${parts[0].charAt(0).toUpperCase()}. ${parts.slice(1).join(' ')}`
    return lavoro.paziente_nome_snapshot
  }
  return 'N.A. (GDPR)'
}
```

Aggiornare il punto di consumo nel corpo del componente (cercare `inizialeCognomePaziente(` e sostituire con `pazienteEtichetta(`).

- [ ] **Step 4: Eseguire e verificare che PASSI**

```bash
npx vitest run tests/unit/etichetta-paziente.test.ts
```

- [ ] **Step 5: Lint + commit**

```bash
npx eslint src/components/features/pdf/EtichettaTemplate.tsx
git add src/components/features/pdf/EtichettaTemplate.tsx tests/unit/etichetta-paziente.test.ts
git commit -m "fix(pdf): l'etichetta passa dal codice paziente come IFU e ricevuta"
```

---

## Task 10: `ANALISI/17` — annotare la decisione D8

**Files:**
- Modify: `../ANALISI/17_adempimenti_lab_2026.md:866-896` (§Pseudonimizzazione dei Dati Pazienti + tabella «Access Control per Tecnici»)

**Interfaces:** nessuna. Solo documentazione — nessun test, nessun codice.

**Perché è in questa tappa e non a backlog:** D8 ratifica che **il tecnico continua a vedere il nome del paziente sulla parete** («in un laboratorio piccolo il tecnico conosce comunque i pazienti»). Ma `ANALISI/17` promette oggi «Tecnico → solo pseudonimo» in due punti. Lasciando i due documenti in disaccordo, resta scritta una promessa che il prodotto non mantiene — ed è esattamente il tipo di scarto che un'ispezione trova. **Non si cancella l'analisi: si annota la decisione, con data e motivo** (spec §6, ultima riga della tabella TAPPA 1).

- [ ] **Step 1: Annotare il punto elenco della §Pseudonimizzazione**

Sotto la riga «I tecnici dipendenti vedono solo `PAZ-a3f7d9e1` nella scheda lavoro, non il nome del paziente» (riga ~871), aggiungere:

```markdown
> ⚠️ **Decisione di prodotto D8 (Francesco, 27/07/2026) — scostamento consapevole.**
> Nella parete delle cassette di UÀ il **tecnico vede il nome del paziente**, non il solo
> pseudonimo. Motivo dichiarato: in un laboratorio piccolo il tecnico conosce comunque i
> pazienti, e la targa della cassetta serve a riconoscere il lavoro al volo — è lo scopo per
> cui la parete esiste. Lo scostamento riguarda **solo la parete** (`/cassette`) e resta
> circoscritto al perimetro del laboratorio titolare del trattamento.
> Riferimento: `ua-app/docs/superpowers/specs/2026-07-27-nome-cognome-paziente-design.md` §4, D8.
> 🛑 Se un domani il laboratorio crescesse o si aprisse a personale esterno, **questa è la
> decisione da riaprire**, non un'omissione da correggere in silenzio.
```

- [ ] **Step 2: Annotare la tabella dei ruoli**

Sotto la tabella «Access Control per Tecnici» (dopo la riga `| Magazziniere | …`, ~riga 897), aggiungere:

```markdown
> ⚠️ **D8 (27/07/2026):** le due righe «Tecnico → Solo pseudonimo» descrivono l'impianto
> teorico e restano l'obiettivo per la **scheda lavoro**. Sulla **parete delle cassette** UÀ
> mostra invece il nome del paziente anche al tecnico, per decisione esplicita — v. il riquadro
> in §Pseudonimizzazione qui sopra.
```

- [ ] **Step 3: Commit**

```bash
git add ../ANALISI/17_adempimenti_lab_2026.md
git commit -m "docs(analisi): annota D8 — il tecnico vede il nome sulla parete"
```

⚠️ `ANALISI/` sta **fuori** da `ua-app/`: verificare con `git status` che il file risulti nello stesso repo prima di committare. Se non lo è, il commit va fatto dalla radice del repo che lo contiene.

---

## Task 11: Verifica completa, QA browser e gate estetico

**Files:** nessuno modificato — è il cancello prima del merge.

- [ ] **Step 1: FASE 7 — i tre comandi, con output reale**

```bash
npx tsc --noEmit
```
Atteso: nessun output (zero errori).

```bash
npx vitest run
```
Atteso: tutti verdi. Il totale cresce di ~40 rispetto ai 3364 di partenza. **Un numero diverso da quello atteso non si arrotonda: si guarda.**

```bash
npx next build
```
Atteso: build completata. ⚠️ serve `.env.local` (altrimenti fallisce su `/api/admin/labs` via Stripe).

- [ ] **Step 2: FASE 9 — QA browser sui tre viewport × due temi**

Superficie: `/lavori/nuovo` passo 3 e `/pazienti/[id]` (pannello di modifica).

```bash
npm run dev
```

Da verificare, a 390 · 768 · 1280, in chiaro e scuro:
1. Riga chiusa «Nome o alias» identica a oggi; tre «Salta».
2. Aperta: due caselle, Cognome sopra, un solo «Salta»; il focus parte sul Cognome.
3. Touch target ≥ 44px su ogni elemento interattivo (constraint 10).
4. Il separatore fra Colore e la riga del paziente c'è; sotto la riga del paziente no.
5. `prefers-reduced-motion`: nessuno scivolamento.
6. Percorso completo: creare un lavoro con cognome+nome → aprire `/cassette` → **la targa mostra il cognome davanti**.
7. Percorso di rettifica: `/pazienti/[id]` → Modifica → correggere il cognome → salvare → la targa si aggiorna.
8. 🛑 **La prova che vale più di tutte:** aprire il pannello di modifica di un paziente creato dal wizard **senza nome**, salvare **senza toccare niente**, poi verificare che quel lavoro sia **ancora consegnabile** (nessun errore «Paziente non identificabile»). È la trappola 3.1 vista dalla porta nuova.
9. ⚠️ **Il cambiamento che nessuno ha chiesto, da attendere e dichiarare (riserva G9).** Dopo aver creato un paziente con **entrambi** i campi, aprire `/pazienti`: la lista mostrerà `Cognome Nome` invece della stringa unica, perché `PazientiSearchList.tsx:173-174` rende **già oggi** `cognome nome` quando ci sono entrambi. Non è una regressione ed è corretto — ma **va detto a Francesco prima del collaudo**, non scoperto durante. Non richiede codice.

🛑 **Il QA dietro login lo fa Francesco:** le password non le digita l'assistente. Si chiede a lui di entrare nel browser, poi si guida la verifica da lì.

- [ ] **Step 3: FASE 9b — gate estetico L2**

Micro-audit della **sola** superficie del passo 3 contro `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` (12 sezioni × 390/768/1280 × chiaro/scuro). Ogni ❌ risolto o deferito **con motivo scritto**. Screenshot before/after in `docs/design/screenshots/2026-07-27-passo3/` (ricordare `git add -f`). Framework: `docs/design/audit-ui-ux/README.md`, livello 2.

- [ ] **Step 4: FASE 8 — review**

Revisori indipendenti sul diff completo. ⚠️ **La skill `ua-app:review` è inutilizzabile** (pretende un file che nel repo non esiste): la review si fa con subagent revisori.

- [ ] **Step 5: 🛑 La prova sul device di Francesco — è lei che decide la tappa 2**

Far creare a Francesco qualche lavoro con nomi veri e guardare la parete **sul suo telefono**. **Se il cognome ora si legge, la tappa 2 non serve** (D7). Se il difetto è ancora visibile, si apre la tappa 2 — e prima si rifanno i tre numeri della spec §5-bis (corpo 11,5px non 10 · fascia 78px non 72 · misura sull'asse **orizzontale**).

- [ ] **Step 6: FASE 10 — merge e deploy**

```bash
git switch main && git merge --no-ff ondata-nome-cognome-paziente
git push origin main
```
Attendere CI verde, poi verificare su https://uachelab.com.

- [ ] **Step 7: FASE 11 — BP-1, la memoria**

- `memory/MEMORY.md`: nuova voce 50 (tappa 1 completata, che cosa è cambiato, che cosa ha deciso la prova sul device).
- `docs/roadmap/ROADMAP-UFFICIALE.md`: tappa 1 in «implementato»; **tappa 1-bis** (D9, percorso GRANDE con panel normativo) e **tappa 2** (condizionale) collocate.
- `memory/SESSION_ACTIVE.md`: sostituito, max 200 token.

---

## Autorevisione del piano (svolta il 27/07/2026)

**1. Copertura della spec.** Tutte e 9 le righe della tabella «TAPPA 1» (spec §6) hanno un task: `PassoPaziente:99-105` → T6 · `PassoPaziente:49-68` (dettatura) → T6 · `WizardNuovoLavoro` + `RipresaSheet` → T7 · `crea-lavoro:134-147` → T3 · `crea-lavoro:124-133` (U9) → T3 · `pazienti/[id]:32` → T5 · `EtichettaTemplate:117-124` → T9 · `pazienti/route:118` → T4 · `ANALISI/17` → T10. Tutte e 7 le prove della spec §9 sono coperte (T2 le quattro righe + l'invariante `null`; T3 la catena a valle e il paziente già esistente; T5 la PATCH di rettifica). **`RipresaSheet.tsx` non richiede modifiche**: mostra solo cliente e tipo (verificato leggendolo), il suo tipo si adegua da solo via `StatoSalvato`.

**2. Aggiunte rispetto alla spec, con motivo.** Tre, tutte discendenti dal fatto — verificato in questa sessione — che il trigger è `BEFORE INSERT **OR UPDATE**`: la funzione pura condivisa (T2), l'enforcement server-side in POST (T4) e in PATCH (T5). Senza di esse la tappa 1 *aprirebbe* la trappola della consegna bloccata invece di chiuderla. Non sono decisioni nuove: sono enforcement di un invariante già ratificato (esenzione panel, `ua-app/CLAUDE.md` §0C).

**3. Coerenza dei tipi.** `risolviNomePaziente` e `cognomeEffettivo` mantengono lo stesso nome e la stessa firma nei Task 2→3→4→5→8. `EsitoCreazione.nomePazienteNonAggiornato` è dichiarato in T3 e consumato in T7. `StatoWizard.cognome`/`.nome` sono dichiarati in T7 e consumati da `PassoPaziente` (T6) e da `creaLavoroDaWizard` (T3). `StatoSalvato.v: 2` è coerente fra `persistenza.ts` e i due punti di scrittura/lettura in `WizardNuovoLavoro.tsx`.

**4. Ordine dei task — vincoli reali.** T2 prima di tutto (tutti lo importano). **T5 prima di T8**, sempre: T8 aggiunge le caselle che inviano la coppia, T5 è la guardia che impedisce a quella coppia di bloccare le consegne. T1 (mockup + approvazione) è un **gate**: nessun React del Task 6 prima. T3/T4 e T6/T7 sono indipendenti fra loro e possono procedere in parallelo.

**5. Rollback.** Revert del codice, nient'altro: nessuna migration, e i nomi già scritti separati restano validi (il trigger continua a comporre `nome_cognome`, la targa precedente funzionerebbe comunque). Le bozze wizard `v: 2` orfane scadono da sole in 24h.
