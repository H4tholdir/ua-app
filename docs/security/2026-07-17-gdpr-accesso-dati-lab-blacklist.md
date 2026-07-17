# Processo GDPR out-of-band — Accesso e portabilità dati per laboratori in blacklist

**Data:** 17 luglio 2026 · **Owner:** Francesco Formicola (titolare del trattamento lato piattaforma)
**Origine:** N13 — riserva appsec R4 della decisione ratificata (`docs/design/decisions/2026-07-17-N13-N14-N11bis-ratifiche.md`). Questo documento è il **prerequisito ratificato** per l'attivazione del blocco-lettura (`blacklist → 403 anche sui GET` e portale terzi → 404) in modalità `enforce`.

---

## 1. Contesto tecnico

Quando un laboratorio passa allo stato `blacklist` (terminale, nessuna transizione in uscita):

- **API applicative:** tutte le richieste rispondono `403 UA_LAB_BLACKLIST`, letture incluse (guard `assertLabOperativo`, N13).
- **UI:** redirect a `/blocked` dal gate del layout.
- **Portale token (terzi/dentisti):** API e pagine rispondono `404` generico — il portale «sparisce».
- **Sessioni:** gli utenti del lab vengono bannati (GoTrue `ban_duration`) al momento della transizione.
- **Unica eccezione in-band:** nessuna. Anche `GET /api/fatture/export` ha un self-check che nega i lab blacklist (il canale export in-band resta aperto solo a sospeso/scaduto).

Il blocco totale senza un canale alternativo di accesso ai dati esporrebbe a rischio legale: gli **artt. 15 (accesso) e 20 (portabilità) GDPR** restano esercitabili anche da un cliente il cui contratto è cessato per morosità o violazione. Da qui il processo out-of-band descritto sotto.

## 2. Chi può chiedere cosa

| Richiedente | Base | Oggetto |
|---|---|---|
| Titolare del laboratorio blacklistato | Art. 15/20 GDPR + rapporto contrattuale | Export completo dei dati del proprio lab: anagrafiche, lavori, documenti MDR (DdC, schede di fabbricazione), fatture ed XML FatturaPA, magazzino, log |
| Terzo (dentista/studio) già collegato via portale | Art. 15 GDPR (dati propri) + diritto sui documenti fiscali intestati | Fatture e documenti fiscali a lui intestati; documenti di consegna dei propri lavori |
| Paziente (via laboratorio o direttamente) | Art. 15 GDPR | I laboratori trattano dati pazienti come titolari autonomi: la richiesta va reindirizzata al laboratorio; la piattaforma assiste il laboratorio come responsabile ex art. 28 |

## 3. Canale di richiesta

- **PEC ufficiale UÀ** (canale preferito, dà data certa) oppure email a supporto con successiva verifica.
- La richiesta deve indicare: denominazione lab / richiedente, P.IVA o CF, riferimento identificativo (email dell'account titolare per i lab; intestazione fatture per i terzi).

## 4. Verifica identità (obbligatoria prima di ogni consegna)

1. **Titolare lab:** la richiesta deve provenire dalla PEC del laboratorio registrata in piattaforma (`laboratori.pec_*`) o dall'email dell'account `titolare`; in dubbio, richiamata telefonica al numero registrato + documento d'identità.
2. **Terzo dentista:** richiesta dalla PEC/email dello studio presente in `clienti`; in dubbio, verifica incrociata su P.IVA.
3. Nessuna consegna a indirizzi non riconducibili ai dati già registrati.

## 5. Esecuzione (solo `admin_sistema`)

1. L'estrazione avviene con strumenti amministrativi (service role / script dedicato), **senza** riattivare il lab e senza modificare `laboratori.stato`.
2. Formato: **strutturato e interoperabile** (art. 20): CSV/JSON per i dati tabellari + PDF/XML già generati per fatture e documenti MDR.
3. Consegna: archivio cifrato (password comunicata su canale separato) via PEC o link temporaneo a scadenza breve.
4. **Registro:** ogni richiesta e consegna viene annotata (data richiesta, richiedente, verifica effettuata, data consegna, contenuto) in un registro tenuto da Francesco — vale come evidenza di accountability (art. 5.2).

## 6. Tempi

- Riscontro entro **30 giorni** dalla richiesta (art. 12.3), prorogabili di 60 nei casi complessi con comunicazione motivata.
- Le richieste manifestamente infondate o eccessive possono essere rifiutate motivando (art. 12.5).

## 7. Conservazione post-blacklist

- I dati NON vengono cancellati alla blacklist: restano conservati per gli obblighi di legge (10 anni per documenti fiscali ex art. 2220 c.c.; documentazione MDR per i termini dell'Allegato XIII).
- La cancellazione anticipata su richiesta (art. 17) NON si applica ai dati soggetti a obbligo legale di conservazione (art. 17.3.b).
- L'eliminazione definitiva usa il flusso admin `hard-delete` esistente, solo scaduti i termini.

## 8. Nota operativa

Questo processo è **manuale by design**: i lab blacklist sono un caso raro e ostile (frode/abuso); un canale self-service automatizzato riaprirebbe la superficie che N13 chiude. Se il volume dovesse crescere, valutare un endpoint admin dedicato con export firmato.
