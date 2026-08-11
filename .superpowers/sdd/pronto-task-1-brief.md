## Task 1 — La colonna della scelta

**File:**
- Crea: `supabase/migrations/<timestamp>_evento_scelta_intervento.sql`
- Modifica (FASE 6b): `src/types/database.types.ts` (generato)

**Interfacce:**
- Produce: la colonna `eventi_qualita.scelta_intervento TEXT NULL`, valori `'si_sistema'|'si_rifa'`.

- [ ] **Passo 1 — leggi il timestamp vero**

```bash
date -u "+%Y%m%d%H%M%S"
```
Il nome del file usa **quell'output**, mai un numero inventato.

- [ ] **Passo 2 — scrivi la migration**

```sql
-- Ondata «si deve sempre poter intervenire» — il bivio dei due difetti (D304 · D305).
-- Spec: docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md §4.1
--
-- 🛑 PERCHÉ UNA SOLA IMPLICAZIONE E NON IL BICONDIZIONALE («presente ⇔ motivo ∈ {due}»):
-- provato: in banca dati esistono GIÀ 2 righe con motivo='difetto_lavorazione' e
-- nessuna scelta. Il biconditionale farebbe abortire questa migration (23514), e
-- NOT VALID non salva: lascerebbe quelle righe non più aggiornabili al primo UPDATE.
-- L'altra metà della regola vive nel 422 della rotta, dove sta la regola viva:
-- metterla qui creerebbe la seconda fonte di verità accanto a src/lib/qualita/effetti.ts
-- (riga 22 della coda: «le liste scritte due volte»).
ALTER TABLE public.eventi_qualita
  ADD COLUMN IF NOT EXISTS scelta_intervento TEXT;

ALTER TABLE public.eventi_qualita
  DROP CONSTRAINT IF EXISTS evento_scelta_vocabolario;
ALTER TABLE public.eventi_qualita
  ADD CONSTRAINT evento_scelta_vocabolario
  CHECK (scelta_intervento IS NULL OR scelta_intervento IN ('si_sistema','si_rifa'));

ALTER TABLE public.eventi_qualita
  DROP CONSTRAINT IF EXISTS evento_scelta_solo_sui_difetti;
ALTER TABLE public.eventi_qualita
  ADD CONSTRAINT evento_scelta_solo_sui_difetti
  CHECK (scelta_intervento IS NULL
         OR motivo IN ('difetto_lavorazione','difetto_materiale'));

COMMENT ON COLUMN public.eventi_qualita.scelta_intervento IS
  'Il bivio dei due difetti (D290 · D297 · D304): si_sistema → il lavoro torna a '
  'pronto e la dichiarazione resta valida; si_rifa → il lavoro resta consegnato e '
  'nasce un rifacimento. NULL sugli altri sette motivi.';
```

- [ ] **Passo 3 — applica e verifica che il vincolo MORDA**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```
Poi scrivi `/tmp/prova-t1.sql` e lancialo con `scripts/psql.mjs`:

```sql
BEGIN;
-- ① valore fuori vocabolario: DEVE essere rifiutato
SAVEPOINT s1;
UPDATE eventi_qualita SET scelta_intervento = 'pippo'
 WHERE motivo = 'difetto_lavorazione';
ROLLBACK TO s1;
-- ② scelta su un motivo che non la ammette: DEVE essere rifiutata
SAVEPOINT s2;
UPDATE eventi_qualita SET scelta_intervento = 'si_sistema'
 WHERE motivo = 'errore_registrazione';
ROLLBACK TO s2;
-- ③ scelta legittima: DEVE passare
UPDATE eventi_qualita SET scelta_intervento = 'si_sistema'
 WHERE motivo = 'difetto_lavorazione';
SELECT count(*) AS aggiornate FROM eventi_qualita WHERE scelta_intervento = 'si_sistema';
ROLLBACK;
```
**Atteso:** ① e ② falliscono con `23514` (incolla il messaggio nel resoconto), ③ aggiorna **2** righe.
🛑 Un `CREATE`/`ALTER` riuscito prova la sintassi, **non** il comportamento: la prova è il valore rifiutato.

- [ ] **Passo 4 — FASE 6b**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
```
**Atteso:** `uscita=0`. Se il generatore lascia un messaggio in fondo al file, **toglilo**.

- [ ] **Passo 5 — salva**

```bash
git add supabase/migrations src/types/database.types.ts && git commit -m "feat(qualita): eventi_qualita.scelta_intervento — il bivio dei due difetti (D304)"
```

---

