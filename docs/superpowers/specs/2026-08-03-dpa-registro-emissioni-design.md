# Spec — il registro delle emissioni del contratto ai dentisti (ondata 1 di 2)

**Data:** 3 agosto 2026 · **Stato:** da ratificare · **Decide:** Francesco Formicola
**Nasce da:** la parte **(b)** della riga 10 di `docs/roadmap/ROADMAP-UFFICIALE.md`, aperta dal panel del
03/08 (`docs/roadmap/2026-08-03-panel-dpa-referto.md` §3).
**Decisioni che la governano:** **D126** (il testo del contratto, già in produzione) · **D127** (i documenti
si mandano e si firmano dal telefono) · **D128** (la firma è un'accettazione tracciata) · **D129** (due
ondate: prima il registro) · **D130** (si riemette solo se qualcosa è cambiato) · **D131** (la conversazione
col clinico va al portale). Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`.

---

## 1. Il problema, in una riga

**Nessuno può sapere quale testo ha in mano un dentista.** Il contratto si rigenera dal modello vivo a ogni
scarico, non viene conservato da nessuna parte, il suo numero è `DPA-{anno}-{primi 8 caratteri dell'id
cliente}` — **stabile per cliente e per anno** — e `template_versione` non viene **mai** valorizzata.

Il 3 agosto il testo è cambiato (D126). Chi ha scaricato il contratto il 2 e chi lo scarica il 4 hanno in
mano **due documenti diversi con lo stesso numero**, e in banca dati non ne resta traccia.

🔑 **Ed è il pavimento dell'ondata 2:** una firma non vale niente se non si sa **che cosa** è stato firmato.

## 2. Che cosa fa questa ondata

Ogni volta che il contratto **esce davvero nuovo**, UÀ lo **conserva**, gli dà un **numero progressivo vero**,
ne salva l'**impronta** e la **versione del modello**. Riscaricare a parità di tutto restituisce **lo stesso
identico PDF già conservato**.

Alla domanda «quale testo ha in mano questo dentista?» risponde **l'ultima riga del registro**.

## 3. Il cancello architetturale (FASE 3, `ua-app/CLAUDE.md` §0C)

| Domanda | Risposta |
|---|---|
| **Isolamento fra laboratori** | Sì, tocca una tabella con RLS attiva (`dpa_laboratorio`, `laboratorio_id = public.current_lab_id()`). La rotta usa il **client di servizio**, che la RLS la aggira: ogni lettura e ogni scrittura porta il filtro `laboratorio_id` **esplicito**, e il `cliente_id` si verifica appartenente allo stesso laboratorio prima di scrivere. |
| **Deriva dello schema** | Sì: migration additiva su `data_processing_agreements`. Dopo, **obbligatorio** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` + `npx tsc --noEmit` (FASE 6b). |
| **Contratto dell'API** | **Non cambia.** `GET /api/clienti/[id]/dpa` risponde un PDF prima e dopo. Nessun client si rompe. |
| **Ritorno indietro** | Le colonne sono **additive e annullabili**; l'indice è **parziale**. Tornare indietro = ripristinare il codice: le righe restano e non danno fastidio a nessuno. La tabella oggi è **vuota** (`provato:` `GET /rest/v1/data_processing_agreements` → `content-range: */0`). |
| **Dominio critico** | **Sì — c'è una migration** → percorso **GRANDE**, esecuzione con **R-E1** (un task a un esecutore fresco). |

## 4. Il dato

Migration **additiva** su `data_processing_agreements`. Le colonne esistenti non si toccano.

| Colonna nuova | Tipo | A che serve |
|---|---|---|
| `numero_dpa` | `TEXT` | Il numero stampato, es. `DPA-2026-0007` |
| `anno_dpa` | `SMALLINT` | Anno della serie (Europe/Rome, da `annoRoma()`) |
| `progressivo_dpa` | `INTEGER` | Il progressivo dentro l'anno |
| `storage_path_pdf` | `TEXT` | Percorso del PDF **emesso** nel contenitore privato `documenti` |
| `pdf_sha256` | `TEXT` | Impronta del PDF: cambia se cambia una virgola |
| `payload_sha256` | `TEXT` | Impronta dei **dati** che hanno prodotto il foglio |
| `emesso_at` | `TIMESTAMPTZ` | Quando è uscito |

