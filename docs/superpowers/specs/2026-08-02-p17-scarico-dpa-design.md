# Spec — P17: lo scarico del contratto che non va a buon fine

**Data:** 2 agosto 2026 (`provato:` `date` → `Sun Aug 2 18:34 CEST 2026`) · **Stato:** 🟡 **DA RILEGGERE**
**Nasce da:** `docs/design/decisions/2026-08-02-p17-scarico-dpa.md` (design approvato sui mockup, **D157-D162**)
**Precede:** il piano (FASE 4) → l'esecuzione a task singoli (**R-E1**)
**Superficie:** il riquadro «Privacy — GDPR» di `src/app/(app)/clienti/[id]/page.tsx` — **DS v2.3**, la route
non è migrata a v3 e i due sistemi non si mischiano.

> 🔑 **Il design sta nell'altro documento e non si ripete qui.** Questa spec porta ciò che il piano non può
> ricavare da un mockup: **che cosa è stato letto**, **che cosa è stato provato**, **che cosa è ancora
> un'assunzione**, e dove il cambiamento tocca nomi che nessuno ha censito.

---

## 1. Perimetro

**Dentro:** il tasto «Scarica DPA PDF» e i suoi esiti · la riga «Ultima emissione» e i suoi tre casi · la
visibilità del tasto per ruolo (**D158**) · un codice d'errore leggibile a macchina sulla rotta DPA · la
conservazione del **nome del file**.

**Fuori, e ciascuno col suo motivo:**
- **P16** — righe illeggibili in modo scuro: **deferita da D134**, e la ragione regge (nessun colore di testo
  v2.3 scuro passa su quella card tranne quello dei titoli). ⚠️ **Ma i testi che P17 AGGIUNGE stanno su
  `--t1`**: deferire un difetto esistente è una scelta, nascere col difetto no.
- **P13** — le rotte PDF sorelle non concordano sullo stato d'errore: stessa famiglia, **altre rotte**.
- **P11** — il messaggio del database che arriva all'utente: **altro file**, raggio più largo.
- **`generate-dpa.ts`** — non si tocca. Gli stati HTTP sono già giusti e già provati. L'unica aggiunta è il
  **codice** accanto allo stato (§5 ②), che è un'estensione, non una revisione.

---

## 2. Registro delle LETTURE (R-P2) — l'elenco NON lo decide l'autore

L'innesco è il censimento §3. Ogni percorso porta `letto:` con le righe, oppure `NON letto` col motivo.

| file | esito | che cosa ha detto |
|---|---|---|
| `src/app/api/clienti/[id]/dpa/route.ts` | **letto: 1-113 (intero)** | 4 cammini prima del `try` (401 · 403 lab · 403 ruolo · guard) + `ErroreDatiDpa` → stato proprio + tutto il resto 500. Il corpo d'errore è `{ error: string }` e **nient'altro** |
| `src/lib/pdf/errori-dpa.ts` | **letto: intero** | la classe porta `stato: 404 \| 422`. 🔑 Dichiara per iscritto che mappare il **testo** allo stato «si romperebbe in silenzio»: la stessa trappola vale un piano più su. Dice anche che «Laboratorio non trovato» **da questa rotta non si raggiunge** (chiave esterna `utenti_laboratorio_id_fkey`) → **i casi vivi sono tre** |
| `src/lib/pdf/generate-dpa.ts` | **letto: 60-100** (predicato) + `grep -n "throw new"` su tutto | `validateDpaData` (`:76-84`): `!partita_iva && !codice_fiscale` — **ne basta uno**. 11 `throw`: **4** `ErroreDatiDpa` (`:81` `:84` `:124` `:125`), **7** `Error` nudi |
| `src/app/(app)/clienti/[id]/page.tsx` | **letto: 1-369 (intero)** | `select` a `:122-134` include `partita_iva, codice_fiscale` del **cliente** · `erroreRegistro` a `:182-184` solo nel log · l'`<a>` a `:328-350` **senza** `download`, con la ragione scritta · **`ruolo` non compare mai** |
| `src/lib/supabase/lab-context.ts` | **letto: 12-56** | 🛑 `lab: { stato, trial_ends_at, nome } \| null` — **NIENTE dati fiscali**. Smonta l'assunzione su cui poggiava la prevenzione del caso ③ |
| `src/lib/supabase/lab-guard.ts` | **letto: 30-80** | i GET passano su `sospeso`/`scaduto`/`trial` scaduto; **`blacklist` blocca anche i GET**; `admin_sistema` ha passaggio libero |
| `src/components/features/lavori/PacchettoConsegnaSheet.tsx` | **letto: 180-290** | **l'unico scarico via `fetch` del progetto** — e **si fabbrica il nome a mano** (`:264`), non legge `Content-Disposition`. Il precedente **smentisce**, non conferma |
| `src/components/features/lavori/TracciabilitaMaterialiBanner.tsx` | **letto: intero** | il modo di casa v2.3 per un blocco d'avviso: `role="alert"`, raggio 14, fondo `rgba(...,.10)` + bordo `.35`, titolo 14/600 su `--t1`, corpo 13 su `--t2` |
| `src/components/ds/Avviso.tsx` | **letto: intero** | 🛑 **è DS v3** — non riusabile qui senza violare la regola di convivenza. Serve il modo v2.3 |
| `src/components/features/clienti/ClienteEditSheet.tsx` | **letto: righe con `partita_iva`** | il campo esiste (`:395`): **il rimedio del caso ② è già su questa scheda**, aperto da `ClienteModificaButton` |
| `src/app/(app)/impostazioni/page.tsx` | **letto: 1-20, 140-150** | monta `ImpostazioniEditForm` (`:146`), che tratta la Partita IVA del laboratorio → **destinazione del rimedio del caso ③** |
| `src/design-system/tokens.ts` | **letto: 1-140** | i valori usati nei mockup, copiati e non inventati |

