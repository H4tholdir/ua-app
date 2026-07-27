# Sessione attiva — nome e cognome paziente: PIANO TAPPA 1 SCRITTO, zero codice (27/07/2026)

✅ **FASE 4 completa.** Piano: `docs/superpowers/plans/2026-07-27-nome-cognome-paziente-tappa-1.md`
— 11 task, TDD passo-passo, validato da advisor (3 correzioni integrate). Ordine tappe ratificato
da Francesco: **tappa 1 adesso**, 1-bis e 2 dopo.

🛑 **SCOPERTA che ha cambiato la forma del piano:** il trigger `sync_paziente_nome_cognome`
(`002_fase2_schema.sql:132-134`) è **`BEFORE INSERT OR UPDATE`**, non solo INSERT. Conseguenze:
(a) la rettifica funziona davvero (`nome_cognome` si risincronizza) → D9/Art. 16 servito;
(b) 🛑 **la trappola «consegna bloccata» si apre su una SECONDA porta** — `PazienteEditSheet`
invia l'intero form a ogni salvataggio, quindi `nome`/`cognome` messi nell'allowlist così com'è
scriverebbero `' '` in `nome_cognome` al primo salvataggio con caselle vuote.

**Perciò la tabella §5 NON è una regola del wizard: è un invariante di `pazienti`, con 3 scrittori.**
Aggiunte al piano rispetto alla spec §6, motivate: funzione pura condivisa
`src/lib/domain/nome-paziente-scrittura.ts` (T2) + enforcement server in POST (T4) e PATCH (T5).

**Vincoli d'ordine:** T1 mockup = GATE (nessun React prima) · **T5 SEMPRE prima di T8** · T2 per primo.
**Ambiente:** branch nel repo principale, NON worktree (dev server 404 in worktree).
`StatoSalvato` va bumpato a **`v: 2`** o la ripresa bozza uccide la creazione del lavoro.

**PROSSIMO PASSO:** scegliere l'esecuzione (subagent-driven consigliato) e partire da **Task 1**.
