# UÀ — ua-app
## Linee guida per Claude Code (REPO DEL CODICE)

La documentazione fondativa è in `../ANALISI/`. Questo file = regole operative del repo.

---

## 0. Memory Check — BP-0 (LETTURA — OBBLIGATORIO PRIMA DI INIZIARE)

Prima di qualsiasi lavoro, in ordine:
1. `memory/SESSION_ACTIVE.md` → contesto sessione corrente (già iniettato all'avvio)
2. `memory/MEMORY.md` → stato sprint e versione attuale
3. Identifica dominio del task → leggi `memory/domains/[dominio].md` se esiste
4. Navigazione strutturale (>2 file)? → `graphify query "<domanda>"`

**SESSION_ACTIVE (aggiornamento obbligatorio):**
Aggiorna `memory/SESSION_ACTIVE.md` dopo ogni blocco di lavoro significativo (commit, decisione architetturale, bug importante). Sostituisci il file, non appendere. Max 200 token.

Documenti chiave:
- `docs/superpowers/specs/2026-05-27-design-system-v2-3.md` → **DESIGN SYSTEM v2.3 — UNICA FONTE DI VERITÀ (sostituisce v2.2)**
- `src/design-system/tokens.ts` → **TOKEN CSS/TS — importa da qui, MAI inline**
- `src/design-system/motion.ts` → **MOTION POLICY OBBLIGATORIA**
- `../ANALISI/23_ua_database_schema.md` → schema DB
- `docs/roadmap/ROADMAP-UFFICIALE.md` → **ROADMAP — fonte di verità su cosa fare e non fare**

> ⚠️ `../ANALISI/30_design_system_v2_definitivo.md` → **DEPRECATO** — sostituito da DS v2.3
> ⚠️ `../ANALISI/26_ua_design_system_completo.md` → OBSOLETO, NON usare per UI

---

## 0A. Memory Update — BP-1 (SCRITTURA — OBBLIGATORIO DOPO LAVORO SIGNIFICATIVO)

**Dopo ogni task completato che cambia lo stato del progetto**, DEVI eseguire questi 2 step:

### Step 1 — Aggiorna MEMORY.md se lo stato del progetto è cambiato
- Nuova versione deployata → aggiorna sezione "0. STATO DEL PROGETTO"
- Nuova feature completata → aggiorna sezione CRUD/feature list
- Nuova decisione architetturale → aggiorna sezione "5. Architettura"
- Nuova API route → aggiorna tabella "7. API Routes Chiave"

### Step 2 — Aggiorna ROADMAP-UFFICIALE.md se la roadmap è cambiata
- Feature spostata da V2 a V1.9 → aggiorna
- Feature completata → sposta in "implementato"
- Nuova feature aggiunta → inserisci nella versione corretta

> **REGOLA ZERO MEMORIA:** Non chiudere un task senza aver verificato questi 2 step.
> Il hook `Stop` ti ricorderà automaticamente. Non ignorarlo.
> Se dimentichi ripetutamente, stai violando il contratto operativo con Francesco.
>
> **Nota su claude-mem (verificato 02/07/2026):** in questa installazione claude-mem gira in
> modalità `worker` (`~/.claude-mem/settings.json` — impostazione globale, vale per tutti i
> progetti). In questa modalità la cattura delle osservazioni è **automatica**, via hook
> `PostToolUse`/`Stop` registrati dal plugin stesso (`worker-service.cjs hook ... observation`
> / `... summarize`) — non serve e non è disponibile una chiamata manuale a
> `observation_add` (fallisce con `requires CLAUDE_MEM_RUNTIME=server`). Non richiamarla né
> segnalarla come step mancante: MEMORY.md e ROADMAP-UFFICIALE.md restano l'unica fonte di
> verità scritta e durevole per questo progetto.

---

## 0C. Implementation Workflow — BP-2 (PROCESSO — OBBLIGATORIO PER OGNI FEATURE/FIX)

Documento completo: `docs/processes/WORKFLOW-STANDARD.md`. Versione condensata qui sotto.

**Regola di selezione orchestratore:**
| Dimensione | Orchestratori | Quando |
|-----------|--------------|--------|
| Piccola (1-3 file, <1h) | Superpowers only | Hotfix, piccoli tweak |
| Media (3-10 file, 1-2 sessioni) | GSD + Superpowers | Feature con architettura |
| Grande (10+ file, multi-sessione) | GSD (fasi) + Superpowers | Feature complesse |
| **⚠ OVERRIDE dominio critico** | **sempre percorso Grande** | **Qualsiasi change che tocca: RLS, Stripe, FatturaPA, auth, migrations — indipendentemente dal numero di file** |

**Le 12 Fasi Obbligatorie:**

```
FASE 0  → BP-0: Leggi MEMORY.md + PINNED.md (già automatico via hook)
FASE 1  → GOAL: Francesco descrive. Se ambiguo usa /gsd-explore (ideazione Socratica).
FASE 2  → BRAINSTORM: /superpowers:brainstorming (SEMPRE, anche se sembra ovvio)
FASE 3  → VALIDAZIONE ARCH (GATE — non si procede senza risposta a tutte e 5):
            □ Tenant isolation: questa change tocca RLS o current_lab_id()?
            □ Schema drift: serve migration? supabase gen types andrà rieseguito?
            □ API contract: il payload change rompe client esistenti?
            □ Rollback: come si annulla se va in prod e fallisce?
            □ Dominio critico? RLS/Stripe/FatturaPA/auth → percorso GRANDE automatico
FASE 4  → PIANO: /superpowers:writing-plans → file paths esatti, task atomici 2-5 min
FASE 5  → ISOLAMENTO: /superpowers:using-git-worktrees → branch dedicata
FASE 6  → IMPLEMENTAZIONE TDD: /superpowers:test-driven-development (RED→GREEN→REFACTOR)
FASE 6b → MIGRATION GATE (solo se migration presente in questa sessione):
            npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
            npx tsc --noEmit
            Verifica che la migration non rompa RLS policies esistenti
FASE 7  → VERIFICA: tsc --noEmit + vitest run + next build (tutti e 3, output reale)
FASE 8  → REVIEW: /gsd-code-review + /superpowers:requesting-code-review
FASE 9  → QA BROWSER: /gstack qa → Playwright 390/768/1280px
FASE 10 → DEPLOY: merge → push → attendi CI verde → verifica uachelab.com
FASE 11 → BP-1: aggiorna MEMORY.md + ROADMAP-UFFICIALE.md
```

**REGOLE ZERO:**
- MAI saltare FASE 3 (validazione architetturale) per "feature semplici"
- MAI saltare FASE 6b se hai scritto o modificato una migration in questa sessione
- MAI dichiarare "fatto" senza aver eseguito FASE 7 con output reale
- MAI deployare con CI rosso
- SEMPRE aggiornare la memoria (FASE 11 = BP-1) prima di fermarti

---

## 0B. Workflow UI — Obbligatorio per ogni nuova pagina/feature

Per **ogni nuova pagina o feature con UI**, seguire questo ordine senza eccezioni:

1. **Ricerca best practice** — cerca sempre pattern UX/UI di riferimento per il dominio specifico (fintech, gestione lavori, MDR compliance, ecc.). Includi: animazioni raccomandate, sound/haptic feedback, pattern viewport.
2. **Mockup HTML** in `docs/design/mockups/YYYY-MM-DD-nome-feature.html` — **MAI in /tmp/** (i file /tmp vengono cancellati, le decisioni si perdono). Dati reali simulati, nessun placeholder.
3. **Screenshot Playwright** del mockup — salvare anche in `docs/design/mockups/screenshots/`. Mostrarlo a Francesco.
4. **Approvazione Francesco** — aspettare esplicito "ok procedi" prima di scrivere React. Scrivere la decisione in `docs/design/decisions/YYYY-MM-DD-nome-feature.md`.
5. **Implementazione React** — fedele al mockup approvato, con:
   - **Animazioni** da `src/design-system/motion.ts` (SOLO token, MAI inline)
   - **Suoni/Haptic** da `src/lib/feedback/sounds.ts` e `src/lib/feedback/haptic.ts`
   - **3 viewport**: mobile 390px (card-first, bottom sheet), tablet 768px (split-view), desktop 1280px (tabella/layout completo)
   - **Accessibilità**: `prefers-reduced-motion`, touch target ≥ 44px, colore mai unica fonte di stato

**Anti-pattern permanenti:**
- ❌ MAI tabella full-width su mobile — usare card + accordion
- ❌ MAI modal centrato su mobile per azioni — usare bottom sheet
- ❌ MAI animazioni su ogni scroll — solo su eventi significativi
- ❌ MAI suoni autoplay — sempre lazy init + preferenza utente
- ❌ MAI più di 3 KPI above the fold su mobile

---

## 1. Stack

```
Next.js 16 (App Router) + TypeScript
TailwindCSS v4 (@tailwindcss/postcss) + shadcn/ui
Motion 12.x + GSAP (free) + Rive
Supabase (PostgreSQL + Auth + Storage + Realtime)
Vercel deploy (git push origin main → auto)
```

---

## 2. Comandi

```bash
npm run dev                    # localhost:3000
npx tsc --noEmit               # TypeScript check (zero errori richiesti)
npx vitest run                 # 136 test unitari
npx next build                 # Build production locale

# Dopo ogni migration Supabase:
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit               # verifica immediata

npx tsx scripts/seed-e2e.ts    # seed fixture E2E (idempotente)
```

---

## 3. Struttura Cartelle

```
src/
├── app/
│   ├── (auth)/          ← login, magic link, invite, reset-password
│   ├── (app)/           ← pagine operative (NON (dashboard)/)
│   ├── admin/           ← pannello admin Francesco (/admin)
│   └── api/             ← API routes (~42)
├── components/
│   ├── ui/              ← shadcn/ui primitives SOLO
│   ├── layout/          ← AppHeader, BottomNavPill, PageWrapper
│   └── features/        ← LavoroCard, ConsegnaButton, ImpostazioniEditForm...
├── design-system/
│   ├── motion.ts        ← token animazioni (UNICA FONTE DI VERITÀ)
│   ├── haptic.ts
│   └── tokens.ts
├── lib/
│   ├── supabase/        ← server-user.ts, server-service.ts, browser-anon.ts
│   ├── pdf/             ← DdcTemplate, BuonoTemplate
│   └── utils/
└── types/               ← database.types.ts (generato, non editare manualmente)
```

---

## 4. Regola Motion — ASSOLUTA

**NON inventare duration, easing, spring.** Tutto da `src/design-system/motion.ts`.

```typescript
// ✅ CORRETTO
import { t } from "@/design-system/motion"
transition={t("normal", "enter")}

// ❌ SBAGLIATO
transition={{ duration: 0.3, ease: "easeOut" }}
```

---

## 5. Naming + Commit

```
Componenti: PascalCase.tsx      Hooks: useCamelCase.ts
Utils:      kebab-case.ts       Pages: page.tsx (Next.js)
Temp files: /tmp/ o scripts/tmp/ — MAI in src/ o root

feat(lavori): add ConsegnaButton
fix(db): correct RLS policy
chore(deps): add motion@12
```

---

## 6. Normativa — Regole veloci

- **DdC:** Art. 52(8) + Allegato XIII MDR (NON Allegato IV)
- **FatturaPA:** natura **N4**, bollo €2 se > €77,47
- **EUDAMED:** lab custom-made = **ESENTI**
- **ITCA:** OBBLIGATORIO (campo `laboratori.codice_itca`)

---

## 7. Pricing Stripe (già in produzione)

| Piano | Mensile | Annuale | Price ID mensile | Price ID annuale |
|-------|---------|---------|-----------------|-----------------|
| Lab | €49 | €490 | `price_1TWCfaRsMhN7mg7YVt0UfeNB` | `price_1TWCfbRsMhN7mg7Y7Ejl1k5w` |
| Rete PRO | €149 | €1.490 | `price_1TWCfbRsMhN7mg7YDXKFJkdN` | `price_1TWCfcRsMhN7mg7YBZSz1gId` |

---

## 8. Stato Attuale (18/05/2026)

Piani A → G tutti **completati**. App in produzione su https://uachelab.com.

**Pagine attive:** 34+ incluse `/onboarding`, `/impostazioni/pec`, `/impostazioni/profilo`, `/impostazioni/abbonamento`, `/fatture/[id]`, `/magazzino/[id]`, `/pazienti/[id]`.

**Design system:** v2.2 warm panna conforme in tutte le pagine nuove. Eventuali pagine legacy pre-Piano D: aggiornare i nuovi elementi al v2.2, non riscrivere l'intera pagina.

---

## 10. Graphify — Knowledge Graph del Codebase

Il grafo è già generato in `graphify-out/` (2140 nodi, 4349 archi, 186 comunità).
Si aggiorna automaticamente ad ogni `git commit` via hook `.husky/post-commit` (solo tree-sitter, zero costo API).

```bash
# Query semantica sul codebase
graphify query "come funziona il flusso consegna MDR?"

# Traccia percorso tra due componenti
graphify path "ConsegnaButton" "orchestraConsegna"

# Spiega un simbolo specifico e i suoi vicini
graphify explain "getServiceClient"

# Rigenera grafo dopo refactoring pesante (zero costo API)
graphify update . --no-viz

# Rigenera grafo da zero con LLM (costa ~$6, solo se serve reset completo)
graphify . --no-viz
```

God nodes critici (più connessi):
- `getServiceClient()` → 161 archi — hub di tutti gli accessi Supabase
- `getServerUserClient()` → 134 archi — auth SSR
- `AppHeader()` → 50 archi — presente in quasi ogni pagina

---

## 9. Regole Critiche (emerse da review + errori passati)

### Gotchas architetturali
- **RLS:** usa `public.current_lab_id()` — NON `auth.current_lab_id()` (funzione in schema `public`)
- **Stati ortogonali:** `lavori.stato` (clinico) e `fatture.stato_sdi` (fiscale) sono dimensioni INDIPENDENTI
- **Rifacimento:** usa RPC atomica `crea_rifacimento_atomico()` — MAI 3 INSERT separati
- **Precheck MDR:** tutti i dati caricati SERVER-SIDE nella route — il client non passa mai valori MDR

### Gotchas invite + onboarding (Piano G)
- **Invite flow:** flow custom token (`/invite/[token]`) — NON usare `inviteUserByEmail` Supabase (incompatibile)
- **Redirect onboarding:** NON mettere `redirect('/onboarding')` nel layout `(app)/layout.tsx` — causa loop infinito (il layout non legge il pathname). Usare SOLO banner dashboard.
- **complete():** il wizard onboarding deve verificare `res.ok` prima di `router.push('/dashboard')`

### Gotchas API + sicurezza
- **PATCH allowlist:** API PATCH di risorse lab usa sempre allowlist esplicita di campi — MAI blocklist
- **SECURITY DEFINER:** funzioni PL/pgSQL SECURITY DEFINER richiedono `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT` esplicito solo a `service_role`
- **WhatsApp GDPR:** template MAI con nome paziente — solo numero lavoro + link portale token

### Supabase types
Dopo ogni migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → rimuovere eventuale messaggio CLI in fondo al file → `npx tsc --noEmit`

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
