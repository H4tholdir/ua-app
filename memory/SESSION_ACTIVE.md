# Sessione attiva — punto di ripresa

🚪 **PUNTO DI RIPRESA — leggi prima questo:** `docs/design/screenshots/2026-08-06-tinte/README.md` — **la §2 per prima** (il difetto trovato dal collaudo).

**Stato (06/08/2026, 10:05):** ramo **`tinta-scheda-t7`**, ⛔ **NON pubblicato** (hash e numero di
salvataggi si leggono con `git log`). `main` = `affec7ae` — in produzione solo **T1-T6**.

✅ **Fatto oggi:** **D260** — il rilievo aperto (`route.ts:553`) è **chiuso su entrambi i gemelli**. La
premessa che l'handoff aveva messo in dubbio **reggeva**, per il verso opposto: le mezze coppie sono due
e vanno al contrario, il dubbio guardava quella sbagliata. Una regola sola: comanda il **codice**, la
chiave secondaria orfana si butta dal corpo e la coppia salvata non si tocca.

🔬 **Collaudo a schermo FATTO** (§0②, il primo mai fatto sulle tinte): tinta messa dall'app → riletta
**dalla banca dati** → vista sulla scheda → cambio di tipo con l'avviso «ti ho tolto la tinta». Il ramo
**D117 si è acceso per la prima volta**. «Glitter multicolore» **non sfasa la riga**.

🔴 **Difetto trovato e RIFERITO, non corretto (R-E2):** l'avviso è `position:absolute` e **copre il campo
«Priorità»** (`LavoroFormClient.tsx:428-450`; misurato: etichetta coperta per intero). Preesistente. Cambia
l'aspetto → si apre col suo **gate L2**. **Aspetta una decisione di Francesco.**

🟡 **Restano:** il **gate estetico L2** su due superfici (3 viewport × 2 temi — il collaudo ne copre 1×1 e
**non lo sostituisce**) · **T9** poi il merge · gate L2 arretrato del wizard · igiene (32 rami,
`.superpowers/sdd/`) e **riordino memoria** (D257) **dopo T8/T9**.

📌 **Misurato:** `verify:full` **uscita 0** · **5064 passate | 19 saltate** (428 file).
📎 260 decisioni in centoquattro tornate; la prossima è **D261**.
