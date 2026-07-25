# Nomi lunghi sulla parete — variante 6 «la combinata»

**Data:** 26/07/2026
**Scelta di Francesco:** variante **6**, «la combinata», dal mockup
`docs/design/mockups/2026-07-26-nomi-lunghi-cassetta.html`.
**Dove vale:** il nome dello studio sulla cassetta (`/cassette` e la stanza parete della home —
è la stessa parete).
**Stato:** la regola è **ratificata**. La lista delle parole qui sotto **è una proposta**: l'ho
scritta io, il mockup l'aveva fatta a mano nome per nome. Va letta e, se serve, corretta —
si cambia una riga di elenco, non il codice.

---

## 1. La regola, in ordine

1. **Il nome ci sta in due righe → non si fa niente.** È esattamente com'è oggi.
2. **Non ci sta → prima si rimpicciolisce il carattere di un gradino:** 10 → 9,5 → 9 punti.
   **Mai sotto 9:** più piccolo di così non si legge. Questa è la prima mossa perché non toglie
   niente: il nome resta scritto per intero, com'è a database.
3. **Ancora non ci sta a 9 → si tolgono le parole di categoria in testa al nome**
   (`CENTRO ODONTOIATRICO SANTA MARIA` → `SANTA MARIA`), e il carattere **riparte da 10**: se il
   nome accorciato ci sta a grandezza piena, si legge a grandezza piena.
4. **Nemmeno così → resta la sfumatura di oggi**, come ultima spiaggia. Capita solo con una
   parola lunghissima e attaccata che non entra nemmeno da sola.

Il nome a database **non si tocca mai**: tutto questo è solo come si legge sulla targa. Il nome
vero resta sempre disponibile — chi usa uno screen reader lo sente per intero, e col mouse fermo
sopra compare il nome completo.

---

## 2. Le parole di categoria — la lista (proposta)

Sono le parole che dicono **che cosa** è il posto, non **chi** è. Si tolgono **solo se stanno in
testa** al nome e **solo di seguito**, dalla prima parola in poi: alla prima parola che non è di
categoria ci si ferma e non si riprende più. Maiuscole, minuscole, accenti e punteggiatura
attaccata non contano (`Studio` = `STUDIO,` = `studio`).

| Famiglia | Parole | Perché |
|---|---|---|
| **Che tipo di posto è** | studio · studi · centro · centri · ambulatorio · ambulatori · poliambulatorio · poliambulatori · clinica · cliniche · policlinico · policlinici · istituto · istituti | Sono l'intestazione del nome, non il nome. Due delle tre righe del campione cominciano così. |
| **Di che cosa si occupa** | dentistico/a/i/che · dentale/i · odontoiatrico/a/i/che · odontoiatria · odontostomatologico/a/i/che · medico/a/i/che · sanitario/a/i/e · specialistico/a/i/che · polispecialistico/a/i/che | Su una parete di un laboratorio odontotecnico, «odontoiatrico» non distingue nessuno da nessuno: lo sono tutti. |
| **Come è esercitato** | associato/a/i/e | Compare sempre attaccato a «studio» (`STUDIO ASSOCIATO ROSSI`): senza, la sequenza si fermerebbe lì e il resto non verrebbe tolto. |

### Cosa NON è una parola di categoria (esclusioni volute)

- **Le preposizioni e le congiunzioni** — `di`, `del`, `della`, `dei`, `degli`, `delle`, `e`.
  `DI SANTI CATERINA` è un nome vero: il «DI» ne fa parte. Ed è anche la ragione per cui
  `STUDI MEDICI DI SANTI GIUSEPPE` diventa `DI SANTI GIUSEPPE` e non `SANTI GIUSEPPE` — è così
  anche nel mockup che hai approvato.
- **I titoli** — `dott.`, `dottor`, `dr.`, `prof.`. Non dicono il tipo di posto, dicono la
  persona: toglierli cambierebbe il senso, non accorcerebbe l'intestazione.
- **Le sigle societarie** — `s.r.l.`, `s.a.s.`, `s.n.c.`, `s.p.a.`. Stanno in fondo, e da lì non
  si toglie mai niente.

### Le due guardie

- **Non si svuota mai il nome.** Se togliendo le parole di categoria non resta più niente
  (`STUDIO DENTISTICO`), non si toglie: si passa al punto 4.
- **Quel che resta deve avere almeno 4 lettere.** Sotto le quattro lettere, in questo campo, non
  resta un nome: restano le sigle (`SRL`, `SAS`, `S.R.L.` sono 3 lettere) o delle iniziali. I
  cognomi e i nomi di santo che finiscono da soli su una targa ne hanno praticamente sempre di
  più: ROSSI, NERI, MARIA, SANTI. Quando la guardia scatta non si perde niente — si rinuncia ad
  accorciare e si resta al comportamento di oggi.

### Il costo che ci prendiamo (era già scritto nel mockup)

