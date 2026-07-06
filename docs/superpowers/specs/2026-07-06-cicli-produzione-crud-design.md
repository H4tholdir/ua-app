# Cicli di produzione — creazione, modifica, cancellazione

**Data:** 6 luglio 2026
**Stato:** approvato da Francesco, verificato con advisor + schema reale, pronto per piano implementativo (v2)

## Contesto

Durante la QA browser manuale di B5 è emerso che l'app non ha alcun modo di creare un ciclo di produzione (`cicli_produzione`) via UI o API — esiste solo:
- `GET /api/cicli` — ricerca/autocomplete (usata da `CicloComboBox` nel form lavoro)
- `PATCH /api/cicli/[id]/fasi` (RPC `salva_fasi_ciclo_atomico`) — gestisce le **fasi** di un ciclo già esistente
- `/cicli-produzione` — pagina lista (sola lettura)
- `/cicli-produzione/[id]` — pagina dettaglio con `CicloFasiEditor` (editor fasi di un ciclo già esistente)

Non esiste nessuna route per creare, modificare i campi base (`nome`, `codice`, `tipo_dispositivo`, `classe_rischio`) o cancellare un ciclo. Questo blocca l'assegnazione di un ciclo di produzione a un lavoro nuovo in un laboratorio senza cicli già seedati (es. lab E2E), e più in generale rende il modulo "cicli di produzione" incompleto: si può solo modificare le fasi di qualcosa che deve già esistere.

## Decisioni prese con Francesco

- **Nessun gating di ruolo** sulla creazione/modifica/cancellazione — chiunque sia autenticato nel laboratorio, ma con tracciamento esplicito di chi ha creato (`created_by`, nuovo) e chi ha modificato l'ultima volta (`updated_by`, già esistente dal B3).
- **Pattern UI: bottom sheet**, non pagina intera — stesso pattern di `ListinoNuovoSheet.tsx` (creazione) e stile coerente con `MagazzinoDeleteButton.tsx` (cancellazione via `window.confirm()`).
- **Cancellazione bloccata se il ciclo è referenziato da almeno un lavoro** (query su `lavori.ciclo_id`) — protegge la tracciabilità MDR (Scheda di Fabbricazione, Art. 10(9) MDR) di lavori che risalgono la catena `lavori_fasi → fasi_produzione → cicli_produzione`. Il campo `attivo` (già esistente) resta lo strumento per nascondere un ciclo dalle nuove assegnazioni senza cancellarlo.
- **`classe_rischio` facoltativa alla creazione** — verificato che non è un requisito normativo MDR: la classificazione di rischio legalmente vincolante per la Dichiarazione di Conformità è quella sul singolo lavoro (`lavori.classe_rischio`, già `NOT NULL`, alimenta `generate-ddc.ts`), non quella sul ciclo di produzione. Il campo su `cicli_produzione` è già `nullable` nello schema — nessun cambiamento di vincolo necessario, solo non renderlo obbligatorio lato form/API.
- **`normative_json`** (normative armonizzate del ciclo) resta fuori scope di questo lavoro — nessuna richiesta di editarlo in questa fase, evitare di aggiungerlo per non allargare lo scope (YAGNI).

## Verifica post-approvazione (advisor + schema reale, 6 luglio)

Prima di scrivere il piano, la spec iniziale è stata verificata contro lo schema Supabase reale e il codice esistente. Tre correzioni sono emerse (integrate nel Design sotto):

1. **`cicli_produzione_laboratorio_id_codice_key`** è un UNIQUE constraint pieno (non parziale) su `(laboratorio_id, codice)` — verificato con `pg_constraint`. Senza fix, un `codice` non è mai riusabile dopo un soft-delete. Stesso bug già risolto per `fasi_produzione` in B18 (`20260704140000_b18_fasi_produzione_partial_unique_index.sql`) — stesso fix qui. Pre-check eseguito: 140 righe, 0 soft-deletate, nessun duplicato `(laboratorio_id, codice)` — migration sicura.
2. **`listino.ciclo_id`** (FK `fk_listino_ciclo`, oggi 0 righe la usano) è un riferimento distinto da `lavori.ciclo_id`: è un default suggerito su un template di listino, non un record storico MDR. Non deve bloccare la cancellazione (semantica diversa da `lavori.ciclo_id`) — va invece nullato in automatico al soft-delete, per non lasciare un listino che punta silenziosamente a un ciclo cancellato.
3. **`GET /api/cicli`** oggi filtra solo `deleted_at IS NULL`, non `attivo`. Il filtro `attivo = true` va aggiunto **solo al branch di ricerca testuale (`q`)**, mai al branch di lookup per `id` (usato per idratare `CicloComboBox` su un lavoro già salvato) — altrimenti disattivare un ciclo dopo che un lavoro lo referenzia fa sparire il campo (blank) da un lavoro esistente già salvato.

### 1. Migration

