// tests/unit/firma-messaggi-nome-laboratorio.test.ts
//
// ⚖️ D345 (centoquarantanovesima tornata, 09/08/2026) — «*ogni messaggio che
// inviamo non deve essere firmato da UA lab, ma dal nome del laboratorio*».
//
// 🔴 PERCHÉ QUESTO FILE ESISTE, E NON È UNA PROVA DI TESTO. Prima di stasera la
//    firma dei messaggi non era sorvegliata da nessuna parte:
//    `provato:` `grep -rn "UÀ Lab" src/` → 3 punti, 2 in produzione
//    (`whatsapp-template.ts:18,30`) · e il **sollecito di pagamento** — il
//    messaggio che esce dal laboratorio per chiedere soldi a un dentista — non
//    era firmato **da nessuno**: `buildWhatsappSollecito` finiva a «Cordiali
//    saluti» e lì si fermava. Nessuna prova, in 5793, diceva niente su come
//    finisce un messaggio.
//
// 🔑 LE TRE GAMBE:
//    ① **il nome c'è** — ogni funzione che compone un messaggio lo firma col
//      nome del laboratorio, e lo firma in tutti i suoi rami;
//    ② **«UÀ Lab» non c'è più** in nulla che questi moduli producano, e non
//      torna nemmeno come ripiego;
//    ③ **il nome che manca non diventa una firma finta** — mai `— undefined`,
//      mai un gallone nudo. Il ramo è raggiungibile (una lettura che non porta
//      l'incastro del laboratorio), quindi si prova invece di sperarci.
//
// 🛑 LA SENTINELLA SUL SORGENTE (in fondo) è la parte che vale oltre oggi: D345
//    dice «OGNI messaggio», e le funzioni di domani non sono in questo file.
//    Idioma di casa per una verifica statica: `tests/unit/ddc-lettori-gruppo-a.test.ts`.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildAvvisoMessage } from '@/lib/avvisi/messaggio'
import { buildWhatsappMessage, buildWhatsappSollecito } from '@/lib/consegna/whatsapp-template'

const LAB = 'Laboratorio Odontotecnico Formicola'
const NUMERO = 'STOR/2021/016'
const TOKEN = 'tok-di-prova-123'

/** La firma vecchia, scritta una volta sola: è la stringa che ⚖️ D345 mette
 *  fuori legge, e non va ricopiata in giro per il file. */
const FIRMA_VIETATA = 'UÀ Lab'

/**
 * OGNI produttore di messaggi, e OGNI SUO RAMO. Non è un elenco decorativo:
 * le prove sotto ciclano su questa tabella, quindi una funzione nuova (o un
 * ramo nuovo) si aggiunge **qui una volta** ed entra in tutte e tre le gambe.
 *
 * 📌 I rami «senza collegamento» ci sono perché è lì che la firma vive da sola:
 *    `whatsapp-template.ts:14-20` e `messaggio.ts:107` hanno un ramo corto, e
 *    un ramo corto è il posto classico dove una correzione di firma si dimentica.
 */
const PRODUTTORI: ReadonlyArray<{
  nome: string
  produci: (nomeLaboratorio: string | null) => string
}> = [
  {
    nome: "buildAvvisoMessage — l'avviso al dentista, col collegamento",
    produci: (nomeLaboratorio) =>
      buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio }),
  },
  {
    nome: 'buildAvvisoMessage — ramo senza collegamento (gettone vuoto)',
    produci: (nomeLaboratorio) =>
      buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: '', nomeLaboratorio }),
  },
  {
    nome: 'buildWhatsappMessage — la consegna, col collegamento',
    produci: (nomeLaboratorio) =>
      buildWhatsappMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio }),
  },
  {
    nome: 'buildWhatsappMessage — ramo senza collegamento (gettone vuoto)',
    produci: (nomeLaboratorio) =>
      buildWhatsappMessage({ numeroLavoro: NUMERO, portalToken: '', nomeLaboratorio }),
  },
  {
    nome: 'buildWhatsappSollecito — il sollecito di pagamento',
    produci: (nomeLaboratorio) =>
      buildWhatsappSollecito({ studioNome: 'Studio Bianchi', totaleInsoluto: 1234.5, nomeLaboratorio }),
  },
]

