# RESOCONTO — Task C-quinquies: il numero di prescrizione esce (D319)

**Ramo:** `intervento-post-consegna` · **Base:** `1c211a69` · **Data:** 08/08/2026, pomeriggio
**Decisione eseguita:** ⚖️ **D319** — centotrentottesima tornata di
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`

---

## 0. IN UNA RIGA

Il numero di prescrizione è uscito **dal foglio, dal costruttore, dalle due allowlist TypeScript e
dall'allowlist SQL**. Le colonne in banca dati restano tutte. **Il mandato ne contava DUE: sono TRE**, e
**una delle tre non è affatto morta** — resta una porta d'ingresso aperta, riferita e non chiusa.

---

## 1. 🔴 LE DUE MISURE CHIESTE

### MISURA ① — `payload_sha256` **è** calcolato sulla riga da cui la chiave esce. **SÌ.**

`provato:` lettura del codice, catena completa:

```
src/lib/pdf/generate-ddc.ts
  const ddc = { …, prescrizione_id: lavoro.numero_prescrizione ?? null, … }   ← :257 (prima)
  const ddcConNorma = { ...ddc, norma_riferimento: … }                        ← :330
  const payloadSha256 = improntaPayload(ddcConNorma)                          ← :334
  riga = { ...ddc, …, payload_sha256: payloadSha256, … }                      ← :361
```

e `improntaPayload` passa da `canonico`, che **serializza le chiavi presenti** ordinandole:

```js
`{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonico(o[k])}`).join(',')}}`
```

➡️ **Togliere la chiave cambia l'impronta di tutte le emissioni future.** Il segmento
`"prescrizione_id":null` spariva dalla stringa canonica, quindi lo `sha256` cambia.

**Perché è accettabile, e non è un «vabbè»:**
- per la **dichiarazione** `payload_sha256` è un dato d'archivio: `grep` su tutto il repo mostra che
  nessuno lo **riconfronta** — si scrive all'emissione e si legge solo per ispezione;
- ⚠️ **nel DPA la stessa funzione fa un mestiere diverso**, e la differenza va detta perché è la ragione
  per cui qui è sicuro: `generate-dpa.ts:146` e `:347` usano l'impronta come **chiave di ricerca**
  (`.eq('payload_sha256', impronta)`) con un **indice unico** sopra
  (`schema.sql:2952`). Là un cambio di forma del payload sarebbe un'altra cosa. Qui no.
- le impronte **già scritte restano valide**: certificano il payload di allora, che è il loro mestiere.

**📌 E c'è una divergenza da una convenzione di casa, dichiarata e non nascosta.** Sessanta righe più
sotto, nello **stesso oggetto**, `firma_ddc_sha256` è una chiave altrettanto morta che è stata **TENUTA a
`null`** il 07/08, con la ragione scritta accanto: «*la chiave si tiene esplicita perché il payload
dell'impronta (`payload_sha256`) mantenga la stessa FORMA*». Qui la chiave è stata **tolta**, come ordina
il brief. **Ho cercato una differenza nei dati e NON c'è:** `provato:` entrambe le colonne sono
valorizzate in **0 righe su 6**. La differenza difendibile è solo di natura — là moriva il **valore**, qui
D319 toglie **la voce dal documento** — ma **nessuna decisione numerata dice quale delle due forme sia la
regola di casa**. È scritto nel codice accanto alle due chiavi, ed è **riferito** qui.

### MISURA ② — nessuna dichiarazione emessa porta il numero. **CONFERMATO, il presupposto regge.**

`provato:` `node scripts/psql.mjs`

```
SELECT template_version, count(*) AS n, count(prescrizione_id) AS con_presc,
       count(firma_ddc_sha256) AS con_firma
  FROM public.dichiarazioni_conformita GROUP BY 1 ORDER BY 1;

┌─────────┬──────────────────┬─────┬───────────┬───────────┐
│ (index) │ template_version │ n   │ con_presc │ con_firma │
├─────────┼──────────────────┼─────┼───────────┼───────────┤
│ 0       │ 'ddc-v1'         │ '3' │ '0'       │ '0'       │
│ 1       │ null             │ '3' │ '0'       │ '0'       │
└─────────┴──────────────────┴─────┴───────────┴───────────┘
```

