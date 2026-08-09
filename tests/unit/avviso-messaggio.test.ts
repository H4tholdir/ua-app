// ═══════════════════════════════════════════════════════════════════════════
// TASK 3 — IL TESTO PROPOSTO PER L'AVVISO AL DENTISTA
//
// 🔴 LA PROVA CHE IL PIANO PROPONEVA NON PUÒ FALLIRE, ed è il punto di partenza
//    di questo file. Il piano (`docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`
//    righe 262-269) chiedeva `expect(testo).not.toContain('Mario')` su una
//    funzione che **non riceve nessun nome**: quella riga è verde anche se il
//    modulo restituisce la stringa vuota. Misurato con l'abbozzo inerte
//    (`return ''`): **passata**. Una prova che non può fallire non prova niente.
//
// ➡️ LA PROVA VERA HA DUE GAMBE, e sono di natura diversa:
//
//    ① **IL TIPO.** Nessun parametro della firma può portare un dato personale.
//       Non si prova con una stringa: si prova con `@ts-expect-error` (blocco
//       «GAMBA ①» qui sotto), cioè con `tsc --noEmit` — che `tsconfig.json`
//       estende a `**/*.ts`, quindi anche a questo file, e che è il **primo**
//       comando di `verify:full`. ⚠️ Non è un'asserzione di vitest e **non entra
//       nel conteggio `N su M`**.
//
//    ② **IL TESTO INTERO.** Il messaggio si confronta per **uguaglianza**, non
//       con `toContain`. È la sola forma che prova che dentro non c'è un TERZO
//       dato: `toContain` vede ciò che cerca e non vede ciò che non immagina.
//
// ⚖️ D334 — su WhatsApp **solo il fatto**, il dettaglio **solo** nel portale. Il
//    confine fra le due funzioni è fissato dal blocco «IL CONFINE», non da una
//    buona intenzione: le stringhe vietate si **derivano** da
//    `CAMPI_CORREGGIBILI_DOCUMENTO`, così una settima voce entra nella prova da
//    sola.
//
// ─── LE FORME D'INGRESSO, ENUMERATE PRIMA DELLE ASSERZIONI (R-P4) ───────────
//
//  `buildAvvisoMessage`
//   1. numero e gettone normali (`2026/0042`)                       → coperta
//   2. numero nella forma **maggioritaria** in banca dati
//      (`STOR/2021/016`: 276 righe su 299, misurate)                → coperta
//   3. numero con caratteri strani (accenti, parentesi, spazi)      → coperta
//   4. **gettone vuoto** (`''` — raggiungibile: `orchestrate.ts:131`
//      fa `?? ''` quando l'embed del cliente manca)                 → coperta
//   5. `NEXT_PUBLIC_APP_URL` presente e diverso da quello pubblico  → coperta
//   6. `NEXT_PUBLIC_APP_URL` assente (ripiego)                      → coperta
//   7. un parametro che porta un dato personale                     → coperta
//      **col TIPO** (GAMBA ①), non a runtime
//   8. `numeroLavoro` vuoto → **NON coperta, perché**
//      `public.lavori.numero_lavoro` è `NOT NULL` (misurato su
//      `information_schema`) e nasce dalla RPC che lo compone: chi
//      chiama lo legge dalla riga, non lo digita. Un caso qui
//      proverebbe una forma che il chiamante non può produrre.
//   9. `null`/`undefined` al posto dell'oggetto → **NON coperta, perché**
//      `tsc --noEmit` li rifiuta ed è il primo comando del cancello:
//      per farli passare servirebbe un `as never`, che proverebbe il
//      cast e non la funzione.
//
//  `descriviCampiCorretti`
//  10. le sei voci vive, **lette dal file vivo**                    → coperta
//  11. elenco vuoto (`campi_corretti text[] DEFAULT '{}'`)          → coperta
//  12. nome **non previsto** — il caso vero è un nome **ritirato**
//      (`numero_prescrizione`, uscito con ⚖️ D319): la colonna
//      `campi_corretti` è senza `CHECK` **per scelta** (revisione del
//      Task 2 §5), proprio perché un registro dell'Art. 19 deve
//      continuare a dire cosa fu corretto *allora*                  → coperta
//  13. ordine d'ingresso (l'ordine l'ha già deciso la RPC,
//      `ORDER BY k`: un secondo ordinamento qui sarebbe una
//      seconda regola sulla stessa cosa)                            → coperta
//  14. voci ripetute → **NON coperta, perché** l'elenco nasce da
//      `jsonb_object_keys`, che non può restituire due volte la
//      stessa chiave.
//
// 🛑 PERIMETRO DICHIARATO: la **codifica** del messaggio non si prova qui — la
//    fa `buildWhatsappUrl` (`src/lib/consegna/whatsapp-template.ts:66-70`) con
//    `encodeURIComponent` su tutto il testo. Questo modulo produce testo piano.
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { buildAvvisoMessage, descriviCampiCorretti } from '@/lib/avvisi/messaggio'
import { CAMPI_CORREGGIBILI_DOCUMENTO } from '@/lib/dichiarazione/correzioni'

