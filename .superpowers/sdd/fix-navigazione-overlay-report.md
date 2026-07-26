# Fix D-2 / D-1 — chiudere un overlay navigando via

Data: 26/07/2026 · worktree `redesign-parete-home` · banco `http://localhost:3020` (build di
produzione **precedente al fix**, per contratto non ricostruita).

Guardia stili prima di ogni misura (obbligatoria — rileva il caso in cui il server serve pezzi
invalidati da una ricostruzione, che renderebbe false tutte le misure):

```
CSS con errore: nessuno
stato: {"uaBg":"#f4f0e7","bodyBg":"rgb(244, 240, 231)","bgToken":"#f4f0e7"}
✅ stili applicati davvero — il server serve la build corrente
```

---

## 1. La riproduzione, con le sue prove

Tutte le misure sotto vengono dal **build servito**, cioè dal codice PRIMA del fix. Le pressioni
«indietro» sono traversal vere (`page.goBack()`), mai un `popstate` sintetico.

### Precondizione verificata per prima (regge tutto il disegno del fix)

Con un overlay aperto, l'entry in cima alla history è ancora riconoscibile come nostra:
`history.state.uaSheet === true` (o `uaDialog`). Misurato **in ogni campione a overlay aperto**,
su tutte le superfici: sempre presente. Se Next la sovrascrivesse, la cessione dell'entry non
scatterebbe e tornerebbero le entry orfane: per questo la guardia committata la controlla a ogni
giro e diventa rossa se sparisce.

### D-2 — il tap principale non arriva a destinazione

Sheet «Prima di consegnare» → riga bloccante «Tocca per risolvere» (`onRisolvi`: chiude lo sheet
e va su `/modifica` nello stesso gesto).

| sito | file:riga | esito misurato |
|---|---|---|
| PilaAperta (390) | `src/components/features/pile/PilaAperta.tsx:141` | resta su `/lavori?pila=rossa` ❌ |
| PilaSplit (800) | `src/components/features/pile/PilaSplit.tsx:119` | resta su `/lavori?pila=rossa` ❌ |
| HomeDesktop (1280) | `src/components/features/home/HomeDesktop.tsx:219` | resta su `/dashboard?pila=rossa` ❌ |
| SchedaLavoroV3 | `.../scheda-v3/SchedaLavoroV3.tsx:391` | già riprodotto due volte dal collaudo precedente (`scripts/tmp/back-overlay/out17.txt`, `out18.txt`) |

Traccia degli eventi di history sul sito già riprodotto (`out17.txt`), che mostra il meccanismo
in chiaro: `back() CHIAMATA` a +16 ms, `popstate` a +17 ms, `replaceState` a +18 ms — e l'URL non
diventa mai `/modifica`. Il `history.back()` della chiusura (sincrono da chiamare) parte prima che
la transizione asincrona di Next abbia toccato la history, e la cancella.

Nota di banco: la pila rossa era vuota. Per raggiungere `onRisolvi` ho reso consegnabile
**E2E-CAS-002** (`stato: in_lavorazione → pronto`, `data_consegna_prevista: 2026-12-31 →
2026-07-26`) e l'ho **rimesso esattamente com'era** subito dopo (verificato rileggendo il DB).
**E2E-CAS-001 non è mai stato toccato**: resta `in_lavorazione`, senza paziente, non consegnato.

### D-1 — la pressione «indietro» morta (entry orfana)

Chi cambia pagina **senza** chiudere l'overlay: la nuova pagina si impila SOPRA la nostra entry,
che resta sepolta. La prima pressione indietro atterra sull'entry sepolta — stesso indirizzo,
sembra a posto — e la seconda non fa niente.

| sito | file:riga | profondità | esito |
|---|---|---|---|
| MenuSchedaSheet | `.../scheda-v3/MenuSchedaSheet.tsx:145` | 4 → **5** | back#1 ok, **back#2 immobile** ❌ |
| logout TuttoIlResto | `.../tutto-il-resto/TuttoIlResto.tsx:46` | 3 → **4** | back#1 ok, **back#2 immobile** ❌ |
| logout NavDesk | `src/components/ds/NavDesk.tsx:232` | idem | già misurato dal collaudo precedente (`out15.txt`) |

> Il collaudo precedente aveva dato MenuSchedaSheet/SchedaPersonaSheet per **verdi** (`out19.txt`,
> «TORNATO IN UNA PRESSIONE? sì ✅»): era un falso verde, perché si fermava alla prima pressione.
> Da qui in poi ogni misura preme **due volte**.

