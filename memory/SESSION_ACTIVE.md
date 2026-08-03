# Sessione attiva — D189-D193 fatte, e la B ha scoperto di curare un altro difetto

🚪 **PUNTO DI RIPRESA:** `docs/roadmap/2026-08-03-p30a-censimento-anagrafica-referto.md` — la **§5**
per prima (la causa unica). Verbale delle decisioni: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (**D189-D194**).

✅ **D190** §0① chiusa (i sei scatti approvati) · ✅ **D189** schede consulenti disattivate (panel con
mandati su misura, **lente dichiarata nel verbale**) · ✅ **D191** il cliente **può essere un'entità**,
qualsiasi forma giuridica · ✅ **D192** il prescrittore ha voce propria → **P37 aperta**.

🔴 **P37 — il ritrovamento grosso di P30-a.** `misurato:` **172 lavori vivi su 295 (58%)** stampano sulla
DdC come prescrittore una **ragione sociale**. Catena: `generate-ddc.ts:146-147` ricade su
`cliente.cognome+nome` (`richiedente_nome` pieno in **1/295**) e **10 clienti su 39** hanno un'insegna
nei campi persona. ⚖️ **Francesco aveva ragione:** l'Allegato XIII punto 1 nomina **persona E, se del
caso, istituzione sanitaria** — **due caselle unite da «e»**, non un'alternativa. 🛑 **Quindi il rimedio
non è allargare il campo: è averne DUE** — oggi UÀ ne ha uno e per l'istituzione nessuno.
⚠️ **Non verificato:** quando scatta il «se del caso» · testo letto su riproduzione secondaria perché
**EUR-Lex si tronca prima degli allegati** (D125 vuole il consolidato: rilettura dovuta).

✅ **D193 — opzione B ESEGUITA:** `--faint` scuro **#928778 → #9A8F80** in **3 posti**
(`v3/tokens.ts:15` · `ds-v3.css:57` · spec §3). 🛑 **NON toccato `globals.css:192`**: stesso hex ma è
`--brd-cmd`, altro token — trovato cercando **per valore**, non per nome.
📌 `misurato:` prima 5,21/4,75/**4,25❌** · dopo **5,78/5,28/4,72✅** su `--bg`/`--card`/`--elv`, e 0,77
sotto `--muted` (gerarchia salva). Script: `scripts/tmp/dq5-contrasti.ts`.
📌 **FASE 7 rifatta:** `tsc` **0** · `vitest` **4542 passate | 19 saltate** (394 file) · `next build`
**uscita 0** · guardia documenti **verde a 7** · reduced-motion verde.
⚠️ `guardia-stili-collaudo` **NON MISURATA** — vuole il server acceso.

🔴 **DOMANDA APERTA → D194:** l'esecuzione ha scoperto che **la B non tocca il difetto degli scatti**.
Le etichette del pannello sono **`--t3` v2.3** = `#5A5652` (`globals.css:191`), `misurato:`
**2,52/2,30/2,06 — fallisce ovunque**. E il **4,25** della domanda **oggi non morde**: `Sheet.tsx`
dipinge `--card` (4,75, passa); il 4,25 arriva solo il giorno di **P34**. ➡️ **Estendere la B a `--t3`
scuro, o lasciarlo a P16/D134?**

➡️ **POI: P30-a prosegue** con D191 (forma del cliente) + il vincolo dei due campi del prescrittore.
🛑 **CORRETTO un limite inventato:** P33 blocca solo `db push`; **le migration si fanno con D151.**
📎 **193 decisioni in 70 tornate**; la prossima è **D194**.
