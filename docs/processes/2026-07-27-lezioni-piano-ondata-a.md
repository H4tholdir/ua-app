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

> ✅ **CHIUSO IL 28/07/2026** (lavoro svolto nella notte fra il 27 e il 28). Francesco ha delegato la decisione («falle controllare da advisor
> specializzati e poi procedi a renderle permanenti se reputi che possano migliorare il nostro lavoro»).
> Panel 3× eseguito (architettura · costo/sostenibilità · **avversariale**). **Le regole in vigore sono
> quelle del §7 di questo documento, NON quelle qui sotto:** il panel ne ha riscritte tre, scartate due,
> e ne ha aggiunta una che qui mancava. Il testo normativo vive in **`ua-app/CLAUDE.md` §0C**.
> Quanto segue resta come **proposta originale**, per capire da dove si è partiti.

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

---

## 7. Il verbale del panel — cosa è entrato in vigore e cosa no (28/07/2026)

**Panel:** tre advisor indipendenti, lenti diverse: **architettura del processo** · **costo e
sostenibilità** · **avversariale** (mandato: «rispetta le regole alla lettera e produci gli stessi otto
difetti lo stesso»). Griglia di punteggio comune: **le 8 regole candidate contro gli 8 difetti del §1**.

### 7.1 Il ritrovamento che ha cambiato la regola più importante

L'advisor avversariale ha sostenuto che **R-P2 nella forma proposta non avrebbe intercettato T1**, il
difetto peggiore. **Verificato aprendo il piano, non accettato sulla parola:**

- la tabella «File Structure» (righe 34-47) elenca **12 percorsi**, e `OdontogrammaFDI.tsx` **non c'è**;
- la riga 271 lo dice a difetto avvenuto: «⚠️ **I file sono QUATTRO, non tre**»;
- peggio: la ricerca giusta (`grep -rn "quadrante"`) **era prescritta dal piano stesso** (riga 246), è
  stata **eseguita**, e l'inferenza tratta era sbagliata («oggi non fa danno perché adulto e deciduo non
  convivono sullo stesso schermo» — le due dentizioni non condividono lo schermo ma **condividono il
  codice**).

Conseguenza incisa in §0C: **l'innesco di R-P2 non è più «i file che il piano nomina»** — un innesco che
l'autore controlla, e che premia proprio il comportamento che ha causato il difetto (nominare meno file
per doverne aprire meno) — **ma l'esito del censimento R-P6**, che l'autore non sceglie.

### 7.2 Verdetti, con le riserve integrate

