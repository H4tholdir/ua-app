# Handoff — B5 mergiato, deployato e verificato in produzione (06/07/2026)

**B5 (download DdC/Buono dal portale + fix trasversale URL firmate) RISOLTO, mergiato su `main` (commit `3fb17c5`), pushato e deployato su uachelab.com (CI + CD verdi, health check 200 OK).**

Scope ampliato dalla ricerca oltre la descrizione originale: WhatsApp al dentista mai inviato (nessun client leggeva `whatsapp_url`), bug trasversale URL pubbliche rotte su bucket privato `documenti` (rompeva anche TabDocumenti/TabImmagini/fatture, non solo il portale). Tutto risolto via helper condiviso `getSignedUrl()`, un'unica migration (`lavori.buono_storage_path`, applicata al DB live con conferma di Francesco). Audit contenuto DdC (8 elementi Allegato XIII) e Buono eseguiti: 2 gap regolatori reali trovati e corretti sulla DdC (SRN EUDAMED, numero lavoro) più dicitura marcatura CE Art. 20(1), nessun gap sul Buono. Dettaglio completo: `memory/MEMORY.md` (voce in testa) e `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (sezione B5).

**QA browser manuale eseguita nel lab E2E isolato (mai il lab Filippo) prima del merge — 7/8 punti PASS**: autosave, consegna con bottone WhatsApp (ConsegnaButton + Front Desk esplicito, verificato nessun auto-popup), download DdC/Buono sia interni (`/lavori/[id]`) sia dal portale dentista, tutti 200 OK. Unico punto non verificabile (bottone Scarica XML fatture) per assenza di una fattura di test raggiungibile in sessione, non bloccante e non un difetto del codice.

**Bug bloccante trovato durante QA e già corretto separatamente (mergiato prima di B5, commit `5385834`):** `PATCH /api/lavori/[id]` usava una blocklist invece di un'allowlist esplicita (violava CLAUDE.md) — i campi di relazione (`appuntamenti`, `fasi`, ecc.) causavano 500 "column not found" su ogni autosave, bloccando anche silenziosamente la navigazione dal bottone CONSEGNA. Fix con allowlist esplicita (40 campi, derivata meccanicamente dai form) + fix del blocco-silenzioso-alla-navigazione, 18 nuovi test (la route non ne aveva nessuno). Bug preesistente, scollegato da B5.

**Verifica finale su `main` post-merge:** `tsc`/`vitest` (`571 passed | 4 skipped`)/`next build` tutti puliti.

**Follow-up segnalati, non bloccanti (task spawnati per sessioni future):**
- SRN EUDAMED letto live da `laboratori` invece che da uno snapshot immutabile su `dichiarazioni_conformita` (basso impatto, quasi sempre `null` per esenzione EUDAMED custom-made).
- Bottone WhatsApp compare ad ogni consegna anche senza telefono cliente in anagrafica (comportamento server preesistente, solo ora visibile).
- **Nessun modo di creare un ciclo di produzione via UI/API** (`cicli_produzione` — solo GET, nessun POST né pagina di creazione) — lacuna funzionale scoperta in QA, blocca l'assegnazione di cicli/fasi a lavori nuovi. Da chiarire con Francesco se è roadmap futura o gap reale.
- Campo "Ciclo di produzione" invisibile in `TabDati` quando si modifica un lavoro esistente (presente solo in creazione) — diagnosi e fix già pronti, non applicati.
- Mismatch `htmlFor`/`id` in `TabDati.tsx` e possibilmente altri tab form lavori (accessibilità/testabilità, nessun impatto dati).

**Prossima priorità da decidere con Francesco** tra i blocker rimanenti: B6 (Service Worker non intercetta la navigazione offline), B14 (`compenso_base` ambiguo — richiede decisione di Filippo), B16 (query `/ordini` non supportata), B20 (PSUR/PMS non differenziato per classe di rischio), più i 3 follow-up sopra emersi da QA B5.

---

Backlog: 🔴 16/18 Blocker risolti (B1 ✅, B2-B5 ✅, B7-B10 ✅ [B8 4/5], B11-B13 ✅, B15 ✅, B17 ✅, B18 ✅, B19 ✅). B20: nuovo, non pianificato. 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
