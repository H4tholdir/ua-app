# B8 (1/5) — `/magazzino/nuovo`: CTA "aggiungi articolo" 404

**Data:** 03 luglio 2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — B8 (🔴 Blocker, 1 delle 5 route)
**Stato:** In design → implementazione

---

## 1. Contesto

`magazzino/page.tsx:71` mostra una CTA "+ Aggiungi articolo" che punta a `/magazzino/nuovo`, pagina mai creata → 404. `POST /api/magazzino` esiste già e funziona (`src/app/api/magazzino/route.ts`), manca solo la UI.

**Scoperta aggiuntiva durante il design (fuori dal bug originale ma nello stesso spazio del problema):** la CTA esiste **solo** dentro `EmptyState`, renderizzato solo quando `articoli.length === 0`. Il lab Filippo ha già 187 materiali importati — il magazzino non è mai vuoto in produzione, quindi la funzione di aggiunta articolo è oggi irraggiungibile anche a prescindere dal 404. `listino/page.tsx` invece ha già un bottone persistente in header sempre visibile. Decisione presa con Francesco: aggiungere anche qui un bottone persistente in header, stesso pattern di `/listino`.

`POST /api/magazzino` non ha restrizioni di ruolo oltre l'appartenenza al lab (qualunque utente autenticato con `laboratorio_id` può creare un articolo) — nessuna gating aggiuntiva da introdurre lato UI.

---

## 2. Design

### 2.1 Pattern UI: bottom sheet, non nuova route

Niente pagina `/magazzino/nuovo`. Si rimuove il link rotto e si sostituisce con un bottom sheet, sul modello di `src/components/features/ordini/NuovoOrdineSheet.tsx` (stesso schema: `open`/`onClose`/`onXCreato`, `motion`/`useReducedMotion`, haptic feedback). `EmptyState` supporta già `cta.onClick` oltre a `cta.href` — nessuna modifica al componente condiviso, solo al chiamante.

### 2.2 Componenti

- **Nuovo** `src/components/features/magazzino/MagazzinoAddSheet.tsx` (client component)
  Props: `{ open: boolean; categorieEsistenti: string[]; fornitori: Array<{id, ragione_sociale}>; onClose: () => void; onArticoloCreato: (articolo: ArticoloRow) => void }`
- **Modificato** `src/components/features/magazzino/MagazzinoSearchList.tsx` — già client component, diventa il proprietario dello stato `sheetOpen` (si evita di introdurre un wrapper client aggiuntivo solo per questo). Monta sia la lista sia `MagazzinoAddSheet`. Riceve un nuovo prop opzionale `showHeaderCta?: boolean` per renderizzare il bottone persistente sopra la lista.
- **Modificato** `src/app/(app)/magazzino/page.tsx`:
  - Query aggiuntiva: categorie distinte esistenti (`select distinct categoria`) e lista fornitori attivi, passate a `MagazzinoSearchList`.
  - `EmptyState.cta` passa da `{ href: '/magazzino/nuovo' }` a `{ onClick: ... }` — ma dato che `EmptyState` è renderizzato lato server e l'apertura sheet è stato client, il trigger reale si sposta dentro `MagazzinoSearchList`/`MagazzinoAddSheet`: la pagina renderizza sempre `MagazzinoSearchList` (anche a lista vuota) che internamente decide se mostrare `EmptyState` (con CTA che apre lo sheet) o la lista con bottone header.

### 2.3 Campi form (flat + sezione avanzata collassabile)

Sempre visibili:
- `nome` * (text)
- `codice_articolo` * (text)
- `categoria` — combobox: autocomplete sui valori distinti esistenti nel lab + possibilità di digitarne uno nuovo (nessun enum a DB, campo `TEXT` libero). Non esiste un primitive combobox condiviso in `components/ui/` — unico riferimento nel codebase è `src/components/features/clienti/ClienteComboBox.tsx` (pattern di interazione da replicare, NON il file da importare: è specifico ai clienti). Nota nota in memoria: `ClienteComboBox` ha una lacuna a11y (manca `aria-invalid`/`aria-describedby`) — la nuova combobox qui e quella per `fornitore_id` sotto devono includerli fin dall'inizio, non replicare la lacuna.
- `um_acquisto` — select (pz / Kg / litro / confezione), default `pz`
- `um_scarico` — select (g / ml / pezzo), default `g`
- `scorta_minima` — number, default `0`
- `dispositivo_medico` — checkbox, default `false`
- `traccia_lotto` — checkbox. Si auto-sincronizza al valore di `dispositivo_medico` (toggle DM → traccia_lotto si aggiorna di conseguenza) finché l'utente non lo modifica manualmente almeno una volta in questa sessione di form (da quel momento resta sotto controllo esplicito dell'utente, nessun altro auto-sync). Motivazione: `traccia_lotto` biforca il flusso di consegna introdotto da B1 (FEFO lotto vs scarico cieco) — un default sbagliato per un DM reale può bloccare una consegna a valle.

