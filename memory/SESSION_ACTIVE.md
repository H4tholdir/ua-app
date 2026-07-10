# SESSION ACTIVE — 10/07/2026 (notte, 2)

**Base pulita pre-Ondata 1 COMPLETATA e deployata** (`28c856e`+`02b6a3e` su `main`, CI+CD verdi): niente più leak di messaggi interni in `/api/fatture/[id]/xml` (2 test TDD; `pec_errore` deliberatamente invariato — azionabile); embed `ddc` morto rimosso dai 3 generator PDF (test statico ora vincola l'ASSENZA); refusi orchestrate.ts sistemati (TODO stale + rinumerazione Step); `launch.json` committato. Suite 1168 pass, review «Ready to merge» zero finding.

**Deliberatamente NON toccati (posizioni motivate, in MEMORY):** buco numerazione su draft ripulito (strutturale, P2-5); matrice DdC senza 'consegnata' (fail-closed È il comportamento giusto); advisor RLS helper/estensioni public (sessione hardening dedicata — dominio critico); Leaked Password Protection = click di Francesco in dashboard Auth.

**PROSSIMA SESSIONE:** piano **Ondata 1** via `superpowers:writing-plans` dalla spec fatturazione concordata. Nel design: I-2 (PATCH clienti → allowlist PRIMA delle colonne portale) + decisione «lavoro fatturato via xml route resta incluso_in_fattura=false → lista Da fatturare lo mostrerebbe» (derivare da fatture.lavoro_id o claim nel percorso xml). Gate mockup obbligatorio.
