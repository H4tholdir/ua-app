# B8 (5/5) — `/rete/[id]` — Design

**Data:** 03/07/2026
**Contesto:** ultima delle 5 route del backlog B8 (Blocker). Il link "Gestisci rete →" in `/rete` porta a 404 (`ua-app/src/app/(app)/rete/page.tsx`). Le tabelle `reti`/`reti_membri` esistono già a DB (introdotte in B8 4/5, `/rete/nuova`), ma nessuna pagina/API gestisce il dettaglio di una rete esistente.

---

## 0. Scope e decisioni di esclusione

Durante il brainstorming sono emersi 3 argomenti che avrebbero ampliato notevolmente lo scope. Decisione: **escluderli esplicitamente da questa spec**, tracciarli come item roadmap separati.

| Escluso | Motivo | Dove va trattato |
|---|---|---|
| Un titolare-persona che sia titolare di **più laboratori** con un solo account (oggi `utenti.laboratorio_id` è una FK singola) | Tocca il modello di autenticazione/RLS in tutto il progetto — dominio critico, percorso Grande a sé | Nuovo item roadmap, da brainstormare separatamente; verificare se `lab_memberships` (già citata in `CLAUDE.md`) copre già parte del caso |
| Invito a un lab **senza account esistente** (creazione di un nuovo laboratorio + titolare durante l'accettazione) | Implica una domanda di pricing irrisolta (vedi sotto) | Vedi riga successiva |
| **Sovrapprezzo scalabile** per numero di lab in rete (subscription Stripe che varia in base al conteggio membri) | Tocca Stripe/billing — dominio critico per `CLAUDE.md` §0C, richiede modellazione numeri con Francesco e gestione casi limite (uscita a metà mese, downgrade, ecc.) indipendentemente dalla dimensione | Nuovo item roadmap dedicato, da brainstormare a parte prima di reintrodurre l'invito "lab senza account" |

**Conseguenza pratica:** in questa spec, un lab può essere invitato a una rete **solo se ha già un account UÀ attivo** (titolare già registrato). Se il titolare che accetta non ha un account con l'email invitata, vede un messaggio esplicito ("non hai un account UÀ, contatta il supporto") — nessuna creazione di account al volo.

---

## 1. Schema DB

### 1.1 Nuova tabella `inviti_rete`

Isolata dalla tabella `inviti` esistente (B7) — semanticamente diversa ("un lab invita un altro lab a una rete" vs "un lab invita una persona via email a un ruolo dentro sé stesso") e per non toccare `accept_invite_atomic`, RPC già patchata due volte per bug di produzione.

```sql
CREATE TABLE inviti_rete (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rete_id uuid NOT NULL REFERENCES reti(id),
  email text NOT NULL,                              -- email del titolare del lab invitato
  token_hash text NOT NULL UNIQUE,
  invitato_da uuid NOT NULL REFERENCES utenti(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,                  -- 7 giorni, come B7
  accepted_at timestamptz,
  revoked_at timestamptz
);
```

### 1.2 Estensione `reti_membri`

```sql
ALTER TABLE reti_membri ADD COLUMN aggiunto_da_admin uuid REFERENCES utenti(id);
```

Nullable. Valorizzata solo quando l'inserimento passa da `POST /api/admin/reti/[id]/membri` (force-add da Francesco); `null` per gli inserimenti via invito accettato. Permette di distinguere le due provenienze senza tabella di audit dedicata.

### 1.3 Nuova RPC `accept_invito_rete_atomic(p_token_hash text, p_user_id uuid)`

PL/pgSQL, `SECURITY DEFINER` (con `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT` solo a `service_role`, come da gotcha già in `CLAUDE.md` §9):

1. Claim atomico: `UPDATE inviti_rete SET accepted_at = now() WHERE token_hash = p_token_hash AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now() RETURNING *` — se 0 righe, errore "invito non valido o scaduto"
2. Verifica email dell'utente (`p_user_id`) combaci con `inviti_rete.email` — altrimenti errore esplicito, **rollback** (non lasciare l'invito marcato accettato se il match fallisce)
3. Verifica che il lab dell'utente non sia già `admin_laboratorio_id` di una rete propria né già presente in `reti_membri` per un'altra rete — altrimenti errore esplicito "il laboratorio è già in un'altra rete", rollback
4. `INSERT INTO reti_membri (rete_id, laboratorio_id, ruolo) VALUES (v_invito.rete_id, v_lab_id, 'membro')`
5. Ritorna `rete_id` per il redirect lato route

