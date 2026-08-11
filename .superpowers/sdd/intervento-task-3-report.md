# Referto — Task 3, ondata «si deve sempre poter intervenire»

**Mandato:** `.superpowers/sdd/intervento-task-3-brief.md` — la RPC `riapri_lavoro_atomica`, nuova,
senza i cancelli fiscali di `annulla_consegna_atomica`.
**Rami letti (per intero):** `.superpowers/sdd/intervento-task-3-brief.md` ·
`docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md` (tutta, §7 e §6 in
particolare) · `scripts/tmp/vivo-annulla_consegna_atomica.sql` · `scripts/tmp/sonda-intervento-r-p1.mjs`
(il modello di sonda) · `supabase/migrations/20260806140823_eventi_qualita.sql` ·
`supabase/migrations/20260806142910_correzione_eventi_qualita_cross_tenant.sql` ·
`supabase/migrations/20260806170700_d274_difetti_vivi_intervento.sql` ·
`tests/integration/eventi-qualita-schema.rpc.test.ts` (modello di prova) ·
`tests/integration/annulla-effetti-storno-td04.rpc.test.ts` (modello per creare `fatture`/`lavori`
di prova) · `tests/integration/helpers/pg-client.ts` · `src/lib/consegna/orchestrate.ts` ·
`src/lib/consegna/costanti.ts` · `src/app/api/lavori/pronti-da-fatturare/route.ts` ·
`supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql` ·
`supabase/migrations/20260710091500_rpc_consegna_annullo_atomiche.sql`.
**Rami NON letti:** il resto del piano (`docs/superpowers/plans/2026-08-06-intervento-post-consegna.md`)
oltre il blocco «Task 3» e il perimetro «§7 collisione D265×D269» già citato dal mandato ·
i Task 4-6 (fuori mandato).

---

## 1. Stato

| Cosa | Esito |
|---|---|
| Migration scritta | `supabase/migrations/20260806210400_riapri_lavoro_atomica.sql` — **NON applicata al DB** |
| Test di integrazione | `tests/integration/riapri-lavoro-atomica.rpc.test.ts` — **12/12 passano**, DB reale |
| `npx tsc --noEmit` | 0 errori |
| `npx vitest run tests/unit` | 432 file, **5168/5168** passano |
| `npx next build` | riuscito (82 pagine, incluse tutte le API route) |
| FASE 6b (`gen types`) | eseguito — **diff vuoto**, e va letto come «non ancora in catalogo», non come «verificato» (vedi §3) |
| Divergenza dal piano trovata e RISOLTA (non solo riferita) | il filtro `dichiarazioni_conformita` — 4 stati, non 3 (vedi §2) |

## 2. La divergenza dal corpo vivo — trovata, e risolta DIVERGENDO dal corpo vivo

Il mandato dice di leggere il corpo vivo di `annulla_consegna_atomica` dal catalogo (non dal file)
per portare via il ripristino e il fail-closed. L'ho fatto con una sonda fresca
(`scripts/tmp/sonda-t3-r-p1.mjs`, esito in `scripts/tmp/sonda-t3-esito.txt`), e ho trovato due
differenze fra il corpo vivo e la bozza di SQL nel brief:

**a) Il filtro sulla dichiarazione.** Il corpo vivo filtra
`stato IN ('bozza','generata','firmata')` — **tre stati**. La bozza del brief (e del piano) ne
elenca **quattro**, con `'consegnata'` in più. Ho verificato quale dei due è corretto per la
funzione NUOVA, non copiato nessuno dei due alla cieca:

- la CHECK viva (`dichiarazioni_conformita_stato_check`) ammette `'consegnata'` come quinto stato;
- **nella vecchia funzione l'omissione è inerte**: gira dentro una finestra di 10 minuti, dove una
  DdC arriva a 'consegnata' solo per un caso di corsa improbabile;
