# UÀ — Project Memory
**Ultimo aggiornamento:** 22 maggio 2026 — V1.8.2 live + Dashboard V2 spec+plan approvati

---

## 0. STATO DEL PROGETTO — V1.8.2 IN PRODUZIONE

**V1.8.2 in produzione su https://uachelab.com — 22/05/2026**

| Versione | Data | Tag | Contenuto |
|----------|------|-----|-----------|
| V1.5.1 | 21/05/2026 | `v1.5.1` | Piano A — Security fixes |
| V1.6.0 | 21/05/2026 | `v1.6.0` | Piano B — UX Excellence |
| V1.7.0 | 21/05/2026 | `v1.7.0` | Piano C — Delight + Business Intelligence |
| V1.7.8 | 22/05/2026 | `v1.7.8` | Fix bug magazzino/[id], push triggers, CRUD completo |
| V1.7.9 | 22/05/2026 | `v1.7.9` | Pazienti PATCH, Listino edit, Dark mode 27 file |
| V1.8.0 | 22/05/2026 | `v1.8.0` | Error boundaries, loading completo, splash screens iOS |
| V1.8.1 | 22/05/2026 | `v1.8.1` | Disattiva tecnico, CI/CD fix, BP-1/BP-2, orchestratori, roadmap |
| **V1.8.2** | **22/05/2026** | **`main`** | **Visual audit P0: body bg warm panna, grid overflow, dark mode toggle, STOR/ filter** |

**Stato CI:** TypeScript: 0 errori · ESLint: 0 warning · Vitest: 141/141 · Build: ✅ · CI verde ✅

### 🔜 PROSSIMA MILESTONE: Dashboard V2 (V1.9)

**Piano pronto — inizia implementazione in sessione nuova.**

- **Spec:** `docs/superpowers/specs/2026-05-22-dashboard-v2-redesign.md`
- **Piano:** `docs/superpowers/plans/2026-05-22-dashboard-v2.md` — 13 task, TDD
- **Approccio:** subagent-driven-development — un subagente per task

**Design approvato da Francesco:**
- Config 1 Spotlight: SpotlightCard hero + KPI 2×2 cliccabili come filtri + TaskList
- Separazione tab Gestione (business) / Produzione (lavori) per ruolo ibrido Titolare+Tecnico
- KPI: Playfair Display 38–44px, cliccabili → navigano a lista pre-filtrata
- Dark mode carbonio corretto: token esatti da `admin.css` (sh-b/sh-c/sh-i neri profondi)
- Dark mode toggle: SOLO in `/impostazioni`, non nell'UI operativa
- Nav pill: tooltip "Nuovo lavoro" su "+", drag&drop long-press, pin shortcuts — IMMEDIATI
- Sync badge sostituisce LIVE: "Aggiornato ora / X min fa" + dot status
- Avatar nell'header normale (non fixed overlay)
- Desktop 1280px: 2 colonne (Produzione | Gestione)

**Istruzione di avvio:**
```
Implementa il Dashboard V2 partendo dal piano in docs/superpowers/plans/2026-05-22-dashboard-v2.md.
Usa il skill superpowers:subagent-driven-development. Inizia dal Task 1.
```

