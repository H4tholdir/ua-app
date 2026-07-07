import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Link from 'next/link'
import type { Psur } from '@/types/domain'
import { rilevaGruppi } from '@/lib/utils/sorveglianza-postvendita'
import { PsurGruppoSezione } from '@/components/features/qualita/PsurGruppoSezione'

export const metadata = { title: 'Sorveglianza post-vendita — Qualita MDR' }

export default async function PsurPage() {
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return null

  const svc = getServiceClient()
  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) return null

  const { data: psurList } = await svc
    .from('psur')
    .select(
      'id, anno_riferimento, gruppo_classe, periodo_inizio, periodo_fine, totale_dispositivi, totale_non_conformita, totale_incidenti, totale_reclami, totale_rifacimenti, stato, pdf_url, firmato_at, prrc_nome_snapshot'
    )
    .eq('laboratorio_id', utente.laboratorio_id)
    .order('anno_riferimento', { ascending: false })

  const { data: lavoriClassi } = await svc
    .from('lavori')
    .select('classe_rischio')
    .eq('laboratorio_id', utente.laboratorio_id)

  const { gruppiRilevati, nonClassificabili } = rilevaGruppi(
    (lavoriClassi ?? []).map((l) => l.classe_rischio as string)
  )

  const annoRendiconto = new Date().getFullYear() - 1
  const fontFamily = "'DM Sans', system-ui, sans-serif"

  return (
    <PageWrapper>
      <AppHeader
        title="Sorveglianza post-vendita"
        subtitle="PMS Report (Classe I) e PSUR (Classe IIa/IIb/III) — MDR Art. 85/86"
        backHref="/qualita"
      />

      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Link
          href="/qualita"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--t2, #4A3D33)',
            fontSize: '13px', textDecoration: 'none', fontFamily, marginBottom: '4px',
          }}
        >
          ← Qualita
        </Link>

        {nonClassificabili > 0 && (
          <div
            role="alert"
            style={{
              background: 'rgba(239, 68, 68, 0.10)',
              borderRadius: '12px',
              padding: '14px 16px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
            }}
          >
            <p style={{ color: 'var(--c-red, #EF4444)', fontSize: '13px', fontWeight: 700, fontFamily, margin: 0 }}>
              {nonClassificabili} lavor{nonClassificabili === 1 ? 'o' : 'i'} non classificabil{nonClassificabili === 1 ? 'e' : 'i'} per classe di rischio — verificare i dati anagrafici.
            </p>
          </div>
        )}

        {gruppiRilevati.length === 0 ? (
          <div style={{ background: 'var(--surface, #E4DFD9)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <p style={{ color: 'var(--t2, #4A3D33)', fontSize: '14px', fontFamily, margin: 0 }}>
              Nessun dispositivo classificato — nessun obbligo di sorveglianza post-vendita rilevato ancora.
            </p>
          </div>
        ) : (
          gruppiRilevati.map((gruppo) => (
            <PsurGruppoSezione
              key={gruppo}
              gruppoClasse={gruppo}
              psurDelGruppo={(psurList ?? []).filter((p) => p.gruppo_classe === gruppo) as Psur[]}
              annoRendiconto={annoRendiconto}
            />
          ))
        )}
      </div>
    </PageWrapper>
  )
}