**Colonne esistenti che questa ondata usa senza modificarle:** `template_versione` (finalmente valorizzata,
col valore di `VERSIONE_MODELLO_DPA` — 🔄 **D133**: oggi `dpa-v2+8d98dbee`, **mai il letterale**),
`tipo_controparte` = `'dentista'`, `dentista_id` = id del cliente, `stato` = `'da_firmare'`
(valore già ammesso dal CHECK: emesso e in attesa di firma è la verità).

🔴 **La versione del modello ha bisogno di una GUARDIA, o è una promessa che salta al primo che si distrae.**
`VERSIONE_MODELLO_DPA` vive come costante di dominio e **si alza a ogni cambio del testo** — ma un gesto da
ricordare a ogni modifica è un gesto che prima o poi non si fa (è la lezione di D120, gli scatti dei mockup
dimenticati 211 volte). La rete: una prova che rende il modello con una fixture fissa, ne calcola l'impronta
del testo e la confronta con una costante **dichiarata accanto alla versione**. Chi cambia il testo vede la
prova rossa e deve **alzare la versione e aggiornare l'impronta insieme**. Senza questa guardia il registro
direbbe `dpa-v2` su un testo che è già `v3`, cioè **la stessa bugia da cui siamo partiti, in forma nuova**.

> 🔄 **EMENDATO il 03/08/2026 — D133. La guardia descritta qui sopra NON basta, ed è stato provato.**
> Rende **visibile** un cambio di testo, ma **non impedisce** di dimenticare il numero: chi chiude il rosso
> incollando la nuova impronta ottiene un verde **senza aver toccato `v2`**. La frase «*deve alzare la
> versione e aggiornare l'impronta insieme*» descriveva un obbligo che **nessun meccanismo imponeva** — la
> classe di difetto che questo progetto continua a pagare: un documento che afferma più di ciò che il codice
> fa.
> 🛑 **La conseguenza, verificata a valle:** l'indice `dpa_emissione_viva_unica` confronta proprio
> `template_versione`. A versione invariata e dati invariati **non riemetterebbe** — il dentista resterebbe
> col contratto **vecchio** mentre il laboratorio crede di avergli mandato quello nuovo. **È il guasto di
> D126 in forma nuova**, cioè esattamente ciò che questa sezione voleva impedire.
> ✅ **La forma che regge:** la versione **porta dentro l'impronta**, `dpa-v2+8d98dbee` — revisione
> leggibile per gli umani, **più le prime otto cifre dell'impronta del testo**. Cambia il testo → cambia
> l'impronta → **cambia la versione da sola**. Dimenticare `v2` diventa **innocuo**.
> `provato:` riscrivendo la costante come letterale, **2 asserzioni su 2** si accendono; cambiando una
> parola nel template l'impronta passa da `8d98dbee…` a `85bdcde1…` e con lei la versione, **a `v2` fermo**.
> 🔑 **Regola che ne discende:** il valore **non si scrive mai come letterale**, si importa
> `VERSIONE_MODELLO_DPA`.

🛑 **Colonne che questa ondata NON tocca, e il motivo:** `documento_url`, `firmato_da`, `firmato_at` restano
**libere per il documento firmato** dell'ondata 2. Il PDF **emesso** va in `storage_path_pdf`, che è un campo
suo. Così l'ondata 2 non deve smontare niente.

**Due vincoli, e si provano con un valore che DEVE essere rifiutato:**
1. **Indice unico parziale** su `(laboratorio_id, anno_dpa, progressivo_dpa)` dove `progressivo_dpa IS NOT
   NULL` — due emissioni non possono avere lo stesso numero nello stesso anno. *(Parziale, come quello della
   DdC: la tabella deve poter ospitare righe senza numero, es. i sub-responsabili.)*
