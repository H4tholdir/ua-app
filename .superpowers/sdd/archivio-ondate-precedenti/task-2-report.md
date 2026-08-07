# Task 2 — Referto

**Branch:** `accenti-documenti` (già attiva, non creata da me)
**Brief:** `.superpowers/sdd/task-2-brief.md`
**Stato finale:** `DONE` — commit creato dopo la correzione del piano ricevuta dal coordinatore. Vedi §9-11.

## 0. Verifica preliminare (numeri di riga e stringhe citate dal brief)

Prima di toccare qualunque file ho riletto `src/components/features/pdf/DdcTemplate.tsx` alle sei
righe citate e `tests/unit/ddc-pdf-content.test.ts:109-112` + fixture (riga 62, dichiarazione
`const` di `DDC_FIXTURE` a riga 27). **Tutto corrispondeva esattamente** a come il brief lo cita:
righe 292, 294, 326, 446, 486, 514 nel template; righe 109-112 nel test; `contiene_sostanze_o_tessuti:
false` a riga 62. Nessuna discrepanza in questa fase — si può procedere.

## 1. Step 1 — gira il test che oggi fissa il refuso

Sostituito `tests/unit/ddc-pdf-content.test.ts:109-112` con i tre test del brief, trascritti
verbatim (nessuna riscrittura).

## 2. Step 2 — conta i rossi (R-P4)

Comando:
```
npx vitest run tests/unit/ddc-pdf-content.test.ts
```
Output reale (riepilogo):
```
 ❯ tests/unit/ddc-pdf-content.test.ts (38 tests | 3 failed) 247ms
     × il titolo porta l'accento: «DICHIARAZIONE DI CONFORMITÀ» 3ms
     × l'etichetta della firma porta l'accento 2ms
     × il titolo del §7 porta l'accento 1ms
...
 Test Files  1 failed (1)
      Tests  3 failed | 35 passed (38)
```

**3 rossi su 3 asserzioni nuove — corrisponde all'atteso del brief.**

⚠️ **Ma uno dei tre rossi non misura quello che crede** (trovato durante l'autorevisione di
mutazione, §4 sotto): il terzo test (titolo del §7) è andato rosso alla PRIMA riga (`§7 —
Dichiarazione di Conformità` non trovato), non perché l'accento mancasse — mancava già a monte in
quel momento, quindi non si poteva ancora distinguere le due cause. Il problema vero è emerso
dopo la correzione (§3), quando quel test è rimasto rosso anche a fix applicato: vedi §5.

## 3. Step 3 — correggo le sei stringhe

`src/components/features/pdf/DdcTemplate.tsx`, una alla volta, alla lettera del brief:

| Riga | Prima | Dopo |
|------|-------|------|
| 292 | `` `Dichiarazione di Conformita ${ddc.numero_ddc ?? ''}` `` | `` `Dichiarazione di Conformità ${ddc.numero_ddc ?? ''}` `` |
| 294 | `"Dichiarazione di Conformita MDR 2017/745"` | `"Dichiarazione di Conformità MDR 2017/745"` |
| 326 | `Dichiarazione di Conformita` | `Dichiarazione di Conformità` |
| 446 | `'Si — vedere documentazione allegata'` | `'Sì — vedere documentazione allegata'` |
| 486 | `§7 — Dichiarazione di Conformita` | `§7 — Dichiarazione di Conformità` |
| 514 | `Responsabile della Conformita (PRRC)` | `Responsabile della Conformità (PRRC)` |

Riletto `:444-448` dopo la modifica: il ternario `ddc.contiene_sostanze_o_tessuti ? (... ?? 'Sì —
…') : 'No'` ha **lo stesso ordine dei rami** di prima — cambiata solo la stringa dentro `?? '…'`.

`git diff` del file conferma che **solo le sei righe** sono toccate (nessuna riga in più):
```diff
-      title={`Dichiarazione di Conformita ${ddc.numero_ddc ?? ''}`}
+      title={`Dichiarazione di Conformità ${ddc.numero_ddc ?? ''}`}
-      subject="Dichiarazione di Conformita MDR 2017/745"
+      subject="Dichiarazione di Conformità MDR 2017/745"
-          <Text style={styles.titolo}>Dichiarazione di Conformita</Text>
+          <Text style={styles.titolo}>Dichiarazione di Conformità</Text>
-                ? (ddc.sostanze_tessuti_dettaglio ?? 'Si — vedere documentazione allegata')
+                ? (ddc.sostanze_tessuti_dettaglio ?? 'Sì — vedere documentazione allegata')
-          <Text style={styles.sectionTitle}>§7 — Dichiarazione di Conformita</Text>
+          <Text style={styles.sectionTitle}>§7 — Dichiarazione di Conformità</Text>
-            <Text style={styles.firmaLabel}>Responsabile della Conformita (PRRC)</Text>
+            <Text style={styles.firmaLabel}>Responsabile della Conformità (PRRC)</Text>
```

