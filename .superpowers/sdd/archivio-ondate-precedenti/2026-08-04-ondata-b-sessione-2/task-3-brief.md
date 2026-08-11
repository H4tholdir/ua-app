## Task 3 — Migration B: le RPC

**Files:**
- Create: `supabase/migrations/<TS2>_ondata_b_prescrizioni_rpc.sql`
- Create: `scripts/tmp/collaudo-lp-rpc.mjs` (collaudo usa-e-getta, transazione annullata)

**Interfaces (produce):**
`lavoro_crea_atomico(p_lab uuid, p_lavoro jsonb, p_denti jsonb, p_prescrizione jsonb DEFAULT NULL) RETURNS json`
· `lavoro_prescrizione_allega_fonte(p_lab uuid, p_lavoro uuid, p_fonte_tipo text, p_fonte_immagine_id uuid, p_fonte_riferimento text) RETURNS json`
· `lavoro_prescrizione_correggi_typo(p_lab uuid, p_lavoro uuid, p_campo text, p_valore jsonb, p_atteso_updated_at timestamptz) RETURNS json`
· `lavoro_prescrizione_registra_divergenza(p_lab uuid, p_lavoro uuid, p_campo text, p_motivo text, p_nota text, p_utente uuid) RETURNS json`
· `lavoro_prescrizione_conferma_consegna(p_lab uuid, p_lavoro uuid, p_utente uuid) RETURNS json`
· `crea_rifacimento_atomico` (stessa firma, clona lo snapshot).
Esiti json: `{esito:'ok'|...}` con `'non_trovato'`, `'conflitto'`, `'congelata'`,
`'senza_prescrizione'`, `'motivo_non_valido'`, `'fonte_congelata'` — stile
`lavoro_denti_sostituisci_atomica`.

Blocchi `non eseguito` — collaudo: Step 3.3. Punti fermi già provati: S10 (DROP prima del
CREATE a firma nuova), innesto clone fra le righe 188-190 della definizione vigente (L3).

- [ ] **Step 3.1** Scrivere la migration. Scheletro vincolante (corpi completi nel file, qui i punti di legge):

```sql
-- <TS2>_ondata_b_prescrizioni_rpc.sql — Ondata B, sessione ②, parte 2/3.
-- NON aggiungere BEGIN;/COMMIT;. Tutte SECURITY DEFINER SET search_path = public, pg_temp.
-- REVOKE FROM PUBLIC, anon, authenticated + GRANT TO service_role per OGNI firma (modello 20260727120300:222-226).

-- 1) Firma nuova: DROP esplicito, MAI CREATE OR REPLACE con firma diversa
--    (provato in sonda: l'OR REPLACE crea un overload — 2 funzioni).
DROP FUNCTION public.lavoro_crea_atomico(uuid, jsonb, jsonb);
CREATE FUNCTION public.lavoro_crea_atomico(
  p_lab uuid, p_lavoro jsonb, p_denti jsonb, p_prescrizione jsonb DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  -- Corpo IDENTICO al vigente (20260727120300:136-215) con DUE aggiunte:
  -- a) nell'INSERT INTO lavori: istituzione_sanitaria = p_lavoro->>'istituzione_sanitaria'
  -- b) dopo la denormalizzazione, prima del RETURN:
  --    IF p_prescrizione IS NOT NULL THEN
  --      INSERT INTO lavori_prescrizioni (laboratorio_id, lavoro_id, contenuto, numero_prescrizione)
  --      VALUES (p_lab, v_id,
  --              COALESCE(p_prescrizione->'contenuto', '{}'::jsonb),
  --              p_prescrizione->>'numero_prescrizione');
  --    END IF;
$$;

-- 2) allega_fonte: UPSERT sulla riga del lavoro (i lavori nati prima non hanno
--    la riga: ON CONFLICT (lavoro_id) DO UPDATE). Guardie in ordine:
--    lock lavoro (FOR UPDATE, tenant) → 'non_trovato';
--    fonte_tipo valido o NULL (IN lista) → 'fonte_tipo_non_valido';
--    se DdC attiva (stato <> 'annullata') E la riga ha già fonte_tipo/immagine/riferimento
--      → 'fonte_congelata' (V8: la fonte non si cancella né si sostituisce);
--    altrimenti scrive fonte_tipo/fonte_immagine_id/fonte_riferimento.
-- 3) correggi_typo: gettone p_atteso_updated_at (modello lavoro_denti_sostituisci_atomica:61-63)
--    → 'conflitto'; DdC attiva → 'congelata' (V8); riga assente → 'senza_prescrizione';
--    p_campo IN ('elementi','colore','tipo') → altrimenti 'campo_non_valido';
--    contenuto = jsonb_set(contenuto, ARRAY[p_campo], p_valore). Il valore NULL
--    jsonb ('null') RIMUOVE la chiave (contenuto - p_campo): "non era sulla prescrizione".
-- 4) registra_divergenza: DdC attiva → 'congelata'; riga assente → 'senza_prescrizione';
--    p_motivo IN ('richiesta_dentista','esigenza_tecnica','materiale_non_disponibile','altro')
--      → altrimenti 'motivo_non_valido' (D212);
--    divergenze = divergenze || jsonb_build_object('campo',p_campo,'motivo',p_motivo,
--      'nota',p_nota,'utente_id',p_utente,'registrata_at',now());
-- 5) conferma_consegna: riga assente → 'senza_prescrizione'; DdC attiva → 'congelata';
--    scrive confermata_da=p_utente, confermata_at=now() E
--    contenuto = jsonb_set(contenuto, '{tipo}', to_jsonb(v_tipo_dispositivo))
--    (D213: il TIPO entra nello snapshot alla conferma, dalla riga viva di lavori).
-- 6) crea_rifacimento_atomico: CREATE OR REPLACE (STESSA firma) — corpo vigente
--    (20260728103000:78-215) con l'innesto FRA il clone denti e il registro:
--      INSERT INTO lavori_prescrizioni (laboratorio_id, lavoro_id, contenuto,
--        fonte_tipo, fonte_immagine_id, fonte_riferimento, numero_prescrizione)
--      SELECT laboratorio_id, v_nuovo_id, contenuto, fonte_tipo, fonte_immagine_id,
--             fonte_riferimento, numero_prescrizione
--        FROM lavori_prescrizioni
--       WHERE lavoro_id = p_lavoro_originale_id AND laboratorio_id = v_lavoro.laboratorio_id;
--    (divergenze e conferma NON si clonano: default '[]' e NULL.)
```

