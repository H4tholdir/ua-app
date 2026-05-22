# UÀ — Sessione di Test con Filippo
**Documento aggiornato progressivamente man mano che la PWA evolve**

> **Legenda:** 🟢 Francesco può testare da solo · 🔵 Da fare con Filippo di persona · ⚠️ Richiede setup/prerequisiti
>
> **Status:** ⬜ Non testato · ✅ Passato · ❌ Fallito (con note) · ⏩ Skippato (non applicabile)

---

## PREREQUISITI PRIMA DELLA SESSIONE

Prima di fare i test con Filippo, verificare questi item:

- [ ] 🟢 Trial Filippo prorogato oltre 31/05/2026 (`/admin/labs`)
- [ ] 🔵 PEC reale configurata da Filippo su `/impostazioni/pec`
- [ ] 🟢 `NEXT_PUBLIC_SUPPORT_PHONE` corretto in Vercel
- [ ] 🟢 Ultimo deploy su https://uachelab.com verde (Vercel CI/CD)
- [ ] 🟢 Almeno 1 lavoro di prova creato nel sistema per testare i flussi

---

## SEZIONE 1 — Accesso e Configurazione Iniziale

### 1.1 Login e Onboarding
| Test | Chi | Status | Note |
|------|-----|--------|------|
| Login con credenziali Filippo (`h4t@live.it`) | 🔵 | ⬜ | |
| Wizard onboarding completo (se non già fatto) | 🔵 | ⬜ | |
| Dati laboratorio compilati (ragione sociale, ITCA, PRRC) | 🔵 | ⬜ | |
| Nomina PRRC PDF scaricabile e leggibile | 🔵 | ⬜ | |

### 1.2 Impostazioni
| Test | Chi | Status | Note |
|------|-----|--------|------|
| PEC configurata e verifica `✓ Verificata` | 🔵 | ⬜ | Richiede credenziali PEC reali |
| Logo laboratorio caricato (schermo + stampa) | 🔵 | ⬜ | |
| Firma digitale immagine caricata | 🔵 | ⬜ | |

---

## SEZIONE 2 — Flusso Principale: Creazione Lavoro

### 2.1 Nuovo Lavoro — Form
| Test | Chi | Status | Note |
|------|-----|--------|------|
| Creazione nuovo lavoro (tutte le tab) | 🔵 | ⬜ | |
| Tab Dati: cliente, paziente, tipo dispositivo, descrizione, data | 🔵 | ⬜ | |
| Tab Accettazione MDR: tipo impronta, disinfettante, materiali allegati | 🔵 | ⬜ | |
| Tab Clinica: odontogramma FDI (seleziona denti, toggle adulto/deciduo) | 🔵 | ⬜ | |
| Tab Foto: upload foto da camera + galleria (su telefono reale) | 🔵 | ⬜ | |
| Tab Produzione: assegna tecnico, aggiorna fasi | 🔵 | ⬜ | |
| Tab Prove: avvia prova, registra rientro con esito | 🔵 | ⬜ | |
| Tab Date: data prevista, ora consegna | 🔵 | ⬜ | |
| Priorità urgente/extra urgente visibile sulla card | 🟢 | ⬜ | |
| Swipe sinistro su card → azioni rapide (Assegna/Stato/Priorità) | 🟢 | ⬜ | |
| Inline validation: campo vuoto → bordo rosso + auto-focus | 🟢 | ⬜ | |

### 2.2 Listino
| Test | Chi | Status | Note |
|------|-----|--------|------|
| Listino lavorazioni di Filippo visibile e corretto (74 voci) | 🔵 | ⬜ | Verificare con i prezzi reali |
| Aggiungere nuova voce listino | 🔵 | ⬜ | |
| Modificare prezzo di una voce | 🔵 | ⬜ | |
| Campo `Costo materiali` compilabile per voce | 🔵 | ⬜ | Necessario per KPI margine |
| Campo `Compenso tecnico` compilabile (solo titolare) | 🔵 | ⬜ | |

---

## SEZIONE 3 — Consegna e Documenti MDR

### 3.1 Consegna Reale
| Test | Chi | Status | Note |
|------|-----|--------|------|
| Tap CONSEGNA su lavoro completato | 🔵 | ⬜ | **TEST CRITICO** |
| Warning materiali carenti appare se magazzino basso | 🟢 | ⬜ | |
| Warning MDR incompleto con label "Consegna senza dati MDR" | 🟢 | ⬜ | |
| Suono accordo C-major alla consegna | 🔵 | ⬜ | Testare con audio attivo |
| Animazione celebration sul bottone | 🔵 | ⬜ | |

