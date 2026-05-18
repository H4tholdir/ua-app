# UÀ — Project Memory
**Ultimo aggiornamento:** 18 maggio 2026 — Piano F (go-live) + Piano G (V1 completion) completati

---

## 1. Stato del Progetto (aggiornato al 18/05/2026)

### Deploy
- **URL produzione:** https://uachelab.com
- **Supabase project:** `iagibumwjstnveqpjbwq` → https://iagibumwjstnveqpjbwq.supabase.co
- **GitHub repo:** https://github.com/H4tholdir/ua-app
- **Ultimo commit pushato:** `e1569b1` (Piano F + G completati)

### ✅ Piano F completato (18/05/2026 — go-live bloccanti)
- Fix form Nuovo Lavoro: handleClienteChange firma corretta + validazione server-side cliente_id
- /api/impostazioni PATCH: convertito da blocklist a allowlist esplicita (include onboarding_completato)
- /impostazioni: edit mode con ImpostazioniEditForm + link a /impostazioni/pec
- /impostazioni/pec: configurazione SMTP PEC con Supabase Vault (REVOKE+SELECT FOR UPDATE)
- /impostazioni/profilo: cambio password
- /onboarding: wizard 6-step (banner dashboard, senza redirect loop, complete() verifica res.ok)
- Email templates: doc in docs/email-templates-supabase.md (configurazione manuale richiesta)

