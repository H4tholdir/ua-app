import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getPileHome, getPerimetroHome } from '@/lib/dashboard/pile-home'
import { getSegnaleStriscia } from '@/lib/dashboard/striscia'
import { HomeV3 } from '@/components/features/home/HomeV3'

export const dynamic = 'force-dynamic'

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

function adessoRoma(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Rome' }))
}
function saluto(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

// Home v3 (§7.1 + rev. 3.1) — UNA composizione per tutti i ruoli (A1): le 4
// dashboard per ruolo escono dalla home QUI (la loro cancellazione fisica dei
// file è al Task 11). Il perimetro dati cambia server-side (getPerimetroHome),
// la UI è sempre la stessa HomeV3. `preferenza_dashboard` non si legge più.
export default async function DashboardPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('ruolo, laboratorio_id, nome').eq('id', user.id).is('deleted_at', null).single()
  if (!utente) redirect('/login')
  const { ruolo, laboratorio_id: labId } = utente
  if (!['titolare', 'admin_rete', 'tecnico', 'front_desk'].includes(ruolo)) redirect('/login') // admin_sistema usa /admin

  const perimetro = await getPerimetroHome(svc, labId, user.id, ruolo)
  const pile = await getPileHome(svc, labId, perimetro)
  const segnale = await getSegnaleStriscia(svc, labId, ruolo, pile)

  const ora = adessoRoma()
  const eyebrow = `${GIORNI[ora.getDay()]} ${ora.getDate()} ${MESI[ora.getMonth()]}`
  const nome = utente.nome ?? user.email?.split('@')[0] ?? 'Utente'

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      <HomeV3 nome={nome} eyebrow={eyebrow} saluto={saluto(ora)} pile={pile} segnale={segnale} />
    </div>
  )
}
