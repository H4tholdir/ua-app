# Task 2 — Report: Passo 3, framing D223 variante B + sgancio + stato sganciato (UI)

**Quando:** 4 agosto 2026, sera (`provato:` `date` → `Tue Aug 4 19:48:25 CEST 2026`).
**Ramo:** `ondata-b-sessione-3` (repo principale, MAI worktree).
**Brief:** `.superpowers/sdd/task-2-brief.md` · decisione a monte: `docs/design/decisions/2026-08-04-ondata-b3-schermate-vere.md` (D223).

---

## 1. Implementato

`PassoPaziente.tsx` guadagna `RigaColore`, un componente dedicato che sostituisce l'istanza
generica di `RigaOpzionale` usata finora per «Colore» (Elemento e Nome o alias restano su
`RigaOpzionale`, invariata a parte la rimozione di `onAttiva`, v. §3).

**I tre stati (D223 + derivazione Task 2):**

| Stato | Nome/etichetta | Sottotitolo/aiuto | Link |
|---|---|---|---|
| Chiusa, `coloreOrigine` assente/`'prescrizione'` | «Colore» | «come scritto sulla prescrizione · es. A2» | «Salta» |
| Chiusa, `coloreOrigine==='lab'` | «Colore» | «lo scegliamo noi» | «Salta» |
| Aperta, assente/`'prescrizione'` | «Colore — come scritto sulla prescrizione» | «Quello che scrivi qui vale come **trascrizione** del foglio del dentista, e finisce così sulla Dichiarazione.» | «Non è sulla prescrizione: lo scegliamo noi» → `onCambia({coloreOrigine:'lab'})` |
| Aperta, `'lab'` | «Colore — lo scegliamo noi» | «Scelta del laboratorio: resta **fuori** dalla Dichiarazione, perché non è sulla prescrizione.» | «In realtà è sulla prescrizione: torno a trascrivere» → `onCambia({coloreOrigine:'prescrizione'})` |

Testi delle scene aperte VERBATIM dal mockup (`p3-aperta`/`p3-sganciata`, testi D210/D223
invariati). **Due derivazioni dichiarate, non presenti come scena nel mockup** (documentate anche
nel JSDoc di `RigaColore`):
- l'esempio della riga chiusa in trascrizione è `es. A2` (non `es. A3` come nel mockup/verbale
  D223): risoluzione esplicita del controllore in `task-2-brief.md` — A3 era il valore
  dimostrativo della scena, A2 è il valore già in produzione.
- il sottotitolo chiuso per `coloreOrigine==='lab'` («lo scegliamo noi») non ha una scena propria
  nel mockup (nessuna «chiusa + sganciata»): deriva dalla coda dell'etichetta aperta della scena
  `p3-sganciata`, stesso pattern della riga chiusa in trascrizione (nome + coda del framing) — è
  la derivazione che il brief chiedeva esplicitamente («segui il pattern del mockup»).

**Vincolo D223 a verbale**, scritto come commento sul componente `RigaColore`: la variante B regge
SOLO finché lo stato aperto ripete per intero il framing di D210 — se il campo diventasse
compilabile in-place, da chiuso, la scelta va ripensata da capo, non solo aggiustata.

**PillVoce rimossa** (D13, §5.15 abrogata): mount + import rimossi da `PassoPaziente.tsx`. Con lei
è sparito anche il tracciamento del "campo attivo" (`campoAttivo`/`CampoAttivo`/`CampoOpzionale`/
`pillOnTesto`/`onAttiva` su ogni riga) — era codice vivo SOLO per alimentare PillVoce, non
serviva a nient'altro nel file. Il file del componente `src/components/ds/PillVoce.tsx` NON è
stato toccato (fuori mandato, per istruzione esplicita).

**Wiring:** `WizardNuovoLavoro.tsx` passa `coloreOrigine={stato.coloreOrigine}` a `PassoPaziente`
(unica riga aggiunta in quel file). `cambiaPaziente` (già esistente, Task 11) fa da passthrough
generico con spread (`{...s, ...patch}`, `WizardNuovoLavoro.tsx:284-286`) — letto per verificare
che NON enumeri le chiavi a mano (a differenza di `salvaStato`/`riprendi`, Task 1): confermato,
`{coloreOrigine:'lab'}` attraversa il giro senza bisogno di toccare quella funzione.

---

## 2. Test + evidenza TDD (R-P4)

