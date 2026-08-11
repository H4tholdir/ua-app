# Handoff — 11/08/2026: l'ondata è IN PRODUZIONE, il falso allarme Vercel è costato una mattina di documenti, e tre rimandati stavano per perdersi

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 11 agosto 2026, pomeriggio (`provato:` `date` → `Tue Aug 11 08:58` alla ripresa; chiusura dopo le 12).
**Stato:** ramo **`main`**, albero **pulito**, **zero commit non pushati**. 🚀 **IN PRODUZIONE:** merge
`5e4af0ac` (⚖️ D359) su uachelab.com, **verificato con le impronte di build** (quattro chunk statici
identici fra dominio e deploy). Il ramo `intervento-post-consegna` è mergiato e resta su origin.

📌 **MISURATO IN CHIUSURA** (`npm run verify:full`, uscita da variabile, SENZA pipe): **`VERIFY_EXIT=0`** ·
**6069 passate | 137 saltate su 473 file** (462 passati, 11 saltati) · tutte le guardie verdi.
📈 Apertura della notte del 10/08: `5980 | 128 su 469` → **+89 prove, +4 file** in un giorno e mezzo.

⚖️ **D354 → D359 in questa sessione: 359 decisioni in 155 tornate.**
🗄️ **Pavimento migration: `20260810072748`** (`avvisi_segna_visti`, Task 8).

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO (o è stato fatto MALE da chi scrive)

### ① 🔴 IL CONTRO-ARGOMENTO SULL'ORDINE DELLA STRISCIA NON È MAI ARRIVATO A FRANCESCO
Rimandato dal Task 7 «al gate o a Francesco» (ledger, sezione Task 7: il promemoria dell'avviso non ha
una pila sotto la striscia — se il segnale a priorità più alta non nomina lui, il promemoria TACE; il
giro del Task 10-B l'ha pure OSSERVATO dal vivo in R1: la striscia era mascherata da un segnale più
alto). `provato:` grep di «contro-argomento» e «ordine della striscia» sul referto del gate L2 → **0
occorrenze**: il gate è passato senza pesarlo. **È esattamente la classe di difetto che il passo 3
della chiusura esiste per prendere — e stavolta l'ha preso la chiusura, non il caso.**
➡️ **Portato a Francesco nel messaggio di chiusura**; se accolto, è una riga in ognuno dei quattro
array di `LIVELLO1_PER_RUOLO` (`src/lib/dashboard/striscia.ts`).

### ② 🟠 DUE RISERVE RIMANDATE VIVEVANO SOLO IN HANDOFF E REFERTI — salvate ORA in coda (riga 61)
L'interrogabilità dell'archivio **per paziente** (Art. 19 GDPR, riserva aperta dal 09/08 §0⑧②) e il
**caso di confine della ricevuta parziale** (referto D354 §4: portale aperto fra due correzioni) erano
«deciso di non deciderlo coi Task 8/9» — i task sono FINITI, le questioni no, e `provato:` grep su
`ROADMAP-UFFICIALE.md` → **0 occorrenze** prima di questa chiusura. Ora è la **riga 61**: panel
normativo quando si torna sulle superfici dell'archivio.

### ③ 🟡 LA TAPPABILITÀ «AL DITO» NON È MAI STATA PROVATA FISICAMENTE
Il giro del Task 10-B ha guidato l'app con click DOM (i click «fisici» del tool andavano in timeout):
le transizioni di stato sono provate, il TOCCO no. Il gate L2 elenca tre punti «da verificare al dito»
(`docs/design/audit-ui-ux/2026-08-10-gate-l2-avviso-dentista.md` §3): il collegamento «Chiudi» del
foglio · la pillola «DA COMUNICARE» · l'area di tocco del banner in home. Più il rilievo deferito:
il chip del portale a 42-43px (va con la migrazione D347). **Cinque minuti col telefono di Francesco.**

### ④ 🔴 I MIEI TRE ERRORI DI MISURA DELLA SESSIONE — corretti, ma da sapere
1. **L'ora della 155ª tornata scritta A STIMA** («01:35» → erano le 08:58): corretta col `date`,
   violazione di D155 dichiarata nel verbale.
2. **Il falso allarme Vercel, il più costoso:** ho misurato i registri deploy alle 09:36-09:43 col
   merge delle 09:34 — la coda Vercel partiva con ~10 minuti di ritardo, e ho dichiarato «gancio rotto
   dal 06/08» (riga 60, tre documenti corretti, un deploy manuale chiesto a Francesco). **Tutto
   falso:** tre deploy automatici alle 09:45-09:53, sito aggiornato DA SOLO alle ~09:57, controprova
   col push delle 11:00 → deploy 11:11 senza mani. Smontato da Francesco con una frase («ha sempre
   funzionato vercel controlla»). Riga 60 **chiusa come falso allarme**, con la lezione dentro.
