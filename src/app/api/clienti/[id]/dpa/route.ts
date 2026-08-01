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
      // ⚠️ `download` sul <a> di `clienti/[id]/page.tsx` NON vince su questo
      //    header: la precedenza è del `Content-Disposition` (HTML Standard,
      //    «getting the suggested filename», passo 2 — il `download` si legge
      //    solo ai passi 7-9). MISURATO il 03/08/2026 su tutti e tre i motori,
      //    WebKit compreso perché è Safari e quindi l'iPhone: tutti e tre
      //    consegnano `DPA-2026-0007.pdf`. Referto Task 7 §5-B.
      const emissione = await generateDpa(labId, clienteId)
      const filename = `${emissione.numero_dpa}.pdf`

      return new NextResponse(new Uint8Array(emissione.buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    } catch (e) {
      // 🛑 500, NON 400. Delle strade d'errore che arrivano qui, la grande
      //    maggioranza sono guasti del SERVIZIO — registro non leggibile,
      //    archivio non raggiungibile, numero non assegnato, PDF non conservato,
      //    riga non scritta (`generate-dpa.ts`). Un 400 dice al chiamante «hai
      //    sbagliato tu» proprio mentre è UÀ a essere giù: nessuna sorveglianza
      //    conta un 4xx come errore, e nessun rilancio automatico lo ritenta.
      //    ⚠️ La rotta NON può distinguere i casi: le arriva un `Error` e basta.
      //    Discriminare sul TESTO del messaggio legherebbe questa rotta alla
      //    prosa di `generate-dpa.ts` senza nessun aggancio che il compilatore
      //    veda — un legame che si romperebbe in silenzio. La classificazione
      //    fine (503 per l'archivio, 404 per il cliente assente, 422 per la
      //    Partita IVA mancante) va fatta all'ORIGINE, con un errore tipato:
      //    è fuori dal mandato di questo task e va RIFERITA (R-E2).
      // 📌 `e.message` resta: qui arrivano solo testi FISSI e curati
      //    (`generate-dpa.ts` li ha chiusi tutti a monte), e questo corpo JSON è
      //    l'unico canale verso chi scarica — il <a href download> della pagina
      //    cliente non legge lo stato, mostra il corpo. Toglierlo costerebbe
      //    l'unico messaggio utile («Partita IVA mancante») senza chiudere
      //    nessuna fuga vera.
      const msg = e instanceof Error ? e.message : 'Errore generazione DPA'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  })
}
