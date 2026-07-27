# Sessione attiva — regole ratificate · guardie agganciate · CSRF passkey decisa (28/07/2026)

🛑 **PUNTO DI RIPRESA dell'ondata:** `docs/roadmap/2026-07-28-ondata-a-esecuzione-handoff.md`.
🛑 **Branch `ondata-a-denti-colore`**, repo principale. **Niente in produzione, mai mergiato.**

⚖️ **REGOLE DI METODO PERMANENTI** (`CLAUDE.md` §0C, «REGOLE DI PIANO»): **R-P1** blocco senza marchio
= NON provato · **R-P2** l'elenco dei file da aprire **non lo decide l'autore** · **R-P6** censimento su
ogni *identificatore* · **R-P4** abbozzo inerte + conteggio · **R-E1** un compito, un esecutore fresco ·
**R-E2** si riferisce, non si patcha. 🛑 **NON retroattive su T9-T13.** Unico innesto: **al T10 la
tabella di destinazione R-P6** — ogni nome che esce da `PATCHABLE_FIELDS` con scritto chi lo scriverà.

✅ **IN PRODUZIONE (merge `24474b5c` su main → CI verde → deploy Vercel ok → `/login` HTTP 200).**
Guardie agganciate al pre-commit: `check-csrf.sh` (0,33 s) e `guardia-reduced-motion.mjs` (4,6 s);
manuali per scelta le altre due. Tolte 104 righe di config morta. **`ondata-a-denti-colore` allineato
con main: i task T9-T13 committano sotto le guardie nuove** (verde anche sulla route nuova `/denti`).
⚠️ Nel registro del deploy «CI fallita — deploy saltato» è il **nome di un job saltato**, non un errore.
🔑 husky usa **`sh -e`** · ⚠️ **`.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit**
· 🔑 **bash 3.2 macOS:** array vuoto + `set -u` = «unbound variable» → idioma `${ARR[@]+"${ARR[@]}"}`.

🔐 **CSRF sull'accesso con passkey: CHIUSA** — esclusione con ragione scritta, zero voci sospese.
`isSameOrigin` dichiara di proteggere route **a cookie**, e quelle non ne usano; con `Origin` assente
ritorna `true`, quindi non ferma un attaccante vero. **Aggiungerla avrebbe spento l'allarme su 6 difetti.**
✅ **① CORRETTO E IN PRODUZIONE:** email normalizzata `trim().toLowerCase()` **server-side in entrambe**
le route (6 test, TDD col rosso letto: 3 rossi per asserzione + 3 di controllo).
🔴 **RESTANO CINQUE, riferiti e non toccati — ondata dedicata DOPO il wizard (deciso da Francesco):**
② consumo challenge **non atomico** e contatore anti-replay
**inerte** (4 credenziali su 4 con `counter=0`, misurato) · ③ `listUsers()` senza paginazione: al 51°
utente cadono fuori **i titolari** · ④ nessun filtro `deleted_at` all'accesso · ⑤ nessun rate limiting
· ⑥ enumerazione account. ⚠️ `RP_ID` fisso → la cerimonia **non è provabile in locale né su preview**.

📋 **AUDIT `CLAUDE.md` (28/07) — due contraddizioni chiuse:** 🛑 **MAI git worktree** (doppio
`package-lock.json` → 404 su tutte le route): il divieto è ora nella **FASE 5**, prima diceva il
contrario · **i ruoli sono CINQUE**, mancava `admin_sistema` (15 usi nel codice) — ora in §9, cioè nel
file **versionato**, perché `../CLAUDE.md` sta **fuori dal repo**. Barra di stato del progetto rimossa:
era rotta **e copriva quella globale funzionante**. I 5 difetti dell'accesso: **in coda alla ROADMAP**.

**ONDATA (a) — 8 task su 13.** **3453 test verdi · tsc 0 · eslint 0 · build ok · DB pulito (294 lavori,
0 denti).** **RESTANO:** T9 POST atomico · T10 sentinelle · T11 wizard · T12 form · T13 prove + FASE 7.
🛑 **T10, T11, T12 nello STESSO deploy** (`route.ts:259-264` scarta senza errore).

🔑 `node scripts/tmp/sql.mjs "<query>"` · `npx supabase db push --yes`.