3. **Un esecutore interrotto ha lasciato l'albero sporco** e il successivo ha trovato codice di
   provenienza ignota (Task 9-ter): la rete ha retto (l'ha dichiarato e ri-derivato tutto), ma il
   `git status` prima di ogni ridispaccio dopo un'interruzione ora è scritto nel ledger.

### ⑤ 🟠 LE DUE STRUTTURALI DI BANCA DATI RESTANO APERTE — righe 58 · 59
**Da chiudere PRIMA della prima onboarding reale:** ① un avviso chiuso è riscrivibile/riapribile dai
ruoli col GRANT delle quattro colonne (manca il vincolo one-way; la tabella è la prova ex Art. 5(2)) ·
② `comunicato_da` è FK semplice: la firma può puntare a un utente di un altro laboratorio (serve la
composita, che richiede prima `UNIQUE(id, laboratorio_id)` su `utenti` — ondata propria).

---

## 1. Che cosa è successo (10/08 mattina → 11/08 mezzogiorno)

| Cosa | Esito |
|---|---|
| ⚖️ **D354** (ratifica del panel) + **D355** (ordine delegato) | un atto chiude TUTTE le righe aperte; ordine: rotta → 8 → 9 → 10 |
| ✅ **Task 4-quater** (rotta di chiusura D354) | approvato dopo 1 Important (perimetro UPDATE provato PER INVERSIONE) |
| ✅ **Task 8** (portale: card per lavoro, unione, ultima dichiarazione, `view_avviso`, visto via SECURITY DEFINER) | approvato AL PRIMO GIRO · 🗄️ migration `20260810072748` |
| ✅ **Task 9 + 9-ter** (archivio Comunicazioni, cancello D352, ⚖️ **D356·D357·D358**) | approvati al primo giro · le tre risposte di contenuto di Francesco implementate |
| ✅ **Task 10-A** (contratto foglio→rotta VERA, riga 38) | approvato · nessun disaccordo foglio↔rotta |
| ✅ **Task 10-B** (GIRO SUL BANCO VERO) | passato TUTTO: D354 dal vivo, 33 scatti, M-T9-1 chiuso |
| ✅ **Gate estetico L2** | PASSA: v3 pulite · contrasto scuro archivio corretto e misurato >12:1 (`8063c3be`) |
| ✅ **Revisione finale di ramo** (3 aree in parallelo) | ZERO Critical su 298 commit · 1 Important chiuso subito (`04974871`, allowlist riemetti) · 2 strutturali → code 58-59 |
| ✅ **CI** | verde dopo la chiusura di TRE flake da margine (p7 ×2 + torna-a-pronto, tutti 5006-5007 ms → **margine di GRUPPO 15000 ms** in `vitest.config.ts`, `85e892fc`) |
| ⚖️ **D359** + **merge `5e4af0ac`** | in produzione su uachelab.com, build verificata con le impronte |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **UNA MISURA FATTA PRIMA CHE L'EFFETTO ARRIVI NON MISURA IL GUASTO: MISURA LA FRETTA.**
   Un'assenza nei registri (deploy, code, webhook) si dichiara guasto solo alla **SECONDA lettura, a
   minuti di distanza**. Il falso allarme Vercel è costato tre correzioni di documenti e un deploy
   manuale inutile — e la coda quel mattino tardava solo ~10 minuti.
2. 🛑 **L'ORA SI LEGGE, NON SI DEDUCE — anche dentro la stessa sessione.** Due violazioni in un
   giorno (tornata «01:35», timeline Vercel): la percezione del tempo di una sessione lunga È
   SBAGLIATA per costruzione. `date` prima di ogni timestamp scritto.
3. 🛑 **DOPO UN'INTERRUZIONE, `git status` PRIMA DI RIDISPACCIARE:** l'esecutore interrotto può aver
   lasciato metà lavoro nell'albero condiviso. La rete del 9-ter è stata l'onestà dell'esecutore
   successivo (ha trattato il trovato come abbozzo NON fidato e ha ri-derivato RED→GREEN da zero).
4. 🔑 **I TIMEOUT DELLE SONDE REMOTE SI ALZANO PER GRUPPO, NON PER SONDA:** tre morti a 5006-5007 ms
   su margine 5000 in tre file diversi = una classe, non tre casi. `vitest.config.ts` → progetto
   `integration` a 15000 ms, con la prova per inversione (6000 ms passa lì, fallisce sotto `unit`).
5. 🔑 **LA REVISIONE FINALE DI UN RAMO GRANDE SI FA A FETTE PARALLELE** (banca · server · superfici,
   ~330 KB l'una) con mandato «solo integrazione fra task»: tre revisori, tre verdetti, un pomeriggio
   — e ha trovato ciò che nessuna revisione task-scoped poteva vedere (allowlist mancante sulla rotta
   gemella, GRANT senza vincolo di transizione, FK non composita).
6. 🛑 **`scripts/review-package` riscrive `.superpowers/sdd/.gitignore` a `*` — QUATTRO su quattro
   anche in questa sessione.** La regola «git status su quel file dopo ogni pacchetto» regge.
7. 🔑 **UN RIMANDATO SENZA RIGA IN CODA È UN RIMANDATO PERSO:** due riserve normative vivevano solo
   in handoff (§0②) e il contro-argomento della striscia è passato ATTRAVERSO un gate senza essere
   pesato (§0①). Il censimento di chiusura li ha presi — ma la rete giusta è dare la riga in coda
   NEL MOMENTO in cui si rimanda, non sperare nel censimento.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **Code 58 · 59** (strutturali banca dati) — PRIMA della prima onboarding reale.
2. 🔴 **Il contro-argomento sull'ordine della striscia** (§0①) — decisione di Francesco; se accolto,
   quattro righe in `src/lib/dashboard/striscia.ts` (`LIVELLO1_PER_RUOLO`).
3. 🟠 **Riga 61** (Art. 19 per-paziente + ricevuta parziale) — panel normativo, con le superfici archivio.
4. 🟠 **Collaudo al dito** (§0③) — cinque minuti sul telefono: foglio, pillola, banner home.
5. 🟠 **L'ondata di pulizia dei Minor** — il ledger le tiene tutte (`.superpowers/sdd/progress.md`,
   sezioni «rilievi MINORI»: M-T6-4/5/6 · M-T7-1…6 con il 7-3 per primo · M-T4q-1/2/3 · M-T8-1/2 ·
   M-T9t-1), più i due minori nuovi della revisione finale (docstring SCELTE · pattern audit).
6. 🟡 **Migrazione del portale a v3** (⚖️ D347) — assorbe le code 48 (tema scuro), 56 (doppio
   `<html>`) e il chip a 42px.
7. 🟡 **Coda 57** (stato «annullata» sovraccarico) — quando si tocca il modello delle dichiarazioni.

## 4. Da dove ripartire

1. **Questo handoff, §0** — poi la testa di `docs/roadmap/ROADMAP-UFFICIALE.md` (è aggiornata e dice
   il vero: in produzione, gancio Vercel FUNZIONANTE, code 58-61).
2. La decisione ① (striscia) se Francesco non ha già risposto al messaggio di chiusura.
3. Le code 58-59 sono il primo lavoro VERO di codice: percorso Grande (migration + RLS), panel non
   necessario (già istruite dalla revisione finale, referto `2026-08-11-revisione-finale-ramo-referto.md`).

## 5. Il minimo per non sbagliare

- 🛑 `date` in comando SEPARATO, sempre — e **l'ora non si stima MAI, nemmeno «a fine sessione»** (§0④).
- 🛑 `verify:full` da variabile, SENZA pipe, timeout 600000 · in locale salta le prove d'integrazione
  (137 in chiusura — attese); per accenderle: `set -a && . ./.env.local; set +a && npx vitest run`.
- 🗄️ Migration: orologio UNIVERSALE `date -u "+%Y%m%d%H%M%S"` (D311) · **pavimento `20260810072748`** ·
  si applicano da soli (D284) · il file NON è la prova: catalogo vivo via `node scripts/psql.mjs`.
- 🛑 Worktree VIETATI · D318 (`git status` prima, `git add <percorsi>`, MAI `-A`, messaggi con `-F`) ·
  il push di un ramo si esegue (permesso versionato) · i ruoli sono CINQUE.
- 🛑 Dopo ogni `review-package`: `git status` su `.superpowers/sdd/.gitignore` (4/4 anche stavolta).
- 🔑 Un'assenza nei registri esterni (deploy, webhook) si dichiara guasto solo alla SECONDA lettura.
- Accesso al banco: D103, `npx tsx scripts/link-accesso.ts` (per l'app locale si riusa il `token_hash`
  su `http://localhost:3000/auth/callback` — ricetta nel resoconto del Task 10-B).
