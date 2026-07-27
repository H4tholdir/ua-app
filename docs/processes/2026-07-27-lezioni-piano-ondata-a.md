# Perché un piano ha prodotto otto difetti su otto task — e cosa se ne impara

**Data:** 27 luglio 2026 · **Origine:** ondata (a) del wizard «Nuovo lavoro»
**Domanda di Francesco:** *«è la prima volta in mesi di sviluppo che mi capita che per ogni task c'è un
problema, come mai? è stato fatto un lavoro poco attento e accurato? cosa possiamo imparare?»*

---

## 1. Il fatto, senza aggettivi

Il piano `2026-07-27-wizard-ondata-a-dato-e-api.md` (2.200 righe, 13 task) è stato eseguito per 8 task.
**Ognuno degli 8 ha trovato almeno un difetto reale nel piano stesso.** Nessuno di questi difetti è arrivato
in produzione; tutti sono stati chiusi prima che il codice esistesse.

| Task | Difetto trovato | Sarebbe stato visto da…? |
|---|---|---|
| T1 | Raggruppamento su quadranti 1-4: **0 denti su 20** resi in dentizione decidua | ❌ né tsc, né eslint, né test (nessuno nomina `Odontogramma`) |
| T2 | `colore_collo/corpo/incisale` fuori allowlist ma non mandate al nuovo endpoint → **3 tendine morte** | ❌ nessun gate: il server scarta in silenzio |
| T3 | Il colore del wizard è **testo libero**, il catalogo è case-sensitive (`A3` sì, `a3` no) | ❌ solo eseguendo contro il catalogo vero |
| T4 | Le 3 zone del ceramista accettavano **qualunque stringa** (`'pippo'` provato) su un dato della DdC | ❌ solo inserendo davvero |
| T5 | Faceva scrivere una funzione trigger **già esistente** (`trigger_set_updated_at`, 34 trigger su 34 tabelle) | ❌ solo cercando il precedente |
| T6 | Prevedeva errori di compilazione dopo il `DROP COLUMN`: non ce n'erano | ⚠️ innocuo, ma indica un'assunzione non verificata |
| T7 | 🔴 **Il piano non girava sul proprio esempio**: `array_agg` su zero righe dà `NULL`, le colonne sono `NOT NULL` | ❌ solo eseguendo |
| T8 | 4 casi che producevano **500 invece di 422** — l'opposto dello scopo del task | ❌ solo con test che li coprissero |

---

## 2. Le tre cause, in ordine di peso

### ① Il piano conteneva ~700 righe di codice MAI ESEGUITO

È la causa principale e spiega da sola cinque difetti su otto.

Nelle ondate precedenti il codice si scriveva **e si eseguiva nello stesso gesto**: un errore viveva secondi
e non lasciava traccia. Qui il codice **era il prodotto** — scritto per intero, riletto, e consegnato senza
mai girare. E i difetti trovati sono, uno per uno, di quelli che **nessuna rilettura può vedere**:
`array_agg` che restituisce `NULL`, un vincolo che manca, una funzione che esisteva già.

> 🔑 **Un piano con «codice completo in ogni passo» è un piano pieno di codice non provato.**
> «Completo» non deve diventare «presunto funzionante».

### ② Sono stati aperti i file che *sembravano* rilevanti, non tutti quelli nominati

`OdontogrammaFDI.tsx` (1.048 righe) non è stato aperto — «so cosa fa». Il difetto T1 era lì.
`supabase/schema.sql` non è stato aperto. Il difetto T5 era lì.
`useLavoroForm.ts` è stato aperto **solo dopo**, in revisione — e ha spostato l'intero Task 12.

> 🔑 **I difetti stanno, uno per uno, nei file che non sono stati aperti.** Non è una coincidenza:
> è la definizione del problema.

### ③ Il piano è stato scritto in coda a una sessione lunghissima

Spec + verbale (680 righe) + memoria + mezza applicazione, e **poi** 2.200 righe di piano quasi di fila.
La densità di errore delle ultime centinaia di righe è visibilmente più alta.

---

## 3. La faccia opposta, che va detta con la stessa forza

**Il tasso di difetti non è aumentato: è aumentata la capacità di vederli.**

