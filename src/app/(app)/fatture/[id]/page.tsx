import { redirect } from 'next/navigation'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getSignedUrl } from '@/lib/storage/signed-url'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

interface Props { params: Promise<{ id: string }> }

export default async function FatturaDetailPage({ params }: Props) {
  const { id } = await params
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) redirect('/login')

  const svc = getServiceClient()
  const { data: utente } = await svc.from('utenti').select('laboratorio_id').eq('id', user.id).single()
  if (!utente?.laboratorio_id) redirect('/login?error=no_lab')

  const { data: fattura } = await svc
    .from('fatture')
    .select(`
      id, numero, data, totale, iva, imponibile, stato_pagamento,
      xml_storage_path, pec_message_id, pec_consegnata_at,
      cliente:clienti(nome, cognome, studio_nome, partita_iva, pec),
      righe:fatture_righe(descrizione, quantita, prezzo_unitario, totale_riga)
    `)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!fattura) redirect('/fatture')

  const f = fattura as Record<string, unknown>
  let xmlSignedUrl: string | null = null
  if (f.xml_storage_path) {
    xmlSignedUrl = await getSignedUrl(svc, 'fatture-pdf', f.xml_storage_path as string, 3600)
  }
  const cliente = f.cliente as Record<string, string | null> | null
  const righe = (f.righe as Array<Record<string, unknown>>) ?? []

  const fmtEur = (v: unknown) => typeof v === 'number' ? `€${v.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '—'
  const fmtDate = (d: unknown) => typeof d === 'string' ? new Date(d).toLocaleDateString('it-IT') : '—'

  const card: React.CSSProperties = {
    background: 'var(--sfc, #E4DFD9)', borderRadius: '18px', padding: '20px',
    boxShadow: 'var(--sh-b)',
    marginBottom: '12px',
  }
  const secLabel: React.CSSProperties = { fontSize: '10px', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }
  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--elv)', fontSize: '13px', fontFamily: 'DM Sans, sans-serif' }

  return (
    <>
      <AppHeader title={`Fattura ${f.numero as string ?? ''}`} backHref="/fatture" />
      <PageWrapper>
        <div style={{ padding: '0 20px 48px' }}>
          <div style={card}>
            <div style={secLabel}>Fattura</div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Numero</span><span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{f.numero as string}</span></div>
            <div style={row}><span style={{ color: 'var(--t2)' }}>Data</span><span>{fmtDate(f.data)}</span></div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: 'var(--t2)' }}>Stato</span>
              <span style={{ fontWeight: 700, color: f.stato_pagamento === 'pagata' ? '#16A34A' : f.stato_pagamento === 'scaduta' ? '#D90012' : 'var(--t1)' }}>
                {(f.stato_pagamento as string)?.toUpperCase() ?? '—'}
              </span>
            </div>
          </div>

          {cliente && (
            <div style={card}>
              <div style={secLabel}>Cliente</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
                {cliente.studio_nome ?? `${cliente.nome} ${cliente.cognome}`}
              </div>
              {cliente.partita_iva && <div style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'monospace', marginTop: '4px' }}>P.IVA {cliente.partita_iva}</div>}
            </div>
          )}

          <div style={card}>
            <div style={secLabel}>Voci</div>
            {righe.map((r, i) => (
              <div key={i} style={{ ...row, flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>{r.descrizione as string}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>{fmtEur(r.totale_riga)}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>
                  {r.quantita as number} × {fmtEur(r.prezzo_unitario)}
                </div>
              </div>
            ))}
            {righe.length === 0 && <div style={{ fontSize: '13px', color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif' }}>Nessuna voce</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 700, fontSize: '15px', fontFamily: 'DM Sans, sans-serif' }}>
              <span>Totale</span>
              <span>{fmtEur(f.totale)}</span>
            </div>
          </div>

          <div style={card}>
            <div style={secLabel}>Invio SDI</div>
            <div style={row}>
              <span style={{ color: 'var(--t2)' }}>XML</span>
              {xmlSignedUrl ? (
                <a
                  href={xmlSignedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--c-amber, #F59E0B)', fontWeight: 700, textDecoration: 'none' }}
                >
                  Scarica XML
                </a>
              ) : (
                <span>{f.xml_storage_path ? '✓ Generato' : 'Non generato'}</span>
              )}
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={{ color: 'var(--t2)' }}>PEC consegnata</span>
              <span style={{ color: f.pec_consegnata_at ? '#16A34A' : 'var(--t3)' }}>
                {f.pec_consegnata_at ? fmtDate(f.pec_consegnata_at) : 'Non inviata'}
              </span>
            </div>
          </div>
        </div>
      </PageWrapper>
    </>
  )
}
