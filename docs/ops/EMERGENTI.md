# EMERGENTI — la coda delle diramazioni (PIPELINE-3 §3, D197)

Qui atterra, **nel momento della scoperta**, tutto ciò che emerge fuori mandato e non è né
EXPEDITE né FOLD-IN (la tabella delle soglie è in `docs/processes/PIPELINE-3.md` §3).
Il triage è timeboxed (10 min), SOLO a fine lavoro o al betting — mai a metà.

**Formato scheda** (una riga di tabella; il mini-brief deve bastare a una sessione che non ha
visto la scoperta):

| # | Scoperta il · durante | Sintomo e file | Criterio di done | Classe | CD3 | Stato |
|---|---|---|---|---|---|---|
| E1 | 04/08 · audit Fase 0 | **Supabase locale + prove RLS a due utenti non esistono.** `supabase/config.toml` da creare — `supabase init` mai eseguito, quindi `supabase start` oggi non parte; le migrations non ricostruiscono lo schema (tabelle fondative solo in `supabase/schema.sql`, fatto già verbalizzato in `docs/design/decisions/2026-07-04-rpc-integration-tests.md`); l'unico canale DB reale dei test (`tests/integration/helpers/pg-client.ts`) si connette come owner e BYPASSA la RLS; `tests/unit/rls-cross-tenant.test.ts` è dichiaratamente statico. Ordine d'attacco già misurato: baseline migrations → seed 2 lab/2 utenti (i nomi in `.env.test.example` esistono già, nessuno li consuma) → harness RLS → CI. **5-10 giorni** | `supabase db reset` produce uno schema identico al remoto (diff incollato) + prove RLS «il lab A non vede i dati del lab B» verdi in CI | FD (traguardo: prima del primo laboratorio vero) | 3÷10 sess. ≈ 0,3 → **niente sorpasso: a betting come voce P propria** | 🔴 aperta |
| E2 | 04/08 · audit Fase 0 | **`npm test` include le integration contrariamente a quanto il commento dichiara.** `vitest.config.ts:25-29` dice che `test` è limitato a `tests/unit`, ma `package.json` riga `"test"` è `vitest run` senza scope — regge solo grazie allo skipIf su `SUPABASE_DB_URL`. Riferito, non corretto (R-E2): quale dei due allineare lo decide Francesco | Commento e script dicono la stessa cosa (una riga di edit, da una parte o dall'altra) | INT (quickfix, impacchettabile) | 1÷0,5 = 2 → in coda | 🔴 aperta |
| E3 | 04/08 · audit Fase 0 | **`tests/unit/rls-cross-tenant.test.ts:10` rimanda a `tests/e2e/rls-cross-tenant.spec.ts` che NON è mai esistito** (era uno dei «progetti fantasma» P15, rimossi il 02/08). Il rinvio è un percorso morto in un test che si presenta come rete RLS | O il file nasce davvero (dentro E1), o il rinvio si corregge con la destinazione vera | INT — si chiude naturalmente con E1 | 1÷0,5 = 2 → in coda | 🔴 aperta |

**Regola del conteggio:** il numero di schede aperte deve restare **stabile**. Se cresce per
3 settimane di fila, il sistema è sovraccarico: si ferma la roadmap per uno slot di smaltimento.
Aging: una scheda non promossa entro 2 cicli di triage (~2 settimane) decade in
`docs/ops/EXPIRED.md` con una riga di motivo.
