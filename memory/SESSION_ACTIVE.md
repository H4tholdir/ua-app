# Sessione chiusa — «Un tema solo, e la barra lo segue» (26/07/2026)

**🔚 PUNTO DI RIPRESA: `docs/roadmap/2026-07-26-tema-unico-handoff.md`** — leggilo per primo.
Sostituisce `2026-07-26-chiusura-collaudo-pwa-handoff.md`, di cui restano validi il punto 1
(linguetta stretta) e il punto 3 (centro notifiche, ULTIMO).

**Dettaglio pieno:** voci **45**, **46**, **47** di `MEMORY.md`.

✅ **Striscia panna confermata sparita sul device** (voce 44 chiusa).
✅ **Tappa 1** (`03ec7595`) — la barra di stato segue il tema **dal vivo**. **Prova sul device
SUPERATA**: chiusa empiricamente la lacuna §3.3 (il meta `theme-color` **è** onorato nelle PWA
installate su Android, anche mutato a runtime).
✅ **Tappa 2** (`850e3f26`) — colore d'avvio e pagina offline seguono il fondo, con guardia.
Suite **3319 verdi / 19 skip** · tsc 0 · verificato live su `uachelab.com`.
✅ **I due appunti del collaudo chiusi come conoscenza** (ricerca §9): **nessuno dei due è nostro**,
e si chiuderanno **entrambi con la stessa correzione** di Chrome (edge-to-edge per PWA installate).
🛑 Quel giorno si accendono anche i **28 `safe-area-inset-bottom`** e manca il padding in alto: da
preparare **prima**.

🔨 **DA FARE — tappa 3, la regola unica.** Piano: `docs/superpowers/plans/2026-07-26-tappa-3-un-tema-solo.md`
(7 task). **Task 1 fatto** (`1fcbcac6`), **si riparte dal Task 2**.
🛑 **Piano e Task 1 vivono SOLO sul ramo `worktree-un-tema-solo`** (`.claude/worktrees/un-tema-solo`,
2 commit avanti su `main`), non su `main`.
⚠️ Un worktree nuovo nasce **senza `.env.local`/`.env.test`**: senza copiarli `next build` fallisce.
