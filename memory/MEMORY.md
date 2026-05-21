# UÀ — Project Memory
**Ultimo aggiornamento:** 21 maggio 2026 — Sessione Mega Audit + Piano A+B+C

---

## 0. STATO DEL PROGETTO — V1.7.0

**V1.7.0 in produzione su https://uachelab.com — 21/05/2026**

| Versione | Data | Tag | Contenuto |
|----------|------|-----|-----------|
| V1.5.1 | 21/05/2026 | `v1.5.1` | Piano A — Security fixes |
| V1.6.0 | 21/05/2026 | `v1.6.0` | Piano B — UX Excellence |
| V1.7.0 | 21/05/2026 | `v1.7.0` | Piano C — Delight + Business Intelligence |

**Stato CI:** TypeScript: 0 errori · ESLint: 0 warning · Vitest: 141/141 · Build: ✅
**Copertura stimata vs DentalMaster Advanced:** ~95%

### ⚠️ Azioni manuali urgenti
1. **Trial Filippo scade 31/05/2026** → `/admin/labs` → prorogalo subito
2. **PEC reale** → Filippo deve configurare `/impostazioni/pec` con le sue credenziali SMTP
3. **NEXT_PUBLIC_SUPPORT_PHONE** → manca in `.env.local` e dashboard Vercel

### Test con Filippo da fare (dati reali)
- Consegna reale → tap CONSEGNA su un lavoro vero su uachelab.com
- FatturaPA XML → validare su https://fatturapa.agenziaentrate.gov.it
- DdC PDF → stamparlo, firmarlo, verificare leggibilità
- Portale dentista `/portale/[token]` → test in browser separato incognito
- Sezione Rete `/rete` → verifica empty state + Stripe plan detection
- Modulo qualità/incidenti → percorso completo end-to-end
- PSUR PDF → generare e verificare sezioni MDR Allegato III §7

---

## 1. Deploy & Identità

| Voce | Valore |
|------|--------|
| URL produzione | https://uachelab.com |
| Supabase project | `iagibumwjstnveqpjbwq` |
| GitHub | https://github.com/H4tholdir/ua-app |
| Ultimo commit | `d9a25c7` (Piano C merge v1.7.0) |
| CI/CD | GitHub Actions + Vercel auto-deploy su push main |
| Sviluppatore | Francesco Formicola · `francesco.formicola@live.it` |
| Admin route | `/admin/labs` · ruolo `admin_sistema` |
| Lab Filippo | `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` · ITCA01051686 · Serre SA |
| Lab Arturo Pepe | `314cd040-0893-4e9d-9ad8-786e4eefd75f` · lab di test |

### Credenziali test (produzione)
- **Titolare lab Filippo:** `h4t@live.it` / `>[REDACTED]`
- **E2E tecnico:** `e2e-tecnico@ua-test.local` / `TestE2E!2026`
- **Admin sistema:** `francesco.formicola@live.it` (usa forgot-password)

---

## 2. Sessione 21/05/2026 — Mega Audit + 3 Piani

### Audit Completo (13 documenti in `docs/audit-2026-05-21/`)

11 agenti specializzati hanno analizzato l'app da prospettive diverse:
- 7 persona agents: odontotecnico, titolare, dentista, PWA engineer, designer, UX expert, software engineer
- 3 flow agents: giornata tipo titolare, tecnico, front desk
- 1 audit sistematico: 31 pagine × CRUD/empty/loading/mobile/desktop

**Score medi pre-intervento:** UX 6.8/10 · Business 6.5/10 · PWA 7.8/10 · Design 9.2/10

**Codex Adversarial Review** ha trovato 3 rischi critici mancati dagli altri 11 agenti:
1. Cross-tenant FK injection su POST /api/lavori
2. Service-role writes senza laboratorio_id predicate
3. Consegna non atomica (side effects prima del cambio stato)

### Piano A — Security + Fix Critici (v1.5.1)

