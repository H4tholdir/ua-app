## Task 3 — `riapri_lavoro_atomica`: la RPC nuova, senza i cancelli fiscali

🛑 **Il motivo per cui è nuova e non un allargamento** è provato in A5: `annulla_consegna_atomica`
porta `fattura_gia_emessa` **due volte** e `incluso_in_fattura`. Riusarla farebbe **rifiutare la
correzione di un dato su un lavoro fatturato**, cioè il contrario di D265.

**File**
- Crea: `supabase/migrations/<timestamp>_riapri_lavoro_atomica.sql`
- Leggi per primo (R-P2): `scripts/tmp/vivo-annulla_consegna_atomica.sql` — **il corpo vivo**, righe
  40-67, per portare via il ripristino e **il fail-closed sulla dichiarazione**, e lasciare i cancelli

- [ ] **Passo 1 — scrivi la RPC**

Conserva: ripristino a `pronto`, azzeramento di `conformato`/`data_conformazione`, annullamento della
dichiarazione, **e il fail-closed** (se restano dichiarazioni in stato incoerente → eccezione).
Lascia fuori: `p_finestra_ms`, `fattura_gia_emessa`, `incluso_in_fattura`.

```sql
CREATE OR REPLACE FUNCTION public.riapri_lavoro_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE v_lavoro RECORD; v_rows int; v_ddc_tot int; v_ddc_assente boolean := false;
BEGIN
  SELECT * INTO v_lavoro FROM lavori
   WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito','non_consegnato'); END IF;

  -- L'evento deve esistere e appartenere a questo lavoro: la riapertura non è mai senza motivo (D263)
  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito','evento_non_valido'); END IF;

  -- 🛑 NESSUN cancello fiscale qui: il documento sanitario si corregge sempre (D265).
  --    Il cancello commerciale vive a monte, dove si sceglie l'esito.
  UPDATE lavori SET stato='pronto', conformato=false, data_conformazione=NULL,
                    data_consegna_effettiva=NULL, consegna_completata_at=NULL
   WHERE id=p_lavoro_id AND laboratorio_id=p_laboratorio_id AND stato='consegnato';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'riapertura: ripristino lavoro fallito'; END IF;

  UPDATE dichiarazioni_conformita SET stato='annullata'
   WHERE lavoro_id=p_lavoro_id AND laboratorio_id=p_laboratorio_id
     AND stato IN ('bozza','generata','firmata','consegnata');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
     WHERE lavoro_id=p_lavoro_id AND laboratorio_id=p_laboratorio_id;
    IF v_ddc_tot = 0 THEN v_ddc_assente := true;   -- dato legacy: consenti, segnala
    ELSE RAISE EXCEPTION 'riapertura: dichiarazione in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito','ok','ddc_assente',v_ddc_assente);
END $$;

REVOKE EXECUTE ON FUNCTION public.riapri_lavoro_atomica(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.riapri_lavoro_atomica(uuid,uuid,uuid) TO service_role;
```

- [ ] **Passo 2 — prova che il cancello fiscale NON blocca più (è il senso di D265)**

Su un lavoro **con fattura emessa**, in transazione annullata: `riapri_lavoro_atomica` deve tornare
`esito='ok'`. **Se torna `fattura_gia_emessa`, hai riusato la funzione sbagliata.**
E prova che `p_evento_id` inesistente torna `evento_non_valido` — un vincolo si prova con ciò che
**deve** essere rifiutato.

- [ ] **Passo 3 — FASE 6b + salva** (rigenera i tipi, `npx tsc --noEmit`, poi commit)

---

