# Task 10-A — LA PROVA A CONTRATTO: il corpo del foglio si giudica con LA ROTTA VERA (riga 38 della coda)

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna` (attivo — MAI worktree)
**Nasce da:** il Task 10 del piano (`docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`, riga
~534) + la **riga 38 della coda** (`docs/roadmap/ROADMAP-UFFICIALE.md:355`). **Zero migration.**
**BASE:** `6912d2f1`.

---

## 0. Il difetto di categoria che questa prova chiude

La riga 38: cinque prove unitarie erano verdi su un corpo che la rotta rifiutava — niente legava il
corpo COMPOSTO dal foglio al CONTRATTO della rotta, perché le prove fingevano `fetch`. Il rimedio,
già usato e misurato nell'ondata precedente: **smettere di fingere `fetch` e instradare il corpo
composto sulla rotta vera** — a giudicare è il contratto stesso, senza terze copie del vocabolario.

**Il modello di casa è `tests/unit/devo-intervenire-contratto.test.tsx`: APRILO PER PRIMO e copia
l'approccio** (come monta il componente, come intercetta il corpo, come lo passa all'handler POST
importato, come finge il minimo indispensabile attorno alla rotta senza fingere la sua validazione).

## 1. Il mandato

**File nuovo:** `tests/unit/avviso-foglio-contratto.test.tsx` (o nome coerente col modello).
**Nessun file di produzione si tocca.** Se instradando il corpo vero scopri che la rotta LO RIFIUTA
(cioè un disaccordo reale foglio↔rotta): 🛑 **FERMATI e riporta BLOCKED con il caso esatto** — è un
difetto vero, e la decisione su come chiuderlo non è tua (R-E2).

Il soggetto: il foglio `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` compone il corpo
`{ avviso_id, come, testo? }` e lo manda a `POST /api/lavori/[id]/avviso` (fetch a riga ~513).
La rotta è `src/app/api/lavori/[id]/avviso/route.ts` (aggiornata stamattina da D354: verifica
l'avviso indicato PRIMA, poi chiude TUTTE le righe aperte del lavoro).

**Le forme da coprire (una prova per riga, tutte instradate sulla rotta VERA):**
① il corpo del percorso «WhatsApp» (comunicato dall'app, col testo modificato dall'utente) → la rotta
  lo ACCETTA (200);
② il corpo del percorso «l'ho avvisato di persona» (a voce, senza testo) → la rotta lo ACCETTA (200);
③ il corpo «a voce» quando il componente avesse un testo in mano → la rotta rifiuta un testo su
  «a voce» (422): la prova documenta che il foglio NON lo manda (il corpo composto vero non porta la
  chiave) — è la coppia «il foglio compone giusto» + «la rotta rifiuterebbe il contrario»;
④ una mutazione PLAUSIBILE del corpo (es. rinominare una chiave, o mandare una chiave in più) → la
  rotta la RIFIUTA: è la dimostrazione che il giudice è il contratto, non una copia.
Conta e dichiara: con le prove nuove in piedi e il foglio INTATTO, quante si accendono se il corpo
composto cambia in modo plausibile (la misura della riga 38: «7 su 9» nell'ondata precedente).

**Confini dichiarati (NON tuo mandato):** il verso opposto (risposta del server → schermata) e la
chiusura a livello di tipo restano APERTI come da riga 38 aggiornata — non li affrontare, dichiarali.

## 2. Regole di casa (vincolanti)

- Directory `/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app`, ramo attivo.
- La rotta usa `getFreshLabContext`/`getServiceClient`/`isSameOrigin`: guarda come il MODELLO li
  gestisce (finge l'ambiente attorno alla rotta, MAI la sua validazione).
- FASE 7 prima del commit: `npx tsc --noEmit` · `npx vitest run` · `npx next build`.
- 🛑 `git status` PRIMA · `git add <percorsi>`, MAI `-A` · NIENTE push · R-E2.
- Commit: `test(avvisi): …`.

## 3. Il resoconto

Completo in `.superpowers/sdd/avviso-dentista-task-10a-report.md` (approccio copiato dal modello ·
le forme coperte · la misura «N si accendono su M» · confini dichiarati). Poi rispondi con SOLO
(max 12 righe): **Status** · commit · una riga sui test · la misura · riserve · percorso del resoconto.
