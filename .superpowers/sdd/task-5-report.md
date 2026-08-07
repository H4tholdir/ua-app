# Task 5 — Referto · «Migration piccola: M-T3-1 + clone P37 (D221)»

**Ramo:** `ondata-b-sessione-3` (nessun worktree) · **Data:** 04/08/2026 (orologio: `date` → `Tue Aug 4 21:12:56 CEST 2026`)
**Esito:** 🟢 completo — migration applicata al DB vivo, collaudo verde, FASE 6b compiuta, spia aggiornata.

---

## 1. La migration

`supabase/migrations/20260804211256_ondata_b3_dizionario_divergenza_clone_p37.sql`

Timestamp preso dall'**orologio** (`date +%Y%m%d%H%M%S` → `20260804211256`), mai dedotto dal file
precedente (§0F).

Due `CREATE OR REPLACE` a **stessa firma**. Prima di scrivere, il **catalogo vivo** (non il grep sui
file, R-P3) ha confermato che le firme non cambiano e che oggi esiste **una sola** definizione per
nome — quindi `OR REPLACE` sostituisce, non crea un overload (la lezione della sonda S10 della ②):

```
lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid) | proconfig: ["search_path=public, pg_temp"] | acl: {postgres=X/postgres,service_role=X/postgres}
crea_rifacimento_atomico(uuid,text,text,numeric,text)                  | proconfig: ["search_path=public, pg_temp"] | acl: {postgres=X/postgres,service_role=X/postgres}
```

Il corpo vivo (`pg_get_functiondef`) è risultato **identico** al testo di `20260804152403`: quel file
era davvero il vigente, e da lì i corpi sono stati copiati.

### 1.1 La prova che il diff è SOLO quello dichiarato

Diff meccanico dei due corpi, vigente → nuovo (non «a occhio»):

```
=== DIFF registra_divergenza (vigente -> nuovo) ===
1c1
< CREATE FUNCTION public.lavoro_prescrizione_registra_divergenza(
---
> CREATE OR REPLACE FUNCTION public.lavoro_prescrizione_registra_divergenza(
34a35,43
>   -- ⬇️ AGGIUNTA B③ — M-T3-1: il dizionario del campo, chiuso anche in banca
>   --    dati. [...]
>   IF p_campo IS NULL OR p_campo NOT IN ('elementi','colore','tipo') THEN
>     RETURN json_build_object('esito', 'campo_non_valido');
>   END IF;
>
=== DIFF crea_rifacimento_atomico (vigente -> nuovo) ===
38a39,41
>     -- ⬇️ AGGIUNTA B③ — D221/P37: le DUE caselle del prescrittore
>     --    dell'Allegato XIII punto 1. Mancavano ENTRAMBE.
>     richiedente_nome, istituzione_sanitaria,
55a59
>     v_lavoro.richiedente_nome, v_lavoro.istituzione_sanitaria,
```

**Ogni altra riga è byte-identica.** `tipo` resta nel dizionario della divergenza (D213: una
divergenza sul tipo sopravvive alla conferma); lock senza tenant, tenant come parametro e contratto
degli esiti di `crea_rifacimento_atomico` **non sono stati toccati** — sono della riga 12 della roadmap.

**Ordine delle guardie: `campo` PRIMA di `motivo`.** Scelto per combaciare con la route (che valida
il campo per primo) e **provato**, non dedotto: caso S3-f del collaudo. Il perché sta nel commento
della funzione e nel `COMMENT ON FUNCTION`.

### 1.2 Applicazione al DB vivo

`npx supabase migration list --linked` → una sola migration pendente (`20260804211256`, remote vuoto).

```
Applying migration 20260804211256_ondata_b3_dizionario_divergenza_clone_p37.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260804211256_ondata_b3_dizionario_divergenza_clone_p37.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

Nessun problema di permessi: non è stato necessario passare il comando al controllore.

---

## 2. Collaudo R-P1 — output REALE

Sonda usa-e-getta: `scripts/tmp/collaudo-t5-r-p1.mjs` (cartella gitignorata). Tutto dentro **una
transazione chiusa da ROLLBACK**: nessuna migration registrata, il DB resta com'era.

```
ℹ️  crea_rifacimento_atomico(uuid,text,text,numeric,text)
     secdef=true proconfig={"search_path=public, pg_temp"} acl={postgres=X/postgres,service_role=X/postgres}
