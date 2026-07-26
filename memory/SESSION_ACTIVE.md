# Sessione attiva — Ondata «Redesign parete/home» CHIUSA e MERGIATA (26/07/2026)

**RIPRESA: `docs/roadmap/2026-07-27-post-ondata-handoff.md`** — leggilo per primo.

T16 (striscia) e T17 (chiusura) completi, merge in `main` fatto su via libera esplicita di
Francesco. Ramo `worktree-redesign-parete-home` @ `ca913236`, 175 commit.
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

## 🛑 RIPRESA: `docs/roadmap/2026-07-26-collaudo-pwa-installata-handoff.md`

Francesco ha **installato la PWA e collaudata** dopo il deploy. Quattro punti aperti, tutti scritti
lì: (1) la linguetta «LE CASSETTE» sta stretta — la voce 52 del backlog era «cosmetica, da
confermare a vista» ed è **scaduta**: lui l'ha vista e non gli va bene; (2) 🛑 **la barra dei gesti
è un difetto vero anche da PWA installata** — il verbale che la dava per «NON un difetto» è
SBAGLIATO e va corretto, non ereditato; accertato nel codice che `theme_color` è `#D90012` fisso in
`manifest.json` **e** in `layout.tsx:28`, quindi non segue né il fondo unificato né il tema; da
misurare sul device installato prima di scrivere codice; (3) **proposta di Francesco: un centro
notifiche vero**, dove poi spostare la striscia — da progettare col percorso GRANDE, non ratificata;
(4) chiesto se restava lavoro incompiuto: **no**, 0 bloccanti, 30 rimandati con motivazione nel
backlog (tranne la 52, ora da fare).

**Poi, già in coda:** nome+cognome paziente nel wizard, percorso BP-2 pieno.
