# Revisione del Task 1 — «L'avviso al dentista»

**Quando:** 09/08/2026, pomeriggio (`date` letto in un comando separato).
**Chi:** l'orchestratore, sul catalogo vivo — **non** sul resoconto dell'esecutore.
**Esito:** ✅ **la sostanza del Task 1 tiene.** 🔴 **Tre affermazioni del resoconto non reggono**, e due
difetti veri sono stati trovati **da questa revisione**, non dall'esecutore.

## 1. Verificato da me, sul vivo

| cosa | come | esito |
|---|---|---|
| Albero, salvataggi, `main` | `git status` · `git log` · `git rev-parse main` | pulito · 4 salvataggi · `main` intatta a `7427a680` |
| Le due migration stanno sopra il pavimento | `ls supabase/migrations \| tail -4` | `20260809123206` · `20260809124517` > `20260808195344` ✅ |
| ② la chiave dell'autore | `pg_constraint` | `FOREIGN KEY (comunicato_da) REFERENCES utenti(id)` ✅ — la correzione dell'esecutore è giusta |
| ④ il `CHECK` stretto | `pg_constraint` | `((stato='comunicato_dall_app' AND testo IS NOT NULL) OR (stato<>'comunicato_dall_app' AND testo IS NULL))` ✅ — ora vieta davvero |
| ⑨ la ricevuta di lettura non è scrivibile | `information_schema.column_privileges` | `visto_dal_dentista_at` **non compare in nessun `GRANT UPDATE`** ✅ |
| Le colonne aggiornabili sono quattro | idem | `stato · comunicato_at · comunicato_da · testo_inviato`, per `authenticated` e `service_role` ✅ |
| RLS e politiche | `pg_class.relrowsecurity` · `pg_policies` | accesa · due politiche (SELECT, UPDATE), entrambe `laboratorio_id = current_lab_id()` ✅ |
| Indici | `pg_indexes` | 2 + chiave primaria; il parziale porta il suo `WHERE stato='da_comunicare'` ✅ |
| La prova d'integrazione **gira davvero** | `set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-dentista-schema.rpc.test.ts` | **27 passate su 27**, zero saltate ✅ |
| I tipi | `npx tsc --noEmit` | `TSC_EXIT=0` ✅ |

**Un dato che il resoconto non dava, e che è il migliore della giornata:** confrontata con le sorelle, la
tabella nuova è **la più ristretta del progetto**. `clienti`, `lavori` e `dichiarazioni_conformita` hanno
`anon=arwdDxtm` (**tutto**, `TRUNCATE` compreso); `valutazioni_evento` ha `anon=ar`; `avvisi_dentista` ha
`anon=r`.

## 2. 🔴 Tre affermazioni del resoconto che non reggono

**① «`anon` a zero» è FALSO.** Il catalogo dice `anon=r/postgres`, e `column_privileges` elenca `anon`
con `SELECT` su **tutte e undici** le colonne. **Innocuo in pratica** — la politica di lettura pretende
`laboratorio_id = current_lab_id()`, e una sessione `anon` senza gettone di laboratorio non trova nessuna
riga — **ma non è un errore di battitura: è una contraddizione di ragionamento.** Lo stesso resoconto
sostiene che il portale (Task 8) dovrà passare da una funzione `SECURITY DEFINER` *perché* `anon` non può
soddisfare la politica. Se è così, quel `SELECT` ad `anon` è un permesso che non serve a nessuno.
➡️ **Resta aperto**, e va chiuso da chi tocca il portale.