Catture: `docs/design/screenshots/2026-07-26-redesign-parete-home/back-overlay/`
(`T-MenuSchedaSheet-pressione-morta.png`, `V-logout-TuttoIlResto-pressione-morta.png`).

---

## 2. Il disegno

### L'idea in una riga

La nostra entry è, **per costruzione, un doppione della pagina** (`pushState` senza url). Quindi
ci sono esattamente due modi legittimi di toglierla di mezzo, e finora il modulo ne conosceva uno
solo:

1. **si chiude IN LOCO** (la pagina resta quella) → la si consuma con `history.back()`. Invariato.
2. **si naviga via** (la pagina cambia nello stesso gesto) → la navigazione la **SOSTITUISCE**
   (`router.replace`). Nuovo.

Nel caso 2 la history diventa `[…, pagina, destinazione]`: **esattamente** la forma che si aveva
prima che questo modulo esistesse, quando il chiamante faceva `router.push` dalla pagina nuda.
Verificato sul merge-base `a684932`: `Sheet.tsx` non aveva alcuna meccanica di history e gli
handler erano gli stessi. Non è un ripiego: è l'equivalenza esatta col comportamento ratificato.

### Il codice

- `src/components/ds/storia-overlay.ts` — nuova `cediEntryAllaNavigazione()`: se l'entry in cima è
  ancora nostra la cede (azzera `marcaEntry`) e torna `true`. Da quell'istante nessun
  `esciOverlay` proverà più a disfarla con `history.back()`. Le «tre regole» dell'intestazione
  diventano quattro, con il blocco che racconta perché in loco ≠ navigando via.
- `src/components/ds/useNavigaDaOverlay.ts` — nuovo hook, unico punto d'ingresso per i chiamanti:
  `if (cediEntryAllaNavigazione()) router.replace(href) else router.push(href)`. Due istruzioni
  **adiacenti e sincrone**: è quell'adiacenza a togliere di mezzo ogni corsa.
- Contratto ai chiamanti, scritto nel JSDoc dell'hook: **prima si naviga, poi si chiude.**
  Invertirle funzionerebbe comunque con React 19 (il flush di un evento discreto arriva a fine
  handler), ma appoggerebbe la correttezza su un dettaglio di scheduling; in quest'ordine la
  cessione precede qualunque `esciOverlay`, anche dentro un `await`.

### Perché è una dichiarazione, non un indovinello

L'intenzione la **dichiara il chiamante**, usando `useNavigaDaOverlay` al posto di `router.push`.
L'unica cosa che il modulo *legge* è la marca della **propria** entry in cima alla history: una
lettura sincrona ed esatta, nello stesso istante della navigazione. Non è un timer, non è un
confronto di pathname, non è «c'è una navigazione in volo?» — nessuna delle tre forme di
inferenza che il brief vieta, tutte e tre corse.

### Perché non può riaprire i due fallimenti già incontrati

- **Back inghiottito** (il primo): `history.back()` parte solo quando **nessuno** ha dichiarato
  una navigazione. La dichiarazione azzera `marcaEntry` prima che la navigazione parta, e
  `esciOverlay` senza `marcaEntry` non chiama mai `back()`. Non c'è ordine di esecuzione in cui
  il back possa arrivare dopo la dichiarazione: la dichiarazione è la prima istruzione del gesto.
- **Entry orfana** (il secondo): l'orfana nasceva perché la destinazione si metteva **sopra** la
  nostra entry. Ora ci si mette **al posto**: la profondità della history dopo la navigazione è
  identica a quella con l'overlay aperto — misurato, non dedotto (§4).

### Cosa NON è stato toccato (requisiti 3 e 4)

`entraOverlay`, `spingiEntry` e `alPop` sono **invariati** — nel diff di `storia-overlay.ts` sotto
`alPop` cambia zero righe di codice. Quindi:

- **requisito 3** (back col dialog sopra lo sheet: annulla solo il dialog, lo sheet resta; il
  secondo back chiude lo sheet; il terzo lascia la pagina) passa dallo stesso codice di prima. Ri-
  verificato comunque **in browser sul build servito** dal terzo braccio della guardia: dialogo
  via, sheet ancora lì, secondo indietro chiude lo sheet.
