# Dossier di esplorazione — P38: `prescrizione_caratteristiche` a `null` cablato su ogni DdC

**Per:** Francesco, per la conversazione di approvazione (FASE 1-3 di P38).
**Quando:** 4 agosto 2026. **Come:** esplorazione in sola lettura (subagent, binario parallelo di
Fase 1 — girata mentre si facevano gli scatti di D193). Nessun file modificato, nessuna query
eseguita sul database. Ogni affermazione porta `file:riga` o `provato:`.

---

## §1 Il difetto, visto da vicino

**La riga incriminata.** `src/lib/pdf/generate-ddc.ts:156` — dentro l'oggetto `ddc` costruito a ogni generazione (righe 137-171):

```ts
prescrizione_caratteristiche: null as string | null,
```

Non è un fallback: è un **letterale `null` senza alcuna sorgente a monte**. L'oggetto `ddc` viene sia **reso nel PDF** (`generate-ddc.ts:177`) sia **scritto in banca dati** (`generate-ddc.ts:199-213`, INSERT su `dichiarazioni_conformita`): il vuoto è quindi permanente su carta e su disco.

**Il template lo nasconde invece di denunciarlo.** `src/components/features/pdf/DdcTemplate.tsx:442-447`: la riga «Caratteristiche prescritte:» si stampa **solo se il valore è truthy** → con `null` fisso, la sezione **non è mai comparsa su nessun PDF**. Chi legge il documento non vede un campo vuoto: non vede proprio il campo.

**Il posto in banca dati esiste dal principio.** La colonna `prescrizione_caratteristiche TEXT` (nullable) è nata con `supabase/migrations/002_fase2_schema.sql:180`, nel blocco «G. dichiarazioni_conformita — snapshot immutabile + Allegato XIII»; non è nella CREATE TABLE originale (`supabase/schema.sql:1197-1276`). Tipi generati: `src/types/database.types.ts:937, 996, 1055`; tipi di dominio: `src/types/domain.ts:592, 973` (commento: «Caratteristiche specifiche prescritte»).

**I vicini di casa nello stesso blocco** (utile per capire la struttura del documento):
- `prescrittore_nome` (righe 146-147): `richiedente_nome ?? cognome+nome del cliente` — è il difetto P37;
- `prescrizione_id` (riga 148): `lavoro.numero_prescrizione ?? null` — **anch'esso sempre null**, v. §7;
- `contiene_sostanze_o_tessuti: false` (riga 157): cablato — già censito come voce 1-7 della roadmap (`ROADMAP-UFFICIALE.md:960`);
- il commento di testa (righe 47-52) elenca già i «candidati al salto ddc-v2», e questo campo è nel giro dei referral della spec accenti.

Il test `tests/unit/ddc-pdf-content.test.ts:61` fissa il campo a `null` nella fixture: i test attuali **fotografano il difetto, non lo contestano**.

---

## §2 Censimento: dove vive «che cosa ha prescritto il dentista» (R-P6)

Numeri di hit, provati:
- `provato:` `grep -rn "prescrizione" src supabase (ts/tsx/sql) | wc -l` → **84**
- `provato:` `grep "prescri" src` (senza test) → **100 hit in 33 file** · su `supabase/` → **55 hit**
- `prescrizione_caratteristiche` → **30 hit totali** (8 in `src/`, 2 in `supabase/`, 1 in `tests/`, 19 in `docs/`)
- `numero_prescrizione` → **16 hit** · `prescrittore` → **17 hit** · `richiedente` → **35 hit**

I sei posti dove il concetto «prescrizione» esiste oggi, in ordine di rilevanza per P38:

