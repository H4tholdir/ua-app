# Sessione attiva — CONSEGNA ZERO IN PRODUZIONE. Il prossimo passo è T1 dell'ondata (b) (30/07/2026)

🛑 **PUNTO DI RIPRESA: `docs/roadmap/2026-07-29-ondata-b-piano-v2.md`, e si legge §0 per prima.**
Cos'è stato fatto e perché: `docs/roadmap/2026-07-30-consegna-zero-piano.md`.

🚀 **CONSEGNA ZERO PUBBLICATA** — merge `ed286b0f` su `main` (42 commit, fast-forward, zero conflitti),
autorizzato da Francesco. **CI verde · CD verde · controllo di salute passato**, verificata a mano:
`/` → 307 `/login` · `/login` → 200 · `/api/pazienti` → 401.
**Z3** (`deb923a1`) generatore · **Z2** (`beb36862`) normalizzazione in scrittura · **Z1** (`e211cd94`,
`21bab021`, `bf009e2d`) il `23505` che diventa **409 di dominio**.
✅ **Il GATE del piano v2 §0 è SUPERATO: T1 può aprire il ramo dell'ondata (b).**

🔑 **Z1 è in produzione ma INERTE**, e va detto così: nessun indice unico sul codice esiste ancora
(è **T5**), quindi il suo ramo non può accendersi. **Non** scrivere «verificato in produzione».
🔑 **Z2 chiude due porte su quattro:** `scripts/seed-arturo-pepe.ts:334` e `supabase/seed.sql:73`
scrivono il codice col service client, saltando le rotte.

🔴 **PRIMA DI T5, dal piano v2 §9 — nessuna delle tre blocca T1:** riesegui **P2** *immediatamente* prima ·
**P3** · **P6-forma**. E restano **2 gate di mockup** (denti, colore) e **2 decisioni di prodotto**
(quando nasce la cassetta del wizard · la stringa della briciola).

🔑 **La lezione della giornata: tutti e tre gli esecutori hanno smontato un'affermazione del piano, e le
peggiori erano mie.** Un ritrovamento di un esecutore è una **segnalazione, non una prova** — ne avevo
copiato uno nel piano senza aprire il file, ed era falso.

✅ **37 decisioni** (D35 · D36 · **D37**, che corregge D36 dopo la misura della FASE 9).
🔴 **Otto voci aperte in fondo alla ROADMAP.** La grossa: **76 punti delle API rimandano il messaggio
grezzo del database al client** — G9 dichiarato in `CLAUDE.md` ma **senza nessuna guardia**.
