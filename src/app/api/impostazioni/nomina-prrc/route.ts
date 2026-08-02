import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { generateNominaPrrc } from '@/lib/pdf/generate-nomina-prrc'

export async function GET() {
  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  const guard = assertLabOperativo(context, 'GET')
  if (guard) return guard

  try {
    const buffer = await generateNominaPrrc(context.laboratorioId)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="NominaPRRC.pdf"',
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
    console.error('[nomina-prrc] generazione fallita:', e)
    return NextResponse.json(
      { error: 'Non è stato possibile generare il documento (nomina del responsabile). Riprova fra poco.' },
      { status: 500 },
    )
  }
}
