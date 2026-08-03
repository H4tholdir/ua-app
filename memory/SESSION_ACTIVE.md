# Sessione attiva — P30-a censita, il panel ha smontato D195, e un colore mai guardato

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-03-p30a-panel-e-colore-handoff.md` — la **§0 per prima**.

🔴 **LA §0 IN UNA FRASE: ho cambiato un colore del design system e non l'ho mai guardato a schermo.**
**D193** ha schiarito `--faint` in tema scuro (`#928778` → `#9A8F80`) — tocca **l'etichetta di ogni campo
dentro ogni foglio v3** — ed è verificata **solo coi numeri**. `provato:` `grep -rl "9A8F80"
docs/design/screenshots/` → **nessuno scatto**. FASE 9/9b **non percorse**. ⚠️ Il margine da `--muted` è
**0,77**: stretto, e **a occhio non l'ha visto nessuno**. 🔑 Stessa forma del difetto §0① dell'handoff
precedente: **due sessioni di fila**. ➡️ **Non pubblicato: si è in tempo a ritoccare.**
🔴 Più **D179** (~20 prove a schermo che nessuno lancia) **rimandata per la terza volta**, e
`guardia-stili-collaudo` **NON misurata** (vuole il server acceso — ed è proprio quella che direbbe
qualcosa sul colore).

✅ **`main` = `0db6e519`**, albero **pulito**, 🛑 **2 salvataggi DA PUBBLICARE**.
📌 **Misurato in chiusura:** `tsc` **0** · `vitest` **4542 passate | 19 saltate** (394 file) ·
`next build` **uscita 0** · guardia documenti **verde a 23** · reduced-motion verde.

✅ **Fatto:** §0① precedente chiusa (scatti del pannello approvati, **D190**) · schede consulenti
generiche disattivate (**D189**) · **D-Q5 chiusa** (D193+D194) · **P30-a censita** (sette forme reali di
cliente, una sola modellata) · **primo panel secondo D189**, tre lenti dichiarate nel verbale, **nessuna
approva** · riformulazione di Francesco → **D196**: «*è la forma giuridica a decidere se UÀ chiede chi ha
prescritto*».

🆕 **QUATTRO VOCI NUOVE:** **P38** (`generate-ddc.ts:156` scrive `prescrizione_caratteristiche: null`
cablato → elemento **obbligatorio** vuoto su **ogni DdC mai emessa**; tocca la **qualificazione del
dispositivo**) · **P39** (**22 clienti su 39** senza P.IVA né codice fiscale → **scarto SDI 00417
certo**) · **P37** (58% delle DdC stampa una ragione sociale come prescrittore) · **P40** (copia al
paziente · conservazione oltre la cessazione · **DPR 633/72 abrogato dal 01/01/2027**).

➡️ **ORDINE (delega di Francesco, «decidi tu»):** ① gli scatti di D193 ② **P38 e P39**, gli unici che non
dipendono da scelte di disegno ③ P30-a con **D191+D196**, poi P30-b, poi il React — e nella stessa ondata
il **Passo 1 del wizard** (due dentisti dello stesso studio danno riquadri identici).
❓ Resta **D-Q2**. 📎 **196 decisioni in 71 tornate**; la prossima è **D197**.
