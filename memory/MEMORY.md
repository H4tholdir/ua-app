# UÀ — Project Memory
**Ultimo aggiornamento:** 19 maggio 2026 — Fine sessione QA ciclo 1

---

## 0. STATO ONESTO DEL PROGETTO

**L'app è funzionante ma NON pronta per la consegna definitiva a Filippo.**
Il QA di questa sessione ha trovato e corretto alcuni bug critici, ma rimangono:
- bug non ancora scoperti
- flussi operativi non testati in profondità con dati reali
- UI/UX da rifinire su molte pagine
- lavorazioni e funzionalità da verificare con Filippo direttamente
- mille dettagli che emergeranno solo nell'uso quotidiano reale

**Approccio corretto:** continuare sessione per sessione, testare un flusso alla volta con dati reali, fixare man mano. Non dichiarare mai "pronto" finché Filippo non ha usato l'app per almeno 2 settimane consecutive senza problemi bloccanti.

---

## 1. Stato del Progetto

### Deploy
- **URL produzione:** https://uachelab.com
- **Supabase:** `iagibumwjstnveqpjbwq`
- **GitHub:** https://github.com/H4tholdir/ua-app
- **Ultimo commit:** `912dd9e` (memory update)
- **CI/CD:** GitHub Actions verde · 141 test verdi · Vercel prod live

### Identità
- **Sviluppatore/Proprietario:** Francesco Formicola (`francesco.formicola@live.it`)
- **Admin route:** `/admin/labs` · ruolo `admin_sistema`
- **Lab Filippo:** `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c` · ITCA01051686 · trial scade 31/05/2026
- **Lab Arturo Pepe:** `314cd040-0893-4e9d-9ad8-786e4eefd75f` · trial

---

## 2. Cosa è stato fatto in questa sessione (19/05/2026)

### Piani completati
- Piano F (go-live bloccanti): form lavoro, impostazioni edit, PEC widget, profilo, onboarding wizard
- Piano G (V1 completion): pagine detail, DPA, Nomina PRRC, invite email
- PEC inbound verification loop: Cloudflare → Worker → DB (testato)
- Email Resend: configurato, dominio verificato, template Supabase aggiornati

