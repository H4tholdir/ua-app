# N4 — Fonte di verità del prezzo — Handoff esecuzione (sessione nuova, contesto pulito)

> **Preparato:** 2026-07-14, a fine brainstorming+spec+piano. **Owner:** Francesco.
> Eseguibile da una sessione Claude Code fresca senza la conversazione precedente.
> Il hook BP-0 inietta PINNED.md + MEMORY.md all'avvio: leggerli prima di iniziare.

---

## 0. Cosa è già fatto (sessione precedente)
- **Spec approvata**, confermata da 3 advisor specializzati (advisor generale + solution-architect + backend-api, gap di completezza chiusi): `docs/superpowers/specs/2026-07-14-n4-fonte-verita-prezzo-lavoro-design.md` (commit `da5ee76`+`87a58ff`, **solo locale**).
- **Piano pronto**, 10 task TDD con codice reale: `docs/superpowers/plans/2026-07-14-n4-fonte-verita-prezzo-lavoro.md` (commit `e212294`, **solo locale**).
- `main` locale avanti di **3 commit docs-only** su `origin/main` (spec×2 + piano, non pushati — pushabili, CD Vercel inerte).
- Nessun codice scritto: la sessione nuova **esegue il piano**.

## 1. Il problema (una riga)
Due fonti di prezzo mai sincronizzate: la contabilità legge `lavori.prezzo_unitario`, la fattura usa `sum(lavori_lavorazioni.importo)`. Sintomo: portale 322€, fattura 112€. N4 unifica la regola (righe se esistono, altrimenti prezzo_unitario) in un helper unico a read-time.

## 2. Come eseguire
1. **FASE 5 — worktree dedicato:** `superpowers:using-git-worktrees` → `worktree-n4-prezzo` dal HEAD locale (contiene spec+piano); copia `.env.local`; baseline test attesa ~**1608 pass | 4 skipped** (verifica il numero reale).
2. **Esecuzione:** `superpowers:subagent-driven-development` sul piano (10 task, review spec+qualità per task, review finale whole-branch).
3. **Nessuna migration** in N4 → niente FASE 6b / `gen types`.
4. **QA browser:** lab E2E `00000000-0000-0000-0000-000000000001`, **MAI lab Filippo** (i dati DB sono di test, verranno ripuliti prima della consegna).
5. **BP-1** a fine lavoro; **merge/push = gate esplicito di Francesco** (review finale whole-branch prima).

## 3. Punti caldi da non perdere (dagli advisor specializzati)
- **Definizione UNICA:** l'helper `prezzoEffettivoLavoro` (`src/lib/domain/prezzo-lavoro.ts`) è l'unica regola. `generate-xml.ts:103-106` va **refactorato** per usarlo (oggi ha la copia inline) — altrimenti driftano di nuovo = N4 con passi extra.
- **🔴 Bug di completezza (Task 3+4):** il prefiltro `.gt('prezzo_unitario', 0)` esiste in **3 siti** (`contabilita/queries.ts:93,225` + `scadenzario/route.ts:77`). Con "righe vincono", un lavoro con `prezzo_unitario=0/null` ma righe>0 ha un credito reale ma **sparisce** dal fetch. Rimuovere il filtro DB e filtrare in codice su `prezzoEffettivo>0`. `scadenzario/route.ts` dovrebbe chiamare `getCreditoScadutoPerCliente` invece di duplicarla.
- **Consumer che PRODUCONO il sintomo (Task 4), non dimenticarli:** `portale/[token]/fatturazione/route.ts:79` (il "322€" del dentista), `scadenzario/route.ts:148`, `pronti-da-fatturare/route.ts:50`.
- **Rounding identico** a generate-xml (somma grezzi, no round per-riga) → non perturba fatture emesse.
- **Emissione a due trigger (Task 7):** ramo `fatturaId` = operatore (via `/fatture/[id]/xml`, batch); ramo `else` = **CONSEGNA automatica senza operatore** → procede (righe vincono) + `console.warn` divergenza + badge read-time sul lavoro. Hard-block/conferma esplicita = DS v3 sp.3.
- **Guard server PATCH (Task 6):** rifiuta `prezzo_unitario` non-null con righe attive (422), **carve-out: azzeramento a `null` consentito** (unica riconciliazione finché non c'è l'editor righe).
- **Rollout (Task 5 isolato):** `registra-pagamento` è l'unico non reversibile (conia `credito_clienti_movimenti` persistenti) → landarlo separato, con scrutinio + query di riconciliazione. Pre-deploy: conteggio lavori-con-righe (se ~0 → rollout a freddo).

## 4. Fuori scope (esplicito — convertirli è un BUG)
- `getTitolareKpi` (margine) / `getTecnicoDashboard` (compenso) in `dashboard/queries.ts` — grandezza analitica diversa (`prezzo_unitario × quantita`).
- Editor righe nativo (fix PUT orfana + persistenza `TabLavorazioni`) = DS v3 sp.3.
- Branded type `Euro`, hard-block emissione = deferiti.
- Follow-up tracciato (NON N4): "bollo nel dovuto" (contabilità usa imponibile senza bollo, fattura con bollo €2).

## 5. Regole operative (dal CLAUDE.md)
- Dominio fiscale (FatturaPA) → percorso GRANDE (già seguito: spec + review + piano; ora esecuzione + review per-task + review finale).
- Lab E2E `…0001`, MAI lab Filippo.
- FASE 7 (tsc + vitest + build, output reale) prima del merge. Merge/push = gate esplicito di Francesco.
