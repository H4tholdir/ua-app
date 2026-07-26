# Sessione attiva — «Un tema solo, e la barra lo segue» (26/07/2026, sera)

✅ **Francesco ha confermato sul suo telefono: la striscia panna è sparita.** Punto 2 del collaudo
chiuso in entrambe le metà. Voce 44 di `MEMORY.md` chiusa.

🔨 **IN CORSO — ramo `worktree-un-tema-solo`** (`.claude/worktrees/un-tema-solo`), 5 commit.
⚠️ Il worktree nasce **senza `.env.local`/`.env.test`** (non tracciati): senza copiarli dal repo
principale `next build` fallisce su `/api/admin/labs` via Stripe. Già copiati.

**Spec:** `docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md` — approvata.
Due invarianti: il tema è uno solo (segue il sistema salvo blocco esplicito, in **un** punto:
Impostazioni); la barra di stato è il fondo della superficie corrente. **Assorbe la voce A5.**

**Piano:** `docs/superpowers/plans/2026-07-26-tappa-1-meccanismo-barra-di-stato.md`.
**Tappa 1 IMPLEMENTATA e verificata:** nuovo `src/design-system/colore-barra-sistema.ts` (colori
derivati dai token v3, upsert sui meta) · `ThemeInitializer.tsx` esporta `SCRIPT_TEMA`, imposta la
barra e osserva `data-theme` · `layout.tsx` non dichiara più `themeColor`.
**tsc 0 · vitest 3306 verdi / 19 skip · next build ok · nessun `<meta theme-color>` statico
nell'HTML emesso** (il tag lo crea solo lo script).

🛑 **PROSSIMO PASSO — serve il via libera di Francesco:** merge su `main` + deploy, poi la **prova
sul suo device** (Task 5 del piano). L'osservazione decisiva è **premere l'interruttore del tema DA
DENTRO L'APP, mai dal login** (lì il sole/luna non scrive `data-theme`: non muoverebbe nulla per
costruzione). Non giudicare dallo splash: in tappa 1 è ancora rosso per definizione, perché
`manifest.json` non è stato toccato — ed è ciò che rende la prova a variabile singola.

**Poi:** tappa 2 (manifest + `offline.html` + guardia) · tappa 3 (tre stati `ua-tema`, bonifica dei
5 punti di accesso al tema, UI in Impostazioni con mockup §0B).
