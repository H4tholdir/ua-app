# FIX-B — Report: fix visivi collaudo device (QA T15, verbale 2026-07-24, punti 3/5/7 fix-list + punto 5 addendum)

**Worktree:** `redesign-parete-home` · **Base:** `64ad11d` (FIX-A) + `cd0ddf5` (verbale) · **Verbale:** `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`

## Metodo di verifica

Stesso harness temporaneo del FIX-A (`.superpowers/sdd/fixA-report.md`): pagina `src/app/qa-fixb-harness/page.tsx` (dati mock, `HomeV3` con `homePref="due_stanze"`, 6 cassette tra cui **una worst-case T2** — dentista `Dott.ssa Annamaria Bellinghieri` + paziente alias `Maria Vittoria Del Grosso`, entrambi oltre `SOGLIA_NOME_LUNGO` → due righe ciascuno, il caso citato dal verbale), resa pubblica per la sessione con una riga in `middleware.ts`. Server Next reale (porta 3022, non jsdom) + script Playwright (`node_modules/playwright` già in `devDependencies`) per screenshot e `getBoundingClientRect` reali. **Harness, riga di middleware, la voce temporanea di launch.json (worktree padre `SOFTWARE FILIPPO/.claude/launch.json`, porta 3022) e la cartella di lavoro `.tmp-fixb/` sono stati rimossi (via `trash`, mai `rm` ricorsivo) prima del commit.**

Per ogni fix ho catturato **prima** (file system riportato temporaneamente allo stato pre-fix via `git stash` mirato ai soli file toccati, MAI ai file di harness/middleware) e **dopo**, a 390×660 e 390×844, light e dark. Screenshot in `docs/design/screenshots/2026-07-24-fixwave/` (gitignored, `git add -f`):
- `before-fix1-pile-*` / `fix1-pile-*` — lato pile (fix 1)
- `before-fix234-parete-top-*` / `fix234-parete-top-*` — muro appena aperto (fix 2)
- `before-fix234-parete-scrolled-*` / `fix234-parete-scrolled-*` — muro scrollato fino al tile «+ Nuova cassetta» (fix 3) e alla seconda riga (fix 4)

---

## Fix 1 — Piede compatto + niente scroll percepito lato pile (punti a+c della fix-list)

**Cosa cambia:** il tasto fisico rotondo (ghiera 92px, cappello 64px, glifo 42/350 — **INVARIATO**, `TastoPiu.tsx` non tocca la sua anatomia) e l'area di tocco dei puntini (44px, requisito di accessibilità — **INVARIATA**) restano un pavimento fisso. Si comprime SOLO lo spazio intorno:
- `.ua-stanze-dots` margin-top: 10px → 4px (`ds-v3.css`)
- `.foot` margin-top: `clamp(8px, 1.8cqh, 16px)` → `clamp(4px, 0.9cqh, 8px)` (`HomeV3.tsx`)
- nuova prop `TastoPiu({ compatto })`: quando `true` il gap ghiera↔etichetta scende da `spazio.sm` (12) a `spazio.xs` (4) — entrambi token esistenti, nessun valore inventato. Passata SOLO dal piede della home (`HomeV3.tsx`); il catalogo (`ds-v3-catalogo`) resta col gap ratificato di default, quindi la fonte di verità visiva della spec non cambia.
- `.ua-stanza-pile-scroll`: `scrollbar-width: none` + `-ms-overflow-style: none` + `::-webkit-scrollbar { display: none }` — la rete di sicurezza scroll RESTA (verificato: `overflow-y: auto` invariato, lo scroll funziona), la barra sparisce.

**Misure reali (harness, dataset 2+1+1+2 lavori nelle 4 pile + banner striscia):**

| Viewport/tema | Blocco «puntini+TastoPiù+etichetta» PRIMA | DOPO | Δ | scrollbar |
|---|---|---|---|---|
| 390×660 (light/dark, identico) | 204.1px = **30.9%** schermo | 190.2px = **28.8%** | −13.9px | `auto` → `none` |
| 390×844 (light/dark, identico) | 207.4px = 24.6% | 191.8px = **22.7%** | −15.6px | `auto` → `none` |

Overflow interno reale (`.ua-stanza-pile-scroll`, stesso dataset): **390×660 — 70px → 50px** (ancora overflow, ma invisibile: nessuna barra). **390×844 — 0px → 0px** (nessun overflow, né prima né dopo con questo dataset).