1. **`lavori.numero_prescrizione`** (`supabase/schema.sql:888`, «Numero prescrizione del dentista (campo protetto)») — colonna esistente, **senza NESSUNO scrittore**: non è nel body del POST `/api/lavori` (`src/app/api/lavori/route.ts:225-252`, elenco campi verificato) ed è **esclusa dall'allowlist PATCH** con motivazione «nessun writer nel form React attuale» (`src/app/api/lavori/[id]/route.ts:55`).
2. **`lavori_denti.provenienza`** `'prescritto'|'eseguito'` (`supabase/migrations/20260727120100_lavori_denti_tabella.sql:44-46`, decisione W20) — **l'unico seme del dato «prescritto» oggi in banca dati**. Il wizard scrive `provenienza: 'prescritto'` (`src/lib/wizard/crea-lavoro.ts:356`).
3. **La foto della prescrizione** — categoria `'prescrizione'` (D91/D92, `supabase/migrations/20260802090000_lavori_immagini_categoria_prescrizione.sql:50`; `src/lib/domain/categorie-foto.ts:34`). **Il wizard la raccoglie già**: `src/components/features/wizard/FrameFatto.tsx:174-185` carica l'immagine con `categoria: 'prescrizione'`. È un'immagine, non testo: nessun campo ne trascrive il contenuto.
4. **`dichiarazioni_conformita.prescrizione_caratteristiche`** (`002_fase2_schema.sql:180`) — la destinazione, sempre vuota (§1).
5. **`prescrizioni_digitali`** — tabella completa del portale dentisti inbound (`supabase/schema.sql:1733-1796`: token monouso, stati, RLS, indici, perfino realtime a `:2697`), con FK da `lavori.prescrizione_digitale_id` (`schema.sql:897, 2004-2012`). `provato:` grep su `src/` → **0 usi** fuori dal file dei tipi generato. **Il portale non è mai stato costruito.**
6. **`lavori.descrizione`** — non è la prescrizione: il wizard la genera dall'etichetta del tipo (`crea-lavoro.ts:129`, `descrizioneTipo`).

**Il wizard `/lavori/nuovo` raccoglie** (input di `creaLavoro`, `crea-lavoro.ts:239-243`): dentista, tipo, paziente, elementi (denti FDI), colore, foto, data di consegna. **Niente di testuale sul prescritto.** I denti e il colore ci sono, ma D101 vieta di spacciarli per «prescritti» (v. §5). La cosa più vicina al prescritto che il wizard tocca è la foto (punto 3), che è cieca al testo.

---

## §3 Che cosa chiede la norma (solo ciò che sta nei documenti del repo)

**Il quinto/sesto elemento dell'Allegato XIII punto 1.** `../ANALISI/17_adempimenti_lab_2026.md:145-150` (elemento 6 della lista, corretta il 03/08/2026 da D101):

> *norma:* «le caratteristiche specifiche del prodotto indicate nella prescrizione» […] ② l'elemento riguarda **il PRESCRITTO**, non il realizzato — il realizzato appartiene all'elemento 2. Riempire questo con l'as-built attribuisce al medico parole non sue.

Stessa citazione, con la resa inglese, in `docs/design/decisions/2026-07-27-wizard-nuovo-lavoro-brainstorming.md:127-131` («*the specific characteristics of the product as indicated by the prescription*»), lì su **fonti secondarie dichiarate** (medical-device-regulation.eu, medicaldevicenews.eu).

**L'incrocio con l'Art. 2(3)** — è ciò che rende P38 una questione di qualificazione, non di anagrafica. `../ANALISI/17_adempimenti_lab_2026.md:151-155`:

> l'Art. 2(3) definisce su misura il dispositivo fabbricato «sulla base di una prescrizione scritta … **che indichi** … le caratteristiche specifiche di progettazione». Se non ci sono caratteristiche prescritte, il dispositivo **non è su misura** — quindi una dicitura «nessuna caratteristica prescritta» metterebbe per iscritto che il presupposto dell'esenzione dalla marcatura CE non sussiste. Non si usa mai.

**La voce P38 stessa** (`docs/roadmap/ROADMAP-UFFICIALE.md:1022`) aggiunge **MDCG 2021-3 Q6** («dimensioni o file DICOM da soli non bastano») e dichiara come fonte primaria il consolidato **EUR-Lex CELEX `02017R0745-20260101`** (IT, «scaricato integralmente, riscontrato con EN»). Il frammento di MDCG 2021-3 Q6 nota 10 presente nel repo: `brainstorming:544-545` («*the number, type and positions of fixation screws*» — le caratteristiche si enumerano per elemento).