| Fix | Tipo |
|-----|------|
| FK tenant validation su POST /api/lavori (before progressivo, con deleted_at guard) | 🔒 Security |
| `laboratorio_id` predicate su tutti i service-role UPDATE + `count:exact` | 🔒 Security |
| `isSameOrigin()` su segnala, risolvi, hard-delete | 🔒 Security |
| Save form prima di navigare a /consegna + anti-double-tap ConsegnaButton | 🐛 Fix |
| "Non dichiarato" + "Altro" con testo libero nel select disinfettante | 🏥 MDR |
| Rimozione GSAP + @gsap/react inutilizzati (~300KB bundle) | 🧹 Cleanup |
| Warning esplicito "Consegna senza dati MDR completi" | 🏥 MDR |

### Piano B — UX Excellence (v1.6.0)

| Feature | Note |
|---------|------|
| Loading skeletons su 21 pagine | SkeletonCard con token `skeleton` in motion.ts |
| Wizard 2-step nuovo lavoro | Stepper visivo, solo 2 tab visibili |
| Inline validation form | Bordo rosso + auto-focus primo errore |
| EmptyState component su 5 pagine | clienti, magazzino, fatture, pazienti, ordini |
| Dark mode fix /qualita | Colori hardcoded → CSS token |
| ClienteEditSheet (CRUD clienti) | Bottom sheet edit su /clienti/[id] |
| Web Push Notifications | VAPID, SW handler, subscribe API, PushRegistrar |
| PWA viewport-fit=cover | safe-area-inset-bottom per iPhone notch/Dynamic Island |
| Dashboard refresh button | router.refresh() + spinner animato |
| Last cliente in localStorage | `ua_last_cliente_id` persistito |
| Migration `push_subscriptions` | Applicata via Supabase MCP + types rigenerati |

### Piano C — Delight + Business Intelligence (v1.7.0)

| Feature | Note |
|---------|------|
| Sound design completo | `soundConsegna` (C-major chord), `soundNuovoLavoro` (ding), `soundSegnalazione` (discendente) |
| Animazioni CELEBRATION | Token popScale + checkmark in motion.ts · FAB bounce spring · delivery pop |
| Margine netto KPI dashboard | fatturato − costi materiali − compensi · traffic-light verde/oro/rosso |
| `costo_materiali_estimated` nel listino | Colonna Supabase + campo editabile inline |
| Fatturazione batch | `/api/fatture/batch` + BatchFatturaSection + `/api/lavori/pronti-da-fatturare` |
| Export CSV fatture | `/api/fatture/export?year=YYYY` · BOM + semicolon + virgola decimale per Excel IT |
| Analytics trend 12 mesi | `getTrendMensile` in queries.ts + BarChart SVG (mese corrente in rosso) |
| Portale dentista condivisibile | SharePortaleButton su /clienti/[id] · navigator.share() + wa.me fallback |
| InfoTooltip MDR | Tooltip contestuali su "Tipo impronta" e "Disinfettante" in TabAccettazione |
| seed-new-lab.ts | Script onboarding nuovi lab — copia cicli + fasi dal template con UUID remapping |

---

## 3. Cosa NON è stato fatto (da fare prossima sessione)

### CRUD audit incompleto
Il B6 ha verificato e fixato clienti. Rimangono senza edit/delete:
- **pazienti** — solo POST, nessun PATCH/DELETE
- **listino** — PATCH esiste ma nessun DELETE (soft-delete `attivo: false`)
- **tecnici** — solo invite flow, nessun `/[id]/route.ts`
- **magazzino** — nessun PATCH/DELETE su `[id]`

### Bug pre-esistente trovato durante audit
`/magazzino/[id]/page.tsx` interroga colonne inesistenti (`codice`, `descrizione`, `unita_misura`, `giacenza_attuale`, `fornitore`) e filtra su `deleted_at` mentre la tabella usa `attivo`. La pagina probabilmente 302-redirecta. **Da fixare.**

### Dark mode non verificata sistematicamente
Token dark presenti in design system v2.2 ma non testati con Playwright su ogni pagina. Solo `/qualita` fixata.

