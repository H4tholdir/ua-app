# Sessione attiva — ONDATA 1 DEL REGISTRO DPA: CHIUSA, IN PRODUZIONE, COLLAUDO PASSATO

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/ROADMAP-UFFICIALE.md` **riga 10** — resta la **parte (b) per intero:
la FIRMA a distanza** (ondata 2, D127-D131). 🛑 **Prima serve il panel normativo su D128** (Art. 28(9) GDPR
letto **alla fonte**, non a memoria). Ledger dell'ondata appena chiusa: `.superpowers/sdd/progress.md`.

✅ **IN PRODUZIONE dal 02/08** (merge `35172e70`, **41 commit**). Il contratto GDPR ai dentisti ora viene
**EMESSO**: conservato, numerato, registrato, con le sue due impronte — e **riusato** se nulla è cambiato.

🏆 **COLLAUDO DAL VIVO PASSATO, `provato: IN PRODUZIONE`:**
- **sequenza** → stesso file, stesso `DPA-2026-0001`, byte identici: il riuso funziona, **nessun numero
  bruciato**;
- 🔑 **PARALLELO** su uno studio mai emesso → **UNA sola riga**, `DPA-2026-0002`, byte identici.
  **Registro: 2 righe, 2 dentisti, contatore a 2.** È la prova che esisteva **solo contro mock**, ed è
  esattamente il difetto che il panel aveva trovato: prima, quella corsa dava **due contratti identici con
  due numeri bruciati, in silenzio**.
- `template_versione` = **`dpa-v2+8d98dbee`**: D133 viva, e il **`+` sopravvive** a PostgREST.

📌 **FASE 7 su `main` dopo il merge:** `tsc` **0** · `vitest` **375 | 3** file e **4380 | 19** prove ·
`next build` **0** · guardia verde.

🔑 **LA LEZIONE DELLA GIORNATA:** *la fonte di un fatto è **lo strato in cui il codice lo legge**.*
Sbagliata **quattro volte**: `schema.sql` invece di `pg_proc` · il **corpo HTTP** invece dell'**oggetto
JavaScript** · un vincolo letto **al rovescio** · e l'**`etag`** invece di `gh run list` (quello che cambiava
era la pagina di sfida anti-bot, accesa dal mio stesso sondaggio).
⚠️ **Il rilascio sono DUE fasi, ~11 minuti** (controlli 8m34s + rilascio 2m20s), non «~5». E **il service
worker serve pagine in cache anche in produzione**: dopo il rilascio va tolto e le cache svuotate.

🟠 **Una decisione resta APERTA, dichiarata** (roadmap **P10**): il soft-delete della riga orfana **precede**
la riemissione — un guasto in mezzo lascia il dentista **senza contratto vivo**. Ristretto l'innesco, non
l'esito. Sede: **ondata 2**.
📋 **Sedici voci riferite in roadmap** (P1-P16) senza toccarle, fra cui: il fuso orario in **dieci** punti dei
modelli PDF (**P9**), `progressivi.ts` che perde il messaggio del database per **tutti** i documenti (**P11**),
i permessi di `admin_sistema` (**P12**), tre progetti Playwright che puntano a file inesistenti (**P15**), e
il contrasto illeggibile in scuro sulla promessa di conservazione (**P16**).

🚀 `main` = `bcb1cf42`, albero pulito, **1 commit da pubblicare** (questo aggiornamento di roadmap).
📎 Verbale: **centotrentatré** decisioni in **quarantacinque** tornate; la prossima è **D134**.
