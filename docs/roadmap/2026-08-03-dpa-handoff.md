# Handoff — il contratto ai dentisti: una premessa caduta, un documento riscritto, e un piano non eseguito

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** `main` = **`665b26e8`**, albero **pulito**, **2 commit da pubblicare** (`1bc080b5` la spec,
`665b26e8` il piano — entrambi soli documenti).
`https://uachelab.com` risponde **307 → `/login` 200** (la radice reindirizza: è il comportamento normale).
**Riferimento misurato ADESSO, su `main`:** `tsc` **0** · `vitest` **371 | 3** file e **4292 | 19** prove ·
`next build` **uscita 0**.
⚠️ **Sulla data.** L'orologio della macchina dice **1° agosto**; i documenti del progetto seguono la serie del
**3 agosto**, e questo handoff la tiene.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

### ① Del piano scritto oggi non esiste **una riga di codice**

`docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md` è pronto — **9 task, tre registri, prove col
rifiuto** — e l'esecuzione **non è iniziata**.
`provato:` `ls supabase/migrations/ | grep -c dpa` → **0** · `grep -rn "data_processing_agreements" src/`
(escluso il file dei tipi) → **0**. Il registro **non esiste**, la migration **non esiste**.
🛑 **Il Task 1 finisce con la migration da APPLICARE al database, e nessuno può applicarla da solo:** il CI
non applica le migration, e che `npx supabase db push` funzioni da questa macchina è **non verificato** (non
è stato tentato: richiede la password del database). O Francesco dà la strada, o la incolla lui nel pannello.

### ② Una frase **falsa** è ancora in produzione, e l'ho trovata io oggi

`provato:` `src/app/(app)/clienti/[id]/page.tsx:276` → «*Stampa, firma in duplice copia e conserva una copia
originale per **10 anni**.*»
È falsa dopo **D126**: i dieci anni sono della **dichiarazione di conformità** (Allegato XIII punto 4), non
del contratto sul trattamento dei dati. E contraddice **D127-D128**, che vogliono la firma **a distanza**.
➡️ È il **Task 8** del piano. **Non è stata corretta** (R-E2: sta fuori dal mandato di oggi, che era scrivere
il piano) — ma è **viva davanti a un utente**, quindi va prima di molte cose che sembrano più grandi.

### ③ Il panel normativo su **D128** non è stato fatto

