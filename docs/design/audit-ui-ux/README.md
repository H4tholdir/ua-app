# Audit UI/UX — Strategia a 3 livelli

> **Stato:** framework attivo dal 13/07/2026. Owner: Francesco Formicola.
> **Origine:** durante la QA dell'Ondata 3a (scheda lavoro v3) è emerso che la QA di ogni ondata è stata **funzionale-first** (stati, dati, navigazione, endpoint, responsive strutturale, temi) e **non** ha coperto la **rifinitura estetica** (allineamenti, proporzioni, spazio morto, sovrapposizioni, densità, gerarchia tipografica, micro-interazioni, suoni). Questo documento definisce come colmare il gap senza sprechi.

---

## Il principio che governa la tempistica

**La PWA è a metà migrazione DS v3.** Sono già v3: Home+pile (Ondata 1), Wizard nuovo lavoro (Ondata 2), Scheda lavoro (Ondata 3a). Sono ancora v2.3 o da rifare: flussi pesanti (3b), UI Consegna (4b), impostazioni, magazzino, qualità, fatture, portale, admin, ecc.

**Corollario:** un audit estetico capillare dell'**intera** PWA fatto **adesso** rifinirebbe al pixel superfici v2.3 che stanno per essere **riscritte** in v3 → doppio lavoro. Un audit estetico ha valore solo sulla superficie **definitiva**.

**Regola d'oro:** *rifinitura incrementale per-superficie durante la migrazione + UN audit capillare totale come gate finale quando il DS v3 è ovunque.*

---

## I 3 livelli

### 🟢 Livello 1 — Micro-pass per-superficie (SUBITO, sulla superficie appena spedita)
Rifinitura estetica mirata sulla **singola superficie** appena completata, con contesto ancora caldo. Costo basso, resa alta. Nessuna superficie va in produzione grezza.
- **Prima applicazione:** Scheda lavoro v3 → [`LIVELLO-1-scheda-v3.md`](./LIVELLO-1-scheda-v3.md) (pronta all'esecuzione).
- **Deliverable:** fix rivisti + screenshot 3×2 + un deploy di sola rifinitura.

### 🟡 Livello 2 — Gate UI/UX di fine ondata (D'ORA IN POI, ricorrente)
Da qui in avanti, **ultimo step di ogni ondata**: un mini-audit estetico sulla *sola* superficie di quell'ondata, contro la [checklist](./CHECKLIST-DS-V3-UI-UX.md). Distribuisce il costo, mantiene sempre presentabile ciò che si spedisce, lavora sempre sul design finale del pezzo.
- **Integrazione:** aggiungere il gate come step finale nei piani `superpowers:writing-plans` di ogni futura ondata (dopo FASE 9 QA funzionale, prima del merge).

### 🔴 Livello 3 — Audit capillare finale (ALLA FINE, quando v3 è completo)
L'audit atomico e capillare dell'**intera** PWA: ogni pagina, ogni elemento, ogni sotto-menu, ogni funzionalità, ogni suono, ogni animazione — con gli agent specializzati, contro la checklist DS v3. **Gate finale prima dell'audit generale.** Fatto **una volta sola** sul prodotto stabile.
- **Trigger:** DS v3 migrazione completa (tutte le superfici migrate).
- **Framework:** [`LIVELLO-3-audit-capillare-finale.md`](./LIVELLO-3-audit-capillare-finale.md) (metodologia, matrice di copertura, ruoli agent, checklist di uscita).

---

## Indice dei documenti

| File | Contenuto | Quando usarlo |
|------|-----------|---------------|
| [`LIVELLO-1-scheda-v3.md`](./LIVELLO-1-scheda-v3.md) | Task immediata: micro-pass estetico della scheda v3 | Prossima sessione (contesto pulito) |
| [`CHECKLIST-DS-V3-UI-UX.md`](./CHECKLIST-DS-V3-UI-UX.md) | Checklist atomica riutilizzabile (conformità DS v3) | Livello 1, 2 e 3 |
| [`LIVELLO-3-audit-capillare-finale.md`](./LIVELLO-3-audit-capillare-finale.md) | Framework dell'audit capillare finale | Quando v3 è ovunque |

---

## Fonti di verità DS v3 (riferimento per ogni livello)

- **Token:** `src/design-system/v3/tokens.ts` — colori, spaziatura, raggi, tipografia. MAI valori inline.
- **Motion:** `src/design-system/v3/motion.ts` — molle/coreografie. MAI `duration`/easing inline.
- **CSS globale v3:** `src/app/ds-v3.css` — classi e variabili CSS (light + dark).
- **Feedback:** `src/lib/feedback/sounds.ts`, `src/lib/feedback/haptic.ts` — suoni/haptic (lazy init + preferenza utente).
- **Mockup approvati «Il cuore»:** `docs/design/mockups/2026-07-09-il-cuore/` — riferimento visivo canonico.
- **Legge madre / decisioni:** `docs/design/decisions/` (emendamenti legge v3.1 e ratifiche Francesco).
- **Workflow UI:** `ua-app/CLAUDE.md §0B` (mockup → approvazione → React; 3 viewport × 2 temi; a11y; touch ≥44px).
