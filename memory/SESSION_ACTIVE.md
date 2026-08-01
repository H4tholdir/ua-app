# Sessione attiva — D121: il passo del wizard aspetta il wizard

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-03-tinte-manufatto-handoff.md`** — la sua §0 ③ è **CHIUSA da
D121**; restano aperte ① (eseguire il piano con R-E1) e ② (il §6-bis della DdC mai percorso in produzione).

🧭 **Decisa D121, zero righe di codice.** Il passo della tinta **esce da D42**: l'ondata chiude con **due
superfici** (pagina di modifica + scheda in sola lettura); il passo nasce nell'ondata delle schermate del
wizard, accanto a denti · colore · foto · cassetta. **D112 e D118 emendate per RINVIO.** Il piano
`docs/superpowers/plans/2026-08-03-tinte-manufatto.md` non è più «parte 1»: è **D42 per intero**, 9 task.

🔑 **L'ha prodotta un'obiezione di Francesco** («*stiamo ragionando su com'è adesso, non su come l'abbiamo
progettata*»): la spec dell'ondata (b) §4 dice che il blocco «Se vuoi, aggiungi» del passo paziente
**sparisce**. Un panel 3× ha smontato la strada «anticipa il solo passo» (dots cablati a tre, `v:2` già
prenotata dalla spec (b) §7, ~20 prove rotte).

🔴 **Due fatti nuovi:** ① la riga «Colore — es. A2» compare per tutti e **38** i tipi (25 col colore dentale
+ 3 con tinta + 10 senza) e per un paradenti il valore digitato viene **scartato dal server**
(`PassoPaziente.tsx:91-98` · `crea-lavoro.ts:386`); ② **l'ondata (b) è
chiusa a metà** — in produzione solo l'album foto, le schermate del wizard non sono partite. Roadmap voce 1
corretta.

🔎 **Poi AUDIT DEI DOCUMENTI, round 1** (chiesto da Francesco): il difetto della (b) **non si ripete** — (a)
14/14 · cassette 9/9 · parete/home 12/12 · accenti 10/10. **Sei cose aperte**, la più grave è la **nuova voce
10**: il DPA promette «almeno 10 anni» mentre la cancellazione fisica è in produzione (era **D62**, decisa e
mai eseguita). Altre in **AUD-1…AUD-5**. Referto: `docs/roadmap/2026-08-03-audit-documenti-referto.md`.

➡️ **Prossimo passo — lo decide Francesco fra:** ① la **voce 10** (il DPA: piccola, tocca un documento a
valore legale) · ② **Task 1** del piano D42, ramo `tinte-manufatto` **nel repo principale** (🛑 mai un
worktree), R-E1 · ③ le **due regole nuove per la guardia** (referto §3) · ④ il **round 2** dell'audit
(le 120 decisioni non ancora provate).

📎 Verbale: tornata **38**, `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centoventuno**
decisioni. La prossima è **D122**.
