# Handoff — Sessione §A + §O (chiusura sequenza (1) «resto dei problemi»)
**Data:** 17 luglio 2026, notte · **Da eseguire in sessione NUOVA a contesto pulito** (decisione Francesco)

## Contesto (30 secondi)

Sequenza operativa ratificata: **(1) resto dei problemi → (2) funzioni attive → (3) design → (4) audit → (5) collaudo**. Della (1) è stato completato TUTTO tranne **§A** e **§O**: P0-PERF chiuso e misurato · N11-bis, N14 (incluse le code: cap passkey + Impostazioni→Sicurezza + collaudo login p75 1804ms + budget cron 4000) e **N13 deployati in produzione** — la guard `lab.stato` è **in ENFORCE** su tutte le API (dettagli: MEMORY.md voci 8-10).

## Obiettivo di questa sessione

Chiudere **§A** (item A1-A20) e **§O** (O1, O2, O4 — O3 = collaudo Francesco, resta DEFERITO a fine sequenza) di `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` (righe ~478-640), così da passare alla sequenza (2) «funzioni attive».

## Percorso consigliato

1. **FASE 0/BP-0**: MEMORY.md (voce 10) + questo handoff.
2. **CENSIMENTO PRIMA DI TUTTO**: il backlog è del 02/07 — parecchi item §A potrebbero essere già risolti di fatto dalle ondate successive (es. A4 già ✅; A3 potrebbe essere toccato da N14; A2 dal lavoro SW di B6; A17 dalle ondate v3). Per OGNI item A1-A20 e O1/O2/O4: verificare lo stato REALE su codice/prod prima di pianificare. Output: tabella item → già-risolto / da-fare / da-deferire-con-motivo.
3. **Triage con Francesco**: presentare la tabella e far ratificare priorità ed eventuali deferral (Regola Advisor §0C per le decisioni significative; O2 = redesign admin è espressamente «sessione dedicata su richiesta Francesco» — probabilmente va calendarizzato a parte, non assorbito qui).
4. **Esecuzione a bundle** per dimensione (§0C: Piccolo/Medio/Grande — override dominio critico se si tocca auth/Stripe/RLS/FatturaPA): TDD, worktree per i bundle non banali, FASE 7 completa, review, deploy.
5. **BP-1** a ogni chiusura.

## Fatti nuovi che impattano §A (dal 17/07)

- **Guard N13 in ENFORCE**: ogni nuova route API DEVE chiamare `assertLabOperativo` (il test statico `lab-guard-static.test.ts` lo impone; esenzioni motivate in `lab-guard-exempt-routes.ts`). I mock di test dei context DEVONO includere `lab` (o embed `laboratori` sulle righe `utenti`), altrimenti 403 fail-closed.
- **Interceptor fetch client** montato nel layout (app) — mappa i 403 `UA_LAB_*` → `/impostazioni/abbonamento`. Rilevante per A2 (offline/fallback) se si tocca il fetch layer.
- Push (A1, A8): esiste `notifications/subscribe` + `PushRegistrar`; il collegamento agli eventi è il gap.
- `/impostazioni` ha ora la sezione «Sicurezza» (client `AttivaAccessoRapido`) — pagina ancora v2.3 legacy: gli interventi UI su di essa restano su v2.3 finché non arriva la sua ondata (regola di convivenza DS v3 §14).

## Regole di ingaggio (invariate)

CLAUDE.md §0C (12 fasi + Regola Advisor) · UI: mockup + varianti + approvazione Francesco PRIMA del React (0B) · lab E2E `00000000-…-0001` per QA, MAI lab Filippo · MAI committare/pushare senza richiesta esplicita · BP-0/BP-1 obbligatori · 3 viewport + light/dark per ogni UI.

## Residui NON in scope di questa sessione (solo da tenere d'occhio nel censimento)

Item backlog ancora aperti fuori §A/§O: B13 (test orchestraConsegna/webhook), B16 (query /ordini), B17 (fasi nei PDF — spec fatta, verificare stato), B22 (migration history), N1 (firma DdC), N2 (deprecazione in_ritardo), N3 (race inviti rete), N6 (bollo nel dovuto), N7 (gate stato_sdi su xml — potrebbe essere già chiuso da N5/N10, verificare). Se il censimento li trova critici, segnalarli a Francesco per la ratifica di scope — non assorbirli in silenzio.

## Azioni SOLO di Francesco

- Cambiare la password personale condivisa in chat il 17/07 (raccomandazione di sicurezza).
- Ratifica triage §A/§O (punto 3) · decisione calendario O2 (sessione dedicata admin) · O3 resta a fine sequenza.
