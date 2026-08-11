# Handoff — 07/08/2026 notte: la transizione mancante ha spec e piano, e CINQUE compiti su dieci sono costruiti

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 7 agosto 2026, 21:35 (`provato:` `date`, letto in un comando **separato**).
**Stato:** ramo **`intervento-post-consegna`**, ✅ **PUBBLICATO**, albero **pulito**.
🔑 **`main` NON è stato toccato** ed è `7427a680` (= `origin/main`, e base del ramo).
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD`
(al momento della scrittura: **92**).

📌 **MISURATO IN CHIUSURA** (`provato:` `npm run verify:full`, **uscita 0 letta da variabile**):
tsc **0** · eslint **0** · `npm run build` ok · **sette guardie verdi** ·
`vitest` **5436 passate | 68 saltate** su **450 file** (444 passati, 6 saltati).
📈 **Riferimento di ieri sera: 5435 | 68 su 449.** Questa sessione ha aggiunto **+1 prova e +1 file**:
il grosso del lavoro è andato in **cinque migration**, che le prove unitarie non contano.
⚠️ **Le 4 prove rosse del TD04 restano rosse e sono PREESISTENTI** — rimisurate da due revisori
indipendenti: `annulla-effetti-storno-td04.rpc.test.ts` dà 4 fallite | 1 passata, non nomina nessuna
delle funzioni di quest'ondata, e girano solo con le credenziali (quindi non entrano nei 5436).

⚖️ **OTTO DECISIONI in cinque tornate: D304-D311** (tornate 128-132 del verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`). Totale: **311 in 132 tornate**.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🔴 CINQUE COMPITI SU DIECI NON SONO STATI TOCCATI — e sono i più grossi
`provato:` `.superpowers/sdd/progress.md`, sezione «PIANO TORNA A PRONTO»: le voci **PRONTO-1..5**
sono marcate COMPLETO, dalla **6** in poi non esistono.
Restano: **T6** l'elenco degli effetti impara il bivio (`effetti.ts`) · **T7** la rotta (le guardie, le
due azioni nuove, il nome onesto) · **T8** il rifiuto della PATCH sui campi stampati (**D308**) · **T9**
il foglio a schermo (il terzo passaggio + sei testi che oggi non esistono) · **T10** le prove
d'integrazione e la chiusura.
🔑 **Il database è pronto per intero: quello che manca è tutto TypeScript.**

### ② 🔴 IL GATE ESTETICO L2 (FASE 9b) NON È STATO FATTO, ED È ANCORA DOVUTO PRIMA DEL MERGE
`provato:` `ls docs/design/screenshots/ | grep -i intervento` → **nessuna cartella**. Invariato da ieri
sera: quest'ondata cambia l'aspetto della scheda del lavoro, e **D245** lo rende dovuto. Il T9 aggiunge
un passaggio nuovo al foglio e sei testi: il gate va fatto **dopo** il T9, non prima.

### ③ 🟠 IL PIANO AVEVA QUATTRO DIFETTI, e li hanno trovati gli esecutori
Sono stati corretti e il piano è **emendato due volte**, ma vanno letti perché dicono dove il piano è
debole: ① il brief chiedeva la riga di `orchestrate.ts` e **non un censimento delle RPC** → un Critico
sfuggito (v. §1) · ② la sonda ④ del T4 era scritta sullo stesso lavoro della ①, che dopo la ① non è più
consegnato: sarebbe stato **un verde su una funzione mai entrata in azione** · ③ il piano prescriveva
`date -u` mentre la regola di casa usava l'ora locale → **due orologi nel ledger** (D311) · ④ il T5 non
poteva legare l'evento al lavoro, e il piano non diceva chi lo fa → **emendato nel T7**.

### ④ 🟠 DUE IMPORTANTI RIFERITI E NON CORRETTI (R-E2)
- 🔴 **`tests/integration/riapri-lavoro-atomica.rpc.test.ts:22` e `:28-31` RISCRIVONO LA FUNZIONE col
  corpo del 06/08 dentro la propria transazione**, e la chiamano in **14 punti**: i suoi **15 verdi
  guardano una funzione morta**, e la correzione del 07/08 (`annullata_da_evento_id`) non è coperta da
  nessuno di essi. Il motivo scritto in testa al file — «la migration non è ancora applicata» — è
  **scaduto dal 6 agosto sera**. ➡️ **Già assegnato: è il Passo 0 del Task 10.**
- 🟠 **La terza copia dei nove campi del ripristino esiste già:** `annulla_consegna_atomica` li porta in
  linea e **non** chiama `ripristina_lavoro_a_pronto`. Lo scenario che il commento dell'estrazione
  dichiara di prevenire è **già in essere**. Non è una regressione, ma non ha un compito.

