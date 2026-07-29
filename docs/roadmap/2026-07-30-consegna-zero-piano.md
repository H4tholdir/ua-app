# Consegna zero — le tre difese sul codice paziente (Z1 · Z2 · Z3)

**Data:** 30 luglio 2026 · **Ramo:** `consegna-zero-pazienti` · **Percorso:** MEDIA con rigore GRANDE
**Nasce da:** `docs/roadmap/2026-07-29-ondata-b-piano-v2.md` §0 (bloccante B-5 del panel)
**Va in produzione DA SOLA e PRIMA** che il ramo dell'ondata (b) esista (piano v2, T1).

> **Perché esiste.** Non c'è un ambiente di prova separato: `deploy.yml` non ha step di migration,
> `ci.yml` porta un URL segnaposto, non esiste `supabase/config.toml`. Le migration si applicano a mano
> sull'unico progetto. ➡️ **Dal minuto in cui l'indice unico esiste (T5), vale per la produzione** — che
> deve già saperlo gestire. Scritta come «T0» dentro il ramo, la garanzia evapora.

> 🔑 **La lezione ereditata dal panel, che vale nel mandato di ogni esecutore:** *cercate soprattutto
> dove il piano sembra sicuro.* Il piano v1 dell'ondata non è stato fermato dai buchi che dichiarava,
> ma dalle quattro cose che dava per provate. Un buco dichiarato si chiude; una certezza sbagliata no.

---

## 1. Perimetro — e il confine con l'ondata (b)

| # | cosa fa | file |
|---|---|---|
| **Z3** | il generatore del prossimo codice guarda **la stessa popolazione** che l'indice arbitrerà | `src/lib/wizard/dati-wizard.ts` · `tests/unit/dati-wizard.test.ts` |
| **Z2** | in scrittura il codice si **normalizza** (`btrim`) e il vuoto diventa **assenza** (`'' → NULL`) | `src/app/api/pazienti/route.ts` · `src/app/api/pazienti/[id]/route.ts` |
| **Z1** | un codice occupato diventa un **409 di dominio**, e chi lo legge sa cosa fare | le due rotte sopra · `src/lib/wizard/crea-lavoro.ts` · `WizardNuovoLavoro.tsx` · 🆕 `PazienteEditSheet.tsx` |

**Ordine di esecuzione: Z3 → Z2 → Z1.** Z3 è isolato; Z2 tocca le due rotte; Z1 le tocca di nuovo e
sale fino alla UI. Un esecutore fresco per ciascuno (R-E1), revisione fra l'uno e l'altro.

🛑 **FUORI perimetro, e resta all'ondata (b) — non si anticipa nulla:**
- **la migration dell'indice unico** → è **T5**. Questa consegna **non tocca il database**.
- **la lettura di unicità che rispecchia l'indice** (`laboratorio_id` + `lower(btrim(...))`, senza
  `cliente_id`, senza limite) → è **T7**.
- **l'avviso «questo codice è già di un'altra persona» che compare mentre si scrive**, con nome del
  paziente, data dell'ultimo lavoro e primo codice libero → mockup del 28/07 ratificato, ma è **T7 + T15**:
  richiede la lettura di T7 e la ricerca di T15, nessuna delle due esiste qui.
- **il passo paziente rifatto** → T14-T15.

---

## 2. Gate FASE 3 — le cinque risposte

1. **Isolamento fra laboratori.** Entrambe le rotte usano `getServiceClient()`, che **aggira le RLS**
   (`api/pazienti/route.ts:29,71` · `[id]/route.ts:28,173`): gli `.eq('laboratorio_id', …)` espliciti
   sono **l'unico controllo** (`route.ts:33,90,127` · `[id]/route.ts:86,136,180,193`).
   **Nessuno dei tre task tocca quei filtri**, e in Z3 la rete c'è già: `dati-wizard.test.ts:236-241`
   asserisce che **tutte e quattro** le query portino `.eq('laboratorio_id', labId)` — se un rifacimento
   ne toglie uno, il test cade. ⚠️ Ogni esecutore verifica che quel test resti verde **per il motivo giusto**.
2. **Schema drift.** 🛑 **Nessuna migration in questa consegna.** `gen types` non va rieseguito e
   **FASE 6b NON si applica** — l'indice è T5, dentro il ramo dell'ondata. Il database si tocca **solo
   in lettura**, e la linea di partenza si riverifica alla fine: **294 · 0 · 916 · 48**.
