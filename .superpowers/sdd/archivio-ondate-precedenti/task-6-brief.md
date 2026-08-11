## Task 6 — La copia dormiente nel database (migration nuova)

**Files:**
- Create: `supabase/migrations/20260803120000_default_testo_conformita_accentato.sql`
- Test: verifica sul database vero (sotto)

**Interfaces:** nessuna. Il DEFAULT non compare nei tipi generati.

- [ ] **Step 1: scrivi la migration**

```sql
-- D104 — il DEFAULT di `testo_conformita_snapshot` porta la stessa frase del
-- generatore, e fino a oggi portava la stessa frase SENZA accento.
--
-- ═══ PERCHÉ ESISTE QUESTO FILE ═══════════════════════════════════════════════
-- La frase vive in due posti: `src/lib/pdf/generate-ddc.ts` (che la scrive a ogni
-- emissione) e il DEFAULT di questa colonna, messo da `002_fase2_schema.sql:188-189`.
-- Oggi il default NON spara mai — il generatore valorizza sempre entrambe le
-- colonne (`generate-ddc.ts:147-148`) — ma `supabase/seed.sql` inserisce righe
-- senza lo snapshot, e quelle lo prendono. Correggendo solo il TypeScript
-- resterebbero in casa DUE verità canoniche, e la seconda tornerebbe a valere il
-- giorno in cui un writer futuro omettesse la colonna: una dichiarazione marcata
-- con la forma nuova, e dentro il testo vecchio.
--
-- 🛑 La migration del 2026-05 NON si riscrive: è il registro di ciò che è
--    successo. Si allinea qui.
-- 🛑 Non si usa DROP DEFAULT, che pure sarebbe più pulito: la colonna è NOT NULL
--    e il seme inserisce righe senza valorizzarla — toglierlo lo romperebbe.

ALTER TABLE public.dichiarazioni_conformita
  ALTER COLUMN testo_conformita_snapshot SET DEFAULT
    'Il fabbricante dichiara che il presente dispositivo è conforme ai requisiti generali di sicurezza e prestazione di cui all''Allegato I e ai disposti dell''Allegato XIII del Reg. (UE) 2017/745.';
```

⚠️ In SQL l'apostrofo si raddoppia (`all''Allegato`), **l'accento no**: `è` si scrive tale e quale.

- [ ] **Step 2: applica sul progetto reale**

Run: `npx supabase db push --yes`
Atteso: la migration risulta applicata. 🔑 Il CI **non** applica le migrazioni: si fanno a mano.

- [ ] **Step 3: prova che il default è cambiato DAVVERO, con un valore che lo esercita**

Un `ALTER` riuscito prova la sintassi, non il comportamento (R-P1). Scrivi uno scriptino usa-e-getta in
`scripts/tmp/` che legga il default dal catalogo:

```sql
SELECT column_default
  FROM information_schema.columns
 WHERE table_name = 'dichiarazioni_conformita'
   AND column_name = 'testo_conformita_snapshot';
```

Atteso: la stringa contiene `dispositivo è conforme` e **non** `dispositivo e'' conforme`.
🛑 Incolla l'output nel referto.

- [ ] **Step 4: FASE 6b — i tipi e il compilatore**

```bash
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
npx tsc --noEmit
```

Atteso: `tsc` **0 errori**. Il file dei tipi non dovrebbe cambiare (i default non ci finiscono): se cambia,
guarda il diff e riferiscilo.

- [ ] **Step 5: commit**

```bash
git add supabase/migrations/20260803120000_default_testo_conformita_accentato.sql src/types/database.types.ts
git commit -F <messaggio fuori dal repo>
```

Messaggio: `fix(db): il DEFAULT della frase di conformità porta l'accento (D104)`

---

