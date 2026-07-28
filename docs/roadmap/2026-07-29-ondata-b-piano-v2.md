# Piano v2 — Ondata (b) del wizard «Nuovo lavoro»

**Data:** 29 luglio 2026 · **Stato:** 🟡 **BOZZA — non ancora eseguibile** (v. §9) · **Percorso:** GRANDE
**Sostituisce:** `docs/roadmap/2026-07-28-ondata-b-piano.md`, fermato dal panel del 29/07
**Nasce da:** `docs/roadmap/2026-07-29-ondata-b-panel-validazione.md` — **29 rilievi · 6 bloccanti ·
15 affermazioni del piano v1 verificate false**
**Fonti ratificate:** spec `docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md` ·
verbale **D1-D34** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`

> 🔑 **La lezione che questo piano porta addosso, e che va letta prima di tutto.** Il piano v1 non è stato
> fermato dai buchi che dichiarava: è stato fermato **dove si sentiva sicuro**. Le quattro cose che dava per
> provate o acquisite — la sonda P1, il censimento dei token, la citazione-àncora del §4, il drift
> `bite_splint` — erano **tutte e quattro difettose**. Un buco dichiarato si chiude; **una certezza sbagliata
> no, perché nessuno la riapre.**

> ⛔ **Questo piano non esce dalla FASE 4 finché §9 non è vuoto.** Al momento **non lo è**: restano
> **3 sonde** (P2 da rieseguire, P3, P6-forma), **2 gate di mockup** e **2 decisioni di prodotto**.

---

## 0. 🛑 CONSEGNA ZERO — va in produzione DA SOLA, e PRIMA del ramo

**Non è il primo task dell'ondata: è una consegna separata, col suo `tsc`/`vitest`/`build`, la sua
revisione e il suo merge su `main`.**

**Perché la forma cambia, non solo l'ordine** (bloccante B-5): 🔍 **non esiste uno staging.**
`deploy.yml` fa tre cose — `npm ci`, deploy Vercel, controllo di salute — e **nessuno step di migration**;
`ci.yml` ha come unica riga Supabase un **URL segnaposto**; `package.json` non ha comandi di migration;
non esiste `supabase/config.toml`, quindi nessun `supabase link`. **Le migration si applicano a mano
sull'unico progetto** (`iagibumwjstnveqpjbwq`). ➡️ **Dal minuto in cui l'indice esiste, vale per la
produzione** — che deve già saperlo gestire. Scritta come «T0» dentro il ramo, la garanzia evapora:
l'esecutore la farebbe sul ramo.

| # | cosa | perché non può aspettare |
|---|---|---|
| **Z1** | **`23505` → `409` di dominio** su `POST /api/pazienti` e `PATCH /api/pazienti/[id]`; `crea-lavoro.ts` distingue «codice occupato» da «guasto»; il wizard offre **l'unica azione che può funzionare** (riusare il paziente esistente, o rigenerare il codice) | Senza, l'indice è **una porta chiusa a chiave sul banco**: «Riprova» **riproduce l'errore all'infinito** perché `pz` non si ricalcola (`WizardNuovoLavoro.tsx:258`). 🛑 **G9 resta:** nessun nome di vincolo esce verso il client |
| **Z2** | **Normalizzazione in scrittura:** `btrim` sul codice, e **`'' → NULL`** su entrambi gli scrittori (`VUOTO_VALE_NULL` a `[id]/route.ts:43` contiene oggi **solo** `data_nascita` e `sesso`) | D34-bis. E senza il `'' → NULL`, due schede con codice vuoto **collidono** appena nasce l'indice |
| **Z3** | **Generatore: `.like` → `.ilike` e `/^PZ-(\d+)$/` → `/i`**, e **si toglie `.is('deleted_at', null)`** senza sostituirlo con `archiviato` (`dati-wizard.ts:47,128`) | 🔴 **Il difetto circolare:** un `pz-0043` digitato a mano è invisibile al `max+1`, il wizard propone `PZ-0043` → **l'indice rifiuta la proposta che il wizard stesso ha appena fatto**. E il generatore dev'essere **uguale o più conservativo** dell'indice, mai meno |

**Modello in casa, da ricalcare — 9 route gestiscono già `23505`:** `api/ordini/route.ts:124` ·
`api/cicli/route.ts:118` · `api/magazzino/route.ts:127` · `api/admin/labs/route.ts:93` ·
`api/qualita/psur/route.ts:203` · `api/stripe/webhook/route.ts:48` · `api/fatture/batch/route.ts:246` ·
`api/lavori/[id]/prove/route.ts:97` · `api/auth/webauthn/register/verify/route.ts:59`.
🔑 **`api/pazienti` è l'unica che scrive un codice unico e non ce l'ha.**

🛑 **GATE DI CONSEGNA ZERO:** Z1-Z3 **in produzione e verificati su `uachelab.com`** prima che T1 apra il
ramo. **Non è una raccomandazione: è la sola difesa** — senza `ON CONFLICT` (impossibile qui, v. §5/P8)
la corsa fra due richieste concorrenti **non ha altra rete**.

---

## 1. Perimetro — invariato (D26)

| ondata | contenuto |
|---|---|
| **(b) Il wizard** — questo piano | 38 tipi nel codice · passi adattivi · testata a pagine + uscita + freccia corretta · passo paziente + ricerca · indice unico + avviso codice · odontogramma v3 + colore · galleria di più foto + cancellazione · cassette libere + crea + salta · bozza `v:2` · via «Dimmelo a voce» · gate L2 |
| **(c) Le foto, per bene** | editor: ruota · ritaglia · ingrandisci — **e le stesse azioni sulla scheda** |
| **(d) Le cassette, per bene** | parete in «modo scelta» con la ricerca · tavolozza più ricca |

**🆕 Uscito dal perimetro col panel, con la sua destinazione:** la **purga a fine ritenzione** (il
soft-delete la richiede per non violare Art. 5(1)(e) GDPR — ma non c'è nessun laboratorio reale e nessun
dato a scadenza: **voce di roadmap propria**) · l'**audit delle cancellazioni** su `lavori_immagini` ·
il canale per una **richiesta Art. 17 inoltrata dal dentista**, che il DPA promette e il prodotto non ha ·
la colonna morta **`lavori_immagini.tipo`**.

---

## 2. Gate FASE 3 — le cinque risposte, RIFATTE dopo il panel

1. **Tenant isolation.** 🔴 **La risposta del v1 era falsa in due punti.** ① `cliente_id` **non è
   l'isolamento**: è un filtro **condizionale** (`api/pazienti/route.ts:39-41`, dentro un `if`).
   L'isolamento è il solo `laboratorio_id` (`:33`). ② La spec §14.1 diceva «`pazienti` è protetta da RLS»:
   vero della **policy**, falso di **questa rotta**, che usa `getServiceClient()` e **aggira la RLS** — gli
   `.eq()` espliciti sono **l'unico controllo**. Vale identico per le tre rotte immagini e per
   `POST /api/cassette`. ➡️ **T6 rende `cliente_id` obbligatorio quando c'è `q`** (422 altrimenti), e il
   piano smette di chiamarlo isolamento: **`laboratorio_id` è l'isolamento, `cliente_id` è la portata**.
2. **Schema drift.** Una migration (T5). **FASE 6b ha TRE righe, non due**: `gen types` · `tsc --noEmit` ·
   **verifica che la migration non rompa le RLS** — quella che il v1 saltava. ⚠️ Per un **indice** il
   diff dei tipi è **atteso nullo**: è una **previsione**, quindi porta il suo marchio (R-P1) e il diff va
   incollato — **un diff non vuoto è la prova provata di un drift**.
3. **Contratto API.** `q=` e il `DELETE` non rompono client (**vero per accidente:** l'unico chiamante è
   `crea-lavoro.ts:209`). 🔴 **Ma la proiezione condizionale è una trappola** e viene **abbandonata**: v. T6.
4. **Rollback.** 🔴 **La risposta del v1 era falsa:** «il `DELETE` è l'unica azione distruttiva nuova» —
   T18 introduce `POST /api/cassette`, una **scrittura persistente** su un lavoro che non esiste ancora.
   E «revert del commit» **non annulla la migration**: il rollback si scrive come **comando col nome esatto
   dell'indice e chi lo lancia** (`DROP INDEX IF EXISTS pazienti_codice_lab_uidx;`), non come categoria.
5. **Dominio critico? Sì, GRANDE**, invariato — e ora con **quattro risposte normative in mano** (§5-ter,
   §5-quater, §5-quinquies del verbale del panel) invece che con quattro domande aperte.

---

## 3. R-P2 — REGISTRO DELLE LETTURE

✅ **Gli 11 file che il v1 dichiarava `NON letto` sono stati letti tutti**, il 29/07, da tre lettori con
**domande falsificabili e citazione obbligatoria** — mai un riassunto. Più **un dodicesimo che il v1 non
conosceva**.

| file | letto | cosa ne è uscito (solo ciò che cambia il piano) |
|---|---|---|
| `src/lib/wizard/dati-wizard.ts` | intero | `calcolaProssimoPz` = **`MAX+1` su `/^PZ-(\d+)$/`**, `:44-51`, **non esportata** · lettura a `:128` con `.like` **case-sensitive** e `.is('deleted_at', null)` · calcolata **una volta sola** al render della pagina (`(app)/lavori/nuovo/page.tsx:23`) · `import 'server-only'` a `:1` |
| `src/components/features/wizard/PassoPaziente.tsx` | intero | **1 casella sempre** («Codice paziente», `:76`) + 3 solo se la riga è aperta + 1 input file · 🛑 **NESSUN `name`/`id` stabile**: `Campo.tsx:78-87` mette solo `useId()` → **l'unico appiglio nei test è l'etichetta** · `autoFocus` c'è **solo** sulla riga opzionale appena aperta (`:166`), **non** sul campo primario |
| `src/components/features/wizard/PassoTipo.tsx` | intero | `PillVoce` a `:114-117`, prop **unica** `onTesto` · **nessun azzeramento** al cambio tipo (verificato a `WizardNuovoLavoro.tsx:254-261`: lo spread conserva tutto) |
| `src/components/features/wizard/PassoDentista.tsx` | intero | `PillVoce` a `:91-94` · **il paziente scelto NON viene rilasciato** al cambio dentista (`:229-233`) |
| `src/components/ds/ProgressDots.tsx` | intero | `passo: 1\|2\|3` tipizzato a `:43`, `aria-label` col **3 scritto a mano** a `:49` · nessuna classe CSS, solo stili inline |
| `src/components/ds/PillVoce.tsx` | intero | `:105` `if (!haSupporto) return null` → **senza Web Speech non rende nulla** (spiega perché solo 5 test la montano) · **il CSS vive dentro il file**, `:151-192` |
| `tests/unit/WizardNuovoLavoro.test.tsx` | intero | **26 test** · `:10` `vi.mock('next/navigation')` con **`back: vi.fn()` nuova a ogni chiamata** → 🔴 **B15 nasce morta** · `:272` è una negativa che **sopravvive vacuamente** a `ProgressDots` cancellato |
| `tests/unit/PassoPaziente.test.tsx` | intero | **16 test** · `:80,:181` cercano la stringa `'Nome o alias'` · `:81` conta **3** bottoni «Salta» → diventano 4 |
| `tests/unit/PassoTipo.test.tsx` | intero | **14 test** · `:191` è **l'apertura di un `it`**, il contatto vero è `:195` (`/dimmelo a voce/i`), raggiungibile solo grazie a `:192` che installa il finto riconoscimento vocale |
| `tests/unit/wizard-persistenza.test.ts` | intero | **10 test** · `:63-66` usa **`v: 2` come valore INVALIDO** → 🔴 **va CAPOVOLTO, non aggiornato** · **nessuna asserzione sulla rimozione della chiave** per versione sbagliata |
| `supabase/schema.sql` 430-520 | letto | `codice_paziente TEXT` **nudo**, nullable, nessun default (`:461`) · **3 indici, tutti `WHERE deleted_at IS NULL`** · 🔴 **`nome`, `cognome` e `archiviato` NON CI SONO** (vengono da `002_fase2_schema.sql:112-118`) → **il file su cui T5 si ancora non descrive più la tabella** |
| 🆕 `tests/unit/dati-wizard.test.ts` | **da leggere in T-Z3** | **il v1 non lo conosceva**: tocca il generatore, che Z3 modifica |

**Territorio di lettura per T5 (R-P2 assorbe R-P3):** `002_fase2_schema.sql` **+ il catalogo vivo**
(`pg_indexes`, `pg_constraint`), **NON** `schema.sql`. Motivo provato: `schema.sql` è uno **snapshot fermo**.

---

## 4. R-P6 — CENSIMENTO DEGLI IDENTIFICATORI

### Campi di `StatoWizard`

| nome oggi | destinazione |
|---|---|
| `passo: 1\|2\|3` | ➡️ 🆕 **diventa il NOME del passo** (`'paziente' \| 'denti' \| …`), **non un indice** — v. T4 |
| `cliente` · `tipo` · `pz` | restano |
| `alias` | 🗑️ **muore** → `cognome` + `nome` (D2). Portato anche in `persistenza.ts:21` e `crea-lavoro.ts:230` |
| `elemento` · `colore` | 🗑️ **muoiono** → passo denti e passo colore |
| `foto: File \| null` | ➡️ `foto: File[]` (D23) |
| — | 🆕 `cognome`, `nome`, `pazienteIdScelto`, `denti`, `colori`, **`cassettaId`** |

⚠️ **`cassettaId` DEVE entrare in `StatoSalvato` `v:2`**, oppure uscirne **con la ragione scritta accanto**
(come la `foto`, «un `File` non è serializzabile»). Nel v1 il censimento lo aggiungeva a `StatoWizard` e la
spec §7 **non lo portava nel salvataggio**: è il principio di questo stesso paragrafo, violato dal paragrafo.

### 🔧 Simboli e token — CENSIMENTO RIFATTO (quello del v1 era sbagliato, non solo mancante)

| voce | v1 diceva | **verità** |
|---|---|---|
| regole CSS | «`.ds-pillvoce`/`.ds-dots` in `ds-v3.css`» | 🔴 **NON ESISTONO, zero occorrenze.** Il CSS di `PillVoce` è **inline nel file** (`:151-192`, 40 righe, 10 blocchi) e **muore col file**; `ProgressDots` **non ha CSS**. In `ds-v3.css` ci sono **solo 3 righe di commento** |
| coreografia | «`coreografie` in `motion.ts:56`» | 🔴 **`coreografie` comincia a `:68`**; a `:56` c'è il commento di `cssEase.pillVoce`. **Nessuna chiave di `coreografie` diventa orfana** |
| gli orfani veri | — | ✅ **`cssEase.pillVoce` (`motion.ts:60`)** e **`cssEase.dots` (`:64`)** — quest'ultimo **il v1 non lo nominava affatto**: eseguendo il censimento alla lettera **restava in casa** |
| token | `pillVoce` in `v3/tokens.ts` | ✅ confermato: `:92-115`, **24 righe**, unico consumatore `PillVoce.tsx` |
| 🆕 stato del wizard | — | **`pillOnTesto` (`PassoPaziente.tsx:53-68`), `campoAttivo` (`:49`), il tipo `CampoAttivo` (`:36`)** e i **tre wrapper `.pv-wrap`** muoiono con `PillVoce` |
| 🆕 conteggio duro | — | **`catalogo.test.tsx:108` `toHaveLength(22)` → 20**, più la lista `toEqual` a `:125,:127` |
| 🆕 guardia da salvare | — | **`ProgressDots.test.tsx:112-118`** verifica che `ProgressDotsStanze` (rimosso mesi fa) **non ritorni**. Cancellato il file, **la guardia muore per modulo-non-trovato**: va **ricollocata o abbandonata coscientemente**, non eliminata di straforo |

➡️ **Totale reale: 17 file** (21 se la guardia B7 pretende zero occorrenze anche nei commenti — **da
chiarire prima di eseguire**; la spec DS §5.37 dice che i record storici restano, quindi B7 quasi
certamente **non** copre `docs/`).

**Orfani PREESISTENTI, riferiti e non toccati (R-E2):** `cssEase.snap` (`motion.ts:49`, **zero usi
ovunque**) · `cssEase.sheet` (`:47`) · `coreografie.pilaEspansione` (`:70`) · `consegnatoCheck` (`:94`) ·
`consegnatoCascata` (`:100`).

### Chiavi JSON e campi API

| chiave | nota |
|---|---|
| `descrizione` | i sei valori sono `TIPI_FOTO` (`TabImmagini.tsx:15-22`); il wizard manda `'impronta'` **fissa** (`crea-lavoro.ts:333`) → deve diventare scelta |
| 🆕 **`storage_path`** | 🔴 **la maniglia vera delle immagini.** `url` è un `getPublicUrl` **morto** su bucket **privato**: le foto si vedono solo perché una pagina le **rifirma** al render. Contratto scritto: `FotoStrip.tsx:4-7` |
| 🆕 `deleted_at` su `lavori_immagini` | esiste (`002_fase2_schema.sql:255`), **la RLS lo filtra già** (`:259`), l'indice è già parziale (`:263`) — ma **otto letture applicative no** (T8) |
| `q` | 🔴 **la proiezione NON è più condizionale**: v. T6 |
| `CHIAVE_WIZARD` | ✅ **il valore NON cambia** — v. §5/P9 |

---

## 5. R-P1 — REGISTRO DELLE PROVE

**Fail-closed: un blocco senza marchio è NON provato.**
🛑 Le sonde girano su **transazione annullata o tabella temporanea**, MAI su una migration registrata.

| # | assunzione | stato |
|---|---|---|
| **P1** | L'indice unico rifiuta un codice ripetuto nello stesso laboratorio | 🔴 **DECLASSATA dal panel: provava il caso banale.** Sostituita da P1-bis |
| **P1-bis** | L'indice rifiuta **le forme che un'addetta digita davvero** | ✅ **PROVATA, 29/07.** `provato:` transazione con `ROLLBACK`, tabelle temporanee. Indice **grezzo**: `pz-0042`, ` PZ-0042`, `PZ-0042 ` **passano tutti e tre** ❌. Indice **`lower(btrim(...))`**: **tutti rifiutati** ✅, controllo positivo fra due laboratori **passa** ✅, i due `NULL` passano ✅. `tabelle_sonda: 0`, baseline **294 · 0 · 916 · 48** |
| **P2** | Zero duplicati (la migration non aborta) | ✅ provata due volte (28/07 e 29/07: **0 grezzi, 0 normalizzati**). ⚠️ **Decade col tempo: si riesegue immediatamente prima di T5** |
| **P3** | La proiezione ridotta non rompe `crea-lavoro.ts:213-214` | 🟡 **superata in parte**: T6 **abbandona** la proiezione condizionale, quindi la domanda cambia forma. Resta da provare che il chiamante regga la forma nuova |
| **P4** | `leggiStato` scarta `v:1` **e rimuove la chiave** | ✅ **CONFERMATO DIFETTO:** `persistenza.ts:69` è un `return` secco; solo il ramo scadenza chiama `azzeraStato()` (`:71-73`). E `wizard-persistenza.test.ts:63-66` **non asserisce la rimozione** |
| **P5** | Cancellare una riga toglie anche il file | 🔴 **RIFORMULATA:** la domanda giusta non è quella. **Il `DELETE` è SOFT** (D34/panel) → non si tocca lo storage. La prova diventa: **la riga soft-cancellata sparisce da tutte e otto le letture** |
| **P6** | La lettura «ultimo lavoro» in una sola andata | 🔴 **RIFORMULATA:** a 916/294 righe **ogni variante torna sotto il millisecondo** — la misura di costo **non discrimina**. Prima si prova la **FORMA** (l'aggregato è esprimibile in PostgREST? in `src/` **non c'è nessun precedente**), poi, se serve, il costo su un insieme gonfiato. 🔴 **da eseguire** |
| **P7** | Il drift `bite_splint` esiste | ✅ **ESEGUITA, 29/07: IL DRIFT NON ESISTE.** `provato: select pg_get_constraintdef(...) where conname='lavori_tipo_dispositivo_check'` → la CHECK **contiene `bite_splint`**, 10 valori. Nota falsa **rimossa** da `tipi-lavoro.ts` |
| **P8** | Si può ricalcare il pattern `ON CONFLICT` della parete cassette | ✅ **PROVATA FALSA, 29/07.** La parete **elimina** il pre-check con `ON CONFLICT (espressione)` dentro una **RPC**; `pazienti` scrive via supabase-js e **l'`onConflict` di PostgREST accetta solo nomi di colonna**. ➡️ `pazienti` ricade sotto il precedente della **partita IVA**, da cui **due requisiti duri**: predicato dell'indice = predicato del pre-check **alla lettera**, e `23505` **obbligatoriamente** mappato |
| **P9** | Rinominare la chiave di `localStorage` è innocuo | ✅ **PROVATA FALSA, 29/07.** Tutti i test leggono `CHIAVE_WIZARD` **dalla costante**: rinominandola **nessun test se ne accorge**, le bozze `v:1` restano orfane **per sempre**, e ogni `expect(getItem(...)).toBeNull()` passa **a vuoto**. ➡️ **il nome resta, e T9 rimuove esplicitamente** |
| 🆕 **P10** | Il generatore e l'indice guardano la stessa popolazione | ✅ **PROVATA FALSA** (due advisor + sonda): il generatore filtra `deleted_at`, la lettura filtra `archiviato`, l'indice **nessuno dei due**; e il generatore è **case-sensitive** su `.like` e sulla regex. ➡️ **Z3** |

**Ogni blocco di codice di questo piano nasce `non eseguito`, col comando accanto** che l'esecutore userà.

---

## 6. I TASK

**Un compito alla volta a un esecutore fresco** (R-E1), col mandato di **cercare dove il piano sbaglia**;
i difetti fuori mandato si **riferiscono**, non si correggono (R-E2).

### Blocco 0 — apertura
- **T1** — ramo `ondata-b-schermate` **nel repo principale** (🛑 mai un worktree). `/usr/bin/trash .next`.
  **Precondizione: Z1-Z3 verificate in produzione.** Baseline riverificata e incollata. 🔑 **L'esecutore di
  T1 verifica per primo che marchi e registri CI SIANO** (presenza, non verità) e, se mancano, si ferma.

### Blocco 1 — le fondamenta (nessuna UI)
- **T2** — `tipi-lavoro.ts`: i 38 tipi guadagnano `prevedeDenti`/`prevedeColore`/`prevedeArcata`.
  Fonte: verbale 27/07 §6-quater. ✅ **Il drift `bite_splint` non esiste** (P7): niente da temere.
- **T3** — `src/lib/wizard/sequenza-passi.ts` **(nuovo, puro)**:
  - `sequenzaPassi(tipo)` → l'elenco dei **nomi** di passo
  - 🔧 **`cosaSiPerde(precedente: StatoWizard, successivo: StatoWizard)` — DUE STATI, non due tipi.**
    Motivo (bloccante B-3): la firma del v1 **non vedeva il dentista**, e D17 mette **due** perdite nella
    stessa riga di comportamento. Con due tipi, cambiare studio sganciava il paziente **in silenzio** —
    cioè la variante (b) che D17 ha scartato **per nome**.
  - 🔑 **Più UNA SOLA tabella dichiarata qui: «passo → dato che porta»** (`denti`→`denti`,
    `colore`→`colori`, `paziente`→`pazienteIdScelto`, e la **dipendenza** del passo paziente da `cliente`).
    Se non sta in T3 dove si può provare, **T21 la riscriverà comunque**.
- **T4** — 🆕 **il contratto della macchina dei passi** (era T18, **spostato in testa**).
  Bloccante: T11-T20 si scriverebbero contro un contratto che non esiste. Contiene **solo il contratto**:
  il passo corrente si identifica **per NOME**, mai per indice; il rendering è per nome; la ✕ compare
  «quando il passo non è **il primo della sequenza**», non «dal passo 2».

### Blocco 2 — banca dati
- **T5** — **migration.** Precondizione: **P2 rieseguita** nello stesso giorno.
  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS pazienti_codice_lab_uidx
    ON pazienti (laboratorio_id, lower(btrim(codice_paziente)))
    WHERE codice_paziente IS NOT NULL AND btrim(codice_paziente) <> '';
  ```
  **(D34 + D34-bis.** Nessun filtro su `archiviato` né su `deleted_at`: **un predicato senza stato non deve
  arbitrare** fra due colonne che non concordano.**)**
  **+ correzione del commento `schema.sql:461`** («assegnato dallo studio» non è più vero, D15).
  **+ FASE 6b a TRE righe** — e il diff atteso di `gen types` è **nullo**: **è una previsione, va incollata**.
  **Rollback, come comando:** `DROP INDEX IF EXISTS pazienti_codice_lab_uidx;`
  ⚠️ `CONCURRENTLY` **non serve**: zero occorrenze in tutto `supabase/`, e a 916 righe la finestra di
  blocco è trascurabile — **verificato, non assunto**.