D128 (la firma è un'accettazione tracciata) poggia sull'Art. 28(9) GDPR — «per iscritto, **anche in formato
elettronico**» — che è **citato a memoria, non letto alla fonte**. Va confermato con lo stesso metro usato
oggi per l'Allegato XIII: testo scaricato e riletto.
✅ **Non blocca l'ondata 1**, che non firma niente. 🛑 **Blocca l'ondata 2.**

### ④ Le citazioni emendate da D125 restano in **cinque documenti**, per scelta

`provato:` `grep -rln "Art. 10(5) + Allegato XIII punto 4"` → 11 file, di cui **6 già emendati o che
citano la formula per correggerla**. Restano invariati: `docs/roadmap/2026-08-03-audit-e-rete-handoff.md`,
`docs/roadmap/2026-08-03-accenti-documenti-handoff.md`, `docs/roadmap/2026-07-30-ondata-b-apertura-handoff.md`,
`docs/roadmap/2026-07-30-ondata-b-consegna-zero-handoff.md`, `docs/superpowers/specs/2026-08-03-accenti-documenti-design.md`.
🔑 **È una scelta, non una dimenticanza:** handoff e referti passati sono **il verbale di ciò che si credeva
allora** e non si riscrivono. ⚠️ **Ma l'ultimo della lista è una SPEC, non un handoff** — se un domani
qualcuno la rilegge come fonte, porta la formula vecchia. **Non risolto, dichiarato.**

### ⑤ Restano intatte, dall'handoff precedente

**D42** (piano pronto, 9 task, **zero righe scritte**: `git log --since=2026-08-03 -- src/` → **0** commit
di codice su D42) · il **§6-bis** della DdC mai percorso in produzione · **AUD-1 · AUD-3 · AUD-4 · AUD-5** ·
il **round 2** dell'audit: **120 decisioni non provate — non «a posto»: non verificate**.

### ⑥ Che cosa NON è verificabile da qui

Le **migrazioni applicate al database vero** e i **collaudi nel browser** che nessuno ha eseguito oggi
(FASE 9: nessuna superficie UI è stata toccata, quindi non serviva).

---

## 1. Che cosa è successo

| | |
|---|---|
| 🔴 **La premessa è CADUTA** | La frase che ha guidato **D62, l'audit del 03/08, la riga 10 e l'handoff precedente** — «l'app cancella le foto mentre il contratto promette dieci anni» — **descrive un caso che il codice non permette**. `provato:` `src/app/api/lavori/[id]/immagini/[imgId]/route.ts:200-205` rifiuta la cancellazione se il lavoro è `consegnato`, e i dieci anni decorrono **dalla consegna**: la finestra si chiude dove l'orologio comincia. Il blocco c'è dal **30/07** (commit `98fa1e43`) |
| 🔴 **Il difetto vero era un altro** | Il contratto **affermava ai dentisti tre misure di sicurezza che il prodotto non ha**: autenticazione a più fattori (`grep` su `src/` → **0**), pseudonimizzazione (nome paziente in chiaro, `supabase/schema.sql:891`, dentro un indice full-text `:1011`), «log immutabile di **tutti gli accessi**» (registra le **modifiche**, su **due** tabelle che non sono né `lavori` né `pazienti`, `20260704120000_b3_cicli_fasi_audit.sql:7,11`) |
| ✍️ **D126 — riscritto TUTTO il testo** | Quattro citazioni, la conservazione sull'oggetto giusto, le tre affermazioni false, la catena dei sub-responsabili con **UÀ dichiarata**, cinque clausole Art. 28 mancanti, e un **Art. 7 nuovo sui ruoli**. `provato:` **17 su 17** in `tests/unit/dpa-pdf-content.test.ts` — nate **rosse 15 su 17**, le 2 verdi erano il controllo positivo |
| 🏁 **Provato IN PRODUZIONE** | Contratto scaricato da `uachelab.com` per un cliente vero del banco (link monouso, D103) → **18 controlli su 18**. ⚠️ **Il primo scarico ne dava 17 falliti su 18:** il rilascio non era ancora passato. **~5 minuti** dal `push` |
| 📜 **D125 — emendata una RATIFICA** | Sul testo consolidato **scaricato e letto**: i 10/15 anni stanno nell'**Allegato XIII punto 4, DA SOLO**, e riguardano **la dichiarazione**; l'Art. 10(5) rimanda al **punto 2** e **non ha termine**. La formula ratificata il 29/07 saldava due obblighi diversi — e **la lettura giusta era già in quel verbale**, sotto «cosa resta non verificato» |
| 🔒 **Il contenitore è PRIVATO** | `provato:` sul database vero, con l'autorizzazione di Francesco: `"public": false`, e la forma pubblica dà **400 «Bucket not found»** su un PDF vero. **Nessuna esposizione.** Resta che `getPublicUrl` scrive in banca dati un **indirizzo morto**, dentro un campo chiamato `signed_url` |
| 🧭 **D127-D131 + spec + piano** | Brainstorming: i documenti si mandano e si firmano dal telefono (**D127**) · la firma è un'**accettazione tracciata** (**D128**) · **due ondate**, prima il registro (**D129**) · si riemette **solo se qualcosa è cambiato** (**D130**) · la conversazione col clinico va al **portale** (**D131**). Spec e piano scritti e salvati |
| **Salvataggi** | `9fb59855` · `e90a21a2` · `98a5b5a3` · `a09834c8` · `e5b7b178` **pubblicati** · `1bc080b5` · `665b26e8` **da pubblicare** |

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① Una premessa ripetuta da quattro documenti non è una prova: è un'eco.** «L'app cancella mentre il
contratto promette» stava in D62, nell'audit, nella roadmap e nell'handoff. **Nessuno dei quattro aveva
provato a raggiungere quel caso.** Bastava una lettura di venti righe. 🛑 **Regola operativa:** prima di
riparare un conflitto fra codice e documento, si prova che il caso in conflitto sia **raggiungibile**.

**② «Pubblicato» e «in produzione» non sono la stessa cosa.** Il primo scarico dalla produzione, subito dopo
il `push`, dava **17 divergenze su 18**: il rilascio non era passato. Ci sono voluti ~5 minuti. **L'unico modo
di saperlo è andare a scaricare il documento**, non guardare il commit.

**③ Un panel che cita una ratifica è un'eco, non una fonte.** Il panelista GDPR ha ripetuto «Art. 10(5) +
Allegato XIII punto 4» come cosa chiusa; il panelista normativo è andato al testo; io ho scaricato il
regolamento e ho letto **le stesse parole**. Non era un pareggio fra due pareri: era **una lettura contro una
citazione di seconda mano**.

**④ Il panel ha corretto ME, ed è il suo mestiere.** Avevo provato «`consegnato` è l'ultimo stato» con
`supabase/schema.sql`, che è una **fotografia vecchia**: il vincolo vivo ne ammette **nove** (`005_v1_foundation.sql:31-37`),
fra cui un `sospeso`. La conclusione reggeva, **la prova no**. 🔑 **Chi vuole la verità sugli stati legga
`src/lib/lavori/transizioni.ts`, non lo schema.**

**⑤ Una correzione già scritta e mai propagata torna come difetto nuovo.** La lettura precisa dell'Allegato
XIII era nel verbale del 29/07, in fondo, sotto «cosa resta non verificato». **La riga di sintesi in testa
l'aveva appiattita — ed è la riga di sintesi che è stata copiata in quattordici posti.**

**⑥ Un elenco dichiarato completo va contato, non creduto.** Avevo scritto «la citazione vive in tre
documenti»: il censimento ne ha trovati **quattordici**. E la stessa cosa era già successa con le righe del
contratto da correggere: «tre», ed erano **quattro**.

**⑦ La guardia ha preso il piano di oggi, e aveva ragione lei.** In chiusura ha segnalato **cinque**
riferimenti pendenti nel piano: i file che il piano stesso creerà. Il controllo prevede già questo caso — un
piano può nominare file futuri, **ma deve dichiararli sulla riga** (`da creare`, `(nuovo`, `🆕`) — e io avevo
scritto «Creare:», che la guardia non riconosce. **Corretto il piano, non la guardia:** chi non dichiara un
percorso futuro è indistinguibile da chi ha sbagliato a scriverlo. 🔑 **E il motivo per cui è saltato fuori
solo ora:** il piano è entrato nella rete quando `SESSION_ACTIVE` ha cominciato a citarlo. **La rete copre
ciò che la catena raggiunge** — se un documento importante non è citato da nessuno, non è protetto da niente.

**⑧ Una promessa che dipende da un gesto umano ripetuto è una promessa che salta.** `VERSIONE_MODELLO_DPA` va
alzata a ogni cambio del testo: senza una guardia che lo imponga, il registro direbbe `dpa-v2` su un testo già
`v3`. Il piano ci mette una prova che àncora l'impronta del testo alla versione. *(È la lezione di D120, i 211
scatti dei mockup mai salvati.)*

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **Eseguire il piano del registro** — 9 task, **R-E1**, ramo `dpa-registro` **nel repo principale** (🛑 mai un worktree). Il Task 1 si ferma sulla migration da applicare | `docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md` |
| 🔴 **2** | **La frase falsa viva in produzione** (§0 ②) — è il Task 8, ma può uscire prima: è un `<p>` | `src/app/(app)/clienti/[id]/page.tsx:276` |
| 🔴 **3** | **La DdC ORFANA non è annullabile** dopo un fallimento parziale della consegna, e il tentativo dopo spedisce il foglio vecchio marcandolo conforme | roadmap, «I documenti che escono dal laboratorio» riga 12 |
| 🔴 **4** | **Il PATCH del lavoro non ha alcun cancello di stato**: `paziente_id` resta scrivibile dopo l'emissione della DdC — è il «molle sul dato» che contraddice D123 | riga 13 · `src/app/api/lavori/[id]/route.ts` |
| 🔴 **5** | **Eseguire D42** — piano pronto, 9 task, R-E1, ramo `tinte-manufatto` | `docs/superpowers/plans/2026-08-03-tinte-manufatto.md` |
| 🟠 **6** | **Il buono di consegna non si rigenera dopo un annullo** | roadmap, sezione dedicata |
| 🟠 **7** | **Le altre sei voci del panel** — DELETE foto senza cancello di ruolo · annullo che riapre la finestra senza limite · `getPublicUrl` su contenitore privato · `schema.sql` baseline stantia · il seed che chiama sub-responsabili AdE e Ministero · due cancelli che non si parlano sul rifacimento | roadmap, righe 14-20 |
| 🟠 **8** | **La DdC cita `Art. 2(1)(3)`, che non esiste** — va `Art. 2(3)`. ⚠️ Fonte secondaria: si riconferma sul testo italiano | `DdcTemplate.tsx:461` |
| 🟠 **9** | **AUD-1 · AUD-3 · AUD-4 · AUD-5** | roadmap, sezione dell'audit |
| 🟡 **10** | **Il panel normativo su D128** (Art. 28(9) letto alla fonte) — **prima dell'ondata 2** | spec §11 |
| 🟡 **11** | **Il §6-bis della DdC non provato in produzione** | referto DdC §4 |
| 🟡 **12** | **Il round 2 dell'audit**: **120 decisioni non provate** | referto audit §4 |

