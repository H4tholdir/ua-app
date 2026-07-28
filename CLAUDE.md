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
FASE 9b → GATE ESTETICO L2 (🟡 obbligatorio fine ondata con UI, PRIMA del merge):
            micro-audit UI/UX della SOLA superficie dell'ondata contro
            docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md (12 sezioni ×
            390/768/1280 × light/dark); ogni ❌ risolto o deferito con motivo;
            screenshot before/after in docs/design/screenshots/<data>-<sup>/.
            Framework: docs/design/audit-ui-ux/README.md (Livello 2).
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
- MAI mergere una superficie UI nuova/modificata senza il GATE ESTETICO L2 (FASE 9b); ogni piano `writing-plans` di un'ondata con UI DEVE includerlo come step finale
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

## 0D. Come parlare con Francesco (ratificata 23/07/2026 — OGNI messaggio in chat)

Linguaggio piano, zero tecnicismi non spiegati: ogni concetto tecnico si racconta prima con
parole comuni o un'analogia concreta, poi (se serve) col suo nome tecnico. Struttura a racconto
(problema → perché → cosa ho fatto → cosa cambia per te), mai elenchi di sigle/hash/file come
frase principale. Dettaglio tecnico solo in un breve blocco finale dichiarato. Il registro
tecnico pieno resta in commit, codice, docs e diagnosi. Testo completo della direttiva:
`../CLAUDE.md` §7 («Come parlare con Francesco»).

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

- **DdC:** Art. 52(8) + Allegato XIII MDR (NON Allegato IV)
- **FatturaPA:** natura **N4**, bollo €2 se > €77,47
- **EUDAMED:** lab custom-made = **ESENTI**
- **ITCA:** OBBLIGATORIO (campo `laboratori.codice_itca`)

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
**In corso (28/07/2026):** ondata (a) del wizard «Nuovo lavoro» sul ramo `ondata-a-denti-colore`,
8 task su 13, **mai mergiata** — punto di ripresa in `docs/roadmap/2026-07-28-ondata-a-esecuzione-handoff.md`.

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

**Design system:** v3.2 «Una cosa alla volta» in vigore (vedi §0), migrazione per route in corso. **Il fondo pagina è UNO SOLO dal 26/07/2026** (`#F4F0E7` chiaro / `#171411` scuro): i token v2.3 sono stati allineati a quelli v3 — v. `docs/design/decisions/2026-07-26-sfondo-unico.md`. Vive in tre posti che si muovono insieme: `globals.css` (`--bg`), `.login-root` (`--ua-bg`), `admin/admin.css` (`--adm-bg`). Migrate a v3: home/dashboard, pile `/lavori`, wizard `/lavori/nuovo`, scheda `/lavori/[id]` (con bridge v2.3 residui), `/tutto-il-resto`, catalogo `/ds-v3-catalogo`, parete `/cassette`, `/tecnici` (le ultime due verificate sondando il DOM il 26/07/2026: montano `data-ds="v3"` — questa riga le dava per legacy). Tutto il resto è ancora v2.3: gli interventi su quelle pagine seguono v2.3 finché la loro ondata di migrazione non arriva (MAI v3 per singolo componente).

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
  normativo (MDR Art. 10(8) vs Art. 16 GDPR), non si assume.

**Stato al 27/07/2026:** il principio è rispettato **solo in parte**. `PATCHABLE_FIELDS`
(`src/app/api/lavori/[id]/route.ts`) esclude **16 campi** con la motivazione «nessun writer nel form
React attuale» — fra cui `paziente_nome_snapshot`, `classe_rischio`, `numero_prescrizione`,
`anamnesi_note`, `arcata`, `spedizione_*`. Censimento e progetto: voce di roadmap dedicata.

### Gotchas API + sicurezza
- **PATCH allowlist:** API PATCH di risorse lab usa sempre allowlist esplicita di campi — MAI blocklist
- **SECURITY DEFINER:** funzioni PL/pgSQL SECURITY DEFINER richiedono `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT` esplicito solo a `service_role`
- **WhatsApp GDPR:** template MAI con nome paziente — solo numero lavoro + link portale token

### Supabase types
Dopo ogni migration: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → rimuovere eventuale messaggio CLI in fondo al file → `npx tsc --noEmit`
