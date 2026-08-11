## Task 2 — La data della prima immissione sul mercato

**File:**
- Crea: `supabase/migrations/<timestamp>_lavori_prima_immissione.sql`
- Modifica: `src/lib/consegna/orchestrate.ts` (dove scrive `data_consegna_effettiva`)
- Prova: `tests/integration/torna-a-pronto.rpc.test.ts` — **no**: qui basta la sonda del Passo 3

**Interfacce:**
- Produce: `lavori.prima_immissione_at TIMESTAMPTZ NULL`, scritta **una volta sola**.

🔑 **Perché esiste questo task, in una riga:** Allegato XIII punto 4 fa decorrere i **10 anni** di
conservazione dalla **prima** immissione sul mercato (Art. 2(28)); `data_consegna_effettiva` viene
azzerata da ogni riapertura e riscritta a ogni consegna, quindi dopo una riconsegna direbbe la data
**sbagliata** — e un laboratorio che si fidasse butterebbe la dichiarazione **troppo presto**.

- [ ] **Passo 1 — apri e leggi `orchestrate.ts` righe 290-345**, e cita nel resoconto la riga esatta
  che scrive `data_consegna_effettiva`. (R-P2: la riga 324-329 è **un'indicazione**, non un fatto
  verificato da chi ha scritto il piano.)

- [ ] **Passo 2 — la migration**

```sql
-- Ondata «si deve sempre poter intervenire» — §2 della spec.
-- 🔑 La memoria della PRIMA immissione sul mercato non può vivere in
-- data_consegna_effettiva: quella colonna viene azzerata da ogni riapertura e
-- riscritta a ogni consegna. Allegato XIII punto 4 + Art. 2(28): i 10 anni
-- decorrono dalla PRIMA messa a disposizione.
-- provato: 223 lavori consegnati su 224 hanno una data da riportare; il 224esimo
-- resta NULL, ed è corretto — non si inventa una data che non c'è.
ALTER TABLE public.lavori
  ADD COLUMN IF NOT EXISTS prima_immissione_at TIMESTAMPTZ;

UPDATE public.lavori
   SET prima_immissione_at = data_consegna_effettiva
 WHERE stato = 'consegnato'
   AND data_consegna_effettiva IS NOT NULL
   AND prima_immissione_at IS NULL;

COMMENT ON COLUMN public.lavori.prima_immissione_at IS
  'La PRIMA volta che il manufatto è stato messo a disposizione (Art. 2(28)): da '
  'qui decorrono i 10 anni di conservazione della dichiarazione (Allegato XIII p.4). '
  'Si scrive una volta sola e NESSUNA riapertura la azzera — a differenza di '
  'data_consegna_effettiva, che descrive la consegna CORRENTE.';
```

- [ ] **Passo 3 — applica, e verifica il backfill**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase db push --linked --yes
```
Sonda (`/tmp/prova-t2.sql`): `SELECT count(*) FILTER (WHERE prima_immissione_at IS NOT NULL) AS piene, count(*) AS consegnati FROM lavori WHERE stato='consegnato';`
**Atteso:** `piene=223`, `consegnati=224`.

- [ ] **Passo 4 — la scrittura alla consegna**

In `orchestrate.ts`, nell'update che segna la consegna, aggiungi il campo **senza mai sovrascriverlo**:

```typescript
        data_consegna_effettiva: adesso,
        // 🔑 La prima immissione sul mercato si scrive UNA VOLTA SOLA (Allegato
        // XIII p.4 + Art. 2(28)): da qui decorrono i 10 anni di conservazione.
        // Una riconsegna dopo una riapertura NON la sposta, o il termine
        // ripartirebbe da capo e la dichiarazione verrebbe distrutta troppo presto.
        prima_immissione_at: lavoroPrima?.prima_immissione_at ?? adesso,
```
🛑 Se in quel punto la riga del lavoro **non** è già stata letta, leggila: `COALESCE` va fatto sul
valore vero, e un `undefined` scriverebbe `adesso` su un lavoro che aveva già la sua data.

- [ ] **Passo 5 — la prova che morde**

In `tests/unit/` (o dove vivono le prove di `orchestrate`), una prova che consegna **due volte** lo
stesso lavoro e verifica che `prima_immissione_at` **non cambi** fra la prima e la seconda, mentre
`data_consegna_effettiva` **sì**. Falla fallire prima (commenta il `??`), conta le asserzioni che si
accendono e **scrivi il numero** (R-P4).

- [ ] **Passo 6 — FASE 6b + verifica + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
git add -A && git commit -m "feat(consegna): prima_immissione_at — i 10 anni decorrono dalla PRIMA consegna (All. XIII p.4)"
```

---