## 4. Step 4 — atteso "tutti verdi": NON raggiunto, e la causa è un difetto del brief

Comando:
```
npx vitest run tests/unit/ddc-pdf-content.test.ts
```
Output reale (riepilogo):
```
 ❯ tests/unit/ddc-pdf-content.test.ts (38 tests | 1 failed) 244ms
     × il titolo del §7 porta l'accento
...
 FAIL  ... > il titolo del §7 porta l'accento
AssertionError: expected '...' to contain '§7 — Dichiarazione di Conformità'
+ §7 — DICHIARAZIONE DI CONFORMITÀ
 Test Files  1 failed (1)
      Tests  1 failed | 37 passed (38)
```

**Trovato: `styles.sectionTitle` (`DdcTemplate.tsx:83-92`, riga 86) porta
`textTransform: 'uppercase'`.** Il titolo del §7 (come tutti i titoli di sezione: §1, §3, §4, §5,
§6, §6-bis, §8) viene quindi reso in maiuscolo nel PDF: `§7 — DICHIARAZIONE DI CONFORMITÀ`, non
`§7 — Dichiarazione di Conformità` come scritto nell'asserzione del brief.

**L'accento È presente e corretto** (`CONFORMITÀ`, non `CONFORMITA`) — la correzione del template
a riga 486 è quindi verificata come giusta dal testo estratto reale. È **solo l'asserzione del
test del brief** ad avere il maiuscolo/minuscolo sbagliato: il brief stesso, nel primo test dello
stesso step, spiega correttamente perché il titolo principale va in maiuscolo (`styles.titolo` ha
lo stesso `textTransform: 'uppercase'` — verificato) ma non ha applicato lo stesso ragionamento al
titolo di sezione del §7, che condivide lo stile `sectionTitle` con tutti gli altri titoli di
sezione del documento (tutti già maiuscoli, es. "§1 — FABBRICANTE" visibile nel testo estratto).

🛑 **Per le regole del mio mandato ("se una stringa nel file è diversa da come il brief la cita,
fermati e riferiscilo invece di adattarti in silenzio") non ho corretto questa asserzione da solo.**
Ho lasciato il test come scritto nel brief — quindi **rosso** — e non ho proceduto al commit
(vedi §5 per le due correzioni candidate).

### Scoperta collaterale durante l'indagine: la prima asserzione del test 1 non è isolata

Per capire se l'asserzione `expect(pdfText).toContain('DICHIARAZIONE DI CONFORMITÀ')` (test
"il titolo porta l'accento") testasse davvero **solo** il titolo principale (riga 326), ho fatto
una mutazione esplorativa: ho rimesso `Dichiarazione di Conformita` (senza accento) alla sola
riga 326, lasciando il §7 corretto. **Il test è rimasto verde** — perché `§7 — DICHIARAZIONE DI
CONFORMITÀ` (maiuscolo, con accento, dovuto al medesimo `textTransform: 'uppercase'`) **contiene
come sottostringa** `DICHIARAZIONE DI CONFORMITÀ`, soddisfacendo l'asserzione anche se il titolo
principale fosse rimasto rotto. Ho confermato isolando le due occorrenze (sostituendo
temporaneamente il testo del §7 con una stringa senza quella sottostringa): con l'isolamento, la
stessa mutazione sulla riga 326 fa correttamente scattare il rosso.

Ho anche verificato la seconda parte di quella stessa asserzione,
`expect(pdfText).not.toContain('DICHIARAZIONE DI CONFORMITA ')` (nota lo spazio finale): nel testo
estratto da `pdf-parse`, dopo `CONFORMITA`/`CONFORMITÀ` segue sempre un fine riga, mai uno spazio —
quindi questa parte dell'asserzione **non ha mai la possibilità di accendersi**, né prima né dopo
la correzione. Non è un difetto che blocchi qualcosa (l'altra metà della stessa asserzione fa il
suo lavoro), ma è un'asserzione morta: la segnalo per trasparenza, nessuna azione presa (fuori
mandato modificare l'asserzione).

Entrambe le mutazioni esplorative sono state fatte e **rimesse** immediatamente al valore corretto;
`git diff` a fine sessione conferma che il file finale contiene solo le sei sostituzioni previste
(vedi tabella §3), nessuna traccia delle prove.

## 5. Step 5-6 — il ramo del «Sì» e la prova che morde

