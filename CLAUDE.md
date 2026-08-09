# UÀ — ua-app
## Linee guida per Claude Code (REPO DEL CODICE)

La documentazione fondativa è in `../ANALISI/`. Questo file = regole operative del repo.

---

## 0. Memory Check — BP-0 (LETTURA — OBBLIGATORIO PRIMA DI INIZIARE)

Prima di qualsiasi lavoro, in ordine:
1. `memory/SESSION_ACTIVE.md` → contesto sessione corrente (già iniettato all'avvio)
2. `memory/MEMORY.md` → stato sprint e versione attuale
3. Identifica dominio del task → leggi `memory/domains/[dominio].md` se esiste

**SESSION_ACTIVE (aggiornamento obbligatorio):**
Aggiorna `memory/SESSION_ACTIVE.md` dopo ogni blocco di lavoro significativo (commit, decisione architetturale, bug importante). Sostituisci il file, non appendere. Max 200 token.

Documenti chiave:
- `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` → **DESIGN SYSTEM v3.2 «Una cosa alla volta» — UNICA FONTE DI VERITÀ per UI (in vigore dal 07/07/2026)**
- `docs/superpowers/specs/2026-05-27-design-system-v2-3.md` → DS v2.3, **DEPRECATO** — vale SOLO per superfici legacy non ancora migrate
- **Regola di convivenza (DS v3 §14):** la migrazione è **per route, MAI per componente**. Pagina già v3 (o nuova ondata v3) → token/motion/suoni/haptic da `src/design-system/v3/*`, componenti SOLO da `src/components/ds/`, wrapper `[data-ds="v3"]`. Pagina ancora v2.3 → `src/design-system/{tokens,motion}.ts` + `src/lib/feedback/*`. MAI mischiare i due sistemi nella stessa pagina.
- `../ANALISI/23_ua_database_schema.md` → schema DB
- `docs/roadmap/ROADMAP-UFFICIALE.md` → **ROADMAP — fonte di verità su cosa fare e non fare**

> ⚠️ `../ANALISI/30_design_system_v2_definitivo.md` → **DEPRECATO** — sostituito da DS v2.3
> ⚠️ `../ANALISI/26_ua_design_system_completo.md` → OBSOLETO, NON usare per UI

---

## 0A. Memory Update — BP-1 (SCRITTURA — OBBLIGATORIO DOPO LAVORO SIGNIFICATIVO)

**Dopo ogni task completato che cambia lo stato del progetto**, DEVI eseguire questi 2 step:

### Step 1 — Aggiorna MEMORY.md se lo stato del progetto è cambiato
- Nuova versione deployata → aggiorna sezione "0. STATO DEL PROGETTO"
- Nuova feature completata → aggiorna sezione CRUD/feature list
- Nuova decisione architetturale → aggiorna sezione "5. Architettura"
- Nuova API route → aggiorna tabella "7. API Routes Chiave"

### Step 2 — Aggiorna ROADMAP-UFFICIALE.md se la roadmap è cambiata
- Feature spostata da V2 a V1.9 → aggiorna
- Feature completata → sposta in "implementato"
- Nuova feature aggiunta → inserisci nella versione corretta

> **REGOLA ZERO MEMORIA:** Non chiudere un task senza aver verificato questi 2 step.
> Il hook `Stop` ti ricorderà automaticamente. Non ignorarlo.
> Se dimentichi ripetutamente, stai violando il contratto operativo con Francesco.
>
> **Nota su claude-mem (verificato 02/07/2026):** in questa installazione claude-mem gira in
> modalità `worker` (`~/.claude-mem/settings.json` — impostazione globale, vale per tutti i
> progetti). In questa modalità la cattura delle osservazioni è **automatica**, via hook
> `PostToolUse`/`Stop` registrati dal plugin stesso (`worker-service.cjs hook ... observation`
> / `... summarize`) — non serve e non è disponibile una chiamata manuale a
> `observation_add` (fallisce con `requires CLAUDE_MEM_RUNTIME=server`). Non richiamarla né
> segnalarla come step mancante: MEMORY.md e ROADMAP-UFFICIALE.md restano l'unica fonte di
> verità scritta e durevole per questo progetto.

---

## 0A-bis. «Il numero si dà subito» — BP-1-bis (ratificata 28/07/2026)

**Ogni volta che Francesco sceglie qualcosa, quella decisione riceve il suo numero e la sua riga nel
verbale NELLO STESSO TURNO** — non a fine sessione, non «quando aggiorno la memoria».

**Il fatto che l'ha generata:** il ripasso di chiusura del 28/07 ha trovato **tre buchi**, e sono lo stesso
errore in tre punti. **Sei decisioni vivevano solo in chat** (fra cui una che *cancellava* un lavoro: le
icone delle briciole, decadute col modello a pagine — senza scriverla, la sessione dopo le avrebbe
disegnate). **Le ondate (c) e (d) non erano nella roadmap**, cioè nel documento che dice cosa fare. **E la
memoria non sapeva niente** di mezzo pomeriggio di decisioni. Nessuno dei tre era una svista di scrittura:
tutti e tre nascono dal rimandare, perché una decisione piccola sembra sempre un dettaglio da mettere dopo.

**Le tre righe operative:**
1. **Una scelta di Francesco = una riga nel verbale, subito.** Anche «sì», anche «lascia libero». Se non ha
   un numero, non è una decisione: è una chiacchiera che qualcuno ricorderà male.
2. **Una decisione che cancella o rimanda del lavoro si scrive PER PRIMA.** È la più pericolosa da perdere:
   il lavoro cancellato, se non risulta, viene rifatto.
3. **Il conteggio in testa al verbale si aggiorna con la riga**, non dopo. È ciò che rende il buco visibile
   — e ciò che la guardia sa controllare.

**La rete meccanica:** `scripts/guardia-coerenza-documenti.mjs`, agganciata al pre-commit (~0,03 s).
Controlla che il conteggio dichiarato torni, che i numeri non abbiano buchi, che nessun documento vivo
rimandi a un file inesistente, che le «voci» citate esistano e che il punto di ripresa sia vero. Con
`--staged` avvisa se un salvataggio tocca un verbale o una spec **senza toccare la memoria**.
🛑 **La guardia controlla la COERENZA, non la VERITÀ**: non può sapere cosa è stato deciso e mai scritto.
Quella la garantisce solo questa regola. Le cinque prove che la guardia **si accende davvero** (una per
controllo, rompendo apposta un documento e rimettendolo) stanno nel commit che l'ha introdotta.

---

## 0C. Implementation Workflow — BP-2 (PROCESSO — OBBLIGATORIO PER OGNI FEATURE/FIX)

Documento completo: `docs/processes/WORKFLOW-STANDARD.md`. Versione condensata qui sotto.

**Regola di selezione orchestratore:**
| Dimensione | Orchestratori | Quando |
|-----------|--------------|--------|
| Piccola (1-3 file, <1h) | Superpowers only | Hotfix, piccoli tweak |
| Media (3-10 file, 1-2 sessioni) | GSD + Superpowers | Feature con architettura |
| Grande (10+ file, multi-sessione) | GSD (fasi) + Superpowers | Feature complesse |
| **⚠ OVERRIDE dominio critico** | **sempre percorso Grande** | **Qualsiasi change che tocca: RLS, Stripe, FatturaPA, auth, migrations — indipendentemente dal numero di file** |

**⚡ Percorso «Piccola» alleggerito (⚖️ D259, 06/08/2026 — centotreesima tornata):** per change di
1-3 file **FUORI dai domini critici** (l'override sopra prevale SEMPRE, e si accerta in FASE 3, che
resta obbligatoria): FASE 2 (brainstorming) **facoltativa** · FASE 8 con **UNA sola review**
(/code-review) · FASE 9 ridotta a **un giro sul viewport primario 390px, light+dark**, quando una
superficie è toccata. **Restano piene: FASE 3 · TDD (FASE 6) · FASE 7 · BP-1.** «Ridotta» non vuol
dire «niente prova a schermo»: la prova sul viewport primario è una prova vera. Nato dall'audit del
processo del 06/08 (`docs/processes/2026-08-06-audit-processo-referto.md`): rapporto rituale/lavoro
fino a 5:1 sui fix da minuti.

**Le 12 Fasi Obbligatorie:**

```
FASE 0  → BP-0: Leggi MEMORY.md + PINNED.md (già automatico via hook)
FASE 1  → GOAL: Francesco descrive. Se ambiguo, chiarire con domande prima di procedere (FASE 2 aiuta).
FASE 2  → BRAINSTORM: /superpowers:brainstorming (SEMPRE, anche se sembra ovvio)
FASE 3  → VALIDAZIONE ARCH (GATE — non si procede senza risposta a tutte e 5):
            □ Tenant isolation: questa change tocca RLS o current_lab_id()?
            □ Schema drift: serve migration? supabase gen types andrà rieseguito?
            □ API contract: il payload change rompe client esistenti?
            □ Rollback: come si annulla se va in prod e fallisce?
            □ Dominio critico? RLS/Stripe/FatturaPA/auth → percorso GRANDE automatico
FASE 4  → PIANO: /superpowers:writing-plans → file paths esatti, task atomici 2-5 min
            ⛔ Vincoli R-P1 · R-P2 · R-P6 (blocco «REGOLE DI PIANO» sotto): il piano
               non esce dalla FASE 4 senza registro prove + registro letture + censimento
FASE 5  → ISOLAMENTO: branch dedicata NEL REPO PRINCIPALE
            🛑 MAI un git worktree in questo progetto — il worktree si porta dietro un
               SECONDO package-lock.json e l'app risponde 404 su TUTTE le route. Difetto
               vero, pagato durante l'ondata (a). Vale anche quando una skill lo propone:
               /superpowers:using-git-worktrees NON si usa qui, si fa `git checkout -b`.
FASE 6  → IMPLEMENTAZIONE TDD: /superpowers:test-driven-development (RED→GREEN→REFACTOR)
            ⛔ Vincolo R-P4: dopo il primo rosso, abbozzo inerte + conteggio delle
               asserzioni che si accendono, e censimento delle forme d'input
FASE 6b → MIGRATION GATE (solo se migration presente in questa sessione):
            npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
            npx tsc --noEmit
            Verifica che la migration non rompa RLS policies esistenti
FASE 7  → VERIFICA: tsc --noEmit + vitest run + next build (tutti e 3, output reale)
            ⚠️ `tsc --noEmit` NON valida la firma degli handler di rotta: solo `next build`
               la vede. Per questo i tre comandi sono tre, e nessuno sostituisce l'altro.
FASE 8  → REVIEW: /code-review + /superpowers:requesting-code-review
FASE 9  → QA BROWSER: Playwright 390/768/1280px (light + dark)
            ⚠️ Diceva «/gstack qa»: gstack è stato RIMOSSO dal progetto il 28/07/2026 e quel
               comando non esiste più. Si usa la skill `webapp-testing` o gli strumenti
               `preview_*`/`mcp__plugin_playwright_*` direttamente.
FASE 9b → GATE ESTETICO L2 (🟡 obbligatorio fine ondata che cambia l'ASPETTO di
            una superficie, PRIMA del merge — D245, 05/08/2026):
            micro-audit UI/UX della SOLA superficie dell'ondata contro
            docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md (12 sezioni ×
            390/768/1280 × light/dark); ogni ❌ risolto o deferito con motivo;
            screenshot before/after in docs/design/screenshots/<data>-<sup>/.
            Framework: docs/design/audit-ui-ux/README.md (Livello 2).
            ⚖️ D245 — IL CONFINE, e si guarda IL CODICE TOCCATO, non l'effetto
            percepito: token, classi, stili, spaziature, testi visibili o
            struttura del markup → è ASPETTO, il gate è dovuto. Solo QUALI dati
            e IN QUALE ORDINE arrivano a una superficie già disegnata → è
            CONTENUTO, il gate NON è dovuto. 🛑 Ma la FASE 9 resta OBBLIGATORIA
            anche lì: cambiare un ordine può portare in cima una riga più lunga,
            un numero a due cifre, un titolo che va a capo — il gate L2 guarda
            com'è fatta la schermata, la FASE 9 che il contenuto nuovo ci stia
            dentro. Le due non si coprono a vicenda. ⚠️ IN DUBBIO SI FA IL GATE
            (fail-closed come R-P1). Il fatto che l'ha generata: il gate era
            stato saltato DUE giorni di fila, e la seconda volta la scelta era
            stata dichiarata invece che nascosta — ma la regola non distingueva,
            quindi ogni sessione decideva a naso. Verbale: la novantaquattresima
            tornata di docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md
FASE 10 → DEPLOY: merge → push → attendi CI verde → verifica uachelab.com
FASE 11 → BP-1: aggiorna MEMORY.md + ROADMAP-UFFICIALE.md
```

**REGOLA ADVISOR (ratificata da Francesco, 17/07/2026 — permanente):**
Ogni **decisione significativa** (architetturale, di design, di priorità/roadmap, normativa, fiscale, di performance) va validata da un **panel di 2-3 advisor specializzati** (subagent con prospettive diverse, scelti per dominio: es. solution-architect + sre-guardian + backend-api per performance; + ux-designer per UI; + appsec-auditor per sicurezza/fiscale) **PRIMA** di essere ratificata. Le riserve degli advisor si integrano o si motivano esplicitamente. Esenzioni: decisioni banali, reversibili in minuti, o già coperte da una decisione ratificata precedente. Questo generalizza la prassi dei panel già usata nelle spec: ora vale per OGNI decisione, non solo per le spec di design.

**REGOLE ZERO:**
- MAI saltare FASE 3 (validazione architetturale) per "feature semplici"
- MAI saltare FASE 6b se hai scritto o modificato una migration in questa sessione
- MAI dichiarare "fatto" senza aver eseguito FASE 7 con output reale
- MAI deployare con CI rosso
- MAI mergere una superficie di cui è cambiato l'**ASPETTO** senza il GATE ESTETICO L2 (FASE 9b, confine in **D245**); ogni piano `writing-plans` di un'ondata che tocca l'aspetto DEVE includerlo come step finale. 🛑 Se cambia il solo **CONTENUTO**, il gate non è dovuto ma **la FASE 9 sì** — e «non dovuto» non vuol dire «niente prova a schermo»
- MAI far uscire un piano dalla FASE 4 senza **registro delle prove** (R-P1) e **censimento degli identificatori** (R-P6): un blocco senza marchio è NON provato, un nome tolto da un'allowlist senza destinazione è un dato che smetterà di salvarsi in silenzio
- MAI un esecutore su due task; MAI correggere di nascosto un difetto trovato fuori dal proprio mandato — si riferisce (R-E1 / R-E2)
- SEMPRE aggiornare la memoria (FASE 11 = BP-1) prima di fermarti

**REGOLE DI PIANO — vincoli sulla FASE 4 (ratificate 28/07/2026 dopo panel 3×)**
Origine e prove: `docs/processes/2026-07-27-lezioni-piano-ondata-a.md`. Il fatto che le ha
generate: un piano di 2.200 righe, 8 task eseguiti, **8 difetti reali nel piano** — nessuno
arrivato all'utente. La riga da tenere: **un piano non è un documento, è codice non ancora
eseguito**, con in più il difetto di sembrare prosa.

- **R-P1 — Un blocco senza marchio è NON provato (fail-closed).** Si marca solo ciò che è
  provato, e il marchio porta la prova: `provato: <comando> → <output reale incollato>`.
  - Si provano le **assunzioni sull'ambiente** che il blocco dà per buone — una sonda da una
    riga («`array_agg` su zero righe dà `NULL`?», «il catalogo distingue `A3` da `a3`?») — **non**
    le centinaia di righe di codice del piano: quelle nascono marcate `non eseguito`, **con
    accanto il comando che l'esecutore userà per verificarle**.
  - Per ogni blocco che **istituisce un vincolo**, la prova include **un valore che DEVE essere
    rifiutato**, col messaggio d'errore incollato. Un `CREATE FUNCTION` riuscito prova la
    sintassi, non il comportamento; una migration che gira non prova che una colonna rifiuti
    `'pippo'`.
  - Anche una **previsione di esito** («ci saranno errori di compilazione», «atteso: 0 righe»)
    è un blocco e porta il suo marchio.
  - ⚠️ **Confine:** le sonde girano su **transazione annullata o schema usa-e-getta**, MAI una
    migration registrata (§8: una migration che aborta disallinea il ledger anche su dati di
    test). Gli spike sono usa e getta e **non si committano**: l'esecutore riscrive sotto test.
- **R-P2 — Nessun file toccato resta chiuso, e l'elenco NON lo decide l'autore.** L'innesco non
  è «i file che il piano nomina» — chi non nomina un file si esonera dall'aprirlo, ed è
  esattamente così che è passato il difetto peggiore dell'ondata (a): il file mancava dalla
  tabella «File Structure», la ricerca giusta era stata **eseguita**, e l'inferenza tratta era
  sbagliata. L'innesco è **l'esito del censimento R-P6**. Ogni percorso porta nel piano
  `letto: righe X-Y` oppure `NON letto`.
  - La lettura è **delegabile a un sottoagente**, e allora non costa contesto a chi pianifica —
    ma gli si chiede una **domanda falsificabile con le righe citate** («questo componente rende
    i decidui, se raggruppa per quadranti 1-4? cita le righe»), **MAI un riassunto**: un
    riassunto è «so cosa fa» esternalizzato di un livello.
  - **Assorbe R-P3 (cercare il precedente per COMPORTAMENTO, non per nome):** stesso passaggio,
    territorio dichiarato (`supabase/schema.sql` + `supabase/migrations/` + `src/lib/`) e, per
    gli oggetti di database, **catalogo vivo** (`SELECT proname FROM pg_proc WHERE prosrc ILIKE
    '%…%'`) invece del grep sui file. Si incolla il **numero di hit**: zero hit su una query con
    un solo termine non è una ricerca, è una speranza.
- **R-P6 — Il censimento si fa su ogni IDENTIFICATORE che il cambiamento tocca, non solo sulle
  colonne.** Simboli esportati, nomi di campo UI, membri di un'allowlist, chiavi JSON. E **ogni
  nome tolto da un'allowlist porta una riga con la sua nuova destinazione**: una riga senza
  destinazione è un dato che smette di salvarsi **in silenzio**
  (`src/app/api/lavori/[id]/route.ts:259-264` scarta le chiavi fuori allowlist senza errore —
  l'utente legge «Salvato» su un dato che non c'è).
- **R-P4 — vincolo sulla FASE 6.** Il rosso da «modulo non trovato» non prova che il test provi
  qualcosa: dopo il primo rosso si mette un **abbozzo inerte** e si **CONTA** quante asserzioni
  si accendono — il numero si scrive (`N su M`). ⚠️ Misura la **forza** dei test scritti, mai la
  loro **copertura**: prima delle asserzioni si enumerano le **forme d'input** (tipo sbagliato,
  chiave assente, `null`, array al posto di scalare, body non-JSON), ognuna col suo caso o col
  suo «non coperta, perché».