---

## 3. CENSIMENTO degli identificatori (R-P6)

**Nomi che il cambiamento introduce o sposta** — ognuno con la sua destinazione:

| identificatore | oggi | dopo | destinazione |
|---|---|---|---|
| `ErroreDatiDpa.stato` | `404 \| 422` | invariato | — |
| 🆕 `ErroreDatiDpa.codice` | **non esiste** | unione chiusa | corpo JSON della rotta → il componente client dirama su questo, **mai sul testo** |
| corpo d'errore della rotta | `{ error }` | `{ error, codice? }` | **aggiunta**, retro-compatibile: chi legge solo `error` continua a funzionare |
| `<a href>` del tasto | elemento server | 🆕 componente client | il markup si sposta, il `Content-Disposition` **deve** seguirlo (§5 ①) |
| `ultimaEmissione` / `erroreRegistro` | variabili locali | invariate | ma `erroreRegistro` **smette di essere solo un log**: diventa uno stato reso |
| `context.ruolo` | **mai letto in questa pagina** | letto | decide se il tasto esiste (**D158**) |

🛑 **Nessun nome viene TOLTO da un'allowlist**, quindi non c'è il rischio «un dato smette di salvarsi in
silenzio» che R-P6 sorveglia. `provato:` questo lavoro non tocca `PATCHABLE_FIELDS` né alcuna allowlist di
`src/app/api/lavori/[id]/route.ts`.

**I codici d'errore da enumerare** — inclusi i cammini **prima** del `try`, che il mockup non mostra:

| codice | stato | da dove | cosa vede l'utente |
|---|---|---|---|
| `LAB_DATI_FISCALI` | 422 | `generate-dpa.ts:81` | stato ③ — «completa i dati del laboratorio» |
| `CLIENTE_DATI_FISCALI` | 422 | `generate-dpa.ts:84` | stato ② — «aggiungi il dato dello studio» |
| `CLIENTE_ASSENTE` | 404 | `generate-dpa.ts:125` | «questo studio non esiste più» → torna all'elenco |
| `LAB_ASSENTE` | 404 | `generate-dpa.ts:124` | ⚠️ **non raggiungibile da questa rotta** — si enumera lo stesso, perché `generateDpa` non è solo di questa rotta |
| *(nessun codice)* | 500 | i 7 guasti | stato ⑤ — «Riprova» |
| — | 401 | `route.ts:20` | 🛑 sessione scaduta → **rientra**, MAI «Riprova» |
| — | 403 | `route.ts:21,23` + guard | ruolo o laboratorio non operativo → messaggio proprio, **niente «Riprova»** |

---

## 4. Registro delle PROVE (R-P1) — un blocco senza marchio è NON provato