/**
 * ⚖️ **D345** (09/08/2026) — LA FIRMA È IL NOME DEL LABORATORIO, non «UÀ Lab».
 * Sta **prima** delle sonde di tipo qui sotto e non fra le altre fixture perché
 * quelle sonde girano alla valutazione del modulo: un `const` dichiarato dopo
 * darebbe un `ReferenceError` (zona morta temporale), non un errore di tipo.
 *
 * 🔴 E LE TRE SONDE HANNO DOVUTO CAMBIARE CON LA FIRMA, altrimenti si
 *    **degradavano in silenzio**: aggiunta la chiave obbligatoria
 *    `nomeLaboratorio`, ognuna di quelle chiamate sarebbe stata in errore perché
 *    la chiave **mancava**, non perché la proprietà vietata è **rifiutata** — la
 *    direttiva sarebbe restata «usata», `tsc` verde, e il cancello GDPR
 *    dell'intestazione avrebbe smesso di provare qualcosa continuando a
 *    dichiararsi fail-closed. È il modo esatto in cui una difesa muore senza che
 *    nessuno lo veda.
 */
const LAB = 'Laboratorio Odontotecnico di Prova'

// ─── GAMBA ①: LA PROVA DI TIPO ─────────────────────────────────────────────
// Non è un `it` e non ha asserzioni: non c'è niente da eseguire. La verifica la
// fa `tsc --noEmit`. Il giorno in cui uno di questi campi diventasse un
// parametro vero, la direttiva resterebbe **senza errore da sopprimere** e `tsc`
// si accenderebbe con TS2578 («Unused '@ts-expect-error' directive») — cioè
// fail-closed, esattamente come R-P1 chiede: si prova un valore che DEVE essere
// rifiutato.

// @ts-expect-error — 🛑 GDPR (`CLAUDE.md` §9): nessun parametro porta il nome
//   del paziente, e non deve diventarlo.
void buildAvvisoMessage({ numeroLavoro: '2026/0042', portalToken: 'tok', nomeLaboratorio: LAB, pazienteNome: 'Mario Rossi' })

// @ts-expect-error — ⚖️ D336: nessun parametro porta il VALORE PRECEDENTE di un
//   campo. Il valore vecchio non si mostra mai, da nessuna parte.
void buildAvvisoMessage({ numeroLavoro: '2026/0042', portalToken: 'tok', nomeLaboratorio: LAB, valorePrecedente: 'A3' })

// @ts-expect-error — ⚖️ D334: il dettaglio dei campi corretti NON entra nel
//   testo di WhatsApp, quindi non entra nemmeno nella firma che lo costruisce.
void buildAvvisoMessage({ numeroLavoro: '2026/0042', portalToken: 'tok', nomeLaboratorio: LAB, campiCorretti: ['descrizione'] })

// ─── la fixture ────────────────────────────────────────────────────────────
/** Un nome vero, che la firma non ha modo di ricevere: è la fixture della
 *  gamba ②. Se un giorno comparisse nel testo, qualcuno avrebbe allargato la
 *  firma **e** la gamba ① sarebbe già rossa prima di qui. */
const PAZIENTE = 'Mario Rossi'
const NUMERO = '2026/0042'
const TOKEN = 'tok-di-prova-123'
const PUBBLICO = 'https://uachelab.com'

/** Il testo atteso, per intero. Cambiarlo è una scelta visibile a un dentista:
 *  ⑦ del brief — «dichiarazione», MAI «DdC» né «dichiarazione di conformità»
 *  (`CLAUDE.md` §6: per i su misura quel nome è improprio). */
function attesoConLink(numero: string, base: string, token: string): string {
  return [
    `📄 La dichiarazione del lavoro #${numero} è stata rifatta.`,
    ``,
    `Trovi quella aggiornata qui:`,
    `${base}/portale/${token}`,
    ``,
    `— ${LAB}`,
  ].join('\n')
}

function attesoSenzaLink(numero: string): string {
  return [`📄 La dichiarazione del lavoro #${numero} è stata rifatta.`, ``, `— ${LAB}`].join('\n')
}

