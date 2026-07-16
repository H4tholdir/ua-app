# DS v3 — Ondata «Fondamenta residue + 4b Consegna» — Design

**Data:** 16 luglio 2026
**Stato:** approvata da Francesco (brainstorming 16/07, 3 sezioni + 2 panel advisor)
**Percorso:** GRANDE (tocca il flusso consegna → dominio MDR; il server però resta INTATTO)
**Spec madre:** `2026-07-07-design-system-v3-una-cosa-alla-volta.md` (DS v3.2) · **Spec figlia:** `2026-07-09-ds-v3-il-cuore-design.md` (sp.3 §8-9)
**Mockup-legge:** `docs/design/mockups/2026-07-09-il-cuore/consegna.html` (approvato Ondata 0) + `home.html` (`.nav-desk`) + `scheda-lavoro.html` (`.foto-strip`, `.menu-voce`)

---

## 0. Obiettivo

Chiudere il sotto-progetto 3 «Il cuore»: (Fase F) gli ultimi 5 componenti ds mancanti + check-ds esteso ai CSS globali; (Fase C) la migrazione del flusso Consegna a v3 — la pagina intermedia muore, il rito diventa Dialog/Sheet in-place, in 2 tocchi da scheda e pile.

**Vincolo di perimetro (ratificato):** la Fase C è UI pura — zero logica fiscale/server nuova; il POST consegna, `orchestraConsegna`, le RPC e la finestra annullo 10 min restano INTATTI. Unica aggiunta server: 1 route GET read-only.

---

## 1. Decisioni ratificate da Francesco (16/07/2026)

