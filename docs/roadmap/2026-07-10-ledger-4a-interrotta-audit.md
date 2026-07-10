# Ledger SDD — Ondata 4a-server
Baseline: 366aff8 (main) · branch worktree-ondata-4a-server
Baseline test: 1129 passed | 4 skipped

Task 1: complete (commits 366aff8..82faf2c, review clean)
  Minor (per review finale): isStatoConsegnabile potrebbe essere type guard `stato is StatoConsegnabile`.
Task 2: complete (commits 82faf2c..6bbdd6b, review clean)
  Nota per Task 8: verificare nomi constraint (dichiarazioni_conformita_stato_check, ddc_lavoro_unique) sul DB live prima dell'apply (DROP senza IF EXISTS).
Task 3: complete (commits 6bbdd6b..b7a84d1, review clean)
Task 4: complete (commits b7a84d1..fc02c51, review clean)
  Minor: updated_at su fatture_outbox senza trigger auto — i writer devono settarlo a mano (il piano lo fa già ovunque; verificare in review finale).
Task 5: implementato (commits fc02c51..b859c2f) — APERTO finding Important PLAN-MANDATED (decisione Francesco al gate Task 8):
  claim annullo `ORDER BY created_at DESC LIMIT 1` su stati (in_attesa,in_lavorazione,emessa) può selezionare la in_attesa più recente ignorando una emessa coesistente → annullo concesso con fattura emessa. Reachability dipende da percorsi che riportano un lavoro a pronto fuori dall'annullo. Fix proposto dal reviewer: bloccare se ESISTE una entry emessa/in_lavorazione (priorità agli stati bloccanti) invece del LIMIT 1 per recency.
  Minor: filtro DdC esclude 'consegnata' → RAISE fail-closed se mai raggiunto (spec-verbatim, innocuo).
Task 6: complete (commits b859c2f..a2e599a + fix 62c69ac, re-review Approved)
  Fix applicato: INSERT fatture + cliente_denominazione/indirizzo '' (colonne NOT NULL, pattern batch/route.ts).
  Minor aperti per review finale: (1) snapshot cliente resta '' dopo emissione via draft (gap pre-esistente condiviso con batch, XML non impattato); (2) batch/route.ts:231 passa numero_lavoro ma la colonna non esiste nell'Insert type di fatture — verificare quando Task 16 esercita la RPC (possibile bug pre-esistente del batch).
Task 7: complete (commits 62c69ac..a710b98, review clean)
  Nota confermata dal controller: heartbeat scritto dall'endpoint cron (Task 16), non da outbox_tick — owner downstream esiste nel piano.
  Minor per review finale: request_id di net.http_post scartato (fire-and-forget, polish).
PROSSIMO: Task 8 GATE Francesco (apply 6 migration + Vault + env Vercel + regen types + runbook). Decisione aperta Task 5 (claim annullo LIMIT 1 vs blocco su emessa esistente) da risolvere PRIMA dell'apply.
Task 5: complete (commits fc02c51..b859c2f + fix 422fd96, re-review Approved)
  Decisione Francesco: claim annullo con priorità stati bloccanti (emessa>in_lavorazione>in_attesa) — chiude il fail-open fiscale.
  Minor invariato: filtro DdC esclude 'consegnata' (fail-closed, spec-verbatim).
Task 8: GATE avviato con conferma Francesco (passo per passo). Pre-check migration list: 50/50 allineate + 6 nuove pendenti.

=== CAMBIO DI SCOPE (Francesco, 10/07) — ESECUZIONE 4a-server INTERROTTA al Task 8 ===
Modello 4a "emetti salvo rifiuto automatico via outbox+cron" RIFIUTATO da Francesco.
Nuovo requisito: alla consegna NON si fattura nulla in automatico. I lavori consegnati vanno in una LISTA per il DENTISTA (dottore committente), consultabile dal suo PORTALE, dove il dentista sceglie quali fatturare e quali no; la lista è stampabile e agganciata alla contabilità del dentista.
Motivo del conflitto: 4a emetterebbe anche su decisione_fatturazione='in_attesa' (nessuno ha ancora deciso) → contraddice "la fatturazione è decisione col clinico".
Già esiste in codice: campo lavori.decisione_fatturazione (in_attesa|fatturare|non_fatturare); GET /api/lavori/pronti-da-fatturare (lato laboratorio); PATCH /api/lavori/[id]/decisione-fatturazione (solo titolare/front_desk); fatturazione batch; contabilità clienti. MANCA: lato PORTALE DENTISTA (scelta + stampa).

STATO PROD DOPO IL GATE:
- 6 migration 20260710* APPLICATE al DB live iagibumwjstnveqpjbwq (additive/inerti, nessun codice app le usa: Task 9-18 NON scritti → nessun impatto utente).
- 2 cron job (outbox-emissione-tick, outbox-sorveglianza) SOSPESI via cron.unschedule (10/07, conferma Francesco). Zero job outbox residui.
- Vault e env Vercel: NON creati (gate fermato prima).
- Requisito sicurezza #3 (revoke net.*): no-op su Supabase gestito (net di proprietà supabase_admin, non revocabile senza superuser); mitigato perché net non è esposto da PostgREST.

PROSSIMA MOSSA: brainstorming (superpowers:brainstorming) per progettare il flusso "fatturazione decisa dal dentista dal portale" → nuova spec. Parti valide da riusare in qualsiasi modello: Task 2 (annullo→DdC annullata + unique parziale), Task 3 (fatture.lavoro_id), Task 1 (finestra ripensamento lab). Da riconsiderare/rimuovere: outbox/cron/pg_net (Task 4/6/7 e la parte outbox del Task 5).

=== AUDIT MULTI-ADVISOR (10/07, richiesto da Francesco) ===
3 advisor Opus (architettura, sicurezza, SRE): verdetto unanime "PRONTI A PROCEDERE con condizioni". Report completi nei transcript sessione.
CHIUSO M-1: il debito "batch/route.ts:231 numero_lavoro su INSERT fatture" era un FALSO POSITIVO (è il payload di risposta BatchResult, non l'INSERT — verificato dall'advisor architettura).
Verifica-dati SRE eseguita sul DB live: 0 DdC in stato bozza/firmata (premessa di neutralità confermata), 2 DdC totali (entrambe 'generata' o 'consegnata'), 0 fatture 'generata'.
Finding chiave da recepire in spec: B-1 emissione inline orchestrate.ts:263-313 ancora viva (Ondata 0 deve rimuoverla); B-2 batch non scrive fatture.lavoro_id (gate annullo sarebbe no-op) + cintura incluso_in_fattura; F1 pepper PIN; F2 spec cookie sessione; F8 disabilitare pg_net in Ondata 0; I-1 ordine DROP nella pulizia (outbox_claim_batch ha dipendenza rowtype) + DROP esplicito vecchia firma consegna_finalizza_atomica; I-2 PATCH clienti è blocklist, va convertita ad allowlist; I-3 portale_accessi manca lavoro_id/dettaglio (migration additiva); I-5 POST proposta single-statement; SRE-1 BLOCCANTE merge dei 6 file migration su main (drift history/main); M-2 costanti outbox orfane da rimuovere; M-3 riapertura decisione azzera proposta.
Attenzione merge: Task 1 ha già portato il banner annullo a 10 min ma la route di prod resta a 5 min → mergiare include il mini-fix della route (FINESTRA_ANNULLO_MS) o si crea mismatch UI/server in prod.
