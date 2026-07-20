import { redirect } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { PersoneV3, type TecnicoRow } from '@/components/features/tecnici/PersoneV3'
import { adessoRoma, MESI } from '@/lib/utils/data-roma'

// «Persone» v3 (Task 11, ondata A mini-triage) — migrazione integrale di
// /tecnici a v3 (spec v3 §14: migrazione per route). Auth/ruolo e query
// identici alla pagina v2.3 precedente (nessun filtro attivo/deleted_at nella
// query originale — perimetro conservato as-is). Le vecchie UI inline
// (`TecnicoEditInline`, `TecnicoDeactivateButton`, `InvitaCollaboratoreSheet`)
// non sono più montate qui — tornano via lo Sheet persona nei Task 12/13, i
// file non sono rimossi in questo task.
export default async function TechniciPage() {
  const context = await getLabContext()
  if (!context?.laboratorioId) redirect('/login')

  const svc = getServiceClient()
  const labId: string = context.laboratorioId
  const ruolo: string = context.ruolo

  let tecnici: TecnicoRow[] = []
  if (labId) {
    const { data } = await svc
      .from('tecnici')
      .select('id, nome, cognome, sigla, qualifica, prrc, compenso_base, tipo_compenso')
      .eq('laboratorio_id', labId)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })
    tecnici = (data ?? []) as TecnicoRow[]
  }

  // Il label mese della card cedolini arriva SEMPRE dal server (regola
  // ratificata data-fiscali 20/07/2026): mai `new Date().getFullYear()` client.
  const ora = adessoRoma()
  const nomeMese = MESI[ora.getMonth()]
  const meseLabel = `${nomeMese.charAt(0).toUpperCase()}${nomeMese.slice(1)} ${ora.getFullYear()}`

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div className="ds-grana" aria-hidden />
      <PersoneV3 tecnici={tecnici} ruolo={ruolo} meseLabel={meseLabel} />
    </div>
  )
}