### ⑤ 🟠 QUATTRO DIFETTI EREDITATI DAL RIFACIMENTO, assegnati alla riga 12 della coda (D307)
Il rifacimento nasce **già in ritardo** (eredita una data di consegna prevista passata) · non clona
`numero_prescrizione` · un lavoro creato per sbaglio **non si annulla** da nessuna schermata · la scheda
**non mostra affatto i rifacimenti**. Scritti per nome nella riga 12, non «vari problemi».

### ⑥ 🟡 INVARIATI dalla sessione di ieri, e nessuno è stato toccato
Le **4 prove rotte del TD04** · il compito del **ritiro** (D273) senza numero nel piano · la riga
**«reso senza difetto»** vuota (D292) · `audit_log` svuotabile e cieco · la **§17.2** impossibile per un
laboratorio `non_certificato` · `psur/route.ts:190` (`totale_reclami: 0`) · **`CRON_SECRET`** · i cinque
deferiti delle tinte · l'igiene **D257** · le voci di roadmap **8-bis · 9 · 10 · 24 · 25**.

### ⑦ 📌 CINQUE MIGRATION APPLICATE AL BANCO, e lo dichiaro
`20260807171033` · `20260807172520` · `20260807174850` · `20260807180314` · `20260807182614` ·
`20260807185858`. Tutte **additive** (nessuna cancella dati), tutte registrate nel ledger, che è
**monotòno**. Il banco contiene **soli dati di prova** (`CLAUDE.md` §8).
⚠️ Le sonde hanno girato in **transazione annullata**: nessun dato di prova nuovo è rimasto.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| 🧭 **Il perimetro l'ha scelto Francesco, e non era quello previsto** | il piano di ieri prevedeva «una funzione in più»; **D304** ha preso dentro anche il **bivio dei due difetti** |
| 🔴 **Il panel ha ribaltato la prima stesura della spec** | «lasciare viva la dichiarazione è giusto» era vero **a metà**: l'annullamento era anche il meccanismo che faceva arrivare le correzioni sul documento |
| 🔴 **Un secondo difetto normativo** | azzerare `data_consegna_effettiva` su un manufatto **uscito davvero** sposta alla seconda consegna l'orologio dei **dieci anni** (All. XIII p.4) |
| 🔄 **DUE errori miei di fatto nella spec** | `lavori_rifacimenti.evento_id` **esisteva già** (avrei reintrodotto una FK cross-tenant chiusa il 06/08) · avevo letto il corpo di una RPC dal **file superato** invece che dal catalogo |
| ✅ **T1-T5 costruiti e revisionati** | cinque migration, cinque revisioni indipendenti, **un Critico** trovato e corretto |
| 🔴 **Il Critico, e l'ha trovato una REVISIONE** | `consegna_finalizza_atomica` segna una consegna e **non scriveva** la data nuova — dormiente, ma già indicata come percorso futuro |
| ⚖️ **D304-D311, otto decisioni** | perimetro · il bivio si chiede subito · il rifacimento si crea da solo · si tappano i due difetti che l'ondata crea · il rifiuto della PATCH · la cassetta fail-soft · la ri-ratifica · l'orologio universale |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **TOGLIERE UN ATTO DISTRUTTIVO PUÒ SPEGNERE UN MECCANISMO CHE NESSUNO SAPEVA DI AVERE.**
   L'annullamento della dichiarazione non serviva solo a dire «questa consegna non c'è stata»: era
   **anche** ciò che faceva riemettere il documento aggiornato alla consegna successiva. Chi lo toglie
   deve chiedersi **che cos'altro reggeva**, non solo se è giusto toglierlo.
2. 🔴 **QUANDO UN COMPITO TOCCA UNA COLONNA CHE SEGNA UN FATTO, IL CENSIMENTO VA FATTO ANCHE SULLE RPC
   DEL CATALOGO, non solo su `src/`.** Il piano chiedeva «la riga di `orchestrate.ts`» e la risposta era
   giusta ma **incompleta**: una funzione PL/pgSQL dormiente faceva la stessa cosa e restava fuori.
3. 🛑 **UN FILE DI PROVE CHE RISCRIVE LA FUNZIONE DENTRO LA PROPRIA TRANSAZIONE PROVA CODICE MORTO.**
   È la lezione di ieri sera con un vestito nuovo: *una prova non può vedere un difetto che vive nella
   cosa che la prova sostituisce*. Ieri era il framework del browser, oggi la funzione stessa.