**Perché niente "abbozzo inerte" separato:** `PassoPaziente.tsx` e le sue prop esistevano già
prima di questo task (Task 11) — il primo rosso non è mai stato un errore di import/modulo
mancante che avrebbe mascherato il segnale a livello di asserzione. Il componente NON modificato
era già di per sé la baseline inerte: eseguire i test nuovi contro quel codice dà direttamente il
conteggio "N su M" a livello di asserzione, senza bisogno di un passo intermedio artificiale.

**Primo rosso (contro `PassoPaziente.tsx` non ancora toccato): 8 su 8** test nuovi rossi (16
asserzioni), 16 test preesistenti verdi (nessuna interferenza).

**Prova di forza, non solo di rosso:** il primo abbozzo del test «PillVoce assente» passava già
PRIMA di ogni modifica — falso verde, non perché PillVoce fosse rimossa ma perché jsdom non ha di
default `window.SpeechRecognition`/`webkitSpeechRecognition`, quindi PillVoce si autoesclude
(progressive enhancement, `PillVoce.tsx:6-8`) indipendentemente dal mount. Corretto iniettando lo
stesso mock usato per «PillVoce presente» PRIMA del render: se il mount fosse ancora lì, il
bottone comparirebbe comunque. Con questa correzione il test torna a provare la RIMOZIONE, non un
caso limite del jsdom.