3. **Contratto API.** Il POST guadagna un esito **409** dove oggi dà **500**; il PATCH lo stesso.
   **Censimento dei chiamanti — completo, tre soli:**
   - `crea-lavoro.ts:233` — `if (!resPost.ok) return ESITO_BLOCCANTE`: un 409 è già `!ok`, quindi **il
     comportamento di oggi non si rompe**, si arricchisce.
   - `PazienteEditSheet.tsx:50` — 🆕 **il piano v2 non lo nominava.** È il pannello con cui si corregge
     il codice a mano: senza Z1 l'addetta legge un 500 generico su un errore che ha una causa precisa.
   - `PazienteArchiviaButton.tsx:19` — solo `DELETE`, **non toccato**.
4. **Rollback.** `git revert` del commit, e **è completo**: nessuna migration, nessun dato modificato,
   nessuna colonna nuova. Non esiste stato da annullare fuori dal codice.
5. **Dominio critico?** Non tocca RLS, Stripe, FatturaPA, auth né migration. Tocca però **la scrittura
   dell'identificativo del paziente**, che finisce su documenti conservati per legge (Art. 10(5) MDR +
   Allegato XIII p.4: 10 anni, 15 per gli impiantabili). ➡️ **rigore del percorso GRANDE**: esecutori
   freschi, revisione fra i task, FASE 7 completa con output reale.

---

## 3. R-P2 — REGISTRO DELLE LETTURE

Nessuno di questi file era nel registro del piano v2: la consegna zero non ne aveva uno proprio.
**Letti tutti il 30/07**, per intero salvo dove indicato.

| file | letto | cosa ne è uscito, e che cambia qualcosa |
|---|---|---|
| `src/app/api/pazienti/route.ts` | intero (163 righe) | `codice_paziente` scritto **grezzo**: fra `:110` (guardia di solo tipo) e `:139` **nessun `trim`**, nessun `'' → NULL` · **zero occorrenze di `23505`** in tutto il file: `:155-160` collassa ogni errore in **500 «Non è stato possibile creare il paziente»** · `laboratorio_id` **sempre** (`:33`), `cliente_id` **dentro un `if`** (`:39-41`) · il blocco `:140-145` usa `??`, che cattura `null`/`undefined` ma **mai `''`** |
| `src/app/api/pazienti/[id]/route.ts` | intero (203 righe) | ✅ `VUOTO_VALE_NULL` a `:43` contiene **esattamente `['data_nascita','sesso']`** — come il piano dichiarava · `ALLOWED` a `:35` **contiene `codice_paziente`** · 🔑 `codiceDalBody` (`:51-53`) alimenta **due destinazioni**: la colonna (`:58`) **e** la regola del nome (`:105-118`) — il commento «🟠 ALTO 1» a `:45-50` esiste **perché prima divergevano**: normalizzare in un punto solo non è eleganza, è il difetto già pagato · `:138-143` collassa in **500**, zero `23505` |
| `src/lib/wizard/dati-wizard.ts` | intero (144 righe) | `calcolaProssimoPz` `:44-51`, **non esportata** · regex `/^PZ-(\d+)$/` `:47` · query `:128` con `.is('deleted_at', null)` **e** `.like('codice_paziente','PZ-%')` **case-sensitive** · `import 'server-only'` a `:1` |
| `tests/unit/dati-wizard.test.ts` | intero (243 righe) | **17 test** (11 puri + 6 di collegamento) · 🔴 **il finto database a `:37` conosce `['select','eq','is','gte','not','like']` — NON `ilike`**: chiamando `.ilike()` i **6 test di `getDatiWizard`** esplodono con «non è una funzione», **non** falliscono per il motivo giusto · **zero asserzioni** su `.like` vs `.ilike` e **zero** su `.is('deleted_at', null)` · **zero fixture** con codici minuscoli, con spazi o archiviati |
| `src/lib/wizard/crea-lavoro.ts` | intero (346 righe) | `:209` il pre-controllo è un **`GET ?cliente_id=`** con `.limit(500)` a monte, non una lettura di unicità · 🔴 `:214` `find((p) => p.codice_paziente === pz)` è un confronto **byte-identico** · `:233` `if (!resPost.ok) return ESITO_BLOCCANTE` — **nessuna distinzione** fra codice occupato e guasto · `:225` manda `codice_paziente: pz` grezzo · `:229-230` `nome:''` + `cognome: alias \|\| pz` |
| `src/components/features/wizard/WizardNuovoLavoro.tsx` | `:240-409` | `:258` `pz: s.pz \|\| dati.prossimoPz` — 🔴 **`dati.prossimoPz` viene dal render della pagina e non si ricalcola mai** · `:365-400` `continuaPaziente` è **l'unico** punto di creazione · `:382-384` in caso di fallimento: **`errore('Non sono riuscita a creare il lavoro. Riprova.')`** — ed è il testo che rende «Riprova» un anello chiuso |
| `docs/design/mockups/2026-07-28-wizard-avviso-codice-gia-in-uso.html` | testi visibili | 🔴 **il mockup ratificato NON copre lo schermo di Z1.** Descrive **due inneschi** («qualcuno ha appena scritto il codice» / «nessuno ha scritto niente») e tre varianti, tutte **mentre si scrive**, con **nome del paziente, data dell'ultimo lavoro e primo codice libero** — tre dati che qui **non esistono**: vengono da T7 e T15 |
| 🆕 `src/components/features/pazienti/PazienteEditSheet.tsx` | **da leggere in Z1** | `:50` chiama `PATCH /api/pazienti/[id]`, `:184` scrive `codice_paziente`. **Il piano v2 non lo nominava** |
| 🆕 `tests/unit/api-pazienti-post.test.ts` · `tests/unit/api-pazienti-patch.test.ts` · `tests/unit/crea-lavoro.test.ts` · `tests/unit/PazienteEditSheet.test.tsx` | **da leggere nel task che li tocca** | esistono già: sono le prove da estendere, non da creare da zero |