| # | Decisione | Fondamento |
|---|-----------|-----------|
| D-1 | **Numerazione DdC resta a t=0** con annullo tracciato. La nota vincolante 09/07 «numero DdC al commit dei 10 minuti» è **SUPERATA** | Panel 2 advisor convergenti: parere normativo (Art. 52(8) impone la DdC *prima* dell'immissione sul mercato; All. XIII non impone numerazione; ISO 13485 §4.2.4 → annullo tracciato è la prassi corretta) + parere architetturale (numero+sha256 dentro il PDF; niente cron). Condizioni già rispettate: numero mai riusato, DdC annullata conservata ≥10 anni (15 se impiantabile), registro mostra le annullate |
| D-2 | **Il frame «Consegnato!» non elenca la fattura** (la consegna non la produce più: fatturazione concordata). Lista = DdC · Buono · WhatsApp. Sotto: riga quieta «La fatturazione si decide con il dentista» **senza link** (destinazione v2.3 fuori mappa IA §6.1; link rivalutato quando Fatture/Scadenzario migreranno, sp.4) | Ratifica esplicita 16/07 (2 domande separate) |
| D-3 | **Ruoli consegna: status quo** — tutti i ruoli del lab (titolare, tecnico, front_desk) possono consegnare. Documentato come decisione esplicita; la GET nuova replica esattamente l'authz del POST (mai più permissiva) | Ratifica esplicita 16/07 su segnalazione appsec (il POST non ha gate di ruolo) |
| D-4 | **NavDesk variante A**: il tasto «+ Nuovo lavoro» resta la variante fisica locale H52/16 (identica alla legge visiva `home.html` §12.3). NO riuso `TastoPrimario` (H fissa 70/60 + violazione «UNO per schermata» a 1280 dove c'è già CONSEGNA in `SchedaAnteprima`). Emendamento §5.35 che ratifica la variante locale | Decisione visiva su mockup `2026-07-16-navdesk-tasto-varianti.html` (3 varianti × 2 temi) |
| D-5 | **Approccio A**: flusso in-place, la route `/lavori/[id]/consegna` muore (redirect). 2 tocchi da scheda e pile | Ratifica esplicita 16/07 |
| D-6 | **Warning materiali non bloccanti dentro il DialogConferma** (nota ambra compatta), non in sheet separato: lo sheet «Consegna comunque» sarebbe l'interstitial vietato da sp.3 §8 e romperebbe i 2 tocchi. `MaterialiWarningSheet` muore | Raccomandazione netta advisor UX, sez. 2 approvata |

---

## 2. FASE F — Fondamenta residue

### 2.1 FotoStrip (§5.33) — estrazione

- **Da:** markup inline `SchedaLavoroV3.tsx:275-284` → **a:** `src/components/ds/FotoStrip.tsx`.
- **Contratto:** `foto: { id: string; url: string; alt?: string }[]`, `onTap?(foto)`. Thumb 72×72 · radius 12 · cornice interna 1px inset · max 1 riga scroll orizzontale. Read-only.
- **Vincolo sicurezza:** riceve SOLO signed URL generate server-side (pattern B5, `src/lib/storage/signed-url.ts`) — mai `storage_path` né il valore `getPublicUrl` persistito. Da scrivere nel commento-contratto del componente.
- **Accettazione:** la scheda la consuma al posto del div inline; asserzioni struttura/stili invariati (misure §5.33) + comportamento.

### 2.2 MenuVoce (§5.34) — estrazione

- **Da:** stili inline `vociStile`/`iconaStile`/`chevStile` in `MenuSchedaSheet.tsx` → **a:** `src/components/ds/MenuVoce.tsx`.
- **Contratto:** `icona, testo, nota?, butta?, disabled?, onTap`. Min-height 56 · icona Ø38 radius 11 tint neutra (`--bg-deep`+`--muted`) · testo 17/700 `--ink` · chevron `--faint`. Variante `butta`: colore `--red`, icona `--red-tint`/`--red`.
- **Separatori POSIZIONALI (riserva arch #9): restano sul CONTENITORE** (`MenuSchedaSheet`), non sulla voce — la logica `ultima`/gruppo-disabled con `borderTop`+`marginTop` dipende dalla posizione, il componente non la può conoscere.
- **Accettazione:** `MenuSchedaSheet` refactorato, 6 voci identiche per struttura/stili; test comportamento esistenti verdi.

### 2.3 TastoWhatsApp (§5.29) — nuovo

- **Fonte visiva:** `consegna.html` `.wa-btn`. H62 · full-width (max 480) · radius 18 · gradiente `linear-gradient(180deg,#208650,#17663A)` · corsa `0 5px 0 #0E4A28` + ombra ambiente (light) · pressed `translateY(4px)` + corsa 1px. Riservato ESCLUSIVAMENTE alle azioni «apri WhatsApp».
- **Contratto sicurezza (riserva appsec #2):** NON accetta `href` libero. Unica prop `waUrl`: DEVE iniziare con `https://wa.me/` — altrimenti il componente non renderizza il link (dev-warn). Il chiamante passa il `whatsapp_url` già costruito dal server (`whatsapp-template.ts` sanitizza: telefono `\D`-strip + `encodeURIComponent`). È un `<a target="_blank" rel="noopener noreferrer">`. Suono/haptic da §5.1.
- **Token:** i verdi (#208650, #17663A, #0E4A28) entrano in `src/design-system/v3/tokens.ts` (riserva arch #8 — la regola 4a del check-ds blocca hex inline in `components/ds`).

### 2.4 RigaBloccante (§5.30) — nuovo

- **Fonte visiva:** `consegna.html` `.bloccante`. Padding 16/18 · radius 18 · sfondo `--amber-tint` · icona Ø34 tonda tint+`--amber` · testo «cosa» 16/700 `--ink` + «cosa fare» 14/700 colore-famiglia + chevron. Tappabile (touch ≥44px).
- **Contratto:** `cosa, cosaFare, icona, onTap`.

### 2.5 NavDesk (§5.35) — spostamento (D-4)

- `src/components/features/home/NavDesk.tsx` → `src/components/ds/NavDesk.tsx`; import aggiornato in `HomeDesktop.tsx`. Il tasto `TastoNuovoLavoro` locale resta INVARIATO (D-4). Zero cambio visivo: asserzioni struttura/stili + test esistente verde.
- **Emendamento spec madre §5.35:** ratificare la variante locale del tasto (H52/16, motivazione «UNO per schermata» + H fissa di TastoPrimario), con riferimento al mockup decisione `2026-07-16-navdesk-tasto-varianti.html`.

### 2.6 check-ds esteso ai CSS globali

- **Script:** `scripts/check-ds-compliance.sh` (invocazione resta `.husky/pre-commit`; CI = item BACKLOG, fuori ondata).
- **Nuove regole (scope `src/app/globals.css` + `src/app/ds-v3.css`):**
  1. Regole 1–3 esistenti (gold-come-testo, fallback t2/t3 `#96918D`/`#B8B3AE`, shadow hardcoded fuori standard) estese ai due file.
  2. Regola font 4c estesa, con **allowlist**: DM Sans + Playfair Display (legacy v2.3, import esistente riga 1 di globals.css) e Plus Jakarta Sans (v3 self-hosted). Un futuro import `Inter`/`Roboto`/altro → FAIL.
  3. Guard anti-leak: `--sh-card`, `--sh-press`, `--font-v3` definibili SOLO in `ds-v3.css` (riserva arch #8: NON includere `--sh-b/--sh-c/--sh-i`, legittimi in globals.css v2.3 e ribattuti dal ponte `ds-v3.css:188`).
- **Accettazione:** exit 0 sul working tree attuale (le regole nuove non rompono il pre-commit oggi) + fixture negative temporanee (scratchpad) che provano che ciascuna regola nuova scatta.

### 2.7 Catalogo `/ds-v3-catalogo`

4 nuove `<SezioneCatalogo>` (FotoStrip, MenuVoce, TastoWhatsApp, RigaBloccante) + voci in `INDICE` (`page.tsx:57-75`) + sezione demo statica NavDesk. Contratto del catalogo invariato (CatalogoShell.tsx:3-5).

---

## 3. FASE C — Flusso Consegna v3

### 3.1 Nuova API `GET /api/lavori/[id]/precheck-consegna` (read-only)

- **Authz:** identica al POST consegna (`auth.getUser()` → lookup `utenti.laboratorio_id` → `.eq('laboratorio_id', …)` → **404** indistinguibile se cross-tenant). Nessun gate di ruolo (D-3, parità col POST). Niente CSRF (read-only, coerente con le route esistenti).
- **Caricamento:** select MINIMO = quello di `orchestrate.ts:116-128` (`cliente, paziente, lavorazioni, materiali` + campi lavoro) — NON il super-select della pagina attuale (tecnico/fasi/immagini/ddc superflui).
- **Precheck:** riusa **`precheckMDR` di `src/lib/consegna/precheck.ts:18`** — la STESSA funzione del POST (divergenza impossibile per costruzione). ⚠️ NON `runPrecheckMdr` di `precheck-mdr.ts`: è codice morto (zero import) con shape e controlli diversi → **va eliminato** (col suo test).
- **Warnings materiali:** il loop BOM di `precheck-materiali/route.ts:83-121` (lavorazioni → `listino_materiali_auto` → `magazzino`) viene **estratto in helper condiviso** `src/lib/consegna/materiali-carenti.ts` e riusato dalla GET. La route `precheck-materiali` viene RITIRATA (unico consumer: `ConsegnaButton`, morente — verificato con grep repo-wide).
- **Shape risposta (BLINDATO, riserva appsec #3):** solo `{ consegnabile: boolean, bloccanti: PrecheckErrore[], warnings: WarningMateriale[] }` — mai echo di campi lavoro/paziente (dati Art. 9 GDPR). `PrecheckErrore` = shape di produzione `{elemento, descrizione, campo, route}` (`domain.ts:575-580`), già priva di PII (verificato).

### 3.2 `FlussoConsegna` (client, `src/components/features/lavori/consegna-v3/`)

Macchina a stati: `idle → verifica (GET) → { dialog | sheetBloccanti } → invio (POST) → consegnato | errore`.

**Ramo verde → DialogConferma** (variante ADDITIVA del componente ds, riserva arch #7: il default distruttivo con sicura sopra resta invariato; la variante consegna inverte l'ordine — primario «Consegna» sopra, «Non ancora» sotto — deroga §5.17 già ratificata, e aggiunge lo slot nota):
- Occhiello «Consegno?» + oggetto gigante «{Tipo} n.{numero} → {Dentista}».
- Warning materiali (D-6): nota ambra compatta max 2 righe, icona+parola+colore (L3), posizione sotto l'oggetto sopra i tasti, **niente elementi tappabili dentro la nota**, mai più evidente dell'oggetto. Più warning → una riga aggregata («2 materiali sotto scorta»).

**Ramo rosso → Sheet «Prima di consegnare»**: hint «{N} cose da sistemare. Tocca per risolvere», una `RigaBloccante` per `PrecheckErrore`. Mapping tap→destinazione dal campo `route` di produzione (oggi sempre `'dati'` → ponte `/lavori/[id]/modifica?tab=dati`; la spec del piano mappa gli altri valori se/quando esistono). **Ritorno dai ponti (riserva UX #2):** navigazione push con back `‹` → scheda; lo sheet NON si riapre da solo al ritorno; nuovo tap CONSEGNA = nuovo GET = contatore aggiornato. Entry da pila: il ritorno va alla scheda.

**POST** → `/api/lavori/[id]/consegna` ESISTENTE. Skeleton ≤3s durante l'invio, tasto disabled (no doppio tap).

**Mappa esiti POST (shape REALI verificate, riserva backend #1-2):**

| Esito | Shape | UI |
|---|---|---|
| 200 `ok:true` | `ConsegnaResult` (`domain.ts:586-595`) | Frame «Consegnato!» |
| 200 idempotente (già consegnato) | come sopra, MA possibili dati degradati: `ddc.url:''`, numeri placeholder | Frame «Consegnato!», i link documento con `url` vuota si nascondono; `whatsapp_url` è sempre ricostruito e valido |
| 422 `tipo:'precheck_fallito'` | `errori_precheck` shape identica alla GET | Riapre sheet bloccanti con gli errori del server (race GET-verde→POST-rosso) |
| 422 `tipo:'stato_non_consegnabile'` | `messaggio` | Message-only: Avviso + chiusura flusso (la scheda si riallinea al refresh) |
| 422 `tipo:'errore_pdf'` (SOVRACCARICO su 7 esiti, incluso «già in corso» e il catch-all che converte ogni eccezione) | `messaggio` variabile | **Copy generica unica + tasto Riprova** — MAI match sulla stringa. Retry sicuro: il lock è idempotente e sempre rilasciato; ritentare su «già in corso» ricade nel ramo idempotente → 200 → frame |
| 5xx / rete | — | Stesso ramo riprova (raro: il catch-all server converte in 422) |

**GET fallisce** → `Avviso` con riprova; CONSEGNA resta attivo.

### 3.3 Entry point (2 tocchi ovunque)

- `SchedaLavoroV3` (:299-305): CONSEGNA apre il flusso in place (niente più `router.push`). Gate `derivaUrgenza().consegnabile` invariato (mai nascosto, disabled+motivo).
- `PilaAperta` (:96) / `PilaSplit` (:83): `TastoConsegnaInline` monta lo stesso flusso lì.
- `SchedaAnteprima` (:114) — montata in PilaSplit (768) e HomeDesktop (1280, **unico punto consegna a 1280**): monta il flusso.
- **Stato e refresh (riserva arch #5):** nelle pile lo stato del flusso è posseduto da `PilaAperta`/`PilaSplit`/`HomeDesktop` (keyed su `lavoroId`), frame PORTALATO (non dentro la card: il refresh la smonta); `router.refresh()` **alla chiusura del frame**, non al successo. Nella scheda: refresh al successo (pattern sync prop→state `SchedaLavoroV3.tsx:151-154` già lo regge); durante la finestra annullo convivono frame (fino a chiusura) e `AnnullaConsegnaBanner` (dopo): il frame ha precedenza finché aperto, il banner appare alla chiusura.
- **Desktop (768/1280):** solo il DialogConferma è modale (deviazione B7 #9 ratificata); lo sheet bloccanti segue sp.3 §7.1: **pannello laterale 420px (§12.2)** — mai bottom sheet full-width né secondo modale (riserva UX #3).

### 3.4 Frame «Consegnato!»

`CardUAHaFatto`, fedele al Frame 3 del mockup:
- `role="status"` polite + **focus programmatico sull'intestazione «Consegnato!»** (riserva UX d); countdown FUORI dalla regione live.
- Lista: «DdC generata a ogni consegna ✓» (mai verdetti) · «Buono di consegna ✓» · «**Messaggio WhatsApp — pronto da inviare**» (riserva UX #1: MAI ✓ verde prima dell'invio; tint neutra).
- `TastoWhatsApp` con `waUrl = whatsapp_url` dal 200 (deep-link completo, zero derivazioni client — riserva backend #5).
- Riga quieta fatturazione (D-2): testo statico senza link, stile PROPRIO ~14.5/600 `--muted` (riserva UX #5: NON `LinkQuieto`, riservato alle vie di fuga §5.5), sotto la card, sopra il TastoWhatsApp.
- Annullo: **LinkQuieto «Annulla» + countdown** (Frame 3 del mockup — riserva UX #6: niente banner nel frame); la riga di trasparenza «Annullando, la DdC e il buono vengono annullati» vive nel **DialogConferma dell'annullo** (ordine standard: sicura sopra). Il flusso annullo server (`annulla-consegna`, RPC, 10 min) è INTATTO.

### 3.5 Cosa muore

| Cosa | Come |
|---|---|
| Pagina `src/app/(app)/lavori/[id]/consegna/` (page/loading/error) | `page.tsx` → `redirect('/lavori/[id]?consegna=1')` — i 5 consumer e i deep link degradano senza lavoro; `?consegna=1` auto-apre il flusso (consumato una volta, poi pulito dall'URL) |
| `ConsegnaButton.tsx` + suo test | Rimossi (test migrato in FlussoConsegna, inclusa asserzione `wa.me` target/rel) |
| `MaterialiWarningSheet` | Rimosso (D-6; nessun test dedicato) |
| `GET /api/lavori/[id]/precheck-materiali` | Ritirata (helper estratto in `materiali-carenti.ts`) |
| `src/lib/consegna/precheck-mdr.ts` + `tests/unit/precheck-mdr.test.ts` | Eliminati (codice morto; `precheck.test.ts` del modulo VIVO resta) |
| Commento+predicato `route-migrate-v3.ts:14-17` e `tests/unit/route-migrate-v3.test.ts:41-42` («/consegna resta v2.3») | Aggiornati (riserva test #1) |
| `tests/e2e/consegna.spec.ts:175-190` (naviga la vecchia pagina, skipped) | Aggiornato/rimosso; il test POST 401 (:61-64) resta |

Sweep finale «nessun import residuo» dei moduli morti (pattern `form-font-v3-sweep.test.ts`).

---

## 4. Testing

- **Componenti ds nuovi:** pattern `tests/unit/ds-v3/componenti/` sui 4 assi consolidati: ruoli/aria, stili inline su token, suono/haptic mockati, dizionario `trovaParoleVietate`.
- **Estrazioni:** asserzioni su struttura + stili inline computati (pattern `righe.test.tsx`) + test comportamento esistenti verdi — NON claim «visivi» (niente snapshot testing in repo).
- **FlussoConsegna:** jsdom, `vi.mock('next/navigation')` (pattern `MenuSchedaSheet.test.tsx:3-4`) + `useSearchParams` per `?consegna=1`; fetch mockato **per URL** (non per ordine); percorsi: verde, rosso, 422-race, message-only, riprova-idempotente (422 `errore_pdf` → retry → 200 degradato → frame senza link documento), chiusura frame → `router.refresh()`.
- **Route GET:** pattern `lavori-id-route.test.ts` (vi.hoisted + mock supabase); authz 404 cross-tenant; shape blindato; **parità di gate col POST via funzione condivisa** testata una volta (pattern `orchestra-consegna-gate.test.ts`), non due test paralleli.
- **Redirect `?consegna=1`:** nessun pattern esistente per `redirect()` di page server → copertura via QA browser/e2e (criterio esplicito in FASE 9).
- **check-ds:** exit 0 sul working tree + fixture negative in scratchpad per ogni regola nuova.
- **FASE 7:** `tsc --noEmit` 0 errori · suite completa verde (baseline 1954 pass | 19 skipped) · `next build`.

---

## 5. Documentale (parte dell'ondata)

1. **Emendamento spec madre §5.35** (variante locale tasto NavDesk, D-4).
2. **Emendamento spec figlia sp.3 §9**: la 4a-server come specificata (outbox+cron) NON fu eseguita — sostituita dal modello «fatturazione concordata» (migration `20260710150000_ondata0_pulizia_outbox.sql`); la consegna non tocca il fiscale. Nota su D-1 (DdC t=0).
3. **Decision record nuovo** `docs/design/decisions/2026-07-16-ondata-fondamenta-4b-consegna.md`: D-1…D-6 + deviazioni ratificate dal mockup consegna (riga fattura rimossa, copy WhatsApp «pronto da inviare», annullo Frame 3) + nota che marca SUPERATA la riga «numero DdC al commit» del decision record 09/07 (con riferimento al parere normativo).
4. **ANALISI/17 §1.2**: riga sul trattamento DdC annullate (stato, conservazione 10/15 anni, numero mai riusato) — ratificato D-1.
5. **BACKLOG-TECNICO**: nuovi item — (i) drift `consegna_finalizza_atomica` (RPC esistente mai chiamata da `orchestrate.ts`, allineare o droppare in ondata server futura); (ii) check-ds in CI; (iii) `csrf.ts:9` ritorna true con Origin assente (nota per futuri client non-browser).

---

## 6. Fuori scope (esplicito)

- Qualsiasi modifica a `orchestraConsegna`, RPC, migration, POST consegna, flusso annullo server.
- Firma UI alla consegna (resta: firma dell'utente autenticato sulla fase FATTA + firma laboratorio nelle Impostazioni, bucket C 09/07).
- Numerazione DdC al commit (D-1: superata).
- Gate di ruolo sulla consegna (D-3: status quo documentato).
- Audit multi-agente e sotto-progetto 4 «Le sezioni» (dopo questa ondata, da ROADMAP).
- IMAP/riconciliazioni/fiscale (binario R).

---

## 7. Criteri di accettazione dell'ondata (DoD)

1. I 4 componenti nuovi + NavDesk vivono in `src/components/ds/`, registrati nel catalogo (INDICE + SezioneCatalogo), check-ds verde.
2. `check-ds-compliance.sh` copre `globals.css`/`ds-v3.css` con allowlist font e guard anti-leak; exit 0 su working tree; fixture negative dimostrate.
3. Consegna in 2 tocchi da scheda (390/768/1280), pila aperta, pila split e HomeDesktop 1280; la vecchia route redirige con auto-apertura.
4. Ramo rosso, race 422, riprova-idempotente e frame degradato funzionanti come da mappa §3.2.
5. Frame «Consegnato!» conforme a §3.4 (a11y incluse); annullo entro 10 min funziona come oggi (server intatto).
6. FASE 7 verde (tsc/vitest/build) + FASE 9 QA browser lab E2E (mai lab Filippo) + FASE 9b gate L2 (checklist 12 sezioni × 3 viewport × 2 temi su scheda, pile, flusso consegna).
7. Documentale §5 completato; BP-1 (MEMORY + ROADMAP) a fine ondata.

---

## 8. Fasi di esecuzione (input per writing-plans)

- **Fase F prima, Fase C dopo**, stesso worktree: la C consuma TastoWhatsApp e RigaBloccante nati in F.
- Punti d'attenzione per il piano: variante additiva DialogConferma prima del FlussoConsegna; helper `materiali-carenti.ts` prima della GET; GET prima del FlussoConsegna; entry point per ultimo con la morte della pagina in coda (mai una finestra di commit senza percorso di consegna funzionante).
