# Nome e cognome del paziente — dal wizard alla targa della cassetta

**Data:** 27/07/2026 · **Stato:** ✅ **SPEC CONFERMATA DA FRANCESCO** (27/07) — panel 3× svolto, riserve integrate
**Ratificato da Francesco:** due caselle separate nel wizard (D1/D6) · resa targa **variante 5 «Le due insieme»** (D2)
**Mockup di riferimento (già approvato):** `docs/design/mockups/2026-07-26-nomi-paziente.html`
**Percorso BP-2:** Media — nessuna migration, nessun dominio critico (§3)

> ## 🔑 In una riga
> **Il lavoro si spezza in due (D7).** La **tappa 1** fa chiedere nome e cognome separati e chiude
> tre trappole: da sola risolve la lamentela ratificata, **senza toccare `Cassetta.tsx`**, perché
> il trigger compone già `COGNOME NOME` e la sfumatura passa a mangiare il nome proprio invece del
> cognome. La **tappa 2** — la scala con l'iniziale puntata — si apre **solo se dopo la 1 il
> difetto è ancora visibile sul device**, e va ritarata: i corpi del brief erano quelli dello
> studio, non del paziente.

---

## 1. Il problema, in una riga

La targa della cassetta mostra il nome del paziente come **una parola sola**: quando non entra,
taglia la coda — e la coda è il cognome, cioè l'unica parte che serve davvero a riconoscere il
lavoro.

**La causa non è la targa: è che all'app non arriva l'informazione.** Il wizard non chiede mai
quale parola sia il cognome, e alla parete arriva una stringa già composta.

---

## 2. Che cosa c'è già (accertato leggendo il codice, non supposto)

| Fatto | Dove |
|---|---|
| `pazienti.nome` e `pazienti.cognome` **esistono già**, entrambe nullable | `src/types/database.types.ts` (Row `pazienti`) |
| Il trigger `sync_paziente_nome_cognome` compone `nome_cognome := upper(cognome)‖' '‖upper(nome)` **solo se entrambi non-null** | `supabase/migrations/002_fase2_schema.sql:121-134` |
| `POST /api/pazienti` accetta **già** `nome` e `cognome` in allowlist; `nome_cognome` è gestita dal trigger e non è impostabile dal client | `src/app/api/pazienti/route.ts:94-109` |
| Il wizard oggi manda `nome: ''` e `cognome: alias ‖ codice` — **tutta la stringa finisce nel cognome** | `src/lib/wizard/crea-lavoro.ts:134-147` (motivazione nella nota di testa, righe 19-34) |
| La parete deriva l'alias da `nome_cognome`, con la guardia del «codice travestito» | `src/lib/cassette/parco-shared.ts:69-75` |
| La targa rende `pazienteReso` con `titleCase` (il trigger scrive in MAIUSCOLO) | `src/components/ds/Cassetta.tsx:696-702`, `114-131` |
| **Esiste già una scala di gradini identica nella forma, per il nome dello studio** | `src/lib/domain/nome-studio.ts:174-208` (`costruisciScalaNome`, `CORPI_CLINICO`), consumata da `Cassetta.tsx:285-291` e `354-461` |
| Il paziente ha già un rilevatore di troncamento gemello (solo misura, nessuna scala) | `Cassetta.tsx:463-513` |

