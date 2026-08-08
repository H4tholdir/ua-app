# RESOCONTO — Task D: il foglio, il passo di correzione (D322, variante A)

**Ramo:** `intervento-post-consegna` · **Salvataggio:** `b88fc37c` · **Data:** 08/08/2026
**Brief:** `.superpowers/sdd/atto-unico-task-d-brief.md`
**Mockup approvato:** `docs/design/mockups/2026-08-08-passo-correzione.html`

| cosa | esito |
|---|---|
| FASE 7 (`npm run verify:full`) | **VERIFY_EXIT=0** |
| Prove | **5648 passate · 68 saltate · 454 file** (base: 5628 \| 68 su 454) → **+20** |
| R-P4 (abbozzo inerte) | **18 su 20** asserzioni si accendono |
| Mutazioni | **20 prove su 20** viste diventare rosse rompendo apposta il codice |
| Difetti trovati nel brief | **2** (uno grave: il mockup disegna un controllo che prende 422 sempre) |
| Ritrovamenti fuori mandato | **3**, riferiti e non corretti |
| FASE 9 e gate L2 | **NON fatti** — sono il Task D-bis |

---

## 1. Da dove arrivano i valori e il gettone, e perché così

**Scelta: una proprietà nuova e OBBLIGATORIA su `DevoIntervenire`, `documento: VociDocumento`,
composta da `SchedaLavoroV3` con una funzione pura, `vociDelDocumento(lavoro)`.**

`provato:` prima di questo compito il foglio riceveva **due sole** proprietà
(`SchedaLavoroV3.tsx:590` — `lavoroId`, `descrizione`): le sei voci e il gettone di concorrenza non
arrivavano affatto.

**Perché un oggetto solo, costruito da una funzione sola, e non sei proprietà sciolte.** Il contratto
della rotta è «*i valori che hai visto sono ancora quelli*», non «la riga non è cambiata negli ultimi
200 ms»: valore mostrato e `updated_at` devono venire dalla **stessa lettura**. Con sei proprietà
separate, chiunque domani potrebbe rinfrescarne una sola e lasciare indietro il gettone — e la guardia
di concorrenza diventerebbe una guardia che non può accendersi. Con `vociDelDocumento(lavoro)` la
firma lo impedisce: si entra con **un** `lavoro` e si esce con tutto, gettone compreso.

**Perché da `SchedaLavoroV3` e non da una lettura nuova nel foglio.** La scheda ha già l'oggetto
`lavoro` intero, letto dal server in una query sola
(`src/app/(app)/lavori/[id]/page.tsx` — `select('*, paziente:pazienti(*), denti:lavori_denti(*),
prescrizione:lavori_prescrizioni(*)…')`). Una lettura nuova dal client sarebbe una seconda verità.

**Verificato che il `lavoro` porti davvero tutte e sei le voci + `updated_at`:** sì, tutte e sette.
`richiedente_nome`, `tipo_dispositivo`, `descrizione`, `denti_coinvolti`, `paziente_id` e
`updated_at` arrivano dal `select('*')`; `denti` e `prescrizione` sono embed **che quella pagina
chiede esplicitamente**. Sono però **facoltativi nel tipo** (`LavoroDettaglio.denti?`,
`.prescrizione?`), quindi il corredo li porta come `null` quando mancano e le due righe corrispondenti
diventano **non correggibili con la ragione scritta a schermo** — fail-closed, mai inventati.

🛑 **Il gettone viaggia intatto.** `atteso_updated_at: voci.updatedAt`, la stringa così com'è: nessun
`new Date(...)`, nessun `.toISOString()` di ritorno. La prova lo sorveglia con un valore che porta i
microsecondi (`2026-08-08T10:20:30.123456+00:00`) e diventa rossa alla mutazione ovvia.

---

## 2. Che cosa ho cambiato, percorso per percorso

