# P31 — Due numeri per il cliente: il telefono dello studio e il cellulare WhatsApp

**Data:** 3 agosto 2026 (`provato:` `date` → `2026-08-03 13:08:15 CEST`)
**Decide:** Francesco Formicola — **D181 · D182 · D183 · D184**, verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, sessantasettesima tornata
**Stato:** ratificata in sessione · **precede** il React di P30 (D180, riserva ③)
**Percorso:** tocca la banca dati → **dominio critico → GRANDE** (`ua-app/CLAUDE.md` §0C)

---

## 1. Il problema

`clienti` ha **un solo** campo per il telefono, e quel campo serve a due cose che non possono essere lo
stesso numero:

- **chiamare lo studio** — un fisso va benissimo, e finisce sui documenti;
- **mandare un messaggio WhatsApp** — serve un cellulare, e un fisso non funziona.

Il commento nello schema dice «*Usato per WhatsApp*» (`supabase/schema.sql:372`), ma la scheda del
cliente lo mostra come «Telefono» e ci costruisce sopra un `href="tel:"`. **I due usi sono entrambi
legittimi: sono due dati diversi con lo stesso nome.**

**Tre fatti misurati il 03/08/2026** — ognuno ha cambiato il perimetro rispetto alla voce di roadmap:

| # | fatto | `provato:` |
|---|---|---|
| ① | **Non c'è nessun travaso da progettare.** La voce dava per delicato il capire se i numeri già inseriti fossero fissi o cellulari | **39 clienti, UNO SOLO** ha `telefono` valorizzato (`0976…`, un fisso di Muro Lucano coerente con l'indirizzo della stessa scheda); **ZERO** hanno `email` |
| ② | **Le due schermate che scrivono quel campo si contraddicono già oggi** | `ClienteEditSheet.tsx:324-330` → etichetta «**Telefono**», esempio `+39 02 1234567` (**fisso**, col prefisso) · `NuovoDentistaSheet.tsx:106-110` → etichetta «**Cellulare/WhatsApp**», esempio `333 1234567` (**cellulare**, **senza** prefisso) |
| ③ | **Nessun punto del programma aggiunge il prefisso internazionale**, quindi anche un cellulare corretto produce un collegamento senza `39` | `buildWhatsappUrl` (`src/lib/consegna/whatsapp-template.ts:35-40`) fa `phone.replace(/\D/g,'')` e lo attacca a `https://wa.me/`. Il confronto in casa: `PecSetupWidget.tsx:164-167` funziona **solo perché** `NEXT_PUBLIC_SUPPORT_PHONE` è già `+39…` e gli basta togliere il `+` |

➡️ **Conseguenza di ③:** la seconda colonna, da sola, **eredita lo stesso difetto**. La normalizzazione
entra nel perimetro di questa spec.

---

## 2. Le decisioni

| | |
|---|---|
| **D181** | **Due campi.** `telefono` = **telefono dello studio** (può essere un fisso, va sui documenti). **`cellulare_whatsapp`** = numero a cui arrivano consegne e solleciti |
| **D182** | **Il prefisso lo mette UÀ.** Chi sta al banco scrive il numero come lo scrive sempre; il programma aggiunge il `39` quando costruisce il collegamento, e rispetta il `+` se c'è |
| **D183** | **Se il cellulare WhatsApp manca, il tasto lo chiede e lo salva** — foglio a un campo solo, salvataggio in anagrafica **prima** di aprire WhatsApp, poi il messaggio |
| **D184** | **Il wizard «nuovo dentista» chiede ENTRAMBI i numeri, con lo stesso peso**, e sotto il cellulare WhatsApp è scritto a che cosa serve (§4.5) |

**Perché `telefono` resta il numero dello studio e non diventa il cellulare.** L'unico dato vero in
banca dati è un **fisso**: quel campo **si comporta già** da telefono dello studio. Rinominarlo
significherebbe spostare 39 righe per farne combaciare una; lasciarlo dov'è costa **la correzione di un
commento** che oggi dice il falso.

---

## 3. Il modello dei dati

```sql
ALTER TABLE clienti ADD COLUMN cellulare_whatsapp TEXT;
COMMENT ON COLUMN clienti.telefono IS
  'Telefono dello studio: si chiama, va sui documenti. Può essere un fisso. NON è il numero WhatsApp (v. cellulare_whatsapp) — P31, D181.';
COMMENT ON COLUMN clienti.cellulare_whatsapp IS
  'Cellulare su cui il dentista riceve i messaggi (consegna, solleciti). Il prefisso internazionale lo aggiunge il codice, non l''utente — P31, D182.';
```

