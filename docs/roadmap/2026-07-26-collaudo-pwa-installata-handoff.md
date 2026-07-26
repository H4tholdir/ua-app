# Handoff — Collaudo della PWA INSTALLATA (26/07/2026, dopo il merge in produzione)

**Per:** sessione NUOVA a contesto pulito (richiesta esplicita di Francesco).
**Prima di tutto:** BP-0 — `memory/MEMORY.md` (voce 42) e
`docs/roadmap/2026-07-27-post-ondata-handoff.md` (stato del ramo appena mergiato).
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`../CLAUDE.md` §7 / `ua-app/CLAUDE.md`
§0D) · rm-guard · **Regola Advisor** · mockup PRIMA del codice.

---

## Da dove nasce questo documento

L'ondata «redesign parete/home» è stata mergiata e pubblicata il 26/07 (merge `5504a20a`, CI e
deploy verdi, `uachelab.com` verificata). Francesco ha poi **installato la PWA da icona** — la prova
che aveva rimandato «a dopo, in produzione» — e ha trovato quattro cose. Sono elencate qui **come le
ha viste lui**, con accanto solo ciò che è stato verificato nel codice, e niente di più.

Screenshot di riferimento: due catture del 26/07 alle 11:52 (home e `/cassette`, PWA installata su
Android), consegnate in chat.

---

## 1. La linguetta «LE CASSETTE» sta stretta

**Osservato:** «la linguetta cassette non dà il giusto spazio al suo contenuto, la parte inferiore
si chiude troppo sotto alla scritta cassette».

**Cosa si sa già:** il gate estetico L2 aveva registrato una deviazione dal mockup su questo stesso
elemento — voce **52** del backlog: `ds-v3.css` dà alla linguetta `min-height: 96px` mentre il
mockup ratificato è dimensionato sul contenuto a 22+34+22 = **78px**
(`docs/design/mockups/2026-07-25-linguetta-e-piede-proposte.html:53`). Era stata classificata
«cosmetica, da confermare a vista». **Francesco l'ha vista e non gli va bene**: la voce 52 passa da
rimandata a da fare.

⚠️ Attenzione: la linguetta ha **due stati** (`piena` = la card intera, `is-filo` = la scheggia
rossa dopo 3 accessi) e ha appena ricevuto due modifiche — una media query `≥1024px` che la spegne
su desktop, e il fix del reduced-motion. Qualsiasi ritocco va misurato in **entrambi** gli stati e
verificato che non riapra nessuno dei due.

---

## 2. 🛑 La barra dei gesti — LA CONCLUSIONE PRECEDENTE ERA SBAGLIATA

**Osservato sulla PWA INSTALLATA:** la barra dei gesti non ha sfondo trasparente; nella **home** il
suo colore di sfondo è diverso dal resto dell'app; su **`/cassette`** stesso problema **più una
striscia panna appena sopra**. Da browser (non installata) il fondo sotto la barra è corretto, ma
tutto il resto dei problemi resta.

### ⚠️ Va corretto il verbale, non ereditato

Il verbale del 26/07 e l'handoff dell'ondata dicevano: «**La barra gesture NON è un difetto
dell'app**: in scheda di Chrome quell'area appartiene al browser, `env(safe-area-inset-bottom)`
resta 0 e `viewport-fit: cover` non ha effetto; da PWA installata la pagina prende tutto lo
schermo». La prova sul campo dice il contrario: **installata, il problema c'è lo stesso.** Quella
spiegazione era al massimo una parte della storia, e la parte sbagliata è stata messa a verbale
come chiusa. **Non ripartire da lì.**

### Cosa è già verificato nel codice (26/07, dopo il merge)

