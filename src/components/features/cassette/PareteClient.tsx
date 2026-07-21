'use client'

// Task 11 — PareteClient: la prima superficie utente della Parete (§5 spec
// 2026-07-21-parete-cassette-design.md). Fonte visiva: mockup ratificato
// `docs/design/mockups/2026-07-20-parete-cassette-v2.html` (blocchi 1 e 2). Il CSS della
// pillola di ricerca, della parete e della tile «+ Nuova cassetta» vive in
// `src/app/ds-v3.css` (`.ds-parete*`, `.ds-tray-nuova`): porta rami dark e media query, che
// uno style-object non sa esprimere.
//
// La parete arriva GIÀ ordinata da `deriveParete` (`posizione, created_at, id`): qui non si
// riordina nulla — l'ordine è la mappa mentale del muro fisico.
//
// Ricerca «che accende» (§5.1): nessuna cassetta sparisce mai, i non-match si SPENGONO
// (opacity + desaturazione) e restano tappabili — spento è opacità, non inattività.
// Il colore non è mai l'unica fonte di stato: la cassetta accesa porta `aria-current` (§5.35)
// e l'esito della ricerca è DETTO in parole nella riga quieta `role="status"` sopra la parete,
// che è insieme il testo visibile e l'annuncio per lo screen reader (una sola live region,
// montata sempre: una regione che nasce insieme al suo testo non viene annunciata).
//
// Intento sheet (risoluzione C1 dell'ondata): questo componente tiene ORA lo stato
// dell'intento — cassetta libera (tap), long-press su QUALSIASI cassetta, tile «+», CTA del
// Vuoto. **I corpi degli sheet li monta il Task 12** su questo stesso stato; qui l'unico
// consumo possibile è `aria-expanded` sulla tile «+», l'unico controllo di cui possediamo il
// markup (`Cassetta` è un componente ds del Task 10 e non accetta attributi ARIA dal
// chiamante).
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cassetta } from '@/components/ds/Cassetta'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { Vuoto } from '@/components/ds/Vuoto'
import { spazio, tipografia } from '@/design-system/v3/tokens'
import { filtraCassette } from './filtra-cassette'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

/** L'intento di apertura di uno sheet. Il Task 12 monta i corpi su questo stato. */
type IntentoSheet = { tipo: 'nuova' } | { tipo: 'cassetta'; id: string } | null

export function PareteClient(props: { parete: CassettaParete[] }) {
  const { parete } = props
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<IntentoSheet>(null)

  // «Filtro attivo» si decide dal `trim()` della query, MAI dalla dimensione del Set: zero
  // match e nessuna ricerca danno entrambi un Set vuoto, ma sono due pareti opposte (tutte
  // spente vs tutte normali).
  const cercato = query.trim()
  const attiva = cercato.length > 0
  const accesi = useMemo(() => filtraCassette(parete, query), [parete, query])

  // §5.5 Freschezza — senza realtime, la parete non deve mentire a chi la guarda da un'ora:
  // si rilegge quando la pagina torna in primo piano (ritorno da /lavori/[id], app riaperta).
  useEffect(() => {
    const rileggi = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', rileggi)
    window.addEventListener('focus', rileggi)
    return () => {
      document.removeEventListener('visibilitychange', rileggi)
      window.removeEventListener('focus', rileggi)
    }
  }, [router])

  const annuncio = !attiva
    ? ''
    : accesi.size === 0
      ? `Niente per “${cercato}”`
      : accesi.size === 1
        ? '1 cassetta accesa'
        : `${accesi.size} cassette accese`

  return (
    <section className="ds-parete-shell">
      <header style={{ display: 'flex', alignItems: 'center', gap: spazio.sm, marginBottom: spazio.m }}>
        {/* Provenienza multipla (home, «Tutto il resto», scheda lavoro, shortcut PWA): la ‹
            porta SEMPRE alla home, mai `back()` — che rimanderebbe a un punto imprevedibile. */}
        <TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => router.push('/dashboard')} />
        <h1
          style={{
            flex: 1,
            margin: 0,
            fontSize: tipografia.size.title,
            fontWeight: tipografia.weight.extrabold,
            letterSpacing: tipografia.tracking.titoli,
            color: 'var(--ink)',
          }}
        >
          Le cassette
        </h1>
        <TastoTondo glifo="☰" etichettaAria="Tutto il resto" onClick={() => router.push('/tutto-il-resto')} />
      </header>

      {parete.length === 0 ? (
        <Vuoto
          glifo="🗄️"
          titolo="La tua parete è vuota"
          guida="Crea la prima cassetta: da lì in poi ogni lavoro sa dove sta, nell'ordine del tuo muro."
          azione={{ etichetta: 'Crea la prima cassetta', onClick: () => setSheet({ tipo: 'nuova' }) }}
        />
      ) : (
        <>
          {/* Pillola di ricerca (mockup righe 39-49) — qui con un input VERO. */}
          <div className="ds-parete-cerca">
            <svg className="lente" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5 21 21" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(evento) => setQuery(evento.target.value)}
              placeholder="Cerca una cassetta o un lavoro…"
              aria-label="Cerca una cassetta o un lavoro"
              enterKeyHint="search"
            />
          </div>

          {/* Riga quieta + live region insieme: un solo testo, letto una volta sola.
              `minHeight` tiene ferma la parete mentre si digita. */}
          <p
            role="status"
            aria-live="polite"
            style={{
              margin: `0 0 ${spazio.s}px`,
              minHeight: 20,
              fontSize: tipografia.size.caption,
              fontWeight: tipografia.weight.semibold,
              color: 'var(--muted)',
            }}
          >
            {annuncio}
          </p>

          <div className="ds-parete">
            <div className="ds-parete-grid">
              {parete.map((c) => (
                <Cassetta
                  key={c.id}
                  id={c.id}
                  nome={c.nome}
                  colore={c.colore}
                  lavoro={c.lavoro}
                  stato={attiva ? (accesi.has(c.id) ? 'accesa' : 'spenta') : 'normale'}
                  onTap={() =>
                    c.lavoro ? router.push(`/lavori/${c.lavoro.id}`) : setSheet({ tipo: 'cassetta', id: c.id })
                  }
                  // Senza questa prop il timer di long-press non parte affatto e il gesto
                  // sparisce in silenzio (§5.35): va passato a OGNI cassetta, anche occupata.
                  onLongPressSheet={() => setSheet({ tipo: 'cassetta', id: c.id })}
                />
              ))}
              {/* Durante la ricerca la tile sparisce (mockup, blocco 2): una cella tratteggiata
                  a piena luce competerebbe con l'unica cassetta accesa. */}
              {!attiva && (
                <button
                  type="button"
                  className="ds-tray-nuova"
                  aria-haspopup="dialog"
                  aria-expanded={sheet?.tipo === 'nuova'}
                  onClick={() => setSheet({ tipo: 'nuova' })}
                >
                  <span className="plus" aria-hidden="true">+</span>
                  <span className="t">Nuova cassetta</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
