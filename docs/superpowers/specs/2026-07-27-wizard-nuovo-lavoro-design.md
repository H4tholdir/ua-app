# Spec — Il ripensamento del wizard «Nuovo lavoro»

**Data:** 27 luglio 2026 · **Stato:** ✅ **RATIFICATA da Francesco (27/07/2026, sera)** · **Percorso:** GRANDE con migration (BP-2)
**Esecuzione:** in **tre ondate** — v. §12. **La foto della prescrizione resta fuori dalla transazione, ma il fallimento diventa visibile** — v. §4.
**Verbale del brainstorming (fonte di ogni decisione):** `docs/design/decisions/2026-07-27-wizard-nuovo-lavoro-brainstorming.md`
**Mockup:** `docs/design/mockups/2026-07-27-{denti-colore-wizard,arcata-ovale,denti-illustrazioni-vere}.html`
**Gate FASE 3:** superato — verbale §7-bis · **Panel advisor 3×:** fatto — verbale §6-quinquies/sexies/septies

> Questa spec **non ripete** il verbale: lo presuppone. Ogni «W*n*» qui rimanda a una decisione ratificata lì.

---

## 1. Perché esiste questo lavoro

Oggi il wizard chiede tre cose (dentista, tipo, paziente) e tratta il dato clinico come un accessorio. Ne
derivano tre difetti **verificati in produzione**:

1. **Il dente non si scrive, si sbaglia.** Il wizard propone «es. 2.6», salva la stringa grezza
   (`crea-lavoro.ts:195`), ma l'odontogramma legge interi (`TabClinica.tsx:28`): il dente non si accende, il
   tecnico ne tocca un altro, **il lavoro ne dichiara due**. Nessuno se ne accorge.
2. **Il dato clinico si perde in silenzio.** Denti e colore si scrivono con una PATCH **fail-soft** dopo il
   POST (`crea-lavoro.ts:187-203`): se fallisce, il lavoro esiste e il dato no.
3. **Il colore non arriva nella Dichiarazione di Conformità.** `DdcTemplate.tsx` non lo nomina, e il campo
   dell'Allegato XIII che dovrebbe contenerlo — `prescrizione_caratteristiche` — è alimentato a `null`
   (`generate-ddc.ts:99`).

E una richiesta che il modello dati oggi **non può soddisfare**: denti diversi con colori diversi (W-req).

---

## 2. Perimetro

**DENTRO:** wizard adattivo per tipo di dispositivo (W2) · denti e colore **per singolo dente** (W3) ·
selezione su illustrazione con sagome (W15) · assegnazione cassetta come ultimo passo saltabile (W4) ·
prescrizione fotografata (W5) · provenienza del colore (W20) · il colore nella DdC (§4-bis) · i tre difetti
del §1.

**FUORI, mappati e non costruiti (W1):** arrivo automatico da **email** e dai **portali degli scanner**
(3Shape, iTero, Medit). Motivo: dipendono da account e regole di terzi e **non sono provabili** senza accessi
reali; terrebbero fermo tutto il resto.

**FUORI, tracciato altrove:** l'avviso alla consegna su dente/colore mancanti (voce 2 della roadmap) —
ma questa spec **deve lasciare il gancio** (§7) · la ricevuta che dichiara 15 anni (§6-septies ⑭).

---

## 3. Il modello dati

### 3.1 `lavori_denti` — una riga per dente

| colonna | tipo | note |
|---|---|---|
| `id` | uuid pk | |
| `laboratorio_id` | uuid NOT NULL | FK → `laboratori(id)`; RLS |
| `lavoro_id` | uuid NOT NULL | **FK composita** `(lavoro_id, laboratorio_id) → lavori(id, laboratorio_id)` |
| `fdi` | **smallint** NOT NULL | mai `text` — `'2.6'::smallint` è già un errore di tipo |
| `ruolo` | text NOT NULL | `elemento` · `mancante` · `impianto` · `escluso` · `incollato` |
| `gruppo` | smallint NULL | il ponte (§3.4) |
| `scala` | text NULL | FK → `colori_dentali(scala, …)` |
| `codice` | text NULL | il colore base |
| `codice_collo` · `codice_corpo` · `codice_incisale` | text NULL | le tre zone (W3) |
| `provenienza` | text NOT NULL | **`prescritto` \| `eseguito`** (W20) |
| `created_at` · `updated_at` | timestamptz | |

