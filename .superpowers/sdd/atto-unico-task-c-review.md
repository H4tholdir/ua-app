# REVISIONE INDIPENDENTE — Task C · «la rotta che riceve le correzioni»

**Data:** 08/08/2026 · **Ramo:** `intervento-post-consegna` · **Oggetto:** `45899445..8d201e54`
**Revisore:** agente indipendente, non l'esecutore.
🛑 **Non ho corretto una riga.** Ho *rotto* apposta il codice di produzione cinque volte per misurare
se le prove se ne accorgono, e ho rimesso tutto: `git status --porcelain` e `git diff --stat` finali
sono **vuoti** (incollati in §8), e `verify:full` è stato rilanciato **dopo** il ripristino.

---

## 0. VERDETTO

# ⚠️ APPROVATO CON RILIEVI

**In una frase:** il **codice è corretto su quasi ogni punto portante che ho potuto misurare** — i
tredici `P0001` letti dal corpo vivo si mappano uno a uno sulla separazione scritta, i sei esiti
gentili sono gestiti e l'ignoto lancia, `riga` esce pulita e le 36 chiavi rimaste sono **tutte**
colonne vere, il gettone non passa da nessun `new Date`, e si restituisce il successore e non
l'annullata — **ma la regola sul vuoto (C2) si ferma al primo livello e lascia CANCELLARE in silenzio
un contenuto obbligatorio del documento**, e **due delle prove che dovrebbero sorvegliare le proprietà
più costose restano verdi col codice di produzione rotto**.

🔑 **Il rilievo che pesa di più è nel codice, non nelle prove.** `prescrizione_caratteristiche:
{colore: ''}` passa la validazione, e l'ho seguito fino in fondo misurando ogni anello: la voce 6
dell'Allegato XIII esce dal documento **senza il colore**, e la penna scrive `""` sulla riga vera —
**con 200 e senza che niente si accenda**. È esattamente il pericolo D242 che il brief nomina, un
livello più in basso di dove è stato cercato (**C3**, §13).

🔑 **E la scopa dell'esecutore si è fermata a metà.** Ha trovato da sé **tre** difetti nelle proprie
prove — è la parte migliore del suo resoconto — ma la stessa debolezza che ha chiuso su
`dichiarazioni_conformita` (§5-bis) è **ancora aperta su `pazienti`**, cioè proprio sulla porta del
tenant (punto 5 del brief), e la prova del fail-closed sull'esito ignoto — la proprietà che il brief
mette al posto 1 — **passa per il motivo sbagliato**.

🔑 **Perché non «da rifare»:** l'impianto regge, le decisioni difficili sono giuste, e nessuno dei tre
critici richiede di rifare il Task C — si chiudono in un compito breve (una funzione in
`correzioni.ts`, due righe nelle prove). E **nulla è raggiungibile oggi**: il foglio che manda le
correzioni è il Task D e non esiste. 🛑 **Ma tutti e tre vanno chiusi PRIMA che il Task D vada a
schermo**, perché dal quel momento C3 è raggiungibile con due tap.

---

## 1. LE DIECI DOMANDE, UNA PER UNA

| # | domanda | esito | dove |
|---|---|---|---|
| 1 🔴 | i sei esiti gentili, e il fail-closed sull'ignoto | ✅ **codice corretto** · ❌ **prova debole** | §2, **C2** |
| 2 🔴 | i tredici `P0001` separati **nel merito** | ✅ **corretta**, verificata sul corpo vivo | §3 |
| 3 🔴 | «restituisci quella» → il successore | ✅ **il difetto del piano è reale, la soluzione è giusta** | §4 |
| 4 🔴 | `paziente_id` senza embed | ✅ chiuso **nel caso normale**; resta un verso aperto | §5, **I2** |
| 5 🟠→🔴 | la regola sul vuoto (C2) — *il brief la dava 🟠, la alzo a **CRITICO*** | ❌ **si ferma al primo livello, e CANCELLA per davvero** | **C3**, §5-bis |
| 6 🟠 | `riga` perde `stato`+`numero_ddc`, tiene la coppia | ✅ **e nessuna chiave estranea** | §6 |
| 7 🟠 | il gettone | ✅ | §7 |
| 8 🛑 | **le prove provano?** | ❌ **2 mutazioni su 5 non accendono niente** | §8 |
| 9 🔵 | il numero delle prove | ✅ **riprodotto da me**: `5606 \| 68 su 454` | §8.6 |
| 10 🔵 | il resoconto dice il vero? | ✅ nella sostanza · ❌ conteggi per file sbagliati | §9, **M2** |
| 11 🔵 | BP-1 e la guardia | ✅ | §10 |
| 🔑 | la domanda di merito (`numero_prescrizione`) | 🔄 **il quadro si ribalta in parte** | §11 |

---

## 2. 🔴 DOMANDA 1 — I SEI ESITI, E IL FAIL-CLOSED SULL'IGNOTO

**Il codice è corretto.** `src/lib/pdf/generate-ddc.ts:640-663`: `conflitto` a sé (perché porta
`updated_at`), gli altri cinque nel ciclo su `ESITI_GENTILI`, e poi

```ts
if (esito !== 'ok' || typeof risposta.nuova_id !== 'string') {
  console.error('[ATTO UNICO] esito inatteso', data)
  throw new Error('Non è stato possibile correggere e rifare la dichiarazione')
}
```

Sei su sei, e **un valore nuovo aggiunto domani alla RPC lancia** → 500. Il verso è giusto.

### 🔴 Ma la prova che lo sorveglia non lo sorveglia — v. **C2** in §8.2

`tests/unit/correggi-e-riemetti.test.ts:189` usa `{ esito: 'qualcosa_di_nuovo' }`, **senza
`nuova_id`**. Passa quindi per la *seconda* metà della condizione, non per la prima. Misurato: §8.2.

### E lo `switch` della rotta — v. **M1**

`route.ts:364-442` non ha `default`, non ha guardia di esaustività, e **non ha un `return` dopo lo
switch**. Oggi è TypeScript a rendere il fondo irraggiungibile. **Misurato** (§8.5): aggiungendo un
dodicesimo esito all'unione, `npx tsc --noEmit` esce **1** — ma i **46 errori sono TUTTI nel file di
prova**, e **zero** nella rotta o in `generate-ddc.ts`. La rete c'è, ma è **accidentale**: regge
perché le prove dereferenziano `res`, non perché la rotta si difenda.

