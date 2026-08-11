# P31 — Referto revisione finale (03/08/2026)

Ramo `p31-due-numeri-per-il-cliente`, non pubblicato. Chiusi i tre rilievi della revisione finale
(R1 · R3 · R5) prima della decisione di Francesco sull'unione.

---

## R1 🔴 — Il tasto muore al secondo tentativo

**File:** `src/components/features/clienti/ChiediCellulareSheet.tsx`

### Il meccanismo confermato

`ChiediCellulareSheet` è montato **incondizionatamente** dai cinque chiamanti (v. R3): il genitore
tocca solo la prop `aperto`, il componente stesso non si smonta mai — il suo stato (`cellulare`,
`invio`, `guasto`) sopravvive alla chiusura. Nel percorso di successo di `salvaEInvia`,
`setInvio(false)` non veniva **mai** chiamato: viveva solo nei due rami di errore. Nessun reset
esisteva neppure per `cellulare` alla chiusura/riapertura. Risultato: dopo un salvataggio riuscito,
riaprendo lo stesso foglio, il tasto restava disabilitato («Un attimo…») **per sempre**, col numero
della volta precedente già scritto nel campo.

### Strada scelta, e perché

Fra le due proposte, ho scelto la **seconda**: azzerare lo stato quando `aperto` diventa falso,
invece del solo `setInvio(false)` nel ramo di successo.

**Perché:** la prima strada (un `setInvio(false)` in più dopo `onSalvato(...)`) chiude SOLO il
sintomo «tasto morto», ma lascia vivo un secondo difetto che la revisione stessa segnalava come da
notare comunque: il campo si ripresenterebbe già compilato con il numero della volta precedente (chi
riapre il foglio per un cliente diverso, o per correggere un errore di battitura, si troverebbe il
numero sbagliato già scritto). La seconda strada chiude **entrambi** con la stessa riga di
ragionamento, nello stesso punto (il momento in cui il foglio si richiude), e non richiede di
duplicare il reset in tre punti diversi (i due `catch`/ramo-errore avrebbero comunque bisogno del
proprio reset per il caso «utente corregge dopo un errore e riprova» — quello resta invariato).

### Un dettaglio emerso in corsa: l'effect violava una regola lint del repo

La prima implementazione usava un `useEffect(() => { if (aperto) return; ... }, [aperto])`.
`npx eslint --max-warnings 0` (regola CI, vedi `CLAUDE.md` §10) lo ha bocciato:
`react-hooks/set-state-in-effect` — chiamare `setState` dentro un effect senza un vero evento
esterno è sconsigliato (cascading render). Ho sostituito l'effect col pattern ufficiale React
*"adjusting state when a prop changes"*: si confronta `aperto` con l'ultimo valore visto
(`apertoVisto`, un secondo `useState`) **durante il render**, e si azzera lì se il valore è appena
cambiato a falso — nessun effect, nessun giro di render in più, lint pulito. Comportamento
osservabile identico (verificato: la prova discriminante sotto passa invariata con entrambe le
implementazioni).

### La prova che discrimina

Aggiunte a `tests/unit/consegna-chiede-il-cellulare.test.tsx` (uno dei cinque chiamanti,
`FrameConsegnato`, che monta il foglio incondizionatamente esattamente come descritto nel
rilievo) **due prove separate**, apposta perché la prima stesura (un solo test con più `expect` in
fila) falliva già sul primo controllo e non arrivava mai a esercitare il sintomo vero — la
sostituzione è nata da una revisione dell'advisor a questo stesso referto, e la incollo qui perché
è la ragione per cui il rosso sotto è in due parti:

- **Prova A — il sintomo VERO di R1:** apre il foglio, scrive il numero, salva con successo (fetch
  200), verifica che il foglio si chiuda, riapre lo STESSO foglio (mai smontato), **riscrive
  subito** un numero (senza assumere nulla sul contenuto precedente del campo — quello è compito
  della prova B) e verifica che il tasto **non** resti bloccato su «Un attimo…».
- **Prova B — il difetto in più che la strada scelta chiude:** stessa sequenza, poi verifica che il
  campo NON si ripresenti già scritto dalla volta precedente.