**Vincolo sui denti — strutturale, non un intervallo** (§6-sexies ⑤):
```sql
CHECK ( (fdi/10 BETWEEN 1 AND 4 AND fdi%10 BETWEEN 1 AND 8)     -- 32 permanenti
     OR (fdi/10 BETWEEN 5 AND 8 AND fdi%10 BETWEEN 1 AND 5) )   -- 20 decidui
```
**52 codici validi.** `UNIQUE (lavoro_id, fdi)`.

⚠️ **`ruolo` unifica** `denti_mancanti` e `denti_impianti` (oggi `INTEGER[]` accanto a `denti_coinvolti
string[]`: stesso dominio, due tipi) e copre gratis «denti da escludere» degli allineatori e «da incollare»
della contenzione (verbale §6-bis).

### 3.2 Il colore che non ha denti

**Non si modella con una riga senza dente.** Su `lavori`: `colore_scala` + `colore_codice` = **default di
caso**; le righe di `lavori_denti` sono **override**. È il pattern di exocad e 3Shape (verbale §8).
- Protesi totale → solo default di caso, nessuna riga.
- Abutment → righe senza colore.
- Denti diversi → righe con override.

🛑 **La precedenza (riga → caso) si scrive UNA VOLTA SOLA**, in una funzione pura condivisa da wizard, scheda
e DdC. Due letture divergenti dello stesso default sono il difetto che questa modifica introdurrebbe.

### 3.3 `colori_dentali` — tabella di riferimento, non-tenant

`(scala, codice)` pk · `hex` · `ordine` · `famiglia`. Contiene **VITA classical (16 + T/BL/OM fuori scala,
§6-sexies ⑦)** e **VITA 3D-Master (29)** (W10). È anche la casa dei valori colorimetrici pubblicati (W9).

### 3.4 Il ponte — forma riservata ora, gesto dopo

Colonne `gruppo` + `gruppo_ruolo` **nullable e non popolate** in questo giro. Costo oggi: due righe di
migration. Costo se si rimanda del tutto: la DdC scriverebbe «elementi 13, 12, 11» invece di «ponte su tre
elementi» — che ai fini dell'Allegato XIII **descrive un dispositivo diverso**.

### 3.5 Congelamento

**Non serve nulla di nuovo:** `dichiarazioni_conformita` **è** la tabella di storico.
- `prescrizione_caratteristiche` (già esistente, già stampata, oggi `null`) riceve la **stringa collassata**
  dei soli valori `prescritto`.
- `DdcTemplate.tsx:258` va corretto: deve leggere `ddc.denti_coinvolti`, **non** `lavoro.denti_coinvolti`.
- Colonne `denti_snapshot jsonb` + `denti_snapshot_at` su `lavori` **nello schema fin dal primo giorno**
  (§7-bis.4); il writer può arrivare dopo, lo schema no.
- `dichiarazioni_conformita.colore_dente` (oggi morta) si **elimina**: `DROP COLUMN` nella stessa migration
  (**W23**, deciso da Francesco — §10-bis). La sostituisce il testo collassato in
  `prescrizione_caratteristiche`.

---

## 4. Le API

**`PUT /api/lavori/[id]/denti`** — endpoint dedicato, **sostituzione integrale**.
```
{ atteso_updated_at, denti: [ { fdi, ruolo, scala?, codice?, codice_collo?, codice_corpo?,
                                codice_incisale?, provenienza } ] }
```
- **Idempotente per costruzione**; 6 denti = 1 chiamata, non 6.
- Precondizione `atteso_updated_at` → **409** con la lista corrente nel corpo. ⚠️ **Il controllo di
  concorrenza è un pattern NUOVO per questo repo**: va introdotto consapevolmente.
- Validazione in route: `Number.isInteger` + appartenenza a un `Set` derivato da `DENTI_ADULTO`/
  `DENTI_DECIDUO` → **422 col valore incriminato**, mai un 500 dal CHECK.
