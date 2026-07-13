# Livello 3 — Audit capillare finale (framework)

> **Non eseguire ora.** Questo è il framework per l'audit atomico e capillare dell'**intera** PWA, da avviare quando la migrazione DS v3 è **completa**. È il gate di qualità UI/UX **prima** dell'audit generale multi-agent.
> Base: [`README.md`](./README.md) · [`CHECKLIST-DS-V3-UI-UX.md`](./CHECKLIST-DS-V3-UI-UX.md).

---

## 1. Trigger (quando partire)
- ✅ Tutte le superfici migrate a DS v3 (nessuna pagina v2.3 residua nel percorso utente reale).
- ✅ Nessuna riscrittura di UI pianificata a breve sulle superfici da auditare (audit sul design **finale**).
- Riferimento avanzamento: `ROADMAP-UFFICIALE.md` (Ondate DS v3). Oggi (13/07/2026) mancano ancora 3b, 4b e le superfici gestionali/admin.

## 2. Principio operativo: **atomico e capillare**
Unità di audit = **(superficie × elemento × stato × viewport × tema)**. Ogni combinazione è verificata contro le 12 sezioni della checklist. Nessun campionamento: copertura totale.

## 3. Inventario di copertura (da completare al trigger — scheletro)
Costruire la **matrice di copertura** enumerando dal codice (`src/app/**/page.tsx` + build route list) TUTTE le superfici. Categorie:
- **Auth:** login, magic-link, invite, reset/forgot-password, onboarding.
- **Operative (app):** home/pile, lavori (lista, scheda, nuovo/wizard, modifica-ponte, consegna), clienti, pazienti, tecnici, fatture, scadenzario, magazzino, ordini, qualità (rischi, incidenti, psur), rete, impostazioni (profilo, lab, pec, abbonamento), tutto-il-resto.
- **Portale dentista:** richiesta, portale token, fatturazione/situazione economica.
- **Admin:** dashboard admin, labs, live-preview.
- **Trasversali:** header/nav (BottomNavPill, NavDesk), sheet/dialog, avvisi/toast, empty/error/loading globali, PWA (install, offline, splash), suoni/haptic, motion.

Per ciascuna: elencare **elementi** (bottoni, righe, card, form, chip, badge, pill, menu, sotto-menu), **stati** (empty/loading/error/disabled/success), **interazioni** (tap, swipe, long-press), **suoni/animazioni** associati.

## 4. Metodologia multi-agent (capillare)
Orchestrazione consigliata (opt-in esplicito richiesto per fan-out massivo / `ultracode` / Workflow):
1. **Inventario** (`gsd-map-codebase` / `Explore`): enumerare superfici+elementi → matrice.
2. **Audit per-superficie in parallelo** (un agent per superficie, isolati):
   - `ux-designer` — flusso, information architecture, cognitive load, empty/error, microcopy.
   - `frontend-ui-builder` — token/spacing/tipografia/motion/responsive/a11y tecnica.
   - `gsd-ui-auditor` — audit visivo 6-pilastri con verdetto scored.
   - `appsec-auditor`/a11y lens — WCAG, focus, ruoli/landmark, label-in-name.
   - **QA browser** (Playwright/Claude Browser) — screenshot 3×2 per stato, verifica live, suoni/animazioni.
3. **Verifica avversariale** dei finding (ogni finding «reale?» da un secondo agent) per abbattere i falsi positivi.
4. **Consolidamento** (`orchestrator-chief`/`workflow-coordinator`): registro unico dei finding, dedup, severità (Critical/Important/Minor), stima fix.
5. **Wave di fix** per priorità (un fixer per lotto coerente), con re-audit della superficie toccata.
6. **Sign-off** superficie per superficie contro la checklist (tutte le voci ✅ o accettate/deferite motivate).

> Suggerimento esecuzione: questo si presta a un **Workflow** (fan-out per superficie → audit → verify → consolida). Richiede opt-in esplicito di Francesco (grande consumo). In alternativa, ondata per ondata con agent singoli.

## 5. Deliverable
- `docs/design/audit-ui-ux/report-finale/<superficie>.md` — tabella `elemento × sezione → esito`, screenshot before, finding con `file:riga` e severità.
- `docs/design/audit-ui-ux/report-finale/REGISTRO-FINDING.md` — registro consolidato, priorità, stato fix.
- Screenshot 3×2 per superficie/stato in `docs/design/screenshots/audit-finale/`.
- Aggiornamento BACKLOG con i residui accettati/deferiti.

## 6. Definition of Done (uscita del Livello 3)
- Ogni superficie firmata (checklist completa, ❌ risolti o motivati).
- Coerenza trasversale verificata (stesse spaziature/motion/suoni/copy per stessi pattern su tutta la PWA).
- Suite verde (tsc/vitest/build/DS-compliance) + smoke prod.
- **Solo dopo** questo gate parte l'**audit generale multi-agent** (sicurezza, performance, normativa, architettura, ecc.).

---

## Nota di relazione con l'audit generale
Questo Livello 3 è **specifico UI/UX** e **precede** l'audit generale che Francesco vuole eseguire con tutti gli agent specializzati (che coprirà anche security/perf/normativa/architettura). Fare prima il gate UI/UX evita che l'audit generale trovi rumore estetico e permette a quest'ultimo di concentrarsi sulle dimensioni non-visive su un prodotto già rifinito.
