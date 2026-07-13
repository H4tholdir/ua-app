# Livello 1 — Micro-pass estetico: Scheda lavoro v3

> **Task pronta all'esecuzione in una sessione nuova (contesto pulito).**
> Superficie: `/lavori/[id]` (scheda-vista v3) + route-ponte `/lavori/[id]/modifica` + i suoi sheet.
> Obiettivo: rifinitura **estetica/UX** della scheda già in produzione (Ondata 3a). NON funzionale (funzione già testata: 1590 unit test + QA funzionale live superate).
> Riferimenti base: [`README.md`](./README.md) · [`CHECKLIST-DS-V3-UI-UX.md`](./CHECKLIST-DS-V3-UI-UX.md).

---

## 0. Setup (ambiente stabile — evitare il problema del Fast Refresh)
1. **BP-0:** leggi `memory/MEMORY.md` (entry Ondata 3a) e `docs/roadmap/ROADMAP-UFFICIALE.md`.
2. Worktree dedicato: `superpowers:using-git-worktrees` → `polish-scheda-v3`, **copia `.env.local`**.
3. `npm install`, poi avvia il dev server **dal worktree**: `PORT=3013 npm run dev` (NON `preview_start --name`, che parte dal checkout principale).
4. **Pre-riscalda** il server prima di guidare il browser: `curl` su `/login`, `/lavori`, `/lavori/<id>`, `/lavori/<id>/modifica` finché le route compilano (il primo accesso scatena `[Fast Refresh] rebuilding` che resetta i form → attendere che si stabilizzi PRIMA di fare login via UI).
5. Login lab E2E (**MAI lab Filippo**): `e2e-titolare@ua-test.local` / `TestE2E!2026` (lab `00000000-0000-0000-0000-000000000001`).

## 1. Dati di prova (3 lavori E2E già esistenti — nessuna creazione necessaria)
| numero | id | stato | copre |
|--------|----|-------|-------|
| 2026/0004 | `f3ce5264-3ba7-4730-becd-3da237ba2fb1` | ricevuto | CONSEGNA disabled+callout, righe editabili, menu, nessuna nota/fase |
| 2026/0005 | `cdfee91f-5952-4eb9-8114-f36e4344645d` | consegnato | pill CONSEGNATO, AvvisoTracciabilita MDR, DdC in Documenti, Rifacimento |
| 2026/0006 | `44cdbdf5-7ce5-4bd0-8b1c-dfbec7a44698` | consegnato | secondo consegnato |

- Per gli **stati mancanti** (pronto/in_ritardo → CONSEGNA abilitata; nota presente; fasi): mutare **temporaneamente** un lavoro via SQL e **ripristinare** a fine QA (baseline: 2026/0004 = `ricevuto`, `note_interne=null`, `data_consegna_prevista=2026-07-10`, `ora_consegna=null`). Il lab E2E ha **0 tecnici** e **0 fasi** → l'assegnazione tecnico e il gesto FATTA CardFasi vanno verificati creando fixture minime (poi cleanup) oppure lasciati alla verifica unit.
- **Regola cleanup:** a fine QA, DB al **baseline esatto** (rileggere i 3 lavori e confrontare).

## 2. Cosa auditare (superfici, elementi, stati)
Passare la [checklist](./CHECKLIST-DS-V3-UI-UX.md) su **3 viewport × 2 temi** per:
- **Header scheda** (‹ back · n.+pill · ⋯ · avatar) — allineamento reciproco e vs colonna card.
- **CardInfo** (righe dentista/paziente/lavoro/consegna/tecnico) — allineamento label↔valore, densità, tappabilità.
- **NotaLaboratorio** (quando presente), **strip foto** (quando presente), **CardFasiV3** (quando presente).
- **CONSEGNA** (enabled vs disabled+callout), **Rifacimento/Segnala**, **AvvisoTracciabilita**.
- **Sheet:** `MenuSchedaSheet` (6 voci + Annulla disabled), `DocumentiSheet`, `ModificaRigaSheet` (consegna/tecnico/dentista/note).
- **Route-ponte** `/lavori/[id]/modifica`: header back v3 + form bridged (coerenza estetica tra header v3 e form v2.3, barra Salva, 📦).
- **Stati:** empty (nessuna nota/foto/fasi), loading, error/rollback, disabled.
- **Suoni/haptic** sugli eventi (FATTA, salva, errore, consegna) — presenza e coerenza.

## 3. Difetti già individuati durante la QA (punto di partenza — verificare + estendere)
1. **Desktop 1280 — spazio morto:** la scheda è card centrata `max-width:640`; su desktop lascia molto vuoto sotto/attorno. Valutare: colonna affiancata (riepilogo/azioni), contenuto che riempie meglio, o max-width/impaginazione desktop più ricca. (È l'item estetico più evidente.)
2. **Header vs card su desktop:** l'avatar profilo è top-right *fuori* dalla colonna centrata mentre ‹/⋯ sono *dentro* → possibile disallineamento/incoerenza. Decidere un'ancora coerente.
3. **`:focus-visible` assente** sui bottoni inline-styled v3 (NotaLaboratorio, righe, voci menu) — outline nativo presente ma non lo stile v3 (BACKLOG O6f).
4. **`aria-label="Modifica scadenza"`** sulla riga consegna: divergenza WCAG label-in-name (test-driven per non collidere con CONSEGNA). Valutare «Modifica consegna» + query test più specifica (BACKLOG O6f).
5. **Empty-note-add:** dalla scheda non si può aggiungere la *prima* nota (la card appare solo se `note_interne` presente) — manca affordance empty-state (BACKLOG O6d).
6. **CardInfo >5 righe:** warning dev quando un ciclo ha 6-8 fasi (CardInfo pensata per ≤5 righe); valutare presentazione fasi quando numerose (BACKLOG O6c/§5.10).
7. **RifacimentoButton** riusato porta token/stile DS-v2 in superficie v3 → incoerenza estetica (BACKLOG O6e).

## 4. Processo (rifinitura, non nuova UI)
Trattandosi di **polish di UI esistente**, il gate mockup pieno di CLAUDE.md §0B è alleggerito, ma la **decisione visiva resta di Francesco**:
1. Audit → tabella `elemento × sezione → esito` (checklist) con screenshot **before**.
2. Proporre i fix concreti con **before/after** (screenshot o mockup rapido per i cambi di layout non banali, es. il redesign desktop del punto 1).
3. **Approvazione Francesco** sui cambi visivi rilevanti (specie punto 1-2). I fix a11y/token/spacing minori possono procedere direttamente.
4. Implementazione fedele: token/motion/feedback SOLO v3; TDD dove tocca logica; nessuna regressione (rilanciare i test della scheda).
5. Screenshot **after** in `docs/design/screenshots/2026-07-13-ondata-3a/` (3×2).

## 5. Criteri di accettazione
- Ogni ❌ della checklist risolto o esplicitamente accettato/deferito con motivazione.
- Punti 1-2 (desktop) decisi e approvati da Francesco.
- `npx tsc --noEmit` · `npx vitest run` (nessuna regressione) · `npx next build` · `check-ds-compliance.sh` verdi.
- Screenshot 3×2 archiviati; DB E2E al baseline esatto.
- BP-1: aggiornare MEMORY/ROADMAP; chiudere/aggiornare gli item O6 risolti nel BACKLOG.

## 6. Verifica finale + merge
FASE 7 verde → review (`superpowers:requesting-code-review`) → merge fast-forward + push → CI verde → smoke uachelab.com → cleanup worktree (preservare ledger). **Merge = gate esplicito di Francesco.**