- `laboratorio_id` e `lavoro_id` nel corpo si **ignorano**: si derivano da sessione e URL.

**`lavoro_crea_atomico(p_lab, p_lavoro jsonb, p_denti jsonb)`** — RPC transazionale: progressivo + INSERT
lavoro + INSERT denti. **Motivo normativo**, non di comodità: un colore perso in silenzio produce una DdC
priva di un contenuto obbligatorio dell'Allegato XIII.
- Perimetro: **solo** lavoro + denti. Le fasi da ciclo restano fuori e fail-soft.
- Chiamata: `callRpcWithRetry` + controllo di `error` + switch sull'esito. **Mai** `void svc.rpc(...)`
  (thenable pigro), **mai** solo `try/catch` (postgrest non lancia).
- `EsitoCreazione.accessoriFalliti` perde il ramo `'dettagli'`.
- ✅ **DECISO (Francesco, 27/07): `'foto'` RESTA fuori dalla transazione — ma il fallimento smette di essere
  silenzioso.** Coerente con W22: nessun blocco al banco, dove la connessione è quella che è. Il lavoro si
  crea comunque; l'operatore **vede** che la prescrizione non è stata allegata, con un'azione di riprova che
  non richiede di ricreare il lavoro. L'obbligo di conservazione (§6-septies ⑩) è presidiato **alla consegna**
  dal precheck (§7), che è il guardiano — non dal blocco alla creazione.
  🔑 **Il difetto che si sta chiudendo non è «fallisce», è «fallisce senza dirlo»:** è la stessa classe di
  §1.2, e per denti e colore si chiude con l'atomicità, per la foto si chiude con la visibilità.

**Sentinelle** — nello **stesso deploy**, fuori da `PATCHABLE_FIELDS` con la ragione scritta accanto (modello
`numero_cassetta` / `proposta_dentista`): `denti_coinvolti`, `colore_dente`, `colore_collo`, `colore_corpo`,
`colore_incisale`. Più rimozione delle scritture in `crea-lavoro.ts:195-196`.
⚠️ **`denti_mancanti` e `denti_impianti` oggi passano senza validazione** (§6-sexies ⑨): stessa cura.

**RLS**
```sql
ALTER TABLE lavori_denti ENABLE ROW LEVEL SECURITY;
CREATE POLICY … USING (laboratorio_id = public.current_lab_id());   -- mai auth.
REVOKE ALL ON lavori_denti FROM anon, authenticated, service_role;
GRANT SELECT ON lavori_denti TO authenticated, service_role;
```
`service_role` **deve** stare nel REVOKE: in questo repo un `SET LOCAL ROLE service_role; DELETE`
cross-tenant **è già stato riprodotto davvero** (nota E8, `20260721090000_parete_cassette.sql`).

---

## 5. Il wizard

**I passi**, nell'ordine: dentista → tipo → paziente → **[denti]** → **[colore]** → **[prescrizione]** →
**[cassetta]** → Fatto. Le parentesi quadre compaiono secondo la tabella dei 38 tipi (verbale §6-quater).

- **Quali domande compaiono lo decide il TIPO** (W2). **Quando compaiono, si possono saltare** con «Lo scrivo
  dopo» (W17). Sono **due leve diverse**: *forzabile* (aggiungere dove il tipo non chiede) ≠ *saltabile*
  (rimandare dove il tipo chiede).
- **Casi di prova dell'adattività:** `anti_russamento` e `duplicato_protesi` non devono mostrare **nessuna**
  delle tre domande; `overdenture` le mostra tutte e tre.
- **L'arcata non si chiede quasi mai:** si deduce dai denti. La si chiede **solo** per i dispositivi
  d'arcata (verbale §6-bis, regola strutturale).
- **Niente «passo 2 di 3»**: i passi variano, un conteggio fisso mentirebbe.
- **Denti:** una arcata alla volta su telefono (O5), due arcate + fila su tablet, mappa e colore affiancati su
  desktop. Sagome sovrapposte alle illustrazioni di Francesco (W15). Selezione = contorno che segue il dente;
  in scuro azzurra, mai grigia; numero in pastiglia chiara, che **non segue il tema** (W18).
