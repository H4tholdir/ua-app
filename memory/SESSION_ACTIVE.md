# Sessione attiva — ondata (b): il brief di T8 è scritto, tocca all'esecutore (29/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-t8-brief.md`** (il brief di T8, scritto oggi), con
`docs/roadmap/2026-07-29-ondata-b-blocco3-handoff.md` come contesto e il piano
`docs/roadmap/2026-07-29-ondata-b-piano-v2.md` (§5 **P12** · §6 **T8**).
**Ledger: `.superpowers/sdd/progress.md` — i task completi lì SONO completi.**

**Ramo `ondata-b-schermate`** (mai un worktree). **Niente pubblicato su `origin`.**
✅ **Sette task chiusi e revisionati: T1 · T4 · T2 · T3 · T5 · T7 · T6.** DB **294 · 0 · 916 · 48**.
⚠️ `vitest` verde in **5 esecuzioni su 8**, vittima che **RUOTA**, file mai toccati sul ramo — flake già
diagnosticato (`.superpowers/sdd/diagnosi-flake-vitest.md:235`), **non una regressione**.

🆕 **D51-D53 (undicesima tornata, tre scelte di Francesco):**
- **D51** — T8 è il **solo motore**: rotta `DELETE` + filtro sugli otto siti. Bottone «Elimina foto» e
  contatore (`TabImmagini.tsx:571`) **escono** e fanno un task proprio con §0B. 🔴 Costo dichiarato: una
  rotta senza chiamante è **la forma di R14** (T7 inerte) → il task UI si aggancia **subito dopo**.
- **D52** — i due difetti del `PATCH` **entrano nel mandato** (dichiarati nel brief = non è R-E2): la
  guardia `:37-43` filtra `deleted_at` (**è un buco che apre T8**), e `:77` smette di rimandare l'errore
  grezzo (G9-76). Resta fuori e va **riferito**: l'`update()` `:68-74` con **due** `.eq()`.
- **D53** — **TOK-1** si chiude a **fine ondata (b), prima della pubblicazione**, con CLI-1. 🛑 La prima
  domanda portava una premessa **falsa** («nulla è online»): `provato:` `portale_token` è nella proiezione
  **su `origin/main`**, quindi il difetto è **vivo in produzione oggi**. Domanda rifatta, risposta invariata.

➡️ **Il brief di T8 è pronto e verificato** (otto coordinate ricontrollate una riga ciascuna; tre
riferimenti stantii corretti dentro il brief: `cicli:170`, `pazienti/route.ts:227-228`,
`tests/unit/helpers/supabase-chain-mock.ts`). 📍 **Sta in `docs/roadmap/`, NON in `.superpowers/sdd/`**:
quella cartella è ignorata da git e un punto di ripresa non può vivere solo su un disco.
🔑 **E porta la forma delle prove per gli otto siti**, che è il punto dove sarebbe scivolato: sono
componenti server, la finta della catena non li monta, e **zero test in tutto il repo nominano
`lavori_immagini`** — il precedente giusto è `tests/unit/ddc-lettori-gruppo-b.test.ts` (conteggio innesti
== conteggio filtri, un `it` per file), più una sonda in sola lettura **incollata nel rapporto** per i due
siti che contano. **Manca solo l'esecutore fresco** (R-E1) — attende Francesco.
