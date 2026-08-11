# Resoconto — Task 3 del piano «L'avviso al dentista»

**Quando:** 09/08/2026. **Ramo:** `intervento-post-consegna`. **Salvataggio:** `0792fbaa`.
**Perimetro rispettato:** `src/lib/avvisi/messaggio.ts` + `tests/unit/avviso-messaggio.test.ts`.
Nessuna migration, nessuna rotta, nessun componente. Nessun altro file toccato.

| cosa | esito |
|---|---|
| `VERIFY_EXIT` | **0** |
| Prove, prima → dopo | **5748 → 5762 passate** (+14) · **119 → 119 saltate** (invariate ✅) · 461 → 462 file |
| R-P4 (abbozzo inerte) | **11 asserzioni su 21 si accendono** (11 `it` rossi su 14) |
| I sette punti del brief | 3 confermati difetti · 2 premesse **false** · 1 confermato buono · 1 chiuso con misura |
| Difetti NUOVI trovati | **3** (uno serio: `undefined` a schermo) |
| Ritrovamenti fuori mandato | **4**, riferiti e non corretti |

---

## ① I sette punti del brief, uno per uno

### ① 🔴 CONFERMATO, E MISURATO: la prova del piano passa per costruzione

Il piano chiedeva `expect(testo).not.toContain('Mario')` su una funzione che **non riceve nessun
nome**. `provato:` con l'abbozzo inerte (`return ''`) quel blocco è **verde**, insieme ad altri due:

```
 Tests  11 failed | 3 passed (14)
```

I tre verdi contro un modulo che non fa niente sono esattamente: «*il nome del paziente non
compare*», «*NON chiama il documento «DdC»…*», «*elenco vuoto → elenco vuoto*». Il primo è la riga
del piano. **Non poteva fallire.**

**La prova vera ha due gambe, e sono scritte entrambe.**

**Gamba ① — il TIPO.** Tre direttive a livello di modulo, non dentro un `it` (non c'è niente da
eseguire): nessun parametro può portare il nome del paziente (GDPR §9), né il **valore precedente**
(⚖️ D336), né l'**elenco dei campi corretti** (⚖️ D334). La verifica la fa `tsc --noEmit`, che
`tsconfig.json` estende a `**/*.ts` — quindi anche a `tests/` — e che è il **primo** comando di
`verify:full`.

🔑 **E le tre guardie sono state provate come R-P1 chiede — con valori che DEVONO essere rifiutati.**
`provato:` firma allargata con `pazienteNome?: string; valorePrecedente?: string; campiCorretti?: string[]`
→ `npx tsc --noEmit`:

```
tests/unit/avviso-messaggio.test.ts(84,1): error TS2578: Unused '@ts-expect-error' directive.
tests/unit/avviso-messaggio.test.ts(88,1): error TS2578: Unused '@ts-expect-error' directive.
tests/unit/avviso-messaggio.test.ts(92,1): error TS2578: Unused '@ts-expect-error' directive.
```

**Tutte e tre**, una per direttiva — non una sola misurata e due date per buone. Poi la firma è stata
ripristinata → `TSC_EXIT=0`, albero pulito (`git diff --stat` vuoto). Il giorno in cui uno di quei
parametri nascesse davvero, il cancello si accende da sé. **Senza questa misura avrei affermato che
le guardie funzionano invece di averle viste scattare.**

**Gamba ② — il TESTO INTERO.** Il messaggio si confronta per **uguaglianza**, non con `toContain`.
È la sola forma che prova che dentro non c'è un **terzo** dato: `toContain` vede ciò che cerca e non
vede ciò che non immagina. Le tre righe del piano sono rimaste, ma accanto all'uguaglianza — da sole
non provavano niente.

### ② 🔴 CONFERMATO: «il paziente» non può finire su WhatsApp — e ora c'è la prova che lo impedisce

Le due funzioni restano separate, `buildAvvisoMessage` **non chiama** `descriviCampiCorretti`, e la
ragione è scritta nel codice (non in un commento generico: nel doc-comment di
`descriviCampiCorretti`, sotto «IL CONFINE COL TESTO DI WHATSAPP, E PERCHÉ È SCRITTO QUI»).

