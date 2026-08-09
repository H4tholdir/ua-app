import { describe, it, expect, vi, afterEach } from 'vitest'

// 🛑 `server-service.ts` apre con `import 'server-only'`, che in Node è un `throw`
//    nudo (`node_modules/server-only/index.js`). Senza questa riga il secondo
//    gruppo di prove non riesce nemmeno a importare il modulo. Non è un finto del
//    client: è togliere il cartello «solo lato server», che qui è **vero** — una
//    prova gira lato server per definizione.
vi.mock('server-only', () => ({}))

import { withRollback, skipIntegrationTests } from './helpers/pg-client'
import { getServiceClient } from '@/lib/supabase/server-service'
import {
  COLONNE,
  avvisiDaComunicare,
  archivioCliente,
  avvisoPerLaScheda,
} from '@/lib/avvisi/queries'

// LE COLONNE CHE `src/lib/avvisi/queries.ts` CHIEDE ESISTONO DAVVERO.
// Nato dalla revisione del Task 6 dell'ondata «l'avviso al dentista».
//
// 🔴 IL BUCO CHE CHIUDE, e non è teorico. Le due letture ripiegano su una lista
//    vuota quando il banco risponde errore (`vuotoConNota`): è la scelta di
//    `caricaTinteScheda`, ed è giusta — far cadere la scheda intera sarebbe
//    peggio. Ma nessuna prova legava `COLONNE` allo schema, e `data as unknown as
//    AvvisoRiga[]` toglie a `tsc` ogni modo di accorgersi di un nome sbagliato.
//    ➡️ Il giorno in cui una colonna venisse rinominata, la lettura risponderebbe
//    errore, il promemoria **ex Art. 19 GDPR sparirebbe per sempre e in
//    silenzio**, e le dodici prove unitarie resterebbero **verdi**: interrogano un
//    finto, e un finto non ha uno schema da smentire.
//
// 🛑 SOLA LETTURA, ZERO RIGHE. `LIMIT 0` non ha bisogno che la tabella contenga
//    niente, quindi il `REVOKE` dell'`INSERT` su `avvisi_dentista` — la ragione
//    dichiarata nel Task 6 per non scrivere una prova d'integrazione — non
//    riguarda questo caso. E la transazione è comunque annullata.
//
// 🔑 PERCHÉ `pg` E NON IL CLIENT SUPABASE, che sarebbe la strada vera del codice.
//    `provato:` letto `.github/workflows/ci.yml` — il passo «Unit tests» riceve
//    `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
//    `SUPABASE_DB_URL`, e **NON** `SUPABASE_SERVICE_ROLE_KEY`. Una prova che
//    costruisse il client di servizio si sarebbe quindi **saltata in CI**, cioè
//    proprio il silenzio che questa prova esiste per rompere. `SUPABASE_DB_URL` è
//    il cancello che CI onora (D333), ed è quello di tutte le sorelle in questa
//    cartella. `COLONNE` è un semplice elenco di colonne: SQL e PostgREST
//    rifiutano gli stessi nomi.
//    ⚠️ Se un giorno `COLONNE` guadagnasse sintassi PostgREST (un alias, un
//    embed `cliente:clienti(*)`), questa prova diventerebbe rossa **con ragione**:
//    quel giorno la lettura non è più un elenco di colonne, e va ripensata.
//
// 🛑 E LE COLONNE SI IMPORTANO, NON SI RICOPIANO. Ribattere qui gli undici nomi
//    farebbe una prova che resta verde su `queries.ts` rinominato: proverebbe la
//    propria copia, non il codice.

