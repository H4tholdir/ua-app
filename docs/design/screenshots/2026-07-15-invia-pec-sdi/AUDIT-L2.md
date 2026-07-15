# GATE ESTETICO L2 — Audit UI/UX card «Invio SDI» (feature N10, Variante A approvata)

**Data:** 2026-07-15
**Superficie audita:** card «Invio SDI» in `/fatture/[id]` — SOLO la card (riga «Stato SdI» granulare + `InviaPecButton` con tutti i suoi stati: pronta, disabled/PEC mancante, conferma, pending, errore 502). Le altre card della pagina (Fattura, Cliente, Voci) sono **fuori scope** (superfici pre-esistenti).
**Checklist:** `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` (12 sezioni)
**Framework:** `docs/design/audit-ui-ux/README.md` — Livello 2 (micro-audit di fine ondata)
**Input esaminati:**
- Screenshot after: `after-{390,768,1280}-{light,dark}.png` (6/6 letti)
- Mockup approvato: `docs/design/mockups/2026-07-15-invia-pec-sdi.html` — Variante A
- Componente: `src/components/features/fatture/InviaPecButton.tsx`
- Card reale: `src/app/(app)/fatture/[id]/page.tsx` righe 227–267 (+ mappa dot riga 92–101)
- Confronto: `src/components/features/fatture/NotaCreditoButton.tsx` (stessa pagina, azione fiscale analoga, usata come riferimento di coerenza)
- Verifica scope: `git show f38446e -- "src/app/(app)/fatture/[id]/page.tsx"` per distinguere righe nuove N10 da righe pre-esistenti nella stessa card

> Nota: gli stati dialog/conferma/pending/errore/disabled non sono presenti negli screenshot "after" (solo lo stato base "pronta" ×6). Per questi stati la verifica è stata fatta da codice sorgente + dal contesto QA live fornito nel task. Indicato caso per caso.

---

## Esito per sezione × viewport × tema

Legenda: ✅ conforme · ⚠️ minor · ❌ difetto · N/A. `[n]` rimanda alla lista ❌ sotto.

| # Sezione | 390 light | 390 dark | 768 light | 768 dark | 1280 light | 1280 dark |
|---|---|---|---|---|---|---|
| 1. Layout & allineamento | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2. Proporzioni & spazio | ✅ | ✅ | ⚠️[3] | ⚠️[3] | ❌[3] | ❌[3] |
| 3. Sovrapposizioni & z-index | ✅* | ✅* | ✅* | ✅* | ✅* | ✅* |
| 4. Tipografia & gerarchia | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 5. Colore, contrasto, tema | ❌[4][5] | ❌[4][5] | ❌[4][5] | ❌[4][5] | ❌[4][5] | ❌[4][5] |
| 6. Motion & micro-interazioni | ❌[2] | ❌[2] | ❌[2] | ❌[2] | ❌[2] | ❌[2] |
| 7. Suono & haptic | ❌[1] | ❌[1] | ❌[1] | ❌[1] | ❌[1] | ❌[1] |
| 8. Touch target & interazione | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9. Stati (empty/loading/error/disabled) | ✅* | ✅* | ✅* | ✅* | ✅* | ✅* |
| 10. Responsive (3 viewport) | ✅ | ✅ | ⚠️[3] | ⚠️[3] | ❌[3] | ❌[3] |
| 11. Accessibilità | ❌[6] | ❌[6] | ❌[6] | ❌[6] | ❌[6] | ❌[6] |
| 12. Copy & microcopy | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

`*` = verificato da codice/contesto QA live citato nel task, non visibile nello screenshot "after" fornito (dialog, pending, errore, disabled non catturati).

---

## Elenco ❌ / ⚠️ con disposizione

### [1] ❌ Nessun feedback haptic/sonoro — MAJOR
**Sezione:** 7 (Suono & haptic). **Tutti i viewport/temi** (difetto di codice, non visivo).
`InviaPecButton.tsx` non chiama mai `hapticLight/hapticMedium/hapticError` (`@/lib/feedback/haptic`) né `soundError`/altri suoni (`@/lib/feedback/sounds`) — zero feedback su apertura conferma, tap "Invia", successo, errore. Il componente gemello sulla stessa pagina per un'azione fiscale analoga, `NotaCreditoButton.tsx` (righe 120, 125, 136, 150), usa `hapticLight()` all'apertura, `hapticMedium()` alla conferma e `hapticError()` + `soundError()` sull'errore. L'incoerenza è diretta e verificabile: stessa pagina, stessa categoria di azione (atto fiscale irreversibile), pattern di feedback diverso.
**Fix proposto:** in `InviaPecButton.tsx` aggiungere `hapticLight()` su `setConferma(true)`, `hapticMedium()` in apertura di `invia()`, `hapticError()` + `soundError()` nei rami `catch`/`status >= 400` di `invia()` — stesso pattern di `NotaCreditoButton.tsx` righe 118-151.
**File:** `src/components/features/fatture/InviaPecButton.tsx` righe 171-194 (funzione `invia`), 200 (`onClick` trigger).

