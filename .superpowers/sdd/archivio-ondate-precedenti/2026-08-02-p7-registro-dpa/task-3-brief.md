# Task 3 — Le prove di COMPORTAMENTO sul database vivo

🛑 **Questo task è la ragione per cui il lavoro non è finito col Task 2.** Una migration applicata prova che il database ha accettato una frase.

**File:**
- 🆕 Crea (nuovo): `scripts/tmp/p7-prove-comportamento.mjs` (usa e getta, **non si committa**)
- 🆕 Crea (nuovo): `docs/roadmap/2026-08-04-p7-referto-prove.md` (l'output incollato, questo **sì** in git)

- [ ] **Step 1: T1 — il RIFIUTO vero**

Dentro una transazione **annullata**, impersonando un utente del laboratorio:

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"<uuid di un utente vero del lab>","role":"authenticated"}';

  -- ① la LETTURA deve continuare a funzionare
  SELECT count(*) FROM public.data_processing_agreements;   -- atteso: ≥ 1

  -- ② la SCRITTURA deve essere RESPINTA — è il valore che DEVE essere rifiutato
  UPDATE public.data_processing_agreements SET firmato_da = 'FALSIFICATO';
  -- atteso: 0 righe toccate (la regola FOR SELECT non ammette UPDATE)
ROLLBACK;
```

🔑 **Si incolla il numero di righe toccate.** ⚠️ **Attenzione a come si legge l'esito:** con RLS, un `UPDATE` che non trova righe visibili **riesce con 0 righe**, non solleva. **«0 righe toccate» È il rifiuto**, e va detto — un esecutore che aspetta un'eccezione conclude che la prova è fallita.
🛑 **Prima si esegue lo stesso UPDATE con la regola VECCHIA** (su una transazione annullata, ricreando la policy `FOR ALL`): deve toccare **≥ 1 riga**. Senza questo controllo positivo, «0 righe» non distingue «la regola blocca» da «non c'erano righe».

- [ ] **Step 2: T2 — la traccia esiste**

```sql
SELECT count(*) FROM public.audit_log WHERE table_name = 'data_processing_agreements';
```

Prima di un'emissione e dopo. Atteso: **+1**, con `operation='INSERT'` e `new_data` che contiene la riga intera.

- [ ] **Step 3: T3 dal vivo — il «chi» c'è**

```sql
SELECT numero_dpa, emesso_da FROM public.data_processing_agreements
 WHERE emesso_da IS NOT NULL ORDER BY emesso_at DESC LIMIT 1;
```

Atteso: **una riga**, con `emesso_da` uguale all'utente che ha premuto.
🔑 **È la prova che alla DdC è mancata per mesi.**

- [ ] **Step 4: T4 — la cancellazione del laboratorio, con `emesso_da` DAVVERO riempito**

```sql
BEGIN;
  UPDATE public.data_processing_agreements
     SET emesso_da = (SELECT id FROM public.utenti WHERE laboratorio_id = '<lab>' LIMIT 1)
   WHERE laboratorio_id = '<lab>';
  SELECT public.admin_delete_laboratorio('<lab>');   -- deve ARRIVARE IN FONDO
ROLLBACK;
```

🛑 **`ROLLBACK`, non `COMMIT`.** ⚠️ È il cammino che la DdC **non ha mai percorso con un valore dentro**: la chiave esterna non è mai stata esercitata.

- [ ] **Step 5: T5 — la chiave esterna morde**

```sql
BEGIN;
  UPDATE public.data_processing_agreements SET emesso_da = gen_random_uuid();
  -- atteso: ERRORE 23503, violazione di chiave esterna — si incolla il messaggio
ROLLBACK;
```

- [ ] **Step 6: il referto, con l'output incollato**

🆕 Il referto (nuovo, da creare): `docs/roadmap/2026-08-04-p7-referto-prove.md` — una riga per prova, esito e **output reale**. Ogni prova non eseguita si dichiara **non eseguita**, col motivo.

- [ ] **Step 7: Commit** (solo il referto; `scripts/tmp/` è ignorato da git)

---