### Push Notifications — mancano i trigger
`PushRegistrar`, subscribe API e SW handler sono pronti, ma **mancano i trigger lato server**:
- `orchestrate.ts` → notifica front desk "lavoro pronto per consegna"
- `segnala/route.ts` → notifica titolare "problema segnalato"
- `prove/route.ts` → notifica tecnico "prova rientrata"

### Test manuali con Filippo (non ancora eseguiti)
- Consegna reale su uachelab.com
- FatturaPA XML → validazione SDI
- DdC PDF → stampa + firma
- Portale dentista → test incognito
- Sezione Rete → non testata
- Qualità/incidenti → end-to-end
- PSUR PDF → verifica

### Terzismo DdC
Sezione "altri esecutori" mancante nel DdC. Rischio MDR basso, rinviato a V2.

---

## 4. Architettura — Decisioni Critiche

- **RLS:** `public.current_lab_id()` (NON `auth.current_lab_id()`)
- **Invite flow:** token custom `/invite/[token]` (NON `inviteUserByEmail`)
- **PEC Vault:** `upsert_pec_vault_secret` + `get_pec_vault_secret` solo service_role
- **Rifacimento:** RPC `crea_rifacimento_atomico()` — consente stato 'consegnato'
- **PATCH API:** sempre allowlist esplicita, mai blocklist
- **Onboarding:** NO `redirect('/onboarding')` nel layout — solo banner dashboard
- **Template PDF:** eslint.config.mjs disabilita `no-unescaped-entities` per `pdf/**`
- **ESLint CI:** `--max-warnings 0` — qualsiasi warning rompe il CI
- **WhatsApp:** solo deep links `wa.me` (ToS-compliant). NO open-wa.
- **Fatture:** generate durante `orchestraConsegna`, non create manualmente. `incluso_in_fattura` = discriminatore "già fatturato".
- **Push Notifications:** VAPID keys in `.env.local` (gitignored), tabella `push_subscriptions` in DB, `ua-v2` in Service Worker cache name.

---

## 5. Design System v2.2 Warm Panna

```
Light: --bg:#DDD8D3  --sfc:#E4DFD9  --elv:#EDEDEA  --prs:#D4CFC9
       --primary:#D90012  --gold:#D4A843  --cobalt:#1B2D6B (solo nav pill)
Dark:  --bg:#1A1916  --sfc:#222019  --elv:#2C2A27   --primary:#E8001A
Font:  DM Sans (MAI Inter) · Shadow: dual-layer warm-tinted
Nav:   A2 Floating Pill · FAB rossa #D90012
Motion: src/design-system/motion.ts — UNICA FONTE. Tokens: instant/fast/normal/slow/expressive/celebration/skeleton
```

**CELEBRATION tokens (aggiunti in Piano C):**
```typescript
export const CELEBRATION = {
  popScale: { initial: { scale: 0.85, opacity: 0 }, animate: { scale: [0.85, 1.12, 1], opacity: 1 }, ... },
  checkmark: { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, ... },
}
```

---

## 6. API Routes Chiave (aggiornato v1.7.0)

| Route | Descrizione |
|-------|-------------|
| `/api/impostazioni` PATCH | Dati lab (allowlist esplicita) |
| `/api/impostazioni/pec/start-verify` POST | Salva PEC + invia email verifica |
| `/api/impostazioni/pec/verify-status` GET | Polling verifica PEC (ogni 2s) |
| `/api/internal/pec-verify` POST | Callback Cloudflare Worker |
| `/api/impostazioni/nomina-prrc` GET | Scarica PDF Nomina PRRC |
| `/api/clienti/[id]/dpa` GET | Scarica PDF DPA GDPR Art.28 |
| `/api/clienti/[id]/portale-token` GET | Token portale dentista (genera se mancante) |
| `/api/admin/invite` POST | Crea invito + invia email Resend |
| `/api/lavori/[id]/rifacimento` POST | Crea rifacimento atomico |
| `/api/qualita/psur` GET/POST | Lista e crea PSUR |
| `/api/fatture/export` GET | CSV fatture (?year=YYYY) per commercialista |
| `/api/fatture/batch` POST | Fatturazione batch N lavori |
| `/api/lavori/pronti-da-fatturare` GET | Lavori consegnati non ancora fatturati |
| `/api/notifications/subscribe` POST | Registra push subscription VAPID |

