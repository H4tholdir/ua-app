# Sessione attiva — N13 deploy + enforce (17/07/2026 notte) — CHIUSA

**N13 IN PRODUZIONE, ENFORCE ATTIVO** (autorizzazione Francesco, shadow saltato: PWA senza utenti). Main: N11-bis `882a828` · N14 `2aa33c0` · merge N13 `28a1985` · flip enforce+GDPR doc+fixture `6991c42`. CI verde, CD Vercel OK.

**QA prod su lab E2E (ciclo con ripristino):** blacklist → portale API 404 + pagina senza dati ✅ · sospeso → read terzi ok ✅ · attivo ripristinato ✅. Doc GDPR: `docs/security/2026-07-17-gdpr-accesso-dati-lab-blacklist.md`. Kill-switch: `UA_LAB_GUARD_MODE=off|shadow`.

**Residui Francesco:** collaudo login reale ≤2s + `PERF_BUDGET_LOGIN` · deferral N14 (cap proposte, voce Impostazioni→Sicurezza, restyling modal L2). Prossimo da roadmap: §A e §O, poi (2) funzioni attive.
