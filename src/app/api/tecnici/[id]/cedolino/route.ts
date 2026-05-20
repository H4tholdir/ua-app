import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generateCedolinoTecnico } from '@/lib/pdf/generate-cedolino-tecnico'


export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tecnicoId } = await params
  const { searchParams } = new URL(req.url)

  // Validazione mese
  const meseCorrente = new Date().toISOString().slice(0, 7)
  const meseParam = searchParams.get('mese') ?? meseCorrente
  const mese = /^\d{4}-\d{2}$/.test(meseParam) ? meseParam : meseCorrente

  // ─── Auth ────────────────────────────────────────────────────────────────
  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id

  // ─── RBAC ────────────────────────────────────────────────────────────────
  // Il tecnico può scaricare solo il proprio cedolino.
  if (utente.ruolo === 'tecnico') {
    const { data: mioTecnico } = await svc
      .from('tecnici')
      .select('id')
      .eq('laboratorio_id', labId)
      .eq('utente_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!mioTecnico || mioTecnico.id !== tecnicoId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }
  } else if (utente.ruolo !== 'titolare' && utente.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }

  // ─── Verifica tecnico appartiene al lab ───────────────────────────────────
  const { data: tecnico } = await svc
    .from('tecnici')
    .select('id, nome, cognome')
    .eq('id', tecnicoId)
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .single()

  if (!tecnico) {
    return NextResponse.json({ error: 'Tecnico non trovato' }, { status: 404 })
  }

  try {
    const buffer = await generateCedolinoTecnico(tecnicoId, labId, mese)
    const filename = `Cedolino_${tecnico.cognome}_${tecnico.nome}_${mese}.pdf`
      .replace(/\s+/g, '_')

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore generazione PDF'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
