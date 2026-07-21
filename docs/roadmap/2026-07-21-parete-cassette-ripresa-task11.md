# Handoff — Parete delle Cassette: ripresa dal Task 11
**Data:** 21/07/2026 · **Per:** sessione NUOVA a contesto pulito
**Stato:** Task 1→10 **COMPLETI**. **4 migration applicate** al DB live. Gate 1 superato.

## Dove siamo in 30 secondi

Worktree `.claude/worktrees/parete-cassette`, branch `worktree-parete-cassette`.
**34 commit**, `main` @ `4853458` come base. **Niente è stato mergiato né pushato.**
Suite: **2543 passed / 19 skipped**, `tsc --noEmit` exit 0, `check-ds-compliance.sh` verde,
`next build` OK.

**Restano 9 task: 11 → 19.** Due gate 🛑: mockup delle 4 miniature nuove (Task 18) e merge finale.

## Come ripartire

1. **Leggi il ledger:** `.superpowers/sdd/progress.md` (nel worktree, git-ignored). È la mappa di
   recupero: se il contesto si perde, fidati di quello e di `git log`, **non della memoria**.
2. **Leggi il blocco «⚠️ STATO AL 21/07»** in testa a
   `docs/superpowers/plans/2026-07-21-parete-cassette.md` — ora ha **6 punti**, non 5.
   Il piano è già corretto: ogni task impattato porta un blocco «CORREZIONI 21/07» che il
   `task-brief` estrae da solo.
3. **Skill:** `superpowers:subagent-driven-development`. Subagent fresco per task + review per task.
   **Riparti dal Task 11.** Base per il primo review-package: l'HEAD corrente.
4. `npm install` è già fatto nel worktree; `.env.local` e `.env.test` sono già copiati.

---

## I vincoli che valgono per OGNI task rimanente

Sono tutti **pagati con difetti veri** trovati in questa sessione, non teoria.

1. **Test in `tests/unit/`, MAI in `src/**/__tests__/`** (D-O1). `vitest.config.ts` globba solo
   `tests/unit/**` e `tests/integration/**`: un test altrove dà «No test files found», cioè un
   **RED finto**. `vitest.config.ts` **non si tocca**. I path dei *sorgenti* restano quelli del piano.
   Convenzione reale per le route: `tests/unit/<risorsa>-route.test.ts`.

2. **`postgrest-js` NON lancia sugli errori del database.** Ritorna `{data: null, error}`. Un
   `try/catch` da solo non intercetta nulla: va destrutturato **`error`** e va controllato **`esito`**.
   Il piano contiene questo difetto **in tre task** (7, 8, 9) — tutti e tre corretti.

3. **Il builder di postgrest è un THENABLE PIGRO:** la richiesta parte dentro `then()`.
   `void svc.rpc(...)` **non spedisce nulla** (0 richieste HTTP, misurato). E un retry che riusa una
   promise già creata invece di ri-invocare una thunk è **teatro**.

4. **`callRpcWithRetry`** (`src/lib/supabase/rpc-retry.ts`) esiste: **importalo, non riscriverlo**.
   Accetta una **thunk ri-invocabile**: `await callRpcWithRetry(() => svc.rpc(...))`.

5. **`p_lab` sempre da `getFreshLabContext()` server-side, `p_user` sempre da `context.userId`.**
   Mai dal body. È l'invariante per cui le RPC esistono al posto di un GRANT.

6. **Le tabelle della Parete sono in SOLA LETTURA anche per `service_role`.** Il service client
   bypassa **RLS**, **non** i GRANT di tabella: un `.insert()`/`.update()` diretto dà `42501`.
   **Ogni scrittura passa da una RPC.** Se leggi un task che descrive una scrittura diretta su
   `cassette`, quel testo è vecchio: **fermati e segnalalo.**

7. **`cassette_lavori` è append-only:** il trigger rifiuta ogni DELETE. Reset di fixture con
   `.delete()` fallisce → `public.cassette_purge_lab(labId)`.