**ROSSO (codice non corretto — component ripristinato da `git show HEAD~1` prima del fix, SOLO per
questa misura, poi ripristinato):**
```
❯ tests/unit/consegna-chiede-il-cellulare.test.tsx (6 tests | 2 failed) 647ms
   × dopo un salvataggio riuscito, riaperto il foglio il tasto torna DAVVERO premibile (non resta bloccato da un salvataggio precedente) 150ms
   × dopo un salvataggio riuscito, riaperto il foglio il campo NON si ripresenta già scritto dalla volta precedente 101ms

FAIL ... > dopo un salvataggio riuscito, riaperto il foglio il tasto torna DAVVERO premibile (non resta bloccato da un salvataggio precedente)
Error: expect(element).not.toBeInTheDocument()
expected document not to contain element, found <p
  style="font-size: 15.5px; color: var(--muted); margin: 8px 0px 0px;"
>
  Un attimo…
</p> instead
 ❯ tests/unit/consegna-chiede-il-cellulare.test.tsx:142:50

FAIL ... > dopo un salvataggio riuscito, riaperto il foglio il campo NON si ripresenta già scritto dalla volta precedente
AssertionError: expected '333 1234567' to be '' // Object.is equality
- Expected
+ Received
+ 333 1234567
 ❯ tests/unit/consegna-chiede-il-cellulare.test.tsx:161:25

 Test Files  1 failed (1)
      Tests  2 failed | 4 passed (6)
```

Prova A rossa: il tasto resta letteralmente inchiodato su «Un attimo…» anche dopo aver riscritto un
numero nuovo — è la prova diretta che `invio` restava bloccato a `true` per sempre dopo un
salvataggio riuscito, indipendentemente da cosa contenesse il campo.

**VERDE (dopo il fix, versione finale col pattern "adjust in render"):**
```
 RUN  v4.1.6 /Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  19:39:18
   Duration  1.37s
```

---

## R3 — «Quattro» è diventato cinque

### Il numero vero, contato sul codice

```
grep -rn "ChiediCellulareSheet" src/ --include="*.tsx" --include="*.ts" | grep -v test
```

Import in **4 file**, ma **5 mount JSX** (`<ChiediCellulareSheet ... />`) — `EstrattoContoView.tsx`
lo monta **due volte** (sollecito globale dell'estratto conto + `DovutoBottomSheet`, sollecito sul
singolo dovuto, definito nello stesso file):

| # | file | riga | che cos'è |
|---|---|---|---|
| ① | `FrameConsegnato.tsx` | 166 | la consegna (D183) |
| ② | `EstrattoContoView.tsx` (`DovutoBottomSheet`) | ~183 | sollecito su un singolo dovuto |
| ③ | `EstrattoContoView.tsx` | ~415 | sollecito globale dell'estratto conto |
| ④ | `ScadenzarioList.tsx` | 379 | sollecito dall'elenco |
| ⑤ | `TabAccettazione.tsx` | 803 | conferma ricezione al dentista (D187, il quinto) |

**Il numero vero è cinque**, e coincide con quello che il commento della prop `nomeDestinatario`
(riga ~48 dello stesso file) già diceva correttamente — la riga 8-9 in cima al file era quella
rimasta indietro.

### Cosa ho corretto

- `src/components/features/clienti/ChiediCellulareSheet.tsx:8-9` — «lo montano quattro schermate»
  → «lo montano CINQUE punti di montaggio», con nota che il numero va contato sul codice, non
  dedotto.
- `docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md`:
  - riga 281 («In quattro punti») → «In cinque punti», con lo storico (quattro da D185, cinque da
    D187);
  - riga 299 («lo montano quattro schermate») → «lo montano cinque punti di montaggio»;
  - tabella §6: aggiunta la riga ⑤ `TabAccettazione.tsx:783` — «conferma ricezione al dentista
    (accettazione in ingresso, D187)».

### Cosa NON ho toccato, e perché

