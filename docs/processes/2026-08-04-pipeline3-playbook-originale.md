> **Allegato di D197 — copia nel repo del playbook generico** (origine: sessione di ricerca del
> 03-04/08/2026, `Downloads/PLAYBOOK-PIPELINE-3.md`). Questo file è l'ORIGINE, con fonti e
> panel; il documento NORMATIVO per UÀ è `docs/processes/PIPELINE-3.md` — in caso di
> divergenza vale quello, e sopra ancora `CLAUDE.md` §0C. Copiato nel repo perché i file
> fuori dal repo non sopravvivono a un cambio di macchina.

# PIPELINE-3 — Modello di sviluppo parallelo controllato

> Playbook operativo per lo sviluppo AI-assistito con un solo product owner.
> Nato per SOFTWARE FILIPPO / PWA UÀ, progettato per essere istanziato su qualunque progetto futuro in meno di un'ora.
> Basato su: ricerca DORA 2024/2025, Anthropic Engineering (C-compiler multi-agente, verification loops, best practices Claude Code), Reinertsen (*Principles of Product Development Flow*), Kanban/Anderson (classes of service), Basecamp Shape Up, Supabase testing guide. Sintesi validata da un panel di 3 advisor indipendenti (Fable 5).

---

## 0. Diagnosi — perché i tempi si allungano

Il collo di bottiglia **non è la serialità degli agenti**. È triplice:

