## Task 4 — Le due RPC di ripristino, col corpo condiviso

**File:** Crea `supabase/migrations/<timestamp>_riporta_a_pronto_atomica.sql`

**Interfacce:**
- Consuma: nulla dai task precedenti.
- Produce: `public.riporta_a_pronto_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid) RETURNS json`
  → `{"esito":"ok","ddc_viva":true|false}` · oppure `{"esito":"non_trovato"|"non_consegnato"|"evento_non_valido"}`.

- [ ] **Passo 1 — rileggi il corpo VIVO, non il file**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && set -a && . ./.env.local; set +a; node scripts/psql.mjs /tmp/leggi-corpo.sql
```
con dentro:
```sql
SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='riapri_lavoro_atomica';
```
🛑 **Il file `20260806210400` è SUPERATO** (`provato:` P10): il corpo vivo scrive anche
`annullata_da_evento_id`. Chi copia dal file riscrive una funzione vecchia.

- [ ] **Passo 2 — la migration**

```sql
-- Ondata «si deve sempre poter intervenire» — §3 della spec (R9, riga 23 della coda).
--
-- 🔑 PERCHÉ DUE FUNZIONI PUBBLICHE E NON UN PARAMETRO. Un booleano
-- (p_annulla_ddc) che decide se un documento a valore legale viene annullato è la
-- «coppia incoerente (motivo, azione) che arriva a un atto distruttivo», comparsa
-- TRE volte in un giorno solo il 07/08. Qui l'atto distruttivo resta nel NOME
-- della funzione: chi legge la chiamata sa che cosa sta per succedere.
--
-- 🔑 PERCHÉ IL CORPO CONDIVISO SI ESTRAE. 20260807143623:205-257 ha già dovuto
-- RICOPIARE per intero il corpo di riapri_lavoro_atomica per cambiare UNA
-- assegnazione. Con una terza copia, ogni futuro campo da azzerare andrebbe
-- applicato in tre posti — e il giorno in cui uno dei tre resta indietro nessuno
-- se ne accorge.
--
-- ⚠️ IL RIPRISTINO È IDENTICO PER LE DUE, data_consegna_effettiva COMPRESA: la
-- memoria della prima immissione non sta più lì, sta in lavori.prima_immissione_at
-- (Task 2), che nessuna riapertura tocca.