describe('⚖️ D345 — gamba ①: il messaggio è firmato col NOME DEL LABORATORIO', () => {
  // ⚠️ LA RIGA CONTRO IL VUOTO, e non è cerimonia: se la tabella si svuotasse
  //    (o un `import` sbagliato la riducesse) ogni ciclo qui sotto sarebbe
  //    verde per costruzione, cioè verde per finta.
  it('la tabella dei produttori copre tutti e cinque i rami noti', () => {
    expect(PRODUTTORI).toHaveLength(5)
  })

  for (const { nome, produci } of PRODUTTORI) {
    it(`${nome} → porta il nome del laboratorio come firma`, () => {
      expect(produci(LAB)).toContain(`— ${LAB}`)
    })
  }
})

describe('⚖️ D345 — gamba ②: «UÀ Lab» non compare in NESSUN messaggio prodotto', () => {
  for (const { nome, produci } of PRODUTTORI) {
    it(`${nome} → non nomina lo strumento`, () => {
      expect(produci(LAB)).not.toContain(FIRMA_VIETATA)
    })
  }

  it('e non torna nemmeno come ripiego quando il nome manca', () => {
    // 🔑 È l'errore più naturale da scrivere: `nomeLaboratorio ?? 'UÀ Lab'`.
    //    Passerebbe la gamba ③ (niente `undefined` a schermo) e rimetterebbe
    //    dentro esattamente ciò che D345 vieta.
    for (const { produci } of PRODUTTORI) {
      expect(produci(null)).not.toContain(FIRMA_VIETATA)
    }
  })
})

describe('⚖️ D345 — gamba ③: un nome che manca NON diventa una firma finta', () => {
  /** Le forme d'ingresso che valgono come «il nome non c'è». `laboratori.nome`
   *  è `NOT NULL` sul catalogo (`database.types.ts`), quindi qui non si arriva
   *  con un dato mancante in banca dati: si arriva con una **lettura** che non
   *  ha portato l'incastro del laboratorio — è già il modo in cui
   *  `orchestrate.ts:131` produce un gettone vuoto (`?? ''`). */
  const NOMI_ASSENTI: ReadonlyArray<{ forma: string; valore: string | null }> = [
    { forma: 'null (lettura senza incastro del laboratorio)', valore: null },
    { forma: 'stringa vuota', valore: '' },
    { forma: 'solo spazi', valore: '   ' },
  ]

  it('le forme di «nome assente» censite sono tre', () => {
    expect(NOMI_ASSENTI).toHaveLength(3)
  })

  for (const { forma, valore } of NOMI_ASSENTI) {
    for (const { nome, produci } of PRODUTTORI) {
      it(`${nome} + nome assente (${forma}) → nessuna firma finta`, () => {
        const testo = produci(valore)
        // ① il difetto peggiore di tutti, quello nominato nel mandato
        expect(testo).not.toContain('undefined')
        expect(testo).not.toContain('null')
        // ② il gallone nudo: una riga che è solo «—» dice a un dentista che
        //    qualcosa si è rotto, e non gli dice chi scrive
        const righe = testo.split('\n')
        expect(righe.filter((r) => /^\s*—\s*$/.test(r))).toEqual([])
        // ③ e nemmeno in coda, per chi compone su una riga sola
        //    (`TabAccettazione.tsx:268-274` unisce con lo spazio)
        expect(testo.trimEnd()).not.toMatch(/—$/)
      })
    }
  }

  it('anche un `undefined` arrivato a run time (cast, non tipo) non finisce a schermo', () => {
    // 🛑 Il tipo dice `string | null`, ma questi moduli stanno **a valle di una
    //    lettura**: in casa il valore arriva da un embed PostgREST castato
    //    (`orchestrate.ts:124` — `lavoro?.cliente as unknown as {…}`), e un
    //    embed che manca dà `undefined`, non `null`. La difesa non può essere
    //    solo il tipo.
    for (const { produci } of PRODUTTORI) {
      const testo = produci(undefined as unknown as string | null)
      expect(testo).not.toContain('undefined')
      expect(testo.split('\n').filter((r) => /^\s*—\s*$/.test(r))).toEqual([])
    }
  })
})