**REGOLE DI ESECUZIONE (stessa origine e data)**

- **R-E1 — Un compito alla volta, ognuno a un esecutore fresco**, con revisione fra l'uno e
  l'altro, e nel brief l'istruzione esplicita di **cercare attivamente dove il piano sbaglia**.
  È il meccanismo che ha reso visibili 8 difetti su 8, ed è il **punto di applicazione** delle
  regole di piano: l'esecutore del primo task verifica che marchi e registri **ci siano**
  (presenza, non verità) e, se mancano, si ferma e riferisce.
- **R-E2 — Un difetto trovato FUORI dal proprio mandato si RIFERISCE, non si corregge di
  nascosto.** Una correzione silenziosa lascia il piano sbagliato per tutti i task successivi.
  I ritrovamenti fuori mandato si raccolgono in **una sola sezione dell'handoff**, non arrivano
  a Francesco uno per uno.

> **Scartate dal panel, con motivo — non riproporle.** «`tsc` non basta per gli handler di
> rotta»: vera, ma è già FASE 7 ed è già in CI — resta la nota lì, non è una regola. «Il piano
> si scrive in sessione fresca»: la causa che presupponeva (stanchezza di fine sessione) **è
> contraddetta dall'artefatto** — i difetti sono sparsi su tutto il piano e il primo sta nel
> primo task scritto.

