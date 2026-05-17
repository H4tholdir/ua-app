# Come esportare i dati da DentalMaster Advanced

## Cosa serve esportare (nell'ordine giusto)

1. **Clienti/Dentisti** → `clienti.csv`
2. **Listino lavorazioni** → `listino.csv`  
3. **Lavori** (storico ultimi 2 anni) → `lavori.csv`
4. **Pazienti** (opzionale) → `pazienti.csv`

---

## Procedura export in DentalMaster Advanced

### Metodo A — Export standard FileMaker

Per ogni tabella da esportare:

1. Apri DentalMaster in Parallels
2. Vai al modulo corrispondente (es. clic su "Clienti" nel menu)
3. Per selezionare TUTTI i record: **Ctrl+A** oppure menu **Modifica → Seleziona Tutti**
4. Menu: **File → Esporta Record...**
5. Nella finestra di dialogo:
   - **Formato**: scegli "Valori separati da virgola (.csv)" o "Tab-delimited"
   - **Codifica**: UTF-8
   - Spunta **"Includi nomi campi"** (prima riga = intestazione)
6. Scegli dove salvare (es. Desktop) con il nome `clienti.csv`
7. Nella finestra di selezione campi: aggiungi TUTTI i campi disponibili
8. Clic su **Esporta**

### Metodo B — Trasferimento dati

1. Dal menu principale vai a **Preferenze → Trasferimento dati**
2. Cerca opzione "Esporta dati" o "Backup dati"
3. Seleziona i moduli da esportare
4. Scegli formato CSV o Excel

---

## Campi da includere per ogni modulo

### Clienti/Dentisti
- Nome, Cognome, Denominazione studio
- Indirizzo, CAP, Città, Provincia
- Telefono, Cellulare, Email
- Partita IVA, Codice Fiscale
- Codice SDI (codice destinatario FatturaPA)
- PEC
- Note

### Listino
- Codice, Descrizione/Nome
- Categoria (protesi fissa, mobile, ortodonzia, impianti...)
- Prezzo listino 1, Prezzo listino 2 (se disponibile)

### Lavori
- Numero lavoro, Data ingresso, Data consegna
- Cliente (nome o codice), Paziente
- Tipo dispositivo, Descrizione
- Stato (consegnato, in lavorazione...)
- Prezzo, Tecnico assegnato

---

## Dopo l'export

Metti i CSV in una cartella (es. `~/Desktop/dm-export/`) e lancia:

```bash
# Test prima (non scrive nulla)
npx tsx scripts/import-dentalmaster.ts --dir ~/Desktop/dm-export --lab-id TUO_UUID --dry-run

# Import reale
npx tsx scripts/import-dentalmaster.ts --dir ~/Desktop/dm-export --lab-id TUO_UUID
```

**Trovare il tuo LAB_FILIPPO_ID:**
- Vai su Supabase Dashboard → laboratori
- Copia l'UUID della riga con P.IVA 03508740655

