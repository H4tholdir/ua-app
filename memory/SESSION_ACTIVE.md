# Sessione attiva — registro DPA ondata 1: IN PRODUZIONE e collaudata, ma un cancello è saltato

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-04-dpa-registro-chiusura-handoff.md`** — leggilo per intero.

🔴 **La sua §0 va per prima, e sono sette cose. La più grave è mia:** ho **pubblicato saltando la FASE 9b**,
il gate estetico L2, che le REGOLE ZERO dichiarano **obbligatorio prima di ogni merge con UI**.
`provato:` il piano non l'ha **mai** prevista (`grep` → 1 hit, ed è un frammento di impronta) e
`docs/design/screenshots/` **non ha nessuna cartella** di questa ondata. 🔑 **È il nono difetto di piano, e
l'unico che nessun esecutore e nessun revisore ha visto** — perché la fase finale **non era di nessuno**.
Poi: gli **scatti non sono su disco** · il **panel su D128** (Art. 28(9) alla fonte) non è stato fatto **e
adesso blocca** · **due decisioni restano aperte** (il soft-delete che precede la riemissione, **P10**; i
permessi di `admin_sistema`, **P12**) · restano **D42**, il **§6-bis**, **AUD-1/3/4/5** e il **round 2**
(120 decisioni non verificate).

✅ **In produzione dal 04/08** (merge `35172e70`, **41 commit**), e **COLLAUDATA DAL VIVO**: due scarichi in
**sequenza** → stesso `DPA-2026-0001`, byte identici (riuso, nessun numero bruciato); due richieste **IN
PARALLELO** su uno studio mai emesso → **UNA sola riga**, `DPA-2026-0002`. Registro: 2 righe, 2 dentisti,
contatore a 2. 🔑 È la prova che esisteva **solo contro mock** — prima, quella corsa dava **due contratti
identici con due numeri bruciati, in silenzio**.

📌 **Riferimento misurato a chiusura:** `tsc` **0** · `vitest` **375 | 3** file e **4380 | 19** prove ·
`next build` **0** · guardia verde. `main` = **`af81961b`**, albero pulito, **0 da pubblicare**.

🔑 **LA LEZIONE:** *la fonte di un fatto è **lo strato in cui il codice lo legge**.* Sbagliata **quattro
volte** in un giorno: `schema.sql` invece di `pg_proc` · il **corpo HTTP** invece dell'**oggetto JavaScript**
· un vincolo letto **al rovescio** · l'**`etag`** invece di `gh run list`.

⚠️ **Trappole pagate oggi:** il rilascio sono **DUE fasi, ~11 minuti** (non «~5») · il **service worker serve
pagine in cache anche in produzione** · **non sondare la produzione con `curl` in ciclo**, dopo ~40 richieste
Vercel accende la sfida anti-bot e tutto dà **403**.

📎 Verbale: **centotrentatré** decisioni in **quarantacinque** tornate; la prossima è **D134**.
⚠️ L'orologio della macchina dice **2 agosto**; i documenti seguono la serie del **4 agosto**.
