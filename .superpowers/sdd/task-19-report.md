# Task 19 — Report Step 1 (seed E2E) + Step 2 (emendamenti documentali)

**Autore:** implementer Task 19, Step 1-2 (lo Step 3 / FASE 7 finale è di un'altra sessione, dopo il Task 18).
**Worktree:** `parete-cassette` (branch `worktree-parete-cassette`).
**Data:** 21-22/07/2026.

---

## Step 1 — Seed E2E delle cassette (`scripts/seed-e2e.ts`)

### Meccanica (i vincoli duri, pagati con codice)

- **`cassette_purge_lab` NON è eseguibile da `service_role`** (EXECUTE revocata anche a lui in
  `20260721090100:102`). Il seed la chiama via **connessione diretta come ruolo `postgres`** (owner),
  usando `pg` (già in `package.json`) e `SUPABASE_DB_URL` (pooler, `postgres.<ref>`). Query con il
  UUID come **letterale** (non parametrizzata) → nessun protocollo esteso sul transaction pooler
  (6543), zero superficie d'iniezione (il lab è una costante hardcoded, non input).
- **`cassette_lavori` è append-only:** il reset passa da `cassette_purge_lab` (unica via — un
  `.delete()` darebbe `42501`/trigger). La purga è scoped al solo lab E2E `…-0001`.
- **Tutte le scritture della Parete via RPC** (queste SONO concesse a `service_role`), ognuna
  controllata su `esito === 'ok'` da un helper `callRpc` che **solleva** su qualunque esito ≠ ok:
  - `cassetta_crea_atomica(p_lab, p_nome, p_colore)` × 6 (cattura `cassetta.id` per nome);
  - `cassetta_assegna_atomica(p_lab, p_lavoro, p_cassetta_id)` × 3 (2 occupanti + 1 per lo storico);
  - `cassetta_libera_atomica(p_lab, p_lavoro, p_motivo:'consegna')` × 1 (chiude lo storico).
- **Env:** aggiunto un load additivo di `.env.local` (nel repo esiste solo `.env.local`, non `.env`;
  `config()` non sovrascrive le variabili già presenti) — ora `npx tsx scripts/seed-e2e.ts` e
  `npm run seed:e2e` funzionano come documenta CLAUDE.md §2.

### Fixture creata (lab E2E `00000000-0000-0000-0000-000000000001`, MAI lab Filippo)

- **6 cassette**, colori misti incluso un hex custom (MAIUSCOLO, come impone il CHECK `^#[0-9A-F]{6}$`):
  `C1` azzurra · `C2` rossa · `C3` verde · `C4` grigia · `C5` **`#7C3AED`** · `Banco Ciro` blu.
- **2 occupate** da lavori aperti della fixture (`in_lavorazione`): `C1 ← E2E-CAS-001`
  (`protesi_fissa`→corona), `C3 ← E2E-CAS-002` (`protesi_mobile`→totale). Lavori id `…-0030/0031`.
- **1 riga storico chiusa** (`liberato_per='consegna'`) su **«Banco Ciro»**, che resta **libera**
  (precondizione perché lo scenario annullo→`riassegna_post_annullo` dia `riassegnata` e non
  `occupata_nel_frattempo`). Lavoro `…-0032`, portato a `consegnato` dopo la liberazione.
- Idempotenza: purge scoped lab E2E → ricrea. I 3 lavori sono upsert su id fisso con
  `stato='in_lavorazione'` + `numero_cassetta:null`, così le RPC ripartono da pulito a ogni run.

### Esecuzioni REALI (contro il DB live — prova di idempotenza)

**Run 1** (il lab aveva 2 cassette residue da sessioni precedenti):
```
🧹  Purga cassette lab E2E → {"cassette":2,"cassette_lavori":0,"cassette_backfill_audit":0}
    ✅  C1..C5 + Banco Ciro creati (6 id nuovi)
    ✅  C1 ← E2E-CAS-001 · C3 ← E2E-CAS-002
    ✅  «Banco Ciro» libera · storico consegna · lavoro consegnato
📊  End-state: cassette vive=6 · occupate=2 · storico consegna=1
✅  Parete delle Cassette coerente (6 vive · 2 occupate · 1 storico consegna)
```

**Run 2** (idempotenza — purga esattamente ciò che Run 1 aveva creato, ricostruisce identico):
```
🧹  Purga cassette lab E2E → {"cassette":6,"cassette_lavori":3,"cassette_backfill_audit":0}
    ✅  C1..C5 + Banco Ciro creati (6 id nuovi)
    ✅  C1 ← E2E-CAS-001 · C3 ← E2E-CAS-002
    ✅  «Banco Ciro» libera · storico consegna · lavoro consegnato
📊  End-state: cassette vive=6 · occupate=2 · storico consegna=1
✅  Parete delle Cassette coerente (6 vive · 2 occupate · 1 storico consegna)
```

`cassette_lavori:3` alla Run 2 = 2 righe vive occupanti + 1 riga chiusa (consegna): esattamente
ciò che Run 1 aveva scritto. **End-state identico** (6/2/1) su entrambe le esecuzioni — l'idempotenza
è provata come «stesso stato finale», non solo «girato due volte senza errore». Gli UUID delle
cassette cambiano fra i run (li assegna `gen_random_uuid` nella RPC): i test E2E interrogano per
lab + nome/occupazione, non per id fisso.

---

## Step 2 — Emendamenti documentali (ADDITIVI)

### A. Spec di design `docs/superpowers/specs/2026-07-21-parete-cassette-design.md`

| Punto spec | Cosa | Fonte |
|---|---|---|
| §4 testata | Da «una migration» a **4 file dello stesso deploy** (090000 DDL+RPC · 090100 purga/admin_delete · 090200 backfill+audit · 090300 crea/colore additiva) | R-1 |
| §3 «Rollback» | Precisazione: la targa del perdente non sparisce, va in `cassette_backfill_audit` (reversibile) | R-2 |
| §2 + §9.2 | La nota «due fonti» sui consegnati pre-cutoff **DECADE**: `numero_cassetta` era NULL ovunque → «Cerca» globale ha una sola fonte, lo storico | CORREZIONI §3 |
| §4.2 | Il DELETE non è più vietato senza condizioni: **deroga di purga** transaction-local; + nota «mai concatenare due RPC della Parete nella stessa transazione» + retry 40P01 | R-3, CORREZIONI |
| §4.3 tabella | Completate le righe con gli esiti reali: `libera`+`motivo_non_valido`; `rinomina` 4 esiti; `elimina`+`cassetta_non_trovata`; `assegna` auto-riparazione **condizionale** (R-4.1); **nuova riga** `cassetta_trasferisci_rifacimento` (4 esiti); firma **`utente_set_nav_pref` a 4 arg** (p_lab) + no-op silenzioso; nota sulle due RPC di 090300 | audit §6, R-4.1/R-4.3 |
| §4.4 | Migration separata `090200`; troncamento su **entrambi i lati** del join; **statement 3** (risync denorm vincitore); **audit** `cassette_backfill_audit`; targhe di soli spazi non toccate; regex `^[Cc][0-9]+$` + cast `::numeric`; seed via `cassette_purge_lab` | R-1/R-2, audit §6 |
| §4.5 | `REVOKE ALL` + `GRANT SELECT` esplicito (non `REVOKE INSERT,UPDATE,DELETE`); `service_role` nel REVOKE; terzo oggetto `cassette_backfill_audit` (RLS senza policy) | R-4.4 |
| §4.6 (nuova) | `cassette_purge_lab` + deroga + aggancio in `admin_delete_laboratorio` prima di `DELETE FROM lavori`; EXECUTE revocata a service_role → seed via connessione owner; rimando a D-11 | R-3 |
| §5 lettura auto-riparante | Motivo **condizionale** (non fisso `'consegna'`) | R-4.1 |
| §5.1 | Ricerca **«globale»** (ratifica 22/07): pagliaio esteso a nome ∥ n. ∥ dentista ∥ paziente ∥ descrizione ∥ etichetta tipo ∥ colore; limite noto del hex custom (rumore additivo, mai mancato match) | ratifica 22/07 |
| §5.4 | Semantica drag riallineata a `.superpowers/sdd/ricerca-drag-touch.md`: niente HTML5 DnD; soglia 8px riqualificata per pointerType; `touchmove` non passivo con `preventDefault` a drag attivo; snapshot al lift + riconciliazione al drop + una sola POST | ricerca-drag-touch §1-2/§8 |
| §7 API preferenza | Firma a 4 arg: la route passa `p_user` **e** `p_lab` (server-side) | R-4.3 |
| §9.4 | Rimando alla nuova riga §4.3; pre-check anti-sfratto + validazione stato del nuovo, fail-soft loggati | audit §6 |
| §12 | Deroga a11y **tastiera** (riordino + sheet occupata) **DEFERITA** fuori ondata; promessa riformulata; mockup agli atti | ratifica 22/07 |
| §13 (lista) | Aggiornati i riferimenti a ciò che è stato realmente inciso in spec v3 (§7.20, §8.3.7, rinumerazione NavDesk) | coerenza |
| §15 | Seed via `cassette_purge_lab`/connessione owner; trigger guard **5 casi** (+ deroga purga); test purga tenant + audit backfill | audit §6, R-2/R-3 |

### B. Spec DS v3 `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (ADDITIVI, coerenti col codice reale)

- **§5.32** — aggiunta la **variante «stanze» `ProgressDotsStanze`** (tablist, roving tabindex, frecce, pallino attivo `--ink`, hit-area 44) — letto `ProgressDots.tsx`.
- **§5.35 `Cassetta`** (nuova) — anatomia, 6 facce fisse + hex custom (`color-mix`), regola luminanza `targaScura` > 0.55, stati libera/accesa/spenta, **semantica gesti pointer-based** (tap onClick per AT, hold 300ms, soglia 8px per pointerType, invariante «dal sollevamento non insegue più nulla», `draggable=false`), dark flat — letto `Cassetta.tsx`.
- **§5.36 `MiniaturaLavoro`** (nuova) — palette materica `--mat-*`, 6 simboli ratificati 1:1, mappa a 3 livelli; le **4 miniature nuove (`allineatore`/`mascherina`/`riparazione`/`generica`) marcate «in ratifica»** (segnaposto neutro fino al gate Task 18) — letto `MiniaturaLavoro.tsx` (rende davvero un rettangolo neutro per le 4).
- **§5.37 `NavDesk`** — **rinumerata da §5.35** (v. sotto «Numerazione»). Fix cross-ref: range §5.28-**5.37**, «v. §5.**37**».
- **§6.1** — voce condizionale **«I lavori»** (`?stanza=pile`) solo con preferenza «solo Parete».
- **§7.1** — da nota a **paragrafo**: anatomia due stanze (pager scroll-snap, peek 28px, TastoPiù+dots fuori dal pager, inert, cap N + «Tutte le cassette ›», stanza iniziale + deep-link).
- **§7.20 «Le cassette»** (nuova sezione pagina; NON §7.17 — v. sotto).
- **§8.3.7** — coreografia **«l'accensione»** (anello+elevazione `snappy`, spegnimento in dissolvenza, reduced-motion).
- **Dizionario §2.3** — cassetta/parete/targa/libera-occupata/La tua home/Butta via la cassetta.

### C. Decisioni `docs/design/decisions/2026-07-21-parete-cassette-ratifiche.md`

Il file **esisteva già** (D-10, ratifiche 21/07). **Esteso additivamente** con le **ratifiche del
22/07**: S2 (trascinamento completo, touch incluso — Task 13) · doppio tap del colore custom (Task
12: standard committa in 1 tap, custom in sospeso → 2° tap) · ricerca globale · deroga a11y tastiera
deferita. Aggiornato il **gate residuo Task 18** a «IN CORSO» (4 miniature nuove «in ratifica»,
nessun esito anticipato).

### D. Backlog `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`

Aperta la voce **D-11** (in coda al §N, prima della sezione ALTO): fix di classe per la purga
per-tenant (funzione generalizzata + asserzione `information_schema` in CI) + copertura delle **3
tabelle già orfane** in `admin_delete_laboratorio` (`fatture_outbox`, `fatture_sdi_eventi`,
`credito_clienti_movimenti`), con la domanda normativa retention-vs-erasure su `fatture_sdi_eventi`
e la trappola `proconfig`/`search_path`. Marcata come **preesistente e verificata, NON di
quest'ondata**, decisione da prendere con panel proprio.

---

## Numerazione DS v3 — decisione presa (con panel advisor)

Collisione reale: la spec v3 aveva **§5.35 = NavDesk**, ma codice + `ds-v3.css` + design-spec §13 +
piano assegnano tutti **§5.35 = Cassetta / §5.36 = MiniaturaLavoro** (il catalogo aveva già un
duplicato §5.35 vivo). Scelta: **onorare §5.35 Cassetta / §5.36 MiniaturaLavoro** (3 fonti concordi
+ è la coerenza col codice di quest'ondata, scopo dello Step 2) e **rinumerare NavDesk a §5.37**. I
record **storici** (piani 12/07 e 16/07, decision record, `MEMORY.md`) NON sono stati toccati: sono
fotografie del loro tempo. Analogamente «Le cassette» è stata incisa come **§7.20** (non §7.17, che
è Onboarding) per non rinumerare tre sezioni-pagina stabili e referenziate.

---

## Cosa NON ho emendato (e perché)

- **Codice React/CSS/TSX vivo che cita `NavDesk §5.35`** (`NavDesk.tsx`, `SchedaNavRail.tsx`,
  `ds-v3-catalogo/page.tsx:1187`) — **fuori dallo scope documentale** dello Step 2. Aperto un
  **spawn_task** per riallinearli a §5.37 (chiude anche il duplicato §5.35 vivo del catalogo).
- **`§4.3 riassegna_post_annullo` NON allargata a 4 esiti.** L'audit (su commit `a9bcb23`) segnalava
  un 4° esito `lavoro_non_valido` (L1). La migration applicata **è stata poi cambiata**: collassa
  quel caso su `niente_da_riassegnare` (ratifica 21/07, opzione b, `20260721090000:505-514`). La
  spec resta quindi a 3 esiti — **coerente con l'implementato**. Nessun emendamento dovuto.
- **`vitest.config.ts`, migration applicate, RPC fiscali** — vietati/immutabili (R-6). Non toccati.
- **Nessun test nuovo per il seed:** è uno script, non logica estraibile; nessuna funzione pura
  aggiunta da testare. Suite invariata alla baseline.
- **Record storici e `MEMORY.md`** — non riscritti (fotografie del loro tempo); l'aggiornamento
  MEMORY/ROADMAP (BP-1/FASE 11) è dell'ondata, non di questo Step.

---

## Verifiche eseguite (Step 1-2; la FASE 7 completa è dello Step 3)

- **`npx tsc --noEmit`** → **0 errori**.
- **`npx vitest run`** → **2717 passed · 19 skipped** (= baseline esatta; nessuna regressione).
- **`npx eslint scripts/seed-e2e.ts`** → pulito.
- **Seed eseguito 2× contro il DB live** → end-state 6/2/1 identico (idempotenza provata).
- Mockup a11y referenziato (`docs/design/mockups/2026-07-22-riordino-affordance-a11y.html`) → esiste.

## Non verificato (di competenza dello Step 3 / altre fasi)

- `npx next build` e `check-ds-compliance` completi (FASE 7 — Step 3, dopo il React del Task 18).
- QA browser degli scenari (FASE 9) e gate estetico L2 (FASE 9b).
- Il riallineamento dei riferimenti `NavDesk §5.35` nel codice (spawn_task aperto, non ancora eseguito).
