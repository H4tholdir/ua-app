import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AdminHomePreview } from '@/components/features/admin/AdminHomePreview'
import { getPileHome } from '@/lib/dashboard/pile-home'
import { getSegnaleStriscia } from '@/lib/dashboard/striscia'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

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

export default async function AdminLivePreviewPage({ params }: Props) {
  const { id } = await params

  // ── Verifica admin ── getFreshLabContext: getUser() di rete + filtro
  // deleted_at (N11) — admin soft-deleted perde l'accesso immediatamente. ───
  const context = await getFreshLabContext()
  if (!context) redirect('/login')

  if (context.ruolo !== 'admin_sistema') {
    redirect('/admin/labs')
  }

  const svc = getServiceClient()

  // ── Carica dati del lab ───────────────────────────────────────────────────
  const { data: lab } = await svc
    .from('laboratori')
    .select('*')
    .eq('id', id)
    .single()

  if (!lab) redirect('/admin/labs')

  // ── Trova il titolare del lab ─────────────────────────────────────────────
  const { data: titolareUtente } = await svc
    .from('utenti')
    .select('nome, cognome, ruolo')
    .eq('laboratorio_id', id)
    .eq('ruolo', 'titolare')
    .maybeSingle()

  const labRaw = lab as Record<string, unknown>
  const titolareRaw = titolareUtente as Record<string, unknown> | null

  const nomeUtente = titolareRaw
    ? `${titolareRaw.nome ?? ''} ${titolareRaw.cognome ?? ''}`.trim()
    : labRaw.nome as string

  // ── Dati Home v3 — stesso perimetro/stesse funzioni di `(app)/dashboard`
  //    (Task 7-9): nessun `tecnicoId` → perimetro titolare, tutto il lab. ────
  const pile = await getPileHome(svc, id)
  const segnale = await getSegnaleStriscia(svc, id, 'titolare', pile)

  const ora = adessoRoma()
  const eyebrow = `${GIORNI[ora.getDay()]} ${ora.getDate()} ${MESI[ora.getMonth()]}`

  return (
    <>
      {/* Banner Admin Preview — fisso in cima */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: '#1C1916',
          color: '#F0EDE8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          height: 44,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          boxShadow: '0 2px 8px rgba(0,0,0,.4)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span>
            <strong>ADMIN PREVIEW</strong> — visualizzando come{' '}
            <strong>{nomeUtente}</strong> &middot; {labRaw.nome as string}
          </span>
          <span style={{ fontSize: 11, opacity: 0.55 }}>
            Solo lettura — per operazioni usa &ldquo;Accedi come titolare&rdquo; dalla scheda lab
          </span>
        </div>
        <Link
          href={`/admin/labs/${id}`}
          style={{
            background: 'rgba(255,255,255,.12)',
            color: '#F0EDE8',
            padding: '5px 12px',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Chiudi preview
        </Link>
      </div>

      {/* Nota quieta — convenzione chrome admin (adm-* vars), FUORI dallo scope
          v3: la stessa nota vale sia in light che in dark perché legge le
          variabili di root dell'admin, non quelle di [data-ds="v3"]. */}
      <div style={{ textAlign: 'center', padding: '52px 20px 0', fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: 'var(--adm-t3, #6B5C51)' }}>
        Anteprima statica di Home — pile e striscia di stato non sono interattive in questa vista.
      </div>

      {/* Contenuto Home v3 — convivenza per pagina (§14): lo scope `[data-ds="v3"]`
          porta i propri CSS var (`--bg`, `--ink`, `--red`, …), dipinti inline
          sul root come nelle altre pagine migrate (`(app)/dashboard`,
          `(app)/tutto-il-resto`) — il resto della sezione admin resta v2.3 flat. */}
      <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: 'calc(100dvh - 44px)' }}>
        <div className="ds-grana" aria-hidden />
        <AdminHomePreview nome={nomeUtente} eyebrow={eyebrow} saluto={saluto(ora)} pile={pile} segnale={segnale} />
      </div>
    </>
  )
}
