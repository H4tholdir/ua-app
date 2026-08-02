import 'server-only'
import { NextResponse } from 'next/server'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { generateDpa } from '@/lib/pdf/generate-dpa'
import { ErroreDatiDpa } from '@/lib/pdf/errori-dpa'
import { puoEmettereDpa } from '@/lib/pdf/permessi-dpa'

// GET /api/clienti/[id]/dpa
// Genera e scarica il DPA GDPR Art. 28 per il cliente specificato
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clienteId } = await params

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    if (!context.laboratorioId) return NextResponse.json({ error: 'Lab non trovato' }, { status: 403 })
    if (!puoEmettereDpa(context.ruolo)) {
      return NextResponse.json({ error: 'Non autorizzato — solo titolari' }, { status: 403 })
    }
    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard
    const labId: string = context.laboratorioId

    try {
      // `generateDpa` non genera: EMETTE (Task 4). Il numero progressivo è il
      // nome vero del documento — quello scritto nel registro
      // `data_processing_agreements` e quello stampato dentro il PDF — quindi è
      // anche il nome del file che lo studio si ritrova sul disco.
      // 🔑 Prima qui c'era un pezzo dell'id del cliente in maiuscolo
      //    (`DPA-CLI-001.pdf`): due scarichi dello stesso dentista, a un anno di
      //    distanza e con due testi diversi, arrivavano con lo STESSO nome —
      //    e nessuno dei due nomi diceva quale emissione fosse.
      // 🔑 Questo header decide il nome da SOLO: l'`<a>` della scheda cliente è
      //    nudo. L'attributo `download`, che ne proponeva un altro, è stato
      //    tolto il 03/08/2026 (Task 8, `c1a1145d`).
      //    `MISURATO il 03/08/2026` col markup di OGGI, sonda usa-e-getta sui
      //    tre motori — WebKit compreso perché è Safari, quindi l'iPhone:
      //      chromium · firefox · webkit → salvano tutti `DPA-2026-0007.pdf`.
      //    📌 STORIA, non regola viva: la nota sulla PRECEDENZA che stava qui
      //    (HTML Standard, «getting the suggested filename» — il
      //    `Content-Disposition` si prende al passo 2, il `download` si guarda
      //    solo ai passi 7-9) serviva quando i pretendenti erano due. Oggi il
      //    secondo non esiste più. Referto Task 7 §5-B.
      const emissione = await generateDpa(labId, clienteId, context.userId)
      const filename = `${emissione.numero_dpa}.pdf`

      return new NextResponse(new Uint8Array(emissione.buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (e) {
      // 🛑 PRIMA i quattro cammini che NON sono colpa del servizio. Lo stato lo
      //    porta l'errore, deciso all'ORIGINE (`errori-dpa.ts`): 404 per i «non
      //    trovato», 422 per i dati fiscali incompleti. Qui non si indovina
      //    niente dal TESTO del messaggio — che era l'unica alternativa, e si
      //    sarebbe rotta in silenzio alla prima riscrittura di una frase.
      //    🔑 Il caso vivo: `generate-dpa.ts:93` filtra il cliente anche per
      //    `laboratorio_id`, quindi un collegamento vecchio, un cliente
      //    cancellato o l'id di un ALTRO laboratorio arrivano qui. Fino al
      //    03/08/2026 rispondevano 500, cioè «è rotta UÀ», per una richiesta
      //    che puntava a un dato che non c'è.
      if (e instanceof ErroreDatiDpa) {
        // 📌 `codice` è un'AGGIUNTA: chi legge solo `error` continua a funzionare.
        //    Serve al browser per sapere DOVE mandare a rimediare, senza diramare
        //    sul testo italiano del messaggio.
        return NextResponse.json({ error: e.message, codice: e.codice }, { status: e.stato })
      }
      // 🛑 Tutto il resto è 500, NON 400 — e il conto si dice ESATTO, non «la grande maggioranza».
      //    `provato:` `grep -n "throw new" src/lib/pdf/generate-dpa.ts`
      //    → **UNDICI**, di cui **SETTE** guasti del servizio, e sono questi
      //    (:106 lettura fallita · :159 registro non leggibile · :182 archivio
      //    non raggiungibile · :206 orfana non archiviata · :231 numero non
      //    assegnato · :281 PDF non conservato · :384 riga non scritta).
      //    Gli altri **QUATTRO** (:81 e :84 Partita IVA · :115 e :116 «non
      //    trovato») sono usciti da questo ramo: li prende l'`if` qui sopra.
      //    ⚠️ Il conto che stava scritto qui diceva «delle ~12 strade DIECI
      //    sono guasti del servizio». Non tornava, e il numero gonfiato faceva
      //    sembrare trascurabile proprio la parte raccontata male.
      //    🛑 RITIRATA anche la ragione che stava qui — «nessuna sorveglianza
      //    conta un 4xx come errore». In questo repo una sorveglianza NON C'È:
      //    `provato:` `grep -rniE "sentry|captureException" src package.json`
      //    → nessuna riga; `vercel.json` è `{"regions":["dub1"]}` e basta.
      //    Un argomento che poggia su un sistema inesistente non vale, nemmeno
      //    quando la conclusione a cui arriva è giusta. Quella buona è che lo
      //    stato HTTP è un'affermazione su CHI ha sbagliato: su questi sette
      //    ha sbagliato UÀ, e il 500 lo dice giusto.
      // 📌 `e.message` resta: qui arrivano solo testi FISSI e curati
      //    (`generate-dpa.ts` li ha chiusi tutti a monte), e questo corpo JSON è
      //    davvero l'unico canale verso chi scarica — nessun codice client
      //    dirama sullo stato, il tasto è un `<a href>` e basta.
      //    `MISURATO il 03/08/2026`, sonda usa-e-getta sui tre motori, con gli
      //    header VERI di QUESTO ramo (500 · `application/json` · NIENTE
      //    `Content-Disposition`) e il markup di OGGI, `<a>` senza `download`:
      //      chromium · firefox · webkit → NAVIGANO e MOSTRANO il corpo JSON.
      //    🛑 QUESTA RIGA VA LETTA CON LA SUA DATA. Fino al 03/08/2026 l'`<a>`
      //    portava `download`, e con quell'attributo il corpo non lo vedeva
      //    NESSUNO: stessa sonda, stessi tre motori → chromium e webkit
      //    salvano il JSON su disco come finto PDF, firefox fa un clic morto.
      //    La riga che stava qui prima diceva già «mostra il corpo», ma è stata
      //    scritta PRIMA che l'attributo sparisse: descriveva un mondo che
      //    ancora non c'era, e si dichiarava misurata. È diventata vera dopo,
      //    per merito di un altro task — non era vera quando l'hanno scritta.
      //    Toglierlo costerebbe l'unico messaggio utile («Partita IVA
      //    mancante») senza chiudere nessuna fuga vera.
      const msg = e instanceof Error ? e.message : 'Errore generazione DPA'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  })
}
