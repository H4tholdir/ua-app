# Sessione attiva — ONDATA (b): PIANO SCRITTO (bozza), 26 decisioni, ZERO codice (28/07/2026, notte)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-28-ondata-b-piano.md`** — il piano. Prima di eseguirlo leggi
**§9, «cosa manca»**: è una bozza dichiarata, non un piano eseguibile.
Contorno: handoff `2026-07-28-ondata-b-piano-handoff.md` · spec ✅ **RATIFICATA** · verbale a **cinque
tornate** (D1-D8 · D9-D16 · D17-D20 · D21-D25 · **D26**).

**D26 — tre ondate** (divisione scelta da me su delega): **(b) il wizard** (tutto ciò senza cui non
funziona) · **(c) le foto per bene** (editor ruota/ritaglia/ingrandisci **e le stesse azioni sulla scheda**,
perché l'editor si scrive una volta e serve in due posti) · **(d) le cassette per bene** (parete in «modo
scelta» con ricerca + tavolozza più ricca, con la regola che **ricava** la tonalità scura).

**Stato del piano (20 task, T1-T20).** ✅ Fatti: censimento identificatori, 17 file letti con righe citate,
sonda **P2 provata** (0 duplicati · 916 · 294 · 0 · 48 → la migration non aborta).
🛑 **Manca per uscire dalla FASE 4:** 10 file **NON letti** (fra cui **4 test che si romperanno di sicuro**)
· **5 sonde da eseguire** (P1 indice, P3 proiezione, P5 storage, P6 costo query) · censimento dei **token
orfani** · **3 domande aperte** (DELETE soft o hard → panel normativo · tetto foto da misurare su device ·
la chiave `localStorage` cambia nome o no).

🔴 **Difetto trovato SCRIVENDO il piano (P4):** la spec §7 promette che una bozza `v:1` «viene rimossa», ma
`persistenza.ts:69-73` rimuove la chiave **solo alla scadenza**, non sul mismatch di versione → con `v:2`
una bozza vecchia resterebbe in `localStorage` **per sempre**. T7 deve chiuderlo, B20 provarlo.

🔑 Baseline DB invariata: **294 lavori · 0 denti · 916 pazienti · 48 colori** (solo letture, tutta la sessione).