### 3.2 Pacchetto MDR
| Test | Chi | Status | Note |
|------|-----|--------|------|
| DdC PDF: generato, leggibile, tutte le sezioni presenti | 🔵 | ⬜ | Stampare su carta |
| IFU PDF: 8 sezioni MDR Allegato I §23.4 | 🔵 | ⬜ | Verificare con Filippo |
| Etichetta dispositivo A6: ITCA, "Installare entro il", "DISPOSITIVO SU MISURA" | 🔵 | ⬜ | |
| Ricevuta consegna: sez. A fabbricante + sez. B spazio firma dentista | 🔵 | ⬜ | |
| PacchettoConsegnaSheet: seleziona documenti e condividi via Web Share | 🔵 | ⬜ | |
| Firma PRRC su DdC: nome PRRC corretto | 🔵 | ⬜ | |

---

## SEZIONE 4 — FatturaPA / Fatturazione

### 4.1 Generazione e Validazione FatturaPA XML

> ⚠️ **PROCEDURA DI TEST SICURA — non invia fatture reali al SDI**
>
> **Problema:** La fattura B2B viene generata e potrebbe essere inviata al Sistema di Interscambio (SDI) dell'Agenzia delle Entrate, che è un processo irreversibile con valenza fiscale reale.
>
> **Soluzione per testare in sicurezza:**
>
> **Opzione A — Validazione XML offline (consigliata)**
> 1. Generare la fattura dall'app e scaricare l'XML
> 2. NON inviarla tramite PEC/canale SDI
> 3. Caricare l'XML su **https://www.fatturacheck.it** per validazione strutturale
> 4. Oppure usare il **validatore ufficiale** su https://www.fatturapa.gov.it (sezione "Visualizza e Verifica")
>
> **Opzione B — Ambiente di Sperimentazione ufficiale SDI**
> - L'Agenzia delle Entrate mette a disposizione un **ambiente di test** su https://www.fatturapa.gov.it/it/sistemainterscambio/sperimentazione/
> - Permette di trasmettere e ricevere file come se fosse produzione **senza valenza fiscale**
> - Le fatture inviate in questo ambiente NON sono mai trasmesse al destinatario reale
> - Accesso tramite Sistema di Accreditamento: codici destinatario di test 7 cifre
>
> **Opzione C — Codice destinatario di test "0000000"**
> - Usando `0000000` come `CodiceDestinatario` nella fattura B2B, la fattura viene recapitata solo nel portale web dell'Agenzia Entrate del destinatario (non via PEC/canale)
> - **Attenzione:** fattura comunque con valenza fiscale se inviata in produzione. Da usare SOLO in ambiente test.
>
> **Raccomandazione pratica:**
> 1. Generare l'XML dall'app UÀ
> 2. Validarlo su fatturacheck.it (verifica struttura, codici, firma)
> 3. Solo dopo la validazione, decidere se procedere con l'invio reale

| Test | Chi | Status | Note |
|------|-----|--------|------|
| Fattura generata automaticamente dopo consegna | 🟢 | ⬜ | Verificare in /fatture |
| Scaricare XML FatturaPA generato | 🟢 | ⬜ | |
| Validare XML su fatturacheck.it | 🟢 | ⬜ | Nessun rischio fiscale |
| Controllare natura N4 (Art. 10 n.18 DPR 633/72) nell'XML | 🟢 | ⬜ | |
| Controllare bollo €2 se imponibile > €77,47 | 🟢 | ⬜ | |
| ITCA del laboratorio corretto nell'XML | 🟢 | ⬜ | |
| Fatturazione batch: selezionare più lavori e fatturare insieme | 🔵 | ⬜ | |
| Export CSV per commercialista: scaricare `/api/fatture/export?year=2026` | 🔵 | ⬜ | Aprire in Excel, verificare colonne |

### 4.2 Invio PEC (solo dopo validazione XML)
| Test | Chi | Status | Note |
|------|-----|--------|------|
| Configurare canale PEC in UÀ | 🔵 | ⬜ | Richiede PEC reale Filippo |
| Invio fattura test via PEC al SDI | 🔵 | ⬜ | **Solo dopo validazione XML** — irreversibile |

---

## SEZIONE 5 — Scadenzario e Pagamenti

| Test | Chi | Status | Note |
|------|-----|--------|------|
| Lista insoluti in /scadenzario corretta (clienti con fatture non pagate) | 🔵 | ⬜ | Verificare con dati reali Filippo |
| Tap su cliente moroso → espande fatture scadute | 🟢 | ⬜ | |
| Bottone WhatsApp sollecito → apre WhatsApp con messaggio pre-compilato | 🔵 | ⬜ | Testare su telefono reale |
| "Segna pagata" → suono C5→E5 + haptic | 🔵 | ⬜ | |
| Estratto conto cliente `/scadenzario/[id]` | 🔵 | ⬜ | |

---

## SEZIONE 6 — Dashboard e Analytics

### 6.1 Dashboard Titolare
| Test | Chi | Status | Note |
|------|-----|--------|------|
| KPI "Consegne oggi" corrette | 🔵 | ⬜ | |
| KPI "Fatturato mese" corretto vs dati reali Filippo | 🔵 | ⬜ | Verificare con €56k YTD |
| KPI "Margine netto mese" appare dopo aver compilato `costo_materiali` nel listino | 🔵 | ⬜ | |
| Lavori in ritardo evidenziati in rosso | 🔵 | ⬜ | |
| Segnalazioni tecnico aperte visibili | 🔵 | ⬜ | |
| Refresh button ↻ aggiorna i dati | 🟢 | ⬜ | |