---

## 2. API Routes

| Route | Metodo | Autorizzazione | Scopo |
|---|---|---|---|
| `/api/rete/[id]` | `PATCH` | titolare/admin_rete del lab con `admin_laboratorio_id` = quella rete | Rinomina (`{nome}`), 422 se vuoto |
| `/api/rete/[id]/inviti` | `POST` | titolare/admin_rete del lab admin | Crea/aggiorna invito pendente (`{email}`), dedup su `(rete_id, email)` (aggiorna `expires_at` se già pendente, pattern `upsertInvito`), invia email |
| `/api/rete/[id]/inviti/[invitoId]` | `DELETE` | titolare/admin_rete del lab admin | Revoca (`revoked_at = now()`), solo se non ancora accettato |
| `/api/rete/[id]/membri/[laboratorioId]` | `DELETE` | titolare/admin_rete del lab admin **oppure** `admin_sistema` | Rimuove membro; **400** se `laboratorioId === admin_laboratorio_id` |
| `/api/rete/inviti/[token]/accept` | `POST` | titolare/admin_rete autenticato, email deve combaciare | Chiama `accept_invito_rete_atomic`, ritorna `rete_id` |
| `/api/admin/reti` | `GET` | `admin_sistema` | Lista `{id, nome}` di tutte le reti, per dropdown |
| `/api/admin/reti/[id]/membri` | `POST` | `admin_sistema` | Force-add immediato (`{laboratorio_id}`), imposta `aggiunto_da_admin`; stessa verifica "non già in un'altra rete" della RPC, replicata in TS (unico caller, non serve una seconda RPC) |

Nessuna `GET /api/rete/[id]` dedicata: la pagina fa fetch diretto server-side (pattern identico a `qualita/rischi/[id]`).

Guard comuni: CSRF (`isSameOrigin`), `laboratorio_id`/ruolo sempre derivati server-side da `utenti` via sessione, mai dal body.

---

## 3. Pagina `/rete/[id]`

### 3.1 `src/app/(app)/rete/[id]/page.tsx` (server component)

- Auth check → `redirect('/login')` se non autenticato
- Fetch `utente.laboratorio_id`/`ruolo`, poi `reti` by `id`
- **Guard tenant:** `isAdminLab = rete.admin_laboratorio_id === utente.laboratorio_id`; `isMemberLab` = riga presente in `reti_membri`. Se `!rete || (!isAdminLab && !isMemberLab)` → `redirect('/rete')` (stesso pattern anti-tenant-leak di B8 3/5, mai un 404 secco)
- Fetch lista membri + join `laboratori` (nome/città/piano) — pattern N+1 già usato in `rete/page.tsx`, numeri piccoli
- Se `isAdminLab`: fetch anche inviti pendenti (`inviti_rete` non accettati/non revocati/non scaduti)
- Props scalari al client component

### 3.2 `ReteDettaglio.tsx` (client component)

- Header: nome rete + (solo `isAdminLab`) icona matita → `RinominaReteSheet` (bottom sheet monocampo, `PATCH`)
- Lista membri: card mobile-first (nome lab, città, piano, badge ruolo, data ingresso) — mai tabella full-width su mobile
- Se `isAdminLab`: bottone "Rimuovi" su ogni card (tranne il lab admin), touch target ≥44px fin da subito
- Se `isAdminLab`: sezione "Inviti in attesa" (email, countdown scadenza, "Revoca")
- CTA "+ Invita laboratorio" (solo `isAdminLab`) → `InvitaLabSheet` (bottom sheet monocampo email, `POST /api/rete/[id]/inviti`), **`zIndex: 200/201` fin dall'inizio**
- Se `!isAdminLab`: sola lettura, nome rete + lista membri, nessuna azione, nessuna sezione inviti

