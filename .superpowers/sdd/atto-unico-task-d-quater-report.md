# RESOCONTO — Task D-quater: il gettone si muove solo se cambia qualcosa (D323)

**Ramo:** `intervento-post-consegna` · **Salvataggio:** `4a03f365`
**Migration:** `20260808195344_lavori_gettone_solo_se_cambia.sql`, **applicata** al banco
**FASE 7:** `VERIFY_EXIT=0` — **5675 passate | 68 saltate** su **455** file

| cosa | esito |
|---|---|
| ① migration (funzione propria + pinzatura) | ✅ applicata, riletta dal catalogo vivo |
| ② controllo del gettone prima del render | ✅ dentro `…/riemetti`, **dopo** la porta d'idempotenza |
| ③ il foglio raccoglie l'`updated_at` | ✅ successo **e** 409 |
| ④ «Ricarica e riprendi» non cancella più le correzioni | ✅ |
| 🔴 prova oggetto per oggetto | **13 oggetti** (il brief ne elencava 8) — **0 rotti** con la forma spedita, **2 rotti** con la forma ratificata |
| R-P4 | **12 mutazioni, 12 accese** |
| difetti trovati nel brief | **6**, di cui **due bloccanti** |

---

## 1. LA MIGRATION, e il corpo riletto dal CATALOGO VIVO

`supabase/migrations/20260808195344_lavori_gettone_solo_se_cambia.sql`
🕛 Nome preso con `date -u "+%Y%m%d%H%M%S"` in un comando separato → `20260808195344`, sopra il
pavimento `20260808154033`.

Applicata con `npx supabase db push --linked --yes` (⚖️ D284, non si chiede):

```
Applying migration 20260808195344_lavori_gettone_solo_se_cambia.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260808195344_lavori_gettone_solo_se_cambia.sql"],…}
```

**Il corpo riletto da `pg_get_functiondef`, non dal file:**

```sql
CREATE OR REPLACE FUNCTION public.lavori_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Pinza SE E SOLO SE: la sostanza della riga è identica (al netto del solo
  -- contatore esente) E il chiamante non ha assegnato `updated_at`.
  IF to_jsonb(OLD) - 'post_consegna_correzioni'
     IS NOT DISTINCT FROM
     to_jsonb(NEW) - 'post_consegna_correzioni'
  THEN
    NEW.updated_at = OLD.updated_at;   -- 🛑 si PINZA al valore vero
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$
```

**I trigger di `lavori`, dal catalogo:**

```
_audit_lavori           AFTER  INSERT OR DELETE OR UPDATE  → _audit_trigger_fn()
trg_dashboard_lavori    AFTER  INSERT OR DELETE OR UPDATE  → trg_refresh_dashboard()
trg_lavori_ritardo      BEFORE INSERT OR UPDATE            → check_lavoro_ritardo()
trg_lavori_updated_at   BEFORE UPDATE                      → lavori_set_updated_at()   ← riagganciato
```

**ACL:** `{postgres=X/postgres,service_role=X/postgres}` — `anon` e `authenticated` non ci sono.
**`COMMENT`:** presente, 1713 caratteri, e dice **perché** è separata dalla condivisa.
**La condivisa NON è stata toccata** — sonda ⑨ sotto.

🔑 **Il nome del trigger NON è cambiato, ed è una scelta misurata.** I trigger scattano in ordine
**alfabetico**, e su `lavori` c'è un **secondo BEFORE UPDATE**: `trg_lavori_ritardo` →
`check_lavoro_ritardo()`, che può portare `NEW.stato` da `in_lavorazione` a `in_ritardo`. Con
l'ordine di oggi (`…ritardo` < `…updated_at`) la funzione nuova vede la riga **già corretta**, e un
passaggio in ritardo conta come cambiamento vero — che è la lettura giusta. Un nome che venisse
prima invertirebbe l'ordine **in silenzio**.

---

## 2. LE SONDE — SQL e output, comprese quelle che devono FALLIRE

