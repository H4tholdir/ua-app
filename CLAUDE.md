# UÀ — ua-app
## Linee guida per Claude Code (REPO DEL CODICE)

Questo è il repository del codice. La documentazione fondativa è in `../ANALISI/`.

---

## 0. Memory Check (BP-0)
Prima di qualsiasi lavoro, leggi `../ANALISI/` per contesto. I documenti chiave:
- **`../ANALISI/30_design_system_v2_definitivo.md` → 🔴 DESIGN SYSTEM v2.1 — UNICA FONTE DI VERITÀ**
- `../ANALISI/23_ua_database_schema.md` → schema DB
- `../ANALISI/26_ua_design_system_completo.md` → (versione precedente — NON usare per UI)
- `../ANALISI/29_motion_system_policy.md` → **MOTION POLICY OBBLIGATORIA**

---

## 1. Stack

```
Next.js 16 (App Router) + TypeScript
TailwindCSS v4 (@tailwindcss/postcss) + shadcn/ui
Motion 12.x + GSAP (free) + Rive
Supabase (PostgreSQL + Auth + Storage + Realtime)
Vercel deploy
```

---

## 2. Struttura Cartelle

```
src/
├── app/                 ← Next.js App Router pages
│   ├── (auth)/          ← Login, magic link
│   ├── (app)/           ← Main app screens (NON (dashboard)/)
│   └── api/             ← API routes
├── components/
│   ├── ui/              ← shadcn/ui components (SOLO primitive)
│   ├── layout/          ← Header, BottomNav, PageWrapper
│   └── features/        ← Feature components (LavoroCard, ConsegnaButton...)
├── design-system/
│   ├── motion.ts        ← Token animazioni (UNICA FONTE DI VERITÀ)
│   ├── haptic.ts        ← Haptic feedback helpers
│   ├── sounds.ts        ← use-sound helpers
│   └── tokens.ts        ← CSS variables, colori semantici
├── lib/
│   ├── supabase/        ← Client, server, admin instances
│   ├── pdf/             ← Template react-pdf (DdC, Buono, ecc.)
│   └── utils/           ← Utilities generali
├── hooks/               ← Custom React hooks
└── types/               ← TypeScript types/interfaces
```

---

## 3. Regola Motion — ASSOLUTA

**NON inventare duration, easing, spring nei componenti.**
Tutto da `src/design-system/motion.ts`. Zero eccezioni.

```typescript
// ✅ CORRETTO
import { t, motionTokens } from "@/design-system/motion";
transition={t("normal", "enter")}

// ❌ SBAGLIATO
transition={{ duration: 0.3, ease: "easeOut" }}
```

---

## 4. Regole Pulizia File (lezione da Archibald)

### File temporanei
- Mai screenshot di debug nella root o in `src/`
- File tmp → `/tmp/` (sistema) o `scripts/tmp/` (progetto)
- Log → mai in git, solo in console durante sviluppo

### Naming
- Componenti: `PascalCase.tsx` (es. `LavoroCard.tsx`)
- Hooks: `useCamelCase.ts` (es. `useLavori.ts`)
- Utils: `kebab-case.ts` (es. `format-date.ts`)
- Pages: `page.tsx` (Next.js convention)

### Commit message format
```
feat(lavori): add ConsegnaButton with Rive state machine
fix(db): correct RLS policy for lavori_dashboard view
chore(deps): add motion@12 and @rive-app/react-canvas
docs(design): update motion tokens in design-system
```

---

## 5. Skills disponibili

```
/high-end-visual-design    → anti-AI-slop, componenti premium
/design-taste-frontend     → React/Tailwind anti-slop
/brandkit                  → brand materials
/gsap                      → GSAP reference
/tailwind                  → Tailwind reference
```

---

## 6. Normativa — Regole veloci

