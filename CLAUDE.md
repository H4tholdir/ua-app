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