1. **L'attenzione umana è agganciata in modo sincrono a ogni fase di ogni item.** Ogni B-xx attraversa il PO più volte (opzioni, spec, review, QA); il throughput massimo del sistema è = numero di checkpoint umani smaltibili al giorno (legge di Little applicata al vincolo). Mentre gli agenti implementano, l'umano aspetta; mentre l'umano rivede, gli agenti aspettano: zero pipelining.
2. **Le diramazioni entrano in una coda FIFO invisibile senza policy.** Ogni scoperta diventa una negoziazione ad-hoc e la coda cresce monotonicamente: quella coda **è** l'allungamento dei tempi che osserviamo, non un suo effetto collaterale.
3. **Il costo di transazione per review è alto** (l'umano deve ricostruire il contesto per capire cosa guardare), quindi anche i batch piccoli costano cari.

**Conseguenza critica (evidenza DORA 2024):** parallelizzare gli agenti PRIMA di aver sistemato questi tre punti peggiora sia i tempi sia la qualità (+25% adozione AI → −1,5% throughput, −7,2% stabilità): più corsie = coda di review più lunga = rubber-stamping. Su un prodotto MDR il rubber-stamping non è inefficienza: è non-conformità.

**Ordine obbligato:** ① abbattere il costo di review (evidence pack + gate automatici) → ② pipelining delle fasi → ③ solo dopo, parallelismo delle corsie. Mai in ordine inverso.

**Guadagno atteso onesto: 1,7–2,2×** (metà dal pipelining, metà dalle diramazioni convertite in riempimento di corsie). Chi promette 3× sta contando diff non letti come throughput.

---

## 1. I tre binari (WIP totale massimo = 3 item vivi)

| Binario | Contenuto | WIP |
|---|---|---|
| **A — Implementazione** | Item N in worktree dedicato (`wt-B23-pdf-export`, mai nomi generici). Gli agenti lavorano in autonomia fino al gate, consegnano l'Evidence Pack e si fermano. | 1 (estendibile a 2, vedi §11) |
| **B — Design** | L'umano fa brainstorm → opzioni → approvazione → spec dell'item N+1 **mentre gli agenti implementano N**. La spec approvata è l'artefatto di disaccoppiamento. | 1 |
| **C — Meccanico (background)** | Task ben specificati: bump dipendenze, fix lint di massa, backfill test, bundle quickfix (stile B12+B15+B11). Permessi minimi, gate automatici obbligatori, di notte o in assenza dell'umano. Atterra come branch, mai auto-merge. | 0–1 |

**Regole di sfasamento rigide:**
- La spec di N+1 si **congela** prima che parta la sua implementazione. Mai design e implementazione dello stesso item in parallelo.
- Non si apre il design di N+2 finché N non è merged.
- Tetto assoluto: **2 implementazioni interattive + 1 meccanica**. Mai 3 interattive: oltre 2-3 agenti supervisionati la review reale degenera in rubber-stamping (consenso practitioner + Berkeley RDI "Level-Skipping").

**WIP limit sul collo di bottiglia umano (scritti nel backlog, inderogabili):**
- `Agente al lavoro`: max 2 (+1 background)
- `In attesa approvazione/QA umano`: **max 2-3 → se piena, nessuna nuova corsia parte**: gli agenti finiscono, documentano nel progress file e si fermano
- `Decisione attiva`: max 1

---

## 2. Politica delle diramazioni (4 esiti, meccanica, senza consultare l'umano)

Applicata dall'agente **nel momento della scoperta**; l'umano vede l'esito nel prossimo Evidence Pack. Cattura sempre, esecuzione quasi mai.

| Esito | Soglia (tutte le condizioni) | Azione |
|---|---|---|
| **1. EXPEDITE** | Blocca il contratto di verifica dell'item corrente, O corrompe/espone dati (RLS, pazienti), O viola MDR su funzionalità rilasciata, O rompe main | Si interrompe tutto e si fa subito. **WIP Expedite = 1 assoluto in tutto il sistema**: se ne emerge un secondo, il meno grave retrocede a QUEUE. Frequenza attesa <5%; se supera il 10% per 2 settimane → retro sulla sorgente |
| **2. FOLD-IN** | Stima <30 min E soluzione già nota E tocca solo file già nello scope del brief corrente | Si ingloba nel branch corrente, si annota nella spec e nell'Evidence Pack. **Non estende mai l'appetite** |
| **3. QUEUE** *(default, ~80-90% dei casi)* | Tutto il resto | Card di 2 righe in EMERGENTI.md: sintomo, file coinvolti, criterio di done, origine ("scoperto durante B-nn"), data, classe di servizio. **Mini-brief self-contained** (verrà eseguito da una sessione senza il contesto della scoperta). Poi si continua l'item corrente senza deviare |
| **4. DROP-NOTE** | Osservazione di stile/preferenza senza impatto su correttezza o requisiti | Una riga in EXPIRED.md, fine. Il rumore non entra in coda |

**Regola aggiuntiva:** le diramazioni scoperte da un agente in parallelo non vengono MAI risolte dall'agente che le scopre → sempre QUEUE. Un agente che devia dal brief è un difetto di processo.

**Scheduling delle card QUEUE** — triage timeboxed 10 min, SOLO a fine item o al betting settimanale, mai a metà lavoro:
- **Score CD3** (Cost of Delay ÷ Duration) precalcolato dall'agente: CoD 1-3 (3 = blocca utenti reali o MDR) ÷ durata in sessioni (0.5/1/2). **Solo score ≥ 3 autorizza il sorpasso della roadmap**; il PO valida in un click.
- **Quota 75/25**: ogni 3 item di roadmap completati, 1 slot a un bundle di emergenti.
- Le card INT (quickfix) si bundlano fino alla soglia "una sessione, un worktree, una verifica, un merge" → binario C.
- **Aging**: card non promosse entro 2 cicli di triage (~2 settimane) decadono in EXPIRED.md con 1 riga di motivazione (tracciabilità MDR preservata). Se il problema riemerge, è la prova che merita la promozione a item numerato.
- **Riempimento corsie**: una card emergente indipendente (matrice di conflitto: intersezione vuota) è la candidata ideale per una corsia libera — le diramazioni diventano throughput, non coda.
- Metrica di controllo: il numero di card emergenti aperte deve restare **stabile**; se cresce per 3 settimane, il sistema è sovraccarico → si chiude una corsia.

---

## 3. Gate di qualità a 3 livelli (precondizione di qualunque parallelismo)

| Gate | Quando | Contenuto | Enforcement |
|---|---|---|---|
| **L1** | Per-worktree, durante il lavoro (<5 min) | `tsc --noEmit` + lint + vitest dei file toccati | **Stop hook**: l'agente non può dichiararsi "finito" senza verde |
| **L2** | Pre-merge | Suite vitest completa + integration test su Supabase locale reale (RLS esplicite) + build + 5-10 E2E Playwright dei percorsi vitali | Nessun Evidence Pack entra in finestra umana senza output reale di L2 |
| **L3** | Post-merge, sul main integrato | Ripetere L2 sul main mergeato | Anti "false completion" (verde per-worktree, main rotto): solo il verde sul main conta |

Principio non negoziabile: **evidenza, mai asserzioni** — output reali dei comandi, screenshot, mai "fatto ✓" autodichiarato.

**Test strategy (PWA React+Supabase):** ~25% unit (solo calcoli: prezzi, date, dati PDF) / ~55% integration contro `supabase start` reale, con test RLS espliciti a due utenti ("il laboratorio A non vede i dati di B") / ~20% E2E Playwright sui percorsi vitali (login, ciclo ordine/dispositivo, PDF di conformità). **Politica flaky: fix immediato o cancellazione nella stessa sessione** — una suite di cui non ci si fida azzera tutto il modello.

---

## 4. Contract phase + matrice di conflitto + hotspot (anti conflitti semantici)

I worktree isolano i **file**, non l'**architettura**: due modifiche corrette in isolamento possono contraddirsi una volta composte, superando tsc e lint. È la classe di errore più insidiosa del parallelismo. Contromisure a tre strati:

1. **Matrice di conflitto** (subagent, 15 min, prima di ogni lancio): mappa dei prossimi 6-8 item → directory/moduli/tabelle Supabase/**concetti** toccati (verificata con analisi degli import, non a occhio). Si parallelizzano solo coppie a **intersezione vuota**. Due item che toccano lo stesso concetto (stesso store, stesso flusso, stessa tabella) restano seriali anche se toccano file diversi.
2. **Contract phase (sequenziale, su main)**: un'unica sessione scrive/aggiorna tipi TypeScript condivisi, schemi Supabase, interfacce, shape degli errori che gli item paralleli useranno, e li mergia su main PRIMA di aprire i worktree. **Agli agenti è vietato inventare contratti**: se manca un tipo, si fermano e lo registrano in DECISIONI-PENDENTI.md.
3. **Hotspot single-writer** (dichiarati nel playbook, un solo scrittore alla volta, claim in `current_tasks/`): migrazioni DB, package-lock, tipi condivisi, design token, generatore PDF (output di conformità MDR), routing, BACKLOG.md, SESSION_*.md.

**Seriali assoluti (mai in worktree parallelo):** migrazioni di schema Supabase · modifiche al design system (token/componenti base) · refactor trasversali (a corsie vuote, tutti i worktree mergiati prima) · decisioni architetturali/contract phase · due item MDR-critici in review umana contemporanea.

**Merge:** sempre sequenziali (mini merge-queue manuale), mai simultanei, ordine per dipendenze: **contratti/tipi → backend → frontend → test → docs**. Integrazione almeno quotidiana per corsia; un worktree che vive più di 2 giorni è un allarme.

---

## 5. Evidence Pack (formato fisso di ogni consegna al PO)

1. Cosa è cambiato, in ≤5 righe
2. Output **reale** di gate L1/L2 (mai asserzioni)
3. Screenshot / breve registrazione Playwright dei flussi toccati (il QA visuale diventa un confronto, non un'indagine)
4. Decisioni prese e alternative scartate (con ADR se rilevante)
5. Diramazioni registrate in EMERGENTI.md

È l'Evidence Pack — non la velocità degli agenti — che alza il throughput: abbatte il costo fisso per review, che è la precondizione economica dei batch piccoli (Reinertsen, U-curve della batch size).

---

## 6. Finestre di decisione (l'umano da interrupt-driven a batch-driven)

- **2 finestre al giorno** (es. 9:00 e 17:30, 20-30 min). Ordine fisso: ① Evidence Pack in coda → approva/rimanda ② DECISIONI-PENDENTI.md → decidi gli alto-rischio ③ spec/ADR da firmare ④ lancio nuove corsie se i WIP limit lo consentono.
- Fuori finestra: **gli agenti non interrompono mai** — accodano in DECISIONI-PENDENTI.md, ogni voce = 2-3 opzioni + raccomandazione + default proposto + rischio (alto/basso).
- **Default-con-veto**: le voci a basso rischio procedono col default se non vetate entro la finestra successiva; quelle alto-rischio (dati, MDR, UX visibile, contratti) bloccano finché non c'è risposta esplicita. Ogni default eseguito è annotato nell'Evidence Pack; audit mensile dei default.

---

## 7. Classi di revisione + appetite + circuit breaker

**Classe di revisione assegnata a ogni item in fase di spec:**
- **A** — Blocker / MDR / sicurezza / schema: review umana profonda + secondo reviewer subagent con checklist MDR. Mai due item classe A in review contemporaneamente. Non batchabile.
- **B** — High/Medium funzionale: gate automatici + spot-check umano dell'evidenza.
- **C** — Meccanico: soli gate automatici.

**Tetto ~400 righe di diff per unità revisionabile**: oltre, si spezza in più merge. Item completabili in ore, max 2 giorni; oltre → si spezza in sotto-item ciascuno col proprio oracolo eseguibile.

**Appetite + circuit breaker (Shape Up):** alla firma della spec il PO dichiara l'appetite ("1 sessione", "2 sessioni"). Allo sforo, **niente estensione silenziosa**: mini-betting di 10 min con tre sole opzioni — tagliare scope e chiudere, ri-shapare come item più piccolo, abbandonare. Le diramazioni non estendono mai l'appetite.

**Reviewer subagent** (a contesto fresco: vede solo diff + contratto di verifica, mai il ragionamento dell'implementatore) con mandato ristretto anti-rumore: *"Segnala SOLO gap di correttezza, requisiti della spec, conformità agli ADR citati, modifiche fuori scope. Niente preferenze di stile."* I finding tornano all'implementatore per fix + re-review **senza passare dall'umano**; al PO arriva solo l'esito finale con evidenza. (Un reviewer a caccia di gap ne trova sempre: senza vincolo produce over-engineering.)

---

## 8. Cadenze

| Rituale | Frequenza | Durata | Contenuto |
|---|---|---|---|
| Finestre di decisione | 2/giorno | 20-30 min | §6 |
| Betting | Settimanale | 30 min | Prossimi 2-3 item con matrice di conflitto già pronta (subagent), appetite, classe di rischio, quota 75/25 |
| Triage diramazioni | A fine item | 10 min (timebox) | §2 |
| Micro-retro di flusso | Settimanale | 15 min | Solo le 4 metriche (§9) + età anomale + tenuta dei WIP limit |
| Retro sorgenti + gate | Mensile | 30 min | Interruption analytics: se ≥40% degli emergenti nasce dallo stesso modulo → max 1 item "estintore di sorgente" in roadmap. Revisione dei gate stessi: **rimuovere** quelli che non bloccano più nulla |

**Giornata tipo a regime:** mattina — lancio corsie, gli agenti implementano N (e N'), l'umano fa design di N+1 · metà giornata — finestra 1: QA visuale di N−1 su Evidence Pack, approvazione spec N+1 · pomeriggio — agenti su N+1 o fix da review · sera — finestra 2 + eventuale lancio binario C notturno.

---

## 9. Metriche (4, auto-compilate dagli agenti al merge — zero burocrazia)

Nel backlog, per item: data spec approvata, data inizio, data merge. Derivate:
1. **WIP** corrente
2. **Throughput** settimanale (item merged)
3. **Cycle time** per item
4. **Work item age** — l'unica leading indicator: flag automatico oltre 5 giorni

Metriche spia: coda emergenti aperta (deve restare stabile; >15 = slot di smaltimento forzato) · tempo medio di approvazione item classe A (<5 min = rubber-stamping) · quota expedite (>10% per 2 settimane = harness rotto).

---

## 10. Artefatti (directory `ops/` nel repo — tutto versionato = tracciabilità MDR gratis)

```
ops/
  PLAYBOOK.md              ← questo documento + sezione "stato" (modalità corrente, §12)
  BACKLOG.md               ← ID | titolo | classe rischio A/B/C | classe servizio EXP/FD/STD/INT |
                             stato (Todo→Spec-ready→In progress→Review→Merged) | appetite |
                             data-spec | data-inizio | data-merge | origine
  DECISIONI-PENDENTI.md    ← coda decisioni: 2-3 opzioni + raccomandazione + default + rischio
  EMERGENTI.md             ← card diramazioni (§2)
  EXPIRED.md               ← card decadute, 1 riga di motivazione
  current_tasks/           ← 1 file per corsia attiva = lock claim (il conflitto git fa da mutex)
  sessions/SESSION_<ID>.md ← progress file per corsia: stato, approcci falliti, prossimo passo
  adr/ADR-nnn.md           ← 1 per decisione approvata: contesto, decisione, alternative scartate, item di origine
templates/
  TASK-BRIEF.md            ← 5 sezioni fisse: obiettivo · file di competenza + file VIETATI ·
                             contratti/ADR da rispettare · contratto di verifica (comando pass/fail
                             + evidenza richiesta) · out-of-scope esplicito
  EVIDENCE-PACK.md         ← le 5 sezioni del §5
  SPEC.md                  ← campi obbligatori: appetite, classe di rischio, criteri di accettazione
                             testabili, check end-to-end eseguibile dall'agente
```

Solo item **Spec-ready e senza dipendenze aperte** possono essere presi in implementazione (backlog come macchina a stati da cui gli agenti "tirano" il lavoro).

**Ruoli — SOLO l'umano fa:** scelta/priorità al betting · approvazione spec e ADR · decisioni alto-rischio · QA visuale su Evidence Pack · veto/merge finale classe A · appetite e verdetto al circuit breaker. **Tutto il resto è delegato agli agenti**, incluse: matrice di conflitto, proposta di triage con CD3 precalcolato, loop fix+re-review, compilazione metriche, redazione ADR da far solo firmare.

---

## 11. Piano di adozione graduale (il parallelismo si guadagna, non si dichiara)

**Fase 0 — Hardening dell'harness (≈1 settimana, PRIMA di qualunque parallelismo):**
1. Script `verify:fast` (L1) e `verify:full` (L2) in package.json + **Stop hook** su L1
2. Integration test su Supabase locale reale + test RLS espliciti; politica flaky attiva
3. Template TASK-BRIEF v2 (con contratto di verifica) ed EVIDENCE-PACK
4. Cartella `ops/` + `adr/` (con 1 sessione che estrae retroattivamente gli ADR dalle decisioni già prese, via claude-mem)
5. Policy diramazioni (§2) scritta e attiva

**Fase 1 — Pipelining (da subito dopo, guadagno maggiore a rischio zero):** binari A+B sfasati (design N+1 ∥ implementazione N) + 2 finestre di decisione al giorno + Evidence Pack. Nessun codice in parallelo: solo fasi sovrapposte di item diversi.

**Fase 2 — Binario C:** task meccanici notturni con permessi ristretti.

**Fase 3 — Seconda corsia di implementazione**, SOLO quando per 2 settimane consecutive: (a) Evidence Pack funziona, (b) gate L1/L2 stabili, (c) la colonna "awaiting review" non ha mai superato il limite, e (d) è successo almeno 3 volte che il binario A restasse fermo in attesa dell'umano. Pilota su 1 coppia certificata dalla matrice di conflitto, misurando cycle time e throughput prima/dopo per 2 settimane.

---

## 12. Degradazione con grazia (3 modalità, dichiarate in `ops/PLAYBOOK.md` sezione "stato")

- **PIENA** (≥2 finestre/giorno): tutto come sopra.
- **RIDOTTA** (≤1 finestra/giorno): si chiude la seconda implementazione; resta 1 implementazione + meccanico notturno; decisioni basso-rischio tutte a default-con-veto; betting quindicinale.
- **MINIMA** (settimana quasi assente): solo binario C (item classe C, gate automatici completi); nessun item A o B parte; diramazioni si accumulano in EMERGENTI.md con aging attivo. Al ritorno: 1 finestra da 1 ora smaltisce tutto in ordine fisso (Evidence Pack → decisioni → triage).

Gli agenti leggono la modalità a inizio sessione (rituale: progress file, git log, modalità, smoke test) e si adattano da soli.

---

## 13. Cosa NON cambia (il rigore attuale è l'asset, non il problema)

- **BP-2** (brainstorm → opzioni → approvazione → spec → piano → subagent → verifica): intatto nella sequenza; viene sfasato di un item e arricchito (appetite, classe di rischio, contratto di verifica), mai sostituito.
- **L'approvazione umana esplicita** delle decisioni: il modello cambia il COME (batch, default, evidence), mai il CHI.
- **Backlog numerato da audit** con tabella di avanzamento: è esattamente il "backlog groomed di card indipendenti" che rende il parallelismo possibile; si estende con colonne, non si sostituisce.
- **Git worktree**: da occasionali a strutturali (uno per corsia, nominati per item).
- **Bundling quickfix** (B12+B15+B11): giusto per la U-curve della batch size; vincolato a "una sessione, un worktree, una verifica, un merge".
- **Reviewer subagent indipendenti**: restano, con mandato ristretto e loop chiuso lato agenti.
- **SESSION_ACTIVE.md e claude-mem**: generalizzati in un progress file per corsia + ADR per le decisioni.
- **Verifica con comandi reali**: già prassi, diventa gate non aggirabile (Stop hook).

È proprio il rigore attuale ad aver creato le condizioni (backlog groomed, worktree, subagent, verifiche reali) in cui il parallelismo paga: il playbook lo capitalizza, non lo rimpiazza.

---

## 14. Fonti principali

- Anthropic — *Building a C compiler with a team of parallel Claudes* · *Multi-agent research system* · *Effective harnesses for long-running agents* · *Claude Code best practices / verification loops*
- DORA — *Working in small batches* · Report 2024 (+25% AI → −1,5% throughput, −7,2% stabilità) · Report 2025 (*State of AI-assisted Software Development*)
- D. Reinertsen — *The Principles of Product Development Flow* (batch size, code, WIP, costo di transazione)
- D. Anderson — Kanban, classes of service (Expedite WIP=1, allocazione di capacità)
- Basecamp — *Shape Up* (appetite, circuit breaker, niente backlog persistente, "Adjust to Your Size")
- Black Swan Farming — CD3 (Cost of Delay ÷ Duration)
- Berkeley RDI — *When Coding Stops Being the Bottleneck* (Level-Skipping)
- Supabase — *Testing guide* (integration-first su istanza locale reale, test RLS espliciti) · K.C. Dodds — *Testing Trophy*