---

## 4. Da dove ripartire

**La fonte è `docs/roadmap/ROADMAP-UFFICIALE.md`.** La riga 10 è la voce viva: la sua parte **(a)** è
**fatta e in produzione**, la parte **(b)** è quella che il piano di oggi costruisce.

**La prima cosa: il Task 1 del piano**, su un ramo `dpa-registro` nel repo principale. Si ferma sulla
migration da applicare — quello è il punto in cui il lavoro **aspetta Francesco**.

⚡ **Se si vuole una vittoria da cinque minuti prima:** la frase falsa in `clienti/[id]/page.tsx:276` è un
paragrafo, e sta davanti a un utente **adesso**.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/MEMORY.md` e `memory/SESSION_ACTIVE.md` per primi. ⚠️ `MEMORY.md` è grosso: si legge **la
  testa**, non tutto.
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa.
  Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centotrentuno** decisioni in
  **quarantatré** tornate. La prossima è **D132**.
  *(Nota: `grep -c` sulle righe ne conta 132 — la riga in più è `D34-bis`, che la guardia esclude apposta.)*
- **La guardia ha SEI controlli** (`node scripts/guardia-coerenza-documenti.mjs`), gira al pre-commit: se si
  accende, il difetto è quasi sempre tuo.
- **REGOLA ADVISOR:** ogni decisione significativa passa da un panel con mandato di **confutare** — e **le sue
  affermazioni portanti si riverificano a mano**. Oggi il panel ha corretto me, e io ho corretto lui.
- **R-E1 / R-E2:** un compito alla volta a un esecutore fresco; un difetto fuori mandato si **riferisce**.
- **FASE 7 per intero, output incollato.** I tre comandi sono tre. **Riferimento di oggi:** `tsc` 0 ·
  `vitest` **371 | 3** file e **4292 | 19** prove · `next build` 0.
- **FASE 6b:** dopo ogni migration, `supabase gen types` + `tsc`. **Il CI non applica le migrazioni.**
- **D103 — l'accesso al banco:** credenziali di `.env.local`, **link monouso**
  (`npx tsx scripts/tmp/link-accesso.ts`). ⚠️ `scripts/tmp/` è **ignorato da git**.
- **Il collaudo dal vivo si fa scaricando il documento**, non guardando il commit: fra `push` e produzione
  sono passati **~5 minuti** (§2 ②).
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
