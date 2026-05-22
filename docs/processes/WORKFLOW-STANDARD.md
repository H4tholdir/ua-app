# WORKFLOW STANDARD — UÀ PWA
## Procedura Operativa Standard per Feature Development con Claude Code

**Versione:** 1.0  
**Data:** 2026-05-22  
**Autore:** Francesco Formicola + Claude  
**Stack orchestrazione:** Superpowers + GSD + gstack

---

## PARTE 1 — ANALISI DEI 3 SISTEMI DI ORCHESTRAZIONE

---

### 1.1 SUPERPOWERS (Master Orchestrator dell'Esecuzione)

**Autore:** Jesse Vincent (obra)  
**Stars GitHub:** ~149K (maggio 2026)  
**Marketplace Anthropic:** Ufficiale dal gennaio 2026  
**Repo:** https://github.com/obra/superpowers

**Cos'è:**  
Framework di skills per Claude Code che impone un ciclo di sviluppo disciplinato basato su TDD, pianificazione strutturata e esecuzione via subagenti paralleli. Ogni task riceve un agente fresco con 200K token dedicati, prevenendo il degrado del contesto.

**Specializzazione:**  
Il "come si fa" — disciplina l'esecuzione. Nessun codice di produzione senza test rosso che fallisce prima.

**Skills disponibili (già installate nel progetto):**
| Skill | Trigger | Funzione |
|-------|---------|----------|
| `brainstorming` | Inizio feature | Esplora intent, requisiti, design prima di toccare codice |
| `writing-plans` | Dopo brainstorm | Crea piano dettagliato con file paths, comandi, fasi |
| `executing-plans` | Con piano pronto | Esegue il piano in sessione separata con checkpoint |
| `subagent-driven-development` | Task indipendenti | Lancia subagenti paralleli per task senza dipendenze |
| `dispatching-parallel-agents` | 2+ task indip. | Coordina agenti worker su domini separati |
| `test-driven-development` | Prima di ogni feature | Ciclo RED-GREEN-REFACTOR obbligatorio |
| `systematic-debugging` | Bug/errori | 4-fase root cause analysis, no fix random |
| `requesting-code-review` | Dopo implementazione | Review automatica vs piano e coding standards |
| `receiving-code-review` | Feedback ricevuto | Verifica tecnica prima di implementare suggerimenti |
| `finishing-a-development-branch` | Branch completo | Guida merge/PR/cleanup dopo implementation |
| `verification-before-completion` | Prima di dichiarare done | Richiede comandi di verifica reali + output prima di claims |
| `using-git-worktrees` | Feature isolation | Worktree isolato prima di ogni implementazione |
| `using-superpowers` | Inizio sessione | Stabilisce come trovare e usare skills |
| `writing-skills` | Creare nuove skills | Crea/edita/verifica skills prima del deploy |

**Punti di forza:**
- Integrato nel marketplace Anthropic ufficiale
- Ciclo TDD rigido — previene codice rotto in produzione
- Subagenti paralleli con contesti freschi (200K token ciascuno)
- `verification-before-completion` impone evidenza reale prima di ogni claim di successo

**Limitazioni:**
- I prompt interattivi durante la build phase possono bloccare l'input stream di Claude Code
- Non gestisce la strategia di prodotto o la validazione architetturale

---

### 1.2 GSD — Get Shit Done (Master dell'Anti-Context-Rot)

**Autore:** Lex Christopherson, community TÂCHES  
**Stars GitHub:** ~59K (maggio 2026)  
**Repo:** https://github.com/gsd-build/get-shit-done (v1.x) + https://github.com/gsd-build/gsd-2 (v2.x SDK)  
**Versione corrente:** 1.40.0

**Cos'è:**  
Sistema spec-driven costruito interamente sopra le capacità native di Claude Code (slash commands, CLAUDE.md, hooks, agent spawning). Risolve il problema del "context rot" — il degrado qualitativo di Claude quando il contesto si riempie. Ogni fase del workflow viene delegata a subagenti con contesti freschi.

**Specializzazione:**  
La stabilità dello spec nel tempo — previene che le specifiche derivino durante progetti multi-file, multi-sessione, multi-giorno.

