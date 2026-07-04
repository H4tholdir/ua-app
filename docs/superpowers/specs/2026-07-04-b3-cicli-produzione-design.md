# B3 — Cicli di produzione non generano fasi per lavori nuovi

**Data:** 04/07/2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — B3 (🔴 Blocker)

## 1. Problema

`TabProduzione.tsx:72` promette "assegna un ciclo nella tab Dati", ma `TabDati.tsx` non ha mai avuto un selettore ciclo. Nessun codice materializza mai righe `lavori_fasi` da `fasi_produzione` alla creazione di un lavoro.

**Verifica sui dati reali di produzione (lab Filippo, 04/07/2026):**
- `cicli_produzione`: 140 righe, **non 1:1 con `tipo_dispositivo`** (fino a 93 cicli attivi sotto "Protesi fissa" — nessun vincolo DB oltre `UNIQUE(laboratorio_id, codice)`).
- `fasi_produzione`: 371 righe totali, **tutte sotto un unico ciclo pseudo-libreria** (`codice="LIBRERIA_OL"`, `tipo_dispositivo="Riferimento"`, import da DentalMaster OL01-OL71+). Gli altri 139 cicli reali hanno **zero fasi definite**. Nessuna struttura di raggruppamento-per-procedura recuperabile dai dati importati (verificato: `ordine` è 1→371 senza reset, nessuna colonna di raggruppamento).
- `lavori.ciclo_id`: 0/282 valorizzato. `lavori_fasi`: 0 righe, mai. La precedente nota in `MEMORY.md` ("277 lavori storici hanno fasi da migrazione") è quindi **falsa per lo stato attuale del DB** e va corretta a fine lavoro (BP-1).
- `lavori.tipo_dispositivo` (enum applicativo: `protesi_fissa`, `provvisorio`, `altro`, `implantologia`, `protesi_mobile`, `cad_cam`, `scheletrato`) **non coincide** con `cicli_produzione.tipo_dispositivo` (testo libero italiano importato) — niente match automatico di stringa.

**Due bug aggiuntivi scoperti analizzando lo stesso tab, inclusi in questo scope perché nello stesso file:**
- `LavoroFormClient.tsx:70-74` (`handleUpdateFase`): quando un tecnico segna l'esito di una fase in `TabProduzione`, la modifica aggiorna solo lo stato React locale — **non chiama mai l'API**. Si perde al refresh. L'endpoint `PATCH /api/lavori/[id]/fasi/[fase_id]/route.ts` esiste e funziona ma non viene mai invocato.
- Lo stesso endpoint (`ALLOWED_FIELDS`, righe 8-16) non permette di impostare `tecnico_id` — quindi anche corretto il bug sopra, **non risulterebbe mai chi ha eseguito la fase**, requisito esplicito Allegato XIII MDR.

