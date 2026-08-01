import 'server-only'
import { NextResponse } from 'next/server'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { generateDpa } from '@/lib/pdf/generate-dpa'

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
    if (!['titolare', 'admin_rete', 'admin_sistema'].includes(context.ruolo ?? '')) {
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
      const emissione = await generateDpa(labId, clienteId)
      const filename = `${emissione.numero_dpa}.pdf`

      return new NextResponse(new Uint8Array(emissione.buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (e) {
      // 🛑 500, NON 400 — e il conto si dice ESATTO, non «la grande maggioranza».
      //    `provato:` `grep -n "throw new Error" src/lib/pdf/generate-dpa.ts`
      //    → **UNDICI**, di cui **SETTE** guasti del servizio (:97 lettura
      //    fallita · :144 registro non leggibile · :167 archivio non
      //    raggiungibile · :191 orfana non archiviata · :216 numero non
      //    assegnato · :266 PDF non conservato · :369 riga non scritta) e
      //    **QUATTRO** che non lo sono (:72 e :75 Partita IVA mancante, :100
      //    «Laboratorio non trovato», :101 «Cliente non trovato»).
      //    Un 400 direbbe «hai sbagliato tu» sui sette; un 500 dice «è colpa
      //    nostra» sui quattro. Oggi si sbaglia dalla seconda parte, che è il
      //    verso meno dannoso — ma è pur sempre un errore, ed è aperto.
      //    🛑 RITIRATA la ragione che stava qui — «nessuna sorveglianza conta un
      //    4xx come errore». In questo repo una sorveglianza NON C'È:
      //    `provato:` `grep -rniE "sentry|captureException" src package.json`
      //    → nessuna riga; `vercel.json` è `{"regions":["dub1"]}` e basta.
      //    Un argomento che poggia su un sistema inesistente non vale, nemmeno
      //    quando la conclusione a cui arriva è giusta.
      //    ⚠️ La rotta NON può distinguere i casi: le arriva un `Error` e basta.
      //    Discriminare sul TESTO del messaggio legherebbe questa rotta alla
      //    prosa di `generate-dpa.ts` senza nessun aggancio che il compilatore
      //    veda — un legame che si romperebbe in silenzio. La classificazione
      //    fine (503 per l'archivio, 404 per il cliente assente, 422 per la
      //    Partita IVA mancante) va fatta all'ORIGINE, con un errore tipato:
      //    è fuori dal mandato di questo task e va RIFERITA (R-E2).
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