2. **CHECK di coerenza**: i campi dell'emissione viaggiano **tutti insieme o nessuno** — `numero_dpa`,
   `anno_dpa`, `progressivo_dpa`, `storage_path_pdf`, `pdf_sha256`, `payload_sha256`, `emesso_at` o sono
   tutti valorizzati o sono tutti nulli. Una riga a metà è una riga che mente.

⚠️ **`progressivi_anno.tipo` NON ha alcun vincolo** (`provato:` `supabase/schema.sql:131-137`, è `TEXT NOT
NULL` senza CHECK): aggiungere il tipo `'dpa'` **non richiede migration su quella tabella**. Va aggiornato
solo il **commento** che elenca i tipi (`:128-129`), che oggi dice «lavoro, fattura, ddc, buono, ordine,
sdi_invio» — un elenco che sembra completo e non lo sarebbe più.

## 5. La regola di riemissione (D130)

L'impronta si calcola con la funzione già in casa (`improntaPayload`, esportata da
`src/lib/pdf/generate-ddc.ts`; se il piano trova più pulito spostarla in un modulo condiviso, lo dichiara).

🛑 **Ma NON sull'oggetto reso così com'è, e questo è il punto che la prima stesura di questa spec sbagliava.**
L'oggetto passato al modello contiene `data_emissione` (= adesso) e `numero_dpa`: se entrassero
nell'impronta, **cambierebbe ogni giorno** e nascerebbe **un'emissione nuova a ogni scarico in un giorno
diverso** — cioè l'esatto contrario di D130, con i progressivi bruciati a vuoto.

**L'impronta si calcola sui soli dati SOSTANZIALI: il blocco `lab` e il blocco `cliente`.** Numero e data
sono attributi **dell'emissione**, non del suo contenuto, e si assegnano **dopo** aver deciso che
un'emissione nuova serve.

Il confronto è su **due cose insieme**: `payload_sha256` **e** `template_versione`. Serve tutte e due perché
**il testo può cambiare a dati identici** — è successo il 3 agosto con D126.

```
esiste un'emissione per (laboratorio, cliente) con
    payload_sha256 uguale  E  template_versione uguale  E  deleted_at IS NULL ?
  SÌ  → si scarica il PDF conservato da Storage e si restituisce quello. Nessun numero nuovo.
  NO  → si genera, si salva su Storage, si prende un progressivo, si scrive la riga.
```

🔑 **Il precedente in casa è il guard della DdC** (`src/lib/pdf/generate-ddc.ts:98-107`), con **una
differenza dichiarata**: là l'idempotenza è per **lavoro**, qui è per **coppia (dati, versione del modello)**.

## 6. La rotta

`GET /api/clienti/[id]/dpa` — controlli di accesso invariati (solo `titolare`, `admin_rete`, `admin_sistema`;
`assertLabOperativo`). Risponde **sempre** un PDF.

**Ordine delle operazioni, e non è uno stile:** prima il **file** nel contenitore, poi la **riga** in banca
dati. Se il caricamento fallisce, la riga **non si scrive** e la rotta risponde errore: meglio nessuna traccia
che una traccia che punta a un documento inesistente. È la stessa regola già scelta per la cancellazione delle
foto (D61, `src/app/api/lavori/[id]/immagini/[imgId]/route.ts:207-219`), riusata invece di inventarne una.

**Percorso nel contenitore:** `{laboratorio_id}/dpa/{anno}/{numero}.pdf`, contenitore **privato**
`documenti` — stessa forma della DdC (`generate-ddc.ts:181`).

🛑 **Non si usa `getPublicUrl`.** Il contenitore è privato (`provato:` il 03/08 sul database vero: `"public":
false`, e la forma pubblica risponde **400 «Bucket not found»**): un indirizzo pubblico qui sarebbe **un
indirizzo morto scritto in banca dati**, che è il difetto già aperto alla riga 16 della sezione «I documenti
che escono dal laboratorio». Si conserva il **percorso**, e chi deve mostrarlo firma un indirizzo a scadenza
con `getSignedUrl` (`src/lib/storage/signed-url.ts`).

