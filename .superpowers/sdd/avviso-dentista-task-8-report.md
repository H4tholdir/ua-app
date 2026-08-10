# Task 8 — resoconto: la sezione «Avvisi dal laboratorio» nel portale del dentista

**Brief:** `.superpowers/sdd/avviso-dentista-task-8-brief.md` · **BASE:** `b8fba0f3` · **Ramo:** `intervento-post-consegna`
**Commit:**
- `8625854a` — `feat(avvisi): la sezione «Avvisi dal laboratorio» nel portale del dentista (Task 8, D346/D354)`
- `9cea1339` — `test(avvisi): prova esplicita D336 su costruisciCardAvviso`

---

## 0. Cosa ho fatto, in una riga

Il portale del dentista mostra ora, sopra i lavori in corso, una card per ogni lavoro con almeno un avviso: numero, badge «Aggiornata», paziente, la frase di ciò che è stato corretto (unione dei campi di tutti gli avvisi di quel lavoro), la data dell'avviso più recente, e — quando c'è una dichiarazione ancora viva — il chip per scaricarla. L'apertura scrive l'audit `view_avviso` e, tramite una nuova funzione `SECURITY DEFINER`, la ricevuta di lettura `visto_dal_dentista_at` su ogni riga mostrata (mai riscritta al secondo giro).

---

## 1. Domande fatte prima di cominciare — nessuna bloccante

Ho letto il brief per intero prima di scrivere codice. Non ho trovato ambiguità che giustificassero fermarmi a chiedere: i valori esatti (badge, chip, colori, D354) erano tutti specificati. Ho invece trovato e risolto da solo un punto che il brief non affrontava esplicitamente — v. §3.

---

## 2. Il punto trovato cercando dove il brief potesse sbagliare

**Il chip di download e la rotta esistente potevano disaccordarsi.** Il brief dice di riusare il pattern `.neq('ddc.stato', 'annullata')` per trovare la dichiarazione viva di un lavoro — e così ho fatto. Ma la rotta che serve davvero il file, `src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts:45-52`, aggiunge **anche** `.eq('stato', 'consegnato')` sul lavoro. Se un lavoro con dichiarazione viva potesse trovarsi in uno stato diverso da `consegnato`, il chip avrebbe puntato a un link morto (404).

Ho verificato l'invariante «dichiarazione viva ⟺ lavoro consegnato» leggendo tre RPC (`correggi_e_riemetti_atomica` non tocca mai `lavori.stato` — D299, commento riga 19-23 di `.../dichiarazione/riemetti/route.ts` — e richiede una dichiarazione già viva; `riapri_lavoro_atomica` e `riporta_a_pronto_atomica` **entrambe** richiedono `stato = 'consegnato'` come precondizione e, quando riportano a `pronto`, annullano **tutte** le dichiarazioni non ancora annullate di quel lavoro). Poi l'ho **misurata sul banco vero** (sonda in transazione annullata, §5): oggi tutte le dichiarazioni vive appartengono a lavori `consegnato` — l'invariante regge.

Invece di fidarmi solo del ragionamento, **`costruisciCardAvviso` ripete lo stesso predicato della rotta** (`stato === 'consegnato' && ddcStoragePathPdf`), non un secondo predicato che spera di coincidere: se un giorno l'invariante si rompesse, il chip e la rotta sbaglierebbero insieme, mai uno dei due soltanto. La **card** invece non porta questo cancello — ⚖️ D354 vieta un filtro di stato sull'avviso, quindi un lavoro riaperto (senza dichiarazione viva) mostra comunque la sua card, senza chip.

---

## 3. Evidenza TDD

### RED (prima dell'implementazione)

`tests/unit/avvisi-portale.test.ts` scritto contro un modulo inesistente → **fallito per import mancante** (conferma che le prove parlano col codice vero, non con un finto già in memoria).

Poi **abbozzo inerte** (`src/lib/avvisi/portale.ts` con funzioni che tornano `[]`/`''`/`false`) e conteggio:

```
Test Files  1 failed (1)
     Tests  23 failed | 4 passed (27)
```