> 🔧 **CORRETTO il 03/08 dalla revisione del compito 1, e il difetto era di questo piano.** La prima
> stesura scriveva `Puo''` e `e''` dentro la stringa di `COMMENT ON`, credendo che l'accento andasse
> raddoppiato come l'apostrofo. **È falso:** in SQL due apici consecutivi valgono **un apostrofo
> letterale**, quindi `Puo''` finisce nel database come `Puo'`, non come `Può`. L'accento non ha
> bisogno di alcun escaping. `provato:` `supabase/migrations/20260803090000_*.sql` — stessa cartella,
> stesso giorno — usa l'accento **vero** non raddoppiato accanto a un apostrofo **correttamente**
> raddoppiato (`dell''emissione`). 🔑 **Solo l'apostrofo si raddoppia, mai la lettera accentata.**

`non eseguito` — l'esecutore la scrive sotto test e la verifica con:
`npx supabase migration up` → `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → `npx tsc --noEmit` (**FASE 6b**).

**Perché `TEXT` senza vincolo di forma.** Un `CHECK` sul formato del numero renderebbe **non
salvabile** un numero scritto male, e questo progetto ha una direttiva permanente in senso contrario
(«*ogni campo si corregge, fino alla consegna* » — l'errore di digitazione al banco è il caso normale,
non l'eccezione). La forma si sistema **quando si costruisce il collegamento** (§5), non quando si
salva. ⚠️ **Scelta dichiarata, non omissione.**

**Non serve backfill.** `provato:` un solo cliente ha un telefono, ed è un fisso — che è già il valore
giusto per la colonna in cui si trova. `cellulare_whatsapp` nasce `NULL` per tutti, ed è corretto:
nessuno l'ha mai inserito.

---

## 4. Il censimento — ogni punto che tocca quel dato

**R-P6: si censiscono gli identificatori, non le colonne.** 13 punti d'uso + 2 allowlist.

### 4.1 Chi SCRIVE (4 punti — qui il dato può sparire in silenzio)

| punto | che cos'è | che cosa gli serve |
|---|---|---|
| `src/app/api/clienti/[id]/route.ts:16-23` | **`PATCHABLE_FIELDS_CLIENTE`** | 🛑 **aggiungere `'cellulare_whatsapp'`.** Senza, la rotta **scarta la chiave senza errore** (riga 169-171: `if (field in body)`) e l'utente legge «Salvato» su un dato che non c'è — R-P6, con l'esempio gemello di `lavori` |
| `src/app/api/clienti/route.ts:125` | creazione (POST), scrittura campo per campo | aggiungere `cellulare_whatsapp: body.cellulare_whatsapp ?? null` |
| `src/components/features/clienti/ClienteEditSheet.tsx:83, 132, 324-330` | pannello di modifica | campo nuovo + **correggere l'etichetta e l'esempio di quello vecchio** (oggi «Telefono» con esempio `+39 02 1234567`) |
| `src/components/features/wizard/NuovoDentistaSheet.tsx:44, 74, 102-111` | wizard nuovo dentista | **D184: chiede ENTRAMBI i numeri, con lo stesso peso**, e sotto il cellulare c'è scritto a cosa serve — v. §4.5 |

### 4.2 Chi LEGGE per mandare WhatsApp — **SEI punti, non cinque e non tre**

🔄 **CORRETTO DUE VOLTE, e la seconda correzione insegna più della prima.**
**① Scrivendo il piano:** la prima stesura ne contava **tre**, perché il censimento cercava
`buildWhatsappUrl` **per file** e non **per chiamata** → `grep -rn "buildWhatsappUrl(" src/` = **5**.
**② Eseguendo il compito 2:** l'esecutore ha riferito (R-E2) un punto che **non usa affatto quella
funzione** — costruisce il collegamento **a mano**. `provato:` il censimento giusto non è sul nome della
funzione ma sul **comportamento**:

```
grep -rn "wa\.me/" --include="*.ts" --include="*.tsx" src/
```

→ **sei punti**, di cui **uno solo** dentro il perimetro di P31 e invisibile al censimento precedente.

🔑 **È esattamente ciò che R-P2 prescrive** («cercare il precedente per **COMPORTAMENTO**, non per
nome») — e la spec l'aveva violato pur citando la regola. Terza volta in una sessione che un elenco
«completo» non lo è, e **sempre la stessa causa**.

| # | punto | che cos'è |
|---|---|---|
| ① | `src/lib/consegna/orchestrate.ts:131` | consegna — **percorso «già consegnato»** (idempotente) |
| ② | `src/lib/consegna/orchestrate.ts:364` | consegna — **percorso normale**. ⚠️ Sono **due**, e leggono il cliente da due `select` diverse (`:117` e `:353-357`) |
| ③ | `src/components/features/scadenzario/EstrattoContoView.tsx:224` | **sollecito globale** dell'estratto conto |
| ④ | `src/components/features/scadenzario/EstrattoContoView.tsx:38` | 🛑 **sollecito su un singolo dovuto**, dentro `DovutoBottomSheet` — **componente definito nello stesso file** (righe 23-33), quindi invisibile a chi cerca per nome di file. Riceve il numero come **prop** (`:27` il tipo, `:349` il passaggio, `:108` il tasto) |
| ⑤ | `src/components/features/scadenzario/ScadenzarioList.tsx:85` | **sollecito** dall'elenco |
| ⑥ | 🆕 `src/components/features/lavori/form/TabAccettazione.tsx:232` | 🛑 **«Abbiamo ricevuto il lavoro»**, mandato al cliente all'**accettazione in ingresso**. **NON passa da `buildWhatsappUrl`**: costruisce `https://wa.me/${clienteTelefono.replace(/\D/g,'')}` **a mano** — per questo era invisibile. Riceve il numero come prop da `LavoroFormClient.tsx:152` (`lavoro.cliente?.telefono`) |