**0 su 6.** 🔑 **E c'è di più di quanto il brief chiedesse: NESSUNA dichiarazione `ddc-v3` esiste.** Le sei
in archivio sono 3 `ddc-v1` e 3 di era pre-registro. Il presupposto del «niente salto di versione» non
regge solo perché quella riga non è mai stata stampata: regge perché **`ddc-v3` non ha ancora nessun
documento da contraddire**. Nessuno stop, nessun `ddc-v4`.

Contorno, sulle colonne del lavoro:

```
lavori = 299 · lavori_con_numero = 0 · righe_prescrizioni = 0 · presc_con_numero = 0
```

---

## 2. I CINQUE PUNTI

### ① Il generatore — `src/lib/pdf/generate-ddc.ts`
`prescrizione_id` **tolta** dall'oggetto `ddc`, con al suo posto il blocco che spiega perché è uscita, la
misura sull'impronta e la divergenza da `firma_ddc_sha256`. Aggiunta al **registro delle versioni** la
riga che dichiara il tredicesimo blocco uscito da `ddc-v3` **senza salto**, con la query incollata: chi
fra dieci anni legge il registro deve trovarci anche ciò che è uscito **senza** cambiare etichetta.

### ② Il foglio — `src/components/features/pdf/DdcTemplate.tsx`
Blocco condizionale «N. prescrizione» **tolto** dal §3. **Resta il nome del prescrittore**, che è la voce
⑤ e non si tocca. Il §3 **non resta con un buco né con un'etichetta orfana** — provato sotto.
🔴 **Corretta anche una riga dell'intestazione D294 che da oggi era FALSA:** elencava «il numero della
prescrizione» fra ciò che **RESTA** sul foglio.

### ③ L'allowlist TypeScript — `src/lib/dichiarazione/correzioni.ts`
Nome fuori da `CAMPI_CORREGGIBILI_DOCUMENTO` (**8 → 7**) **e** da `CAMPI_TESTO` (**5 → 4**).
⚠️ Il brief nominava solo «otto nomi → sette»: **anche il commento di `CAMPI_TESTO` diceva «le cinque
voci»** ed è stato corretto. Intestazione del file aggiornata a «sette nomi per sei voci», con la ragione
normativa scritta per esteso. Aggiornato anche `riemetti/route.ts:257` («LE OTTO VOCI» → «LE SETTE VOCI»).

### ④ L'allowlist SQL — migration nuova
`supabase/migrations/20260808142358_atto_unico_senza_numero_prescrizione.sql`
Timestamp preso con `date -u "+%Y%m%d%H%M%S"` in **comando separato** (D311) → `20260808142358`, sopra il
pavimento `20260808112700`. **Migration nuova**, nessuna delle tre già nel ledger toccata. Idioma
`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`. Corpo **ribattuto identico** salvo:
`c_su_lavori` da 6 a 5 nomi · la riga `numero_prescrizione = …` fuori dall'`UPDATE SET` · il `COMMENT`
(«OTTO chiavi» → «SETTE», e la tabella chiave→destinazione senza quel nome).

🔑 **I due posti si tolgono INSIEME, e il verso conta** (misurato leggendo la funzione, non assunto):
- togliere il nome dall'allowlist e **lasciare** la riga del `SET` → assegnazione morta, innocua ma
  bugiarda (riscrive la colonna col proprio valore);
- togliere la riga del `SET` e **lasciare** il nome → la prova d'atterraggio dentro la funzione
  (`chiavi accettate ma NON atterrate su lavori`) alzerebbe a ogni chiamata che lo mandi.
  ➡️ **Tolti entrambi.**

