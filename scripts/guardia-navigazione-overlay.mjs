// Guardia «navigare via da un overlay» — il difetto D-2/D-1 del 26/07 non è visibile a jsdom,
// e questo script è la rete che lo prende.
//
// COSA È SUCCESSO (perché questo file esiste). Gli overlay v3 (`Sheet`, `DialogConferma`)
// tengono UNA entry di history per l'intera pila aperta (`src/components/ds/storia-overlay.ts`),
// così il tasto indietro del telefono chiude l'overlay invece di lasciare la pagina. Alla
// chiusura quell'entry si disfa con `history.back()`. Quando però lo stesso gesto chiude
// l'overlay E cambia pagina, quel `history.back()` andava a sbattere contro la navigazione:
//  · D-2 — `history.back()` parte SUBITO (è sincrona da chiamare), il cambio pagina di Next è
//    una transizione asincrona: il back arrivava per primo e cancellava la navigazione. Sullo
//    sheet «Prima di consegnare» il tasto principale «Completa i dati del lavoro» non portava
//    più a `/modifica`: buttava via lo sheet e basta, come se l'utente avesse annullato.
//  · D-1 — nel verso opposto (chi cambia pagina SENZA chiudere: la conferma di uscita, le voci
//    del menu ⋯) la nuova pagina si impilava SOPRA la nostra entry, che restava sepolta lì
//    sotto: tornando indietro la prima pressione atterrava sull'entry sepolta — stesso indirizzo,
//    sembrava a posto — e la SECONDA non faceva niente. Una pressione morta.
// Il perché la suite unitaria non li vedeva: in jsdom `history.back()` è sincrona e finta,
// mentre nel browser è una traversal asincrona vera — e l'ordine fra quella traversal e la
// navigazione È il difetto. La suite è rimasta verde per tutto il tempo.
//
// COSA FA: guida un browser vero contro l'applicazione vera (build di produzione già in
// esecuzione) e misura, su tre superfici, tre cose che solo un browser può dire:
//   1. dopo il tap, l'indirizzo è DAVVERO quello di destinazione (D-2);
//   2. `history.length` dopo la navigazione è lo STESSO di quando l'overlay era aperto — cioè
//      la destinazione ha preso IL POSTO della nostra entry, non le si è messa sopra (D-1);
//   3. due pressioni «indietro» di fila: la prima torna alla pagina di partenza, la seconda
//      DEVE cambiare qualcosa (se non cambia niente è la pressione morta).
// Più la proprietà che non deve mai regredire: col dialogo di conferma aperto sopra uno sheet,
// una pressione «indietro» ANNULLA e non conferma mai — verificata guardando il dato dopo un
// ricarico, non l'assenza di un messaggio a schermo.
//
// USO:  node scripts/guardia-navigazione-overlay.mjs
//   uscita 0 = tutto a posto · 1 = difetto misurato · 2 = un braccio non ha potuto misurare
//   (manca la fixture: v. «precondizione di dati» qui sotto)
//   Variabili: BASE (default http://localhost:3020), UA_EMAIL, UA_PASSWORD, LAVORO_ID.
//   Serve un'istanza dell'app in esecuzione e le credenziali del banco: senza, la guardia si
//   dichiara NON ESEGUITA ed esce 1 — non esiste un «verde per assenza di prove».
//
// ⚠️ PRECONDIZIONE DI DATI DEL PRIMO BRACCIO — il seed standard NON la soddisfa.
//   Il primo braccio ha bisogno di un lavoro nella pila ROSSA che sia consegnabile (stato
//   `pronto` o `in_ritardo`) e che abbia almeno un ostacolo alla consegna — tipicamente il
//   paziente non ancora identificato, che è ciò che fa comparire la riga «Tocca per risolvere».
//   Sul banco di collaudo (26/07/2026) la pila rossa è VUOTA e `npx tsx scripts/seed-e2e.ts` non
//   ne crea uno: ricostruire l'applicazione non cambia il database, quindi questo braccio resta
//   non misurato finché qualcuno non prepara la fixture a mano. Ricetta (E2E-CAS-002 è il
//   candidato: nella cassetta C3, senza paziente, quindi con l'ostacolo giusto già addosso):
//
//     -- prepara
//     update lavori set stato='pronto', data_consegna_prevista=current_date
//      where numero_lavoro='E2E-CAS-002';
//     -- rimetti com'era, SUBITO dopo la misura
//     update lavori set stato='in_lavorazione', data_consegna_prevista='2026-12-31'
//      where numero_lavoro='E2E-CAS-002';
//
//   (E2E-CAS-001 non si tocca: il banco lo vuole `in_lavorazione`, senza paziente, non
//   consegnato.) Senza la fixture la guardia NON diventa verde e NON si limita a saltare in
//   silenzio — un braccio saltato in silenzio è esattamente il modo in cui questo difetto è
//   arrivato fin qui: esce **2** («incomplèta»), distinto dall'1 di un difetto vero, e stampa
//   questa ricetta. Gli altri due bracci danno comunque il loro verdetto.
//
// ⚠️ Le pressioni «indietro» qui sono traversal VERE (`page.goBack()`), mai un `popstate`
// sintetico: un evento sintetico è esattamente ciò che fanno i test unitari, ed è ciò che non
// ha visto il difetto.
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3020'
const EMAIL = process.env.UA_EMAIL ?? 'e2e-titolare@ua-test.local'
const PASSWORD = process.env.UA_PASSWORD ?? 'TestE2E!2026'
const LAVORO = process.env.LAVORO_ID ?? '00000000-0000-0000-0000-000000000030'