---

## 4. R-P6 — CENSIMENTO DEGLI IDENTIFICATORI

| nome | dove vive oggi | destinazione |
|---|---|---|
| `codiceGrezzo` | `api/pazienti/route.ts:110` | **Z2**: diventa il valore **normalizzato**, e resta **un solo valore** per colonna e regola del nome |
| `codiceDalBody` | `[id]/route.ts:51-53` | **Z2**: idem — la doppia destinazione (`:58` e `:105`) è **già cablata**, si normalizza a monte |
| `VUOTO_VALE_NULL` | `[id]/route.ts:43` = `{data_nascita, sesso}` | **Z2**: `codice_paziente` **non entra nell'insieme** — ha un ramo proprio a `:57-59` e la normalizzazione va lì, dove alimenta anche la regola del nome |
| `ALLOWED` | `[id]/route.ts:35` | **invariato.** `codice_paziente` c'è già: la finestra di correzione del 27/07 è rispettata |
| `insertData` | `route.ts:126-147` | **invariato come insieme di chiavi.** Cambia solo il *valore* di `codice_paziente` |
| `calcolaProssimoPz` | `dati-wizard.ts:44` — **non esportata** | **Z3**: resta non esportata; si prova **attraverso `aggregaDatiWizard`**, come già fanno i tre test `:145-164` |
| `.like` → `.ilike` | `dati-wizard.ts:128` | **Z3**: e **il finto database di `dati-wizard.test.ts:37` deve conoscere `ilike`**, altrimenti sei test esplodono invece di provare qualcosa |
| `.is('deleted_at', null)` su `pazienti` | `dati-wizard.ts:128` | **Z3**: **si toglie e NON si sostituisce con `archiviato`** — il generatore deve guardare **tutto** ciò che l'indice arbitrerà, e l'indice non filtra per stato |
| `AccessorioFallito` | `crea-lavoro.ts:78` | **NON si tocca.** Il codice occupato **non è un accessorio**: è bloccante. Va in un campo proprio dell'esito |
| `EsitoCreazione` | `crea-lavoro.ts:80-83` | **Z1**: guadagna il **motivo** del blocco. 🔑 `ESITO_BLOCCANTE` (`:85`) è una costante **condivisa e restituita da 6 punti** (`:212,238,244,303,315` + `:233`): un campo nuovo con default va aggiunto **lì**, non a mano in ognuno |
| `errore(...)` di `useAvvisi` | `WizardNuovoLavoro.tsx:383` | **Z1**: il testo cambia **solo** nel ramo «codice occupato» |

