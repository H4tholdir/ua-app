# Sessione attiva — consegna zero IN PRODUZIONE, P3 e P6 chiuse. Tocca a T1 (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-ondata-b-apertura-handoff.md`.**
Poi il piano: **`docs/roadmap/2026-07-29-ondata-b-piano-v2.md`**, e si legge **§0 per prima**.

🚀 **CONSEGNA ZERO PUBBLICATA** — merge `ed286b0f` su `main`, CI+CD verdi, `uachelab.com` verificato.
**Z3 · Z2 · Z1** in produzione. ✅ **Il gate del piano v2 §0 è SUPERATO: T1 può aprire il ramo.**
🔑 **Z1 è INERTE** (nessun indice unico esiste ancora: è **T5**) — mai scrivere «verificato in produzione».

✅ **Delle tre sonde ne resta UNA.** **P3** e **P6-forma** chiuse il 30/07, prove in §5 del piano:
- **P3** → proiezione stretta minima **`id, codice_paziente, cognome, nome`**; dei 12 campi di oggi **10
  non hanno lettori**; unico chiamante `crea-lavoro.ts:250` (**non** `:209`: le righe del piano sono derivate).
- **P6-forma** → **si esprime in PostgREST, niente RPC**: innesto `lavori(data_ingresso)` con `order` +
  `limit` **per padre**. Grafia **`referencedTable`** (supabase-js 2.105.4). Colonna **`data_ingresso`**,
  mai `updated_at`. 🛑 L'innesto resta **semplice**: `!inner` restituisce `[]`.
- **P2** resta, e resta per costruzione: **si riesegue immediatamente prima di T5**.

🔴 **BLOCCANTE NUOVO, uscito dalle sonde — da risolvere PRIMA di T6:** **T6 punto 2 del piano** vuole
`cognomeEffettivo` nella proiezione, ma la **spec B2** pretende **esattamente cinque chiavi, con un test
che fallisce alla sesta**. Due documenti ratificati che si contraddicono. ⚠️ E nessuno dei due dice **su
quali colonne si FILTRA**: 911 pazienti su 916 hanno `nome_cognome = codice_paziente` con
`cognome`/`nome` a `NULL`.

🔴 **Restano di Francesco: 2 decisioni** (quando nasce la cassetta del wizard · la stringa della briciola)
e **2 gate di mockup** (denti, colore).

🔑 **La lezione del giorno: una domanda posta sull'oggetto sbagliato porta alla conclusione opposta.**
P6 chiedeva se fosse esprimibile *l'aggregato* — non lo è; ma la forma che serve è un'altra e funziona.
E un ritrovamento altrui è una **segnalazione, non una prova**, finché non apri il file.

🔴 **Otto voci aperte in fondo alla ROADMAP.** La grossa: **76 punti delle API rimandano il messaggio
grezzo del database al client** (escono **nomi**, non dati altrui; serve autenticazione). Cura in due
metà: **prima la guardia, poi la pulizia.**

**Database toccato SOLO in lettura. Baseline: 294 · 0 · 916 · 48.**
