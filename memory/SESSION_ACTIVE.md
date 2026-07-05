# Handoff — B5 risolto in worktree, non ancora mergiato (06/07/2026)

**B5 (download DdC/Buono dal portale + fix trasversale URL firmate) RISOLTO** in questo worktree/branch (`worktree-b5-download-signed-url`, 12 commit `04e3047..7e516de`). **Non ancora mergiato su `main`, QA browser pre-merge ancora da fare.**

Scope ampliato dalla ricerca oltre la descrizione originale: WhatsApp al dentista mai inviato (nessun client leggeva `whatsapp_url`), bug trasversale URL pubbliche rotte su bucket privato `documenti` (rompeva anche TabDocumenti/TabImmagini/fatture, non solo il portale). Tutto risolto via helper condiviso `getSignedUrl()`, un'unica migration (`lavori.buono_storage_path`, applicata al DB live con conferma di Francesco). Audit contenuto DdC (8 elementi Allegato XIII) e Buono eseguiti: 2 gap regolatori reali trovati e corretti sulla DdC (SRN EUDAMED, numero lavoro), nessun gap sul Buono. Dettaglio completo: `memory/MEMORY.md` (voce in testa) e `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B5).

**Verifica finale:** `tsc`/`vitest` (`553 passed | 4 skipped`, era 526)/`next build` tutti puliti. Route portale nuova presente nel manifest, route orfana rimossa assente.

**Follow-up segnalati, non bloccanti:** SRN EUDAMED letto live da `laboratori` invece che da uno snapshot immutabile su `dichiarazioni_conformita` (basso impatto, quasi sempre `null` per esenzione EUDAMED custom-made); bottone WhatsApp ora compare ad ogni consegna anche senza telefono cliente in anagrafica (comportamento server preesistente, solo ora visibile).

**Prossima priorità da decidere con Francesco** tra i blocker rimanenti: B6 (Service Worker non intercetta la navigazione offline), B14 (`compenso_base` ambiguo — richiede decisione di Filippo), B16 (query `/ordini` non supportata), B20 (PSUR/PMS non differenziato per classe di rischio).

---

Backlog: 🔴 16/18 Blocker risolti (B1 ✅, B2-B5 ✅, B7-B10 ✅ [B8 4/5], B11-B13 ✅, B15 ✅, B17 ✅, B18 ✅, B19 ✅). B20: nuovo, non pianificato. 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
