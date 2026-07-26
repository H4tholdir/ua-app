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
**Prossimo:** verifica di uachelab.com dopo il deploy → prova della PWA installata da icona
(decisione di Francesco) → nome+cognome paziente nel wizard, percorso BP-2 pieno.