✅ **E per il ⑥ la catena di trasporto NON va toccata:** `provato:` `src/app/(app)/lavori/[id]/page.tsx:25`
e `.../modifica/page.tsx:46` caricano `cliente:clienti(*)` — **tutte** le colonne, quindi
`cellulare_whatsapp` arriva già. Servono **due sole righe**: la prop passata da `LavoroFormClient` e la
costruzione del collegamento, che deve **passare da `buildWhatsappUrl`** invece di fare da sé.

🛑 **Un compito atomico, non sei.** Se la colonna nasce e questi restano a leggere `telefono`, la
separazione esiste **nello schema** e il difetto resta vivo **nel programma**.

### 4.2-bis La catena di trasporto — il campo deve ARRIVARE fin lì

I tre punti dello scadenzario non leggono `clienti` direttamente: ricevono un oggetto costruito da
`select` esplicite. **Ogni `select` che non nomina il campo nuovo lo fa arrivare `undefined`**, e il
tasto sparisce senza un errore.

| punto | che cosa fa |
|---|---|
| `src/app/api/scadenzario/route.ts:34` | il **tipo** del cliente (`telefono: string \| null`) |
| `src/app/api/scadenzario/route.ts:48, 69` | **due** `select` con `cliente:clienti(id, nome, cognome, studio_nome, telefono)` |
| `src/app/api/scadenzario/[cliente_id]/route.ts:15` | il **tipo** |
| `src/app/api/scadenzario/[cliente_id]/route.ts:52, 79` | `select` + mappatura |
| `src/app/(app)/scadenzario/[cliente_id]/page.tsx:29, 45` | `select` + mappatura (percorso server) |
| `src/lib/consegna/orchestrate.ts:117` e `:353-357` | le **due** `select` del cliente nella consegna |

🔑 **Nove punti di trasporto per cinque punti d'uso.** È il motivo per cui questa spec elenca i percorsi
uno per uno invece di dire «aggiornare le query»: una query dimenticata **non dà errore**, dà un tasto
che non c'è.

### 4.3 Chi LEGGE come «numero da chiamare» (3 punti — **non cambiano**)

`ClienteInfoCard.tsx:52-67` (ci costruisce un `href="tel:"`) · `clienti/[id]/page.tsx:264, 294` (riga
«Telefono» della scheda) · `ClientiSearchList.tsx:243-252` (elenco). ✅ Continuano a leggere `telefono`:
è esattamente il dato che vogliono.

### 4.4 Le allowlist e la vista (3 punti)

