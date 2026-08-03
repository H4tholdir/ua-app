# PIPELINE-3 — Il modello operativo, adattato a UÀ
**Data:** 4 agosto 2026 · **Decide:** Francesco Formicola (D197) · **Stato:** Fase 0 attiva
**Documento normativo.** L'origine (playbook generico, con le fonti e il verbale del panel) è
`docs/processes/2026-08-04-pipeline3-playbook-originale.md`. In caso di divergenza con
`CLAUDE.md` §0C vale **§0C**: PIPELINE-3 vi si aggancia, non lo sostituisce.

---

## 0. Perché esiste, in tre righe

Il collo di bottiglia del progetto non è la velocità degli agenti: è **l'attenzione di Francesco
agganciata in modo sincrono a ogni fase**, più la coda invisibile delle diramazioni scoperte
lavorando. PIPELINE-3 rende l'attenzione **a finestre** e le diramazioni **una coda governata**.
L'ordine di adozione è obbligato: prima si abbatte il costo di ogni verifica e review (Fase 0),
poi si sovrappongono le fasi di item diversi (Fase 1), e solo dopo — se le precondizioni reggono —
si parallelizza il codice (Fase 3). Mai in ordine inverso: parallelizzare con la coda di review
piena produce solo diff approvati senza essere letti, e su un prodotto MDR è squalificante.

**Panel (Regola Advisor, §0C):** modello validato da 3 advisor a mandato disgiunto — lente
flusso/throughput, lente qualità/architettura, lente riusabilità — su dossier di ricerca
(DORA 2024/2025, Anthropic engineering, Reinertsen, Kanban/Anderson, Shape Up). Lenti e
conclusioni nel §14 del documento d'origine. Guadagno atteso onesto: **1,7–2,2×**, non 3×.

---

## 1. Gli adattamenti alle regole della casa (che cosa NON si importa)

Il playbook generico è stato adattato. Le differenze, con la ragione:

| Playbook generico | In UÀ | Perché |
|---|---|---|
| Corsie in **git worktree** | Corsie in **branch** (`git checkout -b`) | 🛑 Worktree VIETATI dal 28/07/2026 (§0C FASE 5): secondo `package-lock.json`, 404 su tutte le route. Difetto pagato |
| Cartella **ADR** nuova | **Verbale D** + spec esistenti | Il registro decisioni D1..D197 (docs/design/decisions/) è già l'ADR di questo progetto, con guardia meccanica. Non si duplica |
| **BACKLOG.md** nuovo | **ROADMAP-UFFICIALE.md** (voci P) | La roadmap è già fonte di verità con convenzioni e guardia proprie |
| Cartella `ops/` alla radice | `docs/ops/` | Esisteva già; la radice resta pulita e i percorsi restano nei prefissi che la guardia sa leggere |
| `current_tasks/` + `sessions/` per corsia | **Rimandati alla Fase 3** | Servono solo con 2 corsie di codice; crearli ora è burocrazia senza carico |
| Stop hook **bloccante** | Stop hook **promemoria** (systemMessage) | Convive con i due hook Stop già attivi (remind-bp1 e claude-mem); il cancello duro resta il pre-commit |

---

## 2. I gate di verifica (Fase 0 — ATTIVI da oggi)

| Gate | Comando | Quando | Contenuto |
|---|---|---|---|
| **L1 — veloce** | `npm run verify:fast` | Durante il lavoro, prima di dichiarare chiuso un blocco | `tsc --noEmit` + `eslint src` + `vitest run tests/unit` |
| **L2 — pieno** | `npm run verify:full` | Fine ondata, prima del merge, chiusura sessione | L1 + suite completa + `npm run build` (col service worker: MAI `next build` nudo) + `npm run guardie` |
| **L3 — post-merge** | `npm run verify:full` **sull'albero unito** | Dopo ogni merge su main | Il verde per-ramo non prova l'unione: solo il verde sul main mergiato conta (lezione D177: sei salvataggi su undici avevano scavalcato i ganci) |

- Le sei guardie aggregate in `npm run guardie` girano in modalità **piena** (senza `--staged`).
  Restano FUORI per costruzione (pre-commit righe 11-13): `guardia-navigazione-overlay.mjs` e
  `guardia-stili-collaudo.mjs` — vogliono l'app accesa; si lanciano a mano quando si toccano
  gli overlay v3 o al collaudo.
- Ogni verifica verde scrive il marcatore `.claude/state/ultima-verifica`
  (`scripts/segna-verifica.mjs`). L'hook Stop (`.claude/hooks/promemoria-verifica.js`) confronta
  il marcatore con le modifiche non committate e **ricorda** — non blocca — di verificare.
- Il pre-commit di `.husky/` resta **intatto**: è il cancello del commit; `verify:*` sono i
  cancelli della sessione. La sovrapposizione (tsc, guardie) è voluta: modalità diverse.
- **Evidenza, mai asserzioni**: l'output dei comandi si incolla, il numero si legge (lezione
  P32: una catena collassata esce verde — si guarda il NUMERO oltre al colore).

## 3. La politica delle diramazioni (Fase 0 — ATTIVA da oggi)

Quando durante un lavoro emerge qualcosa che non è nel mandato (bug collaterale, sotto-task,
requisito nuovo), **si applica la tabella, non il giudizio del momento**. È la generalizzazione
di R-E2 («un difetto fuori mandato si riferisce, non si corregge di nascosto») da regola per gli
esecutori a regola per l'intero flusso. La scheda si scrive **nel momento della scoperta**;
Francesco vede l'esito alla finestra successiva, non a interruzione.