---

## 5. R-P1 — REGISTRO DELLE PROVE

**Fail-closed: un blocco senza marchio è NON provato.** Ogni blocco di codice di questo documento nasce
`non eseguito`, col comando accanto che l'esecutore userà.

| # | assunzione | stato |
|---|---|---|
| **Z-P1** | Su `pazienti` **non esiste oggi nessun vincolo di unicità** sul codice | ✅ **PROVATA, 30/07.** `provato: select indexname, indexdef from pg_indexes where tablename='pazienti'` → quattro indici: `pazienti_pkey` (unico, ma su `id`), `idx_pazienti_laboratorio`, `idx_pazienti_cliente`, `idx_pazienti_search` — **tutti e tre i non-chiave parziali su `deleted_at IS NULL`, nessuno unico su `codice_paziente`**. ➡️ **Z1 nasce INERTE**: il suo ramo 409 non può accendersi in produzione finché T5 non crea l'indice |
| **Z-P2** | Nessun codice storico è già «sporco» rispetto alla normalizzazione futura | ✅ **PROVATA, 30/07.** `provato:` conteggio su `pazienti` → `con_codice 915` · **`con_spazi 0`** · **`vuoto_stringa 0`** · **`pz_non_maiuscolo 0`** · `fuori_formato 911` · `totale 916`. I 911 sono `PAZ/2026/nnnn` (dati di prova), che il generatore ignora **correttamente**. ➡️ **nessuna ripulitura una tantum**: Z3 da sola chiude il difetto circolare |
| **Z-P3** | Il finto database dei test conosce `.ilike` | ✅ **PROVATA FALSA, 30/07.** `dati-wizard.test.ts:37` elenca `['select','eq','is','gte','not','like']`. ➡️ **Z3 aggiunge `ilike` al finto client**, e lo fa **prima** di cambiare il codice, altrimenti il rosso che vedrà non è quello che cerca |
| **Z-P4** | Il pre-controllo del wizard troverebbe un codice occupato scritto in altro modo | ✅ **PROVATA FALSA, 30/07 (lettura).** `crea-lavoro.ts:214` confronta con `===`, byte-identico; e la lista su cui cerca arriva da un `GET` con **`.limit(500)`** (`route.ts:37`) contro **911 righe di un solo cliente**. ➡️ 🛑 **la cura è T7, NON questa consegna.** Qui si prende atto: l'azione «riusa il paziente esistente» **non è offribile** perché il wizard non sa chi è |
| **Z-P5** | Il 409 non rompe i chiamanti | 🟡 **da provare in Z1**, e il comando c'è: `npx vitest run tests/unit/crea-lavoro.test.ts tests/unit/PazienteEditSheet.test.tsx` — output reale incollato nel rapporto |
| **Z-P6** | `'' → NULL` sul codice non fa cadere la regola del nome in un 422 indebito | 🔴 **DA PROVARE in Z2**, ed è il punto delicato: `risolviNomePaziente` restituisce `null` (→ **422 «Serve almeno il codice paziente»**) quando non ha né nome né codice. Il caso da provare è **un paziente con cognome vero a cui si svuota il codice**: deve **passare**, non dare 422 |

---

## 6. I TASK

### Z3 — il generatore guarda la stessa popolazione dell'indice
**File:** `src/lib/wizard/dati-wizard.ts` · `tests/unit/dati-wizard.test.ts`

1. `.like('codice_paziente','PZ-%')` → **`.ilike`** (`:128`)
2. `/^PZ-(\d+)$/` → **`/^PZ-(\d+)$/i`** (`:47`)
3. **via `.is('deleted_at', null)`** dalla query dei pazienti (`:128`), **senza** sostituirlo con
   `archiviato`: l'indice non filtra per stato, e il generatore dev'essere **uguale o più conservativo
   dell'indice, mai meno**. 🛑 Il filtro **resta** sulle query di `clienti` (`:126`) e `lavori` (`:127`) —
   quelle non c'entrano.
