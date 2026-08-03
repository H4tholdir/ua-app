import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { withServerTiming } from '@/lib/api/server-timing'
import { generateRicevutaConsegna } from '@/lib/pdf/generate-ricevuta-consegna'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: lavoro_id } = await params

  return withServerTiming(async (t) => {
    // DEVIAZIONE DICHIARATA (spec R2 Task 9): !user (401 Unauthorized) e
    // !utente (404 Utente non trovato) collassano su context null → 401
    // Unauthorized (getLabContext fail-closed, vedi lab-context.ts).
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!context.laboratorioId) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

    const guard = assertLabOperativo(context, 'GET')
    if (guard) return guard

    const supabaseService = getServiceClient()
    // Verifica appartenenza al lab (guard cross-tenant)
    const { data: lavoro } = await supabaseService
      .from('lavori')
      .select('id, numero_lavoro')
      .eq('id', lavoro_id)
      .eq('laboratorio_id', context.laboratorioId)
      .is('deleted_at', null)
      .single()
    if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

    try {
      const buffer = await generateRicevutaConsegna(lavoro_id, context.laboratorioId)
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="RicevutaConsegna_${lavoro.numero_lavoro}.pdf"`,
        },
      })
    } catch (e: unknown) {
    // P13 (03/08/2026) — DUE cose su una riga sola.
    // ① 🛑 LO STATO. Qui arrivano i guasti della GENERAZIONE, non gli errori di
    //    chi ha premuto: `400` diceva «hai sbagliato tu» per un guasto di UÀ.
    //    Lo stato HTTP è un'affermazione su CHI ha sbagliato, e qui ha
    //    sbagliato il servizio. Il modello è `scheda-fabbricazione`, che
    //    faceva già così.
    // ② 🛑 IL MESSAGGIO. `e.message` finiva nel corpo della risposta: il testo
    //    di un guasto interno — nomi di tabelle, di colonne, la query — arriva
    //    a chi sta davanti allo schermo. È P11 visto da un'altra strada.
    //    Ora esce una frase fissa, e il dettaglio va DOVE SERVE: nei log del
    //    server, per chi ripara.
    // 🛑 Il DPA fa diverso APPOSTA (tiene `e.message`) e non si allinea qui:
    //    la sua ragione è scritta nel suo file ed è stata verificata.
      console.error('[ricevuta-consegna] generazione fallita:', e)
      return NextResponse.json(
        { error: 'Non è stato possibile generare il documento (ricevuta di consegna). Riprova fra poco.' },
        { status: 500 },
      )
    }
  })
}