- [ ] **Step 3.2** Applicare: `npx supabase db push`. Expected: `Finished`.
- [ ] **Step 3.3** Scrivere ed eseguire `scripts/tmp/collaudo-lp-rpc.mjs` (pattern `sonda-lp-r-p1.mjs`: BEGIN → casi → ROLLBACK, dati veri di test). Casi MINIMI, ciascuno con l'esito atteso asserito e contato (R-P4 applicato al collaudo — le forme d'input enumerate):
  1. `lavoro_crea_atomico` a 4 argomenti con `p_prescrizione` `{contenuto:{elementi:[11],colore:"a3 chiaro"},numero_prescrizione:"RX-77"}` → riga in `lavori_prescrizioni` con contenuto FEDELE (minuscole preservate);
  2. stessa RPC a 3 argomenti (default) → lavoro creato, NESSUNA riga snapshot;
  3. `allega_fonte` su lavoro senza riga → UPSERT crea la riga; `fonte_tipo='pippo'` → `'fonte_tipo_non_valido'`; senza corpo → errore CHECK 23514 (fonte_ck);
  4. `correggi_typo` con gettone stantio → `'conflitto'`; con valore `'null'` → chiave rimossa;
  5. `registra_divergenza` con motivo `'pippo'` → `'motivo_non_valido'`; valido → array cresce di 1 con `utente_id` e `registrata_at`;
  6. simulare DdC attiva (INSERT DdC minima in transazione) → `correggi_typo`/`registra_divergenza`/`conferma_consegna` → `'congelata'`; `allega_fonte` su riga con fonte → `'fonte_congelata'`;
  7. `conferma_consegna` valida → `confermata_da/at` scritti E `contenuto->>'tipo'` = tipo del lavoro;
  8. `crea_rifacimento_atomico` su lavoro con snapshot+fonte+divergenze → il nuovo lavoro ha snapshot e fonte clonati, `divergenze='[]'`, conferma NULL;
  9. `SELECT count(*) FROM pg_proc WHERE proname='lavoro_crea_atomico'` → **1**.
  Expected: tutti ✅, e il conteggio dei casi verdi stampato (`N su N`).
- [ ] **Step 3.4** Commit: `git commit -m "feat(db): RPC prescrizione (crea/fonte/typo/divergenza/conferma V5) + clone nel rifacimento (ondata B ②)"`.

