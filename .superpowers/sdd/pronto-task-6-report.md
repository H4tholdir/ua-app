# RESOCONTO — Task 6 «L'elenco degli effetti impara il bivio»

**Ramo:** `intervento-post-consegna` · **Base:** `190018ad` · **Data:** 07/08/2026
**Brief:** `.superpowers/sdd/pronto-task-6-brief.md` (emendato da **D312**)
**Nessuna migration.** Solo TypeScript: un modulo e due file di prove.

---

## 1. Che cosa NON è andato — i difetti trovati nel piano

Il piano è **buono**: tutte le righe che cita esistono davvero, e le ho riverificate una per una
(elenco in §3). Ma **tre cose non tornano**, e le riporto per prime.

### ① 🔴 Il marchio `provato:` del Passo 0 è SCADUTO — il comando non riproduce più l'output dichiarato

Il brief scrive, al Passo 0:

> `provato:` `grep -n "EFFETTI_PER_MOTIVO" docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`
> → **zero risultati**: nessuno dei dieci task la tocca.

**Rieseguito oggi: quattro risultati, non zero.**

```
$ cd "…/ua-app" && grep -n "EFFETTI_PER_MOTIVO" docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md
95:| `EFFETTI_PER_MOTIVO.destinatario_errato.azione` | `null` — il commento dice «*la transizione non esiste ancora*» | **`'torna_pronto'`**, commento riscritto (⚖️ **D312**). 🛑 Porta con sé **tre** asserzioni: `qualita-effetti.test.ts:33` · `:45` · `eventi-qualita-route.test.ts:823-838` | T6 |
631:- Modifica anche: la riga fissa `EFFETTI_PER_MOTIVO.destinatario_errato` (Passo 0) ·
638:`destinatario_errato` — vive in una riga **fissa** di `EFFETTI_PER_MOTIVO` e oggi porta `azione: null`
641:`provato:` `grep -n "EFFETTI_PER_MOTIVO" docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md`
```

**Come va letto, e perché NON è un difetto di sostanza:** l'affermazione era **vera** contro il piano
di ieri sera; è **l'emendamento D312 stesso** ad aver messo quel nome nel piano — la riga 95 è la voce
del censimento che assegna il lavoro a T6, e le righe 631-641 sono il testo emendato del Task 6.
**Ma sotto R-P1 conta lo stesso**: un marchio `provato:` il cui comando non riproduce più l'output
dichiarato **non è più riverificabile da chi legge dopo**, e chi lo rilancia oggi trova quattro hit
dove il piano gliene promette zero — cioè si trova davanti a un piano che sembra mentire.

➡️ **La riscrittura corretta per un lettore futuro** (verificata, output identico a quello promesso):
```
$ git show 83a899fd:docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md | grep -c "EFFETTI_PER_MOTIVO"
0
```

### ② ⚠️ Le «Interfacce» del brief e il suo blocco di codice si contraddicono sul tipo di `MOTIVI_CON_SCELTA`

- **Interfacce (riga 25 del brief):** `export const MOTIVI_CON_SCELTA: readonly Motivo[]`
- **Passo 3 (riga 151 del brief):** `… = ['difetto_lavorazione', 'difetto_materiale'] as const satisfies readonly Motivo[]`

**Non sono lo stesso tipo.** L'annotazione allarga a `readonly Motivo[]` (nove valori possibili); la
forma `as const satisfies` conserva la **tupla letterale** dei due valori veri.

➡️ **Ho spedito la forma del blocco di codice** (`as const satisfies`), perché è strettamente più
informativa, resta assegnabile ovunque serva un `readonly Motivo[]`, ed è quella che TypeScript 5.9.3
compila senza storie. **Chi esegue il Task 7 lo sappia:** `MOTIVI_CON_SCELTA` ha tipo
`readonly ['difetto_lavorazione', 'difetto_materiale']`, non `readonly Motivo[]`.

### ③ 🔴 La guardia D301/D302 andava allargata PRIMA del codice, non dopo — ho spostato il Passo 4 nel Passo 1

Il brief mette l'allargamento della guardia al **Passo 4**, cioè **dopo** aver scritto i due testi
nuovi. **Una guardia scritta dopo le stringhe che sorveglia non ha mai visto una stringa che viola il
divieto**: nasce verde e resta verde, e non c'è modo di sapere se guarda qualcosa.

