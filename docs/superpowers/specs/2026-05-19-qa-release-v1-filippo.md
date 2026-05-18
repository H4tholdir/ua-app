# Piano QA Release V1 — Consegna a Filippo Opromolla
**Data:** 2026-05-19  
**Obiettivo:** Verificare, testare e correggere ogni aspetto della PWA prima della consegna. Zero bug, zero dati mancanti, ogni flow operativo testato end-to-end.

---

## SEZIONE A — Import Dati DentalMaster (PRIORITÀ MASSIMA)

### Dati già importati ✅
- [x] 18 clienti/dentisti da LISTA CLIENTI.pdf
- [x] 72 lavorazioni × 4 fasce prezzo da LISTINO.pdf
- [x] 185 articoli magazzino da VALORI MAGAZZINO.pdf

### A1 — Verifica clienti nel DB vs PDF
**File:** LISTA CLIENTI.pdf (2 pag.)

Per ogni cliente verificare nel DB:
- [ ] W7 — Dental Center s.r.l. uninominale · via Nazionale 4, 84028 Serre (SA) · CF 05089210651
- [ ] 1 — Espositiao Massimo · Via Generale Gonzaga 8, 84091 Battipaglia (SA) · CF SPSMSM60M08A717G
- [ ] 7 — C.O.M. s.r.l. uninominale · Via Fravita snc, 84044 Matinella di Albanella (SA)
- [ ] 6 — Barale S.A.S. · Via C. Colombo, 84043 Agropoli (SA)
- [ ] 007 — Studi Medici di Santi Giuseppe · Via San Paolo 16/A, 58018 Porto Ercole (GROSSETO) · CF DSNGPP56R01A484S
- [ ] 07 — Di Santi Caterina · Via Santa Maria 47, 84030 Atena Lucana (SA) · CF DSNCRN85R69I726N
- [ ] 11 — Dott. Ettore Tufarelli · Via Roma 45, 83040 Flumeri · CF TFRTTR65S03L418A
- [ ] 22 — Maffia · Via G.B. Vico 2, 84043 Agropoli (SA) · CF MFFVTR59A25I648Q
- [ ] 16 — Leo Mariantonietta · Via Roma 57, 84020 San Gregorio Magno (SA)
- [ ] 30 — Dottoressa Maione · Piazza Salvo D'Aquisto 1, 84091 Battipaglia
- [ ] 008 — Vuolo Gianfranco · Via M.Testa, 84127 Salerno · CF VLUGFR72C15H703M
- [ ] 09 — Studio Odontoiatrico · Via Magna Grecia 737, 84047 Capaccio Paestum · CF SCIFNC61L26B644W
- [ ] 21 — Studio Odontoiatrico · Via Roma, 85054 Muro Lucano (PZ) · tel 0976 71439
- [ ] 19 — Studio Odontoiatrico Piegari Gianfranco · Via Roma 12, 85054 Muro Lucano (PZ) · tel 097671439
- [ ] 8 — GDA STP S.R.L. · Via Vittorio Veneto, 00168 Roma (RM)
- [ ] RL — Gianfranco Lanza · Via San Leonardo 52, 84131 Salerno
- [ ] 10 — Studio Odontoiatrico Sica Francesco
- [ ] 120 — Dott. Mara Opromolla

**Cosa verificare per ognuno:**
- Nome/ragione sociale corretti
- Indirizzo completo (via, CAP, città, provincia)
- Codice fiscale / Partita IVA
- Telefono (ove presente)
- Listino assegnato (tutti su Listino 1)

### A2 — Verifica listino prezzi × 4 fasce
**File:** LISTINO.pdf (già importato)

- [ ] Aprire `/listino` nell'app
- [ ] Verificare che ci siano 72 lavorazioni visibili
- [ ] Verificare che siano presenti 4 colonne prezzo (Fascia 1, 2, 3, 4)
- [ ] Campionare 10 voci a caso e confrontare con il PDF
- [ ] Verificare le 4 lavorazioni senza prezzo: cod 2, 19, 28, 50

### A3 — Verifica magazzino materiali
**File:** VALORI MAGAZZINO.pdf + PREZZI MAGAZZINO.pdf (stesso dataset)