- `public/manifest.json` → `"background_color": "#F4F0E7"` ✅ (aggiornato dall'ondata) ma
  **`"theme_color": "#D90012"`** — rosso fisso.
- `src/app/layout.tsx:28` → **`themeColor: '#D90012'`**, un valore solo.
- `src/app/layout.tsx:33` → `viewportFit: 'cover'` ✅ presente.

Quindi: **il colore rosso della barra di sistema è dichiarato, in due punti, e non segue né il fondo
unificato né il tema chiaro/scuro.** Quando l'ondata ha unificato il fondo in quattro posti, il
`theme_color` non è stato toccato — nessuno lo aveva messo in lista.

### Cosa NON è ancora stato misurato (da fare per prima cosa)

Nessuno ha ancora misurato **sul device installato**:
- quanto vale davvero `env(safe-area-inset-bottom)` in standalone, per rotta (home vs `/cassette`);
- quale elemento dipinge l'area sotto il contenuto, e se è il `body`, il wrapper di rotta o nulla;
- da dove nasce la **striscia panna** su `/cassette` — se è la stessa classe di difetto della
  striscia panna del piede, chiusa il 25/07 abrogando la coreografia, o una cosa diversa;
- se `theme_color` per-tema è supportato dal browser di Francesco (si dichiara con `<meta>` +
  `media="(prefers-color-scheme: dark)"`, non dal manifest).

**Metodo obbligatorio: misure, non ipotesi.** È esattamente il difetto che ha prodotto la
conclusione sbagliata sopra. Serve una diagnosi sul device installato prima di scrivere una riga.

---

## 3. Proposta di Francesco: un centro notifiche vero

**Sue parole:** «la striscia delle notifiche deve sempre far capire all'utente cosa vuole indicare».
Ragionamento: il resto dell'app avrà molte altre notifiche da gestire, forse anche una messaggistica
interna — non solo col clinico ma **fra gli operatori del laboratorio** — più notifiche fra utenti
del lab e clinici. Da qui l'idea di **costruire un centro notifiche e un sistema di notifiche vero
della PWA**, dove poi spostare definitivamente la striscia, che a quel punto diventa ridondante.

**Stato: PROPOSTA DA PROGETTARE, non ancora ratificata.** Nessuna riga di codice. Richiede il
percorso BP-2 pieno e, per la sua dimensione, il **percorso GRANDE** (`ua-app/CLAUDE.md` §0C).

Cose da mettere sul tavolo al brainstorming, perché cambiano l'architettura:
- **Oggi la striscia non è una notifica**: è calcolata dal vivo, sul server, dallo stato corrente
  (`src/lib/dashboard/striscia.ts`). Non esiste nessun record di notifica, nessun letto/non letto,
  nessuna storia. Un centro notifiche è un dominio nuovo (tabella, RLS, stato di lettura, consegna),
  non uno spostamento di UI.
- **Due famiglie diverse** che è facile confondere: gli *allarmi derivati dallo stato* (un lavoro in
  ritardo — smette da solo quando il fatto smette) e i *messaggi/eventi* (qualcuno ti ha scritto —
  restano finché non li leggi). Un centro unico deve saper fare entrambe senza mentire.
- **Multi-tenant e ruoli**: le notifiche vivono dentro un laboratorio, e i quattro ruoli vedono cose
  diverse. RLS con `public.current_lab_id()`, mai `auth.`.
- **Clinici = utenti esterni**: il portale del clinico è un'altra superficie con un'altra
  autenticazione. Una messaggistica lab↔clinico è un pezzo a sé.
- **GDPR**: vale già la regola che i template WhatsApp non portano MAI il nome del paziente. Una
  messaggistica va progettata con lo stesso vincolo dal primo giorno.
- **Notifiche push**: se si vuole la notifica anche ad app chiusa servono service worker e permessi
  — è un altro capitolo ancora, da decidere se dentro o fuori perimetro.

**Nel frattempo la striscia resta**, e resta l'unica cosa che avvisa in home.

---

## 4. «Abbiamo lasciato lavori incompiuti?» — la risposta onesta

**No, ma non è un no secco, quindi vale la pena essere precisi.**

Dei 69 rilievi accumulati durante l'ondata: **17 si erano già risolti da soli** lungo il lavoro,
**19 non erano problemi** una volta guardati nel codice, **30 sono stati rimandati con motivazione**
e **3 erano visivi**, chiusi al gate estetico. **Zero bloccanti.**

I 30 rimandati **non sono lavoro lasciato a metà**: sono cose viste, valutate una per una e
giudicate non urgenti, ognuna con scritto **cosa costa rimandarla** e **cosa la renderebbe urgente**.
Vivono in `docs/roadmap/2026-07-26-backlog-ondata-parete-home.md`, che è dentro il repo apposta
perché non sparisse.

⚠️ **Una però è già scaduta**: la voce **52** (l'altezza della linguetta) era «cosmetica, da
confermare a vista» — Francesco l'ha guardata e non gli va bene. È il punto 1 di questo documento.

Le più concrete fra le altre 29, se si cerca cosa fare dopo:
- **25 + 34 — i suoni possono spegnersi per sempre** e si scaricano anche a suoni spenti: se la rete
  balla al primo caricamento i buffer restano vuoti per tutta la sessione e non suona più niente; e
  oltre 300 KB di file audio partono anche per chi i suoni li ha disattivati. **Vanno fatte insieme.**
- **30 — il paziente «—»**: assegnando un lavoro dalla scheda cassetta la targa mostra un trattino
  invece del codice paziente fino al caricamento successivo.
- **39 + 40 — un numero tagliato a metà lettera** in un chip, senza nemmeno i puntini di sospensione.
- **31 — il riordino sulla home sembra annullarsi** dopo un'altra modifica, pur essendo salvato.

---

## Ordine consigliato per la sessione nuova

1. **Punto 2** — è l'unico che l'utente vede appena apre l'app, ed è l'unico con un verbale da
   correggere. Prima la **diagnosi misurata sul device installato**, poi il piano, poi il codice.
   Il `theme_color` rosso fisso è già un pezzo accertato del problema.
2. **Punto 1** — piccolo e circoscritto, ma va misurato in entrambi gli stati della linguetta.
3. **Punto 3** — brainstorming vero, percorso GRANDE, con panel di advisor prima di ratificare
   qualunque architettura. Non è un lavoro da infilare in coda a un fix.

---

## Base di lavoro

- **Il codice è su `main`**, già in produzione. L'ondata è chiusa: il worktree
  `.claude/worktrees/redesign-parete-home` non serve più per lavoro nuovo — per questi punti si
  apre un ramo nuovo (`superpowers:using-git-worktrees`).
- **Banco di collaudo:** `npx next build && npx next start -p 3020 -H 0.0.0.0`, IP
  `ipconfig getifaddr en0`. ⚠️ Dopo OGNI build **riavvia il server** e lancia
  **`node scripts/guardia-stili-collaudo.mjs`**: senza quel controllo la pagina sembra giusta ma
  ogni misura è falsa. ⚠️ `setsid` non esiste su macOS: usare `nohup … &` e verificare con `curl`.
- **Per i difetti del punto 2 il banco non basta**: si vedono solo da **PWA installata sul device di
  Francesco**. Serve concordare con lui come raccogliere le misure (è lui che ha il telefono).
- ⚠️ `.gitignore` ignora `*.png`: gli screenshot vanno aggiunti con `git add -f` e verificati con
  `git show --stat`. È già ricapitato tre volte.