---

## 3. 🔴 DOMANDA 2 — I TREDICI `P0001`, LETTI DAL CORPO VIVO

🟢 **Misurato da me**, non ereditato. `pg_get_functiondef` / `prosrc` sull'oggetto **vivo** in banca
dati (non sul file di migration, che è quello che legge la prova dell'esecutore):

```
node scripts/psql.mjs  →  regexp_matches(prosrc, '(RAISE\s+EXCEPTION[^;]*);', 'g')  →  13 righe
```

| # | messaggio (dal corpo vivo, troncato al primo `%`) | dove sta nella funzione | classe giusta | come lo classifica il codice |
|---|---|---|---|---|
| 1 | `atto unico: la dichiarazione nuova non è un oggetto` | prima di tutto | richiesta | **richiesta** ✅ |
| 2 | `atto unico: le correzioni non sono un oggetto` | prima di tutto | richiesta | **richiesta** ✅ |
| 3 | `atto unico: chiavi che non sono voci correggibili del documento:` | :48 | richiesta | **richiesta** ✅ |
| 4 | `atto unico: chiavi che non sono colonne di dichiarazioni_conformita:` | :60 | richiesta | **richiesta** ✅ |
| 5 | `atto unico: chiavi che la dichiarazione nuova NON accetta dal chiamante:` | :79 | richiesta | **richiesta** ✅ |
| 6 | `atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI` | :100 | richiesta | **richiesta** ✅ |
| 7 | `atto unico: denti_coinvolti dev'essere un array di oggetti` | :121 | richiesta | **richiesta** ✅ |
| 8 | `atto unico: denti_coinvolti porta il CARICO DELLA PENNA` | :126 | richiesta | **richiesta** ✅ |
| 9 | `atto unico: prescrizione_caratteristiche dev'essere un oggetto` | :132 | richiesta | **richiesta** ✅ |
| 10 | `atto unico: annullo della dichiarazione % fallito` | :202 — **dopo l'annullo** | guasto | **guasto** ✅ |
| 11 | `atto unico: chiavi accettate ma NON atterrate su lavori:` | :237 — **dopo l'UPDATE** | guasto | **guasto** ✅ |
| 12 | `atto unico: la penna dei denti ha risposto` | :246 | guasto | **guasto** ✅ |
| 13 | `atto unico: la penna della prescrizione ha risposto` | :264 | guasto | **guasto** ✅ |

🟢 **La riga di confine l'ho letta nel corpo vivo** (`rpc-live.sql:185-187`):

```
-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  DA QUI IN POI SI SCRIVE. Ogni fallimento è un RAISE, mai un RETURN.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
```

Le nove stanno **sopra** quella riga, le quattro **sotto**. La separazione dell'esecutore è
**corretta nel merito**, non solo presente.

🔑 **E la trappola dei quattro «chiavi» è reale e presa:** #3, #4, #5 e **#11** cominciano tutte con
`atto unico: chiavi`. Il riconoscimento è per **prefisso fino al primo `%`**, e #11 non ha prefisso
nell'elenco → cade nel ripiego `guasto`. Un riconoscimento sulla parola avrebbe scambiato **proprio
quello**, cioè il caso in cui sbagliare costa di più.

### 🟢 Un controllo in più, che il brief non chiedeva: **#11 è raggiungibile dal chiamante?**

Se lo fosse, il 500 sarebbe la risposta sbagliata. **No.** #11 confronta la riga *attesa* con quella
*scritta*; l'unica cosa che potrebbe farle divergere è un trigger `BEFORE` su `lavori` che riscriva
una delle sei colonne. Misurato — l'unico è `check_lavoro_ritardo`, e tocca **solo `stato`**:

```
"BEGIN IF NEW.stato = 'in_lavorazione' AND NEW.data_consegna_prevista < CURRENT_DATE
 THEN NEW.stato = 'in_ritardo'; END IF; RETURN NEW; END;"
```

➡️ #11 può nascere **solo** da una divergenza fra l'allowlist e l'elenco del `SET`, cioè da un difetto
del contratto. **500 è giusto.**

### 📌 Una precisazione al *motivo* scritto, non alla decisione

`atto-unico-errori.ts:8-11` motiva i nove con «succedono **prima di qualsiasi scrittura**». È vero
dell'ordine dentro la funzione, ma non è la ragione portante: **una `RAISE` annulla comunque tutta la
transazione**, quindi anche i quattro post-annullo non lasciano nulla scritto. La ragione vera è
l'**attribuzione della colpa** — ed è quella giusta. La riga non è sbagliata, è solo argomentata con
la premessa più debole delle due.

---

## 4. 🔴 DOMANDA 3 — «RESTITUISCI QUELLA» ERA DAVVERO UN DIFETTO DEL PIANO

✅ **Confermo il difetto, e confermo la soluzione.** `annullata_da_evento_id = E` marca la
dichiarazione **annullata**: restituirla è consegnare il documento superato dicendo «rifatto». La
rotta (`route.ts:275-304`) legge la predecessora, poi cerca **il successore** su `sostituisce_id` e
restituisce quello. Corretto.

### 🟢 Il caso «predecessore senza successore»: verificato, ed è raggiungibile

Le due citazioni dell'esecutore le ho aperte — e stavolta i numeri di riga **tornano** (in
quest'ondata era già successo tre volte che non tornassero):

- `supabase/migrations/20260807143623_riemissione_ddc.sql:240-243` (`riapri_lavoro_atomica`)
- `supabase/migrations/20260807182614_riporta_a_pronto_atomica.sql:145-148` (`riporta_a_pronto_atomica`)

```sql
  UPDATE dichiarazioni_conformita
     SET stato = 'annullata', annullata_da_evento_id = p_evento_id
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato <> 'annullata';
```

`grep -n "INSERT INTO dichiarazioni_conformita"` su tutt'e due i file: **nessun inserimento** oltre
quello di `riemetti_ddc_atomica`. ➡️ Lo stato esiste davvero, e il **409** è la risposta onesta: non
200 (sarebbe un documento vuoto), non 500 (non è un guasto).

### 🟢 E il `maybeSingle()` non può esplodere — controllo che il brief non chiedeva

```
ddc_evento_annulla_unique   UNIQUE (laboratorio_id, annullata_da_evento_id) WHERE annullata_da_evento_id IS NOT NULL
ddc_sostituisce_unique      UNIQUE (sostituisce_id)                          WHERE sostituisce_id IS NOT NULL
```

La **prima** lettura filtra esattamente sulla coppia dell'indice → al più una riga. La **seconda**
filtra su `sostituisce_id`, che è unico **globalmente** → al più una riga. Nessuno dei due indici è
parziale su `deleted_at`, quindi non c'è il caso «due righe, una cancellata» che avrebbe fatto
esplodere `maybeSingle()` a tempo d'esecuzione.

---

## 5. 🔴 DOMANDA 4 — L'EMBED DEL PAZIENTE

✅ **Chiuso, e il difetto che l'esecutore dichiara di aver trovato da solo è reale.**
`generate-ddc.ts:259` ripiega su `lavoro.paziente?.nome_cognome`; `fondiCorrezioni`
(`correzioni.ts:241-244`) scambia **anche l'embed**, non solo l'identificativo.

✅ **E la validazione del laboratorio sta PRIMA del render.** `route.ts:340-351` legge `pazienti`
filtrando su `laboratorio_id`, e `correggiERiemettiDdC` — dove vivono `costruisciDichiarazione` e
l'upload su Storage — viene chiamata solo dopo (`:357`). L'ordine è giusto.

🛑 **Ma la prova di quella porta non prova niente: v. C1 in §8.3.**

### 🟠 **I2** — resta un verso aperto, e lo apre proprio questa rotta

`generate-ddc.ts:259` legge **`paziente_nome_snapshot` PRIMA dell'embed**:

```ts
paziente_nome: lavoro.paziente_nome_snapshot ?? lavoro.paziente?.nome_cognome ?? lavoro.paziente?.codice_paziente ?? ''
```

➡️ Lo scambio dell'embed chiude il buco **solo quando lo snapshot è nullo**. Se lo snapshot c'è,
correggere il solo `paziente_id` scrive sul documento **il nome vecchio** e sulla riga il paziente
nuovo — esattamente il difetto che l'esecutore dice di aver chiuso, un ripiego più in su.

🟢 **Quanto è grave, misurato invece che immaginato:**

```
SELECT count(*) tot, count(paziente_nome_snapshot) con_snapshot FROM lavori;
→ tot = 299 · con_snapshot = 1
```

E lo snapshot **non ha writer**: non lo scrive `POST /api/lavori` (l'`INSERT` a `route.ts:278-302`
non lo nomina), è **escluso** dall'allowlist della PATCH (`lavori/[id]/route.ts:73`), e nessun trigger
lo riempie (censiti tutti e quattro i trigger su `lavori`).

🔴 **Il punto però è questo:** l'unico writer che sta per esistere è **`CAMPI_CORREGGIBILI_DOCUMENTO`
stesso**. Chi corregge il nome stampato e poi, in un secondo intervento, cambia il paziente,
prende il nome vecchio. È un percorso di due tap in una schermata che il **Task D** deve ancora
disegnare. ➡️ **Va deciso lì**, e va scritto ora perché non si perda: o si vieta `paziente_id` da
solo quando lo snapshot è pieno, o si azzera lo snapshot insieme, o il foglio lo dice a schermo.

---

## 5-bis. 🔴 DOMANDA 5 — LA REGOLA SUL VUOTO SI FERMA AL PRIMO LIVELLO (**C3**)

✅ **È davvero UNA regola sola**, e su questo l'esecutore ha ragione: `nonDiceNiente`
(`correzioni.ts:79-85`) tratta `null`, `undefined`, testo vuoto (via `testoVivo`), array vuoto e
oggetto vuoto **con la stessa idea**. Nessun caso speciale. Il modulo è scritto bene.

🛑 **Ma la si applica solo alle otto chiavi di PRIMO livello** (`correzioni.ts:131-139`). Dentro
`prescrizione_caratteristiche` non arriva.

### 🟢 Anello ① — la validazione dice `ok` (sonda mia, output reale)

```
colore:""      => {"ok":true,"correzioni":{"prescrizione_caratteristiche":{"colore":""}}}
colore:"   "   => {"ok":true,"correzioni":{"prescrizione_caratteristiche":{"colore":"   "}}}
elementi:[]    => {"ok":true,"correzioni":{"prescrizione_caratteristiche":{"elementi":[]}}}
tipo:""        => {"ok":true,"correzioni":{"prescrizione_caratteristiche":{"tipo":""}}}
(controllo) descrizione:""                  => {"ok":false,"errore":"La correzione di «descrizione» è vuota…"}
(controllo) prescrizione_caratteristiche:{} => {"ok":false,"errore":"La correzione di «prescrizione_caratteristiche» è vuota…"}
```

⚠️ **E si vede anche l'altra metà:** i cinque testi di primo livello passano da `testoVivo` (ripuliti
ai bordi), le sotto-chiavi **no** — `'   '` sopravvive **con dentro i suoi spazi**.

