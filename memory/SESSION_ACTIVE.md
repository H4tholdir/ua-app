# Sessione attiva — CONSEGNA ZERO COMPLETA sul ramo, NON pubblicata (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-consegna-zero-piano.md`.**
Poi, per l'ondata: `docs/roadmap/2026-07-29-ondata-b-piano-v2.md` (§0 per prima).

✅ **Z3** (`deb923a1`) generatore · **Z2** (`beb36862`) normalizzazione in scrittura · **Z1**
(`e211cd94` + `21bab021` + `bf009e2d`) il `23505` che diventa **409 di dominio**.
**FASE 7: `vitest` 3672 verdi / 19 saltati / 0 falliti · `tsc` 0 errori · `next build` ok.**
FASE 6b **non si applica** (nessuna migration). Database **solo in lettura**, baseline **294 · 0 · 916 · 48**.

🛑 **MANCA SOLO IL VIA LIBERA DI FRANCESCO PER PUBBLICARE.** Il merge su `main` + push porterebbe
online **anche** i commit di documenti accumulati in locale. Nessuna azione verso l'esterno senza il suo sì.

🔑 **Z1 NASCE INERTE** — nessun indice unico sul codice esiste ancora (è **T5**): nel rapporto si scrive
«consegnato e inerte», **mai** «verificato in produzione».

🔑 **La lezione della giornata: tutti e tre gli esecutori hanno smontato un'affermazione del piano, e le
peggiori erano mie.** In particolare: un ritrovamento di un esecutore è una **segnalazione, non una
prova** — ne avevo copiato uno nel piano senza aprire il file, ed era falso. R-E2 dice di riferire;
**non dice che chi riceve possa promuovere a fatto senza guardare.**

✅ **D35 · D36 · D37** ratificate (ottava tornata, **37 decisioni**). **D37 corregge D36:** la FASE 9 ha
misurato che il testo occupava **tre righe** dove `Avviso.tsx:194` ne mostra **due** — spariva
l'istruzione. Testo in vigore, uno solo ovunque: «Questo codice è già di un altro paziente. Scrivine un altro.»

🔴 **Otto voci aperte fuori perimetro, in fondo alla ROADMAP.** La grossa: **76 punti delle API
rimandano il messaggio grezzo del database al client** (G9 dichiarato ma senza guardia).