8. **L'albero non può MAI restare rosso su `tsc`.** `.husky/pre-commit` esegue lint-staged +
   `tsc --noEmit` **sull'intero progetto** + `check-ds-compliance.sh`, a **ogni** commit. Ogni task
   che cambia una firma condivisa deve **correggere o colmare tutti i consumatori nello stesso task**.
   Niente `--no-verify`.

9. **Il container di collaudo per le migration deve essere `postgres:17-alpine`.** Il live è
   **PG 17.6**; un collaudo su PG 15 ha già prodotto una divergenza reale (`relacl` del proprietario
   `arwdDxtm` con la `m` = `MAINTAIN` di PG17, contro `arwdDxt`).

10. **Un log a livello `error` che si accende SEMPRE smette di essere un segnale.** `console.warn`
    per l'anomalo-ma-spiegabile, `console.error` per il difetto vero; messaggi che **descrivono**
    invece di accusare.

11. **Un esito non gestito che cade nel ramo di successo è la direzione di guasto peggiore.**
    Ogni `switch` sugli esiti chiude con un 500 esplicito, mai con un 200 implicito.

12. **Le funzioni `server-only` SONO testabili:** `tests/setup.ts:5` ha già
    `vi.mock('server-only', () => ({}))` e `tests/unit/pile-home.test.ts` testa una funzione analoga
    con `createChain`. **Nessuno rinvii un test citando `server-only` come impedimento.**

---

## Che cos'è cambiato rispetto all'handoff precedente

### Una premessa FALSA del piano ha bloccato il Task 4, e ne è nata una quarta migration
Il piano affermava che il service client «bypassa RLS **e i REVOKE**». È falso. `service_role` ha
**solo SELECT** su `cassette` (`20260721090000:148-150`), verificato empiricamente (`42501`).
Nessuna delle 8 RPC creava una cassetta **vuota** o cambiava il **solo colore**.
→ Panel advisor 3× **unanime**, ratifica di Francesco, **migration `20260721090300`** con
`cassetta_crea_atomica` + `cassetta_imposta_colore_atomica`, collaudata (70 + 43 prove) e
**applicata al DB live**. Il piano è stato corretto nei due punti dove affermava il falso.
Sintesi del panel: `.superpowers/sdd/panel-task4-sintesi.md`.

### Tre fatti osservati sul DB VERO, non deducibili da un collaudo in container
1. **Tutti gli esiti delle RPC tornano HTTP 200:** la route mappa il **payload**, mai lo status.
2. **La `RAISE` del colore torna 400 / `P0001`:** `normalizzaColore()` **deve** fare `.toUpperCase()`
   sull'hex prima di chiamare.
3. **`anon` riceve 401**, non 403 né 404.

### Due decisioni ratificate da Francesco in questa sessione
- **`PATCH /api/cassette/[id]` accetta esattamente UN campo per chiamata** (`{nome}` XOR `{colore}`;
  entrambi o nessuno → 422). Una chiamata = una RPC, il passo doppio non atomico sparisce.
- **`admin_sistema` (con `laboratorio_id` NULL) riceve 403**, non un 200 silenzioso: un 200
  dichiarerebbe salvata una preferenza che non è stata scritta. Piano corretto di conseguenza.

### Un fallthrough misurato, che è un requisito per chi tocca il POST
`cassetta_crea_atomica` genera il nome automatico `C{n}` con 5 giri interni. Il fallthrough
`nome_occupato` **è raggiungibile**: 0/420 fino a 4 sessioni concorrenti, **0,94% a 8, 3,0% a 16**.
La route **ritenta una volta** quando `body.nome` era assente — un 409 su un nome che l'utente non ha
digitato sarebbe una bugia. **`callRpcWithRetry` NON copre questo caso** (filtra `40P01`, mentre
`nome_occupato` arriva con `error: null`): serve una ritenta **a livello di payload**, già scritta nel
piano come codice.

---

## Vincoli di sequenza aperti — NON mergiare prima di averli chiusi

