# UÀ — ua-app
## Linee guida per Claude Code (REPO DEL CODICE)

La documentazione fondativa è in `../ANALISI/`. Questo file = regole operative del repo.

---

## 0. Memory Check — BP-0

Prima di qualsiasi lavoro: leggi `memory/MEMORY.md`. Documenti chiave:
- `../ANALISI/30_design_system_v2_definitivo.md` → **DESIGN SYSTEM v2.2 — UNICA FONTE DI VERITÀ**
- `../ANALISI/23_ua_database_schema.md` → schema DB
- `../ANALISI/29_motion_system_policy.md` → **MOTION POLICY OBBLIGATORIA**

> ⚠️ `../ANALISI/26_ua_design_system_completo.md` → OBSOLETO, NON usare per UI

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
