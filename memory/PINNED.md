# UÀ — Contesto Operativo Permanente
**Aggiornare solo quando cambia l'architettura. Non toccare senza approvazione di Francesco.**

---

## Cos'è questo sistema

**UÀ** (uachelab.com) è una PWA SaaS multi-tenant per laboratori odontotecnici italiani.
Supabase project: `iagibumwjstnveqpjbwq`. GitHub: `H4tholdir/ua-app`. Deploy: Vercel auto CI/CD.

**Utenti:** titolare (gestione totale), tecnici (esecuzione lavori), front desk (consegne).
Uso primario da mobile in laboratorio, spesso con mani occupate.
**Profili non tecnici — la semplicità è non negoziabile. Tre tap al massimo per ogni operazione critica.**

**Clienti anchor:** Filippo Opromolla (Serre SA), Arturo Pepe (Angri SA).

**Goal:** eliminare la burocrazia dal laboratorio. DdC MDR, FatturaPA SDI, tracking lavori,
consegne — tutto automatico, tutto dal telefono. L'utente non vede mai i problemi tecnici.

**Stack:** Next.js 15 App Router + TypeScript strict. Supabase PostgreSQL + RLS + Auth.
Multi-tenant: ogni laboratorio isolato tramite `public.current_lab_id()` nelle RLS policy.

---

## Come lavoriamo

**Ogni task — BP-0 obbligatorio:**
1. Leggi `memory/SESSION_ACTIVE.md` → contesto sessione corrente
2. Leggi `memory/MEMORY.md` → stato sprint e versione attuale
3. Identifica dominio → leggi `memory/domains/[dominio].md` se esiste
4. Navigazione strutturale (>2 file)? → `graphify query "<domanda>"`

**Nuova feature UI/design — workflow OBBLIGATORIO:**
1. Crea mockup HTML in `docs/design/mockups/YYYY-MM-DD-nome.html` (**MAI /tmp**)
2. Screenshot con Playwright → `npx playwright screenshot`
3. Approvazione Francesco
4. Solo dopo: implementa in React
Non saltare nessun passo. Un mockup non approvato non si implementa.

**Nuova migration DB:**
Dopo ogni migration → `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
Rimuovi eventuale messaggio CLI in fondo → `npx tsc --noEmit`.

**Stato condiviso tra utenti:**
SEMPRE Supabase Realtime. Ottimistic UI + rollback su conflitto.
Il badge "LIVE" in header è l'indicatore di connessione — deve essere sempre accurato.

**Multi-viewport — non "responsive", ridisegnato:**
390px (mobile) + 768px (tablet) + 1280px (desktop): layout dedicato per ciascuno.
BottomNavPill visibile e funzionante su TUTTI i viewport sempre.

**Fine blocco di lavoro significativo:**
Aggiorna `memory/SESSION_ACTIVE.md` con sintesi. Sostituisci, non appendere. Max 200 token.
Se la scoperta diventa regola permanente → proponi aggiornamento di questo PINNED.

---

## Dogmi inviolabili

**`consegnato` SOLO via `orchestraConsegna()`.**
Non è in `TRANSIZIONI_CONSENTITE`. Mai bypass. Senza: niente DdC, niente fattura, violazione MDR.

**RLS: `public.current_lab_id()` — NON `auth.current_lab_id()`.**
`service_role` bypassa RLS: aggiungere sempre `.eq('laboratorio_id', ...)` manualmente su ogni query.

**Lab lifecycle: `transitionLabStato()` — MAI `UPDATE` diretto.**
`blacklist` è terminale senza eccezioni. Direct UPDATE = stato macchina corrotto, irrecuperabile.

**Auth invite: token SHA-256 custom `/invite/[token]` — MAI `inviteUserByEmail` Supabase.**

**Rifacimento: `crea_rifacimento_atomico()` — MAI 3 INSERT separati.**

**Tecnici: `lab_memberships.attivo = false` — MAI DELETE.**

**WhatsApp/portale: ZERO PHI.**
Niente nome paziente, tipo prestazione, nome lab. Solo numero lavoro + link token portale.

**Fatture: `incluso_in_fattura` ortogonale a `stato_sdi` e a `lavori.stato`.**
Fatture generate durante `orchestraConsegna`. Progressivo SDI: RPC atomica, mai ricalcolare.

**PEC Vault: solo `get_pec_vault_secret` / `upsert_pec_vault_secret` con service_role.**

**PATCH API: sempre allowlist esplicita — MAI blocklist.**

**Onboarding redirect: MAI `redirect('/onboarding')` in `(app)/layout.tsx` → loop infinito.**

**Design system:**
- Font: **DM Sans** — MAI Inter
- Animazioni: `design-system/motion.ts` — MAI literal inline (`duration`, `ease`, `spring`)
- Colori: `#D90012` (light) / `#E8001A` (dark) per action red — MAI `#E30613`
- Shadow: dual-layer warm-tinted — MAI cobalt/haptimorphic

**Stripe Price IDs di produzione — non toccare mai:**
- Lab monthly: `price_1TWCfaRsMhN7mg7YVt0UfeNB`
- Lab yearly: `price_1TWCfbRsMhN7mg7Y7Ejl1k5w`
- Rete monthly: `price_1TWCfbRsMhN7mg7YDXKFJkdN`
- Rete yearly: `price_1TWCfcRsMhN7mg7YBZSz1gId`