---

## 7. Infrastruttura

| Servizio | Stato |
|----------|-------|
| Resend · `uachelab.com` | ✅ Verificato Cloudflare eu-west-1 |
| Cloudflare Email Routing catch-all | ✅ → Worker `ua-pec-verify` |
| PEC inbound verification | ✅ Testato 19/05/2026 |
| Supabase email templates | ✅ Branding UÀ |
| NEXT_PUBLIC_SUPPORT_PHONE | ⚠️ DA COMPLETARE in .env.local e Vercel |
| Supabase MCP | ✅ Autenticato (OAuth ChatGPT login `francesco.formicola@live.it`) |
| VAPID keys | ✅ In `.env.local` (gitignored). `NEXT_PUBLIC_VAPID_PUBLIC_KEY` per client. |

---

## 8. Stripe

- Lab monthly: `price_1TWCfaRsMhN7mg7YVt0UfeNB`
- Lab yearly: `price_1TWCfbRsMhN7mg7Y7Ejl1k5w`
- Rete monthly: `price_1TWCfbRsMhN7mg7YDXKFJkdN`
- Rete yearly: `price_1TWCfcRsMhN7mg7YBZSz1gId`

---

## 9. Regole CI

- `npx eslint src/ --ext .ts,.tsx --max-warnings 0` prima di ogni commit (Husky lo fa in automatico)
- Template PDF `src/components/features/pdf/**`: `no-unescaped-entities` OFF (via config)
- Dopo ogni migration Supabase:
  1. `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
  2. `npx tsc --noEmit`
- Seed new lab: `npx tsx scripts/seed-new-lab.ts <laboratorio_id>` (copia cicli+fasi da template Filippo)

---

## 10. Roadmap V2 (decisione 21/05/2026 — NON in V1.x)

| Feature | Motivo esclusione | Quando |
|---------|------------------|--------|
| PMCF follow-up automatico | Email automation avanzata | V2 |
| STS XML export | Solo se fattura diretta al paziente | V2 |
| Firma digitale P7M | Richiede integrazione AgID | V2 |
| CAPA ISO 13485 | Solo se Filippo chiede certificazione | V2 |
| Colorazione 4D (Scala/Croma/Tinta/Valore) | Feature avanzata di nicchia | V2 |
| Terzismo inter-lab | Richiede rearchitettura tenant | V2 |
| SDI diretto | Richiede accordi con HUB SDI | V2 |
| Fascicolo Tecnico MDR | Feature complessa, basso uso quotidiano | V2 |
| Terzismo DdC (altri esecutori) | Rischio MDR basso | V2 |
| WhatsApp Cloud API ufficiale | Solo se deep links non bastano | V2 |
| Nota di credito XML (TD04) | Raro, gestibile manualmente | V2 |

---

## 11. Dati Importati (lab Filippo)

⚠️ DISTINZIONE CRITICA:
- **DentalMaster Advanced 2021** → dati lab **Filippo Opromolla** (ITCA01051686)
- **Dental Project rel. 3.0** → dati lab **Arturo Pepe** (ITCA01050077) — solo test

**Lab Filippo (971061a1):**
- 20 clienti · 74 lavorazioni × 4 fasce prezzo
- 187 materiali magazzino · 40 attrezzature (ATT01-40)
- 277 lavori storici 2018-2026
- 134 cicli produzione · 371 fasi produzione
- €56.351 fatturato YTD 2026 (Gen-Apr) → stima ~€170k anno
- Top revenue: implantoprotesi (38.4%) + scheletrato (27.8%)
