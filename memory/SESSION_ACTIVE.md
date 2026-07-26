# Sessione attiva — Ondata «Redesign parete/home» CHIUSA e MERGIATA (26/07/2026)

**RIPRESA: `docs/roadmap/2026-07-26-collaudo-pwa-installata-handoff.md`** — leggilo per primo.
È l'handoff **più recente** ed è l'unico punto di ripresa: prima questo file ne dava due, e quello
che compariva per primo (`2026-07-27-post-ondata-handoff.md`) era il più vecchio dei due. Quello
resta utile come storia dell'ondata, non come punto di partenza.

⚠️ **Poi leggi `docs/roadmap/2026-07-26-allineamento-documenti.md`** (verbale del 26/07): i documenti
di questo progetto sono stati riallineati allo stato vero perché **le prime righe che si leggono a
ogni avvio dicevano il falso**. Lì c'è cosa è stato corretto e cosa c'era scritto prima. In breve:
la barra dei gesti **è** un difetto (la conclusione contraria è smentita) · l'osservazione sulla
linguetta riguarda lo stato `piena`, **non** la voce 52 · il rosso `#D90012` sta in **tre** posti ·
**si misura su `main`, mai nei worktree** (sono indietro) · il centro notifiche va **ultimo**.

T16 (striscia) e T17 (chiusura) completi, **merge in `main` fatto e pubblicato** su via libera
esplicita di Francesco (merge `5504a20a`, `main` a `8c482e90`, CI e deploy verdi, `uachelab.com`
verificata). Ramo `worktree-redesign-parete-home` fermo a `ca913236`, 175 commit: è storia.
**Suite 3283 verdi / 19 skip · tsc 0 · build ok** — ri-verificati dal controller, non riferiti.

**Fatto:** review whole-branch in 5 aree · triage di 69 rilievi → **0 bloccanti** · review delta
dei commit di fix · QA browser 390/768/1280 × light/dark (134 catture) · **gate estetico L2 PASS,
0 ❌**.

**4 difetti gravi trovati col browser e chiusi**, nessuno visibile dalla suite verde: linguetta
«LE CASSETTE» su desktop con URL desincronizzato · overlay lasciati dipinti sopra un'altra stanza
dal tasto indietro · con «Riduci movimento» la linguetta fuori schermo per sempre · la navigazione
mangiata dal ritorno automatico in **10 punti**. Due sono diventate regole permanenti
(`ua-app/CLAUDE.md` §9: mai `router.push` da dentro un overlay v3; sotto reduced motion cambia la
transizione, mai il target).

**Decisioni di Francesco (26/07):** nomi paziente → ondata separata dopo il merge · la striscia
nomina il primo allarme e conta gli altri (la forma del 24/07 è superata: la sua CTA riportava alla
home) · il numero del lavoro non si taglia mai · «allunga la pancia della cassetta, non toccare la
finestrella» · «Salva il nome/il colore» restano (eccezione a verbale) · righe del muro avvicinate
da 768 in su.

**Backlog tracciato:** `docs/roadmap/2026-07-26-backlog-ondata-parete-home.md`

---

## 🛑 COSA C'È DA FARE — dall'handoff di ripresa qui sopra

Francesco ha **installato la PWA e collaudata** dopo il deploy. Quattro punti aperti, tutti scritti
lì: (1) la linguetta «LE CASSETTE» sta stretta **nello stato pieno** — la deviazione vera è che il
mockup ratificato le dà 18px di respiro sopra e sotto il contenuto e il codice ne dà 0 (la voce 52
del backlog parla invece dello stato «filo» e resta aperta a parte); (2) 🛑 **la barra dei gesti
è un difetto vero anche da PWA installata** — il verbale che la dava per «NON un difetto» è
SBAGLIATO e va corretto, non ereditato; accertato nel codice che `theme_color` è `#D90012` fisso in
`manifest.json`, in `layout.tsx:28` **e in `public/offline.html:6`** (tre posti, non due); da
misurare sul device installato prima di scrivere codice, dopo ricerca e panel di advisor come ha
chiesto Francesco; (3) **centro notifiche: accettato come direzione, ma ULTIMO** — sua decisione del
26/07, «alla fine della roadmap che abbiamo»; (4) chiesto se restava lavoro incompiuto: **no**,
0 bloccanti, 30 rimandati con motivazione nel backlog.

**Poi, già in coda:** nome+cognome paziente nel wizard, percorso BP-2 pieno.
