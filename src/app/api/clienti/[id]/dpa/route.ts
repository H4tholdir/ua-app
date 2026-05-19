import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { generateDpa } from '@/lib/pdf/generate-dpa'

// GET /api/clienti/[id]/dpa
// Genera e scarica il DPA GDPR Art. 28 per il cliente specificato
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clienteId } = await params

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id, ruolo')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) return NextResponse.json({ error: 'Lab non trovato' }, { status: 403 })
  if (!['titolare', 'admin_rete', 'admin_sistema'].includes(utente.ruolo ?? '')) {
    return NextResponse.json({ error: 'Non autorizzato — solo titolari' }, { status: 403 })
  }

  try {
    const buffer = await generateDpa(utente.laboratorio_id, clienteId)
    const filename = `DPA-${clienteId.slice(0, 8).toUpperCase()}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore generazione DPA'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