- DdC: **Art. 52(8) + Allegato XIII** MDR (NON Allegato IV)
- FatturaPA: natura **N4**, bollo €2 se > €77,47
- EUDAMED: lab solo custom-made = **ESENTI**
- ITCA: **OBBLIGATORIO** (campo `laboratori.codice_itca`)

---

## 7. Audit Design System — Stato Conformità

**Audit completo:** `../ANALISI/31_audit_ui_vs_design_v2.md`

Le pagine esistenti NON sono ancora conformi al Design System v2.1:
- ❌ Usano ancora `#1B2D6B` cobalt come background card (sbagliato)
- ❌ Shadow cobalt/glow invece di neumorphic `#cacaca`
- ❌ Mancano token v2.1 in `globals.css`
- ✅ Font DM Sans: corretto
- ✅ Login + Admin: conformi al design v2.1

**Regola immediata (SENZA aspettare Piano D):**
> Ogni nuovo codice scritto usa il Design System v2.1.
> Non introdurre `background: '#1B2D6B'` o shadow cobalt.
> Per modifiche a pagine esistenti: usa i token v2.1 nei nuovi elementi.

---

## 7. Spec e Piani di Implementazione

- **Spec V1 completa:** `docs/superpowers/specs/2026-05-15-ua-spec-completo.md`
- **Piano A** (Foundation — DB + bug + GDPR): `docs/superpowers/plans/2026-05-15-plan-a-foundation.md`
- **Piano B** (Core Flows — PROVE + Rifacimento + Consegna + Scadenzario): `docs/superpowers/plans/2026-05-15-plan-b-core-flows.md`
- **Piano C** (Dashboard OGGI RBAC): `docs/superpowers/plans/2026-05-15-plan-c-dashboard.md`
- **Piano D** (UI Redesign Clay Haptimorphism): `docs/superpowers/plans/2026-05-15-plan-d-ui-redesign.md`
- **Piano E** (MDR Testing + DdC PDF + RLS): `docs/superpowers/plans/2026-05-15-plan-e-testing-mdr.md`
- **Ordine esecuzione:** A → B+C (parallelo) → D (approvazione mockup obbligatoria) → E → QA → Filippo
- **Filippo testa solo** quando tutti i piani A-E sono green + 21 checklist di release verdi (§18 spec)

---

## 8. Pricing Confermato (già in Stripe production)

| Piano | Mensile | Annuale | Stripe monthly | Stripe yearly |
|---|---|---|---|---|
| Lab | €49 | €490 | `price_1TWCfaRsMhN7mg7YVt0UfeNB` | `price_1TWCfbRsMhN7mg7Y7Ejl1k5w` |
| Rete PRO | €149 | €1.490 | `price_1TWCfbRsMhN7mg7YDXKFJkdN` | `price_1TWCfcRsMhN7mg7YBZSz1gId` |

AI add-on (V2 only): €24.90/mese · €199/anno — Stripe metered billing da configurare in V2.

---

## 9. Standard Professionali — OBBLIGATORI (da Francesco, 16 maggio 2026)

### Mentalità
- Lavora SEMPRE come se stessi costruendo un prodotto allo stato dell'arte — non correre, non compiacere, non tralasciare niente
- Impersona il professionista giusto per ogni richiesta (UI/UX expert, backend architect, security engineer, ecc.)
- Mai essere frettoloso — un'ora in più su un mockup vale più di 10 ore di refactor React

### Workflow UI/UX — ASSOLUTO
1. **Memory check BP-0 PRIMA di tutto** — leggi sessioni passate, trova decisioni già prese, non reinventare
2. **3 viewport obbligatori per ogni schermata**: mobile 390px, tablet 768px, desktop 1280px
3. **Sempre entrambi i temi**: light + dark per ogni schermata
4. **Animazioni definite nel mockup** — non si scrive React senza aver mostrato le animazioni nel prototipo HTML
5. **Suoni annotati** nei commenti HTML prima dell'approvazione
6. **Zero codice React** senza approvazione esplicita di Francesco

