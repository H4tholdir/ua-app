# REFERTO — revisione indipendente del Task 7

**Ramo:** `intervento-post-consegna` · **Salvataggi rivisti:** `34101ccb` (la rotta) e `5942ab2c`
(memoria + `satisfies`) · **Base:** `2ede802d` · **Testa:** `3ee5b7f2`
**Contratto:** piano righe 831-988 (Passo 4-bis compreso) · spec §0 · §1 · §2
**Revisore:** indipendente, non ha scritto questo codice. Nessuna correzione applicata (mandato).

---

## Verdetto

**Approvato con UNA riserva critica.** La rotta è corretta: l'isolamento fra laboratori tiene su
ogni percorso, le tre azioni vanno alle funzioni giuste, il Passo 4-bis è stato fatto davvero e la
sua guardia morde. **Il difetto critico non è nella rotta: è nel componente che questo stesso
salvataggio ha toccato**, e il resoconto lo dichiara con la polarità sbagliata.

| che cosa | esito |
|---|---|
| Isolamento del laboratorio | **zero ritrovamenti** — tracciato riga per riga, sotto |
| Le tre azioni della spec §0 → la funzione giusta | ✅ e provato (mutazione 1 → 6 prove rosse) |
| Passo 4-bis (evento legato al lavoro) | ✅ fatto e provato (mutazione 4 → 1 prova rossa) |
| Rinominare `riapertura` → `esito_azione` | ✅ completo, compresi i file di prove |
| `npx vitest run` | 444 file passati, **5467 prove passate**, 68 saltate, uscita **0** |
| `npx tsc --noEmit` | uscita **0**, log vuoto |
| Albero / testa | pulito · `3ee5b7f2` |
| Ritrovamenti | **1 Critico · 2 Importanti · 2 Minori · 3 Note** |

---

## CRITICO

### C1 — La schermata dice «La dichiarazione è stata annullata» ESATTAMENTE dove l'ondata l'ha tenuta viva

**Dove:** `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx:508-517`
(file toccato da `34101ccb`).

**Il meccanismo, letto riga per riga.** Dal Task 7 la rotta risponde, per il ramo `torna_pronto`:

```
esito_azione = { stato: 'applicato', dichiarazione_viva: true }
```

(`route.ts:580` — la chiave del caveat è `dichiarazione_viva` per `riporta_a_pronto_atomica`,
`CAVEAT_RIPRISTINO:539`). Il campo `dichiarazione_assente` **non c'è**. Il riquadro però è
condizionato al solo `stato === 'applicato'`, e dentro fa un ternario su `dichiarazione_assente`:

```tsx
{risposta.esito_azione?.stato === 'applicato' && (
  <Esito tono="ok" titolo="Il lavoro è tornato fra i pronti">
    {risposta.esito_azione.dichiarazione_assente
      ? 'Non c\'era nessuna dichiarazione da annullare.'
      : 'La dichiarazione è stata annullata.'}
```

`undefined` è falso → si stampa **il ramo `else`** → «**La dichiarazione è stata annullata.**»

**È raggiungibile oggi, dal foglio.** `scegliMotivo` (`DevoIntervenire.tsx:184-192`) manda tutti e
nove i motivi alla fase `dettagli`, con l'unica deviazione di `errore_registrazione`. Nessun
cancello su `destinatario_errato`. Quindi: l'operatrice sceglie «persona sbagliata» → la rotta
chiama `riporta_a_pronto_atomica`, che la dichiarazione **non la tocca**
(`20260807182614_riporta_a_pronto_atomica.sql:81-84`) → e lo schermo le dice che è stata annullata.

**Perché è Critico e non un problema di testo.** È l'inversione esatta della garanzia per cui
quest'ondata esiste: D293 e Art. 21(2) MDR — la dichiarazione di una consegna realmente avvenuta è
l'unica prova che quel manufatto è esistito ed è andato a un paziente. Chi legge «annullata» agisce
di conseguenza: la ritiene morta, e alla riconsegna si aspetta un documento nuovo.

🛑 **E SONO TRE COSE DIVERSE, non un elenco omogeneo — separate apposta, perché una sola porta il
peso:**

