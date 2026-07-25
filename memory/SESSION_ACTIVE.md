# Sessione attiva — 26/07/2026 (verifica finale wave H + variante 6 nomi)
Worktree `redesign-parete-home` @ `a1c4fcb`. **3127 verdi / 19 skip · tsc 0 · build ok.**
Collaudo :3020 da riavviare sulla build corrente.

**Collaudo device Francesco (build 5ccc564): 4 punti su 5 PASS.** Tasto centrato · fondo unico ·
suoni · striscia panna SPARITA. La barra gesture NON è un difetto: in scheda di browser
quell'area è del browser. `display: standalone` → **da PWA installata** la pagina la copre.
🛑 Francesco deve riprovare **installando l'app da icona**.

**Chiusi oggi:** 1a TastoPiù (`*/` in un commento CSS) · 1b muro fino in fondo (+ round 2:
regola più specifica scartava il recupero) · fondo unico in 4 posti (`--bg`, `--ua-bg`,
`--adm-bg`, **manifest**) · variante 6 nomi studio · **guardia via A** (`74ca230`) ·
scala che girava due volte (`a1c4fcb`).

**Panel advisor** (UX · architettura · dati) su richiesta di Francesco:
`docs/design/decisions/2026-07-26-parole-categoria-panel.md`, base ricerca su **1.604 nomi reali**.
Ratificato: **via A** · campo «nome breve» **NON si fa** («per ora lascia perdere») ·
`dental` resta fuori · `studio_nome` intoccabile (è la denominazione in fattura elettronica,
verificato `generate-xml.ts:262`; legame indiretto alla DdC via `studio-members` a confronto esatto).

**Aperto:** le 2 parole nuove (`stomatologico`, `dentista`) NON aggiunte — commit separato, mai
ratificate. Nomi paziente: ratificato che il **wizard chiederà nome e cognome** (campo non
obbligatorio) — da progettare. Bottone oro: deferito alle ondate di migrazione.

**Poi:** T15 → T16 striscia → T17 chiusura + merge a parola di Francesco.
Verbale (LEGGE): `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` APPEND 26/07.
