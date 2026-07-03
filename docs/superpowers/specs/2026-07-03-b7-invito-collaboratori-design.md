# B7 — Invito collaboratori raggiungibile dal titolare

**Data:** 03 luglio 2026
**Backlog:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — B7 (🔴 Blocker)
**Stato:** In design → implementazione

---

## 1. Contesto

Il titolare di un laboratorio non ha oggi alcun modo di invitare un tecnico (o altro collaboratore) dall'interfaccia. Il pulsante "Invita tecnico" in `src/app/(app)/tecnici/page.tsx:49,117` punta a `/impostazioni`, pagina che non contiene alcuna funzionalità di invito. L'unico endpoint esistente, `POST /api/admin/invite`, è riservato al ruolo `admin_sistema` (Francesco) — non al titolare del lab.

**Scoperta in fase di brainstorming, che allarga lo scope:** anche se il titolare potesse invitare un tecnico oggi, la RPC `accept_invite_atomic()` (usata dal flow `/invite/[token]` per finalizzare l'accettazione) crea righe solo in `utenti` e `lab_memberships` — mai in `tecnici`. La tabella `tecnici` (`ANALISI/23_ua_database_schema.md` §2.3) è un profilo separato con `utente_id` opzionale, usato dalla lista `/tecnici` e presumibilmente dall'assegnazione lavori. Senza questo fix, un tecnico invitato e accettato non comparirebbe mai in `/tecnici` né sarebbe assegnabile — il problema di fondo di B7 resterebbe irrisolto anche con un flow di invito funzionante.

**Decisioni prese in brainstorming:**
- Ruoli invitabili dal titolare: `tecnico`, `front_desk`, `titolare` (co-titolare). Non `admin_rete` (fuori scope, gestito da `admin_sistema`).
- Un solo entry point in UI: bottom sheet su `/tecnici`, pulsante rinominato "Invita collaboratore" con selettore di ruolo.
- Il titolare deve poter vedere gli inviti pendenti del proprio lab e revocarli.
- La creazione automatica della riga `tecnici` all'accettazione (per ruolo `tecnico`) è incluso nello scope di B7.

---

## 2. Design

### 2.1 Backend — helper condiviso + nuove route scoped al lab

**`src/lib/invito/create-invito.ts`** (nuovo) — estrae la logica oggi duplicata solo in `/api/admin/invite`: genera token, calcola `token_hash`, inserisce/aggiorna la riga in `inviti`, invia l'email via Resend con lo stesso template HTML. Firma:

```ts
async function createInvito(params: {
  laboratorioId: string
  email: string
  ruolo: 'titolare' | 'tecnico' | 'front_desk' | 'admin_rete'
  createdBy: string
}): Promise<{ success: boolean; emailSent: boolean; emailError?: string; inviteUrl: string }>
```

**Edge case — invito duplicato:** prima dell'insert, verifica se esiste già un invito pendente non scaduto (`accepted_at IS NULL AND expires_at > now()`) per la stessa `email` + `laboratorio_id`. Se sì, lo aggiorna (nuovo `token_hash`, nuovo `expires_at`, nuovo `ruolo` se cambiato) invece di inserirne uno duplicato — la tabella `inviti` non ha vincolo `UNIQUE(email, laboratorio_id)`, quindi senza questo controllo si accumulerebbero righe orfane ad ogni reinvio.

**Route nuove, scoped al lab del chiamante:**

| Route | Metodo | Autorizzazione | Comportamento |
|---|---|---|---|
| `/api/tecnici/invite` | `POST` | `ruolo === 'titolare'` del chiamante | `laboratorio_id` è **sempre** quello del chiamante (letto server-side da `utenti`, mai dal body) — impedisce a un titolare di iniettare un `laboratorio_id` altrui. `ruolo` nel body limitato a `tecnico`/`front_desk`/`titolare` (400 se altro valore). Richiama `createInvito()`. |
| `/api/tecnici/invite` | `GET` | `ruolo === 'titolare'` del chiamante | Lista inviti pendenti (`accepted_at IS NULL AND expires_at > now()`) del proprio lab: `id, email, ruolo, created_at, expires_at`. |
| `/api/tecnici/invite/[id]` | `DELETE` | `ruolo === 'titolare'` del chiamante | Verifica che l'invito `id` appartenga al `laboratorio_id` del chiamante, poi soft-revoca (`accepted_at = now()`, stesso pattern di `/api/admin/invites/[id]`). 404 se l'invito non esiste o appartiene a un altro lab (mai 403 esplicito, per non confermare l'esistenza di un ID altrui). |

`/api/admin/invite` resta invariato nel comportamento esterno (solo `admin_sistema`, qualsiasi lab/ruolo incluso `admin_rete`), ma internamente richiama lo stesso `createInvito()` invece di duplicare la logica.

**Nota FASE 3 (CLAUDE.md):** questa change tocca l'assegnazione di ruoli/permessi tra tenant diversi (un titolare che crea credenziali per il proprio lab) → rientra nell'override "dominio critico", percorso implementativo **Grande** con worktree dedicato, anche se il conteggio file è piccolo.

### 2.2 Migration — creazione automatica riga `tecnici`

Nuova migration che sostituisce `accept_invite_atomic()`: dopo l'insert in `utenti`/`lab_memberships` invariato, se `v_invite.ruolo = 'tecnico'`:

```sql
INSERT INTO tecnici (laboratorio_id, utente_id, nome, cognome)
VALUES (v_invite.laboratorio_id, p_user_id, p_nome, p_cognome);
```

Nessun controllo `ON CONFLICT`: un utente appena creato non può già avere una riga `tecnici` con lo stesso `utente_id` (constraint non esistente, ma comunque impossibile nel flusso attuale — l'unica via per diventare `utente_id` di un `tecnici` è questa RPC). `sigla`, `qualifica`, `numero_albo`, `prrc`, `tipo_compenso`, `compenso_base` restano `NULL`/default — compilabili dopo dal titolare tramite `TecnicoEditInline`, componente già esistente, nessuna UI nuova richiesta per questo.

Per `ruolo IN ('front_desk', 'titolare')` nessuna riga `tecnici` — non sono profili tecnici.

### 2.3 Frontend — bottom sheet su `/tecnici`

Il pulsante header in `tecnici/page.tsx` (oggi `<Link href="/impostazioni">`) diventa un `<button>` che apre **`InvitaCollaboratoreSheet`** (nuovo componente, bottom sheet — mai modal centrato, anti-pattern del progetto). Label aggiornata: "Invita collaboratore" (era "Invita tecnico", ora generico perché il selettore ruolo permette anche front desk/titolare). Stesso trattamento per il CTA nell'empty state ("Invita collaboratori →", già genericamente formulato, resta invariato nel testo).

Contenuto del bottom sheet:
- **Form invito:** campo email, selettore ruolo (Tecnico / Front desk / Titolare — default Tecnico dato il contesto pagina), submit → `POST /api/tecnici/invite`. Stato di successo mostra conferma invio (coerente col messaggio già restituito da `createInvito`/l'endpoint admin).
- **Sezione "Inviti in attesa":** fetch `GET /api/tecnici/invite` all'apertura del sheet. Lista compatta (chip/riga, non tabella): email, ruolo, scadenza relativa ("scade tra 3 giorni"). Ogni riga ha un pulsante revoca (icona cestino) → `DELETE /api/tecnici/invite/[id]` con conferma inline, poi rimuove la riga otticamente dalla lista.
- Vuoto (nessun invito pendente): nessuna sezione mostrata, solo il form.

Stile: token del design system (`var(--surface)`, `var(--sh-b)`, `DM Sans`), animazioni da `src/design-system/motion.ts` (apertura/chiusura sheet, nessuna `duration` inline).

---

## 3. Data flow end-to-end

```
Titolare apre /tecnici
  → click "Invita collaboratore" → apre InvitaCollaboratoreSheet
  → GET /api/tecnici/invite → mostra inviti pendenti (se presenti)
  → compila email + ruolo → submit
  → POST /api/tecnici/invite
      → verifica ruolo chiamante === titolare
      → risolve laboratorio_id del chiamante (mai dal body)
      → createInvito() → upsert riga `inviti` + email Resend con link /invite/[token]
  → collaboratore riceve email, apre /invite/[token], compila nome/cognome/password
  → POST /api/auth/accept-invite → accept_invite_atomic()
      → crea/aggiorna utenti + lab_memberships (invariato)
      → SE ruolo='tecnico': crea riga tecnici (nuovo)
  → redirect /dashboard
  → titolare torna su /tecnici → il nuovo tecnico compare nella lista (se ruolo=tecnico)
```

---

## 4. Testing (TDD)

- `createInvito()`: crea nuovo invito; aggiorna invito pendente esistente invece di duplicarlo; propaga errore email senza bloccare la creazione della riga (comportamento già presente nell'endpoint admin, solo spostato).
- `POST /api/tecnici/invite`: 403 se chiamante non titolare; 400 se ruolo fuori allowlist (`tecnico`/`front_desk`/`titolare`); ignora un eventuale `laboratorio_id` nel body e usa sempre quello del chiamante (test esplicito anti-tenant-leak); 403 se il lab del chiamante è `blacklist`/`scaduto` (stesso controllo già presente nell'endpoint admin).
- `GET /api/tecnici/invite`: restituisce solo inviti del lab del chiamante, esclude scaduti/accettati.
- `DELETE /api/tecnici/invite/[id]`: 404 se l'invito appartiene a un altro lab; soft-revoca corretta se appartiene al proprio.
- `accept_invite_atomic()` estesa: crea riga `tecnici` solo quando `ruolo='tecnico'`; nessuna riga `tecnici` per `front_desk`/`titolare`; campi opzionali (`sigla`, `qualifica`, ecc.) restano `NULL`/default.
- `InvitaCollaboratoreSheet`: submit form → chiamata API corretta; lista inviti pendenti renderizzata da fixture; revoca rimuove la riga.

**Migration gate (FASE 6b):** dopo la migration su `accept_invite_atomic`, rigenerare `src/types/database.types.ts` e verificare `npx tsc --noEmit`.

---

## 5. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Titolare inietta `laboratorio_id` di un altro lab nel body di `POST /api/tecnici/invite` | Il valore nel body viene ignorato: la route risolve sempre `laboratorio_id` server-side dal record `utenti` del chiamante. |
| Titolare invita ripetutamente la stessa email creando righe `inviti` orfane | `createInvito()` aggiorna l'invito pendente esistente invece di duplicarlo. |
| Riga `tecnici` creata due volte per lo stesso `utente_id` in scenari futuri (es. re-invito dopo revoca) | Non applicabile nel flusso attuale: l'unico modo di ottenere un `utente_id` associato a una nuova riga `tecnici` è l'accettazione di un invito, e un utente già esistente in `utenti` con lo stesso `id` non può ripassare per `accept_invite_atomic` con un secondo invito attivo (il primo è già `accepted_at` valorizzato). Da rivalutare solo se in futuro si introduce un flow di "ri-attivazione" esplicito. |
| Invito a ruolo `titolare` concede pieno controllo del lab (fatturazione, staff, impostazioni) | Comportamento esplicitamente richiesto (co-titolare) — nessuna mitigazione aggiuntiva, è una scelta del titolare stesso sul proprio lab. |

---

## 6. Fuori scope (esplicitamente, per chiarezza futura)

- B8 (5 route CRUD → 404), B9 (lista pazienti non navigabile) — item di backlog separati.
- Compilazione di `sigla`/`qualifica`/`compenso` al momento dell'invito — resta gestita post-creazione da `TecnicoEditInline`, già esistente.
- Invito da parte di `admin_rete` verso i lab della propria rete — non richiesto da B7, eventuale item futuro.
- Modifica di `/api/admin/invite` nel comportamento esterno — resta identico, solo refactor interno per usare l'helper condiviso.
- Personalizzazione del testo email per ruolo (oggi generico "Sei stato invitato come {ruolo}") — invariato.