**Core Commands:**
| Comando | Funzione |
|---------|----------|
| `/gsd:new-project` | Cattura l'idea e genera le specifiche iniziali |
| `/gsd:discuss-phase` | Chiarisce dettagli di una fase specifica |
| `/gsd:plan-phase` | Scompone il lavoro in task atomici |
| `/gsd:execute-phase` | Esegue i task in parallelo con wave-based execution |
| `/gsd:verify-work` | Valida l'output contro le specifiche |
| `/gsd:complete-milestone` | Archivia e prepara il release |

**Architettura:**
- 3 fasi fondamentali: **Plan → Execute → Verify**
- **Wave-based parallel execution:** task indipendenti in onde simultanee, task dipendenti in onde successive
- **Commit-per-task:** tracking automatico, rollback granulare possibile
- **Flag `--minimal`:** riduce il system prompt da 12.000 a 700 token (riduzione 94%)
- **v2 SDK:** controllo programmatico sull'orchestrazione

**Punti di forza:**
- Eccelle su progetti che durano più sessioni o coinvolgono molti file
- Specs persistenti su disco — sopravvivono al reset del contesto
- Flag `--minimal` lo rende leggerissimo in sessioni già strutturate
- Ideal per feature complesse di UÀ che toccano DB + API + UI insieme

**Limitazioni:**
- Overhead di setup per feature piccole (1-2 file)
- Non gestisce validazione architetturale o decisioni di prodotto

---

### 1.3 GSTACK (Master delle Decisioni Strategiche)

**Autore:** Garry Tan (CEO Y Combinator)  
**Stars GitHub:** ~71K+ (maggio 2026), 9,100+ forks  
**Repo:** https://github.com/garrytan/gstack  
**Versione corrente:** v0.15.14.0

**Cos'è:**  
Framework che trasforma Claude Code in un team virtuale strutturato con 23 strumenti specializzati che simulano ruoli aziendali: CEO, Designer, Engineering Manager, Release Manager, QA Engineer, DevOps. Non è un framework multi-agente — è un sistema di role-switching mediato dall'umano all'interno di Claude Code.

**Specializzazione:**  
Le decisioni — "cosa costruire", "come dovrebbe funzionare", "è pronto per il deploy". Garry Tan ha prodotto ~10.000 LOC/settimana per 50 giorni con questo setup, con un moltiplicatore di produttività di ~810x rispetto alla baseline 2013.

**Skills principali (8 workflow + 23 strumenti totali):**
| Skill/Comando | Ruolo simulato | Funzione |
|--------------|----------------|----------|
| `/office-hours` | CEO/Fondatore | Sessione di chiarimento obiettivi e priorità |
| `/plan-ceo-review` | CEO | Rethink del problema, challenge delle premesse, espansione scope |
| `/plan-design-review` | Designer | Validazione UX, flussi visivi, coerenza design system |
| `/plan-eng-review` | Engineering Manager | Architettura, data flow, diagrammi, edge cases, test coverage — UNICO gate obbligatorio |
| `/review` | Staff Engineer Paranoico | Cerca bug che rompono la produzione e race conditions |
| `/ship` | Release Manager | Sync con main, esecuzione test, apertura PR — automazione release hygiene |
| `/qa` | QA Engineer | Browser headless per testing e dogfooding, cattura bug evidence |
| `/retro` | Team Lead | Analisi data-driven del git history e shipping velocity |

**Lifecycle completo:** `office-hours → plan → implement → review → qa → ship → retro`

**Gate obbligatorio vs. informativo:**
- `/plan-eng-review` = unico gate OBBLIGATORIO
- `/plan-ceo-review` = raccomandato per cambiamenti di prodotto
- `/plan-design-review` = raccomandato per cambiamenti UI

**Punti di forza:**
- Impone rigore architetturale prima di ogni implementazione
- `/review` come staff engineer paranoico — cattura bug production-breaking
- `/qa` con browser headless integrato
- `/retro` per miglioramento continuo basato su dati reali
- Funziona su 8+ coding agents oltre Claude Code