CREATE OR REPLACE FUNCTION public.ripristina_lavoro_a_pronto(
  p_lavoro_id uuid, p_laboratorio_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE v_rows int;
BEGIN
  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL,
    -- la proposta di fatturazione pre-riapertura non deve rinascere alla
    -- riconsegna: è fatta per una consegna che questa riapertura ha invalidato
    proposta_dentista = NULL, proposta_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'ripristino lavoro fallito'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ripristina_lavoro_a_pronto(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ripristina_lavoro_a_pronto(uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.ripristina_lavoro_a_pronto(uuid,uuid) IS
  'SOLO USO INTERNO alle RPC di riapertura: riporta il lavoro a pronto e azzera i '
  'campi della consegna. NON tocca dichiarazioni_conformita — quella scelta la fa '
  'la funzione pubblica che la chiama, ed è nel suo nome.';

-- ── LA FUNZIONE NUOVA ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.riporta_a_pronto_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_lavoro RECORD;
  v_ddc_vive int;
BEGIN
  SELECT id, stato INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;

  -- La riapertura non è mai senza motivo (D263): l'evento deve esistere ed essere
  -- di QUESTO lavoro e di QUESTO laboratorio.
  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  -- 🛑 LA DIFFERENZA CON LA GEMELLA, ED È TUTTA QUI: dichiarazioni_conformita NON
  -- si tocca. D293 — annullare il documento di una consegna realmente avvenuta
  -- cancella l'unica prova che quel manufatto è esistito ed è andato a un paziente.
  PERFORM public.ripristina_lavoro_a_pronto(p_lavoro_id, p_laboratorio_id);

  -- 🔑 «Resta valida» è una PROMESSA, e va verificata invece di essere affermata:
  -- se non c'è nessuna dichiarazione viva (già annullata prima, o mai emessa) la
  -- frase è falsa, e chi legge deve saperlo — alla riconsegna ne verrà generata
  -- una nuova, bruciando un progressivo (generate-ddc.ts:383-392).
  SELECT count(*) INTO v_ddc_vive FROM dichiarazioni_conformita
   WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
     AND stato <> 'annullata';

  RETURN json_build_object('esito', 'ok', 'ddc_viva', v_ddc_vive > 0);
END;
$$;

REVOKE ALL ON FUNCTION public.riporta_a_pronto_atomica(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.riporta_a_pronto_atomica(uuid,uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.riporta_a_pronto_atomica(uuid,uuid,uuid) IS
  'Riporta un lavoro consegnato fra i pronti LASCIANDO VIVA la dichiarazione '
  '(D291 · D290 · D297 · D298): il manufatto è uscito davvero e il documento diceva '
  'il vero. È la gemella NON distruttiva di riapri_lavoro_atomica, che invece '
  'annulla — e la scelta fra le due si legge dal nome, mai da un parametro. '
  'Restituisce ddc_viva:false quando la promessa «resta valida» non ha oggetto.';

-- ── LA GEMELLA usa lo stesso corpo condiviso ───────────────────────────────
-- 🛑 IL CORPO QUI SOTTO È RIBATTUTO DAL CATALOGO VIVO (pg_get_functiondef), non
-- dal file 20260806210400, che è SUPERATO: l'UPDATE sulla dichiarazione scrive
-- anche annullata_da_evento_id dal 07/08 (20260807143623).
CREATE OR REPLACE FUNCTION public.riapri_lavoro_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_lavoro RECORD;
  v_rows int;
  v_ddc_tot int;
  v_ddc_assente boolean := false;
BEGIN
  SELECT id, stato INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;

  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  PERFORM public.ripristina_lavoro_a_pronto(p_lavoro_id, p_laboratorio_id);

  UPDATE dichiarazioni_conformita
     SET stato = 'annullata', annullata_da_evento_id = p_evento_id
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato <> 'annullata';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
    WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
    IF v_ddc_tot = 0 THEN
      v_ddc_assente := true;
    ELSE
      RAISE EXCEPTION 'riapertura: dichiarazione in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito', 'ok', 'ddc_assente', v_ddc_assente);
END;
$$;
```

- [ ] **Passo 3 — applica e prova sul banco, in transazione annullata**

`/tmp/prova-t4.sql` — su un lavoro `consegnato` con dichiarazione viva:
① `riporta_a_pronto_atomica` → `esito=ok`, `ddc_viva=true`, e **la dichiarazione è ancora
`stato <> 'annullata'`** (è la prova che distingue le due funzioni: se è annullata, il task è
fallito) · ② la stessa chiamata **ripetuta** → `non_consegnato` · ③ con un `p_evento_id` di un altro
lavoro → `evento_non_valido` · ④ `riapri_lavoro_atomica` sullo stesso lavoro → la dichiarazione
**diventa** `annullata` **e** porta `annullata_da_evento_id`. Chiudi con `ROLLBACK`.

- [ ] **Passo 4 — le ACL, verificate e non assunte**

```sql
SELECT proname, array_to_string(proacl,' | ') FROM pg_proc
 WHERE proname IN ('riporta_a_pronto_atomica','ripristina_lavoro_a_pronto');
```
**Atteso:** solo `postgres` e `service_role`. **Nessun `anon`, nessun `authenticated`.**

- [ ] **Passo 5 — salva**

```bash
git add -A && git commit -m "feat(qualita): riporta_a_pronto_atomica — torna a pronto col documento intatto (R9 · D293)"
```

---

