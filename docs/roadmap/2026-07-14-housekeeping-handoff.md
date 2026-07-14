# Housekeeping — brief pronto all'esecuzione (sessione nuova, contesto pulito)

> **Preparato:** 2026-07-14, a fine Polish Livello 1 scheda v3. **Owner:** Francesco.
> Eseguibile da una sessione Claude Code fresca senza la conversazione precedente.
> Il hook BP-0 inietta PINNED.md + MEMORY.md all'avvio: leggerli prima di iniziare.

---

## 0. Contesto (cosa è già fatto)
- **Polish Livello 1 scheda v3** → COMPLETATO, MERGIATO, DEPLOYATO su `main` (`c420609..d2696ec`, 6 commit; CI verde, CD Vercel success, smoke `uachelab.com` OK).
- **Gate estetico L2** integrato in `ua-app/CLAUDE.md` (BP-2 FASE 9b + REGOLA ZERO + §0B «più varianti in anteprima») → commit `cdc38c6` **SOLO LOCALE, non ancora pushato**.
- Stato `main` locale = `cdc38c6`, avanti di **1 commit** su `origin/main` (`d2696ec`).

---

## 1. Task A — Push del commit L2 (docs-only)
`cdc38c6` è docs/processo (nessun codice runtime). Il push triggera comunque CI/CD Vercel (deploy inerte).
```bash
cd "…/ua-app"
git log --oneline origin/main..main        # atteso: solo cdc38c6
git push origin main
gh run watch <run-id> --repo H4tholdir/ua-app --exit-status   # attendi CI verde
```
**Fatto quando:** `origin/main == main == cdc38c6` e CI verde.

---

## 2. Task B — Pulizia worktree vecchi
`git worktree list` mostra 3 worktree oltre al principale. Stato verificato il 14/07:

| Worktree | Branch | Stato vs main | Dirty | Azione |
|----------|--------|---------------|-------|--------|
| `dashboard-v2-rewrite` | `worktree-dashboard-v2-rewrite` (`f2c7e1d`) | **0 avanti / 696 dietro → GIÀ MERGIATO** | 3 file stale (`MEMORY.md`, `PINNED.md`, un plan docs — edit vecchi mai serviti) | **Rimuovere** (scartare i 3 dirty) |
| `worktree-fix-ua-list-grid-reduced-motion` | `worktree-worktree-fix-ua-list-grid-reduced-motion` (`85faad1`, nome doppio-prefissato) | **0 avanti / 444 dietro → GIÀ MERGIATO** | pulito | **Rimuovere** |
| `plan-c-dashboard-rbac` | `worktree-plan-c-dashboard-rbac` (`ecdc306`) | **7 avanti / 919 dietro → NON MERGIATO** | `.playwright-mcp/` (artefatto test, ignorabile) | **🚦 GATE FRANCESCO — vedi §2b** |

### 2a. Rimozione dei due già mergiati (sicura)
Questi worktree sono stati creati con `git worktree add` in sessioni precedenti → NON usare ExitWorktree (gestisce solo quelli creati con EnterWorktree in-sessione). Usare git:
```bash
cd "…/ua-app"
git worktree remove --force .claude/worktrees/dashboard-v2-rewrite
git worktree remove --force .claude/worktrees/worktree-fix-ua-list-grid-reduced-motion
# opzionale: elimina i branch locali ormai mergiati
git branch -d worktree-dashboard-v2-rewrite worktree-worktree-fix-ua-list-grid-reduced-motion
git worktree prune
```
`--force` serve solo per lo sporco stale (dashboard-v2-rewrite): i commit sono tutti già in `main`, non si perde nulla di reale.

### 2b. 🚦 GATE FRANCESCO — `plan-c-dashboard-rbac` (7 commit di feature non mergiati)
Contiene lavoro reale, precedente alle ondate DS v3, mai mergiato. I 7 commit (`main..worktree-plan-c-dashboard-rbac`):
```
ecdc306 fix(dashboard): correct query column names and server-side vs JS filtering
93a2578 feat(admin): live in-app preview as titolare + dashboard foundation components
b8c7b9c feat(admin): full lab edit form + impersonation magic link + archive (not delete)
d01019e fix(pec): honest V1 save — no false pec_smtp_configurata=true, propagate server message
aa68f14 feat(pec): auto-configure PEC by provider — detect SMTP from email domain
ad14f40 feat(import): DentalMaster CSV import script + export guide
6e54289 test(e2e): Piano E T4-7 — consegna completa + MDR precheck + RLS isolation + API coverage
```
Feature potenzialmente ancora utili: **admin lab-edit + impersonation magic-link + archive**, **PEC auto-config per provider**, **import CSV DentalMaster**, **suite e2e Piano E**. Alcune potrebbero essere già state rifatte altrove durante le ondate 1-3a → **verificare prima di decidere**.

**Chiedere a Francesco una di queste opzioni:**
1. **Review + merge** — riprendere il branch, rebase su `main` (919 commit dietro → conflitti probabili), review, merge. Percorso GRANDE (tocca admin/PEC/import/RLS = dominio critico auth/fiscale).
2. **Cherry-pick selettivo** — portare su `main` solo le feature ancora volute (es. import DentalMaster + e2e), scartare il resto.
3. **Archiviare + rimuovere** — `git tag archive/plan-c-dashboard-rbac ecdc306` per preservare la storia, poi `git worktree remove` + `git branch -D`. Recuperabile dal tag se serve.
4. **Tenere così com'è** — lasciarlo intatto per ora.

**NON rimuovere `plan-c-dashboard-rbac` senza decisione esplicita.**

### 2c. Verifica finale housekeeping
```bash
git worktree list          # atteso: solo il principale (+ plan-c se tenuto)
git worktree prune
git status                 # pulito su main
```

---

## 3. Dopo l'housekeeping — scelta del prossimo grande blocco
Menu strategico (dettagli in MEMORY.md e nel ledger 4a interrotta):
- **A. Consegna → portale dentista** (deciso da Francesco il 10/07, mai ripreso): alla consegna nessuna auto-fatturazione; i lavori consegnati vanno in una **lista nel portale del dentista** dove lui sceglie cosa fatturare, con **stampa** agganciata alla contabilità. Backend già quasi pronto (`decisione_fatturazione`, `/api/lavori/pronti-da-fatturare`, PATCH decisione, batch, contabilità); manca il lato **portale dentista**. 6 migration `20260710*` già applicate (inerti), 2 cron outbox sospesi. ⚠️ Dominio critico FatturaPA/N4 → percorso GRANDE (brainstorming → spec → piano → TDD). Vedi `docs/roadmap/2026-07-10-ledger-4a-interrotta-audit.md`.
- **B. Ondata 3b** — chiudere i deferiti della scheda: form ponte `/lavori/[id]/modifica` in v3 (oggi tab oro + ombre v2.3), colonna `note_dentista` + compilazione dal portale + display read-only, N4 prezzo, flussi ⋯ pesanti nativi.
- **C. Prossima superficie DS v3** — impostazioni / magazzino / qualità / fatture / portale / admin (ognuna un'ondata, **ora col gate L2** come step finale — FASE 9b).

---

## 4. Regole operative da rispettare (dal CLAUDE.md)
- Lab E2E `00000000-0000-0000-0000-000000000001`, **MAI lab Filippo**.
- Ogni ondata con UI: **gate estetico L2 (FASE 9b)** prima del merge; **più varianti in anteprima** prima di scrivere React.
- BP-1 a fine lavoro: aggiornare MEMORY.md + ROADMAP-UFFICIALE.md.
- Merge/push = **gate esplicito di Francesco**.
