# Un tema solo — decisioni di Francesco del 26/07/2026

**Spec attuativa:** `docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md`
**Assorbe:** voce **A5** del backlog tecnico
**Stato:** ratificate · tappa 1 in produzione (`03ec7595`)

---

## Le decisioni, nell'ordine in cui sono state prese

| # | Decisione | Contesto |
|---|---|---|
| D1 | **La barra di stato si fonde con l'app** — `#F4F0E7` in chiaro, `#171411` in scuro | Scelta fra: fondersi · restare rossa come firma · seguire la testata di ogni pagina. Motivazione: coerenza col fondo unificato del 26/07; il rosso era l'unica cosa rimasta fuori |
| D2 | **La pagina offline si allinea al fondo unificato**, versione scura inclusa | Aveva un terzo colore orfano (`#DDD8D3`) e **nessuna variante scura**. Scelta fra: allineare · lasciarla grigia · allineare solo il fondo e rimandare lo scuro |
| D3 | **Rollout in due tempi** per la barra | Scelta fra: due tempi · tutto insieme. Motivazione: è l'unico modo di sapere **chi comanda** quella barra, dato che la documentazione della piattaforma non lo dice |
| D4 | **Un tema solo:** l'app segue il telefono; per bloccarlo, **un'unica opzione in Impostazioni** | 🎯 **Decisione che ha ridefinito il lavoro.** Non richiesta da me: proposta da Francesco a metà sessione, dopo aver visto che il tema dell'app poteva divergere da quello del telefono. Toglie una regola invece di aggiungerne una |
| D5 | **Tutti gli altri punti di accesso al tema si bonificano e spariscono**, login compreso | Erano **sei** (testata · scheda lavoro · pannello profilo · login · amministrazione · catalogo DS), più i toast che seguivano il telefono per conto proprio |
| D6 | **Nessuna eccezione:** `blocked` e `billing`, oggi a tema fisso, passano sotto la regola unica | Scelta fra: nessuna eccezione · lasciarle fisse. ⚠️ Sono **UI nuova**: due superfici prendono una resa mai esistita → workflow §0B + gate estetico L2 |
| D7 | **L'area amministrazione rientra nella bonifica** | La sua memoria separata (`ua-admin-theme`) sparisce |

**Dove va l'opzione:** in **Impostazioni**, con tre scelte — *Automatico* (predefinita) · *Sempre chiaro* · *Sempre scuro*. Scartato il pannello del profilo: è dove si cerca il proprio account, non le preferenze dell'app.

---

## Decise dall'implementatore, con motivazione

- **`/ds-v3-catalogo` tiene il suo interruttore.** Serve a confrontare i componenti nei due temi ed è una pagina che l'utente non incontra mai. Eccezione **dichiarata**, presidiata dalla guardia come voce nominata — non un buco.
- **I toast passano sotto la regola unica.** `sonner.tsx:3` importa `useTheme` da `next-themes`, di cui non esiste alcun provider montato: seguivano il telefono, mai la preferenza. È una riga.

---

## Conseguenze accettate, dichiarate prima che si vedessero

1. **Splash chiaro anche in tema scuro.** Il manifest porta **un solo** colore, non sensibile alla preferenza (`w3c/manifest#975` ancora aperta). Si sceglie il chiaro perché `background_color` è già `#F4F0E7` e i due si vedono **insieme**, sullo stesso fotogramma. 🛑 Mai un terzo tono di compromesso: sarebbe `#DDD8D3` da capo.
2. **La tappa 2 non è annullabile in giornata:** il valore del manifest è cotto nel pacchetto installato e torna indietro solo quando Android lo rigenera.
3. **Chi aveva bloccato un tema si ritrova in «Automatico»**, perché il vecchio interruttore non offriva quella scelta: nessuno l'aveva mai potuta esprimere.
4. **Non è un lavoro di accessibilità.** Verificato: `#F4F0E7` → icone scure, 18,5:1; `#171411` → icone chiare, 18,3:1; il rosso attuale era già leggibile a 5,30:1. È coerenza visiva, e va motivata come tale.
5. **Non chiude la barra dei gesti in basso** (bug Chromium 40759522, non nostro) **né iOS**.