---

## 0D. Come parlare con Francesco (ratificata 23/07/2026 · **FORMA fissata da D250, 05/08/2026**)

🛑 **Questa sezione è AUTOSUFFICIENTE, e deve restarlo.** `../CLAUDE.md` §7 porta il testo storico
della direttiva del 23/07 ma **vive fuori dal repository git** (`git check-ignore` non lo copre: è
proprio fuori dall'albero) — quindi non sopravvive a un cambio di macchina. Se le due divergono,
**vale questa**.

### La lingua (23/07/2026, invariata)

Linguaggio piano, zero tecnicismi non spiegati: ogni concetto tecnico si racconta prima con parole
comuni o un'analogia concreta, poi (se serve) col suo nome tecnico. Mai elenchi di sigle, hash o
nomi di file come frase principale. Il registro tecnico pieno resta in commit, codice, `docs/` e
diagnosi — quelli sono per il repo, non per la chat.

### La FORMA — D250, provata prima di essere fissata

**Il fatto che l'ha generata:** Francesco, il 05/08: «*impostiamo un modo di rispondermi, globale, e
mantenuto stabile nel progetto, più sintetico e conciso, meno prolisso, non per questo deve saltare
informazioni, ma organizzate meglio e che mi permetta in meno tempo di comprendere tutto*». Tre
formati sono stati messi a confronto **sullo stesso contenuto** (il Task 5) e usati per quattro
messaggi veri prima della ratifica: ha vinto il **B**, «tabella prima».

**Lo scheletro, in quest'ordine:**

1. **Una tabella compatta in cima** — 3-6 righe, due colonne, `| cosa | esito |`. Ci vanno lo stato,
   i numeri misurati, e ciò che è in corso. Serve a dare il colpo d'occhio in cinque secondi.
2. **Due o tre blocchi di prosa**, ognuno con un titoletto — **solo per ciò che merita una frase
   intera**: un difetto trovato, una correzione a sé stessi, una scoperta che cambia le cose. Se non
   merita un titoletto, va in tabella.
3. **In chiusura, ciò che aspetta Francesco**: decisioni, autorizzazioni, scelte. Se non aspetta
   niente, si scrive «niente aspetta te».

**Le regole che la reggono, e che sono il motivo per cui la forma funziona:**
- 🛑 **Concisione NON vuol dire meno informazione: vuol dire meno RILETTURA.** Nessun fatto misurato
  si toglie — si sposta in tabella. Se una cosa non entra in nessuno dei tre posti, quella cosa non
  andava detta.
- 🔴 **La gerarchia è il punto.** Una regressione e un dettaglio minore non possono occupare lo
  stesso spazio: era il difetto del formato «densità massima», scartato per questo.
- **Si apre da ciò che è andato storto**, non dalla funzione nuova. Un errore raccontato per primo
  costa meno di un errore trovato in fondo.
- **Le correzioni a sé stessi si scrivono per intero e senza attenuanti** — sono la parte più utile
  di un resoconto, e nasconderle è il modo più veloce di perdere fiducia.
- **Il dettaglio tecnico**, se serve, sta in **un solo blocco finale dichiarato** (`<sub>`), mai
  sparso nel testo.
- ⚠️ **La forma NON si applica alle risposte brevi** (una domanda, una conferma): una tabella per
  dire «fatto» è un modulo, non una risposta.

📌 Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, **novantottesima tornata**.

---

## 0E. Chiusura sessione — `/chiudi` (ratificata 02/08/2026)

**Quando Francesco scrive `/chiudi`** — o chiede di chiudere, di preparare il passaggio a una sessione nuova,
di «prepararsi per un contesto pulito» — si esegue la **skill `chiudi`**: `.claude/skills/chiudi/SKILL.md`.

🔑 **La ragione:** la sessione nuova parte cieca e vede **solo ciò che è scritto**. Tutto quello che resta in
chat è perso.

**I sette passi, in breve** (il dettaglio sta nella skill): ① metti al sicuro il lavoro non salvato · ② misura
lo stato **vero** (`tsc` · `vitest` · `next build`, tutti e tre, output incollato) · ③ **censisci ciò che resta
aperto cercandolo nel codice**, non ricordandolo — e ricontrolla uno per uno i «si decide insieme» rimandati a
un gate · ④ scrivi l'handoff in `docs/roadmap/`, con la **§0 dedicata a ciò che NON è stato fatto**, per primo ·
⑤ allinea memoria, roadmap e verbale (BP-1 + §0A-bis) · ⑥ salva, e pubblica solo se autorizzato ·
⑦ 🎁 **consegna a Francesco il MESSAGGIO DI APERTURA**, in un blocco copiabile.

🛑 **La consegna è il messaggio di apertura, non «ho aggiornato la memoria».** Senza quello la chiusura non è
avvenuta. **Il fatto che l'ha generata:** il 02/08/2026 una chiusura fatta bene in tutto il resto si è
dimenticata proprio quello, e Francesco ha dovuto chiederlo.

### ⌨️ Se la barra non risponde a `/chiudi` — D255 (06/08/2026)

**Il fatto:** `/chiudi` **non è mai stato un comando** fino al 06/08 — era **solo** una skill, e per giunta
**scoped a `ua-app/`**, mentre le sessioni partono dalla **cartella superiore**. Veniva quindi scoperta a
metà sessione, troppo tardi per il menu della barra: da lì l'errore «*Unknown command: /chiudi*».

**Ora il comando esiste:** `ua-app/.claude/commands/chiudi.md` — un **puntatore** alla skill, mai una copia
(ricopiare i sette passi creerebbe una seconda procedura che diverge in silenzio).

🔗 **E serve un collegamento nella cartella superiore, perché è da lì che la sessione parte:**

```bash
mkdir -p "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/.claude/commands"
ln -sfn "../../ua-app/.claude/commands/chiudi.md" "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/.claude/commands/chiudi.md"
```

🛑 **Quel collegamento vive FUORI da git e non sopravvive a un cambio di computer** — se la barra smette di
rispondere, si rifà con le due righe qui sopra. **Il contenuto invece è versionato**, ed è la differenza
con il caso già pagato dello script del link d'accesso, che stava *tutto* in una cartella ignorata.
⚠️ **In ogni caso la procedura si può sempre chiedere a parole** («chiudiamo la sessione»): la barra è una
scorciatoia, non la strada.

---

## 0F. La data si legge dall'OROLOGIO, mai dal documento precedente (ratificata 02/08/2026 — D155)

🛑 **Prima di dare un nome a un documento, si esegue `date`.** La data non si deduce **mai** dall'handoff
precedente, né dalla riga «Ultimo aggiornamento», né dalla serie dei file già presenti.

**Il fatto che l'ha generata, misurato il 02/08/2026.** I documenti di questo progetto erano datati
**due giorni avanti** rispetto a quando venivano scritti, e nessuno lo sapeva: la stranezza era stata
tramandata come «*l'orologio del Mac dice 2 agosto, i documenti seguono il 4 agosto*», cioè trattata come
un orologio da aggirare invece che come un errore da chiudere.
`provato:` `date` → `Sun Aug 2 18:19 CEST 2026`, e **tre server indipendenti** (Google · GitHub ·
Supabase) rispondono tutti `Sun, 02 Aug 2026 16:19 GMT`; `sntp time.apple.com` → scarto **+0,09 s**.
**L'orologio del Mac era giusto. Erano i documenti a essere sbagliati.**
`provato:` `git log --diff-filter=A` su ~40 file: i `2026-08-03-*` sono nati l'**1 agosto**, i
`2026-08-04-*` il **2 agosto**. Deriva **costante di +2 giorni**.

🔑 **Il meccanismo, e per questo la regola è formulata così:** ogni sessione leggeva la data del documento
precedente e andava avanti di uno. Un errore fatto una volta si è **auto-propagato**, e sarebbe cresciuto
di un giorno a ogni sessione — perché nessun passaggio lo confrontava con un orologio.

⚠️ **Perché non è cosmesi:** le date nei documenti dicono **quando una cosa è stata verificata**
(«*fonte EUR-Lex letta il 03/08*», «*`npm audit` riverificato oggi*»). Su un progetto con obblighi di
legge, una data di verifica sbagliata di due giorni è una cosa che non si tiene.

📌 **L'archivio NON è stato rinominato** (D155: rinominare ~40 file e le centinaia di citazioni interne è
lavoro lungo e delicato, e non è FASE 1). **Tabella di conversione per chi legge il passato:**
un documento chiamato **`2026-08-03-*` è stato scritto l'1 agosto**; **`2026-08-04-*` il 2 agosto**.
La deriva si ferma qui: **dal documento successivo in poi, il nome porta la data vera**.

