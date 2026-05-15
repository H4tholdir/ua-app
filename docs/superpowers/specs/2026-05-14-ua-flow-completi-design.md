# UÀ — Flow Operativi Completi · Spec Design
**Data:** 2026-05-14  
**Stato:** BOZZA — da confermare con Filippo Opromolla  
**Fonti:** Analisi DentalMaster (60 screenshot), ricerca OrisLab Q / OdontoSoft / ODIX / PrimoLab / Crownbeam, review Codex gestore esperto, audit codebase reale

---

## Nota metodologica

Questo documento distingue tre livelli di certezza:
- ✅ **VERIFICATO** — confermato da codice esistente o da documenti DentalMaster reali
- 🔶 **INFERITO** — dalla ricerca competitor + Codex roleplay · da confermare con Filippo
- ❓ **DA CONFERMARE** — dipende dalla pratica specifica di Filippo

---

## Macchina a stati del Lavoro

```
ricevuto → in_lavorazione → in_prova_esterna ⇄ in_lavorazione → pronto → consegnato
                ↓
           sospeso (da qualsiasi stato · in attesa istruzioni)
           rifacimento (crea nuovo lavoro collegato)
           annullato (con motivo obbligatorio)
```

✅ Stati attuali implementati: `ricevuto`, `in_lavorazione`, `pronto`, `consegnato`  
🔶 Da aggiungere: `in_prova_esterna`, `sospeso`, `rifacimento`, `annullato`

---

## Flow 1 — Nuovo Lavoro
**Obiettivo:** < 60 secondi dall'arrivo della prescrizione  
**Chi:** titolare, front_desk, tecnico  
**Stato implementazione:** ✅ implementato · 🔴 bug cliente_id da fixare

### Passi
1. Arriva prescrizione (fisicamente o digitalmente) 
2. Tap FAB rosso "+ Nuovo" dalla dashboard
3. **Seleziona dentista** `cliente_id*` `nome dentista*` `studio?` → `tier prezzo AUTO`
4. **Inserisce paziente** `nome*` `🎤 voce` → `codice GDPR AUTO`
5. **Tipo dispositivo** (tap su tile): Protesi fissa · mobile · implantoprotesi · CAD/CAM · scheletrato · ortodonzia · riparazione · provvisori
6. **Lavorazioni dal listino** `lavorazione_id*` `qty*` `colore?` `calo grammi?` `note?` → `prezzo AUTO da tier`
7. **Data consegna** `data*` · quick: oggi / domani / +3gg / +7gg · `ora?` `data prova?`
8. **Tecnico** `tecnico_id?` `reparto?`
9. **Allegati** `foto?` `STL?` `nota vocale?`
10. **Note generali** `note?` `🎤 voce`
11. **CREA** → `numero_lavoro AUTO (2026/XXXX)` → stato: ricevuto → push tecnico

### ❓ Da confermare con Filippo
- [ ] I 8 tipi di dispositivo coprono tutto quello che fa nel suo lab?
- [ ] Inserisce le lavorazioni subito al ricevimento o le completa dopo?
- [ ] Usa già foto per tracciare i lavori? O è tutto cartaceo?

---

## Flow 2 — Tracking Produzione
**Obiettivo:** tecnico aggiorna stato durante la giornata · 20-30 sec per fase  
**Chi:** tecnico assegnato  
**Stato implementazione:** ✅ implementato

### Passi
1. Dashboard mattina → lista lavori assegnati · ordinati per urgenza
2. Apre lavoro → Tab "Fasi"
3. Segna fase completata: `fase_id*` `tecnico_id AUTO` `timestamp AUTO` `nota?` `foto?` `durata minuti?`
4. Aggiorna stato fisico (nuovo): `in_lab` / `al_forno` / `al_cad_cam` / `alla_ceramica` / `in_finitura`
5. 100% fasi → AUTO stato: pronto → push titolare
6. Segnala urgenza: `tipo problema*` `nota vocale?` → push titolare immediato

### ❓ Da confermare con Filippo
- [ ] I tecnici tengono già traccia delle fasi in qualche modo?
- [ ] Lo stato fisico del lavoro (dove è nel lab) ha senso nel suo lab?

---

## Flow 3 — PROVE / Try-in ⚠️ NUOVO
**Obiettivo:** gestire le prove intermedie prima della consegna definitiva  
**Chi:** titolare, front_desk  
**Stato implementazione:** 🔶 Da implementare  
**Frequenza stimata:** 20-40% dei lavori · 60-80% su mobile e implantare (da verificare con Filippo)