- [ ] Aprire `/magazzino` nell'app
- [ ] Verificare count: 185 articoli presenti
- [ ] Campionare 10 articoli con codice + descrizione + prezzo acquisto
- [ ] Verificare giacenze iniziali (VALORI MAGAZZINO aveva giacenze)

### A4 — IMPORTA fasi di produzione (NON ancora nel DB)
**File:** LISTA FASI DI PRODUZIONE.pdf (71 fasi, OL01-OL71)

Queste fasi sono i passi atomici della produzione. Devono essere nella tabella `fasi_produzione`.

Elenco completo da importare:
```
OL01 - Ricevimento impronte o modelli, codifica portaimpronta e controllo prescrizione
OL02 - Disinfezione
OL03 - Analisi impronte
OL04 - Sviluppo modelli
OL05 - Sviluppo modello master con sistema Accu-Trac
OL06 - Sviluppo modelli di posizione
OL07 - Analisi e progettazione
OL08 - Progettazione tecnica dell'apparecchio
OL09 - Analisi rischi
OL10 - Disegno modelli progettazione
OL11 - Rifinitura modelli
OL12 - Taglio e sezionatura del modello master
OL13 - Rifinitura modelli di posizione
OL14 - Scontornatura degli elementi preparati
OL15 - Lucidatura modelli
OL16 - Codifica modelli
OL17 - Stesura isolante
OL18 - Squadratura modelli
OL19 - Collocamento cera di occlusione
OL20 - Trasferimento dei modelli in articolatore con piano di occlusione
OL21 - Trasferimento in articolatore semi individuale
OL22 - Duplicatura e colatura modello
OL23 - Modellazione gnatologica in cera
OL24 - Modellazione in cera-resina
OL25 - Modellazione degli spessori in cera
OL26 - Supercolori
OL27 - Ceratura preliminare
OL28 - Ceratura finale
OL29 - Ceratura armatura
OL30 - Ceratura protesi
OL31 - Rifinitura e chiusura bordi
OL32 - Rifinitura e controllo occlusale
OL33 - Rifinitura resina
OL34 - Preparazione margine di chiusura
OL35 - Preparazione post-dam
OL36 - Modellazione cappucci in cera-resina
OL37 - Costruzione mascherina in silicone
OL38 - Costruzione mascherina in gesso
OL39 - Riposizionamento denti nella mascherina
OL40 - Costruzione mascherina in resina
OL41 - Preparazione dosi resina ed impasto
OL42 - Iniezione resina per provvisori
OL43 - Zeppatura resina a caldo
OL44 - Zeppatura resina a freddo
OL45 - Polimerizzazione provvisori
OL46 - Polimerizzazione protesi
OL47 - Polimerizzazione in acqua a 40° per 15 min e 3,5 ATM
OL48 - Polimerizzazione resina a caldo in acqua da t. amb. a 100°C (tenuta per 45min)
OL49 - Rifinitura provvisori
OL50 - Imperniatura e allestimento cilindro
OL51 - Allestimento canale di colata e riserva
OL52 - Colatura rivestimento
OL53 - Preriscaldo cilindro
OL54 - Fusione con preriscaldo lento
OL55 - Fusione con preriscaldo veloce
OL56 - Smuffolatura
OL57 - Smuffol. e pulitura
OL58 - Sabbiatura
OL59 - Sabbiatura con silano
OL60 - Analisi fusione
OL61 - Taglio perni di fusione
OL62 - Adattamento fusione e rifinitura
OL63 - Messa in muffola
OL64 - Messa in muffola Trasformer
OL65 - Fissaggio parti Trasformer
OL66 - Modellazione scheletro in cera-resina
OL67 - Modellazione placca in cera per montaggio denti
OL68 - Modellazione foglio cera per porta impronta individuale
OL69 - Modellazione provvisorio su modello prelimatura
OL70 - Modellazione gancio in cera-resina
OL71 - Modellazione gancio a filo
```

- [ ] Scrivere script `scripts/import-fasi-produzione.ts` e importare
- [ ] Verificare nella sezione qualità / cicli produzione dell'app