const guasti = []
/** Bracci che non hanno potuto misurare per mancanza di dati sul banco: non sono difetti, ma
 *  nemmeno un verde — hanno un'uscita tutta loro (2), per non abituare nessuno a ignorare il rosso. */
const nonMisurati = []
const nota = []

const RICETTA = `   Il primo braccio ha bisogno di un lavoro consegnabile nella pila rossa, con un ostacolo
   alla consegna. Il seed standard non lo crea. Preparalo e RIMETTILO com'era:
     update lavori set stato='pronto', data_consegna_prevista=current_date
      where numero_lavoro='E2E-CAS-002';
     -- ... esegui la guardia ...
     update lavori set stato='in_lavorazione', data_consegna_prevista='2026-12-31'
      where numero_lavoro='E2E-CAS-002';
   (E2E-CAS-001 non si tocca.)`

/** Firma osservabile: indirizzo, profondità della history, overlay dipinti. Sola lettura. */
async function firma(page) {
  return page.evaluate(() => {
    const visibile = (el) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
    }
    return {
      url: location.pathname + location.search,
      len: history.length,
      marca: history.state?.uaSheet === true ? 'uaSheet' : history.state?.uaDialog === true ? 'uaDialog' : null,
      sheet: [...document.querySelectorAll('.ds-sheet')].filter(visibile).length,
      dialogo: [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')]
        .filter((d) => !d.classList.contains('ds-sheet'))
        .filter(visibile).length,
    }
  })
}

/** Una pressione «indietro» vera. `goBack` su una traversal same-document può non risolvere su
 *  'commit': la traversal parte comunque, quindi il timeout non è un errore. */
async function indietro(page) {
  try {
    await page.goBack({ waitUntil: 'commit', timeout: 8000 })
  } catch (e) {
    if (!/Timeout|net::ERR_ABORTED/.test(String(e))) throw e
  }
  await page.waitForTimeout(900)
}

const immobile = (a, b) => a.url === b.url && a.sheet === b.sheet && a.dialogo === b.dialogo

let browser
try {
  browser = await chromium.launch()
} catch (e) {
  console.error('❌ GUARDIA NON ESEGUITA — Playwright non parte:', String(e).slice(0, 200))
  process.exit(1)
}

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
const login = await ctx.newPage()
try {
  await login.goto(`${BASE}/login`, { timeout: 20000 })
  await login.fill('input[type=email], [name=email]', EMAIL)
  await login.fill('input[type=password], [name=password]', PASSWORD)
  await login.click('button[type=submit]')
  await login.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 })
} catch (e) {
  console.error(`❌ GUARDIA NON ESEGUITA — nessuna app raggiungibile su ${BASE} (o credenziali del banco sbagliate):`, String(e).slice(0, 200))
  await browser.close()
  process.exit(1)
}
await login.close()

/**
 * Un braccio della guardia: apri un overlay, tocca la cosa che porta altrove, e misura.
 * `attesa` è l'indirizzo di destinazione, `partenza` quello da cui si è partiti.
 */
