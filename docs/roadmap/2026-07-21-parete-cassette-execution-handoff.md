# Handoff — Esecuzione «Parete delle Cassette»
**Data:** 21/07/2026 · **Da eseguire in sessione NUOVA a contesto pulito** (prassi consolidata)
**Autorizzazione:** Francesco ha **ratificato spec rev.2 + D-10** (21/07). L'implementazione è autorizzata a partire; restano SOLO i gate elencati sotto. **MAI committare/pushare né applicare la migration senza la conferma esplicita richiesta al gate.**

## Contesto (30 secondi)
Sessione 21/07: prodotti e ratificati **spec di design** e **piano** della Parete delle Cassette (Punto 2 del handoff `2026-07-21-handoff-implementazione-mini-triage.md`). Panel advisor 3× CONFERMATA CON RISERVE, tutte integrate. Zero codice scritto finora, zero commit. MEMORY voce (23) · ROADMAP 21/07.

## Fonti di verità (leggere PRIMA di tutto, in quest'ordine)
1. **Piano** — `docs/superpowers/plans/2026-07-21-parete-cassette.md` (19 task TDD, è la guida operativa).
2. **Spec rev.2** — `docs/superpowers/specs/2026-07-21-parete-cassette-design.md` (il perché di ogni scelta).
3. **Ratifiche** — `docs/design/decisions/2026-07-21-parete-cassette-ratifiche.md` (D-10 + riserve panel).
4. **Decisions a monte** — `docs/design/decisions/2026-07-20-mini-triage-e-parete.md`.
5. **Mockup (fedeltà visiva TOTALE)** — `docs/design/mockups/2026-07-20-parete-cassette-v2.html` + `2026-07-20-parete-collocazione-home.html`.
6. BP-0 di rito: `ua-app/CLAUDE.md`, `ua-app/memory/MEMORY.md` (voce 23), `ROADMAP-UFFICIALE.md`.

## Come eseguire
- **Skill:** `superpowers:subagent-driven-development` (subagent fresco per task + review per task + review finale whole-branch), come per l'ondata A.
- **Worktree dedicato:** crealo via `superpowers:using-git-worktrees` (es. `.claude/worktrees/parete-cassette`). NON lavorare su main.
- **Ordine task:** 1→19 come nel piano. Le dipendenze sono nei blocchi «Interfaces».
- **FASE 7 completa** (tsc + vitest + next build, output reali) al Task 19.

## I 3 gate 🛑 (fermarsi e chiedere/attendere)
1. **Task 1 — apply migration.** La migration `20260721090000_parete_cassette.sql` include tabelle + trigger + RLS + **8 RPC** (incl. `cassetta_trasferisci_rifacimento` di D-10 e `utente_set_nav_pref`) + backfill idempotente. Prima di `npx supabase db push` sul progetto `iagibumwjstnveqpjbwq` → **chiedere conferma esplicita a Francesco**. Dopo l'apply: FASE 6b (gen types + tsc) + verifica read-only del backfill sul DB live.
   - ⚠️ **Ledger migration:** verificare che `supabase migration list` sia pulita prima del push (riconciliata il 20/07; se emergono nuove anomalie, fermarsi).
2. **Task 18 — mockup legenda 4 miniature nuove** (allineatore, mascherina/bite, riparazione, generica). Mockup HTML in `docs/design/mockups/` (MAI /tmp) + screenshot light/dark → **approvazione Francesco** prima del React delle 4 nuove. Le **6 esistenti** (corona/provvisorio/impianto/ponte/totale/scheletrato) sono già ratificate e si implementano subito nel Task 10.
3. **Merge finale** — dopo review (FASE 8) + QA browser lab E2E (FASE 9) + **GATE ESTETICO L2** (FASE 9b). Presentare a Francesco; merge/push SOLO su richiesta esplicita.

## Punti di attenzione (dal panel — non re-litigare, sono già decisi)
- **`numero_cassetta` esce da `PATCHABLE_FIELDS`** (route.ts) + test sentinella permanente. **`TabAccettazione.tsx:239-249`** (2° writer) va migrato nella stessa ondata: il campo cassetta MUORE nel form (→ riga read-only). Senza, si perde il dato in silenzio.
- **Verità occupazione** = riga viva `cassette_lavori`; `numero_cassetta` è denorm scritta SOLO dalle RPC. RLS SELECT-only + REVOKE su entrambe le tabelle.
- **Liberazione consegna:** aggancio in `orchestrate.ts` Step 5 (DOPO il Buono, che stampa la cassetta), fail-soft + riparazione a 3 strati. `consegna_finalizza_atomica` è RPC dormiente: NON è il percorso di consegna.
- **`numero_lavoro` è `string`** nel DB (come `LavoroPila.numero`) — il piano è già allineato.
- **Home due stanze** solo <1024; desktop = voce NavDesk. TastoPiù + dots FUORI dal pager (un solo rosso). `inert`+`aria-hidden` sulla stanza non attiva.
- **Preferenza** in `utenti.nav_preferences` via `utente_set_nav_pref` (chiavi `home` e `parete_intro_vista`); UI interim v2.3 in `/impostazioni` (regola convivenza §14: MAI v3 lì).

## Regole di ingaggio (invariate)
CLAUDE.md §0C 12 fasi + Regola Advisor (già soddisfatta per questa spec: panel 3×) · 0B soddisfatto per le 6 miniature + tutto il resto ha mockup approvati; il gate 0B residuo è SOLO le 4 miniature nuove (Task 18) · 3 viewport × 2 temi · lab E2E `00000000-…-0001` (MAI lab Filippo `971061a1-…`) · BP-0/BP-1 obbligatori · MAI committare/pushare/applicare-migration senza le conferme ai gate.

## Dopo la Parete
- **Punto 3 handoff** — sessione design «Cerca» globale (concept in `2026-07-20-mini-triage-ricerca-cassetta.html`; dipende dallo storico `cassette_lavori` che questa ondata crea). **Nota tracciata:** i lavori consegnati PRIMA del 21/07 hanno solo il residuo `numero_cassetta` su `lavori` e NESSUNA riga storico → «era in C12» dovrà unire due fonti.
- Coda invariata: A8 email Resend · sessione DB (A20+O4b+RPC `outbox_prepara_draft` orfana) · ricalibrazione perf-budget ~27/07-03/08.
