# Come esportare i dati da DentalMaster Advanced

## Prima di iniziare

DentalMaster Advanced usa FileMaker Pro come database. I file `.US8` sono in formato
binario proprietario — non leggibili direttamente. L'unico modo per estrarre i dati
è usare la funzione di esportazione integrata di DentalMaster.

---

## Passaggi per ogni modulo

### 1. Clienti (dentisti/studi dentistici)

1. Apri DentalMaster Advanced
2. Dal menu principale, vai a **Clienti/Dentisti**
3. Assicurati che siano visualizzati TUTTI i record (rimuovi eventuali filtri attivi)
4. Menu: **File → Esporta Record**
5. Formato: **Valori separati da virgola (.csv)**
6. Spunta **Includi i nomi dei campi nella prima riga** (fondamentale)
7. Salva come: `clienti.csv`
8. Campi da includere (nell'ordine consigliato):
   - Denominazione Studio / Ragione Sociale
   - Nome (del dottore)
   - Cognome (del dottore)
   - Telefono
   - Email
   - Indirizzo
   - CAP
   - Città
   - Provincia (sigla 2 lettere)
   - Partita IVA
   - Codice SDI (codice destinatario FatturaPA)
   - PEC
   - Note

### 2. Pazienti

1. Dal menu principale, vai a **Pazienti** (o **Archivio Pazienti**)
2. Assicurati che siano visualizzati TUTTI i record
3. Menu: **File → Esporta Record**
4. Formato: CSV
5. Salva come: `pazienti.csv`
6. Campi da includere:
   - Codice Paziente (ID interno DentalMaster — fondamentale per evitare duplicati)
   - Nome
   - Cognome
   - Studio/Dentista associato (deve corrispondere al campo Studio nel file clienti.csv)
   - Data di nascita
   - Codice Fiscale
   - Sesso (M/F)
   - Note

> **Nota sul campo Studio**: il valore nel file pazienti.csv deve corrispondere
> esattamente al nome dello studio nel file clienti.csv. Lo script usa questo
> campo per collegare paziente → dentista. Se i nomi non corrispondono, i pazienti
> verranno saltati con un avviso.

### 3. Listino lavorazioni

1. Dal menu principale, vai a **Listino** (o **Tariffario** / **Prezzario**)
2. Visualizza TUTTE le voci attive
3. Menu: **File → Esporta Record**
4. Formato: CSV
5. Salva come: `listino.csv`
6. Campi da includere:
   - Codice (codice interno della lavorazione — fondamentale per upsert idempotente)
   - Nome / Descrizione
   - Categoria (es. "Protesi Fissa", "Protesi Mobile", "Ortodonzia")
   - Prezzo Listino 1 (listino base)
   - Prezzo Listino 2 (opzionale — secondo listino)
   - Prezzo Listino 3 (opzionale — terzo listino)
   - Note

### 4. Lavori (storico — opzionale)

L'import dello storico lavori non è supportato nella versione attuale dello script
(la struttura dei lavori UÀ ha più campi obbligatori che DentalMaster non gestisce).
Contatta il team UÀ per un import personalizzato dello storico se necessario.

---

## Formato del file CSV

Lo script riconosce automaticamente il separatore (virgola, punto e virgola, o tab).
Entrambi i formati seguenti sono validi:

```
Studio;Nome;Cognome;Telefono;Email
Studio Rossi;Mario;Rossi;0123456789;mario@rossi.it
```

```
Studio,Nome,Cognome,Telefono,Email
"Studio Rossi","Mario","Rossi","0123456789","mario@rossi.it"
```

**Importante**: la prima riga deve contenere i nomi delle colonne (header).

---

## Esecuzione dell'import

### Passo 1 — Dry run (verifica senza scrivere)

```bash
npx tsx scripts/import-dentalmaster.ts \
  --dir ~/Desktop/dm-exports \
  --lab-id <UUID-LABORATORIO> \
  --dry-run
```

Il dry-run mostra cosa verrebbe importato senza scrivere nulla nel database.
Usalo sempre prima dell'import reale per verificare che i file siano letti correttamente.

### Passo 2 — Import reale

```bash
npx tsx scripts/import-dentalmaster.ts \
  --dir ~/Desktop/dm-exports \
  --lab-id <UUID-LABORATORIO>
```

### Riesecuzione sicura

Lo script è progettato per essere rieseguito in sicurezza:
- **Clienti**: i clienti già presenti (riconosciuti per P.IVA o nome studio) vengono saltati
- **Pazienti**: i pazienti con lo stesso codice paziente e stesso dentista vengono saltati
- **Listino**: aggiornamento tramite upsert — rieseguire aggiorna i prezzi se cambiati nel CSV

---

## Trovare il LAB_FILIPPO_ID (UUID del laboratorio)

1. Accedi a [Supabase Dashboard](https://supabase.com/dashboard)
2. Vai su **Table Editor** → tabella `laboratori`
3. Cerca la riga con P.IVA `03508740655` (Laboratorio Filippo Opromolla)
4. Copia il valore della colonna `id` (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

In alternativa, imposta la variabile d'ambiente nel file `.env.local`:

```
LAB_FILIPPO_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

Così non serve passare `--lab-id` ogni volta.

---

## Dopo l'import — Checklist

- [ ] Verifica i clienti importati (Table Editor → clienti) — controlla i campi vuoti
- [ ] Aggiungi il Codice SDI per i clienti che ricevono fattura elettronica
- [ ] Controlla il `listino_numero` di ogni dentista (1 = listino standard)
- [ ] Verifica che i pazienti siano collegati al dentista corretto
- [ ] Esegui una consegna di test con un lavoro reale per validare l'intero flusso