🔑 **E la prova non ricopia le sei frasi: le DERIVA.**

```ts
const descrizioni = descriviCampiCorretti(CAMPI_CORREGGIBILI_DOCUMENTO)
expect(descrizioni).toHaveLength(CAMPI_CORREGGIBILI_DOCUMENTO.length)   // contro il vuoto
expect(descrizioni.filter((d) => testo.includes(d.toLowerCase()))).toEqual([])
```

Una settima voce entra nella sorveglianza **da sola**, senza che nessuno la ricopi. Il confronto è
insensibile alle maiuscole, e la riga contro il vuoto c'è perché senza di essa il filtro sarebbe
vuoto per costruzione su un elenco vuoto — **trovata dal conteggio R-P4**, non ragionata a
tavolino.

### ③ 🟢 VERIFICATO SUL FILE VIVO — e l'elenco **coincide** col piano

Vedi §② più sotto per l'elenco incollato. `src/lib/dichiarazione/correzioni.ts:58-65`, letto oggi:
**sei voci, gli stessi sei nomi e nello stesso ordine del piano.** Il piano, qui, era giusto.

🛑 **Ma questo non era prevedibile, e la verifica non era cerimonia:** il Task 2 ha pagato
esattamente questo errore (revisione §3 — il piano mandava a leggere
`20260808093513_correggi_e_riemetti_atomica.sql`, superato **quattro volte**, e ricopiarlo avrebbe
riaperto `numero_prescrizione` e `paziente_nome_snapshot`, chiusi da ⚖️ D319 e ⚖️ D320 per ragione
**normativa**). Le voci sono scese **da otto a sei in un giorno solo**.

`NOME_CAMPO` è `Record<CampoCorreggibile, string>` — **tipizzato su `CampoCorreggibile`, non su
`string`**, come il brief chiedeva di verificare. È la difesa che si accende da sola: il giorno
della settima voce `tsc` si accende **lì**.

### ④ 🟠 IL GETTONE C'È E È RAGGIUNGIBILE — ma il piano non aveva il ramo per quando manca

Censimento completo in §③ più sotto. **Risposta breve: sì, chi manderà l'avviso (Task 5) il gettone
ce l'ha già in mano**, quindi la firma del piano **non** è sbagliata.

🔴 **Il difetto è un altro, ed è nuovo:** il piano **non ha il ramo senza gettone**, e il gemello
ce l'ha (`whatsapp-template.ts:14-20`). Senza, il testo proposto contiene «`…/portale/`» — un
indirizzo che non porta da nessuna parte, mandato a un dentista. **Ed è raggiungibile:**
`src/lib/consegna/orchestrate.ts:131` fa già `?? ''` quando l'embed del cliente manca dalla
`select`. Aggiunto, col ramo degradato del gemello (il fatto + la firma, senza collegamento), e con
la sua prova.

### ⑤ 🟠 LA FIXTURE È VERA MA MINORITARIA — 19 righe su 299

Misure in §④ più sotto. `'2026/0042'` **è** una forma vera (la genera
`007_rpc_rifacimento.sql:41`), ma copre **19 righe su 299**: la maggioranza — **276** — ha la forma
`STOR/2021/016`, con **tre** cifre finali e **due** barre. Il verdetto quindi non è «la fixture è
inventata», è «**la fixture è vera e non rappresentativa, e la funzione deve essere indifferente
alla forma**». Aggiunto un caso `STOR/…` e uno con caratteri strani.

### ⑥ 🔴 LA PREMESSA DEL BRIEF È FALSA: **non esiste** un posto solo da cui si prende l'indirizzo

Il brief diceva «*se esiste già un posto solo da cui si prende l'indirizzo dell'app, usa quello*».
`provato:` `grep -rn "NEXT_PUBLIC_APP_URL" src` → **7 punti, tutti con lo stesso ripiego scritto a
mano**:

```
src/app/api/rete/[id]/inviti/route.ts:93          src/app/api/admin/invite/route.ts:54
src/app/api/tecnici/invite/route.ts:45            src/app/api/stripe/portal/route.ts:7      (con `!`)
src/app/api/admin/labs/[id]/impersonate/route.ts:25   src/app/api/stripe/checkout/route.ts:9 (con `!`)
src/lib/consegna/whatsapp-template.ts:22          src/components/features/clienti/PortaleLinkButtons.tsx:151
```

🔑 **E il codice se ne è già accorto:** il commento di `PortaleLinkButtons.tsx:145-149` censisce lui
stesso quei «**sette punti**». La ripetizione **è** la convenzione di casa, non una dimenticanza di
oggi.

➡️ **Ho scritto l'ottava copia, isolata in una funzione `indirizzoApp()` con il censimento accanto**,
e **non** ho creato un modulo condiviso: unificare toccherebbe sette file e una prova, ed è fuori
dal mandato (**R-E2** — riferito in §⑧). Un aiutante esportato da `lib/avvisi/messaggio.ts` sarebbe
la casa sbagliata: chi unifica dovrebbe spostarlo.

### ⑦ 🟢 CONFERMATO BUONO — e ora è una prova, non una raccomandazione

«*La dichiarazione del lavoro #… è stata rifatta*» è la forma giusta (`CLAUDE.md` §6 — Art. 10(6)
MDR e MDCG 2021-3 Q9: per i su misura «dichiarazione di conformità» è **improprio**).

🔑 **Non mi sono fidato del fatto di saperlo:** c'è un `it` che rifiuta `ddc`, `certificat`,
`dichiarazione di conformità` e `conformità` nel testo prodotto, senza distinzione di maiuscole. Chi
riscriverà quella frase fra tre mesi trova un rosso, non un commento.
⚠️ Questa è una delle tre asserzioni che **non si accendono** contro l'abbozzo inerte (una stringa
vuota non contiene nulla): sorveglia un'**edizione futura**, non l'abbozzo. Dichiarato in §⑤.

---

## Difetti NUOVI, non nel brief

### 🔴 N1 — `descriviCampiCorretti` avrebbe scritto «undefined» sotto gli occhi di un dentista

Il piano dichiara `descriviCampiCorretti(campi: readonly CampoCorreggibile[]): string[]`. **È una
bugia al confine, e la conseguenza è visibile a schermo.**

- Il dato arriva da `avvisi_dentista.campi_corretti`, che `src/types/database.types.ts:161` tipizza
  — **correttamente** — `string[]`.
- Quella colonna è **senza `CHECK` per scelta** (revisione del Task 2 §5): un `CHECK` con le sei
  voci di oggi **romperebbe la storia**, perché il giorno in cui cade la settima ogni aggiornamento
  di un avviso vecchio che la nomina fallirebbe — **compreso quello che lo segna come comunicato**.
  Un registro dell'Art. 19 GDPR deve continuare a dire cosa fu corretto *allora*.
- ➡️ Quindi `campi_corretti` è **per progetto** un elenco che può contenere nomi non più previsti. E
  non è teoria: **due nomi sono usciti in un giorno solo** (⚖️ D319, ⚖️ D320).
- Con la firma stretta il chiamante avrebbe dovuto **forzare il tipo** (`as CampoCorreggibile[]`), e
  `NOME_CAMPO[c]` avrebbe restituito `undefined` **dentro uno `string[]` dichiarato**: `tsc` zitto,
  e a schermo «undefined».

**Fatto:** parametro `readonly string[]`, e un ripiego dichiarato (`'una voce del documento'`).
**La difesa a compilazione non si perde** — vive nel `Record`, che resta chiuso su
`CampoCorreggibile`, cioè esattamente ciò che il punto ③ del brief chiedeva di garantire.
🔑 **Il precedente in casa è del Task 1 stesso:** `src/lib/avvisi/stati.ts:22-29` (`isStatoAvviso`),
col suo commento — al confine con l'esterno un tipo è «*una promessa e non un fatto*».
🛑 **Si ripiega, non si scarta:** togliere la voce **sotto-dichiarerebbe** al dentista quante cose
sono state corrette, su un registro che esiste per provare cosa gli è stato comunicato. Lo scarto
muto è il difetto di `src/app/api/lavori/[id]/route.ts:259-264`, e qui costerebbe di più.

