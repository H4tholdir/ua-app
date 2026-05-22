# UÀ — Decisioni Permanenti (PINNED)
**Aggiornare solo quando cambia l'architettura fondamentale, non ad ogni sprint.**

---

## 1. Decisioni Architetturali Critiche

- **RLS:** `public.current_lab_id()` — NON `auth.current_lab_id()` (la funzione è in schema `public`)
- **Invite flow:** token custom `/invite/[token]` — NON `inviteUserByEmail` Supabase (incompatibile)
- **Tecnici:** NON si cancellano — `lab_memberships.attivo = false` per disattivare
- **Rifacimento:** RPC atomica `crea_rifacimento_atomico()` — MAI 3 INSERT separati
- **Onboarding redirect:** NON mettere `redirect('/onboarding')` nel layout `(app)/layout.tsx` — causa loop infinito. Solo banner dashboard.
- **PATCH allowlist:** API PATCH di risorse lab usa sempre allowlist esplicita di campi — MAI blocklist
- **WhatsApp:** deep links `wa.me` — MAI open-wa (ToS violation) — template MAI con nome paziente, solo numero lavoro + link portale token
- **Fatture:** generate durante `orchestraConsegna`. `incluso_in_fattura` = discriminatore "già fatturato". `stato_sdi` ortogonale a `lavori.stato`
- **PEC Vault:** `upsert_pec_vault_secret` + `get_pec_vault_secret` solo `service_role`
- **Push Notifications:** VAPID keys in `.env.local` (gitignored), tabella `push_subscriptions`, SW `ua-v2`
- **ESLint CI:** `--max-warnings 0` (zero warning = zero compromessi, husky pre-commit)
- **no-unescaped-entities:** OFF per `pdf/**` (templates PDF React)
- **SECURITY DEFINER:** funzioni PL/pgSQL devono avere `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT` esplicito solo a `service_role`
- **Supabase types:** dopo ogni migration → `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → rimuovere eventuale messaggio CLI in fondo → `npx tsc --noEmit`

- **Multi-viewport OBBLIGATORIO:** ogni pagina deve essere ottimizzata per 390px (mobile), 768px (tablet), 1280px (desktop) — non "responsive" nel senso di "si adatta", ma **riprogettata** per ogni breakpoint con layout dedicato
- **Multi-utente real-time:** il laboratorio ha più operatori che usano l'app in contemporanea da dispositivi diversi (titolare da mobile, segretaria da desktop, tecnico da mobile). Ogni stato condiviso DEVE usare Supabase Realtime. ZERO race conditions: ottimistic UI + rollback su conflitto. Quando un utente cambia stato (lavoro, prova, consegna), tutti gli altri vedono l'aggiornamento senza ricaricare la pagina. Il badge "LIVE" in header è l'indicatore di connessione Realtime — deve essere sempre visibile e accurato.

- **Checklist review OBBLIGATORIA** — ogni review di pagina/feature deve coprire: animazioni (motion tokens), suoni (sounds.ts + haptic.ts), fluidità transizioni, flow operativi end-to-end, comportamento pulsanti (tutti gli stati: idle/hover/loading/success/error/disabled), UI (layout, gerarchia, colori), UX (cognitive load, discoverability), campi di inserimento (validazione, placeholder, errori inline, autocomplete), edge case (lista vuota, errore rete, sessione scaduta, permesso negato), friendly usage (zero jargon tecnico nel copy), automatismi (cosa fa l'app senza input utente), sistemi guida (wizard, tooltip, empty state CTA), viewport 390/768/1280px × light/dark = 6 combinazioni minime.

---

## 2. Anti-Pattern Permanenti — Design System

- **Font:** MAI Inter → DM Sans per tutto il testo UI
- **Colori:** MAI gradiente viola-blu · MAI `#0F1E52`/`#1B2D6B` come background (cobalt SOLO nav pill active) · MAI `#E30613` per primary (è `#D90012` light, `#E8001A` dark)
- **Shadow:** MAI shadow cobalt/haptimorphic — solo dual-layer warm-tinted
- **Animazioni:** MAI `duration: 0.3` inline — SEMPRE da `src/design-system/motion.ts`
- **Mobile:** MAI tabella full-width su mobile (card + accordion) · MAI modal centrato per azioni (bottom sheet) · MAI più di 3 KPI above the fold · MAI suoni autoplay