### 🟢 Anello ② — il DOCUMENTO non stampa un'etichetta vuota: **perde la voce**

```
normale        => "Elementi: denti 26, 27 · Colore: A3"
colore:""      => "Elementi: dente 26"          ← il colore È SPARITO
colore:"   "   => "Elementi: dente 26"          ← idem
elementi:[]    => "Colore: A3"                  ← gli elementi SONO SPARITI
solo colore:"" => null                          ← la VOCE 6 sparisce dal documento
tipo:""        => "Elementi: dente 26"
```

🔑 **Correzione a me stesso, e la faccio per intero:** nella prima stesura avevo scritto che il
documento sarebbe uscito «malformato». **Falso, e non l'avevo misurato.** `caratteristichePrescritte`
scarta i valori vuoti, quindi non compare nessun «Colore: » monco. Il fatto è **peggiore e più
silenzioso**: la caratteristica **scompare**. E l'ultima riga è quella che fa più male —
`caratteristichePrescritte` torna `null`, e la riga del modello è **condizionale**
(`DdcTemplate.tsx:442-447`): **la voce 6 non compare affatto**. È letteralmente il difetto D295, che è
costato mesi di dichiarazioni senza uno degli otto contenuti obbligatori.

### 🟢 Anello ③ — e la penna **non rifiuta**: scrive `""` e risponde `ok`

