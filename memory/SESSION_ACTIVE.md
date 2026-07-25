# Sessione attiva — 26/07/2026 (verifica finale wave H, 2° rientro)
Worktree `redesign-parete-home` @ `a407512`. Suite **3079 verdi / 19 skip · tsc 0 · build ok**.
Collaudo :3020 riavviato sulla build corrente (guardia stili verificata).

**Chiusi:** 1a TastoPiù centrato (`5dd3166`, causa: `*/` nella prosa di un commento CSS) ·
1b muro fino in fondo (`8b2bc01` + round 2 `71c6a8b`: una regola più specifica scartava il
recupero — guardia nuova su OGNI regola con `padding` su `.ds-parete`) · fondo unico in tutta
l'app (`90f3940`, 3 posti: `--bg`, `--ua-bg`, `--adm-bg`) · ri-misura di 6 note di contrasto
scadute (`fc4c428`).

**🛑 APERTO — difetto 1b NON chiuso sul device:** Francesco vede ancora una fascia panna liscia
sotto la barra gesture. Sul banco headless il muro arriva a 0px dal bordo e la trama copre
l'ultima riga di pixel (misurato). Ipotesi da confermare: in Chrome-browser quella fascia è
dipinta dal BROWSER col fondo del documento (colore ora giusto, ma senza trama) — non
riproducibile in Playwright. **Attesa foto di Francesco** (pagina cassette a fondo scroll).

**Ratificato:** nomi lunghi = **variante 6** (prima un gradino di corpo, poi via le parole di
categoria). Francesco chiede di estendere la stessa logica ai **pazienti** → serve mockup:
lo step «parole di categoria» non esiste sui nomi di persona, va ridefinito (es. nome proprio
→ iniziale). Non ancora progettato.

**Ratificato:** i difetti di leggibilità NON si correggono ora — appuntati in ROADMAP dentro le
ondate che possiedono le pagine. Verifica di copertura fatta: le ondate coprono tutto; il
censimento in testa diceva 30 route, sono **37**; `/analytics` ha collocazione condizionale.

**Poi:** T15 chiudibile solo dopo 1b sul device → T16 striscia → T17 chiusura+merge a sua parola.
Verbale (LEGGE): `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` APPEND 26/07.