```sql
ALTER TABLE cicli_produzione
  ADD COLUMN created_by UUID REFERENCES utenti(id);

-- Fix B18-style: il vincolo UNIQUE pieno blocca il riuso di un codice
-- dopo un soft-delete. Sostituito con indice parziale sulle righe attive.
-- Pre-check 06/07: 140 righe, 0 soft-deletate, nessun duplicato (laboratorio_id, codice).
ALTER TABLE cicli_produzione
  DROP CONSTRAINT cicli_produzione_laboratorio_id_codice_key;

CREATE UNIQUE INDEX cicli_produzione_laboratorio_id_codice_active_key
  ON cicli_produzione (laboratorio_id, codice)
  WHERE deleted_at IS NULL;
```

Nullable — i cicli esistenti non hanno un creatore tracciato retroattivamente. Nessun'altra modifica di schema: `updated_by`, `deleted_at`, `attivo` esistono già dal B3 (`20260704120000_b3_cicli_fasi_audit.sql`).

**FASE 6b obbligatoria dopo questa migration:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → rimuovere il messaggio CLI in fondo al file → `npx tsc --noEmit`.

### 2. API — 3 route

Tutte e 3 replicano esattamente il pattern già in uso in `PATCH /api/cicli/[id]/fasi`: `isSameOrigin(req)` (403 se fallisce, CSRF) → `getServerUserClient()` per `auth.getUser()` (401 se assente) → `getServiceClient()` (RLS bypassata) per risolvere `laboratorio_id` da `utenti` (403 se assente) → tutte le query successive filtrate manualmente su quel `laboratorio_id`, mai un client con RLS implicita.

**`POST /api/cicli`** (nuova)
- Body: `{ nome: string, codice: string, tipo_dispositivo: string, classe_rischio?: string }`
- Valida: `nome`/`codice`/`tipo_dispositivo` non vuoti (400 altrimenti); `tipo_dispositivo` deve essere uno dei valori della lista canonica ciclo (vedi §3 UI — 400 se fuori lista); `classe_rischio`, se presente, deve essere uno dei 4 valori del CHECK constraint (400 altrimenti)
- Verifica unicità `codice` nel laboratorio (query preventiva o cattura del vincolo — ora indice parziale, quindi il check riguarda solo le righe attive) → 409 con messaggio chiaro se duplicato
- Insert con `laboratorio_id` (dalla sessione), `created_by` e `updated_by` = utente corrente, `attivo = true`
- Ritorna `{ ciclo: { id, codice, nome, tipo_dispositivo, classe_rischio } }` (201)

**`PATCH /api/cicli/[id]`** (nuova — distinta da `PATCH /api/cicli/[id]/fasi`, che resta invariata)
- Body: stessi campi di POST, tutti opzionali (allowlist esplicita, stesso principio già applicato in `PATCH /api/lavori/[id]`) — accetta anche `attivo: boolean` per attivare/disattivare
- Stessa validazione `classe_rischio`/`tipo_dispositivo`/unicità `codice` (esclude se stesso dal check duplicato)
- Verifica `laboratorio_id` cross-tenant (stesso pattern di `PATCH /api/cicli/[id]/fasi`)
- Aggiorna `updated_by` = utente corrente
- Ritorna `{ ciclo: {...} }` (200) o 404 se non trovato/altro laboratorio

**`DELETE /api/cicli/[id]`** (nuova)
- Verifica `laboratorio_id` cross-tenant (ownership del ciclo verificata prima di procedere)
- Query `SELECT count(*) FROM lavori WHERE ciclo_id = :id` (nessun filtro su `lavori.deleted_at` — anche un lavoro storico/soft-cancellato deve continuare a bloccare la cancellazione, per non rompere retroattivamente un documento QMS già emesso). `lavori.ciclo_id` è la FK diretta e viva verso il ciclo (impostata alla creazione del lavoro insieme alla generazione di `lavori_fasi`, non uno snapshot disaccoppiato) — verificarla è corretto e sufficiente.
- Se count > 0 → 409 `{ error: "Ciclo in uso da N lavoro/i — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni." }`
- Altrimenti: `UPDATE listino SET ciclo_id = NULL WHERE ciclo_id = :id AND laboratorio_id = :labId` (nulla un eventuale default-suggerimento su un articolo di listino — non blocca la cancellazione, il riferimento è un suggerimento mutabile, non un record storico), poi soft-delete (`deleted_at = now()`), 200 `{ ok: true }`

### 3. UI

**Lista canonica `tipo_dispositivo` per i cicli — NUOVA, dedicata, non riusare `TIPO_OPTIONS` di `TabDati.tsx`.** Verificato che `cicli_produzione.tipo_dispositivo` non ha CHECK constraint a DB (testo libero) e che i valori realmente in uso oggi (140 righe) sono testo italiano leggibile — un dominio completamente diverso dall'enum a slug usato da `lavori.tipo_dispositivo` (`protesi_fissa`, `cad_cam`, ecc. — nessun join tra i due campi, il valore sul ciclo è solo mostrato come tag in `CicloComboBox`). Riusare `TIPO_OPTIONS` scriverebbe slug al posto di testo leggibile e romperebbe la coerenza con le 140 righe esistenti.