4. 🔧 **Il `trim` prima del confronto** (`:47`): l'indice normalizzerà con `lower(btrim(...))`, quindi
   un ipotetico `' PZ-0043 '` **collide** ma la regex ancorata **non lo vedrebbe** → il generatore
   riproporrebbe un codice occupato. Oggi righe così sono **zero** (Z-P2), ma la regola è che il
   generatore rispecchi l'indice, non che si fidi dei dati di oggi.
   ⚠️ **Se questo va fatto, va fatto anche sulla query**: `.ilike('%PZ-%')` invece di `.ilike('PZ-%')`,
   perché `.ilike('PZ-%')` non prende ` PZ-0043`. **Costo a 916 righe: trascurabile.**
   🔴 **L'esecutore deve confutare questo punto o confermarlo, e scrivere quale delle due.**
5. **Prima di toccare il codice:** aggiungere `'ilike'` alla lista dei metodi del finto client
   (`dati-wizard.test.ts:37`), altrimenti il rosso è «metodo inesistente» e non prova niente.

**Prove da scrivere (B23 del piano v2, allargata):** codice `pz-0043` in minuscolo → `prossimoPz` **non**
restituisce `PZ-0043` · un paziente archiviato con `PZ-0999` → il suo numero **conta** · fixture con
spazi, secondo l'esito del punto 4 · e il test di tenant-scoping (`:222-242`) resta verde.

### Z2 — normalizzazione in scrittura
**File:** `src/app/api/pazienti/route.ts` · `src/app/api/pazienti/[id]/route.ts`

1. **POST `:110`** — `codiceGrezzo` diventa normalizzato: `trim()`, e **stringa vuota → `null`**.
   🔑 Il valore normalizzato è **uno solo** e alimenta sia `codice_paziente` (`:139`) sia
   `cognomeEffettivo`/`risolviNomePaziente` (`:112-117`): è già così, non si spezzi.
2. **PATCH `:51-53`** — stessa normalizzazione su `codiceDalBody`, **a monte** delle sue due destinazioni
   (`:58` e `:105`). `codice_paziente` **non** entra in `VUOTO_VALE_NULL`: ha già il suo ramo.
3. 🛑 **Non si tocca la maiuscola.** L'indice normalizzerà con `lower()` **per confrontare**, ma il
   codice si **conserva come l'utente l'ha scritto**: è un identificativo che finisce su documenti
   conservati per legge, e riscriverlo sarebbe alterare un dato dell'utente per comodità nostra.

**Prove (Z-P6 è la delicata):** `'  PZ-0042  '` → in banca dati `'PZ-0042'` · `''` → `null` · un
paziente **con cognome vero** a cui si svuota il codice → **200, non 422** · un paziente **senza
cognome** a cui si svuota il codice → **422**, che è giusto · e i test esistenti di
`api-pazienti-post.test.ts` / `api-pazienti-patch.test.ts` restano verdi **per il motivo giusto**.

### Z1 — il codice occupato diventa un fatto raccontabile
**File:** le due rotte · `crea-lavoro.ts` · `WizardNuovoLavoro.tsx` · 🆕 `PazienteEditSheet.tsx`

1. **Le due rotte**: `insertError.code === '23505'` → **409** con un codice di dominio nel corpo
   (es. `{ error: '<testo>', motivo: 'codice_paziente_occupato' }`).
   🛑 **G9 resta assoluto:** nessun nome di vincolo, di indice o di colonna esce verso il client — si
   guarda **solo** `error.code`, mai `error.message`. Modello da ricalcare, 9 route in casa:
   `api/ordini/route.ts:124` · `api/cicli/route.ts:118` · `api/magazzino/route.ts:127` ·
   `api/admin/labs/route.ts:93` · `api/qualita/psur/route.ts:203` · `api/stripe/webhook/route.ts:48` ·
   `api/fatture/batch/route.ts:246` · `api/lavori/[id]/prove/route.ts:97` ·
   `api/auth/webauthn/register/verify/route.ts:59`. ⚠️ **`23505` può nascere anche da un vincolo che non
   è il nostro**: il messaggio dev'essere vero anche in quel caso, o si distingue.
2. **`crea-lavoro.ts`**: l'esito distingue «codice occupato» da «guasto». Il campo nuovo va su
   `EsitoCreazione` (`:80-83`) **e su `ESITO_BLOCCANTE`** (`:85`), che sei punti restituiscono.
