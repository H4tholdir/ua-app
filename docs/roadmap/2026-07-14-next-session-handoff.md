# Handoff — sessione pulita (dopo N4 + N8, 2026-07-14)

> Eseguibile da una sessione Claude Code fresca senza la conversazione precedente.
> BP-0 all'avvio inietta MEMORY.md + SESSION_ACTIVE.md: leggerli, poi questo file.
> Fonti di verità: `docs/roadmap/ROADMAP-UFFICIALE.md` (priorità) · `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (item §0 tabella stato).

---

## 0. Stato al 2026-07-14 (fine sessione)
- **V1.9.3 in produzione** su https://uachelab.com. `main` = `cee678e`, in sync con `origin`, working tree pulito.
- **N4 (fonte di verità del prezzo lavoro): ✅ mergiata e deployata** (`b025d61`). Helper unico `prezzoEffettivoLavoro` (`src/lib/domain/prezzo-lavoro.ts`), tutti i lettori refactorati, rimosso prefiltro `.gt('prezzo_unitario',0)`, guard PATCH 422, assertion Natura N4, badge divergenza. Riconciliazione: **0 divergenti su 286 lavori**.
- **N8 (tint pill via color-mix): ✅ mergiata e deployata** (`377ad27`). `var()`+alpha era CSS invalido → sfondo trasparente; convertiti a `color-mix` in scadenzario + portale + qualità.
- **Blocker (🔴): NESSUNO aperto.** B1–B22 tutti ✅.
- **Git housekeeping fatto:** worktree `worktree-n4-prezzo` e branch di sessione rimossi. Restano 4 branch pre-esistenti già mergiati, rimuovibili: `feat/fase2-core`, `fix/visual-audit-p0`, `plan-a-foundation`, `plan-b-core-flows` (`git branch -d <nome>`).

---

## 1. Quick-win consigliati come PRIMO blocco (fiscali, piccoli, contesto già caldo)
Percorso GRANDE (dominio FatturaPA) ma scope contenuto. Fare in un worktree dedicato, TDD, review, merge = gate Francesco.

- **N6 — "bollo nel dovuto"** (BACKLOG §N6): la contabilità netta dovuto/residuo sull'imponibile **senza** bollo (`src/lib/contabilita/queries.ts`), la fattura persiste `totale` **con** bollo €2 (imponibile > €77,47) → lo stesso lavoro salta di €2 passando da non-fatturato a fatturato. Stessa classe del bug N4 (due grandezze non allineate). Decidere: allineare la contabilità includendo il bollo previsto, o documentare la differenza come intenzionale. Toccare qui = dominio fiscale → spec breve + review.
- **N7 — gate `stato_sdi==='draft'`** (BACKLOG §N7): `src/app/api/fatture/[id]/xml/route.ts` seleziona `stato_sdi` ma non lo usa come gate; una 2ª invocazione su una fattura già `generata` ri-deriverebbe l'imponibile dal **lavoro vivo** via `generaFatturaPA` e sovrascriverebbe lo snapshot congelato. Fix: rifiutare (409/422) se `stato_sdi !== 'draft'`. Rischio reale basso (nessun percorso UI lo chiama su una generata oggi) ma è una blindatura fiscale. Piccolo + test.

---

## 2. Prossimo item fiscale IMPORTANT (se si vuole più sostanza)
- **N5 — `generaFatturaPA` hardcoda `TD01`** (BACKLOG §N5, `docs/roadmap` note Ondata 2): blocca le **note di credito TD04**. Serve parametrizzare il tipo documento. Dominio fiscale → percorso GRANDE (spec + piano + review). È l'item §N a maggior impatto funzionale ancora aperto.

---

## 3. Due filoni STRATEGICI già impostati (scelta di Francesco)
1. **DS v3 «Il cuore» — Sotto-progetto 3**: Home, pile, wizard, scheda lavoro, flusso Consegna. I componenti core (sp.2, 27 componenti in `src/components/ds/`) sono già fatti e approvati. Spec: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (§14.3). Ogni ondata UI → gate estetico L2 (FASE 9b).
2. **Ondata 4a-server (fiscale, zero UI)**: hardening consegna/annullo/SDI + outbox. Il pre-check P2 ha prodotto 10 item (P2-1…P2-10), tutti S2/S3 (annullo-DdC no-op, doppia fattura su annullo+riconsegna, UNIQUE DdC, fire-and-forget→outbox su pg_cron, progressivi consumati solo all'emissione, gate annullo su fattura inviata). Report: `docs/roadmap/P2-PRECHECK-CONSEGNA-SDI-2026-07-09.md`. TDD puro, review fiscale rafforzata, FASE 6b.

---

## 4. Backlog per priorità (dettaglio in BACKLOG-TECNICO §0)
- **🟠 Alto (~18 aperti):** A17 hydration React #418 sistemico · A18 hash integrità firma DdC · A19 allegato CAD/STL · A20 `audit_log.actor_id` sempre NULL · A1 push su assegnazione · A7/A8 portale-richiedi disconnessi/no-notifica · altri.
- **🟡 Medio (30 aperti):** M28 `middleware`→`proxy` (deprecato Next) · M23 no DELETE clienti · M25 `fatture/[id]` zero azioni · M6/M8 palette/colori non theme-aware residui · altri.
- **🟢 Basso (2 aperti):** D3 FAQ in-app · D4 blind-spot script DS-compliance.
- **§N residui:** N1 workflow firma DdC · N2 deprecare stato `in_ritardo` · N3 race condition `rete/[id]/inviti` · (N5/N6/N7 sopra).

---

## 5. Regole operative (dal CLAUDE.md — valgono sempre)
- **BP-2 percorso GRANDE automatico** per qualsiasi tocco a: RLS, Stripe, **FatturaPA**, auth, migrations (N5/N6/N7 rientrano).
- **Workflow:** brainstorming → validazione arch (FASE 3) → piano → worktree → TDD → FASE 7 (tsc+vitest+build, output reale) → review → QA browser → **FASE 9b gate estetico L2 se c'è UI** → merge/push = **gate esplicito di Francesco** → BP-1.
- **QA:** lab E2E `00000000-0000-0000-0000-000000000001`, **MAI lab Filippo**.
- **Migration:** dopo ogni migration → `npx supabase gen types … > src/types/database.types.ts` + `npx tsc --noEmit` (FASE 6b).
- **BP-1:** aggiornare MEMORY.md + ROADMAP-UFFICIALE.md + BACKLOG-TECNICO + SESSION_ACTIVE prima di fermarsi.

---

## 6. Come iniziare la nuova sessione
Chiedere a Francesco quale blocco affrontare:
- **A)** Quick-win fiscali **N6 + N7** (+ housekeeping branch) — chiusura netta e veloce.
- **B)** **N5** note di credito TD04 (fiscale IMPORTANT, percorso GRANDE).
- **C)** **DS v3 sp.3 «Il cuore»** (grande redesign UI).
- **D)** **Ondata 4a-server** (hardening fiscale zero-UI).

Poi: brainstorming → FASE 3 → piano → worktree → esecuzione. Per feature medie/grandi usare `superpowers:subagent-driven-development` (pattern usato con successo per N4).
