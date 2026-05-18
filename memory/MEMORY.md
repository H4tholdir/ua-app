# UÀ — Project Memory
**Ultimo aggiornamento:** 19 maggio 2026 — PEC Setup inbound verification + infrastruttura email completata

---

## 1. Stato del Progetto (aggiornato al 19/05/2026)

### Deploy
- **URL produzione:** https://uachelab.com
- **Supabase project:** `iagibumwjstnveqpjbwq` → https://iagibumwjstnveqpjbwq.supabase.co
- **GitHub repo:** https://github.com/H4tholdir/ua-app
- **Ultimo commit pushato:** `91e5adf` (fix ESLint CI)
- **141 test verdi** · **CI GitHub: verde** · **CD Vercel: attivo**

### ✅ Piano F completato (18/05/2026 — go-live bloccanti)
- Fix form Nuovo Lavoro: handleClienteChange + validazione server-side cliente_id
- /api/impostazioni PATCH: allowlist esplicita (include onboarding_completato)
- /impostazioni: edit mode con ImpostazioniEditForm + link a /impostazioni/pec
- /impostazioni/pec: ora usa PecSetupWidget (vedi Piano PEC)
- /impostazioni/profilo: cambio password
- /onboarding: wizard 6-step (banner dashboard, senza redirect loop)
- Email templates Supabase: ✅ aggiornati con branding UÀ (19/05/2026)

### ✅ Piano G completato (18/05/2026 — V1 completion)
- fix(invite): email via Resend con template HTML branding UÀ
- /fatture/[id], /magazzino/[id], /pazienti/[id]: pagine detail
- /impostazioni/abbonamento: stato piano + Stripe portal
- Fix background cobalt nella live preview admin

### ✅ PEC Setup — Inbound Verification Loop (19/05/2026)
**Spec:** `docs/superpowers/specs/2026-05-18-pec-setup-design.md`
**Piano:** `docs/superpowers/plans/2026-05-18-pec-setup-inbound-verify.md`
- `PecSetupWidget`: componente riutilizzabile (wizard + /impostazioni/pec) con 6 stati UI
- Auto-detect provider da dominio email (8 provider PEC italiani)
- Accordion fallback per provider sconosciuti
- Loop verifica end-to-end: lab PEC → verify+{token}@uachelab.com → Cloudflare → Worker → DB
- `pec_verificata`, `pec_verified_at`, `pec_verify_token` in tabella laboratori
- **TEST END-TO-END SUPERATO** (19/05/2026 22:17 UTC) ✅

### Credenziali admin
- **Admin email:** francesco.formicola@live.it
- **Admin role:** admin_sistema
- **Admin route:** /admin/labs

### Laboratori nel DB
- **Lab Filippo:** `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` · ITCA01051686 · trial
- **Lab Arturo Pepe:** `314cd040-0893-4e9d-9ad8-786e4eefd75f` · ITCA01050077 · trial

---

## 2. Infrastruttura Email (COMPLETA)

### Resend
- **Dominio verificato:** `uachelab.com` (Cloudflare, eu-west-1) ✅
- **FROM address:** `noreply@uachelab.com` ✅
- **API key:** in `.env.local` e Vercel production ✅
- **Scopo:** email inviti titolari (flow custom token)

### Supabase Email Templates
- Confirm signup → branding UÀ ✅
- Reset Password → branding UÀ ✅
- Invite User → branding UÀ ✅
- **Configurati via Management API il 19/05/2026**

### Cloudflare Email Routing
- **Catch-all:** `@uachelab.com` → Worker `ua-pec-verify` ✅ Active
- **Worker:** `ua-pec-verify` su account h4t (deployato 19/05/2026)
- **Scopo:** ricezione email di verifica PEC (verify+{token}@uachelab.com)

### DMARC
- Record `_dmarc` TXT aggiunto su Cloudflare: `v=DMARC1; p=none; rua=mailto:noreply@uachelab.com` ✅

---

## 3. Design System v2.2 (DEFINITIVO)

**Fonte di verità:** `ANALISI/30_design_system_v2_definitivo.md`