### Provato

- `provato:` `grep -n "throw new" src/lib/pdf/generate-dpa.ts` → **11** righe (81 · 84 · 115 · 124 · 125 · 168 · 191 · 215 · 240 · 290 · 394): **4** `ErroreDatiDpa`, **7** `Error`.
- `provato:` `grep -n "ruolo" src/app/(app)/clienti/[id]/page.tsx` → **0**; `grep -rln "context.ruolo\|ctx.ruolo" src/app/(app)/` → **10** file. La scheda è **l'eccezione**, non la regola.
- `provato:` `src/lib/supabase/lab-context.ts:19` → il contesto **non** porta i dati fiscali del laboratorio.
- `provato:` `grep -rni 'content-disposition' src/` → **14** occorrenze, **tutte lato server, nessuna client**.
- `provato:` `grep -rn 'createObjectURL' src/` → **3**, e l'unico scarico di documento (`PacchettoConsegnaSheet.tsx:264`) **si fabbrica il nome**.
- `misurato` (contrasto, sul fondo card `#E4DFD9` chiaro / `#232018` scuro): `--t1` ~13:1 e **14,06:1** ✅ · `--t2` 7,9 e **4,45** ❌ scuro · `--t3` 4,85 e **2,24** ❌ scuro · rosso `#D90012` come testo **4,01** ❌ · ambra `#F59E0B` come testo **~2,1** ❌. ➡️ **il colore sta nell'icona (soglia 3:1), il testo su `--t1`**.
- `provato:` `ClienteEditSheet.tsx:395` porta il campo `partita_iva` → il rimedio del caso ② **non richiede di cambiare pagina**.

### NON provato — assunzioni che l'esecutore verifica PRIMA di costruirci sopra

| # | assunzione | come si prova | se è falsa |
|---|---|---|---|
| **A1** | `Content-Disposition` è **leggibile** da `fetch` su richiesta di **pari origine** | sonda usa-e-getta: `fetch('/api/clienti/<id>/dpa')` → `res.headers.get('content-disposition')` **non nullo**, col valore incollato | la rotta deve esporlo con `Access-Control-Expose-Headers`, oppure il nome viaggia in un'intestazione propria |
| **A2** | leggere i dati fiscali del laboratorio nella pagina **non** rallenta oltre il tollerabile | la lettura va **in parallelo** (`Promise.all`) con quella del registro, mai in fila | si accorpa alla `select` del registro |
| **A3** | la prevenzione usa **lo stesso predicato** dell'emettitore | il caso di prova monta un cliente con **solo** il Codice Fiscale: il tasto **deve restare ATTIVO** (`&&`, non `\|\|`) | tasto spento su un cliente che emetterebbe benissimo |
| **A4** | il corpo d'errore arriva **sempre** come JSON | il componente gestisce anche una risposta **non-JSON** (una pagina d'errore della piattaforma, un 502 del bordo) senza rompersi | l'errore diventa un'eccezione dentro il gestore dell'errore |

🛑 **Il vincolo si prova con un valore che DEVE essere rifiutato** (R-P1): per il codice d'errore, la prova è
un `throw new ErroreDatiDpa('…', 422)` **senza codice** che **non deve compilare**. Se compila, l'unione non
è chiusa e il compilatore non sta facendo il rumore che gli si chiede.

---

## 5. L'architettura — tre pezzi, confini dichiarati

### ① Il tasto vivo — 🆕 componente client

**Che cosa fa:** riceve dalla pagina ciò che sa già (se i dati fiscali ci sono, e di chi mancano), rende il
tasto nello stato giusto, e quando si preme chiede il documento e ne governa l'esito.
**Che cosa NON fa:** non decide chi può emettere (lo decide la rotta), non conosce la scheda dentista.

🛑 **Deve conservare il nome del file** (§6 ① del documento di decisione): legge `Content-Disposition` dalla
risposta, ne ricava il nome, e lo applica a un `<a download>` costruito al volo. **Senza questo, P17 disfa il
Task 8.**

### ② Il codice d'errore — estensione di `ErroreDatiDpa`

Un campo `codice` accanto a `stato`, **unione chiusa**, che la rotta mette nel corpo. Il compilatore obbliga
ogni `throw` a scegliere. 🔑 **Stesso meccanismo di `emesso_da` in P7:** il rumore lo fa `tsc`.