`npx supabase db push --linked --yes` (D284, applicare non si chiede):
```
Applying migration 20260808142358_atto_unico_senza_numero_prescrizione.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260808142358_…sql"],…,"message":"Finished supabase db push."}
```

**Riletta dal catalogo vivo** (non dal file):
```
c_su_lavori CONSTANT text[] := ARRAY[
  'richiedente_nome', 'paziente_id', 'paziente_nome_snapshot',
  'tipo_dispositivo', 'descrizione'];
      richiedente_nome       = v_lavoro_atteso.richiedente_nome,
      paziente_id            = v_lavoro_atteso.paziente_id,
      paziente_nome_snapshot = v_lavoro_atteso.paziente_nome_snapshot,
      tipo_dispositivo       = v_lavoro_atteso.tipo_dispositivo,
      descrizione            = v_lavoro_atteso.descrizione
```
**ACL dopo il `REVOKE`** (che dopo un `CREATE` fresco è portante):
```
acl = postgres=X/postgres | service_role=X/postgres      ← niente PUBLIC, anon, authenticated
```

**Comportamento vivo:**
```
❌ P0001 atto unico: chiavi che non sono voci correggibili del documento: {numero_prescrizione}
   (ammesse: {richiedente_nome,paziente_id,paziente_nome_snapshot,tipo_dispositivo,descrizione,
              denti_coinvolti,prescrizione_caratteristiche})
```

### ⑤ 🛑 LE COLONNE ORFANE PORTANO LA LORO RIGA — **e sono TRE, non due**