### Blocco 3 — le porte
- **T6** — `GET /api/pazienti?q=`. **Cinque cose, non una:**
  1. 🔧 **Proiezione stretta SEMPRE, non condizionale.** Motivo (I-16): l'unico chiamante è il wizard e
     chiama **senza `q`**, quindi la proiezione grassa — `codice_fiscale`, `data_nascita`, `sesso`, `note`
     di fino a 500 pazienti — **continuerebbe a scorrere** dopo un'ondata il cui gate dichiara «dati
     sanitari». Con un solo chiamante, e T16 che lo riscrive comunque, **invertire il default costa zero**.
  2. 🔴 **`cognomeEffettivo` server-side dentro la proiezione.** Senza, la ricerca per cognome **non trova
     i pazienti del wizard**: `risolviNomePaziente:68` mette **il codice dentro `cognome`**, e la riga di
     suggerimento mostrerebbe il codice **due volte**.
  3. **`cliente_id` obbligatorio quando c'è `q`** (422 altrimenti): è la **portata** D11, e oggi è dentro
     un `if`.
  4. **`pgrestQuote`** (`lib/utils/escape-postgrest.ts`, precedente `api/clienti/route.ts:39-40`)
     **+ escape di `%` e `_`**: senza, `q=%` restituisce l'anagrafica intera. **Più una lunghezza minima.**
  5. **Data dell'ultimo lavoro in una sola andata** — **dopo P6-forma**, e con `deleted_at IS NULL` sui
     lavori (l'ultimo lavoro non può essere uno cancellato, e l'indice esistente è parziale su quel
     predicato).