### A5 — IMPORTA cicli di produzione (NON ancora nel DB)
**File:** LISTA CICLI DI PRODUZIONE.pdf (~60 cicli)

I cicli principali da importare nella tabella `cicli_produzione`:
```
Zirc01    - Corona in zirconia e ceramica (Protesi fissa)
StrZ01    - Struttura in zirconia di un elemento (Protesi fissa)
PonteZir  - Ponte in zirconia-ceramica (Protesi fissa)
StrZ02    - Struttura in zirconia (Protesi fissa)
MetCer    - Metallo ceramica (Protesi fissa)
Intarsio  - Intarsio in ceromer (Protesi fissa)
PI        - Portaimpronte individuale per protesi fissa (Protesi fissa)
Provv     - Provvisorio singolo immediato (Protesi provvisoria)
PM.Zr.Dir - Perno moncone in zirconia su resina diretta (Protesi fissa)
Facc.Cer.Pitt - Faccetta in ceramica di pittura (Protesi fissa)
Abt.Zr    - Abutment da calcinabile o da sovrafondibile per zirconia (Protesi fissa)
Dima      - Dima chirurgica per impianti (Protesi fissa)
El.fcc.crm.sch - Elemento faccetta in Ceromer su scheletro (Protesi mobile)
Mss.cr    - Massone per occlusione su base in cera (Protesi mobile)
Mss.rs    - Massone per occlusione su base in resina (Protesi mobile)
Prt.cnm.scn - Parte conometrica secondaria su scheletro (Protesi combinata)
Frss.prt.fss - Fresaggio su parte fissa (Protesi fissa)
Tst.fs    - Testa fusa (Protesi combinata)
Provv.sec  - Provvisorio singolo secondario (Protesi provvisoria)
Pnt.provv.sec - Ponte provvisorio secondario (Protesi provvisoria)
Pnt.provv.Imm - Ponte provvisorio immediato (Protesi provvisoria)
Pl.Imp    - Portaimpronte individuale per impianti (Protesi fissa)
PM.Zr.Ind - Perno moncone in zirconia su resina indiretta (Protesi fissa)
PM.Met.Dir - Perno moncone in metallo su resina diretta (Protesi fissa)
PM.Met.Ind - Perno moncone in metallo su resina indiretta (Protesi fissa)
Pl.Mob    - Portaimpronte individuale per protesi mobile (Protesi mobile)
Pl.Sch    - Portaimpronte individuale per protesi scheletrica (Protesi scheletrica)
Pl.Comb   - Portaimpronte individuale per protesi combinata (Protesi combinata)
Crn.unt.Zr - Corone unite in zirconia-ceramica (Protesi fissa)
Crn.unt.Met - Corone unite in metallo ceramica (Protesi fissa)
P.OT.cap  - Perno OT-cap (Protesi fissa)
Zirc.geng - Corona in zirconia-ceramica con massa gengiva (Protesi fissa)
PonteZirc.geng - Ponte in zirconia-ceramica con massa gengiva (Protesi fissa)
P.OT.cap.Rhein - Perno OT-cap con perno Rhein (Protesi fissa)
MetCer.Marg.Cer - Metallo ceramica con chiusura marginale in ceramica (Protesi fissa)
Ponte.MeTCer - Ponte in metallo ceramica (Protesi fissa)
Ponte.   - Ponte in metallo ceramica con chiusura marginale in ceramica (Protesi fissa)
Abt.Met  - Abutment da calcinabile o da sovrafondibile per metallo (Protesi fissa)
Facc.Ceromer - Faccetta in ceromer (Protesi fissa)
Facc.Cer.Strat - Faccetta in ceramica da stratificazione (Protesi fissa)
Int.Cer.Strat - Intarsio in ceramica da stratificazione (Protesi fissa)
Int.Cer.Pitt - Intarsio in ceramica di pittura (Protesi fissa)
Crn.Ceromer - Corona in ceromer (Protesi fissa)
Crn.Cer.Strat - Corona in ceramica integrale da stratificazione (Protesi fissa)
Crn.Cer.Pitt - Corona in ceramica integrale di pittura (Protesi fissa)
Crn.unt.strat - Corone unite in ceramica integrale da stratificazione (Protesi fissa)
Schel.gancio - Scheletrato con gancio (Protesi scheletrica)
Schel.senza. - Scheletrato senza ganci (Protesi scheletrica)
Rete.rinf - Rete di rinforzo (Protesi scheletrica)
Placca.pal - Placca palatale (Protesi scheletrica)
Pro.Tot.Inf.Sup - Protesi mobile totale (Protesi mobile)
Pro.Mob.Rinf - Protesi mobile con struttura di rinforzo (Protesi mobile)
Pro.Par   - Protesi parziale in resina con ganci a filo (Protesi mobile)
Pro.Par.Gan.Fuso - Protesi parziale in resina con gancio fuso (Protesi scheletrica)
Ganc.Fuso - Gancio fuso (Protesi scheletrica)
Prt.cnm.prm - Parte conometrica primaria (Protesi combinata)
Pr.Mb.Rinf.Att - Protesi mobile combinata con struttura di rinforzo e attacchi (Protesi combinata)
Montaggio - Montaggio denti su scheletro (Protesi scheletrica)
Fre       - Fresaggio su abutment in titanio (Protesi fissa)
Cera      - Ceratura diagnostica (Protesi fissa)
```