- **Colore:** non si mostrano le arcate, si mostrano **solo i denti scelti**, ritagliati e raggruppati in
  «Sopra»/«Sotto» (W19). Ricerca sempre presente; due scale in linguette. Codice protagonista, pastiglia
  decorativa. **Pressione prolungata → colore a tutto schermo**, con la dicitura «non è un campione di
  misura» (W9).
- **Cassetta:** ultimo passo, saltabile («il pacco non è ancora arrivato»); i lavori senza cassetta devono
  essere visibili (W4).

---

## 6. La Dichiarazione di Conformità

- `prescrizione_caratteristiche` riceve la **stringa collassata dell'ultimo valore di ogni dente** — la
  realtà del manufatto consegnato (**W21, che supera W20**; §10-bis). La colonna `provenienza` non decide
  più che cosa si stampa: serve al precheck (W22).
- ➡️ **Il testo dichiara ciò che è, senza spacciarlo per prescritto** (§10-bis): p.es. «Elementi 13-23 ·
  colore A3 (VITA classical) · dispositivo come realizzato». Mai «come da prescrizione» sopra un dato che
  potrebbe non venire dalla prescrizione.
- 🔴 **Il collasso deve conoscere le arcate**: «13-23» attraversa la mezzeria e vale **sei** denti
  (13,12,11,21,22,23) — un'espansione numerica ingenua ne produce **undici** (§6-septies ⑪).
- **Criterio di ammissibilità: nessuna perdita d'informazione.** Si deve poter ricostruire quale dente porta
  quale colore. «13-23: A3» passa; «A3 (6 elementi)» no.
- Il template legge lo **snapshot**, non il lavoro vivo.

---

## 7. Il gancio per la voce 2 (avviso alla consegna)

Questa spec **non costruisce** l'avviso, ma deve renderlo possibile: `precheck.ts` dovrà poter chiedere
«questo lavoro ha denti/colore dove il tipo li prevede?» e «esiste un colore mai `prescritto`?». Se questo
gancio non esiste, «Lo scrivo dopo» resta senza conseguenza e i tocchi chiesti all'operatore si buttano.

---

## 8. Migration — ordine

1. `ALTER TABLE lavori ADD CONSTRAINT lavori_id_lab_uk UNIQUE (id, laboratorio_id)` — **oggi non c'è**,
   serve alla FK composita.
2. `colori_dentali` + seed (16 + 3 + 29).
3. `lavori_denti` con CHECK, FK composita, RLS, REVOKE/GRANT.
4. `lavori`: `colore_scala`, `colore_codice`, `denti_snapshot`, `denti_snapshot_at`.
5. `dichiarazioni_conformita`: `DROP COLUMN colore_dente` (W23).
6. Fix `DENTI_DECIDUO`: il quadrante si **deriva da `numero/10`**, non si legge dal campo sbagliato
   (§6-sexies ⑥).
7. FASE 6b: `supabase gen types` + `tsc --noEmit`.

**Reversibile:** tutto (`DROP TABLE`, `DROP CONSTRAINT`). Il `DROP COLUMN` del passo 5 è reversibile **nella
forma** (`ADD COLUMN`) ma non nei dati: prima di eseguirlo va **verificato su DB che la colonna sia davvero
vuota** (`count(*) WHERE colore_dente IS NOT NULL` → 0), non dato per scontato.
**Irreversibile:** una DdC già emessa che cita la nuova fonte — resta valida e va conservata **10 anni**
(§6-septies ⑩).

---

## 9. Le prove da scrivere PRIMA di dire «fatto»

