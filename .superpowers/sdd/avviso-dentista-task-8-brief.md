# Task 8 — LA SEZIONE «AVVISI» NEL PORTALE DEL DENTISTA (⚖️ D346 + eredità ⚖️ D354)

**Ondata:** «l'avviso al dentista» · **ramo:** `intervento-post-consegna` (già attivo — NON crearne un altro, MAI un worktree)
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` — sezione «Task 8» (emendata il 10/08 con l'eredità D354).
**BASE:** `b8fba0f3`.

---

## 0. Dove sta questo compito

Il laboratorio ormai ha tutto: l'avviso nasce nella riemissione (Task 2), il foglio lo manda (Task 5),
la scheda e la home lo ricordano (Task 6-7), e da stamattina **un solo atto chiude tutte le righe
aperte del lavoro** (Task 4-quater, ⚖️ D354). Manca **l'altra metà del canale: quello che vede il
dentista**. ⚖️ D332: «l'avviso vive nel portale; WhatsApp è la spinta» — questo task È il posto dove
l'avviso vive.

## 1. Il mandato (dal piano, emendato D354 — valori esatti)

**File:** `src/app/portale/[token]/page.tsx` (modifica) · `src/lib/portale/audit.ts:10` (`AzionePortale`
guadagna `view_avviso`, era una union di 16 valori → 17) · **UNA MIGRATION** (la funzione, v. §2) ·
prove nuove.

🎨 **Disegno approvato: VARIANTE B1 «una sezione come le altre»** (⚖️ D346, mockup
`docs/design/mockups/2026-08-09-avviso-al-dentista.html` righe 320-346): sezione **«Avvisi dal
laboratorio (N)»** in cima, **sopra i lavori in corso**, titolo nello stile dei titoli di sezione del
portale (13/700 maiuscolo, `+0.06em`, `#374151`), **stessa card** che il dentista già conosce. La card:
numero lavoro · badge «Aggiornata» · paziente · la frase delle voci · data · chip «📄 Dichiarazione
aggiornata».
🛑 **Si resta nello stile che il portale ha OGGI** — colori scritti a mano, DM Sans, nessun tema scuro:
⚖️ **D347** migra quella pagina al v3 **intera, in un'ondata a sé**. Portarci token v3 da qui è VIETATO
(v3 §14, migrazione per route mai per componente).
📌 **Una parte nuova non eredita un difetto noto:** la didascalia della data va a `#6B7280` (4,83:1),
NON al `#9CA3AF` usato altrove nel portale (2,54:1, misurato).