Più la lista è lunga, più cresce il rischio che **due studi diversi diventino identici sulla
parete**: `STUDIO DENTISTICO ROSSI` e `CENTRO ODONTOIATRICO ROSSI` finirebbero tutti e due
«ROSSI». Per questo la lista è volutamente corta e ferma a ciò che compare davvero in testa a un
nome di studio italiano. **Allungarla è una decisione, non un automatismo.** Nota che il rischio
si corre solo sui nomi che non entrano nemmeno a 9 punti: sugli altri non si toglie niente.

**Dove si cambia:** `PAROLE_CATEGORIA_STUDIO` in `src/lib/domain/nome-studio.ts` — un elenco di
parole, tutte minuscole. Le prove che accompagnano la lista stanno in
`tests/unit/nome-studio.test.ts`.

---

## 3. Come va a finire sui nomi veri (misurato in browser, non calcolato a mano)

Parete a 390px (telefono), colonna del nome larga 71,33px. Misure ripetute identiche a densità di
schermo 1, 2,75 e 3.

| Nome a database | Prima | Dopo |
|---|---|---|
| `STUDI MEDICI DI SANTI GIUSEPPE` | 3 righe: l'ultima sparisce nella sfumatura | **intero**, a 9 punti, 2 righe, nessuna sfumatura |
| `DI SANTI CATERINA` | 2 righe, intero | **identico** |
| `BARALE S.A.S.` | 1 riga, intero | **identico** |
| `C.O.M. s.r.l. uninominale` | 2 righe, intero | **identico** |

Sul desktop (1280px, colonna 96px) anche `STUDI MEDICI DI SANTI GIUSEPPE` ci sta già a grandezza
piena: lì non cambia nulla nemmeno per lui.

Sui nomi lunghissimi inventati nel mockup: `CENTRO ODONTOIATRICO SANTA MARIA` → **SANTA MARIA** e
`POLIAMBULATORIO ODONTOIATRICO SAN RAFFAELE` → **SAN RAFFAELE**, tutti e due a grandezza piena e
su una riga sola. Un nome con una parola lunghissima anche dopo l'accorciamento
(`STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO` → `GIANCARLO POLIAMBULATORIO`) resta con la
sfumatura: è il punto 4, dichiarato.

---

## 4. Note tecniche (per il repo)

- **Dove vive.** I candidati (quali testi, a quale corpo, in quale ordine) sono puri e testati:
  `src/lib/domain/nome-studio.ts` (`accorciaNomeStudio`, `costruisciScalaNome`, `CORPI_CLINICO`,
  `PAROLE_CATEGORIA_STUDIO`, `MIN_LETTERE_NOME_ACCORCIATO`). La SCELTA è una misura nel DOM
  dentro `Cassetta.tsx`; i due gradini di corpo sono due classi in `src/app/ds-v3.css`
  (`.ds-cassetta-dent.is-corpo-95` = 9,5px, `.is-corpo-9` = 9px). Nessun `font-size` inline.
- **Nessuna soglia sulla lunghezza del testo** (`SOGLIA_NOME_LUNGO` resta abrogata da H2): la
  colonna è fluida e il font è quello reale — si misura, non si indovina.
- **L'aritmetica del rilevatore resta quella di H2c**, a righe intere
  (`round(scrollHeight/lineHeight)` vs `round(clientHeight/lineHeight)`): il gradino successivo si
  prova solo quando quel confronto dice che si sfora davvero.
- **Il budget resta 2 righe esatte a ogni gradino** senza toccare `max-height`: è dichiarato in
  `em` (`calc(2 * 1.16em)`), quindi segue il corpo dell'elemento. Valori RISOLTI misurati in
  Chromium: 23,2 / 22,04 / 20,88px, con `round(clientHeight/lineHeight) = 2` su tutti e tre. La
  terza riga non entra mai nel budget.
- **H2d è intatto:** i gradini toccano solo `font-size`. Il respiro di 1px del `clip-path` resta
  sulla regola base e resta azzerato da `is-troncato` — verificato sui valori risolti in ognuno
  degli stati della scala, corpo ridotto compreso.
- **La scala risale.** Se la cassetta riceve più spazio (griglia che cambia colonne, rotazione),
  si riparte dal corpo pieno. Il segnale è la LARGHEZZA del nome, non la sua altezza: la
  larghezza non dipende dal corpo (`width: min(100%, 96px)`), quindi distingue «è cambiata la
  colonna» da «si è accorciata la scatola perché ho appena cambiato io il corpo» — senza quella
  distinzione, ResizeObserver e gradino si inseguirebbero all'infinito.
- **Accessibilità:** l'`aria-label` del bottone porta da sempre `lavoro.dentista` per intero e non
  passa dalla scala (verificato in browser in tutti gli stati); il `title` sul testo compare solo
  quando ciò che si legge non è il nome intero.