```
Light: --bg:#DDD8D3  --sfc:#E4DFD9  --elv:#EDEDEA  --prs:#D4CFC9
       --t1:#1C1916  --t2:#96918D   --t3:#B8B3AE
       --primary:#D90012  --gold:#D4A843  --cobalt:#1B2D6B (nav pill ONLY)
Dark:  --bg:#1A1916  --sfc:#222019  --elv:#2C2A27   --prs:#121110
       --t1:#F0EDE8  --t2:#8A8580   --t3:#4A4845    --primary:#E8001A

Shadows: dual-layer warm-tinted
  Light raised: -5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)
  Light inset:  inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)
  Dark raised:  -5px -5px 11px rgba(255,255,255,.018), 9px 12px 28px -4px rgba(0,0,0,.60)

Font: DM Sans (400-800) — tutto UI (MAI Inter)
Nav: A2 Floating Pill, FAB centrale rossa #D90012
```

**VIETATO:** `#0F1E52`/`#1B2D6B` come background · shadow cobalt · Inter · gradient viola-blu

---

## 4. Architettura Chiave (decisioni non riaprire)

### Auth + Inviti
- Invite flow: **custom token** (`/api/admin/invite` → tabella `inviti` → Resend email → `/invite/[token]`)
- **NON usare** `inviteUserByEmail` Supabase (incompatibile con flow custom)
- `admin_sistema` → redirect a `/admin/labs` (MAI /dashboard — loop)
- `public.current_lab_id()` — NON `auth.current_lab_id()` (funzione in schema `public`)

### PEC
- `upsert_pec_vault_secret(p_lab_id, p_password)` — SECURITY DEFINER, solo service_role
- `get_pec_vault_secret(p_lab_id)` — SECURITY DEFINER, solo service_role
- Verifica end-to-end: `POST /api/impostazioni/pec/start-verify` → `GET /api/impostazioni/pec/verify-status`
- Callback Cloudflare Worker → `POST /api/internal/pec-verify` (x-internal-secret header)

### API Security
- **PATCH allowlist** obbligatoria — MAI blocklist
- **SECURITY DEFINER** SQL: sempre `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT TO service_role`
- `isSameOrigin()` su tutte le API route che accettano POST

### Onboarding
- **NO** `redirect('/onboarding')` nel layout `(app)/layout.tsx` — causa loop infinito
- Usare SOLO banner dashboard + link a `/onboarding`
- `complete()` nel wizard: verificare `res.ok` prima di `router.push()`

### Stripe
- Lab monthly: `price_1TWCfaRsMhN7mg7YVt0UfeNB`
- Lab yearly: `price_1TWCfbRsMhN7mg7Y7Ejl1k5w`
- Rete monthly: `price_1TWCfbRsMhN7mg7YDXKFJkdN`
- Rete yearly: `price_1TWCfcRsMhN7mg7YBZSz1gId`

---

## 5. Piani Completati

| Piano | Status | Data |
|---|---|---|
| A — Foundation (DB, auth, bug) | ✅ | 15/05 |
| B — Core Flows (prove, rifacimento, consegna) | ✅ | 15/05 |
| C — Dashboard RBAC (3 ruoli) | ✅ | 15/05 |
| D — UI Redesign (warm panna v2.2) | ✅ | 15/05 |
| E — MDR Testing + DdC PDF + RLS | ✅ | 15/05 |
| Admin Panel completo | ✅ | 17/05 |
| Import DentalMaster | ✅ | 17/05 |
| F — V1 Go-Live bloccanti | ✅ | 18/05 |
| G — V1 Completion | ✅ | 18/05 |
| PEC Setup — Inbound Verification Loop | ✅ | 19/05 |

---

## 6. Pagine Implementate (37+)

```
(app)/dashboard          (app)/lavori             (app)/lavori/nuovo
(app)/lavori/[id]        (app)/clienti            (app)/fatture
(app)/fatture/[id]       (app)/magazzino          (app)/magazzino/[id]
(app)/pazienti           (app)/pazienti/[id]      (app)/listino
(app)/scadenzario        (app)/tecnici            (app)/rete
(app)/qualita            (app)/impostazioni       (app)/impostazioni/pec
(app)/impostazioni/profilo  (app)/impostazioni/abbonamento
(app)/onboarding         (app)/portale/[token]    (app)/billing
admin/labs               admin/labs/[id]          admin/labs/new
admin/labs/[id]/live     (auth)/login             (auth)/invite/[token]
(auth)/reset-password    (auth)/auth/callback
```