| punto | che cos'è | destinazione |
|---|---|---|
| `src/app/api/clienti/route.ts:13-17` | **`CAMPI_ELENCO`** — governa **due volte**: cosa si chiede al database (`:51`) e cosa si risponde al browser (`:81`) | 🛑 **NON si aggiunge, e questa è la destinazione della riga.** L'elenco mostra **un** numero sotto ogni studio (`ClientiSearchList.tsx:243-252`), e quel numero è **quello da chiamare** — cioè `telefono`, che resta. Due numeri in una riga d'elenco sono rumore su una schermata fatta per **trovare** un cliente, non per contattarlo. ➡️ **Conseguenza da sapere:** il cellulare WhatsApp **non è visibile nell'elenco**; si vede sulla scheda. Se un giorno servisse lì, questa riga è il punto da cambiare |
| `supabase/schema.sql:2405` | vista con `c.telefono AS cliente_telefono` | ✅ **resta**: alimenta usi da «numero da chiamare» |
| `src/lib/contabilita/queries.ts:38` · `src/lib/dashboard/queries.ts:157` | leggono `cliente_telefono` dalla vista | ✅ **restano** |

### 4.5 Il wizard «nuovo dentista» — D184

**Quel foglio non è una scorciatoia: è il posto in cui l'anagrafica NASCE.** Un campo non chiesto lì è
un campo che qualcuno dovrà rimettere dopo, da un'altra schermata — la mancanza che **D165** e
**P30-bis** hanno già pagato una volta.

**Da 4 campi a 5:** Nome · Cognome · **Telefono dello studio** · **Cellulare WhatsApp** · Studio.

🛑 **«Lo stesso peso» è un vincolo di disegno, non un'intenzione.** Nessuno dei due numeri è secondario:
**niente «campo avanzato», niente sezione richiudibile, niente carattere più piccolo.** Entrambi restano
**facoltativi** — il vincolo di creazione oggi è su nome e cognome, e questa spec non lo cambia.

**Sotto il cellulare WhatsApp va scritto a che cosa serve.** Testo proposto, da approvare sugli scatti:

> *Qui arrivano i messaggi di consegna. Dev'essere un cellulare, non il fisso.*

Il DS v3 §2.3 vieta il gergo: «cellulare» e «fisso» sono parole di casa, non termini tecnici.

#### 4.5.1 🔧 Due mancanze del componente condiviso, scoperte da D184

`CampoTesto` (`src/components/ds/Campo.tsx:57-63`) è usato da **13 schermate** (`provato:` `grep`).
Entrambe le aggiunte sono **prop opzionali**: dove non si passano, non cambia niente.

| # | mancanza | che cosa serve | perché non è rifinitura |
|---|---|---|---|
| ① | **nessun testo di aiuto** — accetta solo `label`, `valore`, `onCambia`, `placeholder`, `autoFocus` | `aiuto?: string`, reso sotto il campo e legato all'input con `aria-describedby` | «*Spiegando a cosa serve*» (D184) **non è scrivibile** senza questa capacità |
| ② | **`type="text"` fisso** (riga 81) | `inputMode?: 'tel'` (o una variante `CampoTelefono`) | Su un telefono, per digitare un numero, **esce la tastiera alfabetica**. 🔑 Il precedente è a due righe: `CampoNumero` usa `inputMode="decimal"` per lo stesso motivo. ⚠️ È passato inosservato perché **finora nessun campo v3 chiedeva un numero di telefono** |

⚠️ **Il colore non può essere l'unica fonte di stato** e il testo di aiuto **non è un messaggio
d'errore**: va reso con `--muted`, non con un colore semantico. 🛑 **In tema scuro attenzione a
`--faint`**, che dentro un foglio scende a 4,25:1 — è **P30-bis**, difetto già aperto: qui si usa
`--muted` e non lo si tocca.

#### 4.5.2 §0B — questo foglio cambia aspetto, quindi passa dai disegni

Un campo in più e un testo nuovo sono **UI nuova**: mockup in `docs/design/mockups/`, scatti a
**390 · 768 · 1280** in **chiaro e scuro**, **approvazione di Francesco**, poi React. E **FASE 9b**
(gate estetico L2) prima dell'unione.

---

## 5. Il prefisso — una funzione, in un posto solo