**Corsa fra due richieste contemporanee:** se due scarichi partono insieme, entrambi possono superare il
controllo e chiedere un progressivo. L'indice unico li separa: chi perde riceve l'errore di duplicato,
**rilegge** l'emissione dell'altro e restituisce quella. Stessa rete di sicurezza della DdC.

> 🔄 **EMENDATO il 03/08/2026, dopo un panel di due advisor con mandato di confutare.** Il capoverso qui
> sopra **era falso**, e falso proprio nella frase che si appoggiava alla DdC.
>
> **Quale indice.** Non quello sul numero. `genera_progressivo` è un `INSERT … ON CONFLICT DO UPDATE …
> RETURNING` (`supabase/schema.sql:111-115`): due richieste simultanee ricevono progressivi **diversi**,
> apposta. Su un indice `(laboratorio_id, anno, progressivo)` non collidono mai — quindi **nessun errore di
> duplicato**, e la corsa produce **due emissioni complete e distinte per lo stesso dentista e lo stesso
> testo**, in silenzio. Su un registro il cui unico scopo è dire *quale testo ha in mano ogni dentista*,
> è il difetto peggiore possibile.
>
> **E la DdC non era il precedente che credevamo: ne ha DUE, di indici.** Uno sulla **chiave di
> deduplicazione** — `ddc_lavoro_attiva_unique (laboratorio_id, lavoro_id) WHERE stato <> 'annullata'`,
> cioè **le stesse colonne su cui interroga il guard** — e uno di **backstop sulla numerazione**,
> `UNIQUE (laboratorio_id, anno_ddc, progressivo_ddc)` (`supabase/schema.sql:1273`). Il piano ne aveva
> copiato **solo il secondo** e il ramo di recupero del primo. La regola era già scritta in chiaro anche
> per le fatture, in una spec ratificata: «*ogni doppia emissione futura è un 23505, non un doppio
> documento*» + «*Il backstop `UNIQUE (laboratorio_id, anno, progressivo)` esiste già*»
> (`docs/superpowers/specs/2026-07-09-ondata-4a-server-consegna-fiscale-design.md:46`).
>
> **La forma giusta, quindi:** **due** indici. Backstop `dpa_emissione_numero_unico` sul numero, **più**
> `dpa_emissione_viva_unica (laboratorio_id, dentista_id, payload_sha256, template_versione) WHERE
> deleted_at IS NULL AND payload_sha256 IS NOT NULL` sulla chiave di deduplicazione. È quest'ultimo che
> trasforma la corsa in un errore di duplicato recuperabile.
> 🔑 **L'invariante che ne discende, e vale per tutta l'ondata:** *colonne dell'indice = filtro del guard di
> riuso = filtro della rilettura dopo il duplicato*. Tutti e tre uguali, sempre.
>
> **Che cosa NON è coperto, e va detto:** il **buco nella numerazione resta** (chi perde ha già consumato il
> suo progressivo, e il contatore vive in una RPC propria fuori da ogni transazione annullabile: il registro
> avrà 7 e poi 9 — i numeri restano unici e crescenti, che è ciò che conta per un registro non fiscale);
> non c'è **atomicità** fra il file e la riga, perché sono due chiamate distinte; e la corsa vera si prova
> solo con **due richieste in parallelo** contro la produzione, non con un mock.
>
> Dettaglio e verbale del panel: piano `2026-08-03-dpa-registro-emissioni.md`, Task 1, §«Perché questo task
> è stato riscritto».

## 7. Che cosa si vede

Nella scheda del cliente, **sotto il tasto «Scarica DPA»**: numero e data dell'ultima emissione — «*DPA-2026-0007
— emesso il 3 agosto 2026*». Se non è mai stato emesso, non compare niente.

⚠️ La pagina `src/app/(app)/clienti/[id]/page.tsx` è **legacy v2.3** (`provato:` nessun `data-ds="v3"` né
import da `design-system/v3`): l'aggiunta segue **v2.3**, mai v3 per singolo componente (regola di convivenza
DS v3 §14). È una riga di testo: **nessun mockup richiesto** dal §0B, che vale per pagine e funzioni nuove.

## 8. Gli errori

