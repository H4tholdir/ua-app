# Panel — due rettifiche prima di un solo avviso: il secondo promemoria spegne il primo?

**Data:** 10 agosto 2026, 00:36-01:15 (`provato:` `date`, comando separato)
**Domanda di Francesco (10/08, non ratificata di getto — v. verbale, centocinquantunesima tornata):**

> «*se il primo promemoria è ancora attivo, quando nasce il secondo non dovrebbe spegnere il primo
> che ormai è superato? chiedo non ne sono sicuro*»

**Panel:** tre advisor indipendenti — normativo (GDPR/MDR, fonti primarie) · architettura dei dati
(schema vivo, sonde in transazione annullata) · uso al banco (i file veri delle superfici).
**Stato:** ⚖️ **PROPOSTA UNANIME NEL RISULTATO, in attesa di ratifica** (il numero lo prende alla ratifica: **D354**).

---

## 1. La risposta in una frase

**No: il secondo NON spegne il primo — ma la sensazione di Francesco era giusta, e si risolve
dall'altra parte: UN SOLO atto di comunicazione chiude TUTTI i promemoria aperti di quel lavoro,
e il dentista vede l'UNIONE delle voci corrette.** In banca dati restano due righe (la prova);
a schermo, un promemoria e un messaggio solo.

## 2. Perché «spegnere» è la direzione sbagliata — tre strade, tre no indipendenti

- **Normativo:** due rettifiche sono **due obblighi quanto al contenuto** (ciascuna ha reso inesatta
  una parte diversa della copia in mano al dentista), ma **un solo atto può estinguerli entrambi**.
  Il fondamento vero è **Art. 5(1)(d) + 5(2) GDPR** (l'Art. 19 vale per le rettifiche chieste
  dall'interessato; qui il laboratorio corregge di propria iniziativa — la riserva ⑧① dell'handoff
  del 09/08 era fondata). Spegnere il primo lascerebbe a registro un obbligo nato e sparito senza
  traccia: un registro che sa cancellare le proprie righe **non è più una prova**.
- **Dati (misurato, non argomentato):** lo stato «superato» è **inscrivibile** — il vincolo
  `avviso_comunicato_ha_autore_e_data` pretende autore e data su ogni stato ≠ `da_comunicare`, e un
  «superamento» è un atto che nessuno ha compiuto: `provato:` sonda in transazione annullata,
  `23514` sul valore che doveva essere rifiutato; passa **solo fabbricando** autore e data.
  L'unico precedente in casa che «supera» una riga (`valutazioni_evento.superata`) lo fa perché la
  nuova riga **riafferma lo stesso fatto** — qui il secondo avviso parla di **voci diverse** dal
  primo: il meccanismo si trasferirebbe, il significato no.
- **Banco:** i due messaggi WhatsApp sarebbero **la stessa identica stringa** (`buildAvvisoMessage`
  compone numero + link + firma: niente cambia fra i due) — quindi «restano due» non consegna due
  comunicazioni: consegna **una comunicazione due volte**, e il promemoria che ricompare dopo l'invio
  si legge come «non è partito, rifallo». E «spegnere» sotto-dichiarerebbe al dentista quante cose
  sono cambiate, sull'unica superficie che esiste per provarlo.

## 3. Che cosa cambia nel codice (zero migration)

1. **La rotta di chiusura** (`src/app/api/lavori/[id]/avviso/route.ts:330`): il filtro passa da
   `.eq('id', avvisoId)` a **tutte le righe aperte di quel lavoro** — stesso `comunicato_at`,
   stesso `comunicato_da`, stesso `testo_inviato` su ognuna. I due `CHECK` sono soddisfatti senza
   fabbricare niente: l'atto è uno e la persona è una.
2. **Il portale (Task 8)** mostra **l'unione** dei `campi_corretti` delle righe aperte, e la
   dichiarazione da scaricare è **l'ultima** (l'avviso vecchio punta a una dichiarazione ormai
   `annullata`: mostrarla sarebbe offrire un documento superato).
3. **La scheda e la striscia** non cambiano: mostrano già **un** promemoria.

## 4. 🔴 Il caso di confine, trovato dall'advisor del banco — NON coperto dalla proposta

Se **fra le due correzioni** il dentista ha già aperto il portale (`visto_dal_dentista_at` scritto
sulla prima riga), le due righe **non sono più gemelle**: una è stata vista, l'altra no. La chiusura
in blocco resta corretta (l'atto del laboratorio è uno), ma **la ricevuta di lettura vale solo per la
prima rettifica** — e nessuna superficie oggi lo distingue. 📌 **Deciso di NON deciderlo qui:**
riguarda il Task 8/9 (come si mostra «visto»), e va con la riserva già aperta sull'interrogabilità
per paziente (handoff 09/08 §0⑧②).

## 5. Che cosa resta NON VERIFICATO (statuto delle fonti)

- Che un solo messaggio estingua due obblighi **su fonte** (EDPB/Garante: cercato, non trovato —
  l'argomento regge sul testo degli articoli, non su una guida).
- La **frequenza reale** del doppio avviso in un laboratorio vero: zero dati d'uso.
- GDPR Artt. 5/16/19 letti su fonti **secondarie concordanti** (privacy-regulation.eu,
  gdpr-text.com); MDR Art. 21(2) verbatim già verificato in casa sul consolidato CELEX
  `02017R0745-20260101`.
- 🟠 **Rilievo collaterale dell'advisor dei dati, fuori mandato, riferito:** `lavori_prescrizioni`
  **non ha il trigger di audit** (`_audit_trigger_fn` → 0) e `avvisi_dentista` nemmeno — una voce
  su sei dei campi correggibili non ha rete di recupero. → coda della roadmap.

## 6. Se la ratifica arriva

- La modifica alla rotta è **un compito nuovo dell'ondata** (tocca il Task 4), con la sua prova:
  due righe aperte → un atto → **entrambe chiuse, stessi tre valori**; e la prova inversa: la
  chiusura **non tocca** le righe già chiuse.
- Il Task 8 eredita il vincolo «unione delle voci, ultima dichiarazione».
- La prova del Task 2 («due riemissioni → due avvisi») **resta verde e resta giusta**: le righe
  continuano a nascere due.
