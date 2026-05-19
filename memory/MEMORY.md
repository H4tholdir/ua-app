# UÀ — Project Memory
**Ultimo aggiornamento:** 19 maggio 2026 — QA Release V1 completato · Pronto per consegna Filippo

---

## 1. Stato del Progetto

### Deploy
- **URL produzione:** https://uachelab.com ✅
- **Supabase:** `iagibumwjstnveqpjbwq` ✅
- **GitHub:** https://github.com/H4tholdir/ua-app
- **Ultimo commit:** `9615b44` (fix husky pre-commit)
- **CI/CD:** GitHub Actions verde · Vercel prod aggiornato · 141 test verdi

### Identità
- **Sviluppatore/Proprietario:** Francesco Formicola (`francesco.formicola@live.it`)
- **Admin route:** `/admin/labs` · ruolo `admin_sistema`
- **Lab Filippo:** `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` · ITCA01051686 · trial scade 31/05/2026
- **Lab Arturo Pepe:** `314cd040-0893-4e9d-9ad8-786e4eefd75f` · trial

---

## 2. QA Release V1 — Completato 19/05/2026

### Sezione A — Import DentalMaster ✅
- 18 clienti · 72 lavorazioni × 4 fasce · 225 articoli magazzino (185 + 40 attrezzature)
- 74 cicli produzione · 71 fasi produzione (OL01-OL71) · 42 lavori storici (STOR/*)
- Lavori storici: `incluso_in_fattura=true` (non appaiono come debiti)

### Sezione B — Audit UI 17 pagine ✅
Bug trovati e corretti:
- `pazienti/[id]`: campi `nome_display`/`codice_gdpr` → corretti in `nome_cognome`/`codice_paziente`
- Dashboard: pagamenti scaduti da lavori storici → reset `incluso_in_fattura`
- PEC: dati test resettati (Filippo configurerà le sue credenziali)
- Cliente E2E Dr.Test rimosso

### Sezione C — Flow Operativi ✅
- C01 Nuovo Lavoro · C02 Progressione stati · C03 Consegna+DdC · C04 Rifacimento · C05 Fatturazione
- Bug: RPC `crea_rifacimento_atomico` mancante → creata nel DB
- Bug: API rifacimento bloccava stato 'consegnato' → fixato

### Sezione D — Edge Cases ✅
- 22 PASS · 0 FAIL reali
- Multi-tenant isolation: confermata (Filippo/Arturo completamente separati)
- Validazioni DB: NOT NULL, CHECK constraint su tipo_dispositivo/stato funzionanti
- Integrità FK: zero orfani

### Sezione E — Final Checks ✅
- TypeScript: zero errori
- ESLint: zero warning
- 141/141 test verdi
- Build production: OK
- Vercel: deployato e live

---

## 3. Compliance V1 — Implementato

| Adempimento | Status |
|-------------|--------|
| DoC MDR (Art. 52(8) + Allegato XIII, 8 elementi) | ✅ Automatico |
| Analisi Rischi (9 tipi dispositivo, ISO 14971) | ✅ Pre-popolata nel DB |
| Nomina PRRC (Art. 15 MDR) | ✅ PDF scaricabile da /impostazioni |
| PSUR (Art. 85/86 MDR) | ✅ Pagina /qualita/psur |
| DPA clienti (GDPR Art. 28) | ✅ PDF scaricabile da /clienti/[id] |
| FatturaPA SDI (N4, bollo €2) | ✅ Automatico |
| Pseudonimizzazione pazienti | ✅ nome_cognome + codice_paziente |
| RBAC + RLS Supabase | ✅ 6 ruoli |
| ITCA memorizzato (sanzione €48.500) | ✅ ITCA01051686 |

---

## 4. Infrastruttura Email

| Servizio | Stato |
|----------|-------|
| Resend · dominio `uachelab.com` | ✅ Verificato Cloudflare eu-west-1 |
| FROM: `noreply@uachelab.com` | ✅ |
| Supabase email templates | ✅ Branding UÀ |
| Cloudflare Email Routing catch-all | ✅ → Worker `ua-pec-verify` |
| PEC inbound verification loop | ✅ Testato end-to-end 19/05 |

---

## 5. Design System v2.2 Warm Panna

```
Light: --bg:#DDD8D3  --sfc:#E4DFD9  --elv:#EDEDEA  --prs:#D4CFC9
       --primary:#D90012  --gold:#D4A843  --cobalt:#1B2D6B (solo nav pill)
Dark:  --bg:#1A1916  --sfc:#222019  --elv:#2C2A27   --primary:#E8001A
Font:  DM Sans (MAI Inter) · Shadow: dual-layer warm-tinted
Nav:   A2 Floating Pill · FAB rossa #D90012
```

---

## 6. Architettura — Decisioni Critiche

- **RLS:** `public.current_lab_id()` (NON `auth.current_lab_id()`)
- **Invite flow:** token custom (NON `inviteUserByEmail` Supabase)
- **PEC Vault:** `upsert_pec_vault_secret` + `get_pec_vault_secret` solo service_role
- **Rifacimento:** RPC atomica `crea_rifacimento_atomico()` — consente stato 'consegnato'
- **PATCH API:** sempre allowlist esplicita, mai blocklist
- **Onboarding:** NO `redirect('/onboarding')` nel layout — solo banner dashboard
- **Template PDF:** `eslint.config.mjs` disabilita `no-unescaped-entities` per `pdf/**`

---

## 7. API Routes Chiave

| Route | Metodo | Descrizione |
|-------|--------|-------------|
| `/api/impostazioni` | GET/PATCH | Dati lab (allowlist) |
| `/api/impostazioni/pec/start-verify` | POST | Salva PEC + invia email verifica |
| `/api/impostazioni/pec/verify-status` | GET | Polling verifica PEC |
| `/api/internal/pec-verify` | POST | Callback Cloudflare Worker |
| `/api/impostazioni/nomina-prrc` | GET | Scarica PDF Nomina PRRC |
| `/api/clienti/[id]/dpa` | GET | Scarica PDF DPA GDPR Art.28 |
| `/api/admin/invite` | POST | Crea invito + invia email Resend |
| `/api/lavori` | GET/POST | Lavori (POST validazione server-side) |
| `/api/lavori/[id]/rifacimento` | POST | Crea rifacimento atomico |
| `/api/qualita/psur` | GET/POST | Lista e crea PSUR |

---

## 8. Stripe

- Lab monthly: `price_1TWCfaRsMhN7mg7YVt0UfeNB`
- Lab yearly: `price_1TWCfbRsMhN7mg7Y7Ejl1k5w`
- Rete monthly: `price_1TWCfbRsMhN7mg7YDXKFJkdN`
- Rete yearly: `price_1TWCfcRsMhN7mg7YBZSz1gId`

---

## 9. Prossimi Step — Da fare con Filippo

### Priorità alta (prima dell'accesso)
1. **PEC SMTP Filippo** → configurare `/impostazioni/pec` con credenziali reali Aruba/Legalmail
2. **Estendere trial** → da 31/05 a data concordata (da admin panel)

### Al primo accesso Filippo
3. Completare wizard onboarding (6 step — dati già precompilati da DentalMaster)
4. Primo lavoro reale creato da Filippo → verifica DdC PDF con ITCA01051686
5. Prima consegna end-to-end → verifica tutto il flow

### V2 (non urgente)
- PMCF follow-up automatico (reminder 6/12 mesi)
- STS export XML (solo se fattura diretta al paziente)
- Scadenzario INPS artigiani
- Registro trattamenti GDPR in-app

---

## 10. Checklist CI

- Esegui `npx eslint src/ --ext .ts,.tsx --max-warnings 0` prima di ogni commit
- Template PDF in `src/components/features/pdf/` → ESLint `no-unescaped-entities` OFF (config)
- Husky pre-commit abilitato → blocca commit con ESLint errors