**`src/components/features/lavori/scheda-v3/DevoIntervenire.tsx`**
- Due fasi nuove **dentro lo stesso `Sheet`**: `correzione` (l'elenco delle sei voci) e
  `correzioneCampo` (il sotto-passo di una voce). 🛑 Nessun secondo overlay.
- `scegliMotivo` instrada `errore_dato_dichiarazione` → `correzione`. Gli altri otto motivi e il
  percorso di `errore_registrazione` (Task A) **non sono toccati**.
- `VociDocumento` + `vociDelDocumento()` — esportati, §1.
- Le sei righe si generano da **`CAMPI_CORREGGIBILI_DOCUMENTO`**, non da un elenco ricopiato:
  `ETICHETTE_VOCE`/`TITOLI_VOCE` sono `Record<CampoCorreggibile, string>`, quindi un nome che entra o
  esce dall'allowlist senza la sua riga **non compila**.
- `depositaEvento()` **estratta** da `registra()`: una sola composizione del corpo dell'evento, due
  chiamanti (la strada di sempre e il tocco finale). Comportamento di `registra()` invariato — le 24
  prove preesistenti lo sorvegliano.
- `correggiERifai()`: **due chiamate in fila**, con l'evento tenuto nello stato e **riusato** se la
  seconda fallisce.
- `messaggioDiErrore()`: il messaggio della rotta si mostra **com'è scritto** (422 col percorso
  dentro, 409, `23505`); il messaggio di casa resta solo per un corpo illeggibile.
- `ricomponiDenti()` / `stessiDenti()`: il carico della **penna**, col colore per dente conservato.
- Sotto-componenti nuovi: `RigaVoce`, `PassoVoce`, `TornaAllElenco`, `RiquadroRiemissione`.

**`src/components/features/lavori/scheda-v3/SchedaLavoroV3.tsx`** — una riga sola: passa
`documento={vociDelDocumento(lavoro)}`.

**`tests/unit/DevoIntervenire.test.tsx`** — 20 prove nuove, più due ritocchi al corredo di montaggio
(la proprietà è obbligatoria) e una spia sull'hook di navigazione.

🛑 **Nessuno dei contratti fermi è stato toccato:** `correzioni.ts`, la rotta `…/riemetti`, la RPC,
`generate-ddc.ts`, `precheck.ts`, `PATCH /api/pazienti/[id]`, `PazienteEditSheet`.

---

## 3. R-P4 — il conteggio e le forme d'input

**Primo rosso:** 19 prove su 20 fallite (la ventesima, «gli altri motivi vanno alle quattro caselle
come prima», è un guardiano di regressione ed era già verde).

**Abbozzo inerte** = la fase nuova, il suo titolo e l'instradamento del motivo, **e nient'altro**:
nessuna riga, nessun sotto-passo, nessuna chiamata.
➡️ **18 asserzioni su 20 si accendono.**

| forma d'input | caso | esito |
|---|---|---|
| nessuna correzione fatta | «senza nessuna correzione il tasto è spento, e dice PERCHÉ» | coperta |
| una sola voce | «il tocco finale sono DUE chiamate in fila» | coperta |
| più voci insieme | «più voci corrette insieme viaggiano nella STESSA chiamata» | coperta |
| corretta e **rimessa al valore di prima** | «una riga rimessa al valore di prima NON è una correzione» | coperta — **decisione: NON è una correzione**, la voce esce dall'elenco e il tasto torna spento. Mandarla produrrebbe un documento identico a quello di oggi |
| valore svuotato | «una caratteristica prescritta non si può svuotare, e lo dice prima» | coperta — bloccato **prima**, col perché |
| sotto-chiave svuotata | idem (`prescrizione_caratteristiche.colore`) | coperta |
| denti azzerati | «nemmeno i denti si possono azzerare» | coperta — bloccato prima |
| smontaggio a metà | «monta, corregge, SMONTA: nessuna scrittura sul server» | coperta |
| seconda chiamata fallita e ritentata | «il ritentativo RIUSA l'evento» | coperta — l'asserzione è sul **conto** delle registrazioni, non sulla presenza di `evento_id` |
| 409 | «il 409 si mostra com'è scritto dalla rotta» | coperta |
| 422 | «il 422 si mostra col PERCORSO dentro» | coperta |
| corpo illeggibile | «un corpo illeggibile non lascia la persona senza niente» | coperta |
| paziente scelto = quello di adesso | dentro «la riga del paziente NON ha un campo di testo» (tasto spento) | coperta |
| **rete assente / `fetch` che lancia** | — | **non coperta**: il ramo `catch` c'è ed è scritto, ma in jsdom stubbare un `fetch` che rifiuta prova il `catch` di JS, non una decisione di prodotto. Dichiarata |
| **corredo senza `denti`/`prescrizione`** (embed non chiesto) | — | **non coperta da una prova**: il codice ha `perchePrecluso()` e la riga diventa non premibile con la ragione. Nessun chiamante oggi passa `null` (la pagina chiede gli embed), quindi la prova sorveglierebbe uno stato irraggiungibile — sarebbe decorazione. Dichiarata |