### 🆕 Fix V1.8.2 — Visual Audit P0 (22/05/2026, commit 1afb06d)
- **Body background**: `var(--bg, #DDD8D3)` warm panna su tutti i dispositivi (era bianco su desktop)
- **Grid lavori desktop**: `minmax(0,1fr)` fix overflow colonna destra a 1280px
- **Dark mode toggle**: `showThemeToggle=true` di default in AppHeader — toggle visibile su ogni pagina
- **ThemeInitializer**: aggiunto `data-theme` attribute + `suppressHydrationWarning` su `<html>`
- **Filtro STOR/**: lavori storici esclusi dalla sezione IN RITARDO della dashboard
- **Truncate descrizione**: ellipsis su LavoroUrgente + min-width:0 su grid li
- **PINNED.md**: multi-viewport, multi-utente real-time, checklist review completa

### 📊 Visual Audit (22/05/2026) — 246 screenshot su 13 pagine × 3 viewport × 2 temi
**Metodologia**: Playwright headless + login reale (h4t@live.it) + analisi sistematica
**Score codice** (11 agenti): media 6.8/10 (era 7.1/10 — audit precedente era solo code review)
**Insight chiave**: dashboard inguardabile principalmente per dataset di test con 50+ STOR/ in ritardo
**Residui da fare** (P1 per V1.9):
- Dark mode: contrasto "Aggiornato X min fa" a 1280px (bassa priorità)
- Tecnici/Agenda/Qualità non accessibili dalla bottom nav
- Dashboard desktop single-column (potrebbe essere 2-col)
- Nota multi-utente real-time aggiunta al PINNED

**Stato CI:** TypeScript: 0 errori · ESLint: 0 warning · Vitest: 141/141 · Build: ✅
**Copertura stimata vs DentalMaster Advanced:** ~97%

### 🆕 Infrastruttura aggiornata (22/05/2026)
- **CI/CD fix:** VAPID lazy-init → CI torna verde dopo 4 build fallite
- **BP-1 obbligatorio:** Stop hook in settings.json + regola in CLAUDE.md
- **BP-2 obbligatorio:** 11 fasi workflow implementation in CLAUDE.md
- **inject-ua-context.js:** Hook inietta 6.710 char PINNED.md + MEMORY.md ad ogni prompt
- **gstack installato:** `~/.agents/skills/gstack` (Garry Tan, YC)
- **Documenti creati:** ROADMAP-UFFICIALE.md · MAGAZZINO-VISIVO-BRAINSTORM.md · WORKFLOW-STANDARD.md · SISTEMA-MEMORIA.md

### ⚠️ Azioni manuali urgenti (ancora aperte)
1. **PEC reale** → Filippo deve configurare `/impostazioni/pec` con le sue credenziali SMTP
2. **Prima sessione di collaudo** → vedere `docs/test-filippo/COLLAUDO-HANDOFF-FILIPPO.md`

### 🗺️ Prossima milestone: V1.9
Feature da implementare prima del collaudo:
1. **RE-AUDIT PWA** — nuova sessione pulita, stessi agenti, confronto score pre/post
2. Dettatura vocale (Web Speech API) — P0
3. Email template branding — P0
4. Rifacimenti UI — P0
5. Logo + firma DdC — P0
*(Magazzino visivo → spostato in V2.0)*

### 📊 Score audit precedente (21/05/2026) — da migliorare
| Agente | Score prima | Fix applicati | Score atteso |
|--------|-------------|--------------|-------------|
| Odontotecnico | 7.5 | Prove UI, BOM materiali | 8.5+ |
| Titolare | 6.5 | Batch fatture, margini, export CSV | 8.5+ |
| Dentista | 5.0 | Portale share, push trigger | 6.5+ |
| PWA Engineer | 7.8 | Splash screens, push, viewport-fit | 9+ |
| Designer UI | 9.2 | Dark mode 27 file | 9.5+ |
| UX Expert | 6.8 | Wizard, validation, empty states | 8.5+ |
| Software Eng. | 7.2 | GSAP rimosso, security fixes | 9+ |
| Flow Titolare | 6.5 | Batch, margini, refresh | 8+ |
| Flow Tecnico | 7.5 | Push trigger rientro | 8.5+ |
| Flow Front Desk | 7.8 | Disinfettante fix, CRUD | 9+ |
| Sistematico | 7.3 | Skeletons, error bounds, DELETE | 9+ |

Vedi: `docs/roadmap/ROADMAP-UFFICIALE.md`

---

## 1. Deploy & Identità

| Voce | Valore |
|------|--------|
| URL produzione | https://uachelab.com |
| Supabase project | `iagibumwjstnveqpjbwq` |
| GitHub | https://github.com/H4tholdir/ua-app |
| Ultimo commit | `80370d0` (v1.8.0 merge) |
| CI/CD | GitHub Actions + Vercel auto-deploy su push main |
| Sviluppatore | Francesco Formicola · `francesco.formicola@live.it` |
| Admin route | `/admin/labs` · ruolo `admin_sistema` |
| Lab Filippo | `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` · ITCA01051686 · Serre SA |
| Lab Arturo Pepe | `314cd040-0893-4e9d-9ad8-786e4eefd75f` · lab di test |
| NEXT_PUBLIC_SUPPORT_PHONE | `+393381235473` (normalizzato nel codice per wa.me) |
| NEXT_PUBLIC_APP_URL | `https://uachelab.com` |

### Credenziali test (produzione)
- **Titolare lab Filippo:** `h4t@live.it` / `>[REDACTED]`
- **E2E tecnico:** `e2e-tecnico@ua-test.local` / `TestE2E!2026`
- **Admin sistema:** `francesco.formicola@live.it` (usa forgot-password)

---

## 2. CRUD Completeness (v1.8.0)

| Entità | Create | Read | Update | Delete/Archivia |
|--------|--------|------|--------|-----------------|
| Lavori | ✅ | ✅ | ✅ | ✅ (stati) |
| Clienti | ✅ | ✅ | ✅ ClienteEditSheet | ✅ soft |
| Pazienti | ✅ | ✅ | ✅ PazienteEditSheet | ✅ archivia |
| Listino | ✅ | ✅ | ✅ ListinoEditSheet + inline | ✅ soft |
| Tecnici | ✅ invite | ✅ | ✅ TecnicoEditInline | ✅ disattiva (attivo=false) |
| Magazzino | ✅ | ✅ | ✅ PATCH API | ✅ soft |
| Fatture | auto | ✅ | — | — |
| Ordini | ✅ | ✅ | ✅ | ✅ |

---

## 3. Sessione 22/05/2026 — Completamento V1.8.0

### Fix critici
- Bug magazzino/[id]/page.tsx — colonne corrette (`codice_articolo`, `nome`, `scorta_attuale`, `um_scarico`)
- NEXT_PUBLIC_SUPPORT_PHONE — normalizzazione `+` per URL `wa.me`

### Security
- Push notification triggers: `orchestrate.ts` → front_desk, `segnala` → titolare, `prove` → tecnico
- `trigger.ts` helper con `triggerPushByRole` e `triggerPushToUser`

### CRUD completo
- Pazienti PATCH + edit bottom sheet (codice_paziente, note, anamnesi, asl, sesso, data_nascita)
- Listino edit bottom sheet (nome, codice, prezzi 1-4, categoria, UM)
- Magazzino PATCH + DELETE API
- Tecnici PATCH + deactivate (lab_memberships.attivo=false)

### Dark mode (27 file fixati)
LavoroCard, StatoBadge, TabProve, TabProduzione, Dashboard*, BottomNavPill, UserProfileSheet, OrdiniList, PasskeyModal e altri

### UX completamento
- Error boundaries: `ErrorPage.tsx` + `error.tsx` su 33 pagine (ogni crash mostra "Riprova")
- Loading skeletons: 100% copertura (11 pagine mancanti aggiunte)
- Splash screens iOS: 7 PNG per tutti i modelli iPhone (SE → 14 Pro Max)

### Documento collaudo
`docs/test-filippo/COLLAUDO-HANDOFF-FILIPPO.md` — lista sistematica di tutti i test da fare con Filippo, inclusa procedura FatturaPA sicura (validazione senza invio SDI reale)

---

## 4. Cosa NON è stato fatto (V2)

| Feature | Motivo |
|---------|--------|
| Sezione `/rete` multi-lab | Architettura multi-tenant da progettare |
| PMCF follow-up automatico | Email automation avanzata |
| STS XML export | Solo se fattura diretta al paziente |
| Firma digitale P7M | Richiede integrazione AgID |
| CAPA ISO 13485 | Solo se Filippo richiede certificazione |
| Colorazione 4D | Feature di nicchia |
| Terzismo inter-lab | Richiede rearchitettura tenant |
| SDI diretto | Richiede accordi con HUB SDI |
| Fascicolo Tecnico MDR | Poco uso quotidiano |
| Terzismo DdC (altri esecutori) | Rischio MDR basso |
| WhatsApp Cloud API ufficiale | Deep links `wa.me` già sufficienti |
| Nota di credito XML (TD04) | Raro, gestibile manualmente |

---

## 5. Architettura — Decisioni Critiche

- **RLS:** `public.current_lab_id()` (NON `auth.current_lab_id()`)
- **Invite flow:** token custom `/invite/[token]` (NON `inviteUserByEmail`)
- **PEC Vault:** `upsert_pec_vault_secret` + `get_pec_vault_secret` solo service_role
- **Rifacimento:** RPC `crea_rifacimento_atomico()` — consente stato 'consegnato'
- **PATCH API:** sempre allowlist esplicita, mai blocklist
- **Onboarding:** NO `redirect('/onboarding')` nel layout — solo banner dashboard
- **Template PDF:** `no-unescaped-entities` OFF per `pdf/**`
- **ESLint CI:** `--max-warnings 0`
- **WhatsApp:** deep links `wa.me` (ToS-compliant). NO open-wa.
- **Fatture:** generate durante `orchestraConsegna`. `incluso_in_fattura` = discriminatore "già fatturato".
- **Push Notifications:** VAPID keys in `.env.local`, tabella `push_subscriptions`, SW `ua-v2`.
- **Tecnici:** NON si cancellano — `lab_memberships.attivo = false` per disattivare.

---

## 6. Design System v2.2 Warm Panna

```
Light: --bg:#DDD8D3  --sfc:#E4DFD9  --elv:#EDEDEA  --prs:#D4CFC9
       --primary:#D90012  --gold:#D4A843  --cobalt:#1B2D6B (solo nav pill)
Dark:  --bg:#1A1916  --sfc:#222019  --elv:#2C2A27   --primary:#E8001A
Font:  DM Sans (MAI Inter) · Shadow: dual-layer warm-tinted
Motion: src/design-system/motion.ts — UNICA FONTE (tokens: instant/fast/normal/slow/expressive/celebration/skeleton)
```

---

## 7. API Routes Chiave (v1.8.0)

| Route | Descrizione |
|-------|-------------|
| `/api/impostazioni` PATCH | Dati lab (allowlist esplicita) |
| `/api/impostazioni/pec/start-verify` POST | Salva PEC + invia email verifica |
| `/api/impostazioni/pec/verify-status` GET | Polling verifica PEC |
| `/api/clienti/[id]/dpa` GET | PDF DPA GDPR Art.28 |
| `/api/clienti/[id]/portale-token` GET | Token portale dentista |
| `/api/admin/invite` POST | Crea invito + email Resend |
| `/api/lavori/[id]/rifacimento` POST | Rifacimento atomico |
| `/api/qualita/psur` GET/POST | PSUR |
| `/api/fatture/export` GET | CSV fatture (?year=YYYY) |
| `/api/fatture/batch` POST | Fatturazione batch N lavori |
| `/api/lavori/pronti-da-fatturare` GET | Lavori consegnati non fatturati |
| `/api/notifications/subscribe` POST | Push subscription VAPID |
| `/api/tecnici/[id]/deactivate` POST | Disattiva tecnico (attivo=false) |
| `/api/pazienti/[id]` PATCH/DELETE | Edit e archivia paziente |
| `/api/magazzino/[id]` PATCH/DELETE | Edit e archivia articolo magazzino |
| `/api/listino/[id]` PATCH/DELETE | Edit e soft-delete voce listino |

---

## 8. Infrastruttura

| Servizio | Stato |
|----------|-------|
| Resend · `uachelab.com` | ✅ Verificato Cloudflare eu-west-1 |
| Cloudflare Email Routing catch-all | ✅ → Worker `ua-pec-verify` |
| Supabase MCP | ✅ Autenticato (OAuth ChatGPT `francesco.formicola@live.it`) |
| VAPID keys | ✅ In `.env.local` (gitignored). DB migration applicata. |
| Splash screens iOS | ✅ In `public/splash/` (7 PNG) |
| Trial Filippo | ✅ Prorogato (22/05/2026) |

---

## 9. Stripe

- Lab monthly: `price_1TWCfaRsMhN7mg7YVt0UfeNB`
- Lab yearly: `price_1TWCfbRsMhN7mg7Y7Ejl1k5w`
- Rete monthly: `price_1TWCfbRsMhN7mg7YDXKFJkdN`
- Rete yearly: `price_1TWCfcRsMhN7mg7YBZSz1gId`

---

## 10. Regole CI

```bash
npx eslint src/ --ext .ts,.tsx --max-warnings 0  # husky pre-commit
npx tsc --noEmit                                  # dopo ogni modifica
# Dopo migration Supabase (via MCP o CLI):
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
# Seed nuovo lab:
npx tsx scripts/seed-new-lab.ts <laboratorio_id>
# Rigenera splash screens:
node scripts/generate-splash.mjs
```

---

## 11. Dati Importati (lab Filippo — 971061a1)

- 20 clienti · 74 lavorazioni × 4 fasce prezzo
- 187 materiali magazzino · 40 attrezzature
- 277 lavori storici 2018-2026
- 134 cicli produzione · 371 fasi produzione
- €56.351 fatturato YTD 2026 (Gen-Apr) → stima ~€170k anno
- Top: implantoprotesi (38.4%) + scheletrato (27.8%)
