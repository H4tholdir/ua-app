# Sessione attiva — P7 in produzione, e la deriva delle date chiusa

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-02-p7-in-produzione-e-la-deriva-delle-date-handoff.md`** —
leggilo per intero. 📅 **È il primo documento con la DATA VERA** (D155): si chiama `2026-08-02` perché oggi
**è** il 2 agosto, e ordinandolo per nome finisce **prima** dei file `2026-08-03/04-*`. **Non è un errore.**

🔴 **La §0 in una riga: la frase falsa a `DpaTemplate.tsx:210` è ancora viva — TERZO handoff di fila**
(`provato:` 1 occorrenza). Stavolta pesa di più: è stata **messa sul tavolo** a inizio sessione e il suo costo
**rimisurato** (mezza giornata, non mezz'ora — nessuno dei 17 controlli la blocca, ma il testo nuovo vuole un
panel). Poi: **P7 chiusa solo IN PARTE** (T4 non eseguibile, dichiarato ovunque) · la **spec P19-a non è ancora
stata riletta** (0 marchi, seconda giornata) · l'**archivio resta datato male per decisione** (D155) · le **tre
cose di Francesco** invariate (**P24 · P20 · D140**).

🔨 **LA FASE 1 È INIZIATA** — prima riga di codice applicativo in tre giornate. **P7 è in produzione**
(`main` **`45e89a62`**, CI verde, rilascio riuscito, `uachelab.com` 200; verificato che il codice **pubblicato**
porti il cambiamento, non solo che il rilascio sia andato). Tre pezzi: regola di riga a **sola lettura** ·
registro delle modifiche **da 10 a 11** tabelle · colonna **`emesso_da`** con parametro **obbligatorio**.
🔬 **Prove sul database vivo: T1 ✅** (col controllo positivo: regola vecchia 2 righe toccate, nuova 0) ·
**T2 ✅** · **T3 ✅** sul dato vero (`DPA-2026-0003`) · **T5 ✅** · **T4 🔴 non eseguibile** (bloccata da **P28**).

🔴 **QUATTRO voci nuove, tutte da ritrovamenti FUORI mandato (R-E2): P25 · P26 · P27 · P28** — fra cui:
un laboratorio che ha emesso un contratto **non si può più cancellare** (P28, preesistente dal 02/07).

📅 **D155 — la deriva delle date è chiusa.** `provato:` tre server indipendenti + `sntp` → **l'orologio era
giusto, i documenti sbagliati di +2 giorni**; i `2026-08-03-*` sono dell'1 agosto, i `2026-08-04-*` del 2.
Regola in **`CLAUDE.md` §0F**; l'archivio **non** è stato rinominato, resta la tabella di conversione.

📌 `tsc` **0** · `vitest` **4382 | 19** (375 file) · `next build` **0** · due guardie verdi.
📎 **155** decisioni in **55** tornate (**D146-D155** oggi); la prossima è **D156**.

⏭️ **PRIMA COSA: si prosegue la FASE 1** — ⚡ la correzione di `DpaTemplate.tsx:210` (mezza giornata) oppure
**P17** (⚠️ pagina in produzione: trascina §0B per intero **più** la FASE 9b).