### 🟠 N2 — la prova del piano era dipendente dall'ambiente

Il confronto per uguaglianza (gamba ②) legge `NEXT_PUBLIC_APP_URL`. In `.env.local` vale
`https://uachelab.com`, quindi **oggi** torna comunque — ma chi sviluppa con
`NEXT_PUBLIC_APP_URL=http://localhost:3000` avrebbe una prova rossa in locale e verde in CI. Il
precedente in casa è `tests/unit/PortaleLinkButtons-indirizzo.test.tsx:47-54`: **si fissa in
`beforeEach` e si ripristina in `afterEach`**. Fatto, e coperti **entrambi** i rami (variabile
presente, variabile assente → ripiego).
⚠️ Non è pignoleria di misura: da ⚖️ D333 la CI è l'**unico** posto dove girano le 35 prove
d'integrazione delle due tornate precedenti. Rumore lì costa il doppio.

### 🟡 N3 — tre asserzioni erano **vacue**, e il conteggio R-P4 le ha trovate

Prima di lanciare l'abbozzo inerte avevo scritto tre asserzioni che su un elenco vuoto sono verdi
per costruzione: l'ordine (`[]` contro `[]` rovesciato), il nome tecnico della colonna (un filtro su
elenco vuoto) e il confine (nessuna descrizione, nessuna fuga). **Tutte e tre sono state
riscritte** con una riga di non-vacuità davanti (i valori attesi, o la lunghezza). 🔑 **È
precisamente il lavoro che R-P4 esiste per far fare:** senza contare, quelle tre sarebbero rimaste
tre prove che non provano niente, dentro un file scritto *per* denunciare una prova che non prova
niente.

---

## ② `CAMPI_CORREGGIBILI_DOCUMENTO` — l'elenco VERO, incollato dal file vivo

`src/lib/dichiarazione/correzioni.ts:58-65`, letto il 09/08/2026:

```ts
export const CAMPI_CORREGGIBILI_DOCUMENTO = [
  'richiedente_nome',
  'paziente_id',
  'tipo_dispositivo',
  'descrizione',
  'denti_coinvolti',
  'prescrizione_caratteristiche',
] as const
```

**Coincide col piano: sei voci, stessi nomi, stesso ordine.** ✅
Controprova sul **corpo vivo** della RPC (`pg_get_functiondef`, non il file di migration):
`c_su_lavori = {richiedente_nome, paziente_id, tipo_dispositivo, descrizione}` +
`c_su_penne = {denti_coinvolti, prescrizione_caratteristiche}` → **le stesse sei**.

---

## ③ Il gettone del portale — dove nasce, e chi lo ha in mano

| domanda | risposta misurata |
|---|---|
| Dove nasce | `public.clienti.portale_token` — `uuid`, **`NOT NULL DEFAULT gen_random_uuid()`** (`information_schema`) |
| Per lavoro o per cliente | **per CLIENTE.** Un lavoro non ha un gettone suo |
| Chi lo rigenera | `POST /api/clienti/[id]/rigenera-portale-token` (`route.ts:33-34`), che riscrive anche la scadenza a **+365 giorni** |
| Scadenza | `portale_token_scade_at`, default `now() + '1 year'`; verificata da `portale/[token]/page.tsx:298-299` e `lib/portale/guardie.ts:75` |
| **È raggiungibile da chi manderà l'avviso?** | **SÌ, e il percorso è stato aperto e seguito riga per riga** (non dedotto da un `grep`) |