| Caso | Comportamento |
|---|---|
| Il caricamento su Storage fallisce | **Nessuna riga scritta.** La rotta risponde 500 con messaggio generico; il messaggio dell'archivio resta nei log del server e **non esce verso il browser** (regola G9, già applicata in `immagini/[imgId]/route.ts:216-218`) |
| Il progressivo collide | Si rilegge l'emissione esistente e si restituisce quella |
| Il PDF conservato non si trova più nell'archivio | Si **riemette** — meglio un numero nuovo che una porta chiusa. La riga vecchia resta come storia |
| Laboratorio o cliente mancanti | Invariato: `generate-dpa.ts` solleva già, e la rotta risponde 500 |

## 9. Come si prova

**Prove automatiche (si scrivono PRIMA del codice):**
1. Riscaricare a parità di dati e versione **non** crea una riga nuova e **non** brucia un progressivo.
2. Cambiare `template_versione` → **nasce** un'emissione nuova.
3. Cambiare un dato del cliente (o del laboratorio) → **nasce** un'emissione nuova.
4. Se lo Storage rifiuta il file, **nessuna riga** viene scritta (fail-closed).
5. Il CHECK di coerenza **rifiuta** una riga a metà — con il messaggio d'errore incollato nel piano.
6. L'indice unico **rifiuta** due emissioni con lo stesso `(laboratorio, anno, progressivo)`.
7. La riga scritta porta `tipo_controparte='dentista'`, `dentista_id` giusto e `stato='da_firmare'`.
8. Il contenuto del PDF resta quello di D126: la prova `tests/unit/dpa-pdf-content.test.ts` **continua a
   passare** (17 su 17).
9. **La guardia della versione:** cambiare una parola del modello **senza** alzare `VERSIONE_MODELLO_DPA`
   fa **fallire** una prova. Si dimostra rompendola apposta e rimettendola a posto, come si è fatto per i sei
   controlli della guardia dei documenti.
10. **Lo stesso giorno non basta:** due scarichi a **date diverse**, a parità di dati e versione, devono
    restituire **la stessa** emissione — è la prova che `data_emissione` è fuori dall'impronta (§5).

**Prova dal vivo, in produzione** (D103, link monouso): si scarica il contratto due volte per lo stesso
cliente e si legge il registro — **una sola riga**, e il secondo scarico restituisce **lo stesso PDF**
(stessa impronta).

## 10. Fuori perimetro — dichiarato

- **Ondata 2:** invio per **email** (Resend, già in casa) e **WhatsApp** (link `wa.me`, già in casa e già
  usato per la consegna), pagina di **firma a gettone** su qualunque dispositivo, e **documento firmato**
  conservato. Nessuno di questi dipende dal portale.
- **Rimandato al portale (D131):** la **conversazione col clinico** come canale → **V2.0 n.1 «Portale
  dentista V2 — comunicazione bidirezionale»** di `docs/roadmap/ROADMAP-UFFICIALE.md`, che porta già una nota
  «non duplicare».
- **Da agganciare, non riscrivere:** **V3.0 n.2 «Prescrizione digitale dentista — form digitale dal portale
  con firma digitale»** userà la **stessa macchina della firma** dell'ondata 2.
- **Non in questa ondata:** la data di scadenza del contratto, il rinnovo, i sub-responsabili come righe
  proprie, e il contratto lab↔UÀ (`tipo_controparte='sub_responsabile'`, oggi senza scrittori).

## 11. Domande aperte, dichiarate

1. **Il peso legale della firma (D128) va riconfermato da un panel normativo PRIMA dell'ondata 2**, sul
   testo dell'Art. 28(9) GDPR letto alla fonte — con lo stesso metro usato per l'Allegato XIII: nessuna
   citazione di seconda mano. **Non blocca questa ondata**, che non firma niente.
2. **La serie dei numeri deve restare senza buchi?** Domanda già sollevata dal panel del 03/08 per la DdC.
   Qui il rischio è minore (D130 non brucia numeri a vuoto), ma la domanda è la stessa e va posta una volta
   sola, per tutti i documenti. **Non blocca questa ondata.**