### Passi
1. Tecnico decide di mandare in prova: `numero_prova*` `data_prevista_rientro*` `istruzioni_dentista?`
2. AUTO stato: in_prova_esterna → appare in dashboard OGGI sezione "In prova"
3. AUTO WhatsApp al dentista: "Lavoro [paziente] pronto per prova"
4. Dentista fa la prova (fisicamente nel suo studio)
5. Rientro: `esito*` (OK / Modifiche / Rifare / Sospeso) `note_dentista?` `foto_post_prova?` `nuova_data_consegna?`
6. Decisione per esito:
   - **OK** → stato: in_lavorazione · tecnico completa fasi rimanenti
   - **Modifiche** → note visibili al tecnico · stato: in_lavorazione
   - **Rifare** → attiva Flow 5 Rifacimento
   - **Sospeso** → in attesa istruzioni · visibile in dashboard
7. AUTO storico prove nel fascicolo lavoro

### ❓ Da confermare con Filippo
- [ ] Quante prove fa in media a settimana?
- [ ] Su che tipo di lavori succede più spesso?
- [ ] Il dentista porta back il lavoro di persona o lo manda con corriere?

---

## Flow 4 — TAP CONSEGNA (Hero) ★
**Obiettivo:** DdC + Buono + Fattura in 1-3 secondi  
**Chi:** titolare, front_desk (lavoro in stato "pronto")  
**Stato implementazione:** ✅ implementato · ⚠️ PEC SMTP mancante

### Passi
1. Lavoro in stato "pronto" · badge verde in dashboard OGGI
2. Apre schermata CONSEGNA → riepilogo: dentista · paziente · lavorazioni · importo · data
3. AUTO precheck MDR (8 campi): ITCA · materiali con lotto · paziente · tipo dispositivo · lavorazioni · dentista P.IVA · data consegna · numero DdC
4. **1 TAP CONSEGNA** (+ Touch ID opzionale)
5. AUTO generazione parallela:
   - PDF DdC MDR (Allegato XIII · numero progressivo · firma · lotti · paziente · ITCA)
   - PDF Buono consegna (cliente · richiedente · lavorazioni · qty · calo · prezzi opzionali)
   - XML FatturaPA v1.2 (N4 · Art.10 n.18 · bollo €2 se >€77,47 · progressivo SDI)
6. AUTO upload + invio:
   - Storage Supabase (10 anni · MDR)
   - PEC a sdi01@pec.fatturapa.it ⚠️ credenziali da configurare
   - Link WhatsApp con DdC allegata
   - Stato: consegnato · lock idempotenza
7. Animazione successo · suono · bottom sheet: WhatsApp | Scarica DdC | Scarica Buono | Chiudi

### ⚠️ Bloccante go-live
Credenziali PEC SMTP non ancora configurate da Filippo → il flow completo non funziona senza.

---

## Flow 5 — Rifacimento / Non Conformità ⚠️ NUOVO
**Obiettivo:** lavori non conformi · obbligatorio MDR  
**Chi:** titolare, tecnico  
**Frequenza stimata:** 2-5% dei lavori (da verificare)

### Passi
1. Rileva non conformità: `motivo*` (colore sbagliato / misura errata / fusione difettosa / rottura / non confortevole / errore prescrizione / altro) `quando_rilevato*` `foto_difetto?` `costo_interno?`
2. AUTO crea lavoro rifacimento: `is_rifacimento=true` `originale_id` pre-compilato · entra in coda produzione
3. AUTO registra incidente/non conformità per MDR → conta nel PSUR · alert PRRC se grave

---

## Flow 6 — Fatturazione + SDI
**Stato implementazione:** ✅ implementato · 🔴 manca colonna stato_sdi

### Passi
1. AUTO alla CONSEGNA OPPURE manuale da /fatture
2. Calcola: listino × tier cliente · bollo €2 se >€77,47 · natura N4
3. `tipo_documento*`: TD01 (normale), TD02 (anticipo), TD04 (nota credito)
4. Genera XML FatturaPA v1.2 · nome file: IT+CF+progressivo.xml
5. Invia via PEC a SDI · stato_sdi: inviata
6. Ricevuta SDI — 8 stati: accettata / consegnata / scartata / mancata consegna / impossibile recapitare / in attesa / inviata / errore
7. Push se scartata o errore · mostra motivo + azione
8. Registra pagamento: `data_pagamento*` `modalità*` `importo_parziale?` `riferimento?`

---

## Flow 7 — Scadenzario / Partitario ⚠️ NUOVO UI
**Stato implementazione:** ✅ tabella DB esiste · 🔶 UI da costruire

### Passi
1. AUTO si popola ad ogni fattura emessa
2. Dashboard OGGI sezione "Pagamenti scaduti" con totale e lista clienti
3. Estratto conto per cliente: storico fatture · pagamenti · saldo
4. Sollecito via WhatsApp pre-compilato

---

## Flow 8 — Magazzino + Tracciabilità + Ordini
**Stato implementazione:** ✅ parzialmente · 🔶 ordini fornitori da implementare