- [ ] Scrivere script `scripts/import-cicli-produzione.ts` e importare
- [ ] Ogni ciclo deve referenziare le fasi OL* corrette

### A6 — Decisioni dataset (Francesco conferma)

| Dataset | Contenuto | Raccomandazione |
|---------|-----------|-----------------|
| LISTA LAVORI (2019-2021) | Lavori storici, €40.393,80 totale. Alcuni "Attivo" | ⬜ Importa solo "Attivo" come riferimento storico, oppure ⬜ Non importare — start fresh |
| ATTREZZATURE (40 pezzi) | Stereomicroscopi, forni, torni, scanner | ⬜ V2 — skip per ora, oppure ⬜ Importa in magazzino con categoria=Attrezzatura |
| LAVORI STANDARD (11 template) | Template lavori predefin. | ⬜ Importa come template veloce creazione lavoro |
| CONTROLLI qualità (40+ controlli) | Check MDR per fasi | ⬜ Importa per modulo qualità |
| CAUSALI prima nota (13) | Categorie spese | ⬜ Importa per prima nota |

---

## SEZIONE B — Audit UI pagina per pagina

Per ogni pagina verificare: design v2.2 corretto · mobile 390px · dark mode · empty state · loading state.

### B01 — Dashboard (`/dashboard`)
- [ ] KPI cards visibili e con dati reali
- [ ] Sezione "Consegne oggi" funzionante
- [ ] Sezione "In ritardo" funzionante
- [ ] Banner onboarding se onboarding non completato
- [ ] Floating pill nav visibile e funzionante
- [ ] FAB rosso "+" funzionante
- [ ] Dark mode corretto (nessun cobalt residuo)
- [ ] Mobile 390px: scroll naturale, niente overflow

### B02 — Lista Lavori (`/lavori`)
- [ ] Lista mostra lavori con badge stato
- [ ] Filtri per stato funzionanti
- [ ] Search funzionante
- [ ] Tappa su card → naviga a dettaglio
- [ ] Empty state se nessun lavoro
- [ ] Paginazione se molti lavori

### B03 — Nuovo Lavoro (`/lavori/nuovo`)
- [ ] ClienteComboBox carica i 18 clienti di Filippo
- [ ] Selezione dentista funzionante (autocomplete)
- [ ] Tipo dispositivo: tiles 8 opzioni
- [ ] Data consegna: quick-select Oggi/+1/+3/+7/calendario
- [ ] Descrizione obbligatoria
- [ ] Validazione server-side cliente_id
- [ ] Salvataggio crea lavoro e naviga al dettaglio
- [ ] Numero lavoro auto-generato (YYYY/NNNN)
- [ ] Paziente: codice GDPR pseudonimizzato

### B04 — Dettaglio Lavoro (`/lavori/[id]`)
- [ ] Tutte le info del lavoro visibili
- [ ] Stato badge colorato corretto
- [ ] Tab Lavorazioni funzionante
- [ ] Tab Clinica funzionante
- [ ] Tab Produzione funzionante
- [ ] Tab Date funzionante
- [ ] Tab Immagini funzionante
- [ ] Tab Documenti funzionante

