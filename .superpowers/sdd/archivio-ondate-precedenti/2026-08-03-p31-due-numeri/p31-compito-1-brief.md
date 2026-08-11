# Compito 1 — La colonna

> **Questo è il tuo mandato completo.** I valori esatti (nomi, righe, codice) si usano **alla lettera**: sono stati verificati sul codice vero.

## Vincoli globali del progetto (valgono per ogni passo)

- **Ruoli: CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. Mai `admin` nudo.
- **RLS:** `public.current_lab_id()`, **mai** `auth.current_lab_id()`.
- **Motion:** solo da token (`src/design-system/v3/motion.ts` per v3). Mai `duration` in linea.
- **Componenti:** superficie v3 → solo da `src/components/ds/`. **Mai** mischiare v3 e v2.3 nella stessa pagina.
- **Testo:** DS v3 §2.3 — niente gergo. «cellulare», «fisso», mai «numero di telefono mobile».
- **PATCH:** sempre **allowlist esplicita**, mai blocklist.
- **Commit:** `feat(ambito): …` / `fix(ambito): …`. Mai `--no-verify` senza motivo scritto nel messaggio.
- **Dopo ogni migration:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → `npx tsc --noEmit` (**FASE 6b**).
- **FASE 7 a fine ondata:** `npx tsc --noEmit` · `npx vitest run` · `npx next build`. Tutti e tre.

---


**File:**
- Crea: `supabase/migrations/<timestamp>_p31_cellulare_whatsapp.sql`
- Rigenera: `src/types/database.types.ts`
- Modifica: `supabase/schema.sql` (il commento della riga 372 dice il falso)

**Interfacce:**
- Produce: la colonna `clienti.cellulare_whatsapp` di tipo `TEXT` (annullabile), e il tipo generato
  `Database['public']['Tables']['clienti']['Row']['cellulare_whatsapp']: string | null`.

- [ ] **Passo 1 — Prendi il timestamp dall'orologio, non dall'ultimo file**

```bash
date -u "+%Y%m%dT%H%M%S"
```

🛑 **D155/§0F: la data si legge dall'orologio.** L'ultima migration si chiama `20260804120000_*` per la
vecchia deriva di date: **copiarne il numero manderebbe la migration nel futuro**.

- [ ] **Passo 2 — Scrivi la migration**

```sql
-- ============================================================
-- P31 — Il telefono dello studio e il cellulare WhatsApp sono
-- due dati diversi con lo stesso nome (D181, 03/08/2026).
--
-- `telefono` RESTA il numero dello studio: e' quello che si
-- chiama, quello che va sui documenti, e puo' essere un fisso.
-- provato: l'unico numero in banca dati e' un fisso (0976...),
--          quindi quella colonna si comporta gia' cosi'.
-- Nasce `cellulare_whatsapp`: dove arrivano consegna e solleciti.
--
-- Nessun backfill: cellulare_whatsapp nasce NULL per tutti, ed
-- e' corretto — nessuno l'ha mai inserito.
--
-- Nessun CHECK sul formato: un vincolo renderebbe NON SALVABILE
-- un numero scritto male, contro la direttiva permanente del
-- 27/07 («ogni campo si corregge, fino alla consegna»). La forma
-- si sistema quando si costruisce il link, non quando si salva.
-- ============================================================

ALTER TABLE public.clienti ADD COLUMN cellulare_whatsapp TEXT;

COMMENT ON COLUMN public.clienti.telefono IS
  'Telefono dello studio: si chiama, va sui documenti. Puo'' essere un fisso. NON e'' il numero WhatsApp — v. cellulare_whatsapp (P31, D181).';

COMMENT ON COLUMN public.clienti.cellulare_whatsapp IS
  'Cellulare su cui il dentista riceve i messaggi (consegna, solleciti). Il prefisso internazionale lo aggiunge il codice, non l''utente (P31, D182).';
```

`non eseguito` — verifica al passo 3.

- [ ] **Passo 3 — Applica e verifica che la colonna ci sia DAVVERO**

```bash
npx supabase migration up
```

Poi, **una sonda che non si accontenta del «riuscito»**:

```bash
npx tsx -e "
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
db.from('clienti').select('id, telefono, cellulare_whatsapp').limit(1)
  .then(({ data, error }) => { if (error) { console.error('ROSSO:', error.message); process.exit(1) } ; console.log('VERDE — la colonna risponde:', Object.keys(data![0])) })
"
```

Atteso: `VERDE — la colonna risponde: [ 'id', 'telefono', 'cellulare_whatsapp' ]`
🔑 **Una migration che gira non prova che la colonna sia interrogabile.** Questa lo prova.

- [ ] **Passo 4 — FASE 6b: rigenera i tipi**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```

⚠️ Rimuovi l'eventuale messaggio della CLI in fondo al file (`../CLAUDE.md` §9).

- [ ] **Passo 5 — Verifica i tipi**

```bash
npx tsc --noEmit
```

Atteso: **0 errori**. Se ne compaiono, sono punti che leggono `clienti` con un tipo esatto: **si
riferiscono, non si correggono qui** (R-E2) — a meno che siano nel perimetro dei compiti 3-8.

- [ ] **Passo 6 — Allinea `supabase/schema.sql`**

Riga 372: il commento dice `-- Usato per WhatsApp`, **che da adesso è falso**.

```sql
  telefono          TEXT,               -- Telefono dello STUDIO: si chiama, va sui documenti. Puo' essere un fisso. NON e' WhatsApp (P31, D181)
  cellulare_whatsapp TEXT,              -- Cellulare per consegna e solleciti. Il prefisso lo mette il codice (P31, D182)
  email             TEXT,
```

- [ ] **Passo 7 — Salva**

```bash
git add supabase/migrations supabase/schema.sql src/types/database.types.ts
git commit -m "feat(db): P31 — nasce clienti.cellulare_whatsapp, e telefono torna a dire la verita'"
```

---