**Enumerazione delle forme d'input** (`coloreOrigine`): assente (default trascrizione) ·
`'prescrizione'` esplicito (stesso esito dell'assente, un test dedicato lo verifica) · `'lab'`.
Tre forme, tutte e tre coperte, in stato chiuso E aperto.

**Gap trovato dal secondo giro di revisione (advisor), corretto prima del commit:** i due test
"sgancio"/"ritorno" originali verificavano SOLO la chiamata a `onCambia` (spy) — non che il giro
di boa funzionasse davvero su un componente controllato. Un bug plausibile (es. `sganciato`
derivato da uno stato locale «congelato» invece che dalla prop `origine` a ogni render) sarebbe
passato inosservato. Aggiunto un test Harness stateful (stesso pattern delle prove sulla foto già
nel file) che chiude il giro: chiusa → apri → sgancio → verifica che la riga resti APERTA col
framing di laboratorio. **Controllo negativo eseguito e poi ripristinato** (R-P1): iniettata
temporaneamente la classe di bug descritta (`sganciato` congelato in uno `useState` al mount
invece che calcolato da `origine` a ogni render) — il nuovo test Harness è FALLITO come atteso,
mentre i due test-spy sarebbero rimasti verdi. Diff post-ripristino confrontato byte a byte col
backup pre-iniezione: identico.

**Risultato finale:** `tests/unit/PassoPaziente.test.tsx` — **23 test** (14 preesistenti
conservati + 9 nuovi: 8 sugli stati/testi/sgancio-ritorno + 1 round-trip; 2 test PillVoce-specifici
rimossi perché testavano un mount che non esiste più — un test che verificasse ancora quel mount
sarebbe stato un test falso).

```
npx vitest run tests/unit/PassoPaziente* tests/unit/WizardNuovoLavoro*
 Test Files  2 passed (2)
      Tests  52 passed (52)   (23 PassoPaziente + 29 WizardNuovoLavoro)

npx tsc --noEmit
 (nessun output — 0 errori)
```

Test preesistenti aggiornati (testi cambiati dalla D223, non indeboliti):
- `'blocco "Se vuoi, aggiungi" mostra le 3 righe...'` → l'assert su `es. A2` isolato è diventato
  l'assert sul sottotitolo combinato `come scritto sulla prescrizione · es. A2` (variante B).
- `'riga già valorizzata... è aperta di default'` → l'etichetta accessibile è ora
  `Colore — come scritto sulla prescrizione`, non più `Colore` nudo.
- Rimossi i due test PillVoce-specifici (dead feature, D13) — `act`, `ultimaIstanza` e
  `istanzeCostruite`-come-letto sono spariti con loro (import/funzione inutilizzati puliti).

---

## 3. File toccati

- `src/components/features/wizard/PassoPaziente.tsx` — `RigaColore` nuovo componente (D223, i tre
  stati); `RigaOpzionale` perde `onAttiva` (dead code); mount+import di `PillVoce` rimossi;
  `campoAttivo`/`CampoAttivo`/`CampoOpzionale`/`pillOnTesto` rimossi (dead code, erano solo per
  PillVoce); prop `coloreOrigine?: ColoreOrigine` aggiunta al contratto del componente; 4 nuovi
  style const (`stileRigaColoreChiusa`/`Aperta`/`ApertaTop`/`AiutoColore`).
- `src/components/features/wizard/WizardNuovoLavoro.tsx` — una riga: `coloreOrigine={stato.coloreOrigine}`
  passata a `PassoPaziente` in `RenderPasso`.
- `tests/unit/PassoPaziente.test.tsx` — nuovo describe «riga «Colore» variante B, framing D223 +
  sgancio (Task 2)» (9 test); 2 test aggiornati; 2 test PillVoce-specifici rimossi; mock Web
  Speech API alleggerito (rimossi `act`/`ultimaIstanza` inutilizzati).

`PillVoce.tsx` (il file del componente) **non è stato toccato** — per istruzione esplicita, fuori
mandato di questo task.

---

## 4. Self-review

- Testi delle scene aperte verbatim dal mockup, verificati carattere per carattere (em dash «—»,
  punto medio «·», grassetto su «trascrizione»/«fuori») leggendo il file HTML sorgente con
  `python3` (non fidandomi della resa terminale per i caratteri non-ASCII).
- Il vincolo D223 è scritto come commento sul componente, come richiesto.
- L'aiuto con markup (`<b>`) è renderizzato come paragrafo proprio, NON tramite la prop `aiuto` di
  `CampoTesto` (che accetta solo `string`) — stesso pattern già in uso in `FoglioConferma.tsx`
  (`testo: ReactNode`, regola scoped nel `<style>` per colorare il tag `<b>`/`<strong>`).
- Touch target: i tre `LinkQuieto` (Salta, sgancio, ritorno) ereditano il min-height 44px del
  componente condiviso — nessuna misura nuova da verificare.
- Motion: nessuna animazione nuova introdotta (la riga cambia stato per re-render puro, come le
  altre `RigaOpzionale` già in produzione) — nessun token v3/motion coinvolto, nessuna duration
  inline.
- Duplicazione di `<style>{'.ds-riga-opzionale-bottone:focus-visible {...}'}</style>` fra
  `RigaOpzionale` e `RigaColore` quando entrambe sono chiuse contemporaneamente: pattern
  PREESISTENTE nel file (ogni istanza di `RigaOpzionale` già iniettava la propria copia identica
  prima di questo task, quando c'erano 3 righe chiuse) — non è una regressione introdotta qui,
  solo estesa a una quarta istanza dello stesso pattern.

---

## 5. Rilievi FUORI mandato (R-E2 — riferiti, non corretti)

1. **`aria-describedby` mancante sull'aiuto ricco di `RigaColore`.** `CampoTesto.aiuto` accetta
   solo `string` (`Campo.tsx:77`), quindi non può portare `<b>trascrizione</b>`: l'aiuto di
   `RigaColore` è un paragrafo separato, non wired via `aria-describedby` all'input come fa invece
   il meccanismo interno di `CampoTesto` per gli aiuti in stringa semplice. Un futuro allargamento
   di `CampoTesto` (es. `aiuto?: string | ReactNode`, o una prop `aiutoNode` dedicata) chiuderebbe
   il gap — tocca un componente condiviso usato da tutto il wizard e gli sheet, fuori mandato di
   questo task.
2. **`Salta` sulla riga Colore non resetta `coloreOrigine`.** Se l'odontotecnico si sgancia, poi
   preme «Salta» sul campo ormai vuoto, `coloreOrigine` resta `'lab'` (la riga richiusa mostra
   «lo scegliamo noi» anche senza valore). Lettura più semplice e coerente col testo del brief:
   l'origine è un'intenzione dell'operatore che persiste, non legata al valore del momento. Nessun
   requisito del brief/mockup lo contraddice — segnalato come domanda di prodotto aperta, non
   corretto.
3. **Nessuna verifica visiva a browser (screenshot vs mockup) in questo task.** Il brief di
   sessione cita «scatti di confronto col mockup» come parte della verifica generale
   dell'ondata; l'istruzione di esecuzione ricevuta per questo task specifico elencava solo
   `vitest`+`tsc`. Il gate estetico L2 (FASE 9b, `docs/design/audit-ui-ux/`) resta da eseguire a
   fine ondata, non duplicato per ogni task atomico — dichiarato qui per non farlo sparire in
   silenzio.
4. **`next build` non eseguito.** Le modifiche toccano solo componenti client (`'use client'`),
   nessun route handler / RSC: la classe di errore che solo `next build` vede (firme di handler di
   rotta) non si applica a questo diff. Omissione dichiarata, non dimenticata.
5. **BP-1 (MEMORY.md / ROADMAP-UFFICIALE.md) NON eseguito a questo livello.** Il §0A del CLAUDE.md
   di progetto lo rende una REGOLA ZERO dopo «lavoro significativo», ma l'orchestratore di sessione
   possiede il bookkeeping a livello di ondata/wave — dichiarato esplicitamente qui perché non
   sparisca in silenzio (§0A-bis: una decisione/step non scritto è come non essere mai avvenuto).

---

## 6. Commit

Ramo `ondata-b-sessione-3`, nessun worktree. Un commit, formato `feat(wizard): …` in italiano +
trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` (SHA nel messaggio finale allo
orchestratore).

---

## 7. Fix di revisione post-commit `0e3c9e74` (4 agosto 2026, sera)

Due findings del controllore, corretti senza toccare altro (contratto: solo questi due).

**Finding 1 (Important) — citazione falsa nel commento.** Il JSDoc di `RigaColore`
(`PassoPaziente.tsx` ~righe 178-180) attribuiva la risoluzione «resta es. A2» a
`task-2-brief.md`, che non la contiene (il brief di sessione, letto per la verifica, parla solo
degli stati/testi D223, non della sostituzione A3→A2). La risoluzione vera è registrata in
`docs/design/decisions/2026-08-04-ondata-b3-schermate-vere.md` §4 («Valori dimostrativi ≠ testi
vincolanti»). Il commento ora cita quel file + paragrafo, non più il brief.

**Finding 2 (Minor) — contratto di tipo incompleto nel test.** `tests/unit/PassoPaziente.test.tsx`
~riga 313, il type-check di compilazione `_Contratto` enumerava le prop di `PassoPaziente` contro
`StatoWizard` ma non includeva `coloreOrigine` (introdotta nel Task 2). Aggiunta la riga
`coloreOrigine: StatoWizard['coloreOrigine']`, stesso stile delle altre. Prova a denti (R-P1,
usa-e-getta, non committata): rinominato temporaneamente in `StatoWizard['coloreOrigineXX']` →
`tsc` va rosso (`Property 'coloreOrigineXX' does not exist on type 'StatoWizard'`) → ripristinato.
Il guardiano funziona, con un limite dichiarato: essendo `void (0 as unknown as _Contratto)` un
cast attraverso `unknown`, non incrocia le prop di `PassoPaziente` — verifica solo che le chiavi
esistano su `StatoWizard`.

**Trovato FUORI mandato, NON corretto (R-E2 — si riferisce, non si tocca):** lo stesso blocco
JSDoc, poche righe sotto (~riga 188), attribuisce un'altra derivazione — il sottotitolo chiuso
«lo scegliamo noi» per `coloreOrigine==='lab'` — al «brief del Task 2». Letto `task-2-brief.md`
per verifica di questo fix: il brief nomina «lo scegliamo noi» solo per gli stati APERTO/SGANCIATO
(etichetta + link), non descrive esplicitamente una derivazione per lo stato CHIUSO+sganciato.
Stessa famiglia del Finding 1 (citazione a un documento che potrebbe non coprire l'affermazione),
ma fuori dal mandato di questo task: segnalato all'orchestratore, non modificato qui.

**Verifica:** `npx vitest run tests/unit/PassoPaziente.test.tsx` → 23/23 passati. `npx tsc --noEmit`
→ 0 errori (confermato che `tests/` è nel programma tsc: `--listFiles` include
`PassoPaziente.test.tsx`). Commit `ac4d1f88`, pre-commit hook verde (ESLint, guardia DS, guardia
CSRF, guardia coerenza documenti, guardia salvataggio automatico).

**Adjudicazione (stesso giorno):** l'orchestratore ha adottato il ritrovamento fuori mandato sopra
e ne ha ordinato la correzione, stesso contratto (R-E2 rispettato: riferito, poi corretto solo su
mandato esplicito). Riga ~188 riscritta per citare `docs/design/decisions/2026-08-04-ondata-b3-
schermate-vere.md` §4 invece del brief; `vitest` 23/23 e `tsc --noEmit` 0 errori confermati di
nuovo. Commit `9e1d7fcd`, pre-commit hook verde.