| Regola | Esito | Cosa è cambiato rispetto alla proposta |
|---|---|---|
| **R-P1** | ✅ ratificata **riscritta** | Default **invertito** (era fail-open: «un blocco senza marchio è, per convenzione, provato» — la stessa forma del difetto che ha generato l'analisi). Si provano le **assunzioni**, non le ~700 righe: pre-provare tutto costa ore **e trasformerebbe l'esecutore fresco in un copista**, spegnendo il meccanismo che ha prodotto le 8 catture. Aggiunti: il **caso che DEVE fallire** (un `CREATE FUNCTION` riuscito non prova il comportamento — è così che sarebbero passati T4 e T7), le **previsioni di esito** come blocchi da marcare (T6), e il divieto di sondare su **migration registrate** (§8: il ledger). |
| **R-P2** | ✅ ratificata **riscritta** | Innesco spostato dal «file nominati» al **censimento** (v. §7.1). Aggiunta la forma osservabile (`letto: righe X-Y` / `NON letto`) e il vincolo sulla delega: **domanda falsificabile con righe citate, mai un riassunto** — un riassunto è «so cosa fa» esternalizzato di un livello, e avrebbe perso T1 identicamente. |
| **R-P3** | ✅ **assorbita in R-P2** | Vale 1 difetto su 8 e ha la stessa presa di R-P2: non merita una voce propria. Sopravvive perché **il precedente che non conosci è quello che non nomini mai**, quindi R-P2 da sola non lo raggiunge. Aggiunti territorio dichiarato e **catalogo vivo `pg_proc`** invece del grep (la funzione mancata vive in `schema.sql`, fuori da `migrations/`). |
| **R-P4** | ✅ ratificata **riscritta** | Segna **0/8** sui difetti, e due advisor su tre volevano ratificarla lo stesso. Motivo per cui resta: non misura difetti, **ripara lo strumento di misura** (T2: 4 asserzioni su 7 verdi contro una funzione vuota). Ma l'avversariale ha ragione sul limite: su T8 il conteggio dava «test forte» (0 su 13) **e i 4 casi mancanti non erano fra i 13**. Quindi è accoppiata al **censimento delle forme d'input** e dichiara di misurare la forza, **mai la copertura**. |
| **R-P5** | ❌ **scartata come regola** | Unanime (3/3): **0 difetti su 8**, ed è già FASE 7 **e già in CI**. Ratificarla insegnerebbe che si ratificano voci senza contenuto nuovo. Resta come **nota di una riga** attaccata alla FASE 7. |
| **C1** (piano a contesto fresco) | ❌ **scartata** | Un advisor la voleva, e la sua correzione di fatto è giusta e registrata: la sessione fresca è sempre stata concessa **all'esecutore, mai al pianificatore**. Ma la causa che presupponeva — la stanchezza di coda, §2③ — **è contraddetta dall'artefatto**: i difetti sono sparsi su tutto il piano e **il primo sta nel primo task scritto** (T1, riga 81). Una regola che compra una causa che i dati non sostengono è costo puro. **La causa ③ resta senza contromisura, e va detto.** |
| **C2** (un compito, un esecutore fresco) | ✅ **ratificata** come **R-E1** | Unanime, senza emendamenti. È l'unica che segna **8 su 8** — non per ipotesi: è ciò che li **ha** trovati. Costo marginale zero (è già la prassi scelta da Francesco) e non era scritta da nessuna parte se non in un handoff che invecchia. È anche il **punto di applicazione** di tutte le altre. |
| **C3** (riferire, non patchare) | ✅ **ratificata** come **R-E2** | Non trova nulla da sola: **impedisce che il ritrovamento di R-E1 muoia in una correzione silenziosa** (successo misurato su T4 e T7). Emendamento accolto: i ritrovamenti fuori mandato si raccolgono in **una sola sezione dell'handoff**, per non trasformare Francesco in una coda di notifiche. |
| **R-P6** 🆕 | ✅ **ratificata** | **Non era nella proposta.** Nasce dall'advisor avversariale, alla domanda «quale difetto sopravvive a tutte e otto?». Il censimento del piano (riga 51) c'era ed era stato eseguito su tutto `src/` — ma **su sette nomi di colonna**: ha mancato T1 (un simbolo esportato) e T2 (un insieme di campi UI contro un'allowlist). Il buco non era l'abitudine, era **il tipo di identificatore**. Copre i **due difetti che sopravvivono a tutto il resto**. |

### 7.3 Riserve NON accolte, con il motivo

- **«Restringere la Regola Advisor ai soli irreversibili»** (proposta come baratto per il costo delle
  regole nuove). Non eseguita: la Regola Advisor è stata **ratificata da Francesco il 17/07/2026**, e non
  è una voce che si tocca per fare spazio. **Resta come proposta aperta per lui**, non come decisione.
- **«Marcatura positiva invece dell'inversione secca»** (timore: se «non marcato = non provato», i piani
  si riempiono di «non eseguito» e il segnale muore). Accolta **in parte**: si marca solo ciò che è
  provato — ma il default resta **fail-closed**, e il marchio «non eseguito» **deve portare accanto il
  comando di verifica**, che è ciò che gli toglie il carattere di timbro.
- **«Tetto di dimensione per seduta + rilettura a freddo dell'ultimo terzo»** (in sostituzione di C1).
  Non accolta: poggia sulla stessa causa ③ che la distribuzione dei difetti non sostiene.

### 7.4 Ritrovamento fuori mandato — riferito, non corretto (R-E2 applicata a sé stessa)

Cercando le prove di quanto le regole scritte reggano nel tempo, il panel ha trovato — **e la verifica
diretta ha confermato** — che in questo repo esistono **quattro reti di sicurezza che nessuno esegue**:
`scripts/guardia-navigazione-overlay.mjs`, `scripts/guardia-reduced-motion.mjs`,
`scripts/guardia-stili-collaudo.mjs`, `scripts/check-csrf.sh`. Nessun riscontro in `package.json`,
`.husky/pre-commit` (che lancia solo `lint-staged`, `tsc --noEmit`, `check-ds-compliance.sh`) né in
`.github/workflows/`. Una di queste è citata in `ua-app/CLAUDE.md` come «Rete:» di una direttiva
permanente. **Fuori dal mandato di questa ratifica: riferito, non toccato.**