describe('⚖️ D345 — il testo intero, perché un `toContain` non fissa la forma', () => {
  // 🔑 L'indirizzo si FISSA: senza, i confronti per intero qui sotto
  //    dipenderebbero da `NEXT_PUBLIC_APP_URL` dell'ambiente — verdi su una
  //    macchina, rossi su un'altra. Stesso blocco di
  //    `tests/unit/avviso-messaggio.test.ts:130-141`, per la stessa ragione.
  let appUrlPrima: string | undefined

  beforeEach(() => {
    appUrlPrima = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://uachelab.com'
  })

  afterEach(() => {
    if (appUrlPrima === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = appUrlPrima
  })

  it("l'avviso col collegamento è esattamente il fatto, il collegamento e la firma", () => {
    const atteso = [
      `📄 La dichiarazione del lavoro #${NUMERO} è stata rifatta.`,
      ``,
      `Trovi quella aggiornata qui:`,
      `https://uachelab.com/portale/${TOKEN}`,
      ``,
      `— ${LAB}`,
    ].join('\n')
    expect(
      buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio: LAB })
    ).toBe(atteso)
  })

  it("senza nome, l'avviso PERDE la riga della firma — non la riempie di niente", () => {
    // 🔑 È una conseguenza DECISA, non un incidente: «UÀ Lab» non può
    //    sopravvivere come ripiego (D345 lo vieta), e una firma finta è peggio
    //    di nessuna firma. Il precedente in casa è `TabAccettazione.tsx:272`,
    //    che già oggi omette la riga quando il nome non c'è.
    const atteso = [
      `📄 La dichiarazione del lavoro #${NUMERO} è stata rifatta.`,
      ``,
      `Trovi quella aggiornata qui:`,
      `https://uachelab.com/portale/${TOKEN}`,
    ].join('\n')
    expect(
      buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: TOKEN, nomeLaboratorio: null })
    ).toBe(atteso)
  })

  it('il sollecito senza nome resta ESATTAMENTE il messaggio di oggi', () => {
    // 📌 Asimmetria dichiarata: per il sollecito il ramo «senza nome» non
    //    perde niente, perché oggi la firma non c'è. Per la consegna e per
    //    l'avviso perde una riga che oggi c'è.
    const atteso = [
      `Gentile Studio Bianchi,`,
      ``,
      `La contatto per ricordarle del pagamento in sospeso di €1234.50.`,
      ``,
      `Per qualsiasi chiarimento non esiti a contattarci.`,
      ``,
      `Cordiali saluti`,
    ].join('\n')
    expect(
      buildWhatsappSollecito({ studioNome: 'Studio Bianchi', totaleInsoluto: 1234.5, nomeLaboratorio: null })
    ).toBe(atteso)
  })

  it('il sollecito CON nome aggiunge la firma sotto i saluti', () => {
    const atteso = [
      `Gentile Studio Bianchi,`,
      ``,
      `La contatto per ricordarle del pagamento in sospeso di €1234.50.`,
      ``,
      `Per qualsiasi chiarimento non esiti a contattarci.`,
      ``,
      `Cordiali saluti`,
      `— ${LAB}`,
    ].join('\n')
    expect(
      buildWhatsappSollecito({ studioNome: 'Studio Bianchi', totaleInsoluto: 1234.5, nomeLaboratorio: LAB })
    ).toBe(atteso)
  })

  it('il nome si presenta ripulito ai bordi, non come è stato digitato', () => {
    // Un nome digitato in impostazioni con uno spazio in coda non deve
    // produrre «— Nome » nel messaggio.
    expect(
      buildAvvisoMessage({ numeroLavoro: NUMERO, portalToken: '', nomeLaboratorio: `  ${LAB}  ` })
    ).toBe([`📄 La dichiarazione del lavoro #${NUMERO} è stata rifatta.`, ``, `— ${LAB}`].join('\n'))
  })
})