| # | dove | che cosa rende | verità | peso |
|---|---|---|---|---|
| **a** | riquadro `applicato` (`:508`), ramo `torna_pronto` | «La dichiarazione è stata annullata» | **FALSO e invertito** — il documento è vivo per costruzione | **è questo che regge il Critico** |
| **b** | stesso riquadro, ramo `crea_rifacimento` (`{stato:'applicato', lavoro_nuovo}` → stesso `stato`, `dichiarazione_assente` di nuovo assente) | titolo «Il lavoro è tornato fra i pronti» **+** «La dichiarazione è stata annullata» | **due volte falso** — il lavoro resta `consegnato` (spec §0 riga 4) | serio, ma è un ramo che l'ondata sa nuovo |
| **c** | riquadro `fallito` (`:526`) | titolo «Ma il lavoro non è tornato indietro» | **corretto** sul ripristino; **sbagliato** solo quando a fallire è la creazione | vicino al cosmetico |

⚠️ **La riga (c) NON è la stessa classe delle altre due**: quel riquadro serve entrambi gli aiutanti,
e per il ripristino il titolo dice il vero. Va corretto, ma non è un difetto di correttezza — se
finisse nello stesso elenco delle prime due, il Task 9 si troverebbe una lista di tre in cui una non
regge, e le altre due ne perderebbero credito.

**🛑 Il resoconto lo dichiara, ma con la polarità sbagliata, e la parola è il problema.** §6 scrive
che i riquadri sono «*falso su un rifacimento, e **incompleto** su un "torna pronto" col documento
vivo*». Non è incompleto: è **invertito**. «Incompleto» si legge come «manca un testo» e finisce
nella colonna dei testi da scrivere; «invertito» si legge come difetto di correttezza. Il Task 9
prenderà quella parola alla lettera.

**Attenuante, e va detta:** il resoconto (§6) vieta il merge su `main` prima del Task 9, quindi
l'esposizione è di ramo, non di produzione. **La riserva resta perché la descrizione va corretta
adesso**, non perché il ramo vada fermato di nuovo.

---

## IMPORTANTI

### I1 — L'idempotenza `23505` NON è raggiungibile da questa rotta, e il commento che la spiega è falso

**Dove:** `route.ts:619-643`, commento `:628-630`.

`rifacimento_evento_unique` è `(laboratorio_id, evento_id) WHERE evento_id IS NOT NULL`
(`20260807180314:46`). Ma **ogni POST inserisce un evento NUOVO** (`route.ts:378-384`) e passa
**quello** (`:438`). Non esiste percorso in questa rotta che presenti due volte lo stesso
`evento_id`:

- `svc.rpc('crea_rifacimento_atomico', …)` a `:619` **non** è avvolta in `callRpcWithRetry` —
  a differenza di `cassetta.ts:57`, che invece lo è;
- `getServiceClient` (`src/lib/supabase/server-service.ts`) è un `createClient` nudo, senza opzioni
  di ritentativo;
- **e il ritentativo del trasporto non c'è comunque, `provato:` sul pacchetto installato.**
  `postgrest-js` un ritentativo ce l'ha (`src/PostgrestBuilder.ts:44-61`, tre tentativi con attesa
  crescente) **ma solo per i metodi idempotenti**:
  `RETRYABLE_METHODS = ['GET', 'HEAD', 'OPTIONS']`
  (`src/types/common/common.ts:30`). `rpc()` manda un **POST** (`src/PostgrestClient.ts:411`, `:425`),
  quindi **non viene mai ritentato**.

➡️ Il commento «*è il secondo tocco, o il ritentativo dopo un timeout*» è **falso in entrambe le
clausole** per questo ingresso. Il secondo tocco vero — l'operatrice riapre il foglio dopo un
timeout e ripete — produce **due eventi → due rifacimenti → due lavori nuovi → due progressivi
d'anno bruciati**, e l'unica cosa che oggi lo trattiene è la spia `lavorando` del componente
(`DevoIntervenire.tsx:432-434`): **una schermata**, cioè esattamente ciò che la regola di casa dice
non essere una guardia.