**Il percorso, per intero:** `src/app/(app)/lavori/[id]/page.tsx:22-43` fa `cliente:clienti(*)` →
riga 50 `lavoro as unknown as LavoroDettaglio` → riga **120**
`<SchedaLavoroV3 lavoro={lavoroDettaglio} … />` → `SchedaLavoroV3.tsx:144` riceve
`props: { lavoro: LavoroDettaglio; … }`, cioè **l'oggetto intero, senza restringimenti**. E
`LavoroDettaglio.cliente` è `Cliente` (`src/types/domain.ts:560`), che porta
`portale_token: string` (`domain.ts:193`).
⚠️ **Controllato anche ciò che potrebbe togliercelo per strada:** `minimizzaPhi`
(`src/lib/portale/minimizza-phi.ts`) **non** è su questa strada — i suoi soli usi sono
`portale/[token]/page.tsx:369` e `api/portale/[token]/fatturazione/route.ts:85`, cioè il lato
dentista.
📌 **E `SchedaLavoroV3.tsx:1` è `'use client'`**: il gettone attraversa **già oggi** verso il
browser. Due conseguenze per il Task 5, entrambe favorevoli: il testo si può comporre nel
componente, e `NEXT_PUBLIC_APP_URL` funziona lì perché Next la inserisce nel pacchetto client.

➡️ **La firma del piano non è sbagliata.** Ma tre cose che il Task 5 deve sapere, e che nessuna di
esse è risolvibile qui:

1. 🛑 **`GET /api/clienti` NON restituisce il gettone, di proposito** — `src/app/api/clienti/route.ts:51`,
   scelta **TOK-1 / D53**. Se il Task 5 lo cercasse da una lista clienti **non lo troverebbe**: va
   preso dalla lettura del lavoro, o dalla pagina cliente (che lo passa come prop,
   `clienti/[id]/page.tsx:359`).
2. 🟠 **La scadenza questa funzione non la vede** — riceve una stringa. Un gettone **scaduto**
   produce un testo perfetto verso un portale che risponde «non disponibile». Il controllo va nel
   Task 5, che ha la riga del cliente in mano.
3. 📌 **Il PIN non chiude il portale**: `portale/[token]/page.tsx` non nomina `pin` (0 hit); il PIN
   (`guardieEconomiche`, `risolviClientePortale`) protegge le porte **economiche** (fatture). Un
   collegamento col solo gettone **apre** il portale — cioè la sezione «Avvisi» del Task 8 sarà
   visibile con quel link.

---

## ④ Il formato vero del numero di lavoro

`provato:` sul banco, 09/08/2026:

```
 totale  forma ^\d{4}/\d{4}$   STOR/…   fuori forma
   299          19              276         280
```

Prefissi distinti: `STOR/` **276** · `2026/` **19** · `E2E-C` **3** · `TEST-` **1**.
Esempi veri: `2026/0020`, `2026/0019` · `STOR/2021/016`, `STOR/2026/031`.

**Chi genera la forma del piano:** `supabase/migrations/007_rpc_rifacimento.sql:41` —
`v_anno || '/' || LPAD(v_progressivo::TEXT, 4, '0')`. ✅ Quindi `'2026/0042'` **è** una forma vera.
🛑 **Ma è 19 su 299:** la forma maggioritaria è `STOR/YYYY/NNN`, con **tre** cifre e **due** barre —
uno storico importato. La prova copre entrambe, e una terza con accenti e parentesi.
📌 `public.lavori.numero_lavoro` è `NOT NULL` (`information_schema`).

---

## ⑤ R-P4 — `N su M`, e le forme d'ingresso

### Il conteggio, misurato

**Primo rosso** (senza modulo): `Error: Failed to resolve import "@/lib/avvisi/messaggio"` — cioè
il rosso da «modulo non trovato», che **non prova niente**. Quindi abbozzo inerte
(`buildAvvisoMessage → ''`, `descriviCampiCorretti → []`) e conteggio:

```
 Tests  11 failed | 3 passed (14)
```

➡️ **11 asserzioni su 21 si accendono** (11 `it` rossi su 14). ⚠️ Dentro un `it` la prima
asserzione rossa ferma le successive, quindi le 11 sono anche 11 `it` distinti.

**Le 6 asserzioni che NON possono accendersi contro un abbozzo vuoto, e perché** — dichiarate
invece di nascoste:

| asserzione | perché non si accende |
|---|---|
| `not.toContain('Mario Rossi' / 'Mario' / 'Rossi')` (×3) | **è il difetto ① in persona**: una stringa vuota non contiene nessun nome. Sorveglia un'edizione futura, non l'abbozzo. La difesa vera è la gamba di TIPO |
| `not.toContain('/portale/')` sul ramo senza gettone | stessa famiglia: `''` non contiene niente |
| i quattro nomi vietati del documento (`ddc`, `certificat`, …) | stessa famiglia |
| `descriviCampiCorretti([]) → []` | **l'abbozzo inerte restituisce già `[]`**: il valore inerte *è* il valore atteso. Inevitabile, e va detto |

Le 4 asserzioni «non raggiunte» (le seconde di quattro `it`) sono coperte dalla riga di non-vacuità
che le precede — v. difetto N3.

### Le forme d'ingresso, enumerate PRIMA delle asserzioni

Stanno scritte in testa al file di prova, per non farle dipendere da questo resoconto.

**`buildAvvisoMessage`** — ① numero e gettone normali ✅ · ② numero nella forma **maggioritaria**
`STOR/2021/016` ✅ · ③ numero con caratteri strani (accenti, parentesi, spazi) ✅ · ④ **gettone
vuoto** ✅ · ⑤ `NEXT_PUBLIC_APP_URL` presente e diverso ✅ · ⑥ `NEXT_PUBLIC_APP_URL` assente ✅ ·
⑦ un parametro che porta un dato personale ✅ **col TIPO**, non a runtime ·
⑧ `numeroLavoro` vuoto → **non coperta, perché** la colonna è `NOT NULL` e il numero nasce dalla
RPC: chi chiama lo legge dalla riga, non lo digita ·
⑨ `null`/`undefined` al posto dell'oggetto → **non coperta, perché** `tsc --noEmit` li rifiuta ed è
il primo comando del cancello; per farli passare servirebbe un `as never`, che proverebbe il cast e
non la funzione.

**`descriviCampiCorretti`** — ⑩ le sei voci vive, **lette dal file vivo** ✅ · ⑪ elenco vuoto ✅ ·
⑫ nome **ritirato** dalle sei (`numero_prescrizione`, ⚖️ D319) ✅ · ⑬ ordine d'ingresso ✅ ·
⑭ voci ripetute → **non coperta, perché** l'elenco nasce da `jsonb_object_keys`, che non può
restituire due volte la stessa chiave.

**Perimetro dichiarato:** la **codifica** del messaggio non si prova qui — la fa `buildWhatsappUrl`
(`whatsapp-template.ts:66-70`) con `encodeURIComponent` su tutto il testo. Nessuna superficie di
iniezione in questo modulo: produce testo piano.

---

## ⑥ I numeri, misurati da me

**Base, misurata prima di creare qualunque file** — `npx vitest run`, cioè gli **stessi argomenti**
che `verify:full` passa a vitest (`vitest run` senza argomenti), lanciato **a sé** e non dentro la
catena: `verify:full` lo esegue dopo `tsc` ed `eslint`, nella stessa shell. Le conte non ne
dipendono (stessa configurazione, stessi `include`), e il passaggio 461 → 462 file lo conferma:

```
 Test Files  452 passed | 9 skipped (461)
      Tests  5748 passed | 119 skipped (5867)
```

📌 Coincide con la base del brief. **L'ho rimisurata invece di ricopiarla**, come il brief chiedeva.

