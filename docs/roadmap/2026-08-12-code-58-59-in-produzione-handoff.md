# Handoff — 12/08/2026: le due strutturali sono chiuse e in produzione, la revisione finale ha preso DUE difetti (il secondo era mio, dentro il fix del primo)

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 12 agosto 2026, mattina (`provato:` `date` → `Wed Aug 12 07:29:44 CEST 2026`). La sessione è
partita l'11/08 alle 13:36 e ha attraversato la notte: **il lavoro di codice è tutto dell'11 sera**.
**Stato:** ramo **`main`**, **zero commit non pushati** (`git log origin/main..main` → **0**).
🚀 **IN PRODUZIONE:** merge **`2f1d8d83`** su uachelab.com + BP-1 `8df19c6f` — **CI SUCCESS** (run
31516616997, 10m40s) e **CD Vercel SUCCESS** (run 31518956668), letti **due volte a ore di distanza**
(regola del falso allarme dell'11/08: la prima lettura dava `in_progress`, e da sola non provava nulla).

📌 **MISURATO IN CHIUSURA** (`npm run verify:full`, uscita da variabile, SENZA pipe): **`VERIFY_EXIT=0`** ·
**6069 passate | 159 saltate su 476 file** (462 passati, 14 saltati) · **tutte e sei le guardie verdi**.
🔑 **I numeri tornano, ed è la loro coerenza a provarli:** le passate sono **identiche** all'apertura
(6069) perché le **22 prove nuove sono TUTTE d'integrazione** — senza `.env.local` si saltano: 137 + 22 =
**159**; e 473 + 3 file di prova nuovi = **476**. Con l'ambiente caricato, ieri: **155/155 integrazione,
zero saltate**.

⚖️ **D360 · D361 in questa sessione: 361 decisioni in 156 tornate.**
🗄️ **Pavimento migration: `20260811164953`** (`accept_invite_ripristina_search_path`).

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO (o è stato fatto MALE da chi scrive)

### ① 🔴 IL MERGE SU `main` NON È PASSATO DA TE — e l'ultima volta era passato
Il merge `2f1d8d83` (= pubblicazione su uachelab.com) l'ho **deciso io**, motivandolo con **D296**
(«quando ritieni di pushare, fallo, ti autorizzo… il permesso c'è, il giudizio va motivato») e col
criterio che D296 stessa detta: ondata **completa**, nessun difetto dichiarato in §0, CI verde,
revisione finale con verdetto «Ready to merge: **Yes**», nessun cliente vero in produzione (§8).
🛑 **Ma il precedente immediato dice un'altra cosa:** ventiquattr'ore prima, per un merge dello stesso
tipo, ti era stata fatta la domanda e la risposta è diventata **⚖️ D359** («Sì, merge ora»).
`provato:` verbale, centocinquantacinquesima tornata. **Due merge uguali, due prassi diverse, nessuna
regola scritta che dica quale sia quella giusta** — ed è il modo classico in cui una prassi si perde.
➡️ **Da ratificare alla ripresa, in un verso o nell'altro:** il merge su `main` è sempre tuo (e allora
D296 va precisata), oppure è delegato quando i cancelli sono tutti verdi (e allora D359 era una cortesia,
non una regola). **Finché non lo dici, la prossima sessione tirerà a indovinare.**

### ② 🔴 IL CONTATORE DELLE RIGHE DI CODA ERA FERMO A 59 MENTRE LA CODA ARRIVAVA A 62
La testa della roadmap dichiarava «**Righe della coda: 42 → 59**» con le righe **61** e **62** già
scritte in tabella. È **§0A-bis regola 3** («il conteggio in testa si aggiorna **con** la riga, non
dopo») violata due volte di fila. 🔑 **E la guardia era VERDE:** `guardia-coerenza-documenti.mjs`
controlla il conteggio delle **decisioni**, non quello delle **righe di coda** — quindi qui la rete
meccanica non c'era, e il buco l'ha preso **il censimento di chiusura** (passo 3), che è esattamente
il lavoro per cui quel passo esiste. ✅ **Corretto in questa chiusura**, con la nota dentro la riga.

### ③ 🟠 IL COLLAUDO «AL DITO» NON È ANCORA STATO FATTO — terzo handoff di fila che lo dichiara
Tre punti mai provati col **tocco vero** (il giro del 10/08 guidò l'app con click DOM):
il collegamento «Chiudi» del foglio · la pillola «DA COMUNICARE» · l'area di tocco del banner in home
(`docs/design/audit-ui-ux/2026-08-10-gate-l2-avviso-dentista.md` §3), più il chip del portale a 42-43px
(va con la migrazione D347). **Cinque minuti col tuo telefono, e non serve nient'altro.**
⚠️ Una cosa rimandata tre volte non è «in coda»: è una cosa che il processo **non riesce** a chiudere da
sola, perché richiede te.

### ④ 🟡 TRE TASK E DUE FIX ESEGUITI IN LINEA INVECE CHE DA ESECUTORI FRESCHI (R-E1) — dichiarato, non nascosto
Lo strumento che spedisce i sotto-esecutori ha **fallito cinque volte** nel pomeriggio (tre dispacci
morti, un revisore in stallo a 600 s, un classificatore temporaneamente indisponibile). Ho proseguito
**in linea**, e questo toglie una rete vera: chi esegue e chi ha scritto il piano sono la stessa testa.
✅ **Le contromisure che ho tenuto:** `git status` **prima** di ogni ripresa (ed è servito: ha trovato
un albero con metà lavoro dell'esecutore ucciso, verificato frammento per frammento prima di tenerlo) ·
ogni deviazione scritta a ledger nel momento in cui avveniva · le revisioni per-task e finale **fatte
comunque**, da agenti separati.
🛑 **E il difetto ⑤ qui sotto è la prova che la rete tolta serviva davvero.**

### ⑤ 🔴 IL MIO FIX HA INTRODOTTO UN DIFETTO NUOVO — l'ho scoperto solo perché il fix è stato RI-REVISIONATO
Correggendo l'Important della revisione finale ho riscritto `accept_invite_atomic` con
`CREATE OR REPLACE`… **e ho perso in silenzio il `SET search_path` che l'hardening del 04/07/2026 le
aveva agganciato con `ALTER FUNCTION`.** `provato:` catalogo vivo, `proconfig = null` su una funzione
**SECURITY DEFINER del dominio autenticazione**. Nessun errore, nessun test rosso: una protezione
sparita **muta**. ✅ Ripristinata (`20260811164953`) e, soprattutto, **inchiodata da una prova a
catalogo** (test ④: `proconfig` deve contenere `search_path=`) perché non possa riperdersi.
🔑 **La lezione sta in §2.3 e vale per ogni fix futuro: un fix non è esente dal cancello che ha appena
attraversato il codice che corregge.**

### ⑥ 🟠 DUE RIGHE DI CODA RESTANO APERTE, ED È GIUSTO COSÌ — ma vanno viste
**Riga 62 (nuova, nata dal difetto di ieri):** un collaboratore che ha **firmato** avvisi non può
cambiare laboratorio via invito — il blocco è **giusto** (la firma è una prova e non si sposta) e ora
fallisce **pulito**, ma **come si trasferisce davvero quella persona è una scelta di prodotto che non è
stata presa**. **Riga 61:** archivio interrogabile **per paziente** (Art. 19 GDPR) + il caso della
ricevuta parziale — panel normativo, quando si torna sulle superfici dell'archivio.

---

## 1. Che cosa è successo (11/08 pomeriggio → sera)

| Cosa | Esito |
|---|---|
| ⚖️ **D360** — l'ordine della striscia | **contro-argomento finalmente PESATO e RESPINTO da te**: l'ordine resta, **zero righe di codice** toccate. Chiude il §0① dell'handoff precedente, che era passato **attraverso un gate** senza essere valutato |
| ⚖️ **D361** — il prossimo lavoro | le code **58-59**, percorso Grande (dominio critico: migrations + RLS) |
| 📋 **Piano** (3 task, registro prove P0-P10, censimento R-P6) | scritto **dopo** 11 sonde sul catalogo vivo e 6 lettori paralleli con domande falsificabili. Le due sonde decisive **hanno riprodotto i difetti**: riapertura di un avviso chiuso → **riuscita**; riattribuzione della firma a un utente di un altro lab → **riuscita** |
| ✅ **Task 1** — riga 58 | trigger `trg_avviso_chiusura_one_way` (`20260811132010`): dopo la chiusura **stato, autore, data e testo sono congelati per OGNI attore**, `service_role` compreso. RED **7/11** → GREEN **11/11**. Revisione: approvato al primo giro |
| ✅ **Task 2** — riga 59 | `utenti_id_lab_uk` + FK composita `avvisi_dentista_comunicato_da_fk` (`20260811133440`, **terza applicazione** del modello `20260806142910`). RED **5/7 + 1** → GREEN **34/34**. Revisione: approvato, con verifica **indipendente sul catalogo e sul ledger** |
| ✅ **Task 3** — verifica piena + chiusura righe | `tsc` pulito · `VERIFY_EXIT=0` · integrazione **155/155 con ambiente, zero saltate** · build verde |
| 🔴 **Revisione finale di ramo** | **zero Critical**, ma **UN Important vero**: la FK nuova rompeva l'**accettazione di un invito** per chi aveva firmato (23503 non gestito) — difetto d'**interazione fra due domini lontani**, invisibile a ogni revisione per-task |
| ✅ **Fix 1** (`c4253054`) | l'invito di chi ha firmato fallisce **pulito** (`{ok:false}`, invito ri-disponibile), e **solo** sulla nostra chiave: ogni altro errore **ri-esplode**. 3 prove nuove · **riga 62** aperta in coda |
| 🔴 **Ri-revisione** | Important #1 chiuso **e riverificato coi test rieseguiti**… **e un Important NUOVO trovato nel mio fix** (§0⑤: `search_path` perso) |
| ✅ **Fix 2** (`7418c8af`) | pin ripristinato (`20260811164953`) + **prova a catalogo** perché la trappola non si ripeta muta. RED 1/4 → GREEN 4/4 |
| ✅ **Verdetto finale** | «**Ready to merge? Yes**» → merge `2f1d8d83`, CI e CD **SUCCESS** |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **`CREATE OR REPLACE FUNCTION` SCARTA I `SET` APPLICATI CON `ALTER FUNCTION`.** Riscrivere una
   funzione può **disattivare in silenzio** una protezione agganciata mesi prima, senza un errore né un
   test rosso. La forma che **sopravvive** è il `SET search_path` **dentro la definizione** (è ciò che
   fanno le tre `SECURITY DEFINER` più recenti). E la rete non è ricordarselo: è **una prova a catalogo
   su `proconfig`**. ➡️ **Chi riscrive una funzione esistente ricontrolla `proconfig` prima e dopo.**
2. 🔑 **UN VINCOLO NUOVO PUÒ ROMPERE UN FLUSSO CHE STA DALL'ALTRA PARTE DELL'APP.** La chiave sugli
   avvisi ha rotto l'**accettazione degli inviti**: nessuna revisione per-task poteva vederlo, perché
   nessun task toccava entrambi. **L'ha preso la revisione finale di ramo** — che è il motivo per cui
   esiste. ➡️ E il rimedio giusto **non era togliere il vincolo**: era **far fallire pulito**, tenendo
   il blocco e spiegandolo.
3. 🛑 **UN FIX VA RIVISTO CON LO STESSO RIGORE DEL CODICE CHE CORREGGE.** Il difetto peggiore della
   giornata è nato **dentro la correzione** di un difetto, in una sessione in cui la fretta di chiudere
   era massima. La ri-revisione non è una formalità: **è il punto in cui questa classe di errore muore.**
4. 🛑 **UN'INTERRUZIONE DELLO STRUMENTO NON È UN'INTERRUZIONE DI FRANCESCO.** Due volte ho scritto «ti
   sei fermato» quando nessuno si era fermato: era l'infrastruttura. ➡️ Di fronte a un
   `[Request interrupted]`, **prima si guarda `git status`**, poi si parla — e si riparte da lì, senza
   attribuire a te una decisione che non hai preso.
5. 🔑 **IL CENSIMENTO DI CHIUSURA PRENDE CIÒ CHE LE GUARDIE NON GUARDANO.** Il contatore sbagliato
   (§0②) è passato sotto una guardia **verde**, perché quella guardia conta le decisioni, non le righe
   di coda. ➡️ **Una guardia verde dice «ciò che controllo è a posto», mai «va tutto bene».**
6. 🔑 **LE SONDE PRIMA DEL PIANO VALGONO PIÙ DI DIECI PAGINE DI PIANO.** Le due che hanno **riprodotto
   i difetti** in transazione annullata hanno reso impossibile scrivere un rimedio a naso, e hanno
   dato ai test la forma esatta del male da impedire.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **La ratifica del §0①** (chi decide il merge su `main`) — una frase tua, e la prassi smette di
   oscillare.
2. 🟠 **Riga 62** — come si trasferisce un collaboratore che ha firmato (panel + decisione).
3. 🟠 **Riga 61** — archivio per paziente (Art. 19) + ricevuta parziale (panel normativo).
4. 🟠 **Collaudo al dito** (§0③) — cinque minuti col telefono.
5. 🟠 **Ondata di pulizia dei Minor** — il ledger li tiene tutti (`.superpowers/sdd/progress.md`): i
   **sette nuovi** di questa ondata (**per primo il n.3: la copertura della forma UPDATE sulla firma**;
   poi nota R-P4 mancante nel test · DELETE su riga chiusa · alias `Client` · test D274 che non
   esercita i vincoli nuovi · refuso `void rif` · la stringa utente che cita «riga 62 della coda»),
   più tutti i **M-T\*** delle ondate precedenti.
6. 🟡 **Migrazione del portale a v3** (⚖️ D347) — assorbe le code **48** (tema scuro), **56** (doppio
   `<html>`) e il chip a 42px.
7. 🟡 **Coda 57** — lo stato «annullata» sovraccarico, quando si tocca il modello delle dichiarazioni.

## 4. Da dove ripartire

1. **Questo handoff, §0** — poi la testa di `docs/roadmap/ROADMAP-UFFICIALE.md` (aggiornata e vera:
   in produzione, righe 58-59-60 chiuse, 61-62 aperte, contatore corretto a 62).
2. **La domanda ① a Francesco** (merge: sempre suo o delegato coi cancelli verdi?).
3. Poi, a scelta sua: **riga 62** (panel) · **collaudo al dito** (serve lui) · **ondata di pulizia dei
   Minor** (nessuna decisione richiesta) · **migrazione portale v3** (ondata grossa, con mockup e
   approvazione visiva).

## 5. Il minimo per non sbagliare

- 🛑 `date` in comando **SEPARATO**, sempre — l'ora non si stima mai (D155). ⚠️ Questa sessione ha
  attraversato la notte: **il codice è dell'11, l'handoff del 12**, e il nome del file dice il vero.
- 🛑 `verify:full` da **variabile**, SENZA pipe, timeout 600000. In locale salta l'integrazione (159 in
  chiusura — attese); per accenderla: `set -a && . ./.env.local; set +a && npx vitest run tests/integration/`.
- 🗄️ Migration: orologio **UNIVERSALE** `date -u "+%Y%m%d%H%M%S"` (D311) · **pavimento
  `20260811164953`** · si applicano da soli, `npx supabase db push --linked --yes` (D284, `--yes`
  obbligatorio) · **il file NON è la prova**: catalogo vivo con `node scripts/psql.mjs`.
- 🛑 Worktree **VIETATI** · D318 (`git status` prima, `git add <percorsi>`, MAI `-A`, messaggi con
  `-F`) · il push si esegue (permesso versionato in `.claude/settings.json`) · i ruoli sono **CINQUE**.
- 🛑 Dopo ogni `review-package`: `git status` su `.superpowers/sdd/.gitignore` (lo strumento lo riscrive
  a `*`; **4 su 4 anche in questa sessione**, rimesso ogni volta — D313: quella cartella **si versiona**).
- 🔑 Un'assenza nei registri esterni (deploy, CI) si dichiara guasto **solo alla seconda lettura**, a
  distanza di minuti — regola pagata l'11/08 e **rispettata** in questa chiusura.
- Accesso al banco: D103, `npx tsx scripts/link-accesso.ts` (per l'app locale si riusa il `token_hash`
  su `http://localhost:3000/auth/callback`).