4. 🔑 **UN `DROP FUNCTION` NON PERDE SOLO IL CODICE: PERDE I PERMESSI.** Una funzione ricreata nello
   schema `public` nasce eseguibile da `anon`. Su una `SECURITY DEFINER` senza filtro di laboratorio,
   quello è «chiunque scrive nel laboratorio di chiunque». `DROP → CREATE → REVOKE → GRANT → COMMENT`,
   **nella stessa migration**, e la prova è una chiamata vera con la chiave pubblica.
5. 🟠 **UNA SONDA CHE TOCCA RIGHE INESISTENTI DÀ UN FALSO VERDE**, e `SAVEPOINT`/`ROLLBACK TO` in un
   solo file **non funziona** con `scripts/psql.mjs`: il protocollo semplice interrompe in silenzio
   l'intero lotto al primo errore. Una invocazione per sonda, e la fixture si costruisce **dentro** la
   transazione annullata.
6. 🕛 **DUE OROLOGI IN UN LEDGER SONO UNA BOMBA A OROLOGERIA, e il danno è in avanti** (D311): il push
   si ferma, e chi lo sblocca con `--include-all` fa divergere **per sempre** l'ordine di applicazione
   da quello dei file.
7. 🔑 **LE REVISIONI INDIPENDENTI HANNO PAGATO, e i numeri lo dicono:** su cinque compiti, **1 Critico**
   e **4 Importanti** trovati da chi non aveva scritto il codice — più **4 difetti del piano** trovati
   dagli esecutori.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **I compiti 6-7-8-9-10** del piano `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`.
   🔑 Il **T6** è il più piccolo e sblocca il T7. Il **T7** porta l'emendamento del Passo 4-bis.
2. 🔴 **Il gate estetico L2** (§0②) — dopo il T9, **prima del merge**.
3. 🟠 **La terza copia dei nove campi** (§0④) — non ha un compito.
4. 🟠 **La riga 12 della coda** (§0⑤) e le voci **24 · 25**.
5. 🔴 **Le 4 prove rotte del TD04** — fuori ondata, priorità alta.

## 4. Da dove ripartire

1. **Questo handoff, §0.**
2. `.superpowers/sdd/progress.md`, **la sezione «PIANO TORNA A PRONTO»** — è la mappa di recupero: i
   compiti marcati COMPLETO **non si rifanno**, e i commit che nomina esistono in git.
3. Il piano, **dal Task 6** — e i due **EMENDAMENTI** (Passo 4-bis del T7, Passo 0 del T10).
4. La spec `docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md`, **§1 e §2**.
5. Il verbale, **tornate 128-132** (D304-D311).

## 5. Il minimo per non sbagliare

- 🛑 **`date` in un comando SEPARATO** — e per le **migration** l'orologio è **UNIVERSALE**:
  `date -u "+%Y%m%d%H%M%S"` (**D311**). Pavimento attuale: `20260807185858`.
- **L'uscita dietro una pipe è quella dell'ULTIMO comando**: `verify:full` si legge **da variabile**.
  ⚠️ E **ci mette più di due minuti**: con un limite di due minuti si interrompe senza aver finito.
- ⚖️ **D284 — applicare una migration NON si chiede:** `npx supabase db push --linked --yes`.
  **E dopo è dovuta la FASE 6b:** `supabase gen types` → `tsc`.
- ⚖️ **D296 — il push del RAMO non si chiede**, e ora **funziona** (la riga in `.claude/settings.json`
  regge). 🛑 Il **merge su `main`** resta un giudizio: fa partire Vercel, e la §0 ha sette voci.
- 🛑 **`scripts/psql.mjs` prende un PERCORSO DI FILE**, non una stringa SQL, e **non accetta `\echo`**
  (esce `42601`). Le credenziali: `set -a && . ./.env.local; set +a`.
- 🛑 **Il file di migration NON è la prova: la verità è il catalogo vivo** (`pg_get_functiondef`,
  `proacl`, `pg_constraint`). Pagato due volte in quest'ondata.
- ⚠️ **In `memory/MEMORY.md` la formula «voce N» è RISERVATA** alle sezioni della memoria — per la
  roadmap si scrive «la riga N della coda di ROADMAP». La guardia blocca il commit.
- **I nomi in `.superpowers/sdd/` NON sono distinti per ondata** — questo piano usa il prefisso
  **`pronto-`** (l'ondata precedente usa `intervento-`).
- **MEMORY.md e ROADMAP non si aprono col lettore di file**: `sed -n '1,60p' … | cut -c1-260`.
- 🛑 **Worktree VIETATI.** Branch nel repo principale.
