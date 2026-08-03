# Sessione attiva — P31 è in produzione, e due cose non sono state consegnate

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-03-sera-p31-in-produzione-handoff.md` — **la §0 per
prima**.

🔴 **LA §0 IN UNA FRASE: due cose sono state preparate e MAI portate a Francesco.**
① I **sei scatti del pannello di modifica** esistono (`docs/design/screenshots/2026-08-03-p31/pannello-modifica-cliente-*.png`)
e nessuno gliel'ha mostrati — quel pannello **cambia** e la sua veste **non è mai passata da un disegno
approvato** (D186 copriva solo wizard e foglio della consegna). ② **D179** («in CI solo le prove
pubbliche») è stata **ratificata stamattina e mai eseguita**: `provato:` `grep` sui flussi di lavoro →
le prove a schermo **non girano in nessuna macchina automatica**.

✅ **P31 IN PRODUZIONE (D188):** `main` = **`dcd727f1`**, albero pulito, **0 da pubblicare**.
📌 **Misurato in chiusura:** `tsc` **0** · `vitest` **4542 passate | 19 saltate** (394 file) ·
`next build` **0**, 172 rotte · cinque guardie verdi · verificato **sul sito vero**.

🔑 **La lezione che vale per il codice futuro:** un elenco «completo» ha sbagliato **cinque volte**,
sempre perché si cercava **per NOME** (di file, di funzione) invece che **per COMPORTAMENTO**. E il
difetto peggiore stava **FRA i compiti**, non dentro: nove revisori l'avevano approvato, l'ha trovato
solo la revisione **di ramo**.

🛑 **Cinque voci aperte:** **P36** (il collegamento del portale — **una credenziale** — a un numero
potenzialmente sbagliato) · **P35** (due difetti preesistenti del pannello, uno è **accessibilità**) ·
**P34** (il foglio v3 dipinge un fondo diverso dalla sua spec, ed è **l'unica ragione** per cui P30-bis
non morde) · **P33** (la deriva di date blocca le migration fino al **04/08 alle 12:00**) · **P32** (la
guardia perde un anello a ogni handoff). ⚠️ Più il **vuoto dichiarato**: serve **un telefono vero**.

➡️ **PROSSIMO: P30-a** — la **ricerca** sull'anagrafica del cliente, chiesta da Francesco. Poi
**P30-b**, poi il **React di P30** (D180). ❓ Restano **D-Q2** e **D-Q5**.
📎 **188** decisioni in **67** tornate; la prossima è **D189**.