**⚠️ Onestà sul target «ben sotto il 20%»:** NON raggiunto alla lettera a 390×660 (28.8%, non <20%). Ho scomposto il perché: il pavimento fisso da solo (ghiera+cappello 110px + hit-area puntini 44px, entrambi intoccabili per contratto — «tasto fisico ratificato» + requisito di accessibilità §12) vale già 154px = 23.3% di 660px, PRIMA di qualunque margine. Comprimere ogni margine a zero (impossibile senza schiacciare visivamente i blocchi) darebbe comunque ~24-25%, non <20%. A 390×844 il risultato (22.7%) è molto più vicino al target. **Ho preferito comprimere il più possibile senza violare i due pavimenti (ratifica del tasto fisico + legge accessibilità) piuttosto che forzare un numero rompendo uno dei due — la scelta è una PROPOSTA, il target esatto va ridiscusso con Francesco se 28.8%/22.7% non gli bastano** (l'unica leva rimasta sarebbe rimpicciolire la ghiera/cappello del TastoPiù stesso, che il contratto di questo fix esclude esplicitamente).

Nessuna regressione sul piede-solo-lato-pile del FIX-A: il piede resta assente sul lato cassette (`{stanzaAttiva === 'pile' && piede}`, invariato) — v. fix 5 sotto.

**File:** `src/components/features/home/HomeV3.tsx`, `src/components/ds/TastoPiu.tsx`, `src/app/ds-v3.css`

---

## Fix 2 — Sfondo del muro raccordato al fondo pagina (addendum punto 5, nuovo)

**Prima:** `.ds-parete { background-color: var(--bg-deep) }` — un token diverso dal fondo pagina (`--bg`, dipinto dal page-root). Misurato: light `rgb(236,230,217)` (#ECE6D9) contro pagina `#F4F0E7`; dark `rgb(16,14,11)` (#100E0B) contro pagina `#171411` — scarto ben visibile in dark, percepibile in light (screenshot Francesco).

**Dopo:** `.ds-parete` usa `var(--bg)`, **lo stesso token del fondo pagina**, in entrambi i rami (light `background-color`, dark primo `repeating-linear-gradient` background). Misurato: `getComputedStyle('.ds-parete').backgroundColor` ora identico al fondo pagina in entrambi i temi.

**Leggibilità dei fili:** in light il pattern SVG ha i propri stop di luce/ombra (indipendenti dal fondo, invariati). In dark l'alpha del filo (`--filo-flat`) è salita da `.07` a `.09` — **unica modifica di valore oltre al token di fondo**, perché `--bg` è più chiaro di `--bg-deep` e il filo bianco-trasparente perdeva un po' di contrasto. Verificato visivamente (screenshot before/after dark): filo ancora ben visibile.

**File:** `src/app/ds-v3.css` (`.ds-parete`, `[data-theme="dark"] .ds-parete`)
**PROPOSTA per ratifica:** il token `--bg` per il fondo muro + l'alpha `.09` in dark.

---

## Fix 3 — Tile «+ Nuova cassetta» leggibile (addendum punto 5, nuovo)

**Prima:** `background: transparent; border: 2.5px dashed #CBC1B0; color: var(--muted)` — nessuna regola dark dedicata. Nello screenshot «before» il tile è visibile solo come un contorno tratteggiato appena percettibile; testo e «+» praticamente invisibili sopra la maglia (specialmente in dark, dove sparisce quasi del tutto).

**Dopo:** scrim velato dietro il tile (copre la maglia SOLO sotto di sé, resta trasparente il tratteggio del linguaggio "non è una cassetta"), bordo e testo più marcati:

| | background (scrim) | border | testo/icona |
|---|---|---|---|
| light | `rgba(255,254,250,.68)` | `#9C9080` | `#4A4030` |
| dark | `rgba(33,29,24,.62)` | `#756A5C` | `#EDE6D8` |

Icona «+»: 26px/350 → 28px/500. Testo «Nuova cassetta»: peso 700 → 800 (invariato 12px).

**Contrasto WCAG (calcolo manuale, formula sRGB relativa luminanza, contro il fondo PEGGIORE plausibile — lo scrim fuso col colore di fondo pagina, non con un filo chiaro):**
- Light: testo `#4A4030` su scrim fuso ≈ `rgb(251,250,244)` → **contrasto ≈ 9.7:1** (AA richiede 4.5:1, AAA 7:1 — supera entrambi).
- Dark: testo `#EDE6D8` su scrim fuso ≈ `rgb(29,26,21)` → **contrasto ≈ 14:1**.

Verificato visivamente (screenshot `fix234-parete-scrolled-*`): il tile ora si legge chiaramente in entrambi i temi, restando riconoscibile come "invito tratteggiato" e non come una cassetta vera.

**File:** `src/app/ds-v3.css` (`.ds-tray-nuova`, nuova regola `[data-theme="dark"] .ds-tray-nuova`)
**PROPOSTA per ratifica:** tutti i valori scrim/bordo/testo sopra.

---

## Fix 4 — Clip del gancio (fix 7/e)

**Misura reale del tile PIÙ ALTO possibile** (targa T2, dentista E paziente entrambi >20 caratteri, quindi entrambi su 2 righe — `Dott.ssa Annamaria Bellinghieri` / `Maria Vittoria Del Grosso`), via `getBoundingClientRect` in browser reale:

**altezza tile T2 = 158px** (contro min-height 132px del caso a riga singola).

Alla traccia RATIFICATA 24/07 (`--track: calc(passo-maglia * 4)` = 176px a scala base, 160px a passo-maglia fluido 40 della shell mobile 390px):

- margine fra il bordo inferiore del tile T2 (riga 1) e l'inizio del gancetto SVG della riga sotto (stessa colonna): **−18px** — cioè il tile invadeva per 18 dei 22px di altezza del gancetto. Clip confermato, non solo "tocca": il tile copriva quasi tutto il gancetto della riga successiva.

**Scelta:** alzata la traccia da `4·passo-maglia` a **`5·passo-maglia`** (176→220 a scala base; 160→200 alla shell mobile 390px) — l'opzione esplicitamente suggerita dal contratto («220 = 5·44»), non la riduzione del contenuto (avrebbe richiesto ritoccare `SOGLIA_NOME_LUNGO`/il clamp a 2 righe, valori ratificati dal verbale rete-gancetto-targa 24/07, fuori perimetro di questo fix).

**Garanzia snap preservata:** `hook_n ≡ wire-center (mod passo-maglia)` vale per COSTRUZIONE per qualunque multiplo intero di `passo-maglia` scelto per `--track` (dimostrazione nel commento CSS aggiornato) — non è una proprietà del numero 4, ma del fatto che `n·track` resta `≡ 0 (mod passo-maglia)` qualunque sia il multiplo. Cambiare 4→5 non rompe la garanzia.

**Dopo (stesso tile T2, stessa colonna):** margine = **+22px** — clearance pulita, ben sopra i 20px riservati al gancetto (14 hook-above + 6 sovrapposizione linguetta).

**File:** `src/app/ds-v3.css` (`--track` su `.ds-parete`, commenti aggiornati in 3 punti: spiegazione GRIGLIA FISSA+SNAP, nota su `.ds-cassetta` padding, nota sul passo fluido shell)
**Guardie test aggiornate** (v. sotto) con motivazione «adeguamento misurato, non abrogazione».
**PROPOSTA per ratifica:** il multiplo 5 (righe più alte, meno cassette per schermo a parità di scroll — trade-off esplicito, non gratuito).

---

## Fix 5 — Nessuna regressione sul piede-solo-lato-pile (FIX-A)

Verificato nello stesso harness: il piede (TastoPiù) resta **assente** quando `stanzaAttiva === 'parete'` (screenshot `fix234-parete-*`: nessun tasto in basso) e **presente e compatto** quando `stanzaAttiva === 'pile'` (screenshot `fix1-pile-*`). La logica `{stanzaAttiva === 'pile' && piede}` in `HomeV3.tsx` non è stata toccata da questo fix — solo il CONTENUTO del blocco `piede` (via `compatto` su `TastoPiu`) e i margini circostanti.

---

## Guardie test toccate (e perché — SOLO quelle il cui oggetto cambia)

| File | Guardia | Motivo |
|---|---|---|
| `tests/unit/ds-v3/parete-fluida.test.ts` | `--track: calc(var(--passo-maglia) * 4)` → `* 5` (2 occorrenze, base + titolo test) | Fix 4 — traccia adeguata (misura reale, non abrogazione) |
| stesso file | `background-color: var(--bg-deep)` → `var(--bg)` | Fix 2 |
| stesso file | dark gradient: `--filo-flat: rgba(255,255,255,.07)` → `.09`, `var(--bg-deep)` → `var(--bg)` nel fondo | Fix 2 |
| stesso file | **NUOVA** guardia `.ds-tray-nuova` (scrim/bordo/testo, light+dark) | Fix 3 — il tile non aveva guardia prima |
| `tests/unit/home-fluida.test.tsx` | **NUOVA** guardia scrollbar nascosta su `.ua-stanza-pile-scroll` | Fix 1c, richiesta esplicita dal contratto |
| `tests/unit/ds-v3/componenti/TastoPiu.test.tsx` | **NUOVO** test `compatto` (gap spazio.sm↔spazio.xs, ghiera/cappello/glifo invariati) | Fix 1a — copertura della nuova prop sul componente ratificato |

**Nessun'altra guardia toccata** (in particolare: nessuna guardia sulle colonne container-query, sul gap fluido shell, su `.ua-stanza-parete-scroll`, sulla logica del pager/URL-sync del FIX-A).

---

## Verifiche eseguite (output reale)

- `npx vitest run` sui 5 file toccati/nuovi: **104 passati, 0 falliti** (prima di allargare).
- `npx vitest run` suite intera: **2856 passati, 19 skip, 0 falliti** (era 2853/19/0 dopo FIX-A — +3 test nuovi: guardia scrollbar, guardia tray-nuova, test `compatto` di TastoPiu — nessuna regressione altrove).
- `npx tsc --noEmit`: **0 errori**.
- `npx next build`: **verde**, `/cassette` e `/dashboard` presenti nella route list, nessuna route residua dell'harness temporaneo (`qa-fixb-harness` assente dall'elenco route).

## Dubbi/punti aperti per ratifica

1. **Target «ben sotto il 20%» del piede non raggiunto alla lettera a 390×660** (28.8%, non <20%) — v. tabella Fix 1 sopra per la scomposizione del perché (pavimento fisso 23.3% da solo). A 390×844 è 22.7%, molto più vicino. Se Francesco vuole scendere sotto il 20% anche a 660px, l'unica leva rimasta è rimpicciolire la ghiera/il cappello del TastoPiù — fuori dal perimetro che il contratto di questo fix ha escluso esplicitamente («il TastoPiù resta il tasto fisico circolare ratificato»).
2. **Overflow interno lato pile non azzerato del tutto a 390×660** (70px → 50px, dataset 2+1+1+2): la scrollbar è invisibile (obiettivo primario raggiunto), ma la rete di sicurezza scatta ancora con QUESTO dataset a QUESTA altezza minima. A 390×844 l'overflow è zero. Ulteriore compressione richiederebbe toccare i clamp del blocco saluto/striscia (non il piede) — non l'ho fatto per restare dentro il perimetro «piede + scroll pile» di questo fix; segnalo la possibilità per un fix successivo se Francesco lo giudica necessario.
3. **Traccia 5·passo-maglia = righe più alte** (220px a scala base invece di 176px): a parità di scroll, meno cassette visibili per schermata sulla pagina `/cassette` e nel pannello home. Trade-off esplicito e necessario per eliminare la clip (misurata, non ipotizzata), ma è un cambiamento visibile che merita lo sguardo di Francesco al ri-collaudo.
4. **Alpha del filo in dark alzata `.07`→`.09`** (fix 2): unica modifica oltre al token di fondo, motivata dalla minore luminosità-differenziale dopo il cambio `--bg-deep`→`--bg`. Verificata solo visivamente (screenshot), non con un calcolo di contrasto formale (i fili sono decorativi, non testo — WCAG non si applica in senso stretto, ma la leggibilità della maglia era un requisito esplicito del verbale).

## Note sull'ambiente di verifica

Le screenshot Playwright (headless Chromium) mostrano scrollbar overlay invisibili di default anche nello stato "prima" — la prova primaria della barra visibile è la misura `getComputedStyle(...).scrollbarWidth` (`'auto'` prima, `'none'` dopo), non il pixel dello screenshot. Il Browser pane interattivo (Chromium con rendering "classico") aveva invece mostrato la barra grigia visibile nello stato "prima" nella prima ispezione di questa sessione (non salvata su disco, solo osservata a schermo) — coerente con la misura DOM.