🔑 **È esattamente la famiglia di difetto che il brief stesso nomina in quel Passo** — «*una prova che
non guarda la cosa non è una prova che la cosa sia giusta*». Applicarla in quell'ordine la
riprodurrebbe di un passo.

➡️ **Ho scritto la guardia allargata insieme alle altre prove (Passo 1), prima di qualsiasi codice**,
e ho aggiunto la prova che *si accende davvero* (§4.3). **Deviazione dichiarata, non silenziosa.**

---

## 2. I due numeri R-P4

**Metodo** (lo stesso del Task 2, per confrontabilità): un `expect()` che lancia interrompe le
asserzioni successive dello stesso `it`, quindi per contare **tutte** quelle che si accendono ho
duplicato il file con `expect.soft(` al posto di `expect(`, l'ho eseguito, e poi **cancellato**.

**L'abbozzo inerte** era:
```typescript
export const MOTIVI_CON_SCELTA = ['difetto_lavorazione', 'difetto_materiale'] as const
export const effettoDaMotivoEScelta = () => NEUTRO
```
⚠️ `MOTIVI_CON_SCELTA` è tenuta **reale** anche nell'abbozzo: è un elenco di due voci, cioè un dato,
non un comportamento — e senza di essa l'`import` del file di prove esplode e **non si conta niente**.
L'unica cosa resa inerte è la **funzione**. E la **riga fissa** di `destinatario_errato` era ancora
`azione: null`: l'abbozzo misura lo stato *prima* di tutto il Passo 0 ① e del Passo 3.

### Il primo rosso — genuino, prima di qualsiasi riga di codice

```
 FAIL  tests/unit/qualita-effetti.test.ts > … > il testo risolto NON ripete la domanda …
TypeError: effettoDaMotivoEScelta is not a function

 Test Files  2 failed (2)
      Tests  11 failed | 105 passed (116)
```

### 🔢 NUMERO 1 — **17 su 24**

Perimetro: **tutte** le asserzioni che questo task scrive o emenda sull'elenco degli effetti — le 22
del nuovo blocco `effettoDaMotivoEScelta` (contando le ripetizioni dei cicli) più le 2 emendate da D312.

```
$ npx vitest run tests/unit/qualita-effetti.SOFT-TEMP.test.ts
      Tests  7 failed | 13 passed (20)
```
Siti che si accendono (13 distinti; con le ripetizioni del ciclo D312 fanno **17**):
```
:45  ← emendata D312 — l'elenco dei motivi con azione
:62  ← emendata D312 — «persona sbagliata» porta l'azione
:196 :197 :198  ← difetto_lavorazione + si_sistema (3 su 3)
:203 :204 :205  ← difetto_materiale + si_rifa (3 su 3)
:210            ← senza scelta → riga non risolta (1 su 2)
:216            ← scelta su motivo che non la ammette (1 su 2)
:242 :243 :244  ← il ciclo D312 su tre porte (7 su 9)
```

### 🔢 NUMERO 2 — **6 su 7**

Perimetro: le **sole** prove che misurano il **ramo nuovo** — i due difetti risolti più il testo.
- `difetto_lavorazione + si_sistema` → 3 su 3 ✅
- `difetto_materiale + si_rifa` → 3 su 3 ✅
- **«il testo risolto non ripete la domanda» → 0 su 1** ❌

### 🛑 Che cosa quei numeri NON misurano — e va detto, o è falsa precisione

**a) La prova del testo NON si accende contro l'abbozzo inerte.** È un'asserzione **negativa**
(`not.toMatch`), e contro una funzione che restituisce la riga neutra il testo neutro non contiene la
domanda: passa. Discrimina però contro **l'implementazione plausibile-e-sbagliata** — quella che
restituisce `base` in ogni caso — perché lì il testo *è* la domanda aperta. È il caso che serve
davvero, ma il numero 2 la conta come non accesa, e così va letta: **6 su 7, non 7 su 7.**

