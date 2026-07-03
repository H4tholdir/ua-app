# B8 (3/5) — `/qualita/rischi/[id]`: link "Modifica →" 404

**Data:** 03 luglio 2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — B8 (🔴 Blocker, 3 delle 5 route)
**Stato:** In design → implementazione

---

## 1. Contesto

`qualita/rischi/page.tsx:186` mostra, per ogni tipo di dispositivo con analisi rischi configurata, un link "Modifica →" che punta a `/qualita/rischi/[id]` — route mai creata → 404. `GET /api/qualita/rischi` (lista) e `POST /api/qualita/rischi` (upsert su `laboratorio_id, tipo_dispositivo`) esistono già e funzionano (`src/app/api/qualita/rischi/route.ts`); manca il GET/editor per un singolo record e la relativa UI.

**Verificato sui dati reali (Supabase live, `iagibumwjstnveqpjbwq`):** solo il lab di Filippo (`971061a1-…`) ha righe in `rischi_tipo_dispositivo` (9, una per `tipo_dispositivo`), tutte create nella stessa migrazione seed (19/05/2026). La forma reale di `rischi_json` (array), mai tipizzata nel codice, è:

```json
{
  "id": "RF01",
  "rischio": "Incompatibilità biologica del materiale",
  "causa": "Uso di leghe non biocompatibili o ceramiche non certificate",
  "probabilita": 1,
  "gravita": 3,
  "rpn": 3,
  "misura": "Utilizzo esclusivo di materiali certificati EN ISO 22674 / EN ISO 6872"
}
```

Nei dati esistenti `probabilita` assume solo i valori 1-2 e `gravita` 1-3; `rpn = probabilita × gravita` è sempre coerente. Nessun `CHECK` a DB su questi campi (JSONB libero) — la validazione dell'intervallo è responsabilità applicativa.

**Fuori scope (deciso con Francesco):** nessuna restrizione di ruolo per la modifica (comportamento attuale mantenuto — a differenza di B8 2/5 su listino, qui non si introduce alcun gating); nessuna UI per creare un'analisi rischi per un `tipo_dispositivo` che non ne ha ancora una (la lista in `qualita/rischi/page.tsx` mostra solo righe esistenti, non c'è CTA "+"; i lab senza righe seedate restano scoperti, non è un problema introdotto o aggravato da questo fix).

---

## 2. Design

### 2.1 Pattern UI: pagina intera, non bottom sheet

A differenza di B8 (1/5, 2/5) — dove il fix era un componente sheet montato dalla pagina lista — qui la route `/qualita/rischi/[id]` è già una destinazione di navigazione dedicata (non un trigger dalla lista), e il contenuto (lista dinamica di 3-5 rischi × 5 campi ciascuno) è troppo corposo per una sheet. La pagina stessa È l'editor.

### 2.2 Componenti

