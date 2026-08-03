# Sessione attiva — P31 è in produzione, si riparte da P30-a

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-03-p31-compito-9-verifica-handoff.md` (la **§0 per
prima**) · voci **P31 · P30-a · P30-b · P30** in `docs/roadmap/ROADMAP-UFFICIALE.md` · verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (D181-D188) · spec
`docs/superpowers/specs/2026-08-03-p31-due-numeri-per-il-cliente-design.md`.

✅ **PUBBLICATA (D188):** `main` = **`8c84df97`**, 24 salvataggi, nodo di unione esplicito.
📌 FASE 7 **sull'albero unito**: `tsc` **0** · `vitest` **4542 | 19** (394 file) · `next build` **0** ·
cinque guardie verdi. Lo stato del database era **già avanti** (colonna applicata col compito 1, D151):
il merge ha consegnato **solo codice**.

🔴 **La revisione finale di ramo ha trovato un difetto che i nove revisori di compito non potevano
vedere:** il foglio che chiede il cellulare **moriva al secondo tentativo** (tasto disabilitato per
sempre dopo un salvataggio riuscito). **La causa è una GIUNTURA, non una riga** — il foglio conserva lo
stato alla chiusura — e **tre dei cinque punti sfuggivano per caso**, non per progetto. ✅ Corretto e
provato con un rosso vero.

🛑 **CINQUE VOCI APERTE, dichiarate:** **P36** (il collegamento del portale — **una credenziale** —
mandato a un numero potenzialmente sbagliato) · **P35** (due difetti preesistenti del pannello di
modifica, uno è **accessibilità**) · **P34** (il foglio v3 dipinge un fondo diverso dalla sua spec, ed è
**l'unica ragione** per cui P30-bis non morde) · **P33** (la deriva di date blocca le migration fino al
**04/08 alle 12:00**) · **P32** (la guardia dei documenti perde un anello a ogni handoff — `misurato:`
già ricaduta a **4** documenti vivi).

⚠️ **Un vuoto dichiarato:** che cosa vede chi preme il tasto con un numero malformato — **serve un
telefono vero**. Il revisore finale l'ha giudicato compatibile con l'unione.

➡️ **PROSSIMO: P30-a** (la ricerca sull'anagrafica, chiesta da Francesco), poi **P30-b**, poi il **React
di P30** (D180). ❓ Restano **D-Q2** e **D-Q5**.
📎 **188** decisioni in **67** tornate; la prossima è **D189**.