| Esito | Soglia (condizioni TUTTE vere) | Azione |
|---|---|---|
| **EXPEDITE** | Blocca il contratto di verifica del lavoro corrente, O corrompe/espone dati (RLS, pazienti), O viola MDR su superficie pubblicata, O rompe main | Si interrompe e si fa subito. **Massimo UNO attivo nell'intero sistema**: se ne emerge un secondo, il meno grave retrocede a QUEUE. Se gli expedite superano il ~10% del lavoro per due settimane, il problema è il sistema: retro |
| **FOLD-IN** | Stima <30 minuti E soluzione già nota E tocca solo file già nello scope del mandato corrente | Si ingloba, si annota nella spec e nel referto. **Non estende mai l'appetite** del lavoro |
| **QUEUE** *(default, ~80-90%)* | Tutto il resto | Scheda in `docs/ops/EMERGENTI.md` (formato nel file): sintomo, file coinvolti, criterio di done, origine, data, classe. **Autonoma**: la eseguirà una sessione senza il contesto della scoperta. Poi si CONTINUA il lavoro corrente |
| **DROP-NOTE** | Osservazione di stile/preferenza senza impatto su correttezza o requisiti | Una riga in `docs/ops/EXPIRED.md`. Il rumore non entra in coda |

**Triage** (10 minuti, timeboxed): SOLO a fine lavoro o alla finestra di betting — mai a metà.
Per ogni scheda QUEUE l'agente precalcola lo **score CD3** = costo del ritardo (1–3; 3 = blocca
utenti reali o conformità MDR) ÷ durata stimata in sessioni (0,5 / 1 / 2). **Solo score ≥ 3
autorizza il sorpasso della roadmap**; Francesco valida in un click. Il resto rispetta la quota
**75/25**: ogni 3 voci di roadmap chiuse, 1 slot a un pacchetto di emergenti (i quickfix si
impacchettano: una sessione, un branch, una verifica, un merge). **Aging**: una scheda non
promossa entro 2 cicli di triage (~2 settimane) decade in EXPIRED.md con una riga di motivo —
se il problema riemerge, è la prova che merita una voce P vera. La coda aperta deve restare
**stabile**: se cresce per 3 settimane, il sistema è sovraccarico.

## 4. Le decisioni non urgenti (Fase 1 — si attiva col pipelining)

`docs/ops/DECISIONI-PENDENTI.md`: le questioni che oggi interrompono la sessione si accodano lì
(2-3 opzioni + raccomandazione + default proposto + rischio alto/basso). Francesco le smaltisce
in **finestre** (2 al giorno nelle giornate piene). Basso rischio: procede col default se non
vetato entro la finestra successiva, e il default eseguito si annota nel referto. Alto rischio
(dati, MDR, contratti, UX visibile, design system): **blocca** finché non c'è risposta.
⚠️ Non sostituisce §0A-bis: una decisione PRESA da Francesco riceve il suo numero D nello stesso
turno, come sempre. Qui vivono solo le decisioni **in attesa**.

## 5. Il ciclo a regime (Fase 1) — il BP-2 sfasato di un item

Il workflow §0C resta identico per ogni singolo item. La novità è **quando** partono le fasi:
mentre gli agenti eseguono le FASI 5-9 dell'item N, Francesco fa le FASI 1-4 (goal → brainstorm
→ gate architetturale → piano) dell'item **N+1**. La spec approvata è il punto di sgancio: si
**congela** prima che parta la sua implementazione, e mai design e implementazione dello stesso
item insieme. Non si apre il design di N+2 finché N non è mergiato. Ogni consegna arriva come
**referto in formato fisso** (`docs/templates/EVIDENCE-PACK.md`); ogni mandato a un esecutore
parte dal **brief in formato fisso** (`docs/templates/TASK-BRIEF.md`) — che formalizzano la
prassi SDD già in uso, con R-E1/R-E2 dentro.

## 6. Il piano di adozione (il parallelismo si guadagna, non si dichiara)

- **Fase 0 — Hardening** ✅ *attiva dal 04/08/2026 (D197, questo documento)*: gate L1/L2/L3,
  marcatore + promemoria Stop, template, code operative, policy diramazioni.
  ⏳ *Resta della Fase 0, a betting come voce propria:* **Supabase locale + prove RLS a due
  utenti** — l'audit del 04/08 lo misura in **5-10 giorni** (le migrations non ricostruiscono lo
  schema: serve una baseline; l'unico canale DB reale dei test bypassa la RLS per costruzione).
  Scheda completa in `docs/ops/EMERGENTI.md`.
- **Fase 1 — Pipelining**: dal prossimo item della roadmap, come descritto al §5.
- **Fase 2 — Binario meccanico**: lavori di classe C (bump dipendenze, lint di massa, backfill
  di prove) in sessioni non presidiate con permessi minimi e gate completi. Si attiva quando la
  Fase 1 gira liscia da una settimana.
- **Fase 3 — Seconda corsia di codice** (branch paralleli, NON worktree): SOLO quando, per 2
  settimane consecutive: (a) i referti in formato fisso funzionano, (b) L1/L2 stabili,
  (c) la coda di review di Francesco non è mai esplosa, (d) è successo almeno 3 volte che la
  corsia unica restasse ferma in attesa. Richiede matrice di conflitto per CONCETTI (non solo
  file) e contract-phase sequenziale su main prima di aprire il secondo branch. Decisione con
  panel, come da Regola Advisor.

**Rollback**: tutto ciò che PIPELINE-3 introduce è additivo e vive in commit marcati
`pipeline3:` sul ramo dedicato — tornare indietro è smettere di usarlo (+ eventuale revert).
Fotografia del metodo pre-adozione: backup del 03/08/2026 e tag `metodo-2026-08-03-pre-pipeline3`.

**Manutenzione**: alla retro mensile si rivedono anche i gate stessi — un controllo che non
blocca più nulla si RIMUOVE, non si colleziona.