Credenziali: `set -a && . ./.env.local; set +a`. Ponte: `node scripts/psql.mjs`.
⚠️ **Quel ponte manda il file come UNA query sola**: al primo errore Postgres annulla tutto e
**non stampa nessun risultato**. Le sonde che devono fallire stanno quindi in **un'invocazione
ciascuna**, come chiede il brief.

### A · Sonda B — le DUE candidate a confronto, sei casi ciascuna, transazione annullata

Fixture **dentro**: copia di un lavoro vero (`id` e `numero_lavoro` nuovi) più due righe in
`lavori_denti` con un colore del catalogo. Penna **vera** invocata, non simulata.

```
│ 'C1-denti-solo-codice'   │ 'ok'  │      ← la penna riesce…
│ 'C1-denti-solo-codice'   │ false │      ← …e il gettone NON avanza   ❌
│ 'C1-typo-prescrizione'   │ false │      ← il gettone NON avanza      ❌
│ 'C1-contatore'           │ false │      ← pinzato                     ✅
│ 'C1-cambio-vero'         │ true  │      ← avanza                      ✅
│ 'C1-falso-updated_at'    │ false │      ← il falso non atterra        ✅
│ 'C1-salvataggio-a-vuoto' │ false │      ← pinzato                     ✅
│ 'C2-denti-solo-codice'   │ 'ok'  │
│ 'C2-denti-solo-codice'   │ true  │      ← avanza                      ✅
│ 'C2-typo-prescrizione'   │ true  │      ← avanza                      ✅
│ 'C2-contatore'           │ false │      ← pinzato                     ✅
│ 'C2-cambio-vero'         │ true  │      ← avanza                      ✅
│ 'C2-falso-updated_at'    │ false │ true │← il falso non atterra        ✅
│ 'C2-salvataggio-a-vuoto' │ false │      ← pinzato                     ✅
```

**C1 = la forma ratificata dal panel** (esclude `post_consegna_correzioni` **e** `updated_at`):
**4 casi su 6**. **C2 = la forma spedita** (esclude il solo contatore): **6 su 6**.
La differenza è **un token**: `- 'updated_at'`.

### B · Sonda C — contro il trigger VERO, quello applicato

```
│ '① contatore (service_role)' │ true  │  ← ATTESO_pinzato — IL MANDATO
│ '② cambiamento vero'         │ true  │  ← ATTESO_avanza
│ '③ updated_at falso'         │ 2026-08-08T19:56:37.976Z │ false │  ← DEVE_ESSERE_false
│ '④ salvataggio a vuoto'      │ true  │  ← ATTESO_pinzato
│ '⑤ denti solo codice'        │ 'ok' / true │ ← la penna riesce E il gettone avanza
│ '⑥ tocco esplicito (typo)'   │ true  │  ← ATTESO_avanza
│ '⑨ condivisa intatta'        │ true  │  ← `trigger_set_updated_at` ha ancora il suo corpo
```

La ① è scritta **come la scrive l'app**: `SET LOCAL ROLE service_role` prima dell'`UPDATE`, perché
`scripts/psql.mjs` si collega come **`postgres`, cioè come proprietario**, e senza `SET LOCAL ROLE`
una sonda non prova niente sui permessi.

### C · 🛑 LE SONDE CHE DEVONO FALLIRE — una invocazione ciascuna

```
=== ⑦ authenticated → DEVE FALLIRE ===
❌ 42501 permission denied for function lavori_set_updated_at

=== ⑧ anon → DEVE FALLIRE ===
❌ 42501 permission denied for function lavori_set_updated_at

=== ⑩ postgres (proprietario) → il CONTROLLO, che rende le due di sopra una prova ===
❌ 0A000 trigger functions can only be called as triggers
```

🔑 **La ⑩ è la parte che conta.** Senza, un `42501` potrebbe essere un fallimento qualunque: da
proprietario l'errore è **un altro** (`0A000`), quindi il `42501` è davvero un rifiuto di permesso.

### D · La sonda fuori SQL, e va detta perché ha cambiato il codice

