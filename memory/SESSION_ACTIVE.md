# Prossima priorità: B20 — PSUR/PMS differenziato per classe di rischio (07/07/2026)

Blocker normativo aperto (scoperto 05/07 durante ricerca B17). `src/app/(app)/qualita/psur/page.tsx` e `src/app/api/qualita/psur/route.ts` trattano l'obbligo come "PSUR" generico unico — ma MDR distingue: Classe I → **PMS Report** (Art. 85, nessuna cadenza fissa, NON si chiama PSUR); Classe IIa → **PSUR** (Art. 86, biennale); Classe IIb/III → **PSUR** (Art. 86, annuale). Correzione normativa già in `ANALISI/17_adempimenti_lab_2026.md` §1.4, mai propagata al codice. Verificato in questa sessione: zero riferimenti a `classe_rischio` in entrambi i file — la pagina mostra sempre "PSUR" con alert annuale, indipendentemente dai dispositivi del laboratorio.

**Nessun piano dettagliato esiste ancora** — richiede prima design (query aggregazione per classe su `lavori.classe_rischio`, UI, decisione su laboratori con classi miste). Prossimo step in nuova sessione: `/superpowers:brainstorming`, poi FASE 3 (validazione architetturale, BP-2 CLAUDE.md) prima di scrivere il piano.

Dettaglio completo: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione "B20" (~riga 178). Altri Blocker aperti dopo B20: B6 (Service Worker offline, fix rapido), B14 (`tecnici.compenso_base` ambiguo), B16 (query `/ordini` non supportata).
