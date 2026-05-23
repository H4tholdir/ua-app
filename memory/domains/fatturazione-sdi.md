# Fatturazione Elettronica SDI
**Carica quando:** task tocca fatture, FatturaPA, SDI, PEC, progressivo, incluso_in_fattura, stato_sdi.

## File chiave
- `src/lib/fattura/generate-xml.ts` — genera XML FatturaPA 1.2, snapshot cliente immutabile, progressivo da RPC
- `src/lib/fattura/send-pec.ts` — SMTP PEC verso SDI, password da Vault via `get_pec_password`
- `src/types/domain.ts` — `StatoSDI` (7 stati: draft → generata → smtp_inviata → pec_consegnata → ricevuta_sdi → accettata/rifiutata)
- `src/lib/db/progressivi.ts` — `generaProgressivo()` RPC atomica

## Invariante critica
**`incluso_in_fattura` è il discriminatore "già fatturato" — ortogonale a `stato_sdi` e a `lavori.stato`.**
Il progressivo SDI è assegnato dalla RPC atomica `genera_progressivo` e **non si ricalcola mai dopo la prima emissione**. Ricalcolare = SDI ha il vecchio progressivo, il secondo invio viene rifiutato.

## Regole operative
- Password PEC: MAI in chiaro nel DB — solo via `get_pec_vault_secret` con service_role
- Snapshot cliente (denominazione, PIVA, CF, indirizzo) copiati al momento della generazione: immutabili per legge
- Batch fatture: selezionare lavori unbilled → creare draft → generare XML → marcare `incluso_in_fattura`

## Issue nota (Codex — alta priorità)
Il batch fatture non ha claim atomico: due richieste concorrenti vedono gli stessi lavori unbilled, creano due fatture separate per gli stessi lavori. Da aggiungere `UPDATE SET incluso_in_fattura = true WHERE NOT incluso_in_fattura` transazionale prima di procedere.

## Issue nota (Codex — alta priorità)
`generaProgressivo()` viene chiamato prima di verificare se esiste già un draft — se la fattura viene rigenerata per un fix XML, il progressivo viene sovrascritto con uno nuovo. Da verificare l'esistenza del draft prima di chiamare la RPC.