---

## 4. Che cosa ho rotto apposta, e che cosa si è acceso

**Quattro giri di mutazione, e il tratto è: nessuna prova nuova è rimasta verde alla sua mutazione
ovvia.** Le prove su cui vigilavo di più — perché sono quelle che nascono decorazione — sono le prime
cinque.

| mutazione | prova che si è accesa |
|---|---|
| `disabled={quanteCorrezioni === 0}` → `disabled={false}` | tasto spento senza correzioni |
| `atteso_updated_at` riparsato con `new Date(...).toISOString()` | il gettone NON si riparsa |
| `navigaDaOverlay(...)` → `router.push(...)` | le due vie navigano con `useNavigaDaOverlay` |
| tolto il confronto col valore originale nei testi | «rimessa al valore di prima» |
| l'evento si ricrea a ogni tentativo | il ritentativo RIUSA l'evento |
| `perche()` → sempre `null` | caratteristica non svuotabile · denti azzerati |
| `messaggioDiErrore` butta via il testo del server | il 409 · il 422 |
| i denti viaggiano come `{fdi, ruolo}` senza colore | i denti viaggiano come oggetti (asserzione su `scala`/`codice`) |
| una riga in meno nell'elenco (`.slice(1)`) | le sei righe · più voci insieme |
| tutti i motivi instradati a `correzione` | gli altri motivi vanno alle quattro caselle |
| `errore_dato_dichiarazione` instradato a `dettagli` | apre il passo di correzione |
| `fetch` alla riemissione dentro `chiudiVoce` | monta, corregge, SMONTA |
| `RiquadroRiemissione` non rende mai | riuscita, la schermata NOMINA la dichiarazione nuova |
| pastiglia «Da rifare» → «Corretto» | vecchio → nuovo con la pastiglia |
| il messaggio di casa diventa `''` | corpo illeggibile |
| aggiunto un campo «Nome del paziente» | la riga del paziente NON ha un campo di testo (D320) |
| tolta la via per l'Anagrafica | «Da qui non si corregge» nomina DUE cose |