- **nella funzione nuova NON è inerte**: gira ad arbitraria distanza di tempo — proprio il dominio
  in cui una DdC può essere legittimamente 'consegnata'. Con tre stati, una riapertura su un lavoro
  con DdC 'consegnata' non la annulla (0 righe), la conta totale è >0 → **la funzione lancia
  `dichiarazione in stato incoerente` e la riapertura fallisce**: esattamente il blocco che D265
  vieta;
- e ho verificato l'effetto collaterale, non solo intuito: `ddc_lavoro_attiva_unique` è
  `WHERE stato <> 'annullata'` (`20260710090000:14-17`) — una `'consegnata'` lasciata viva
  terrebbe occupato lo slot attivo e romperebbe anche la riemissione successiva (§8.1).

**Decisione: 4 stati** (`'bozza','generata','firmata','consegnata'`), non copiando il corpo vivo
alla lettera. Non è un capriccio: con 4 stati il fail-closed diventa **più severo**, non più
permissivo — l'unico modo di raggiungere ancora il `RAISE` è una DdC che non è in *nessuno* stato
non-annullata del vocabolario, cioè il vero caso incoerente. Provato nel test «DdC in stato
"consegnata"» (§4), che verifica anche che lo slot resta libero dopo.

**b) I quattro campi in più nel ripristino.** Il corpo vivo azzera anche `consegna_in_corso`,
`consegna_tap_at`, `proposta_dentista`, `proposta_at` — non solo `conformato`/`data_conformazione`
che il mandato citava come esempio. Il commento vivo spiega perché: «la proposta pre-annullo non
deve rinascere alla riconsegna». Lo stesso rischio vale per la riapertura (anche lei rimanda il
lavoro a 'pronto', e un lavoro riaperto può essere riconsegnato). Ho conservato tutti e quattro. Il
filtro `deleted_at IS NULL` sulla SELECT iniziale è stato conservato per lo stesso motivo (un lavoro
con soft-delete non va riaperto). Provato nel test «ripristino completo» (§4).

**Perché non è scope creep sul cancello commerciale (§7):** `proposta_dentista`/`proposta_at` sono
la proposta di fatturazione del dentista via portale — un dato *procedurale* legato al ciclo di
consegna, non la fattura. Azzerarli non tocca `incluso_in_fattura` né `decisione_fatturazione`, che
restano intatti (provato nel test «lavoro CON FATTURA EMESSA», §4): la fattura resta un fatto a sé,
il cancello commerciale resta dove deve stare.

## 3. FASE 6b — l'avvertenza sul diff vuoto

```
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq
```
**Esito:** diff **0 righe** contro `src/types/database.types.ts` attuale. Questo NON significa
«verificato»: significa che la migration non è applicata, quindi `riapri_lavoro_atomica` non è
ancora nel catalogo che `gen types` legge. Il file `database.types.ts` **non è stato toccato** —
non c'era niente da rigenerare. Va rilanciato **dopo** che Francesco applica la migration (comando
in §6).

## 4. Le prove (R-P1) — output reale

```
npx vitest run tests/integration/riapri-lavoro-atomica.rpc.test.ts --reporter=verbose
```
```
 ✓ lavoro CON FATTURA EMESSA: riapre comunque — esito ok, non fattura_gia_emessa 957ms
 ✓ p_evento_id inesistente → evento_non_valido (rifiuto) 1462ms
 ✓ p_evento_id di UN ALTRO LAVORO (stesso laboratorio) → evento_non_valido (rifiuto) 704ms
 ✓ cross-tenant: lab B chiama sul lavoro di lab A → non_trovato, riga di A intatta 756ms
 ✓ lavoro in stato "pronto" (non consegnato) → non_consegnato (rifiuto) 722ms
 ✓ lavoro inesistente → non_trovato (rifiuto) 485ms
 ✓ lavoro con deleted_at IS NOT NULL → non_trovato (rifiuto, anche se stato="consegnato") 665ms
 ✓ DdC in stato "consegnata": viene annullata e lo slot attivo resta libero 776ms
 ✓ fail-closed: DdC esistente ma GIÀ tutta annullata → RAISE EXCEPTION 723ms
 ✓ nessuna dichiarazione per il lavoro (dato legacy) → ok, ddc_assente=true 643ms
 ✓ ripristino completo: pronto + i 4 campi extra azzerati 779ms
 ✓ permessi: solo service_role può eseguire la RPC (PUBLIC/anon/authenticated no) 484ms

 Test Files  1 passed (1)
      Tests  12 passed (12)
```

