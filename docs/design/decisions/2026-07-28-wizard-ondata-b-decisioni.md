# Verbale — decisioni di apertura dell'ondata (b), wizard «Nuovo lavoro»

**Data:** 28 luglio 2026 · **Decide:** Francesco Formicola · **Stato:** ratificato in sessione
**Nasce da:** `docs/roadmap/2026-07-28-ondata-b-handoff.md` (punto di ripresa) + spec ratificata
`docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md` §5 e §12
**Precede:** i mockup (§0B) → la spec dell'ondata (b) → il piano.

> Questo verbale esiste perché **tre decisioni di oggi contraddicono documenti già scritti**
> (D3 contro l'handoff §3 e la testa della ROADMAP; D6 contro DS v3 §2.1). Lezione della voce 57:
> quando due documenti dicono il contrario, **vince quello letto per primo** — quindi le fonti
> contraddette vanno corrette, non solo superate. Le correzioni sono elencate in §4.

---

## 1. Le decisioni

| # | Decisione | Testo/motivo di Francesco | Conseguenza |
|---|---|---|---|
| **D1** | **Perimetro dell'ondata (b) = il solo wizard** (`/lavori/nuovo`) | scelta esplicita fra tre perimetri | Le tre eredità che vivono sulla **scheda del lavoro** (tendina 19/48, colore di caso non correggibile alla creazione, tre zone senza dente) e i due difetti della **home** restano tracciati e **fuori** |
| **D2** | **Nome e cognome del paziente: due caselle distinte, entrambe facoltative. Via i pulsanti «Salta»** | «non voglio vedere i pulsanti salta che sono inutili, in questa fase» | Conferma D6 della spec nome/cognome. Il blocco «Se vuoi, aggiungi» perde la sua ragione d'essere (v. §3) |
| **D3** | 🛑 **Il catalogo dei colori è CHIUSO** | «il colore può essere scelto da due liste di colori preimpostati, **non esiste poter inserire un colore che non esiste**; può capitare solo che l'operatore inserisca un colore "errato" rispetto alle richieste o la prescrizione, ma non rispetto al sistema che non lo riconosce» | **Decade la «quinta eredità»** dell'handoff §3 (catalogo non chiuso → panel). Nessuna regola nuova per «codici sconosciuti». L'errore possibile è **umano** e si intercetta al confronto pre-consegna (W22), non con la validazione |
| **D4** | **`pazienti` diventa un'anagrafica vera** — il wizard cerca prima di creare | scelta esplicita fra registro / anagrafica / via di mezzo | Il doppione smette di essere il caso normale (v. §2, prova ①) |
| **D5** | **L'anagrafica entra solo per la parte wizard** | scelta esplicita | **Dentro:** cerca-prima-di-creare + i due difetti di §2. **Fuori, voce propria:** unione di due schede già doppie, creazione/gestione dalla pagina `/pazienti` |
| **D6** | **Riconoscimento per COGNOME, disambiguato dal contesto** (dentista + data dell'ultimo lavoro accanto a ogni risultato) | scelta esplicita fra cognome / cognome+data di nascita / codice fiscale | **La data di nascita NON entra.** Nessuna casella nuova da riempire al banco. Coerente con la minimizzazione: nessuno degli 8 moduli di prescrizione veri esaminati chiede la data di nascita al laboratorio |
| **D7** | **Deroga concessa: nel wizard i cognomi si vedono a schermo — e la regola del DS si riscrive in forma vera** | scelta esplicita fra deroga locale / allineamento della regola / niente deroga | DS v3 §2.1:58 e la lista anti-pattern :511 vanno corretti: la regola oggi dichiara un invariante che l'app **già** non rispetta (parete cassette, D8 del 27/07) |
| **D8** | **Un passo «foto» sempre presente**, per tutti i tipi di lavoro | scelta esplicita | Chiude il buco creato dalla combinazione «prescrizione condizionale al tipo» (spec §5) + «riga foto oggi incondizionata»: senza D8, i tipi senza prescrizione resterebbero **senza fotocamera** |

---

## 2. I fatti verificati di persona (R-P1 — prova, non ricordo)

Tutti letti aprendo il file, non riferiti da terzi:

① **Il wizard non ritrova mai un paziente: ne crea uno nuovo quasi sempre.**
`crea-lavoro.ts:209` chiede i pazienti **di quel dentista**; `:214` cerca `codice_paziente === pz`;
`:216` riusa, `:219-236` altrimenti crea. Ma il codice proposto è sempre `PZ-<max+1>`
(`dati-wizard.ts:44-50`): **il confronto non può quasi mai colpire**.

② **Due caselle nell'interfaccia non arriverebbero a nulla.**
`crea-lavoro.ts:229-230` manda `nome: ''` e `cognome: alias || pz`, **fissi nel codice**.
È la riga che decide se D2 ha un effetto.

③ **Nessun vincolo di unicità sul codice paziente.** `supabase/schema.sql:461` —
`codice_paziente TEXT`, nudo: nessun UNIQUE, nessun indice (`grep` su `schema.sql` +
`migrations/*.sql`: **zero riscontri**). Il numero si calcola **su tutto il laboratorio**
(`dati-wizard.ts:106,128`) mentre la ricerca filtra **per dentista** (`crea-lavoro.ts:209`):
due persone diverse possono ricevere lo stesso codice, e nulla lo impedisce.
🔑 **Conseguenza di progetto:** una regola di unicità applicata solo nel codice dell'interfaccia
è la classe di difetto che questo progetto ha già pagato — **la sede naturale è il database**.
Da decidere nella spec, non qui.

④ **La bozza del wizard è `v:1` e va portata a `v:2`.** `persistenza.ts:12-24` porta
`alias`/`elemento`/`colore`; `:69` accetta `parsed.v !== 1 → null`. L'ondata (b) toglie quei campi
**e cambia il significato del numero di passo**: una bozza di oggi, ripresa domani, si riverserebbe
in un wizard con passi diversi. **Il comportamento della bozza vecchia (scartare o migrare) è una
decisione di disegno, non un dettaglio d'implementazione**: va nella spec.

---

## 3. Cosa ne segue per la forma del passo paziente

Conseguenza diretta di D2 + spec §5 (elemento e colore diventano passi propri): il blocco
**«Se vuoi, aggiungi» sparisce**. Restavano tre righe chiuse; due se ne vanno con i loro passi e la
terza perde il «Salta» per D2 — un accordion da una voce sola costa due tocchi e nasconde proprio il
dato che vogliamo facile. **Al posto del «Salta» non si mette niente: si toglie la serratura.**

Forma da portare ai mockup: colonna unica — domanda · aiuto · `CODICE PAZIENTE` (precompilato) ·
`COGNOME` · `NOME` · nota · `Continua`. **Nessun campo col cursore già dentro** (aprirebbe la
tastiera e seppellirebbe il tasto). Più caselle in una schermata non violano «una cosa alla volta»:
rispondono tutte a **una** domanda — precedente già v3 e già del wizard, `NuovoDentistaSheet.tsx:103-111`.

⚠️ **Il campo nasce senza la sua via di correzione, e va detto.** Direttiva permanente del 27/07
(«se non c'è la schermata da cui correggerlo, il campo non è finito»): il cognome digitato nel
wizard **non è visibile dal lavoro** — `paziente_nome_snapshot` non è scritto da nessuno, e la
correzione dalla scheda del lavoro è fuori perimetro (tappa 1-bis, panel normativo). La via di
correzione resta la **scheda paziente**, raggiungibile solo se il paziente si sa ritrovare: cioè
**D4 è anche la via di correzione di D2**, non un di più.

---

## 4. Le fonti da correggere (perché contraddicono le decisioni di oggi)

| Documento | Cosa dice oggi | Cosa va scritto | Decisione |
|---|---|---|---|
| `docs/roadmap/2026-07-28-ondata-b-handoff.md` §3 punto 5 | «il catalogo non è chiuso… **serve il panel**» | Il catalogo **è** chiuso (D3); il panel è stato fatto e la premessa è decaduta | D3 |
| `docs/roadmap/ROADMAP-UFFICIALE.md`, testa (agg. 26) | «più **la quinta che vuole il panel** (il catalogo non chiuso: esito asimmetrico…)» | idem | D3 |
| `docs/superpowers/specs/2026-07-07-design-system-v3…md` §2.1:58 e :511 | «Il nome paziente non compare **MAI** in UI» · anti-pattern «nome paziente in chiaro» | La regola vera: pseudonimo **per difetto**, con le deroghe esplicite e datate (parete cassette D8 del 27/07; ricerca paziente nel wizard D7 di oggi) | D7 |

---

## 5. Ciò che il panel ha smontato — da non riproporre

Il panel 3× sul colore (lenti: dato · banco · avversariale) ha **falsificato entrambe le gambe**
della premessa scritta nell'handoff §3:

- «sul POST rifiutare perderebbe **il lavoro**» → **falso**: un rifiuto alla porta torna **prima**
  della scrittura, non crea nulla, non brucia il progressivo (`genera_progressivo` è nella stessa
  transazione) e lascia la digitazione a schermo;
- «sul PUT rifiutare **non perde niente**» → **falso**: oggi il rifiuto avviene nel **client**
  (`useLavoroForm.ts:156-163`, che solleva prima della PATCH) e **blocca l'intero salvataggio** della
  scheda, non solo il colore.

L'asse vero non era «creazione contro correzione» ma **rumoroso contro silenzioso**.
🔑 **Con D3 la questione è chiusa a monte**: si sceglie da due liste, un codice sconosciuto non
esiste. Resta valido **un solo ritrovamento**, e non è una regola ma un difetto (v. §6, R1).

---

## 6. Ritrovamenti fuori mandato — riferiti, non toccati (R-E2)

Raccolti qui in una sezione sola, con la loro destinazione.

| # | Ritrovamento | Prova | Destinazione |
|---|---|---|---|
| **R1** | La tendina della scheda offre **19 codici su 48** — lista scritta a mano, scollata dal catalogo. Un `2M2` (che il sistema **conosce**) rende la casella **vuota a schermo** | `TabClinica.tsx:8-14` vs catalogo 48 | Fuori perimetro D1 → coda, **difetto vivo in produzione** |
| **R2** | La correzione **calcola** che un colore è stato scartato e poi **butta l'informazione** invece di mostrarla | `api/lavori/[id]/route.ts:402-406`, risposta `:471` | Coda (stessa famiglia di R1) |
| **R3** | Il controllo automatico che dovrebbe accorgersi di un catalogo cresciuto legge **una migration congelata** e pretende esattamente 48: resterebbe verde | `tests/unit/colore-dente-idratazione.test.ts:21-33` | Coda. ⚠️ Classe «rete che non può fallire» — la quinta volta in tre giorni |
| **R4** | L'etichetta stampa **`PAZ-PZ-0042`**: prefisso due volte | `EtichettaTemplate.tsx:128` + `dati-wizard.ts:50` | Ondata (b) se il mockup lo tocca, altrimenti coda |
| **R5** | Il precheck di consegna può fermarsi su un nome fatto di **soli spazi** (`' '` non è nullish) e **bloccare la consegna** di un lavoro che il codice identifica benissimo. La via d'ingresso è oggi chiusa dai due scrittori, non dal precheck; e `precheck.ts:40-42` fa `.trim()` mentre `generate-ddc.ts:93` no — **due scale di ripiego divergenti per lo stesso fatto** | `precheck.ts:40-43`, `generate-ddc.ts:93` | Coda, con test che oggi **non esiste** |
| **R6** | `paziente_nome_snapshot` **non è scritto da nessuno**: scheda del lavoro «—», portale del dentista mostra il **dispositivo** al posto della persona, e il **buono stampa «—» senza nemmeno ripiegare sul codice** | grep su `src/`, `supabase/`, `scripts/`: solo letture | Tappa 1-bis (voce 5 roadmap) — ma il **buono senza ripiego** è un difetto a sé |
| **R7** | Il **DPA che UÀ genera per il dentista promette** di trattare nome, cognome, data di nascita e codice fiscale — dati che il wizard **non chiede** | `DpaTemplate.tsx:155` | Coda, panel normativo |
| **R8** | Dal portale il dentista **scrive già** un identificatore del paziente (`paziente_codice_richiesta`) che **non legge nessuno** | `api/portale/richiedi/route.ts:46-47,148` | Domanda aperta (v. §7) |
| **R9** | La dettatura vocale parte sul **codice** invece che sul cognome: una parola dettata riscrive il codice | `PassoPaziente.tsx:49` vs spec nome/cognome §6 | Ondata (b), stesso passo |
| **R10** | `../ANALISI/17` chiama il laboratorio **«titolare»** in un punto (`:878`) e **«responsabile»** in un altro (`:778`), come il DPA firmato | — | Coda, allineamento documentale |

---

## 7. Domande ancora aperte (non decise oggi)

1. **Cosa mostrare al posto di «passo 2 di 3»** — i passi variano col tipo. 🔑 Fatto nuovo di oggi:
   il conteggio è ignoto **solo per i primi due passi**; scelto il tipo, la sequenza è determinata.
   → si decide **sui mockup** (§0B).
2. **Il testo d'aiuto che sostituisce «alias»** — voce rimasta aperta dal verbale del 27/07 §7.5.
   → mockup.
3. **La sede della regola di unicità del codice paziente** (database o codice) — v. §2 ③.
   → spec, con gate FASE 3.
4. **Il comportamento della bozza `v:1` esistente** (scartare o migrare) — v. §2 ④. → spec.
5. **Che fare dell'identificatore che il dentista scrive dal portale** (R8) — è l'unico punto in cui
   il paziente è nominato da chi lo conosce davvero.

---

## 8. Perimetro aggiornato dell'ondata (b) — dichiarato

D1 è stata scelta quando «(b)» significava *passi adattivi + odontogramma + colore per dente*.
Con D4/D5/D8 il contenuto è cresciuto. **Il perimetro vero, oggi, è:**

wizard adattivo sui 38 tipi · odontogramma v3 con le illustrazioni · colore per dente ·
passo paziente rifatto (due caselle, niente «Salta») · **ricerca del paziente prima di crearlo** ·
**i due difetti del codice paziente** · **passo foto sempre presente** · cassetta saltabile ·
avanzamento dei passi · **riscrittura della regola DS sul nome** · gate estetico L2 (FASE 9b).

**Fuori:** unione delle schede doppie · pagina `/pazienti` in scrittura · le tre eredità della scheda
del lavoro · i due difetti della home · la fotografia congelata del nome (tappa 1-bis).
