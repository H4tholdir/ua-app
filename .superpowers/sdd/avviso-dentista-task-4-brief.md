# Mandato — Task 4 del piano «L'avviso al dentista»

**Data:** 09/08/2026. **Ramo:** `intervento-post-consegna` (attivo, albero pulito, pubblicato).
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`, righe **316-331**.
**Leggi anche:** vincoli globali (11-27) · le revisioni dei Task **1**, **2** e **3** in `.superpowers/sdd/`.

## Il perimetro

**SOLO il Task 4:** `POST /api/lavori/[id]/avviso` — segna un avviso come comunicato, **dall'app** o **a
voce** (⚖️ D335: i due modi valgono uguale, e si registra **chi** e **quando**). Nessun componente,
nessuna migration, nessuna interfaccia.
🛑 **Dopo di te c'è il CANCELLO §0B** (mockup + approvazione di Francesco): **non scrivere niente di
visibile**, nemmeno «per comodità del Task 5».

📌 **Base delle prove misurata da me poco fa: `5748 | 119` su 461 file, più le 14 del Task 3 →
`5762 | 119` su 462.** Le tue prove sono unitarie: **le passate devono salire, le saltate NO.**
Rimisura la tua base invece di ricopiare questa.

## ✅ Due cose che ho PROVATO io, così non le ridimostri

1. **L'id della sessione è valido per `comunicato_da`.** La colonna punta a `public.utenti(id)` (correzione
   del Task 1), e `provato:` `pg_constraint` → `utenti_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
   ON DELETE CASCADE`, con `7 su 7` id coincidenti sul banco. ➡️ **È così per DISEGNO, non per caso:**
   l'identificativo dell'utente autenticato si può scrivere in quella colonna.
2. **Le colonne scrivibili sono esattamente quattro:** `stato · comunicato_at · comunicato_da ·
   testo_inviato`, per `authenticated` e `service_role`. 🛑 **`visto_dal_dentista_at` non è concesso a
   nessuno**, di proposito: il laboratorio non deve poter fabbricare la ricevuta di lettura del dentista.
   Se ti serve scrivere una quinta colonna, **fermati e riferisci**: non aggiungere un `GRANT`.

## 🔴 I punti dove il piano può sbagliare

### ① `context.userId` È UN NOME PRESUNTO — il contesto sta in `src/lib/supabase/lab-context.ts`

Il piano scrive «*`comunicato_da` viene dal contesto server (`context.userId`), MAI dal corpo*». La
**regola** è giusta e non si negozia; **il nome del campo va letto** — apri
`src/lib/supabase/lab-context.ts` e incolla nel resoconto la forma vera di ciò che `getFreshLabContext`
restituisce. È lo stesso genere di presunzione che nel Task 2 si è rivelata **una variabile che non
esisteva affatto**.

### ② 🔴 IL PIANO NON DICE CHI PUÒ SEGNARE UN AVVISO, E I RUOLI SONO CINQUE

`titolare · tecnico · front_desk · admin_rete · admin_sistema` (MAI `admin` nudo; la fonte vera è il
`CHECK` su `public.utenti.ruolo`). Senza un controllo, **chiunque sia autenticato in quel laboratorio può
chiudere un obbligo di legge** dichiarando «l'ho avvisato di persona».
🛑 **NON inventare un perimetro in silenzio.** Fai la cosa che la rotta modello fa (guarda
`src/app/api/lavori/[id]/eventi-qualita/route.ts`), **scrivi nel resoconto quale perimetro hai applicato e
perché**, e segnalalo come **domanda aperta per Francesco**. 📌 Il perimetro per ruolo del **Task 7** è
già dichiarato dal piano come «*una proposta, non una decisione di Francesco*»: questo è lo stesso tema, e
va portato a lui una volta sola.

### ③ 🔴 UNA PROVA UNITARIA DI UNA ROTTA NON PUÒ PROVARE CIÒ CHE FA LA BANCA DATI

Il piano chiede `422` quando `come: 'dall_app'` arriva **senza** `testo`, «*perché il vincolo lo
rifiuterebbe con un `23514` illeggibile*». Giusto — **ma una prova che finge il client Supabase non
dimostra che il 422 arrivi PRIMA della banca dati**: dimostra solo che la funzione restituisce 422.
➡️ **Provalo dove si vede:** che il codice non abbia **nemmeno provato** a scrivere (il finto client non
riceve nessuna chiamata). 🔑 Questa è la categoria di difetto già pagata: *cinque prove verdi su un corpo
che la rotta rifiuta*, riga **38** della coda.

### ④ 🟠 «AVVISO GIÀ CHIUSO → 409»: DEFINISCI «CHIUSO», E NON SCRIVERE UN SECONDO ELENCO

«Chiuso» vuol dire `stato <> 'da_comunicare'`. 📌 **La risposta è già scritta una volta:**
`STATI_CHIUSI` e `chiudeIlPromemoria()` in `src/lib/avvisi/stati.ts`. **Usa quelle**, non un confronto a
mano: le liste scritte due volte sono la riga **22** della coda.

### ⑤ 🟠 IL TESTO ARRIVA DAL CLIENT E NESSUNO NE LIMITA LA LUNGHEZZA

Il testo è **modificabile** dall'odontotecnico (⚖️ D334) e finisce in `testo_inviato`. Il piano non dice
niente su lunghezza massima né su testo vuoto. **Enumera queste forme fra quelle d'input** e decidi:
stringa vuota, soli spazi, testo lunghissimo. Una decisione motivata va bene; il silenzio no.

### ⑥ 🟠 LA DATA: CHI LA METTE?

`comunicato_at` può arrivare dall'orologio del server Node o da quello del database. **Scegli e scrivi
perché.** 🛑 Ricorda che **`now()` è costante dentro una transazione** — è il difetto che ha fatto
arrossire una prova del Task 2.

### ⑦ 🟠 LA GUARDIA DELL'ORIGINE È MECCANICA, E GIRA NELLA VERIFICA

`verify:full` esegue una guardia che pretende che **ogni rotta mutante verifichi l'origine**, o sia
esclusa **con una ragione scritta**. `isSameOrigin` è nel piano: se lo salti, non ti accorgi di un
rilievo — **ti si accende la verifica**.

## Da riferire, non da risolvere qui

⚠️ **Il collegamento al portale scade dopo un anno** (`clienti.portale_token_scade_at`) e **nessuno in
questa catena controlla la scadenza**: la rotta registra «comunicato dall'app» con un testo che contiene
quel collegamento, quindi può registrare un avviso mandato **verso una porta chiusa**. Trovato dal Task 3.
**Non è tuo mandato risolverlo:** scrivi nel resoconto se la tua rotta è il posto giusto per il controllo
o se lo è il foglio (Task 5).

## Le regole di casa

- Skill `superpowers:test-driven-development`: prova prima. **R-P4:** dopo il primo rosso, abbozzo inerte
  e **conta le asserzioni che si accendono** (`N su M`). Le forme d'input si **enumerano prima** delle
  asserzioni: corpo non-JSON · `avviso_id` assente · `avviso_id` di un altro laboratorio · `come` fuori
  vocabolario · `dall_app` senza testo · avviso già chiuso · testo vuoto · testo enorme.
- **PATCH/POST di risorse lab: allowlist esplicita di campi, MAI blocklist** (`CLAUDE.md` §9).
- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — da variabile, mai dietro una
  pipe, timeout 600000 ms.
- ⚖️ **D318 — `git add <percorsi>`, MAI `-A`**, e `git status` prima di salvare. Messaggi lunghi con `-F`.
- 🛑 Niente `push`, niente `main`, niente worktree, niente migration. **Niente UI.**
- **R-E2:** un difetto fuori mandato si **riferisce**, non si corregge.

## Il resoconto

In `.superpowers/sdd/avviso-dentista-task-4-report.md`: ① i sette punti, uno per uno, più i nuovi ·
② la forma vera del contesto server · ③ **il perimetro per ruolo che hai applicato, e la domanda per
Francesco** · ④ come hai provato che il 422 arriva prima della banca dati · ⑤ le forme d'input enumerate e
`N su M` · ⑥ i numeri (`VERIFY_EXIT`, passate/saltate prima e dopo) · ⑦ `non provato` col motivo ·
⑧ ritrovamenti fuori mandato · ⑨ il salvataggio.

🛑 **Non ricopiare nessun numero da questo brief senza rifare il conto.**