⚠️ **Una correzione a me stesso.** La prova sul paziente, come l'avevo scritta prima, era
**decorazione**: `expect(screen.queryByLabelText(/Nome del paziente/i)).toBeNull()` è vero anche in una
pagina vuota, e nessuna mutazione l'avrebbe accesa. Riscritta contando i campi scrivibili del passo
(`getAllByRole('textbox').length === 1`, e quell'uno è la ricerca): adesso un campo «nome» aggiunto un
domani la fa diventare rossa. È esattamente il difetto contro cui il §6 del brief mi metteva in
guardia, e l'ho commesso lo stesso.

⚠️ **Un giro di mutazione è stato rifatto.** Il terzo conteneva anche l'instradamento a `dettagli`,
che cancella l'intero passo e fa cadere quasi tutto: i rossi non erano attribuibili. Rifatto senza
quella mutazione, così ogni rosso ha la sua causa.

---

## 5. FASE 7

```
npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
→ Test Files  448 passed | 6 skipped (454)
→ Tests       5648 passed | 68 skipped (5716)
→ ✅ DS compliance · CSRF · reduced-motion · coerenza documenti · salvataggio · progetti Playwright
→ VERIFY_EXIT=0
```

**Base dichiarata: 5628 | 68 su 454 → adesso 5648 | 68 su 454.** +20 prove, i file restano 454 (le
prove nuove stanno nel file del componente, dove stanno già le sue).

⚠️ **Un rosso vero in FASE 7, e la sua correzione.** `eslint` ha fermato la prima stesura con
`react-hooks/set-state-in-effect`: la ricerca dei pazienti azzerava l'elenco con un `setTrovati([])`
**sincrono nel corpo dell'effetto**. Non è formalismo — è un render in più a ogni battuta di tasto.
Il vuoto adesso si **deriva** (`const risultati = q.length >= 2 ? trovati : []`) invece di scriverlo.

---

## 6. Gli scostamenti dal mockup, col perché

**① 🔴 «Elementi» non è un campo di testo: è il selettore di denti.** Il mockup disegna
`<input class="data" value="dente 26">` sotto l'etichetta «Elementi».
`provato:` sul contratto `PrescrizioneContenuto.elementi` è **`number[]`**
(`src/types/domain.ts:447`); `normalizzaContenuto` **scarta** un `elementi` che non sia un array di
numeri (`prescrizione-mapper.ts:233-239`) e `validaCorrezioni` **rifiuta ciò che è stato scartato**
(`correzioni.ts:284-292`). ➡️ Un campo di testo lì avrebbe preso **422 a ogni singolo invio**, con il
messaggio «*Delle caratteristiche prescritte non si corregge «elementi»*». Ho messo l'odontogramma che
esiste già. **È un difetto del mockup, non una preferenza mia: v. §7.**

**② Il tasto «Correggi e rifai la dichiarazione» sta sul passo DOPO, non sull'elenco.** Il mockup lo
disegna in fondo all'elenco delle sei righe — ma lo disegna **identico in A e in B**, e la legenda del
mockup dichiara che *l'unica* differenza fra le due varianti è dove sta la correzione rispetto alle
quattro caselle. In **B** la correzione è ultima, quindi lì quel tasto è davvero il finale; in **A**
(la variante scelta) dopo la correzione vengono ancora le quattro domande di legge. Un tasto che dice
«Correggi e rifai la dichiarazione» e poi apre altre quattro domande è un tasto che mente.
➡️ Sull'elenco il tasto dice **«Continua»** e tiene il gate del mockup (spento finché non si corregge
niente, con lo stesso testo sotto). Il tasto **«Correggi e rifai la dichiarazione»** sta sulle quattro
caselle, dove l'atto avviene davvero, con sotto «*La dichiarazione di oggi resta in archivio come
superata: non sparisce*» — la frase che il mockup metteva sull'elenco, spostata dove la promessa si
mantiene. Sull'elenco resta il conto: «*Hai corretto N dati. Restano da rispondere le quattro domande
di legge.*»

**③ Le persone nell'elenco del paziente non si chiamano «Mario Rossi».** Il mockup mostra righe
«Mario Rossi · PZ-0042». `GET /api/pazienti` restituisce un **alias**, che è `null` quando il nome
visibile è il codice travestito (`derivaAlias`, D44), e su questo banco 911 righe su 916 hanno nome e
cognome vuoti. ➡️ Le righe mostreranno quasi sempre **il solo codice paziente**. Non è un difetto: è la
scelta GDPR già ratificata. Lo scrivo perché a schermo la lista sarà molto più asciutta del disegno.

**④ Le due vie di fuga («Impostazioni», «Anagrafica») sono `LinkQuieto`, quindi grigie, non blu.** Il
mockup le disegna blu sottolineate. `LinkQuieto` è il componente di casa per le vie di fuga e porta
con sé il bersaglio da 44 px e l'anello di messa a fuoco; scriverne uno blu a mano avrebbe voluto dire
un secondo link inline fuori dal design system. **Deferito al gate L2 del Task D-bis**, che è il posto
dove si decide se il grigio basta.