**Limitazioni:**
- Non gestisce l'esecuzione del codice (solo le decisioni che la circondano)
- Non ha TDD enforcement nativo
- Role-switching è mediato dall'umano — richiede disciplina procedurale

---

## PARTE 2 — ARCHITETTURA DEL WORKFLOW CONCATENATO

---

### 2.1 La Logica di Integrazione

I tre sistemi operano su **livelli ortogonali** — non si sovrappongono, si completano:

```
LAYER 1 — DECISIONE       →  gstack    ("cosa costruire e perché")
LAYER 2 — STABILITÀ SPEC  →  GSD       ("come rimane coerente nel tempo")
LAYER 3 — ESECUZIONE      →  Superpowers ("come viene costruito con qualità")
```

Superpowers è il **master orchestrator dell'esecuzione** perché:
1. È già installato nel progetto
2. È nel marketplace ufficiale Anthropic
3. Ha il TDD enforcement più maturo
4. I suoi subagenti paralleli sono il meccanismo di esecuzione che GSD e gstack presuppongono

gstack è il **gate di ingresso e di uscita** — decide se si entra nell'implementazione e se si esce verso il deploy.

GSD è il **layer di memoria e coerenza** — attivato quando una feature è troppo grande per una singola sessione.

---

### 2.2 Regola di Selezione Rapida

```
Feature piccola (1-3 file, 1 sessione, scope chiaro)?
  → Superpowers soltanto
  → Percorso breve: brainstorm → TDD → review → ship

Feature media (3-10 file, 1-2 sessioni, architettura nota)?
  → gstack + Superpowers
  → plan-eng-review → brainstorm → TDD → review → ship

Feature grande (10+ file, multi-sessione, tocca DB+API+UI)?
  → gstack + GSD + Superpowers
  → Percorso completo descritto sotto
```

---

