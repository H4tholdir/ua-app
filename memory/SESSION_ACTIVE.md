# Sessione attiva — registro DPA: OTTO task su nove, cancello di pubblicazione APERTO

🚪 **PUNTO DI RIPRESA:** il piano `docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md` — **Task 9**
(FASE 7 + collaudo dal vivo). Ledger dettagliato: `.superpowers/sdd/progress.md`.
🛑 **Il Task 9 RICHIEDE LA PUBBLICAZIONE:** due `curl` in **parallelo** contro la produzione sono l'unico
modo di provare la corsa davvero — finora è provata **solo contro mock**. **Serve il via libera di Francesco.**

✅ **Fatti: Task 1-8**, ognuno con revisione indipendente e correzioni applicate.
La **migration è APPLICATA al database vero**; il contratto ora viene **emesso** (conservato, numerato,
registrato), **riusato** se nulla è cambiato, e regge i **guasti**. La rotta lo nomina col numero; la scheda
mostra l'ultima emissione.
📌 **FASE 7 verde:** `tsc` **0** · `vitest` **375 | 3** file e **4380 | 19** prove · `next build` **0** ·
guardia documenti verde. **FASE 9** fatta (misure in `progress.md`).

🔑 **LA LEZIONE DELLA GIORNATA, in una riga:** *la fonte di un fatto è **lo strato in cui il codice lo
legge**.* È stata sbagliata **tre volte**, sempre allo stesso modo: il panel ha letto `schema.sql` invece di
`pg_proc` · io ho letto il **corpo HTTP** invece dell'**oggetto JavaScript** · io ho letto un vincolo
**al rovescio**. Ogni volta la fonte c'era e diceva un'altra cosa.

🆕 **D132** l'indice esclude gli **stati morti** · **D133** la versione **porta dentro l'impronta** del
testo, così cambia da sola. 🛑 **Mai il letterale `'dpa-v2'`**: si importa `VERSIONE_MODELLO_DPA`
(vale `dpa-v2+8d98dbee`).

🟠 **Una decisione resta APERTA, dichiarata:** il soft-delete della riga orfana **precede** la riemissione —
un guasto in mezzo lascia il dentista **senza contratto vivo**. Ristretto l'innesco, non l'esito.
Sede: **ondata 2** (roadmap **P10**).

🚀 `main` = `e2ff2d67`; ramo **`dpa-registro`** avanti di **35 commit**, albero pulito.
**37 commit DA PUBBLICARE in tutto** — Francesco ha scelto di pubblicare **tutto insieme a lavoro finito**.
📎 Verbale: **centotrentatré** decisioni in **quarantacinque** tornate; la prossima è **D134**.
⚠️ L'orologio della macchina dice **1° agosto**; i documenti seguono la serie del **3 agosto**.