Corpo vivo di `lavoro_prescrizione_correggi_typo`, verbatim:

```sql
  IF p_campo IS NULL OR p_campo NOT IN ('elementi','colore','tipo') THEN
    RETURN json_build_object('esito', 'campo_non_valido');
  END IF;

  UPDATE lavori_prescrizioni SET
    contenuto = CASE
      WHEN p_valore IS NULL OR jsonb_typeof(p_valore) = 'null'
        THEN contenuto - p_campo
      ELSE jsonb_set(contenuto, ARRAY[p_campo], p_valore)
    END
   WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab;
  …
  RETURN json_build_object('esito', 'ok', 'updated_at', v_updated_at);
```

➡️ La penna valida **il nome del campo, mai il valore**. Nessun `campo_non_valido`, nessuna `RAISE`
#13, **nessun 500**: `jsonb_set` infila `""` e la transazione **commit**.

### ➡️ La catena intera, misurata anello per anello

**422 mancato → documento senza la caratteristica → `lavori_prescrizioni.contenuto.colore = ""` →
`esito: ok` → HTTP 200 «rifatta».** Il dato vecchio non c'è più da nessuna delle due parti.

🔑 **Perché è CRITICO e non «importante»:** è l'unico difetto che ho trovato nel codice che va in
produzione; colpisce un **contenuto obbligatorio** di un documento a valore legale conservato dieci
anni; **cancella** invece di sbagliare, cioè non lascia traccia da cui accorgersene; e chiude in modo
incompleto **proprio la voce C2 che il brief affida al Task C** — il resoconto la dà per chiusa «con
UNA regola sola».
🔧 **Chiude in poche righe:** far passare i valori tenuti da `normalizzaContenuto` per lo stesso
`nonDiceNiente`, e `colore`/`tipo` per `testoVivo` come i cinque testi di primo livello.

---

## 6. 🟠 DOMANDA 6 — `riga`, E LE CHIAVI CHE RESTANO

✅ `generate-ddc.ts:583-585`: `const { stato: _stato, numero_ddc: _numeroDdc, ...nuova } = riga`.
✅ `anno_ddc` e `progressivo_ddc` **restano tutte e due** (`:235-236` → dentro `...ddc`).
✅ La prova si accende: **mutazione 4** (§8.4) va rossa.

### 🟢 E il controllo che vale di più, che nessun documento a monte chiedeva

La `RAISE` #4 (`chiavi che non sono colonne di dichiarazioni_conformita`) scatta a **ogni** chiamata
se `riga` porta anche **una sola** chiave che non è una colonna. Ho preso le **36 chiavi rimaste** e
le ho confrontate col catalogo vivo:

```sql
WITH riga(k) AS (VALUES ('anno_ddc'),('progressivo_ddc'), … 36 nomi … )
SELECT k FROM riga WHERE k NOT IN (SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='dichiarazioni_conformita');
```
```
[1] SELECT — 0 righe toccate
```

➡️ **Zero.** La prima chiamata vera **non** prenderà un `P0001`. (È il controllo che la prova
dell'esecutore non fa: la sua asserzione guarda una fixture, non l'elenco vero delle colonne.)
📌 `norma_riferimento` — l'unica chiave non-colonna in giro — è correttamente confinata in
`ddcConNorma` e non entra in `riga` (`generate-ddc.ts:330-333`).

---

## 7. 🟠 DOMANDA 7 — IL GETTONE

✅ Arriva dal corpo (`route.ts:242`, chiave `atteso_updated_at`), è **obbligatorio** (422 su assente,
non-stringa, vuoto o soli spazi), e **viaggia così com'è**: `const atteso = attesoGrezzo`, con il
commento che dichiara perché il `.trim()` serve solo a decidere se è vuoto.
✅ `grep -n "new Date" route.ts` → **nessuna occorrenza** nel percorso del gettone.
✅ 🟢 Misurato: la firma della RPC è `p_atteso_updated_at timestamp with time zone` → il cast lo fa
Postgres sulla stringa intera, quindi i microsecondi arrivano interi.
✅ La prova esiste ed è specifica: `correggi-e-riemetti.test.ts:122` asserisce `toContain('.314024')`.
✅ `p_atteso_updated_at = NULL` non è mai mandato.

---

## 8. 🛑 DOMANDA 8 — **LE PROVE PROVANO?** Cinque mutazioni

**Il metodo:** rompo una cosa sola nel codice di **produzione**, lancio le prove, incollo l'esito,
`git checkout --` e passo alla successiva.

### 8.1 ✅ Mutazione 1 — le due letture della porta d'idempotenza INVERTITE