| # | Rischio | Prova |
|---|---|---|
| R1 | Il dato clinico si perde ancora | test che fa fallire l'INSERT dei denti dentro l'RPC → `count(*)=0` su `lavori`: nessun orfano · `accessoriFalliti` non può più contenere `'dettagli'` |
| R2 | Un secondo «2.6» entra | test su DB vero che rifiuta `19, 29, 30, 49, 50, 86, 0, -11, 4.5, '11 ', '2.6'` · route → **422**, mai 500 · l'insieme valido ha **esattamente 52** membri derivati da `denti-fdi.ts` |
| R3 | Due fonti dello stesso fatto | test che `PATCHABLE_FIELDS` non contiene nessuno dei 5 nomi (calco di `lavori-patch-sentinella-cassetta.test.ts`) + guardia grep sui writer |
| R4 | Un laboratorio vede i denti di un altro | PUT su lavoro altrui → **404** · RPC con `p_lab` sbagliato → esito esplicito, zero scritture · `SET LOCAL ROLE service_role; DELETE` → deve fallire · PostgREST diretto con JWT di B → solo righe di B |
| R5 | Il tenant diventa incancellabile | `admin_delete_laboratorio` su un lab con righe `lavori_denti` non deve sollevare + asserzione da `information_schema` che ogni tabella con `laboratorio_id` compaia nella funzione |
| R6 | Il collasso sbaglia i denti | «13-23» → **6** codici, non 11 · nessuna perdita d'informazione |
| R7 | La DdC cambia dopo l'emissione | rigenerare dopo aver cambiato i colori **non** cambia record né `sha256` |
| R8 | Bersagli sotto il minimo | Playwright a 390/768/1280 × chiaro/scuro: ogni dente ≥ 44×44, tasto primario **dentro** il viewport |

⚠️ **Il controllo «testo al 200%» non è ancora stato fatto davvero** (verbale §2): il mockup usa px fissi,
quindi il test non misurava nulla. Va rifatto sul device.

---

## 10. Fuori perimetro, tracciato

- Email e portali degli scanner (W1) — voce propria.
- Avviso alla consegna (voce 2 roadmap) — questa spec lascia il gancio (§7).
- `RicevutaConsegnaTemplate.tsx:347`: dichiara 15 anni per un documento non impiantabile (§6-septies ⑭).
- La riemissione correttiva della DdC dopo la consegna: **oggi non esiste** (§6-septies ⑫).
- La policy `ddc_laboratorio_update` consente UPDATE malgrado il commento «snapshot immutabile».
- Rifiniture mockup: ritagli che prendono gengiva · WebP · asimmetria 11/21 nella striscia.
- `OdontogrammaFDI.tsx` v2.3 (hit-area 19-26px, numero 8px): va rifatto in v3 — **è dentro il perimetro
  come sostituzione**, ma la sua morte come componente legacy va tracciata.

---

## 10-bis. ✅ Le tre ambiguità — CHIUSE da Francesco (27/07/2026)

### W21 — «Conta la realtà del manufatto consegnato»

> «*a noi interessa che nel documento finale venga tracciata la realtà del manufatto consegnato, quindi da chi
> proviene a noi interessa poco, basta segnare l'ultimo dato ottenuto*»

**⚠️ Questo supera W20 nella sostanza:** il documento **non** stampa «solo i valori prescritti», stampa
**l'ultimo valore, cioè quello del pezzo realmente consegnato**.

**La colonna `provenienza` RESTA comunque** — ma cambia mestiere: non decide più cosa stampare, serve al
**precheck di consegna** (W22) per poter dire «questo colore non è mai stato confrontato con la
prescrizione». Costa una colonna e non toglie nulla.

⚠️ **Sfumatura normativa da non perdere, e la sua soluzione.** L'Allegato XIII §1 elenca **due** cose
distinte: *«i dati che consentono di identificare il dispositivo»* **e** *«le caratteristiche specifiche del
prodotto indicate nella prescrizione»*. La scelta di Francesco è pienamente difendibile sul **primo**
elemento — un documento di conformità che descrive il pezzo consegnato è esattamente ciò che deve fare — ma
il campo che oggi useremmo (`prescrizione_caratteristiche`) porta nel nome il **secondo**.
➡️ **Regola da applicare:** il testo generato **dichiara ciò che è**, senza spacciarlo per prescritto —
p.es. «Elementi 13-23 · colore A3 (VITA classical) · dispositivo come realizzato». Non si scrive «come da
prescrizione» sopra un dato che potrebbe non venire dalla prescrizione. Costo zero, e chiude il rischio ⑮.

### W22 — Niente blocco al banco: **il controllo sta alla consegna**

> «*basta anche solo un check pre consegna, se tutti gli elementi obbligatori siano presenti*»

