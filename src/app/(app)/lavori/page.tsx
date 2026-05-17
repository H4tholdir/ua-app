import Link from 'next/link'
import { Suspense } from 'react'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { LavoroCard } from '@/components/features/lavori/LavoroCard'
import { LavoriSearchBar } from '@/components/features/lavori/LavoriSearchBar'
import type { StatoLavoro, PrioritaLavoro, TipoDispositivo } from '@/types/domain'

// ─── Design tokens v2.2 — warm palette ───────────────────────
const DS = {
  bg:      'var(--bg, #DDD8D3)',
  surface: 'var(--surface, #E4DFD9)',
  elv:     'var(--elv, #EDEDEA)',
  prs:     'var(--prs, #D4CFC9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  t3:      'var(--t3, #B8B3AE)',
  primary: 'var(--primary, #D90012)',
  shB: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
  shI: `inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)`,
} as const

interface PageProps {
  searchParams: Promise<{ stato?: string; q?: string }>
}

type LavoroRow = {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  priorita: PrioritaLavoro
  tipo_dispositivo: TipoDispositivo
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  cliente: { id: string; nome: string; cognome: string; studio_nome: string | null } | null
  tecnico: { id: string; nome: string; cognome: string; sigla: string | null } | null
}

export default async function LavoriPage({ searchParams }: PageProps) {
  const params = await searchParams
  const statoFiltro = params.stato as StatoLavoro | undefined
  const q = params.q?.trim() ?? ''

  // Auth
  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user!.id)
    .single()

  const labId: string = utente?.laboratorio_id ?? ''

  let lavori: LavoroRow[] = []

  if (labId) {
    let query = svc
      .from('lavori')
      .select(`
        id,
        numero_lavoro,
        stato,
        priorita,
        tipo_dispositivo,
        descrizione,
        data_consegna_prevista,
        ora_consegna,
        paziente_nome_snapshot,
        cliente:clienti(id, nome, cognome, studio_nome),
        tecnico:tecnici(id, nome, cognome, sigla)
      `)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .order('data_consegna_prevista', { ascending: true })
      .limit(200)

    if (statoFiltro) {
      query = query.eq('stato', statoFiltro)
    }

    if (q) {
      const term = `%${q}%`
      query = query.or(
        `numero_lavoro.ilike.${term},paziente_nome_snapshot.ilike.${term},descrizione.ilike.${term}`
      )
    }

    const { data } = await query
    lavori = (data ?? []) as unknown as LavoroRow[]
  }

  // Tab filtri stato
  const filtriStato: Array<{ value: string; label: string }> = [
    { value: '', label: 'Tutti' },
    { value: 'ricevuto', label: 'Ricevuti' },
    { value: 'in_lavorazione', label: 'In lavorazione' },
    { value: 'in_prova', label: 'In prova' },
    { value: 'pronto', label: 'Pronti' },
    { value: 'in_ritardo', label: 'In ritardo' },
    { value: 'consegnato', label: 'Consegnati' },
  ]

  // Pulsante "+ Nuovo lavoro" nell'header
  const addButton = (
    <Link
      href="/lavori/nuovo"
      aria-label="Nuovo lavoro"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        height: '52px',
        padding: '0 18px',
        borderRadius: '14px',
        background: DS.primary,
        color: '#fff',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 700,
        fontSize: '14px',
        textDecoration: 'none',
        boxShadow: DS.shB,
        flexShrink: 0,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M8 3v10M3 8h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      Nuovo
    </Link>
  )

  return (
    <PageWrapper>
      <AppHeader title="Lavori" actions={addButton} />

      {/* Search bar */}
      <Suspense fallback={null}>
        <LavoriSearchBar defaultValue={q} />
      </Suspense>

      {/* Filtri stato */}
      <div
        role="navigation"
        aria-label="Filtra per stato"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '0 20px 16px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {filtriStato.map(({ value, label }) => {
          const isActive = (statoFiltro ?? '') === value
          return (
            <Link
              key={value}
              href={value ? `/lavori?stato=${value}` : '/lavori'}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '40px',
                padding: '0 16px',
                borderRadius: 100,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
                textDecoration: 'none',
                background: isActive ? DS.primary : DS.elv,
                color: isActive ? '#fff' : DS.t2,
                boxShadow: isActive ? DS.shI : DS.shB,
                flexShrink: 0,
                transition: 'background var(--tr, 0.18s cubic-bezier(0.2,0,0,1)), box-shadow var(--tr, 0.18s cubic-bezier(0.2,0,0,1)), color var(--tr, 0.18s cubic-bezier(0.2,0,0,1))',
                minHeight: 52,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Counter risultati ricerca */}
      {q && (
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: DS.t2,
          padding: '0 20px 8px',
          margin: 0,
        }}>
          {lavori.length === 0
            ? `Nessun risultato per "${q}"`
            : `${lavori.length} lavoro${lavori.length === 1 ? '' : 'i'} trovato${lavori.length === 1 ? '' : 'i'} per "${q}"`}
        </p>
      )}

      {/* Lista lavori */}
      <section style={{ padding: '0 20px' }}>
        {lavori.length === 0 ? (
          <div
            style={{
              background: DS.surface,
              borderRadius: '14px',
              padding: '40px 24px',
              textAlign: 'center',
              boxShadow: DS.shB,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: DS.t1,
                margin: 0,
              }}
            >
              {q ? `Nessun risultato per "${q}"` : statoFiltro ? 'Nessun lavoro con questo stato' : 'Nessun lavoro ancora'}
            </p>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                color: DS.t2,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {statoFiltro
                ? 'Prova a selezionare uno stato diverso o rimuovi il filtro.'
                : 'Crea il tuo primo lavoro per iniziare a gestire le commesse del laboratorio.'}
            </p>
            {!statoFiltro && (
              <Link
                href="/lavori/nuovo"
                style={{
                  marginTop: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 24px',
                  borderRadius: '32px',
                  background: DS.primary,
                  color: '#fff',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 700,
                  fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: DS.shB,
                  minHeight: '52px',
                }}
                aria-label="Crea il primo lavoro"
              >
                Crea il primo lavoro →
              </Link>
            )}
          </div>
        ) : (
          <ul className="ua-list-grid">
            {lavori.map((lavoro, i) => (
              <li key={lavoro.id}>
                <LavoroCard
                  id={lavoro.id}
                  numero_lavoro={lavoro.numero_lavoro}
                  stato={lavoro.stato}
                  priorita={lavoro.priorita}
                  tipo_dispositivo={lavoro.tipo_dispositivo}
                  descrizione={lavoro.descrizione}
                  data_consegna_prevista={lavoro.data_consegna_prevista}
                  ora_consegna={lavoro.ora_consegna ?? null}
                  paziente_nome_snapshot={lavoro.paziente_nome_snapshot ?? null}
                  cliente_display={
                    lavoro.cliente?.studio_nome ??
                    (`${lavoro.cliente?.nome ?? ''} ${lavoro.cliente?.cognome ?? ''}`.trim() || '—')
                  }
                  animationDelay={i * 0.04}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageWrapper>
  )
}