**La prova ⑦ (`tests/unit/eventi-qualita-route.test.ts:1385`) non lo copre, e non è un difetto della
prova:** finge un `23505` e misura la **traduzione**, che è corretta. Nessuna prova misura la
**protezione**, perché in questa rotta la protezione non c'è.

**Non è Critico:** nessuna rottura di isolamento, nessuna rottura normativa. Il danno è un lavoro
duplicato e un progressivo bruciato, entrambi recuperabili a mano.

### I2 — Il ramo `torna_pronto` apre ADESSO la porta della §1, e da tre motivi invece che da uno

Prima di questo salvataggio a `pronto` con dichiarazione viva ci si arrivava solo da
`errore_registrazione` — che però **la dichiarazione la annulla**, quindi la porta era chiusa da sé.
Da `34101ccb` ci arrivano `destinatario_errato`, `difetto_lavorazione + si_sistema` e
`difetto_materiale + si_sistema`, tutti e tre lasciando il documento **vivo**, e la PATCH di
`src/app/api/lavori/[id]/route.ts` non ha ancora nessun cancello (spec §1, punto 2).

➡️ **La finestra in cui i cinque campi stampati possono divergere dal documento è aperta e
raggiungibile da adesso.** Il resoconto lo dice (§6, ultimo blocco) ed è corretto; lo riporto qui
perché è ciò che rende il **Task 8 (D308) urgente**, non solo dovuto.

---

## MINORI

### M1 — Due guardie riposano su UNA sola prova ciascuna

Misurato, non dedotto (dettaglio nella tabella delle mutazioni):

- togliere la guardia `destinatario_errato` + `mai_uscito_dal_lab` (`:278-280`) → **1** prova rossa;
- far arrivare `p_evento_id` dal corpo invece che dalla riga inserita (`:438`) → **1** prova rossa.

Entrambe le prove sono forti (stato, nessun insert, nessuna RPC, testo del messaggio / identificativo
esatto). Ma una guardia con un solo testimone perde la sua rete se quel testimone viene tolto in un
riordino futuro. **Nessun difetto oggi**: è una misura da mettere agli atti.

### M2 — «Si rifà» su un lavoro non consegnato esce `fallito`, la gemella «si sistema» esce `non_applicabile`

`crea_rifacimento_atomico` **solleva** se lo stato non è fra `consegnato`/`pronto`/`sospeso`
(`20260807185858:92-94`); la rotta traduce qualunque errore in `{stato:'fallito'}` col messaggio
«crealo dalla scheda». Sullo **stesso** lavoro, `si_sistema` esce invece `{stato:'non_applicabile'}`
(`riporta_a_pronto_atomica` risponde `non_consegnato`, `20260807182614:73`).

Stessa situazione — «questo lavoro non è nello stato per quest'azione» — raccontata in due registri:
uno benigno, uno d'allarme. Non è coperto da nessuna prova. **Decisione per il Task 9/10**, non una
correzione da fare qui.

---

## NOTE

### N1 — `post_consegna_correzioni` si incrementa anche sul ramo che CREA un lavoro
`route.ts:464-470`. Confermato: l'incremento scatta ogni volta che lo stato del dispositivo non è
`mai_uscito_dal_lab`, quindi conta una «correzione post-consegna» sul lavoro **vecchio**, che invece
resta consegnato e a posto. **Riferito dall'esecutore (§5ⓑ) e non corretto: R-E2 rispettata.**

### N2 — `crea_rifacimento_atomico` non ha filtro di laboratorio proprio
Dichiarato nella migration (`20260807185858:26-31`). L'unica garanzia è la pre-verifica della rotta
(`route.ts:348-356`), che c'è ed è corretta. Va scritto perché **ogni futuro chiamante di quella RPC
eredita l'obbligo**, e la funzione non glielo ricorda.

### N3 — L'esito dell'azione vive solo nella risposta HTTP
Se la risposta si perde, nessuna riga in banca dati dice che l'azione è fallita. È ricostruibile
indirettamente (`lavori.stato` per il ripristino, l'assenza della riga in `lavori_rifacimenti` per il
rifacimento), quindi non è un buco — ma non è una lettura diretta.