## PARTE 3 — DIAGRAMMA DI FLUSSO DEL WORKFLOW OTTIMIZZATO

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    WORKFLOW STANDARD UÀ — CICLO COMPLETO                    ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 0 — ORIENTAMENTO (ogni sessione, BP-0)                                │
│                                                                             │
│  1. Leggi ua-app/memory/MEMORY.md                                           │
│  2. Identifica file rilevanti                                               │
│  3. Presenta riepilogo → attendi conferma Francesco                         │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 1 — DEFINIZIONE GOAL  [gstack: /office-hours]                        │
│                                                                             │
│  Francesco descrive il goal.                                                │
│  Claude usa /office-hours per:                                              │
│  - Chiarire l'obiettivo di business                                         │
│  - Identificare utenti coinvolti (tecnico/titolare/front_desk)              │
│  - Definire il criterio di successo verificabile                            │
│  Output: Goal statement in 2-3 frasi                                        │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 2 — BRAINSTORM  [Superpowers: brainstorming]                         │
│                                                                             │
│  Claude usa /superpowers:brainstorming per:                                 │
│  - Esplorare approcci alternativi                                           │
│  - Validare assunzioni UX e tecniche                                        │
│  - Identificare dipendenze (DB, API, componenti esistenti)                  │
│  - Produrre il mockup HTML in /tmp/ se tocca UI                            │
│  Output: Spec bozza + mockup approvato da Francesco                         │
│                                                                             │
│  ⚠️  SE tocca UI: screenshot Playwright → approvazione visiva → poi React  │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 3 — VALIDAZIONE ARCHITETTURALE  [gstack: /plan-eng-review]           │
│                                                                             │
│  ⛔ GATE OBBLIGATORIO — non si procede senza questo step                   │
│                                                                             │
│  Claude usa /plan-eng-review per:                                           │
│  - Validare architettura, data flow, schema DB                              │
│  - Identificare edge cases e dipendenze RLS                                 │
│  - Verificare copertura test necessaria                                     │
│  - Walkthrough interattivo con raccomandazioni opinionated                  │
│                                                                             │
│  SE tocca prodotto/UX: aggiungi /plan-ceo-review                           │
│  SE tocca UI/design system: aggiungi /plan-design-review                   │
│                                                                             │
│  Output: Piano architetturale validato                                      │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 4 — PIANIFICAZIONE  [Superpowers: writing-plans]                     │
│                                                                             │
│  Claude usa /superpowers:writing-plans per:                                 │
│  - Scomporre in task atomici con file paths esatti                          │
│  - Definire l'ordine di esecuzione (dipendenze)                             │
│  - Identificare task parallelizzabili (wave GSD)                            │
│  - Specificare comandi di verifica per ogni task                            │
│                                                                             │
│  SE feature > 10 file o multi-sessione:                                     │
│    → Usa anche /gsd:plan-phase per wave-based execution                    │
│    → GSD persiste il piano su disco                                         │
│                                                                             │
│  Output: Piano scritto in ua-app/docs/plans/ o .gsd/                       │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 5 — SETUP ISOLAMENTO  [Superpowers: using-git-worktrees]             │
│                                                                             │
│  Prima di scrivere codice:                                                  │
│  - Crea git worktree isolato per la feature branch                          │
│  - Verifica che non ci siano modifiche non committed in main                │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
╔═════════════════════════════════════════════════════════════════════════════╗
║  FASE 6 — IMPLEMENTAZIONE TDD  [Superpowers: test-driven-development]      ║
║                                                                             ║
║  Per ogni task del piano:                                                   ║
║                                                                             ║
║  ┌─────────────────────────────────────────────┐                           ║
║  │  1. SCRIVE TEST CHE FALLISCE (RED)           │                           ║
║  │     npx vitest run → vede rosso              │                           ║
║  │                           │                  │                           ║
║  │                           ▼                  │                           ║
║  │  2. SCRIVE CODICE MINIMO (GREEN)             │                           ║
║  │     npx vitest run → vede verde              │                           ║
║  │                           │                  │                           ║
║  │                           ▼                  │                           ║
║  │  3. REFACTORING             │                │                           ║
║  │     npx vitest run → verde  │                │                           ║
║  └─────────────────────────────┘                │                           ║
║                                                 │                           ║
║  SE task indipendenti:                          │                           ║
║  → /superpowers:dispatching-parallel-agents     │                           ║
║  → Un agente per dominio (es: DB + API + UI)    │                           ║
║                                                 │                           ║
║  SE multi-sessione:                             │                           ║
║  → /gsd:execute-phase con wave-based execution  │                           ║
║  → Commit per ogni task completato              │                           ║
╚═════════════════════════════════════════════════╩═══════════════════════════╝
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 7 — VERIFICA INTERNA  [Superpowers: verification-before-completion]  │
│                                                                             │
│  Prima di dichiarare "fatto":                                               │
│  - npx tsc --noEmit                                                         │
│  - npx vitest run (136 test devono passare + nuovi test)                    │
│  - npx next build                                                           │
│  - SE tocca DB: npx supabase gen types typescript → npx tsc --noEmit       │
│                                                                             │
│  ⛔ Non si procede se un solo test fallisce o TypeScript ha errori          │
│                                                                             │
│  SE multi-sessione: /gsd:verify-work contro le specifiche GSD              │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 8 — CODE REVIEW  [gstack: /review + Superpowers: requesting-code-review] │
│                                                                             │
│  Due livelli di review:                                                     │
│  1. gstack /review → Staff engineer paranoico, cerca bug production-breaking│
│  2. /superpowers:requesting-code-review → Review vs piano e coding standards│
│                                                                             │
│  SE review ricevuta: /superpowers:receiving-code-review PRIMA di applicare │
│  (verifica tecnica, non applicazione cieca)                                 │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 9 — QA BROWSER  [gstack: /qa]                                        │
│                                                                             │
│  Browser headless per:                                                      │
│  - Navigazione delle pagine coinvolte                                       │
│  - Verifica degli stati UI a 390px / 768px / 1280px                        │
│  - Verifica light mode + dark mode                                          │
│  - Cattura evidence dei bug trovati                                         │
│                                                                             │
│  Alternativa: npx playwright test (se test E2E già scritti)                 │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 10 — SHIP  [gstack: /ship + Superpowers: finishing-a-development-branch] │
│                                                                             │
│  1. gstack /ship:                                                           │
│     - Sync con main                                                         │
│     - Esecuzione test suite completa                                        │
│     - Apertura PR con commit message standard                               │
│     Format: feat(modulo): descrizione / fix(modulo): descrizione            │
│                                                                             │
│  2. /superpowers:finishing-a-development-branch:                            │
│     - Decide: merge diretto / PR / cleanup                                  │
│     - Presenta opzioni strutturate                                          │
│                                                                             │
│  3. git push origin main → Vercel CI/CD automatico                         │
└─────────────────────┬───────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  FASE 11 — RETROSPETTIVA  [gstack: /retro]                                 │
│                                                                             │
│  Post-deploy (settimanale o per milestone):                                 │
│  - Analisi data-driven del git history                                      │
│  - Shipping velocity                                                        │
│  - Pattern di bug ricorrenti                                                │
│  - Aggiornamento di ua-app/memory/MEMORY.md con learnings                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTE 4 — PROCEDURA OPERATIVA STANDARDIZZATA (SOP)