### B05 — Flow Consegna
- [ ] Bottone CONSEGNA visibile su lavori in stato "pronto"
- [ ] Pre-check MDR: 8 elementi verificati server-side
- [ ] DdC PDF generata con ITCA01051686 e PRRC Filippo Opromolla
- [ ] PDF scaricabile/condivisibile
- [ ] WhatsApp link generato (GDPR-safe: solo numero lavoro)
- [ ] Stato lavoro → "consegnato"
- [ ] Fattura collegata se prevista

### B06 — Flow Prove
- [ ] Pulsante "In prova esterna" disponibile
- [ ] Stato → "in_prova_esterna"
- [ ] Data rientro impostabile
- [ ] Rientro da prova → torna a "in_lavorazione"

### B07 — Flow Rifacimento
- [ ] Pulsante "Rifacimento" su lavori consegnati
- [ ] RPC `crea_rifacimento_atomico()` invocata
- [ ] Nuovo lavoro creato con riferimento al precedente
- [ ] Motivo rifacimento obbligatorio

### B08 — Lista Fatture (`/fatture`)
- [ ] Lista fatture con stato (da emettere/emessa/pagata)
- [ ] Filtri per stato
- [ ] Totale visibile
- [ ] Tappa su fattura → naviga a dettaglio

### B09 — Dettaglio Fattura (`/fatture/[id]`)
- [ ] Numero fattura
- [ ] Data emissione
- [ ] Cliente e P.IVA
- [ ] Righe (lavorazioni, quantità, prezzo)
- [ ] Totale
- [ ] Stato SDI (non inviata / inviata / ricevuta)
- [ ] XML generato scaricabile

### B10 — Scadenzario (`/scadenzario`)
- [ ] Lista clienti con saldo in essere
- [ ] Ordinamento per importo/data
- [ ] Link a WhatsApp per sollecito
- [ ] Filtro per cliente

### B11 — Lista Clienti (`/clienti`)
- [ ] Tutti e 18 i clienti di Filippo visibili
- [ ] Search per nome funzionante
- [ ] Tappa su cliente → dettaglio

### B12 — Dettaglio Cliente
- [ ] Nome, indirizzo, CF/PIVA visibili
- [ ] Lista lavori del cliente
- [ ] Totale fatturato

### B13 — Lista Magazzino (`/magazzino`)
- [ ] 185 articoli visibili
- [ ] Filtro per categoria
- [ ] Alert rosso per articoli sotto scorta minima
- [ ] Search per codice/descrizione

### B14 — Dettaglio Articolo Magazzino (`/magazzino/[id]`)
- [ ] Codice, descrizione, fornitore
- [ ] Giacenza attuale vs scorta minima
- [ ] Alert se sotto soglia
- [ ] Prezzo acquisto

### B15 — Lista Pazienti (`/pazienti`)
- [ ] Pazienti con nome_display pseudonimizzato
- [ ] GDPR: nessun dato sensibile in chiaro
- [ ] Tappa su paziente → storico lavori

### B16 — Dettaglio Paziente (`/pazienti/[id]`)
- [ ] Codice GDPR visibile
- [ ] Lista lavori collegati
- [ ] Navigazione a ciascun lavoro

### B17 — Listino (`/listino`)
- [ ] 72 lavorazioni visibili
- [ ] 4 colonne prezzo (Fascia 1-4)
- [ ] Ricerca per codice/descrizione
- [ ] Edit prezzo funzionante (se implementato)

### B18 — Impostazioni dati lab (`/impostazioni`)
- [ ] Tutti i dati di Filippo precompilati (nome, ITCA, indirizzo, PRRC, P.IVA)
- [ ] Bottone "Modifica dati" funzionante
- [ ] Form modifica salva correttamente
- [ ] Link "Configura PEC →" presente
- [ ] Badge "✅ Verificata end-to-end" PEC (dopo configurazione)

