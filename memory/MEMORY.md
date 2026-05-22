# UÀ — Project Memory
**Ultimo aggiornamento:** 22 maggio 2026 — v1.8.0 — App pronta per collaudo con Filippo

---

## 0. STATO DEL PROGETTO — V1.8.0

**V1.8.0 in produzione su https://uachelab.com — 22/05/2026**

| Versione | Data | Tag | Contenuto |
|----------|------|-----|-----------|
| V1.5.1 | 21/05/2026 | `v1.5.1` | Piano A — Security fixes |
| V1.6.0 | 21/05/2026 | `v1.6.0` | Piano B — UX Excellence |
| V1.7.0 | 21/05/2026 | `v1.7.0` | Piano C — Delight + Business Intelligence |
| V1.7.8 | 22/05/2026 | `v1.7.8` | Fix bug magazzino/[id], push triggers, CRUD completo |
| V1.7.9 | 22/05/2026 | `v1.7.9` | Pazienti PATCH, Listino edit, Dark mode 27 file |
| V1.8.0 | 22/05/2026 | `v1.8.0` | Error boundaries, loading completo, splash screens iOS |

**Stato CI:** TypeScript: 0 errori · ESLint: 0 warning · Vitest: 141/141 · Build: ✅
**Copertura stimata vs DentalMaster Advanced:** ~97%

### ⚠️ Azioni manuali urgenti (ancora aperte)
1. **PEC reale** → Filippo deve configurare `/impostazioni/pec` con le sue credenziali SMTP
2. **Prima sessione di collaudo** → vedere `docs/test-filippo/COLLAUDO-HANDOFF-FILIPPO.md`

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
