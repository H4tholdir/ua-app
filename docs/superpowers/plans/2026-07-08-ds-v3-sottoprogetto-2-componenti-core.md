# DS v3 — Sotto-progetto 2 «Componenti core» — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Task con checkbox (`- [ ]`). Implementer: **sonnet** (i task traducono anatomia di legge in codice — serve giudizio, non trascrizione). Reviewer: sonnet. Review finale whole-branch: modello più capace.

**Goal:** `src/components/ds/` completo — tutti i componenti §5 della spec — più la pagina-catalogo interna `/ds-v3-catalogo` per l'approvazione visiva di Francesco (gate del sotto-progetto, spec §14.2).

**Architettura:** componenti React client puri (nessun fetch, nessuna conoscenza del dominio DB), un file per componente in `src/components/ds/`, stile via CSS custom properties v3 (`var(--…)`) + Tailwind per layout. Il catalogo è l'unica pagina che monta `data-ds="v3"` e cresce task per task: ogni task aggiunge la propria sezione, così ogni review vede i componenti montati.

**Tech stack:** Next.js 16 App Router · TypeScript · TailwindCSS v4 · Motion 12 (`motion/react`) · Vitest 4 + @testing-library/react · moduli v3 già in main (`tokens`, `motion`, `sound`, `haptic`, `dizionario`).

**Spec di riferimento (LEGGE):** `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` — §5 (anatomia, citata verbatim in ogni task), §8 (motion), §9 (suoni/haptics), §2.3 (dizionario), 7 Leggi (§0).

---

## Global Constraints (valgono per OGNI task — l'implementer li riceve sempre)

1. **File nuovi SOLO in:** `src/components/ds/` (componenti, PascalCase.tsx, named export), `src/app/ds-v3-catalogo/` (catalogo), `tests/unit/ds-v3/componenti/` (test). Eccezioni SOLO nel Task 1 (elencate lì).
2. **NESSUN file v2.3 toccato.** Nessuna pagina esistente modificata. Il DS v3 resta dormiente fuori dal catalogo.
3. **`data-ds="v3"` lo monta SOLO il catalogo** (e in futuro le pagine migrate) — MAI i componenti stessi.
4. **Colori: SOLO `var(--…)`** dentro i componenti (mai hex). I valori-legge non tokenizzati (gradienti §5.1/5.4, palette avatar §5.14, dashed `#CBC1B0`) vivono in `src/design-system/v3/tokens.ts` (estesi nel Task 1) e si importano da lì. Il pre-commit check 4a lo impone.
5. **Misure: i px della §5 sono legge** — si scrivono letterali nel componente (H 70, radius 20, testo 21/800…), NON si inventano né si arrotondano. Radius standard da `raggio` (tokens) quando coincidono.
6. **Motion: SOLO `molla`/`coreografie`/`cssEase`** da `@/design-system/v3/motion` — VIETATO `duration`/`ease` inline (check 4b). `instant` è il default (L7). Pattern pressione tasti: `motion.button` + `whileTap` + `transition={molla.press}`.
7. **Suoni SOLO via `suona()`** (`@/design-system/v3/sound`), **vibrazione SOLO via `vibra()`** (`@/design-system/v3/haptic`). Abbinamenti di legge §9.1. `tap` MAI su azioni di sola lettura.
8. **Testi: parole del banco (L2).** Ogni testo statico del componente e del catalogo passa `trovaParoleVietate()` — c'è un test per questo. Toni: il sistema parla in prima persona («Non sono riuscita a salvare»).
9. **Stati obbligatori per ogni componente interattivo:** default · pressed (fisico, <100ms, mai `pointer-events:none` durante transizioni — §8.2.1) · disabled (**mai nascosto**, faccia `--bg-deep` testo `--faint` + riga che spiega cosa manca) · focus-visible (anello 2px `--blue` offset 2).
10. **A11y:** ruoli/aria corretti; stato mai solo-colore (L3: colore+parola+posizione); target interattivi ≥ 44px (hit area); `useReducedMotion` → coreografie diventano dissolvenze, le pressioni restano (§8.4).
11. **Carry-over review finale SP1 (vincolanti):** i componenti usano sempre `var(--card)`, MAI `var(--sfc)`; ogni lettura di `suoniAttivi()` in UI avviene solo post-mount (`useEffect`), mai in render SSR.
12. **SSR-safety:** nessun accesso a `window`/`navigator`/Web API a import-time o in render server (i moduli v3 sono già safe; i componenti client usano `'use client'`).
13. **TDD:** test PRIMA (RED con output reale), implementazione (GREEN), suite completa, commit. Baseline main: **707 passed | 4 skipped** — zero regressioni; il conteggio cresce ad ogni task.
14. **Test — cosa asserire:** rendering + contratto props + comportamento (handler, suoni/vibrazioni via mock dei moduli sound/haptic, stati) + dizionario sui testi + aria/ruoli. NON asserire px via `getComputedStyle` (jsdom non calcola i CSS file): le misure si verificano nella review contro la §5 e visivamente nel catalogo.
15. **Vietati ovunque:** `#E30613`, `#1B2D6B`, Inter, Roboto, spinner (§5.25), modal centrati per form su mobile (§5.16), X come unica uscita di uno sheet.
16. **Commit:** `feat(ds-v3): <componenti> (§5.x)` — un commit per task (più eventuali fix di review).