---

## Le domande di sicurezza, una per una

### 1. Isolamento del laboratorio — **zero ritrovamenti**, e lo scrivo in positivo

Da dove viene ogni identificativo, letto sul file:

| identificativo | provenienza | riga |
|---|---|---|
| `context.laboratorioId` | **sessione** (`getFreshLabContext`) | `:130-132` |
| `lavoro_id` | **path**, filtrato dalla forma UUID, poi **ricondotto al laboratorio** con `.eq('laboratorio_id', …).is('deleted_at', null).single()` prima di qualunque scrittura | `:137-141`, `:348-356` |
| `eventoId` | **la riga appena inserita**, mai il corpo | `:438` |
| `laboratorio_id`/`created_by` nell'insert | **sessione** | `:361`, `:370` |
| `p_laboratorio_id` delle due RPC di ripristino | **sessione** | `:457`, `:459` |
| lettura di riparazione del 23505 | `.eq('laboratorio_id', laboratorio_id)` **più** `.eq('evento_id', …)` | `:638-639` |
| `p_lab` del trasferimento cassetta | **sessione** | `:655` |
| `incrementaCorrezioni` | filtra su `id` **e** `laboratorio_id` | `:708-710` |

**Nessun valore a forma di identificativo arriva dal corpo della richiesta.** `motivo`,
`scelta_intervento`, `natura`, `origine_informazione`, `stato_dispositivo`, `potenziale_di_danno`
passano tutti per vocabolari chiusi prima di essere usati.
Le due RPC di ripristino filtrano anche al loro interno (`20260807182614:70`, `:134`);
`crea_rifacimento_atomico` no, e la rotta è l'unica guardia — v. **N2**.

### 2. Le guardie stanno nell'API? Ogni vincolo col suo valore rifiutato

| vincolo del piano | valore che DEVE essere rifiutato | esito | prova |
|---|---|---|---|
| ① motivo del bivio senza scelta | `{motivo:'difetto_lavorazione'}` e `{motivo:'difetto_materiale'}`, chiave assente | **422**, «*Dicci come si procede: si sistema questo manufatto…*», nessun insert, nessuna RPC | `:1166` |
| ①-bis | `scelta_intervento: null` sul motivo del bivio | **422**, nessun insert | `:1180` |
| ② scelta di troppo | `{motivo:'errore_prezzo_quantita', scelta_intervento:'si_rifa'}` | **422**, «*nessuna scelta da fare*», nessun insert | `:1191` |
| ②-bis confine opposto | `scelta_intervento: null` senza bivio | **201**, e la chiave **non** finisce nell'insert | `:1207` |
| ③ vocabolario chiuso | `'forse'` | **422**, mai 500 | `:1218` |
| ③-bis forme storte | `7`, `['si_sistema']`, `{scelta:'si_sistema'}`, `true` | **422** ciascuno, mai 500, nessun insert | `:1229` |
| ④ guardia gemella | `destinatario_errato` + `mai_uscito_dal_lab` | **422**, «*…scegli quel motivo*», nessun insert, nessuna RPC | `:948` |
| ④-bis non tracima | gli altri tre stati del dispositivo | **201** e parte `riporta_a_pronto_atomica` | `:961` |
| ⑤ lavoro non consegnato | RPC risponde `non_consegnato` | **201** con `esito_azione.stato === 'non_applicabile'` | `:1296` |
| ⑥ «si rifà» | — | **201** con `lavoro_nuovo.numero_lavoro` valorizzato | `:1320` |
| ⑦ 23505 tradotto | errore `23505` con riga già esistente | **201**, `applicato` col lavoro che c'è, **una sola** chiamata di creazione, filtri di laboratorio ispezionati | `:1385` |
| ⑦-bis fail-closed | `23505` **senza** riga da restituire | `fallito`, mai un successo inventato | `:1407` |

