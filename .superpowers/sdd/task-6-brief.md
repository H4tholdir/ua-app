# Task 6 — Il rifacimento si porta dietro la tinta

**File**
- Crea: `supabase/migrations/20260803140200_rifacimento_clona_tinta.sql` 🆕 *(da creare)*

- [ ] **Passo 1 — Leggere la funzione viva, non il file**

```sql
SELECT prosrc FROM pg_proc WHERE proname = 'crea_rifacimento_atomico';
```

🔑 **Si legge dal catalogo, non dalla migration:** la funzione può essere stata riscritta da una migration
successiva. Incollare le righe dell'`INSERT INTO lavori (…)` nel rapporto.

- [ ] **Passo 2 — Riscrivere la funzione** con `CREATE OR REPLACE`, aggiungendo `tinta_famiglia,
tinta_codice` all'elenco delle colonne **e** `v_lavoro.tinta_famiglia, v_lavoro.tinta_codice` all'elenco
dei valori, **nella stessa posizione relativa** (le due liste si corrispondono per posizione: uno
scivolamento le disallinea in silenzio). Aggiornare il `COMMENT ON FUNCTION`.

- [ ] **Passo 3 — Provare che la tinta arriva davvero**

Su transazione annullata: mettere una tinta a un lavoro `bite_splint`, chiamare la RPC, leggere il lavoro
nuovo, `ROLLBACK`. Atteso: **stessa famiglia, stesso codice**. Incollare l'output.

🔑 Questa prova esiste perché **il difetto più grave del collaudo dell'ondata (a) era esattamente questo**:
il rifacimento perdeva denti e colore.

- [ ] **Passo 4 — Applicare, FASE 6b, salvare.**

---

