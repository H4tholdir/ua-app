// @vitest-environment node
// ═══════════════════════════════════════════════════════════════════════════
// P23 — IL SALVATAGGIO DEI FILE SI FERMAVA A 1000 PER CARTELLA E SI DICHIARAVA
//       RIUSCITO
//
// IL DIFETTO. `elenca()` in `scripts/salvataggio-archivio.mjs` chiedeva
// `limit: 1000, offset: 0` UNA VOLTA SOLA. Una cartella con più di 1000 oggetti
// ne restituiva 1000: gli altri, per il salvataggio, non esistevano. Nessun
// errore, nessun avviso, conteggio finale > 0 e la scritta «riuscito».
//   🔑 La cartella più piena ne aveva VENTI il 04/08/2026 — quindi il difetto non
//   mordeva ancora, e non avrebbe avvisato nel giorno in cui cominciava. Le foto
//   cliniche dei pazienti i 1000 li raggiungono.
//
// PERCHÉ QUESTE PROVE LANCIANO LO SCRIPT DAVVERO, invece di importarne un pezzo.
// Questo file gira ogni notte da una COPIA in ~/Library, senza `node_modules`
// accanto (D139). Spezzarlo per rendere `elenca` importabile avrebbe voluto dire
// toccare il suo avvio — e in uno script di salvataggio un avvio che non parte è
// il difetto peggiore possibile: non salva niente e non lo dice. 🔑 Quindi si
// prova quello che gira: processo figlio, archivio finto, file veri su disco.
//   L'unica cosa aggiunta per rendere la prova possibile è che le credenziali si
//   leggano dall'AMBIENTE quando c'è (in esercizio l'ambiente è vuoto e si
//   continua a leggere `.env.local`, come sempre).
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const eseguiFile = promisify(execFile)
const SCRIPT = resolve(process.cwd(), 'scripts/salvataggio-archivio.mjs')
const PER_PAGINA = 1000

/** Un archivio finto che parla come quello vero: elenco a pagine e scarico. */
function archivioFinto(opzioni: {
  /** quanti file mettere nella cartella «foto» */
  quanti: number
  /** percorsi che al momento dello scarico rispondono con un guasto */
  rotti?: Set<string>
  /**
   * Quanti oggetti restituire al massimo per pagina, ANCHE se ne sono stati
   * chiesti di più. Serve a fingere un archivio «avaro»: ne dà meno del limite
   * pur avendone altri. 🔑 È il caso che ha fatto cambiare la condizione
   * d'arresto in revisione — con «mi fermo se ne tornano meno di 1000» qui si
   * perderebbero file in silenzio, cioè P23 di nuovo con un numero diverso.
   */
  tettoPerPagina?: number
}) {
  const rotti = opzioni.rotti ?? new Set<string>()
  const tetto = opzioni.tettoPerPagina
  const nomi = Array.from({ length: opzioni.quanti }, (_, i) => `foto/f${String(i).padStart(5, '0')}.jpg`)

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x')
    const p = decodeURIComponent(url.pathname)

    // 1) l'elenco dei secchi
    if (p === '/storage/v1/bucket') {
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify([{ name: 'clinico' }]))
    }

    // 2) l'elenco degli oggetti, A PAGINE — come fa l'archivio vero
    if (p.startsWith('/storage/v1/object/list/')) {
      let corpo = ''
      req.on('data', (c) => (corpo += c))
      req.on('end', () => {
        const { prefix, limit, offset } = JSON.parse(corpo || '{}')
        res.setHeader('content-type', 'application/json')
        if (!prefix) {
          // la radice contiene UNA cartella: si riconosce da `id: null`
          return res.end(JSON.stringify(offset > 0 ? [] : [{ name: 'foto', id: null }]))
        }
        const quanti = tetto ? Math.min(limit, tetto) : limit
        const dentro = nomi
          .filter((n) => n.startsWith(`${prefix}/`))
          .map((n) => n.slice(prefix.length + 1))
          .slice(offset, offset + quanti)
        return res.end(JSON.stringify(dentro.map((n, i) => ({ name: n, id: `id-${offset + i}` }))))
      })
      return
    }

    // 3) lo scarico di un file
    if (p.startsWith('/storage/v1/object/')) {
      const percorso = p.replace('/storage/v1/object/clinico/', '')
      if (rotti.has(percorso)) {
        res.statusCode = 500
        return res.end('guasto simulato')
      }
      return res.end(`contenuto di ${percorso}`)
    }

    res.statusCode = 404
    res.end('non trovato')
  })

  return server
}