describe('buildAvvisoMessage — la PROPOSTA di testo per WhatsApp (⚖️ D331, D334)', () => {
  // 🔑 L'indirizzo si FISSA, e non è pignoleria: il precedente in casa è
  //    `tests/unit/PortaleLinkButtons-indirizzo.test.tsx:47-54`. Senza questo
  //    blocco la prova dipende da `NEXT_PUBLIC_APP_URL` dell'ambiente — verde
  //    su una macchina, rossa su un'altra — e da ⚖️ D333 la CI è l'unico posto
  //    dove girano le 35 prove d'integrazione delle due tornate precedenti:
  //    rumore lì costa il doppio.
  let appUrlPrima: string | undefined

  beforeEach(() => {
    appUrlPrima = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = PUBBLICO
  })

  afterEach(() => {
    if (appUrlPrima === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = appUrlPrima
  })

  it('è ESATTAMENTE il fatto più il collegamento: nessun terzo dato ci sta dentro', () => {
    expect(buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio: LAB })).toBe(
      attesoConLink(NUMERO, PUBBLICO, TOKEN)
    )
  })

  it('il nome del paziente non compare — e non compare nemmeno un suo pezzo', () => {
    // 📌 Le tre righe del piano, tenute: da sole non provavano niente (passano
    //    con `return ''`), accanto all'uguaglianza qui sopra dicono la cosa
    //    giusta a chi legge — quel nome non ha una strada per arrivare.
    const testo = buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio: LAB })
    expect(testo).not.toContain(PAZIENTE)
    expect(testo).not.toContain('Mario')
    expect(testo).not.toContain('Rossi')
  })

  it('regge la forma di numero che in banca dati è la MAGGIORANZA (STOR/…)', () => {
    // 276 righe su 299 hanno questa forma (misurato il 09/08/2026): tre cifre
    // finali, non quattro, e due barre. La fixture del piano (`2026/0042`) è
    // vera ma minoritaria — 19 righe su 299.
    const storico = 'STOR/2021/016'
    expect(buildAvvisoMessage({ numeroLavoro: storico, portalToken: TOKEN, nomeLaboratorio: LAB })).toBe(
      attesoConLink(storico, PUBBLICO, TOKEN)
    )
  })

  it('un numero con caratteri strani entra nel testo così com’è', () => {
    // La codifica è di `buildWhatsappUrl`, non di qui: questo modulo produce
    // testo piano, e un numero importato a mano può contenere qualsiasi cosa.
    const strano = 'STOR/2021/016 (rifatto) – è così'
    expect(buildAvvisoMessage({ numeroLavoro: strano, portalToken: TOKEN, nomeLaboratorio: LAB })).toContain(strano)
  })

  it("rispetta NEXT_PUBLIC_APP_URL quando c'è: chi sviluppa non manda link a uachelab.com", () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    expect(buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio: LAB })).toBe(
      attesoConLink(NUMERO, 'http://localhost:3000', TOKEN)
    )
  })

  it("senza NEXT_PUBLIC_APP_URL ripiega sull'indirizzo pubblico", () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio: LAB })).toBe(
      attesoConLink(NUMERO, PUBBLICO, TOKEN)
    )
  })

  it('gettone vuoto: resta il FATTO, e non parte un collegamento rotto', () => {
    // 🔴 IL PIANO NON HA QUESTO RAMO, e il gemello ce l'ha
    //    (`whatsapp-template.ts:14-20`). Senza, il dentista riceve
    //    «…/portale/» — un indirizzo che non porta da nessuna parte.
    //    ⚠️ Il vuoto è raggiungibile: `orchestrate.ts:131` fa `?? ''` quando
    //    l'embed del cliente manca dalla lettura.
    const testo = buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: '', nomeLaboratorio: LAB })
    expect(testo).toBe(attesoSenzaLink(NUMERO))
    expect(testo).not.toContain('/portale/')
  })

  it('NON chiama il documento «DdC», né «certificato», né «dichiarazione di conformità»', () => {
    // ⑦ del brief + `CLAUDE.md` §6: per i dispositivi su misura quel nome è
    // improprio (Art. 10(6) MDR, MDCG 2021-3 Q9), e ogni testo NUOVO usa il
    // nome corretto. Qui è una prova, non una raccomandazione.
    const testo = buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio: LAB }).toLowerCase()
    const vietati = ['ddc', 'certificat', 'dichiarazione di conformità', 'conformità']
    expect(vietati.filter((v) => testo.includes(v))).toEqual([])
  })
})

