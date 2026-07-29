# Sessione attiva — ondata (b): fondamenta chiuse, tocca al Blocco 3 (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-fondamenta-handoff.md`.**
Poi il piano `docs/roadmap/2026-07-29-ondata-b-piano-v2.md`.
**Ledger operativo: `.superpowers/sdd/progress.md` — i task completi lì SONO completi, non rifarli.**

**Ramo `ondata-b-schermate`** (mai un worktree), da `b4b09d52`. **Niente pubblicato su `origin`.**
✅ **Sei task chiusi e revisionati: T1 · T4 · T2 · T3 · T5 · T7.**
**FASE 7 sul ramo: `tsc` 0 · `vitest` 3754 passati / 19 saltati · `next build` exit 0.**

🔒 **L'indice unico sul codice paziente è IN PRODUZIONE** (D43): da lì il messaggio «Questo codice è già
di un altro paziente» smette di essere inerte. Baseline **294 · 0 · 916 · 48**, toccata solo in lettura.

🆕 **Otto decisioni: D38-D45.** Le due che cambiano il lavoro a valle: **D44** (la ricerca pazienti
restituisce **quattro** chiavi e filtra su `codice_paziente | cognome | nome`, mai `nome_cognome`) e
**D45** (quando non trova nulla **lo dice** — e **un numero letto sui dati di prova non fa una regola**).

🔴 **Aperti, e non li sblocca il codice:** mockup **denti/colore** (T19/T20) · portata della guardia **B7**
(T13) · **la leva «si può saltare»** di riparazione/ribasatura — **sede** su `tipi-lavoro.ts`, **consumo**
in T21: **decisione di Francesco, non presa**.

➡️ **Si riparte da T6** (sbloccato da D44; §4-ter del piano dice cosa resta da sciogliere dentro), poi T8.
