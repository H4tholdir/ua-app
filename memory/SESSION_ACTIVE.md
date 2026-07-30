# Sessione attiva — ondata (b): l'album delle foto, esecuzione APERTA (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-30-album-foto-esecuzione-handoff.md`**. Documento operativo:
il piano `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` (**14 task**: 13 + **T9-bis**).
⚠️ Il ledger `.superpowers/sdd/progress.md` è **fuori dal repo git**: non è un punto di ripresa.

**Ramo `ondata-b-schermate`** — niente su `origin`. Spec ratificata · mockup approvato · verbale a **ottanta**
decisioni.

🆕 **D80 (30/07, ventunesima tornata):** la conferma di eliminazione è il **foglio dal basso** del mockup,
non la card centrata. **Lo scostamento S1 è RITIRATO.** Nasce **T9-bis** (`FoglioConferma`), la §5.x si
propone nel gate **T5**, **T12** lo usa. Deroga verso **§5.17** (non §5.16: l'invariante «mai modal centrato
su mobile» il foglio lo rispetta).
🔴 **Costo misurato, da risolvere nel gate T5:** `Sheet` tiene il valore precedente dello scorrimento in un
`useRef` **per istanza** (`Sheet.tsx:222`) → un secondo foglio **sopra il visore** lascerebbe la pagina
bloccata per sempre. Il foglio di conferma **non blocca**.

✅ **Task 1 FATTO** (`9961964f`): colonna `categoria` vincolata ai sei valori, `tipo` eliminata, migration
registrata con `npx supabase db push --yes`, `tsc` 0, vitest **3850 | 19** identico al riferimento.
🔴 **E ha trovato un difetto più grande di sé: `tsc` NON protegge le query.** I quattro fabbricanti del
client Supabase non portano il generico `<Database>` → una colonna **inventata** in un `.insert()` lascia
`tsc` a **0**. È **R27** (roadmap propria, 147 file, decide Francesco); **R28** = la rotta POST rimanda il
messaggio grezzo del database e non ha test → **si chiude in T3**. **P2 del piano è stata corretta.**
➡️ **PROSSIMO: Task 2** — il modulo 🆕 **da creare** `src/lib/domain/categorie-foto.ts` (unica fonte dei sei
valori) più la spia che impedisce a migration e codice di divergere.

**Ordine:** A (T1→T2→T3) → B (T4) → C (T5 🚪gate → T6-T9, T9-bis) → D (T10→T11→T12) → E (T13).
🛑 **A prima di D** · 🛑 **B prima di D-T12**.

🔴 **Non dimenticare:** **T8 dell'ondata è ancora a cancellazione morbida** (è il Task 4). Fuori dal piano,
prima della pubblicazione: **DPA** (D62) e **TOK-1 + CLI-1** (D53, difetto **vivo in produzione**).
