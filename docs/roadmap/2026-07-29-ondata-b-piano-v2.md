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

> ⛔ **Questo piano non esce dalla FASE 4 finché §9 non è vuoto.** Al momento **non lo è**, ma **ciò che
> resta è agganciato a task precisi, non all'apertura**: **P2** (si riesegue lo stesso giorno di T5, per
> costruzione) · **la contraddizione B2 vs T6** (solo T6) · **i due gate di mockup** (solo T19/T20) · **la
> portata della guardia B7** (solo T13).
> ✅ **Chiuse il 29/07: P3 · P6-forma · le due decisioni di prodotto (D38 sul passo cassetta, D39 sulla
> briciola).** **Blocco 0 e Blocco 1 — T1, T2, T3, T4 — non sono bloccati da niente**: sola logica,
> nessuna schermata, nessuna banca dati.

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
   `POST /api/cassette`. ➡️ **T6 rende `cliente_id` obbligatorio quando c'è `q`** (🔧 **400**, non 422 —
   v. D46 e T6 punto 3: questa riga diceva 422 e **contraddiceva il proprio task**, rilievo dell'esecutore
   di T6), e il piano smette di chiamarlo isolamento: **`laboratorio_id` è l'isolamento, `cliente_id` è la
   portata**. ⚠️ E `cliente_id` obbligatorio è **presenza, non appartenenza**: il `POST` verifica che il
   cliente sia del laboratorio (`:86-96`), il `GET` no. Non è un buco — l'argine resta `laboratorio_id` —
   ma non si scriva «isolamento» dove c'è «portata».
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
| **P3** | La proiezione ridotta non rompe il chiamante | ✅ **CHIUSA, 30/07.** ⚠️ **Le righe del v1 sono derivate:** oggi il `fetch` è a **`crea-lavoro.ts:250`**, la lettura a `:254`, il confronto a `:255` (erano `:209`/`:213`/`:214` il 28/07 — spostate da Z1 e D37; **la stessa deriva è nella spec `:216` e in D36**). **Un solo chiamante di produzione**, e le ricerche per escludere quelli indiretti sono incollate nel rapporto: `useSWR\|useQuery` → **0** · costanti di endpoint → **0** · e il service worker **non intercetta `/api/`** (`public/sw.js:26`). 🔑 **Il chiamante dichiara da sé cosa gli serve:** `type PazienteRiga = { id: string; codice_paziente: string \| null }` (`:159`) — **dei 12 campi della proiezione grassa, 10 non hanno lettori**. ➡️ **Proiezione stretta minima: `id, codice_paziente, cognome, nome`** (+ l'innesto di P6). Le 8 colonne tolte portano ognuna la sua destinazione: `laboratorio_id`/`cliente_id`/`archiviato` restano **filtri** (`.eq()` non richiede la colonna in `select`), gli altri cinque — `nome_cognome`, `data_nascita`, `codice_fiscale`, `sesso`, `note` — **non hanno alcun lettore**. ✅ **`cognomeEffettivo` ha tutti gli ingredienti:** firma `(cognome, codice)` (`nome-paziente-scrittura.ts:82-85`), **entrambi dentro la proiezione stretta** |
| **P4** | `leggiStato` scarta `v:1` **e rimuove la chiave** | ✅ **CONFERMATO DIFETTO:** `persistenza.ts:69` è un `return` secco; solo il ramo scadenza chiama `azzeraStato()` (`:71-73`). E `wizard-persistenza.test.ts:63-66` **non asserisce la rimozione** |
| **P5** | Cancellare una riga toglie anche il file | 🔴 **RIFORMULATA:** la domanda giusta non è quella. **Il `DELETE` è SOFT** (D34/panel) → non si tocca lo storage. La prova diventa: **la riga soft-cancellata sparisce da tutte e otto le letture** |
| **P6-forma** | La lettura «ultimo lavoro» in una sola andata | ✅ **CHIUSA, 30/07: SI ESPRIME IN PostgREST. NIENTE RPC.** 🛑 **E la domanda del v1 era posta sull'oggetto sbagliato, al punto da portare alla conclusione OPPOSTA:** l'**aggregato** (`data_ingresso.max()` + `group by`) **non è esprimibile** — `provato:` → `HTTP 400 · PGRST123 "Use of aggregate functions is not allowed"` (che è un'**impostazione del progetto**, non un limite di versione). Chi avesse sondato solo quello avrebbe scritto «serve una RPC»: **falso**. Quel che funziona è una **forma diversa** — l'**innesto con `order` + `limit` per padre**: `provato:` `select=id,codice_paziente,cognome,nome,lavori(data_ingresso)` + `lavori.order=data_ingresso.desc` + `lavori.limit=1` + `lavori.deleted_at=is.null` → **HTTP 200, quattro padri con quattro figli DISTINTI** — cioè **il limite è PER PADRE, non globale** (falsificatore scelto apposta). Sei controlli, fra cui: senza `limit` ne vede davvero **2** (quindi il taglio taglia) · l'`order` innestato è **onorato** · un paziente **senza** lavori compare con `"lavori": []` · il filtro `deleted_at` è **applicato** (provato invertendo il predicato) · 🛑 **controllo negativo: `!inner` restituisce `[]`** — l'innesto va lasciato **semplice**, `!inner` cancellerebbe i pazienti senza lavori. ✅ **Provata anche con `q` addosso** (`.or(ilike)` + innesto insieme): **200**. 🔑 **Grafia per supabase-js 2.105.4: `referencedTable`**, non `foreignTable` (deprecata, ancora accettata) — provata a runtime **e** sotto `tsc --noEmit` (EXIT=0). 🔑 **La colonna è `lavori.data_ingresso`** (NOT NULL, non cambia mai): `updated_at` è **scartata** perché ogni correzione la alza, e un lavoro vecchio corretto ieri risulterebbe il più recente — la spec `:221-222` lasciava aperte le due, **si chiude qui**. ✅ **T6 punto 5 verificato vero**, verbatim: `CREATE INDEX idx_lavori_paziente ON public.lavori USING btree (paziente_id) WHERE (deleted_at IS NULL)` |
| 🆕 **P6-precedente** | «in `src/` non c'è nessun precedente» | ⚠️ **Vera come scritta, fuorviante come si legge.** In `src/` è esatto (`referencedTable\|foreignTable` → **0**; i tre `.limit(1)` sono letture scalari di primo livello). **Ma nel database il precedente C'È:** la vista **`partitario_clienti`** fa *esattamente* quella forma — `max(f.data) AS ultima_fattura` + `LEFT JOIN fatture … AND f.deleted_at IS NULL` + `GROUP BY c.id`. 🔑 **È il motivo per cui R-P2 prescrive il catalogo vivo e non il grep sui file:** 104 funzioni, 7 viste, e la risposta stava lì |
| **P7** | Il drift `bite_splint` esiste | ✅ **ESEGUITA, 29/07: IL DRIFT NON ESISTE.** `provato: select pg_get_constraintdef(...) where conname='lavori_tipo_dispositivo_check'` → la CHECK **contiene `bite_splint`**, 10 valori. Nota falsa **rimossa** da `tipi-lavoro.ts` |
| **P8** | Si può ricalcare il pattern `ON CONFLICT` della parete cassette | ✅ **PROVATA FALSA, 29/07.** La parete **elimina** il pre-check con `ON CONFLICT (espressione)` dentro una **RPC**; `pazienti` scrive via supabase-js e **l'`onConflict` di PostgREST accetta solo nomi di colonna**. ➡️ `pazienti` ricade sotto il precedente della **partita IVA**, da cui **due requisiti duri**: predicato dell'indice = predicato del pre-check **alla lettera**, e `23505` **obbligatoriamente** mappato |
| **P9** | Rinominare la chiave di `localStorage` è innocuo | ✅ **PROVATA FALSA, 29/07.** Tutti i test leggono `CHIAVE_WIZARD` **dalla costante**: rinominandola **nessun test se ne accorge**, le bozze `v:1` restano orfane **per sempre**, e ogni `expect(getItem(...)).toBeNull()` passa **a vuoto**. ➡️ **il nome resta, e T9 rimuove esplicitamente** |
| 🆕 **P10** | Il generatore e l'indice guardano la stessa popolazione | ✅ **PROVATA FALSA** (due advisor + sonda): il generatore filtra `deleted_at`, la lettura filtra `archiviato`, l'indice **nessuno dei due**; e il generatore è **case-sensitive** su `.like` e sulla regex. ➡️ **Z3** |

### 🆕 P11 — l'escape del termine di ricerca (D48). ✅ **PROVATA, 29/07**

⚠️ **La sonda vive in `scripts/tmp/`, che è IGNORATO da git** (`.gitignore:124`): scaduta la sessione,
sparisce. Si incolla qui — è il rilievo che la review di T5 ha fatto, e non si ripete.
🛑 Sola lettura, **solo conteggi**: mai una riga stampata, sono dati Art. 9.

```js
// le due funzioni sotto prova (pgrestQuote è già in src/lib/utils/escape-postgrest.ts)
const pgrestQuote   = (v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
const ilikeLiterale = (v) => v.replace(/\*/g, '').replace(/([\\%_])/g, '\\$1')

const conta = async (filtro) => (await svc.from('pazienti')
  .select('id', { count: 'exact', head: true })
  .eq('laboratorio_id', LAB).or(filtro)).count
```

| `q` | solo `pgrestQuote` | `ilikeLiterale` + `pgrestQuote` |
|---|---|---|
| `%` | **911** ❌ (su 911) | **0** ✅ |
| `_` | **911** ❌ | **0** ✅ |
| `*` | **911** ❌ | **911** ❌ 🔑 **ed è il punto:** `*` non è escapabile, si rimuove, e la rimozione lascia `''` → pattern `%%`. **La guardia sul vuoto è obbligatoria** |
| `a%b` | 0 | 0 |
| `rossi, mario` | 0, **nessun 400** (senza virgolette darebbe `PGRST100`) | 0 |

**Controllo negativo di tenant, in ATTACCO** (lab A ha **1** paziente, lab B ne ha **911**: un'evasione si
vedrebbe): `.eq('laboratorio_id', A).or('laboratorio_id.eq.<B>,codice_paziente.ilike.%zzz%')` — valore
**nudo**, nessun escape → **0 righe**. Regge **per struttura**, non per fortuna: `postgrest-js` mette il
gruppo `or` in un **parametro separato** (`node_modules/@supabase/postgrest-js/dist/index.cjs:2988-2990`,
`searchParams.append`), che PostgREST unisce agli `.eq()` con un **AND** e parentesizza per conto suo.

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
  2. ✅ **RISOLTO DA D44 — e non come diceva questa riga.** Il payload porta **`alias: string | null`** da
     **`derivaAlias`** (`src/lib/cassette/parco-shared.ts:69`), **non** `cognomeEffettivo` — che è
     l'attrezzo di **scrittura** e sulle 911 righe senza nome restituisce `''`, cioè **una terza
     convenzione per «nessun nome»**. **B2 è emendata a QUATTRO chiavi:** `id, codice_paziente, alias,
     ultimoLavoro`. 🛑 **Il motivo scritto qui — «mostrerebbe il codice due volte» — vale ZERO righe**
     (`cognome == codice`: nessuna); il problema vero è che **911 schede su 916 non hanno alcun nome**.
  3. 🔧 **`cliente_id` obbligatorio quando c'è `q` — e il ramo si sceglie su `q !== null`, MAI su
     `if (q)`** (D46). È la **portata** D11, e oggi è dentro un `if`. 🛑 **Il motivo per cui la grafia
     conta più di quanto sembri:** `searchParams.get('q')` restituisce `''` per `?q=`, e `''` è **falso** —
     con `if (q)` una casella di ricerca **svuotata** cade nel ramo legacy, dove `cliente_id` non serve e
     il tetto è 500. Il vincolo di portata si aggirerebbe **togliendo un carattere**. E il **tetto va fuori
     dal ramo**, non dentro (precedente: `fasi-produzione/ricerca/route.ts:32`, che degrada in sicurezza
     proprio perché il suo `.limit(8)` sta fuori).
     ⚠️ **Il codice è 400, non 422** (D46): il precedente in casa per un **parametro di query** mancante è
     `impostazioni/pec/verify-status/route.ts:11` (400); tutti i 422 trovati sono semantica di **corpo**
     (`api/pazienti/route.ts:82`, `impostazioni/preferenze/route.ts:50`), e una GET non ha corpo. Col suo
     `motivo` leggibile a macchina, mai una frase (`route.ts:208-213`).
     ⚠️ E `cliente_id` obbligatorio è **presenza, non appartenenza**: il POST verifica che il cliente sia
     del laboratorio (`:86-96`), il GET no. L'isolamento regge lo stesso (è `laboratorio_id`), ma non si
     scriva «isolamento» dove c'è «portata». Un `cliente_id` non-UUID non prende il 400: va al confronto
     uuid, PostgREST dà `22P02` e si cade nel 500 generico di `:45-50`.
  4. 🔧 **L'escape ha QUATTRO metacaratteri, non due, e un ORDINE — v. D48.** Il piano ne nominava due.
     `(1)` **`*` si RIMUOVE** (PostgREST lo traduce in `%` sul valore già spogliato dagli apici: non è
     neutralizzabile) e **`\ % _` si escapano in una sola passata**; `(2)` **guardia sul vuoto DOPO
     l'escape** — senza, `q='*'` collassa a `''` e il pattern `%%` restituisce l'anagrafica intera;
     `(3)` cornice `%…%` e **`pgrestQuote` per ULTIMO** (`lib/utils/escape-postgrest.ts`, precedente
     `api/clienti/route.ts:39-40`), perché è lui che raddoppia le barre di cui il parser di PostgREST ne
     mangia una. Invertendo l'ordine **si cerca un'altra stringa**.
     🛑 **La «lunghezza minima» è STATA TOLTA da D44: non difende nulla, ed è misurato.** **912 codici su
     916** condividono lo stelo `PAZ/2026/`, quindi `%PAZ/2026/0%` — **dieci caratteri** — restituisce
     **911 righe**. La difesa è un **tetto duro sulle righe** (~10 dalla rotta, **5** mostrati a schermo),
     non sui caratteri digitati. ⚠️ **E resta tolta anche dopo la misura di prestazione** che la
     riproporrebbe: quella nasce solo col trigram, ed è **voce di roadmap** (v. §6-bis).
  4-bis. 🔧 **Il filtro si DICHIARA, ed è a QUATTRO colonne: `codice_paziente | nome_cognome | cognome |
     nome`** (D47, che **emenda** D44 su questo punto). 🔴 **L'esclusione di `nome_cognome` poggiava su
     un'aritmetica void:** su quelle 911 righe `nome_cognome` **è** `codice_paziente` carattere per
     carattere, quindi non aggiunge **nessuna** riga che l'altra colonna non porti già (`provato:` 0 su
     `paz`, `2026`, `101`) — mentre la sua assenza rompe il caso più naturale, cercare il nome **come lo si
     legge**: `q='bagheria giuseppe'` → **0** senza, **1** con. Restano anche `cognome` e `nome` perché il
     soprainsieme **non è garantito**: il trigger ricompone solo se **entrambi** sono non-null
     (`002_fase2_schema.sql:124`). `nome` entra anche perché `risolviNomePaziente:67` mette **nel cognome**
     il valore quando la casella piena è una sola.
  4-ter. ✅ **SCIOLTO PRIMA DI T6, da D46 — non dentro.** **Forma UNICA su entrambi i percorsi:**
     `id, codice_paziente, alias, ultimoLavoro`, `ultimoLavoro` **sempre calcolato** e `null` quando il
     paziente non ha lavori (mai chiave omessa: un `null` che significhi anche «non calcolato» mente).
     **B2 vale su entrambi i percorsi.** Motivo misurato: l'innesto sul percorso senza `q` costa **+911
     buffer, +1,6 ms**, una volta per creazione di lavoro — e in casa non c'è **un solo** precedente di
     risposta che cambia forma col parametro.
  5. **Data dell'ultimo lavoro in una sola andata** — **dopo P6-forma**, e con `deleted_at IS NULL` sui
     lavori (l'ultimo lavoro non può essere uno cancellato, e l'indice esistente è parziale su quel
     predicato). 🛑 **`order` + `limit(1, { referencedTable: 'lavori' })` sono OBBLIGATORI, e non per
     eleganza:** senza il limite per padre ogni riga porta **tutte** le date d'ingresso — non è
     `ultimoLavoro`, è la **cronologia delle prestazioni**, dieci pazienti per richiesta, Art. 9.
  6. 🆕 **`archiviato = false` si dichiara su ENTRAMBI i percorsi** (oggi è a `:34`, incondizionato:
     resta lì). 🛑 **E si scrive in T6 che questa rotta NON risponde a «chi occupa il codice»** — quella è
     `trovaOccupanteCodice` (T7), deliberatamente **cieca allo stato** e larga su **tutto** il laboratorio.
     Senza questa riga T15 userebbe la ricerca come riconoscimento e riaprirebbe il buco che T7 chiude.
  7. 🆕 **Ritardo di 250 ms sulla battitura** (lato T15, dichiarato qui perché nasce da una misura fatta
     su questa rotta): il giro di rete è ~80 ms e SQL ne è il **2-5%** — digitare `PAZ/2026/0101` sono
     **13 giri**. A 250 ms collassano a 1-3.
  8. 🆕 **I test asseriscono anche sul PREDICATO COSTRUITO, non solo sulle chiavi in uscita** (D48). Le
     chiavi le guarda già B2; il predicato non lo guarda nessuno, ed è il **secondo canale** verso le
     colonne che la proiezione ha appena tolto.
  9. 🆕 **L'ordinamento porta un TERZO criterio, `id`, e il motivo non è l'eleganza.** Oggi la rotta ordina
     per `cognome, nome` (`route.ts:35-36`), e **911 righe su 916 li hanno entrambi `NULL`**: in ASC i
     `NULL` vanno in fondo, quindi con un `q` largo le 10 righe rese sono le poche con un nome **più un
     resto arbitrario**, e *quale* resto **non è deterministico fra due chiamate**. In un pannello di
     suggerimenti che si ridisegna a ogni tasto è un difetto visibile, non una nota di prestazione.
     ➡️ **`cognome, nome, id`**, e `id` è anche l'unica colonna della tabella che un indice serve davvero.
     🛑 **Il tetto e la chiave di ordinamento si decidono INSIEME:** un tetto duro senza un ordine totale
     non è un tetto, è un campione.
  10. 🆕 **La proiezione SQL e le chiavi in uscita sono due cose diverse, e vanno lette come tali.**
     SQL: `id, codice_paziente, nome_cognome, lavori(data_ingresso)`. In uscita: `id, codice_paziente,
     alias, ultimoLavoro`. **`nome_cognome` si SELEZIONA come ingresso di `derivaAlias` e non esce mai** —
     non è una violazione di B2 (che parla della risposta) né di D47 (che parla del **filtro**).
- **T7** — 🆕 **la lettura di unicità del codice** (nuova, e il v1 non ce l'aveva).
  Rispecchia il predicato di T5 **alla lettera**: `laboratorio_id` + `lower(btrim(codice))`, **senza
  `cliente_id`** e **senza limite**. Motivo: il pre-check di oggi guarda **un solo dentista**
  (`crea-lavoro.ts:250` — ⚠️ **non `:209`**, coordinata stantia riverificata il 29/07) mentre l'indice
  guarda **tutto il laboratorio** → direbbe «libero» su un codice occupato. 🛑 **La cura è cambiare la LETTURA, non aggiungere `cliente_id` alla chiave** — quello
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
     ✅ **DECISA — D39: nome corto dedicato**, scritto accanto al tipo; niente tagli, niente puntini, una
     riga sola. ⚠️ **`labelTipo()` per `anti_russamento` restituisce «Anti- russamento»**
     (`src/lib/domain/tipi-lavoro.ts:86-88`, **non `:74-76`**): la stringa della briciola si scrive, non si
     eredita. 📏 **Le etichette oltre 17 caratteri sono NOVE, non ~15** (misurate sul file): la soglia vera
     è in pixel e si misura **qui, in T11** — i nomi brevi si scelgono dopo la misura, in una passata sola
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
  ⚠️ **I suggerimenti non devono far ballare «Continua»** (D9, mai raccolta dal v1): pannello **sovrapposto**
  ad altezza fissa, mai in flusso.
  🆕 **D45 — quando non si trova nulla, LO SI DICE.** Uno stato «nessun risultato» esplicito: la
  raccomandazione contraria («non trovato è la normalità, non segnalarlo») valeva **solo per l'archivio di
  prova** ed è stata ritirata.
  🆕 **Un paziente senza nome è un caso legittimo, non un errore** (Art. 21(2) MDR: nome, acronimo **o
  codice**): la riga di suggerimento deve **dirlo**, non fingere un nome. `alias` vale `null` proprio lì.
  🆕 **Tetto: ~10 righe dalla rotta, 5 mostrate** (D44). E si cerca su **cognome, nome e codice**.
- **T16** — i due scrittori (`crea-lavoro.ts:270-271` — ⚠️ **non `:229-230`**, coordinata stantia
  riverificata il 29/07: `nome: ''` a `:270`, `cognome: alias || pz` a `:271`). 🛑 Invarianti: **mai
  `null`** · **mai** il codice fuori da `nome_cognome` senza ripiego (`precheck.ts:40-43` si ferma su
  `' '`). ⚠️ **E T16 riscrive il chiamante che regge tutta l'architettura di D46:** `PazienteRiga`
  (`:159`) dichiara **due sole chiavi** — è lui a rendere sicura la proiezione stretta.
  🆕 **Esiste una TERZA forma di «nessun nome» che nessun documento nominava: `nome = ''`** (R18).
  Delle 5 righe con `nome` non-null, **3 sono stringhe vuote** e solo **2** portano un nome vero;
  `cognome = ''` è invece **zero**. 🔑 **È il codice, non i dati** (regola di D45): `:270` scrive
  `nome: ''` **fisso**, quindi la forma si riprodurrà identica con un laboratorio vero. Chi conta «due
  forme, `NULL` o nome» sbaglia di una.
- **T17** — passo foto: galleria multipla (riuso di `TabImmagini`: `multiple`, compressione **0,4 MB**,
  `TIPI_FOTO`) + ingranditore + **elimina con conferma** (D29). 🛑 Le foto restano in memoria fino alla
  creazione: **comprimere allo scatto**. ⚠️ Se la galleria mostra una **riga persistita** e non solo file
  in memoria, **serve la firma server-side** — o si dichiara che nell'ondata (b) mostra solo memoria.
- **T18** — passo cassetta. ✅ **SBLOCCATO da D38:** il wizard porta **l'intenzione**, la cassetta nuova
  nasce **insieme al lavoro** nell'unico punto di creazione (`WizardNuovoLavoro.tsx:363-371`), e
  `POST /api/cassette` **non si chiama durante il percorso**. 🔑 **T18 decide la FORMA dell'atomicità**
  (RPC unica, o due passi con compensazione), ricalcando il precedente in casa `crea_rifacimento_atomico`
  — «MAI 3 INSERT separati». ⚠️ **Cambia il contratto di `NuovaCassettaSheet`**, oggi costruito su
  `onCreata` → assegnazione immediata.
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

## 6-bis. 🚧 Uscito dal panel D46-D48 e **fuori** dall'ondata (b) — con la sua destinazione

Il panel del 29/07 ha misurato più di quanto T6 possa consumare. Quello che **non** entra nell'ondata (b),
scritto qui perché un ritrovamento senza destinazione è un ritrovamento perso:

| cosa | il numero che lo innesca | dove va |
|---|---|---|
| **Indice `(laboratorio_id, cognome, nome)` su `pazienti`** — oggi **nessun** indice serve l'ordinamento, e l'`ORDER BY` esterno costringe l'innesto a girare **911 volte** per restituirne 10 | 916 righe → **4,6 ms** (5% del giro) · 10.021 → **54 ms** (64%) · 20.042 → **109 ms**. 🔑 **Soglia: ~10.000 pazienti per laboratorio.** Con l'ordine su colonna indicizzata il LATERAL gira **10 volte**: 0,242 ms | roadmap |
| **Indice trigram** (`pg_trgm 1.6` è **già installato**) — `%…%` non usa mai un btree | 916 righe = 1,26 ms · **50.105 righe = 83,7 ms**. Problema oltre le **~20.000** righe per laboratorio | roadmap, **stessa voce** |
| **Lunghezza minima di 3 caratteri** | ⚠️ **NON serve oggi** e **non riapre D44**: a 916 righe la differenza fra ricerca larga e stretta è **7,6 ms su ~80** (9%). Nasce solo **col** trigram, perché `gin_trgm_ops` non estrae alcun trigramma sotto i 3 caratteri. È un argomento di **prestazione**, non di riservatezza — D44 l'aveva chiusa su altre basi e resta chiusa | roadmap, **stessa voce** |
| **Freno di frequenza sulle rotte autenticate** — oggi **zero** | — | roadmap, **insieme** alla portata del percorso senza `q`: sono la stessa domanda |
| **`deleted_at` nelle letture di `pazienti`** (R13) · **`portale_token` nella proiezione clienti** (R11 🔴) · **il trigger `nome_cognome` che può restare stantio** (R16) | v. verbale §6 | roadmap · R11 è **decisione di Francesco** |

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
| 🆕 **B25** 🔧 | `q` senza `cliente_id`, o con metacaratteri | 🔧 **RISCRITTA da D46/D48, e ogni riga è un valore che DEVE essere rifiutato:** `q` senza `cliente_id` → **400** (non 422) · **`?q=` VUOTO** → **400 anch'esso**, non il ramo legacy (è la prova che il ramo si sceglie su `q !== null`) · `q=%` e `q=_` → **non** l'anagrafica intera (`provato:` col solo `pgrestQuote` danno **911 su 911**) · 🆕 **`q=*` → nemmeno**, ed è il caso che si perde per primo: `*` sopravvive alle virgolette, e **rimuoverlo senza guardia sul vuoto** lascia il pattern `%%` (`provato:` restituisce tutto) · 🆕 **controllo negativo di tenant, in ATTACCO:** un `q` che tenta `laboratorio_id.eq.<altro lab>` dentro il gruppo `.or()` → **0 righe** |
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

1. ✅ **CHIUSO — tutte e tre.** **P3** e **P6-forma** chiuse il 30/07; **P2** era l'ultima e **resta
   assolta**: è stata rieseguita nello stesso turno di T5 (D43 — 0 duplicati grezzi, 0 normalizzati) e
   **T5 è in produzione**. Non c'è più nulla da rieseguire prima di un task. 🆕 **P11** (l'escape di D48)
   si aggiunge a §5, già provata.
1-bis. ✅ **CHIUSO IL 29/07 — prima da D44, poi da D46.** Il bloccante («due documenti ratificati si
   contraddicono su T6») è stato sciolto in due tempi: **D44** ha tolto `cognomeEffettivo` dalla
   proiezione e portato B2 a **quattro** chiavi con `alias`; **D46** ha risposto alla metà che restava —
   *su quale percorso vale B2* — e la risposta è **entrambi**: forma **unica**, `id, codice_paziente,
   alias, ultimoLavoro`, con o senza `q`. 🔑 **Il motivo per cui non si è scelta la strada «due forme»**
   (che sarebbe stata la mia): in casa **non esiste un solo precedente** di una risposta che cambia forma
   col parametro — `api/clienti/route.ts:28-30,38-40` e `api/fasi-produzione/ricerca/route.ts:34-36`
   applicano `q` come **solo filtro**. E l'innesto «ultimo lavoro» sul percorso senza `q` è stato
   **misurato**: +911 buffer e **+1,6 ms**, una volta per creazione di lavoro — troppo poco per comprarci
   una spaccatura di contratto.
1-ter. ✅ **CHIUSO da D47.** «T6 deve DICHIARARE su quali colonne filtra» → **quattro**:
   `codice_paziente, nome_cognome, cognome, nome`. 🔴 **E l'aritmetica di questa riga era void:** «una
   ricerca che tocchi `nome_cognome` restituirebbe 911 righe indistinguibili» è **falso**, perché su
   quelle 911 righe `nome_cognome` **è** `codice_paziente` carattere per carattere — le stesse righe
   arrivano già dall'altra colonna, e il di più è **zero** (`provato:` `paz` 0 · `2026` 0 · `101` 0).
   Escluderlo rompeva invece il caso più naturale: `q = 'bagheria giuseppe'` — il nome **come lo si legge
   a schermo** — dà **0 righe** senza `nome_cognome` e **1** con.
2. ✅ **CHIUSA — D38, ratificata da Francesco.** *Quando nasce la cassetta creata dal wizard?* → **uscita
   (a): alla fine, insieme al lavoro.** Il wizard porta **l'intenzione**, la scrittura avviene nell'unico
   punto in cui nasce il lavoro (`WizardNuovoLavoro.tsx:363-371` — ⚠️ **non `:362-364`**, coordinate
   derivate: riverificate il 29/07). `POST /api/cassette` **non si chiama durante il percorso**; cassetta e
   lavoro nascono **insieme** (RPC atomica o compensazione — **forma da decidere dentro T18**); cambia il
   contratto di `NuovaCassettaSheet`. **D30 resta intatta**: decideva il gesto al banco, non il momento
   della scrittura. ➡️ **T18 è sbloccato.**
3. ✅ **CHIUSA — D39, ratificata da Francesco.** *La stringa della briciola?* → **nome corto dedicato**,
   scritto a mano accanto al tipo in `src/lib/domain/tipi-lavoro.ts`; la scia **non eredita `labelTipo()`**.
   🔴 **E il numero di questo piano era sbagliato:** «~15 etichette su 38» → **misurate, sono NOVE**, e
   **`Duplicato protesi` non è fra quelle** (17 caratteri esatti). ⚠️ La soglia dei 17 caratteri resta una
   **stima**: la misura in pixel si fa **dentro T11**, e i nomi brevi si scelgono sull'esito della misura,
   in **una passata sola** con Francesco. 🔑 `labelTipo()` è a **`:86-88`**, non `:74-76`.
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