async function braccio({ nome, partenza, apri, tocca, attesa }) {
  const page = await ctx.newPage()
  try {
    // due passi veri prima della partenza: serve storia sotto, per distinguere «tornato alla
    // pagina di partenza» da «uscito dall'applicazione».
    await page.goto(`${BASE}/tutto-il-resto`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    await page.goto(`${BASE}${partenza}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1500)
    const p0 = await firma(page)

    if (!(await apri(page))) {
      nonMisurati.push(`[${nome}] non sono riuscito ad aprire l'overlay: il banco non ha i dati che servono`)
      return
    }
    await page.waitForTimeout(2000)
    const aperto = await firma(page)
    if (aperto.sheet + aperto.dialogo === 0) {
      guasti.push(`[${nome}] l'overlay non è comparso: la guardia non ha misurato niente`)
      return
    }
    if (!aperto.marca) {
      // Precondizione dell'intero disegno: la nostra entry deve essere riconoscibile in cima.
      // Se Next la sovrascrivesse, la cessione non scatterebbe e tornerebbero le entry orfane.
      guasti.push(`[${nome}] con l'overlay aperto la nostra entry non è più riconoscibile in cima alla history (nessuna marca uaSheet/uaDialog)`)
      return
    }

    await tocca(page)
    await page.waitForTimeout(3000)
    const dopo = await firma(page)

    if (!attesa.test(dopo.url)) {
      guasti.push(`[${nome}] D-2: il tap non porta a destinazione — resto su ${dopo.url} invece di ${attesa}`)
      return
    }
    if (dopo.len !== aperto.len) {
      guasti.push(`[${nome}] D-1: la destinazione si è IMPILATA sopra l'entry dell'overlay invece di sostituirla (profondità ${aperto.len} → ${dopo.len}): resta un'entry sepolta, cioè una pressione indietro morta`)
    }
    if (dopo.sheet + dopo.dialogo > 0) {
      guasti.push(`[${nome}] l'overlay resta dipinto sopra la pagina nuova`)
    }

    await indietro(page)
    const b1 = await firma(page)
    if (b1.url !== p0.url) {
      guasti.push(`[${nome}] la prima pressione indietro non riporta alla pagina di partenza: ${b1.url} invece di ${p0.url}`)
    }
    await indietro(page)
    const b2 = await firma(page)
    if (immobile(b1, b2)) {
      guasti.push(`[${nome}] D-1: la SECONDA pressione indietro non fa niente (pressione morta su ${b2.url}) — è l'entry dell'overlay rimasta sepolta`)
    }
    nota.push(`${nome}: destinazione raggiunta, profondità ${aperto.len} → ${dopo.len}, ritorno ${b1.url} poi ${b2.url}`)
  } finally {
    await page.close()
  }
}

// ── 1. D-2 in persona: il tasto principale dello sheet «Prima di consegnare» ────────────────
// Si parte dalla pila rossa (`PilaAperta`), uno dei siti in cui il difetto è stato misurato.
await braccio({
  nome: 'consegna dalla pila → completa i dati',
  partenza: '/lavori?pila=rossa',
  apri: async (page) => {
    const b = page.locator('.ds-tasto-consegna-inline')
    if ((await b.count()) === 0) return false
    if (await b.first().isDisabled()) return false
    await b.first().click()
    return true
  },
  tocca: async (page) => {
    const riga = page.locator('.ds-riga-bloccante').first()
    if ((await riga.count()) === 0) throw new Error('nessuna riga bloccante nello sheet di consegna')
    await riga.click()
  },
  attesa: /\/modifica/,
})

// ── 2. D-1 in persona: una voce del menu ⋯, che naviga tenendo lo sheet aperto ──────────────
await braccio({
  nome: 'menu ⋯ → ponte di modifica',
  partenza: `/lavori/${LAVORO}`,
  apri: async (page) => {
    const b = page.getByRole('button', { name: 'Apri menu' })
    if ((await b.count()) === 0) return false
    await b.click()
    return true
  },
  tocca: async (page) => {
    await page.locator('.ds-sheet').getByText(/Prezzi e lavorazioni/).first().click()
  },
  attesa: /\/modifica/,
})

// ── 3. La proprietà che non deve MAI regredire: indietro annulla, non conferma ──────────────
// Dialogo di conferma aperto SOPRA uno sheet: una pressione indietro chiude SOLO il dialogo, lo
// sheet resta; una seconda chiude lo sheet; e la cassetta è ancora al suo posto dopo un ricarico
// (si guarda il DATO, non l'assenza di un messaggio).
{
  const page = await ctx.newPage()
  try {
    await page.goto(`${BASE}/cassette`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1800)
    const cassette = page.locator('.ds-cassetta, [data-cassetta]')
    const quante = await cassette.count()
    // 🛑 SOLO le cassette LIBERE, e non è pignoleria: una cassetta OCCUPATA porta
    //    al lavoro che contiene (navigazione), non apre nessuno sheet — quindi
    //    `first()` dava un rosso FALSO ogni volta che la prima cassetta del banco
    //    era occupata. Misurato il 02/08 (T13): la C1 è occupata, il click portava
    //    alla scheda di E2E-CAS-001 e il braccio dichiarava «lo sheet non si è
    //    aperto». Lo sheet con l'azione distruttiva («Butta via») è quello della
    //    cassetta libera, ed è l'unico che questa proprietà può misurare.
    const libere = page.locator('.ds-cassetta.is-libera, [data-cassetta].is-libera')
    const quanteLibere = await libere.count()
    if (quante === 0) {
      nonMisurati.push('[indietro non conferma] nessuna cassetta sulla parete: proprietà critica non misurata')
    } else if (quanteLibere === 0) {
      nonMisurati.push(
        `[indietro non conferma] sulla parete ci sono ${quante} cassette ma nessuna LIBERA: ` +
          'una cassetta occupata porta al suo lavoro invece di aprire lo sheet, quindi la proprietà non è misurabile. ' +
          'Libera una cassetta sul banco e rilancia',
      )
    } else {
      await libere.first().click()
      await page.waitForTimeout(1600)
      const conSheet = await firma(page)
      if (conSheet.sheet === 0) {
        guasti.push('[indietro non conferma] lo sheet della cassetta non si è aperto')
      } else {
        const distruttivo = page.locator('.ds-sheet').getByText(/Butta via/).first()
        if ((await distruttivo.count()) === 0) {
          guasti.push('[indietro non conferma] non trovo l\'azione distruttiva nello sheet della cassetta')
        } else {
          await distruttivo.click()
          await page.waitForTimeout(1400)
          const conDialogo = await firma(page)
          if (conDialogo.dialogo === 0) {
            guasti.push('[indietro non conferma] il dialogo di conferma non si è aperto sopra lo sheet')
          } else {
            await indietro(page)
            const dopo1 = await firma(page)
            if (dopo1.dialogo !== 0) guasti.push('[indietro non conferma] la prima pressione indietro non ha chiuso il dialogo')
            if (dopo1.sheet === 0) guasti.push('[indietro non conferma] la prima pressione indietro ha chiuso ANCHE lo sheet: doveva togliere solo il dialogo')
            await indietro(page)
            const dopo2 = await firma(page)
            if (dopo2.sheet !== 0) guasti.push('[indietro non conferma] la seconda pressione indietro non ha chiuso lo sheet')
            // Il dato, non il messaggio: dopo un ricarico le cassette devono essere quelle di prima.
            await page.reload({ waitUntil: 'networkidle' })
            await page.waitForTimeout(1600)
            const rimaste = await page.locator('.ds-cassetta, [data-cassetta]').count()
            if (rimaste !== quante) {
              guasti.push(`[indietro non conferma] ⛔ una pressione indietro ha CONFERMATO l'azione distruttiva: le cassette erano ${quante}, dopo il ricarico sono ${rimaste}`)
            } else {
              nota.push(`indietro non conferma: dialogo via, sheet resta, secondo indietro chiude lo sheet, ${rimaste} cassette intatte dopo il ricarico`)
            }
          }
        }
      }
    }
  } finally {
    await page.close()
  }
}

// ── 4. I TRE STRATI DELL'ALBUM: indietro ne chiude UNO per volta ────────────────────────────
// Aggiunto da T13 (02/08/2026). Senza questo braccio la guardia non guarda affatto la
// superficie nuova dell'ondata (b) — e la superficie nuova è proprio quella che impila TRE
// overlay sopra la stessa pagina (visore → tendina → conferma), cioè il caso peggiore per una
// entry sola di history.
// 🔑 Tutti e tre entrano con la marca `uaSheet` (`VisoreFoto.tsx:115`, `TendinaMenu.tsx:130`,
//    `FoglioConferma.tsx:188`): è la marca che `firma()` sa riconoscere, quindi nessun rosso
//    falso — ed è una delle ragioni per cui è stata scelta.
// 🛑 Le pressioni sono traversal VERE (`page.goBack()`), mai un `popstate` sintetico: proprio
//    questo difetto — un overlay che si chiudeva da solo perché il `popstate` di un
//    `history.back()` arrivava in ritardo — è passato indenne davanti a 4.230 prove unitarie,
//    perché jsdom non esegue nessuna traversal (T12, 02/08).
{
  const page = await ctx.newPage()
  try {
    await page.goto(`${BASE}/lavori/${LAVORO}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const apri = page.getByRole('button', { name: /^Apri la foto grande/ })
    if ((await apri.count()) === 0) {
      nonMisurati.push(
        '[album: tre strati] il lavoro di prova non ha foto, quindi la carta album non offre «Apri»: ' +
          'carica una foto su quel lavoro e rilancia',
      )
    } else {
      await apri.click()
      await page.waitForTimeout(1500)
      const conVisore = await firma(page)
      if (conVisore.sheet + conVisore.dialogo === 0) {
        guasti.push('[album: tre strati] il visore non si è aperto')
      } else if (!conVisore.marca) {
        guasti.push('[album: tre strati] col visore aperto la nostra entry non è riconoscibile in cima alla history')
      } else {
        // ① il visore da solo: indietro lo chiude e NON lascia la pagina.
        await indietro(page)
        const dopoVisore = await firma(page)
        if (dopoVisore.sheet + dopoVisore.dialogo !== 0) {
          guasti.push('[album: tre strati] indietro non ha chiuso il visore')
        }
        if (!dopoVisore.url.includes(LAVORO)) {
          guasti.push(`[album: tre strati] indietro ha lasciato la scheda invece di chiudere il visore: ${dopoVisore.url}`)
        }

        // ② visore + tendina: la prima pressione toglie SOLO la tendina.
        await apri.click()
        await page.waitForTimeout(1200)
        const tondo = page.getByRole('button', { name: 'Altre cose da fare su questa foto' })
        if ((await tondo.count()) === 0) {
          guasti.push('[album: tre strati] il ⋯ del visore non c\'è')
        } else {
          await tondo.click()
          await page.waitForTimeout(1000)
          const conTendina = await page.getByRole('menu').count()
          if (conTendina === 0) {
            guasti.push('[album: tre strati] la tendina del ⋯ non si è aperta')
          } else {
            await indietro(page)
            await page.waitForTimeout(600)
            if ((await page.getByRole('menu').count()) !== 0) {
              guasti.push('[album: tre strati] indietro non ha chiuso la tendina')
            }
            const restaVisore = await firma(page)
            if (restaVisore.sheet + restaVisore.dialogo === 0) {
              guasti.push('[album: tre strati] ⛔ indietro ha chiuso ANCHE il visore: doveva togliere solo la tendina')
            } else {
              nota.push('album: tre strati — indietro chiude la tendina e lascia il visore aperto sotto')
            }
            // ③ e la conferma distruttiva sopra i due: indietro ANNULLA, mai conferma.
            const foteErano = await page.getByRole('button', { name: /^Apri la foto grande/ }).count()
            await tondo.click()
            await page.waitForTimeout(900)
            const voce = page.getByRole('menuitem', { name: /Elimina foto/ })
            if ((await voce.count()) === 0) {
              nonMisurati.push('[album: tre strati] la voce «Elimina foto» non è offerta (lavoro consegnato?): terzo strato non misurato')
            } else {
              await voce.click()
              await page.waitForTimeout(1200)
              await indietro(page)
              await page.waitForTimeout(900)
              // Il DATO, non il messaggio: dopo un ricarico la foto deve esserci ancora.
              await page.reload({ waitUntil: 'networkidle' })
              await page.waitForTimeout(2200)
              const dopoRicarico = await page.getByRole('button', { name: /^Apri la foto grande/ }).count()
              if (dopoRicarico < foteErano) {
                guasti.push('[album: tre strati] ⛔ una pressione indietro ha CONFERMATO l\'eliminazione: la foto non c\'è più dopo il ricarico')
              } else {
                nota.push('album: tre strati — indietro sulla conferma annulla: la foto è ancora lì dopo il ricarico')
              }
            }
          }
        }
      }
    }
  } finally {
    await page.close()
  }
}

await browser.close()

nota.forEach((n) => console.log('   ', n))
if (guasti.length) {
  console.error('❌ GUARDIA NAVIGAZIONE-OVERLAY ROSSA')
  guasti.forEach((g) => console.error('   -', g))
  nonMisurati.forEach((n) => console.error('   ~ (non misurato)', n))
  process.exit(1)
}
if (nonMisurati.length) {
  console.error('⚠️  GUARDIA NAVIGAZIONE-OVERLAY INCOMPLETA — nessun difetto misurato, ma un braccio non ha misurato niente')
  nonMisurati.forEach((n) => console.error('   -', n))
  console.error(RICETTA)
  process.exit(2)
}
console.log('✅ navigare da un overlay: si arriva a destinazione, nessuna entry sepolta, nessuna pressione indietro morta, e indietro non conferma mai')