```ts
// src/lib/consegna/whatsapp-template.ts (accanto a buildWhatsappUrl)
/** Prepara un numero per wa.me: cifre soltanto, in formato internazionale. */
export function numeroPerWhatsapp(grezzo: string | null | undefined): string | null
```

**Regole, in quest'ordine:**

1. vuoto / solo separatori → `null` (il chiamante è nel caso «manca il numero», §6);
2. comincia con `+` → si tolgono i separatori e **si rispetta il paese dichiarato** (`+33 6…` resta
   francese);
3. le cifre cominciano con `00` → è la forma internazionale con lo zero doppio: `00` → prefisso;
4. le cifre cominciano con `39` **e sono almeno 11** → è già in forma internazionale, si lascia com'è;
5. **tutto il resto → si antepone `39`.** Include il cellulare italiano scritto come lo scrive chiunque
   (`333 1234567` → `393331234567`) e il fisso con lo zero (`0976 71439` → `39097671439`).

`non eseguito` — l'esecutore la scrive in TDD.

🔑 **Da dove viene la soglia di 11 cifre della regola 4, perché è il punto più facile da sbagliare.**
Esiste un prefisso di cellulare italiano che *comincia* per `39` (`391…`, Wind), quindi «comincia per
39» **non** basta a dire «è già internazionale». Il criterio è la **lunghezza**:

| forma | cifre | come si legge |
|---|---|---|
| cellulare italiano nazionale (`391 234 5678`) | **10** | ≤ 10 → **nazionale**, si antepone `39` → `393912345678` |
| fisso italiano nazionale (`0976 71439`) | **9** | ≤ 10 → nazionale (e comincia per `0`, mai per `39`) |
| cellulare italiano internazionale (`39 333 1234567`) | **12** | ≥ 11 e comincia per `39` → **si lascia** |
| fisso italiano internazionale (`39 0976 71439`) | **11** | ≥ 11 e comincia per `39` → **si lascia** |

⚠️ **La soglia regge perché i numeri nazionali italiani non superano le 10 cifre** e i fissi cominciano
per `0`, mai per `39`. Il caso va scritto **in entrambi i versi** — uno che deve restare intatto e uno
che **deve** essere trattato come nazionale — o la regola resta un'intuizione.

🛑 **Che cosa NON fa:** non valida che il numero sia raggiungibile, non distingue fisso da cellulare,
non rifiuta niente. **Prepara una stringa.** La regola 5 su un numero **straniero senza `+`** produce un
numero sbagliato — ed è una **limitazione dichiarata**: in banca dati non ci sono clienti stranieri, e la
strada per gestirli è chiedere il `+` nell'aiuto del campo, non indovinare.

**Perché in un posto solo.** I chiamanti sono **tre** e un quarto nascerebbe scoperto. È la forma della
correzione di **P11** (03/08): il difetto si chiude **alla fonte**, non nei chiamanti.

---

## 6. Il tasto che chiede il numero (D183)

**Dove.** `FrameConsegnato.tsx:123`, che oggi rende `<TastoWhatsApp waUrl={esito.whatsapp_url}>`.

**Comportamento.** Se il cliente non ha `cellulare_whatsapp`:

1. il tasto **c'è lo stesso** (mai un tasto morto — **D165**);
2. premendolo si apre un **`Sheet` v3 con un campo solo** («Cellulare WhatsApp»);
3. alla conferma il numero **si salva in anagrafica**;
4. **solo dopo** si apre WhatsApp col messaggio.

🛑 **L'ordine 3 → 4 è vincolante.** Salvare dopo l'invio separa due fatti che devono restare insieme: la
consegna successiva richiederebbe di nuovo lo stesso numero.

### 6.1 🔴 Il vincolo che questa scelta scopre — e va risolto qui, non in fase di scrittura

`provato:` **`ConsegnaResult` (`src/types/domain.ts:633-647`) NON contiene l'id del cliente.** Ha
`lavoro_id`, `numero_lavoro`, `ddc`, `buono`, `fattura`, `whatsapp_url`, `tempo_ms`, `cassettaLiberata`.
**La schermata della consegna, oggi, non sa a chi salvare il numero.**

**Decisione:** si aggiunge **`cliente_id: string`** a `ConsegnaResult`, valorizzato in
`orchestrate.ts` da una `select` che già interroga `clienti`.