### ✅ Piano G completato (18/05/2026 — V1 completion)
- fix(invite): email inviata via Resend con template HTML branding UÀ
- Audit infrastruttura: Supabase ✅ Vercel ✅ estensioni ✅ RLS ✅
- /fatture/[id]: dettaglio fattura con righe e stato SDI
- /magazzino/[id]: dettaglio articolo con giacenza e alert scorta minima
- /pazienti/[id]: storico paziente GDPR-safe con lista lavori
- /impostazioni/abbonamento: stato piano + link Stripe portal
- Fix background cobalt nella live preview admin (var(--bg) invece di #0F1E52)

### Credenziali admin
- **Admin email:** francesco.formicola@live.it
- **Admin role:** admin_sistema
- **Admin lab:** UÀ HQ (`aa14e38a-a86c-4454-9a87-bfd847a71d28`)
- **Admin route:** /admin/labs

### Laboratori nel DB
- **Lab Filippo:** `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` · P.IVA 03508740655 · ITCA01051686 · stato: trial
- **Lab Arturo Pepe:** `314cd040-0893-4e9d-9ad8-786e4eefd75f` · P.IVA 02330640653 · ITCA01050077 · stato: trial

---

## 2. Design System v2.2 (DEFINITIVO)

**Fonte di verità:** `ANALISI/30_design_system_v2_definitivo.md`

```
Background: --bg: #DDD8D3 (panna warm da admin.css)
Surface:    --surface: #E4DFD9
Elevated:   --elv: #EDEDEA
Pressed:    --prs: #D4CFC9
Testo:      --t1: #1C1916  --t2: #96918D  --t3: #B8B3AE
Primary:    --primary: #D90012  (NON #E30613)
Success:    --success: #16A34A
Urgente:    --urgente: #F97316
Warning:    --warning: #B45309
Info:       --info: #2563EB

Shadow card: --sh-c (warm-tinted asimmetrica da admin.css)
Shadow btn:  --sh-b
Shadow inset:--sh-i
Shadow red:  --sh-red

Font: DM Sans (400-800) — tutto UI
Font brand: Playfair Display — SOLO headline marketing, MAI KPI
KPI numbers: DM Sans 800 (NON Playfair)

Nav: A2 Floating Pill, FAB centrale bianco con + rossa
Card: metallic con shine, badge circolare stato top-right, 4-dot timeline
```

**VIETATO:** `#1B2D6B` (cobalt) come background · shadow cobalt HSL · Inter · glow colorati · blur ≠ 2× offset

---

## 3. Decisioni Tecniche Prese (non riaprire)

### Database
- **Migrations applicate al remote:** 009 (ultima: audit_log_triggers)
- **pg_cron:** attivo (refresh dashboard KPI ogni 15 min)
- **audit_log:** trigger su lavori/clienti/fatture/dichiarazioni_conformita/magazzino/listino/utenti/laboratori
- **Funzione admin_delete_laboratorio():** elimina lab in cascade, NON tocca admin_sistema
- **admin_delete_laboratorio:** NON elimina utenti con ruolo admin_sistema

### Auth
- `admin_sistema` → redirect a `/admin/labs` (NON a /dashboard — causerebbe loop)
- Service Worker (`sw.js`): skip `request.mode === 'navigate'` e `/_next/`
- ThemeToggleButton è un Client island separato da AppHeader (che è Server Component)
- SkipToContent è un Client island (onFocus/onBlur non possono stare in Server Component)

### Stripe
- Lab monthly: `price_1TWCfaRsMhN7mg7YVt0UfeNB`
- Lab yearly: `price_1TWCfbRsMhN7mg7Y7Ejl1k5w`
- Rete monthly: `price_1TWCfbRsMhN7mg7YDXKFJkdN`
- Rete yearly: `price_1TWCfcRsMhN7mg7YBZSz1gId`

---

## 4. Dati Filippo Opromolla (importati da DentalMaster)

```
Nome: Filippo Opromolla
CF: PRMFPP69S17Z112Q
P.IVA: 03508740655
ITCA: ITCA01051686
Indirizzo: via Tempone Siepe Grande snc, 84028 Serre (SA)
Telefono: 3473334094
Email: filippopromolla@gmail.com
PRRC: Filippo Opromolla — Odontotecnico abilitato
Regime fiscale: RF01 — Codice IVA: N4
```

**Dati importati:**
- 18 clienti/dentisti (da CLIENTI.tab + LISTA CLIENTI.pdf)
- 72 lavorazioni × 4 fasce prezzo (da LISTINO.tab + PDF)
- 185 articoli magazzino (da VALORI MAGAZZINO.pdf)
- 4 lavorazioni senza prezzo: cod 2 (Moncone sfilabile), 19 (Armatura ceramica), 28 (Telescopico), 50 (Riparazione rinforzata)

**File DentalMaster:** `/Users/hatholdir/Downloads/SOFTWARE FILIPPO/DentalMaster Advanced 2021/file esportati dentalmaster/`
Script import: `scripts/import-dm-completo.ts`, `scripts/import-dentalmaster-parsed.ts`

---

## 5. Cosa Manca per Go-Live con Filippo

### Obbligatorio (bloccante)
1. **PEC SMTP Filippo** — configurare in /impostazioni/pec con credenziali reali e testare
2. **RESEND_API_KEY reale** — il placeholder in .env.local va sostituito con API key reale
3. **Email templates Supabase** — configurazione manuale in dashboard → docs/email-templates-supabase.md
4. **Consegna test end-to-end** — con lavoro reale Filippo, verifica DdC ITCA01051686

### Correzioni Codex integrate (18/05/2026)
- ✅ NO redirect('/onboarding') nel layout → banner dashboard
- ✅ Vault SQL: REVOKE EXECUTE + SELECT FOR UPDATE
- ✅ Invite flow: custom token mantenuto, email via Resend
- ✅ API PATCH allowlist (era blocklist)
- ✅ complete() verifica res.ok prima di router.push()
- ✅ Background cobalt rimosso dalla live preview

### Nice-to-have (V1 ma non bloccanti)
- Input voce 🎤 (Flow 1, 3)
- Push notifications wireate
- WhatsApp Business API (ora solo link template)
- Ordini fornitori automatici
- Animazione successo consegna
- Report/statistiche avanzate
- STL file handling
- Admin profilo/impostazioni section

---

## 6. Piani Completati

| Piano | Status |
|---|---|
| A — Foundation (DB, auth, bug) | ✅ |
| B — Core Flows (prove, rifacimento, consegna, scadenzario) | ✅ |
| C — Dashboard RBAC (3 ruoli) | ✅ |
| D — UI Redesign (warm panna v2.2) | ✅ |
| E — MDR Testing + DdC PDF + RLS | ✅ |
| Admin Panel completo | ✅ |
| Import DentalMaster | ✅ |
| F — V1 Go-Live bloccanti | ✅ 18/05/2026 |
| G — V1 Completion | ✅ 18/05/2026 |

---

## 7. Struttura Cartelle Chiave

```
src/
├── app/(app)/          ← pagine operative (dashboard, lavori, clienti, ecc.)
├── app/(auth)/         ← login, invite, forgot-password
├── app/admin/          ← pannello admin Francesco
├── app/api/            ← 38 route API
├── app/billing/        ← pagina billing (da redesignare)
├── components/
│   ├── features/dashboard/  ← KpiCard, LavoroUrgente, Dashboard*
│   ├── features/lavori/     ← LavoroCard, ConsegnaButton, TabProve, RifacimentoModal
│   └── layout/              ← BottomNavPill, AppHeader, ThemeToggleButton, SkipToContent
├── design-system/
│   ├── motion.ts       ← UNICA FONTE token animazioni
│   └── tokens.ts
├── lib/
│   ├── consegna/       ← precheck MDR, orchestrate, pec, whatsapp
│   ├── dashboard/      ← queries, cache-stale
│   ├── fattura/        ← xml-helpers, generate-xml
│   ├── pdf/            ← DdcTemplate, BuonoTemplate, generate-ddc
│   └── pec/            ← providers (9 italiani), config
└── hooks/useTheme.ts
```

---

## 8. Documenti di Riferimento

```
ANALISI/
├── 15_dentalmaster_funzionalita_complete.md  ← DentalMaster 1:1
├── 16_odontec_analisi_completa.md            ← Odontec 1:1
├── 17_adempimenti_lab_2026.md                ← MDR + FatturaPA + GDPR
├── 23_ua_database_schema.md                  ← Schema DB completo
├── 26_ua_design_system_completo.md           ← versione precedente (NON usare)
├── 29_motion_system_policy.md                ← MOTION POLICY OBBLIGATORIA
├── 30_design_system_v2_definitivo.md         ← ← ← DESIGN SYSTEM ATTUALE v2.2
└── 31_audit_ui_vs_design_v2.md               ← audit pagine vs design

docs/superpowers/
├── specs/2026-05-15-ua-spec-completo.md     ← spec completa v1.1
└── plans/
    ├── 2026-05-15-plan-a-foundation.md
    ├── 2026-05-15-plan-b-core-flows.md
    ├── 2026-05-15-plan-c-dashboard.md
    ├── 2026-05-15-plan-d-ui-redesign.md
    └── 2026-05-15-plan-e-testing-mdr.md
```

---

## 9. Prossima Sessione — Da Fare

1. **RESEND_API_KEY reale** — sostituire placeholder in .env.local e Vercel env
2. **Email templates Supabase** — copiarli da docs/email-templates-supabase.md nel Dashboard Supabase
3. **PEC SMTP Filippo** — configurare credenziali reali in /impostazioni/pec
4. **Test flow invito completo** — creare nuovo lab, inviare invito, verificare email, accettare, completare onboarding
5. **Consegna end-to-end** con dati reali Filippo
6. **E2E test con creds reali** (seed-e2e.ts)

---

## 10. Note Importanti

- **Husky pre-commit** non ha i permessi di esecuzione — `chmod +x .husky/pre-commit` da fare
- **NEXT_PUBLIC_APP_URL** = `https://uachelab.com` in .env.local ✅
- **Supabase Site URL** = `https://uachelab.com` (aggiornato il 17/05/2026) ✅
- **Supabase Redirect URLs** = `https://uachelab.com/**` ✅
- **LAB_FILIPPO_ID** = `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` — usare per import script
- **Logout button**: Uiverse.io by vinodjangid07 — usare .adm-nav-logout-btn CSS in tutti i punti logout
- **Toggle tema**: Uiverse.io by Galahhad — usare .adm-theme-switch CSS
- **Design DESIGN/billing-piani/**: mockup approvati v7 — già implementati
- **Design DESIGN/admin/**: mockup approvati v3b — riferimento per future modifiche admin
- **Worktree** attivo: `.claude/worktrees/plan-c-dashboard-rbac` (branch non ancora mergeato)