```js
await c.from('lavori').update({}).eq('id', l.id).select('id, numero_lavoro, stato, updated_at').single()
→ {"data":null,"error":{"code":"PGRST116","details":"The result contains 0 rows"},"status":406}
```

`.update({})` **non aggiorna niente** e `.single()` diventa un errore, cioè un **500**. È la ragione
della guardia sul carico vuoto (v. §6, difetto B3).

---

## 3. 🔴 LA PROVA OGGETTO PER OGGETTO — la prova che il panel dichiarava MANCANTE

D323 cambia il significato di `lavori.updated_at` **per tutti**, e il panel scriveva di *credere*
che nessuno si rompesse. **Non era vero.**

🛑 **L'elenco NON è quello del brief** (R-P2: l'elenco non lo decide l'autore). Il censimento l'ho
rifatto sul **catalogo vivo** e sul codice, e la domanda che discrimina è una sola:
**l'oggetto ASSEGNA `lavori.updated_at`, oppure lo legge come semplice gettone di confronto?**

```sql
SELECT p.proname, (…righe che contengono 'updated_at'…) FROM pg_proc p
 WHERE p.pronamespace='public'::regnamespace
   AND p.prosrc ILIKE '%updated_at%' AND p.prosrc ILIKE '%lavori%';   → 11 righe
```