---

## 7. API Routes Chiave

| Route | Metodo | Descrizione |
|-------|--------|-------------|
| `/api/impostazioni` | GET, PATCH | Dati lab (PATCH con allowlist esplicita) |
| `/api/impostazioni/pec` | PATCH, POST | Config PEC SMTP (PATCH=salva, POST=test legacy) |
| `/api/impostazioni/pec/start-verify` | POST | Salva credenziali + testa SMTP + invia email → token |
| `/api/impostazioni/pec/verify-status` | GET | Polling verifica (polling 2s dal client) |
| `/api/internal/pec-verify` | POST | Callback Cloudflare Worker → pec_verificata=true |
| `/api/admin/invite` | POST | Crea invito + invia email via Resend |
| `/api/auth/accept-invite` | POST | Accetta invito, crea utente |
| `/api/lavori` | GET, POST | Lavori (POST con validazione server-side) |
| `/api/stripe/portal` | GET | Redirect al Stripe Customer Portal |

---

## 8. Componenti Chiave

```
src/components/features/
├── pec/PecSetupWidget.tsx       ← widget PEC con 6 stati + auto-detect provider
├── impostazioni/ImpostazioniEditForm.tsx
├── dashboard/DashboardTitolare.tsx   ← include banner onboardingPending
└── clienti/ClienteComboBox.tsx

src/lib/pec/
├── providers.ts                 ← 8 provider PEC italiani + detectProvider()
└── errors.ts                    ← mapSmtpError() → messaggi italiani

cloudflare/email-worker/
├── worker.js                    ← Email Worker Cloudflare (deployato)
├── wrangler.toml
└── README.md                    ← istruzioni deploy
```

---

## 9. Dati Filippo Opromolla

```
Nome: Filippo Opromolla
CF: PRMFPP69S17Z112Q · P.IVA: 03508740655 · ITCA: ITCA01051686
Indirizzo: via Tempone Siepe Grande snc, 84028 Serre (SA)
Telefono: 3473334094 · Email: filippopromolla@gmail.com
PRRC: Filippo Opromolla — Odontotecnico abilitato
Regime fiscale: RF01 · Codice IVA: N4
Lab ID: 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c
```

Dati importati: 18 clienti · 72 lavorazioni × 4 fasce · 185 articoli magazzino

---

## 10. Prossimi Task

### Pronto per Filippo (da fare con lui)
1. **PEC SMTP reale** — Filippo configura le sue credenziali in `/impostazioni/pec`
2. **Test flow invito completo** — crea lab demo → invia invito → email arriva → wizard onboarding → dashboard
3. **Consegna end-to-end test** — un lavoro reale con DdC ITCA01051686 + PDF + consegna

### Infrastruttura
4. **Husky pre-commit** — `chmod +x /Users/hatholdir/Downloads/SOFTWARE\ FILIPPO/ua-app/.husky/pre-commit`
5. **NEXT_PUBLIC_SUPPORT_PHONE** — inserire numero WhatsApp reale in .env.local e Vercel

### V1.1 (futuri)
- Input voce
- Push notifications
- WhatsApp Business API (ora solo link template)
- Report/statistiche avanzate avanzate
- Billing page redesign

---

## 11. Note Tecniche

- **Supabase Site URL:** `https://uachelab.com` ✅
- **Supabase Redirect URLs:** `https://uachelab.com/**` ✅
- **Env vars Vercel Production:** tutte configurate (SUPABASE_*, STRIPE_*, RESEND_*, INTERNAL_SECRET) ✅
- **pg_cron:** attivo — refresh dashboard KPI ogni 15 min
- **Supabase gen types:** eseguire dopo ogni migration + rimuovere eventuale riga CLI in fondo
- **ESLint:** `--max-warnings 0` nel CI — zero warning tollerati
- **WhatsApp GDPR:** template MAI con nome paziente — solo numero lavoro + link portale token
- **Rifacimento:** usa RPC `crea_rifacimento_atomico()` — MAI 3 INSERT separati