Nonostante il test 3 (titolo §7) resti bloccato dal difetto di brief sopra descritto, ho comunque
completato gli step indipendenti 5 e 6 — non toccano la stessa asserzione e portano la suite a uno
stato verificabile, invece di lasciare il lavoro fermo in attesa di una decisione altrui.

**Step 5** — aggiunto in fondo al file, verbatim dal brief, il blocco
`describe('DdcTemplate — sostanze o tessuti presenti (ramo non coperto fino al 03/08/2026)', ...)`.
Uso lo spread `{ ...DDC_FIXTURE, ... }`, `DDC_FIXTURE` non è stata mutata.

**Step 6** — comando:
```
npx vitest run tests/unit/ddc-pdf-content.test.ts
```
Output reale (riepilogo):
```
 Test Files  1 failed (1)
      Tests  1 failed | 38 passed (39)
```
Il nuovo test è tra i 38 verdi (unico rosso: il test 3 già discusso).

**Prova che morde**, eseguita come richiesto: ho cambiato a mano riga 446 da
`'Sì — vedere documentazione allegata'` a `'Si — vedere documentazione allegata'`, poi:
```
npx vitest run tests/unit/ddc-pdf-content.test.ts -t "rende «Sì»"
```
Output reale:
```
 FAIL  ... > rende «Sì» con l'accento quando il dispositivo contiene sostanze o tessuti
AssertionError: expected '...' to contain 'Sì — vedere documentazione allegata…
 Tests  1 failed | 38 skipped (39)
```
**Diventato rosso, come atteso.** Rimesso subito `'Sì — vedere documentazione allegata'` a riga
446. Verifica finale:
```
npx vitest run tests/unit/ddc-pdf-content.test.ts
 Test Files  1 failed (1)
      Tests  1 failed | 38 passed (39)
```
Stato tornato identico a prima della mutazione: 38 verdi, 1 rosso (il test 3, difetto di brief).

## 6. Step 7 — commit: NON eseguito

**Non ho fatto il commit.** La suite ha un test rosso (`il titolo del §7 porta l'accento`), e
committare con un test rosso — o modificare quel test di mia iniziativa per farlo passare —
sarebbe esattamente l'«adattarsi in silenzio» che il mio mandato vieta. Il difetto è dentro al
file che sto scrivendo io (non è un ritrovamento fuori mandato ai sensi di R-E2), ma è comunque
un'incongruenza del BRIEF, non mia: la correzione dell'asserzione non è indicata da nessuna parte
nel brief, quindi la scelta va fatta da chi ha scritto il piano.

`git status` a fine sessione:
```
 M src/components/features/pdf/DdcTemplate.tsx
 M tests/unit/ddc-pdf-content.test.ts
```
Nessun altro file toccato. Nessun commit creato. Le sei stringhe del template sono corrette e
verificate dal testo estratto reale; il file di test contiene tutti i cambi richiesti tranne che
per la decisione sul test 3, lasciato **esattamente come scritto nel brief** (quindi rosso).

## 7. Decisione richiesta a chi ha scritto il piano

`expect(pdfText).toContain('§7 — Dichiarazione di Conformità')` (riga 123 del test, come scritta
dal brief) non può passare: `styles.sectionTitle` (`DdcTemplate.tsx:86`) porta
`textTransform: 'uppercase'`, quindi il PDF stampa `§7 — DICHIARAZIONE DI CONFORMITÀ` — accento
presente e corretto, solo maiuscolo. Due correzioni candidate, entrambe di una riga:

- **(a)** asserire la stringa maiuscola: `expect(pdfText).toContain('§7 — DICHIARAZIONE DI
  CONFORMITÀ')` — stesso pattern già usato dal brief per il titolo principale nello stesso step.
- **(b)** asserire case-insensitive sulla forma accentata:
  `expect(pdfText.toLowerCase()).toContain('§7 — dichiarazione di conformità')`.