| # | oggetto | che cosa fa col gettone | forma **ratificata** | forma **spedita** |
|---|---|---|---|---|
| 1 | `lavoro_prescrizione_correggi_typo` | **ASSEGNA**: `UPDATE lavori SET updated_at = now()` è la **sola** riga che tocca `lavori` (il cambiamento vero va su `lavori_prescrizioni`) | 🔴 **ROTTO** — il gettone non avanza più, il controllo di concorrenza di quella penna diventa **inerte** | ✅ avanza |
| 2 | `lavoro_denti_sostituisci_atomica` | **ASSEGNA**, e denormalizza su `lavori` i soli **elenchi di fdi** | 🔴 **ROTTO** — una correzione che cambia **solo il codice colore** (`codice`, `scala`, `codice_collo/corpo/incisale`) lascia i tre array identici → pinzato | ✅ avanza |
| 3 | `correggi_e_riemetti_atomica` | **LEGGE** e confronta; ④a scrive quattro colonne di `lavori` **senza** assegnare `updated_at` | ✅ | ✅ (sonda ⑤: la penna annidata riceve il gettone e risponde `ok`) |
| 4 | `manda_in_prova_atomico` | ASSEGNA, **insieme** a `stato` | ✅ | ✅ |
| 5 | `registra_rientro_atomico` | ASSEGNA, **insieme** a `stato` | ✅ | ✅ |
| 6 | `PATCH /api/lavori/[id]` | **ASSEGNAVA** (`:803`) | ✅ solo perché la forma ratificata ignora l'assegnazione | ✅ **dopo** aver tolto quella riga — v. §6 B2 |
| 7 | **`src/lib/lavori/transizioni.ts:62`** 🆕 | ASSEGNA `new Date().toISOString()` **insieme** a `stato` | ✅ | ✅ — e l'orologio di Node **non atterra** in nessuna delle due forme |
| 8 | `PUT /api/lavori/[id]/denti` | LEGGE (gettone di confronto) | ✅ | ✅ |
| 9 | `POST /api/lavori/[id]/prescrizione/typo` | LEGGE | ✅ ma sopra una penna rotta (#1) | ✅ |
| 10 | `ModificaColoreSheet` | LEGGE, e **raccoglie** il gettone di ritorno | ✅ | ✅ |
| 11 | `ModificaRigaSheet` | LEGGE, e raccoglie `risposta.lavoro.updated_at` | ✅ | ✅ — la guardia sul carico vuoto restituisce comunque `{lavoro}` col gettone |
| 12 | **`src/hooks/useLavoroForm.ts:291`** 🆕 | LEGGE | ✅ | ✅ |
| 13 | **vista `lavori_dashboard`** 🆕 | **SELEZIONA** `l.updated_at`, ma **NON ci ordina** (`ORDER BY` su stato e data di consegna) | ✅ | ✅ |

**8 oggetti nel brief → 13 nel censimento.** I cinque in più sono #4, #5, #7, #12, #13.
E il brief metteva `correggi_e_riemetti_atomica` fra «le tre del catalogo che usano il gettone»: è
vero che lo usa, ma **non lo assegna** — cioè non è uno dei tre che la pinzatura poteva rompere.
I tre veri sono #1, #2 e (con `stato` accanto, quindi salvi) #4 e #5.

🔑 **La differenza fra i due rotti, e non va appiattita:** `lavoro_prescrizione_correggi_typo` fa
`jsonb_set(contenuto, ARRAY[p_campo], …)`, cioè una **toppa per chiave** — due persone che
correggono chiavi **diverse** non si cancellano a vicenda. `lavoro_denti_sostituisci_atomica` invece
fa **`DELETE` di tutta la collezione + `INSERT`**: lì l'aggiornamento perso sarebbe **totale**.
E quella penna lo aveva **previsto per iscritto**, nel suo stesso commento:

> «*farlo dipendere da un trigger dichiarato in un'altra migration significherebbe che rimuovendo
> quel trigger si otterrebbero aggiornamenti persi in silenzio.*»

---

## 4. R-P4 — LE MUTAZIONI, e quante si sono accese

**Il primo rosso, per costruzione.** Le prove nuove sono state scritte **prima** del codice:
9 sulla rotta (**2 rosse**, 7 verdi perché sorvegliano un ordine e una debolezza che oggi
c'erano già per caso), 3 sulla PATCH (**3 rosse su 3**), 5 sul foglio (**4 rosse su 5**).
Le verdi al primo giro sono esattamente quelle che i mutanti hanno poi acceso.

**Dodici mutazioni deliberate sul codice finito — `12 su 12` accese**, e ognuna ha acceso
l'asserzione che esiste per lei:

| # | mutazione | prove accese |
|---|---|---|
| M1 | controllo anticipato messo **prima** della porta d'idempotenza | 1 — «il controllo anticipato viene DOPO la porta d'idempotenza» |
| M2 | confronto fra **stringhe** invece che fra istanti | 3 — «Z vs +00:00» · «microsecondi» · «gettone illeggibile» |
| M3 | un gettone illeggibile trattato come **conflitto** | 1 — «non inventa un conflitto» |
| M4 | il 409 anticipato **non porta** il gettone | 1 |
| M5 | **nessun** controllo anticipato (il codice di ieri) | 2 |
| M6 | la PATCH **rimette** `updated_at` nel carico | 4 (fra cui la sentinella riscritta in `lavori-id-route`) |
| M7 | tolta la guardia del **carico vuoto** | 2 |
| M8 | il foglio **butta** il gettone del successo | 1 |
| M9 | il foglio **butta** il gettone del 409 | 1 |
| M10 | «Ricarica e riprendi» torna a chiamare `ricomincia` | 3 |
| M11 | «Ricarica e riprendi» azzera **anche** le correzioni | 3 |
| M12 | anche la **chiusura** del foglio tiene le correzioni | 1 — «chiudere il foglio BUTTA le correzioni» |

**Le forme d'input enumerate**, prima delle asserzioni, sul gettone che arriva dal corpo:
assente (`422`, già coperta) · stringa vuota (`422`, già coperta) · non-stringa (`422`, già coperta) ·
**stessa istante scritto in due forme** (`Z` / `+00:00`, coperta, M2) · **differenza sotto il
millisecondo** (coperta, M2) · **non interpretabile** (`'pippo'`, coperta, M3) · **riga senza
gettone** (`null` in banca dati, coperta) · **gettone stantìo** (coperta, M5).
**Non coperta, e perché:** un gettone **futuro** rispetto alla riga — è indistinguibile da uno
stantìo per questo confronto, e la RPC lo tratta allo stesso modo.

🔴 **UN DIFETTO MIO, e le prove esistenti l'hanno preso subito.** Modificando la composizione del
corpo in `DevoIntervenire` ho **cancellato la riga `correzioni: carico,`**. Sette prove già in casa
sono diventate rosse allo stesso giro. Lo scrivo perché è la misura più onesta di quanto valga
quel file di prove: un difetto che avrebbe spedito una richiesta senza correzioni è durato **un
comando**.

---

## 5. FASE 7 — l'uscita letta da VARIABILE

```
$ npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
 Test Files  449 passed | 6 skipped (455)
      Tests  5675 passed | 68 skipped (5743)
   Duration  146.53s
✓ Compiled successfully in 6.4s        (next build)
✅ DS compliance · CSRF · reduced-motion · coerenza documenti · salvataggio · progetti Playwright
VERIFY_EXIT=0
```

**Base dichiarata: 5659 | 68 su 454. Ora: 5675 | 68 su 455.** Delta **+16 prove, +1 file**, e torna:
14 `it(` aggiunte nei file esistenti − 1 sostituita + 3 nel file nuovo = **+16**.

**FASE 6b** fatta: `supabase gen types` → il file generato è **identico** (la migration aggiunge una
funzione di trigger, che nei tipi non compare) · `tsc --noEmit` dentro `verify:full`, pulito.

---

## 6. 🔴 DOVE QUESTO BRIEF SBAGLIA — sei difetti, due bloccanti

### B1 · 🛑 BLOCCANTE — il blocco SQL del §2 **non riaggancia il trigger**: era un no-op

Il §2 porta **solo** `CREATE OR REPLACE FUNCTION public.lavori_set_updated_at()`. Ma il trigger di
`lavori` si chiama `trg_lavori_updated_at` ed **esegue `trigger_set_updated_at()`**: creare una
funzione nuova non cambia **niente** finché il trigger punta all'altra. Applicata così, la migration
sarebbe passata verde e il difetto sarebbe rimasto intero — e **ogni sonda avrebbe misurato il
comportamento vecchio credendo di misurare il nuovo**.
➡️ Aggiunti `DROP TRIGGER` + `CREATE TRIGGER … EXECUTE FUNCTION public.lavori_set_updated_at()`, col
**nome invariato** per non invertire l'ordine con `trg_lavori_ritardo`.

### B2 · 🛑 BLOCCANTE — la forma ratificata **rompe due penne del catalogo**, ed è la prova che il panel dichiarava mancante

Dettaglio in §3. In una riga: escludendo `updated_at` dal confronto si pinza anche quando il
chiamante lo ha assegnato **di proposito**, e quello è il modo in cui
`lavoro_prescrizione_correggi_typo` e `lavoro_denti_sostituisci_atomica` fanno avanzare il gettone
quando il cambiamento vero vive in un'altra tabella. Sulla seconda l'aggiornamento perso sarebbe
**totale** (DELETE + INSERT).
➡️ **Deviazione dalla forma ratificata: un token.** Si toglie `- 'updated_at'`. La verità del
predicato diventa «pinza **se e solo se** la sostanza è identica **e** il chiamante non ha assegnato
`updated_at`» — cioè esattamente ciò che serve, senza un secondo `IF`.

🛑 **IL COSTO ONESTO, e va detto perché è un vero costo.** La forma del panel avrebbe difeso
**anche** dalla riga `payload.updated_at` della PATCH **se qualcuno si fosse dimenticato di
toglierla**. Questa no: le due modifiche sono **accoppiate**. Sono nello stesso salvataggio, e la
sentinella che le tiene insieme è `tests/unit/lavori-patch-senza-updated-at.test.ts` (mutante M6).

⚠️ **E la sonda 7 del panel va riletta**: il suo **scopo** regge (un valore spedito dal chiamante non
atterra **mai** — il trigger scrive sempre `OLD` oppure `now()`), la sua **formulazione letterale**
no: «in riga resta il valore vero» significava `OLD`, e con questa forma diventa `now()`.

### B3 · 🔴 togliere `PATCH:803` **senza una guardia** trasforma un salvataggio a vuoto in un **500**

Il brief dice «va TOLTA nello stesso giro» e si ferma lì. Ma quella riga era anche **l'unica chiave
sempre presente** nel carico. Senza, un corpo che non porta nessun campo dell'allowlist produce
`.update({})` → `PGRST116` su `.single()` → **500** dove oggi c'è un **200**. `provato:` §2 D.
**Ed è raggiungibile per tre strade**, non una: un corpo di sole chiavi fuori allowlist (che la
rotta scarta **in silenzio** — è il gotcha già scritto in `CLAUDE.md`), una mezza coppia di colore
(`colore_scala` senza `colore_codice`, tolta poco sopra), un corpo di soli campi prezzo su un lavoro
già in fattura (tolti dal lock).
➡️ Aggiunta la guardia: non si scrive, si restituisce la riga com'è **col gettone corrente** — che è
ciò che `ModificaRigaSheet` legge per restare in sincronia.

### B4 · il §3 dice **dove** mettere il controllo ma non **in che ordine**, né **quanto forte**

Due cose mancano, e sbagliarle costa:
- **L'ordine.** Messo prima della porta d'idempotenza, un **ritentativo legittimo** (il server ha
  scritto, il cliente non ha visto la risposta) porta per costruzione il gettone di prima e
  diventerebbe un **409** invece del documento già fatto. Mutante M1.
- **La forza.** La RPC confronta due `timestamptz`, cioè **istanti**: ignora la forma testuale e
  distingue al microsecondo. Un confronto fra stringhe in TypeScript inventerebbe un conflitto su
  `Z` contro `+00:00` — **un 409 permanente che nessun ricaricamento sana**, cioè il difetto peggiore
  possibile su una porta di concorrenza. Mutante M2. Il confronto spedito è al **millisecondo**:
  rifiuta **meno** della RPC, che è il verso sicuro.

### B5 · l'elenco degli oggetti da provare era di **8**, gliene mancavano **5**

V. §3. È di nuovo «l'elenco che sembra completo e non lo è», la famiglia che questo progetto ha già
pagato quattro volte.

### B6 · un numero di riga, e va detto perché due documenti si contraddicevano

Il brief cita `PATCH /api/lavori/[id]:803`; la revisione del Task D-ter (m1) diceva «è **810**, non
809». **Ha ragione il brief:** `payload.updated_at = new Date().toISOString()` sta esattamente alla
riga **803**; la **810** è la `.select('id, numero_lavoro, stato, updated_at')`, cioè un'altra riga
citata per un'altra ragione. Nessuna deriva da correggere.

---

## 7. RITROVAMENTI FUORI MANDATO — riferiti, **non** corretti (R-E2)

**R1 · 🔴 Gli indici unici su `dichiarazioni_conformita` sono QUATTRO, e `atto-unico-errori.ts` ne
mappa TRE.** Confermato sul catalogo vivo — il panel l'aveva già riferito, io l'ho **misurato**:

```
ddc_evento_annulla_unique · ddc_lavoro_attiva_unique · ddc_sostituisce_unique
dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key   (+ la pkey)
```

`src/lib/dichiarazione/atto-unico-errori.ts:88-97` elenca i primi tre e **non** `ddc_lavoro_attiva_unique`.
Un `23505` su quell'indice cade fuori dalla classificazione → `throw` → **500 illeggibile** al banco.
Il commento sopra l'elenco dice «*I tre vincoli unici*»: la riga che sbaglia è anche quella che
rassicura.

**R2 · `src/hooks/useLavoroForm.ts:291` manda `atteso_updated_at: data.updated_at ?? null`.** Il
`?? null` sembra un ripiego prudente e non lo è: la rotta dei denti **rifiuta** un non-stringa con
un **422** (`denti/route.ts:104-109`), quindi quando `data.updated_at` manca l'utente legge
«Salvataggio denti fallito» senza sapere perché. (Non è il rischio che si potrebbe temere — non
**spegne** la guardia, perché la rotta non lascia passare `null` fino alla RPC — ma è un ramo che
non può riuscire e che nessuno ha dichiarato.)

**R3 · 🔴 `_audit_lavori` e D324.** `_audit_lavori` è **AFTER UPDATE** e registra `old_data`/`new_data`
per intero. Da oggi un aggiornamento **pinzato** produce una riga di audit in cui
`old_data.updated_at == new_data.updated_at`. **Il «registro del lavoro» di D324 nasce su quella
tabella**: se ordinasse o deduplicasse per quel campo, va saputo prima di progettarlo.

**R4 · I 409 adesso sono SETTE, e si distinguono ancora solo a parole.** Ne ho aggiunto uno — quello
anticipato — **col testo identico** a quello della RPC, di proposito: sono lo stesso fatto visto da
due punti. Ma resta vero ciò che il panel ha riferito: senza un codice leggibile a macchina, il
riquadro non può scegliere il gesto giusto fra «ricarica e rifai», «guarda prima di rifare» e
«ripremi e basta».

**R5 · Il lucchetto resta grossolano**, come dichiarato: anche a difetto chiuso, cambiare cassetta,
tracking o stato fa scattare il blocco. La forma definitiva — **il gettone sono le sei voci
stampate** — resta la destinazione dichiarata.

**R6 · `to_jsonb(OLD)`/`to_jsonb(NEW)` serializzano la riga intera due volte a ogni `UPDATE` di
`lavori`, che è larga. Su 299 righe è nulla; NON è stato misurato** su volumi maggiori.

**R7 · Un limite del predicato, scritto perché è meglio che farlo trovare:** `to_jsonb` confronta i
numerici **per valore**, non per forma testuale — su una colonna `numeric` un `10.0` che diventa
`10.00` si legge come «non è cambiato niente». Innocuo qui, ma è una proprietà, non un caso.

---

## 8. CHE COSA **NON** HO FATTO

- **Niente FASE 9 e niente gate estetico L2** — sono del Task D-bis, come dice il brief. ⚠️ E il
  Task D-bis dovrà guardare **due cose nuove sullo schermo vero**: il testo del riquadro di
  conflitto (dice che le correzioni restano) e il giro «409 → Ricarica e riprendi → il foglio si
  chiude → si rientra e le correzioni sono ancora lì». Le prove unitarie lo misurano; lo **schermo**
  no.
- **Non ho tenuto il foglio APERTO durante il rinfresco di «Ricarica e riprendi».** Il foglio si
  chiude e la pagina si rinfresca. Tenerlo aperto avrebbe risparmiato tre tocchi, ma
  `router.refresh()` a foglio aperto è un difetto **misurato sullo schermo vero il 07/08** e non
  potevo riprovarlo (niente FASE 9). Il costo che il brief chiamava «un giro intero da ridigitare»
  è comunque chiuso: le correzioni restano.
- **Non ho chiuso i sette 409 a codice** (R4): è un contratto di risposta, e cambiarlo tocca il
  riquadro e i suoi testi — un'ondata a sé.
- **Non ho toccato `atto-unico-errori.ts`** (R1) né `useLavoroForm.ts` (R2) né il registro di D324
  (R3): fuori mandato, R-E2.
- **Non ho misurato il costo di `to_jsonb`** su volumi veri (R6).
- **Non ho riprovato il conflitto falso end-to-end su due transazioni committate.** Il brief lo
  dichiara già provato («*non devi riprovarlo, devi chiuderlo*»), e ogni domanda che **discrimina
  fra le due forme candidate** è risolvibile con **una sola istruzione** in transazione annullata —
  perché il confronto è contro un `OLD` che viene da una transazione precedente. Una sonda a due
  transazioni avrebbe richiesto dati committati da ripulire a mano, senza aggiungere niente.
- **Non ho pubblicato niente** (`git push` non richiesto dal mandato).
- **BP-1 (MEMORY.md · ROADMAP-UFFICIALE.md) non l'ho aggiornata:** è di chi chiude l'ondata, non di
  un esecutore di un singolo compito. ⚠️ **Ma D323 va scritta lì**, e la migration nuova con lei.