**23 su 27** si accendono sull'abbozzo inerte (R-P4). I 4 verdi sono i casi il cui atteso coincide banalmente col vuoto (`[]`/`true` su input vuoto, dove uno stub vuoto passa per caso — non un difetto della prova, un limite noto del conteggio già discusso nel Task 6).

### GREEN

Dopo l'implementazione vera: `tests/unit/avvisi-portale.test.ts` → **28/28** (27 iniziali + 1 prova D336 esplicita aggiunta in autorevisione, v. §7).

Forme d'input enumerate (R-P4):
- `raggruppaPerLavoro`: nessun avviso · due lavori diversi · due avvisi sullo stesso lavoro (unione) · stesso campo in due avvisi (niente doppioni) · data dal più recente indipendentemente dall'ordine di input · tutti gli id accumulati · ordine dei gruppi.
- `fraseAvviso`: zero/uno/due/tre campi · campo obsoleto (ripiego) · **D336 esplicita** (v. §7).
- `costruisciCardAvviso`: gruppo senza lavoro risolto (id esclusi dal visto) · paziente minimizzato · fallback su descrizione · chip con DdC viva+consegnato · niente chip senza DdC (card resta) · niente chip se DdC viva ma lavoro non consegnato (riaperto).
- `lavoriPerLeCard`: lavoroIds vuoto (nessuna query) · tutti i filtri di isolamento asseriti singolarmente · embed ddc oggetto/array/assente · guasto di lettura.
- `segnaAvvisiVisti`: ids vuoto (nessuna RPC) · chiamata per nome di argomento · guasto RPC.

`tests/integration/avvisi-segna-visti.rpc.test.ts` → **9/9**, contro il banco vero (`SUPABASE_DB_URL` presente in locale, girano anche fuori CI): UPDATE diretto rifiutato · scrittura al primo giro · **nessuna riscrittura al secondo giro** (misurata: stesso timestamp esatto) · due id in un giro solo · scoping cross-tenant (lab sbagliato → 0 righe) · EXECUTE solo a `service_role` · nomi degli argomenti dal catalogo · array vuoto · id inesistente.

---

## 4. La migration

**File:** `supabase/migrations/20260810072748_avvisi_segna_visti.sql`
**Nome:** `date -u "+%Y%m%d%H%M%S"` in comando separato → `20260810072748` (pavimento precedente `20260809133546` — più alto, D311 rispettata).
**Applicata:** sì, autonomamente — `npx supabase db push --linked --yes` → `"upToDate":false,"dryRun":false,"migrations":["20260810072748_avvisi_segna_visti.sql"] … "Finished supabase db push."`

### Deviazione dalla firma suggerita — dichiarata