**Fuori scope, tracciato separatamente in backlog:**
- B17 (Blocker) — le fasi, anche popolate, non compaiono in nessun PDF (`generate-ifu.ts` e altri caricano il dato ma non lo renderizzano).
- A19 (Alto) — nessun supporto per allegare il file di progettazione CAD/STL (`lavori.file_stl_url` mai scritto da nessuna UI).
- Popolare `fasi_produzione` per i 139 cicli reali (lavoro manuale di dominio di Francesco, tramite la nuova UI di questo piano — non automatizzabile, nessuna struttura recuperabile dall'import).
- Rigenerazione automatica di `lavori_fasi` quando si cambia ciclo su un lavoro già esistente (decisione: non farlo, per non cancellare tracciabilità già firmata).
- Mappatura tra i due sistemi di `tipo_dispositivo` (decisione: ricerca libera, nessun filtro rigido).

## 2. Architettura

### 2.1 Database — 1 migration, nessuna nuova tabella/colonna

Aggancio del trigger di audit generico già in produzione (`_audit_trigger_fn()`, usato oggi su `clienti`, `fatture`, `laboratori`, `lavori`, `listino`, `magazzino`, `utenti`) a due tabelle in più:

```sql
CREATE TRIGGER _audit_cicli_produzione AFTER INSERT OR DELETE OR UPDATE
  ON public.cicli_produzione FOR EACH ROW EXECUTE FUNCTION _audit_trigger_fn();

CREATE TRIGGER _audit_fasi_produzione AFTER INSERT OR DELETE OR UPDATE
  ON public.fasi_produzione FOR EACH ROW EXECUTE FUNCTION _audit_trigger_fn();
```

Nessuna `gen types` necessaria (nessuna colonna cambia), ma va comunque eseguito `npx tsc --noEmit` dopo la migration per la regola FASE 6b.

### 2.2 API nuove

- **`GET /api/cicli?q=`** — ricerca cicli per `codice`/`nome` (pattern identico a `GET /api/fornitori`/`GET /api/listino`: auth, scoping lab via `utenti.laboratorio_id` + service client, `.limit(8)`). Risposta: `{ cicli: [{id, codice, nome, tipo_dispositivo}] }`.
- **`GET /api/cicli/[id]/fasi`** — lista fasi di un ciclo, ordinate per `ordine`.
- **`GET /api/fasi-produzione/ricerca?q=`** — typeahead di supporto per "aggiungi da libreria": ricerca su tutte le `fasi_produzione` esistenti (oggi di fatto solo le 371 della pseudo-libreria) per `codice_fase`/`descrizione`, `.limit(8)`. Restituisce solo i campi da poter copiare (descrizione, attrezzatura, controllo_misura, ecc.), non un riferimento vivo alla riga.
- **`POST /api/cicli/[id]/fasi`** — aggiunge una fase al ciclo: o copiando i campi di un risultato scelto dalla ricerca sopra, o con testo libero inserito a mano. In entrambi i casi crea sempre una **nuova riga** `fasi_produzione` scoped al ciclo target (mai un riferimento condiviso — coerente col fatto che oggi `fasi_produzione.id` appartiene a un solo ciclo, nessuna relazione M:N). `ordine` assegnato in append (max attuale + 1).
- **`PATCH /api/cicli/[id]/fasi/[faseId]`** — modifica singola fase (descrizione, obbligatoria, attrezzatura, ecc.) o riordino (`ordine`).
- **`DELETE /api/cicli/[id]/fasi/[faseId]`** — soft delete (`deleted_at`).
- Tutte scoped a `laboratorio_id`, gating: nessuno specifico (visibile a tutti i ruoli, come richiesto — la tracciabilità è garantita dall'audit trigger, non da un blocco di ruolo).

### 2.3 API modificate

- **`POST /api/lavori`** — accetta `ciclo_id` opzionale nel body. Validato come gli altri FK (`cliente_id`/`tecnico_id`/`paziente_id`) prima dell'insert. Dopo l'insert del lavoro, se `ciclo_id` è presente: query `fasi_produzione` per quel ciclo (`deleted_at is null`, ordinate per `ordine`) → se non vuota, bulk insert in `lavori_fasi` (`lavoro_id`, `fase_id`, `laboratorio_id`, `tecnico_id: fase.responsabile_id ?? null`). Se il ciclo non ha fasi: nessun errore, nessuna riga generata. Se il bulk insert fallisce: il lavoro è già stato creato con successo, quindi si logga l'errore ma si risponde comunque 201 (le fasi si possono sempre aggiungere/correggere dopo; non deve bloccare la creazione di un lavoro).
- **`PATCH /api/lavori/[id]/fasi/[fase_id]`** — aggiunto `tecnico_id` alla logica: quando il body imposta `esito` (diverso da null), il server **risolve da solo** il `tecnico_id` dell'utente loggato (`svc.from('tecnici').select('id').eq('utente_id', user.id).eq('laboratorio_id', labId).single()`, stesso pattern già usato in `tecnici/[id]/cedolino/route.ts` e `tecnici/[id]/produttivita/route.ts`) e lo scrive insieme a `esito`/`eseguita_at` — **non si fida di un `tecnico_id` passato dal client**, per non permettere che un tecnico attribuisca il lavoro a un altro. Se l'utente loggato non ha un record `tecnici` collegato (es. titolare/admin che segna una fase), `tecnico_id` resta quello già presente o null — non è un errore bloccante.

## 3. Componenti UI

- **`CicloComboBox.tsx`** (nuovo) — gemello di `ClienteComboBox.tsx`: ricerca libera via `/api/cicli?q=`, max 8 risultati, `tipo_dispositivo` mostrato come etichetta secondaria in ogni risultato (nessun filtro).
- **`TabDati.tsx`** — nuovo campo facoltativo "Ciclo di produzione" con `CicloComboBox`.
- **`TabProduzione.tsx`** — 2 modifiche: (1) `handleUpdateFase` chiama davvero `fetch(PATCH /api/lavori/[id]/fasi/[fase_id])` (pattern identico a `handleSegnaRisolta`), con rollback dello stato locale se la risposta non è ok; (2) messaggio empty-state differenziato: "Nessun ciclo assegnato — assegnalo nella tab Dati" vs "Ciclo assegnato ma nessuna fase ancora definita per questo ciclo" (quest'ultimo sarà il caso comune finché Francesco non popola i cicli più usati).
- **Nuova pagina "Cicli di produzione"** — nuova route top-level `/cicli-produzione`, sibling di `/listino` e `/magazzino` (non sotto `/impostazioni`, che è riservato a profilo/abbonamento/account): coerente col fatto che è un catalogo operativo visibile a tutti i ruoli, non un'impostazione di account. Lista cicli cercabile; click apre editor fasi (pattern `RischiEditor.tsx`: lista dinamica riordinabile, aggiungi da libreria o testo libero, rimuovi), footer con "Ultima modifica di {nome utente} il {data}" letto da `audit_log` filtrato su `table_name IN ('cicli_produzione','fasi_produzione')` e `row_id = ciclo.id` (o dei suoi fasi). Visibile a tutti i ruoli, inclusa la voce di navigazione.

## 4. Testing

- TDD sulle nuove route (`GET /api/cicli`, CRUD `/api/cicli/[id]/fasi`): 401/403/200/edge case, stesso standard delle route recenti (B10).
- Test su `POST /api/lavori` esteso: creazione con ciclo che ha fasi (genera N `lavori_fasi`), con ciclo senza fasi (0 righe, nessun errore), senza ciclo (comportamento invariato).
- Test di regressione su `handleUpdateFase`/`TabProduzione`: verifica che venga chiamato `fetch` con i campi corretti, incluso il fatto che il client non invia mai `tecnico_id` (lo risolve solo il server).
- QA manuale in browser reale sui 3 viewport, lab E2E isolato (mai il lab Filippo) — verificare in particolare che il click su un esito di fase persista dopo un reload di pagina (regressione diretta del bug trovato).

## 5. Note per l'implementazione

- Nessuna migration tocca RLS/Stripe/FatturaPA/auth — non scatta l'override "dominio critico" del workflow, ma la migration (trigger audit) resta comunque soggetta a FASE 6b (verifica `tsc` dopo l'applicazione).
- BP-1 a fine lavoro: correggere in `MEMORY.md` la nota falsa sui "277 lavori storici con fasi da migrazione".