La (a) sembra la scelta coerente con il resto del file (che distingue già "titolo case-insensitive
storico" da "titolo case-sensitive nuovo" proprio perché sa del maiuscolo forzato), ma non è una
decisione che spetta a questo esecutore.

## 8. Ritrovamenti fuori mandato (R-E2) — nessuno

Nessun difetto trovato fuori dai due file assegnati. Le due scoperte di questo referto (§4) sono
entrambe dentro `tests/unit/ddc-pdf-content.test.ts`, il file che il mio mandato copre — le
riferisco qui invece di correggerle perché la correzione richiede una decisione di merito (quale
forma dell'asserzione tenere) che il brief non mi ha delegato, non perché siano fuori dal file che
tocco.

## 9. Correzione del piano ricevuta dal coordinatore

Il coordinatore ha confermato la diagnosi del §4/§7: `styles.sectionTitle` porta
`textTransform: 'uppercase'`, mentre `styles.firmaLabel` (`DdcTemplate.tsx:145-149`) **non** ce
l'ha — quindi le due asserzioni (§7 e firma) devono avere forme diverse, ed è il piano ad avere
sbagliato sulla prima. Piano corretto, con due istruzioni:

1. **Asserzione del §7** → deve pretendere il maiuscolo:
   `expect(pdfText).toContain('§7 — DICHIARAZIONE DI CONFORMITÀ')`.
2. **Sostituire l'asserzione morta** (`not.toContain('DICHIARAZIONE DI CONFORMITA ')`, spazio
   finale, mai raggiungibile — vedi §4) con una rete che vale per **tutto il foglio**, non un
   punto solo:
   ```ts
   expect(pdfText).toContain('DICHIARAZIONE DI CONFORMITÀ')
   expect(pdfText).not.toContain('CONFORMITA')
   expect(pdfText).not.toContain('Conformita')
   ```
   (`À ≠ A`: nessuna occorrenza accentata è sottostringa della forma senza accento, quindi questa
   rete non ha il problema di sovrapposizione descritto nella "Scoperta collaterale" del §4.)

Applicate entrambe le correzioni, verbatim dalle istruzioni del coordinatore, in
`tests/unit/ddc-pdf-content.test.ts:109-132`. Aggiunto anche un commento a ciascuno dei due test
(§7 e firma) che nomina esplicitamente la riga di stile che decide la forma attesa
(`DdcTemplate.tsx:86` per il maiuscolo forzato del §7, l'assenza dello stesso per `firmaLabel`),
così la ragione della differenza resta nel file e non solo in chat.

## 10. Verifica dopo la correzione

Comando:
```
npx vitest run tests/unit/ddc-pdf-content.test.ts
```
Output reale:
```
 Test Files  1 passed (1)
      Tests  39 passed (39)
```
**Tutti verdi, 39/39** — inclusi i due test corretti e il test del ramo «Sì» aggiunto agli step
5-6.

### Prova che mordono anche le due righe nuove (richiesta dal coordinatore, punto 4)

Ho guastato a mano **uno solo dei sei punti**: riga 486 (`§7 — Dichiarazione di Conformità` →
`§7 — Dichiarazione di Conformita`, accento tolto), poi rilanciato:
```
npx vitest run tests/unit/ddc-pdf-content.test.ts --reporter=verbose
```
Output reale (riepilogo):
```
 × il titolo porta l'accento: «DICHIARAZIONE DI CONFORMITÀ»
 ...
 × il titolo del §7 porta l'accento
 Test Files  1 failed (1)
      Tests  2 failed | 37 passed (39)
```
**Si sono accesi DUE rossi**, non uno: il test puntuale del §7 (atteso) **e** il test "il titolo
porta l'accento" tramite la nuova rete `not.toContain('CONFORMITA')` — la prova che la rete
generale morde anche su un punto che non è "il suo" (il titolo principale, riga 326, era intatto:
la rete si è comunque accesa perché la stringa rotta compare ovunque nel foglio, non solo dove la
guardo di proposito). Rimesso subito `§7 — Dichiarazione di Conformità` a riga 486; riverificato
`npx vitest run tests/unit/ddc-pdf-content.test.ts` → di nuovo **39/39 verdi**.

## 11. Step 7 — commit

`git status` prima del commit:
```
 M src/components/features/pdf/DdcTemplate.tsx
 M tests/unit/ddc-pdf-content.test.ts
```
Nessun altro file toccato — nessuna traccia delle mutazioni esplorative o della prova per
mutazione (tutte rimesse prima di questo punto).

Comandi eseguiti:
```
git add src/components/features/pdf/DdcTemplate.tsx tests/unit/ddc-pdf-content.test.ts
git commit -F /tmp/msg-task2.txt
```
Messaggio (file fuori dal repo):
```
fix(ddc): gli accenti nel documento — e il test smette di fissare il refuso (D104)

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```
Output reale:
```
[accenti-documenti 3e2e4521] fix(ddc): gli accenti nel documento — e il test smette di fissare il refuso (D104)
 2 files changed, 44 insertions(+), 9 deletions(-)
```
Pre-commit hook completo ed eseguito (non saltato): lint (`eslint --max-warnings=0`), DS compliance
(v2.3 legacy + v3), guardia CSRF, guardia coerenza documenti — tutti verdi.

`git status` dopo il commit:
```
 M docs/superpowers/plans/2026-08-03-accenti-documenti.md
```
Unico file rimasto modificato: il documento di piano, toccato dal coordinatore (non da me) per la
correzione ricevuta al §9 — fuori dal mio mandato, non lo tocco.

**Hash finale:** `3e2e4521`.
