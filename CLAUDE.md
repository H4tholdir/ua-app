# UÀ — ua-app
## Linee guida per Claude Code (REPO DEL CODICE)

Questo è il repository del codice. La documentazione fondativa è in `../ANALISI/`.

---

## 0. Memory Check (BP-0)
Prima di qualsiasi lavoro, leggi `../ANALISI/` per contesto. I documenti chiave:
- `../ANALISI/23_ua_database_schema.md` → schema DB
- `../ANALISI/26_ua_design_system_completo.md` → design system
- `../ANALISI/29_motion_system_policy.md` → **MOTION POLICY OBBLIGATORIA**

---

## 1. Stack

```
Next.js 16 (App Router) + TypeScript
TailwindCSS v3 + shadcn/ui
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
│   ├── (dashboard)/     ← Main app screens  
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

## 9. Regole Critiche (emerse da review Codex + Advisor)

- **Stati ortogonali:** `lavori.stato` (clinico) e `fatture.stato_sdi` (fiscale) sono dimensioni INDIPENDENTI — non confonderli mai
- **WhatsApp GDPR:** template SEMPRE GDPR-safe — NO nome paziente, NO tipo dispositivo, solo numero lavoro + link portale token
- **Rifacimento:** usa RPC atomica `crea_rifacimento_atomico()` — MAI 3 INSERT separati (MDR silenzioso se fallisce)
- **Precheck MDR:** tutti i dati caricati SERVER-SIDE nella route — il client non passa mai valori MDR decisionali
- **Supabase types:** `npx supabase gen types typescript > src/types/database.types.ts` dopo OGNI migration + `npx tsc --noEmit` per verifica
- **E2E seed:** eseguire `npx tsx scripts/seed-e2e.ts` prima di qualsiasi test E2E (crea fixture idempotenti)
- **RLS test:** usare client anon autenticati con JWT distinti — MAI service role per testare isolamento RLS
