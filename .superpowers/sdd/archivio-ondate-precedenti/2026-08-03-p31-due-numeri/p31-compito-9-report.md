# Referto — Compito 9: «I cancelli, prima dell'unione» (P31)

Stato: **FATTO — verifica completa, nessun codice applicativo modificato.** Ramo
`p31-due-numeri-per-il-cliente`, **non pubblicato** (`git push` non è mandato di questo compito).

---

## Passo 1 — FASE 7, output reale

```
$ npx tsc --noEmit
(nessun output — zero errori)

$ npx vitest run
 Test Files  394 passed | 3 skipped (397)
      Tests  4540 passed | 19 skipped (4559)
   Duration  32.47s

$ npx next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 3.0s
  Running TypeScript ...
  Finished TypeScript in 9.8s
✓ Generating static pages using 15 workers (81/81)
(81 rotte generate, nessun errore)
```

Nessun file applicativo (`src/`) è stato toccato in questa sessione. Due script usa-e-getta in
`scripts/tmp/` (git-ignorati per costruzione: `p31-collaudo-consegna.ts`, `p31-contrasti.ts`) sono
stati corretti a metà sessione per un errore di tipo che bloccava l'hook pre-commit — quei file
**sono** dentro il progetto TypeScript (per questo l'hook li vedeva), quindi la frase «non serviva
rieseguire nulla» della prima stesura era falsa e va corretta qui: i tre comandi sono stati
**rieseguiti daccapo dopo quella correzione**, con questo output fresco (non quello del Compito 8):

```
$ npx tsc --noEmit
(nessun output — zero errori)

$ npx vitest run
 Test Files  394 passed | 3 skipped (397)
      Tests  4540 passed | 19 skipped (4559)
   Duration  104.55s

$ npx next build
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 6.8s
  Finished TypeScript in 13.5s
✓ Generating static pages using 15 workers (81/81)
(81 rotte generate, nessun errore)
```

I numeri di test/rotte sono identici a quelli del Compito 8 (atteso: gli script di `scripts/tmp/`
non sono importati da nessun test né da nessuna rotta, quindi non potevano cambiarli), ma qui sono
la **misura reale di questa sessione**, non un riporto.

## Passo 2 — Le guardie, guardando il NUMERO (P32)

```
$ node scripts/guardia-coerenza-documenti.mjs
=== Guardia coerenza documenti — 8 documenti vivi controllati ===
✅ Coerenza verde — conteggi giusti, nessun riferimento pendente, nessuna voce fantasma

$ node scripts/guardia-reduced-motion.mjs
✅ reduced-motion: niente si sposta a preferenza accesa, tutto arriva a riposo, la molla resta a
   preferenza spenta

$ bash scripts/check-csrf.sh
=== Guardia CSRF — route mutanti senza isSameOrigin ===
✅ Guardia CSRF verde — ogni route mutante verifica l'origine, o è esclusa con una ragione scritta
   (115 route API totali sotto `src/app/api` — contate con `find`, tutte coperte dallo script)

$ bash scripts/check-ds-compliance.sh
✅ DS compliance OK (v2.3 legacy + v3)
   (0 violazioni su 5 categorie di controllo: gold-come-testo, fallback t2/t3 vecchi, shadow
   hardcoded, colore/motion/font inline in ambito v3, leak di token fra CSS globali)

$ node scripts/guardia-progetti-playwright.mjs
=== Guardia progetti Playwright ===
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti: nessuna squadra vuota, nessuna prova orfana
```

🔑 **Il numero, non solo il colore — e qui la guardia si è accesa DAVVERO, due volte, prima di
arrivare al numero buono.** Baseline a inizio compito (prima di toccare BP-1): **8** documenti
vivi. Dopo aver scritto BP-1 la prima volta, puntando `SESSION_ACTIVE.md` **direttamente** al
referto `.superpowers/sdd/p31-compito-9-report.md` (che allora non esisteva ancora): la guardia
**è diventata rossa** — `1 documenti vivi controllati`, `❌ … che NON esiste`. Scritto il referto e
ricontrollato: **ancora 1**, ma questa volta **verde** — un secondo difetto, più sottile: `.superpowers/`
**non è nella allowlist di prefissi che la guardia segue** (`PREFISSI` in
`scripts/guardia-coerenza-documenti.mjs:75` — solo `src/ docs/ scripts/ supabase/ tests/ memory/
public/ .husky/`), quindi quel riferimento è **invisibile** alla catena: non rotto, semplicemente
mai seguito, e la catena collassava a **1** restando verde — **esattamente** la forma che la voce
di roadmap **P32** descrive già (aperta dopo l'unione della notte precedente, con la stessa identica
sequenza numerica **7→1→4→7** e la stessa causa strutturale, `SALTI` fisso a 2): questa non è una
scoperta nuova, è una **conferma indipendente** che il difetto descritto in P32 non è ancora chiuso
— mi ci sono imbattuto perché ho scritto un handoff nuovo, esattamente come la voce prevede che
accada a chiunque lo faccia. Poi ho provato a puntare
direttamente `docs/roadmap/ROADMAP-UFFICIALE.md`: **di nuovo 1**, perché quel file è
deliberatamente in `ARCHIVI_SOLO_TESTA` (riga 149-150 dello script) — un archivio non entra MAI
nella catena, per una ragione buona e già scritta nel commento del file (spiegata il 30/07/2026).
**La correzione giusta**, seguendo la convenzione già in uso in questo repo (`docs/roadmap/YYYY-MM-DD-*-handoff.md`,
non l'archivio né il referto fuori-allowlist): ho scritto un handoff breve,
`docs/roadmap/2026-08-03-p31-compito-9-verifica-handoff.md`, che cita la spec, il verbale delle
decisioni e (fuori catena, solo per chi legge) il referto completo. Risultato finale, verificato
DUE volte (appena scritto e di nuovo a fine sessione dopo l'ultimo salvataggio): **4 documenti
vivi, verde** — un numero più piccolo della baseline (8), ma **genuino**: la mia catena cita
volutamente meno documenti-ponte di quella della notte precedente (niente "domande"/"piani"
separati, perché questo compito non ne ha prodotti), non un numero gonfiato né un collasso nascosto.

## Passo 3 — FASE 9: le tre superfici, 390·768·1280 × chiaro·scuro

Cartella: `docs/design/screenshots/2026-08-03-p31/`. Fixture: cliente **STUDIO ODONTOIATRICO
PIEGARI GIANFRANCO** (`3b14a589-…`, telefono presente/cellulare assente) per wizard e pannello;
cliente **Dental Center s.r.l. uninominale** (`76115a50-…`, entrambi assenti) per il foglio della
consegna, dal vivo (v. Passo 5).

### ① Wizard «nuovo dentista» a 5 campi (v3, `/lavori/nuovo`)
`wizard-nuovo-dentista-{390,768,1280}-{chiaro,scuro}.png` (6 file). Campi: Nome*, Cognome*,
Telefono dello studio, Cellulare WhatsApp (con aiuto), Studio — tutti allo stesso peso, nessun
campo "avanzato" (coerente con D184/mockup D186).

Bersagli misurati (390px, chiaro — identici sugli altri formati):
| campo | w×h |
|---|---|
| Nome / Cognome / Telefono / Cellulare / Studio (ognuno) | 342×64 |
| Crea dentista | 342×70 |
| Chiudi (link in fondo al foglio) | 45×48 |

Tutti ≥44px. Nessun colore hardcoded, nessuna duration inline (verificato a vista sui tre file
toccati + `check-ds-compliance.sh` verde).

### ② Pannello di modifica del cliente (v2.3, `/clienti/[id]`) — MAI scattato su disegno approvato
`pannello-modifica-cliente-{390,768,1280}-{chiaro,scuro}.png` (6 file). **Questo è lo scatto che il
piano aveva saltato**: D186 approva wizard e foglio della consegna, non questo pannello. La riga
"Telefono dello studio" / "Cellulare WhatsApp" (con aiuto) vive nella stessa griglia a due colonne
usata per CAP/Città/Prov., simmetrica come previsto.

Bersagli misurati (390px, chiaro):
| campo | w×h |
|---|---|
| Telefono dello studio | 170×44 |
| Cellulare WhatsApp | 170×44 |
| Salva modifiche | 350×52 |

Entrambi i campi nuovi esattamente al minimo (**44px** di altezza) — passano, senza margine.

### ③ Il foglio della consegna (v3, `ChiediCellulareSheet` montato in `FrameConsegnato`) — dal vivo
`foglio-consegna-chiede-cellulare-{390,768,1280}-{chiaro,scuro}.png` (6 file) + due scatti di
contesto: `foglio-consegna-frame-390-chiaro.png` (il frame «Consegnato!» prima di aprire il
foglio) e `foglio-consegna-dopo-salvataggio-390-chiaro.png` (dopo il salvataggio, foglio chiuso).
Catturati durante il collaudo dal vivo del Passo 5 (un solo ciclo di consegna reale, **senza
ricaricare la pagina** fra un formato e l'altro: lo stato di `FrameConsegnato` è effimero, un
reload lo avrebbe perso — cambiati solo viewport e tema, dal vivo, sulla stessa sessione React).

Bersagli misurati (390px, chiaro):
| elemento | w×h |
|---|---|
| Invia messaggio WhatsApp (tasto che apre il foglio) | 342×70 |
| Cellulare WhatsApp (input) | 342×64 |
| Salva e apri WhatsApp | 342×70 |
| Annulla la consegna (link) | 137×48 |

A 1280px compaiono in più 5 voci della barra di navigazione a **183×43** (43 < 44) — sono
**preesistenti** (barra di navigazione dell'app, non parte del foglio P31), viste sotto.

## Passo 4 — FASE 9b: gate estetico L2 (12 sezioni)

Applicato alla **sola** superficie dell'ondata (wizard + pannello di modifica + foglio della
consegna), sui 18 scatti sopra + le misure numeriche.

| § | Esito | Nota |
|---|---|---|
| 1. Layout & allineamento | ✅ | Griglia a due colonne coerente su tutti e tre i formati; header/titolo allineati; nessun disallineamento visibile. |
| 2. Proporzioni & spazio | ✅ | Sheet centrato (max-width 480/600) su desktop, nessuno spazio morto abnorme; spaziatura fra sezioni coerente coi token. |
| 3. Sovrapposizioni & z-index | ✅ | Nessun overlap sheet/overlay/bottom-nav nei 18 scatti; z-index rispettato (Sheet 81, FrameConsegnato/overlay 1000). |
| 4. Tipografia & gerarchia | ✅ (wizard/foglio) · N/A (pannello) | Wizard e foglio (v3): Plus Jakarta Sans, gerarchia titolo>label>valore rispettata. Pannello (v2.3, legacy non migrata): DM Sans — **N/A per il criterio "solo Plus Jakarta Sans"**, che è di competenza v3; applicarlo violerebbe la regola di convivenza per-route (§14). |
| 5. Colore, contrasto, tema | ❌ **deferito** | **Pannello di modifica, dark:** label "Telefono dello studio"/"Cellulare WhatsApp" e aiuto misurano **2,24:1** (`rgb(90,86,82)` su `rgb(35,32,24)`) — sotto 4,5:1. `misurato:` script Playwright dedicato (contrasto WCAG reale, non stimato). **Non è un difetto di P31**: è il token `--t3` scuro (`#5A5652`), già misurato e già deferito come **P16/D134** (`src/app/globals.css:191`, commento in linea lo dichiara esplicitamente: "`--t3` scuro dà 1,71-2,24:1, sotto il 3:1 di WCAG"). Ogni altra etichetta della stessa sheet (Studio/Clinica, Nome, Cognome, Email, Indirizzo…) condivide lo stesso colore — le due righe nuove di P31 ereditano un difetto sistemico, non ne aprono uno proprio. **Deferito, non riaperto qui.** ✅ **Wizard e foglio della consegna (v3), dark:** label 4,75:1, aiuto 6,13:1 — passano (i token v3 `muted`/`faint` sono già stati corretti per questa classe di difetto, v. nota P34/P30 in roadmap). Chiaro: tutte le combinazioni passano (4,84-5,74:1). |
| 6. Motion | ✅ | Nessun `duration`/easing inline nei tre file toccati (letti riga per riga); `check-ds-compliance.sh` verde su questo punto. |
| 7. Suono/haptic | ✅ | Delegato ai componenti condivisi (`Sheet`, `TastoPrimario`); nessuna chiamata diretta aggiunta, nessun autoplay. |
| 8. Touch target | ✅ **campi nuovi** · ❌ **deferito, preesistenti** | Tutti i campi/tasti NUOVI ≥44px (v. tabelle sopra). `misurato:` tre bersagli **preesistenti** sotto 44px, nessuno toccato da P31: tasto «Chiudi» di `ClienteEditSheet` (**36×36**, `ClienteEditSheet.tsx:275-296`) · «Apri profilo» in header (**40×40**) · 5 voci della barra di navigazione a 1280px (**183×43**). Nessuno dei tre è un campo che P31 ha scritto o toccato — riferiti (R-E2), non corretti. |
| 9. Stati | ✅ | Loading: tasto disabilitato + motivo "Un attimo…". Error: `role="alert"` + "Non sono riuscita a salvare il numero. Riprova." (provato dal vivo: nessun errore incontrato nel collaudo, verificato a lettura di codice + test esistenti del Compito 8). Disabled: motivo esplicito "Scrivi il cellulare". |
| 10. Responsive (3 viewport) | ✅ **pannello/foglio** · ❌ **deferito, wizard** | `misurato:` `scrollWidth` vs `clientWidth` a 390/768/1280 — pannello di modifica e foglio della consegna: **nessun overflow** su nessun formato. **Wizard, 390px:** overflow orizzontale, **545px di contenuto contro 390 di viewport**. `misurato:` **identico** (545 vs 390) con lo sheet «Nuovo dentista» chiuso E aperto — la causa è nella griglia delle tessere-dentista del Passo 1 (`PassoDentista.tsx`, tessere `.ds-tile-scelta` con nomi lunghi tipo "Dental Center s.r.l. uninominale" che sforano la colonna), **non nel foglio a 5 campi che P31 ha scritto**. Riferito (R-E2), non corretto. |
| 11. Accessibilità | ✅ | `aria-label` combacia col testo visibile su tutti i campi nuovi (verificato: `page.getByLabel('Cellulare WhatsApp')`/`getByLabel('Telefono dello studio')` hanno trovato l'elemento giusto in ogni sheet). `role="alert"` sull'errore di salvataggio. Focus-trap ed Esc-per-chiudere ereditati dal componente condiviso `Sheet` (non riscritti da P31). ⚠️ **Non verificato con un lettore di schermo vero** — vuoto dichiarato, coerente con tutti i gate precedenti di questo progetto (mai fatto finora). |
| 12. Copy & microcopy | ✅ | «cellulare»/«fisso», mai «numero di telefono mobile» (dizionario §2.3 rispettato). Le due schermate ora usano la STESSA etichetta ("Cellulare WhatsApp") — la contraddizione originale fra `ClienteEditSheet` e `NuovoDentistaSheet` che aveva aperto P31 è chiusa. Aiuto identico su tutte e tre le superfici, nessun gergo tecnico. |

**Conteggio (corretto — la prima stesura sommava male):** 12 sezioni percorse, **9 pienamente ✅**
(2 di queste con nota N/A/parziale dichiarata — §4, §11) e **3 sezioni con un ❌ deferito** (§5, §8,
§10) — non 2: §8 e §10 **non sono lo stesso difetto** (bersagli tappabili sotto 44px contro
overflow orizzontale del wizard sono due cause distinte e indipendenti), e la stesura precedente li
aveva impropriamente raggruppati. I tre, distinti:
- **§5 — contrasto dark del pannello di modifica:** token `--t3` scuro, già misurato e già
  deferito come **P16/D134** (`src/app/globals.css:191`).
- **§8 — tre bersagli tappabili preesistenti sotto 44px**, nessuno toccato da P31 (tasto «Chiudi»
  di `ClienteEditSheet`, «Apri profilo» in header, voci della barra di navigazione a 1280px).
- **§10 — overflow orizzontale del wizard a 390px** (`PassoDentista.tsx`, griglia delle
  tessere-dentista): nessuna voce di roadmap lo copriva già — riferito qui come nuovo ritrovamento
  fuori mandato.

**Nessuno dei tre ❌ è stato corretto di nascosto** (R-E2): tutti e tre sono preesistenti, misurati
(non stimati), e riferiti con la loro sede naturale — §5 in P16/D134 (già aperto), §8 e §10 come
nuovi ritrovamenti fuori mandato in questo referto.

## Passo 5 — Collaudo dal vivo (D103)

**Fatto**, su server locale (`npm run dev`, non `uachelab.com` — il codice non è pubblicato) con
link monouso generato dalla chiave di servizio, puntato a `http://localhost:3000` (script
`scripts/tmp/link-accesso-locale.ts`, già esistente, supporta `BASE=` per questo).

**Precondizioni verificate PRIMA di premere** (`scripts/tmp/p31-leggi-esito.ts`, sola lettura):
lavoro `TEST-DdC-001` (`7d5343a8-3364-4dd2-992f-c0510e8ea026`), stato `pronto`, **4 DdC esistenti
— tutte `annullata`** (nessuna con stato ≠ annullata, quindi il guard di idempotenza non
sarebbe intervenuto), nessun buono in `buoni_consegna`. Cliente `Dental Center s.r.l. uninominale`
(`76115a50-…`), `cellulare_whatsapp: null`.

⚠️ **Nota onesta sulla scelta del lavoro:** dei 57 lavori `pronto`/`in_ritardo` senza DdC attiva
presenti nel banco, **solo 1** supera il precheck MDR reale (`precheckMDR`, elemento 4 — paziente
identificabile): gli altri 56 sono importazioni storiche (`STOR/…`) senza `paziente_nome_snapshot`
né `paziente_id`. Il lavoro `TEST-DdC-001` porta nel nome e nella descrizione ("TEST DdC
ITCA01051686") tutti i segni di essere un fixture costruito apposta per questo tipo di prova (le
4 DdC annullate lo confermano) — l'ho riusato invece di prepararne uno nuovo.

**Sequenza reale, con i tempi:**
```
t+579ms    — navigo al link monouso (http://localhost:3000/lavori/7d5343a8-…?consegna=1)
t+1183ms   — atterrato sulla scheda lavoro
t+2076ms   — dialog "Consegno?" (precheck passato, 2 avvisi non bloccanti: tipo impronta e
             disinfettante non registrati — non richiesti dal precheck MDR)
t+2366ms   — ⚠️ POST /api/lavori/.../consegna inviato (azione reale, DdC+buono generati)
t+5167ms   — "Consegnato!" — LA FINESTRA DI ANNULLO (10 min) PARTE
t+5621ms   — apro "Invia messaggio WhatsApp" → ChiediCellulareSheet si apre (il cliente non ha
             cellulare_whatsapp)
             → 6 scatti (390/768/1280 × chiaro/scuro), stessa sessione, nessun reload
t+8608ms   — compilo "333 1234567", premo "Salva e apri WhatsApp"
             → PATCH /api/clienti/76115a50-… → 200
t+9427ms   — popup aperto: https://api.whatsapp.com/send/?phone=393331234567&text=…
             (ordine salva→whatsapp confermato dai timestamp: PATCH PRIMA, popup DOPO)
t+11066ms  — riapro "Modifica cliente" sullo stesso cliente (pagina nuova, stessi cookie):
             campo "Cellulare WhatsApp" = "333 1234567"
             → lettura diretta DB (service role): cellulare_whatsapp = "333 1234567"
t+11199ms  — trascorsi dalla consegna: 6s — procedo con l'annullo
t+13073ms  — clic su "Annulla la consegna" → conferma nel dialog → tentato
```

**Verifica finale, con uno script di lettura separato lanciato DOPO aver chiuso il browser**
(`p31-leggi-esito.ts`): `lavoro.stato = 'pronto'` (tornato quello di partenza) · **5ª DdC
(`DDC-2026-0004`) generata e già `stato: 'annullata'`** (le precedenti 4 restano `annullata`,
nessuna duplicata) · `cliente.cellulare_whatsapp = '333 1234567'` (il salvataggio del numero
**sopravvive** all'annullo della consegna — sono due azioni indipendenti, corretto).

⚠️ **Nota onesta sullo screenshot `_verifica-dopo-annullo.png`:** mostra ancora il banner
"CONSEGNATO ✓ — Finestra disponibile ancora 09:52" sulla scheda lavoro. Questo è **il rendering
lato client, non ancora aggiornato**, nell'istante (~1s dopo il clic di conferma) in cui il
browser è stato chiuso dallo script — **non** è la prova che l'annullo sia fallito. La prova
autorevole è la lettura diretta del database, fatta a browser già chiuso, che mostra
inequivocabilmente il lavoro tornato `pronto` e la DdC nuova già `annullata`. Lo dichiaro invece di
nasconderlo: uno screenshot ambiguo accanto alla prova buona vale più di uno screenshot solo,
scelto per sembrare pulito.

**Pulizia del banco a fine prova** (non richiesta dal mandato, ma corretta per lasciare la fixture
come l'ho trovata): `cliente.cellulare_whatsapp` riportato a `null` via chiave di servizio — un
futuro esecutore che ripete questo stesso collaudo trova lo stesso punto di partenza.

**Esito, rispetto al criterio del Passo 5:** «il cliente senza cellulare → il tasto chiede il
numero → si salva → l'anagrafica lo mostra» — **verificato interamente**, con l'unica precisazione
che «l'anagrafica lo mostra» vale per il pannello di modifica (che LEGGE `cellulare_whatsapp` nel
suo form) e per la lettura diretta del database — **non** per la scheda cliente in sola lettura
(`clienti/[id]/page.tsx`), che non ha mai una riga per questo campo (v. ritrovamenti fuori mandato).

## Passo 6 — Il vuoto dichiarato: il telefono vero

🛑 **Resta APERTO.** Non avevo un telefono a disposizione in questa sessione per verificare che
cosa mostra WhatsApp quando il tasto compone un numero senza prefisso internazionale corretto (o
malformato). Quello che **ho potuto** verificare — e non è la stessa cosa — è che **UÀ compone
sempre un numero con il prefisso `39`** prima di consegnarlo a WhatsApp: il popup catturato dal
vivo mostra `phone=393331234567` per un input `"333 1234567"` (D182 rispettata, verificato sul
valore reale generato dall'applicazione, non dedotto dal codice). **Ciò che resta non
osservabile da riga di comando è solo il comportamento di WhatsApp stesso** di fronte a un
numero che UÀ non riesce a normalizzare (es. l'utente scrive già un prefisso diverso, o cifre
insufficienti) — quella validazione vive dentro l'app WhatsApp, non sul server. **Non dichiaro
provato ciò che non lo è.**

## Ritrovamenti fuori mandato — riferiti, NON corretti (R-E2)

1. **Il messaggio WhatsApp reale porta due caratteri corrotti.** Nel popup catturato dal vivo
   (Passo 5), il testo contiene **due occorrenze di `%EF%BF%BD`** (percent-encoding di `U+FFFD`,
   il carattere di sostituzione Unicode) esattamente dove il template ha gli emoji `✅` e `📋`
   (`src/lib/consegna/whatsapp-template.ts:16,25,27`). Nello **stesso messaggio**, l'em dash e la
   "À" accentata (`— UÀ Lab`) arrivano **integri** (`%E2%80%94`, `%C3%80` — UTF-8 corretto): non è
   un problema di encoding generale, è specifico degli emoji (probabilmente un punto della
   pipeline che tratta una coppia di surrogati UTF-16 come se fosse un solo carattere).
   `git blame` su quelle tre righe: **precedono P31** (commit `e0b9832a`/`a3669958`, molto prima
   dei commit P31 su questo file, che toccano solo `numeroPerWhatsapp`). Non l'ho corretto:
   è fuori dal file che questo compito doveva verificare, e il fix va progettato (dove nella
   pipeline si perde il surrogato) non improvvisato.
2. **Mismatch di idratazione React su ogni apertura di `?consegna=1`.** Riprodotto **due volte**
   (due lavori diversi), sempre sullo stesso portale (`OverlayCaricamento` dentro
   `FlussoConsegna.tsx`, montato via `createPortal` su `document.body`): il server e il client
   producono alberi diversi al primo render. Visibile solo nell'overlay di sviluppo di Next
   (`next dev`); `next build`/produzione non lo mostra come errore bloccante nei log raccolti.
   Preesistente (il componente è di "Ondata 16/07", molto prima di P31); P31 non tocca
   `FlussoConsegna.tsx` né `OverlayCaricamento`.
3. **La scheda cliente in sola lettura non mostra mai `cellulare_whatsapp`.**
   `src/app/(app)/clienti/[id]/page.tsx`, card "Anagrafica": ha una `InfoRow` per "Telefono" ma
   nessuna per il cellulare WhatsApp — l'unico modo per vederlo è riaprire "Modifica cliente". Non
   è un difetto di scrittura (il dato si salva e si legge correttamente, verificato al Passo 5): è
   un campo che P31 ha introdotto e che la vista di sola lettura di questa pagina non espone.
   Probabile sede naturale: **P30/P30-a** (la redesign dell'anagrafica cliente, già in roadmap) —
   non lo decido qui.
4. **L'overflow orizzontale del Passo 1 del wizard** (già discusso al Passo 4, §10) —
   `src/components/features/wizard/PassoDentista.tsx`, tessere `.ds-tile-scelta`: a 390px il
   contenuto sfora a 545px, **con o senza** il foglio "Nuovo dentista" aperto (misurato identico
   nei due casi). Non è nella roadmap con una voce propria: lo segnalo qui perché il Compito 9
   l'ha trovato misurando, non perché tocchi il mandato di P31.

## BP-1 — che cosa ho aggiornato

- **`memory/MEMORY.md`** — nuovo "Ultimo aggiornamento" (126), riepilogo completo di questo
  compito; il precedente rinominato "Aggiornamento precedente".
- **`docs/roadmap/ROADMAP-UFFICIALE.md`** — nuovo "Ultimo aggiornamento" (51); la voce **P31**
  passata da 🔴 a ✅ **FATTA** (testo storico dei compiti 1-8 conservato sotto, non riscritto).
- **`memory/SESSION_ACTIVE.md`** — sostituito (non appeso), punta a questo referto.

## Autorevisione

- **Completezza:** FASE 7 (Passo 1) · guardie coi numeri (Passo 2) · 3 superfici × 3 formati × 2
  temi (Passo 3, 18 scatti + 2 di contesto) · gate L2 a 12 sezioni (Passo 4) · collaudo dal vivo
  completo (Passo 5) · vuoto del telefono vero dichiarato aperto, non finto chiuso (Passo 6).
- **Disciplina R-E2:** 4 ritrovamenti fuori mandato, tutti riferiti con `file:riga` e prova, **zero
  corretti di nascosto**.
- **Igiene del banco:** cliente di prova riportato al suo stato di partenza (`cellulare_whatsapp:
  null`) dopo il collaudo; lavoro di prova tornato `pronto`; nessun residuo permanente diverso da
  una quinta riga di DdC annullata (comportamento atteso, non un effetto collaterale).
- **Nessun codice applicativo toccato**: solo verifica, screenshot, e tre file di memoria/roadmap.

## File prodotti/toccati

- `docs/design/screenshots/2026-08-03-p31/` — 20 screenshot + `misure-statiche.json`
- `scripts/tmp/p31-*.ts` — usa-e-getta, git-ignorati (censimento banco, letture, scatti, contrasti,
  collaudo consegna, scorrimento orizzontale) — non si committano
- `memory/MEMORY.md`, `docs/roadmap/ROADMAP-UFFICIALE.md`, `memory/SESSION_ACTIVE.md`
- `.superpowers/sdd/p31-compito-9-report.md` (questo file)
