# Mandato — Task 1 del piano «L'avviso al dentista»

**Data:** 09/08/2026. **Ramo:** `intervento-post-consegna` (già attivo, albero pulito all'apertura del mandato).
**Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`.
**Spec:** `docs/superpowers/specs/2026-08-09-avviso-al-dentista-design.md`.

## Il tuo perimetro

**SOLO il Task 1** (piano, righe **79-190**). Non toccare i Task 2-10. Prima di iniziare leggi anche:
i **vincoli globali** (righe 11-27), il **registro delle letture** (31-42), il **censimento degli
identificatori** (44-58) e l'**autorevisione** (411-419).

Consegni: la migration della tabella `public.avvisi_dentista` · `src/lib/avvisi/stati.ts` (la cartella
`src/lib/avvisi/` **non esiste**: `provato:` `ls src/lib/avvisi/` → *No such file or directory*) ·
`tests/integration/avvisi-dentista-schema.rpc.test.ts` · `src/types/database.types.ts` rigenerato.

## 🛑 Il tuo compito NON è eseguire il piano: è cercare dove sbaglia

**R-E1 + R-E2.** Ogni difetto del piano si **riferisce nel resoconto**; un difetto che trovi **fuori**
dal Task 1 si riferisce e **non si corregge**. Il piano si autodenuncia su tre punti — trattali come
cose da **attaccare**, non da confermare.

### ① 🔴 IL PIANO ELENCA UNA PROVA E NESSUNO DEI SUOI SEI PASSI LA ESEGUE

Il Task 1 mette `tests/integration/avvisi-dentista-schema.rpc.test.ts` fra i file da creare, ma i
Passi 1-6 non la lanciano mai. **È un difetto del piano, e va nel resoconto.**

🔴 **E non basta lanciarla: le prove d'integrazione si SALTANO da sole** quando l'ambiente non è
caricato (`vitest.config.ts:25-38`; il comando dedicato è `npm run test:integration`,
`package.json:17`). **Un risultato «saltata» è un ROSSO, non un verde.** Quindi:

```bash
set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-dentista-schema.rpc.test.ts
```
Nel resoconto incolli **il numero di prove passate**, non il verdetto della suite. Se leggi `skipped`,
ti fermi e riferisci.

📌 Modello da aprire prima di scrivere: `tests/integration/eventi-qualita-schema.rpc.test.ts` (è una
prova di **schema**, la famiglia giusta) e `tests/integration/helpers/`. **Non presumere come si
collegano: leggi.**

### ② 🔴 `comunicato_da uuid REFERENCES auth.users(id)` È UNA PRESUNZIONE DEL PIANO

Il piano non porta alcun `provato:` su quella scelta. **Verificala sul catalogo vivo**, non sui file:
a quale tabella puntano le colonne sorelle («chi ha fatto l'azione») nelle tabelle già in casa —
`auth.users(id)` oppure `public.utenti(id)`?

Una query su `pg_constraint` / `information_schema.constraint_column_usage` chiude la domanda. Incolla
il risultato. 🔑 **Perché conta:** quella colonna torna nei Task 2, 4 e 9 e finisce in
`database.types.ts`; se è sbagliata, è la cosa più costosa del Task 1 da disfare.

### ③ 🔴 I TRE `CHECK` NON SONO MAI STATI ESEGUITI INSIEME — e il Passo 4 prova il caso SBAGLIATO

Il rischio che il piano dichiara è che i vincoli rendano impossibile uno stato **legittimo**. Il Passo 4
prova solo che un valore **sbagliato** venga rifiutato: è l'opposto. Servono **entrambe le direzioni**,
in **transazione annullata** (`BEGIN; … ROLLBACK;`):

- **rifiuto** — `stato = 'pippo'` → atteso `23514` su `avviso_stato_vocabolario` (incolla l'errore);
- **accettazione, uno per stato** (tre inserimenti che **DEVONO riuscire**):
  ① `da_comunicare` con `comunicato_at` e `comunicato_da` a `NULL`
  ② `comunicato_dall_app` con autore + data + `testo_inviato`
  ③ `comunicato_a_voce` con autore + data e **senza** testo

Se uno dei tre viene rifiutato, **hai trovato il difetto ③** — riferiscilo e proponi la correzione
minima nel resoconto **prima** di applicarla.
⚠️ Le chiavi esterne arrivano prima dei `CHECK`: usa **id veri** presi dal database, altrimenti leggi
`23503` e non provi niente.

### ④ 🟠 UN `CHECK` PROMETTE PIÙ DI QUEL CHE FA

`avviso_testo_solo_se_dall_app` è scritto `CHECK (stato <> 'comunicato_dall_app' OR testo_inviato IS
NOT NULL)`: **impone** il testo quando l'avviso parte dall'app, ma **non lo vieta** su
`comunicato_a_voce` — che è ciò che il nome promette e ciò che ⚖️ **D339** implica (si registra solo il
testo mandato). **O si rinomina, o si stringe: decidi tu e scrivi il motivo.** È una tabella a zero
righe, si disfa in un minuto — non serve chiedere a Francesco.

### ⑤ 🟠 «NESSUNA POLITICA DI `INSERT`» NON LO PROVA IL PASSO 4

`scripts/psql.mjs` si collega **come proprietario**, quindi la protezione per riga è **aggirata**: una
sonda senza `SET LOCAL ROLE` non prova nulla sui permessi (regola di casa). Quindi **una delle due**:
- provi l'affermazione della riga 148 del piano con `SET LOCAL ROLE authenticated` e incolli il rifiuto;
- oppure la marchi **`non provato`** e la lasci al Task 2. **Fail-closed: non la dichiari provata.**

### ⑥ 🟠 LA FASE 3 HA UNA CASELLA SENZA RISPOSTA

Il cancello vuole tutte e cinque; per una tabella nuova la risposta sul **come si annulla** è corta, ma
va **scritta** nel resoconto.
🛑 **E `db push` che esce 0 NON prova che i vincoli esistano:** `CREATE TABLE IF NOT EXISTS` +
`CREATE INDEX IF NOT EXISTS` riescono anche sopra uno stato applicato a metà. **La verità è il catalogo:**
rileggi i tre `CHECK`, i due indici e le due politiche da `pg_constraint` / `pg_indexes` / `pg_policies`
e incolla l'esito.

## I due numeri che NON devi ricopiare

**Sei dei sette errori di ieri erano mandati che ricopiavano un numero.** Quindi:

1. **L'orologio delle migration si legge, in un comando SEPARATO:** `date -u "+%Y%m%d%H%M%S"` (⚖️ D311,
   **universale**, non locale). Il pavimento dichiarato è `20260808195344`: **verificalo da te** con
   `ls supabase/migrations | tail -3`. Se il tuo numero è più basso, **fermati e riferisci**.
2. **La base delle prove.** Il piano dice `5725 | 84 su 458`: è **il numero del piano, non quello di
   oggi**. Misuri il tuo e confronti col tuo.

## Le regole di casa che non si negoziano

- ⚖️ **D284 — applicare la migration NON si chiede:** `npx supabase db push --linked --yes` (`--yes`
  obbligatorio: senza, il comando resta appeso a una domanda e **sembra fallito senza esserlo**).
- **Dopo la migration la FASE 6b è DOVUTA:** `npx supabase gen types typescript --project-id
  iagibumwjstnveqpjbwq > src/types/database.types.ts` → togli l'eventuale messaggio del CLI in fondo al
  file → `npx tsc --noEmit`.
- 🛑 **Ordine per gli oggetti di database:** `DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`.
- 🛑 **`now()` è COSTANTE dentro una transazione.**
- 🛑 **RLS: `public.current_lab_id()`**, mai `auth.current_lab_id()`.
- 🛑 **Ruoli: sono CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. MAI
  `admin` nudo.
- ⚖️ **D318 — `git add <percorsi>`, MAI `git add -A`**, e **prima di salvare guardi `git status`**:
  l'albero è condiviso, e questo errore è già stato pagato in tutte e due le direzioni. **Salvi solo i
  tuoi file.**
- 🛑 **Niente `rm -rf`** fuori dalle aree temporanee; i temporanei in `scripts/tmp/`.
- 🛑 **Niente worktree.** Resti su questo ramo.
- 🛑 **NON pubblicare** (`git push`) e **NON toccare `main`**.
- **TDD (FASE 6):** la prova prima. Dopo il primo rosso, **abbozzo inerte** e **conti quante asserzioni
  si accendono** (`N su M`, il numero si scrive) — R-P4.

## Il resoconto

Scrivilo in `.superpowers/sdd/avviso-dentista-task-1-report.md` e chiudi con, in quest'ordine:

1. **I difetti del piano che hai trovato** (partendo da quelli, non dal lavoro fatto), con l'esito dei
   punti ①-⑥ uno per uno.
2. **Gli output reali incollati:** il timestamp, l'errore `23514`, i **tre** inserimenti riusciti, il
   catalogo riletto, `tsc`, il numero di prove passate.
3. **Ciò che hai marcato `non provato`**, con il motivo.
4. **I ritrovamenti fuori mandato** (R-E2), in una sezione a sé.
5. Il salvataggio (hash e messaggio).

🛑 **Non dichiarare «fatto» ciò che non hai misurato.** Un blocco senza prova è **non provato**, e
scriverlo è il comportamento corretto — non un'ammissione di colpa.
