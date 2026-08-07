## Task 1 — Le due tabelle, e la sola-aggiunta imposta dal database

**File**
- Crea: `supabase/migrations/<timestamp>_eventi_qualita.sql`
- Modifica: `src/types/database.types.ts` (rigenerato, mai a mano)

**Interfacce prodotte:** tabelle `public.eventi_qualita` e `public.valutazioni_evento`; colonne
`lavori_rifacimenti.evento_id` (nullable) e `laboratori.certificazione_iso13485`.

- [ ] **Passo 1 — apri i file del tuo mandato prima di scrivere (R-P2)**

Leggi `supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql` (il modello dell'indice
unico parziale) e `supabase/migrations/20260804154232_ondata_b_ddc_chiusura_update.sql` (il modello
della revoca di UPDATE). **Non copiare a memoria: apri.**

- [ ] **Passo 2 — scrivi la migration**

```sql
-- eventi_qualita — il FATTO. Non cambia lo stato del lavoro (D266).
CREATE TABLE IF NOT EXISTS public.eventi_qualita (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id       UUID NOT NULL REFERENCES public.laboratori(id) ON DELETE CASCADE,
  lavoro_id            UUID NOT NULL REFERENCES public.lavori(id),
  motivo               TEXT NOT NULL CHECK (motivo IN (
                         'errore_dato_dichiarazione','difetto_lavorazione','difetto_materiale',
                         'destinatario_errato','modifica_clinica_richiesta','errore_prezzo_quantita',
                         'reso_senza_difetto','errore_registrazione','altro')),
  motivo_libero        TEXT,
  natura               TEXT NOT NULL CHECK (natura IN (
                         'dato_documentale','difetto_fisico','identificazione_destinatario',
                         'nuova_esigenza_clinica','nessun_difetto','commerciale','errore_registrazione')),
  origine_informazione TEXT NOT NULL CHECK (origine_informazione IN (
                         'laboratorio_interno','odontoiatra','paziente_tramite_medico',
                         'autorita_competente','altro_operatore')),
  conosciuto_il        TIMESTAMPTZ NOT NULL,
  stato_dispositivo    TEXT NOT NULL CHECK (stato_dispositivo IN (
                         'mai_uscito_dal_lab','consegnato_non_applicato','applicato','non_noto')),
  potenziale_di_danno  TEXT NOT NULL DEFAULT 'da_valutare' CHECK (potenziale_di_danno IN (
                         'nessuno','da_valutare','possibile','accertato')),
  note                 TEXT,
  created_by           UUID REFERENCES public.utenti(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- «altro» senza testo è un buco che si scopre in audit, non al banco
  CONSTRAINT evento_altro_ha_testo CHECK (motivo <> 'altro' OR (motivo_libero IS NOT NULL AND length(btrim(motivo_libero)) > 0))
);

-- valutazioni_evento — il GIUDIZIO. Append-only: l'ultima supera le precedenti (D270).
CREATE TABLE IF NOT EXISTS public.valutazioni_evento (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id          UUID NOT NULL REFERENCES public.laboratori(id) ON DELETE CASCADE,
  evento_id               UUID NOT NULL REFERENCES public.eventi_qualita(id),
  esito                   TEXT NOT NULL CHECK (esito IN (
                            'nessuna_azione','non_conformita_interna','reclamo',
                            'incidente','incidente_grave')),
  giustificazione         TEXT,
  sostituisce_id          UUID REFERENCES public.valutazioni_evento(id),
  motivo_riclassificazione TEXT,
  superata                BOOLEAN NOT NULL DEFAULT false,
  classificato_da         UUID REFERENCES public.utenti(id) ON DELETE SET NULL,
  classificato_il         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- «nessuna azione» senza il perché è esattamente ciò che §8.2.2 vieta
  CONSTRAINT valutazione_nessuna_azione_giustificata
    CHECK (esito <> 'nessuna_azione' OR (giustificazione IS NOT NULL AND length(btrim(giustificazione)) > 0)),
  -- riclassificare senza dire perché è il movimento che un ispettore guarda per primo
  CONSTRAINT valutazione_riclassifica_motivata
    CHECK (sostituisce_id IS NULL OR (motivo_riclassificazione IS NOT NULL AND length(btrim(motivo_riclassificazione)) > 0)),
  CONSTRAINT valutazione_no_self_ref CHECK (id <> sostituisce_id)
);

-- Una sola valutazione VIVA per evento — stessa forma di ddc_lavoro_attiva_unique (provato A2)
CREATE UNIQUE INDEX IF NOT EXISTS valutazione_viva_unique
  ON public.valutazioni_evento (laboratorio_id, evento_id) WHERE (superata = false);

CREATE INDEX IF NOT EXISTS eventi_qualita_lavoro_idx ON public.eventi_qualita (laboratorio_id, lavoro_id);

-- Il giunto: il rifacimento diventa un ESITO, nullable (D266)
ALTER TABLE public.lavori_rifacimenti
  ADD COLUMN IF NOT EXISTS evento_id UUID REFERENCES public.eventi_qualita(id);

-- D271 — tre stati, e il default si comporta come «certificato» (spec §17.1)
ALTER TABLE public.laboratori
  ADD COLUMN IF NOT EXISTS certificazione_iso13485 TEXT NOT NULL DEFAULT 'non_dichiarato'
  CHECK (certificazione_iso13485 IN ('certificato','non_certificato','non_dichiarato'));

ALTER TABLE public.eventi_qualita     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valutazioni_evento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventi_qualita_lab" ON public.eventi_qualita
  FOR ALL USING (laboratorio_id = public.current_lab_id())
  WITH CHECK (laboratorio_id = public.current_lab_id());

-- 🛑 SOLA LETTURA + SOLA AGGIUNTA: nessun UPDATE, nessun DELETE. La garanzia la dà il DATABASE.
CREATE POLICY "valutazioni_evento_lab_select" ON public.valutazioni_evento
  FOR SELECT USING (laboratorio_id = public.current_lab_id());
CREATE POLICY "valutazioni_evento_lab_insert" ON public.valutazioni_evento
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

REVOKE UPDATE, DELETE ON public.valutazioni_evento FROM anon, authenticated;

COMMENT ON TABLE public.valutazioni_evento IS
  'Append-only (D270). Una classificazione sbagliata si supera con una riga nuova che punta alla '
  'precedente e ne dichiara il motivo; la vecchia si marca superata=true. MAI un UPDATE del giudizio: '
  'ISO 13485 §4.2.5 richiede che le modifiche a una registrazione restino identificabili.';
```