**Contesto moduli v3 esistenti (API da consumare, non modificare se non dove il Task 1 lo dice):**
```ts
// @/design-system/v3/tokens  → luce, notte, tipografia, spazio, raggio, materia, varV3(nome)
// @/design-system/v3/motion  → molla.{snappy,smooth,bouncy,press,wizard}, cssEase.{sheet,generico,snap}, coreografie.{…}, useReducedMotion
// @/design-system/v3/sound   → initSuoni(), suona('tap'|'fatta'|'ua'|'errore'|'arrivo'), suoniAttivi(), impostaSuoni(on)
// @/design-system/v3/haptic  → vibra('selection'|'light'|'medium'|'success'|'error'), hapticDisponibile()
// @/design-system/v3/dizionario → PAROLE_VIETATE, trovaParoleVietate(testo)
```

---

### Task 1: Fondamenta SP2 — carry-over, token estesi, catalogo skeleton

**Files:**
- Modify: `src/app/ds-v3.css` (SOLO: aggiungere `--elv: var(--card);` nel blocco light — carry-over 1)
- Modify: `tests/unit/ds-v3/css-sync.test.ts` (mappare la nuova `--elv` light come literal `var(--card)` pinnato)
- Modify: `src/design-system/v3/dizionario.ts` (+1 riga spec §2.3: vietato «fattura emessa verso sdi» → usa «Fattura inviata ✓» — carry-over 3)
- Modify: `tests/unit/ds-v3/dizionario.test.ts` (+1 caso per la nuova riga)
- Modify: `src/design-system/v3/tokens.ts` (aggiungere export `gradiente` e `avatarPalette` — vedi sotto)
- Modify: `tests/unit/ds-v3/tokens.test.ts` (asserzioni esatte sui nuovi valori)
- Create: `src/app/ds-v3-catalogo/page.tsx` + `src/app/ds-v3-catalogo/CatalogoShell.tsx`
- Test: `tests/unit/ds-v3/componenti/catalogo.test.tsx`

**Nuovi token (valori-legge dalla spec, esatti):**
```ts
export const gradiente = {
  tastoPrimario: 'linear-gradient(180deg, #F2263A, var(--red) 55%, #B00010)',   // §5.1
  pillFase: 'linear-gradient(180deg, #269950, var(--green))',                    // §5.4
  corsaPillFase: '#14602C',                                                      // §5.4
  dashedGuida: '#CBC1B0',                                                        // §5.11/5.12
} as const
export const avatarPalette = ['#1D5FBF', '#7A4DB8', '#0E8A6B', '#9A5C00', '#C24E7A', '#8A8580'] as const // §5.14 blue,purple,teal,amber,rose,slate
```