**Conseguenza, precisata in autorevisione (correggeva un'affermazione più ottimistica):** i
pazienti creati dalla **scheda paziente** hanno da sempre i due campi valorizzati, quindi il
trigger compone già `COGNOME NOME` e la loro targa **mostra già oggi il cognome davanti**. Per loro
la tappa 1 non cambia nulla — sono la prova vivente che il meccanismo funziona. Il guadagno della
tappa 1 riguarda i pazienti creati **dal wizard**, che sono la quasi totalità. L'abbreviazione
(tappa 2) sarebbe invece la sola novità anche per loro.

---

## 3. Validazione architetturale — FASE 3 (gate BP-2)

| Domanda | Risposta |
|---|---|
| **Tenant isolation** — tocca RLS o `public.current_lab_id()`? | **No.** `POST /api/pazienti` verifica che il cliente appartenga al laboratorio prima dell'insert (`route.ts:82-92`); la proiezione della parete passa dallo scoping esistente. Nessuna policy modificata |
| **Schema drift** — serve migration? `gen types` da rieseguire? | **No.** Le colonne esistono; il trigger resta invariato. Nessun `supabase gen types` |
| **API contract** — il payload rompe client esistenti? | **No.** `POST /api/pazienti` accetta già i due campi. La proiezione della parete guadagna due campi: **additiva** |
| **Rollback** — come si annulla? | **Revert del codice, nient'altro.** I nomi già scritti separati restano validi e il trigger continua a comporre `nome_cognome`: la targa precedente funzionerebbe comunque, senza dati da recuperare |
| **Dominio critico?** | Non RLS/Stripe/FatturaPA/auth/migration. **Ma tocca un dato sanitario** (nome del paziente): sottoposto esplicitamente al panel — v. §8 |

---

## 4. Le decisioni di Francesco

**Tutte prese il 27/07/2026**, tranne dove indicato. _(La spec è stata scritta a cavallo della
mezzanotte: le prime stesure portavano 26/07 per errore — corretto in autorevisione, insieme al
nome del file. È lo stesso sfasamento che `2026-07-27-post-ondata-handoff.md` documenta su di sé.)_

| # | Decisione | Testuale |
|---|---|---|
| D1 | Due caselle separate nel wizard, **entrambe facoltative** | «due caselle, versione 5» (27/07) — a valle di «facciamo chiedere nome e cognome al wizard, ovviamente un campo non obbligatorio» (**26/07**, ratifica precedente) |
| D2 | Resa targa **variante 5 «Le due insieme»** | scelta sul mockup approvato |
| D3 | **Niente indovinelli.** Se manca uno dei due pezzi, la targa resta **identica a oggi** — nessuna spaccatura euristica della stringa storica | scelta esplicita fra tre opzioni |
| D4 | La riga «Nome o alias» diventa **«Cognome» + «Nome»**; chi usa un soprannome lo scrive nel cognome, come già fa oggi. Nessun terzo campo | scelta esplicita fra tre opzioni · **emendata da U10/D6: la riga CHIUSA resta chiamata «Nome o alias»** e si apre in due caselle — la parola *alias* è l'unica cosa che dice all'utente che un nome finto va bene, e toglierla sarebbe una spinta opposta al principio ratificato, gratis. La sostanza di D4 (due caselle, nessun terzo campo) è invariata |
| D5 | **Confine:** solo la targa. Il difetto della fotografia congelata va **a backlog con la sua diagnosi**, non in questa ondata | scelta esplicita fra tre opzioni |

**Decisioni prese DOPO il panel, con le riserve sul tavolo (27/07/2026):**

| # | Decisione | Nota |
|---|---|---|
| **D6** | **Restano DUE caselle.** La contro-proposta G5 («una casella sola, `Cognome o alias`») è stata **presentata con i suoi vantaggi e respinta**: Francesco vuole anche il nome proprio quando c'è spazio | 🛑 La riserva G5 resta agli atti: se un domani la raccolta del nome di battesimo diventasse un problema, questa è la decisione da riaprire, non un'omissione |
| **D7** | **Due tappe.** Tappa 1 = il dato (wizard + trappole + coerenze). Tappa 2 = la scala, **solo se dopo la 1 il difetto è ancora visibile sul device di Francesco** | Convergenza R2 + U12; rende la parte rischiosa reversibile e tarabile su nomi veri |
| **D8** | **Il tecnico continua a vedere il nome del paziente sulla parete.** Decisione consapevole («in un laboratorio piccolo il tecnico conosce comunque i pazienti») | ⚠️ **Obbligo che ne discende:** `ANALISI/17` §pseudonimizzazione e la tabella dei ruoli dicono oggi «Tecnico → solo pseudonimo». Vanno **allineate alla decisione**, altrimenti resta una promessa scritta e non mantenuta. Non si cancella l'analisi: si annota la decisione, con data e motivo |
| **D9** | **La correzione di nome e cognome si fa dalla scheda del paziente E dalla scheda del lavoro.** Scelta con la conseguenza dichiarata sul tavolo | 🛑 **D9 SUPERA in parte D5.** La scheda del lavoro mostra `paziente_nome_snapshot`, che nessuno popola: per correggere il nome da lì bisogna prima **far comparire il nome**, cioè riparare la fotografia congelata — il lavoro che D5 aveva messo a backlog. Il confine di D5 regge ancora per la **targa**; non regge più per la **scheda del lavoro** |

| **D10** | 🔑 **DIRETTIVA DI PRODOTTO, più grande di questa spec:** «una volta creato, devo poter modificare **sempre ogni campo** del lavoro […] fino a poi la consegna con l'eventuale fatturazione». Motivo dato: l'addetta al front desk crea i lavori di fretta, **l'errore di digitazione è il caso normale, non l'eccezione** | **Incisa in `ua-app/CLAUDE.md` §9** e in `ROADMAP-UFFICIALE.md`. **Scioglie la domanda 2 del nodo qui sotto:** la finestra è creazione → consegna/fatturazione. Il modello esiste già per i prezzi (`LOCKED_PRICE_FIELDS`, editabili finché non `incluso_in_fattura`) — **si generalizza, non si reinventa** |

### ⚠️ Il nodo che D9 apre, e che questa spec NON risolve

**La fotografia esiste apposta per non cambiare.** `paziente_nome_snapshot` congela il nome al
momento della creazione del lavoro perché i documenti a valore legale (DdC, buono, etichetta, IFU,
ricevuta — Allegato XIII elemento 4) devono riportare il nome **di allora**, non quello di oggi.
Una correzione dalla scheda del lavoro mette in tensione due cose entrambe legittime: il **diritto
di rettifica** (Art. 16 GDPR) e l'**immutabilità della documentazione** (MDR Art. 10(8), 10 anni).

Le domande a cui serve una risposta **prima** di scrivere una riga di questa parte:

1. Correggere il nome **aggiorna** la fotografia, o la fotografia resta com'era?
2. ✅ **Sciolta da D10:** la finestra è **creazione → consegna/fatturazione**. Prima la correzione
   propaga, dopo no. Resta da progettare *come* (il modello `LOCKED_PRICE_FIELDS` è il precedente),
   non *se*.
3. Se un documento è già stato emesso col nome sbagliato, la via è la correzione o la
   **riemissione**? Con quale traccia?
4. La correzione è un evento da **registrare** (chi, quando, da cosa a cosa)?

🛑 **Percorso GRANDE, panel normativo dedicato, brainstorming proprio.** Non è uno spostamento di
UI: è la relazione fra un dato vivo e la sua copia legale. **Non si improvvisa in coda a questa
ondata.**

**Conseguenza sull'ordine (proposta, da ratificare a inizio prossima sessione):**

| | Contenuto | Percorso |
|---|---|---|
| **Tappa 1** | il dato: wizard, le tre trappole, la rettifica **dalla scheda del paziente**, etichetta, `ANALISI/17` | Media |
| **Tappa 1-bis** ⚠️ nuova, da D9 | la fotografia congelata + la correzione dalla scheda del lavoro | **GRANDE**, con panel normativo |
| **Tappa 2** | la scala con l'iniziale, se dopo la 1 serve ancora | Media, da ritarare |

---

## 5. La regola di scrittura — le quattro combinazioni

Questa tabella è **il cuore della tappa 1** e chiude la sola riserva su cui tutti e tre gli advisor
convergono. Il principio in una riga: **quando è piena una sola casella, ci si comporta esattamente
come la casella unica di oggi** — quel valore va nel cognome, il nome resta `''`.

| Cognome | Nome | Si scrive | `nome_cognome` | `derivaAlias` | Targa (tappa 1) |
|---|---|---|---|---|---|
| vuoto | vuoto | `cognome: <codice>` · `nome: ''` | `PZ-0042 ` | `null` (coincide col codice) | `PZ-0042` letterale |
| **pieno** | vuoto | `cognome: C` · `nome: ''` | `C ` | `C` | `C` |
| vuoto | **pieno** | **`cognome: N`** · `nome: ''` | `N ` | `N` | `N` |
| **pieno** | **pieno** | `cognome: C` · `nome: N` | `C N` | `C N` | `Cognome Nome`, sfumato se non entra |

🛑 **Tre invarianti da presidiare con test, non con commenti:**

1. **`nome` si manda SEMPRE come `''`, MAI `null`.** Con `null` il trigger non compone,
   `nome_cognome` viola il `NOT NULL` → 500 → `crea-lavoro.ts` lo tratta come bloccante →
   **muore l'intera creazione del lavoro** (R1-bis, G2).
2. **Con entrambe vuote il codice continua a finire nel cognome.** Toglierlo produce
   `nome_cognome = ' '`, che **non è nullish**: `precheck.ts:40-43` e `generate-ddc.ts:93` si
   fermano lì senza mai arrivare a `codice_paziente` → **consegna bloccata** e campo paziente vuoto
   in un documento firmato (R1, G2).
3. **Mai `cognome: <codice>` quando il nome è pieno.** Produrrebbe `PZ-0042 GIUSEPPE`, che
   `derivaAlias` non annulla → la targa scriverebbe **«Pz-0042 Giuseppe»**, col codice ricasato
   contro la regola che lo vuole sempre letterale (U1).

**Conseguenza sulla riga 4 — ed è il guadagno vero della tappa 1:** il trigger compone già
`COGNOME NOME`. Appena il wizard scrive le due parti, la sfumatura di coda mangia **il nome
proprio, non il cognome**: la lamentela ratificata («taglia la coda, sparisce il cognome») è
risolta **senza toccare `Cassetta.tsx`**.

---

## 5-bis. La resa 5 — rinviata alla tappa 2, e da ritarare

Ordine ratificato sul mockup (§ «5 · Le due insieme»): **cognome per primo e, solo se non ci sta
ancora, prima il gradino di corpo, poi l'iniziale del nome proprio in coda** — `Bagheria G.`,
`Del Grosso M. V.` (ogni nome proprio dà la sua iniziale).

🛑 **I numeri del brief iniziale erano sbagliati e non vanno riusati** (U3, verificato):

| | Valore vero | Fonte |
|---|---|---|
| Corpo del paziente | **11,5px, peso 800** (ereditato da `.ds-cassetta-cont`) | `ds-v3.css:721-728`, `902-905` |
| Corpo del clinico | 10px, peso 500 | `ds-v3.css` |
| Altezza fascia | **78px** dal 26/07 (ratifica A3) — **non 72**, che è il valore su cui il mockup ha calcolato l'89% | `ds-v3.css:334` |

La scala «10 → 9,5 → 9» è quella **dello studio** (`nome-studio.ts:181-185`): applicarla al paziente
taglierebbe subito il 13% e a 9px lo porterebbe **sotto** lo studio, ribaltando la gerarchia
ratificata il 24/07 («clinico senza grassetto, paziente in grassetto»).

**Prerequisiti perché la tappa 2 sia progettabile:**

1. **Scala del paziente dichiarata per iscritto**, con base 11,5 e un minimo deciso **per il
   paziente**, non ereditato dallo studio. Guardia px↔CSS estesa (gemella di
   `tests/unit/ds-v3/cassetta-nomi-lunghi.test.tsx`).
2. **Rimisurare l'89% sulla geometria vera (78px)**, insieme all'alternativa scartata nel mockup.
3. **Misura sull'asse orizzontale**: nel regime «clinico a 2 righe» il paziente è `nowrap` a 1 riga
   (`ds-v3.css:955-960`) e la misura verticale non può vedere nulla (R2).
4. **Collisioni sulla stringa dipinta**: se abbreviare crea due targhe identiche sulla stessa
   parete, ci si ferma al gradino precedente. Direzione di fallimento sicura — può solo rinunciare
   ad abbreviare, mai inventare (R3, U4).
5. **`aria-label` con il nome intero** (mai l'iniziale) e **`title` sul paziente**, oggi assente
   mentre il clinico ce l'ha (R6, U7).
6. **Le tre guardie del clinico**, non da reinventare: stato `fontsPronte` invece di
   `document.fonts.ready` in linea, guardia sulla larghezza nel ResizeObserver, dipendenze complete
   (R4).
7. **Costo di rendering misurato prima del merge**, con gli harness Playwright già nel repo (R4/U11).

**I sei nomi di prova**, da riusare come casi: `Li Rosa` · `Ferro Anna` · `Bagheria Giuseppe` ·
`Scognamiglio P.` · `Del Grosso Maria Vittoria` · `Tozzi Esposito C.`

---

## 6. Architettura scelta

**Il gemello.** Il paziente riusa la stessa macchina già collaudata per il nome dello studio: una
scala di gradini costruita da una **funzione pura**, consumata dal componente che scende finché
il testo entra, misurando sul rendering vero.

Le due alternative scartate:

- **Regola a soglia di caratteri** — semplice e testabile senza DOM, ma le lettere non hanno
  larghezza uguale: sbaglierebbe in entrambe le direzioni. È lo stesso motivo per cui la scala del
  clinico non è mai stata fatta così.
- **Testo pronto dal server** — il server non conosce lo spazio disponibile, che dipende da quante
  righe si prende il clinico sopra: informazione che esiste solo a rendering avvenuto.

### TAPPA 1 — il dato (questa ondata)

**Non tocca `Cassetta.tsx`, non tocca le query della parete, non tocca la ricerca.** La targa
migliora da sola perché il trigger compone `COGNOME NOME` (v. §5).

| File | Cosa cambia | Riserva chiusa |
|---|---|---|
| `src/components/features/wizard/PassoPaziente.tsx:99-105` | **UNA sola riga** nel blocco «Se vuoi, aggiungi», che si apre in **due caselle impilate, Cognome sopra**. La riga chiusa resta chiamata «Nome o alias» — la parola *alias* è l'unica affordance che autorizza il nome finto. **UI nuova → mockup obbligatorio (§0B) prima del React** | U5, U10; un solo «Salta» chiude anche U1 |
| `src/components/features/wizard/PassoPaziente.tsx:49-68` | instradamento della dettatura: parte sul **Cognome** (la casella che sopravvive sempre); la seconda si compila a mano. Una dettatura che riempia entrambe sarebbe una decisione a sé, **non implicita** | U5 |
| `src/components/features/wizard/WizardNuovoLavoro.tsx` | lo stato `alias` si sdoppia; la ripresa bozza (`RipresaSheet.tsx`) si porta dietro entrambi | — |
| `src/lib/wizard/crea-lavoro.ts:134-147` | **la tabella §5, letterale.** La nota di testa (19-34) va riscritta: descrive un contratto che questa tappa supera | R1, R1-bis, U1, G2 |
| `src/lib/wizard/crea-lavoro.ts:124-133` | paziente già esistente con lo stesso codice: oggi lo riusa e **non aggiorna mai** nome/cognome, in silenzio. Proposta: se i campi sul paziente esistente sono **vuoti**, li riempie; se sono già valorizzati **non sovrascrive** e lo dice | U9 |
| `src/app/api/pazienti/[id]/route.ts:32` | `nome` e `cognome` **entrano nell'allowlist PATCH**: oggi un cognome sbagliato non è correggibile da nessuna via — e finisce in un record decennale. Diritto di rettifica, Art. 16 | G4 |
| `src/components/features/pdf/EtichettaTemplate.tsx:117-124` | `codice_paziente` **per primo**, come già fanno Ricevuta e IFU: oggi è l'unico dei tre che non ci passa mai | G1 |
| `src/app/api/pazienti/route.ts:118` | non restituire `insertError.message` grezzo al client | G9 |
| `ANALISI/17_adempimenti_lab_2026.md` §pseudonimizzazione + tabella ruoli | allineare alla **D8**: annotare la decisione con data e motivo, senza cancellare l'analisi | D8 |

### TAPPA 2 — la scala (solo se serve ancora, dopo la prova sul device)

| File | Cosa cambia |
|---|---|
| `src/lib/domain/nome-paziente.ts` | **nuovo** — funzione pura della scala, gemella di `nome-studio.ts`, con i corpi **del paziente** (§5-bis) |
| `src/components/ds/Cassetta.tsx:696-702` + `463-513` | consumo della scala con misura **anche orizzontale** e le tre guardie del clinico |
| `src/components/ds/Cassetta.tsx:724-737` + `837` | `aria-label` intero + `title` sul paziente |
| `src/lib/cassette/parco.ts:72` · `src/app/api/cassette/lavori-liberi/route.ts:95` | la proiezione porta il valore **già deciso server-side** (R5), non la coppia grezza. `lavori-liberi` **non va dimenticata**, o dopo un'assegnazione ottimistica la targa resta indietro (R8) |
| `src/lib/cassette/parco-shared.ts:119-130` | collisioni sulla **stringa dipinta** |
| `src/components/features/cassette/filtra-cassette.ts:66` · `filtra-lavori-pila.ts:6-8` | il pagliaio resta sul **valore reso** (G8); `normalizza` non toglie la punteggiatura, quindi «bagheria g.» oggi non troverebbe nulla (R9) |
| `LavoroCassetta` (`Cassetta.tsx:190-204`) | i campi nuovi **opzionali** — la demo del catalogo costruisce `lavoro` senza i campi paziente (R8) |

### La regola che tiene in piedi tutto

**Una sola funzione compone il nome del paziente.** Il difetto originale nasce da due pezzi di
codice che componevano in modo diverso: se la regola nuova nascesse in due copie, avremmo rifatto
lo stesso errore con più campi. La stringa storica `nome_cognome` resta **derivata** dal trigger,
mai mantenuta in parallelo.

---

## 7. Fuori scope, tracciato

- **`paziente_nome_snapshot` non viene mai popolato alla creazione dal wizard**
  (`src/app/api/lavori/route.ts:171-193` non lo scrive; `crea-lavoro.ts` non lo manda; **nessun
  trigger** nelle migration — compare solo come copia in `007_rpc_rifacimento.sql:52,60`; è
  deliberatamente fuori da `PATCHABLE_FIELDS`, `lavori/[id]/route.ts:52-56`). Effetto reale e
  preesistente: nella lista lavori e nella scheda del lavoro il nome del paziente **non compare
  mai** (`SchedaLavoroV3.tsx:227` → `'—'`). Conseguenza per la tappa 2: **la risalita dalla targa
  abbreviata al nome intero non esiste**, proprio per i lavori del wizard. Tocca documenti a valore
  legale → percorso proprio. **A backlog per decisione D5** (R5/R7, U6, G1).
- **Sovra-lettura nei generatori PDF:** `generate-etichetta.ts:33`, `generate-ifu.ts:17`,
  `generate-ricevuta-consegna.ts:17`, `generate-scheda-fabbricazione.ts:19` fanno
  `paziente:pazienti(*)` — codice fiscale, data di nascita, anamnesi e note entrano nel payload di
  rendering. Proiezione esplicita, voce a sé (G1-bis).
- **`minimizzaPhi`** (`minimizza-phi.ts:3-10`) abbrevia il primo token assumendo l'ordine
  «COGNOME NOME», che **oggi è fortuito**. Renderlo deterministico è l'unico effetto
  **migliorativo** che questa change produce di rimbalzo: da tracciare, non da fare qui (G9).
- **La lista `/pazienti` cambierà resa da sola:** `PazientiSearchList.tsx:173-174` rende già
  `cognome nome` quando entrambi ci sono. Nessuno l'ha chiesto: va **atteso e dichiarato**, non
  scoperto al collaudo (G9).
- **Registro dei trattamenti e informativa** (`ANALISI/17` §4.2): la categoria raccolta passa da
  «alias libero facoltativo» a «nome e cognome strutturati». Il laboratorio è responsabile, lo
  studio è titolare — cambia ciò che il contratto di trattamento promette (G9).
- **Gate di ruolo sulla parete: NON si fa** — decisione **D8**. Resta l'obbligo di allineare
  `ANALISI/17` (in tappa 1).
- `/pazienti` e `/pazienti/[id]` restano v2.3 fino alla loro ondata (D) — nessuna migrazione per
  componente.

---

## 8. Verbale del panel advisor

Panel 3× svolto il 27/07/2026: **architettura** · **UX** · **GDPR/sicurezza** (terzo in corso).

### 8.1 Architettura — verdetto **DA RIVEDERE**

| # | Riserva | Verificata |
|---|---|---|
| **R1** | **Il lato scrittura è indefinito per 3 combinazioni su 4.** Con entrambe le caselle vuote il wizard scriverebbe `cognome: ''` → trigger → `nome_cognome = ' '` (uno spazio). In `precheck.ts:40-43` la catena `??` si ferma su `''` (non è nullish) e **non arriva mai a `codice_paziente`** → elemento 4 Allegato XIII fallito → **consegna bloccata**; `generate-ddc.ts:93` stampa un campo paziente vuoto in un documento firmato. Il fallback `cognome: alias ‖ pz` di oggi è **portante**, non una svista | ✅ letto `precheck.ts:36-51` |
| **R1-bis** | Se a casella vuota si mandasse `null` invece di `''`: il trigger non compone, `nome_cognome` viola il NOT NULL → 500 → `crea-lavoro.ts` lo tratta come bloccante → **muore l'intera creazione del lavoro**. `nome: ''` è un **invariante**, va dichiarato tale | ✅ coerente con `route.ts:98` (`body.nome ?? null`) |
| **R2** | **La scala non si accenderebbe mai dove serve.** Nel regime «clinico su 2 righe» il CSS forza il paziente a **1 riga `nowrap`** (`ds-v3.css:955-960`): `scrollHeight === clientHeight` per costruzione, e la misura del paziente è **verticale** (`Cassetta.tsx:491-495`). Serve la misura sull'asse **orizzontale**. **Corollario decisivo:** il trigger compone già `COGNOME NOME`, quindi appena il wizard scrive le due parti la coda sfumata mangia **il nome proprio, non il cognome** — la lamentela ratificata è risolta dal solo punto (a) | ✅ letto `ds-v3.css:955-960` e `Cassetta.tsx:491-495` |
| **R3** | `targheInCollisione` (`parco-shared.ts:119-130`) costruisce la chiave sul nome **intero**: «Bagheria Giuseppe» e «Bagheria Gianni» rendono entrambe «Bagheria G.» — due targhe identiche **senza disambiguatore** | ✅ letto |
| **R4** | Clonare la scala del clinico riporta in vita tre bug già pagati: `document.fonts.ready` in linea invece dello stato `fontsPronte` (nota I3, `Cassetta.tsx:301-313`), ResizeObserver **senza guardia sulla larghezza** (quella del clinico è a `445-452`), dipendenze incomplete | ✅ letto |
| **R5** | La composizione va derivata **server-side** (dove le query già vivono), mai ricomposta nel componente: altrimenti i siti tornano due. Le **politiche di abbreviazione** invece divergono legittimamente per superficie (`minimizza-phi.ts` abbrevia il cognome; `IFUTemplate`/`EtichettaTemplate` mettono l'iniziale davanti; la targa la vuole in coda) e vanno **nominate**, non unificate |  |
| **R6** | `aria-label` (`Cassetta.tsx:732-734`) non deve mai abbreviare; manca il `title` sul paziente, presente sul clinico (`833`) |  |
| **R7** | La postura GDPR va **ri-ratificata**, non ritoccata nella copy. Inoltre `generate-ddc.ts:93` inizierebbe a stampare il **nome vero** dove prima stampava alias o codice |  |
| **R8** | `lavori-liberi/route.ts:95` va incluso o la targa resta nella resa vecchia dopo un'assegnazione ottimistica; i campi nuovi su `LavoroCassetta` devono essere **opzionali** (demo catalogo); la fascia non deve poter creare uno stato 2+2 |  |
| **R9** | `normalizza` non toglie la punteggiatura: chi digita «bagheria g.» (ciò che legge) non trova nulla |  |

### 8.2 UX — verdetto **CONFERMATA CON RISERVE**

| # | Riserva | Verificata |
|---|---|---|
| **U1** | **Caso «solo nome»**: cognome vuoto + nome pieno → col fallback attuale `cognome: pz` il composto è `PZ-0042 GIUSEPPE`, che `derivaAlias` **non annulla** (non coincide col codice) → la targa scrive **«Pz-0042 Giuseppe»**, col codice ricasato. Raggiungibile in un tap («Salta») | ✅ derivato da `parco-shared.ts:69-75` |
| **U2** | **La fascia è 78px, non 72.** Il mockup dichiara 72 e su quella geometria è stato calcolato l'**89%** degli studi a due righe e l'alternativa scartata. `--altezza-fascia: 78px` dal 26/07 (ratifica A3) → **l'89% va rimisurato** | ✅ letto `ds-v3.css:334` |
| **U3** | **Tre numeri in circolazione per il corpo del paziente.** La base vera è **11,5px/800** ereditata da `.ds-cassetta-cont` (`ds-v3.css:721-728`), lo studio è 10px/500: la scala «10→9,5→9» del brief è quella **dello studio**. Partire da 10 taglia già il 13%; 9px in grassetto porta il paziente **sotto** lo studio, **ribaltando la gerarchia ratificata il 24/07**. Il mockup usa un terzo valore (10,5px inline). La scala del paziente va **dichiarata per iscritto**, con la sua base e il suo minimo | ✅ letto `ds-v3.css:721-728`, `902-905` |
| **U4** | L'iniziale **distrugge** una distinzione che la sfumatura conservava: oggi «Bagheria Giusep…» e «Bagheria Giuli…» si distinguono, domani no. Mitigazione a direzione sicura: **non abbreviare quando abbreviare crea un doppione in parete** (può solo rinunciare, mai inventare) |  |
| **U5** | **Due caselle = due dettature**, e la dettatura è la via d'ingresso per chi ha i guanti. Raccomandazione: **una sola riga** nel blocco «Se vuoi, aggiungi», che si apre in **due caselle impilate, Cognome sopra**. Il passo chiuso resta identico a oggi, il «Salta» resta **uno solo** — e questo chiude da solo U1 |  |
| **U6** | Il pannello citato nel brief è quello della cassetta **libera**: la catena vera è targa → scheda lavoro. Ma **la scheda legge `paziente_nome_snapshot`**, che nessuno popola: mostra «—». La risalita al nome intero **non esiste** proprio per i lavori del wizard | ✅ `SchedaLavoroV3.tsx:227`; nessun trigger nelle migration (solo copia in `007_rpc_rifacimento.sql:52,60`) |
| **U7** | `aria-label`: **nome intero, sempre** («Bagheria G.» letto diventa «Bagheria g punto»). Aggiungere il `title` mancante — da desktop, con l'abbreviazione, non esisterebbe **nessun** modo non assistivo di vedere il nome intero |  |
| **U8** | La stessa persona in due cassette con studi di lunghezza diversa si legge in **due modi** sulla stessa parete. Non è un bug, ma va **dichiarato come esito accettato** |  |
| **U9** | Se il paziente **esiste già** (stesso `codice_paziente`), il wizard lo riusa e **non aggiorna mai** nome e cognome: chi li scrive sul secondo lavoro non vede cambiare niente, senza messaggio |  |
| **U10** | Il copy perde «alias», che diceva in due parole che **un nome finto va bene**. «Cognome» chiede un'identità: spinta opposta al principio ratificato, gratis. E un soprannome finirebbe in un campo chiamato «Cognome» — semanticamente falso |  |
| **U11** | Due misure DOM per cassetta su una parete da trenta, su WebKit: rischio di un **lampo del nome intero** prima del rimpicciolimento. Da misurare su device |  |
| **U12** | **912 pazienti su 915 non hanno nome** nel database di prova _(riportato dall'advisor, non verificabile da qui — MCP Supabase non autenticato)_: la resa nuova si vedrà **solo** sui pazienti creati dopo il cambio |  |

### 8.3 GDPR / sicurezza — verdetto **DA RIVEDERE**

| # | Riserva | Verificata |
|---|---|---|
| **G1** | **Due PDF leggono GIÀ `pazienti.nome`/`cognome`.** `EtichettaTemplate.tsx:117-124` → snapshot, poi `cognome` + iniziale di `nome`, **senza mai passare da `codice_paziente`**; `IFUTemplate.tsx:170-176` → **`codice_paziente` per primo** (quindi IFU è protetta), poi nome/cognome, poi snapshot; `RicevutaConsegnaTemplate.tsx:186-188` → codice per primo. **Il canale non è nuovo** e il delta è modesto (l'Etichetta oggi stampa già la stringa unica intera; domani stamperebbe `G. Bagheria` — **meno** dato, non di più). Il difetto da chiudere è **l'incoerenza**: `codice_paziente` per primo anche nell'Etichetta | ✅ letti tutti e tre |
| **G1-bis** | **Sovra-lettura:** `generate-etichetta.ts:33`, `generate-ifu.ts:17`, `generate-ricevuta-consegna.ts:17`, `generate-scheda-fabbricazione.ts:19` fanno `paziente:pazienti(*)` — codice fiscale, data di nascita, anamnesi e note entrano nel payload di rendering. Proiezione esplicita |  |
| **G2** | Stessa sostanza di R1/R1-bis: `''` sempre, mai `null`, e il codice continua a finire in `nome_cognome` quando entrambe le caselle sono vuote. Nota: il `?? codice_paziente` di `generate-ddc.ts:93` è **già oggi codice morto** per via del NOT NULL | ✅ |
| **G3** | **Nessun gate di ruolo sulla parete.** `(app)/cassette/page.tsx:20` ammette **`tecnico`** e `front_desk`; `getParete` usa il service client (bypassa RLS) e consegna il nome del paziente a tutti. La RLS di `pazienti` è **solo tenant** e il commento nello schema dichiara che «la policy granulare deve essere implementata a livello app». `ANALISI/17` §pseudonimizzazione e la tabella dei ruoli impegnano il prodotto a **«Tecnico → solo pseudonimo»**. Oggi trapela testo libero; dopo, identità strutturata e affidabile. **Buco preesistente che questa change alimenta** — il gate va server-side in `getParete`/`lavori-liberi` | ✅ letti `page.tsx:20` e `ANALISI/17:864-895` |
| **G3-bis** | **Isolamento fra laboratori: a posto.** `parco.ts:48-51,73` e `lavori-liberi/route.ts:91-99` filtrano tutti su `laboratorio_id`. L'aggiunta non amplia l'esposizione fra tenant, la amplia fra **ruoli** | ✅ |
| **G4** | **Il nome non è rettificabile da nessuna API.** L'allowlist di `PATCH /api/pazienti/[id]` è `['codice_paziente','note','anamnesi','asl','sesso','data_nascita']`: `nome` e `cognome` **non ci sono**. Un cognome scritto male non si corregge più. E finisce in `dichiarazioni_conformita.paziente_nome`, record decennale (MDR Art. 10(8) prevale su Art. 17 GDPR). Dato facoltativo, non necessario per l'Allegato XIII (dove `ANALISI/17:121` dice che **il codice pseudonimizzato basta**), immutabile, decennale → tensione con Art. 5.1.c e Art. 16 | ✅ letta l'allowlist |
| **G5** | **Contro-proposta: UNA casella «Cognome o alias», non due.** Lo scopo ratificato — rendere il cognome per intero — è servito interamente da una casella sola: il suo contenuto *è* il cognome, si rende intero, e **non si raccoglie il nome di battesimo**. Conserva la parola «alias», che è l'affordance che autorizza l'input pseudonimo. Nessuna categoria di dato nuova; G2 e G4 si riducono. **Contraddice la decisione D1/D4 di Francesco → decisione sua, riportata come riserva** |  |
| **G6** | Due sorgenti in conflitto: con solo il cognome compilato, `nome_cognome` = `'ROSSI '` → `derivaAlias` = `'ROSSI'` → la targa lo mostrerebbe **comunque**, contro la regola «solo se entrambi valorizzati». Una sola sorgente |  |
| **G7** | Se `nome`/`cognome` si aggiungono lasciando `nome_cognome` nelle select, l'identità viaggia **due volte** al browser. Persistenza coperta: il service worker non mette mai in cache le risposte di navigazione (`public/sw.js:29-38`) |  |
| **G8** | Ricerca: qualitativamente invariata **se** il pagliaio resta sul solo valore reso. Aggiungere `nome`/`cognome` al pagliaio farebbe della parete un lookup anagrafico |  |
| **G9** | Residui: registro dei trattamenti e informativa (`ANALISI/17` §4.2) — la categoria passa da «alias libero facoltativo» a «nome e cognome strutturati» · `POST /api/pazienti:118` restituisce `insertError.message` grezzo al client · `minimizzaPhi` assume l'ordine «COGNOME NOME», oggi **fortuito**: renderlo deterministico è l'unico effetto **migliorativo** della change · `PazientiSearchList.tsx:173-174` rende già `cognome nome` quando ci sono entrambi, quindi la lista `/pazienti` **cambierà resa senza che nessuno l'abbia chiesto** |  |

### 8.4 Convergenze del panel (dove due o tre concordano)

1. **Il lato scrittura va definito per tutte e quattro le combinazioni** — R1/R1-bis, U1, G2/G6. È l'unico punto su cui **tutti e tre** convergono, e ha la conseguenza peggiore: consegna bloccata o codice ricasato in targa.
2. **Prima il dato, poi (forse) la scala** — R2, U12, e implicitamente G5. Il valore ratificato arriva dal punto (a); il punto (b) è un miglioramento separabile e reversibile.
3. **Le targhe gemelle** — R3, U4. Da mitigare rinunciando ad abbreviare, mai inventando.
4. **`aria-label` intero + `title` mancante** — R6, U7.
5. **La scheda del lavoro non risale al nome intero** — R5/R7, U6, G1 (lo snapshot non è scritto da nessuno).

---

## 9. Come si verifica — tappa 1

**Il cuore dei test è la tabella §5: una prova per riga, e per ciascuna si verifica la catena
intera fino a valle** — non solo che cosa viene scritto, ma che cosa ne fanno `derivaAlias`, il
precheck di consegna e i generatori PDF. È il modo in cui la trappola della consegna bloccata
sarebbe stata vista prima, invece che settimane dopo:

| Prova | Cosa deve risultare |
|---|---|
| entrambe vuote | il codice finisce in `nome_cognome`; `haPaziente === true` in `precheck.ts`; la DdC riporta il codice |
| solo cognome | `nome_cognome` = `COGNOME `; targa = il cognome |
| **solo nome** | va nel **cognome**; targa = quel nome; **mai** `PZ-0042 GIUSEPPE` |
| entrambe | `nome_cognome` = `COGNOME NOME`; targa col cognome davanti |
| `nome` mandato `null` | **non deve poter accadere**: prova di regressione sull'invariante `''` |
| paziente già esistente | i campi vuoti si riempiono; quelli valorizzati non si sovrascrivono in silenzio |
| PATCH di rettifica | `nome`/`cognome` modificabili; gli altri campi restano fuori dall'allowlist |

- **UI:** mockup approvato prima del React; poi FASE 9 su 390/768/1280 × chiaro/scuro,
  **FASE 9b gate estetico L2** sulla sola superficie del passo 3.
- **FASE 7 completa** con output reale: `npx tsc --noEmit` · `npx vitest run` · `npx next build`.
  Prima del commit anche `npx eslint src/` — il pre-commit ferma su `--max-warnings=0` e `tsc` non
  vede gli import rimasti senza uso.
- **Prova sul device di Francesco** al termine: è la misura che decide se la tappa 2 serve davvero
  (D7).

### Tappa 2 — verifica aggiuntiva (quando e se si apre)

Funzione pura sui sei nomi × i due regimi; comportamento della scala **real-render** (jsdom non
può validarla: `getComputedStyle().lineHeight` risolve a `"normal"` e il codice cade sul confronto
px, `Cassetta.tsx:496-498`); guardia px↔CSS gemella di `cassetta-nomi-lunghi.test.tsx`; conteggio
dei layout forzati per cassetta su una parete piena, prima del merge.
