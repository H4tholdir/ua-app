# B8 (2/5) — `/listino/nuovo`: CTA "Nuova voce" 404

**Data:** 03 luglio 2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — B8 (🔴 Blocker, 2 delle 5 route)
**Stato:** In design → implementazione

---

## 1. Contesto

`listino/page.tsx:51` mostra una CTA "Nuova voce" che punta a `/listino/nuovo`, route mai creata → 404. `POST /api/listino` esiste già e funziona (`src/app/api/listino/route.ts`), manca solo la UI. A differenza di B8 (1/5, magazzino), qui la CTA è **sempre visibile in header** (non solo nell'`EmptyState`) — il 404 è quindi raggiungibile da chiunque apra `/listino` con voci già presenti, non solo a listino vuoto.

**Scoperte aggiuntive durante il design (fuori dal bug originale ma nello stesso spazio del problema), risolte con Francesco:**

1. **Permessi mancanti.** `page.tsx` calcola già `canEdit = ruolo === 'titolare' || ruolo === 'admin_rete'` e lo usa per mostrare/nascondere modifica ed eliminazione per riga (`ListinoVoceRow`), ma la CTA "Nuova voce" in header è oggi visibile a **tutti i ruoli** indipendentemente da `canEdit`. Inoltre `POST /api/listino` non verifica il ruolo lato server — qualunque utente autenticato del lab può creare una voce via API, a prescindere dalla UI. **Decisione:** gating completo — CTA visibile solo se `canEdit`, e `POST /api/listino` verifica il ruolo server-side con 403 se non `titolare`/`admin_rete`.
2. **Categoria come select vincolato, non testo libero.** Lo schema DB (`ANALISI/23_ua_database_schema.md:646-652`) vincola `categoria` con `CHECK (categoria IN ('protesi_fissa','protesi_mobile','implantologia','cad_cam','ortodonzia','scheletrato','riparazione','materiale','altro'))`. `ListinoEditSheet.tsx` (pattern esistente per la modifica) usa oggi un input testo libero per `categoria` — accettabile in modifica perché il valore di partenza è già valido, ma rischioso in creazione: un valore libero non conforme farebbe fallire l'INSERT con un errore Postgres di violazione CHECK non gestito (500 grezzo). **Decisione:** nel nuovo form di creazione, `categoria` è un `<select>` con le 9 opzioni fisse. Non si tocca `ListinoEditSheet.tsx` (fuori scope, nessuna regressione da introdurre lì).
3. **Campi MDR nel form di creazione.** `POST /api/listino` accetta già `tipo_dispositivo_mdr` (testo libero, es. "Corona in zirconia monolitica"), `classe_rischio` (enum `classe_i`/`classe_iia`/`classe_iib`/`classe_iii`, `CHECK` a DB) e `da_conformare` (booleano, default `true`), ma nessuno di questi è esposto in `ListinoEditSheet.tsx`. **Decisione:** il nuovo form di creazione li espone (a differenza dell'edit sheet esistente, che resta invariato), così il titolare classifica il dispositivo fin dalla creazione della voce invece di non avere mai un editor per farlo.

**Verificato, non un problema:** `listino.codice` **non ha vincolo UNIQUE** a schema — nessun rischio di violazione 23505 in creazione, a differenza di B8 (1/5) su `magazzino.codice_articolo`. Nessuna gestione duplicati da aggiungere.

---

## 2. Design

### 2.1 Pattern UI: bottom sheet, non nuova route

Niente pagina `/listino/nuovo`. Il `<Link href="/listino/nuovo">` in `listino/page.tsx:51` viene rimosso e sostituito da un nuovo componente client che possiede sia il bottone sia lo sheet, sul modello di `ListinoEditSheet.tsx` (stesso stile bottom sheet, `motion`/`hapticLight`). A differenza di B8 (1/5), `listino/page.tsx` non necessita di un wrapper client che possiede lo stato lista — resta un Server Component; il nuovo componente è autonomo e al salvataggio ricarica la pagina con `window.location.reload()`, esattamente come fa già `ListinoEditSheet.onSaved`.

### 2.2 Componenti

- **Nuovo** `src/components/features/listino/ListinoNuovoSheet.tsx` (client component), gemello di `ListinoEditSheet.tsx`.
  Nessuna prop di input dati (a differenza dell'edit sheet non parte da una voce esistente); espone internamente sia il bottone trigger sia lo sheet.
- **Modificato** `src/app/(app)/listino/page.tsx`:
  - `addButton` (righe 47-73) non è più un `<Link>` ma il rendering di `<ListinoNuovoSheet />`, **condizionato a `canEdit`**: se `!canEdit`, `AppHeader` riceve `actions={undefined}` — nessuna CTA per ruoli non abilitati.

### 2.3 Campi form

Tutti in un unico sheet (nessuna sezione avanzata collassabile: il numero di campi è contenuto, a differenza di magazzino):

- `nome` * (text)
- `codice` * (text) — verrà uppercased server-side dalla POST esistente, nessuna trasformazione lato client necessaria
- `categoria` * — `<select>` con le 9 opzioni fisse dello schema (`protesi_fissa`, `protesi_mobile`, `implantologia`, `cad_cam`, `ortodonzia`, `scheletrato`, `riparazione`, `materiale`, `altro`), nessun default preselezionato forzato (l'utente sceglie esplicitamente)
- `unita_misura` (text, default `pz` — coerente col default DB `pezzo`... nota: la POST esistente default a `'pz'` se non fornito, mentre la colonna DB default è `'pezzo'`; il form invia sempre un valore esplicito quindi la discrepanza di default non si manifesta qui, non è nello scope di questo fix)
- `descrizione` (text)
- `prezzo_1`, `prezzo_2`, `prezzo_3`, `prezzo_4` (number)
- `tipo_dispositivo_mdr` (text libero)
- `classe_rischio` — `<select>` con le 4 opzioni MDR + opzione vuota "Non specificata" (invia `null`)
- `da_conformare` (checkbox, default `true`)

Validazione client: `nome`, `codice`, `categoria` obbligatori prima del submit (rispecchia la validazione 422 già presente server-side).

### 2.4 Data flow

1. Utente con `canEdit` clicca "+ Nuova voce" in header → si apre lo sheet.
2. Compila il form, submit → validazione client sui 3 campi obbligatori.
3. `POST /api/listino` con body completo (tutti i campi sopra).
4. Server: verifica auth (401), verifica `laboratorio_id` (403), **verifica ruolo `titolare`/`admin_rete` (403, nuovo controllo)**, valida `codice`/`nome`/`categoria` non vuoti (422, già esistente), insert.
5. 201 → chiudi sheet → `window.location.reload()` (stesso pattern di `ListinoEditSheet`).
6. Errore (403/422/500) → messaggio inline nello sheet, nessun fail silenzioso, sheet resta aperto con i dati compilati.

### 2.5 Modifiche a `POST /api/listino` (`src/app/api/listino/route.ts`)

- Estendere la select `utenti` da `.select('laboratorio_id')` a `.select('laboratorio_id, ruolo')`.
- Dopo la verifica `laboratorio_id`, aggiungere: se `utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete'` → `403 { error: 'Non autorizzato a creare voci di listino' }`.
- Nessuna modifica alla `GET` (resta accessibile a tutti i ruoli del lab, usata anche da chi non ha `canEdit` per consultare il listino).
- Nessuna modifica alla logica di insert/validazione esistente (già corretta e sufficiente).

### 2.6 Error handling

- Client: submit disabilitato se campi obbligatori vuoti; su risposta non-2xx, messaggio di errore leggibile nello sheet (mai un errore Postgres grezzo, dato che la POST già restituisce `error.message` — da verificare che resti un messaggio user-friendly per i casi CHECK-violation residui, es. `classe_rischio` invalido: essendo un `<select>` vincolato lato client il caso non dovrebbe presentarsi in pratica).
- Server: 401 non autenticato, 403 laboratorio non trovato o ruolo non abilitato (nuovo), 422 campi obbligatori mancanti, 500 solo per errori DB imprevisti.

### 2.7 Testing

- **Nuovo test route-level** per `POST /api/listino` (nessun test esistente sulla route oggi):
  - 403 per ruolo `tecnico`/`front_desk` che tentano la creazione
  - 201 per `titolare`/`admin_rete` con assert espliciti su tutti i campi MDR (`tipo_dispositivo_mdr`, `classe_rischio`, `da_conformare`) nel body inviato — stesso rigore richiesto dalla review finale di B8 (1/5)
  - 422 per campi obbligatori mancanti (regressione sul comportamento esistente)
- **Test component** `ListinoNuovoSheet`: rendering del bottone solo se montato (il gating `canEdit` è responsabilità di `page.tsx`, verificato lì), submit success (reload chiamato) ed errore (messaggio mostrato, sheet resta aperto), select `categoria` limitata alle 9 opzioni, select `classe_rischio` limitata alle 4 + vuota.
- **QA manuale:** 3 viewport (390/768/1280), light+dark, keyboard-accessibile (bottone e sheet raggiungibili da tastiera), verifica che un utente `tecnico`/`front_desk` non veda alcuna CTA "Nuova voce" in header (solo lettura listino).

---

## 3. Fuori scope (non toccato in questa sessione)

- Refactoring di `ListinoEditSheet.tsx` per condividerlo con il nuovo sheet di creazione (valutato come approccio B in brainstorming, scartato: più rischio/scope di quanto serva per un bugfix 404).
- Migrazione di `categoria` a select anche nell'edit sheet esistente (la stessa inconsistenza — testo libero vs CHECK constraint — resta lì, pre-esistente, non introdotta né aggravata da questo lavoro).
- Discrepanza tra default `unita_misura` della POST (`'pz'`) e default colonna DB (`'pezzo'`) — innocua nello scope attuale perché il form invia sempre un valore esplicito.