Motion/haptic da `design-system/motion.ts`/`haptic.ts`, colori da token v2.3, 3 viewport (390/768/1280) × light/dark.

---

## 4. Flusso di accettazione invito

### 4.1 `src/app/(app)/rete/invito/[token]/page.tsx`

Sotto `(app)` — richiede login (redirect a `/login` gestito dal layout esistente se non autenticato, poi ritorno qui).

- Hash del token → lookup `inviti_rete` (non accettato/revocato/scaduto) → non trovato: messaggio "Invito non valido o scaduto"
- Verifica email utente loggato = `inviti_rete.email` → mismatch: messaggio esplicito, nessuna azione
- Verifica ruolo utente loggato è `titolare`/`admin_rete` → altrimenti: "Solo il titolare del laboratorio può accettare questo invito"
- Se tutto ok: conferma ("Il laboratorio [admin] ti invita alla rete [nome]") + bottone "Accetta" (client component)

### 4.2 Accettazione

Bottone → `POST /api/rete/inviti/[token]/accept` → RPC → redirect a `/rete/[id]` (id ritornato dalla RPC).

### 4.3 Email

Nuova `sendInvitoReteEmail()` in `src/lib/invito/`, gemella di `sendInvitoEmail` (B7), link a `/rete/invito/[token]`.

---

## 5. UI Amministrazione (`/admin`)

Sezione "Rete" aggiunta a `src/app/admin/labs/[id]/page.tsx` (pagina esistente), non una nuova area `/admin/reti`:

- Stato attuale: "Amministra la rete [nome]" (link) / "Membro della rete [nome]" (link) / "Nessuna rete"
- Se nessuna rete: `<select>` (da `GET /api/admin/reti`) + "Aggiungi" → `POST /api/admin/reti/[id]/membri`
- Se già membro: "Rimuovi da questa rete" → riusa `DELETE /api/rete/[id]/membri/[laboratorioId]` (guard esteso per accettare anche `admin_sistema`, non una seconda route duplicata)

---

## 6. Edge case e validazioni

- Rimozione dell'admin lab dalla propria rete → `400` (uscita completa dalla gestione rete non prevista in questo scope)
- Accettazione quando il lab è già admin/membro di un'altra rete → rifiutata dalla RPC, rollback, messaggio esplicito
- Force-add da `/admin` di un lab già in un'altra rete → stesso controllo, replicato in TS nella route admin (unico caller di quel path, non serve duplicare in SQL)
- Doppio invito stessa email+rete → dedup, aggiorna `expires_at` invece di creare un duplicato
- Revoca disponibile solo su inviti non ancora accettati
- CSRF su tutte le mutazioni; `laboratorio_id`/ruolo mai dal body

---

## 7. Piano di test (TDD)

- RPC `accept_invito_rete_atomic`: script diretto su Supabase (pattern già usato per `accept_invite_atomic`) — accept valido, doppio accept/race, email mismatch, lab già in altra rete, invito scaduto
- Route-level: `POST /inviti` (ruolo, dedup, CSRF), `DELETE membro` (self-removal, tenant, ruolo, bypass admin_sistema), `PATCH` rename, `POST /api/admin/reti/[id]/membri` (admin_sistema only + guard already-in-network)
- Componenti: `ReteDettaglio` (vista admin vs membro), `InvitaLabSheet`/`RinominaReteSheet` (validazione client-side, 0 POST su submit invalido)
- QA browser: 390/768/1280px × light/dark; touch target ≥44px su "Rimuovi"/"Revoca" e z-index 200/201 sui nuovi sheet verificati **fin dalla prima implementazione**, non scoperti in QA come nei bug precedenti di B8

---

## 8. Fuori scope (promemoria)

- Multi-lab ownership per singolo account titolare
- Invito a lab senza account esistente (onboarding embedded)
- Pricing scalabile per numero di lab in rete
- UI self-service per un lab membro che vuole auto-rimuoversi dalla rete
- Audit log strutturato (oltre alla colonna `aggiunto_da_admin`)
