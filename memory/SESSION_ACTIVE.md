# SESSION ACTIVE — 13/07/2026 — ONDATA 3a (SCHEDA LAVORO v3): DESIGN + PIANO PRONTI

**Stato:** Design e piano COMPLETATI, APPROVATI da Francesco, committati su `main` locale (NON pushati — vedi sotto). Nessun codice scritto: la prossima sessione (contesto pulito) esegue.

**Spec:** `docs/superpowers/specs/2026-07-13-ds-v3-il-cuore-ondata-3a-scheda-design.md` (`b19fc29`+review `b67028b`/`66dd743`/`5b7f6f2`). **Piano:** `docs/superpowers/plans/2026-07-13-ds-v3-il-cuore-ondata-3a-scheda.md` (`2629765`, 11 task TDD).

**Decisioni chiave:** Ondata 3 si decompone in **3a** (scheda-vista v3 + modifica per-riga + Documenti hub + menu ⋯) e **3b** (flussi pesanti nativi + N4). CONSEGNA della scheda naviga a `/consegna` v2.3 quando `derivaUrgenza().consegnabile` (come già fa `TastoConsegnaInline` della pila), disabled+callout altrimenti. Ponte pesanti (Prezzi&lavorazioni/Dati clinici/Prove/Foto) → route `/lavori/[id]/modifica` con `LavoroFormClient bridged` (sopprime SOLO CONSEGNA, **tiene Salva**). Annulla lavoro = voce ⋯ disabilitata (no backend, stage dedicato). Desktop = card centrata; upgrade pannello pile (SchedaAnteprima→full-card) = follow-up. **Zero API nuove, zero migration, zero dominio fiscale.** 3 review advisor integrate.

**PROSSIMO (SESSIONE NUOVA, contesto pulito):** eseguire il piano via `superpowers:subagent-driven-development` in worktree `ondata-3a-scheda` (copiare `.env.local`; baseline 1561 pass | 4 skipped; QA su lab E2E `00000000-…-0001`, MAI lab Filippo). **Push su main NON ancora fatto** — decidere se pushare spec+piano+memoria (triggera CI/CD Vercel, docs-only).