async function lanciaSalvataggio(server: Server, dest: string) {
  const porta = (server.address() as { port: number }).port
  return eseguiFile('node', [SCRIPT, dest], {
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${porta}`,
      SUPABASE_SERVICE_ROLE_KEY: 'chiave-finta',
    },
    maxBuffer: 32 * 1024 * 1024,
  })
}

describe('P23 — il salvataggio scorre le pagine e non si ferma a 1000', () => {
  let server: Server
  let dest: string

  beforeAll(async () => {
    // 1200: superato il limite di 1000 di quanto basta perché il difetto vecchio
    // ne perdesse 200 in silenzio, senza far durare la prova più del necessario.
    server = archivioFinto({ quanti: 1200 })
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
    dest = mkdtempSync(join(tmpdir(), 'ua-salv-'))
    await lanciaSalvataggio(server, dest)
  }, 120000)

  afterAll(() => {
    server?.close()
    if (dest) rmSync(dest, { recursive: true, force: true })
  })

  it('scarica TUTTI i 1200 file, non i primi 1000', () => {
    const scaricati = readdirSync(join(dest, 'clinico', 'foto'))
    expect(scaricati.length).toBe(1200)
  })

  it("l'inventario — quello che il ripristino legge — li elenca tutti e 1200", () => {
    const inv = JSON.parse(readFileSync(join(dest, 'inventario.json'), 'utf8'))
    expect(inv).toHaveLength(1200)
  })

  it('prende anche quelli OLTRE il limite, non solo i primi (il 1000° e il 1199°)', () => {
    // Il difetto vecchio si sarebbe fermato esattamente qui: senza queste due
    // asserzioni, «1200 file» potrebbe voler dire 1200 file sbagliati.
    expect(existsSync(join(dest, 'clinico', 'foto', 'f01000.jpg'))).toBe(true)
    expect(existsSync(join(dest, 'clinico', 'foto', 'f01199.jpg'))).toBe(true)
  })
})

describe('P23 — il caso limite: esattamente 1000, cioè una pagina piena', () => {
  let server: Server
  let dest: string

  beforeAll(async () => {
    // 🔑 Il caso che rompe la condizione d'arresto scritta male. Chi si ferma
    //    quando «la pagina è più corta del richiesto» qui deve chiedere UNA pagina
    //    in più (che torna vuota) invece di credere che ce ne siano altri 1000.
    server = archivioFinto({ quanti: PER_PAGINA })
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
    dest = mkdtempSync(join(tmpdir(), 'ua-salv-'))
    await lanciaSalvataggio(server, dest)
  }, 120000)

  afterAll(() => {
    server?.close()
    if (dest) rmSync(dest, { recursive: true, force: true })
  })

  it('ne scarica esattamente 1000, senza girare a vuoto né perderne', () => {
    expect(readdirSync(join(dest, 'clinico', 'foto')).length).toBe(PER_PAGINA)
  })
})

describe('P23, la seconda metà — un file che non si scarica FERMA il salvataggio', () => {
  let server: Server
  let dest: string
  let uscita = 0
  let errori = ''

  beforeAll(async () => {
    // Il difetto gemello, e la ragione per cui è stato chiuso insieme: senza
    // questo controllo la correzione della paginazione era inverificabile in
    // esercizio — elencare 3000 file e scaricarne 2000 diceva «riuscito».
    server = archivioFinto({ quanti: 10, rotti: new Set(['foto/f00003.jpg']) })
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
    dest = mkdtempSync(join(tmpdir(), 'ua-salv-'))
    try {
      await lanciaSalvataggio(server, dest)
    } catch (e) {
      const err = e as { code?: number; stderr?: string }
      uscita = err.code ?? 0
      errori = err.stderr ?? ''
    }
  }, 120000)

  afterAll(() => {
    server?.close()
    if (dest) rmSync(dest, { recursive: true, force: true })
  })

  it('esce con ERRORE invece di dichiararsi riuscito', () => {
    expect(uscita).toBe(1)
  })

  it('dice quale file manca — un numero senza nomi non si può rimediare', () => {
    expect(errori).toContain('foto/f00003.jpg')
    expect(errori).toContain('INCOMPLETA')
  })

  it('gli altri nove li ha scaricati lo stesso: si ferma, non butta via il lavoro', () => {
    expect(readdirSync(join(dest, 'clinico', 'foto')).length).toBe(9)
  })
})

describe("P23, la revisione — un archivio AVARO non fa perdere file in silenzio", () => {
  let server: Server
  let dest: string

  beforeAll(async () => {
    // 🔑 Il caso che ha fatto cambiare la condizione d'arresto DOPO che il lavoro
    //    sembrava finito. Questo archivio ne restituisce 300 per volta pur
    //    avendone 900: è il comportamento che un'API a pagine NON garantisce di
    //    non avere, e che qui non è provato contro l'archivio vero (`provato:` la
    //    cartella più piena ha 20 file — una prova sotto il limite non dice
    //    niente su cosa succede sopra).
    // 🛑 Con «mi fermo se ne tornano meno di quanti ne ho chiesti» questa prova
    //    troverebbe 300 file su 900, e il salvataggio si dichiarerebbe RIUSCITO:
    //    cioè P23 di nuovo, con un numero diverso.
    server = archivioFinto({ quanti: 900, tettoPerPagina: 300 })
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
    dest = mkdtempSync(join(tmpdir(), 'ua-salv-'))
    await lanciaSalvataggio(server, dest)
  }, 120000)

  afterAll(() => {
    server?.close()
    if (dest) rmSync(dest, { recursive: true, force: true })
  })

  it('li scarica tutti e 900, non i primi 300', () => {
    expect(readdirSync(join(dest, 'clinico', 'foto')).length).toBe(900)
  })

  it("e prende anche l'ultimo, quello oltre la terza pagina", () => {
    expect(existsSync(join(dest, 'clinico', 'foto', 'f00899.jpg'))).toBe(true)
  })
})