- **`ConfermaCassettaSheet` e `TabAccettazione` fanno ancora `PATCH numero_cassetta`, che ora è un
  no-op silenzioso** (200, nessuna scrittura): il campo è uscito da `PATCHABLE_FIELDS`.
  **Si chiude nel Task 16.** Da aggiornare lì anche `tests/unit/conferma-cassetta-sheet.test.tsx:26`,
  che fissa verde un payload che il server ignora.
- **Ponte transitorio da rimuovere:** `.map(c => c.nome)` a `src/app/(app)/lavori/page.tsx:42`,
  di proprietà del **Task 16 Step 2**, che deve portare `{id,nome}` fino a `ConfermaCassettaSheet`
  attraverso `PilaAperta`/`PilaSplit`.
- **Il seed E2E (Task 19 Step 1) va ANTICIPATO prima della QA di FASE 9:** `numero_cassetta` è NULL su
  tutti i 288 lavori, quindi senza seed **ogni superficie della Parete è vuota**.

## Note per i task imminenti

- **Task 11** (pagina `/cassette`): `getParete` è pronta e non ha ancora consumatori. Può passare
  `lavoro={c.lavoro}` a `Cassetta` **senza rimapping** (shape verificata). Due cose da non
  dimenticare: se non passa `onLongPressSheet`, **il long-press sparisce in silenzio**; e lo stato
  `spenta` oggi **non dice nulla a chi non vede** — l'annuncio dei risultati della ricerca va fatto a
  livello di parete.
- **Task 16:** chiude i due vincoli di sequenza sopra. La scelta del ramo in
  `POST /api/lavori/[id]/cassetta` è **per presenza di chiave**: `{cassetta_id: null}` è **422**, non
  liberazione. **Per liberare il client deve inviare `null` o `{}`.**
- **Task 18** è un gate 🛑: mockup delle 4 miniature nuove in `docs/design/mockups/` (MAI /tmp) +
  screenshot light/dark → **approvazione di Francesco** prima del React. Fino ad allora `MiniaturaLavoro`
  rende la `generica` per quelle quattro, con commento che rimanda al Task 18.

## Da portare a Francesco (aperti, non decisi)

- **Gap `FrameConsegnato` (Task 8):** chi annulla la consegna dal frame a schermo intero non vede la
  riga «La {nome} nel frattempo è occupata» — quel componente si chiude sincronicamente. La
  riassegnazione lato server avviene comunque. Estendere significherebbe toccare un flusso DdC:
  **più rischio, non meno**. Raccomandazione: lasciare così.
- **D-11** va aperta subito dopo l'ondata: fix *di classe* per la purga per-tenant, con panel proprio,
  che copra anche le **3 tabelle già orfane oggi** in `admin_delete_laboratorio` — `fatture_outbox`,
  `fatture_sdi_eventi`, `credito_clienti_movimenti`. **Non è un difetto di questa ondata: è
  preesistente e verificato.**

## Voci per la QA di FASE 9 / il GATE ESTETICO L2

- La riga «La {nome} nel frattempo è occupata» è **transitoria**: `router.refresh()` parte subito dopo
  e il banner esiste solo finché il lavoro è consegnato. Verificare **leggibilità reale** e annuncio
  `role="status"`, non la presenza nel DOM.
- **Non verificato nel browser** (Task 10): la targa con `max-width: 6ch` dentro colonne strette, e la
  resa **dark** della shadow flat — lette nel CSS, mai viste.

## Due cose da ricordare al merge

- I documenti della Parete (piano, spec, ratifiche, handoff) sono **tracciati sul branch** ma esistono
  anche come **file non tracciati nel main tree**: prima del merge vanno rimossi da lì, altrimenti git
  rifiuta di sovrascriverli. **Il piano è già stato risincronizzato** main tree ← branch.
- La review finale whole-branch ha una **coda di Minor deferiti** raccolta nel ledger, sezione per
  sezione: puntarla lì, non ricominciare da capo.