### B19 — Impostazioni PEC (`/impostazioni/pec`)
- [ ] PecSetupWidget carica correttamente
- [ ] Campo email → rilevamento provider automatico (es. Aruba)
- [ ] Accordion per provider sconosciuto
- [ ] Bottone "Connetti e verifica" funzionante
- [ ] Stati animati visibili durante verifica
- [ ] Success: cerchio verde + auto-avanzamento

### B20 — Impostazioni Profilo (`/impostazioni/profilo`)
- [ ] Form cambio password
- [ ] Validazione: min 8 caratteri
- [ ] Conferma password deve corrispondere
- [ ] Dopo cambio → logout automatico

### B21 — Impostazioni Abbonamento (`/impostazioni/abbonamento`)
- [ ] Stato "Trial" con data scadenza
- [ ] Bottone "Attiva il piano" → billing page
- [ ] Se attivo: "Gestisci abbonamento →" → Stripe portal

### B22 — Onboarding Wizard (`/onboarding`)
- [ ] Step 1 Benvenuto: nome titolare corretto
- [ ] Step 2 Dati lab: form funzionante, salvataggio OK
- [ ] Step 3 Normativo: ITCA, PRRC precompilati
- [ ] Step 4 PEC: PecSetupWidget funzionante
- [ ] Step 5 DdC: riepilogo con ITCA e PRRC
- [ ] Step 6 Completo: navigazione a dashboard + onboarding_completato=true

### B23 — Admin Panel (`/admin/labs`)
- [ ] Lista lab (Filippo + Arturo Pepe)
- [ ] Crea nuovo lab
- [ ] Invita titolare → email ricevuta
- [ ] Modifica stato lab (trial/attivo/sospeso)
- [ ] Impersona lab → magic link funzionante
- [ ] Live preview dashboard lab

### B24 — Portale Dentista (`/portale/[token]`)
- [ ] Accesso senza login tramite token
- [ ] Lista lavori del dentista
- [ ] Dettaglio singolo lavoro
- [ ] GDPR-safe: nessun dato paziente in chiaro
- [ ] Link funzionante via WhatsApp

---

## SEZIONE C — Test Flow Operativi End-to-End

### C01 — Nuovo Lavoro (flow completo)

**Setup:** Accesso come Filippo Opromolla su uachelab.com

- [ ] Premi FAB rosso "+" → si apre form nuovo lavoro
- [ ] Seleziona dentista: "Dental Center" dalla combobox → si seleziona
- [ ] Tipo dispositivo: seleziona "Corona in metallo ceramica"
- [ ] Descrizione: "Corona metallo ceramica su dente 14"
- [ ] Data consegna: "+3 giorni"
- [ ] Aggiungi lavorazione: cerca "ELEMENTO CERAMICA" → seleziona → prezzo fascia 1 auto-applicato
- [ ] Salva → lavoro creato con numero YYYY/0001
- [ ] Stato: "ricevuto" ✅
- [ ] Naviga al dettaglio → tutti i dati corretti

### C02 — Progressione Stato Lavoro

- [ ] Da "ricevuto" → "in lavorazione" (click pulsante)
- [ ] Da "in lavorazione" → "in prova esterna"
- [ ] Da "in prova esterna" → rientro → "in lavorazione"
- [ ] Da "in lavorazione" → "pronto"
- [ ] Dashboard: lavoro appare in "consegne oggi" se data = oggi

### C03 — Consegna con DdC PDF

- [ ] Lavoro in stato "pronto" → tappa CONSEGNA
- [ ] Pre-check MDR: tutti i check verdi
- [ ] DdC generata con:
  - ITCA: ITCA01051686
  - PRRC: Filippo Opromolla — Odontotecnico abilitato
  - Riferimento: MDR 2017/745 Art. 52(8) + Allegato XIII
  - Data consegna corretta
- [ ] PDF scaricabile dal browser/telefono
- [ ] WhatsApp link generato (solo numero lavoro, NO nome paziente)
- [ ] Stato → "consegnato"

### C04 — Rifacimento

- [ ] Su lavoro consegnato → pulsante "Rifacimento"
- [ ] Inserisci motivo (obbligatorio)
- [ ] Nuovo lavoro creato con riferimento al precedente
- [ ] Tipo "rifacimento" visibile sulla card
- [ ] Lavoro originale: stato invariato, collegato al rifacimento

### C05 — Fatturazione