### [2] ❌ Nessuno stato hover/active sui 4 bottoni — MINOR
**Sezione:** 6 (Motion & micro-interazioni). **Tutti i viewport/temi.**
I 4 bottoni (`Invia a SdI`, variante disabled, `Annulla`, `Invia` nel dialog) sono styled inline via `style={}` senza alcuna classe `:hover`/`:active`. L'unico feedback dinamico è il cambio `cursor` e l'`opacity: 0.88` durante `pending`. Nessuna "molla press" richiesta dalla checklist. Nota: il commento in testa al file motiva esplicitamente l'assenza di animazioni Motion/JS per il "frequency gate" (azione rara) — accettabile per l'assenza di Motion/AnimatePresence, ma non giustifica l'assenza totale di un feedback di pressione, che può essere puro CSS (`:active`) senza libreria.
**Fix proposto:** aggiungere una classe CSS (nello stesso blocco `<style>` già presente righe 382-388) tipo `.ua-invia-pec-btn:active:not(:disabled){ filter: brightness(0.92) }` sui 4 bottoni.
**File:** `src/components/features/fatture/InviaPecButton.tsx` righe 115-133 (`btnRed`), 330-349 (Annulla), 350-374 (Invia dialog).

### [3] ❌ / ⚠️ Layout desktop/tablet non allineato al mockup approvato — MINOR, DEFERITO
**Sezione:** 2, 10 (Proporzioni & spazio, Responsive). **768 = ⚠️, 1280 = ❌.**
Il mockup Variante A approvato (`2026-07-15-invia-pec-sdi.html`, sezione `#a-desktop`) mostra a 1280px la card «Invio SDI» confinata in una colonna aside stretta (`360px`, `.deskgrid{grid-template-columns:1fr 360px}`), con bottone rosso proporzionato e dialog di conferma ancorato accanto. Negli screenshot reali (`after-1280-*.png`) la card è invece a piena larghezza pagina (~1240px) — stessa colonna singola usata su mobile, solo più larga — e il bottone «Invia a SdI» risulta lunghissimo (~1200px), molto diverso dal riferimento approvato. A 768px lo stesso pattern produce una card "mobile stirata" (nessun layout intermedio dedicato).
**Causa:** il layout a colonna singola è quello dell'intera pagina `/fatture/[id]` (usato anche dalle card Fattura/Cliente/Voci, tutte pre-esistenti), non qualcosa di specifico introdotto da N10 sulla card «Invio SDI» — verificato che N10 (`git show f38446e`) ha aggiunto solo la riga «Stato SdI» e `<InviaPecButton>` dentro la card già esistente, non la struttura di griglia della pagina.
**Motivo di deferimento:** correggere richiederebbe introdurre la griglia desktop a due colonne (`1fr 360px`) per l'intera pagina `/fatture/[id]`, quindi tutte le card — esplicitamente fuori scope per questo gate L2 ("altre card sono superfici pre-esistenti fuori scope"). Da aprire come task separato di livello pagina (o rimandato al Livello 3 quando si riordina l'intera superficie fatture).
**File:** `src/app/(app)/fatture/[id]/page.tsx` (layout pagina, non la card in sé).

### [4] ❌ Colore hardcoded senza token, valore non corrispondente al token — MINOR, DEFERITO (pre-esistente)
**Sezione:** 5 (Colore, contrasto, tema). **Tutti i viewport/temi.**
Riga `PEC consegnata` nella card usa `color: f.pec_consegnata_at ? '#16A34A' : 'var(--t3)'` — hex hardcoded puro, senza fallback `var()`, e valore diverso dal token verde ufficiale `--c-green:#22C55E` definito in `globals.css`. Viola la regola v3 "❌ nessun hex hardcoded" (checklist §5.1).
**Verificato pre-esistente:** `git show f38446e^:".../page.tsx"` conferma che questa riga esisteva identica *prima* del commit N10 — non introdotta da questa feature, ma vive dentro la card oggetto del gate.
**Motivo di deferimento:** fix minimo (sostituire con `var(--c-green)`), ma tocca codice fuori dal diff N10; consigliato ticket di pulizia separato per non allargare lo scope di questo merge.
**File:** `src/app/(app)/fatture/[id]/page.tsx` riga 256.