### 🕛 E per le MIGRATION l'orologio è UNIVERSALE — D311 (07/08/2026)

```bash
date -u "+%Y%m%d%H%M%S"      # in un comando SEPARATO, e si usa QUESTO output
```

**Il fatto che l'ha generata, misurato e non temuto:** il 07/08 il ledger delle migration si è
trovato con **due orologi**. `provato:` `git log --diff-filter=A` — `20260807143623_riemissione_ddc.sql`
è nata alle **14:53 CEST** con nome `14:36` (**locale**), `20260807171033_evento_scelta_intervento.sql`
alle **19:18 CEST** con nome `17:10` = le 19:10 di Roma (**UTC**).

🛑 **Perché non è cosmesi.** Roma è avanti di due ore, quindi un nome locale sta **sempre sopra** un
nome UTC preso nello stesso istante: se dopo un nome locale se ne prende uno universale entro due ore,
quello nasce **più basso di ciò che è già applicato** e `npx supabase db push` **si ferma**
(`LegacyDbPushMissingRemoteError`). E lo sblocco è peggio del blocco: `--include-all` fa divergere per
sempre l'ordine di applicazione vivo da quello dei file — in un archivio dove le stesse funzioni
vengono riscritte da più migration in fila, una ricostruzione può far vincere **un corpo più vecchio**.
🔑 **Universale e non Roma** perché l'ora locale **torna indietro di un'ora** l'ultima domenica di
ottobre: in quella finestra due nomi presi in momenti successivi possono scavalcarsi. UTC cresce sempre.
📌 Pavimento attuale: **`20260807185858`**. Verbale: centotrentaduesima tornata.

---

## 0B. Workflow UI — Obbligatorio per ogni nuova pagina/feature

Per **ogni nuova pagina o feature con UI**, seguire questo ordine senza eccezioni:

1. **Ricerca best practice** — cerca sempre pattern UX/UI di riferimento per il dominio specifico (fintech, gestione lavori, MDR compliance, ecc.). Includi: animazioni raccomandate, sound/haptic feedback, pattern viewport.
2. **Mockup HTML** in `docs/design/mockups/YYYY-MM-DD-nome-feature.html` — **MAI in /tmp/** (i file /tmp vengono cancellati, le decisioni si perdono). Dati reali simulati, nessun placeholder.
3. **Screenshot Playwright** del mockup — salvare anche in `docs/design/mockups/screenshots/`. **Mostrare SEMPRE PIÙ VARIANTI** (light+dark) tra cui scegliere, MAI una sola (preferenza permanente di Francesco): l'anteprima precede sempre il codice.
4. **Approvazione Francesco** — aspettare esplicito "ok procedi"/scelta della variante prima di scrivere React. Scrivere la decisione in `docs/design/decisions/YYYY-MM-DD-nome-feature.md`.
5. **Implementazione React** — fedele al mockup approvato, con:
   - **Animazioni** SOLO da token (MAI inline): pagine v3 → `src/design-system/v3/motion.ts` (molle/coreografie); pagine legacy v2.3 → `src/design-system/motion.ts`
   - **Suoni/Haptic**: pagine v3 → `src/design-system/v3/{sound,haptic}.ts`; pagine legacy v2.3 → `src/lib/feedback/sounds.ts` e `src/lib/feedback/haptic.ts`
   - **3 viewport**: mobile 390px (card-first, bottom sheet), tablet 768px (split-view), desktop 1280px (tabella/layout completo)
   - **Accessibilità**: `prefers-reduced-motion`, touch target ≥ 44px, colore mai unica fonte di stato

**Anti-pattern permanenti:**
- ❌ MAI tabella full-width su mobile — usare card + accordion
- ❌ MAI modal centrato su mobile per azioni — usare bottom sheet
- ❌ MAI animazioni su ogni scroll — solo su eventi significativi
- ❌ MAI suoni autoplay — sempre lazy init + preferenza utente
- ❌ MAI più di 3 KPI above the fold su mobile

---

## 1. Stack

Vedi `package.json`. Deploy: `git push origin main` → Vercel CI/CD automatico.

---

## 2. Comandi

```bash
npm run dev                    # localhost:3000
npx tsc --noEmit               # TypeScript check (zero errori richiesti)
npx vitest run                 # 3283 test unitari (26/07/2026) — il numero invecchia: fidati dell'output, non di questa riga
npx next build                 # Build production locale

# Dopo ogni migration Supabase:
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit               # verifica immediata

npx tsx scripts/seed-e2e.ts    # seed fixture E2E (idempotente)
```

---

## 3. Convenzioni Cartelle (non derivabili dal filesystem)

- Le pagine operative stanno in `src/app/(app)/` — **NON** creare `(dashboard)/`
- `src/components/ui/` = primitives shadcn/ui **SOLO**; i componenti di dominio vanno in `components/features/`
- `src/types/database.types.ts` è **generato** — non editare manualmente

---

## 4. Regola Motion — ASSOLUTA

**NON inventare duration, easing, spring.** Tutto da token, in base al DS della pagina.

```typescript
// ✅ CORRETTO — pagina v3 (molle §8.1)
import { molla } from "@/design-system/v3/motion"
transition={molla.smooth}

// ✅ CORRETTO — pagina legacy v2.3
import { t } from "@/design-system/motion"
transition={t("normal", "enter")}

// ❌ SBAGLIATO
transition={{ duration: 0.3, ease: "easeOut" }}
```

---

## 5. Naming + Commit

```
Componenti: PascalCase.tsx      Hooks: useCamelCase.ts
Utils:      kebab-case.ts       Pages: page.tsx (Next.js)
Temp files: /tmp/ o scripts/tmp/ — MAI in src/ o root

feat(lavori): add ConsegnaButton
fix(db): correct RLS policy
chore(deps): add motion@12
```

---

## 6. Normativa — Regole veloci

- **Dichiarazione:** Art. 52(8) + Allegato XIII MDR (NON Allegato IV).
  ⚠️ **Il nome «DdC» è improprio** (06/08/2026): l'Art. 10(6) riserva la *dichiarazione di conformità
  UE* ai dispositivi **diversi dai su misura**, e MDCG 2021-3 Q9 dice che i su misura sono
  accompagnati — «*in place of a declaration of conformity*» — da una **dichiarazione ex Allegato
  XIII**. Ogni **testo nuovo** usa il nome corretto; la rinomina della codebase è un'ondata a sé.
- **FatturaPA:** natura **N4**, bollo €2 se > €77,47
- **EUDAMED — 🛑 QUESTA RIGA DICEVA «ESENTI» ED ERA FALSA oltre il pre-market. Corretta il
  06/08/2026 leggendo il PDF ufficiale MDCG 2021-13 rev.1.**
  L'esenzione copre **solo** la registrazione **prima** di immettere sul mercato (Q2: «*exempted from
  the obligation of registering as actors in EUDAMED **before placing their devices on the
  market***»). **Finisce** — e la registrazione diventa obbligatoria — quando si trasmette per la
  prima volta una segnalazione di vigilanza: incidente grave, azione correttiva di sicurezza col suo
  avviso, o **andamento di incidenti non gravi**, «*in respect of custom-made devices **of any risk
  class***» (Q3); oppure al primo certificato per un impiantabile di **classe III**. Si riceve un
  **Actor ID, che non è un SRN**.
  📌 **Stato al 06/08/2026:** il modulo **Vigilanza/PMS non è ancora obbligatorio** — i quattro
  obbligatori dal 28/05/2026 sono *Actor registration · UDI/Devices · Notified Bodies & Certificates ·
  Market Surveillance*. **Fino ad allora si segnala per via nazionale al Ministero della Salute.**
  ✅ **CONFERMATO DA LEGGE ITALIANA il 07/08/2026, non più solo da una guida MDCG:** **D.Lgs. 137/2022
  art. 12 c. 2** obbliga alla registrazione EUDAMED «*i fabbricanti di dispositivi su misura
  impiantabili appartenenti alla classe III **e di dispositivi su misura oggetto di segnalazioni di cui
  agli articoli 87 e 88 del regolamento***» — è la stessa regola di MDCG 2021-13 Q3, ma in **norma
  primaria nazionale**. Base della segnalazione: **art. 10 c. 1** dello stesso decreto.
  🔄 **«Ufficio 5» ERA LA RIGA GIUSTA FINO AL 30/04/2026 E OGGI NON BASTA — corretta il 07/08/2026
  sulla pagina del Ministero (aggiornata il 22/07/2026):**
  - **Incidente grave (MIR 7.3.1): dal 1° maggio 2026 si trasmette ESCLUSIVAMENTE dalla pagina
    *Manufacturer Incident Report* della piattaforma NSIS-Dispovigilance — NON più via PEC**
    (circolari ministeriali 21/04/2026 prot. 34434 e 22/05/2026 prot. 44595).
  - La **PEC `dgfdm@postacert.sanita.it`** dell'**Ufficio 5 DGDMF** resta viva, ma per **altro**:
    azione correttiva di sicurezza (FSCA) col suo avviso (FSN, **in italiano**) e relazioni di sintesi
    periodiche (PSR), il cui formato si concorda con l'Ufficio 5.
  🔑 **Perché la distinzione conta:** una PWA che dicesse all'odontotecnico «manda la segnalazione via
  PEC» lo manderebbe **sul canale sbagliato per l'unico caso che ha una scadenza di legge**. 🔑 **Perché contava:** l'esenzione finisce esattamente nello scenario dell'ondata
  «si deve sempre poter intervenire» — cioè nel momento in cui costa di più crederla incondizionata.
- **ITCA:** OBBLIGATORIO (campo `laboratori.codice_itca`). 📌 **Precisato il 07/08/2026 sul testo
  vigente (Normattiva):** la sanzione **8.150-48.500 €** (D.Lgs. 137/2022 **art. 27 c. 13**) colpisce
  gli **obblighi di registrazione** dell'**art. 7 commi 1-3**, mai il contenuto della dichiarazione.
  ⚠️ **La riduzione di 1/3 per le microimprese (c. 48) è AUTOMATICA**: ciò che va verificato caso per
  caso è **se il laboratorio sia microimpresa** ai sensi della raccomandazione 2003/361/CE — non se la
  riduzione si applichi. **Nessun decreto MEF di aggiornamento ISTAT** (c. 51) risulta emanato: al
  07/08/2026 gli importi sul testo vigente sono ancora quelli originari.
  🔑 **Il nome «ITCA» non compare nella legge:** l'oggetto giuridico è l'*elenco dei fabbricanti di
  dispositivi su misura*; ITCA è il codice che il sistema assegna, **non** un'autorizzazione né una
  certificazione, non scade, e l'iscrizione è **gratuita** (FAQ del Ministero, agg. 06/07/2026).

---

## 7. Pricing Stripe (già in produzione)

| Piano | Mensile | Annuale | Price ID mensile | Price ID annuale |
|-------|---------|---------|-----------------|-----------------|
| Lab | €49 | €490 | `price_1TWCfaRsMhN7mg7YVt0UfeNB` | `price_1TWCfbRsMhN7mg7Y7Ejl1k5w` |
| Rete PRO | €149 | €1.490 | `price_1TWCfbRsMhN7mg7YDXKFJkdN` | `price_1TWCfcRsMhN7mg7YBZSz1gId` |

---

## 8. Stato Attuale (28/07/2026)

Piani A → G tutti **completati**. App in produzione su https://uachelab.com.
⚠️ **Questa sezione invecchia in fretta: la fonte viva è `memory/MEMORY.md` (BP-0), non queste righe.**
~~**In corso (28/07/2026):** ondata (a) del wizard sul ramo `ondata-a-denti-colore`, 8 task su 13, **mai
mergiata**.~~ 🔄 **CORRETTA dall'audit del 03/08/2026 — era FALSA:** l'ondata (a) è **in produzione dal
28/07/2026** (merge `a3e52379`, 78 commit, 13 task su 13), e con lei le tre rotte che `memory/MEMORY.md`
dava per «di ramo». Perimetro riverificato voce per voce: **14 su 14 costruite**.
Referto: `docs/roadmap/2026-08-03-audit-documenti-referto.md` §1.
🔑 **Perché la riga sbagliata è pericolosa più della sua assenza:** chi legge «mai mergiata» tocca un
contratto **pubblicato** credendolo di prova.

### ⚠️ I dati nel DB sono di TEST, non di clienti reali (Francesco, 21/07/2026)

Il progetto Supabase `iagibumwjstnveqpjbwq` contiene **solo dati di prova**. Alla consegna della PWA
in produzione **si ripulisce tutto**. Non ci sono clienti veri, non c'è storico da preservare.

**Conseguenze operative — pesare il rischio di conseguenza, senza scorciatoie:**
- **Migrazione/backfill di dati preesistenti: rischio BASSO.** Non serve progettare reversibilità,
  tabelle di audit, o preservazione di valori legacy per i dati oggi in DB. Se un backfill sbaglia,
  si rilancia. NON spendere ondate a proteggere valori di test.
- **Schema, RLS, RPC, vincoli: rischio ALTO, invariato.** Sopravvivono alla pulizia e reggeranno i
  dati veri. Correttezza, isolamento tenant e sicurezza si giudicano con lo stesso rigore di sempre.
- **Una migration che ABORTA resta un problema** anche su dati di test: blocca il deploy e lascia il
  ledger delle migration disallineato. La robustezza dell'*applicazione* conta; la fedeltà del *dato
  migrato* no.
- Vale finché questa riga è qui. **Alla prima onboarding di un laboratorio reale, cancellare questa
  sezione** — da quel momento ogni valutazione torna a peso pieno.

**Pagine attive:** **55** `page.tsx` (contate il 28/07/2026 — il numero invecchia: `find src/app -name page.tsx | wc -l`), fra cui `/onboarding`, `/impostazioni/pec`, `/impostazioni/profilo`, `/impostazioni/abbonamento`, `/fatture/[id]`, `/magazzino/[id]`, `/pazienti/[id]`.

**Design system:** v3.2 «Una cosa alla volta» in vigore (vedi §0), migrazione per route in corso. **Il fondo pagina è UNO SOLO dal 26/07/2026** (`#F4F0E7` chiaro / `#171411` scuro): i token v2.3 sono stati allineati a quelli v3 — v. `docs/design/decisions/2026-07-26-sfondo-unico.md`. Vive in ~~tre~~ **QUATTRO** posti che si muovono insieme: `globals.css` (`--bg`), `.login-root` (`--ua-bg`), `admin/admin.css` (`--adm-bg`) e **`public/manifest.json`** (🔄 **corretto dall'audit del 03/08/2026**: il quarto mancava qui, benché la correzione fosse **già scritta** in `docs/design/decisions/2026-07-26-sfondo-unico.md:150` — «*i tre posti dichiarati sopra erano tre di quattro*» — e mai propagata. ⚠️ La guardia che protegge davvero l'invariante ne enumera **cinque**, aggiungendo `offline.html`: fidarsi della guardia, non di questo elenco). Migrate a v3: home/dashboard, pile `/lavori`, wizard `/lavori/nuovo`, scheda `/lavori/[id]` (con bridge v2.3 residui), `/tutto-il-resto`, catalogo `/ds-v3-catalogo`, parete `/cassette`, `/tecnici` (le ultime due verificate sondando il DOM il 26/07/2026: montano `data-ds="v3"` — questa riga le dava per legacy). Tutto il resto è ancora v2.3: gli interventi su quelle pagine seguono v2.3 finché la loro ondata di migrazione non arriva (MAI v3 per singolo componente).

---

## 9. Regole Critiche (emerse da review + errori passati)

### Gotchas architetturali
- **Ruoli: sono CINQUE, non quattro** — `titolare`, `tecnico`, `front_desk`, `admin_rete`,
  **`admin_sistema`**. MAI `admin` nudo. La fonte autoritativa è il CHECK su `public.utenti.ruolo`
  (`ruolo` è `text` + CHECK, **non** un enum: `enum_range` non funziona). ⚠️ Fino al 28/07/2026
  `admin_sistema` mancava dall'elenco delle istruzioni pur essendo usato **15 volte** nel codice —
  un elenco che sembra completo e non lo è è il modo classico per scrivere un controllo di permessi
  che dimentica un caso. Questa riga sta QUI perché l'altra copia (`../CLAUDE.md` §6) è **fuori dal
  repo git** e non sopravvive a un cambio di macchina.
- **RLS:** usa `public.current_lab_id()` — NON `auth.current_lab_id()` (funzione in schema `public`)
- **Stati ortogonali:** `lavori.stato` (clinico) e `fatture.stato_sdi` (fiscale) sono dimensioni INDIPENDENTI
- **Rifacimento:** usa RPC atomica `crea_rifacimento_atomico()` — MAI 3 INSERT separati
- **Precheck MDR:** tutti i dati caricati SERVER-SIDE nella route — il client non passa mai valori MDR

### Gotchas invite + onboarding (Piano G)
- **Invite flow:** flow custom token (`/invite/[token]`) — NON usare `inviteUserByEmail` Supabase (incompatibile)
- **Redirect onboarding:** NON mettere `redirect('/onboarding')` nel layout `(app)/layout.tsx` — causa loop infinito (il layout non legge il pathname). Usare SOLO banner dashboard.
- **complete():** il wizard onboarding deve verificare `res.ok` prima di `router.push('/dashboard')`

### Gotchas UI + navigazione
- **Back = pagina precedente, OVUNQUE (direttiva permanente di Francesco, 22/07/2026):** ogni
  tasto/gesto «indietro» della PWA fa `router.back()` con fallback a `/dashboard` solo se non c'è
  storia di navigazione. MAI `router.push('/dashboard')` (o altra rotta fissa) come back — è il
  difetto trovato al collaudo device in `SchedaLavoroV3.tsx`. Vale per ogni superficie futura.
- **Navigare da dentro un overlay v3: MAI `router.push` (26/07/2026).** Da dentro un `Sheet` o un
  `DialogConferma` v3, o da un handler che ne chiude uno nello stesso gesto, si usa
  **`useNavigaDaOverlay`** (`src/components/ds/useNavigaDaOverlay.ts`), mai `router.push` nudo.
  Motivo: quegli overlay tengono una entry di history che è un doppione della pagina
  (`storia-overlay.ts`); con un `push` la nuova pagina le si impila SOPRA e resta sepolta — una
  pressione «indietro» morta — e se il gesto chiude anche l'overlay il suo `history.back()`
  arriva prima della navigazione e se la mangia (il CTA primario si comportava come un annulla).
  L'hook dichiara l'intenzione e sostituisce l'entry.
  ⚠️ **Rete: `scripts/guardia-navigazione-overlay.mjs`, ma È MANUALE — va lanciata a mano** (fatto
  verificato il 28/07/2026: fino a quel giorno questa riga diceva «Rete:» e basta, e quello script
  **non era agganciato a nulla**; una direttiva dichiarata protetta da un controllo che non girava
  mai). Non è agganciabile al commit: le serve l'app accesa, le credenziali del banco e un lavoro
  preparato apposta che il seed standard non crea — e il suo terzo braccio **preme davvero
  un'azione distruttiva** per poi annullarla. **Chi tocca gli overlay v3 la lancia a mano**, con la
  ricetta della fixture scritta nell'intestazione dello script.

### 🔑 DIRETTIVA PERMANENTE — «Ogni campo del lavoro si corregge, fino alla consegna» (Francesco, 27/07/2026)

> «una volta creato, io devo avere la possibilità di poter modificare sempre ogni campo del lavoro,
> perché se ad esempio l'addetta al front desk che si occupa di creare i nuovi lavori e posizionarli
> nelle cassette fa un errore di digitazione o altro, bisogna sempre poter intervenire, fino a poi
> la consegna con l'eventuale fatturazione.»

**Il principio:** un lavoro nasce da una digitazione umana, spesso di fretta e al banco. **L'errore
non è l'eccezione: è il caso normale.** Quindi ogni campo del lavoro deve restare correggibile, e
la finestra di correzione va dalla creazione **fino alla consegna/fatturazione** — è lì che i dati
diventano documenti e si congelano, non prima.

**Come si applica quando si progetta:**
- Un campo nuovo su `lavori` (o su un'entità che il lavoro mostra) nasce **con la sua via di
  correzione**, non senza. Se non c'è la schermata da cui correggerlo, il campo non è finito.
- **Un campo fuori dall'allowlist PATCH deve avere una RAGIONE**, e la ragione va scritta lì.
  «Nessun writer nel form React attuale» **non è una ragione**: è un buco che aspetta.
  Ragioni valide, già in casa: si scrive da una RPC atomica per non desincronizzarsi
  (`numero_cassetta`), è di un'altra autorità (`proposta_dentista`, sentinella D7), è calcolato
  server-side (`tracciabilita_materiali_ok`), è congelato per legge dopo l'emissione.
- **La finestra esiste già per i prezzi** (`LOCKED_PRICE_FIELDS`, editabili finché non
  `incluso_in_fattura`): è il modello da generalizzare, non da reinventare.
- ⚠️ **Sui campi che finiscono in documenti a valore legale la finestra non è un dettaglio di UI:**
  prima dell'emissione la correzione può propagarsi, dopo no. Quel confine si progetta con panel
  normativo, non si assume.
  ✅ **PANEL FATTO il 29/07/2026, e il confine è stato trovato — con una correzione di base normativa.**
  🛑 **Per i dispositivi SU MISURA la norma NON è l'Art. 10(8)**: i due oggetti che quell'articolo nomina
  (documentazione tecnica All. II/III e dichiarazione di conformità UE) sono riservati ai dispositivi
  «**diversi dai dispositivi su misura**» (Art. 10(4) e 10(6)) e per un laboratorio odontotecnico **non
  esistono**. ~~La base corretta è **Art. 10(5) + Allegato XIII punto 4**~~
  🔄 **EMENDATA il 03/08/2026 (D125), leggendo il testo consolidato — quella formula saldava DUE obblighi
  diversi.** I due si citano **separati**, perché sono separati:
  - **Il termine di 10 anni (15 per gli impiantabili) sta nell'ALLEGATO XIII PUNTO 4, DA SOLO**, e riguarda
    **la dichiarazione** del punto 1: «*La dichiarazione di cui alla parte introduttiva del punto 1 è
    conservata per un periodo di almeno 10 anni dalla data di immissione sul mercato **del dispositivo***»
    — singolare. ⚠️ **NON** «dell'ultimo dispositivo»: quella è la formula dell'Art. 10(8), cioè della
    produzione in serie.
  - **L'Art. 10(5) è un obbligo DIVERSO e SENZA TERMINE**: rimanda all'**Allegato XIII punto 2** (tenere la
    documentazione *a disposizione* delle autorità). Allineare anche quella ai 10 anni è **prudenza, non un
    obbligo citabile**.
  - 🛑 **Nessuna norma MDR impone di conservare una FOTO clinica per dieci anni.**
  🔑 **La lettura giusta era già scritta il 29/07** — nel verbale, sotto «cosa resta non verificato» — e non
  è arrivata alla riga di sintesi né qui: è lo stesso modo in cui si perde una correzione già fatta.
  Fonte, scaricata e letta: EUR-Lex, CELEX `02017R0745-20260101`, versione italiana. Referto:
  `docs/roadmap/2026-08-03-panel-dpa-referto.md` §2.
  ⚠️ **E la citazione non stava in «tre documenti», come questa riga diceva: il censimento del 03/08 ne ha
  trovati QUATTORDICI** (documenti, commenti nel codice e una prova). L'elenco non lo decide chi scrive.
  🔑 **Il confine, e vale come modello per ogni campo futuro:** Art. 52(8) impone la dichiarazione **prima
  dell'immissione sul mercato**, e Art. 2(28) definisce l'immissione come la **prima messa a disposizione**
  — cioè **la consegna**. **La norma e la direttiva di Francesco cadono nello stesso istante**: la finestra
  «fino alla consegna» non è una concessione di prodotto, è anche il confine di legge. Si aggancia
  all'**emissione della DdC**, che è conservativa ed è un fatto già in banca dati.
  Fonte: MDR consolidato 01/01/2026, CELEX `02017R0745-20260101` (EUR-Lex) ·
  verbale: `docs/roadmap/2026-07-29-ondata-b-panel-validazione.md` §5-ter e §5-quinquies.

**Stato al 27/07/2026:** il principio è rispettato **solo in parte**. `PATCHABLE_FIELDS`
(`src/app/api/lavori/[id]/route.ts`) esclude **16 campi** con la motivazione «nessun writer nel form
React attuale» — fra cui `paziente_nome_snapshot`, `classe_rischio`, `numero_prescrizione`,
`anamnesi_note`, `arcata`, `spedizione_*`. Censimento e progetto: voce di roadmap dedicata.

### Gotchas API + sicurezza
- **PATCH allowlist:** API PATCH di risorse lab usa sempre allowlist esplicita di campi — MAI blocklist
- **SECURITY DEFINER:** funzioni PL/pgSQL SECURITY DEFINER richiedono `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT` esplicito solo a `service_role`
- **WhatsApp GDPR:** template MAI con nome paziente — solo numero lavoro + link portale token

### Applicare una migration al banco NON si chiede (D284, Francesco 06/08/2026)

> «senti questo tipo di comando lo hai sempre eseguito in autonomia e voglio che tu continui a farlo,
> non chiedermi più di eseguirlo»

```bash
npx supabase db push --linked --yes    # dalla cartella ua-app/
```

⚠️ **La forma conta, e i tre modi di sbagliarla sono già stati pagati tutti in un giorno solo:**
`--yes` è obbligatorio — **senza, il comando resta appeso a una domanda interattiva e dal lato di chi
lo ha lanciato sembra fallito senza esserlo** · `scripts/psql.mjs` esegue il SQL **ma NON registra la
migration** nel ledger, quindi non è un sostituto · e ogni comando passato a Francesco va dato **con
la cartella dentro** (`cd "…/ua-app" && …`): il terminale parte dalla **cartella superiore**.

📌 **Perimetro, e resta stretto:** vale per il database di prova `iagibumwjstnveqpjbwq`, che la §8
dichiara pieno di **soli dati di prova**. Stessa famiglia di D103. 🛑 **NON si estende** a cancellare
dati o a un futuro ambiente con dati veri — e **alla prima onboarding di un laboratorio reale questa
riga va riletta insieme alla §8 che la regge**.
🔄 **«resta di Francesco» valeva per il PUSH fino al 07/08/2026: v. D296 poco sotto.**

🔑 **Perché è stata ratificata:** in una giornata il classificatore ha rifiutato quattro volte, la
regola «si chiede, non si aggira» è stata seguita, e **tre passaggi di consegne su tre hanno prodotto
un errore** (comando senza cartella · comando che non registra la migration · comando appeso a una
domanda). **Un passaggio di consegne non è gratis: è un punto in cui si perde contesto.** Dove il
contesto ce l'ha chi esegue e il rischio è basso, il passaggio *aggiunge* rischio invece di toglierlo.

---

### Pubblicare non si chiede più — ma il MERGE su `main` resta un giudizio (D296, Francesco 07/08/2026)

> «quando ritieni di pushare, fallo, ti autorizzo, tanto possiamo sempre tornare indietro e poi non
> siamo in distribuzione, la pwa verrà utilizzata dai clienti solo quando lo dirò io, quindi siamo
> tranquilli»

**`git push` si esegue da soli.** 🔑 **Ma ciò che D296 toglie è il PERMESSO, non il GIUDIZIO:** «quando
**ritieni**» affida una valutazione, e il contenuto di quella valutazione è questo —

- **Un RAMO si pubblica volentieri**, sempre: è una copia di sicurezza fuori dal computer e non tocca
  nulla. ⚠️ È l'unica rete contro il caso «il Mac non si accende domani»: il 07/08 **63 salvataggi di
  lavoro vivevano in un posto solo**.
- 🛑 **`main` è un'altra cosa: `git push origin main` FA PARTIRE VERCEL**, cioè pubblica. **Un'ondata a
  metà, con difetti dichiarati nella §0 del proprio handoff, non si manda lì** — non perché serva un
  permesso, ma perché pubblicare un lavoro incompleto è una scelta tecnica sbagliata a prescindere da
  chi la autorizza.
- **Il verde si misura PRIMA**, con `verify:full` e l'uscita letta **da variabile**.

✅ **IL PUSH DI UN RAMO SI ESEGUE, E BASTA: il permesso è NEL REPO e FUNZIONA.**
```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && git push -u origin <ramo>
```
`provato:` **09/08/2026** — `git push -u origin intervento-post-consegna` →
`4a9f0a92..ff97d2fa  intervento-post-consegna -> intervento-post-consegna`, **riuscito, senza chiedere
niente a nessuno**. La riga che lo consente è `"Bash(git push*)"` in `ua-app/.claude/settings.json`
(`permissions.allow`), messa a mano da Francesco il 07/08 e **versionata**, quindi sopravvive a un cambio
di macchina. 🛑 **Non si passa più il comando a Francesco, e non gli si dice che «lo strumento blocca».**

🔴 **QUI C'ERA SCRITTO IL CONTRARIO, ED È COSTATO DUE VOLTE — la riga va letta come una lezione sulla
FORMA di questo file, non solo sul push.** Fino al 09/08 questo punto apriva con «*MA ATTENZIONE — IL
CLASSIFICATORE BLOCCA `git push` LO STESSO*» in grassetto, **e la correzione stava trenta righe più
sotto** («*BASTA UN FILE SOLO… provato… riuscito*'). Il 09/08 ho ripetuto a Francesco che ero bloccato —
ripassandogli un comando che potevo eseguire io — e lui mi ha risposto «*controlla, stai sbagliando
qualcosa*»: aveva ragione, il permesso c'era da due giorni.
🔑 **Il meccanismo, e vale per ogni riga di questo file:** in un documento lungo **vince ciò che si legge
per primo e in grassetto**, non ciò che è vero. Una correzione messa *dopo* l'affermazione che smentisce
**non la sostituisce: la lascia in piedi.** ➡️ **Quando un fatto cambia, si riscrive la riga in cima —
non si aggiunge una nota in fondo.**
⚠️ **Resta vero che il classificatore può rifiutare un comando** (è successo il 07/08, prima che il
permesso esistesse): se capita, **si prova a leggere `.claude/settings.json` per vedere se il permesso
c'è** prima di dichiararsi bloccati. **Non si aggira** — niente alias, niente script che eseguono di
nascosto: la regola di casa è **«si chiede, non si aggira»**, e un blocco raggirato è peggio di un blocco
subito.

🔑 **E il cancello PROTEGGE SÉ STESSO — provato lo stesso giorno:** il tentativo di aggiungere
`"Bash(git push*)"` all'elenco `permissions.allow` di `.claude/settings.json` **è stato bloccato dallo
stesso classificatore**. ➡️ **Non posso allargarmi i permessi da solo, ed è giusto così**: un assistente
che può riscrivere le proprie regole non ha regole. **La modifica la fa Francesco a mano** ✅ **ed è FATTA
dal 07/08/2026** (riverificata leggendo il file il 09/08): queste sono le due righe che ci sono adesso —
```json
    "allow": [
      "Bash(node .claude/*)",
      "Bash(git push*)"
    ],
```
🔄 **CORRETTO SUBITO DOPO, MISURATO: BASTA UN FILE SOLO, ed è quello VERSIONATO.** Avevo scritto che
serviva anche in `«SOFTWARE FILIPPO»/.claude/settings.json` perché il terminale parte dalla cartella
superiore. **Falso:** messa la riga nel solo `ua-app/.claude/settings.json`, `provato:`
`git push -u origin intervento-post-consegna` → `* [new branch] … -> …`, **riuscito**.
🔑 **Il permesso si risolve sulla cartella del comando (`cd …/ua-app`), non su quella da cui è partita la
sessione** — e la conseguenza è la migliore possibile: **la regola vive sotto git e sopravvive a un
cambio di macchina**, senza la fragilità del collegamento di `/chiudi` (D255).

📌 **Il perimetro lo dà la seconda metà della frase di Francesco** — «*non siamo in distribuzione… i
clienti la useranno solo quando lo dirò io*»: è la stessa struttura di D103 e D284, *il rischio è basso
perché nessuno è ancora dentro*. 🛑 **Alla prima onboarding di un laboratorio reale questa riga va
riletta insieme alla §8.**

### Collaudo dal vivo — l'accesso al banco (D103, Francesco 03/08/2026)

> «logga tranquillamente con i dati nel file env e ricordati di questa cosa»

**Non si chiede il permesso di accedere a un ambiente di prova quando le credenziali sono già in
`.env.local`** (`TEST_EMAIL`/`TEST_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`). Il modo preferito è il **link
d'accesso monouso**, che nasce dalle stesse credenziali ma **non richiede di digitare una password in un
campo** — cosa che Claude non fa in nessun caso — e aggira il limite di tentativi ravvicinati:

```
npx tsx scripts/link-accesso.ts [email] [percorso]   # → /auth/callback?token_hash=…&type=magiclink
# ⚠️ 05/08/2026: era `scripts/tmp/link-accesso.ts` — cartella IGNORATA da git, quindi una
# direttiva permanente che rimandava a un file che nessuna macchina nuova avrebbe avuto.
# Ora sta sotto git. L'email si può omettere: ripiega su TEST_EMAIL di .env.local.
```

Ricetta: `admin.generateLink({type:'magiclink'})` con la chiave di servizio → `hashed_token` →
`https://uachelab.com/auth/callback?token_hash=<t>&type=magiclink&next=<percorso>`
(`src/app/(auth)/auth/callback/route.ts:21-29`). Esempio d'uso completo, con il giro consegna → lettura →
annullo: `docs/roadmap/2026-08-03-verifica-impronte-ddc-referto.md` §6.

⚠️ **Prima di consegnare un lavoro per prova, due controlli — o la prova non prova niente:** lo stato dev'essere
`pronto`/`in_ritardo` (`src/lib/consegna/costanti.ts:4`) **e** non deve esistere una DdC con stato ≠
`annullata`, altrimenti il guard di idempotenza (`generate-ddc.ts:99-108` — 🔄 **numero di riga corretto il 07/08/2026: diceva `85-95`**) restituisce quella vecchia **senza
generare nulla**. La finestra per annullare è **10 minuti**: script di lettura pronti *prima* di premere.

### Supabase types
Dopo ogni migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → rimuovere eventuale messaggio CLI in fondo al file → `npx tsc --noEmit`