describe('descriviCampiCorretti — i nomi leggibili, per il PORTALE (⚖️ D334)', () => {
  it('descrive tutte e sei le voci VIVE, e nessuna descrizione è vuota', () => {
    // 🔑 Le voci si leggono dal file vivo, MAI dall'elenco del piano: il Task 2
    //    ha già pagato quell'errore (revisione §3 — il piano mandava a leggere
    //    un file superato, e ricopiarlo avrebbe riaperto due campi chiusi per
    //    legge). Il giorno in cui nasce la settima, questa prova la esige.
    const descrizioni = descriviCampiCorretti(CAMPI_CORREGGIBILI_DOCUMENTO)
    expect(descrizioni).toHaveLength(CAMPI_CORREGGIBILI_DOCUMENTO.length)
    expect(descrizioni.filter((d) => typeof d !== 'string' || d.trim() === '')).toEqual([])
  })

  it('nessuna descrizione è il nome tecnico della colonna', () => {
    // Una mappa identità passerebbe la prova qui sopra e metterebbe
    // «prescrizione_caratteristiche» davanti a un dentista.
    const descrizioni = descriviCampiCorretti(CAMPI_CORREGGIBILI_DOCUMENTO)
    // ⚠️ LA RIGA CONTRO IL VUOTO, e non è cerimonia: su un elenco vuoto il
    //    filtro qui sotto è vuoto per costruzione e la prova sarebbe verde per
    //    finta. Misurato coll'abbozzo inerte, che restituisce `[]`.
    expect(descrizioni).toHaveLength(CAMPI_CORREGGIBILI_DOCUMENTO.length)
    expect(descrizioni.filter((d) => (CAMPI_CORREGGIBILI_DOCUMENTO as readonly string[]).includes(d))).toEqual([])
  })

  it("conserva l'ordine d'ingresso: l'ordine l'ha già deciso la RPC", () => {
    // La RPC scrive `campi_corretti` con `ORDER BY k` (revisione del Task 2 §2:
    // `jsonb` tiene le chiavi ordinate per LUNGHEZZA, e quell'elenco finisce in
    // un messaggio a un dentista). Un secondo ordinamento qui sarebbe una
    // seconda regola sulla stessa cosa.
    const diritto = descriviCampiCorretti(['descrizione', 'denti_coinvolti'])
    // Prima i valori (o `[]` contro `[]` renderebbe vacuo il confronto sotto),
    // poi il rovescio.
    expect(diritto).toEqual(['la descrizione', 'i denti indicati'])
    expect(descriviCampiCorretti(['denti_coinvolti', 'descrizione'])).toEqual([...diritto].reverse())
  })

  it('elenco vuoto → elenco vuoto, senza inventare una frase', () => {
    // `campi_corretti` è `text[] NOT NULL DEFAULT '{}'`. Come si renda un
    // elenco vuoto a schermo lo decide il Task 8, non questo modulo.
    expect(descriviCampiCorretti([])).toEqual([])
  })

  it('un nome RITIRATO dalle sei non diventa «undefined» a schermo', () => {
    // 🔴 `numero_prescrizione` è uscito con ⚖️ D319 e `paziente_nome_snapshot`
    //    con ⚖️ D320 — due voci in un giorno. La colonna `campi_corretti` è
    //    senza `CHECK` **per scelta** (revisione del Task 2 §5): un registro
    //    dell'Art. 19 deve continuare a dire cosa fu corretto *allora*. Quindi
    //    il giorno in cui cade la settima, le righe vecchie la nominano ancora.
    //    Col tipo del piano (`readonly CampoCorreggibile[]`) il chiamante
    //    avrebbe dovuto forzare il tipo su un `string[]`, e `NOME_CAMPO[c]`
    //    avrebbe restituito `undefined` dentro un `string[]` dichiarato.
    expect(descriviCampiCorretti(['numero_prescrizione', 'descrizione'])).toEqual([
      'una voce del documento',
      'la descrizione',
    ])
  })
})

describe('IL CONFINE — su WhatsApp il fatto, nel portale il dettaglio (⚖️ D334)', () => {
  it('nessuna descrizione di campo compare nel testo di WhatsApp', () => {
    // 🛑 SENZA QUESTA PROVA il Task 5 o il Task 8 mescolerebbe le due funzioni e
    //    nessuno se ne accorgerebbe: «è cambiato il paziente» su un canale non
    //    protetto è un dettaglio clinico, e D334 lo vieta.
    // 🔑 Le stringhe vietate si DERIVANO dalle voci vive: una settima voce entra
    //    in questa prova da sola, senza che nessuno la ricopi qui.
    const testo = buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio: LAB }).toLowerCase()
    const descrizioni = descriviCampiCorretti(CAMPI_CORREGGIBILI_DOCUMENTO)
    // ⚠️ Contro il vuoto, come sopra: senza descrizioni non trapela niente e la
    //    prova sarebbe verde per finta.
    expect(descrizioni).toHaveLength(CAMPI_CORREGGIBILI_DOCUMENTO.length)
    expect(descrizioni.filter((d) => testo.includes(d.toLowerCase()))).toEqual([])
  })
})