⚠️ Tensione documentale da tenere presente: la voce **P37** (`ROADMAP-UFFICIALE.md:1025`) avverte che il testo letterale dell'All. XIII poggiava su riproduzione secondaria perché «EUR-Lex si è troncato prima degli allegati in tre tentativi»; l'esito del panel D195 (`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md:1536-1538`) dichiara poi soddisfatto il vincolo D125. **Nel repo non c'è una copia del testo consolidato degli allegati**: la rilettura su fonte primaria alla ratifica resta un passo dovuto (→ §8).

---

## §4 Lo stato dei dati

**Dove si conterebbe** (non eseguito, come da mandato): tabella `dichiarazioni_conformita` (`supabase/schema.sql:1197`). Script già pronto: `scripts/tmp/verifica-conteggio-ddc.ts:36` (stampa «TOTALE dichiarazioni_conformita in archivio»); lettura riga per riga: `scripts/tmp/leggi-ddc.ts`.

**Che cosa dicono i documenti recenti.** `docs/roadmap/2026-08-03-ddc-produzione-referto.md:94-96`:

```
DDC-2026-0001  stato=annullata  payload=NULL       template=NULL    ← 22/07, prima di D102
DDC-2026-0002  stato=annullata  payload=16e98549…  template=ddc-v1  ← 31/07
DDC-2026-0003  stato=annullata  payload=2f66b3e1…  template=ddc-v1  ← 03/08
```

e alla riga 192: «Contatori dopo il giro: `ddc`=**3** (la prossima sarà `DDC-2026-0004`)». DdC **attive: 0** (`:190`). Tutte e tre, essendo generate da questo codice, hanno `prescrizione_caratteristiche` a `null` — il difetto è al 100% delle emissioni, ma le emissioni sono **3, tutte annullate, tutte di prova**.

**Il peso vero:** `ua-app/CLAUDE.md` §8 — i dati nel DB sono di TEST, si ripuliscono alla consegna; «Migrazione/backfill di dati preesistenti: rischio BASSO […] Se un backfill sbaglia, si rilancia». E c'è già un **precedente contrario al backfill**: `generate-ddc.ts:12-14` (A18) — «decisione Francesco: nessun backfill sui DdC storici — dati pre-consegna di test».

---

## §5 I vincoli già decisi

| Decisione | Che cosa vincola P38 | Dove |
|---|---|---|
| D101 (28/07) | 🚫 **Vietato** comporre il campo dai dati di caso (colore, tecnica, arcata): l'as-built è l'elemento 2, il prescritto è un altro fatto — «attribuzione falsa al medico». 🚫 **Vietata** la dicitura «nessuna caratteristica prescritta» (autolesionista via Art. 2(3)). ✅ **Destinazione dichiarata:** DUE righe distinte sulla dichiarazione («indicate nella prescrizione» / «come realizzato»), appoggiate a `provenienza`; «entra nell'ondata che progetta il dato prescritto» | `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md:655` |
| D195 (03/08) | Ogni lavoro porta sempre il nome del prescrittore; `richiedente_nome` esiste e va finito (valorizzato in 1 lavoro su 295). Il panel l'ha smontata → D196 | verbale `:1483`, panel `:1510-1622` |
| D196 (03/08) | «È la forma giuridica a decidere se UÀ chiede chi ha prescritto»: dottore singolo → zero domande; società/studio associato → domanda obbligatoria. Il campo «istituzione sanitaria» sulla DdC nasce comunque. **Due «non verificato» aperti** (studio associato = società? studio individuale = istituzione?) | verbale `:1629` |
| P37 | Il rimedio per il prescrittore sono **i due campi che la norma prevede** (persona + istituzione) — qualunque soluzione P38 stampa il prescritto accanto a un prescrittore che oggi è sbagliato nel 58% dei lavori vivi | `ROADMAP-UFFICIALE.md:1025` |
| W22 (spec wizard) | «Niente blocco al banco: il controllo sta alla consegna» — il precheck è il guardiano degli obblighi documentali | `docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md:292-303` |
| Direttiva §9 | «Ogni campo si corregge fino alla consegna»; il confine coincide con la legge: emissione DdC = consegna = immissione sul mercato (Art. 52(8) + Art. 2(28)) | `ua-app/CLAUDE.md` §9 |
| Ordine di lavoro | «PROSSIMO: scatti di D193, **poi P38 e P39** (gli unici che non dipendono da scelte di disegno)» | `ROADMAP-UFFICIALE.md:2,6` |
| Regola Advisor + FASE 3 | La soluzione scelta richiede panel di 2-3 advisor prima della ratifica; se c'è migration → percorso GRANDE | `ua-app/CLAUDE.md` §0C |