- **requisito 4** (un back non conferma MAI un'azione distruttiva): `alPop` continua a chiamare
  `voce.chiudi()`, che per `DialogConferma` è `onAnnulla`. Verificato **a livello di dato**, non
  per assenza di messaggio: dopo il back e un ricarico della pagina, le **6 cassette** della
  parete sono ancora tutte lì. Più un test unitario dedicato che lo riasserisce dopo il cambio.

---

## 3. Tutti i punti «chiude e/o naviga», con verdetto

Perimetro: ogni file che monta un `Sheet`/`DialogConferma` v3 (gli unici che spingono un'entry) o
che passa loro una callback che naviga. Gli overlay legacy (shadcn) non passano da
`storia-overlay.ts` e non sono in perimetro.

| # | punto | forma | verdetto |
|---|---|---|---|
| 1 | `features/pile/PilaAperta.tsx:141` `onRisolvi` | chiude + naviga | **rotto → corretto** (D-2 riprodotto in browser) |
| 2 | `features/pile/PilaAperta.tsx:155` `onConfermato` | chiude + naviga | **rotto → corretto** (stessa forma, stesso file, stesso host) |
| 3 | `features/pile/PilaSplit.tsx:119` `onRisolvi` | chiude + naviga | **rotto → corretto** (D-2 riprodotto in browser) |
| 4 | `features/pile/PilaSplit.tsx:133` `onConfermato` | chiude + naviga | **rotto → corretto** (stessa forma) |
| 5 | `features/home/HomeDesktop.tsx:219` `onRisolvi` | chiude + naviga | **rotto → corretto** (D-2 riprodotto in browser) |
| 6 | `.../scheda-v3/SchedaLavoroV3.tsx:391` `onRisolvi` | chiude + naviga | **rotto → corretto** (D-2 riprodotto dal collaudo precedente) |
| 7 | `.../scheda-v3/MenuSchedaSheet.tsx:145` (4 voci) | naviga, overlay aperto | **rotto → corretto** (D-1 riprodotto: profondità 4→5, back#2 morto) |
| 8 | `features/tecnici/SchedaPersonaSheet.tsx:205` «Produttività» | naviga, overlay aperto | **rotto → corretto** — non esercitabile su questo banco (nessuna persona in `/tecnici`: la fixture del collaudo precedente non c'è più); forma identica al #7, corretto allo stesso modo |
| 9 | `features/tutto-il-resto/TuttoIlResto.tsx:46` logout | naviga, overlay aperto | **rotto → corretto** (D-1 riprodotto: profondità 3→4, back#2 morto) |
| 10 | `src/components/ds/NavDesk.tsx:232` logout | naviga, overlay aperto | **rotto → corretto** (D-1 già misurato dal collaudo precedente, `out15.txt`) |
| — | `onFrameChiuso` in #1/#3/#5 e `SchedaLavoroV3` | chiude + `router.refresh()` | **nessuna modifica**: `refresh` non tocca la history, quindi è una chiusura IN LOCO e l'entry **deve** essere consumata con `history.back()` come prima. Commento aggiunto perché non sembri una dimenticanza. |
| — | `ConfermaCassettaSheet.tsx:114`, `SchedaPersonaSheet.tsx:146,170`, `PareteClient` (`dopoCreata`/`dopoCambio`) | chiude + `router.refresh()` | **nessuna modifica**, stesso motivo |
| — | `WizardNuovoLavoro.tsx:216` (`vaIndietro` al passo 1) e `:285` (`onTornaHome` del Frame Fatto) | naviga | **nessuna modifica**: i due comandi non sono raggiungibili con un overlay v3 aperto — `RipresaSheet`/`NuovoDentistaSheet` coprono la testata col loro scrim, e `CambiaDataSheet` copre il link «Torna alla home». Se un domani un overlay li lasciasse scoperti, vanno passati a `useNavigaDaOverlay`. |
| — | `PareteClient.tsx:507,611`, `HomeV3`, `StanzePager`, `SchedaNavRail`, `CardLavoro.onApri` | naviga senza overlay | **nessuna modifica**: nessun overlay aperto, nessuna entry nostra in cima; `cediEntryAllaNavigazione` tornerebbe comunque `false` |
| — | `tornaIndietro(router)` — 6 punti (`AppHeader`, `PilaAperta`, `PersoneV3`, `TuttoIlResto`, `SchedaLavoroV3`, `PareteClient`, `BackHeaderModifica`) | naviga **all'indietro** | **nessuna modifica**: tutti testate di pagina, mai dentro un overlay (lo scrim li copre). Verificato uno per uno. Era il caso che avrebbe richiesto un trattamento diverso — `replace` non sa esprimere una navigazione all'indietro — e non esiste. |
| — | tutti i `router.push` in superfici legacy v2.3 (`RiconciliazioniClient`, `LavoroFormClient`, `RifacimentoButton`, `CicloNuovoSheet`, `UserProfileSheet`, `MagazzinoDeleteButton`, `CicloDeleteButton`, `PazienteArchiviaButton`, admin, login, invite, onboarding, impostazioni) | — | **fuori perimetro**: non montano overlay v3, nessuna entry `storia-overlay` |

---

## 4. La verifica dopo il fix, con la provenienza dichiarata

Il build servito **precede** il fix e non si ricostruisce. Quindi:

- **numeri dal build servito (codice vero, nessuna iniezione)**: tutta la §1 (riproduzione), più
  il terzo braccio della guardia (indietro annulla e non conferma, 6 cassette intatte dopo il
  ricarico).
- **numeri da iniezione** (§4.1): la verifica del comportamento corretto. Sulla pagina viva, e
  **solo per la durata del gesto**, si applica ciò che il fix introduce nel codice: `history.back`
  reso muto (è l'effetto della cessione) e il primo `pushState` di Next dirottato su
  `replaceState` (è `router.replace` al posto di `router.push`). Fuori da quella finestra la
  pagina resta quella servita, intatta. Script: `scripts/tmp/back-overlay/24-verifica-iniezione.mjs`.
- **numeri dalla suite**: §4.2.

### 4.1 — Iniezione, cinque siti, tutti verdi

Per ognuno: destinazione raggiunta · profondità della history **invariata** rispetto a overlay
aperto (nessuna entry sepolta) · due pressioni indietro, la prima torna alla partenza, la seconda
non è morta.

| sito | destinazione | profondità | back#1 | back#2 |
|---|---|---|---|---|
| PilaAperta (390) `onRisolvi` | `/lavori/…/modifica?tab=dati` ✅ | 4 → 4 ✅ | `/lavori?pila=rossa` ✅ | `/tutto-il-resto`, non morta ✅ |
| PilaSplit (800) `onRisolvi` | `/lavori/…/modifica?tab=dati` ✅ | 4 → 4 ✅ | `/lavori?pila=rossa` ✅ | `/tutto-il-resto`, non morta ✅ |
| HomeDesktop (1280) `onRisolvi` | `/lavori/…/modifica?tab=dati` ✅ | 4 → 4 ✅ | `/dashboard?pila=rossa` ✅ | `/tutto-il-resto`, non morta ✅ |
| MenuSchedaSheet (390) | `/lavori/…/modifica?tab=lavorazioni` ✅ | 4 → 4 ✅ | `/lavori/…` ✅ | `/tutto-il-resto`, non morta ✅ |
| logout TuttoIlResto (390) | `/login` ✅ | 3 → 3 ✅ | `/tutto-il-resto` ✅ | non morta ✅ |

Dettaglio che conferma i due meccanismi distinti: sui tre siti «chiude e naviga» l'iniezione
registra **1 back soppresso** (era quello che si mangiava la navigazione); sui due «naviga senza
chiudere» ne registra **0**, e a servire è solo il dirottamento su `replace` (era quello che
lasciava l'orfana). Sono esattamente D-2 e D-1, ciascuno curato dalla propria metà del fix.

Catture: `docs/design/screenshots/2026-07-26-redesign-parete-home/back-overlay/FIX-*.png`.

### 4.2 — Suite e tipi

- `npx tsc --noEmit` → 0 errori.
- `npx vitest run` → **3268 passati / 19 saltati** (baseline 3263/19; +5 dal nuovo file di test).

Test nuovi/aggiornati, **verificati rossi contro il comportamento vecchio** (sabotando l'hook a
fare `router.push` nudo si spengono 3 asserzioni su 3, riprova fatta e annullata):

- `tests/unit/ds-v3/componenti/naviga-da-overlay.test.tsx` (nuovo, 5 test) — `replace` invece di
  `push` a overlay aperto; **nessun `history.back()` dopo la dichiarazione** (il cuore di D-2);
  `push` normale senza overlay; l'entry ceduta non resta «nostra» (un overlay aperto sulla pagina
  di destinazione si spinge la propria protezione); un back sopra un `DialogConferma` continua ad
  **annullare, mai a confermare**.
- `tests/unit/MenuSchedaSheet.test.tsx`, `tests/unit/tutto-il-resto-esci.test.tsx`,
  `tests/unit/navdesk-identita.test.tsx` — aggiornati: ora pretendono `replace` e vietano `push`.

**Limite dichiarato onestamente**: in jsdom `history.back()` è sincrona e finta, nel browser è una
traversal asincrona — ed è proprio quell'asincronia a produrre D-2. La suite era verde per tutto
il tempo in cui il difetto era in piedi. Perciò la rete vera sta nel banco Playwright.

### 4.3 — La guardia committata

`scripts/guardia-navigazione-overlay.mjs` (stesso ruolo di `scripts/guardia-reduced-motion.mjs`).
Tre bracci: D-2 dalla pila rossa, D-1 dal menu ⋯, e «indietro non conferma» sulla parete, con
verifica **a livello di dato** dopo un ricarico. Le pressioni indietro sono traversal vere.

> **Stato: NON ancora eseguita verde.** Il build servito precede il fix, quindi eseguirla ora
> non può dare verde e sarebbe scorretto leggerla così. Quello che è stato verificato è che la
> guardia **vede il difetto**: eseguita contro il build servito è diventata **rossa**, e per i
> motivi giusti —
> ```
> - [menu ⋯ → ponte di modifica] D-1: la destinazione si è IMPILATA sopra l'entry
>   dell'overlay invece di sostituirla (profondità 4 → 5)
> - [menu ⋯ → ponte di modifica] D-1: la SECONDA pressione indietro non fa niente
> ```
> mentre il braccio «indietro non conferma» è passato («dialogo via, sheet resta, secondo
> indietro chiude lo sheet, 6 cassette intatte dopo il ricarico»).

**Come si arriva davvero al verde, senza illusioni.** Ricostruire l'applicazione NON basta: il
primo braccio ha bisogno di un lavoro consegnabile con un ostacolo nella pila rossa, e sul banco
la pila rossa è vuota — `npx tsx scripts/seed-e2e.ts` non ne crea uno, e ricostruire non tocca il
database. Serve preparare la fixture a mano; la ricetta esatta (preparazione **e** ripristino,
su E2E-CAS-002, senza mai toccare E2E-CAS-001) è scritta nell'intestazione della guardia, così non
se ne va con gli script usa-e-getta di questa sessione. Per non abituare nessuno a ignorare il
rosso, quel caso ha un'uscita tutta sua: la guardia esce **2** («incompleta»), distinto dall'**1**
di un difetto misurato e dallo **0** del verde, stampa la ricetta, e gli altri due bracci danno
comunque il loro verdetto. Non c'è nessun percorso in cui diventa verde per assenza di prove.

---

## 5. Riserve

1. **Finestra sottile fra la cessione e il commit della navigazione.** Ceduta l'entry, l'overlay
   che resta aperto (il dialogo di logout, che si smonta solo al cambio di rotta) non ha più una
   entry a proteggerlo finché Next non ha portato a termine la transizione. Una pressione
   «indietro» *dentro quella finestra* lascerebbe il dialogo dipinto per un attimo sopra la
   pagina precedente, prima che la navigazione in arrivo rimetta le cose a posto da sola. È
   stretta (dal tap al commit), si auto-corregge, e oggi in quella stessa finestra il
   comportamento è peggiore. Non la chiudo perché l'unico modo sarebbe sequenziare la navigazione
   dopo un `popstate` con un timer di sicurezza: un'attesa asincrona con più modi di sbagliare di
   quelli che toglie.
2. **Se un chiamante futuro dimentica l'hook** e usa `router.push` nudo da dentro un overlay,
   torna l'entry orfana (non il back inghiottito, che richiede anche una chiusura). Il ramo di
   ripiego in `esciOverlay` lo tollera senza danni di correttezza, e il commento lì lo dice; ma
   la vera rete è la guardia committata, che quel caso lo misura — più la regola permanente
   aggiunta a `CLAUDE.md` §9 («Navigare da dentro un overlay v3: MAI `router.push`»), accanto
   alla direttiva ratificata sul back, che è dove il prossimo agente la legge.
3. **`SchedaPersonaSheet` non è stato esercitato in browser** (nessuna persona nel banco). Forma
   identica a `MenuSchedaSheet`, che è stato riprodotto e verificato.
4. **Banco lasciato come trovato.** E2E-CAS-001 mai toccato (`in_lavorazione`, senza paziente,
   non consegnato). E2E-CAS-002 reso consegnabile per la durata delle misure e ripristinato a
   `in_lavorazione` / `2026-12-31`, verificato rileggendo il DB. Nessuna consegna partita, nessuna
   cassetta sparita.