Dietro disclosure "+ Altri dettagli" (chiuso di default):
- `produttore` (text)
- `fornitore_id` — combobox sui fornitori attivi del lab
- `sotto_categoria` (text)
- `quantita_per_confezione` (number, default `1`)
- `costo_unitario` (number)
- `prezzo_unitario` (number)
- `scorta_attuale` (number, default `0`)
- `codice_ce` (text)
- `scheda_tecnica_url` (text/url)
- `scheda_sicurezza_url` (text/url)

### 2.4 Data flow

1. Utente compila e conferma → validazione client (`nome`, `codice_articolo` non vuoti)
2. `POST /api/magazzino` (invariata) con i campi compilati
3. Successo → risposta `{ articolo }` → `onArticoloCreato(articolo)` inserisce l'articolo nello stato locale di `MagazzinoSearchList` (nessun `router.refresh()`/reload pagina, coerente col fix RSC del Service Worker già in produzione) → sheet si chiude → haptic feedback (`hapticMedium`, pattern già usato in `NuovoOrdineSheet`)
4. Errore server (es. `codice_articolo` duplicato per lab → viola `UNIQUE(laboratorio_id, codice_articolo)`) → messaggio inline nello sheet, sheet resta aperto, nessun toast silenzioso

### 2.5 Error handling

- Validazione client blocca il submit se `nome`/`codice_articolo` vuoti (evita round-trip inutile)
- Errore 4xx/5xx da `POST /api/magazzino` → messaggio leggibile inline (mapping specifico per violazione UNIQUE se riconoscibile dal messaggio Postgres, altrimenti messaggio generico "Errore durante il salvataggio, riprova")
- Nessuna modifica alla API esistente: la validazione server già presente (`nome`/`codice_articolo` non-empty, CSRF same-origin) resta l'unica fonte di verità lato server

---

## 3. Testing / Verifica

- Unit test su `MagazzinoAddSheet`: validazione required su nome/codice, sync `traccia_lotto` ↔ `dispositivo_medico` (inclusa la regola "smette di auto-sync dopo primo tocco manuale")
- Unit test/snapshot su `MagazzinoSearchList`: rendering CTA header quando lista non vuota, rendering `EmptyState` con `onClick` quando lista vuota
- `npx tsc --noEmit`, `npx vitest run`, `npx next build` — tutti e 3 puliti (FASE 7 del workflow)
- Verifica manuale Playwright: 390px/768px/1280px, light+dark, creazione articolo end-to-end (submit → articolo compare in lista senza reload → nessuna richiesta RSC visibile in network diversa da quella attesa)
- Verifica manuale: creare un articolo con `codice_articolo` duplicato → errore inline visibile, sheet resta aperto

---

## 4. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Default `traccia_lotto` sbagliato su un articolo DM reale, con impatto sul flusso di consegna B1 | Auto-sync con `dispositivo_medico` come default intelligente, sempre sovrascrivibile manualmente prima del submit |
| Categorie duplicate per refuso (es. "Gessi" vs "gessi") | Combobox con autocomplete sui valori esistenti, non campo libero senza suggerimenti |
| Bottone header duplica logica già esistente in `EmptyState.cta.onClick` | Entrambi i trigger aprono lo stesso `MagazzinoAddSheet` tramite lo stesso stato `sheetOpen` in `MagazzinoSearchList` — nessuna duplicazione di logica di apertura |

---

## 5. Fuori scope

- Import/bulk-upload di più articoli in una volta — nessuna richiesta, YAGNI
- Modifica a `POST /api/magazzino` — API già corretta e sufficiente, nessuna modifica necessaria
- Restrizioni di ruolo sulla creazione articolo — l'API non le ha oggi, non introdotte in questo scope (diverso da `/listino` che ha `canEdit` per motivi non legati a questo bug)