Ogni test applica la migration (testo del file) **dentro la transazione annullata** con
`client.query(readFileSync(...))` — `CREATE OR REPLACE FUNCTION` è DDL transazionale in Postgres, e
il `ROLLBACK` di `withRollback` fa sparire tutto, incluso il `REVOKE`/`GRANT`. Controprova che la
funzione NON è rimasta nel catalogo vero dopo la suite:

```
riapri_lavoro_atomica in catalogo (deve essere 0): 0
```

**Le prove di rifiuto, coi valori che DOVEVANO essere respinti:**

1. **Cancello fiscale — Passo 2 del brief.** Lavoro con fattura `stato_sdi='accettata'` collegata →
   `esito:'ok'`. Se fosse tornato `fattura_gia_emessa` avrei riusato la funzione sbagliata: non è
   tornato. `incluso_in_fattura` e `decisione_fatturazione` restano intatti dopo — il cancello
   commerciale non si sposta, semplicemente non è qui.
2. **`p_evento_id` inesistente** → `evento_non_valido`, lavoro non toccato (`stato` resta
   `'consegnato'`).
3. **`p_evento_id` di un ALTRO lavoro** (stesso laboratorio) → `evento_non_valido` — non basta che
   l'evento esista, deve essere di *questo* lavoro (D263: mai senza motivo proprio).
4. **Cross-tenant** — `p_laboratorio_id` di un secondo laboratorio creato nella transazione,
   `p_lavoro_id` del primo → `non_trovato`, e la riga del primo laboratorio resta `'consegnato'`
   dopo la chiamata. `SECURITY DEFINER` bypassa la RLS: il filtro `laboratorio_id` scritto a mano
   nella funzione è la SOLA protezione tenant, e questa è la prova che tiene.
5. **Lavoro non consegnato** (`stato='pronto'`) → `non_consegnato`.
6. **Lavoro inesistente** → `non_trovato`.
7. **Lavoro con `deleted_at` non nullo** (ma `stato='consegnato'`) → `non_trovato` — prova del
   filtro portato via dal corpo vivo.
8. **Fail-closed — la garanzia conservata.** Unica dichiarazione del lavoro già `'annullata'` (né
   presente nel filtro dei 4 stati né assente) →
   `RAISE EXCEPTION 'riapertura: dichiarazione in stato incoerente per lavoro %'`, catturato con
   `expect(...).rejects.toThrow(/dichiarazione in stato incoerente/)`. Se questa riga sparisse, la
   funzione tacerebbe su un dato incoerente — è esattamente ciò che il mandato vieta.

**Controprove (perché le prove sopra provino qualcosa, non un caso limite isolato):**
9. **`ddc_assente`** — zero dichiarazioni per il lavoro → `esito:'ok', ddc_assente:true` (dato
   legacy, non blocca).
10. **DdC `'consegnata'`** → annullata correttamente, e `count(*) WHERE stato <> 'annullata'` = 0
    dopo: lo slot di `ddc_lavoro_attiva_unique` resta libero (la prova diretta della decisione §2a).
11. **Ripristino completo** — i 9 campi del `UPDATE lavori` verificati uno per uno dopo la chiamata.
12. **Permessi dal catalogo** — `has_function_privilege` per `anon`/`authenticated` = `false`,
    `service_role` = `true`. Indipendente dal ruolo della connessione (che è `postgres`, proprietario
    delle tabelle): la query legge il catalogo, non esegue come quei ruoli.