### 6.2 Analytics
| Test | Chi | Status | Note |
|------|-----|--------|------|
| Grafico trend 12 mesi visibile con dati reali | 🔵 | ⬜ | |
| Mese corrente evidenziato in rosso nel grafico | 🟢 | ⬜ | |
| Totale anno corretto | 🔵 | ⬜ | |

---

## SEZIONE 7 — Dashboard Tecnico e Compensi

| Test | Chi | Status | Note |
|------|-----|--------|------|
| Dashboard tecnico mostra lavori assegnati a lui | 🔵 | ⬜ | Testare con tecnico reale |
| Compenso giornaliero "+€X" visibile | 🔵 | ⬜ | |
| Aggiornamento fasi produzione (tap [OK] su una fase) | 🔵 | ⬜ | |
| Segnalazione problema → appare nel dashboard titolare | 🔵 | ⬜ | |
| Produttività `/tecnici/[id]/produttivita` | 🔵 | ⬜ | |
| Cedolino tecnico PDF scaricabile e leggibile | 🔵 | ⬜ | |

---

## SEZIONE 8 — Clienti e Portale Dentista

| Test | Chi | Status | Note |
|------|-----|--------|------|
| Lista clienti corretta (20 dentisti Filippo) | 🔵 | ⬜ | |
| Dettaglio cliente: DPA GDPR Art.28 scaricabile | 🔵 | ⬜ | |
| Modifica cliente (edit bottom sheet) funzionante | 🟢 | ⬜ | |
| Bottone "Condividi portale" → WhatsApp prefilled | 🔵 | ⬜ | |
| **Portale dentista `/portale/[token]`**: aprire il link in browser incognito | 🟢 | ⬜ | Non richiede Filippo — testare da solo |
| Portale dentista mostra lavori del giusto dentista | 🟢 | ⬜ | |
| Portale dentista NON mostra lavori di altri dentisti | 🟢 | ⬜ | Test sicurezza importante |

---

## SEZIONE 9 — Magazzino e Ordini

| Test | Chi | Status | Note |
|------|-----|--------|------|
| Lista materiali (187 articoli Filippo) visibile e corretta | 🔵 | ⬜ | |
| Materiali sotto scorta evidenziati | 🟢 | ⬜ | |
| Creazione ordine fornitore → link WhatsApp prefilled | 🔵 | ⬜ | |
| ⚠️ Bug noto: `/magazzino/[id]` (dettaglio articolo) — da fixare prima del test | 🟢 | ⬜ | |

---

## SEZIONE 10 — Qualità MDR

| Test | Chi | Status | Note |
|------|-----|--------|------|
| Crea nuovo incidente di qualità | 🔵 | ⬜ | |
| Incidente appare in lista `/qualita` | 🟢 | ⬜ | |
| Segna incidente come risolto | 🟢 | ⬜ | |
| Analisi rischi: 9 tipi dispositivo visibili | 🔵 | ⬜ | |
| PSUR PDF: generare e scaricare | 🔵 | ⬜ | |
| PSUR PDF leggibile con sezioni MDR Allegato III §7 | 🔵 | ⬜ | Stampare su carta |

---

## SEZIONE 11 — PWA e Mobile

| Test | Chi | Status | Note |
|------|-----|--------|------|
| App installata su iPhone (Add to Home Screen) | 🔵 | ⬜ | Testare su dispositivo reale Filippo |
| Splash screen all'avvio dopo installazione | 🔵 | ⬜ | |
| Bottom nav pill non coperta da notch iPhone | 🔵 | ⬜ | viewport-fit=cover implementato |
| Notifiche push attive (dopo permesso) | 🔵 | ⬜ | Richiede migration push_subscriptions applicata |
| Test su 390px (iPhone SE / 12 mini) | 🟢 | ⬜ | |
| Test su 768px (iPad) | 🟢 | ⬜ | |

---

## SEZIONE 12 — Sezioni Non Ancora Testate

| Sezione | Stato | Note |
|---------|-------|------|
| `/rete` — multi-lab | ⬜ Non testato | Solo empty state visibile |
| Invite flow (invitare nuovo tecnico) | ⬜ Non testato | |
| Flow reset password | ⬜ Non testato | |
| Onboarding nuovo laboratorio da zero | ⬜ Non testato | |

---

## NOTE POST-TEST

*Questa sezione viene compilata durante/dopo la sessione con Filippo*

### Bug trovati
<!-- Aggiungere qui -->

### Feedback di Filippo
<!-- Aggiungere qui -->

### Decisioni prese
<!-- Aggiungere qui -->

---

**Documento creato:** 22/05/2026 — Da aggiornare ad ogni sessione di sviluppo e durante il test con Filippo.