```ts
const TIPO_DISPOSITIVO_CICLO_OPTIONS = [
  'Protesi fissa',
  'Protesi mobile',
  'Protesi combinata',
  'Protesi provvisoria',
  'Protesi scheletrica',
  'Protesi ortodontica',
]
```

("Riferimento" — 1 riga su 140, dato anomalo — escluso dalla lista canonica.) In modalità `edit`, se il valore corrente del ciclo non è tra queste opzioni (es. proprio "Riferimento", o un valore storico diverso), va unito alle opzioni del select così l'editing non lo cancella/cambia silenziosamente.

**`/cicli-produzione` (lista):** nuovo bottone "+ Nuovo ciclo" (stesso stile pill/FAB già in uso altrove) che apre `CicloNuovoSheet` — bottom sheet con campi Nome, Codice, Tipo dispositivo (select su `TIPO_DISPOSITIVO_CICLO_OPTIONS` sopra), Classe di rischio (select con opzione vuota, stesse 4 opzioni già in `ListinoNuovoSheet.tsx`). Al salvataggio riuscito: redirect a `/cicli-produzione/[nuovo-id]` (dove l'utente prosegue con `CicloFasiEditor`, già esistente, per definire le fasi).

**`/cicli-produzione/[id]` (dettaglio):**
- Bottone "Modifica" vicino all'header, apre lo stesso `CicloNuovoSheet` (componente riusato, prop `mode: 'create' | 'edit'`) precompilato con i valori correnti, PATCH invece di POST.
- Bottone "Elimina" (stile identico a `MagazzinoDeleteButton.tsx`: `window.confirm()` → `fetch DELETE` → redirect a `/cicli-produzione` su successo, `alert()` del messaggio d'errore se 409/altro).
- Riga "Creato da {nome} {cognome} il {data}" accanto alla già esistente "Ultima modifica di...", stesso query pattern (join su `utenti` via `created_by`, gestendo il caso `created_by = null` per i cicli storici — riga omessa in quel caso).

**`GET /api/cicli` (esistente, da modificare):** aggiungere `.eq('attivo', true)` **solo sul branch di ricerca testuale (`q`)**, mai sul branch di lookup per `id`. Motivo: il lookup per `id` idrata `CicloComboBox` quando si apre un lavoro già salvato — se un ciclo viene disattivato *dopo* essere stato assegnato a un lavoro, il campo deve continuare a mostrare il ciclo su quel lavoro esistente (non sparire), ma deve sparire dall'autocomplete per nuove assegnazioni. La pagina lista `/cicli-produzione` resta invariata (filtra solo `deleted_at`, mostra anche i disattivati — corretto per una vista di gestione, idealmente con badge "disattivato").

### 4. Testing

TDD per tutte e 3 le route (`tests/unit/cicli-route.test.ts` o file dedicati per route):
- POST: 201 happy path con tutti i campi, 201 senza `classe_rischio` (facoltativa), 400 campi obbligatori mancanti, 400 `tipo_dispositivo`/`classe_rischio` non validi, 409 `codice` duplicato nello stesso laboratorio, 201 se il `codice` era di un ciclo soft-deletato (verifica indice parziale), `created_by`/`updated_by` impostati correttamente
- PATCH: 200 aggiornamento parziale, 404 cross-tenant/non trovato, 409 duplicato codice (escludendo se stesso), `updated_by` aggiornato
- DELETE: 200 se nessun lavoro referenzia il ciclo, 409 se almeno un lavoro lo referenzia (incluso un lavoro soft-cancellato), 404 cross-tenant, `listino.ciclo_id` nullato su cancellazione riuscita
- `GET /api/cicli`: test di regressione che il lookup per `id` di un ciclo disattivato (`attivo = false`) continua a ritornarlo, mentre la ricerca `q` lo esclude

Component test per `CicloNuovoSheet` (validazione client-side, chiamata POST/PATCH corretta a seconda di `mode`, unione del valore corrente fuori-lista in modalità edit) e per il bottone Elimina (conferma richiesta, messaggio d'errore mostrato su 409).

## Fuori scope

- Editing di `normative_json` (normative armonizzate) sul ciclo — non richiesto, YAGNI.
- Gating di ruolo — esplicitamente escluso da Francesco per questo lavoro.
- Retrofit di `created_by` sui cicli esistenti (rimane `null` per i cicli storici, nessun backfill).
- Unificazione tassonomica tra `cicli_produzione.tipo_dispositivo` (testo libero italiano) e `lavori.tipo_dispositivo` (enum a slug) — nessun join esistente tra i due campi, i due domini restano separati; un'eventuale unificazione è un task di data-modeling a sé, fuori da questo lavoro.
