## Task 5 — Il rifacimento sa da quale evento nasce

**File:** Crea `supabase/migrations/<timestamp>_rifacimento_evento.sql`

**Interfacce:**
- Produce: `crea_rifacimento_atomico(p_lavoro_originale_id uuid, p_motivo text, p_rilevato_in text, p_costo_interno numeric, p_note text, p_evento_id uuid DEFAULT NULL)`.

🛑 **Il rischio di questo task, e non è nelle dipendenze.** `CREATE OR REPLACE` **non può** aggiungere
un parametro → serve `DROP` + `CREATE`. `provato:` il `DROP` **non rompe niente** (0 dipendenze, P9)
**ma butta via l'ACL** (P8: oggi `postgres | service_role`), e una funzione creata ex novo in `public`
nasce con `anon` e `authenticated` che possono eseguirla. Siccome `crea_rifacimento_atomico` è
`SECURITY DEFINER` e **non ha nessun filtro tenant** (`20260805201640:56`), lasciarla aperta
significherebbe: chiunque, con la chiave pubblica e un uuid, crea un lavoro nel laboratorio di
chiunque altro. ➡️ **`DROP` → `CREATE` → `REVOKE` → `GRANT` → `COMMENT`, nella stessa migration.**
⚠️ Il `REVOKE` storico (`20260704180000_security_hardening_functions_revoke_drop.sql:38-39`) è scritto
sulla firma a **5** argomenti e **dopo il CREATE non copre più niente**.

- [ ] **Passo 1 — ribatti il corpo vivo dal catalogo** (come T4 Passo 1, per `crea_rifacimento_atomico`).
  🛑 Non copiare da `20260805201640`: quel file è **una** delle stesure, non necessariamente la viva.

- [ ] **Passo 2 — la migration**: `DROP FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text);`
  poi il `CREATE` col corpo ribattuto **identico**, con in coda `p_evento_id uuid DEFAULT NULL`, e
  l'`INSERT INTO lavori_rifacimenti` che scrive **`evento_id`** (colonna che esiste dal 06/08 con FK
  composita — `provato:` P2 — e che oggi **nessuno scrive**). Chiudi con `REVOKE`/`GRANT`/`COMMENT`
  sulla **firma a sei argomenti**.

- [ ] **Passo 3 — le prove che devono mordere**

① la chiamata **a 5 argomenti** (quella della rotta HTTP esistente) **funziona ancora** — è la
prova che il default non ha rotto i chiamanti · ② la chiamata a 6 scrive `evento_id` sulla riga ·
③ **le ACL non contengono `anon` né `authenticated`** · ④ due chiamate con lo **stesso** evento →
la seconda esce **23505** (il vincolo di T3). Tutto in transazione annullata, messaggi incollati.

- [ ] **Passo 4 — FASE 6b + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
git add -A && git commit -m "feat(rifacimento): la RPC scrive evento_id, e il DROP non regala EXECUTE ad anon"
```

---