---

### SOP COMPLETA — Dal Goal al Deploy Verificato

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 0 — OGNI SESSIONE (OBBLIGATORIO, BP-0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
□ Leggi ua-app/memory/MEMORY.md
□ Identifica file rilevanti per il task di oggi
□ Presenta riepilogo sintetico
□ ATTENDI conferma di Francesco prima di procedere

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — GOAL (gstack)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comando: /gstack:office-hours (opzionale, per goal ambigui)
Quando: Sempre all'inizio di una nuova feature o quando il goal non è chiaro

□ Goal statement scritto in 2-3 frasi
□ Criterio di successo misurabile definito
□ Utenti coinvolti identificati (tecnico / titolare / front_desk / admin_rete)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 2 — BRAINSTORM (Superpowers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comando: /superpowers:brainstorming
Quando: SEMPRE — prima di qualsiasi decisione di implementazione

□ Approcci alternativi esplorati
□ Assunzioni validate contro ANALISI/23 (DB) e ANALISI/30 (design)
□ SE tocca UI: mockup HTML in /tmp/ + screenshot Playwright + approvazione visiva Francesco
□ SE tocca normativa: verificato ANALISI/17 (MDR/FatturaPA/GDPR)
□ Output: spec bozza testuale

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 3 — VALIDAZIONE ARCHITETTURALE (gstack) ⛔ GATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comando: /gstack:plan-eng-review [OBBLIGATORIO]
         /gstack:plan-ceo-review [se cambia prodotto o scope]
         /gstack:plan-design-review [se cambia UI/design system]

□ Architettura validata
□ Schema DB verificato vs ANALISI/23
□ RLS policies verificate (usa public.current_lab_id())
□ Edge cases identificati
□ Test coverage definita
□ Nessun issue bloccante

NON PROCEDERE SE: architettura non validata

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 4 — PIANO (Superpowers + GSD se feature grande)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comando: /superpowers:writing-plans [SEMPRE]
         /gsd:plan-phase [SE feature > 10 file O multi-sessione]

□ Task atomici con file paths esatti
□ Ordine di esecuzione definito (dipendenze)
□ Task parallelizzabili identificati e raggruppati in wave
□ Comando di verifica per ogni task specificato
□ Piano salvato in ua-app/docs/plans/YYYY-MM-DD-[feature-name].md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 5 — ISOLAMENTO (Superpowers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comando: /superpowers:using-git-worktrees

□ Feature branch creata da main
□ git worktree isolato configurato
□ Nessuna modifica non committed sul branch main

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 6 — IMPLEMENTAZIONE TDD (Superpowers + GSD se multi-sessione)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comandi principali:
  /superpowers:test-driven-development
  /superpowers:executing-plans (con piano pronto in sessione separata)
  /superpowers:subagent-driven-development (per task indipendenti)
  /superpowers:dispatching-parallel-agents (2+ task senza dipendenze)
  /gsd:execute-phase (SE multi-sessione, wave-based)

PER OGNI TASK:
  □ Scrivi test che FALLISCE → npx vitest run → vedi ROSSO
  □ Scrivi codice minimo → npx vitest run → vedi VERDE
  □ Refactoring → npx vitest run → ancora VERDE
  □ Commit: git commit -m "feat(modulo): descrizione"

TASK PARALLELI (quando usare dispatching):
  □ Condizione: task su file/moduli diversi senza dipendenze
  □ Esempio: migration DB + componente UI + API route (tutti indipendenti)
  □ Ogni agente: contesto fresco 200K token

SE usa GSD per multi-sessione:
  □ /gsd:execute-phase per ogni wave
  □ Commit automatico per ogni task
  □ Stato persistito su disco

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 7 — VERIFICA INTERNA (Superpowers) ⛔ GATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comando: /superpowers:verification-before-completion [OBBLIGATORIO]

Checklist tecnica obbligatoria:
  □ npx tsc --noEmit → 0 errori
  □ npx vitest run → tutti i test passano (136 baseline + nuovi)
  □ npx next build → build completata senza errori
  □ SE migration DB eseguita:
      npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq \
        > src/types/database.types.ts
      npx tsc --noEmit → 0 errori
  □ SE multi-sessione: /gsd:verify-work → output validato vs spec

NON DICHIARARE "FATTO" SE: un solo check fallisce

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 8 — CODE REVIEW (gstack + Superpowers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comandi:
  /gstack:review [staff engineer paranoico]
  /superpowers:requesting-code-review [vs piano e coding standards]

□ Nessun bug production-breaking identificato
□ Nessuna race condition o problema RLS
□ Codice coerente con design system v2.2
□ SE feedback ricevuto: /superpowers:receiving-code-review PRIMA di applicare

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 9 — QA BROWSER (gstack)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comando: /gstack:qa

□ 390px (mobile) — verificato
□ 768px (tablet) — verificato
□ 1280px (desktop) — verificato
□ Light mode — verificato
□ Dark mode — verificato
□ Nessun bug visivo o di stato

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 10 — SHIP (gstack + Superpowers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comandi:
  /gstack:ship
  /superpowers:finishing-a-development-branch

□ Sync con main completato
□ Test suite completa: VERDE
□ PR aperta con commit message nel formato:
    feat(modulo): descrizione della feature
    fix(modulo): descrizione del fix
□ git push origin main → Vercel CI/CD automatico → https://uachelab.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP 11 — RETROSPETTIVA (gstack, settimanale / per milestone)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Comando: /gstack:retro

□ Analisi git history e shipping velocity
□ Pattern di bug identificati
□ ua-app/memory/MEMORY.md aggiornato con learnings
□ Eventuali aggiornamenti a questo documento se il workflow ha mostrato problemi
```

---

## PARTE 5 — TABELLA DI SELEZIONE RAPIDA

### "Quale sistema uso adesso?"

| Domanda | Usa | Comando |
|---------|-----|---------|
| Non so cosa costruire / obiettivo vago | gstack | `/gstack:office-hours` |
| Devo esplorare opzioni prima di toccare codice | Superpowers | `/superpowers:brainstorming` |
| Devo validare l'architettura | gstack | `/gstack:plan-eng-review` |
| Tocca prodotto/UX (non solo codice) | gstack | `/gstack:plan-ceo-review` |
| Tocca UI e design system | gstack | `/gstack:plan-design-review` |
| Ho un goal chiaro, devo pianificare | Superpowers | `/superpowers:writing-plans` |
| Feature grande (10+ file, multi-giorno) | GSD | `/gsd:plan-phase` |
| Devo isolare la feature | Superpowers | `/superpowers:using-git-worktrees` |
| Devo scrivere codice con TDD | Superpowers | `/superpowers:test-driven-development` |
| Ho 2+ task indipendenti da eseguire | Superpowers | `/superpowers:dispatching-parallel-agents` |
| Feature multi-sessione in corso | GSD | `/gsd:execute-phase` |
| Devo verificare cosa ho fatto | Superpowers | `/superpowers:verification-before-completion` |
| Devo fare code review | gstack + Superpowers | `/gstack:review` + `/superpowers:requesting-code-review` |
| Ho ricevuto feedback di review | Superpowers | `/superpowers:receiving-code-review` |
| Devo fare QA visivo su browser | gstack | `/gstack:qa` |
| Devo fare il deploy | gstack + Superpowers | `/gstack:ship` + `/superpowers:finishing-a-development-branch` |
| Trovo un bug / errore inaspettato | Superpowers | `/superpowers:systematic-debugging` |
| Fine sprint / milestone | gstack | `/gstack:retro` |

---

## PARTE 6 — PERCORSI ABBREVIATI

### Percorso A — Feature Piccola (1-3 file, scope chiaro, 1 sessione)

```
STEP 0 (BP-0) → STEP 2 (brainstorm) → STEP 3 (eng-review) 
→ STEP 6 (TDD) → STEP 7 (verify) → STEP 8 (review) → STEP 10 (ship)

Tempo stimato: 30-90 minuti
```

### Percorso B — Feature Media (3-10 file, architettura nota, 1-2 sessioni)

```
STEP 0 → STEP 1 → STEP 2 → STEP 3 → STEP 4 (solo Superpowers) 
→ STEP 5 → STEP 6 → STEP 7 → STEP 8 → STEP 9 → STEP 10

Tempo stimato: 2-6 ore
```

### Percorso C — Feature Grande (10+ file, multi-sessione, tocca DB+API+UI)

```
TUTTI I STEP 0-11 in sequenza, con GSD attivo dal STEP 4 in poi

Tempo stimato: 1-3 giorni
```

### Percorso D — Bugfix Critico in Produzione

```
STEP 0 → /superpowers:systematic-debugging → STEP 6 (TDD sul bug) 
→ STEP 7 (verify) → STEP 8 (review rapida) → STEP 10 (ship urgente)

Nessun brainstorm, nessun piano formale, verifica tecnica obbligatoria
```

---

## PARTE 7 — INSTALLAZIONE DEI SISTEMI

### Superpowers (già installato)
```bash
# Verifica installazione
ls ua-app/.claude/skills/ | grep -i superpowers
# Se non trovato:
npx skills add obra/superpowers
```

### GSD
```bash
# Installazione
npx skills add gsd-build/get-shit-done
# Oppure versione minimal (700 token vs 12.000):
npx skills add gsd-build/get-shit-done --minimal
```

### gstack
```bash
# Installazione
npx skills add garrytan/gstack
# Verifica skills disponibili
ls .claude/skills/gstack/
```

---

## PARTE 8 — NOTE SPECIFICHE PER UÀ

### Vincoli del Design System v2.2 (sempre attivi)
- Prima di qualsiasi codice UI: mockup HTML → screenshot Playwright → approvazione Francesco
- Animazioni SOLO da `src/design-system/motion.ts`
- Token CSS: `--bg`, `--sfc`, `--elv`, `--prs`, `--t1`, `--t2`, `--t3`
- Font: DM Sans (MAI Inter)
- Primary: `#D90012` (MAI `#E30613`)

### Vincoli del Database (sempre attivi)
- RLS: `public.current_lab_id()` (MAI `auth.current_lab_id()`)
- Ruoli: `titolare`, `tecnico`, `front_desk`, `admin_rete` (MAI `admin`)
- Dopo ogni migration: rigenera types + npx tsc --noEmit

### Vincoli Normativi (prima di toccare moduli fatturazione/DdC/GDPR)
- Leggi ANALISI/17 prima di qualsiasi modifica normativa
- DdC: Allegato XIII MDR (NON Allegato IV)
- FatturaPA: natura N4, bollo €2 se imponibile > €77,47

---

## RIFERIMENTI

- **Superpowers:** https://github.com/obra/superpowers
- **GSD:** https://github.com/gsd-build/get-shit-done | https://github.com/gsd-build/gsd-2
- **gstack:** https://github.com/garrytan/gstack
- **Analisi comparativa Pulumi:** https://www.pulumi.com/blog/claude-code-orchestration-frameworks/
- **Guida integrazione DEV.to:** https://dev.to/imaginex/a-claude-code-skills-stack-how-to-combine-superpowers-gstack-and-gsd-without-the-chaos-44b3
- **Zero-Resistance Stack:** https://shdhumale.wordpress.com/2026/05/05/the-zero-resistance-stack-building-faster-with-superpower-gsd-and-gstack/
- **Confronto MindStudio:** https://www.mindstudio.ai/blog/gstack-vs-superpowers-vs-hermes-claude-code-frameworks