**La foto della prescrizione resta accessoria alla creazione** (nessun blocco al banco, dove la connessione
è quella che è) **e diventa obbligatoria alla consegna**, dove il documento si genera davvero.

➡️ **Il precheck di consegna (`precheck.ts`) diventa il guardiano di tutti gli obblighi**, non solo di
questo: denti e colore dove il tipo li prevede · la prescrizione archiviata · il colore mai confrontato.
**Questa spec deve costruire il gancio; la regola di blocco/avviso è la voce 2 della roadmap.**
🔑 Risolve alla radice il problema di «Lo scrivo dopo»: si può rimandare tutto, ma **non si consegna** finché
manca ciò che il documento richiede. Il momento del controllo è quello giusto — è lì che i dati diventano
documenti.

### W23 — `dichiarazioni_conformita.colore_dente` **si elimina**

> «*se serve usala sennò togli, il codice nella nostra pwa deve essere più ordinato e pulito possibile*»

Col colore per-dente quella colonna singola **non serve più a niente**: la sostituisce il testo collassato in
`prescrizione_caratteristiche`. **`DROP COLUMN` nella stessa migration.**

---

## 12. ✅ Esecuzione in TRE ONDATE — deciso da Francesco (27/07/2026)

Ogni ondata si prova, si rivede e va in produzione **da sola**. Ognuna avrà il **suo** piano
(`superpowers:writing-plans`): non si scrivono i piani di (b) e (c) prima che (a) sia in casa.

### Ondata (a) — «Il dato esiste e non si perde più»
**La migration INTERA sta qui** (tutti i passi del §8, compreso il `DROP COLUMN` di W23): non si spezza fra
ondate. La colonna eliminata appartiene alla DdC, cioè all'ondata (c), ma è **morta oggi** — toglierla subito
è innocuo e toglierla dopo significherebbe una seconda migration.

Perimetro: migration + `PUT /api/lavori/[id]/denti` + `lavoro_crea_atomico` + le **sentinelle** sui 5 campi
(più la validazione mancante su `denti_mancanti`/`denti_impianti`) + la **funzione pura di precedenza**
riga→caso (§3.2). Prove **R1, R2, R3, R4, R5**.

🛑 **Vincolo di sequenza da NON sbagliare — è il rischio principale del taglio in ondate.** Nel momento in cui
le 5 colonne vecchie escono da `PATCHABLE_FIELDS`, i **due scrittori che esistono oggi smettono di
funzionare**: `crea-lavoro.ts:187-203` (il wizard attuale) e `TabClinica.tsx` (la scheda del lavoro). Se le
sentinelle partono in (a) e la nuova interfaccia arriva in (b), **fra le due ondate l'app non sa più salvare
denti e colore.**
➡️ **Quindi l'ondata (a) include il reindirizzamento di entrambi gli scrittori sul nuovo endpoint,
a grafica invariata.** Nessun pixel cambia in (a): cambia solo dove il dato va a finire. La grafica è (b).
L'alternativa — rimandare le sentinelle a (b) — riaprirebbe le **due sorgenti dello stesso fatto** che il
gate FASE 3 §2 ha chiuso apposta: scartata.

### 🔴 Ondata (b) — il debito che questa spec NON aveva ripreso (aggiunto 27/07, domanda di Francesco)

**Il passo «paziente» dell'ondata (b) deve chiudere la metà rimasta della tappa 1 «nome e cognome».**
Verificato il 27/07 cercando «cognome», «alias» e «targa» in questa spec e nel verbale: **non compaiono
mai qui**, e nel verbale esiste **una sola riga** (§7, punto 5, fra le cose aperte). Senza questa nota il
pezzo cadeva fra due ondate.

**Stato reale:** la metà indipendente è **in produzione** (`9aea0f22`, `676a82a1`): nome e cognome si
correggono dalla scheda paziente, con la regola unica di scrittura `src/lib/domain/nome-paziente-scrittura.ts`.
La metà che tocca il wizard fu **fermata** il 27/07 mattina proprio perché il wizard andava ripensato — ed
è questa spec ad averlo ripensato.

