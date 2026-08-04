# Handoff — Sessione ② dell'ondata B: migration + RPC + server, ESEGUITA E IN PRODUZIONE

**Per:** Francesco, e per la sessione nuova a contesto pulito (la ③ dell'ondata B: wizard + scheda).
**Quando:** 4 agosto 2026, sera (`provato:` `date` → `Tue Aug 4 17:46:45 CEST 2026`).
**Stato:** `main` = `2e248929` **+ il commit di questa chiusura** · albero pulito ·
`origin/main..main` = **0** prima di questa chiusura · **D219 ESEGUITA**: push `c04cf781..d1ba332d`
+ chiusura `2e248929` — CI verde ×2 (run 30923933154, 7m32s · run 30924964733) · CD verde
(run 30924573853) · sito 200 su `/login`.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, E ANDAVA FATTO

### ① Il percorso nuovo in produzione è MORTO finché la ③ non lo accende — e nessun giro end-to-end l'ha mai percorso
`provato:` il wizard non manda la chiave `prescrizione` (grep in `src/lib/wizard/crea-lavoro.ts`:
0 hit — L5) e per D216 senza quella chiave **nessuna riga di `lavori_prescrizioni` nasce**. Le
prove della ② sono: unit (4568), collaudo RPC **in transazione annullata** (9/9), CI. **Nessun
client vero ha mai chiamato il POST col campo nuovo, né dal banco di prova né dal sito.** Il primo
giro vero avverrà in ③ — chi la apre NON deve dare per collaudato ciò che è solo provato a banco.

### ② La FASE 8 formale (/code-review) non è stata lanciata
Sostituita da: review indipendente per task (6 giri, 2 con fix e re-review) + review FINALE di
ramo su modello capace (verdetto: Ready to merge, zero Critical/Important). La sostanza c'è, il
comando canonico no — dichiarato, non nascosto.

### ③ La sezione 7 di MEMORY (rotte API) era rimasta indietro fino a QUESTA chiusura
Il Task 5 l'aveva segnalato («MEMORY §7 va aggiornata coi due campi nuovi») e il controllore l'ha
chiusa solo al censimento di chiusura. `provato:` ora la §7 porta le due righe (POST `prescrizione`
+ PATCH `istituzione_sanitaria`). Il buco è durato mezze giornata: BP-1 non è «le teste», è TUTTE
le sezioni toccate.

### ④ Le citazioni stantie in `ua-app/CLAUDE.md` NON sono state corrette (fuori mandato, R-E2)
Chi le segue atterra sul punto sbagliato: `CLAUDE.md:557` cita il guard di idempotenza a
`generate-ddc.ts:85-95` (vero: **93-107**, L6) e il blocco R-P6 cita lo scarto allowlist a
`route.ts:259-264` (vero: **370-379**, L7). Si correggono alla prima occasione, con una riga.

### ⑤ `dichiarazioni_conformita.generated_by` resta SENZA scrittore
Il «chi» dell'emissione DdC non è registrato da nessun percorso (`generate-ddc.ts:199-213` lo
omette — L6). Il DPA l'ha sanato con `emesso_da` obbligatorio; la DdC no. Con la policy UPDATE ora
chiusa il campo è sanabile solo da RPC/service — va deciso dove (candidata: la ④, che tocca la DdC).

## 1. Che cosa è successo (la giornata, in tabella)