describe.skipIf(skipIntegrationTests)('avvisi_dentista — le colonne che il codice chiede esistono', () => {
  it('la `select` di `queries.ts` gira sul banco vero, a zero righe', async () => {
    await withRollback(async (client) => {
      // Un nome sbagliato dentro COLONNE → 42703 «column … does not exist».
      const { rows } = await client.query(
        `SELECT ${COLONNE} FROM public.avvisi_dentista LIMIT 0`
      )
      expect(rows).toHaveLength(0)
    })
  })

  it('e anche i nomi dei FILTRI e degli ORDINAMENTI, che in `COLONNE` non ci sono tutti', async () => {
    // 🔑 `laboratorio_id` è l'unico identificativo che le due letture usano e che
    //    `COLONNE` non nomina — ed è quello che regge l'isolamento fra laboratori
    //    su una strada dove `service_role` scavalca la RLS. Se sparisse dallo
    //    schema, la query morirebbe e il ripiego la renderebbe muta.
    //    Gli altri (`lavoro_id`, `cliente_id`, `stato`, `created_at`, `id`) sono
    //    già dentro `COLONNE`: qui si prova che reggano anche come predicato e
    //    come criterio d'ordine, cioè nella posizione in cui il codice li mette.
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT ${COLONNE} FROM public.avvisi_dentista
          WHERE laboratorio_id = $1 AND lavoro_id = $1 AND cliente_id = $1
            AND stato = ANY($2::text[])
          ORDER BY created_at ASC, id ASC
          LIMIT 0`,
        ['00000000-0000-0000-0000-000000000000', ['da_comunicare']]
      )
      expect(rows).toHaveLength(0)
    })
  })

  it('l’elenco chiesto è TUTTA la tabella meno `laboratorio_id`, e l’omissione è dichiarata', async () => {
    // 🛑 IL VERSO OPPOSTO, e senza di lui la prova sopra sarebbe metà. Un nome
    //    TOLTO da `COLONNE` non fa fallire nessuna `select`: la lettura riesce e
    //    la riga arriva con un campo `undefined`, che `AvvisoRiga` promette
    //    presente. È il modo silenzioso di rompere il Task 9, che di queste
    //    colonne ha bisogno tutte («quando · come · chi · se l'ha aperta»).
    // 🔑 `laboratorio_id` è l'unica esclusa, di proposito: è un FILTRO, non un
    //    dato da mostrare — chi chiama le due letture il laboratorio ce l'ha già
    //    in mano, e rimandarglielo indietro non serve a nessuna schermata.
    // ⚠️ E se un giorno una migration aggiungesse una colonna a questa tabella,
    //    questa riga diventerà rossa: è voluto. Una colonna nuova che nessuna
    //    lettura chiede è una decisione, non un caso — la si prende guardando
    //    `queries.ts`, non lasciando che il dato resti invisibile.
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT attname FROM pg_attribute
          WHERE attrelid = 'public.avvisi_dentista'::regclass
            AND attnum > 0 AND NOT attisdropped
          ORDER BY attnum`
      )
      const nelBanco = rows.map((r) => r.attname as string)
      const chieste = COLONNE.split(',').map((c) => c.trim())
      expect([...chieste].sort()).toEqual(nelBanco.filter((c) => c !== 'laboratorio_id').sort())
      expect(chieste).not.toContain('laboratorio_id')
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// LA STRADA VERA: le stesse letture, ma attraverso il CLIENT DI SERVIZIO.
//
// 🔑 PERCHÉ SERVE ANCHE QUESTO, e la sua mancanza era un buco dichiarato. Le
//    prove qui sopra girano su `pg`, cioè SQL diretto: provano che i nomi delle
//    colonne esistano, non che PostgREST — la strada che il codice usa davvero —
//    li accetti nella forma in cui gliela passiamo. Il client di servizio è
//    l'unico ambiente autorevole, e senza queste righe restava provato solo
//    contro un finto.
//
// 🛑 IL CANCELLO È DIVERSO DA QUELLO DI SOPRA, E LA RAGIONE VA LETTA.
//    `provato:` `.github/workflows/ci.yml` — il passo «Unit tests» riceve
//    `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
//    `SUPABASE_DB_URL`, e **NON** `SUPABASE_SERVICE_ROLE_KEY`. ➡️ Questo gruppo
//    **in CI si salta**, e in locale gira (la chiave è in `.env.local`). NON è
//    un salto silenzioso: è scritto qui, ed è il motivo per cui il gruppo di
//    sopra esiste separato e gira **sempre**, anche in CI.
//    ⚠️ Il giorno in cui `SUPABASE_SERVICE_ROLE_KEY` venisse aggiunta ai segreti
//    del passo «Unit tests», questo gruppo comincerebbe a girare in CI da solo,
//    senza toccare una riga.
//
// 🔑 E SI GUARDA `console.error`, NON IL VALORE DI RITORNO. È il punto di tutta
//    la faccenda: `vuotoConNota` INGHIOTTE l'errore e torna una lista vuota, che
//    è indistinguibile da «non c'è nessun avviso». Una prova che guardasse solo
//    il ritorno sarebbe verde anche con lo schema rotto — cioè riprodurrebbe
//    esattamente il silenzio che stiamo chiudendo. L'unica traccia è il log.

const saltaViaServizio =
  !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL

/** Un laboratorio che non esiste: basta e avanza — si prova la FORMA della
 *  domanda, non il contenuto della risposta. Zero righe è l'esito atteso. */
const LAB_INESISTENTE = '00000000-0000-0000-0000-0000000000ff'
const LAVORO_INESISTENTE = '00000000-0000-0000-0000-0000000000fe'
const CLIENTE_INESISTENTE = '00000000-0000-0000-0000-0000000000fd'

describe.skipIf(saltaViaServizio)('le due letture passano davvero da PostgREST col client di servizio', () => {
  /** Ciò che `vuotoConNota` ha scritto nei log durante la prova in corso. */
  const raccolti: string[] = []

  /**
   * Mette in ascolto sui guasti invece di guardarli dopo.
   * 🔑 Si raccoglie il TESTO, non la spia: la spia di `vi` porta con sé un tipo
   * che `tsc` non riesce a stringere qui (`error TS7006` sul parametro di
   * `calls.map`), e una prova che non compila non è una prova. Il testo basta:
   * è tutto ciò che resta di un guasto che il ripiego ha inghiottito.
   */
  function ascoltaIGuasti() {
    raccolti.length = 0
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      raccolti.push(args.map(String).join(' '))
    })
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** Il guasto non torna al chiamante: si legge nei log, o non si legge affatto. */
  function guasti(): string {
    return raccolti.join('\n')
  }

  it('`avvisiDaComunicare` — nessun errore dal banco, quindi colonne, filtri e ordini sono veri', async () => {
    ascoltaIGuasti()
    const svc = getServiceClient()

    const righe = await avvisiDaComunicare(svc, {
      lavoroId: LAVORO_INESISTENTE,
      laboratorioId: LAB_INESISTENTE,
    })

    expect(guasti(), 'PostgREST ha rifiutato la lettura').toBe('')
    expect(righe).toEqual([])
  })

  it('`archivioCliente` — stessa cosa per la lettura del Task 9', async () => {
    ascoltaIGuasti()
    const svc = getServiceClient()

    const righe = await archivioCliente(svc, {
      clienteId: CLIENTE_INESISTENTE,
      laboratorioId: LAB_INESISTENTE,
    })

    expect(guasti(), 'PostgREST ha rifiutato la lettura').toBe('')
    expect(righe).toEqual([])
  })

  it('`avvisoPerLaScheda` con un ruolo ammesso arriva fino al banco, e non inciampa', async () => {
    // 🔑 Il giro intero come lo fa la scheda: cancello aperto, lettura vera.
    ascoltaIGuasti()
    const svc = getServiceClient()

    const avviso = await avvisoPerLaScheda({
      svc,
      lavoroId: LAVORO_INESISTENTE,
      laboratorioId: LAB_INESISTENTE,
      ruolo: 'titolare',
    })

    expect(guasti(), 'PostgREST ha rifiutato la lettura').toBe('')
    expect(avviso).toBeNull()
  })

  it('🛑 e con un ruolo escluso NON tocca il banco: nemmeno una domanda parte', async () => {
    // ⚖️ D342 provato sulla strada vera, non su un finto: se il cancello guardasse
    // dal verso sbagliato la domanda partirebbe lo stesso, e questa prova non la
    // vedrebbe dal valore di ritorno (`null` in entrambi i casi). Si conta la
    // chiamata a `from()` sul client vero.
    const svc = getServiceClient()
    const spiaFrom = vi.spyOn(svc, 'from')

    const avviso = await avvisoPerLaScheda({
      svc,
      lavoroId: LAVORO_INESISTENTE,
      laboratorioId: LAB_INESISTENTE,
      ruolo: 'admin_rete',
    })

    expect(avviso).toBeNull()
    expect(spiaFrom, 'un ruolo escluso non deve nemmeno interrogare il banco').not.toHaveBeenCalled()
  })
})