**Nessun vincolo del piano resta non provato.** Sulla riga ⑤ vale la precisazione dell'esecutore, ed
è corretta: la prova misura la **traduzione** dell'esito, non che la funzione di database risponda
davvero `non_consegnato`. Quel cancello l'ho letto io: `20260807182614:73`. Il giro vero è il Task 10.

### 3. L'ordine delle operazioni

L'evento si inserisce a `:378`, **prima** delle chiamate a `:455-462`. Se la funzione fallisce, resta
scritto **l'evento completo** (con `scelta_intervento`) e la risposta è **201** con
`esito_azione.stato === 'fallito'`: deliberato e dichiarato (`:546-551`) — il fatto non si butta via,
ma l'esito negativo viaggia nella risposta e non solo nei log.

**A metà non ci si può fermare:** `crea_rifacimento_atomico` è una sola chiamata plpgsql, quindi
progressivo, lavoro nuovo, denti, prescrizione e riga di rifacimento sono tutto-o-niente. L'unica
cosa fuori è il trasferimento della cassetta, dichiaratamente fail-soft (D309), e `incrementaCorrezioni`,
fail-soft con confronta-e-scambia. **Nessuno stato incoerente.** Resta N3.

### 4. Il Passo 4-bis — **fatto, e la guardia morde**

`route.ts:438`: `const eventoId = (evento as { id: string }).id` — la riga appena inserita, con il
cappello che spiega perché. Passato a tutte e tre le azioni (`:457`, `:459`, `:461`).
Prova dedicata a `:1367`: il corpo porta **`evento_id`** *e* **`p_evento_id`** valorizzati con un
altro evento, e la prova asserisce sia `toBe(EVENTO_ID)` sia `not.toBe(ALTRO_EVENTO)`.
**Misurato:** reintrodurre `corpo.evento_id` come sorgente accende esattamente quella prova.

---

## Le prove misurano davvero? Cinque mutazioni

Ogni mutazione applicata sola, `npx vitest run` **intero**, poi ripristino e `git status --porcelain`
verificato **vuoto** prima della successiva.

| # | mutazione | prove accese | file |
|---|---|---|---|
| 1 | **scambiate le due funzioni di database** (`riapri_lavoro_atomica` ↔ `riporta_a_pronto_atomica`, `:457`/`:459`) | **6** | `1 failed \| 443 passed` |
| 2 | tolta la guardia `destinatario_errato` + `mai_uscito_dal_lab` (`:278-280`) | **1** | `1 failed \| 443 passed` |
| 3 | invertita la condizione del bivio (`if (!richiedeScelta(motivo))`, `:259`) | **60** | `2 failed \| 442 passed` |
| 4 | `p_evento_id` ripreso dal **corpo** invece che dalla riga inserita (`:438`) | **1** | `1 failed \| 443 passed` |
| 5 | tolto `.eq('laboratorio_id', …)` dalla lettura di riparazione del 23505 (`:638`) | **1** | `1 failed \| 443 passed` |

**Le sei che si accendono sulla mutazione 1** — cioè l'errore normativamente peggiore possibile:

```
× «ho sbagliato a premere consegna» CHIAMA riapri_lavoro_atomica, con lavoro, laboratorio ed evento
× ⚖️ D312 «persona sbagliata» chiama riporta_a_pronto_atomica — e MAI la gemella che annulla il documento
× 🛑 se non c'era nessuna dichiarazione viva, la risposta lo DICE (ddc_viva → dichiarazione_viva)
× «persona sbagliata» resta ammessa su ogni ALTRO stato del dispositivo — la guardia è mirata
× applicata su un lavoro senza dichiarazione (dato vecchio) → applicata, ma il caveat si vede
× «si sistema» chiama riporta_a_pronto_atomica, e MAI la gemella distruttiva
```

**Lettura.** Lo scambio delle due gemelle e l'inversione del bivio sono difesi in modo abbondante.
Le due guardie mirate (2 e 4) e il filtro di laboratorio (5) hanno **un testimone ciascuno** — non è
un difetto (le prove sono precise e portano il valore rifiutato), è la misura M1.
🛑 **Quello che le mutazioni NON misurano:** ogni prova è unitaria con il database finto. Provano che
la rotta **chiama la funzione giusta con gli argomenti giusti** e che **traduce** gli esiti. Non
provano nulla su che cosa faccia il database. L'esecutore lo scrive per primo nel suo §6, ed è vero.