- **T7** — 🆕 **la lettura di unicità del codice** (nuova, e il v1 non ce l'aveva).
  Rispecchia il predicato di T5 **alla lettera**: `laboratorio_id` + `lower(btrim(codice))`, **senza
  `cliente_id`** e **senza limite**. Motivo: il pre-check di oggi guarda **un solo dentista**
  (`crea-lavoro.ts:209`) mentre l'indice guarda **tutto il laboratorio** → direbbe «libero» su un codice
  occupato. 🛑 **La cura è cambiare la LETTURA, non aggiungere `cliente_id` alla chiave** — quello
  riaprirebbe D15. ⚠️ E `.limit(500)` contro **911 righe di un solo cliente**: ~411 già oggi invisibili.
- **T8** — 🆕 `DELETE /api/lavori/[id]/immagini/[imgId]`. **Non è «una rotta»: è una rotta più otto letture.**
  - **SOFT** su `deleted_at` (D34/panel: soft, blob conservato, nessuna cancellazione fisica)
  - **i TRE `.eq()` sulla `delete()` stessa** (`id`, `lavoro_id`, `laboratorio_id`) — non solo sul
    pre-controllo — **+ `.select()` per contare le righe toccate** e fallire se non è esattamente una.
    Motivo: la rotta usa `getServiceClient()`, **la RLS è aggirata**, gli `.eq()` sono l'unico controllo, e
    la mutazione fratella (`:68-74`) ne porta **due**, non tre
  - **finestra: finché `lavori.stato != 'consegnato'`**; fuori finestra **409** e bottone **disabilitato
    con la spiegazione visibile**, mai nascosto
  - **nessun gate di ruolo** (D-3: la consegna che emette la DdC non ce l'ha)
  - 🔴 **LE OTTO LETTURE**, che rendono il soft-delete efficace o un colpo a vuoto:
    `(app)/lavori/[id]/page.tsx:30` · `(app)/lavori/[id]/modifica/page.tsx:51` ·
    `api/lavori/[id]/route.ts:302` · `api/fatture/batch/route.ts:179` · `api/fatture/[id]/xml/route.ts:163` ·
    `lib/pdf/generate-ricevuta-consegna.ts:21` · `lib/pdf/generate-etichetta.ts:37` ·
    `lib/pdf/generate-ifu.ts:21`. ⚠️ **La sintassi del filtro sugli innesti PostgREST va verificata sito per
    sito**: innesto normale e `!inner` non si comportano uguale
  - 🛑 **VIETATO per iscritto:** rendere pubblico il bucket per far funzionare le anteprime. Sarebbero
    fotografie cliniche di pazienti esposte **senza autenticazione**
  - **Il bottone si chiama «Elimina foto».** Mai «diritto all'oblio», mai «richiesta del paziente»: il
    laboratorio è **responsabile**, non titolare, e offrire quella funzione lo spingerebbe verso
    l'Art. 28(10) GDPR, cioè a **diventare titolare**

### Blocco 4 — la memoria del wizard
- **T9** — `StatoSalvato` → **`v:2`**:
  - il **nome** del passo, non l'indice (I-5: la sequenza si calcola da flag in un file di **codice**, e la
    finestra di ripresa è **più lunga di un ciclo di deploy** — un flag corretto nel frattempo e la bozza
    riapre sul passo sbagliato **coi dati giusti**: nessun errore, nessun test rosso)
  - **`cassettaId` dentro**, o fuori **con la ragione scritta**
  - **rimozione della chiave anche sul mismatch di versione** (P4)
  - 🛑 **la chiave NON si rinomina** (P9)
  - ⚠️ **T9 tocca anche `WizardNuovoLavoro.tsx:161-173` e `:178-192`** — lo scrittore e il lettore veri, che
    il v1 non nominava. E **`wizard-persistenza.test.ts:63-66` si CAPOVOLGE**, non si adatta.
- **T10** — `RipresaSheet` rifatto sui passi variabili (le frasi di `:59-75` sono scritte sui tre passi di
  oggi) + avviso «il codice è stato preso» (D25).

### Blocco 5 — la testata
- **T11** — `src/components/ds/BricioleTestata.tsx` (nuovo). **Fila a pagine** (D22, terza stesura).
  Regole: si tiene **`inizio`** · si **riempie da capo** a ogni cambio di larghezza **o di lunghezza
  dell'elenco** finché l'utente non ha scorso · **niente frecce** · contatore intero «+N» · molle da
  `motion.ts`, **mai inline** · 🆕 **rimbalzo alla prima apertura** (D32, che il v1 aveva perso).
  🔴 **Tre cose che il v1 dichiarava «già provate nel mockup» e non lo sono:**
  1. **il verso AVANTI**: il contatore fa **solo** `pagina(-1)` e sparisce a fine corsa → dopo N tocchi
     **non resta nessun bersaglio** per tornare alle scelte recenti, e nel wizard (a differenza del mockup)
     **l'elenco cresce a ogni passo**
  2. **il troncamento**: `max-width:150px` + `ellipsis` **incondizionato**, e ~15 etichette su 38 superano
     i 17 caratteri — fra cui `Duplicato protesi`, **uno dei tre casi di prova canonici**. ⚠️ Il tetto e le
     lunghezze sono **fatti letti**; la conversione caratteri→pixel è una **stima da misurare**.
     ➡️ **T11 dichiara la regola per «una briciola che non ci sta intera»** — troncare è vietato (D22):
     restano abbreviare alla riga1, o due righe. ⚠️ **`labelTipo()` per `anti_russamento` restituisce
     «Anti- russamento»** (`tipi-lavoro.ts:74-76`): la stringa della briciola va scelta, non ereditata
  3. **l'accessibilità**: spec §3 impone `role="img"` («una sola informazione»), che rende i figli
     **presentational** — quindi **le briciole toccabili di D17 e il contatore di D32 escono dall'albero di
     accessibilità**. Due decisioni ratificate che si contraddicono. ➡️ `<nav>` + lista di `<button>`, e il
     contatore **a 44 px** (oggi 34).
- **T12** — uscita **T2** (✕ leggera) **quando il passo non è il primo della sequenza** (D21, riformulata
  per nome) + `DialogConferma` + `azzeraStato()` + 🐛 **correzione di `vaIndietro`** (`router.back()` con
  ripiego, mai `router.push('/dashboard')`).
  🔴 **Bloccante B-4:** il gesto **naviga da dentro un overlay v3**, e `useNavigaDaOverlay` prende **un
  href** mentre serve `back()`. **L'attrezzo non esiste in casa.** ➡️ T12 dichiara la sequenza di history,
  **o** apre una variante `back` dell'hook. ⚠️ E `scripts/guardia-navigazione-overlay.mjs` **è manuale**:
  entra come step di T23.
- **T13** — 🗑️ `ProgressDots` e `PillVoce`: **17 file** (§4), con **la guardia di regressione da
  ricollocare** e il **conteggio 22 → 20**.

### Blocco 6 — i passi
- **T14** — `PassoPaziente` rifatto: due caselle, i quattro testi (D20), **nessun `autoFocus`**.
  ⚠️ **Nessun `name` stabile esiste**: se i test devono agganciarsi a qualcosa di diverso dall'etichetta,
  **è T14 a doverlo introdurre**.
- **T15** — ricerca dentro «Cognome» (variante A) + stato «paziente ritrovato» + 🆕 **il modo esplicito di
  disfarlo** («Non è lei? Cerca un altro paziente»), che la spec §5 prescrive e il v1 non aveva raccolto.
  ⚠️ **I suggerimenti non devono far ballare «Continua»** (D9, mai raccolta dal v1).
- **T16** — i due scrittori (`crea-lavoro.ts:229-230`). 🛑 Invarianti: **mai `null`** · **mai** il codice
  fuori da `nome_cognome` senza ripiego (`precheck.ts:40-43` si ferma su `' '`).
- **T17** — passo foto: galleria multipla (riuso di `TabImmagini`: `multiple`, compressione **0,4 MB**,
  `TIPI_FOTO`) + ingranditore + **elimina con conferma** (D29). 🛑 Le foto restano in memoria fino alla
  creazione: **comprimere allo scatto**. ⚠️ Se la galleria mostra una **riga persistita** e non solo file
  in memoria, **serve la firma server-side** — o si dichiara che nell'ondata (b) mostra solo memoria.
- **T18** — 🚧 passo cassetta. **BLOCCATO da una decisione di prodotto** (§9.2).
- **T19 / T20** — 🚧 **GATE**: passo denti e passo colore. I mockup del 27/07 vanno riverificati in
  larghezza (D14).
- **T21** — la macchina completa: briciole toccabili · **avviso di perdita solo quando `cosaSiPerde`
  restituisce qualcosa** · rilascio del paziente al cambio di dentista — **dalla stessa funzione**, non da
  una regola a parte.
  🆕 **E il gesto indietro di SISTEMA al primo passo**: chiede la stessa conferma? (spec §3.2:136-138 lo
  rimandava «al piano», e il v1 non l'aveva raccolto).

### Blocco 7 — chiusura
- **T22** — FASE 7: `tsc --noEmit` · `vitest run` · `next build`. **Tutti e tre**, output reale.
- **T23** — FASE 9 (Playwright 390/768/1280 × chiaro/scuro) + **FASE 9b, GATE ESTETICO L2** +
  🆕 **`scripts/guardia-navigazione-overlay.mjs` lanciata a mano** (è manuale, e nessun piano l'aveva mai
  messa in un task).

---

## 7. Le prove da scrivere (R-P4 sulla FASE 6)

B1-B15 stanno nella spec §12. **Il panel ne ha smontate due e aggiunte otto.**

| # | rischio | prova |
|---|---|---|
| **B15** 🔴 | «Indietro» spara sulla home | ⚠️ **NASCE MORTA finché non si aggiusta il finto navigatore**: `WizardNuovoLavoro.test.tsx:10` crea `back: vi.fn()` **nuova a ogni chiamata**, quindi nessun test può asserirvi sopra. **Va sollevata in `vi.hoisted`, come `push`** |
| **B16** 🔴 | La testata taglia una briciola | ⚠️ **Non soddisfacibile con la CSS ratificata**, e la sonda gira su **6 nomi corti**. ➡️ l'elenco di prova si costruisce **dalle etichette vere** |
| **B17** | Premere il contatore rivela invece di togliere | **+ l'asserzione OPPOSTA**: dopo aver avanzato, la scelta nuova **è raggiungibile** |
| **B19** 🔧 | Una foto cancellata resta | **SOFT**: la riga sparisce da **tutte e otto le letture** (una asserzione per sito) · il file **resta** nello storage · controllo negativo: l'immagine di **un altro laboratorio** dà 404 · **fuori finestra → 409** |
| **B20** | La bozza `v:1` resta in eterno | `leggiStato` su `v:1` → `null` **e chiave rimossa**. ⚠️ **Il test esistente a `:63-66` si CAPOVOLGE** |
| 🆕 **B21** | L'indice non impedisce il doppione vero | `pz-0042` e ` PZ-0042` **DEVONO** essere rifiutati (P1-bis), col messaggio incollato · e il **controllo positivo** fra due laboratori |
| 🆕 **B22** | L'utente resta bloccato sul duplicato | Due creazioni con lo stesso codice → **409 di dominio**, e a schermo **l'avviso di §6.2**, non «Riprova» |
| 🆕 **B23** | Il wizard propone un codice già occupato | Inserito `pz-0043` a mano, `prossimoPz` **NON** restituisce `PZ-0043` (Z3) |
| 🆕 **B24** | La ricerca non trova i pazienti del wizard | Un paziente creato senza nome **non** compare col proprio codice nel campo cognome, **e** si trova cercando il cognome vero |
| 🆕 **B25** | `q` senza `cliente_id`, o con metacaratteri | `q` senza `cliente_id` → **422** · `q=%` → **non** restituisce l'anagrafica intera |
| 🆕 **B26** | Il ritorno al passo precedente | **oggi non ha NESSUNA copertura** (`WizardNuovoLavoro.tsx:226`): l'unico test sul back imbocca l'altro ramo |
| 🆕 **B27** | Un componente ucciso sopravvive | oltre al grep di B7: **il conteggio del catalogo è 20**, e la guardia di `ProgressDotsStanze` **è ancora viva da qualche parte** |

⚠️ **R-P4:** dopo il primo rosso, **abbozzo inerte** e si **CONTA** quante asserzioni si accendono (`N su M`),
**enumerando prima le forme d'input**.
📊 **Il punto di partenza è noto: 66 test nei quattro file — 11 si rompono di sicuro, 23 a rischio,
32 indipendenti, 35 con dati di prova che non compilano più.** ⚠️ **Vitest transpila senza controllo dei
tipi:** quei 35 **girano lo stesso** e falliscono come asserzioni.
🛑 **Tre test passano oggi per il motivo sbagliato** e vanno letti come buchi, non come copertura
(`WizardNuovoLavoro.test.tsx:272`, `:331`, `:338`).

---

## 8. Le trappole già pagate

🛑 **Mai un git worktree** · ⚠️ `.next` stantio → `/usr/bin/trash .next` · ⚠️ **backtick nel messaggio di
commit** → `-F` da file · ⚠️ `.gitignore` ignora `*.png` → `git add -f` · 🔑 `file://` bloccato per
Playwright → `python3 -m http.server 8899` · 🔑 `fileURLToPath`, mai `new URL(...).pathname` · 🔑 SQL:
`node scripts/tmp/sql.mjs` (**non è nel repo**) · 🛑 baseline **294 · 0 · 916 · 48** · 🆕
`git checkout -- <file>` cancella il lavoro non salvato · 🆕 **`\w` in JavaScript non contiene le lettere
accentate**.

**Dal 28/07, valgono nel codice React:** `text-overflow: ellipsis` **non funziona dentro un flex** ·
`justify-content: flex-end` su un contenitore che scorre rende **irraggiungibile** ciò che esce a sinistra ·
una fila che scorre **taglia sempre** → il modello a **pagine** è l'unico che non taglia · un flag «primo
giro» sbaglia, **la larghezza vera arriva dopo**.

🆕 **Dal panel del 29/07:** `schema.sql` **è uno snapshot fermo**, non la verità applicata · `pazienti` ha
**due colonne di sparizione che non concordano** · **`lavori_immagini.url` è morto**, la maniglia è
`storage_path` · **`lavori_immagini.tipo` è una colonna morta** che vale `'foto'` per ogni riga.

---

## 9. 🛑 Cosa manca a QUESTO piano

1. **Tre sonde:** **P2** da rieseguire immediatamente prima di T5 · **P3** riformulata sulla proiezione
   sempre-stretta · **P6-forma** (l'aggregato è esprimibile in PostgREST, o serve una RPC?).
2. 🔴 **DECISIONE DI PRODOTTO — quando nasce la cassetta creata dal wizard?** (bloccante B-2 + I-6)
   Oggi il lavoro nasce in **un punto solo, alla fine** (`WizardNuovoLavoro.tsx:362-364`, dichiarato «l'unico
   punto, nessuna scorciatoia lo bypassa»). Ma **D30 dice «ci va dentro subito»**, e `POST /api/cassette` è
   una **scrittura vera**. Chi crea una cassetta al passo 7 e poi preme ✕ lascia **una cassetta vuota sulla
   parete** — dopo aver letto, nel testo di conferma ratificato, «**nel gestionale non resta niente**».
   **Due uscite, e la scelta è di Francesco:**
   - **(a) — consigliata:** il wizard porta **l'intenzione**, l'effetto avviene **alla creazione del
     lavoro**. La parete resta pulita e il testo di conferma resta vero. *Costo:* la cassetta nuova va
     creata insieme al lavoro (una RPC, o due passi con compensazione), e cambia il contratto di
     `NuovaCassettaSheet`.
   - **(b)** si crea subito, e allora **cambia il testo della conferma** e il piano scrive **chi ripulisce**
     le cassette orfane e con quale gesto.
3. 🔴 **DECISIONE DI PRODOTTO — la stringa della briciola.** `labelTipo()` produce «Anti- russamento», e ~15
   etichette su 38 non ci stanno intere. **Troncare è vietato** (D22): serve la regola per il caso «una sola
   briciola che non ci sta».
4. **T19/T20 dietro gate:** mockup di denti e colore da riverificare in larghezza (D14).
5. **Il tetto delle foto** resta libero (D27): **da misurare su un device vero**, dentro T17. **Non blocca.**
6. **Da chiarire prima di T13:** la guardia **B7** («zero occorrenze») copre anche i **commenti** e i
   `docs/`? Se sì, i file passano da **17 a 21**+.

---

## 10. Come si esegue

`/superpowers:subagent-driven-development` — **un compito alla volta a un esecutore fresco** (R-E1),
revisione fra l'uno e l'altro, e nel brief **l'istruzione esplicita di cercare dove il piano sbaglia**.
L'esecutore di **T1** verifica per primo che marchi e registri **ci siano** (presenza, non verità) e, se
mancano, **si ferma e riferisce**.

🔑 **E una cosa che il panel ha insegnato, da mettere nel brief di ognuno:** *cercate soprattutto dove il
piano sembra sicuro*. I sei bloccanti sono usciti tutti da lì.