**② «tutte e quattro le chiavi CASCADE» è FALSO: le chiavi sono CINQUE.** La quinta è
`avvisi_dentista_comunicato_da_fkey (comunicato_da → utenti)`, **senza `ON DELETE`**, cioè `NO ACTION` —
ed è l'unica **non** coperta dall'argomento dell'esecutore. La scelta di non usare `SET NULL` è motivata
bene (romperebbe il `CHECK` sull'autore), ma l'argomento «sono quattro e sono tutte CASCADE» **non copre
la chiave che conta**.

**③ Il punto ⑧ NON è provato: girava su una tabella VUOTA.** Con zero righe nessuna chiave esterna può
scattare, quindi quella prova non distingue «funziona» da «esploderebbe». Provato davvero (sotto), e ne
sono usciti due difetti.

## 3. 🔴 Due difetti trovati da questa revisione, provati in transazione annullata

### 🔴 A — `admin_delete_laboratorio` È ROTTA OGGI, e non per gli avvisi

`provato:` `scripts/sonde/2026-08-09-cancellazione-laboratorio-dpa.sql`, con **zero avvisi** in tabella:

```
lab di prova: 971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c | avvisi presenti: 0
ESITO: FALLITA senza avvisi -> PREESISTENTE | 23503 |
  update or delete on table "clienti" violates foreign key constraint
  "data_processing_agreements_dentista_id_fkey" on table "data_processing_agreements"
```

**La causa è l'ordine dentro la funzione:** `DELETE FROM clienti` sta alla **riga 51**,
`DELETE FROM data_processing_agreements` alla **76**. Un laboratorio con un accordo sul trattamento dei
dati **non si può cancellare**. 🛑 **Preesistente, fuori dall'ondata dell'avviso, quinto caso della
famiglia D274** — e spiega perché il punto ⑧ non era verificabile: la funzione muore alla riga 51, molto
prima di arrivare a `utenti` (riga 84).

### 🟠 B — la quinta chiave morde davvero, e oggi la salva solo l'ordine

`provato:` `scripts/sonde/2026-08-09-avviso-chiave-autore.sql` — un avviso vivo con l'autore valorizzato,
poi si cancella l'autore:

```
premessa: avviso vivo con autore 2f78066e-64ef-4194-aef4-364dad2e7d4d
C) 23503 | update or delete on table "utenti" violates foreign key constraint
  "avvisi_dentista_comunicato_da_fkey" on table "avvisi_dentista"
```

**Nella funzione oggi non morde**, perché `DELETE FROM lavori` (riga **47**) porta via gli avvisi a
cascata — `lavoro_id` è `NOT NULL` con `ON DELETE CASCADE`, quindi nessun avviso arriva vivo alla riga 84.
🔑 **Ma quella salvezza non è protetta da niente:** `avvisi_dentista` **non è nominata** in
`admin_delete_laboratorio`, quindi il conteggio che la funzione restituisce **tace** su di essa, e
qualunque riordino futuro delle cancellazioni riapre il difetto **in silenzio**.

## 4. Numeri dell'esecutore che NON ripeto come miei

- **`5859 su 5859 in 460 file`** — è la sua misura, non la mia: io ho misurato il file nuovo (27/27) e
  `tsc` (0). **Riferito, non verificato.**
- **`R-P4: 9 su 22`** — non è verificabile dopo il fatto: l'abbozzo inerte è stato buttato, com'è giusto.
  **Riferito, non verificato.**

## 5. Che cosa passa al Task 2

1. 🛑 **Il pavimento delle migration è cambiato: `20260809124517`**, non `20260808195344`. Il brief del
   Task 2 deve portare **questo** numero — è la classe di errore che ieri ha prodotto sei sbagli su sette.
2. 🔴 **Il punto ⑦ dell'esecutore, che confermo per logica:** la sonda scritta nel piano (`stato='pippo'`
   con le date a `NULL`) viola **due** `CHECK` insieme, quindi può passare nominando il vincolo sbagliato.
   **Ogni sonda che guarda il codice `23514` e non il NOME del vincolo può passare per il motivo
   sbagliato** — vale per ogni task che istituisce un vincolo.
3. 🟠 Il `SELECT` di `anon` da chiudere (vedi §2①), quando si sa chi legge il portale.
4. Le quattro cose che l'esecutore ha marcato **`non provato`**, tutte legittime: il comportamento della
   politica di scrittura fra laboratori diversi (serve un gettone vero → Task 4) · che la funzione
   riesca a inserire (→ Task 2) · nessun legame fra `campi_corretti` e `CAMPI_CORREGGIBILI_DOCUMENTO`
   (→ Task 2) · che le quattro colonne concesse siano esattamente quelle che servirà scrivere (→ Task 4).

## 6. Giudizio

✅ **Il Task 1 si chiude.** L'esecutore ha trovato e corretto **un difetto proprio** (il `GRANT UPDATE`
su tutta la riga, che permetteva di fabbricare la ricevuta di lettura del dentista) e l'ha scritto per
intero: è il processo che funziona. Le tre imprecisioni del §2 non toccano ciò che è stato costruito,
ma **una di esse nascondeva un difetto vero** — ed è per questo che la revisione si fa sul catalogo e
non sul resoconto.