*(`annullata_da_evento_id` ↔ `sostituisce_id` — il difetto che l'esecutore dichiara di aver chiuso in §5-bis)*

```
 ❯ tests/unit/riemissione-route.test.ts:521:26
    521|     expect(filtriDdc[0]).toEqual(
       |                          ^
 Test Files  1 failed (1)
      Tests  1 failed | 50 passed (51)
```

✅ **La correzione di §5-bis è VERA:** il rosso si accende. **La sua affermazione è verificata da me.**

### 🟠 **I3** — ma è **una sola** asserzione, e le due prove di *comportamento* restano verdi

Con le colonne invertite, «200 col successore» e «409 senza successore» **passano lo stesso**: 1
rosso su 51. La rete regge per il filo dedicato, non perché il comportamento sia sorvegliato. Il
resoconto lascia intendere che il buco sia chiuso su tutt'e due i fronti.

### 8.2 🔴 **CRITICO C2** — Mutazione 2: il fail-closed indebolito, e **NON SUCCEDE NIENTE**

`generate-ddc.ts` — `if (esito !== 'ok' || typeof risposta.nuova_id !== 'string')` → `if (typeof risposta.nuova_id !== 'string')`
cioè: **un esito che il contratto non dichiara passa per successo.**

🟢 **E l'ho lanciata contro TUTTI i file che toccano quei simboli, non contro un campione.** Censimento:
`grep -rl "correggiERiemettiDdC\|dichiarazione/riemetti\|validaCorrezioni\|classificaErroreAttoUnico" tests/`
→ **esattamente quattro** file, ed è l'intero corredo del Task C. Lanciati tutti e quattro:

```
=== MUTAZIONE 2: fail-closed indebolito (un esito IGNOTO passa per successo) ===
 Test Files  4 passed (4)
      Tests  130 passed (130)
```

🛑 **Centotrenta verdi su centotrenta**, cioè **tutte** le prove dell'ondata. La proprietà che il brief
mette al **posto 1** — «nessun esito sconosciuto passa per successo» — **non è provata da nessuna
parte**.

**La causa, e la prova della causa.** `correggi-e-riemetti.test.ts:188-191`:

```ts
it('🛑 un esito che il contratto non dichiara NON si legge come successo (fail-closed)', async () => {
  mockRpc.mockResolvedValue({ data: { esito: 'qualcosa_di_nuovo' }, error: null })
  await expect(chiama()).rejects.toThrow()
})
```

La finta **non porta `nuova_id`**. La prova passa quindi per la *seconda* metà della condizione — «un
`ok` senza `nuova_id`» — che è già coperta da una prova sua, tre righe più giù. La *prima* metà non è
mai stata guardata.

🟢 **Dimostrato, non dedotto.** Con la mutazione ancora in piedi ho aggiunto `nuova_id: 'n1'` alla
finta:

```
 × 🛑 un esito che il contratto non dichiara NON si legge come successo (fail-closed) 24ms
AssertionError: promise resolved "{ stato: 'ok', …(6) }" instead of rejecting
      Tests  1 failed | 20 passed (21)
```

➡️ Un contratto che domani rispondesse `{esito:'annullata_ma_non_riemessa', nuova_id:'…'}` verrebbe
letto come **«rifatta»**. Il codice di oggi lo impedisce; **la prova no**.
🔧 **Chiude in una riga:** aggiungere `nuova_id: 'n1'` alla finta di `:189`.

### 8.3 🔴 **CRITICO C1** — Mutazione 3: tolto il filtro sul laboratorio, e **NON SUCCEDE NIENTE**

`route.ts:341-346` — rimossa la riga `.eq('laboratorio_id', laboratorioId)` dalla lettura di `pazienti`:

```
=== MUTAZIONE 3: tolto il filtro sul laboratorio nella lettura del paziente ===
 Test Files  4 passed (4)
      Tests  130 passed (130)
```

🛑 **Centotrenta verdi su centotrenta**, di nuovo l'intero corredo. La porta del tenant — **il punto 5
del brief** — non è provata da nessuna parte.

**La causa.** `riemissione-route.test.ts:119`:

```ts
if (t === 'pazienti') return chain({ data: extra.paziente ?? null, error: null })
```

`chain` **inghiotte i `.eq()`**. È *esattamente* la debolezza che l'esecutore ha trovato e chiuso per
`dichiarazioni_conformita` costruendo `chainSpia` (§5-bis) — e **non l'ha applicata a `pazienti`**.

**Che cosa prova davvero** la prova a `:431` («`paziente_id` di un ALTRO laboratorio → 422 PRIMA del
render»): che *se il database non restituisce niente*, la rotta risponde 422. **Non** che la rotta
chieda al database col filtro giusto. Sono due cose diverse, ed è la seconda che protegge il tenant.

🔑 **Perché lo classifico CRITICO benché il codice sia giusto.** La RPC ha il suo controllo
(`rpc-live.sql:160-164`, `SECURITY DEFINER`), quindi il dato non fugge. Ma quel controllo arriva
**dopo il render**: è tutta la ragione per cui il brief chiede la validazione a monte. La riga della
rotta è **l'unica cosa** che evita un PDF col paziente di un altro laboratorio abbandonato su Storage
— e chi la cancellasse domani troverebbe tutte le prove verdi. Aggiungo che l'isolamento del tenant è
dominio critico per §0C.
🔧 **Chiude come l'altra:** far passare anche `pazienti` da `chainSpia`, e asserire la coppia
`('laboratorio_id', LAB_ID)`.

### 8.4 ✅ Mutazione 4 — `riga` passata così com'è

```
     86|     expect(p).not.toHaveProperty('stato')
       |                   ^
      Tests  1 failed | 20 passed (21)
```
✅ Rossa.

### 8.5 🔵 **M1** — Mutazione 5: un dodicesimo esito nell'unione

```
TSC_EXIT=1
--- errori per file ---
  46 tests/unit/riemissione-route.test.ts
--- errori che nominano la ROTTA o generate-ddc ---
(nessuno)
```

`tsc` si accende ✅ — ma **solo dal file di prova**. La rotta e la libreria non producono un errore.
La rete esiste ed è a tempo di compilazione (accettabile, e va detto), ma è **accidentale**.
🔧 Un `default: { const _esaustivo: never = esito; return err('…', 500) }` la renderebbe voluta.

### 8.6 ✅ Ripristino e **DOMANDA 9** — il numero, riprodotto da me

```
$ git status --porcelain
$ git diff --stat
(vuoto: tutto rimesso com'era)

$ npm run verify:full ; ESITO=$? ; echo "VERIFY_EXIT=$ESITO"
 Test Files  448 passed | 6 skipped (454)
      Tests  5606 passed | 68 skipped (5674)
✅ DS compliance OK (v2.3 legacy + v3)
✅ Guardia CSRF verde · ✅ reduced-motion · ✅ Coerenza verde · ✅ copia allineata
✅ 2 progetti dichiarati, 2 con prove, 5 file raccolti
VERIFY_EXIT=0
```

✅ **`5606 | 68 su 454` confermato.** La promessa `5492 | 68 su 451` → `5606 | 68 su 454` è riscossa,
e il delta **+114** torna alla cifra (v. §9).

---

## 9. 🔵 DOMANDA 10 — IL RESOCONTO DICE IL VERO?

**Nella sostanza sì**, e le tre autocorrezioni sono la parte più utile del documento. Ma ho campionato
i conteggi e **i numeri per file sono sbagliati**.

### 🔵 **M2** — i conteggi di §11, misurati uno per uno

| file | resoconto | **misurato** (`npx vitest run <file>`) |
|---|---|---|
| `correzioni-documento.test.ts` | 36 | **36** ✅ |
| `atto-unico-errori.test.ts` | 27 | **22** ❌ |
| `correggi-e-riemetti.test.ts` | 16 | **21** ❌ |
| `riemissione-route.test.ts` | «17 vecchie + 33 nuove» | **51 totali** — di cui **16** vecchie ❌ |

Il file preesistente a `45899445` porta **16** `it(` e **zero** `it.each` → 16 prove, non 17.
📌 **Le cifre di testa invece tornano:** 36+22+21+51 = **130** prove nei quattro file, meno le **16**
preesistenti = **+114**, che è esattamente `5606 − 5492`. ➡️ Il denominatore R-P4 è **130**, non 129.

### ✅ «le 17 prove preesistenti girano invariate» — verificato, ed è vero (a meno del 17)

`git diff --numstat 45899445..8d201e54 -- tests/unit/riemissione-route.test.ts` → `378 3`. Le **tre**
righe tolte sono tutte impalcatura, **nessun blocco `it(` è stato cancellato o riscritto**:

```
-const { mockGetFreshLabContext, mockFrom, mockRiemetti } = vi.hoisted(() => ({
-vi.mock('@/lib/pdf/generate-ddc', () => ({ riemettiDdC: mockRiemetti }))
-function banco(lavoro: unknown = LAVORO_RIGA, motivoEvento: string | null = 'errore_dato_dichiarazione') {
```

✅ «si estende, non si riscrive» è **una misura**, non una dichiarazione.

### ✅ Il censimento meccanizzato è ben fatto — controllato

`atto-unico-errori.test.ts:35-46` non cabla un percorso: scandisce `supabase/migrations/`, tiene i
file che definiscono `correggi_e_riemetti_atomica` e prende **l'ultimo in ordine**. Il giorno in cui
una migration nuova ridefinisce la funzione, la prova segue. E la classificazione attesa nasce da una
**seconda** lista (`QUATTRO_POST_ANNULLO`), quindi non è tautologica: una quattordicesima `RAISE`
accende **due** rossi.

### 🔵 **M3** — la riga «`{}` è 422 perché chi rifà e basta omette la chiave»

È una scelta di prodotto sensata e ben argomentata (§2 del resoconto). ⚠️ **Ma va detta al Task D come
contratto, non come nota:** un foglio che manda `correzioni: {}` quando l'utente non tocca niente
prende **422** invece di rifare la carta. È la classica cosa che si scopre a schermo.

---

## 10. 🔵 DOMANDA 11 — BP-1 E LA GUARDIA

✅ `memory/MEMORY.md` — nuova voce **195**, quella precedente scalata ad «Aggiornamento precedente».
✅ `docs/roadmap/ROADMAP-UFFICIALE.md` — aggiornata, punto di ripresa spostato al **Task D**, e la
riga 26 della coda aggiornata per dire che le due funzioni hanno ora due chiamanti nella stessa rotta.
✅ `node scripts/guardia-coerenza-documenti.mjs` → `✅ Coerenza verde — conteggi giusti, nessun
riferimento pendente, nessuna voce fantasma`.
✅ Nessuna migration, contratto SQL fermo a `20260808112700` — verificato: `git diff` non tocca
`supabase/`.

---

## 11. 🔑 L'ISTRUTTORIA — `numero_prescrizione`, **due colonne e una sola penna**

🛑 **Non concludo. Questa è l'istruttoria per Francesco.** Ma il quadro che ho misurato **non è quello
che descrive l'esecutore**, e la differenza cambia quale opzione è la meno peggio.

### I fatti, tutti misurati da me

**① Il lettore è sulla colonna legacy — verbatim, `generate-ddc.ts:257`:**
```ts
prescrizione_id: lavoro.numero_prescrizione ?? null,
```
**Nessun ripiego** su `lavoro.prescrizione?.numero_prescrizione`. ✅ Su questo l'esecutore ha ragione:
scrivere sull'altra colonna **non arriverebbe al documento**.

**② Ma `lavori.numero_prescrizione` NON HA WRITER, oggi.** Censimento su `src/` **e** sul catalogo vivo:

| chi | quale colonna scrive | prova |
|---|---|---|
| `POST /api/lavori` → `lavoro_crea_atomico` | **`lavori_prescrizioni`** | catalogo vivo: l'unica occorrenza nel corpo è `INSERT INTO lavori_prescrizioni (…, numero_prescrizione)`; `p_lavoro` (`route.ts:278-302`) **non** porta la chiave |
| `crea_rifacimento_atomico` | **`lavori_prescrizioni`** | catalogo vivo, due occorrenze, entrambe su quella tabella |
| `PATCH /api/lavori/[id]` | **nessuna** — escluso con ragione scritta (`:79-83`) | letto |
| **`correggi_e_riemetti_atomica`** | **`lavori`** ← *la novità* | `rpc-live.sql:215-221` |
| trigger di sincronizzazione | **nessuno** | `pg_trigger` su `lavori` e `lavori_prescrizioni`: solo audit, dashboard, ritardo, `updated_at` |

**③ E i dati lo confermano:**
```
lavori con numero_prescrizione NOT NULL       → 0   (su 299)
lavori_prescrizioni con numero NOT NULL       → 0
righe divergenti fra le due                   → 0
```
*(il wizard non ha ancora la casella — `crea-lavoro.ts:360` lo dice)*

### 🔴 La conseguenza che l'esecutore non nomina

➡️ **Il documento oggi non porta MAI il numero della prescrizione**, perché il generatore legge una
colonna che nessuno riempie. Non è un rischio futuro: è lo stato attuale.
➡️ E quindi `correggi_e_riemetti_atomica` **non riapre una seconda penna accanto a una prima viva**:
sta per diventare **l'unica penna** su una colonna morta che però è **l'unica che il documento legge**.
Il quadro non è «due penne sullo stesso fatto», è **una penna e un lettore che si sono persi di vista**.

### Le tre strade, col loro costo

| | che cosa si fa | costo | chi resta scontento |
|---|---|---|---|
| **(a)** | **si tiene com'è** (scelta dell'esecutore) | `lavori.numero_prescrizione` nasce con un writer solo — questa rotta; `lavori_prescrizioni` (che P38 chiama la vera) resta indietro | il prossimo che legge P38 e trova il numero altrove. ⚠️ Oggi **zero righe**: il costo è tutto futuro |
| **(b)** | **si toglie `numero_prescrizione` dall'allowlist della rotta**, con 422 esplicito | 🛑 **si perde la capacità**: non esiste nessun'altra strada per portare quel numero sul documento, perché il lettore è sulla legacy. Il Task D uscirebbe con **sei voci su sette** | l'ondata, che nasce per correggere il documento. ⚠️ L'obiezione dell'esecutore («divergerebbe dal contratto») **è debole** — un'allowlist di client più stretta con un 422 scritto è esattamente la prassi fail-closed di §9. Il costo vero è un altro |
| **(c)** | **si sposta il lettore**: `generate-ddc.ts:257` → `lavoro.prescrizione?.numero_prescrizione ?? lavoro.numero_prescrizione`, e la correzione va su `lavori_prescrizioni` (dove c'è già una rotta dedicata, `…/prescrizione/typo`) | tocca il generatore del documento e probabilmente il contratto → **è un'ondata a sé**, fuori dal mandato del Task C | nessuno, a regime. **E chiude anche il buco ② che esiste già oggi** |

🔑 **La cosa che secondo me va detta a Francesco per prima:** indipendentemente da quale strada si
sceglie, **c'è un difetto vivo oggi che non c'entra con questa ondata** — il numero della prescrizione
non arriva sul documento perché lettore e scrittore stanno su due colonne diverse. La domanda «dove
sta la penna unica» ha una gemella meno visibile: «e il lettore, sta dalla stessa parte?».

---

## 12. 🛑 CHE COSA HO VERIFICATO IO, E CHE COSA HO PRESO PER BUONO

### 🟢 Misurato da me, in questa revisione

- I **tredici `P0001`** estratti dal **corpo vivo** in banca dati (non dal file), enumerati e mappati
  uno a uno sui nove prefissi + i quattro non classificati; la riga di confine «DA QUI IN POI SI
  SCRIVE» letta nel corpo; `check_lavoro_ritardo` letto per escludere che #11 sia raggiungibile.
- Le **36 chiavi rimaste in `riga`** contro `information_schema.columns` → **zero** estranee.
- Le **tre definizioni di indice unico**, e la sicurezza dei due `maybeSingle()`.
- Le **due migration** di `riapri_lavoro_atomica` / `riporta_a_pronto_atomica`, righe aperte e citate.
- La firma `p_atteso_updated_at timestamp with time zone`.
- Il **vuoto annidato (C3), tutti e tre gli anelli**: la validazione che dice `ok`; come
  `caratteristichePrescritte` rende `{colore:''}` / `{elementi:[]}` (sonda mia, output incollato); e il
  corpo vivo di `lavoro_prescrizione_correggi_typo`, che valida **il nome del campo e non il valore**.
- I **299 lavori / 1 snapshot / 0 numeri di prescrizione** e i quattro trigger su `lavori`.
- Le **cinque mutazioni** di §8, con i rossi e i verdi incollati, e il ripristino verificato.
- `verify:full` **rilanciato da me**: uscita 0, `5606 | 68 su 454`.
- I **conteggi delle prove per file**, e il diff del file preesistente.
- **BP-1** e la guardia di coerenza.
- Il **censimento di `numero_prescrizione`** su `src/`, sul catalogo vivo, sui trigger e sui dati.

### ⚪ Preso per buono, e lo dichiaro

- **La sonda PostgREST di §3 del resoconto** (dove PostgREST deposita il nome del vincolo). Lo script
  vive in `scripts/tmp/`, ignorata da git, e non esiste più: **non l'ho rieseguita**. L'esito è
  coerente con il comportamento di Postgres e con il codice (`VINCOLI.find(v => messaggio.includes(v.nome))`),
  ma **è l'unica riga portante di questo giudizio che non ho rimisurato**. 📌 Chi vuole chiuderla:
  basta un `23505` vero contro il banco.
- **Il conteggio R-P4 «95 asserzioni su 129»**: non ho ricostruito l'abbozzo inerte. Il denominatore
  è comunque **130** (misurato), non 129.
- `{"denti_coinvolti": []}` che cancella tutti i denti a livello di contratto: ereditato dalle ondate
  precedenti, non riprovato.
- **Nessuna prova end-to-end contro il database vero** — come l'esecutore stesso dichiara. Anch'io ho
  lavorato in lettura sul catalogo e sulle prove unitarie: **l'atto unico non è mai stato invocato**,
  né da lui né da me.

---

## 13. I RILIEVI IN FILA

🛑 **Un confine che va letto prima della tabella:** **C3 è un difetto del CODICE che va in
produzione.** **C1 e C2 sono difetti delle RETI DI SICUREZZA** — il codice di produzione, lì, è
giusto: sono le prove a non poter diventare rosse. Non è la stessa cosa, e confonderle farebbe
leggere «la rotta è rotta», che non è vero.

| grado | # | dov'è il difetto | rilievo | file:riga |
|---|---|---|---|---|
| 🔴 **CRITICO** | **C3** | **codice** | La **regola sul vuoto si ferma al primo livello**: `prescrizione_caratteristiche: {colore:''}` / `{elementi:[]}` / `{tipo:''}` passano con `ok:true`, la voce 6 **perde la caratteristica sul documento** e la penna scrive `""` sulla riga, **con 200**. E le sotto-chiavi non passano da `testoVivo`: `'   '` sopravvive non ripulito. Catena misurata anello per anello in **§5-bis**. | `src/lib/dichiarazione/correzioni.ts:131-139` · `:185-208` |
| 🔴 **CRITICO** | **C1** | **prove** | La prova della **porta del tenant sul paziente** resta verde senza `.eq('laboratorio_id', …)` — **130 su 130**. `chainSpia` non è stato applicato a `pazienti`. | `tests/unit/riemissione-route.test.ts:119` · `:431` |
| 🔴 **CRITICO** | **C2** | **prove** | La prova del **fail-closed sull'esito ignoto** passa per il motivo sbagliato (la finta non porta `nuova_id`) — **130 su 130**. La proprietà #1 del brief non è provata. | `tests/unit/correggi-e-riemetti.test.ts:189` |
| 🟠 **IMPORTANTE** | **I2** | codice | `paziente_nome_snapshot` **vince** sull'embed: correggere il solo `paziente_id` quando lo snapshot è pieno stampa il nome vecchio. Oggi 1 lavoro su 299 e nessun writer — ma **il primo writer dello snapshot sta per essere questa rotta**. | `src/lib/pdf/generate-ddc.ts:259` · `correzioni.ts:241-244` |
| 🟠 **IMPORTANTE** | **I3** | prove | La porta d'idempotenza è sorvegliata da **una sola** asserzione: con le colonne invertite le due prove di *comportamento* restano verdi. | `tests/unit/riemissione-route.test.ts:521` |
| 🔵 **MINORE** | **M1** | codice | Lo `switch` della rotta non ha `default` né guardia di esaustività: la rete è a tempo di compilazione e **accidentale** (nasce dal file di prova). | `route.ts:364-442` |
| 🔵 **MINORE** | **M2** | resoconto | Conteggi delle prove per file **sbagliati** (22 non 27 · 21 non 16 · 16 preesistenti non 17). Il totale e il **+114** invece tornano; il denominatore R-P4 è **130**, non 129. | resoconto §11, §5 |
| 🔵 **MINORE** | **M3** | resoconto | `correzioni: {}` → 422 è una scelta buona ma **è un contratto di client**: va scritta nel brief del Task D, non lasciata al resoconto. | resoconto §2 |
| 📌 **NOTA** | **N1** | codice | La motivazione dei nove `P0001` («prima di qualsiasi scrittura») è la premessa più debole: una `RAISE` annulla comunque tutto. La ragione portante è l'**attribuzione della colpa**, ed è quella giusta. | `atto-unico-errori.ts:8-11` |

---

## 14. CHE COSA RESTA — **TASK D** (il foglio)

Roba che il Task D deve sapere e che oggi non è scritta in nessun brief:

1. 🔴 **Il corpo è `{ evento_id, correzioni: {…}, atteso_updated_at }`**, e il gettone è
   **obbligatorio** appena `correzioni` è presente. 🛑 Il foglio deve rispedire **la stringa che ha
   ricevuto**, mai `new Date(x).toISOString()`: un solo riparsing tronca i microsecondi e dà **409
   permanente, che nemmeno ricaricando si sana**.
2. 🔴 **La risposta 200 porta `updated_at`** (il gettone aggiornato). Chi non lo conserva prende un
   conflitto alla **seconda** correzione di fila. E sulla strada idempotente porta anche `gia_fatto: true`.
3. 🟠 **Il 409 ha DUE significati diversi** e non vanno fusi: «qualcun altro ha toccato il lavoro»
   (→ ricarica e rifai) e «quella registrazione è già stata usata» (→ aprine una nuova).
4. 🟠 **Otto nomi per sette voci a schermo** (il paziente ha due strade) — e **I2**: se il foglio
   permette di correggere il nome stampato, deve decidere che succede quando poi si cambia paziente.
5. 🔴 **C3 va chiuso PRIMA del Task D.** Finché è aperto, svuotare una casella delle caratteristiche
   prescritte **cancella** quella caratteristica dal documento e dalla riga, con un 200 — e a schermo
   una casella svuotata è il gesto più naturale del mondo. Se per qualsiasi ragione il Task D
   arrivasse prima della correzione, il foglio **non deve poter mandare sotto-chiavi vuote** dentro
   `prescrizione_caratteristiche` — ma è una toppa, non la chiusura.
6. 🔵 **M3**: «rifai e basta» si chiede **omettendo** `correzioni`, non mandando `{}`.
7. **FASE 9 e 9b sono dovute al Task D** (lì una superficie cambia davvero), a differenza del Task C.

## 15. CHE COSA RESTA — **TASK 10** (le prove d'integrazione)

🛑 **L'esecutore dichiara che non ha mai provato l'atto unico end-to-end e lo chiama il limite più
pesante del compito. Confermo, e aggiungo che vale anche per me:** in questa revisione la funzione non
è mai stata **invocata**, da nessuno dei due. Tutto ciò che sappiamo dell'atto unico visto dalla rotta
è statico.

Da provare contro il banco vero, in ordine di quanto costa sbagliarlo:

1. 🔴 **La prima chiamata vera passa?** Il mio confronto colonne dice di sì (§6), ma è statico: va
   fatto un giro completo *render → upload → transazione* su un lavoro consegnato, con dichiarazione
   viva, evento del motivo giusto e prescrizione.
2. 🔴 **`paziente_id` di un altro laboratorio → 422 e NIENTE su Storage.** È la riga che il resoconto
   dichiara onestamente di non aver potuto misurare (forma 16), ed è la stessa che **C1** lascia senza
   rete: finché non è misurata, l'unica difesa contro il PDF orfano è una riga di codice che nessuna
   prova guarda.
3. 🟠 **Il costo dichiarato del `conflitto`**: il 409 promette onestà su «file orfano + progressivo
   bruciato». Va **misurato** che sia proprio quello e non di più.
4. 🟠 **Il gettone al microsecondo**, andata e ritorno vero.
5. 🟠 **La porta d'idempotenza** contro `ddc_evento_annulla_unique` vero, nei due versi (con successore
   e senza).
6. 🔵 I **tredici `P0001`** almeno a campione, per confermare che i prefissi che classificano il testo
   arrivino a TypeScript **con la stessa codifica** (i messaggi contengono `è`, `'`, `—`).

🛑 **C1, C2 e C3 NON vanno rimandati al Task 10.** C1 e C2 sono due prove unitarie da correggere in
pochi minuti; C3 è una funzione in `correzioni.ts`. Lasciarli aperti fino alle prove d'integrazione
vuol dire tenere per giorni due reti che sembrano tirate e non lo sono, e un percorso che cancella un
contenuto obbligatorio dicendo «rifatta». **Un rosso dichiarato vale più di un verde raccontato — e un
verde che non può diventare rosso non è nemmeno un racconto.**

---

## 16. NOTA DI CONSEGNA

**Questo giudizio non l'ho salvato in git**, come i due precedenti della stessa ondata: un revisore che
tocca la storia del ramo che sta giudicando è una cosa a sé. Il file è sul disco, non tracciato.
Lo salva l'orchestratore, con **D318 — percorsi nominati, mai `git add -A`**:

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && git add .superpowers/sdd/atto-unico-task-c-review.md
```
