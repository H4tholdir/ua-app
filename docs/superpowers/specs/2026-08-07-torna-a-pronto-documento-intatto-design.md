# Spec — «Torna a `pronto` col documento intatto», e il bivio dei due difetti

**Data:** 7 agosto 2026 (`provato:` `date`, comando separato) · **Ondata:** «si deve sempre poter intervenire»
**Ramo:** `intervento-post-consegna` · **Nasce da:** ritrovamento **R9**, riga **23** della coda di ROADMAP
**Decisioni che la reggono:** D290 · D291 · D293 · D297 · D298 · **D304-D307** · **D308** · **D309** · **D310**
**Verbale:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`, tornate **128-131**
**Stato:** ✅ **RATIFICATA da Francesco il 07/08/2026, 18:19** («*va bene, procedi col piano*») — i tre punti aperti sono chiusi da **D308** (§1.1), **D309** (§4.2) e **D310** (§5.2)

---

## 0. Il difetto in una frase

Tre motivi su nove chiedono che il lavoro **torni fra i pronti mentre la dichiarazione resta valida**.
Nessuna transizione lo fa: l'unica funzione che riporta a `pronto` — `riapri_lavoro_atomica` —
**annulla la dichiarazione incondizionatamente**. E annullare il documento di una consegna realmente
avvenuta cancella l'unica prova che quel manufatto è esistito ed è andato a un paziente (**D293**).

| motivo | il lavoro | la dichiarazione | decisione |
|---|---|---|---|
| `destinatario_errato` | torna a `pronto` | resta valida — «diceva il vero» | D291 |
| `difetto_lavorazione` → ramo «si sistema» | torna a `pronto` | resta valida | D290 · D298 |
| `difetto_materiale` → ramo «si sistema» | torna a `pronto` | resta valida | D297 · D298 |
| `difetto_lavorazione`/`difetto_materiale` → ramo «si rifà» | **resta consegnato** | resta valida; il lavoro nuovo avrà la sua | D298 · D306 |

---

## 1. 🔴 IL DIFETTO CHE IL PANEL HA TROVATO, e che ribalta la prima stesura

**La prima stesura di questa spec diceva che lasciare viva la dichiarazione «è giusto, perché non se
ne emette una nuova». Era vero a metà, e la metà mancante produce un documento falso.**

L'annullamento in `riapri_lavoro_atomica` non serviva **solo** a dire «questa consegna non c'è stata»:
era anche **il meccanismo che faceva arrivare le correzioni sul documento**. Morta la dichiarazione, la
consegna successiva ne emetteva una nuova dai dati aggiornati. Tolto l'annullamento **senza aggiungere
altro**, la finestra di correzione resta **aperta sul lavoro e chiusa sul documento**.

**La catena, verificata riga per riga sui quattro file (non dedotta):**

1. `torna_pronto` riporta il lavoro a `pronto` e non tocca la dichiarazione.
2. `PATCHABLE_FIELDS` (`src/app/api/lavori/[id]/route.ts:198-243`) contiene `paziente_id`,
   `cliente_id`, `richiedente_nome`, `tipo_dispositivo`, `descrizione` — cioè le voci **③, ④ e ⑤**
   dell'Allegato XIII punto 1. `provato:` la PATCH **non ha nessun cancello** né su `lavori.stato` né
   sull'esistenza di una dichiarazione viva: l'unico blocco è fiscale (`:610-611`).
3. `precheckMDR` (`src/lib/consegna/precheck.ts:73-144`) misura il **lavoro vivo**, mai la
   dichiarazione: su dati corretti dà **verde**.
4. `generateDdC` (`src/lib/pdf/generate-ddc.ts:383-392`) trova la dichiarazione viva e **restituisce
   quella**, senza rigenerare nulla.

➡️ **Un dispositivo può uscire accompagnato da una dichiarazione che nomina un altro paziente, con il
controllo verde su tutto il percorso.** **Art. 21(2) MDR**, verbatim: «*I dispositivi su misura sono
muniti della dichiarazione di cui all'allegato XIII, punto 1, che è messa a disposizione di un
determinato paziente o utilizzatore, identificato mediante il nome, un acronimo o un codice numerico.*»
L'identità è **la cosa che non può divergere**.

### 1.1 Il rimedio — ⚖️ **D308**

🔑 **Non si inventa un innesco nuovo: si indirizza al percorso che esiste già.**

Finché su un lavoro esiste una **dichiarazione viva** (`stato <> 'annullata'`), la PATCH **rifiuta**
le modifiche alle voci stampate — `paziente_id`, `cliente_id`, `richiedente_nome`, `tipo_dispositivo`,
`descrizione` — con **422** e un testo che dice **dove andare**, non solo che è vietato:

> «Questo dato è già stampato sulla dichiarazione consegnata. Per cambiarlo bisogna rifare il
> documento: apri «Devo intervenire» e scegli «dato sbagliato sulla dichiarazione».»

**Perché è la strada giusta e non un blocco cieco:**
- **La riemissione esiste già** — è il Task 5 di quest'ondata, motivo `errore_dato_dichiarazione`
  (`riemettiDdC`, `src/lib/pdf/generate-ddc.ts:454`), che annulla la vecchia **conservandola** e ne
  emette una nuova con `sostituisce_id`. Il percorso corretto è costruito e provato.
- **Non contraddice la direttiva del 27/07** («ogni campo si corregge fino alla consegna»): il confine
  di quella finestra è stato fissato dal panel normativo del 29/07 e **si aggancia all'emissione della
  dichiarazione**, non a un momento arbitrario. Con una dichiarazione viva la finestra è chiusa **per
  quelle cinque voci soltanto** — tutti gli altri campi restano correggibili.
- **È l'idioma già in casa:** la guardia di `errore_registrazione` (`eventi-qualita/route.ts:233-235`)
  rifiuta e **nomina il motivo giusto**. Stessa forma.
- 🛑 **La guardia sta nell'API**, mai nell'interfaccia: è la lezione pagata tre volte il 07/08.

⚠️ **Confine dichiarato:** questa regola vale per **ogni** lavoro con dichiarazione viva, non solo per
quelli tornati a `pronto` da qui. È più larga del perimetro dell'ondata, ed è deliberato: restringerla
al solo caso nuovo lascerebbe aperta la stessa porta su tutti gli altri.

---

## 2. 🔴 IL SECONDO DIFETTO — la data che fa partire l'orologio dei dieci anni

`riapri_lavoro_atomica` azzera `data_consegna_effettiva` e `consegna_completata_at`. **È corretto lì**
— la sua premessa è che la consegna non è mai avvenuta (D288). **È sbagliato per `torna_pronto`**, la
cui premessa è l'opposto (D293: il manufatto è uscito davvero).

**Allegato XIII punto 4**, verbatim: «*La dichiarazione di cui alla parte introduttiva del punto 1 è
conservata per un periodo di almeno 10 anni **dalla data di immissione sul mercato del dispositivo***.»
**Art. 2(28):** l'immissione sul mercato è la **prima** messa a disposizione. Dopo `torna_pronto` +
riconsegna, l'unica data in banca dati sarebbe la **seconda**: `data_consegna_effettiva` vive solo su
`lavori`, non esiste storico, e `orchestrate.ts:324-329` la riscrive a ogni consegna.

➡️ **Il danno non è «si perde una traccia»: il termine calcolato dall'app parte tardi, e un
laboratorio che si fidasse butterebbe la dichiarazione PRIMA che l'obbligo sia scaduto.**

### 2.1 Il rimedio — una colonna immutabile, non un'eccezione al ripristino

`lavori.prima_immissione_at TIMESTAMPTZ` — scritta **una volta sola** alla prima consegna
(`COALESCE(prima_immissione_at, now())` in `orchestrate.ts`), **mai** azzerata da nessuna riapertura.
Backfill nella stessa migration: `SET prima_immissione_at = data_consegna_effettiva WHERE stato =
'consegnato' AND data_consegna_effettiva IS NOT NULL`.

➡️ **Detto senza ambiguità:** `riporta_a_pronto_atomica` **azzera gli stessi nove campi** della gemella,
`data_consegna_effettiva` compresa. La memoria dell'immissione **non sta più in quel campo**: sta in
`prima_immissione_at`, che nessuna riapertura tocca. Le due funzioni restano quindi identiche sul
ripristino — ed è ciò che rende sicuro estrarne il corpo condiviso (§3.1).

**Perché così e non «`torna_pronto` non azzera la data»:** lasciare piena `data_consegna_effettiva` su
un lavoro `pronto` cambierebbe il significato di una colonna letta in molti punti (pile, metriche,
finestra dei 10 minuti di `annulla_consegna_atomica`, `20260710180000:83-85`) — e ognuno di quei punti
andrebbe censito. Una colonna nuova **non cambia niente di esistente** e regge anche il caso di un
`errore_registrazione` usato male. ⚠️ `provato:` `annulla_consegna_atomica` controlla `stato <>
'consegnato'` **prima** della finestra (`:82`), quindi nessuna delle due scelte la rompe — ma il
censimento degli altri consumatori resterebbe dovuto, e questa via lo evita.

---

## 3. La transizione

### 3.1 Una seconda RPC, con il corpo condiviso estratto

`riporta_a_pronto_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid) RETURNS json`

Fa il ripristino a `pronto` **senza toccare `dichiarazioni_conformita`**. Stessi controlli d'ingresso
della gemella: lavoro del laboratorio, `deleted_at IS NULL`, `FOR UPDATE`, stato `consegnato`, evento
esistente e coerente col lavoro/laboratorio.

🔑 **Il ripristino (i nove campi) si estrae in una funzione interna condivisa**, e le due RPC pubbliche
tengono solo ciò che le distingue — il trattamento della dichiarazione.
**Il fatto che lo impone:** `20260807143623_riemissione_ddc.sql:205-257` ha già dovuto **ricopiare per
intero** il corpo di `riapri_lavoro_atomica` per cambiare **una** assegnazione. Con una terza copia,
ogni futuro campo da azzerare andrebbe applicato in tre posti.
🛑 **Non è l'interruttore booleano scartato:** l'atto distruttivo resta **nel nome della funzione
pubblica**, e nessun parametro decide se un documento a valore legale viene annullato.

**Scartate, con motivo:** ① `p_annulla_ddc boolean` sulla RPC esistente — è la «coppia incoerente
(motivo, azione) che arriva a un atto distruttivo», comparsa tre volte in un giorno; ② una RPC unica
che legge `eventi_qualita.motivo` e decide da sé — sposterebbe la tabella degli effetti dentro SQL,
seconda fonte di verità accanto a `effetti.ts` (riga 22 della coda: «le liste scritte due volte»).

**Sicurezza:** `SECURITY DEFINER`, `SET search_path`, `REVOKE ALL … FROM PUBLIC, anon, authenticated`,
`GRANT EXECUTE … TO service_role`, `COMMENT`.

### 3.2 La risposta dice se la promessa è mantenuta

La gemella segnala `ddc_assente` quando non trova nulla da annullare. Questa deve fare il simmetrico:
**se non esiste una dichiarazione viva, «resta valida» è una frase falsa**. La RPC restituisce
`{ esito, ddc_viva: true|false }`, e l'interfaccia rende visibile il caso `false` — è la stessa regola
di R10: *un campo negativo che nessuna schermata disegna è indistinguibile da un successo*.
⚠️ E la conseguenza pratica va scritta: con `ddc_viva = false` la riconsegna **genererà** una
dichiarazione nuova, bruciando un progressivo (`generate-ddc.ts:383-392` restituisce la vecchia
**solo** se ne trova una con `stato <> 'annullata'`).

### 3.3 La finestra `ddc_lavoro_attiva_unique` — dichiarata, non scoperta

L'indice è `UNIQUE (lavoro_id) WHERE stato <> 'annullata'` (`20260710090000:14-17`). Lasciando viva la
dichiarazione, **lo slot attivo resta occupato**, ed è **giusto**: non se ne emette una nuova.
🛑 **Da leggere insieme alla §1, o si ripete l'errore della prima stesura:** «lo slot resta occupato» è
corretto sul piano dell'indice **e non basta da solo** — è esattamente la frase che aveva nascosto il
buco della propagazione. Regge **perché** la §1.1 chiude la strada per cui i dati stampati potrebbero
divergere; senza quella, la stessa frase sarebbe la copertura di un documento falso. Alla
riconsegna `generateDdC` restituisce quella, senza file nuovo né progressivo bruciato. `precheck.ts`
non interroga affatto le dichiarazioni, quindi **non blocca** la riconsegna (`provato:` letto).
⚠️ **Conseguenza per la riga 24 della coda:** dopo quest'ondata la porta di idempotenza di `generateDdC`
— oggi indistinguibile da un successo — viene percorsa **di routine**, non più solo su ritentativo.

---

## 4. Il bivio dei due difetti (D304 · D305)

### 4.1 Dove sta il dato

- **`eventi_qualita.scelta_intervento TEXT`**, con
  `CHECK (scelta_intervento IN ('si_sistema','si_rifa'))` **e**
  `CHECK (scelta_intervento IS NULL OR motivo IN ('difetto_lavorazione','difetto_materiale'))`.
  🛑 **Solo l'implicazione «se c'è, allora è uno dei due motivi».** Il biconditionale (*presente ⇔
  motivo ∈ {due}*) **farebbe abortire la migration**: `provato:` in banca dati esistono già **2 righe**
  con `motivo = 'difetto_lavorazione'` e nessuna scelta, e `NOT VALID` non salva — le renderebbe solo
  non più aggiornabili (23514 al primo UPDATE). L'altra metà la fa il **422** della §4.4, dove sta la
  regola viva: metterla in SQL creerebbe la seconda fonte di verità che §3.1② scarta.
- **`lavori_rifacimenti.evento_id` ESISTE GIÀ** — `20260806140823_eventi_qualita.sql:63-64`, con FK
  **composita** cross-tenant (`20260806142910:46-50`) e indice (`:107-108`).
  🔄 **CORREZIONE ALLA PRIMA STESURA DI QUESTA SPEC, che diceva il contrario:** aggiungere una seconda
  colonna avrebbe reintrodotto la FK semplice **chiusa il 06/08 sotto l'etichetta «CRITICO 2»**. Manca
  solo che la RPC la **scriva**: oggi non compare nell'INSERT (`20260805201640:152-158`).
- **`lavori_rifacimenti.motivo`** — il CHECK dei sette valori (`005_v1_foundation.sql:77-83`) si
  allarga con `difetto_lavorazione` e `difetto_materiale`. Scriverci `altro` perderebbe l'unica
  informazione che conta. ⚠️ **Da questo nascono tre allowlist sullo stesso campo** e va detto: il
  database ne accetta **9**, la rotta HTTP del rifacimento **7** (deliberato — quei due non si scelgono
  a mano), e **la RPC non valida affatto `p_motivo`** (`20260805201640:113,157`): l'unico guardiano dei
  due valori nuovi è la derivazione dentro la rotta degli eventi.
- **`crea_rifacimento_atomico`** prende `p_evento_id uuid DEFAULT NULL` in coda e lo scrive.
  🛑 **`CREATE OR REPLACE` non può aggiungere un parametro** → serve `DROP` + `CREATE`. E il DROP
  **butta via l'ACL**: `provato:` una funzione creata ex novo in `public` nasce con
  `anon=X, authenticated=X, PUBLIC=X`. Poiché la funzione è `SECURITY DEFINER` e **non ha nessun filtro
  tenant** (`20260805201640:56`), lasciarla così la renderebbe chiamabile con la chiave pubblica:
  chiunque, con un uuid, creerebbe un lavoro nel laboratorio di chiunque. ➡️ **Nella stessa migration:
  DROP → CREATE → REVOKE → GRANT → COMMENT.** ⚠️ Il REVOKE storico
  (`20260704180000_security_hardening_functions_revoke_drop.sql:38-39`) è scritto sulla firma a **5**
  argomenti e dopo il CREATE **non copre più niente**. `provato:` nessuna dipendenza (`pg_depend` → 0
  righe, nessun trigger, nessuna vista): il rischio è tutto nell'ACL.

### 4.2 L'idempotenza e la cassetta — i due tappi di D307

- **`UNIQUE (laboratorio_id, evento_id)` su `lavori_rifacimenti`** (l'indice esistente **non** è
  unique). Senza, un doppio tocco o un ritentativo dopo un timeout crea **due lavori** e brucia due
  progressivi: `crea_rifacimento_atomico` incrementa `progressivi_anno` (`20260805201640:65-69`) e il
  guard del client è solo in memoria (`DevoIntervenire.tsx:147`). Col vincolo, il secondo tentativo è
  un `23505` **riconoscibile** — la rotta lo traduce in «questo rifacimento esiste già», e restituisce
  il lavoro nuovo invece di crearne un altro.
- **La cassetta segue il rifacimento.** Il trasferimento **non sta nella RPC**: vive nella rotta HTTP
  (`rifacimento/route.ts:197`, `trasferisciCassettaAlRifacimento`, fail-soft assoluto). Il percorso
  nuovo **riusa quella stessa funzione** — o due percorsi che creano lo stesso oggetto si
  comporterebbero in modo diverso, e il tecnico andrebbe a un cassetto vuoto.
  ⚖️ **D309:** il trasferimento è **fail-soft** anche qui (un cassetto non spostato non annulla
  un lavoro già creato), coerente con il percorso esistente.

### 4.3 Il modulo degli effetti

`AzioneAutomatica` si allarga a `'riapri_lavoro' | 'torna_pronto' | 'crea_rifacimento'`.
`effettoDaMotivo(motivo)` resta invariata; si aggiunge `effettoDaMotivoEScelta(motivo, scelta)` che
risolve `scelta_richiesta`/`segue_la_scelta` nei due esiti concreti.
🛑 **La rotta deve restituire l'effetto GIÀ RISOLTO**, o la schermata finale ristampa la domanda a cui
la persona ha appena risposto: `DevoIntervenire.tsx:468` mostra `risposta.effetto.perche`, e per i due
difetti quel testo è formulato **come domanda aperta** (`effetti.ts:113` e `:121`).
⚠️ **Allargare l'unione NON produrrà errori di compilazione** dove serve: `DevoIntervenire.tsx:105`
ridichiara l'effetto localmente come `azione: string | null`. **Quel tipo lasco si stringe nella stessa
modifica**, o il censimento è decorativo.

### 4.4 Le guardie — tutte nell'API

| ingresso | esito |
|---|---|
| motivo ∈ {due difetti} e `scelta` assente | **422** — non si indovina |
| motivo ∉ {due difetti} e `scelta` presente | **422** — non si scarta in silenzio (idioma già usato per `natura`, `:199-201`) |
| `scelta` fuori vocabolario | **422** |
| `destinatario_errato` + `stato_dispositivo = 'mai_uscito_dal_lab'` | **422** — se non è mai uscito non può essere andato alla persona sbagliata: quel caso è «ho premuto per sbaglio» |
| uno dei due difetti + `stato_dispositivo = 'mai_uscito_dal_lab'` | **nessun 422**: il cancello di stato della RPC risponde `non_consegnato` → `non_applicabile`. ⚠️ **Da verificare in FASE 6**, non assunto |

⚠️ **Il 422 su `destinatario_errato` è RAGGIUNGIBILE dall'interfaccia** — a differenza del suo modello:
`statoDisp` parte da `consegnato_non_applicato` (`DevoIntervenire.tsx:138`) e «Mai uscito» è una
pastiglia liberamente toccabile (`:399-405`). ➡️ **La schermata deve impedire la combinazione prima
del modulo compilato**, non servire un vicolo cieco come toast alla fine. La guardia nell'API resta
comunque, perché è lì che sta il confine.

### 4.5 La doppia lettura di `destinatario_errato` — un motivo, due effetti

Il motivo copre **due casi che non hanno lo stesso effetto**, e il vocabolario non li distingue:

- **(a) consegna fisica alla persona sbagliata** → la dichiarazione **non nomina il destinatario**
  (`provato:` `DdcTemplate.tsx` porta fabbricante, data di emissione, prescrittore, paziente,
  dispositivo, conformità — nessun destinatario, nessun indirizzo, nessuna data di consegna) → `resta_valido`. ✅
- **(b) lavoro intestato al cliente sbagliato** → `prescrittore_nome` **ripiega sul nome del cliente**
  quando `richiedente_nome` è vuoto (`generate-ddc.ts:251-255`): la voce ⑤ dell'Allegato XIII p.1 è
  **falsa sul foglio**, e l'effetto dovuto è **`riemetti`**, non `resta_valido`. ❌

➡️ **La spec sceglie: il foglio non aggiunge una quarta domanda.** La §1.1 chiude il caso (b) da sola —
correggere `cliente_id`/`richiedente_nome` su un lavoro con dichiarazione viva è **rifiutato** e
rimandato al motivo «dato sbagliato sulla dichiarazione», che riemette. Chi sbaglia intestazione passa
di lì. **Il testo del 422 deve nominare anche questo caso.**

---

## 5. Che cosa NON entra, e perché

- **Il ramo «si rifà» non tocca la dichiarazione del lavoro vecchio** (D298).
- **Nessuno stato d'attesa**, nessuna riga «devi ancora decidere» (D305).
- **I quattro difetti ereditati dal rifacimento** — ritardo alla nascita · `numero_prescrizione` non
  clonato · nessuna via per annullare un lavoro · la scheda che non mostra i rifacimenti — vanno alla
  **riga 12 della coda**, dove sono già scritti per nome (**D307**).
- **La riga «reso senza difetto»** resta vuota (D292).
- **Il gate estetico L2** dell'ondata resta dovuto **dopo**, prima del merge.

### 5.1 Riferiti dal panel, FUORI mandato (R-E2) — voci nuove per la coda

1. 🔴 **La registrazione della rilavorazione non esiste.** Allegato XIII **punto 2** impone di tenere a
   disposizione la documentazione che consenta di comprendere «*la fabbricazione*» del dispositivo, e il
   **punto 3** che il processo garantisca la conformità a quella documentazione. Una riparazione **è**
   fabbricazione: oggi il lavoro torna a `pronto` e riparte, e fra la data della dichiarazione e la
   riconsegna **c'è il vuoto**. `scelta_intervento` dice *che cosa si è deciso*, mai *che cosa è stato
   fatto*.
2. 🟠 **L'azione correttiva non ha dove vivere.** Allegato XIII **punto 5**: il fabbricante «*predispone
   i mezzi idonei all'applicazione delle azioni correttive eventualmente necessarie*». `eventi_qualita` +
   `valutazioni_evento` coprono «valuta e documenta»; il «perché non ricapiti» non ha nessun posto.
3. 🟠 **La sorte del manufatto rientrato** (distrutto · tenuto per analisi · rimandato al medico): col
   ramo «si rifà» esistono **due** dispositivi dichiarati, e nessuno registra dov'è il primo.
4. 🟠 **I 15 anni degli impiantabili.** Il punto 4 dà 10 anni, **15 per gli impiantabili**, e nel codice
   non esiste nessun flag (`grep -rn "impiantabil" src/` → solo commenti).
5. 🟠 **L'archivio deve sopravvivere alla chiusura del laboratorio.** Allegato XIII p.4 rimanda
   all'Allegato IX p.8, che estende l'obbligo al caso di cessazione dell'attività. Su una PWA con ciclo
   `trial → … → blacklist` è un requisito di prodotto: zero occorrenze in tutto il progetto.
6. 🟡 **Il rifacimento eredita `listino_id` e `prezzo_unitario`** dall'originale: **non verificato** se
   la fatturazione escluda i rifacimenti.

### 5.2 Una ri-ratifica dovuta, non un'eredità — ⚖️ **D310**, fatta

Il panel del 06/08 giustificò «la dichiarazione resta valida dopo una rilavorazione» con **un solo
discriminante**: la lista dei lotti — se la riparazione consuma materiale nuovo, il foglio in mano al
paziente elenca lotti che non sono più quelli del dispositivo, quindi si riemette
(`plans/2026-08-06-intervento-post-consegna.md:1092-1095`). 🛑 **D294, lo stesso giorno, ha tolto
materiali e lotti dal foglio** (`DdcTemplate.tsx:449-455`): **quel discriminante non ha più un oggetto.**
La conclusione **regge lo stesso** — senza lotti stampati, una riparazione tipica non cambia nessuna
delle voci del foglio — ma **la sua prova è caduta**. ✅ **Ri-ratificata come D310 il 07/08/2026:**
da oggi quella conclusione poggia su **D294**, non più sul panel del 06/08.

---

## 6. Le prove (FASE 6, TDD)

**Unitarie** — `effettoDaMotivoEScelta` su tutte le combinazioni (due motivi × due scelte, più i sette
motivi che non ammettono scelta, più gli ingressi fuori vocabolario e le chiavi del prototipo);
l'allargamento di `AzioneAutomatica` con il tipo stretto in `DevoIntervenire`.

**Di rotta** — le cinque righe della §4.4, ognuna con **il valore che DEVE essere rifiutato** e il
messaggio incollato (R-P1); il 422 della §1.1 sulla PATCH, con un campo ammesso e uno rifiutato sullo
stesso lavoro.

**Di integrazione (banco vero, credenziali)** — il giro completo per ciascuno dei tre motivi:
`torna_pronto` lascia la dichiarazione viva e **`prima_immissione_at` invariata** · la riconsegna
**non brucia un progressivo** (numero identico prima e dopo) · `si_rifa` chiamato due volte crea **un
solo** lavoro (23505 alla seconda) · la cassetta segue.

🛑 **Ciò che nessuna prova unitaria può vedere** — è la lezione del 07/08: il difetto che vive nel
framework che la prova sostituisce. **La FASE 9 sul banco vero non è un rituale**, ed è l'unica rete
per la catena della §1.

---

## 7. Il gate FASE 3 (validazione architetturale)

| domanda | risposta |
|---|---|
| **Tenant isolation** | Sì. Le due RPC portano `p_laboratorio_id` e filtrano; `crea_rifacimento_atomico` **non ha filtro tenant** e va richiusa con REVOKE/GRANT dopo il DROP (§4.1) |
| **Schema drift** | Sì: 4 migration (colonna `scelta_intervento` + CHECK · colonna `prima_immissione_at` + backfill · CHECK di `lavori_rifacimenti.motivo` + UNIQUE · le due RPC). **FASE 6b dovuta**: `gen types` → `tsc` |
| **API contract** | La risposta della rotta eventi guadagna campi; nessun campo esistente cambia significato. ⚠️ Il nome `riapertura` copre ora **tre** azioni diverse: si rinomina, e il vecchio nome non resta come sinonimo |
| **Rollback** | Le migration sono additive tranne il CHECK allargato (reversibile) e il DROP+CREATE della RPC (il file porta la ricreazione completa). Il codice torna indietro con un revert del ramo — `main` non è toccato |
| **Dominio critico** | **Sì** — migration + documento a valore legale → **percorso GRANDE**, panel fatto (§1, §2, §4 nascono da lì) |

---

## 8. L'ordine di esecuzione, e non è un dettaglio

🛑 **Prima le migration, poi il codice.** Le migration si applicano a mano (D284), il codice va in aria
col push (D296). Se il codice arrivasse prima, la chiamata con il parametro nuovo uscirebbe `PGRST202`
— e nella finestra fra DROP e CREATE **anche la vecchia chiamata a 5 argomenti fallirebbe**.