**⑤ La ricerca del paziente cerca da due caratteri in su**, e il mockup non dice da quando. Scelta mia,
dichiarata: la rotta rifiuta comunque i termini vuoti.

---

## 7. 🔴 DOVE QUESTO BRIEF SBAGLIA

**① GRAVE — il brief elenca `prescrizione_caratteristiche` come «oggetto `{elementi, colore}`»
(§3) e avverte su tre trappole, ma non sulla quarta, che è nel mockup che consegna.** Il mockup
disegna `elementi` come **campo di testo** con dentro la *stringa di visualizzazione* («dente 26»),
esattamente la stessa confusione fra **valore mostrato** e **valore da mandare** che il brief stesso
segnala per `denti_coinvolti` («*la chiave si chiama come la colonna denormalizzata e invita
all'errore*»). Chi avesse seguito il mockup alla lettera avrebbe scritto una schermata che prende
**422 a ogni invio** — e la prova unitaria sarebbe stata verde, perché il rifiuto arriva dal server.
`provato:` `domain.ts:447` (`elementi?: number[]`) · `prescrizione-mapper.ts:233-239` (scarto) ·
`correzioni.ts:284-292` (rifiuto di ciò che è stato scartato) ·
`caratteristiche-prescritte.ts:84-87` (è la stringa che il documento **stampa**, non quella che
accetta).

**② Il brief non scioglie dove sta il tasto finale, e le due frasi che ne parlano si contraddicono
sotto la variante A.** Il Passo 4 dice «*il tasto **finale** dice quello che fa*» e rimanda al mockup,
che lo disegna sull'elenco; il §1 mette l'elenco **prima** delle quattro caselle. Le due cose insieme
descrivono un tasto che promette un atto e poi apre altre quattro domande. Sciolto come al §6②.

**③ Un'imprecisione minore, segnalata perché il brief la dà per acquisita.** Il §8 elenca fra i
ritrovamenti già noti «`{"denti_coinvolti": []}` cancella tutti i denti». **Da questa rotta non è
vero:** `primoVuoto` rifiuta l'array vuoto con 422 (`correzioni.ts:142-159` + `205-214`). Resta vero
un livello più in basso (la penna), che questo compito non tocca. Lo dico solo perché una riga così,
letta come «da qui si possono cancellare», farebbe progettare una guardia che c'è già.

**Cercati e NON trovati difetti:** sull'ordine delle due chiamate, sull'`evento_id` da riusare, sul
gettone da non riparsare, sul divieto di un secondo overlay, su `paziente_id` come UUID e su
`useNavigaDaOverlay` il brief è esatto, e tutti e sei i punti sono stati verificati sul codice vero
prima di scrivere una riga.

---

## 8. Ritrovamenti FUORI MANDATO — riferiti, non corretti (R-E2)

**F1 — 🔴 Il gettone di concorrenza della scheda diventa STANTÌO dopo ogni modifica dal foglietto, e
il mio 409 ne pagherà il prezzo.** `PATCH /api/lavori/[id]` **restituisce** `updated_at`
(`route.ts:810` — `.select('id, numero_lavoro, stato, updated_at')`), ma `ModificaRigaSheet.salva()`
passa al padre il **patch della richiesta**, non la risposta (`ModificaRigaSheet.tsx:213`), e
`handleSalvato` fonde solo quello (`SchedaLavoroV3.tsx:383-386`). ➡️ Chi corregge «Note interne», la
data di consegna o la tinta e **poi** apre «Devo intervenire» per correggere un dato della
dichiarazione riceve un **409 «qualcun altro ha toccato questo lavoro»** — che è falso: è stato lui,
trenta secondi prima. È **fail-closed**, quindi non perde dati e non rompe niente; ma è un messaggio
che mente sulla causa. 📌 `handleColoreSalvato` fa la cosa giusta (`SchedaLavoroV3.tsx:508` —
`prossimo.updated_at = esito.updatedAt`), quindi la ricetta esiste già in casa: si tratta di leggere
`risposta.lavoro.updated_at` in `ModificaRigaSheet.salva` e passarlo nel patch locale. **Non l'ho
fatto**: tocca due file fuori dal mio mandato e cambia la forma di `patchLocale`, che ha altri
chiamanti.

**F2 — `tipo_dispositivo` entra nell'atto unico senza controllo di vocabolario.** `validaCorrezioni`
lo tratta come uno dei tre testi liberi (`correzioni.ts:75-79` + `218-228`): controlla che sia una
stringa e basta. L'unico argine è la `CHECK lavori_tipo_dispositivo_check` in banca dati, che scatta
**dopo** che il PDF è stato reso e caricato — cioè il costo che il riquadro in testa a `correggiERifai`
dichiara di voler evitare (**file orfano su Storage e progressivo bruciato**). La mia schermata lo
chiude in pratica (le pastiglie offrono solo i dieci `MACRO_SLUGS`), ma **il contratto resta aperto a
qualunque altro chiamante**. `correzioni.ts` è un contratto fermo: riferito, non toccato.

**F3 — Il documento stampa il tipo con un maiuscolo diverso da quello della schermata.**
`DdcTemplate.tsx:204-208` tiene un `TIPO_LABELS_DDC_OVERRIDE` («Protesi **F**issa») accanto a
`LABEL_MACRO` («Protesi fissa»). La mia riga usa `LABEL_MACRO`, perché importare da `DdcTemplate`
trascinerebbe `@react-pdf/renderer` nel pacchetto del browser. ➡️ La schermata dirà «Protesi fissa» e
la carta «Protesi Fissa». È cosmetico e già dichiarato in casa
(`tests/unit/ddc-pdf-content.test.ts` lo sorveglia come invariante), ma su una schermata che promette
di mostrare «*il valore che il documento stampa*» la differenza si vede.

---

## 9. Che cosa NON ho fatto

- 🛑 **FASE 9 (la prova a schermo su 390/768/1280, chiaro e scuro) e il GATE ESTETICO L2**: sono il
  **Task D-bis**, di un esecutore diverso. Mi sono fermato alla FASE 7, come da mandato.
  ➡️ **Da guardare per primo, al Task D-bis:** ① l'odontogramma dentro il foglio — è un componente
  nato per una pagina intera (`TabClinica`) e porta token v2.3 (`--t2`, DM Sans, `motionTokens` v2.3):
  a 390 px dentro un bottom sheet va visto sul serio, ed è il candidato numero uno a un ❌ del gate;
  ② il passo «Caratteristiche prescritte», che adesso ha **due** controlli più l'avviso ed è il più
  alto di tutti; ③ il grigio dei due link contro il blu del mockup (§6④).
- **Non ho toccato** nessuno dei contratti fermi elencati nel §7 del brief, né il percorso di
  `errore_registrazione` (Task A), né gli altri otto motivi.
- **Non ho allargato** l'elenco delle voci correggibili: restano le sei di
  `CAMPI_CORREGGIBILI_DOCUMENTO`.
- **Non ho corretto** i tre ritrovamenti fuori mandato del §8 — in particolare **F1**, che è quello
  che si vedrà per primo dal vivo.
- **Non ho lanciato `scripts/guardia-navigazione-overlay.mjs`** (la guardia manuale sugli overlay v3):
  vuole l'app accesa, le credenziali del banco e un lavoro preparato apposta. Il passo nuovo aggiunge
  **due vie di navigazione da dentro un overlay** (Impostazioni, Anagrafica), quindi quella guardia
  **è dovuta** — a mio avviso appartiene al Task D-bis insieme alla prova a schermo, e la riferisco
  qui perché non resti scoperta.
- **Non ho aggiornato `memory/MEMORY.md` né la roadmap** (BP-1): è chiusura d'ondata, non di questo
  compito.
- **Non ho pubblicato niente**: nessun `git push`, nessun merge.
