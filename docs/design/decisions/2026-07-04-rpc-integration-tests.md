# Test di integrazione reali per le RPC SECURITY DEFINER — Decisione (sessione 04/07/2026)

**Approvato da Francesco Formicola — 4 luglio 2026**

---

## Contesto

Durante B18 (hardening trasversale post-B3), scrivendo la copertura di test per il finding "i test della RPC verificano solo status code e argomenti passati a `svc.rpc(...)`, mai il comportamento SQL reale", è stato scoperto un bug critico (P0) in `salva_fasi_ciclo_atomico()`: la funzione soft-deletava ogni fase appena inserita nella stessa chiamata che la creava. Il bug è stato trovato per caso con verifiche manuali dirette contro il DB live (transazioni `BEGIN`/`ROLLBACK`, mai commit), risolto con un hotfix (`23e0d15`), e non era mai stato rilevato dall'unico test esistente (`cicli-fasi-patch-route.test.ts`) perché quel test mocka `svc.rpc(...)` per intero.

Il progetto non ha nessuna infrastruttura per testare automaticamente il comportamento SQL reale di una funzione RPC `SECURITY DEFINER` — solo mock a livello di route, o verifiche manuali one-off durante le sessioni di sviluppo (non ripetibili, non in CI).

## Opzioni valutate

**A — Supabase locale via Docker (`supabase start`)**
Isolamento completo, nessun rischio sui dati condivisi, `ubuntu-latest` (i runner GitHub Actions) ha Docker preinstallato quindi funzionerebbe anche in CI. **Scoperto durante la ricerca:** `supabase/migrations/` è incompleta — la `CREATE TABLE fasi_produzione` (e presumibilmente altre tabelle fondative) esiste solo in `supabase/schema.sql`, mai come migration discreta. `supabase db reset` oggi non ricostruirebbe lo schema reale: servirebbe prima un lavoro di consolidamento/baseline non banale. Richiede inoltre Docker Desktop sempre attivo in locale e ~1-2 minuti aggiuntivi in CI per l'avvio dei container.

**B — Endpoint live gated (solo su richiesta esplicita, mai in `npm test`)**
Userebbe le API REST/RPC reali via `supabase-js` contro il lab E2E dedicato. Nessuna nuova infrastruttura, ma il cleanup dipende da codice esplicito a fine test — un test che crasha a metà può lasciare residui reali sul progetto condiviso, e PostgREST esegue ogni richiesta nella propria transazione implicita (nessun controllo client-side per un rollback garantito).

**C — Transazione live con ROLLBACK garantito (scelta)**
Un client Postgres diretto (`pg`) apre una connessione al progetto live, esegue `BEGIN`, chiama la RPC via `SELECT funzione(...)`, verifica i risultati con query dirette, e in un blocco `finally` esegue sempre `ROLLBACK` — anche se un'asserzione lancia un errore a metà test. Nessuna nuova infrastruttura (il pacchetto `pg` è l'unica dipendenza nuova), nessun rischio di residuo per costruzione (non per disciplina di cleanup), testa il vero corpo PL/pgSQL della funzione. È l'automazione diretta della tecnica già usata manualmente per scoprire e verificare il fix del bug B18.

## Decisione

**Opzione C.** Motivazione: risolve esattamente il gap che ha causato il bug (mock che non esercita mai l'SQL reale), è utilizzabile da subito senza dover prima risolvere l'incompletezza dello schema in `supabase/migrations/` (prerequisito reale e non banale per l'opzione A), ed è strutturalmente più sicura della B (rollback automatico vs. cleanup esplicito). L'opzione A resta un'evoluzione possibile in futuro se servisse test locale offline completo — ma richiede prima un lavoro di baseline dello schema che è fuori scope qui.

**Trade-off accettato esplicitamente:** i test girano comunque contro il progetto Supabase condiviso (`iagibumwjstnveqpjbwq`), non un'istanza isolata — servono quindi una connection string diretta (rete + credenziale) e disponibilità del progetto live per eseguirli. Il rischio è mitigato dal `ROLLBACK` sempre eseguito: nessuna scrittura sopravvive al test, indipendentemente dall'esito.

## Implementazione

- Nuova dipendenza: `pg` (client Postgres diretto, non passa da PostgREST).
- Nuova cartella `tests/integration/` (separata da `tests/unit/`, non inclusa nel default `npm test`/`vitest run` — script dedicato `npm run test:integration`).
- Helper condiviso `tests/integration/helpers/pg-client.ts`: apre connessione, `BEGIN` prima di ogni test, `ROLLBACK` sempre in `finally`. Se `SUPABASE_DB_URL` non è impostata, i test si saltano puliti (`describe.skipIf`) invece di fallire — permette a `npm test`/CI esistente di restare invariato.
- Pilota su `salva_fasi_ciclo_atomico()` (candidato naturale, dato il precedente). Estensione alle altre RPC `SECURITY DEFINER` (`crea_rifacimento_atomico`, `accept_invito_rete_atomic`, `accept_invite_atomic`) valutata in un secondo momento, non in questa sessione.
- CI: nessuna modifica al job esistente (`quality`/`build` in `.github/workflows/ci.yml`). Un job opzionale separato per `test:integration` richiederebbe il secret `SUPABASE_DB_URL` in GitHub Actions — da configurare con Francesco, non aggiunto automaticamente in questa sessione.

## Non toccato

Nessuna infrastruttura Docker/Supabase locale creata (opzione A, scartata per questa sessione). Nessuna modifica al job CI esistente. Le altre RPC del progetto restano coperte solo da test con mock, come prima — solo `salva_fasi_ciclo_atomico()` ha copertura comportamentale reale dopo questo lavoro.