---

## §6 Le opzioni (per la conversazione di approvazione con Francesco)

Premessa comune a tutte: **niente backfill** — le 3 DdC esistenti sono di prova, tutte annullate, e il precedente A18 dice già «nessun backfill sui DdC storici»; la sezione §8 del CLAUDE.md rende comunque il rischio basso finché esiste.

### Opzione A — «La riga della prescrizione», campo di testo sul lavoro, obbligatorio alla consegna
L'addetta al front desk, quando registra il lavoro (o in qualunque momento dopo, fino alla consegna), **ricopia in un campo di testo che cosa ha scritto il dentista** — guardando il foglio o la foto della prescrizione che il wizard già archivia. Alla creazione è facoltativo (W22: niente blocco al banco); **alla consegna il precheck lo pretende** e senza non si genera la DdC.
- **Front desk:** un campo in più da riempire una volta per lavoro; correggibile sempre, fino alla consegna (direttiva §9).
- **Tecnica (senza codice):** una colonna nuova su `lavori` + allowlist PATCH + campo nel wizard/scheda + regola nel precheck + `generate-ddc.ts` legge la colonna al posto del `null`. C'è migration → percorso GRANDE (FASE 3).
- **Rischi MDR:** il testo libero invita l'operatore di fretta a scriverci l'as-built — esattamente ciò che D101 vieta; si mitiga con l'etichetta («Che cosa indica la prescrizione del dentista») e **mai** precompilando dai campi del caso. Non realizza ancora le «due righe» di D101, ma vi è compatibile: questa colonna diventerà la riga «prescritto».
- **Stima:** **1 sessione** (il wizard ha UI → mockup e approvazione obbligatori, workflow 0B); **0,5** se si parte dalla sola scheda di modifica senza toccare il wizard.

### Opzione B — «Il dato prescritto strutturato» (l'ondata che D101 ha già indicato)
Si progetta il prescritto come **dato**, non come testo: per-dente (il seme `provenienza` esiste già), colore prescritto, materiale prescritto, eventuale ancoraggio; la DdC stampa le **due righe distinte** («caratteristiche indicate nella prescrizione» / «dispositivo come realizzato»).
- **Front desk:** più strutturato ma più oneroso; da decidere se la compilazione stia al banco o alla consegna.
- **Tecnica:** migration su più tabelle, wizard, scheda, precheck, template; spec + mockup + piano con i tre registri. GRANDE.
- **Rischi MDR:** è la forma **più conforme** alla lettura di D101 (separa i due fatti come la norma li separa); ma le due «non verificato» di D196 vanno chiuse prima, e la complessità moltiplica le superfici d'errore.
- **Stima:** **2+ sessioni**.

### Opzione C — «Il campo alla consegna», ponte minimo
Nessuna colonna nuova: quando si preme «Consegna», se il campo manca il flusso **chiede lì la trascrizione** e la scrive direttamente sulla riga DdC (la colonna esiste già).
- **Front desk:** zero cambi alla creazione; chi consegna compila un campo al volo, magari guardando la foto della prescrizione in archivio.
- **Tecnica:** campo nel dialogo di consegna + il generatore accetta il valore + precheck. Niente migration. ⚠️ Punto delicato: la regola di casa dice «tutti i dati MDR caricati server-side, il client non passa mai valori MDR» (`ua-app/CLAUDE.md` §9, Precheck MDR) — qui il client *passerebbe* un testo MDR; è un dato raccolto e non un flag calcolato, ma il confine va fatto giudicare dal panel.
- **Rischi MDR:** compilazione all'ultimo momento, da chi consegna e non da chi ha ricevuto la prescrizione → massimo rischio di testo ricostruito a memoria o ricopiato dall'as-built; e il valore nasce e si congela nello stesso istante, senza finestra di correzione.
- **Stima:** **0,5-1 sessione**.