### Passi
1. Ricevimento: `articolo*` `n_lotto*` `data_scadenza*` `qty*` `fornitore?` `prezzo_acquisto?`
2. AUTO consumo al tap CONSEGNA (da implementare: listino_materiali_auto)
3. Alert scorta minima → dashboard OGGI sezione "Materiali mancanti"
4. Genera ordine fornitore: `fornitore*` `articoli+qty*` `invio via WhatsApp/email`
5. Conferma ricezione → giacenza aggiornata · nuovo lotto creato

---

## Flow 9 — Portale Dentista
**Stato implementazione:** ✅ implementato

### Passi
1. Lab genera link token per cliente (scade 30gg)
2. Condivide via WhatsApp
3. Dentista vede i suoi lavori (no login) · stato · data consegna · tipo · paziente codificato
4. Scarica DdC PDF (accesso loggato per MDR)
5. Lascia feedback PMCF → alimenta PSUR automaticamente

---

## Flow 10 — Dashboard "OGGI" (3 versioni RBAC) ⚠️ DA RIPROGETTARE
**Stato implementazione:** 🔶 versione attuale generica · non RBAC-aware

### Vista TITOLARE
- Lavori in ritardo (N)
- Da consegnare oggi (N)
- In prova esterna · atteso rientro (N)
- Materiali in esaurimento (N)
- Pagamenti scaduti (€tot)
- Fatturato mese (€tot vs mese prec.)

### Vista TECNICO
- Miei lavori urgenti/in ritardo
- Lavori assegnati a me oggi
- Fasi da completare
- Miei lavori in prova · rientrano oggi

### Vista FRONT DESK
- Da consegnare oggi (con dentista + orario)
- Ritiri attesi (corriere / di persona)
- In prova · atteso rientro oggi
- Da contattare (pagamenti scaduti)
- Nuovi lavori da registrare

---

## Flow 11 — Migrazione da DentalMaster ⚠️ DA PIANIFICARE
**Stato implementazione:** ❌ non pianificato

### Dati da migrare
- 34 clienti attivi (dentisti/studi)
- 187 articoli magazzino
- 72 lavorazioni listino
- Storico lavori (N anni)
- Pazienti (pseudonimizzazione GDPR durante import)

---

## Feature Trasversali

### Dettatura vocale 🎤 (da aggiungere)
- Disponibile su tutti i campi testo: paziente, note, motivo problema, note prova
- Web Speech API (nativa browser iOS/Android)
- ❓ Verificare: il laboratorio è troppo rumoroso? Filippo usa già la dettatura?

---

## Gap DB da risolvere (prioritizzati)

### Bloccanti go-live
1. `lavori.cliente_id` — manca nel form (BUG)
2. `fatture.stato_sdi VARCHAR(20)` — mancante
3. `fatture.progressivo_invio INTEGER` — mancante
4. `lavori_lavorazioni.calo DECIMAL(8,3)` — mancante (Buono consegna)
5. `laboratori.logo_url` `firma_ddc_url` — mancanti

### Fase 2
6. `lavori.stato` — aggiungere: in_prova_esterna, sospeso, rifacimento, annullato
7. `lavori.stato_fisico` — nuovo campo (al_forno, al_cad, etc.)
8. `listino_prezzi_tier` — tabella multi-tier pricing
9. `listino_materiali_auto` — consumo automatico magazzino
10. `agenda_messaggi_clienti` — log comunicazioni WhatsApp

### Nuove tabelle da creare
- `lavoro_prove` (storico prove: numero, data_uscita, data_rientro, esito, note)
- `lavori_rifacimenti` (originale_id, nuovo_lavoro_id, motivo)
- `ordini_fornitori` (fornitore, articoli, data, stato)

---

## Domande chiave per Filippo (sessione ~60-90 min)

1. **Prove/Try-in**: quante a settimana? su che tipo di lavori? il dentista riporta di persona o con corriere?
2. **Fatture e pagamenti**: come tiene traccia di chi gli deve soldi ora? Excel? Agenda?
3. **Magazzino**: tiene già i lotti? Come ordina i materiali (telefono, WhatsApp, email)?
4. **Migrazione DM**: partirebbe da zero con UÀ o la migrazione è un prerequisito?
5. **Dettatura vocale**: userebbe il microfono? Il lab è rumoroso?
6. **PEC**: ha già la PEC attiva? Credenziali SMTP del provider?
7. **Portale dentista**: pensa che i suoi dentisti userebbero il link? O preferiscono WhatsApp diretto?
8. **Tipi dispositivo**: gli 8 tipi coprono tutto quello che fa?

---

*Prossimo step: sessione con Filippo (60-90 min) per confermare ogni flow con checkbox.*  
*Dopo conferma: scrivere implementation plan con writing-plans skill.*