Il brief suggeriva `(p_ids uuid[])`. Ho scritto **`(p_ids uuid[], p_laboratorio_id uuid)`** — un parametro in più, per allinearmi all'UNICO precedente in casa (`valutazione_supera`, che scopa sempre per laboratorio anche quando l'id del chiamante basterebbe da solo). Il rischio pratico senza quel parametro era già basso — gli id arrivano da `archivioCliente`, già scoped per cliente+laboratorio — ma il costo di aggiungerlo è nullo e la difesa in profondità è coerente col trattamento che questo progetto riserva a ogni `SECURITY DEFINER`. Misurato: un id vero con `p_laboratorio_id` sbagliato non tocca la riga (sonda §5 e test d'integrazione).

### FASE 6b

```
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit   # pulito
```
Nessuna riga CLI da rimuovere in fondo al file (verificato: `wc -l` e `grep -n "^export const Constants"` → un'unica occorrenza a fine file).

`Functions.avvisi_segna_visti` generato: `Args: { p_ids: string[]; p_laboratorio_id: string }` — combacia esattamente con la chiamata in `segnaAvvisiVisti`.

---

## 5. Le sonde sul catalogo vivo — output incollato

**EXECUTE — solo `service_role`:**
```
SELECT grantee FROM information_schema.role_routine_grants
 WHERE routine_schema='public' AND routine_name='avvisi_segna_visti'
   AND privilege_type='EXECUTE' AND grantee IN ('anon','authenticated','service_role','PUBLIC');
```
```
┌─────────┬────────────────┐
│ (index) │ grantee        │
├─────────┼────────────────┤
│ 0       │ 'service_role' │
└─────────┴────────────────┘
```

**`has_function_privilege` — negato ad anon/authenticated, concesso a service_role:**
```
┌─────────┬──────────┬───────────────────┬──────────────────┐
│ (index) │ anon_puo │ authenticated_puo │ service_role_puo │
├─────────┼──────────┼───────────────────┼──────────────────┤
│ 0       │ false    │ false             │ true             │
└─────────┴──────────┴───────────────────┴──────────────────┘
```

**Nomi degli argomenti (per la chiamata per nome via PostgREST):**
```
SELECT pg_get_function_arguments('public.avvisi_segna_visti'::regproc);
→ 'p_ids uuid[], p_laboratorio_id uuid'
```

**Un giro completo su un avviso reale del lab E2E, in transazione annullata (`BEGIN … ROLLBACK`):**
```
prima_del_giro            → null
esito_primo_giro          → { esito: 'ok', aggiornati: 1 }
dopo_primo_giro           → 2026-08-10T07:30:52.560Z
esito_secondo_giro        → { esito: 'ok', aggiornati: 0 }
dopo_secondo_giro         → 2026-08-10T07:30:52.560Z   ← IDENTICO al primo giro, MAI riscritto
esito_lab_sbagliato       → { esito: 'ok', aggiornati: 0 }
dopo_lab_sbagliato        → 2026-08-10T07:30:52.560Z   ← ancora invariato
```

**L'invariante chip⟺rotta, sui dati reali:**
```sql
SELECT l.stato, count(*) FROM dichiarazioni_conformita d
  JOIN lavori l ON l.id = d.lavoro_id WHERE d.stato <> 'annullata' GROUP BY l.stato;
```
```
┌─────────┬──────────────┬─────┐
│ (index) │ stato        │ n   │
├─────────┼──────────────┼─────┤
│ 0       │ 'consegnato' │ '2' │
└─────────┴──────────────┴─────┘
```
Nessuna riga con `stato <> 'consegnato'`: l'invariante regge oggi. Il codice non si fida solo di questo — ripete il predicato della rotta, come spiegato in §2.

Transazione **annullata** (`ROLLBACK` confermato in coda all'output): nessun residuo sul banco.

---

## 6. File toccati

| File | Cosa |
|---|---|
| `supabase/migrations/20260810072748_avvisi_segna_visti.sql` | nuovo — la funzione SECURITY DEFINER |
| `src/lib/avvisi/portale.ts` | nuovo — logica testabile: `raggruppaPerLavoro`, `fraseAvviso`, `lavoriPerLeCard`, `costruisciCardAvviso`, `segnaAvvisiVisti` |
| `src/app/portale/[token]/page.tsx` | sezione «Avvisi dal laboratorio», `AvvisoCard`, `formatDataAvviso`, scrittura audit+visto |
| `src/lib/portale/audit.ts` | `AzionePortale` guadagna `view_avviso` (16 → 17) |
| `src/types/database.types.ts` | rigenerato (FASE 6b) |
| `tests/unit/avvisi-portale.test.ts` | nuovo — 28 prove unitarie |
| `tests/integration/avvisi-segna-visti.rpc.test.ts` | nuovo — 9 prove contro il banco vero |

**Non toccato, deliberatamente:** `src/lib/avvisi/queries.ts` (`archivioCliente` riusata com'è, senza cancello di ruolo aggiunto — quello è mandato del Task 9) · `src/lib/avvisi/messaggio.ts` (il file si dichiara «due funzioni, separate di proposito»; la frase del portale vive nel nuovo modulo, non lì) · la rotta di download (il suo filtro `stato='consegnato'` resta suo, io lo rispecchio, non lo modifico).

---

## 7. Autorevisione

- **D336 (valore vecchio mai)**: soddisfatta per costruzione — `campi_corretti` porta solo nomi di campo, mai valori, quindi nessuna funzione di questo modulo riceve un dato da cui un valore vecchio potrebbe entrare. Aggiunta una **prova esplicita** (non solo l'argomento strutturale): un gruppo che dichiara corretto «il paziente» unito a un lavoro con nome (`ROSSI MARIO`) e descrizione (`Corona`) veri e riconoscibili — la frase non li contiene mai, `pazienteMostrato` resta un campo separato che non si scambia con la frase.
- **Zero avvisi → niente scrittura del visto**: verificato — sia l'audit `view_avviso` sia `segnaAvvisiVisti` sono dentro `if (avvisiCards.length > 0)`, e gli id passati a `segnaAvvisiVisti` vengono da `avvisiCards` (POST-filtro sui lavori risolti), non dai gruppi grezzi: un gruppo il cui lavoro non si risolve non riceve un visto per qualcosa che il dentista non ha visto.
- **Fuso orario**: `formatDataAvviso` passa `timeZone: 'Europe/Rome'` esplicito — il processo gira in UTC su Vercel, e un `created_at` delle 00:30 di Roma senza fuso esplicito avrebbe mostrato il giorno prima.
- **La frase evita l'accordo di genere/numero**: il mockup approvato scriveva «sono cambiati/e X e Y», ma un participio unico non può concordare con un'unione arbitraria di voci di generi diversi (mascolile/femminile, singolare/plurale). Ho tenuto l'apertura del mockup («La dichiarazione è stata rifatta:») e tolto il secondo verbo, chiudendo con l'elenco nudo — grammaticalmente corretto per ogni combinazione. **Deviazione dichiarata dal mockup**, motivata dalla stessa ragione grammaticale che mi hai segnalato in revisione.
- **RPC per nome, non per posizione**: `segnaAvvisiVisti` chiama `svc.rpc('avvisi_segna_visti', { p_ids, p_laboratorio_id })` — oggetto con le chiavi, non posizionale. Verificato sia via test unitario (`toHaveBeenCalledWith`) sia via sonda sul catalogo vivo (`pg_get_function_arguments`) sia via test d'integrazione con `p_ids => …, p_laboratorio_id => …` espliciti.

### Riserve

- **Gate estetico L2 (D245) differito, non saltato.** Questo task aggiunge markup nuovo (una sezione, una card, un badge, un chip) — è ASPETTO, quindi il gate sarebbe dovuto prima del merge. Il brief lo assegna esplicitamente al **Task 10** («FASE 9 accorpata al Task 10 — la fixture nasce solo dalla riemissione vera del giro completo»), e questo vale anche per il gate L2 che la FASE 9 precede: non ho una fixture di portale con avvisi reali da fotografare a 390/768/1280 in light — il tema scuro non esiste su questa superficie (D347). **Chi esegue il Task 10 deve farsi carico anche di questo gate**, non solo della FASE 9 browser.
- **Il caso di confine della ricevuta parziale** (referto D354 §4) resta deciso-di-non-deciderlo, come da mandato: non l'ho toccato.
- **L'invariante chip⟺rotta è misurata su OGGI**, non garantita dallo schema (nessun CHECK/trigger la impone). Se un giorno un nuovo percorso rompesse quella relazione, `costruisciCardAvviso` e la rotta sbaglierebbero **insieme** (stesso predicato) invece che uno dei due soltanto — ma un lavoro con dichiarazione viva e stato diverso da `consegnato` mostrerebbe comunque la card, semplicemente senza chip. Nessuna azione richiesta ora; lo segnalo perché è un'assunzione, non un fatto strutturale.

---

## 8. Verifica finale (FASE 7)

```
npx tsc --noEmit          → pulito
npx vitest run             → 471 file, 6143 test passati, 5 skip (pre-esistenti, non miei)
npx next build              → pulito, /portale/[token] presente fra le rotte dinamiche
```

Pre-commit (lint-staged + guardie di progetto) verde su entrambi i commit: DS compliance, guardia CSRF, guardia coerenza documenti, guardia salvataggio automatico.
