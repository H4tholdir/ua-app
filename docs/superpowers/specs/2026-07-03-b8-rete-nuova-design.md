# B8 (4/5) — `/rete/nuova`: CTA "Crea rete" 404

**Data:** 03 luglio 2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — B8 (🔴 Blocker, 4 delle 5 route)
**Stato:** In design → implementazione

---

## 1. Contesto

`rete/page.tsx:148` mostra una CTA "Crea rete" che punta a `/rete/nuova`, route mai creata → 404. `POST /api/rete` esiste già e funziona (`src/app/api/rete/route.ts`): crea la riga in `reti` e inserisce automaticamente il lab creatore come `admin_rete` in `reti_membri`. Manca solo la UI.

Pagina già gated interamente server-side: `rete/page.tsx:45` calcola `isAdminRete = ruolo === 'admin_rete' || ruolo === 'titolare'` e, se falso, mostra solo un messaggio informativo — nessun contenuto rete, nessuna CTA, per nessun altro ruolo. Non serve gating aggiuntivo sulla CTA stessa.

**Scoperta strutturale durante il design (stesso pattern già visto in B8 1/5 magazzino):** la CTA "Crea rete" esiste **solo nell'empty state** (`retiConMembri.length === 0`, righe 125-167). Se il lab è già admin di una rete, non esiste alcun bottone persistente per crearne una seconda — a differenza di listino/magazzino, qui però questo non è un bug: **discusso con Francesco, confermato che il modello è "al massimo una rete per lab admin"** (coerente col piano commerciale Rete PRO venduto per lab). La CTA resta quindi solo nell'empty state; non va replicata in header.

**Scoperta collaterale, decisione presa con Francesco:** `POST /api/rete` oggi non impedisce a un lab di creare una seconda rete — nessun controllo server-side, nessun vincolo UNIQUE a DB su `reti.admin_laboratorio_id` (schema: `supabase/migrations/002_fase2_schema.sql:524-534`). Con la UI che nasconde la CTA dopo la prima rete, il varco resta comunque aperto a chi chiama l'API direttamente (devtools/curl). **Decisione:** aggiungere un guard server-side (409 se il lab è già `admin_laboratorio_id` di una rete esistente) — stesso principio di difesa-in-profondità già applicato in B8 (2/5) per il gating ruolo di `/api/listino`.

**Verificato, non un problema:** `/rete/[id]` ("Gestisci rete →", riga 277) è **B8 (5/5)**, non ancora costruita — fuori scope qui. Di conseguenza il flusso di creazione non può fare redirect lì: dopo la `POST` si ricarica `/rete` con `window.location.reload()`, stesso pattern di listino/magazzino. Il fatto che "Gestisci rete →" porti anch'essa a un 404 è il bug preesistente che B8 (5/5) risolverà separatamente, non aggravato da questo lavoro.

---

## 2. Design

### 2.1 Pattern UI: bottom sheet, non nuova route

Niente pagina `/rete/nuova`. Il `<Link href="/rete/nuova">` in `rete/page.tsx:148-166` viene rimosso e sostituito da un nuovo componente client, gemello di `ListinoNuovoSheet.tsx`: bottone trigger + bottom sheet, form a un solo campo. Scelta bottom sheet (non pagina intera come B8 3/5) perché il form è minimale — un solo campo obbligatorio (`nome`), nessuna lista dinamica che giustifichi una pagina dedicata.

`rete/page.tsx` resta un Server Component: nessun wrapper client per possedere stato lista (a differenza di B8 1/5 magazzino, qui non serve — il nuovo componente è autonomo e ricarica la pagina al salvataggio).

### 2.2 Componenti

- **Nuovo** `src/components/features/rete/RetiNuovaSheet.tsx` (client component), gemello di `ListinoNuovoSheet.tsx`: stesso stile bottom sheet (`motion`/`AnimatePresence`, `hapticLight`/`hapticMedium`), stesso pattern di stato (`open`, `saving`, `error`, `form`).
  Nessuna prop di input — form vuoto al mount, reset alla chiusura.
- **Modificato** `src/app/(app)/rete/page.tsx`:
  - Righe 148-166 (`<Link href="/rete/nuova">Crea rete</Link>`) sostituite da `<RetiNuovaSheet />`, nello stesso punto dell'empty state. Nessuna altra modifica: il gating `isAdminRete` a monte (riga 47) copre già l'intera sezione.

### 2.3 Campi form

Un solo campo:

- `nome` * (text) — unico campo accettato da `POST /api/rete` oltre a quanto calcolato server-side (`admin_laboratorio_id` deriva sempre da `utente.laboratorio_id`, mai dal client).

Validazione client: `nome` non vuoto prima del submit (rispecchia la 422 già presente server-side).

### 2.4 Data flow

1. Utente (`titolare`/`admin_rete`, già filtrato da `isAdminRete` a monte) con lab senza rete propria clicca "Crea rete" nell'empty state → si apre lo sheet.
2. Compila `nome`, submit → validazione client (campo non vuoto).
3. `POST /api/rete` con `{ nome: string }`.
4. Server: verifica auth (401), verifica `laboratorio_id` (403), verifica ruolo `titolare`/`admin_rete` (403, già esistente), **verifica che il lab non sia già admin di una rete (409, nuovo)**, valida `nome` non vuoto (422, già esistente), insert `reti` + insert `reti_membri` (`admin_rete`).
5. 201 → chiudi sheet → `window.location.reload()`.
6. Errore (403/409/422/500) → messaggio inline nello sheet, sheet resta aperto con i dati compilati.

### 2.5 Modifiche a `POST /api/rete` (`src/app/api/rete/route.ts`)

Dopo la verifica di ruolo esistente (`utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete'` → 403) e prima del parsing del body, aggiungere:

```
const { data: reteEsistente } = await svc
  .from('reti')
  .select('id')
  .eq('admin_laboratorio_id', labId)
  .maybeSingle()

if (reteEsistente) {
  return NextResponse.json(
    { error: 'Il laboratorio amministra già una rete' },
    { status: 409 }
  )
}
```

Nessuna migration: nessun vincolo UNIQUE aggiunto a DB (decisione esplicita — un check applicativo è sufficiente per la regola di prodotto attuale, senza introdurre un constraint rigido che complicherebbe un eventuale cambio futuro). Nessuna modifica alla `GET` né alla logica di insert esistente.

### 2.6 Error handling

- Client: submit disabilitato/bloccato se `nome` vuoto; su risposta non-2xx, messaggio leggibile nello sheet (mai un errore Postgres grezzo — la POST restituisce sempre `error.message` o un messaggio esplicito).
- Server: 401 non autenticato, 403 laboratorio non trovato o ruolo non abilitato (già esistente), 409 lab già admin di una rete (nuovo), 422 `nome` mancante (già esistente), 500 solo per errori DB imprevisti.
- Rete: `catch` generico → "Errore di rete — controlla la connessione" (pattern esistente in `ListinoNuovoSheet`/`MagazzinoAddSheet`).

### 2.7 Testing

- **Nuovo test route-level** per `POST /api/rete` (nessun test esistente sulla route oggi):
  - 403 per ruolo `tecnico`/`front_desk` (regressione sul comportamento esistente)
  - 201 per `titolare`/`admin_rete` senza rete propria — assert su insert `reti` + insert `reti_membri` con `ruolo: 'admin_rete'`
  - **409 per lab già admin di una rete** (nuovo comportamento)
  - 422 per `nome` mancante/vuoto (regressione sul comportamento esistente)
- **Test component** `RetiNuovaSheet`: apertura sheet, validazione `nome` vuoto (0 chiamate POST), submit con successo (1 sola POST, reload chiamato), gestione errore 409/422/500 (messaggio mostrato, sheet resta aperto).
- **QA manuale:** 3 viewport (390/768/1280), light+dark, bottone e sheet raggiungibili da tastiera, verifica che il bottone non appaia più per un lab già admin di una rete (solo la lista/gestisci-rete esistente, coerente con la decisione "1 rete per lab").

---

## 3. Fuori scope (non toccato in questa sessione)

- `/rete/[id]` ("Gestisci rete →") — B8 (5/5), route separata, non ancora costruita. Il 404 residuo su quel link non è aggravato né toccato da questo lavoro.
- Vincolo UNIQUE a DB su `reti.admin_laboratorio_id` — il guard applicativo (409) è sufficiente per la regola di prodotto attuale; un constraint rigido è rimandabile a se/quando servisse davvero irrigidire la regola anche contro scritture dirette a DB (fuori dal perimetro applicativo, rischio comunque basso).
- Testo fuorviante "Piano UA Rete richiesto. Contatta il supporto..." nello stato "nessuna rete configurata per ruolo non abilitato" (`rete/page.tsx:72`) — messaggio preesistente, riferito a un controllo piano/abbonamento che in realtà non viene fatto qui (il gate è solo di ruolo). Non introdotto né aggravato da questo lavoro; non nello scope di B8 (4/5).
