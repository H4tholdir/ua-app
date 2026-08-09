# Revisione del Task 2 — «L'avviso al dentista»

**Quando:** 09/08/2026, pomeriggio. **Chi:** l'orchestratore, sul catalogo vivo.
**Esito:** ✅ **il Task 2 si chiude, ed è il lavoro migliore delle due tornate.** Un rilievo dell'esecutore
**corregge la mia revisione del Task 1**. 🔴 **Una sola riga del resoconto è sbagliata, ed è un numero:
`verify:full` non dà «5867 su 5867, zero saltate» — dà 5748 passate e 119 SALTATE** (§7).

## 1. Verificato da me, sul vivo

| cosa | esito |
|---|---|
| Albero, salvataggi, `main` | pulito · 3 salvataggi (`fc551f02`, `d75a9998`, `6259abaa`) · `main` intatta a `7427a680` |
| Migration | `20260809133546` > pavimento `20260809124517` ✅ |
| `proacl` della funzione | `{postgres=X/postgres,service_role=X/postgres}` — **né `anon` né `authenticated`**: il `REVOKE` non è saltato ✅ |
| La firma non è cambiata | sei parametri, nomi e tipi identici, `prosecdef = true` ✅ |
| Il corpo vivo crea l'avviso | `INSERT INTO public.avvisi_dentista` presente ✅ · usa **`v_nuova.id`** ✅ · **non** usa il nome presunto `v_nuova_ddc_id` ✅ |
| Le prove girano davvero | `set -a && . ./.env.local; set +a && npx vitest run` sui due file → **35 passate su 35** (27 del Task 1 + 8 nuove), zero saltate ✅ |

## 2. I tre difetti del brief: chiusi bene, e la ragione sta nel codice

Il blocco nuovo del corpo vivo (righe 348-389) non si limita a evitare i tre difetti: **porta scritta
accanto la ragione**, che è ciò che impedisce a un domani di reintrodurli.

- **`VALUES` invece di `INSERT … SELECT FROM lavori`** — il piano avrebbe potuto inserire **zero righe in
  silenzio** (riemissione riuscita, promemoria assente, esito `ok`), cioè il difetto che il task esiste
  per rendere impossibile. La riga del lavoro è già letta e bloccata a monte con `FOR UPDATE`.
- **`ORDER BY k`** — `jsonb` tiene le chiavi ordinate **per lunghezza**, quindi l'elenco dei campi
  corretti sarebbe uscito nell'ordine con cui è fatta la memoria del database. Quell'elenco finisce in un
  messaggio a un dentista.
- **`v_correzioni` invece di `p_correzioni`** — la forma normalizzata, che è già passata dai controlli.

## 3. 🔴 Il difetto più grave del piano, e va oltre questo task

**Il Task 2 diceva di aprire `20260808093513_correggi_e_riemetti_atomica.sql`. Quel file è stato superato
quattro volte.** `provato:` righe 150-151 di quel file:

```
  c_su_lavori CONSTANT text[] := ARRAY[
    'richiedente_nome', 'paziente_id', 'paziente_nome_snapshot',
    'numero_prescrizione', 'tipo_dispositivo', 'descrizione'];
```

`paziente_nome_snapshot` e `numero_prescrizione` sono **usciti** da quell'elenco con ⚖️ **D319** e ⚖️
**D320**, per ragione **normativa**. Il corpo vivo lo dice da sé: «*Erano SEI fino a D319
(`numero_prescrizione`) e CINQUE fino a D320 (`paziente_nome_snapshot`)*».
➡️ **Ricopiare dal file che il piano indicava avrebbe riaperto due campi chiusi da una decisione di
legge, e nessuna prova sarebbe diventata rossa.** L'esecutore l'ha evitato perché il brief gli imponeva
di leggere **il catalogo vivo**.
🔑 **La lezione non è «quel piano aveva un riferimento vecchio»: è che un piano scritto oggi può citare un
file superato ieri, e la regola di casa esiste già** — *il file di migration non è la prova, la verità è
il catalogo vivo*. Qui ha pagato per la prima volta su un obbligo di legge.

## 4. 🟠 Un rilievo dell'esecutore CORREGGE la mia revisione del Task 1

Nella revisione del Task 1 ho notato che `cliente_id` e `dichiarazione_id` erano passate da `RESTRICT`
(come da piano) a `CASCADE`, e **l'ho registrato senza valutarne la conseguenza**. L'esecutore del Task 2
l'ha valutata, e ha ragione: **cancellare una dichiarazione porta via la prova che il dentista fu
avvisato** — su una tabella il cui commento cita GDPR Art. 19.

**Misurato prima di giudicare:**
- `grep` su `src/` per una cancellazione di `dichiarazioni_conformita` → **nessuno**. Nel prodotto una
  dichiarazione **si annulla**, non si cancella.