ℹ️  lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid)
     secdef=true proconfig={"search_path=public, pg_temp"} acl={postgres=X/postgres,service_role=X/postgres}
✅ S0 nessun overload: 2 funzioni per 2 nomi
✅ S0 proconfig crea_rifacimento_atomico: {"search_path=public, pg_temp"}
✅ S0 acl crea_rifacimento_atomico: {postgres=X/postgres,service_role=X/postgres}
✅ S0 proconfig lavoro_prescrizione_registra_divergenza: {"search_path=public, pg_temp"}
✅ S0 acl lavoro_prescrizione_registra_divergenza: {postgres=X/postgres,service_role=X/postgres}

ℹ️  conteggi PRIMA: {"lavori":"295","rifacimenti":"2","prescrizioni":"0","denti":"3","progressivi":"71"}

ℹ️  banco: lavoro b829afc9-8e3e-410f-87ca-bed6ad688868 — allega_fonte → {"esito":"ok"}
✅ S3-a campo='pippo' + motivo valido: esito 'campo_non_valido' (atteso 'campo_non_valido')
✅ S3-b campo=NULL + motivo valido: esito 'campo_non_valido' (atteso 'campo_non_valido')
✅ S3-c campo='colore' + motivo valido: esito 'ok' (atteso 'ok')
     └─ divergenze nel registro: 1
✅ S3-d campo='tipo' (resta lecito) : esito 'ok' (atteso 'ok')
     └─ divergenze nel registro: 2
✅ S3-e campo valido + motivo='perche_si': esito 'motivo_non_valido' (atteso 'motivo_non_valido')
✅ S3-f campo E motivo sbagliati: esito 'campo_non_valido' (atteso 'campo_non_valido')
✅ S3-g lavoro senza prescrizione, campo='pippo': esito 'senza_prescrizione' (atteso 'senza_prescrizione')

ℹ️  banco clone: originale 7d5343a8-3364-4dd2-992f-c0510e8ea026 (stato pronto)
     richiedente_nome      = Dott.ssa Giuseppina Còlombo — collaudo T5
     istituzione_sanitaria = Casa di Cura Sant Antonio, Nocera Inferiore — collaudo T5
ℹ️  crea_rifacimento_atomico → {"lavoro_nuovo_id":"af8df11c-20bf-4cf6-a34f-d21becda1623","numero_lavoro":"2026/0012"}
✅ P37-a richiedente_nome clonato: «Dott.ssa Giuseppina Còlombo — collaudo T5»
✅ P37-b istituzione_sanitaria clonata: «Casa di Cura Sant Antonio, Nocera Inferiore — collaudo T5»
     └─ lavoro nuovo 2026/0012, is_rifacimento=true, stato=ricevuto
✅ P37-c originale senza prescrittore: rifacimento con entrambi NULL (nessun default sorpresa)

🔎 P37-d stringa vuota sull'originale → rifacimento: richiedente_nome="" istituzione_sanitaria=""
     ⚠️  la stringa vuota VIAGGIA (nessun NULLIF): la trappola P37 ora si eredita — R-E2, riferita non corretta

ℹ️  conteggi DENTRO la transazione (prima del ROLLBACK): {"lavori":"298","rifacimenti":"5","prescrizioni":"1","denti":"12","progressivi":"74"}
ℹ️  conteggi DOPO il ROLLBACK: {"lavori":"295","rifacimenti":"2","prescrizioni":"0","denti":"3","progressivi":"71"}
✅ ROLLBACK: DB invariato — tutti e 5 i conteggi identici