Lettura d'insieme onesta: **A è il passo che chiude P38 presto senza tradire D101 e resta la fondazione di B; C è più rapida ma concentra il rischio proprio nel momento peggiore; B è la destinazione già scritta a verbale, non il primo passo.**

---

## §7 Ritrovamenti fuori mandato (R-E2 — riferiti, non corretti)

1. **`prescrizione_id` è un secondo campo della stessa famiglia, sempre null.** `generate-ddc.ts:148` lo alimenta da `lavori.numero_prescrizione`, che **non ha nessuno scrittore** (assente dal POST `src/app/api/lavori/route.ts:225-252`; escluso dall'allowlist PATCH `src/app/api/lavori/[id]/route.ts:55`). Il numero della prescrizione non arriva mai su nessuna DdC. Non ho trovato una voce di roadmap che lo censisca da solo (rientra nel censimento «16 campi esclusi» promesso in `ua-app/CLAUDE.md` §9); chi progetta P38 dovrebbe decidere se chiuderlo nella stessa ondata.
2. **`prescrizioni_digitali` è schema morto:** tabella completa (token, RLS, indici, realtime — `supabase/schema.sql:1733-1796, 2697`) con **0 usi** nel codice applicativo (`provato:` grep → 0 hit fuori dai tipi generati). Se il portale inbound non è in roadmap a breve, è superficie da tener d'occhio (RLS/realtime su una tabella che nessuno esercita).
3. **Commenti dello schema ancorati alla norma sbagliata:** `supabase/schema.sql:878` («12 elementi obbligatori per la DoC (Allegato IV MDR)»), `:903` e `:919` citano ancora l'**Allegato IV**, che ANALISI/17:90 e `ua-app/CLAUDE.md` §6 correggono in Art. 52(8) + Allegato XIII (il commento a `schema.sql:1189` è invece già corretto). Commenti, non codice — ma su un progetto dove le citazioni normative contano.
4. (Già noto, lo richiamo perché confina con P38): il brainstorming `2026-07-27:553-555` segnala che la policy `ddc_laboratorio_update` consente UPDATE al tenant malgrado il commento «snapshot immutabile» — se una delle opzioni scrive sulla riga DdC (opzione C), quel rilievo torna d'attualità.

---

## §8 Che cosa resta da verificare

1. **Il testo consolidato dell'Allegato XIII p. 1 non è nel repo:** P38 dichiara il CELEX scaricato integralmente (`ROADMAP-UFFICIALE.md:1022`) e il panel D195 il riscontro riga per riga (`decisioni:1536-1538`), ma le copie nel repo restano citazioni; **da rileggere su fonte primaria alla ratifica** (vincolo D125).
2. **MDCG 2021-3 Q6:** nel repo c'è solo il frammento della nota 10 (`brainstorming:544-545`) — da verificare su fonte primaria.
3. **Il conteggio reale delle DdC** va misurato con `scripts/tmp/verifica-conteggio-ddc.ts` (i «3, tutte annullate» vengono dai referti del 03/08, non da una query di questa esplorazione).
4. **Le due «non verificato» di D196** (studio associato = «società» del c. 153? studio individuale = «istituzione sanitaria» ex Art. 2(36)?) — bloccanti per l'opzione B, indifferenti per A e C.
5. **Che cosa scrivono davvero i dentisti sulle prescrizioni** che arrivano al banco (basta un testo libero? servono campi?): per lo statuto delle fonti (`../CLAUDE.md` §7) nessun flusso si dà per buono — serve la parola di Francesco o materiale vero, ed è l'input che decide fra A e B.
6. **Per l'opzione C:** se passare un testo MDR dal client alla generazione sia compatibile con la regola «Precheck MDR server-side» (`ua-app/CLAUDE.md` §9) — da portare al panel advisor.