### ③ Il blocco d'avviso — 🆕 componente di presentazione, v2.3

Riceve tipo (`attesa` / `guasto`), titolo, testo e — facoltativa — un'azione. **Non sa** di DPA: è questo che
lo rende ereditabile dall'ondata della firma (**D162**).
⚠️ **Segue il modo di casa** (`TracciabilitaMaterialiBanner`), non ne inventa uno nuovo: `role="alert"`,
raggio 14, fondo tenue + bordo, **titolo e testo su `--t1`** (correzione rispetto al precedente, che usa
`--t2`: in modo scuro fallirebbe).

### La riga «Ultima emissione» — tre casi, dentro la pagina server

Resta nel componente server: non ha interazione. Cambia solo che `erroreRegistro` **si vede** invece di finire
solo nel log.

---

## 6. I test — prima le FORME D'INPUT, poi le asserzioni (R-P4)

| forma d'input | caso | perché
|---|---|---|
| dati completi | tasto attivo | il caso normale |
| cliente **senza** entrambi | tasto inerte, messaggio ② | il 422 previsto |
| cliente con **solo** Codice Fiscale | 🛑 tasto **ATTIVO** | **A3**: il predicato è `&&`. È il caso che smaschera un `\|\|` scritto per distrazione |
| laboratorio senza entrambi | tasto inerte, messaggio ③ | richiede la lettura in più |
| ruolo `tecnico` / `front_desk` | **nessun tasto**, riquadro presente | **D158 · D160** |
| ruolo `admin_rete`, `admin_sistema` | tasto presente | l'allowlist della rotta ne ammette tre, non uno |
| risposta 500 | messaggio ⑤ + «Riprova» | la famiglia dei sette |
| risposta 401 | messaggio proprio, **niente «Riprova»** | un riprova che non può funzionare insegna a ignorare i tasti |
| corpo **non-JSON** | non si rompe | **A4** |
| `Content-Disposition` **assente** | nome di ripiego, non un nome inventato | difesa se A1 cade |
| registro illeggibile | riga ⑦c | il difetto vuoto-contro-errore |
| registro vuoto | riga ⑦b | l'altra metà: se non si distingue, il test non prova niente |

**Dopo il primo rosso: abbozzo inerte e si CONTA** quante asserzioni si accendono, e il numero si scrive.

---

## 7. FASE 3 — la validazione architetturale, tutte e cinque

| domanda | risposta |
|---|---|
| **Tenant isolation** — tocca RLS o `current_lab_id()`? | **No.** La rotta usa il client di servizio con filtro esplicito su `laboratorio_id`, e resta identica. La lettura nuova del laboratorio usa lo stesso client già in pagina, filtrata su `context.laboratorioId` |
| **Schema drift** — serve una migration? | **No.** Nessun cambiamento di banca dati, quindi **niente FASE 6b** |
| **API contract** — rompe client esistenti? | **No:** il corpo d'errore **guadagna** un campo. Chi legge solo `error` continua a funzionare. ⚠️ Ma va detto nel piano che la rotta è consumata **solo** da questa scheda (`provato:` da verificare con un censimento dei chiamanti prima di toccarla) |
| **Rollback** — come si annulla? | Ritiro del salvataggio: è interfaccia e un campo aggiuntivo, nessun dato migrato, nessuno stato persistente nuovo |
| **Dominio critico?** (RLS · Stripe · FatturaPA · auth · migration) | **No** — ma la superficie è **in produzione**, quindi **§0B per intero** (fatto: mockup + 12 scatti + approvazione **D161**) **e FASE 9b** prima di unire |

---

## 8. Ciò che questa spec NON risolve, e va detto

- **Non dice se `PacchettoConsegnaSheet` abbia lo stesso difetto di nome file.** `provato:` si fabbrica i nomi
  a mano (`:264`), quindi **può** divergere dai nomi che le rotte dichiarano — ma è **fuori mandato** (R-E2):
  si **riferisce**, non si corregge qui.
- **Non introduce una sorveglianza degli errori** — in questo repo non esiste, e nessuna scelta di questa spec
  ci si appoggia.
- **Non decide il testo esatto dei messaggi**: i mockup li portano, ma la revisione della lingua avviene
  sull'implementazione, davanti agli scatti veri.