- ✅ **Additivo:** nessun consumatore esistente si rompe (FASE 3, «il payload change rompe client
  esistenti?» → **no**).
- ✅ Il salvataggio passa da **`PATCH /api/clienti/[id]`**, che esiste, ha già l'isolamento per
  laboratorio e la sua allowlist — **nessun percorso di scrittura nuovo dentro la consegna**.
- ⚠️ **Il percorso della consegna oggi legge soltanto** i dati del cliente. Questa scelta tiene la
  scrittura **fuori** dall'orchestrazione, in una rotta il cui mandato è già l'anagrafica.

---

## 7. Come si prova

**Sulla funzione del prefisso** (§5) — ogni riga una forma d'input, R-P4:

| ingresso | atteso | perché |
|---|---|---|
| `333 1234567` | `393331234567` | il caso normale, quello che il wizard suggerisce oggi |
| `+39 333 1234567` | `393331234567` | il `+` già presente |
| `0976 71439` | `39097671439` | il fisso vero in banca dati |
| `+33 6 12 34 56 78` | `33612345678` | un `+` straniero **si rispetta** |
| `00 39 333 1234567` | `393331234567` | forma internazionale con `00` |
| `391 2345678` | `393912345678` | ⚠️ **il caso che smonta «comincia per 39»**: 10 cifre → nazionale |
| `39 0976 71439` | `39097671439` (intatto) | 11 cifre e comincia per `39` → già internazionale |
| `null` · `''` · `'---'` | `null` | il caso «manca il numero» |

**Sul vincolo** (R-P1: la prova include **un valore che DEVE essere rifiutato**): la colonna non ha
`CHECK`, quindi il vincolo da provare **non è nel database ma nell'allowlist** — una `PATCH` con una
chiave **fuori** da `PATCHABLE_FIELDS_CLIENTE` deve lasciare il dato invariato, e il caso va scritto
**con la chiave nuova dentro e fuori**, per provare che l'aggiunta ha morso.

**Sulle tre chiamate WhatsApp:** ognuna con cliente che ha il cellulare, e senza.

**FASE 9:** il campo nuovo su 390 · 768 · 1280, chiaro e scuro. **FASE 9b** (gate estetico L2) sul
foglio di §6, che è superficie v3 nuova.

---

## 8. Che cosa questa spec NON fa

- **Non tocca `pazienti`** né il resto dell'anagrafica: è **P30-a**, ed è una ricerca.
- **Non decide se scheda e modifica diventano una pagina sola**: è **P30-b**.
- **Non scrive React di P30**: quello viene dopo, sul disegno 🅰️ già approvato.
- **Non normalizza i numeri già salvati.** Il fisso di Muro Lucano resta dov'è, e dov'è va bene.
- **Non tocca i fornitori.** `provato:` **0 fornitori** in banca dati; `NuovoOrdineSheet.tsx:193`
  costruisce un `wa.me` col telefono del fornitore **senza prefisso**, cioè ha lo stesso difetto di ③.
  ⚠️ **Riferito, non corretto** (R-E2) — merita una voce propria, non un allargamento di questa.

---

## 9. Vuoti dichiarati

🛑 **Che cosa vede chi preme il tasto con un numero senza prefisso, oggi, non è verificato.**
`provato:` `wa.me` reindirizza a `api.whatsapp.com` **allo stesso modo** per un fisso, per un cellulare
senza prefisso e per uno col prefisso: **la validazione avviene dentro l'applicazione WhatsApp, non sul
server**, quindi da riga di comando non è osservabile. **Serve un telefono vero.** ⚠️ Non è un dettaglio
di curiosità: se WhatsApp mostrasse un errore chiaro, il difetto sarebbe fastidioso; se aprisse una
chat vuota, sarebbe silenzioso. **La spec non ha bisogno della risposta** — la correzione è la stessa —
ma **il referto di P31 dovrà dirla**.

📌 **Validazione: un revisore, non un panel.** `ua-app/CLAUDE.md` §0C chiede due-tre revisori
specializzati per una decisione architetturale. In questa sessione non è possibile avviarli, quindi la
validazione è stata fatta da **un revisore solo**, che ha prodotto tre rilievi — tutti recepiti: la
seconda allowlist (§4.4), il percorso di scrittura di D183 (§6.1), e l'atomicità dei tre punti WhatsApp
(§4.2). **Sostituzione dichiarata, non silenziosa.**