---

## Correttezza — i tre motivi della spec §0 arrivano alla funzione giusta

| motivo (+ ramo) | azione derivata | funzione chiamata | dove |
|---|---|---|---|
| `destinatario_errato` | `'torna_pronto'` — riga **fissa**, non dal bivio | `riporta_a_pronto_atomica` | `effetti.ts:160` → `route.ts:458` |
| `difetto_lavorazione` + `si_sistema` | `'torna_pronto'` | `riporta_a_pronto_atomica` | `effetti.ts:254-262` → `route.ts:458` |
| `difetto_materiale` + `si_sistema` | idem | idem | idem |
| `difetto_*` + `si_rifa` | `'crea_rifacimento'` | `crea_rifacimento_atomico` | `effetti.ts:264-272` → `route.ts:460` |
| `errore_registrazione` | `'riapri_lavoro'` | `riapri_lavoro_atomica` | `effetti.ts:192` → `route.ts:456` |

**Nessuno dei tre motivi della §0 può finire su `riapri_lavoro_atomica`**, e le prove lo asseriscono
in entrambi i versi (`toHaveBeenCalledWith` sulla giusta **e** `not.toHaveBeenCalledWith` sulla
sbagliata, `:905` e `:1265`).

## Il rinominare è completo

`grep -rn "riapertura" src tests`: nessuna occorrenza come **nome di campo**. Le uniche due sono
asserzioni negative (`expect(body.riapertura).toBeUndefined()`, `:856` e `:1342`); tutto il resto è
prosa di commento o moduli estranei (overlay, scroll, consegna).
`tests/unit/DevoIntervenire.test.tsx` usa `esito_azione` in tutti e quattro i punti (`:105`, `:178`,
`:189`, `:200`) — cioè i quattro che il resoconto dichiara e che `tsc` non vede.
`npx tsc --noEmit` → **uscita 0**. **Rinominare chiuso.**

---

## I numeri del resoconto, ricontati

| dichiarazione | verifica |
|---|---|
| **31 su 37** contro l'abbozzo inerte | ✅ **riprodotto esattamente**: riportati `route.ts` e `DevoIntervenire.tsx` a `2ede802d` (prove intatte) → `Test Files 2 failed (2) · Tests 31 failed \| 104 passed (135)` |
| **6 casi già verdi** | ⚠️ **non rimisurati uno per uno** (servirebbe annullare ogni caso singolarmente). Il ragionamento del resoconto è coerente col codice; lo dichiaro **non verificato**, non «confermato» |
| difetto ⓐ (fixture `corpoValido`) | ✅ `git show 2ede802d:tests/unit/eventi-qualita-route.test.ts` porta `motivo: 'difetto_lavorazione'` come corpo minimo |
| difetto ⓑ (seconda fixture, verdi per il motivo sbagliato) | ✅ `git show 2ede802d:tests/unit/istante-roma.test.ts:264` porta lo stesso valore; e la guardia del bivio (`route.ts:257`) sta **prima** della lettura di `conosciuto_il` (`:295`) — quindi le prove che si aspettano 422 restavano verdi senza più misurare l'orologio di Roma. **Confermato per struttura** |
| difetto ⓒ (il comando del piano è verde e non prova niente) | ✅ **eseguito**: `ls tests/unit/api` → *No such file or directory*; `npx vitest run tests/unit/api` → `Test Files 9 passed (9) · Tests 221 passed (221)`, **uscita 0**, e **zero** occorrenze di `eventi-qualita-route` nell'output |
| discrepanza ⓔ (SEI vs OTTO) | ✅ il file a `2ede802d:827` dice «GLI ALTRI **SEI** MOTIVI»; il brief diceva «OTTO» |
| §5ⓒ `.gitignore:89` | ✅ **già chiuso** da `3ee5b7f2`: `git check-ignore -v .superpowers/sdd/pronto-task-7-report.md` non restituisce nulla |

