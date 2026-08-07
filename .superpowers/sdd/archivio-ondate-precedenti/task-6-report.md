# Task 6 — Referto: la copia dormiente nel database (D104)

## Stato: COMPLETATO

## Contesto verificato prima di scrivere

Confronto byte-per-byte (Python, non a occhio) fra tre stringhe:

1. `src/lib/pdf/generate-ddc.ts:132` — `testoConformita` (generatore, già corretto dal Task 3):
   `"Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di
   sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE)
   2017/745."` (190 caratteri)
2. Testo SQL proposto dal brief (`.superpowers/sdd/task-6-brief.md`), una volta ri-espanso
   dall'escaping SQL (`''` → `'`): **identico**, 190 caratteri, `EQUAL: True`.
3. Vecchio default in `supabase/migrations/002_fase2_schema.sql:188-189`: `"...dispositivo e'
   conforme..."` — diverso, come atteso (è il difetto che il task chiude).

Il testo SQL del brief **combacia** col generatore: nessuno scostamento da segnalare su questo
punto.

## Step 1 — Migration scritta

File creato: `supabase/migrations/20260803120000_default_testo_conformita_accentato.sql`
(copiato dal brief, poi riverificato byte-per-byte contro il generatore dopo la scrittura — vedi
sotto). Non ho toccato `002_fase2_schema.sql`. Non ho usato `DROP DEFAULT`.

## Step 2 — Applicazione sul progetto reale

```
$ npx supabase db push --yes
Applying migration 20260803120000_default_testo_conformita_accentato.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260803120000_default_testo_conformita_accentato.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

Applicata con successo sul progetto `iagibumwjstnveqpjbwq`.

## Step 3 — Prova del comportamento (R-P1), non solo della sintassi

Script usa-e-getta creato: `scripts/tmp/verifica-default-testo-conformita.ts` (usa `pg` +
`SUPABASE_DB_URL` da `.env.local`, letto direttamente dal catalogo — non tramite supabase-js, che
non espone SQL arbitrario).

```
$ npx tsx scripts/tmp/verifica-default-testo-conformita.ts
=== column_default (raw dal catalogo) ===
'Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all''Allegato I e ai disposti dell''Allegato XIII del Reg. (UE) 2017/745.'::text

contiene "dispositivo è conforme": true
contiene "dispositivo e'' conforme" (vecchia forma): false
```

Query eseguita (esattamente quella del brief):

```sql
SELECT column_default FROM information_schema.columns
 WHERE table_name = 'dichiarazioni_conformita' AND column_name = 'testo_conformita_snapshot';
```

**Esito atteso confermato:** contiene `dispositivo è conforme`, non contiene la forma con
l'apostrofo.

### Confronto carattere per carattere col generatore (il passaggio che conta)

Ho ri-espanso l'output grezzo del catalogo (`'...'::text`, con `''` → `'`) e l'ho confrontato in
Python con la stringa `testoConformita` letta live da `src/lib/pdf/generate-ddc.ts`:

```
DB DEFAULT : "Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745."
GENERATOR  : "Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all'Allegato I e ai disposti dell'Allegato XIII del Reg. (UE) 2017/745."
EQUAL      : True
len db=190 len gen=190
```

**Esito: identiche, carattere per carattere.** Le due verità canoniche sono tornate a essere una
sola.

Nota: questo cambia il default per gli **INSERT futuri**. Righe già esistenti che avevano preso
il vecchio default restano com'erano — vedi «Ritrovamenti fuori mandato» più sotto (4 righe).

## Step 4 — FASE 6b: tipi e compilatore

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
(nessun output su stderr, exit 0)

$ diff <copia-prima-della-rigenerazione> src/types/database.types.ts
(nessuna differenza, diff exit 0)

$ npx tsc --noEmit
(nessun output, exit 0)
```

Il file dei tipi **non è cambiato**, come atteso: il DEFAULT non compare nei tipi generati.
`tsc --noEmit`: **0 errori**.

## Step 5 — Commit

```
$ git add supabase/migrations/20260803120000_default_testo_conformita_accentato.sql
$ git commit -F <messaggio fuori dal repo>
[accenti-documenti a94fa335] fix(db): il DEFAULT della frase di conformità porta l'accento (D104)
 1 file changed, 21 insertions(+)
 create mode 100644 supabase/migrations/20260803120000_default_testo_conformita_accentato.sql
```

`src/types/database.types.ts` **non è stato aggiunto** al commit perché non aveva diff (coerente
con l'atteso dello Step 4). `git status --short` dopo il commit: pulito.

Hash: `a94fa335a99f63f0669ffd176f2f3eb6c56aa247`

## Ritrovamenti fuori mandato (R-E2 — solo segnalati, non corretti)

Il testo SQL del brief combaciava col generatore (verificato, vedi sopra). Due cose ho trovato
**dopo** aver committato, verificando più a fondo su spinta di una review — le segnalo, non le ho
toccate:

1. **Citazione di riga sbagliata, copiata nel commento della migration già committata.** Il brief
   (e quindi il file che ho creato) scrive: «il generatore valorizza sempre entrambe le colonne
   (`generate-ddc.ts:147-148`)». Ho verificato il codice reale:
   ```
   $ grep -n "testo_conformita" src/lib/pdf/generate-ddc.ts
   132:  const testoConformita = "Il fabbricante dichiara..."
   160:    testo_conformita: testoConformita,
   161:    testo_conformita_snapshot: testoConformita,
   ```
   Le due colonne sono valorizzate alle righe **160-161**, non 147-148 (147-148 sono
   `prescrittore_nome`/`prescrizione_id`, tutt'altro campo). Il **contenuto** della citazione era
   giusto — le due colonne sono davvero valorizzate sempre — solo il numero di riga è sbagliato.
   È già dentro il commit `a94fa335` (commento, non codice eseguibile: nessun effetto
   funzionale). Non l'ho corretto silenziosamente in questo task, per R-E2 — segnalo e basta.
   L'altra citazione del brief, `002_fase2_schema.sql:188-189`, è invece corretta: il vecchio
   default parte a riga 188.

2. **Il testo vecchio sopravvive in 4 righe già esistenti in banca dati.** La motivazione del
   brief («`supabase/seed.sql` inserisce righe senza lo snapshot, e quelle lo prendono») è
   **verificata vera**: l'`INSERT INTO dichiarazioni_conformita` in `supabase/seed.sql:171-206`
   elenca `testo_conformita` ma non `testo_conformita_snapshot` fra le colonne, quindi quella riga
   di seed prende il DEFAULT. Ma la migration cambia il DEFAULT **solo per gli INSERT futuri**:
   query di verifica sul database reale (stesso script del punto sopra) trova
   ```sql
   SELECT count(*)::int AS n FROM dichiarazioni_conformita
    WHERE testo_conformita_snapshot LIKE '%dispositivo e'' conforme%'
   ```
   → **4 righe** già in archivio con lo snapshot ancora nella forma vecchia. Nessun backfill era
   nel mandato di questo task (il brief parla solo del DEFAULT), e per `CLAUDE.md` §8 i dati in
   questo progetto Supabase sono di test — quindi non propongo un'azione, segnalo solo che quelle
   4 righe esistono e non sono state toccate da questa migration.

## File toccati

- `supabase/migrations/20260803120000_default_testo_conformita_accentato.sql` (nuovo, committato)
- `scripts/tmp/verifica-default-testo-conformita.ts` (usa-e-getta, gitignored — non committato)
- `src/types/database.types.ts` (rigenerato, nessun diff, non committato)