🟢 COLLAUDO T5 VERDE
```

**S3-a e S3-b sono il cuore:** prima di questa migration la sonda S3 della ③ aveva misurato che
`'pippo'` e `NULL` rispondevano **`ok`**. Ora sono rifiutati.

### 2.1 Due trappole del collaudo, trovate e chiuse

- **`senza_prescrizione` morde PRIMA della guardia del campo.** Su un lavoro senza riga di
  `lavori_prescrizioni`, `campo='pippo'` risponde `senza_prescrizione` — che *sembra* un rosso ma è
  la guardia sbagliata. Il banco crea la riga con `allega_fonte` prima di provare il campo, e il
  caso S3-g **documenta l'ordine** invece di inciamparci.
- **`crea_rifacimento_atomico` alza `RAISE EXCEPTION` se lo stato non è
  `consegnato`/`pronto`/`sospeso`** — l'originale si sceglie con quel filtro nella `WHERE`.
- 🐛 **Un rosso vero al primo giro, ed era della sonda:** `rilevato_in := 'collaudo T5'` ha alzato
  `23514` — `lavori_rifacimenti_rilevato_in_check` ha un suo dizionario chiuso
  (`produzione`/`prova_1`/`prova_2`/`prova_3`/`post_consegna`). Corretto nella sonda, con la nota
  accanto. **Non è un difetto del prodotto**: il vincolo ha fatto esattamente il suo mestiere.

I conteggi coprono **cinque** tabelle, `progressivi_anno` compresa (il rifacimento incrementa il
progressivo: senza quella colonna il «DB invariato» sarebbe una mezza verità).

---

## 3. FASE 6b

### 3.1 Tipi generati
```
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq   → exit 0, stderr vuoto
nessun messaggio CLI in coda (ultime righe: `export const Constants = { public: { Enums: {} } } as const`)
diff <generato> src/types/database.types.ts → ✅ IDENTICI (exit 0)
npx tsc --noEmit → exit 0
```
I tipi generati sono **byte-identici** ai vigenti: atteso, perché sono cambiati solo due corpi di
funzione, nessuna superficie di schema. La verifica serviva a escludere **deriva** del DB vivo
rispetto ai tipi in repo — non ce n'è.

### 3.2 RLS invariata (prima/dopo, non solo il conteggio)
Fotografia scattata **prima del push** (l'evidenza non è recuperabile dopo) con `policyname`, `cmd`,
`roles`, **`qual` e `with_check`** — un conteggio uguale non esclude una `qual` cambiata in silenzio.

```
policy: 3
  dichiarazioni_conformita | ddc_laboratorio_insert | INSERT | {public}
  dichiarazioni_conformita | ddc_laboratorio_select | SELECT | {public}
  lavori_prescrizioni | lavori_prescrizioni_tenant_select | SELECT | {public}
rls: [{"relname":"dichiarazioni_conformita","relrowsecurity":true,...},{"relname":"lavori_prescrizioni","relrowsecurity":true,...}]

=== DIFF policy prima -> dopo ===
NESSUNA DIFFERENZA (exit 0)
```

### 3.3 Permessi SECURITY DEFINER
`REVOKE`/`GRANT` ri-emessi per entrambe le funzioni, con firme identiche alle definizioni. ACL
verificata **dal catalogo vivo dopo il push**: `{postgres=X/postgres,service_role=X/postgres}` —
niente `PUBLIC`, `anon`, `authenticated`. `proconfig` sopravvissuto al `CREATE OR REPLACE` (la
trappola che azzera il `search_path`): `{"search_path=public, pg_temp"}`.

---

## 4. La spia della migration — aggiornata, e PROVATA viva

`tests/unit/prescrizione-costanti-spia-migration.test.ts`

🛑 **Il posto marcato diceva «`MIGRATION_RPC` va SPOSTATA alla migration di T5». Preso alla lettera
sarebbe stato sbagliato**, e l'ho fatto diversamente:

`MIGRATION_RPC` è usato da **tre** prove, ma solo **una** riguarda una funzione che T5 ricrea.
`allega_fonte` e `correggi_typo` sono rimaste vive in `20260804152403` (nessuno le ha toccate):
spostando l'unico puntatore, le loro due prove sarebbero andate a cercare funzioni che nel file di
T5 non esistono. Si sarebbero guastate **rumorosamente** (il `throw` di `corpoFunzione` — la
trappola progettata dal Task 4 ha retto), ma la regola giusta è un'altra, e ora è scritta nel file:
**ogni funzione punta al file che l'ha definita l'ULTIMA volta; chi ricrea una funzione sposta il
SUO puntatore, non tutti.**

Quindi: `MIGRATION_RPC` resta `20260804152403` (fonte + typo) e nasce
`MIGRATION_RPC_DIVERGENZA` = la migration di T5. **La prova di `p_motivo` si è spostata insieme alla
funzione**: se fosse rimasta sul vecchio file, la spia sarebbe stata verde su un **corpo morto** —
cioè avrebbe provato un testo che il database non esegue più. Aggiunta la **quinta** estrazione:
`CAMPI_TYPO` = il `p_campo NOT IN (…)` dentro `registra_divergenza`.

**Le due estrazioni nuove non sono verdi per finta** — provate manomettendo la migration e
rimettendola a posto:

```
riga 76 manomessa:  IF p_campo IS NULL OR p_campo NOT IN ('elementi','colorex','tipo') THEN
     × CAMPI_TYPO = la guardia dentro `lavoro_prescrizione_registra_divergenza`
     AssertionError: expected [ 'colore' ] to deeply equal []
     Tests  1 failed | 7 passed (8)