- [ ] Da lavoro consegnato → genera fattura
- [ ] Numero fattura auto-incrementato
- [ ] Righe fattura = lavorazioni del lavoro
- [ ] Natura IVA: N4 (Esente Art. 10 n.18)
- [ ] XML FatturaPA generato (verifica struttura)
- [ ] **SDI test:** invia a sdi01@pec.fatturapa.it (SOLO se PEC configurata)

---

## SEZIONE D — Edge Cases e Bug Hunting

### D01 — Validazioni Form
- [ ] Nuovo lavoro senza dentista → errore "Seleziona un dentista"
- [ ] Nuovo lavoro senza tipo dispositivo → errore
- [ ] Nuovo lavoro senza data consegna → errore
- [ ] Password con meno di 8 caratteri → errore chiaro
- [ ] Email non valida in form PEC → errore

### D02 — Empty States
- [ ] Dashboard senza lavori → stato vuoto con CTA
- [ ] Lista lavori vuota → "Nessun lavoro" + pulsante crea
- [ ] Lista clienti vuota → CTA aggiungi cliente
- [ ] Magazzino sotto scorta → alert visibile

### D03 — Error States
- [ ] Connessione internet assente → messaggio di errore
- [ ] API errore 500 → messaggio user-friendly (non stack trace)
- [ ] SMTP PEC errato → messaggio in italiano specifico

### D04 — Multi-tenant Isolation
- [ ] Filippo non vede dati di Arturo Pepe
- [ ] Arturo Pepe non vede dati di Filippo
- [ ] Query RLS funziona: `auth.current_lab_id()` → `public.current_lab_id()`

### D05 — Stato Trial
- [ ] Lab in trial: accesso completo all'app
- [ ] Banner trial scade visibile se < 7 giorni
- [ ] Lab sospeso: accesso bloccato → redirect a billing

### D06 — Comportamento Mobile (390px)
- [ ] Tutte le pagine scroll verticale naturale
- [ ] Touch target minimo 52px per ogni bottone
- [ ] Nessun overflow orizzontale
- [ ] Form con tastiera: contenuto non coperto
- [ ] FAB non copre contenuto importante

### D07 — Dark Mode
- [ ] Toggle dark/light funzionante
- [ ] Persistenza tema tra sessioni (localStorage)
- [ ] Nessun colore hardcoded visibile in dark mode
- [ ] Contrasto testo sufficiente (WCAG AA 4.5:1)

---

## SEZIONE E — Pre-Consegna Final Checks

### E01 — Codice
- [ ] `npx tsc --noEmit` → zero errori
- [ ] `npx eslint src/ --max-warnings 0` → zero warning
- [ ] `npx vitest run` → 141+ test verdi
- [ ] CI GitHub: verde ✅

### E02 — Infrastruttura
- [ ] Vercel deployment: production ✅
- [ ] Cloudflare Email Routing: catch-all → ua-pec-verify ✅
- [ ] Supabase: vault ✅ · pg_cron ✅ · RLS ✅
- [ ] Stripe: webhook endpoint attivo ✅

### E03 — Accesso Filippo
- [ ] Account Filippo nel DB: lab_id = `971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c`
- [ ] Login funzionante su uachelab.com
- [ ] Dati lab precompilati (ITCA, indirizzo, PRRC)
- [ ] PEC Filippo configurata e verificata end-to-end
- [ ] onboarding_completato = true (dopo wizard)

### E04 — MEMORY.md aggiornato
- [ ] Ultimo commit hash aggiornato
- [ ] Bug noti aggiornati
- [ ] Prossimi task aggiornati (V1.1)

---

## Note di esecuzione

**Ordine raccomandato:**
1. A4 + A5 (import fasi e cicli) — richiede script
2. A1 + A2 + A3 (verifica dati già importati) — verifica manuale DB
3. A6 (decisioni dataset) — Francesco conferma
4. B01-B24 (audit UI) — Playwright pagina per pagina
5. C01-C05 (test flow) — manuale su produzione
6. D01-D07 (edge cases) — mix automatico/manuale
7. E01-E04 (final checks) — automatico

**Stima tempo totale:** 6-8 ore di lavoro concentrato