## 5. Autorevisione

- **Ho seguito il brief alla lettera dove diceva di farlo, e me ne sono scostato dove diceva di
  verificare sul catalogo** — e in quel punto (§2a) la verifica ha smentito la bozza SQL del
  brief stesso, non solo il file di migration. Ho documentato la divergenza nel commento della
  migration (righe 22-47), non solo nel referto: chi legge la migration in futuro trova il perché
  senza dover ritrovare questo file.
- **Ho verificato empiricamente, non per intuito**, che 4 stati rendono il fail-closed più severo e
  non più permissivo, prima di scegliere 4 sul corpo vivo che ne usa 3.
- **Non ho toccato nessuna migration già applicata** (Task 1/Task 2): `20260806140823`,
  `20260806142910`, `20260806170700` sono stati letti, non modificati.
- **Non ho applicato la migration al database** (vincolo esplicito del mandato) — verificato con
  una query di controllo che la funzione non è nel catalogo dopo la suite di test.
- **Non ho lanciato la guardia navigazione-overlay né toccato UI**: questo task non tocca nessuna
  superficie.
- **Non ho aggiornato `MEMORY.md`/`ROADMAP-UFFICIALE.md`**: la BP-1 di quest'ondata si scrive a
  fine ondata (come fatto dopo Task 1 e Task 2), non dentro ogni singolo task — coerente con lo
  storico dei commit precedenti di questa stessa ondata.
- **Convenzione di casa sul `REVOKE`**: il brief scriveva `REVOKE EXECUTE ON FUNCTION`; le quattro
  RPC precedenti nel progetto (`consegna_finalizza_atomica`, `annulla_consegna_atomica` ×2,
  `portale_pin_tentativo_fallito`) usano `REVOKE ALL ON FUNCTION`. Per le funzioni le due sono
  equivalenti (`EXECUTE` è il solo privilegio revocabile); ho usato `REVOKE ALL` per coerenza di
  stile col resto del progetto — nessun effetto comportamentale, provato dal test permessi (§4.12).

## 6. Da applicare — comando esatto (Francesco)

**La migration NON è applicata al database.** Comando (lo stesso, con lo stesso esito atteso, usato
dal Task 1 di questa stessa ondata — `intervento-task-1-report.md` §10-11.5):

```bash
npx supabase db push
```

**Dopo l'applicazione**, rigenerare i tipi (il diff questa volta NON sarà vuoto — conterrà la nuova
firma RPC):

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

## 7. RITROVAMENTI — fuori mandato, riferiti non corretti (R-E2)

1. 🟠 **Un lavoro riaperto e già fatturato (`incluso_in_fattura=true`) torna `stato='pronto'` e
   quindi di nuovo consegnabile** (`isStatoConsegnabile`, `src/lib/consegna/costanti.ts:4`), e
   `orchestrate.ts` non controlla mai `incluso_in_fattura` durante la consegna: nessun avviso
   all'operatore che sta riconsegnando un lavoro il cui gestionale considera ancora "già
   fatturato" (verificato: `/api/lavori/pronti-da-fatturare` non lo riporta in lista, filtra
   `stato='consegnato'` — nessun doppio conteggio, solo nessun avviso). Tema per il Task 4+/UI,
   non per questa RPC.
2. **`FrameConsegnato.tsx:32`** e gli altri consumatori di `FINESTRA_ANNULLO_MS`/
   `isStatoConsegnabile` censiti dalla spec §12 non sono stati toccati (fuori mandato — Task 4/5).
3. Nessun altro difetto vivo trovato dentro il perimetro attraversato. I due difetti E8/TRUNCATE
   già noti su `valutazioni_evento`/`eventi_qualita` erano già chiusi dal Task 1 prima che iniziassi.
