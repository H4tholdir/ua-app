# Decisione — Polish Livello 1 Scheda v3 (2026-07-14)

**Owner:** Francesco Formicola · **Contesto:** micro-pass estetico scheda `/lavori/[id]` (Ondata 3a), worktree `polish-scheda-v3`.
**Audit esiti:** `docs/design/audit-ui-ux/LIVELLO-1-scheda-v3-ESITI.md`.

## Decisioni ratificate

1. **Nav/avatar (Q1):** registrare `/lavori/[id]` e `/lavori/[id]/modifica` come route **v3-migrate** (`isV3MigratedRoute`) → avatar globale + BottomNavPill legacy si **ritirano** (coerente con ratifica Ondata 1). Desktop → **NavDesk**; mobile → navigazione via back. Risolve D2 (avatar orfano), D3 (overlap header mobile), D13 (bottom-nav non-dark-aware), aloni gloss.
   - **Scope preciso:** NON toccare `/lavori/[id]/consegna` (flusso v2.3, mantiene comportamento attuale).

2. **Layout desktop (Q2) → Variante V3 "Bilanciata"** (mockup `2026-07-14-scheda-v3-desktop-varianti.html`, screenshot `varianti-V3-*`):
   - Griglia 60/40 a ≥ breakpoint desktop.
   - **Sinistra:** header, AvvisoTracciabilità, CardInfo, **card Nota laboratorio** (con affordance "+ Aggiungi la prima nota" quando vuota — D10), strip foto/fasi se presenti.
   - **Destra:** card **Azioni** (CONSEGNA + Crea rifacimento) + card **Documenti** a **mattonelle 2×2** (DdC/IFU/Etichetta/Ricevuta) + Pacchetto Consegna MDR.
   - **Mobile/tablet (<breakpoint):** invariato a colonna singola; il pannello Documenti desktop resta desktop-only (mobile continua a usare il bottom-sheet dal menu ⋯).

3. **Preferenza di processo permanente (Francesco):** per **ogni** cambio UI/UX, mostrare **prima** un'anteprima con **più varianti** tra cui scegliere, prima di scrivere codice.

## Fix diretti approvati (a11y/copy/token — nessun gate ulteriore)
- D4 `:focus-visible` ring v3 sui bottoni inline (RigaEditabile, NotaLaboratorio, voci sheet).
- D5 aria-label "Modifica scadenza" → "Modifica consegna" (+ query test più specifica, senza collidere con CONSEGNA).
- D6 copy CONSEGNA disabled **state-aware** (consegnato → "Lavoro già consegnato…", non "Completa il controllo finale").
- D8 `fontSize:21` inline → token tipografico v3.
- D9 RifacimentoButton → token/shadow/motion v3 (verificare prima gli altri usi per non regredire superfici v2.3).

## Deferiti
- D11 riscrittura form ponte (tab oro/ombre v2.3) → **3b**. Qui al più coerenza header.
- D12 uniformare righe MenuSchedaSheet vs DocumentiSheet → valutare in implementazione.