| Colonna | Stato dopo D319 | Dove sta scritto |
|---|---|---|
| `lavori.numero_prescrizione` | 🪦 **cimitero pieno** — nessun lettore, nessuno scrittore | `src/types/domain.ts` (sopra la colonna) · `src/app/api/lavori/[id]/route.ts` (accanto all'esclusione dalla PATCH) · il `COMMENT` della RPC · roadmap riga 27 |
| `dichiarazioni_conformita.prescrizione_id` | 🪦 **senza produttore da oggi** — nessuna strada produce più un valore ⚠️ *ma la riemissione lo **eredita**, non lo azzera: v. sotto* | `src/types/domain.ts` (sopra la colonna) · il `COMMENT` della RPC · roadmap riga 27 |
| `lavori_prescrizioni.numero_prescrizione` | 🔴 **NON è un cimitero** — porta d'ingresso ancora aperta | `src/types/domain.ts` · `src/lib/prescrizione/componi-snapshot.ts` (sopra la chiave) · il `COMMENT` della RPC · roadmap riga 27 |

**Sulla ①, la trappola da nominare:** *sembrerà viva*. Due rotte di fatturazione la **selezionano**
ancora — `api/fatture/batch/route.ts:113` e `api/fatture/[id]/xml/route.ts:97` — perché caricano la riga
intera del lavoro per costruire il tipo di dominio. **Nessuna la usa.**

**Sulla ②, una precisione che mi ero perso e che correggo qui, perché è la stessa distinzione che ho
preteso per la ③.** Togliere la chiave da `ddc` cambia anche il comportamento della **riemissione**:
`v_nuova := jsonb_populate_record(v_vecchia, p_nuova || …)` — una chiave **presente** in `p_nuova`
sovrascrive, una chiave **assente si eredita dalla riga superata**. Finché `prescrizione_id` c'era, il
successore riceveva `NULL` **per assegnazione**; da oggi **si porta avanti** ciò che c'era. Oggi è sempre
`NULL` (0 su 6, nessun produttore), quindi l'effetto è nullo — ma «perde il suo **unico scrittore**» è la
formulazione larga: quella giusta è **«non ha più un produttore»**. È ereditarietà silenziosa, la stessa
famiglia che il C-ter ha chiuso sulla coppia `anno_ddc`/`progressivo_ddc`.
🛑 **Il `COMMENT` della migration porta ancora la formulazione larga**, e ce l'ho lasciata di proposito:
`20260808142358` è **applicata e nel ledger**, e non si modifica una migration registrata per una
sfumatura di prosa. La precisione sta in `src/types/domain.ts` sopra la colonna, con la nota che la
prossima migration che riscrive quella funzione se la porti dietro.

**Sulla ③, v. il difetto B2 qui sotto.**

Aggiornato anche `src/lib/wizard/crea-lavoro.ts`: la casella del wizard non manca per dimenticanza, **non
arriverà** — o il prossimo l'aggiunge credendo di riparare un buco.

---

## 3. 🔴 DOVE IL BRIEF SBAGLIA — quattro difetti

**B1 — «le DUE colonne orfane»: sono TRE.**
Il punto 5 censiva `lavori.numero_prescrizione` e `lavori_prescrizioni.numero_prescrizione`. Manca
**`dichiarazioni_conformita.prescrizione_id`** (`002_fase2_schema.sql:183`), che perde il suo **unico**
scrittore proprio col punto ① del brief. È R-P6 alla lettera, sulla colonna che il mandato stesso
orfanizza. **Chiusa: porta la sua riga.**

**B2 — 🔴 «nessuno le legge e nessuno le scrive» è FALSO per `lavori_prescrizioni.numero_prescrizione`,
e lo era già in D319** («*nessuno può scriverlo… la riga di `lavori_prescrizioni` nasce dentro un `IF`
che nessun chiamante attiva*»). **Vince il codice:**
- **scrittore vivo:** `POST /api/lavori` valida la chiave e la manda —
  `src/app/api/lavori/route.ts:234-240` → `componiSnapshot` (`src/lib/prescrizione/componi-snapshot.ts:44-51`)
  → `lavoro_crea_atomico`, che fa `INSERT INTO lavori_prescrizioni (…, numero_prescrizione)`
  (`20260804152403_ondata_b_prescrizioni_rpc.sql:121-124`);
- **secondo scrittore:** il clone del rifacimento la propaga (`20260807185858_rifacimento_evento.sql:177-180`);
- **lettore vivo:** `src/lib/domain/prescrizione-mapper.ts:291` la porta nel tipo di dominio, da cui esce
  nella risposta della scheda (`tests/unit/lavori-id-route-get-prescrizione.test.ts:93,140`).

Ciò che è vero è **più stretto**: *il wizard non ha la casella* e *da D319 quel numero non alimenta più
nessun documento*. È così che l'ho scritto accanto alla colonna: scriverci «nessuno la scrive» sarebbe
stato **un commento falso su un percorso vivo**, cioè esattamente l'errore che il punto 5 vuole evitare.
🛑 **Non ho chiuso la porta** — togliere una chiave da un contratto pubblico è una decisione a sé (R-E2):
**roadmap, la riga 27 della coda**, con la domanda per Francesco già formulata.

**B3 — il punto ③ nominava un solo conteggio e ce n'erano due.** «Aggiorna il commento in testa al file,
che oggi dice *otto nomi per sette voci*» — ma **una riga sopra l'array `CAMPI_TESTO`** c'era «*Le
**cinque** voci che sono TESTO*», che con questo compito diventano quattro. È il commento più vicino al
codice toccato, ed è quello che sarebbe rimasto stantìo.

**B4 — la stessa svista, nel modello.** L'intestazione D294 di `DdcTemplate.tsx` elenca «il numero della
prescrizione» fra ciò che **RESTA** sul foglio, con la ragione scritta. Il brief chiedeva di togliere il
blocco (righe 402-406) e non nominava quella riga, che sarebbe rimasta a dire il contrario del codice.

---

## 4. LE PROVE — aggiornate, non cancellate, e provate rosse

### R-P4 ① — l'allowlist TypeScript
Rimettendo `numero_prescrizione` nelle **due** allowlist di `correzioni.ts`:
```
⎯⎯⎯ Failed Tests 5 ⎯⎯⎯
FAIL … > CAMPI_CORREGGIBILI_DOCUMENTO — sette nomi e non uno di più > sono esattamente le sette chiavi…
  AssertionError: expected [ 'denti_coinvolti', …(7) ] to deeply equal [ 'denti_coinvolti', …(6) ]
FAIL … > ⚖️ D319 … > 🔴 `numero_prescrizione` con un valore BUONO è rifiutato…
  AssertionError: expected true to be false
FAIL … > ⚖️ D319 … > e il messaggio lo NOMINA, invece di scartarlo in silenzio
  Error: atteso rifiuto
FAIL … > ⚖️ D319 … > 🛑 e non passa nemmeno in compagnia di una voce buona…
  AssertionError: expected true to be false
FAIL … > ⚖️ D319 … > 📌 …e l'elenco che il messaggio propone NON lo nomina più fra le voci ammesse
  AssertionError: expected ' richiedente_nome, paziente_id, pazie…' not to contain 'numero_prescrizione'
      Tests  5 failed | 44 passed (49)
```
**5 asserzioni su 5 si accendono.** Ripristinato l'elenco vero → `49 passed (49)`.

### R-P4 ② — il foglio
Rimettendo il blocco condizionale in `DdcTemplate.tsx` (la fixture del foglio massimale porta
`prescrizione_id: 'PRESCR-2026-77'` **valorizzato**, quindi la riga avrebbe davvero da stampare):
```
FAIL … > D294 — il foglio massimale porta SOLO ciò che ci deve stare
       > 🔴 e NESSUNO dei DIECI tagli che lasciano un testo…
AssertionError: taglio non applicato: numero di prescrizione (valore):
  expected 'Laboratorio Odontotecnico Opromolla S…' not to contain 'PRESCR-2026-77'
      Tests  1 failed | 58 passed (59)
```
Ripristinato → `59 passed (59)`. **Due asserzioni**, il valore **e l'etichetta** «N. prescrizione»: un
taglio applicato a metà lascia proprio l'etichetta orfana, ed è ciò che il brief chiedeva di guardare.
📌 **Questa è anche la verifica del documento generato** chiesta al posto della FASE 9: il testo del PDF
è estratto e letto per intero, e il §3 esce col solo nome del prescrittore.

### R-P4 ③ — l'allowlist SQL, sulla funzione VIVA
Copia usa-e-getta creata **da `pg_proc`** cambiando **una parola**, in **transazione annullata** (mai su
una migration registrata — R-P1 §8):
```
┌─────────┬─────────────────────────────────────┬───────────┬──────────────────────────────────────────────┐
│ (index) │ fase                                │ sqlstate  │ risposta                                     │
├─────────┼─────────────────────────────────────┼───────────┼──────────────────────────────────────────────┤
│ 0       │ '1 - nome FUORI (stato vero)'       │ 'P0001'   │ 'atto unico: chiavi che non sono voci corr…' │
│ 1       │ '2 - nome RIMESSO (regola vecchia)' │ 'nessuno' │ '{"esito" : "non_trovato"}'                  │
└─────────┴─────────────────────────────────────┴───────────┴──────────────────────────────────────────────┘
```
Dopo il `ROLLBACK`, riletto dal catalogo: `allowlist_sporca = false`, ACL intatta.

### ⚠️ UNA PROVA CHE NON POTEVA FALLIRE, trovata e sostituita
`correzioni-documento.test.ts:216` era `['un oggetto al posto di un testo', { numero_prescrizione: { n: 1 } }]`,
dentro il blocco che sorveglia **i tipi dei testi**. Con il nome fuori dall'allowlist sarebbe rimasta
**verde per la ragione sbagliata** (chiave ignota, non «non è un testo»), continuando a sembrare la rete
sui tipi. Sostituita con `richiedente_nome`, che è ancora una voce del documento.
🔑 **È lo stesso difetto che questa ondata ha già incontrato quattro volte.**

---

## 5. FASE 6b e FASE 7

**FASE 6b:**
```
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq → EXIT=0
diff src/types/database.types.ts <nuovo>  → NESSUNA DIFFERENZA
npx tsc --noEmit                          → TSC_EXIT=0
```
📌 **Nessuna differenza è l'esito atteso e va detto perché:** la **firma** della RPC non cambia (stessi
sei parametri, stesso ritorno) — a cambiare è il **corpo**, che i tipi generati non descrivono.

**FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` → **VERIFY_EXIT=0**
```
Test Files  448 passed | 6 skipped (454)
     Tests  5621 passed | 68 skipped (5689)
```
**Base: `5617 | 68 su 454` → ora `5621 | 68 su 454`: +4, e il conto torna esatto.**
Le quattro sono le asserzioni di rifiuto del blocco «D319» in `correzioni-documento.test.ts`.
🔑 **Il brief si aspettava che il numero potesse SCENDERE** («togli una voce»): non è sceso perché
**nessuna prova è stata cancellata.** Le tre che asserivano il contrario sono state **aggiornate sul
posto, senza cambiare il conto**: l'elenco esatto delle chiavi (da 8 voci a 7 dentro **la stessa**
asserzione), il caso decorativo **sostituito** (stesso `it.each`, tre casi prima e tre dopo), e
l'asserzione del foglio **spostata** dalla prova degli appigli a quella dei tagli (una riga in meno di
qua, due in più di là, ma sempre dentro `it` che esistevano già). Il conto in dettaglio:
`correzioni-documento.test.ts` **45 → 49** casi (i quattro nuovi del blocco «D319»),
`ddc-pdf-content.test.ts` **59 → 59**. Totale **+4**.

---

## 6. RITROVAMENTI FUORI MANDATO — riferiti, non corretti (R-E2)

1. 🔴 **`POST /api/lavori` scrive ancora `lavori_prescrizioni.numero_prescrizione`** — v. B2. Roadmap,
   **riga 27 della coda**. La domanda è di Francesco: si chiude il contratto pubblico, o il numero resta
   un **appunto interno** del laboratorio, dichiaratamente fuori dal documento?
2. 🟠 **Il clone del rifacimento propaga la stessa colonna** (`20260807185858:177-180`): oggi copia
   sempre `NULL`, ma è un secondo scrittore che va deciso insieme al primo.
3. 🟠 **`firma_ddc_sha256` e `prescrizione_id` sono due chiavi morte dello stesso oggetto trattate in
   modo opposto**, senza una decisione numerata che dica quale sia la regola. Misurato: entrambe 0/6.
4. Già noti e **non toccati**, come chiedeva il brief: **I3** (la porta d'idempotenza ha una sola
   asserzione) · **M1** (lo `switch` della rotta senza `default`) · **I2**
   (`paziente_nome_snapshot` vince sull'embed — Task D) · `riemetti_ddc_atomica` accetta ancora tutto
   (roadmap, riga 26) · `{anno_ddc: null}` nomina una colonna che il chiamante non ha toccato.

---

## 7. 🛑 COSA NON HO FATTO

- **Non ho cancellato nessuna colonna**, e non ho toccato lo schema: D319 dice che restano.
- **Non ho chiuso la porta d'ingresso** di `POST /api/lavori` (B2): fuori mandato, riferita.
- **Non ho toccato il resto del corpo della RPC**, né `riemetti_ddc_atomica`.
- **Non ho fatto la FASE 9 né la FASE 9b:** il PDF non è una superficie dell'app (niente viewport, niente
  temi). Al loro posto, come chiedeva il brief, **ho guardato il documento generato** — via estrazione del
  testo del PDF reso, che è il metodo di casa: il §3 porta il solo nome del prescrittore, senza buchi né
  etichette orfane.
- **Non ho pubblicato il ramo** e **non ho toccato `main`**.
- **Non ho aggiunto una decisione nuova al verbale:** D319 c'era già, questo compito la esegue. La
  divergenza `firma_ddc_sha256` / `prescrizione_id` (§6.3) è **riferita**, non ratificata: se merita un
  numero, lo dà Francesco.
- **Non ho rinominato «DdC»** (ondata a sé, 06/08/2026).