**Dopo** (`npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — uscita **da variabile**, mai
dietro una pipe, timeout 600000 ms):

```
VERIFY_EXIT=0
 Test Files  453 passed | 9 skipped (462)
      Tests  5762 passed | 119 skipped (5881)
```

| | prima | dopo | Δ |
|---|---|---|---|
| passate | 5748 | **5762** | **+14** ✅ |
| **saltate** | 119 | **119** | **0** ✅ — le mie prove sono unitarie e **girano in locale** |
| file | 461 | 462 | +1 |

I 14 sono esattamente i 14 `it` del file nuovo. Verdi anche `tsc --noEmit`, `eslint src
--max-warnings 0`, `next build` e le sei guardie.

---

## ⑦ Ciò che resta `non provato`, col motivo

1. **Che il testo prodotto sia quello che Francesco vuole leggere.** È testo **visibile a un
   dentista** e non è passato da nessuna approvazione: la frase, l'emoji e la firma vengono dal
   piano e dal gemello. ⚖️ D334 dice che il testo è **modificabile prima dell'invio**, quindi il
   costo di sbagliarlo è basso — ma **non è approvato**, ed è il Task 5 (il foglio) a portarlo a
   schermo.
2. **Che `'una voce del documento'` sia la frase giusta per un nome ritirato.** È una mia scelta,
   fail-closed e dichiarata nel codice: mai `undefined`, mai il nome tecnico, mai uno scarto muto.
   Non ha una decisione dietro. Oggi il ramo **non è raggiungibile** dal contratto pubblico (la RPC
   filtra sulle sei), quindi è una difesa per il giorno della settima voce.
3. **Che il gettone in mano al Task 5 sia valido.** La scadenza esiste
   (`portale_token_scade_at`) e questa funzione **non la vede**: riceve una stringa. Un gettone
   scaduto produce un testo perfetto verso un portale chiuso.
4. **Come si renda un elenco `campi_corretti` vuoto a schermo.** Qui `[] → []`. Dal contratto
   pubblico quel caso **non è raggiungibile** (`correzioni.ts:189-191` rifiuta `correzioni: {}`, e
   chi omette la chiave prende `riemetti_ddc_atomica`, che **non crea nessun avviso** —
   `dichiarazione/riemetti/route.ts:195-200`), ma la colonna ha `DEFAULT '{}'`. Decisione del Task 8.
5. **Che nessun altro chiamante futuro passi da qui con dati personali.** La firma lo impedisce
   **oggi** e la gamba di tipo si accende se cambia. Non copre chi costruisse un secondo testo a
   mano altrove, fuori da questo modulo.

---

## ⑧ Ritrovamenti FUORI mandato — riferiti, non corretti (R-E2)

1. 🟠 **L'indirizzo dell'app è scritto a mano in 8 punti** (7 preesistenti + il mio). Due di essi
   (`api/stripe/portal:7`, `api/stripe/checkout:9`) usano `!` invece del ripiego: se la variabile
   mancasse, quelli interpolano la stringa letterale `"undefined"` — cioè un indirizzo tipo
   `undefined/impostazioni/abbonamento` mandato a Stripe, non un errore. Unificare è
   un'ondata a sé — tocca 7 file e almeno una prova
   (`tests/unit/PortaleLinkButtons-indirizzo.test.tsx`).
2. 🟠 **Un avviso senza gettone del portale è metà di ⚖️ D332** («l'avviso vive nel portale,
   WhatsApp è la spinta»): la spinta parte, il posto dove guardare no. Il ramo degradato evita il
   collegamento rotto, ma **non** risolve il buco di prodotto. Il Task 5 ha il contesto per
   chiedere di rigenerare il gettone prima di proporre il testo.
3. 🟡 **Il commento sbagliato di `correzioni.ts` è ancora lì** — già riferito dalla revisione del
   Task 2 §5/§6.4. `correzioni.ts:52-56` afferma che le due liste «*si guardano in faccia*» in
   `tests/unit/correzioni-documento.test.ts`: **non è vero**, quella prova le confronta con un
   elenco scritto a mano. Una riga di documentazione che dichiara una protezione inesistente.
4. 🟡 **`.superpowers/sdd/avviso-dentista-task-3-brief.md` è non tracciato e non è mio**: l'ho
   lasciato fuori dal salvataggio. Decide l'orchestratore se versionarlo.

📌 **Nessuna migration è servita**, e nessuna è stata scritta. Il pavimento `20260809133546` resta
intatto.

---

## ⑨ Il salvataggio

```
0792fbaa  feat(avvisi): il testo proposto per il dentista, e la prova che il paziente non ha una strada
          2 files changed, 479 insertions(+)
          create mode 100644 src/lib/avvisi/messaggio.ts
          create mode 100644 tests/unit/avviso-messaggio.test.ts
```

`git status --short` prima di salvare: **tre righe non tracciate**, tutte note (i due file miei più
il brief). `git add <percorsi>` espliciti, **mai `-A`** (⚖️ D318), messaggio lungo con `-F`.
Nessun `push`, nessun `main`, nessun worktree.