### [5] ⚠️ Fallback hex inline su link XML — MINOR, DEFERITO (pattern sistemico pre-esistente)
**Sezione:** 5 (Colore, contrasto, tema). **Tutti i viewport/temi.**
`color: 'var(--c-amber, #F59E0B)'` sul link "Scarica XML" (riga 246) è un hex inline come fallback di `var()`. Valore identico al token (`--c-amber:#F59E0B`), quindi non è un colore "a caso", ma tecnicamente resta un hex hardcoded nel markup. Pattern replicato identico in >10 altri file del repo (`impostazioni/page.tsx`, `tecnici/page.tsx`, `rete/page.tsx`, `fatture/page.tsx`, `qualita/*`, `lavori/[id]/consegna/page.tsx`) — è una convenzione sistemica pre-esistente dell'intera codebase, non introdotta da N10.
**Motivo di deferimento:** correggere qui isolatamente sarebbe cosmetico e incoerente col resto della codebase; da affrontare come pulizia trasversale (es. introdurre una CSS custom property senza fallback hex, o un lint rule), fuori scope per un gate L2 di singola card.
**File:** `src/app/(app)/fatture/[id]/page.tsx` riga 246 (+ pattern gemello altrove, fuori scope).

### [6] ❌ Nessun `:focus-visible` sui bottoni — MAJOR
**Sezione:** 11 (Accessibilità). **Tutti i viewport/temi** (difetto di codice, non visivo — corrisponde esattamente al gap noto già scritto in checklist §11.2: "bottoni inline-styled v3 senza ring").
Tutti e 4 i bottoni del componente impostano `outline: 'none'` inline (righe 131, 202/163 via spread `btnRed`, 345, 368) senza fornire alcuna alternativa `:focus-visible`. Un utente da tastiera che naviga con Tab fino al bottone «Invia a SdI» — o dentro il dialog di conferma su un atto fiscale irreversibile — non vede alcun indicatore di focus. Il codice stesso implementa correttamente il focus trap e la gestione del focus programmatico (`annullaRef.current?.focus()`, ripristino su `previousFocusRef`), rendendo la mancanza dell'anello visivo ancora più evidente come lacuna isolata. Esiste già un pattern di riferimento nel repo (`globals.css` riga 947-948, `.ua-bill-toggle-btn:focus-visible`) da riusare.
**Fix proposto:** aggiungere nel blocco `<style>` del componente (righe 382-388) una classe applicata ai 4 bottoni, es. `.ua-invia-pec-btn:focus-visible{ outline: 2px solid var(--primary); outline-offset: 2px; border-radius: inherit }`, sostituendo gli `outline:'none'` inline con questa classe.
**File:** `src/components/features/fatture/InviaPecButton.tsx` righe 115-133, 163, 330-349, 350-374.

---

## Cosa funziona bene (per contesto, non esaustivo)

- Pattern "colore mai unico segnale" rispettato ovunque: dot + etichetta testuale sulla riga «Stato SdI», icona ⚠ + testo sui banner, mai colore isolato.
- Gestione stati assente di CLS: bottone mantiene `minHeight: 48` identico in tutti gli stati (pronta/pending/disabled), solo il contenuto interno cambia.
- Focus management e focus trap del dialog implementati correttamente (Tab ciclico, Esc per chiudere, focus su "Annulla" all'apertura, ripristino focus al trigger alla chiusura) — solo manca il ring visivo (vedi [6]).
- `role="alert"` sull'errore e `role="status"` sull'informativo 409, coerenti con la checklist §11.3.
- `prefers-reduced-motion` rispettato correttamente sullo spinner (rallentato, non rimosso — corretto per un'animazione essenziale/informativa, non decorativa).
- Copy italiano corretto, tono coerente, terminologia «SdI»/«PEC» coerente tra mockup, componente e card.
- Nessun hex hardcoded *dentro* `InviaPecButton.tsx` stesso (tutti i colori via token/`color-mix`) — i problemi di colore rilevati ([4],[5]) sono nelle righe pre-esistenti della card in `page.tsx`, non nel componente nuovo.
- Touch target: tutti i bottoni ≥48px di altezza, ben oltre la soglia 44px richiesta.

---

## Verdetto finale

**PASS CON RISERVE**

**Conteggio:** 6 ❌/⚠️ distinti su 12 sezioni (2 MAJOR: [1] haptic/sound, [6] focus-visible; 4 MINOR, di cui 3 deferiti come pre-esistenti/fuori scope: [2], [3], [4], [5]) · 6 sezioni piena conformità (1, 3*, 4, 8, 9*, 12).

**Motivazione:** nessun difetto rilevato è bloccante per l'uso reale (la card funziona, è leggibile, accessibile via mouse/touch, e via tastiera è comunque operabile — manca solo l'indicatore visivo di focus). I due difetti MAJOR ([1] feedback haptic/sonoro assente, [6] focus-visible assente) sono fix localizzati e a basso rischio nello stesso file del componente nuovo (`InviaPecButton.tsx`) e si raccomanda di risolverli prima o subito dopo il merge, dato che riguardano proprio la superficie nuova di N10 e non codice pre-esistente. I 3 difetti MINOR deferiti ([3] griglia desktop, [4] e [5] hex hardcoded) sono correttamente fuori scope per questo gate L2 perché vivono in codice pre-esistente alla card o richiedono modifiche a livello di intera pagina — da tracciare come task separati, non da bloccare qui.