---

## 3. Normativa (non toccare senza leggere `ANALISI/17_adempimenti_lab_2026.md`)

- **DdC MDR:** Art. 52(8) + **Allegato XIII** MDR 2017/745 (NON Allegato IV)
- **FatturaPA:** natura **N4** (Art. 10 n.18 DPR 633/72) · bollo €2 se imponibile > €77,47
- **EUDAMED:** lab custom-made = **ESENTI** (MDCG 2021-13 Rev.1)
- **ITCA:** OBBLIGATORIO per legge (campo `laboratori.codice_itca` — sanzione €48.500 se mancante)

---

## 4. ID di Sistema

| Voce | Valore |
|------|--------|
| Supabase project | `iagibumwjstnveqpjbwq` |
| URL produzione | `https://uachelab.com` |
| GitHub | `https://github.com/H4tholdir/ua-app` |
| Lab Filippo | `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` · ITCA01051686 · Serre SA |
| Lab Arturo Pepe (test) | `314cd040-0893-4e9d-9ad8-786e4eefd75f` |
| Admin route | `/admin/labs` · ruolo `admin_sistema` |
| Titolare lab Filippo | `h4t@live.it` / `>[REDACTED]` |
| E2E tecnico | `e2e-tecnico@ua-test.local` / `TestE2E!2026` |
| NEXT_PUBLIC_SUPPORT_PHONE | `+393381235473` |

### Stripe Price IDs (produzione — non modificare)
| Piano | Mensile | Annuale |
|-------|---------|---------|
| Lab €49/€490 | `price_1TWCfaRsMhN7mg7YVt0UfeNB` | `price_1TWCfbRsMhN7mg7Y7Ejl1k5w` |
| Rete PRO €149/€1490 | `price_1TWCfbRsMhN7mg7YDXKFJkdN` | `price_1TWCfcRsMhN7mg7YBZSz1gId` |

---

## 5. Backlog V2 (feature NON implementate — intenzionalmente)

Queste feature esistono nel design ma sono state deliberatamente escluse dalla V1.
Non implementare senza conferma esplicita di Francesco.

| Feature | Motivo dell'esclusione |
|---------|----------------------|
| Sezione `/rete` multi-lab | Architettura multi-tenant da progettare da zero |
| PMCF follow-up automatico | Email automation avanzata, basso ROI immediato |
| STS XML export | Solo se fattura diretta al paziente (raro) |
| Firma digitale P7M | Richiede integrazione AgID |
| CAPA ISO 13485 | Solo se Filippo richiede certificazione |
| SDI diretto | Richiede accordi con HUB SDI |
| WhatsApp Cloud API ufficiale | Deep links `wa.me` già sufficienti e ToS-safe |
| Nota di credito XML TD04 | Raro, gestibile manualmente |
| Colorazione 4D | Feature di nicchia |
| Terzismo inter-lab | Richiede rearchitettura tenant |
| Fascicolo Tecnico MDR | Poco uso quotidiano |

---

## 6. Infrastruttura

| Servizio | Stato |
|----------|-------|
| Resend · `uachelab.com` | Verificato Cloudflare eu-west-1 |
| Cloudflare Email Routing catch-all | → Worker `ua-pec-verify` |
| Supabase MCP | Autenticato (OAuth `francesco.formicola@live.it`) |
| VAPID keys | In `.env.local` (gitignored). DB migration applicata. |
| Splash screens iOS | In `public/splash/` (7 PNG, tutti i modelli iPhone SE → 14 Pro Max) |
