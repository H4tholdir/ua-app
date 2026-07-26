# Sessione attiva — «un tema solo» CHIUSA (26/07/2026, notte)

✅ **Tappa 3 mergiata e in produzione.** Merge `e42601b8`, CI verde, CD verde, verificato su
`uachelab.com`. **Le tre tappe di «un tema solo» sono tutte online.**

Da **sette** posti con **quattro** regole a **uno**: Impostazioni → Aspetto → Tema
(*Automatico* · *Sempre chiaro* · *Sempre scuro*). tsc 0 · vitest **3364 verdi / 19 skip** ·
build ok · QA **18/18** + prova dal vivo con Francesco dentro l'app.

**Due cose che restano aperte e vanno lette prima di toccare quelle zone:**
1. 📌 **D6-bis** — l'approvazione di `blocked`/`billing` è **condizionata** alla revisione
   nell'ondata **F2 «accessi»**. Se F2 cambia, **decade**.
   (`docs/design/decisions/2026-07-26-un-tema-solo.md`)
2. ➕ **Token secondari v2.3 in tema scuro sotto soglia** (`--t3` 2,24:1, `--t2` 4,45:1):
   riguarda **ogni** pagina legacy in scuro, non solo Impostazioni. Appuntato a **F1** nella
   sezione «difetti di leggibilità» della roadmap. Tamponata solo la frase di stato.

**Prossimo (roadmap):** nome+cognome del paziente nel wizard (sei proposte disegnate, in attesa
della scelta di Francesco) · linguetta stretta · centro notifiche **ultimo**.

⚠️ Nel worktree il dev server **non parte** (doppio lockfile → radice sbagliata; il symlink di
`node_modules` manda Turbopack in panico). Via d'uscita: ramo di sola verifica nel repo
principale sullo stesso commit. Dettaglio in MEMORY.md voce 48.