| Cosa | Esito | Dove |
|---|---|---|
| Cancello §0① (conteggio DdC) | ✅ PASSATO col dato vero: **6** (2 `generata` pre-v1 + 4 `annullata`), non «3 tutte annullate» | piano §A.0 |
| FASE 4 coi tre registri | ✅ 11 sonde R-P1 (valori rifiutati, errori incollati) · 8 lettori R-P2 · censimento R-P6 | piano §A/§B/§C |
| Migration A (strutture) | ✅ `lavori_prescrizioni` + `lavori_immagini_id_lab_uk` + `lavori.istituzione_sanitaria` | `20260804150306` |
| Migration B (RPC) | ✅ `lavoro_crea_atomico` a 4 parametri (DROP+CREATE, S10) + 4 RPC nuove + clone nel rifacimento — collaudo 9/9, permessi 6/6 | `20260804152403` |
| Migration C (chiusura) | ✅ `ddc_laboratorio_update` DROPPATA (`provato:` UPDATE client prima=1/dopo=0) + fix accenti COMMENT | `20260804154232` |
| Server TDD | ✅ `componiSnapshot` (14 test) · POST col gate D216 · PATCH + `istituzione_sanitaria` · domain | commit `c8b63adf` |
| Igiene | ✅ Allegato XIII (878/903/919, con un Critical del revisore corretto) · stato `annullata` in CHECK-foto e union · indice parziale fotografato | `9e352972` + `16f71ab5` |
| FASE 6b + 7 | ✅ tipi identici al vivo · tsc 0 · eslint 0 · vitest **4568 passate \| 19 saltate** (397 file \| 3) · build ok · sei guardie verdi · RLS 5 tabelle | verify:full in chiusura |
| Review finale di ramo | ✅ Ready to merge, 0 Critical/Important; 4 Minor oltre il confine ② → note ③/④ NEL PIANO | piano, sezione «Note VINCOLANTI» |
| Decisioni | ✅ Tornate 82-83: **D216-D222** (ratifiche · pubblicazione · scene confermate · studio rifacimento → riga 12 roadmap) | verbale |
| Pubblicazione (D219) | ✅ push `c04cf781..d1ba332d` + `2e248929` — CI verde ×2 · CD verde · sito 200 | roadmap (64) |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. **Una misura fresca vale più di tre referti:** il cancello del conteggio ha trovato il DOPPIO
   delle righe ricordate, e 2 vive dove «erano tutte annullate». Il piano disegnato sul numero
   vero non ha dovuto essere rifatto.