Il documento ha **altre** tabelle con conteggi vicini ma di un concetto diverso — non «punti di
montaggio di `ChiediCellulareSheet`», ma «punti che leggono per mandare WhatsApp» (§4.2, «sei punti,
non cinque e non tre») e «punti di trasporto» (§4.2-bis, «nove punti di trasporto per cinque punti
d'uso»). Sono già corretti e già includono l'accettazione (riga ⑥ di quella tabella, un messaggio
DIVERSO — «Abbiamo ricevuto il lavoro», costruito a mano, non passa da `ChiediCellulareSheet`): fuori
mandato, e comunque non richiedevano correzione.

---

## R5 — Il commento che non era vero

**File:** `src/app/api/clienti/route.ts:5-11` (numerazione originale) → ora righe 9-24.

**Verificato:** `src/app/(app)/clienti/[id]/page.tsx:296` ha `<InfoRow label="Telefono" ...>` e
nessuna riga per `cellulare_whatsapp` in nessun punto della pagina (il campo arriva nello stato
React — riga 266 — solo per essere passato al pannello di modifica, `ClienteEditSheet`, che è un
form, non una vista di sola lettura). Il commento («il cellulare si vede sulla scheda») era falso.

**Corretto:** il commento ora dice che il cellulare **non è ancora visibile in nessuna vista di sola
lettura**, con il rimando alla voce di roadmap che lo coprirà — **P30/P30-a**, individuata
verificando `docs/roadmap/ROADMAP-UFFICIALE.md` (la voce P31 già segnalava questo stesso
ritrovamento come fuori mandato, sede naturale P30/P30-a).

**Non toccato, per istruzione esplicita (§0B):** la scheda cliente in sola lettura. Nessuna riga
`cellulare_whatsapp` aggiunta a `clienti/[id]/page.tsx`.

### Ritrovamento secondario, riferito e NON corretto (come richiesto)

La scheda cliente (`clienti/[id]/page.tsx:296`) dice ancora **«Telefono»**, mentre il pannello di
modifica (`ClienteEditSheet.tsx:345,351`) dice **«Telefono dello studio»**. Stessa colonna, due
etichette diverse — coerente con la sede P30/P30-a quando la scheda verrà aggiornata per mostrare
entrambi i numeri.

---

## Verifiche (output reale)

```
$ npx vitest run tests/unit/consegna-chiede-il-cellulare.test.tsx tests/unit/scadenzario-chiede-il-cellulare.test.tsx tests/unit/accettazione-chiede-il-cellulare.test.tsx

 Test Files  3 passed (3)
      Tests  16 passed (16)
```

```
$ npx tsc --noEmit
(nessun output — 0 errori)
```

```
$ npx next build
✓ Compiled successfully in 6.4s
  Running TypeScript ...
  Finished TypeScript in 12.8s ...
✓ Generating static pages using 15 workers (81/81) in 218ms
  Finalizing page optimization ...
(81 rotte, nessun errore)
```

Rieseguite anche, per prudenza (non richieste esplicitamente ma toccate da questa sessione):

```
$ npx eslint src/ --ext .ts,.tsx --max-warnings 0
(nessun output — 0 problemi)

$ npx vitest run   # suite intera
 Test Files  394 passed | 3 skipped (397)
      Tests  4542 passed | 19 skipped (4561)
```
(4542 invece di 4540 in `MEMORY.md`/roadmap: +2 sono le due prove discriminanti aggiunte qui
(prova A + prova B, sostituite a un unico test iniziale insufficiente — v. sopra), nessuna
regressione altrove.)

---

## Dubbi e osservazioni

- Il pattern scelto per R1 nella versione finale (state adjustment in render, non `useEffect`) è
  meno comune di quanto ci si aspetterebbe leggendo la documentazione React "media": è però il
  pattern che i React docs stessi raccomandano per "resettare lo stato quando cambia una prop", ed
  è quello che soddisfa la regola lint attiva in questo repo. Segnalo la scelta esplicitamente
  perché non è quella proposta nei due suggerimenti originali del rilievo (entrambi assumevano un
  `useEffect`).
- Non ho trovato altri punti nel repo (fuori da questo file e dalla spec) che citassero «quattro
  schermate»/«quattro punti» riferendosi a `ChiediCellulareSheet`. Il piano storico
  (`docs/superpowers/plans/2026-08-03-p31-due-numeri-per-il-cliente.md:1133`) cita ancora «quattro
  punti», ma è un documento di piano congelato (fotografia di una decisione passata, non una fonte
  vivente) — non l'ho toccato, fuori mandato e fuori dalla lista dei due file indicati dal
  rilievo.
- 🔔 **Il pre-commit ha segnalato BP-1** («questo salvataggio tocca un VERBALE o una SPEC ma NON la
  memoria»): ho toccato la spec di design ma non `MEMORY.md`/`ROADMAP-UFFICIALE.md`. Non l'ho
  deciso da solo: la voce P31 in `ROADMAP-UFFICIALE.md` dice ancora **«FATTA — nove compiti su
  nove, verificati»**, senza traccia che una revisione finale abbia poi trovato un difetto vero
  introdotto dal ramo (R1). Chiudere quel buco costa un secondo commit, e l'istruzione di questo
  giro era «un commit solo» — la scelta fra farlo ora o rimandarlo al momento dell'unione/`chiudi`
  non è mia da prendere in silenzio: la lascio a Francesco.