**b) 🔴 SETTE asserzioni su 24 restano verdi contro l'abbozzo** — e va detto che nella prima stesura
di questo resoconto avevo scritto «quattro», che **non torna con i miei stessi numeri**: 24 − 17 = 7.
Il conto vero, riga per riga: prova 3 → 1 verde · prova 4 → 1 verde · prova 5 (prototipo) → 2 verdi ·
prova 6 (testo) → 1 verde · ciclo D312 → 2 verdi. **Totale 7**, e 17 + 7 = 24 ✓.

**Che cosa quelle sette non misurano:** le due `toBeNull` che l'abbozzo soddisfa **per caso** (la riga
neutra non porta azioni), le due della prova sul prototipo, la prova del testo, e le due del ciclo
D312 che passano perché la riga neutra e la riga vera coincidono su quei due campi.

**Il potere discriminante vero, detto senza sconti:** un'implementazione sbagliata che restituisse
sempre `effettoDaMotivo(motivo)` passerebbe le prove 3, 4 e 5, e fallirebbe le due dei difetti più
quella del testo. ⚠️ **La prova 7 (D312) la passerebbe anch'essa, ma SOLO perché questo task cambia
anche la riga fissa**: è il cambio della tabella a renderla verde, non la correttezza del bivio. Detto
altrimenti — **il numero 1 pesa due cose insieme** (la riga fissa e il ramo nuovo), ed è il numero 2
quello che parla del bivio.

**c) Il ciclo D312 si accende in gran parte per la RIGA FISSA, non per il ramo nuovo.** La sua prima
porta è `effettoDaMotivo('destinatario_errato')`: con l'abbozzo inerte fallisce perché la riga fissa
porta ancora `null` — niente a che vedere con la funzione. Delle sue 9 asserzioni, 1 misura la riga
fissa, 6 l'abbozzo, e 2 passano per caso.

**d) La guardia D301/D302 allargata (27 asserzioni) è ESCLUSA dal denominatore**, perché contro
l'abbozzo è verde al 100%: la riga neutra non contiene parole vietate. Il suo mordere è provato a
parte, iniettando una parola vietata — §4.3.