2. **`CREATE OR REPLACE` con firma diversa NON sostituisce: crea un overload** (`provato:` sonda
   S10 — 2 funzioni dopo l'OR REPLACE, 1 dopo il DROP). Cambio firma ⇒ DROP esplicito, sempre.
3. **La regola scritta non basta senza la review: la lezione degli accenti (P31) si è ripetuta
   LO STESSO GIORNO in cui era scritta nel brief** (`gia''`/`finche''` in due COMMENT, trovati dal
   revisore, corretti due volte — DB vivo e file). Candidata: una guardia sugli accenti-raddoppiati
   nelle stringhe delle migration.
4. **R-E1 funziona quando il brief ordina di cercare dove il piano sbaglia:** la contraddizione
   dello Step 5.4 (composizione incondizionata vs retrocompatibilità) l'ha trovata l'esecutore,
   non il pianificatore — ed è diventata D216 invece di un difetto in produzione.
5. **Anche un fix normativo può introdurre l'errore normativo successivo:** la correzione
   «Allegato IV → XIII» stava affermando che la classe di rischio è un contenuto dell'All. XIII
   p.1 (falso). Ogni abbinamento nuovo porta la sua fonte, o non si scrive (statuto delle fonti).
6. **Il conflitto piano-vs-regola-repo si adjudica a favore della regola** («dopo ogni migration:
   gen types», REGOLA ZERO) — e il debito lasciato dal Task 3 è stato assorbito dal Task 4: il
   sistema di review l'ha visto due volte.

## 3. Che cosa resta aperto, in ordine di importanza

1. **Sessione ③ — wizard + scheda** (il lavoro): parte da **piano ②, sezione «Note VINCOLANTI per
   le sessioni ③ e ④»** (10 note: la via allega_fonte-prima-del-typo, il dizionario di
   `registra_divergenza` da chiudere ANCHE nella RPC, la FK dell'immagine-fonte alla cancellazione,
   la riga vuota da `allega_fonte` a parametri NULL, ecc.) + spec D214 + D222 (scene confermate).
2. **Riga 12 della roadmap — studio del flusso rifacimento (D221)**: brainstorming PRIMA del
   codice se la ③ tocca il rifacimento; il solo clone P37 (richiedente+istituzione) può entrare
   in ③.
3. **Per la ④**: `generate-ddc.ts:148` legge ancora `lavori.numero_prescrizione` (ora senza
   scrittori) — la lettura VA spostata su `lavori_prescrizioni` o la DdC stampa NULL (nota 8 del
   piano) · §0⑤ (`generated_by`).
4. **E4 di `docs/ops/EMERGENTI.md`** (PATCH admin su colonne forse inesistenti): ereditata dalla ①,
   ancora NON provata sul DB vivo. **E5** (gettone di concorrenza sul PATCH): CONFERMATA dalla
   lettura L7 (`route.ts:327-498`, nessun controllo, last-write-wins) — resta aperta.
5. **Igiene minore censita, non fatta** (fuori mandato ②): citazioni stantie CLAUDE.md (§0④) ·
   3 COMMENT vivi preesistenti con accenti storpiati (`lavori_immagini.categoria`,
   `data_processing_agreements.storage_path_pdf`, `.emesso_da` — task-4-report §7.1, il terzo era
   F-P31-3) · CHECK `lavori.stato` fotografato a 6 valori in `schema.sql:926-930` contro i 9 vivi ·
   due famiglie di policy parallele su `lavori` (`lavori_laboratorio_*` + `tenant_*`) · «Allegato
   IV» stantio in 2 docs d'archivio (spec 2026-05-15:369, piano 2026-05-15:907).

### §3-bis — I ritrovamenti R-E2 di questa sessione (una sezione sola, come da regola)

I **14 dei lettori R-P2** sono censiti nel piano §B (in coda al registro letture) — committati,
non li ripeto. Dei task, oltre a quelli già promossi (D216-D218, riga 12): ① `paziente_nome_snapshot`
NON clonato dal rifacimento vigente (il testo di 007 lo faceva — perso nella definizione viva);
② lock di `crea_rifacimento_atomico` senza tenant param né `deleted_at` (M-T3-5 → riga 12);
③ `registra_divergenza` accetta `p_campo` NULL e libero (nota ③ vincolante); ④ `'null'::jsonb`
come `p_prescrizione` creerebbe riga spuria (chiuso alla route, RPC permissiva); ⑤ il report del
Task 3 affermava «accentate mai toccate» — smentito dal revisore: **il referto si verifica, non si
crede**; ⑥ DROP POLICY senza IF EXISTS (innocuo, applicato); ⑦ `LavoroImmagine.categoria` tipizzata
`string` invece di `CategoriaFoto`; ⑧ fixture precheck con doppio cast che nasconde la deriva dal
tipo; ⑨ `consegna_precheck_passato_al_primo_tentativo` scritto incondizionatamente dalla RPC
dormiente.

## 4. Da dove ripartire

**Sessione ③ di 4: wizard + scheda col flusso di correzione.** In ordine:
1. Leggere piano ② → «Note VINCOLANTI per le sessioni ③ e ④» (PRIMA di tutto).
2. Percorso 0B: mockup delle schermate VERE (Passo 3 col framing D210, card «La prescrizione» nel
   Fatto, foglio a2 come D222, gesto D212 innestato su `ModificaRigaSheet`) → scatti → scelta di
   Francesco → poi React.
3. Se si tocca il rifacimento: PRIMA il brainstorming della riga 12 (D221).
4. La ④ (DdC a due righe + precheck Q6 + QA 3 viewport + gate L2) segue.

## 5. Il minimo per non sbagliare

- FASE 7 = UN comando: `npm run verify:fast` (quotidiano) · `verify:full` (fine ondata).
- Worktree VIETATI: branch nel repo. La data si legge da `date` (D155).
- Sonde SQL: `node scripts/tmp/sql.mjs "<query>"` (sola lettura) · modello per sonde R-P1 in
  transazione annullata: `scripts/tmp/sonda-lp-r-p1.mjs` (SAVEPOINT + errori attesi + verifica
  post-rollback).
- ⚠️ In testa a MEMORY.md mai scrivere «voce N» se N non è una voce DI MEMORY: la guardia legge
  solo lì e si accende (pagato in questa chiusura; per la roadmap dire «riga N della tabella»).
- Accenti in SQL: si raddoppia SOLO l'apostrofo, MAI la lettera accentata (pagato DUE volte: P31 e ②).
- Citazioni: «MDCG 2021-3, marzo 2021» (mai «Rev.1») · ogni abbinamento normativo nuovo porta la
  fonte o non si scrive (lezione 5).
- Banco di prova: porta 3020 + `guardia-stili-collaudo` PRIMA di fotografare · accesso via
  `scripts/tmp/link-accesso.ts` (D103) · scatti mockup con `data-tema` (NON `data-theme`).
- Il prossimo numero di decisione è **D223**; il conteggio vive in testa al verbale (**222 in 83**).
