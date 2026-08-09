# Mandato — Task 2 del piano «L'avviso al dentista»

**Data:** 09/08/2026. **Ramo:** `intervento-post-consegna` (attivo, albero pulito, pubblicato).
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`, righe **192-251**.
**Prima leggi anche:** i vincoli globali (righe 11-27) e la **revisione del Task 1**
(`.superpowers/sdd/avviso-dentista-task-1-revisione.md`) — porta quattro cose che arrivano a te.

## Il perimetro

**SOLO il Task 2.** La funzione `correggi_e_riemetti_atomica` deve creare l'avviso **dentro la propria
transazione**, così non può esistere una riemissione senza il suo promemoria. **La firma non cambia**
(6 parametri): cambia il corpo.

## 🛑 Due numeri che NON si ricopiano

1. **Il pavimento delle migration è `20260809124517`** — il Task 1 ne ha prodotte due. Il piano porta
   ancora il numero vecchio (`20260808195344`): **è scaduto.** Prendi il tuo con
   `date -u "+%Y%m%d%H%M%S"` in un comando **separato**, e verifica il pavimento da te con
   `ls supabase/migrations | tail -3`. Se il tuo numero è più basso, **fermati e riferisci**.
2. **La base delle prove.** Il piano dice `5725 | 84`, la chiusura di ieri `5809/5809`, il Task 1
   riferisce `5859/5859 su 460 file` — **quest'ultimo non è verificato.** Misura il tuo e confronta col
   tuo.

## 🔴 Tre punti dove il piano sbaglia, e vanno attaccati

### ① IL FILE DI PROVA CHE IL PIANO TI DICE DI CREARE ESISTE GIÀ

Il Passo 2 dice «🆕 (da creare) in `tests/integration/avvisi-dentista-schema.rpc.test.ts`». **Quel file
esiste dal Task 1 e contiene 27 prove di SCHEMA** (vincoli, permessi, catalogo). Le tue sono prove di
**comportamento di una funzione**: un'altra cosa.
➡️ **Decidi tu e scrivi il motivo:** un file nuovo (per esempio
`tests/integration/correggi-e-riemetti-con-avviso.rpc.test.ts`, che seguirebbe la convenzione
`<nome-rpc>.rpc.test.ts` già usata dagli altri sette file) **oppure** un blocco nuovo nel file
esistente. 🛑 **Non sovrascrivere** le 27 prove: rilanciale e riferisci che sono ancora verdi.

### ② `v_nuova_ddc_id` È UN NOME PRESUNTO — il piano lo dichiara

Il Passo 1 è la difesa: **leggi il corpo VIVO dal catalogo**, non il file di migration.
```bash
node scripts/psql.mjs -c "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'correggi_e_riemetti_atomica';"
```
Incolla nel resoconto la **riga vera** che porta l'identificativo della dichiarazione nuova, e usa quel
nome. Se il corpo vivo e il file `20260808093513_correggi_e_riemetti_atomica.sql` **divergono**, il file
non è la verità: riferiscilo.

### ③ «ROSSA PERCHÉ LA TABELLA È VUOTA» È LA RAGIONE SBAGLIATA

Il Passo 3 dice così, ma la tabella **esiste** da ieri: le prove saranno rosse perché **la funzione non
inserisce ancora**. ⛔ **R-P4:** un rosso da «modulo non trovato» o da «relazione inesistente» non prova
niente. Dopo il primo rosso metti un **abbozzo inerte** e **conta quante asserzioni si accendono**
(`N su M`, il numero si scrive).

🔴 **E la prova ② del piano («se la riemissione fallisce, nessun avviso resta») non dice COME farla
fallire.** È il cuore del task — se non fallisce davvero, quella prova è verde senza provare niente.
Progetta il modo, scrivilo, e se non trovi un modo onesto **dillo invece di addolcirla**.

## Le quattro cose che arrivano dal Task 1

1. **Nessun vincolo lega `campi_corretti` a `CAMPI_CORREGGIBILI_DOCUMENTO`** (`src/lib/dichiarazione/
   correzioni.ts:50-75`, **sei voci**). La scelta è **tua e va motivata**: lasciarlo libero, validarlo
   nella funzione, o un vincolo in banca dati. 🛑 Il piano non la chiude.
2. **Che la funzione riesca a inserire era marcato `non provato`** — lo provi tu. 📌 Se l'inserimento
   viene rifiutato dalla protezione per riga, la causa è che sulla tabella **non esiste una politica di
   `INSERT`** (deliberato, piano riga 148): la funzione è `SECURITY DEFINER`, quindi gira come
   proprietario. **Verificalo, non darlo per buono.**
3. **Ogni sonda che guarda il CODICE di errore e non il NOME del vincolo può passare per il motivo
   sbagliato** — è il difetto ⑦ del Task 1, dove `stato='pippo'` violava **due** `CHECK` insieme.
4. **Contesto, fuori dal tuo mandato:** `avvisi_dentista` non è nominata in `admin_delete_laboratorio`
   (righe **42-43** della coda). **Non toccarlo.**

## Le regole di casa

- 🛑 **`DROP` → `CREATE` → `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` → `GRANT` a `service_role`
  → `COMMENT`.** Il `REVOKE` è portante: dopo un `CREATE` fresco Postgres concede `EXECUTE` a `PUBLIC`.
  **Verifica dopo:** `SELECT proacl FROM pg_proc WHERE proname='correggi_e_riemetti_atomica';` →
  `EXECUTE` **solo** a `service_role`. Se compaiono `anon` o `authenticated`, il `REVOKE` è saltato.
- ⚖️ **D284 — applicare non si chiede:** `npx supabase db push --linked --yes` (`--yes` obbligatorio).
  **Dopo, la FASE 6b è dovuta:** `gen types` → `npx tsc --noEmit`.
- 🛑 **`now()` è COSTANTE dentro una transazione** · **il file di migration non è la prova: la verità è
  il catalogo vivo** · **RLS: `public.current_lab_id()`**, mai `auth.`.
- **Le prove d'integrazione si saltano da sole** senza ambiente:
  `set -a && . ./.env.local; set +a && npx vitest run <file>`. **Un «skipped» è un ROSSO.** Incolla il
  numero di prove passate, non il verdetto.
- **FASE 7:** `npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — **uscita da variabile, MAI
  dietro una pipe, timeout 600000 ms.**
- ⚖️ **D318 — `git add <percorsi>`, MAI `-A`**, e **`git status` prima di salvare**: l'albero è
  condiviso. Messaggi lunghi con `-F <file>`.
- 🛑 Niente `push`, niente `main`, niente worktree, niente `rm -rf` fuori da `scripts/tmp/`.
- **R-E2:** un difetto fuori dal tuo mandato si **riferisce**, non si corregge.

## Il resoconto

In `.superpowers/sdd/avviso-dentista-task-2-report.md`, in quest'ordine: ① i difetti del piano trovati
(i tre sopra e quelli nuovi) · ② gli output reali incollati (corpo vivo, timestamp, `proacl`, prove
passate, `tsc`, `VERIFY_EXIT`) · ③ `N su M` di R-P4 · ④ ciò che resta **`non provato`**, col motivo ·
⑤ i ritrovamenti fuori mandato · ⑥ il salvataggio.

🛑 **Non dichiarare «fatto» ciò che non hai misurato.** Scrivere «non provato» è il comportamento
corretto, non un'ammissione di colpa.