**Conseguenza oggi misurabile:** il wizard scrive ancora `cognome: alias || pz`, tutto in una casella sola.
⚠️ **La targa della cassetta NON è migliorata** — la lamentela ratificata («taglia la coda, sparisce il
cognome») è ancora aperta e si chiude **qui**, non altrove.

**Quindi l'ondata (b) deve, nel passo paziente:**
- scrivere `nome` e `cognome` **separati** (spec `2026-07-27-nome-cognome-paziente-design.md`, D6: due
  caselle, ratificata — la contro-proposta «una casella sola» è stata presentata e respinta);
- riusare `risolviNomePaziente` / `cognomeEffettivo`, che **esistono già** e sono l'invariante di `pazienti`
  con tre scrittori: non riscriverli;
- 🛑 tenere l'invariante `nome: ''` (mai `null`): il trigger `sync_paziente_nome_cognome` compone solo se
  entrambi sono non-null, e un `null` viola il NOT NULL su `nome_cognome` → **500 bloccante alla creazione**;
- 🛑 non lasciare il codice paziente fuori da `nome_cognome` senza fallback: la catena `??` di
  `precheck.ts:40-43` e `generate-ddc.ts:93` si ferma su `' '` (che **non è** nullish) → ogni lavoro da
  wizard senza nome diventerebbe **non consegnabile**;
- chiudere la voce ancora aperta del verbale §7.5: **il testo di aiuto che sostituisce «alias»** sul campo.

**Resta FUORI** (voce 5 della roadmap, percorso GRANDE con panel normativo): la tappa 1-bis, cioè correggere
il nome dalla **scheda del lavoro** — `paziente_nome_snapshot` è una fotografia che esiste apposta per non
cambiare, e la tensione fra rettifica (Art. 16 GDPR) e immutabilità (MDR Art. 10(8)) non si scioglie qui.

### 🟡 Ondata (b) — l'avanzamento dei passi è APERTO, non deciso

§5 dice cosa **non** fare («niente passo 2 di 3»: i passi variano col tipo, un conteggio fisso mentirebbe)
ma **non dice cosa mettere al suo posto**. È il punto 4 delle cose aperte del verbale §7, mai chiuso.
➡️ Va deciso **all'inizio** dell'ondata (b), sui mockup e con approvazione di Francesco (§0B) — non
scrivendo il componente. Vincolo noto: il wizard oggi ha `ProgressDots` (DS §5.32), che presuppone un numero
di passi fisso; con i passi variabili quel componente o cambia o esce.

### Ondata (b) — «Il wizard chiede le cose giuste, e i denti si toccano»
`TIPI_LAVORO` estesa con «prevede denti / colore / arcata» (la tabella dei 38, verbale §6-quater) · wizard
adattivo a passi variabili · passo denti sulle illustrazioni con le sagome · passo colore sui soli denti
scelti · «Lo scrivo dopo» · cassetta saltabile · foto della prescrizione col fallimento visibile ·
sostituzione di `OdontogrammaFDI.tsx` v2.3 con la versione v3 · asset in WebP.
Prova **R8** + **FASE 9b, gate estetico L2** (obbligatorio: è l'ondata con UI).
⚠️ Qui va rifatto sul device il controllo **«testo al 200%»** (§9), che finora non ha misurato nulla.

### Ondata (c) — «Il documento dice la verità, e la consegna se ne accorge»
Il collasso che conosce le arcate · `prescrizione_caratteristiche` riempita con la dicitura di §6 · il
template che legge lo **snapshot** e non il dato vivo · la scrittura di `denti_snapshot` alla consegna · il
**gancio nel precheck** (§7). Prove **R6, R7**.

---

## 11. Cosa NON è stato verificato

- L'ordine dente→colore sulle prescrizioni italiane reali (guardarne cinque: costa poco).
- La base espressa del periodo di conservazione della **documentazione tecnica** per i su misura: l'art. 10(8)
  àncora i 10/15 anni alla dichiarazione UE, che i su misura **non hanno**. Il progetto assume 10 anni: è dal
  lato sicuro, ma **è un'assunzione**, non una citazione.
- Se `DdcTemplate` abbia altri lettori di dati vivi oltre a `denti_coinvolti`.