**Catalogo — contratto (vale per tutti i task successivi):**
- Route `/ds-v3-catalogo`, client component, wrapper `<div data-ds="v3">` con `background: var(--bg)`, font `var(--font-v3)`, `initSuoni()` in `useEffect`.
- Header: titolo «Catalogo DS v3 — Una cosa alla volta» + toggle tema (bottone che imposta/rimuove `data-theme="dark"` su `document.documentElement` — stesso meccanismo dell'app) + nota viewport.
- `CatalogoShell` esporta `SezioneCatalogo({ titolo, spec, children })`: blocco con titolo 21/800, riferimento §5.x in caption, children su sfondo `var(--bg)`. Le sezioni si aggiungono task per task in `page.tsx`.
- Interfacce: `export function SezioneCatalogo(props: { titolo: string; spec: string; children: React.ReactNode }): JSX.Element`

**Test obbligatori:** css-sync verde con la nuova `--elv` light; dizionario intercetta «fattura emessa verso SDI»; tokens: `gradiente.tastoPrimario` contiene `#F2263A` e `#B00010`, `avatarPalette` ha 6 voci esatte; catalogo: renderizza con `data-ds="v3"`, il toggle tema imposta `data-theme`, i testi statici passano `trovaParoleVietate`.

**Steps:** (1) test RED per dizionario+tokens+catalogo → (2) run, FAIL atteso → (3) implementazione → (4) `npx vitest run tests/unit/ds-v3/` verde → (5) suite completa → (6) commit `feat(ds-v3): fondamenta SP2 — carry-over review SP1, token gradienti/avatar, catalogo skeleton (§14.2)`.

---

### Task 2: `TastoPrimario` (§5.1) — il tasto fisico

**Files:** Create `src/components/ds/TastoPrimario.tsx` · Test `tests/unit/ds-v3/componenti/TastoPrimario.test.tsx` · Modify `src/app/ds-v3-catalogo/page.tsx` (sezione con: default, pressed, disabled con riga spiegazione, dark).

**Interfaccia (vincolante):**
```ts
export function TastoPrimario(props: {
  children: React.ReactNode            // etichetta = verbo del banco: CONSEGNA, FATTO, RIORDINA
  onClick?: () => void
  disabled?: boolean
  motivoDisabilitato?: string          // OBBLIGATORIA se disabled (riga callout che spiega cosa manca)
  type?: 'button' | 'submit'
}): JSX.Element
```

**Anatomia di legge (§5.1, verbatim):** H **70** (60 desktop ≥1024px) · radius 20 · full-width (max 480) · testo 21/800/+0.04em MAIUSCOLO · faccia `gradiente.tastoPrimario` · corsa `0 6px 0 var(--red-dark)` + ombra ambiente (`--sh-card`) · **pressed:** `translateY(5px)` + corsa a 1px + scala .995 con `molla.press`, suono `tap` + `vibra('medium')` · **disabled mai nascosto:** faccia `--bg-deep`, testo `--faint`, riga callout 15.5 con `motivoDisabilitato` · UNO per schermata (regola documentata in JSDoc, non applicabile a runtime).

**Comportamento:** suono+vibrazione SOLO al tocco reale (non su click da tastiera ripetuti? no: anche tastiera — feedback coerente), stato pressed < 100ms (whileTap), disabled non emette suoni, focus-visible anello 2 `--blue`.

**Test obbligatori:** renderizza il testo; click chiama `onClick` e `suona('tap')` + `vibra('medium')` (moduli mockati); disabled → non chiama onClick/suona, resta visibile, mostra `motivoDisabilitato`; senza `motivoDisabilitato` con `disabled` → warning dev (console.warn) e comunque render; ruolo `button`; testi passano dizionario.

**Steps:** TDD standard (test RED → implementazione → GREEN → suite → catalogo aggiornato → commit `feat(ds-v3): TastoPrimario — tasto fisico con corsa, molla press, suono e haptic (§5.1)`).

---

### Task 3: `TastoSecondario` + `TastoTondo` + `LinkQuieto` (§5.3, 5.6, 5.5)

**Files:** Create `src/components/ds/TastoSecondario.tsx`, `src/components/ds/TastoTondo.tsx`, `src/components/ds/LinkQuieto.tsx` · Test `tests/unit/ds-v3/componenti/tasti-secondari.test.tsx` · Modify catalogo (sezione «Tasti secondari e vie di fuga»).

**Interfacce (vincolanti):**
```ts
export function TastoSecondario(props: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }): JSX.Element
export function TastoTondo(props: { glifo: React.ReactNode; etichettaAria: string; onClick?: () => void }): JSX.Element
export function LinkQuieto(props: { children: React.ReactNode; onClick?: () => void; href?: string }): JSX.Element   // href → <a>, altrimenti <button>
```

**Anatomia di legge:** TastoSecondario H 58 · radius 18 · faccia `--card` + `--sh-press` · testo 17/700 `--ink` · pressed `molla.press` con corsa ridotta (translateY 2px), suono `tap` + `vibra('light')`. TastoTondo Ø 50 · `--card`+`--sh-press` · glifo 19-21/800 · `aria-label` obbligatoria (`etichettaAria`) · suono `tap` + `vibra('light')`. LinkQuieto solo testo 14.5/`--muted` sottolineato (underline-offset 3) · **RISERVATO alle vie di fuga (L6)** (JSDoc) · NESSUN suono (via di fuga, non azione fisica).

**Test obbligatori:** click → onClick + suoni/vibrazioni giusti (LinkQuieto: `suona` MAI chiamato); TastoTondo ha `aria-label`; LinkQuieto con href → tag `<a>`; dizionario sui testi del catalogo; disabled TastoSecondario visibile e inerte.

**Commit:** `feat(ds-v3): TastoSecondario, TastoTondo, LinkQuieto (§5.3, 5.6, 5.5)`

---

### Task 4: `PillTempo` / `PillStato` / `PillFase` (§5.9, 5.4)

**Files:** Create `src/components/ds/Pill.tsx` (PillTempo + PillStato + tipo `StatoBanco`), `src/components/ds/PillFase.tsx` · Test `tests/unit/ds-v3/componenti/pill.test.tsx` · Modify catalogo (sezione «Pill» con TUTTI gli stati del vocabolario, entrambe le famiglie colore).

**Interfacce (vincolanti):**
```ts
export type StatoBanco =
  | 'DA CONSEGNARE' | 'IN FORNO' | 'IN RIFINITURA' | 'APPENA ARRIVATO' | 'PRONTA ✓'
  | 'CONSEGNATO ✓' | 'DA INCASSARE' | 'INCASSATA ✓' | 'INVIATA ✓' | 'STA PER FINIRE'
export function PillTempo(props: { children: React.ReactNode; famiglia: 'red' | 'amber' | 'blue' | 'green' }): JSX.Element   // es. «OGGI · 15:00»
export function PillStato(props: { stato: StatoBanco }): JSX.Element   // mappa stato→famiglia colore internamente (chiusa)
export function PillFase(props: { onClick: () => void; children?: React.ReactNode /* default: 'FATTA ✓' */ }): JSX.Element
```
Mappa stato→famiglia (vincolante): DA CONSEGNARE/STA PER FINIRE→red · IN FORNO/IN RIFINITURA/DA INCASSARE→amber · APPENA ARRIVATO→blue · PRONTA ✓/CONSEGNATO ✓/INCASSATA ✓/INVIATA ✓→green.

**Anatomia di legge:** pill (radius 999) · padding 7/13 · PillTempo 15/800, PillStato 13.5/800/+0.1em · sfondo `var(--<famiglia>-tint)` + testo `var(--<famiglia>)`. PillFase: H 44 · pill · `gradiente.pillFase` · corsa 3px `gradiente.corsaPillFase` · testo 14.5/800 bianco · pressed `molla.press` · suono `fatta` + `vibra('success')`.

**Test obbligatori:** PillStato accetta SOLO il vocabolario chiuso (tipo TS) e applica la famiglia giusta per almeno 4 stati; PillFase click → onClick + `suona('fatta')` + `vibra('success')`; il vocabolario stati passa il dizionario; gli stati sono leggibili come testo (L3).

**Commit:** `feat(ds-v3): PillTempo, PillStato (vocabolario chiuso), PillFase (§5.9, 5.4)`

---

### Task 5: `TastoPiu` (§5.2) — l'otturatore

**Files:** Create `src/components/ds/TastoPiu.tsx` · Test `tests/unit/ds-v3/componenti/TastoPiu.test.tsx` · Modify catalogo.

**Interfaccia (vincolante):**
```ts
export function TastoPiu(props: { onClick: () => void; etichetta?: string /* default 'Nuovo lavoro' */ }): JSX.Element
```

**Anatomia di legge (§5.2):** Ø **92** visibile, hit area 110 (padding trasparente) · faccia con gradiente radiale (luce a 35%/30%: `radial-gradient(circle at 35% 30%, #FF4C5C, var(--red) 55%, #B00010)` — aggiungerlo come `gradiente.tastoPiu` in tokens.ts in questo task, con test) · anello guida a -9px `2px rgba(50,40,25,.14)` · glifo `+` bianco ~44/300 · etichetta sotto 17.5/800 `--ink` · pressed `molla.press` (scala .94) · suono `tap` + `vibra('medium')` · JSDoc: vive SOLO nella home, in basso al centro (L1); il morph nel wizard è del sotto-progetto 3 (coreografia §8.3.2 — qui SOLO la pressione).

**Test obbligatori:** click → onClick + suono/vibrazione; `aria-label` = etichetta; hit area ≥ 92 (dimensioni base asserite via style inline); dizionario.

**Commit:** `feat(ds-v3): TastoPiu — l'otturatore della home (§5.2)`

---

### Task 6: `Avatar` + `TileScelta` + `TileNuovo` + `RigaCerca` (§5.14, 5.12, 5.13)

**Files:** Create `src/components/ds/Avatar.tsx`, `src/components/ds/TileScelta.tsx`, `src/components/ds/RigaCerca.tsx` · Test `tests/unit/ds-v3/componenti/tile-avatar-cerca.test.tsx` · Modify catalogo (griglia 2 colonne di TileScelta con avatar deterministici + TileNuovo + RigaCerca).

**Interfacce (vincolanti):**
```ts
export function Avatar(props: { nome: string; diametro?: 60 | 46 /* default 60 */ }): JSX.Element
export function coloreAvatar(nome: string): string   // deterministico: somma dei codepoint del nome % avatarPalette.length
export function TileScelta(props: { nome: string; sotto?: string; avatar?: string /* nome per Avatar */; glifo?: React.ReactNode; onClick: () => void }): JSX.Element
export function TileNuovo(props: { etichetta: string; onClick: () => void }): JSX.Element   // stesso file di TileScelta
export function RigaCerca(props: { totale: number; cosa: string /* es. 'dentisti' */; onApri: () => void }): JSX.Element
```

**Anatomia di legge:** Avatar Ø 60/46 · colore deterministico da `avatarPalette` + iniziali (prime lettere di nome+cognome) 21/800 bianco · nessuna foto. TileScelta card 22 · padding 20/12/17 · centrato · avatar Ø 60 o glifo 64 in quadrato radius 20 tint · nome 17.5/700 · sotto 13 `--faint` · pressed `molla.press` leggero + `vibra('selection')` (nessun suono: selezione, non azione). TileNuovo bordo dashed 2.5 `gradiente.dashedGuida`, niente ombra. RigaCerca H 58 · card 18 · `🔍 Cerca fra tutti i N …` 17/600 `--muted` (N = `totale`, cosa = `cosa`) · ruolo `button`, al tap `onApri`.

**Test obbligatori:** `coloreAvatar` è deterministico (stesso nome → stesso colore) e copre la palette; iniziali corrette («Studio Bianchi»→«SB»); TileScelta click → onClick + `vibra('selection')` senza `suona`; RigaCerca compone il testo con totale e cosa; dizionario su tutti i testi.

**Commit:** `feat(ds-v3): Avatar deterministico, TileScelta/TileNuovo, RigaCerca (§5.14, 5.12, 5.13)`

---

### Task 7: `Pila` + `StrisciaStato` (§5.7, 5.24)

**Files:** Create `src/components/ds/Pila.tsx`, `src/components/ds/StrisciaStato.tsx` · Test `tests/unit/ds-v3/componenti/pila-striscia.test.tsx` · Modify catalogo (le TRE pile di legge con dati simulati realistici + pila vuota + StrisciaStato nelle due varianti).

**Interfacce (vincolanti):**
```ts
export type TipoPila = 'daConsegnare' | 'sulBanco' | 'appenaArrivati'
export function Pila(props: { tipo: TipoPila; numero: number; sub: string; onClick: () => void }): JSX.Element
// label e famiglia colore sono INTERNE e chiuse: daConsegnare→'DA CONSEGNARE OGGI'/red · sulBanco→'SUL BANCO'/amber · appenaArrivati→'APPENA ARRIVATI'/blue
export function StrisciaStato(props: { children: React.ReactNode; attenzione?: boolean; onClick?: () => void }): JSX.Element
```

**Anatomia di legge:** Pila card 24 · padding 20/22 · numero display **52/800 tabulare** (min-width 60, centrato, colore famiglia) + colonna: label 13/800/+0.16em colore famiglia, sub 16/600 `--muted` max 1 riga ellissi · tap su TUTTA la card (`role="button"`) → onClick + `vibra('selection')` · numero 0 → sub di sollievo (il chiamante passa «Tutte consegnate ✓») — la pila NON si nasconde mai (JSDoc: le pile sono SEMPRE tre, sempre in quest'ordine). Il morph pila→lista è del sotto-progetto 3. StrisciaStato: check Ø 26 tint verde + testo 14.5/`--muted` (grassetti `--ink` via children) · variante `attenzione`: icona famiglia red e il testo INIZIA col da farsi; se `onClick` → tappabile.

**Test obbligatori:** le tre `tipo` producono le tre label/famiglie esatte e chiuse; numero 0 renderizzato (mai nascosto); click card → onClick; StrisciaStato attenzione → non mostra il check verde; dizionario sulle label interne.

**Commit:** `feat(ds-v3): Pila (le tre pile di legge) e StrisciaStato (§5.7, 5.24)`

---

### Task 8: `CardLavoro` + `TastoConsegnaInline` (§5.8)

**Files:** Create `src/components/ds/CardLavoro.tsx` · Test `tests/unit/ds-v3/componenti/CardLavoro.test.tsx` · Modify catalogo (lista di 3 CardLavoro simulate: una con TastoConsegnaInline, una con PillTempo ambra, una blu).

**Interfacce (vincolanti):**
```ts
export function CardLavoro(props: {
  numero: string                       // '147' → mostrato 'n.147' con prefisso caption 'LAVORO'
  dentista: string
  paziente: string                     // SEMPRE pseudonimo PZ-xxxx (GDPR — mai nomi)
  tipoLavoro: string
  tempo: { testo: string; famiglia: 'red' | 'amber' | 'blue' | 'green' }   // → PillTempo
  onApri: () => void
  onConsegna?: () => void              // se presente → riga 4 TastoConsegnaInline (SOLO primo elemento pila rossa — responsabilità del chiamante, JSDoc)
}): JSX.Element
```

**Anatomia di legge (§5.8):** card 24 · padding 20/22 · riga 1: `n.147` heading 21/800 con prefisso `LAVORO` caption 12.5/800 `--faint` + PillTempo a destra · riga 2: `dentista · paziente` 17.5/700 · riga 3: tipo lavoro 15.5/600 `--muted` · riga 4 opzionale: TastoConsegnaInline H 54 (variante compatta del TastoPrimario: stessa faccia/corsa ridotta 4px, testo 17/800 'CONSEGNA') · **massimo 4 righe, niente progress bar, niente icone stato aggiuntive** (la pila di provenienza È lo stato). Card intera tappabile (`onApri`, `vibra('selection')`); il tasto consegna ferma la propagazione e usa suono `tap` + `vibra('medium')`.

**Test obbligatori:** 4 righe max (senza onConsegna → 3); click card → onApri; click CONSEGNA → onConsegna e NON onApri (stopPropagation); paziente renderizzato così com'è (il componente non conosce nomi reali — JSDoc GDPR); dizionario.

**Commit:** `feat(ds-v3): CardLavoro con TastoConsegnaInline (§5.8)`

---

### Task 9: `CardInfo`/`RigaDato` + `RigaFase`/`CheckTondo` (§5.10, 5.11)

**Files:** Create `src/components/ds/CardInfo.tsx` (CardInfo + RigaDato), `src/components/ds/RigaFase.tsx` (RigaFase + CheckTondo) · Test `tests/unit/ds-v3/componenti/righe.test.tsx` · Modify catalogo (CardInfo con 5 RigheDato simulate; lista di 4 RigheFase: 2 fatte, la prossima con PillFase, 1 futura).

**Interfacce (vincolanti):**
```ts
export function CardInfo(props: { children: React.ReactNode }): JSX.Element       // card 22, padding 4/20 — max 5 RigheDato (JSDoc)
export function RigaDato(props: { chiave: string; valore: React.ReactNode; sub?: string; urgente?: boolean }): JSX.Element
export function CheckTondo(props: { fatto: boolean; diametro?: number /* default 31 */ }): JSX.Element
export function RigaFase(props: {
  nome: string
  fatto: boolean
  chiQuando?: string                   // '13.5 faint' sotto il nome, es. 'Francesco · ieri 16:40'
  prossima?: boolean                   // SOLO la prima non completata → mostra PillFase
  onFatta?: () => void                 // richiesto se prossima
}): JSX.Element
```

**Anatomia di legge:** RigaDato `padding 9px 0`, separatore 1.5 `--line` · chiave caption 12.5/800 MAIUSCOLA `--faint` a sinistra · valore 17/700 `--ink` a destra (sub 14/500 `--muted` sotto) · `urgente` (SOLO consegna ≤ domani) → valore `--red`. CheckTondo Ø 31: fatto → `--green-tint` + check 3px `--green`; da fare → cerchio dashed 2.5 `gradiente.dashedGuida`. RigaFase: nome 17/700 (fatto: 17/600 `--muted`, **MAI barrato**) · coreografia `spuntaFatta` al completamento (`bouncy` sul cerchio, `snappy` sulla riga — da `coreografie`); reduced-motion → dissolvenza.

**Test obbligatori:** una sola RigaFase con `prossima` mostra PillFase; click FATTA → onFatta (suono `fatta` già testato in PillFase — qui solo il wiring); fatto → testo muted e mai `text-decoration: line-through`; RigaDato urgente → classe/stile red SOLO sul valore; dizionario.

**Commit:** `feat(ds-v3): CardInfo/RigaDato e RigaFase/CheckTondo con spunta FATTA (§5.10, 5.11)`

---

### Task 10: `Sheet` + `DialogConferma` (§5.16, 5.17)

**Files:** Create `src/components/ds/Sheet.tsx`, `src/components/ds/DialogConferma.tsx` · Test `tests/unit/ds-v3/componenti/sheet-dialog.test.tsx` · Modify catalogo (bottone che apre uno Sheet demo; bottone che apre un DialogConferma demo con oggetto esplicito).

**Interfacce (vincolanti):**
```ts
export function Sheet(props: {
  aperto: boolean
  onChiudi: () => void
  titolo?: string
  children: React.ReactNode
}): JSX.Element
export function DialogConferma(props: {
  aperto: boolean
  titolo: string                        // 21/800
  testo: string                         // 15.5, DEVE contenere l'oggetto esplicito
  etichettaDistruttiva: string          // es. 'Sì, buttalo via'
  etichettaSicura: string               // es. 'No, tienilo'
  onConferma: () => void
  onAnnulla: () => void
}): JSX.Element
```

**Anatomia di legge:** Sheet sale dal basso con `molla.smooth` · radius 28 top · grabber 36×4 `--line` centrato a 8px · max 92% viewport · scrim `rgba(29,25,19,.35)` (tap scrim → onChiudi) · `LinkQuieto` «Chiudi» sempre presente in fondo · **MAI una X come unica uscita** · dismiss interrompibile (§8.2.2: Motion gestisce l'inversione — `AnimatePresence` + exit) · reduced-motion → dissolvenza 150ms · body scroll lock quando aperto · focus trap semplice (focus al primo elemento, Esc → onChiudi). Lo scale .96 della vista sotto è responsabilità della pagina (sotto-progetto 3) — JSDoc. DialogConferma: card centrata max 340 (ECCEZIONE ammessa dalla spec: è l'unico overlay centrato, solo distruttivo) · scrim come sheet · ordine azioni: sicura SOPRA (TastoSecondario), distruttiva SOTTO (TastoPrimario) · suono `errore` MAI qui (nessun suono all'apertura; il suono appartiene all'esito).

**Test obbligatori:** aperto=false → nulla nel DOM; tap scrim → onChiudi; Esc → onChiudi; grabber presente; LinkQuieto «Chiudi» presente; DialogConferma: ordine visivo sicura→distruttiva (ordine nel DOM), entrambe le etichette rese, onConferma/onAnnulla wired; dizionario.

**Commit:** `feat(ds-v3): Sheet (molla smooth, grabber, vie d'uscita) e DialogConferma (§5.16, 5.17)`

---

### Task 11: `Avviso` + `Caricamento` + `Vuoto` (§5.18, 5.25, 5.26)

**Files:** Create `src/components/ds/Avviso.tsx` (+ provider/hook `useAvvisi`), `src/components/ds/Caricamento.tsx` (Skeleton), `src/components/ds/Vuoto.tsx` · Test `tests/unit/ds-v3/componenti/avviso-caricamento-vuoto.test.tsx` · Modify catalogo (bottoni che lanciano Avviso normale/errore; skeleton demo con geometria CardLavoro; Vuoto demo col caffè).

**Interfacce (vincolanti):**
```ts
export function AvvisiProvider(props: { children: React.ReactNode }): JSX.Element
export function useAvvisi(): {
  avvisa: (testo: string, opts?: { azione?: { etichetta: string; onClick: () => void } }) => void
  errore: (testo: string, opts?: { azione?: { etichetta: string; onClick: () => void } }) => void   // NON scompare da solo
}
export function Skeleton(props: { righe?: number; altezze?: number[] }): JSX.Element  // blocchi --bg-deep, pulse opacità 0.6→1 in 1.2s (CSS animation, linear ammesso: è opacità)
export function Vuoto(props: { glifo: string; titolo: string; guida: string; azione?: { etichetta: string; onClick: () => void } }): JSX.Element
```

**Anatomia di legge:** Avviso card 18 in alto, entra `molla.snappy`, esce da solo dopo 4s (timer sospeso su hover/focus) · icona famiglia + testo 15.5/700 max 2 righe + azione inline (LinkQuieto) · **errore: persiste finché non chiuso** (bottone chiudi esplicito), suono `errore` alla comparsa, testo = cosa non è riuscito + cosa fare · `aria-live="polite"` (errore: `assertive`). Skeleton: **niente spinner** · blocchi `--bg-deep` che pulsano · stessa geometria del contenuto atteso (il chiamante passa `altezze`) · oltre 3s: riga «Un attimo…». Vuoto: mai pagina bianca · glifo 64 + titolo 21/800 + UNA riga guida + eventuale azione (TastoSecondario).

**Test obbligatori:** avvisa → toast nel DOM, sparisce dopo 4s (fake timers), hover sospende; errore → resta oltre 4s, `suona('errore')` chiamato, ha bottone di chiusura; Skeleton non renderizza mai role="progressbar"/spinner e mostra «Un attimo…» dopo 3s (fake timers); Vuoto rende glifo+titolo+guida; dizionario (attenzione: «Caricamento in corso» è VIETATO dal dizionario — usare «Un attimo…»).

**Commit:** `feat(ds-v3): Avviso (toast con regole errore), Skeleton carta, Vuoto (§5.18, 5.25, 5.26)`

---

### Task 12: Input `Campo` testo/numero/data (§5.27)

**Files:** Create `src/components/ds/Campo.tsx` (CampoTesto, CampoNumero, CampoData) · Test `tests/unit/ds-v3/componenti/campo.test.tsx` · Modify catalogo (i tre campi in uno sheet demo, come da regola d'uso).

**Interfacce (vincolanti):**
```ts
export function CampoTesto(props: { label: string; valore: string; onCambia: (v: string) => void; placeholder?: string; autoFocus?: boolean }): JSX.Element
export function CampoNumero(props: { label: string; valore: string; onCambia: (v: string) => void; suffisso?: string /* es. '€' */ }): JSX.Element
export function CampoData(props: {
  label: string
  valore: Date | null
  onCambia: (v: Date) => void
  oggi?: Date                          // iniettabile per i test (default new Date())
}): JSX.Element
```

**Anatomia di legge (§5.27):** usati SOLO dentro wizard e sheet (JSDoc) · H 64 · card 18 · testo 19/700 · label sopra 13/800 MAIUSCOLA `--faint` · focus: anello 2 `--blue` · CampoNumero: `inputMode="decimal"` (importi) — tastierino nativo · CampoData: **mai calendario a griglia come default** — scelte rapide pill: «Oggi · Domani · Lun 14 · Scegli…» (le prime 3 calcolate da `oggi`; «Scegli…» apre `<input type="date">` nativo) · la scelta rapida selezionata ha tint blue.

**Test obbligatori:** label MAIUSCOLA renderizzata; onCambia su digitazione; CampoNumero ha inputMode; CampoData: «Oggi» → onCambia con data di oggi (oggi iniettato), «Domani» → +1 giorno, terza pill = lunedì successivo formattato in italiano breve («Lun 14»); nessuna griglia calendario nel default; dizionario.

**Commit:** `feat(ds-v3): CampoTesto, CampoNumero, CampoData con scelte rapide (§5.27)`

---

### Task 13: `BarraMateriale` + `EroeTuttoAPosto` + `CardUAHaFatto` + `NotaDentista` + `RigaAgenda` (§5.20-5.23, 5.19)

**Files:** Create `src/components/ds/BarraMateriale.tsx`, `src/components/ds/EroeTuttoAPosto.tsx`, `src/components/ds/CardUAHaFatto.tsx`, `src/components/ds/NotaDentista.tsx`, `src/components/ds/RigaAgenda.tsx` (+ GiornoAgenda) · Test `tests/unit/ds-v3/componenti/racconto.test.tsx` · Modify catalogo (sezione «Il racconto»: barre 3 livelli, eroe, UÀ-ha-fatto, nota dentista, giorno-agenda OGGI con 2 righe).

**Interfacce (vincolanti):**
```ts
export function BarraMateriale(props: { nome: string; quantita: string; percento: number; nota?: string; onRiordina?: () => void }): JSX.Element
export function EroeTuttoAPosto(props: { titolo: string; righe: [string, string] | [string] }): JSX.Element
export function CardUAHaFatto(props: { voci: Array<{ nome: string; sub?: string }> }): JSX.Element
export function NotaDentista(props: { citazione: string; dottore: string; onEspandi?: () => void }): JSX.Element
export function GiornoAgenda(props: { etichetta: string; oggi?: boolean; children: React.ReactNode }): JSX.Element
export function RigaAgenda(props: { orario: string; cosa: string; sub?: string; tipo: 'CONSEGNA' | 'RITIRO'; onClick?: () => void }): JSX.Element
```

**Anatomia di legge:** BarraMateriale: livello = verde >40% · ambra 15-40% · rosso <15% (soglie INTERNE al componente, derivate da `percento`) · barra H 10 pill `--bg-deep` + fill famiglia · nota 13.5 (rossa + pill `RIORDINA →` se rosso e `onRiordina`). EroeTuttoAPosto: check Ø 54 tint verde + titolo 20/800 + righe 15/`--muted` — L5: il sollievo si mostra. CardUAHaFatto: titolo caption `UÀ HA GIÀ FATTO PER TE` + righe check Ø 30 tint + nome 16.5/700 + sub 14/500. NotaDentista: barra verticale 3.5 `--blue` + `"[citazione]" — Dr. X` 15/600 `--muted`, max 2 righe (line-clamp), tap → onEspandi. GiornoAgenda card 20, intestazione 16/800 (rossa + bordo inset 2.5 `--red` se `oggi`); RigaAgenda orario 16.5/800 tabulare (min-width 56) + cosa 15.5/600 + PillTipo CONSEGNA rossa / RITIRO blu (riuso PillStato-style interno).

**Test obbligatori:** soglie barre esatte ai confini (40.1→verde, 40→ambra, 15→ambra, 14.9→rosso); RIORDINA solo se rosso+onRiordina; CardUAHaFatto rende il titolo di legge; RigaAgenda CONSEGNA→famiglia red, RITIRO→blue; GiornoAgenda oggi→intestazione red; dizionario su tutti i testi fissi.

**Commit:** `feat(ds-v3): BarraMateriale, EroeTuttoAPosto, CardUAHaFatto, NotaDentista, RigaAgenda (§5.19-5.24)`

---

### Task 14: `PillVoce` (§5.15) — progressive enhancement vocale

**Files:** Create `src/components/ds/PillVoce.tsx` · Test `tests/unit/ds-v3/componenti/PillVoce.test.tsx` · Modify catalogo (PillVoce demo che mostra il testo capito).

**Interfaccia (vincolante):**
```ts
export function PillVoce(props: {
  onTesto: (testo: string) => void      // il parlato riconosciuto — la conferma è del chiamante (wizard, SP3)
  etichetta?: string                    // default 'Dimmelo a voce'
}): JSX.Element | null                  // null se Web Speech API assente (feature-detect) — progressive enhancement
```

**Anatomia di legge (§5.15):** H 64 · pill `--ink` (light) / `--elv` (dark — via var, automatico) · testo bianco 17.5/700 · mic in cerchio `rgba(255,255,255,.16)` · in ascolto: il cerchio pulsa (opacità, CSS) + etichetta «Ti ascolto…» · fine riconoscimento → chiama `onTesto` col transcript. Web Speech API (`window.SpeechRecognition || window.webkitSpeechRecognition`), `lang='it-IT'`, feature-detect al mount (SSR-safe: stato `supportato` inizializzato in `useEffect` — MAI in render). Errori del riconoscimento → torna quieto senza Avviso (silenzioso: è enhancement).

**Test obbligatori:** senza API nel jsdom → render null; con mock API → tap avvia `start()`, evento result → `onTesto('...')`; etichetta in ascolto cambia; nessun accesso a window in render iniziale (il primo render con API mockata mostra comunque lo stato quieto); dizionario.

**Commit:** `feat(ds-v3): PillVoce — Web Speech progressive enhancement (§5.15)`

---

### Task 15: Catalogo completo + QA visivo 3 viewport × 2 temi

**Files:** Modify `src/app/ds-v3-catalogo/page.tsx` (ordinamento finale sezioni, indice ancorato in testa, nota «catalogo interno») · Create `scripts/screenshot-catalogo.mjs` (Playwright: 390/768/1280 × light/dark → `docs/design/catalogo-v3/`) · Screenshots committati.

**Contenuto:** indice in testa (ancore alle sezioni) · ogni sezione già montata dai task 1-14 · ordine: Tasti → Pill → Tile/Avatar/Cerca → Pila/Striscia → CardLavoro → Righe → Sheet/Dialog → Avviso/Skeleton/Vuoto → Campi → Racconto → PillVoce · footer: versione DS + data. Lo script Playwright naviga `localhost:3000/ds-v3-catalogo`, scatta 6 screenshot full-page (`390x844`, `768x1024`, `1280x800` × `data-theme` light/dark) e li salva.

**Steps:** (1) riordino+indice → (2) test catalogo aggiornato (tutte le sezioni presenti — un `it` che conta i titoli §5.x attesi) → (3) `npm run dev` in background, script screenshot, verifica file → (4) suite completa + `npx tsc --noEmit` + `npx next build` → (5) commit `feat(ds-v3): catalogo completo con indice + screenshot QA 3 viewport × 2 temi (§14.2)`.

---

### Task 16: Verifica finale + memoria (BP-1)

**Files:** Modify `memory/SESSION_ACTIVE.md`, `memory/MEMORY.md` (§0), `docs/roadmap/ROADMAP-UFFICIALE.md`.

**Steps:** (1) `npx tsc --noEmit && npx vitest run && npx next build` — output reale, zero errori · (2) MEMORY.md §0: voce «DS v3 sotto-progetto 2 (componenti core) COMPLETATO — in attesa dell'approvazione visiva del catalogo da parte di Francesco» con elenco componenti, conteggio test, path catalogo e screenshot · ROADMAP: aggiorna testa · SESSION_ACTIVE: sostituisci (max 200 token) · (3) commit `docs(ds-v3): memoria e roadmap — sotto-progetto 2 componenti core completato`.

**Nota per il controller:** dopo il Task 16 → review finale whole-branch (modello più capace) → merge su main SOLO previa conferma di Francesco → il gate ufficiale del sotto-progetto è l'**approvazione del catalogo** da parte di Francesco (spec §14.2): presentargli gli screenshot e il link `/ds-v3-catalogo`.

---

## Self-review del piano (fatta il 08/07/2026)

1. **Copertura §5:** 5.1✓T2 · 5.2✓T5 · 5.3/5.5/5.6✓T3 · 5.4/5.9✓T4 · 5.7✓T7 · 5.8✓T8 · 5.10/5.11✓T9 · 5.12/5.13/5.14✓T6 · 5.15✓T14 · 5.16/5.17✓T10 · 5.18/5.25/5.26✓T11 · 5.19-5.24✓T7+T13 · 5.27✓T12. Nessun buco.
2. **Coerenza interfacce:** PillTempo/famiglia usata da CardLavoro T8 con la stessa firma di T4; PillFase consumata da RigaFase T9; LinkQuieto da Sheet T10; TastoSecondario da DialogConferma T10 e Vuoto T11; Avatar da TileScelta T6. Tutte definite prima dell'uso.
3. **Dipendenze fra task rispettate nell'ordine:** T4 prima di T8/T9; T3 prima di T10/T11; T6 prima di T7 (nessuna: Pila non usa Avatar — ok comunque).
4. **Niente placeholder:** ogni task ha interfacce complete, anatomia verbatim, test enumerati, commit message.
