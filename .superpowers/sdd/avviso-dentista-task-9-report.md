# Task 9 — La sezione «Comunicazioni» nella scheda del cliente — resoconto

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna`
**Brief:** `.superpowers/sdd/avviso-dentista-task-9-brief.md`

---

## 0. La struttura di `clienti/[id]/page.tsx` — MAI letta prima, primo passo del mandato

File letto INTERO prima di ogni modifica (441 righe nella versione di partenza, 560 dopo). Struttura:

- **1-51**: import · `type PageProps` · `type ClienteDettaglio` (le colonne di `clienti` che la
  pagina legge) · `type UltimaEmissioneDpa`.
- **52-117**: due componenti server di supporto, `InfoRow` (etichetta + valore, `null` → non
  renderizza niente) e `SectionCard` (titolo uppercase + `border-top` + figli in colonna). **Sono
  il vocabolario visivo di TUTTA la pagina** — ogni sezione è una `SectionCard`, ogni campo
  un'`InfoRow`. Nessun import da `design-system/tokens.ts`: gli stili sono inline con variabili CSS
  dirette (`var(--t1, #1C1916)`, `var(--surface, #E4DFD9)`, ecc.) — convenzione propria di questo
  file, non della spec v2.3 generale.
- **119-282** (nella versione di partenza): il componente pagina `ClienteDettaglioPage`.
  - **120-142**: `params` → `id` · `getLabContext()` (404 se manca `laboratorioId`) ·
    `getServiceClient()` · lettura `clienti` con `.eq('id', id).eq('laboratorio_id', …).is('deleted_at', null).single()` → 404 se assente.
  - **149-196**: **DUE letture in `Promise.all`**, deliberatamente parallele (commento esplicito:
    «due andate e ritorni in sequenza si SOMMANO»): l'ultima emissione del DPA
    (`data_processing_agreements`) e i dati fiscali del laboratorio (`laboratori`).
  - **198-256**: gestione dei DUE guasti di lettura (mai confusi con «non c'è»), formattazione
    della data (`timeZone: 'Europe/Rome'` esplicito — difetto già pagato altrove nell'ondata),
    calcolo di `mancanzaDpa` (predicato `&&`, non `||` — D159) e `puoEmettere` (D158: cortesia
    visiva, non un controllo di sicurezza — la vera guardia è nella rotta).
  - **258-282**: costruzione di `modButton` (`ClienteModificaButton`).
  - **284-441**: il render — `PageWrapper` → `AppHeader` → sezioni in `SectionCard`: Anagrafica,
    Dati fiscali, Commerciale, Note (condizionale), Portale dentista (`PortaleLinkButtons`),
    `PortaleFatturazioneCard` (fuori da `SectionCard`, ha la sua card interna), Privacy — GDPR
    (tasto DPA condizionato dal ruolo + tre casi sull'ultima emissione: guasto / emessa / mai
    emessa).

**Stile:** v2.3 legacy confermato — nessun `data-ds="v3"`, nessun import da `design-system/v3/` né
da `components/ds/`. Pattern: card con `SectionCard`, righe con `InfoRow` o markup ad hoc quando
serve più struttura di «etichetta + valore» (come per il badge «Non soggetto a fattura
elettronica», l'unico precedente di *pastiglia colorata* nella pagina — usa `--amber`, riservato a
un avviso informativo, non a un allarme).

**Come carica i dati:** SEMPRE `getServiceClient()` (client di servizio, bypassa la RLS) con
filtro `laboratorio_id` ESPLICITO su ogni tabella — mai un affidamento implicito alla RLS. Letture
indipendenti raggruppate in `Promise.all`, letture dipendenti in sequenza dopo.

---

## 1. I due chiamanti veri di `archivioCliente` (letti prima di progettare il cancello)

1. **`src/app/portale/[token]/page.tsx:467`** (Task 8, sul ramo da stamattina): `const righeAvviso
   = await archivioCliente(svc, { clienteId: cliente.id, laboratorioId: cliente.laboratorio_id
   })`. Nessun ruolo utente — l'autorità è il **token** del cliente, verificato più sopra nello
   stesso file. Il commento alla riga 465-466 lo dice esplicitamente: «`archivioCliente` non ha un
   cancello di ruolo — per il portale va bene così, il cancello è il token».
2. **`clienti/[id]/page.tsx`** (questo task): l'autorità è il **ruolo** dell'utente autenticato
   (`context.ruolo`, da `getLabContext()`), ⚖️ D352.

---

## 2. La forma scelta per il cancello, e perché

**Secondo entry point che avvolge il primo — `archivioPerSchedaCliente` in `src/lib/avvisi/queries.ts`**,
con la stessa identica forma di `avvisoPerLaScheda`/`avvisoPerLaStriscia` (Task 6/7, già in
quel file): controlla `puoVedereArchivioCliente(ruolo)` **prima** di interrogare il banco, e
ritorna `[]` senza toccare `svc` se il ruolo non passa — fail-closed, nessun secondo ramo.
`archivioCliente` resta **invariata** (firma e corpo) ed è tuttora la funzione che il portale
chiama; questa pagina chiama `archivioPerSchedaCliente`, mai la grezza.

**Perché questa forma e non le altre due indicate dal brief (§2):**
- *Blocco nudo dentro `archivioCliente`*: scartato per esplicito divieto del brief, e comunque
  avrebbe rotto il portale (che non ha un ruolo da passare) o l'avrebbe costretto a un ruolo finto.
- *Parametro discriminato* (`{ tipo: 'portale' } | { tipo: 'scheda', ruolo }`): scartato perché più
  complesso senza portare nessun vantaggio — il portale non deve sapere che esiste un'altra
  autorità, e un parametro discriminato l'avrebbe comunque toccato (bisognava passare `{ tipo:
  'portale' }` da lì).
- **Secondo entry point** (scelto): zero tocchi al chiamante del portale, stessa forma già in casa
  per lo stesso identico problema (`avvisoPerLaScheda` sopra `avvisiDaComunicare`), una sola
  funzione nuova da capire.

**La costante di ruolo è NUOVA**: `RUOLI_ARCHIVIO_CLIENTE` in `src/lib/avvisi/ruoli.ts`, non un
alias di `RUOLI_CHIUSURA_AVVISO` — per mandato esplicito del brief §2. Una prova dedicata
(`avvisi-ruoli.test.ts`) verifica che le due costanti NON siano lo stesso riferimento (`not.toBe`),
oltre al contenuto identico di oggi.

**La lettura di supporto per «chi»** (`nomiComunicatori`, su `utenti`) vive in un file nuovo,
`src/lib/avvisi/archivio.ts`, non in `queries.ts`: stesso principio già applicato da `portale.ts`
al Task 8 — `queries.ts` legge `avvisi_dentista` (e i suoi cancelli), `archivio.ts` legge
`utenti` e compone la presentazione. Non è gated per ruolo al suo interno: riceve solo gli id
`comunicato_da` delle righe **già filtrate** da `archivioPerSchedaCliente`, quindi per un ruolo
escluso la lista di id è sempre vuota e la funzione non interroga nulla (verificato dal test
«nessun id → nessuna lettura»).

---

## 3. Evidenza TDD

### 3.1 — `puoVedereArchivioCliente` / `RUOLI_ARCHIVIO_CLIENTE` (`tests/unit/avvisi-ruoli.test.ts`)

RED: 8 prove nuove, `RUOLI_ARCHIVIO_CLIENTE is not iterable` / import mancante (8 falliscono, 15
preesistenti passano). GREEN dopo l'implementazione: **23/23**.

### 3.2 — `archivioPerSchedaCliente` (`tests/unit/avvisi-queries.test.ts`)

RED: 10 prove nuove, `archivioPerSchedaCliente is not a function` (10 falliscono, 36 preesistenti
passano).

**Abbozzo inerte (R-P4)**: `archivioPerSchedaCliente` che ritorna `[]` sempre, ignorando `ruolo` e
senza mai chiamare `svc`. Conteggio: **7 su 10** si accendono (i tre ammessi, la prova sui cinque
ruoli, «escluso vs vuoto», filtri/ordine, guasto-nei-log). **3 su 10 passano anche con l'abbozzo
inerte**, e non per debolezza della prova: sono i due esclusi e il fail-closed, che con QUALSIASI
implementazione fail-closed (anche muta) ricevono `[]` — è la stessa asimmetria già misurata al
Task 6/7 su `avvisoPerLaScheda`/`avvisoPerLaStriscia`.

GREEN dopo l'implementazione vera: **46/46** (36 preesistenti + 10 nuove).

### 3.3 — `nomiComunicatori` / `costruisciRigheArchivio` / `formattaQuando` (`tests/unit/avvisi-archivio.test.ts`, file nuovo)

RED: import fallito (modulo inesistente), 0 prove eseguibili. Non serve un abbozzo inerte separato
per questo file: le funzioni sono pure/di lettura semplice, senza un cancello booleano da poter
capovolgere in modo invisibile — l'abbozzo inerte è già stato fatto (e conta) dove serviva, sul
cancello di ruolo (§3.2).

GREEN dopo l'implementazione: **16/16**, incluse le prove esplicite del brief §4 —
- ⑤ due comunicazioni chiuse (dall'app con testo, a voce) → quando/come/chi/vista tutti corretti
  per riga, comprese le due date in Europe/Rome (`9 agosto 2026, 14:00` da un `Z` UTC di mezzogiorno).
- ⑥ riga `da_comunicare` → `chiuso: false`, `quando: null`, `chi: null`, `comeLabel: 'Da comunicare'`
  (asserito anche `not.toMatch(/urgent|attenzione|!|⚠/i)`).
- ⑦ archivio vuoto → `[]`, nessun errore.
- ⑧ D336 → `campiDescritti` porta le descrizioni italiane (`'la descrizione'`), mai la chiave
  tecnica grezza (`'descrizione'`).
- più: `chi` sconosciuto → ripiego dichiarato (mai `null`/vuoto su una riga chiusa); stato fuori
  vocabolario → riga NON scompare, log scritto; `deleted_at` NON filtrato su `nomiComunicatori`
  (v. §4 sotto).

### 3.4 — Il portale non si è rotto (brief §4, prova ⑨)

`archivioCliente` non ha cambiato firma: nessuna modifica a `avvisi-portale.test.ts` è stata
necessaria. Confermato dalla suite intera (§5).

### 3.5 — Una prova preesistente ROTTA dalla modifica a `page.tsx`, e riparata

`tests/unit/cliente-dpa-ultima-emissione.test.ts` è l'UNICA prova unitaria che RENDE
`ClienteDettaglioPage` per vero (con un mock di `svc.from` che lancia un errore su ogni tabella non
prevista). Aggiungere la lettura di `archivioPerSchedaCliente` all'interno della pagina ha fatto
scattare quel guardrail: 22 prove su 24 sono diventate rosse (`Mock scheda cliente: tabella
inattesa «avvisi_dentista»`). **Non è un difetto fuori mandato (R-E2): è la conseguenza diretta e
prevista di questo stesso task**, quindi si ripara qui, non si riferisce. Aggiunta una riga al mock
(`if (tabella === 'avvisi_dentista') return createChain({ data: [], error: null })`), con un
commento che spiega perché non serve anche un ramo per `utenti` (lista vuota → `nomiComunicatori`
non interroga nulla). Riverificata anche la prova A2 (le due letture DPA/laboratorio partono
insieme): l'ordine relativo fra `data_processing_agreements` e `laboratori` non cambia, perché
`archivioPerSchedaCliente` è il terzo elemento dell'array passato a `Promise.all` e viene valutato
DOPO gli altri due (ordine di valutazione sincrono di un array literal). Tutte e 24 le prove sono
tornate verdi.

---

## 4. Riserve — dove ho scelto e dove il mandato lascia un vuoto

**① L'archivio non porta un riferimento al LAVORO a schermo.** `AvvisoRiga` porta `lavoro_id` (un
`uuid`, non leggibile) ma non `numero_lavoro` — per averlo servirebbe una SECONDA lettura di
supporto su `lavori`, che il brief §1 non menziona («una lettura di supporto **per i nomi di chi
ha comunicato**» è l'UNICA licenza esplicita per una query oltre `archivioCliente`). Ho scelto di
attenermi alla lettera del mandato e NON aggiungere quella lettura: l'interfaccia `RigaArchivioCliente`
porta `lavoroId` (grezzo) ma la card oggi non lo mostra. **Conseguenza pratica:** un cliente con
comunicazioni su più lavori vede un archivio senza modo di distinguere a quale lavoro si riferisce
ciascuna riga — un vuoto reale, non cosmetico. Segnalo esplicitamente perché il brief §1 elenca
solo quattro campi (quando/come/chi/vista) e non ne discute un quinto: è un punto che merita una
decisione dichiarata (aggiungere la lettura su `lavori`, o accettare il limite) prima che l'ondata
si chiuda — non l'ho presa da solo perché eccederebbe la licenza di lettura che il brief accorda.

**② `nomiComunicatori` NON filtra `deleted_at`, deviando dalla regola di casa «N11: filtro
`deleted_at` SEMPRE».** Deviazione dichiarata, non dimenticata: la migration `20260809123206`
(righe 48-54) spiega che `comunicato_da` è `REFERENCES public.utenti(id)` **senza** `ON DELETE SET
NULL` proprio perché il CHECK `avviso_comunicato_ha_autore_e_data` pretende l'autore su ogni riga
chiusa — l'autore deve sopravvivere alla cancellazione (soft) dell'utente. Filtrare `deleted_at IS
NULL` nella lettura dei nomi avrebbe fatto sparire dall'archivio (che è la prova ex Art. 5(2) GDPR)
il nome di chi ha lasciato il laboratorio: l'esatto contrario della scelta già incisa nello schema.
Motivato nel codice (`archivio.ts`, commento su `nomiComunicatori`) e provato (`avvisi-archivio.test.ts`,
prova dedicata).

**③ Nessun mockup HTML nuovo in `docs/design/mockups/`.** CLAUDE.md §0B/§4 chiede in generale
un'approvazione visiva prima di ogni codice UI, ma il mockup dell'ondata
(`2026-08-09-avviso-al-dentista.html`) copre solo le superfici A (scheda del lavoro) e B (portale)
— la scheda cliente non è mai stata disegnata, e il brief Task 9 esplicitamente rimanda «FASE 9
(browser) e gate estetico L2» al Task 10. Ho scelto di NON produrre un mockup a sé, e di riusare
**esattamente** il vocabolario visivo già approvato della pagina (`SectionCard`/`InfoRow`, stessi
token, stesso font, nessun colore nuovo fuori da `--elv`/`--t2`/`--t3` già in uso) invece di
introdurre un pattern nuovo. È una scelta di prudenza (estendere l'esistente, non inventare), non
un'esenzione che mi sono dato da solo: la segnalo perché la regola generale non distingue questo
caso, e se Francesco preferisce comunque un mockup a sé per «Comunicazioni», il Task 10 (che ha
già in mandato il gate estetico L2) è il punto naturale per produrlo prima del merge finale.

**④ Un ruolo escluso e un archivio genuinamente vuoto mostrano la STESSA schermata**
(«Nessuna comunicazione registrata per questo studio.»), per scelta deliberata: la sezione resta
SEMPRE a schermo (mai `{condizione && <SectionCard>}`), sul modello della card DPA che già oggi
mostra sempre un esito (mai il vuoto). L'alternativa — un messaggio tipo «non hai il permesso di
vedere questa sezione» — rivelerebbe a un `admin_rete`/`admin_sistema` che esistono dati nascosti,
un'informazione che D352 non vuole trapelare. Motivato nel commento sopra la `SectionCard`.

**⑤ Limiti noti, non corretti (fuori mandato):** l'ordine dell'archivio segue `created_at DESC`
(da `archivioCliente`), non `comunicato_at` — la rotta di chiusura (`avviso/route.ts:391-395`)
documenta che i due orologi (database vs processo Node) possono divergere di poco, quindi le date
mostrate non sono garantite strettamente monotone riga per riga. E ⚖️ D354 (un atto chiude tutte le
righe aperte di un lavoro) significa che più righe distinte possono condividere lo stesso
`comunicato_at`/`comunicato_da`/`stato`, differendo solo nei campi corretti — l'archivio le mostra
comunque come atti separati, correttamente, ma un lettore che non conosce D354 potrebbe chiedersi
perché due righe hanno lo stesso istante.

---

## 5. Comando FASE 7 — output reale

```
npx tsc --noEmit            → nessun output, exit 0
npx vitest run               → Test Files  461 passed | 11 skipped (472)
                                Tests  6045 passed | 137 skipped (6182)
npx next build                → completata, exit 0, /clienti/[id] presente come route ƒ (dinamica)
```

(gli 11 file/137 test skipped sono le prove d'integrazione che richiedono il banco vero — invariato
rispetto a prima di questo task, non introdotto da esso.)

---

## 6. File toccati

- `src/lib/avvisi/ruoli.ts` — `RUOLI_ARCHIVIO_CLIENTE` + `puoVedereArchivioCliente` (nuovi export)
- `src/lib/avvisi/queries.ts` — `archivioPerSchedaCliente` (nuovo export); `archivioCliente` invariata
- `src/lib/avvisi/archivio.ts` — **nuovo file**: `formattaQuando`, `nomiComunicatori`,
  `costruisciRigheArchivio`, `RigaArchivioCliente`
- `src/app/(app)/clienti/[id]/page.tsx` — import, componente `RigaComunicazione`, lettura in
  `Promise.all`, risoluzione nomi, sezione «Comunicazioni»
- `tests/unit/avvisi-ruoli.test.ts` — blocco nuovo per D352
- `tests/unit/avvisi-queries.test.ts` — blocco nuovo per `archivioPerSchedaCliente`
- `tests/unit/avvisi-archivio.test.ts` — **nuovo file**
- `tests/unit/cliente-dpa-ultima-emissione.test.ts` — una riga di mock aggiunta (riparazione, §3.5)

---

## 7. Autorevisione

- [x] Ogni campo verificato sul tipo prima dell'uso (`AvvisoRiga` in `queries.ts:54`,
  `utenti` in `database.types.ts`) — nessuno dei «due errori di campo» delle trappole note.
- [x] Il cancello provato per inversione (capovolgerlo renderebbe rosse tutte le prove sui cinque
  ruoli) e per lato (AMMESSI ed ESCLUSI in blocchi separati, non un solo test che «esiste»).
- [x] D336 provata esplicitamente (nomi di campo, mai valori).
- [x] D337 provata sul dato (nessuna parola d'urgenza) e argomentata sullo stile (nessun colore
  d'allarme, stessa forma per ogni stato).
- [x] Zero migration, zero import v3, `archivioCliente` invariata, portale non toccato.
- [x] FASE 7 completa con output reale incollato.
- [ ] Riserva aperta ①: nessun riferimento al lavoro nell'archivio — segnalata, non risolta
  (fuori dalla licenza di lettura del brief).
- [ ] Riserva aperta ③: nessun mockup dedicato — segnalata, deferita al Task 10 se richiesto.
