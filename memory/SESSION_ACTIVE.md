# Sessione attiva — P17 è in produzione, e comincia una notte di lavoro autonomo

🚪 **PUNTO DI RIPRESA: `docs/roadmap/2026-08-02-tarda-notte-p17-in-produzione-handoff.md`** — per intero.
📅 **TERZO handoff del 2 agosto**, dopo `-p7-...` e `-sera-p17-...`. Si chiama «tarda-notte» perché ordinato
per nome deve venire **dopo** gli altri due (`p` < `s` < `t`): «notte» sarebbe finito primo.

🚀 **P17 È IN PRODUZIONE.** `main` = **`fdf90dac`**, CI e CD verdi due volte. Verificata su `uachelab.com`:
1 bottone e **0** collegamenti verso `/dpa` nella card · `--brd-cmd` = `#6b5c51` chiaro / `#928778` scuro ·
documento scaricato **dalla produzione** → **`DPA-2026-0001.pdf`** integro · **nessun numero bruciato**.
🔑 Il nome del file è provato **sui TRE motori** (Chromium · Firefox · **WebKit**).

🎯 **Il gate estetico ha trovato 3 difetti su un codice già verde e già dichiarato finito**, e le **quattro**
cose rimandate sono state raccolte tutte: bordo dei comandi in scuro (erano **quattro** comandi, non tre) →
corretto col token nuovo `--brd-cmd`, **chiaro invariato** · altezza 34 → **40** (**D167**) · fondo scuro del
«guasto» **deferito col numero** · «Ricarico…» in `role="alert"` → `aria-atomic="false"`.

🌙 **STANOTTE SI LAVORA DA SOLI FINO ALLE 07:00 (D168):** ① i difetti che non chiedono una scelta di Francesco
— **P15** (le reti di prova che puntano nel vuoto, per prima) · **P9** (il fuso orario dei PDF) · **P23** ·
**P18** — ② poi **P30 fino ai mockup e agli scatti**, e ci si ferma lì: la firma di Francesco sta in mezzo.
🛑 **D169: niente si pubblica di notte** — nemmeno il salvataggio locale del verbale, già fermo apposta.
🛑 Niente scritture sul database. Se serve una decisione: **si scrive la domanda e si passa alla voce dopo**.
🛌 Il Mac è tenuto sveglio da un `caffeinate` a mano: **va spento a fine notte** (`pkill -x caffeinate`).

📌 `tsc` **0** · `vitest` **4439 | 19** (379 file) · `next build` **0** · due guardie verdi.
📎 **169** decisioni in **58** tornate; la prossima è **D170**.