// ─── LA SENTINELLA SUL SORGENTE ────────────────────────────────────────────
// D345 dice «OGNI messaggio», e le funzioni di domani non sono in questo file:
// questa gamba è l'unica che le vede. Verifica statica come
// `tests/unit/ddc-lettori-gruppo-a.test.ts`, per la stessa ragione — il
// contratto è la **presenza (o l'assenza) di una forma nel codice reale**.
describe('⚖️ D345 — la sentinella: la firma vecchia non rientra da nessuna porta', () => {
  function fileSorgente(dir: string, acc: string[] = []): string[] {
    for (const voce of readdirSync(dir, { withFileTypes: true })) {
      const percorso = join(dir, voce.name)
      if (voce.isDirectory()) fileSorgente(percorso, acc)
      else if (/\.(ts|tsx)$/.test(voce.name)) acc.push(percorso)
    }
    return acc
  }

  const FILE = fileSorgente('src')

  it('la scansione vede davvero il sorgente (contro il verde per vuoto)', () => {
    // `provato:` misurato il 09/08/2026 — `find src -name '*.ts*' | wc -l` → **653**,
    // e la scansione qui sopra ne vede **653**: lo stesso numero, cioè non sta
    // saltando rami.
    // La soglia resta larga di proposito: serve a distinguere «zero occorrenze
    // perché è pulito» da «zero occorrenze perché non ho letto niente», non a
    // inseguire il conto dei file settimana per settimana.
    expect(FILE.length).toBeGreaterThan(300)
  })

  // ⚠️ QUESTA GUARDIA NON DISTINGUE IL CODICE DALLA PROSA, ed è voluto: un
  //    commento che ricopia la firma vecchia per intero la accende. È già
  //    successo mentre si scriveva il Task 4-ter — i commenti che spiegavano la
  //    correzione citavano la stringa e la sentinella è diventata rossa. La
  //    risposta giusta è **riscrivere il commento**, non ammorbidire la guardia:
  //    una guardia che si aggira spiegandole le proprie ragioni non è una guardia.
  it("nessun file di `src/` firma un messaggio col nome dello STRUMENTO", () => {
    const colpevoli = FILE.filter((f) => /—\s*UÀ\s*Lab/.test(readFileSync(f, 'utf-8')))
    expect(colpevoli).toEqual([])
  })

  /**
   * 🔴 IL CAMPO GIUSTO, NON SOLO IL TIPO GIUSTO — e questa è l'unica guardia che
   *    lo vede. Le due pagine dello scadenzario sono **componenti server**:
   *    nessuna prova in casa le monta. E `context.lab?.nome` (il laboratorio) e
   *    `context.nome` (il nome di **battesimo dell'utente**) hanno lo **stesso
   *    tipo** `string | null` — `tsc` non distingue, il difetto compila, e il
   *    dentista riceve un sollecito firmato «— Francesco».
   *    ➡️ Verifica statica, come sopra: non è elegante, ma è la differenza fra
   *    «l'ho letto» e «è sorvegliato».
   * ⚠️ Se una pagina nuova comincia a passare `nomeLaboratorio`, va aggiunta a
   *    questo elenco. La guardia non la trova da sé: dice solo la verità sulle
   *    due che conosce.
   */
  const PAGINE_CHE_PASSANO_LA_FIRMA = [
    'src/app/(app)/scadenzario/page.tsx',
    'src/app/(app)/scadenzario/[cliente_id]/page.tsx',
  ]

  for (const pagina of PAGINE_CHE_PASSANO_LA_FIRMA) {
    it(`${pagina} passa il nome del LABORATORIO, non quello dell'utente`, () => {
      const src = readFileSync(pagina, 'utf-8')
      // La prop c'è…
      expect(src).toMatch(/nomeLaboratorio=\{/)
      // …e il valore viene dal laboratorio del contesto, non dall'utente.
      expect(src).toMatch(/nomeLaboratorio=\{context\??\.?lab\?\.nome/)
      // Il caso che DEVE essere rifiutato (R-P1): il nome dell'utente.
      expect(src).not.toMatch(/nomeLaboratorio=\{context\??\.nome/)
    })
  }
})