riga 80 manomessa:  ... p_motivo NOT IN ('richiesta_dentista','esigenza_tecnica','materiale_non_disponibile','altrox')
     × MOTIVI_DIVERGENZA = la guardia dentro `lavoro_prescrizione_registra_divergenza`
     AssertionError: expected [ 'altro' ] to deeply equal []
     Tests  1 failed | 7 passed (8)

ripristinata → Test Files 1 passed (1) · Tests 8 passed (8)
```

Dopo il ripristino, le due guardie del file sono state **ricontrollate contro il catalogo vivo**
(`diff` fra le righe 76/80 del file e `pg_get_functiondef`): combaciano.

### 4.1 Il censimento delle citazioni (R-P6) — l'elenco non l'ho deciso io

Ricreare una funzione sposta il suo corpo vivo, e **ogni riferimento al vecchio file diventa un
puntatore a un corpo morto**. L'elenco di quei riferimenti non è dell'autore: si cerca.

```
grep -rn "20260804152403\|ondata_b_prescrizioni_rpc" --include='*.ts' --include='*.tsx' \
  --include='*.md' --include='*.sql' . | grep -v node_modules      → 60 hit
```

Classificati uno per uno:

| Esito | Dove |
|---|---|
| **Sorpassati** (registra_divergenza / crea_rifacimento) | `docs/superpowers/plans/…-censimento-r-p6.md` righe 54, 66, 68, 157, 167, 173, 197, 513, 515, 517, 519, 537 → **nota di sorpasso** in testa al file |
| **Già corretti** in questo task | `prescrizione-costanti.ts` ×3, spia ×2, route divergenza ×2 |
| **Ancora veri** — lasciati | tutto ciò che riguarda `lavoro_crea_atomico`, `allega_fonte`, `correggi_typo`, `conferma_consegna` (quattro funzioni non toccate): `api-prescrizione-typo.test.ts:321`, `typo/route.ts:20`, `20260804154232:12`, le righe del censimento su quelle quattro |
| **Storia, vera come storia** | `docs/roadmap/2026-08-04-ondata-b-sessione-2-handoff.md:49` («cosa fece la ②») e il piano della ② — non si riscrive il passato |

🔑 **Perché non ho riscritto le 12 righe del censimento:** quel documento è la **fotografia** dello
stato del codice alle 19:15 del 04/08, e il piano della ③ ci si appoggia. Riscriverlo a posteriori
cancellerebbe la prova di cosa si sapeva quando il piano è stato scritto — e le «SORPRESE» che
contiene (fra cui il rilievo ⑦, «*registra_divergenza NON valida p_campo*», che questo task chiude)
sono esattamente ciò che quel documento serve a conservare. Una **nota di sorpasso datata in testa**
dice a chi legge cosa non vale più, senza falsificare il resto.

---

## 5. Verifiche

| Comando | Esito |
|---|---|
| `npx tsc --noEmit` | **0** (exit 0) |
| famiglia prescrizione + rifacimento (7 file) | **101 passed** in 946 ms |
| `npx vitest run` (suite intera) | **4648 passed \| 19 skipped** (402 file passed \| 3 skipped), exit 0 |
| collaudo R-P1 sul DB vivo | 🟢 verde, DB invariato |
| diff policy RLS prima/dopo | nessuna differenza |
| diff tipi generati | nessuna differenza |

I 7 file: `prescrizione-costanti-spia-migration` · `api-prescrizione-divergenza` ·
`api-prescrizione-typo` · `api-prescrizione-fonte` · `rifacimento-route` ·
`crea-lavoro-prescrizione` · `lavori-post-prescrizione`.

### 5.1 Suite intera — output reale
```
 Test Files  402 passed | 3 skipped (405)
      Tests  4648 passed | 19 skipped (4667)
   Duration  125.36s