**e) La prova nuova nel file della rotta è fuori da questo conteggio** (file diverso, e dipende dalla
riga fissa, non dall'abbozzo): con la riga a `null` fallisce su `body.effetto.azione`.

---

## 3. Le modifiche, file per file

### `src/lib/qualita/effetti.ts`

| righe | che cosa |
|---|---|
| **26-40** | L'intestazione diceva «**UNA SOLA RIGA SU NOVE** ha un'azione automatica, e le altre otto…». Ora dice **due su nove**, con la ragione (D312 + PRONTO-4). Aggiunto il blocco che spiega **perché dichiarare un'azione che a questo task nessuno esegue non è uno degli «otto rami inerti» che il modulo vieta**: il ramo inerte finge di agire *per sempre*, qui il T6 dichiara e il T7 cabla, dentro la stessa ondata. |
| **75-79** | `AzioneAutomatica` allargata: `'riapri_lavoro' \| 'torna_pronto' \| 'crea_rifacimento'`, ognuna con la sua riga di spiegazione. |
| **84-85** | Il commento su `azione` diceva «una riga su nove» → corretto. |
| **137-157** | ⚖️ **Passo 0 ①** — `EFFETTI_PER_MOTIVO.destinatario_errato.azione`: `null` → **`'torna_pronto'`**. Il commento scaduto («la transizione … NON ESISTE ancora») è **riscritto**: dice che il PRONTO-4 l'ha costruita, perché non può essere `riapri_lavoro` (quella annulla sempre la dichiarazione), e che questo è il **terzo** motivo della spec §0 — quello che non passa dal bivio. `decisione` → `'D291 · D312'`. |
| **214-268** | **Nuovo:** `type Scelta`, `MOTIVI_CON_SCELTA`, `richiedeScelta`, `effettoDaMotivoEScelta`, con il censimento delle forme d'ingresso in testa (R-P4) e la nota esplicita che `destinatario_errato` **non** passa di qui. |

### `tests/unit/qualita-effetti.test.ts`

| righe | che cosa |
|---|---|
| **1-9** | `import` allargato a `effettoDaMotivoEScelta` e `MOTIVI_CON_SCELTA`. |
| **36-46** | ⚖️ **Passo 0 ② prima affermazione.** Il titolo diceva «è l'**UNICO** dei nove»; ora «sono **DUE**». `expect(conAzione).toEqual(['destinatario_errato', 'errore_registrazione'])`. **Riverificato sull'output**, non sulla riga del brief: l'ordine non è alfabetico, è quello di `MOTIVI` (`qualita-costanti.ts:21-31`, quarta e ottava voce) e `filter` lo conserva. |
| **50-63** | ⚖️ **Passo 0 ② seconda affermazione.** `expect(e.azione).toBeNull()` → `toBe('torna_pronto')`, e le **tre righe di commento scaduto** sostituite. |
| **134-162** | 🔴 **Passo 4, anticipato al Passo 1.** L'ingresso della guardia D301/D302 passa da **9** testi (i soli `MOTIVI`) a **13**: i nove della tabella fissa più i quattro esiti risolti (`MOTIVI_CON_SCELTA` × `si_sistema`/`si_rifa`). Aggiunto `expect(testi).toHaveLength(13)` — **il conteggio è parte della guardia**: senza, un `MOTIVI_CON_SCELTA` svuotato per errore farebbe restringere l'ingresso *in silenzio* e la prova tornerebbe verde perché non guarda più niente. |
| **193-247** | **Nuovo blocco** `describe('effettoDaMotivoEScelta — il bivio dei due difetti (D304)')`: le sette prove del Passo 1, verbatim dal brief, con i commenti che spiegano perché la prova sul testo non è cosmesi (`DevoIntervenire.tsx:468` stampa `effetto.perche` — verificato). |

### `tests/unit/eventi-qualita-route.test.ts`

| righe | che cosa |
|---|---|
| **824-843** | ⚖️ **Passo 0 ② terza affermazione.** `destinatario_errato` **esce** dal ciclo «GLI ALTRI OTTO MOTIVI NON la chiamano», che passa a **sei** motivi e cambia titolo. |
| **845-865** | **Prova nuova e dedicata**, con **entrambe** le cose che il brief chiede: `body.effetto.azione === 'torna_pronto'` **e** `expect(mockRpc).not.toHaveBeenCalled()`. 🛑 **La riga della RPC resta vera e non è stata toccata:** a questo task la rotta smista ancora solo `riapri_lavoro` (`eventi-qualita/route.ts:383-386`), e il commento dice a chi verrà che se quella riga si accende vuol dire che il T7 ha cablato lo smistamento — e allora va **aggiornata qui**, non aggirata. |

### 🛑 Che cosa NON ho toccato, e l'ho verificato invece di darlo per scontato

- **`src/app/api/lavori/[id]/eventi-qualita/route.ts`** — nessuna riga. È il mandato del T7.
- **`src/app/api/lavori/[id]/dichiarazione/riemetti/route.ts:129`** legge `effettoDaMotivo(motivo).documento !== 'riemetti'` — **`.documento`, non `.azione`**: il cambio della riga non lo può raggiungere. Prove verdi (`riemissione-route.test.ts`, 16 su 16).
- **`src/components/features/lavori/scheda-v3/DevoIntervenire.tsx:528`** legge solo `effettoDaMotivo('errore_registrazione').perche`, riga non toccata. Prove verdi.
- **`supabase/migrations/20260806210400_riapri_lavoro_atomica.sql:138-140`** — il riferimento che il
  mio commento nuovo eredita dal commento cancellato è stato **riverificato**, non copiato: quelle tre
  righe sono `UPDATE dichiarazioni_conformita SET stato = 'annullata' WHERE lavoro_id = … AND stato <>
  'annullata';`, cioè l'annullamento **incondizionato**. La citazione regge.
- Censimento completo dei consumatori (`grep -rn "effettoDaMotivo\|EFFETTI_PER_MOTIVO\|AzioneAutomatica" src tests`): **quattro** file sorgente, e sono i tre qui sopra più il modulo stesso. Nessun altro.

---

## 4. Gli output veri

### 4.1 `vitest` — i due file del mandato

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx vitest run tests/unit/qualita-effetti.test.ts tests/unit/eventi-qualita-route.test.ts 2>&1 | tail -12

 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 Test Files  2 passed (2)
      Tests  116 passed (116)
   Start at  22:11:06
   Duration  781ms (transform 176ms, setup 280ms, import 191ms, tests 35ms, environment 799ms)
```

### 4.2 `tsc` — uscita letta da variabile, non dietro una pipe

```
$ cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx tsc --noEmit > /tmp/tsc-t6.log 2>&1; echo "uscita=$?"; cat /tmp/tsc-t6.log
uscita=0
```
(`/tmp/tsc-t6.log` è **vuoto**.)

### 4.3 🔑 La guardia allargata MORDE — provata rompendola apposta

Senza questa prova, l'allargamento sarebbe verde dal primo istante e **non ci sarebbe nessuna
evidenza che guardi i testi nuovi**. Iniettata la parola vietata in uno dei due `perche` risolti:

```
$ perl -0pi -e "s/'Si sistema questo manufatto\. Il lavoro torna/'Si sistema questo pezzo. Il lavoro torna/" src/lib/qualita/effetti.ts
$ npx vitest run tests/unit/qualita-effetti.test.ts -t "D301/D302"

AssertionError: difetto_lavorazione + si_sistema — «pezzo» è vietato (D301: si dice «manufatto»):
  expected 'si sistema questo pezzo. il lavoro to…' not to match /\bpezzo\b/
- Expected: /\bpezzo\b/
+ Received: "si sistema questo pezzo. il lavoro torna fra quelli pronti e la dichiarazione resta valida: …"
```

🔑 **Il nome nell'errore è `difetto_lavorazione + si_sistema`**, cioè **un esito risolto** — non un
motivo della tabella fissa: è la prova che l'ingresso allargato è quello che ha visto la violazione.

Ripristino verificato byte per byte contro una copia presa **prima** dell'iniezione:
```
$ diff /tmp/effetti-backup-t6.ts src/lib/qualita/effetti.ts && echo "RIPRISTINO IDENTICO al backup pre-iniezione"
RIPRISTINO IDENTICO al backup pre-iniezione
```

### 4.4 I consumatori non si sono rotti

```
$ npx vitest run tests/unit/DevoIntervenire.test.tsx tests/unit/qualita-classifica.test.ts \
    tests/unit/qualita-costanti.test.ts tests/unit/qualita-motivi-ui.test.ts tests/unit/eventi-qualita-schema.test.ts
 Test Files  5 passed (5)
      Tests  127 passed (127)

$ npx vitest run tests/unit/riemissione-route.test.ts
 Test Files  1 passed (1)
      Tests  16 passed (16)
```

⚠️ **`npm run verify:full` NON è stato lanciato**, come chiesto dall'orchestratore.

---

## 5. Fuori mandato — riferito, non corretto (R-E2)

**Un solo ritrovamento, e non l'ho toccato.**

**`tests/unit/eventi-qualita-route.test.ts`, il commento di intestazione del blocco (righe 771-784)**
racconta la lezione della giuntura e dice, fra l'altro, che le prove che contano sono quelle che vanno
«dal motivo alla chiamata». **Resta vero**, ma dopo D312 il blocco contiene ora un caso —
`destinatario_errato` — in cui il motivo porta un'azione e **la chiamata deliberatamente non c'è**.
Non è un errore oggi (l'ho scritto nel commento della prova nuova), ma è **il testo che il Task 7 deve
rileggere** quando cabla lo smistamento: sarà lui a trasformare quel «non chiama» in «chiama
`riporta_a_pronto_atomica`», e l'intestazione andrà aggiornata insieme. **Non l'ho fatto io perché la
rotta non è il mio mandato** e un'intestazione riscritta oggi descriverebbe codice che non esiste
ancora — cioè lo stesso difetto che D312 è nata per chiudere.

**Nient'altro.** In particolare **non** ho trovato difetti di sostanza nel codice del Passo 3: compila,
gira, e le sette prove del Passo 1 sono corrette e coerenti con la spec §0.

---

## 6. Autorevisione — dove questo lavoro è debole

### Che cosa NON ho provato

1. **🔴 Che l'azione `torna_pronto` produca qualcosa.** Questo task **dichiara** e basta. Nessuna RPC
   viene chiamata, nessun lavoro torna a `pronto`, nessuna dichiarazione sopravvive. Tutto ciò che è
   verde qui è verde su una **tabella di valori**. Il primo momento in cui `torna_pronto` fa
   qualcosa è il **Task 7**, e il primo momento in cui qualcuno lo vede accadere sul banco è il
   **Task 10 Passo 1 ①**. **Finché non arrivano quei due, la finestra dichiarata è aperta.**
2. **Che `crea_rifacimento` sia il nome giusto.** L'ho scritto perché il piano lo dice; non esiste
   ancora nessun consumatore che lo smisti, quindi non c'è modo di sapere se regge il giro completo.
3. **Che i due testi nuovi vadano bene a schermo.** `DevoIntervenire.tsx:468` li stamperà; non ho
   aperto nessun viewport (non è il mandato, e il gate estetico L2 è il Task 10 Passo 3). Sono
   **più lunghi** dei testi che sostituiscono nel riquadro «E sul lavoro»: **chi fa la FASE 9 lo
   guardi**, perché un testo più lungo in un riquadro già disegnato è esattamente il caso che il
   confine D245 manda alla FASE 9 anche quando il gate L2 non è dovuto.

### Dove le prove sono più deboli di quanto sembrino

- **La prova del testo (§2, numero 2) non si accende contro l'abbozzo inerte.** È l'unica delle tre
  del ramo nuovo che non lo fa. Discrimina contro l'errore realistico (`return base` sempre), ma se
  qualcuno domani riscrivesse quella funzione in un modo terzo, quella prova potrebbe restare verde
  senza dire niente.
- **Il divieto è ancora una lista di due parole.** La guardia allargata vieta «pezzo» e «carta» sui
  13 testi. Non vieta la **terza** parola sbagliata che nessuno ha ancora scritto. L'allargamento
  toglie il buco dell'ingresso, non quello del vocabolario.
- **`richiedeScelta` è esportata ma non ha una prova sua.** La provano di rimbalzo le prove di
  `effettoDaMotivoEScelta` (i casi «senza scelta» e «motivo che non la ammette»). Il **Task 7 la
  consuma direttamente** per decidere il 422: se le serve un comportamento che qui non è misurato
  (per esempio su un ingresso fuori vocabolario), **se lo provi lui**.

### BP-1 — rinviata, non dimenticata

`CLAUDE.md` §0A impone di aggiornare `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md` dopo
ogni task che cambia lo stato del progetto. **Qui non l'ho fatto, e la ragione è nel piano:** BP-1 è
assegnata esplicitamente al **Task 10, Passo 4**. È anche la scelta giusta nel merito —
`AzioneAutomatica` che guadagna due valori **non è uno stato spedibile** finché il Task 7 non caba lo
smistamento: scriverlo in memoria oggi vorrebbe dire dichiarare fatta una cosa che non fa ancora
niente. **Lo segnalo perché un obbligo rinviato di proposta deve vedersi come rinviato**, non
sembrare dimenticato.

### Che cosa deve sapere il prossimo compito (Task 7)

1. **`MOTIVI_CON_SCELTA` è una tupla letterale**, non `readonly Motivo[]` — v. §1 ②.
2. **`destinatario_errato` NON passa da `effettoDaMotivoEScelta`.** La sua azione arriva dalla riga
   fissa, quindi `effettoDaMotivoEScelta('destinatario_errato', qualunque_cosa)` restituisce sempre
   quella riga. Lo smistamento su `effetto.azione === 'torna_pronto'` **lo raccoglie comunque**, ed è
   il punto: è così che il Task 10 Passo 1 ① nascerà verde invece che rossa.
3. **Nel file di prove della rotta c'è ora una prova che asserisce `not.toHaveBeenCalled()` proprio
   su `destinatario_errato`** (righe 845-865). **È il perimetro di questo task, e il Task 7 DEVE
   cambiarla** — non aggirarla, non cancellarla: sostituire l'asserzione «nessuna RPC» con «chiama
   `riporta_a_pronto_atomica`». Se la lascia com'è e implementa lo smistamento, il file diventa
   rosso e l'errore avrà l'aria di una regressione. **È scritto anche nel commento sopra la prova.**
4. **L'intestazione del blocco (righe 771-784) va riletta insieme**, v. §5.
