# Decisioni ratificate — N14 (login UX), N13 (check lab.stato API), N11-bis
**Data:** 17 luglio 2026 · **Ratifica:** Francesco Formicola · **Processo:** CLAUDE.md §0C (panel advisor)

Contesto: punto (1) della sequenza post-P0-PERF («risolvere tutti i problemi»). Handoff di origine: `docs/roadmap/2026-07-17-post-r2-handoff.md`.

---

## N14 — Login → dashboard fuori budget (2.758ms vs ≤2s), causa 100% client-side

### N14a — animazione «Bentornato!» (delay fisso 600ms) — **RATIFICATA**
- `router.prefetch('/dashboard')` appena il form è pronto **+** delay ridotto da 600 a **~250ms**.
- Recupero ~350ms + navigazione a bundle caldo. Il momento celebrativo resta percepibile.

### N14b — proposta passkey (oggi modal bloccante) — **RATIFICATA: Opzione C**
Panel UX (ux-designer) + Sicurezza (appsec-auditor): **convergenza piena su C**.
- **Redirect immediato** al login riuscito; lo stesso `PasskeyRegistrationModal` montato **non-bloccante sopra la dashboard** già caricata, con delay post-paint ~800–1000ms (non rubare il primo sguardo alla coda lavori).
- Scartata A (banner dashboard): perde il "momento caldo" post-auth → calo strutturale enrollment.
- Scartata B (stato attuale): nasconde il problema nella metrica; è anche il caso tecnicamente più fragile (sincronizzazione cookie same-tick dopo `signInWithPassword`).
- Vantaggio tecnico di C: l'enrollment gira su sessione già stabilita (`getFreshLabContext`, cookie server-side). User-gesture resta soddisfatto (click sul bottone, non page-load).

**Requisiti d'implementazione N14b:**
1. **Fix bug skip cosmetico (obbligatorio):** `login-form.tsx` non chiama mai `shouldShowPasskeyModal()` → lo skip «chiedi tra 30 giorni» è inerte, il modal ripropone a ogni login. Va corretto a prescindere.
2. Canale di stato cross-route affidabile (es. `sessionStorage` TTL 15–20s) per montare il modal solo dopo il login appena avvenuto, non in sessioni dashboard successive.
3. Orchestrare la precedenza con altri prompt nativi al primo load dashboard (PWA install, push): uno alla volta, priorità al passkey.
4. Cap lifetime raccomandato (max ~3 proposte) + ingresso manuale persistente in Impostazioni→Sicurezza («Attiva accesso rapido»), indipendente dal timer di skip.
5. Verificare bucket DS della dashboard (v3 vs legacy) prima di spostare la logica — regola di convivenza per route.
6. Retry/backoff su `register/options` se risponde 401 nei primi ~100-200ms (Safari iOS/ITP: latenza sync cookie post-login).

**Post-N14:** abbassare `PERF_BUDGET_LOGIN` nel workflow perf-budget.

---

## N13 — Nessun check `lab.stato` negli handler API (gap pre-esistente) — **RATIFICATA CON RISERVE**
Panel a 3: solution-architect + appsec-auditor + backend-api → tutti **CONFERMATA CON RISERVE**.

### Punto di enforcement: opzione (b)
Helper esplicito **`assertLabOperativo(ctx, method)`** chiamato a inizio handler.
- NON dentro i 2 helper di contesto (`getLabContext`/`getFreshLabContext`): servono anche 33 Server Component dove il gate è redirect, non 403; e le route billing che devono restare aperte.
- NON in middleware: `lab.stato` non è nei claims → round-trip DB extra su ogni request, viola budget p75 ≤250ms.
- Costo zero round-trip: `lab.stato` è già nel `LabContext` (embed nella query `utenti`), sempre fresco dal DB a ogni request (nessuna staleness dai 900s del token — quello è solo identità).
- Firma raccomandata: ritorna la 403 pronta o `null` (early-return, niente throw, coerente con gli handler esistenti).
- **Kill-switch** (env/const interno) che forza `ok` sempre → rollback istantaneo senza disfare gli edit.

### Matrice stati × metodi (ratificata, blacklist blocca anche i GET)
| stato | GET/HEAD | mutazioni | codice |
|---|---|---|---|
| trial / attivo | ✅ | ✅ | — |
| **trial scaduto** (`trial_ends_at` passato) | ✅ | ❌ 403 | `UA_LAB_TRIAL_SCADUTO` |
| sospeso | ✅ | ❌ 403 | `UA_LAB_SOSPESO` |
| scaduto | ✅ | ❌ 403 | `UA_LAB_SCADUTO` |
| **blacklist** | ❌ 403 | ❌ 403 | `UA_LAB_BLACKLIST` |
| stato sconosciuto/futuro | ❌ 403 | ❌ 403 | fail-closed (default switch) |
| `lab===null` + admin_sistema | bypass | bypass | — |
| `lab===null` + altro ruolo | ❌ 403 | ❌ 403 | fail-closed |