### Design System UÀ — Tokens di Riferimento
**Token confermati pixel-check live (Playwright su localhost:3000/login):**
```
Light:  --bg:#DDD8D3  --sfc:#E4DFD9  --elv:#EDEDEA  --prs:#D4CFC9
        --t1:#1C1916  --t2:#96918D   --t3:#B8B3AE
        --red:#D90012 --amber:#B45309 --green:#16A34A --blue:#2563EB
        --gold:#D4A843 (accent sparso) --cobalt:#1B2D6B (nav pill active)
Dark:   --bg:#1A1916  --sfc:#222019  --elv:#2C2A27   --prs:#121110
        --t1:#F0EDE8  --t2:#8A8580   --t3:#4A4845
        --red:#E8001A --green:#2ECC7A
Shadows: dual-layer warm-tinted (NO cobalt haptimorphic)
  Light raised: -5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)
  Light inset:  inset 4px 4px 9px rgba(148,128,118,.32), inset -3px -3px 7px rgba(255,255,255,.66)
  Dark raised:  -5px -5px 11px rgba(255,255,255,.018), 9px 12px 28px -4px rgba(0,0,0,.60)
  Dark inset:   inset 4px 4px 9px rgba(0,0,0,.60), inset -3px -3px 7px rgba(255,255,255,.04)
```
- Dark mode: stessi token, varianti dark da admin.css (sezione `[data-theme="dark"]`)

### Navigazione — Decisione Finale
- **A2 Floating Pill** scelto (NON full-width)
- FAB centrale: `#D90012` rosso (NON oro)
- Scroll-hide behavior con spring animation (stiffness 520, damping 36)
- Long-press (400ms) → modalità customizzazione con drag-and-drop
- Desktop ≥1024px → sidebar sinistra

### Cards Lavoro — Card C Timeline
- 3-level disclosure: dashboard compact → lista espandibile → dettaglio full-tab
- Urgency: badge circolare colorato + subtitle colored text + timeline dots (NON border-left come stile principale)
- Quick actions expand: CONSEGNA / In prova / Documenti / WhatsApp
- Tappa su card dashboard → naviga a dettaglio (no espansione inline sulla dashboard)

### Presentazione Mockup
- Ogni mockup va presentato in un UNICO file HTML interattivo con:
  - Theme toggle (light/dark) in-page
  - Viewport switcher (mobile/tablet/desktop) in-page
  - Animazioni CSS/JS per mostrare le transizioni chiave
  - Annotazioni sonore nei commenti (// SOUND: tap.mp3 al click)
  - Tutte le connessioni visibili (link admin, logout, navigazione tra schermate)
- Non mandare screenshot statici di ogni schermata singola — un prototipo completo

### Orchestrazione Agenti
- Usa swarm di agenti specializzati per task indipendenti
- L'orchestratore coordina, non implementa
- Ogni agente ha contesto preciso, non eredita la sessione principale

---

## 10. Regole Critiche (emerse da review Codex + Advisor)

- **Stati ortogonali:** `lavori.stato` (clinico) e `fatture.stato_sdi` (fiscale) sono dimensioni INDIPENDENTI — non confonderli mai
- **WhatsApp GDPR:** template SEMPRE GDPR-safe — NO nome paziente, NO tipo dispositivo, solo numero lavoro + link portale token
- **Rifacimento:** usa RPC atomica `crea_rifacimento_atomico()` — MAI 3 INSERT separati (MDR silenzioso se fallisce)
- **Precheck MDR:** tutti i dati caricati SERVER-SIDE nella route — il client non passa mai valori MDR decisionali
- **Supabase types:** `npx supabase gen types typescript > src/types/database.types.ts` dopo OGNI migration + `npx tsc --noEmit` per verifica
- **E2E seed:** eseguire `npx tsx scripts/seed-e2e.ts` prima di qualsiasi test E2E (crea fixture idempotenti)
- **RLS test:** usare client anon autenticati con JWT distinti — MAI service role per testare isolamento RLS