⚖️ **D354 — EREDITÀ VINCOLANTE (sostituisce «una card per avviso»):**
- **UNA card PER LAVORO** che abbia almeno un avviso; le voci = **UNIONE** dei `campi_corretti` degli
  avvisi di quel lavoro (`descriviCampiCorretti` sull'insieme unito, senza doppioni) · la data = quella
  dell'avviso **più recente** · la dichiarazione da scaricare = **l'ULTIMA** (il filtro
  `.neq('ddc.stato','annullata')` esiste già nella pagina, riga ~357: riusa quel pattern).
- **Nessun filtro di stato sull'avviso**: si mostra anche se il promemoria del laboratorio è ancora
  aperto — la pagina offre GIÀ la dichiarazione nuova a prescindere, e nasconderlo mostrerebbe un
  documento nuovo senza spiegazione.

**Checklist:**
- [ ] La card: quale lavoro · quali voci (unione) · dichiarazione ultima da scaricare.
- [ ] 🛑 ⚖️ **D336 — il valore VECCHIO non compare MAI, da nessuna parte.** Prova esplicita.
- [ ] `AzionePortale` + `view_avviso`; l'apertura del portale con avvisi visibili scrive l'audit
  (modello: `view_lavori` già scritto dalla pagina, riga ~315).
- [ ] `visto_dal_dentista_at` scritto all'apertura su **tutte le righe mostrate**, via la funzione di §2.
- [ ] La lettura: **riusa `archivioCliente`** (`src/lib/avvisi/queries.ts:346`) se il contratto basta;
  una query nuova solo se il riuso non regge, con la ragione nel resoconto.
- [ ] ⚠️ Il caso di confine della ricevuta parziale (referto D354 §4) resta **deciso-di-non-deciderlo**.
- [ ] ⚠️ FASE 9 (browser): **accorpata al Task 10** — NON farla qui (la fixture nasce solo dalla
  riemissione vera del giro completo).

## 2. 🔴 LA MIGRATION — `visto_dal_dentista_at` NON si scrive con un UPDATE

`provato:` catalogo vivo (10/08, `information_schema.column_privileges`): l'UPDATE di quella colonna non
è concesso a **nessun** ruolo dell'app (solo `postgres`). La migration
`supabase/migrations/20260809124517_avvisi_dentista_update_per_colonne.sql` (righe 41-54 — **leggila**)
lo dichiara deliberato e **prescrive la strada**: una funzione `SECURITY DEFINER`, modello
**`valutazione_supera`** (cercala nelle migration e nel catalogo per copiarne la forma).

**Nome (censito, zero collisioni): `avvisi_segna_visti`.** Semantica: scrive `now()` su
`visto_dal_dentista_at` **solo dove è NULL** — la ricevuta registra la PRIMA visione, mai si riscrive,
mai un timestamp fornito dal chiamante. Firma suggerita: `(p_ids uuid[])`; se leggendo il modello di
casa trovi ragioni per una firma diversa, decidila e motivala nel resoconto.

**Regole non negoziabili della migration:**
- Nome file con l'orologio **UNIVERSALE**, in un comando separato: `date -u "+%Y%m%d%H%M%S"`
  (⚖️ D311 — pavimento attuale `20260809133546`: il tuo nome DEVE essere più alto).
- `DROP → CREATE → REVOKE EXECUTE FROM PUBLIC, anon, authenticated → GRANT a service_role → COMMENT`
  (il REVOKE è **portante**: dopo un CREATE fresco Postgres concede EXECUTE a PUBLIC).
- Applicare non si chiede (⚖️ D284): `npx supabase db push --linked --yes` dalla cartella `ua-app/`.
  ⚠️ `--yes` obbligatorio (senza, resta appeso a una domanda invisibile).
- 🛑 **Dopo l'applicazione è dovuta la FASE 6b:** `npx supabase gen types typescript --project-id
  iagibumwjstnveqpjbwq > src/types/database.types.ts` (rimuovi l'eventuale riga CLI in fondo) →
  `npx tsc --noEmit`.
- 🛑 **Il file di migration NON è la prova: la verità è il catalogo vivo.** Dopo il push, sonda con
  `node scripts/psql.mjs -c "…"`: EXECUTE negato a `anon`/`authenticated` (
  `has_function_privilege`), concesso a `service_role`, e la prova che un secondo giro **non riscrive**
  il timestamp. Output incollato nel resoconto.
- Le prove d'integrazione sullo schema seguono il modello del Task 6 (gruppo `pg` in
  `tests/integration/avvisi-dentista-schema.rpc.test.ts`): girano in CI via `SUPABASE_DB_URL`; in
  locale si saltano e lo dichiarano.

**FASE 3, già risposta (resta da NON smentire):** tenant isolation — la funzione tocca solo la colonna
`visto…` e solo NULL→now(), gli id arrivano dalla lettura già scoped per cliente; schema drift — sì,
da qui la FASE 6b; contratto API — nessuno rotto (tutto interno alla pagina); rollback — `DROP
FUNCTION`; dominio critico — sì (migration + SECURITY DEFINER): TDD pieno e nessuna scorciatoia.

## 3. Trappole note

- 🛑 **Gli snippet del piano hanno GIÀ portato due errori di campo in task passati** (`.numero` → era
  `numero_lavoro`; `.id` dell'avviso usato come id del lavoro): **ogni campo si verifica sul TIPO**
  (`src/types/database.types.ts`, `AvvisoRiga` in `queries.ts:54`) prima di usarlo.
- Il nome del paziente sulla card: il portale lo mostra GIÀ per i lavori in corso — riusa quel campo e
  quel formato, non inventarne uno. Se per gli avvisi il dato può mancare, il fallback si decide
  guardando cosa fa la pagina oggi, e si dichiara nel resoconto.
- La pagina è un server component che usa il service client e il token: la scrittura del `visto` e
  dell'audit avviene lì, nel percorso già esistente (guarda come scrive `view_lavori`, riga ~315).
  Attento a non scrivere il visto quando la sezione avvisi è vuota.
- `archivioCliente` è nato per il Task 9 (lato laboratorio) e NON ha cancello di ruolo: per il portale
  va bene così (il cancello del portale è il token), ma NON aggiungergli un cancello qui — quello è
  mandato del Task 9.
- ⚖️ D338: **si parte da zero, nessun avviso retroattivo** — gli avvisi esistono solo dalle riemissioni
  nuove; non «riempire» la sezione con dati storici.
- 🛑 GDPR (per contrasto, non per questo task): il nome del paziente non entra MAI nei messaggi
  WhatsApp. Nel portale invece il paziente si mostra (è già così per i lavori).

## 4. Regole di casa per l'esecuzione (vincolanti)

- Directory: `/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app`, ramo già attivo.
- TDD: prove rosse prima; dopo il primo rosso, abbozzo inerte e **conteggio** `N su M` (R-P4);
  enumera le forme d'input della parte nuova (avvisi di due lavori diversi → due card; due avvisi
  sullo stesso lavoro → UNA card con l'unione; zero avvisi → niente sezione, niente scrittura visto;
  avviso con dichiarazione annullata in mezzo → si scarica l'ultima; D336: il valore vecchio mai).
- FASE 7 completa prima del commit: `npx tsc --noEmit` · `npx vitest run` · `npx next build`.
  ⚠️ `tsc` non vede `server-only` né le firme degli handler: solo `next build` li vede.
- 🛑 `git status` PRIMA di ogni add · `git add <percorsi>`, MAI `-A` · messaggi lunghi con `-F <file>`
  (file del messaggio FUORI dal repo) · **NIENTE push** (lo fa l'orchestratore).
- 🛑 Un difetto fuori mandato si RIFERISCE (R-E2), non si corregge.
- Commit format: `feat(avvisi): …` · migration in un commit con le sue prove.

## 5. Il resoconto

Scrivi il resoconto COMPLETO in `.superpowers/sdd/avviso-dentista-task-8-report.md`: cosa hai fatto ·
evidenza TDD (RED con conteggio N su M, GREEN) · le sonde sul catalogo vivo con output · file toccati ·
FASE 6b eseguita · autorevisione · riserve. Poi rispondi con SOLO (max 15 righe): **Status** · commit
(sha + oggetto) · una riga sui test · una riga sulla migration (nome, applicata, sonde) · riserve ·
percorso del resoconto.
