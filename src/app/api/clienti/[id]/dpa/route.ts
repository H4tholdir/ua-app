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
      // 🔑 Questo header resta l'UNICA fonte del nome, ma da P17 (02/08/2026)
      //    non è più il browser a leggerlo da solo: la scheda cliente non ha più
      //    un `<a href>`, ha `ScaricaDpaButton`, che chiama con `fetch` e
      //    rilegge questa intestazione in JavaScript (`nomeDaHeader`). Con
      //    `fetch` il file arriva grezzo su un indirizzo `blob:`, che di
      //    intestazioni non ne ha nessuna: senza quella rilettura il nome se lo
      //    inventerebbe il browser.
      //    📌 STORIA — `MISURATO il 03/08/2026` col markup di ALLORA (`<a>` senza
      //    `download`, tolto dal Task 8 `c1a1145d`), sonda usa-e-getta sui tre
      //    motori, WebKit compreso perché è Safari, quindi l'iPhone:
      //      chromium · firefox · webkit → salvavano tutti `DPA-2026-0007.pdf`.
      //    Quella misura provava che l'intestazione basta da sola su una
      //    NAVIGAZIONE. Oggi il cammino è un altro, e a coprirlo è
      //    `tests/unit/ScaricaDpaButton.test.tsx`.
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
      // 📌 `e.message` resta, ma da OGGI per una ragione diversa: qui arrivano
      //    solo testi FISSI e curati (`generate-dpa.ts` li ha chiusi tutti a
      //    monte), e chi scarica non li legge più. Il campo è per CHI RIPARA —
      //    i log del server e il pannello di rete del browser.
      //    🔄 RISCRITTA il 02/08/2026 dal Task 4 di P17, perché quella di prima
      //    era diventata falsa in due modi mentre si dichiarava `MISURATO`.
      //    Diceva: «questo corpo JSON è davvero l'unico canale verso chi
      //    scarica — nessun codice client dirama sullo stato, il tasto è un
      //    `<a href>` e basta». Da P17:
      //      ① il tasto NON è più un `<a href>` ma `ScaricaDpaButton`, che
      //         chiama con `fetch` e resta sulla scheda: il corpo non finisce
      //         più a schermo su nessun motore;
      //      ② il codice client DIRAMA eccome — è tutto il senso di `esitoDa` —
      //         ma dirama su `status` e su `codice`, MAI su `error`: le frasi
      //         che l'utente legge sono scritte lì, in italiano curato.
      //    🔑 È esattamente il modo di sbagliare che questo file racconta di
      //    aver già pagato due volte: una riga scritta prima del mondo che
      //    descrive, e marchiata come misurata. La misura del 03/08 era vera
      //    quel giorno — vale come STORIA, non come regola viva.
      const msg = e instanceof Error ? e.message : 'Errore generazione DPA'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  })
}
