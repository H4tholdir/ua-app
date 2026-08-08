# Il lavoro pianificato del salvataggio — perché sta sotto git

**Che cos'è.** `com.uachelab.salvataggio-database.plist` dice a macOS **quando** far partire la copia
di sicurezza del database. Lo script che la esegue vive già sotto git
(`scripts/salvataggio-programmato.sh` e compagni); **il file che dice l'ora, fino all'08/08/2026, no**:
esisteva solo in `~/Library/LaunchAgents/` di questo Mac.

🔑 **È la terza volta che questo progetto inciampa nello stesso schema**, ed è per questo che la copia
adesso è qui: il collegamento di `/chiudi` (**D255**), lo script del link d'accesso (**D103**), e la
mappa di recupero insieme ai resoconti (**D313**, ieri sera). Ogni volta la stessa forma: **il
contenuto è versionato, il pezzo che lo fa funzionare no** — e un artefatto che *sembra* durevole è
peggio della sua assenza, perché nessuno lo cerca altrove.

---

## Come si installa su una macchina nuova

```bash
cp "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app/scripts/launchd/com.uachelab.salvataggio-database.plist" ~/Library/LaunchAgents/
launchctl bootout gui/$(id -u)/com.uachelab.salvataggio-database 2>/dev/null; launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.uachelab.salvataggio-database.plist
```

⚠️ **Il file porta percorsi assoluti** (`/Users/hatholdir/…`): su una macchina con un altro nome utente
vanno cambiati, ed è il primo posto dove guardare se «non parte più».

## Come si verifica che sia vivo

```bash
launchctl print gui/$(id -u)/com.uachelab.salvataggio-database | head -20
```

E la prova che conta davvero — non che sia *caricato*, ma che abbia **prodotto una copia**:

```bash
ls -lt ~/Backup-UA-database/ | head -5
tail -20 ~/Backup-UA-database/launchd.log
```

📌 `scripts/guardia-salvataggio-installato.mjs`, agganciata al pre-commit, avvisa quando l'ultima copia
supera i **3 giorni**. 🛑 **Controlla la copia, non l'orario**: se un giorno si cambiasse l'ora nel file
vivo senza cambiarla qui, la guardia **non se ne accorgerebbe**. La coerenza fra i due la garantisce
questa cartella, non un controllo automatico.

## Perché le 11:00 e non le 3:00

`provato:` `~/Backup-UA-database/launchd.log` — un giro riuscito ogni notte fino al **2026-08-05 03:00**,
e poi **nessuna riga** il 6, il 7 e l'8. Non un errore: il lavoro **non è partito**, perché il Mac era
spento, e **launchd non ha recuperato al risveglio**. Tre giorni senza copia.
Le 11:00 le ha indicate Francesco l'08/08/2026: «*di solito il pc lavora sempre intorno alle 11.00*».

⚠️ **Che cosa resta vero:** se il Mac è spento anche alle 11:00, quel giorno si salta lo stesso. Un
secondo orario è possibile, **ma lo script non salta quando una copia di oggi esiste già** — quindi due
orari vorrebbero dire due copie al giorno. La scelta è rimandata, non dimenticata.
