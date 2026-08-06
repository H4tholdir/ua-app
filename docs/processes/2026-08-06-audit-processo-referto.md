# Referto — audit del processo di sviluppo e del sistema di memoria

**Quando:** 6 agosto 2026. **Chiede:** Francesco — «*leggiamo tutto claude.md e il nostro workflow…
vorrei capire se ho sbagliato qualcosa, se ho sovrastrutturato o se invece mi sto solo impressionando*».
**Metodo:** panel di 4 subagent (Regola Advisor applicata al processo stesso): tre lenti indipendenti —
minimalista lean · guardiano della qualità · ingegnere del contesto — più un sintetizzatore avversario
che ha messo alla prova le loro proposte. 305k token, 47 letture dirette dei documenti.
**Esito decisionale:** D256-D259, verbale centotreesima tornata
(`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`).

---

## 1. Diagnosi (condivisa da tutte e tre le lenti)

**Il livello dei CONTROLLI non è sovrastrutturato.** verify:full (tsc + eslint + ~5.000 test + build),
le guardie pre-commit, le regole di piano R-P1/R-P2/R-P4/R-P6 e di esecuzione R-E1/R-E2, l'override sui
domini critici: quasi ogni regola porta il difetto reale e datato che l'ha generata, e la ricevuta
empirica più forte (8 difetti su 8 trovati nel piano dell'ondata (a), nessuno arrivato in produzione)
regge. Per un multi-tenant con obblighi MDR/FatturaPA/GDPR il livello è proporzionato al rischio.

**Il livello della MEMORIA è il punto sovrastrutturato — ed è la causa della lentezza percepita.**
- `memory/MEMORY.md` = 872KB (893.323 byte), ~89% log append-only di ~175 voci narrative. Il BP-0
  «leggi MEMORY.md» è **materialmente ineseguibile** (il file non entra in nessuna finestra di
  contesto): ogni sessione disobbedisce selettivamente, e una regola irrispettabile erode l'autorità
  delle altre. Le sezioni di stato in coda sono ferme al 22-28/05 (v1.8.0, DS v2.2) e la §11 serve
  ancora dati del lab di prova che lo Statuto delle fonti ha declassato.
- `ROADMAP-UFFICIALE.md` = 446KB: quattro generi mescolati (ordine del lavoro · registro
  incidenti/referti · changelog · piani versione). La testata ristata lo stato ed è già divergita
  (contava 241/91 mentre il verbale era a 250/98 — confessato nel file stesso).
- Lo stato del progetto si riscrive in **4+ copie** a ogni chiusura (testata MEMORY, testata ROADMAP,
  SESSION_ACTIVE, §0 handoff, verbale). La guardia-coerenza esiste per riconciliare copie che non
  dovrebbero esistere: meta-lavoro generato dal processo stesso.
- **I due incidenti peggiori sono passati dove la protezione era «prosa riletta»**: «mai mergiata»
  con l'ondata in produzione da giorni; deriva delle date +2 giorni auto-propagata per settimane.
  Fermati solo da meccanismi meccanici (`date`, guardia) o dal confronto dichiarato-vs-codice.

**Il modello giusto esiste già in casa:** PINNED.md (4.3KB, stabile), SESSION_ACTIVE.md (1.8KB,
riscritto), handoff §0. File piccoli e riscritti: è il modello da estendere ai tre giganti.

## 2. Cosa NON si tocca (unanime, con motivo)

| Elemento | Perché |
|---|---|
| Rete meccanica (verify:full, guardie, rm-guard, hook fail-safe) | costo di contesto zero, incidenti reali alle spalle; è il modello da ESTENDERE |
| R-P1 · R-P2 · R-P4 · R-P6 · R-E1 · R-E2 | ricevuta 8/8; il panel che le ha ratificate ha anche scartato regole con motivo |
| Override domini critici (RLS, Stripe, FatturaPA, auth, migrations) | unica regola dimensionata sul rischio, prevale su ogni alleggerimento |
| Statuto delle fonti | igiene epistemica a costo quasi nullo, correzioni reali già prodotte |
| 0A-bis (decisione numerata nello stesso turno) | costo una riga, ricevuta reale (3 buchi del 28/07); il difetto era il contatore in 4 copie, non la regola |
| PINNED.md · SESSION_ACTIVE.md · handoff §0 | il modello che funziona |
| §0F (data dall'orologio) · gate L2 con confine D245 | chiudono fallimenti provati e auto-propaganti |

## 3. Le raccomandazioni e il loro esito

| # | Priorità | Raccomandazione | Esito (06/08) |
|---|---|---|---|
| 1 | subito | Rotazione MEMORY.md: stato riscritto ≤30KB; cronaca fuori dal percorso di avvio | ✅ **D257**, emendata da **D258**: la cronaca non va in archivio morto — resta **diario vivo** in `memory/diario/` (un file al mese), scritto a ogni chiusura, consultabile sempre |
| 2 | subito | Una casa sola per lo stato: handoff §0 unico «dove siamo»; contatore decisioni in unica sede; voce di chiusura in formato tabella (D250) | ✅ D257 |
| 3 | subito | Mini-audit «dichiarato vs codice» in /chiudi, ristretto all'ondata appena chiusa | ✅ D257 |
| 4 | presto | Marchiare/spegnere strati fermi a maggio: banner «non verificato» su memory/domains/, grafo graphify da rigenerare o hook da togliere, ruolo di claude-mem dichiarato (archivio di ricerca, non layer attivo) | ✅ D257 |
| 5 | presto | Spacchettare la ROADMAP per genere (ordine del lavoro ≤30KB; referti in docs/roadmap/referti/; changelog in archivio); precondizioni dei rinvii enumerabili dalla guardia | ✅ D257 |
| 6 | presto | Registro decisioni con indice: docs/decisions/REGISTRO-DECISIONI.md + file per intervallo + tombstone nel file dell'ondata (b) | ✅ D257 |
| 7 | presto | Tetti di dimensione meccanici in /chiudi (fallisce la chiusura se i file di stato superano la soglia) | ✅ D257 |
| 8 | presto | CLAUDE.md radice: contenuto versionato in ua-app, sopra un puntatore rigenerabile (pattern D255) | ✅ D257 |
| 9 | presto | Percorso «Piccola» davvero piccolo (1-3 file fuori domini critici) | ✅ **D259**, emendamento in `ua-app/CLAUDE.md` §0C, in vigore |
| 10 | quando-capita | Regola Advisor: un mese di misura, poi eventuale restrizione | 🛑 **RESPINTA — D256**: «i panel lasciameli». La Regola Advisor resta invariata; non riproporre |

**Proposte scartate dal sintetizzatore (non riproporle senza fatti nuovi):** asciugare la genesi
narrativa delle regole nel CLAUDE.md (la genesi è carico portante e testo ratificato); affidare
l'archivio storico a claude-mem (vive fuori dal repo, non versionato — resta indice di ricerca
secondario); eliminare SESSION_ACTIVE.md (è l'unico file che si è sempre comportato da stato).

## 4. Le due domande di Francesco, a referto

**«Perché abbiamo due CLAUDE.md? È corretto?»** Sì: Claude Code carica automaticamente il CLAUDE.md
della cartella di lavoro E quelli delle cartelle superiori. La sessione parte da `SOFTWARE FILIPPO/`
(che contiene `ua-app/` + `ANALISI/`): il file superiore dà il quadro (contesto, indice ANALISI,
direttive generali), quello di `ua-app/` le regole operative del repo. Il difetto non è averne due:
è che il superiore vive **fuori da git** (la cartella non è un repository) e che i due **duplicano
contenuto** con la clausola-cerotto «se divergono vale ua-app». Cura = raccomandazione 8 (in D257).

**«Come si porta lo score da B a qualcosa di superiore?»** Il B non misura qualità del contenuto ma
attrito della rubrica (concisione, attualità, architettura). Piano dentro l'ondata di riordino:
radice → puntatore ~2-3KB (la duplicazione sparisce, la deriva diventa impossibile); ua-app →
(a) §8 «Stato Attuale» esce dal file delle regole e diventa puntatore a MEMORY/SESSION_ACTIVE — lo
stato invecchia, le regole no, e il file stesso già avverte «questa sezione invecchia in fretta»;
(b) ogni numero che invecchia sostituito dal comando che lo misura; (c) sezione breve «Mappa del
codice» (dove vivono rotte API, componenti ds, lib, migrations — il punto debole della rubrica);
(d) sezione «Ambiente» (variabili di `.env.local` richieste, senza valori). La genesi delle regole
NON si tocca (§3, proposte scartate).

## 5. Non verificato / limiti

- Le stime di costo per sessione del rituale (~20-30k token in lettura) sono calcoli sui byte dei
  file, non misure di telemetria: ordine di grandezza, non cifra esatta.
- L'efficacia dei panel sulle decisioni ordinarie non è misurata (né in un senso né nell'altro);
  con D256 la questione è chiusa per scelta esplicita di Francesco, non per prova.
- Referto integrale del panel (pareri completi delle tre lenti): output del task `wy9y6yu1i`,
  conservato solo nella sessione del 06/08 — questo documento ne è la sintesi durevole.