3. **`WizardNuovoLavoro.tsx:382-384`**: nel ramo «codice occupato» il testo cambia. 🔴 **Vedi §7.**
4. 🆕 **`PazienteEditSheet.tsx`**: chi corregge un codice a mano deve leggere la stessa verità, non un
   500 generico.

---

## 7. ✅ La decisione di Z1 — RATIFICATA (D36, 30/07)

**Il mockup ratificato non copre questo schermo**, ed è un fatto letto, non un'impressione: descrive
l'avviso che compare **mentre si scrive**, con **nome del paziente, ultimo lavoro e primo codice libero**.
Nessuno dei tre è disponibile qui: il primo e il secondo li porta **T7**, il terzo richiede una lettura
che **non esiste** (Z-P4: il pre-controllo del wizard confronta byte-identico su una lista tagliata a 500).

**Quindi l'azione «È lei: attacca il lavoro alla sua scheda» NON è offribile in questa consegna.**
Resta l'altra, che funziona sempre: **cambiare il codice**. Il campo è già lì, già editabile, nella
stessa schermata. La proposta è che il messaggio smetta di dire «Riprova» — che è l'anello chiuso, perché
`pz` non si ricalcola (`WizardNuovoLavoro.tsx:258`) — e dica invece cosa è successo e cosa fare.

✅ **Francesco ha scelto il 30/07 — D36**, verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
ottava tornata. **I due testi sono ratificati e si scrivono così, alla lettera:**

> **Nel wizard** (al posto di `WizardNuovoLavoro.tsx:383`, solo nel ramo «codice occupato»):
> **«Il codice PZ-0918 è già di un altro paziente. Scrivine un altro nel campo "Codice paziente" qui sopra.»**
> — dove `PZ-0918` è **il codice vero che l'utente ha tentato**, non un segnaposto.
>
> **Nel pannello di modifica** (`PazienteEditSheet.tsx`):
> **«Questo codice è già di un altro paziente. Scrivine un altro.»**
> — qui il codice non si ripete: l'utente lo sta guardando nel campo che ha appena scritto.

🛑 **Nessuna schermata nuova, nessun componente nuovo, nessun mockup**: cambia **solo la frase** dentro
l'avviso che esiste già, e il campo è **già editabile**. Chi allarga questo perimetro sta facendo T15
in anticipo. ⏳ **Quando arriverà T15 questa frase decade** e le subentra l'avviso completo del mockup.

---

## 8. Verifica e consegna

- **FASE 7, tutti e tre con output reale:** `npx tsc --noEmit` · `npx vitest run` · `npx next build`.
  ⚠️ `tsc` **non** valida la firma degli handler di rotta: solo `next build` la vede.
- **FASE 6b: non si applica** — nessuna migration (§2.2).
- **FASE 9:** solo se Z1 punto 3 tocca la UI → 390/768/1280 × chiaro/scuro.
- **Baseline riverificata alla fine: 294 · 0 · 916 · 48.** Il database si tocca **solo in lettura**.
- **Merge su `main` e deploy** → verifica su `uachelab.com`.
  🛑 **Nel rapporto si scrive: «Z1 consegnato e INERTE»** — provato dai test e dalla sonda, **non**
  «verificato in produzione»: senza l'indice il suo ramo non può accendersi (Z-P1). Scrivere altro
  sarebbe fabbricare esattamente il tipo di certezza che ha fermato il piano v1.
- **BP-1:** `memory/MEMORY.md` · `docs/roadmap/ROADMAP-UFFICIALE.md` · `memory/SESSION_ACTIVE.md`.

## 9. Le trappole già pagate — si rileggono prima di ogni task

🛑 **Mai un git worktree** (doppio `package-lock.json` → 404 su tutte le route) · ⚠️ `.next` stantio dopo
un cambio di ramo → `/usr/bin/trash .next` · ⚠️ **backtick nel messaggio di commit eseguiti dalla shell**
→ `-F` da file · ⚠️ `.gitignore` ignora `*.png` → `git add -f` · 🔑 SQL diretto:
`node scripts/tmp/sql.mjs "<query>"` (**non è nel repo**, vive solo su questo disco) · 🔑 le sonde girano
su **transazione annullata o tabella temporanea**, mai su una migration registrata · 🆕 **`\w` in
JavaScript non contiene le lettere accentate** · 🆕 `git checkout -- <file>` cancella il lavoro non salvato.