Codici **distinti** (non accorpare SOSPESO/SCADUTO/TRIAL_SCADUTO): stesso comportamento server, semantica client diversa (`/impostazioni/abbonamento` vs `?expired`).

### Contratto errore
`403` + `{ error: string, code: 'UA_LAB_*' }`. Non 402 (semantica non standard, problemi proxy/CDN/SW). Il `code` è additivo rispetto al formato `{ error }` esistente — primo `code` strutturato del repo.

### Ruoli
- **admin_sistema** (`laboratorio_id` NULL): bypass totale.
- **admin_rete**: **RATIFICATO — trattato come un titolare**, soggetto allo stato del proprio laboratorio. Nessun bypass parziale.

### Scope dell'ondata — RATIFICATO: TUTTO dentro N13
1. **Guard API centrale** su handler mutanti **+ le 28 GET categoria A** (per onorare blacklist→tutto-403). Stima ~95 edit one-line + ~3 wrapper (`verifyTitolare` ecc.) da adattare per esporre `lab`.
2. **Guardia portale token** (`src/lib/portale/guardie.ts` / `api/portale/[token]/*`, fuori dai 2 helper): un lab blacklist oggi serve ancora dati economici/sanitari a terzi. → blacklist = 404 generico (no info-leak a terzi); sospeso/scaduto = read consentito (diritto di terzi sui propri documenti fiscali). **Sev. ALTA (appsec R2).**
3. **Riga trial-scaduto** in matrice (allineamento al gate UX già nel layout).

### Anti-drift & rollout
- **Test di guardia statico** gemello di `tests/unit/lab-context-guard.test.ts`: scandisce ogni `route.ts` con handler mutante non esente e pretende `assertLabOperativo(`. Allowlist esenzioni esportata come `const` (`lab-guard-exempt-routes.ts`).
- **Esenzioni:** Stripe checkout/portal (GET side-effecting, devono restare aperte a sospeso/scaduto — verificato self-check blacklist già presente), `stripe/webhook`, `auth/*`, `portale/[token]/*` (ha la propria guardia — punto 2), export GDPR.
- **Rollout in shadow mode** (log-only, would-block) 24-48h prima dell'enforcing, per scoprire chiamanti legittimi imprevisti.
- **Fail-closed** su `lab===null` non-admin: ramo esplicito + test dedicato (appsec R1, arch riserva).

### Riserve accessorie da chiudere in implementazione
- **Contratto client (handoff frontend):** fetch-wrapper PWA centralizzato che mappi `UA_LAB_*` → redirect `/impostazioni/abbonamento`. Oggi assente; senza, il `code` è inerte e un tab aperto mostra errori grezzi. Risposte 403 con `Cache-Control: no-store`; il SW non deve cachearle (verificato: `public/sw.js` salta POST/PATCH e non ha coda replay → nessun poisoning).
- **Revoca sessioni al passaggio a blacklist** (o rate-limit sul path 403): hook nella route `admin/labs/[id]/stato`. (appsec R5)
- **Processo GDPR out-of-band** (Art. 15/20) documentato in `docs/security/` prima del deploy del blocco-lettura-blacklist: senza canale di accesso/portabilità, il blocco totale è rischio legale. (appsec R4)
- **Minori:** `x-internal-secret` in `api/internal/pec-verify` usa `!==` non constant-time → `crypto.timingSafeEqual` (appsec R7); impersonation admin di lab sospeso → read-only, comportamento voluto, documentare (arch riserva 2).

---

## N11-bis — Impersonate/live di titolare soft-deleted — **RATIFICATA (fix piccolo)**
Bug: il lookup del titolare TARGET non filtra `deleted_at`.
- `src/app/api/admin/labs/[id]/impersonate/route.ts:40-44` → aggiungere `.is('deleted_at', null)`.
- `src/app/(app)/admin/labs/[id]/live/page.tsx:53` → idem.
- Coerente con N11 (filtro `deleted_at` ovunque). + test.

---

## Ordine di esecuzione proposto
1. **N11-bis** (fix sicurezza isolato, ~2 file) — percorso Piccolo.
2. **N14** (login + dashboard, medio) — percorso Medio; include fix skip cosmetico + spostamento modal.
3. **N13** (grande, tocca auth → percorso GRANDE §0C): brainstorm già assorbito dai panel → writing-plans → worktree → TDD → shadow mode → enforcing. Include guard API + guardia portale + trial scaduto + handoff frontend fetch-wrapper.