🛑 **DEI DUE NUMERI DEL RESOCONTO NE HO RIPRODOTTO UNO SOLO, e va detto fuori dalla tabella.**
«31 su 37» l'ho **rifatto e ottenuto identico**. «Più sei prove già verdi» **non l'ho misurato
affatto**: per farlo bisognerebbe annullare ogni caso uno per uno, e non l'ho fatto. Il ragionamento
scritto nel resoconto è coerente con il codice che ho letto, ma **coerente non è misurato** — chi
legge non tratti quel sei come verificato da me.

⚠️ **Una precisazione onesta sul 31.** Quel numero mescola due cose: le prove del **bivio** e quelle
del **rinominare** (il codice pre-task non ha né l'uno né l'altro). Non è «31 prove sul bivio». La
scomposizione del resoconto (20 + 10 + 3 + 4) lo dice già, ma il numero da solo si legge male.

---

## Per chi esegue il Task 8

1. **Nessuna sovrapposizione di file.** Il Task 8 tocca `src/app/api/lavori/[id]/route.ts`; il Task 7
   ha toccato la rotta degli eventi, `rifacimento/route.ts`, `src/lib/rifacimento/cassetta.ts` (nuovo),
   `DevoIntervenire.tsx` e tre file di prove. **Niente blocca l'avvio del Task 8.**
2. **La porta della §1 è aperta e raggiungibile ADESSO da tre motivi** (I2). Prima di oggi ci si
   arrivava solo da `errore_registrazione`, che però la dichiarazione la annulla. È ciò che rende D308
   urgente e non solo dovuto.
3. **Il predicato «esiste una dichiarazione viva» esiste già, e ha una definizione sola.** La RPC lo
   calcola come `stato <> 'annullata'` (`20260807182614:92-94`), che è la stessa forma dell'indice
   `ddc_lavoro_attiva_unique`. **Il Task 8 usi quella**, mai un elenco di stati enumerato: due
   definizioni dello stesso predicato divergono, ed è la classe «le liste scritte due volte».
   In risposta arriva già come `esito_azione.dichiarazione_viva`.
4. **Non c'è nessun cancello di stato su questa rotta** (dichiarato, `route.ts:48-53`): il Task 8 non
   può contare sul fatto che un evento arrivi solo su lavori consegnati.

## Che cosa deve arrivare al Task 9 (e blocca il merge su `main`)

- **C1 — con la parola giusta: il riquadro del successo è INVERTITO, non incompleto.** E in ordine di
  peso, non in elenco piatto:
  **(a)** «La dichiarazione è stata annullata» sul ramo che la tiene viva → **difetto di correttezza,
  è questo che blocca**; **(b)** lo stesso riquadro sul ramo che CREA un lavoro, dove sono false
  entrambe le righe; **(c)** il titolo del riquadro di guasto, che è **giusto** sul ripristino e
  sbagliato solo sulla creazione → correzione minore, non della stessa famiglia.
  Il canale c'è già (`dichiarazione_viva`, `lavoro_nuovo`): manca chi lo disegna.
- **I1 — il doppio tocco su «se ne fa uno nuovo» non è protetto dall'API.** Oggi lo trattiene solo la
  spia `lavorando` del componente. Se il Task 9 tocca quel foglio, la spia va tenuta — ma la chiusura
  vera sta altrove (un identificativo di richiesta, o un cancello sull'esistenza di un rifacimento
  vivo per quel lavoro), ed è una decisione, non una correzione di rotta.
- **M2** — decidere se «si rifà» su un lavoro non consegnato debba dire `fallito` o `non_applicabile`.

---

## Verifiche di stato, con l'uscita letta da variabile

```
npx vitest run   → Test Files 444 passed | 6 skipped (450)
                   Tests 5467 passed | 68 skipped (5535)      uscita=0
npx tsc --noEmit → log vuoto                                   uscita=0
git status --porcelain → (vuoto)
git log --oneline -1   → 3ee5b7f2
```

`next build` e `verify:full` **non lanciati** (istruzione del mandato): restano dovuti a chi orchestra.