### Import DentalMaster
- 18 clienti · 72 lavorazioni × 4 fasce · 185 materiali magazzino · 40 attrezzature
- 74 cicli produzione · 71 fasi produzione (OL01-OL71) · 42 lavori storici (STOR/*)
- Analisi rischi MDR pre-popolata per 9 tipi dispositivo

### QA ciclo 1 — Bug trovati e corretti
1. `pazienti/[id]`: campi `nome_display`/`codice_gdpr` → `nome_cognome`/`codice_paziente`
2. RPC `crea_rifacimento_atomico`: mancante nel DB → creata
3. API rifacimento: bloccava 'consegnato' → fixato
4. ESLint CI: template PDF italiano → config rule off per `pdf/**`
5. Husky pre-commit: non eseguibile → fixato
6. Dashboard: pagamenti scaduti da lavori storici → reset `incluso_in_fattura`
7. Cliente E2E test: rimosso dal DB

### Compliance V1 implementata
- DoC MDR Art. 52(8) + Allegato XIII · Nomina PRRC · DPA GDPR Art.28 · PSUR

---

## 3. Cosa NON è stato fatto / da continuare

### Priorità alta (prossima sessione)
- **Testare ogni singola pagina manualmente** con Filippo alla tastiera — solo lui sa cosa manca
- **PEC Filippo reale** — deve configurare `/impostazioni/pec` con le sue credenziali
- **Trial** — scade 31/05/2026, da prorogare dall'admin panel SUBITO
- **Flow invito end-to-end** — creare un nuovo lab di test, inviare invito, verificare email, fare onboarding completo
- **Fatturazione reale** — generare una fattura da un lavoro reale, verificare XML FatturaPA
- **DdC PDF** — verificare che il PDF generato sia leggibile, completo e firmabile
- **Consegna reale** — fare una consegna con tap CONSEGNA su uachelab.com con dati reali Filippo

### Bug probabili non ancora trovati
- La pagina `/lavori/[id]` (dettaglio lavoro) non è stata auditata in profondità
- Le tab Lavorazioni, Produzione, Clinica, Immagini nel form lavoro non testate
- Il flow Prove (in_prova_esterna → rientro) non testato in UI reale
- Il portale dentista `/portale/[token]` non testato
- La sezione Rete (`/rete`) non testata
- Il modulo qualità/incidenti/nuovo non testato end-to-end
- Import PSUR — il PDF generato non è stato visto

### Cose da valutare con Filippo
- L'UX del form Nuovo Lavoro è abbastanza semplice per lui?
- Il listino è correttamente strutturato come lo usava su DentalMaster?
- Le lavorazioni nei lavori hanno i prezzi giusti?
- Il sistema di pazienti pseudonimizzati è comprensibile?
- Mancano tipi dispositivo che Filippo usa comunemente?

### V2 (non urgente)
- PMCF follow-up automatico (reminder 6/12 mesi al dentista)
- STS export XML (solo se fattura diretta al paziente)
- Scadenzario INPS artigiani con reminder
- Registro trattamenti GDPR in-app
- Nota di credito XML (TD04)
- Firma digitale P7M per fatture PA

---

## 4. Design System v2.2 Warm Panna

```
Light: --bg:#DDD8D3  --sfc:#E4DFD9  --elv:#EDEDEA  --prs:#D4CFC9
       --primary:#D90012  --gold:#D4A843  --cobalt:#1B2D6B (solo nav pill)
Dark:  --bg:#1A1916  --sfc:#222019  --elv:#2C2A27   --primary:#E8001A
Font:  DM Sans (MAI Inter) · Shadow: dual-layer warm-tinted
Nav:   A2 Floating Pill · FAB rossa #D90012
```

---

## 5. Architettura — Decisioni Critiche

- **RLS:** `public.current_lab_id()` (NON `auth.current_lab_id()`)
- **Invite flow:** token custom `/invite/[token]` (NON `inviteUserByEmail` Supabase)
- **PEC Vault:** `upsert_pec_vault_secret` + `get_pec_vault_secret` solo service_role
- **Rifacimento:** RPC `crea_rifacimento_atomico()` — consente stato 'consegnato'
- **PATCH API:** sempre allowlist esplicita, mai blocklist
- **Onboarding:** NO `redirect('/onboarding')` nel layout — solo banner dashboard
- **Template PDF:** `eslint.config.mjs` disabilita `no-unescaped-entities` per `pdf/**`
- **ESLint CI:** `--max-warnings 0` — qualsiasi warning rompe il CI

---

## 6. API Routes Chiave

| Route | Descrizione |
|-------|-------------|
| `/api/impostazioni` PATCH | Dati lab (allowlist esplicita) |
| `/api/impostazioni/pec/start-verify` POST | Salva PEC + invia email verifica |
| `/api/impostazioni/pec/verify-status` GET | Polling verifica PEC (ogni 2s) |
| `/api/internal/pec-verify` POST | Callback Cloudflare Worker |
| `/api/impostazioni/nomina-prrc` GET | Scarica PDF Nomina PRRC |
| `/api/clienti/[id]/dpa` GET | Scarica PDF DPA GDPR Art.28 |
| `/api/admin/invite` POST | Crea invito + invia email Resend |
| `/api/lavori/[id]/rifacimento` POST | Crea rifacimento atomico |
| `/api/qualita/psur` GET/POST | Lista e crea PSUR |

---

## 7. Infrastruttura

| Servizio | Stato |
|----------|-------|
| Resend · `uachelab.com` | ✅ Verificato Cloudflare eu-west-1 |
| Cloudflare Email Routing catch-all | ✅ → Worker `ua-pec-verify` |
| PEC inbound verification | ✅ Testato 19/05/2026 |
| Supabase email templates | ✅ Branding UÀ |
| NEXT_PUBLIC_SUPPORT_PHONE | ⚠️ Da completare in .env.local e Vercel |

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
- Dopo ogni migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts`