- **Nuovo** `src/app/(app)/qualita/rischi/[id]/page.tsx` — server component, pattern identico a `pazienti/[id]/page.tsx`:
  - Auth check, carica `utente.laboratorio_id`.
  - Fetch riga `rischi_tipo_dispositivo` per `id`, **scoped al lab** (`.eq('id', id).eq('laboratorio_id', utente.laboratorio_id).single()`).
  - `redirect('/qualita/rischi')` se la riga non esiste o appartiene a un altro lab (mai un 404 grezzo, mai rivelare l'esistenza di righe di altri lab).
  - Passa i dati come props a `RischiEditor`.
- **Nuovo** `src/components/features/qualita/RischiEditor.tsx` (client component):
  - Header informativo in sola lettura: tipo dispositivo (`formatTipoDispositivo`, riusata da `qualita/rischi/page.tsx`), versione attuale, data ultima revisione. `AppHeader backHref="/qualita/rischi"`.
  - **Lista rischi dinamica** — una card per elemento di `rischi_json`:
    - `rischio` (text, obbligatorio)
    - `causa` (text, obbligatorio)
    - `probabilita` — `<select>` 1/2/3 (Bassa/Media/Alta)
    - `gravita` — `<select>` 1/2/3 (Bassa/Media/Alta)
    - `rpn` — calcolato live client-side (`probabilita × gravita`), sola lettura, badge colorato (verde ≤3, ambra 4-6, rosso >6)
    - `misura` (textarea, obbligatorio)
    - Bottone "Rimuovi" per riga (conferma se è l'ultima rimasta)
  - Bottone "+ Aggiungi rischio" in fondo alla lista — nuovo `id` generato client-side, pattern incrementale coerente con i dati esistenti (es. prefisso derivato dal tipo dispositivo + numero progressivo, es. `R01`, `R02`, …; non serve essere identico allo schema `RF01`/`PM01` visto nei dati storici, che era solo una convenzione del seed iniziale).
  - Campi doc-level: `rischi_residui` (textarea, opzionale), `misure_controllo` (textarea, opzionale).
  - Validazione client: ogni rischio deve avere `rischio`/`causa`/`misura` non vuoti; lista non può restare vuota (blocco submit, non solo warning — un'analisi rischi senza rischi non ha senso per il fascicolo MDR).
  - Submit → `PATCH /api/qualita/rischi/[id]` → su successo `router.refresh()` + toast conferma; su errore, messaggio inline `role="alert"`, form resta compilato.
  - Stile DS v2.3 (warm panna, dark mode), animazioni add/remove riga da `motion.ts`, `hapticLight` sui bottoni azione.

### 2.3 Nuova API: `PATCH /api/qualita/rischi/[id]`

Nuovo file `src/app/api/qualita/rischi/[id]/route.ts`:

1. CSRF check (`isSameOrigin`, pattern esistente).
2. Auth (401 se non autenticato).
3. Carica `utente.laboratorio_id` (403 se lab non trovato).
4. Fetch riga esistente per `id` + `laboratorio_id` — **404** se non trovata o di un altro lab (mai 403, per non rivelare l'esistenza della riga).
5. Validazione payload:
   - `rischi_json` deve essere un array non vuoto.
   - Ogni elemento: `rischio`/`causa`/`misura` stringhe non vuote; `probabilita`/`gravita` numeri interi in `[1,3]`.
   - `rpn` **ricalcolato server-side** come `probabilita × gravita` (mai fidarsi del valore inviato dal client).
   - `rischi_residui`/`misure_controllo`: stringa o `null`, opzionali.
   - Errori di validazione → `422` con messaggio specifico per campo.
6. Update con allowlist esplicita: `rischi_json`, `rischi_residui`, `misure_controllo`, `versione: rigaEsistente.versione + 1`, `data_ultima_revisione: oggi (YYYY-MM-DD)`. Mai `tipo_dispositivo` né `laboratorio_id` nel payload accettato (immutabili in questa route).
7. Risposta `200 { rischio: { id, tipo_dispositivo, versione, data_ultima_revisione } }` — stesso shape della `POST` esistente, per coerenza.

Nessuna modifica a `GET /api/qualita/rischi` o `POST /api/qualita/rischi` (restano invariate, usate da lista e da eventuali flussi di creazione futuri).

### 2.4 Data flow

1. Utente clicca "Modifica →" da `/qualita/rischi` → naviga a `/qualita/rischi/[id]`.
2. Server fetch riga (tenant-scoped) → client form idratato con i dati correnti.
3. Utente modifica rischi/campi doc-level → validazione client sui campi obbligatori.
4. `PATCH /api/qualita/rischi/[id]` con `{ rischi_json, rischi_residui, misure_controllo }`.
5. Server: auth → tenant check (404) → validazione (422) → ricalcolo RPN → update con `versione+1`/`data_ultima_revisione=oggi`.
6. `200` → `router.refresh()` → pagina ricarica i dati aggiornati (versione/data nell'header cambiano visibilmente).
7. Errore (404/422/500) → messaggio inline, nessun redirect distruttivo, dati del form preservati.

### 2.5 Error handling

- Client: submit disabilitato se validazione fallisce (lista vuota o campo obbligatorio mancante); su risposta non-2xx, messaggio leggibile inline, mai un errore Postgres grezzo.
- Server: `401` non autenticato, `404` riga non trovata o di altro lab, `422` payload non valido (messaggio per campo), `500` solo per errori DB imprevisti.

### 2.6 Testing

- **Nuovo test route-level** per `PATCH /api/qualita/rischi/[id]`:
  - `404` per `id` inesistente o di un altro lab (anti-tenant-leak, pattern già usato per altre route `[id]`)
  - `200` con assert su ricalcolo server-side di `rpn` (invio di un `rpn` client deliberatamente sbagliato, verifica che il salvato sia quello ricalcolato)
  - `422` per lista `rischi_json` vuota
  - `422` per elemento con `probabilita`/`gravita` fuori range `[1,3]`
  - `200` con assert su `versione` incrementata e `data_ultima_revisione` = oggi
- **Test component** `RischiEditor`: add/remove riga aggiorna la lista e l'RPN mostrato, submit con lista vuota bloccato client-side, submit success chiama `router.refresh`, submit error mostra messaggio e mantiene i dati.
- **QA manuale:** 3 viewport (390/768/1280), light+dark, keyboard-accessibile, verifica visiva che versione/data si aggiornino dopo il salvataggio, verifica che l'RPN calcolato client-side combaci con quello salvato server-side.

---

## 3. Fuori scope (non toccato in questa sessione)

- Gating di ruolo per la modifica (comportamento attuale — nessuna restrizione — mantenuto su decisione esplicita).
- UI per creare un'analisi rischi per un `tipo_dispositivo` privo di riga (nessuna CTA "+" in `qualita/rischi/page.tsx` oggi; i lab senza seed restano scoperti).
- Tipizzazione formale di `rischi_json` in `src/types/domain.ts` (il tipo resta implicito nella forma validata dalla route; una tipizzazione esplicita condivisa è un miglioramento futuro, non necessario per chiudere il 404).
- Migrazione dei dati storici a uno schema diverso (restano validi così come sono, la nuova PATCH è retrocompatibile con la forma esistente).