```
(exit 0. L'unica riga di rumore, `Not implemented: navigation to another Document`, è di jsdom ed è
preesistente — non nasce da questo task.)

---

## 6. File toccati

| File | Cosa |
|---|---|
| `supabase/migrations/20260804211256_ondata_b3_dizionario_divergenza_clone_p37.sql` | **nuovo** — le due `CREATE OR REPLACE` + `COMMENT` + `REVOKE`/`GRANT` |
| `tests/unit/prescrizione-costanti-spia-migration.test.ts` | secondo puntatore, `p_motivo` spostato, quinta estrazione (`p_campo` della divergenza), intestazione da «quattro» a «cinque» |
| `src/lib/domain/prescrizione-costanti.ts` | **solo commenti** — le citazioni `file:riga` dei vincoli, ora doppie per il campo e spostate per il motivo |
| `src/app/api/lavori/[id]/prescrizione/divergenza/route.ts` | **solo commenti** — «oggi solo qui» → «la prima delle due»; la nota «`campo_non_valido` non esiste ancora» diventa il fatto che esiste |
| `docs/roadmap/ROADMAP-UFFICIALE.md` | riga 12: il fatto ① era vero e ora è **mezzo falso** — chiuso per le due colonne, aperto per `paziente_nome_snapshot` |
| `docs/superpowers/plans/2026-08-04-ondata-b-sessione-3-censimento-r-p6.md` | **nota di sorpasso** in testa: quali citazioni a `20260804152403` sono ora corpi morti (e quali no) + la conseguenza della stringa vuota. Il censimento **non è riscritto** — è una fotografia, e riscriverla cancellerebbe la prova di cosa si sapeva quando il piano è stato scritto |
| `memory/MEMORY.md` | §5: cosa clona davvero il rifacimento + i due dizionari della divergenza |
| `scripts/tmp/*` (gitignorati) | `collaudo-t5-r-p1.mjs`, `censo-t5-catalogo.mjs`, `censo-t5-policies.mjs`, `policies-{prima,dopo}.json` |

**Perché i commenti di `prescrizione-costanti.ts` e della route rientrano nel mandato e non sono
correzioni di nascosto (R-E2):** sono citazioni che **la mia modifica ha reso false**. Quel file
dichiara in testa «chi tocca uno di questi elenchi tocca la migration nello stesso salvataggio»; un
puntatore a `20260804152403:299` dopo che il corpo vivo si è spostato è esattamente il modo in cui
questo repo perde una correzione già fatta. Nessuna logica toccata.

---

## 7. R-E2 — ritrovamenti FUORI mandato (riferiti, NON corretti)

0. 🔴 **LA PIÙ IMPORTANTE, ED È UNA CONSEGUENZA DELLA MIA MODIFICA: il clone ora eredita anche la
   STRINGA VUOTA del prescrittore.** `crea_rifacimento_atomico` copia `v_lavoro.richiedente_nome`
   alla lettera, senza `NULLIF`. La catena, tutta già documentata in P37: `TabDati.tsx:283` (la
   pillola «+ Nuovo» del medico richiedente) scrive `richiedente_nome: ''` — **stringa vuota, non
   `null`** — e `POST /api/lavori` la lascia passare, perché `?? null` non scatta su `''`. **Prima**
   della mia modifica il rifacimento nasceva con `NULL` e `generate-ddc.ts:146-147` ripiegava sul
   nome del cliente col `??`; **adesso** eredita `''`, il `??` non scatta, e la Dichiarazione di
   Conformità stamperebbe un **prescrittore vuoto** — mentre il precheck passa
   (`src/lib/consegna/precheck.ts:22-26` accetta il campo **oppure** il cliente, e il cliente c'è
   sempre). **Misurato, caso P37-d del collaudo:** la stringa vuota **viaggia**.
   `misurato:` oggi **0 stringhe vuote su 295** (misura di P37), quindi **niente è rotto ora** — ma
   la strada è aperta da questo push, ed è la stessa trappola già documentata per il nome del
   paziente (`src/lib/domain/nome-paziente-scrittura.ts`, trappola 2).
   🛑 **NON l'ho corretta, ed è una scelta.** Un `NULLIF` dentro la RPC sarebbe un cambio di
   semantica silenzioso fuori dal «SOLO questo» del mandato — e sarebbe anche il **rimedio
   sbagliato**: il posto giusto è **a monte, sullo scrittore** (P37, riga 12), dove `''` non deve
   nascere. Fatto sapere qui, e scritto anche nel censimento R-P6 della ③, che i task successivi
   leggono.

1. **Il posto marcato nella spia dà un'istruzione che rompe due prove.** Il commento del Task 4 dice
   «`MIGRATION_RPC` va spostata alla migration di T5»: `allega_fonte` e `correggi_typo` in quel file
   non esistono. Il guasto sarebbe stato rumoroso (per disegno), ma l'istruzione è sbagliata.
   **L'ho corretta nel file che era mio da aggiornare** e ho scritto la regola generale al suo posto
   — non è una correzione silenziosa, è il contenuto del mio mandato. La segnalo perché **la stessa
   frase potrebbe essere stata copiata altrove**: le spie gemelle (`categorie-foto-spia-migration`)
   meritano un'occhiata con questa lente.

2. **`paziente_nome_snapshot` NON è clonato dal rifacimento, e nessuno lo ha deciso.** Il testo della
   migration `007` lo copiava; la definizione viva no (ritrovamento R-E2 della ②, già in roadmap riga
   12). **Fuori dal mio mandato** («solo il clone P37»): non l'ho toccato. Ma ora che le altre due
   caselle del prescrittore viaggiano, questa è l'unica del gruppo rimasta indietro — e non è una
   colonna neutra: è il nome del paziente su un lavoro che diventerà una Dichiarazione di Conformità.
   Va **deciso**, non ereditato per inerzia. Roadmap riga 12, aggiornata di conseguenza.

3. **`lavori_rifacimenti.rilevato_in` e `.motivo` hanno dizionari chiusi in banca dati che NON hanno
   una casa TypeScript** (`produzione`/`prova_1`/`prova_2`/`prova_3`/`post_consegna` e
   `colore_sbagliato`/`misura_errata`/`fusione_difettosa`/`rottura_produzione`/`non_confortevole`/
   `errore_prescrizione`/`altro`). È la stessa classe di rischio che `prescrizione-costanti.ts` +
   spia hanno chiuso per la prescrizione: qui un valore fuori elenco arriva al database e torna
   indietro come **23514 crudo**, cioè un 500 illeggibile invece di un 422 che dice cosa correggere.
   Me ne sono accorto **pagandolo** nel collaudo. Non toccato: fuori mandato, e appartiene alla riga
   12 (studio del flusso del rifacimento).

4. **`lavori_prescrizioni` ha 0 righe sul DB di prova.** Non è un difetto — la tabella è nata con la
   ② e nessun lavoro di prova è ancora passato dal wizard nuovo — ma va saputo da chi collauderà le
   schermate della ③: **il banco è vuoto**, le scene vanno preparate.

---

## 8. Self-review

**Cosa potrebbe essere ancora sbagliato, detto per intero.**

- **L'ordine campo-prima-di-motivo è una scelta, non un fatto imposto da qualcuno.** Il brief diceva
  «accanto a `motivo_non_valido`» senza fissare la precedenza; l'ho risolta guardando la route, che
  valida il campo per primo. **E qui vale la pena essere precisi su cosa resta nel repo:** l'ho
  *misurata* col caso S3-f, ma quel caso vive in `scripts/tmp/`, che è **gitignorato** e per
  convenzione non si committa — quindi dopo questa sessione **la prova non c'è più**. Ciò che resta
  è **prosa**: il commento sopra la funzione e il `COMMENT ON FUNCTION` nel catalogo. Per un
  dettaglio d'attuazione reversibile è proporzionato, ma non chiamiamolo «inchiodato a un test».
  Se un giorno quell'ordine dovesse contare davvero, il posto dove metterlo è `tests/integration/`,
  dove il banco con `skipIf SUPABASE_DB_URL` esiste già — fuori dal mandato di questo task.
- **La spia è una prova sul TESTO, non sul database.** Legge il file `.sql`, non `pg_get_functiondef`.
  Se qualcuno cambiasse la funzione a mano nel DB senza migration, la spia resterebbe verde. È un
  limite del disegno esistente (documentato nella testa di quel file), non introdotto da me — ma
  vale la pena saperlo: **in questo task il ponte fra testo e database l'ha fatto il collaudo**, che
  ha chiamato la funzione vera.
- **Non ho eseguito `next build`.** FASE 7 lo vuole, e non l'ho saltato per pigrizia: nessun file di
  `src/` è cambiato nella sostanza (solo commenti), i tipi generati sono identici e nessuna firma di
  handler è stata toccata — cioè manca proprio la classe di difetto che solo `next build` vede. Se
  il controllore preferisce il gate pieno, `npm run verify:full` lo copre.
- **Il collaudo gira sui dati di prova che c'erano.** `lavori_prescrizioni` era vuota, quindi la riga
  della prescrizione l'ho **creata io** nella transazione con `allega_fonte`, e i due valori del
  prescrittore li ho **impostati io** con un `UPDATE` dentro la transazione: il collaudo non dipende
  da com'è fatto il banco oggi. Il rovescio è che non ho provato il clone su una riga «naturale» —
  ma una riga naturale con quei campi pieni, oggi, **non esiste** (`richiedente_nome` è valorizzato
  in 1 lavoro su 295, misura di P37).
- **BP-1 fatto in modo mirato, non con una nuova intestazione.** I quattro task precedenti di questa
  sessione (`7cc5a5a0`, `9683eeed`, `25728c29`) **non toccano** memoria né roadmap: la convenzione
  della sessione è che l'aggiornamento grosso lo fa la chiusura (`/chiudi`). Ho corretto **solo i due
  punti che la mia modifica rende falsi** — la riga 12 della roadmap e la voce «Rifacimento» in
  MEMORY §5 — perché quelli non possono aspettare senza diventare una bugia che qualcun altro
  eredita. L'intestazione «Ultimo aggiornamento» e il conteggio delle decisioni **restano alla
  chiusura di sessione**, che ha la visione di tutti gli undici task.
- **Non ho aperto una decisione nuova (D226).** M-T3-1 e il clone P37 erano già decisi (D212, D221 e
  la riga 12 che dice esplicitamente «il solo clone P37 può entrare in ③»): questo task **esegue**,
  non decide. L'unica scelta mia — l'ordine delle guardie — è interna all'attuazione e reversibile
  in minuti, quindi rientra nelle esenzioni della Regola Advisor.

---

## Stato finale

- Migration `20260804211256` **applicata al DB vivo** e registrata nel ledger.
- Collaudo R-P1 verde su transazione annullata; DB invariato su cinque conteggi.
- FASE 6b compiuta: tipi identici, `tsc` 0, RLS invariata (policy e `qual`).
- Spia aggiornata **e provata capace di fallire** su entrambe le estrazioni nuove.

---

# APPENDICE — Fix dalla review del Task 5 (4 agosto 2026)

Due rilievi del revisore, **entrambi giusti**, entrambi corretti. E tutti e due sono **la stessa
classe di difetto**: un riferimento che era vero quando è stato scritto e che un'altra modifica ha
reso falso senza che nessuno se ne accorgesse.

## Fix 1 — I numeri della «nota di sorpasso» erano PRE-inserzione

**Il rilievo:** la tabella della nota citava dodici numeri di riga calcolati **prima** che
inserissi la nota stessa in testa al censimento. Le mie 29 righe li avevano spostati **tutti di
+29**. Verificato uno per uno col `grep`, non con l'aritmetica: 66→95, 173→202, 197→226, 513→542,
519→548, 537→566 — e così tutti e dodici.

🔁 **E la correzione ha rifatto lo stesso errore, una volta sola.** Il testo che ho scritto per
correggere i numeri **allungava la nota di altre 14 righe**, spostandoli di nuovo. Me ne sono
accorto **rileggendo col `grep` dopo l'edit** invece di fidarmi dei numeri appena scritti — ed è la
ragione per cui gli ultimi due ritocchi sono stati costruiti per **non cambiare il conteggio delle
righe** (sostituzioni dentro righe esistenti, mai righe nuove).

**Numeri finali, ognuno verificato meccanicamente** (script: per ogni numero, `sed -n "Np"` e
controllo che la riga contenga davvero la voce attesa — **15 su 15 verdi**):
- `lavoro_prescrizione_registra_divergenza`: **109, 111, 200, 210, 216, 416, 467, 556, 558, 560, 562**
- `crea_rifacimento_atomico`: **97, 240, 505, 580**

**Dichiarazione aggiunta alla nota**, come richiesto: i numeri sono **POST-inserzione** e valgono
per il file con la nota in testa (righe **10-49**); chi appende altro li sposta tutti e **rifà il
conto**. Ho aggiunto anche la sola cosa che non invecchia: **la maniglia stabile è il TESTO della
voce**, non il suo numero.

### 🔎 Tre voci in più — e una lezione R-P6 che il rilievo ha fatto emergere

Il revisore contava **dodici** citazioni; ne ho trovate **quindici**. Le tre in più (oggi 416, 467,
505) il mio censimento le aveva mancate perché cercava `20260804152403` **per esteso**, mentre
quelle scrivono il numero **in forma corta** (`migration 152403:303-311`) **o non lo scrivono
affatto** (`migration :265-314`).
🔑 **La lezione, scritta nella nota:** un elenco costruito con **un solo modo di scrivere il nome**
non è l'elenco. R-P6 dice «ogni identificatore»; va letto anche come **ogni forma
dell'identificatore**, abbreviazioni comprese. È lo stesso meccanismo per cui il 03/08 un censimento
trovò quattordici citazioni dove se ne presumevano tre.

⚠️ **Fuori dalla lettera del mandato** («solo questi due fix»): le tre voci in più sono nella stessa
tabella che stavo correggendo, e lasciarle fuori avrebbe prodotto una tabella che **dichiara di
essere l'elenco senza esserlo**. Lo dichiaro qui perché il controllore possa rifiutarlo.

## Fix 2 — «caso S3-d» → S3-f · e la riga NON è la :305

**Due cose, e la prima è che il numero del rilievo non torna.** La citazione **non sta alla riga
305**: il file di migration è lungo **251 righe**, la 305 non esiste. La citazione sta alla
**riga 36**.

**Dentro o fuori dal corpo?** 🟢 **FUORI**, e non l'ho dedotto dalla lettura. I delimitatori `$$`
del file stanno alle righe **44/95** (prima funzione) e **127/236** (seconda): la 36 cade **prima
del primo `AS $$`**, nel blocco di commenti che precede il `CREATE`. **La prova decisiva è sul
database, non sul file:** la stringa `S3-d` **non compare nel `prosrc` vivo** — quel commento non è
mai entrato nel corpo della funzione. Quindi correggerlo **non può** disallineare il file dal DB, e
la cautela del controllore è soddisfatta.

**Correzione applicata** (riga 36): `caso S3-d` → `caso S3-f`, con l'aggiunta di cosa prova
davvero S3-d («che `tipo` resti lecito»), così i due casi non si riconfondono.

**Controprova di fedeltà, eseguita DOPO l'edit** (`scripts/tmp/verifica-fedelta-t5.mjs`): il corpo
fra `$$…$$` del file confrontato **byte a byte** col `prosrc` di `pg_proc`.
```
✅ lavoro_prescrizione_registra_divergenza: corpo del FILE identico al prosrc VIVO (1771 byte)
✅ crea_rifacimento_atomico: corpo del FILE identico al prosrc VIVO (4936 byte)
🟢 FILE FEDELE AL DB
```

## Un terzo difetto, generato dal Fix 2 e chiuso nello stesso salvataggio

L'aggiunta di **una riga** di commento al file ha spostato le due guardie da 76/80 a **77/81** — e
`src/lib/domain/prescrizione-costanti.ts` le citava per numero. Le due citazioni erano diventate
false **nel giro dello stesso turno**. Corrette (`:77` e `:81`) e **ricontrollate** stampando le
righe citate: contengono davvero `p_campo NOT IN` e `p_motivo NOT IN`.

🔑 È la terza volta in questa appendice che lo stesso meccanismo morde: **un numero di riga è un
riferimento che si rompe da solo**. Dove conta la durata, la maniglia giusta è il testo.

## Verifiche

```
npx vitest run tests/unit/prescrizione-costanti*  →  Test Files 1 passed (1) · Tests 8 passed (8)
npx tsc --noEmit                                  →  exit 0
verifica fedelta' file ↔ prosrc vivo              →  🟢 FILE FEDELE AL DB
15 numeri di riga verificati uno per uno          →  15/15
```
