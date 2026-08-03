# Handoff — PIPELINE-3 Fase 0: l'hardening è attivo, su ramo (D197)

**Per:** Francesco, e per la sessione nuova a contesto pulito.
**Quando:** notte fra il 3 e il 4 agosto 2026 (`provato:` `date` → `2026-08-04`, letta dall'orologio come da §0F).
**Stato:** `main` = `0d97f8af` intonso · tutto il lavoro sta sul ramo **`pipeline3-fase-0`** · 🛑 **l'unione la decide Francesco** · 2 salvataggi di main restano DA PUBBLICARE (preesistenti a questa sessione).

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, E ANDAVA FATTO

### ① Il pezzo grosso della Fase 0 non è nemmeno iniziato: Supabase locale + prove RLS a due utenti
L'audit di stanotte lo ha **misurato, non stimato**: 5-10 giorni. Le ragioni, con le prove, sono
nella scheda **E1** di `docs/ops/EMERGENTI.md`: `supabase/config.toml` da creare; le migrations
**non ricostruiscono lo schema** (le tabelle fondative vivono solo in `supabase/schema.sql` —
fatto già verbalizzato in `docs/design/decisions/2026-07-04-rpc-integration-tests.md`); l'unico
canale DB reale dei test (`tests/integration/helpers/pg-client.ts`) entra come proprietario e
**bypassa la RLS per costruzione**. Non si improvvisa in una notte: va a betting come voce propria.

### ② L'ordine di lavoro della sessione precedente resta INTATTO e non è stato toccato
Gli scatti di D193 (il colore `--faint` mai guardato a schermo), P38 e P39 sono ancora lì,
nell'ordine deciso da Francesco: `docs/roadmap/2026-08-03-p30a-panel-e-colore-handoff.md`, la §0.
Questa sessione ha lavorato SOLO sul processo, non sul prodotto — nessun file di `src/` toccato.

### ③ Il promemoria di verifica allo Stop non è ancora stato visto scattare dal vivo
`.claude/hooks/promemoria-verifica.js` è scritto in stile fail-safe e provato a tavolino, ma il
primo vero innesco (sessione che si ferma con modifiche di codice non verificate) non è ancora
avvenuto. Alla prima occasione: guardare che il messaggio arrivi e che NON blocchi.

---

## 1. Che cosa è successo

| Cosa | Dove | Note |
|---|---|---|
| **D197 registrata** (adozione PIPELINE-3 per fasi, reversibile) | verbale `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, settantaduesima tornata | conteggio in testa aggiornato nello stesso momento (§0A-bis): 197 in 72 |
| Documento normativo del modello | `docs/processes/PIPELINE-3.md` | con gli **adattamenti alla casa** (§1): branch e MAI worktree, verbale D = unico registro, roadmap = unico backlog, Stop hook che ricorda e non blocca |
| Playbook d'origine copiato nel repo | `docs/processes/2026-08-04-pipeline3-playbook-originale.md` | fonti + panel 3 advisor; i file fuori repo non sopravvivono a un cambio di macchina |
| Gate di verifica L1/L2 | `package.json`: `verify:fast` · `verify:full` · `guardie` + `scripts/segna-verifica.mjs` | `verify:full` usa `npm run build` (col service worker), non `next build` nudo |
| Skill `/chiudi` aggiornata | `.claude/skills/chiudi/SKILL.md`, passo 2 | il one-liner storico **saltava la generazione del service worker**; ora `npm run verify:full` |
| Promemoria verifica allo Stop | `.claude/hooks/promemoria-verifica.js` + `Stop` in `.claude/settings.json` + `.claude/state/` in `.gitignore` | systemMessage, mai blocco; convive con remind-bp1 e claude-mem |
| Policy diramazioni a 4 esiti + code operative | `docs/ops/EMERGENTI.md` · `docs/ops/DECISIONI-PENDENTI.md` · `docs/ops/EXPIRED.md` | già popolate coi ritrovamenti veri di stanotte (E1-E3, Q1) |
| Template di brief e referto | `docs/templates/TASK-BRIEF.md` · `docs/templates/EVIDENCE-PACK.md` | formalizzano la prassi SDD con R-E1/R-E2 dentro |
| Audit read-only in 3 filoni (test/Supabase · harness · verbale/guardia) | referti distillati nelle schede di `docs/ops/` e in questo handoff | nessun file toccato dagli auditor |

**Le misure** (FASE 7, output nel messaggio di chiusura della sessione): `npm run verify:full`
eseguito per la prima volta — tsc · eslint src · vitest completo · build con service worker ·
sei guardie · marcatore scritto. I numeri incollati stanno nel riepilogo di sessione e nel
commit; la sessione nuova li rimisura con lo stesso comando, che ora è UNO.

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. **Il rituale che vive in un posto solo smette di divergere.** Il one-liner della FASE 7
   esisteva in almeno due forme (skill `/chiudi` e prosa §0C) e una delle due saltava il
   service worker. Ora è `npm run verify:full`, e chi lo cambia lo cambia per tutti.
2. **La coda scritta batte la memoria.** I tre ritrovamenti fuori mandato di stanotte (E1-E3)
   sarebbero finiti in chat e persi: sono schede con criterio di done, e Q1 aspetta Francesco
   in `docs/ops/DECISIONI-PENDENTI.md` con un default proposto.
3. **Il «verde a 23» era una misura storica, non un bersaglio.** La guardia conta i documenti
   della catena corrente (oggi molti meno): si legge il NUMERO e lo si spiega, non lo si insegue.

## 3. Che cosa resta aperto, in ordine di importanza

1. **L'unione di `pipeline3-fase-0`** — la decide Francesco (come per P31).
2. **E1** (Supabase locale + RLS, 5-10 giorni) → betting, voce P propria.
3. **L'ordine della sessione precedente**: scatti di D193 → P38 → P39 (invariato, §0②).
4. **Q1** in `docs/ops/DECISIONI-PENDENTI.md` (basso rischio, default proposto: `npm test` solo unit).
5. Dal prossimo item: **modalità Fase 1** — design di N+1 mentre gli agenti eseguono N
   (`docs/processes/PIPELINE-3.md` §5).

## 4. Da dove ripartire

Leggere `docs/processes/PIPELINE-3.md` (5 minuti, è il normativo). Poi: se Francesco autorizza
l'unione → merge di `pipeline3-fase-0` su main e `npm run verify:full` **sull'albero unito**
(gate L3). Poi si riprende il prodotto dall'ordine del §0②.

## 5. Il minimo per non sbagliare

- I nuovi comandi NON sostituiscono il pre-commit: `.husky/` è intatto ed è ancora il cancello del commit.
- `verify:full` usa `npm run build` apposta: MAI tornare a `next build` nudo nei rituali.
- Le diramazioni ora hanno una tabella (`docs/processes/PIPELINE-3.md` §3): niente più «lo faccio al volo» né «lo ricorderemo».
- Worktree ancora e sempre VIETATI: le corsie future di PIPELINE-3 sono branch.
