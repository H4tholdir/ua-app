# Cicli di produzione — creazione, modifica, cancellazione

**Data:** 6 luglio 2026
**Stato:** approvato da Francesco, pronto per piano implementativo

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

## Design

### 1. Migration

```sql
ALTER TABLE cicli_produzione
  ADD COLUMN created_by UUID REFERENCES utenti(id);
```

Nullable — i cicli esistenti non hanno un creatore tracciato retroattivamente. Nessun'altra modifica di schema: `updated_by`, `deleted_at`, `attivo` esistono già dal B3 (`20260704120000_b3_cicli_fasi_audit.sql`).

### 2. API — 3 route

**`POST /api/cicli`** (nuova)
- Body: `{ nome: string, codice: string, tipo_dispositivo: string, classe_rischio?: string }`
- Valida: `nome`/`codice`/`tipo_dispositivo` non vuoti (400 altrimenti); `classe_rischio`, se presente, deve essere uno dei 4 valori del CHECK constraint (400 altrimenti)
- Verifica unicità `codice` nel laboratorio (query preventiva o cattura del vincolo UNIQUE) → 409 con messaggio chiaro se duplicato
- Insert con `laboratorio_id` (dalla sessione), `created_by` e `updated_by` = utente corrente, `attivo = true`
- Ritorna `{ ciclo: { id, codice, nome, tipo_dispositivo, classe_rischio } }` (201)

**`PATCH /api/cicli/[id]`** (nuova — distinta da `PATCH /api/cicli/[id]/fasi`, che resta invariata)
- Body: stessi campi di POST, tutti opzionali (allowlist esplicita, stesso principio già applicato in `PATCH /api/lavori/[id]`) — accetta anche `attivo: boolean` per attivare/disattivare
- Stessa validazione `classe_rischio`/unicità `codice` (esclude se stesso dal check duplicato)
- Verifica `laboratorio_id` cross-tenant (stesso pattern di `PATCH /api/cicli/[id]/fasi`)
- Aggiorna `updated_by` = utente corrente
- Ritorna `{ ciclo: {...} }` (200) o 404 se non trovato/altro laboratorio

**`DELETE /api/cicli/[id]`** (nuova)
- Verifica `laboratorio_id` cross-tenant
- Query `SELECT count(*) FROM lavori WHERE ciclo_id = :id` (nessun filtro su `lavori.deleted_at` — anche un lavoro storico/soft-cancellato deve continuare a bloccare la cancellazione, per non rompere retroattivamente un documento QMS già emesso)
- Se count > 0 → 409 `{ error: "Ciclo in uso da N lavoro/i — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni." }`
- Altrimenti: soft-delete (`deleted_at = now()`), 200 `{ ok: true }`

### 3. UI

**`/cicli-produzione` (lista):** nuovo bottone "+ Nuovo ciclo" (stesso stile pill/FAB già in uso altrove) che apre `CicloNuovoSheet` — bottom sheet con campi Nome, Codice, Tipo dispositivo (select, riusa le opzioni già definite in `ListinoNuovoSheet.tsx`/`TabDati.tsx`), Classe di rischio (select con opzione vuota, stesse 4 opzioni già in `ListinoNuovoSheet.tsx`). Al salvataggio riuscito: redirect a `/cicli-produzione/[nuovo-id]` (dove l'utente prosegue con `CicloFasiEditor`, già esistente, per definire le fasi).

**`/cicli-produzione/[id]` (dettaglio):**
- Bottone "Modifica" vicino all'header, apre lo stesso `CicloNuovoSheet` (componente riusato, prop `mode: 'create' | 'edit'`) precompilato con i valori correnti, PATCH invece di POST.
- Bottone "Elimina" (stile identico a `MagazzinoDeleteButton.tsx`: `window.confirm()` → `fetch DELETE` → redirect a `/cicli-produzione` su successo, `alert()` del messaggio d'errore se 409/altro).
- Riga "Creato da {nome} {cognome} il {data}" accanto alla già esistente "Ultima modifica di...", stesso query pattern (join su `utenti` via `created_by`, gestendo il caso `created_by = null` per i cicli storici — riga omessa in quel caso).

### 4. Testing

TDD per tutte e 3 le route (`tests/unit/cicli-route.test.ts` o file dedicati per route):
- POST: 201 happy path con tutti i campi, 201 senza `classe_rischio` (facoltativa), 400 campi obbligatori mancanti, 400 `classe_rischio` non valida, 409 `codice` duplicato nello stesso laboratorio, `created_by`/`updated_by` impostati correttamente
- PATCH: 200 aggiornamento parziale, 404 cross-tenant/non trovato, 409 duplicato codice (escludendo se stesso), `updated_by` aggiornato
- DELETE: 200 se nessun lavoro referenzia il ciclo, 409 se almeno un lavoro lo referenzia (incluso un lavoro soft-cancellato), 404 cross-tenant

Component test per `CicloNuovoSheet` (validazione client-side, chiamata POST/PATCH corretta a seconda di `mode`) e per il bottone Elimina (conferma richiesta, messaggio d'errore mostrato su 409).

## Fuori scope

- Editing di `normative_json` (normative armonizzate) sul ciclo — non richiesto, YAGNI.
- Gating di ruolo — esplicitamente escluso da Francesco per questo lavoro.
- Retrofit di `created_by` sui cicli esistenti (rimane `null` per i cicli storici, nessun backfill).