- [ ] **Passo 3 — applica e prova che i vincoli RIFIUTANO (R-P1)**

Le prove di rifiuto girano **in transazione annullata**, mai su una migration registrata:

```bash
node --input-type=module -e "
import {readFileSync} from 'node:fs'; import pg from 'pg';
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(r=>r.includes('=')&&!r.trim().startsWith('#')).map(r=>[r.slice(0,r.indexOf('=')).trim(),r.slice(r.indexOf('=')+1).trim().replace(/^[\"']|[\"']\$/g,'')]));
const c=new pg.Client({connectionString:env.SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}}); await c.connect();
const lab=(await c.query('SELECT id FROM laboratori LIMIT 1')).rows[0].id;
const lav=(await c.query('SELECT id FROM lavori WHERE laboratorio_id=\$1 LIMIT 1',[lab])).rows[0].id;
for (const [nome,sql,par] of [
 ['motivo fuori vocabolario', \"INSERT INTO eventi_qualita (laboratorio_id,lavoro_id,motivo,natura,origine_informazione,conosciuto_il,stato_dispositivo) VALUES (\$1,\$2,'pippo','difetto_fisico','odontoiatra',now(),'applicato')\",[lab,lav]],
 ['altro senza testo',        \"INSERT INTO eventi_qualita (laboratorio_id,lavoro_id,motivo,natura,origine_informazione,conosciuto_il,stato_dispositivo) VALUES (\$1,\$2,'altro','difetto_fisico','odontoiatra',now(),'applicato')\",[lab,lav]],
]) { await c.query('BEGIN'); try { await c.query(sql,par); console.log('❌ ATTESO RIFIUTO, ACCETTATO:',nome);} catch(e){ console.log('✅ rifiutato',nome,'→',e.message.split('\n')[0]); } await c.query('ROLLBACK'); }
await c.end();"
```

**Atteso:** due righe `✅ rifiutato`. **Se una sola riga dice `❌`, il task NON è finito.**

- [ ] **Passo 4 — FASE 6b, obbligatoria**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Atteso: `tsc` **0 errori**, e `eventi_qualita` presente in `database.types.ts`.

- [ ] **Passo 5 — salva**

```bash
git add supabase/migrations src/types/database.types.ts
git commit -m "feat(qualita): eventi_qualita e valutazioni_evento, con la sola-aggiunta imposta dal database"
```

---