- In banca dati l'unica funzione che le cancella è **`admin_delete_laboratorio`**, cioè la cancellazione
  **totale** del laboratorio — dove portarsi via anche gli avvisi **è la scelta giusta**.

➡️ **Giudizio: il `CASCADE` resta, e la ragione va scritta** invece di restare implicita. Non è una
riparazione da fare oggi: è un vincolo **permissivo** su una strada che oggi non esiste. Va nella riga
**43** della coda, accanto alla chiave dell'autore. 🛑 **Se un giorno nascesse una schermata che cancella
una dichiarazione, quel `CASCADE` diventa un difetto vero** — ed è esattamente il caso in cui una
conseguenza scritta oggi vale più di una riparazione fatta a caso.

## 5. Le altre cose che l'esecutore ha fatto bene, e che non erano nel mandato

- **Ha fatto fallire la riemissione per davvero** (una coppia anno+progressivo già presa), e la prova
  asserisce **il nome del vincolo**, non il codice `23505` — che è precisamente il difetto ⑦ del Task 1.
- **Ha dichiarato il limite invece di addolcirlo:** non esiste un guasto raggiungibile **dopo** la nascita
  dell'avviso, perché le cinque chiavi non sono differibili. Quindi la prova mostra che le due cose
  cadono insieme, **non** che «un avviso scritto viene poi tolto». Ha cercato due strade per costruirlo e
  ha misurato che nessuna esiste.
- **Ha lasciato `campi_corretti` libero in banca dati con una ragione forte:** un `CHECK` con le sei voci
  di oggi **romperebbe la storia** — le voci sono passate da otto a sei in due giorni, e il giorno in cui
  cade la settima ogni aggiornamento di un avviso vecchio che la nomina fallirebbe, **compreso quello che
  lo segna come comunicato**. Un registro dell'Art. 19 deve continuare a dire cosa fu corretto *allora*.
- **Ha trovato un difetto proprio e l'ha scritto:** la sua prima prova ordinava per `created_at`, ed è
  arrossita — `now()` è costante in transazione, quindi due avvisi nati nella stessa transazione hanno lo
  stesso istante e nessun ordine definito.
- **Ha chiuso un buco che nessuno aveva chiesto:** il commento di `correzioni.ts` afferma che le due
  liste «si guardano in faccia» in una prova unitaria — **non è vero**, quella prova le confronta con un
  elenco scritto a mano. Ora una prova legge le voci ammesse **dal messaggio d'errore della funzione
  viva**.

## 6. Che cosa passa al Task 3

1. 🛑 **Il pavimento delle migration è `20260809133546`.**
2. 🔴 **Il piano può citare file superati:** ogni task che tocca un oggetto di database legge **il
   catalogo vivo**, non il file che il piano nomina. Costato una volta su un obbligo di legge (§3).
3. 🟠 **Nove `RAISE` di difesa in `correggi_e_riemetti_atomica` non hanno nessuna prova d'integrazione** —
   riferito, fuori mandato. Una difesa persa in una riscrittura futura **non farebbe arrossire niente**.
4. 🟠 Il commento sbagliato di `correzioni.ts` (§5) resta da riscrivere: è una riga di documentazione che
   dichiara una protezione inesistente.
5. 🔴 **Le 35 prove delle due tornate `verify:full` NON le esegue** (§7): la loro sorveglianza dipende
   interamente dalla CI. Il brief del Task 3 deve chiedere **entrambe** le misure.

## 7. 🔴 Il numero sbagliato del resoconto, e perché conta

Il resoconto dice: «*`verify:full`: `VERIFY_EXIT=0` — **5867 su 5867 in 461 file, zero saltate**»*.
`provato:` lanciato da me, pulito, uscita letta da variabile e senza pipe:

```
Test Files  452 passed | 9 skipped (461)
      Tests  5748 passed | 119 skipped (5867)
```
**`VERIFY_EXIT=0`** ✅ — quello è giusto. **Ma le saltate non sono zero: sono 119.** `5867` è il totale
**raccolto** (5748 + 119), non il totale passato: è la stessa riga letta a metà.

🔑 **E il conto delle saltate chiude il cerchio, esattamente: 84 + 27 + 8 = 119.** Le 84 sono quelle di
ieri; le 27 sono del Task 1; le 8 sono del Task 2. ➡️ **Tutte e 35 le prove costruite in queste due
tornate sono prove d'integrazione, e `verify:full` NON le esegue** perché non carica `.env.local`. In
locale un verde pieno **non dice niente** su di esse: girano solo in CI (⚖️ D333) o a mano con
l'ambiente caricato.

🛑 **È la riga 39 della coda che si allarga:** «*una prova che nessuno esegue fa credere che l'area sia
coperta*». Qui non è nascosta — la CI le esegue tutte — **ma la verifica locale non è più il cancello**,
e chi lavora in locale deve lanciare due comandi, non uno.