La memoria del progetto è piena di difetti trovati **tardi**:
- voce 48: «4 difetti gravi trovati e chiusi, **nessuno dei quali la suite verde poteva vedere**»
- voce 51: «3 difetti veri **che i test non vedevano**» + il tasto Salva sotto il bordo, trovato **da
  Francesco al collaudo, con l'app in mano**

Quelli sono arrivati a fine lavoro, a volte in produzione. **Gli otto di stanotte sono stati trovati prima
che il codice esistesse.** Nessuno ha raggiunto l'utente.

E c'è una ragione strutturale: il metodo scelto da Francesco — **un compito alla volta, eseguito da chi non
sa cosa "dovrebbe" funzionare** — non eredita le assunzioni di chi ha scritto il piano, e quindi le mette
alla prova. Se il piano lo avesse eseguito il suo stesso autore, quegli otto difetti sarebbero stati corretti
al volo **senza che nessuno li registrasse**: la serata sarebbe *sembrata* liscia. Sarebbe stata
un'illusione, non un lavoro migliore.

Prova che il metodo tiene anche su sé stesso: **il T8 ha preso un allarme lanciato dal T7, è andato a
verificarlo, e ha dimostrato che era falso**, trovando la controprova già presente nel codice
(`cassetta/route.ts:178`). Non si è fidato nemmeno del proprio predecessore.

---

## 4. Le tre regole operative — proposte per la ratifica

> ⚠️ **Da ratificare da Francesco prima di incidere in `ua-app/CLAUDE.md` §0C.** Qui restano come proposta
> con la loro motivazione, secondo lo Statuto delle fonti.

### R-P1 — «Il codice del piano si prova o si dichiara»

Ogni blocco di codice in un piano è **eseguito almeno una volta** durante la scrittura (spike usa e getta,
query di prova sul database, funzione compilata a vuoto) **oppure** porta accanto la scritta
**«non eseguito»**. Nessuna terza via: un blocco senza marchio è, per convenzione, provato.

*Costo:* qualche minuto per blocco. *Beneficio misurato:* cinque difetti su otto sarebbero morti in culla,
compreso quello bloccante del T7.

### R-P2 — «Nessun file nominato resta chiuso»

Prima di scrivere il piano, **ogni file che il piano nomina va aperto**, anche quelli lunghi, anche quelli
che «si sa cosa fanno». Se un file è troppo grande per il contesto, si apre la parte pertinente **e si
dichiara nel piano quale parte non è stata letta**.

*Corollario già pagato:* «so cosa fa» è la frase che precede il difetto.

### R-P3 — «Prima di creare, cercare il precedente per COMPORTAMENTO»

Prima di scrivere una funzione, un helper o un trigger, si cerca se esiste già qualcosa che fa quella cosa —
**cercando il comportamento, non il nome**. `trigger_set_updated_at` non si sarebbe mai trovata cercando
«lavori_denti_touch»; si trova cercando `updated_at.*now()`.

### Due regole minori, già incise nel piano

- **Il rosso da «modulo non trovato» non prova che il test provi qualcosa.** Dopo il primo rosso si mette un
  abbozzo inerte e si conta **quante** asserzioni si accendono. Nel T2, quattro su sette passavano contro
  una funzione vuota; nel T8, zero su tredici sopravvivevano — quello era un test forte.
- **`tsc --noEmit` non valida la firma degli handler di rotta**: serve `npx next build`.

---

## 5. Cosa NON cambiare

- **Il processo «un compito alla volta con revisione fresca»**: è ciò che ha reso visibili gli otto difetti.
- **La regola di riferire invece di patchare**: più volte un esecutore ha trovato un difetto **fuori dal
  proprio mandato** e l'ha riferito invece di correggerlo di nascosto (T4 sulle zone colore, T7 sulle FK non
  verificate). Se li avesse corretti in silenzio, il piano sarebbe rimasto sbagliato per i task successivi.
- **La misura al posto della stima**: ogni numero di questa ondata è stato letto da un output, mai
  ipotizzato. È lo stesso metodo che il 27/07 mattina aveva già pagato tre volte.

---

## 6. La riga da tenere

> **Un piano non è un documento: è codice non ancora eseguito.**
> Va trattato con lo stesso sospetto che si riserva al codice — perché è esattamente la stessa cosa,
> con in più il difetto di sembrare prosa.
