'use client'

// Task 14/15 — StanzaParete: la seconda stanza della home (spec 2026-07-21-parete-cassette-design.md
// §6). Fonte visiva: mockup ratificato `docs/design/mockups/2026-07-20-parete-collocazione-home.html`
// (colonna «1 · Home a due stanze — stanza Parete»): eyebrow «Le cassette», titolo «La parete ›»,
// ☰ invariato, la parete a 3 colonne. Il muro riusa `.ds-parete`/`.ds-parete-grid` di
// `src/app/ds-v3.css` — è LO STESSO muro di `/cassette`, non una sua copia più piccola.
//
// ── D-8: in home si naviga, non si manipola ───────────────────────────────────────────────
// Qui NON esiste sheet, e infatti a `Cassetta` non si passa `onLongPressSheet`: senza quella
// prop il timer di long-press non parte affatto (v. Cassetta §5.35) e OGNI rilascio fermo
// ricade sul tap. Nessun gesto va perso, nessuna azione appare dove non deve. Il riordino
// (drag) resta su `/cassette`: qui `draggable` non si passa.
// - tap su cassetta occupata → la scheda del lavoro;
// - tap su cassetta libera → `/cassette` (una pagina, non uno sheet: la home non è un editor).
//
// ── Cap anti-sfondamento (riserva ux B2), CSS-driven — Task 15 ──────────────────────────────
// La home non scorre (§3.3): la stanza mostra un numero fisso di cassette per posizione + il
// tile finale «Tutte le cassette ›». Il cap dipende dal viewport (5 a 390, 8 a 768) ma la home è
// server-rendered (`force-dynamic`, nessun `window`): NON si misura a runtime. Come la scala
// device-corti (§7.1), si rende il SUPERSET tablet (`CAP_PARETE.tablet` celle) e il CSS nasconde
// sotto 768px le celle oltre `CAP_PARETE.mobile` (classe `.is-oltre-mobile`). Il tile compare
// appena c'è overflow al cap più stretto (mobile) e porta due badge — «+{oltreMobile}» e
// «+{oltreTablet}» — di cui il CSS mostra quello del viewport corrente; su tablet, se non c'è
// overflow reale (`oltreTablet===0`), il tile stesso sparisce (`.is-solo-mobile`).
import { useRouter } from 'next/navigation'
import { Cassetta } from '@/components/ds/Cassetta'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { Vuoto } from '@/components/ds/Vuoto'
import { tipografia } from '@/design-system/v3/tokens'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

/** Il cap della stanza home per viewport (spec §6, «scala device-corti» §7.1): 5 celle a
 *  390×844 (griglia 3×2 col tile), 8 a 768 (3×3). Costante, MAI una misura runtime: il taglio
 *  fra i due lo fa il CSS in `ds-v3.css` (@media 767px), non JavaScript. */
export const CAP_PARETE = { mobile: 5, tablet: 8 } as const

/** Il piano della stanza dato il totale cassette (puro — house pattern come scegliSegnale/
 *  componiSezioni/deriveParete). `mostrate` = quante celle-cassetta entrano nel DOM (il superset
 *  tablet); `oltreMobile`/`oltreTablet` = quante restano fuori a ciascun cap; `tile` = se serve la
 *  cella «Tutte le cassette ›» (appena c'è overflow al cap mobile, il più stretto). */
export function pianoParete(total: number): { mostrate: number; oltreMobile: number; oltreTablet: number; tile: boolean } {
  return {
    mostrate: Math.min(total, CAP_PARETE.tablet),
    oltreMobile: Math.max(0, total - CAP_PARETE.mobile),
    oltreTablet: Math.max(0, total - CAP_PARETE.tablet),
    tile: total > CAP_PARETE.mobile,
  }
}

export function StanzaParete(props: { parete: CassettaParete[] }) {
  const { parete } = props
  const router = useRouter()

  // La parete arriva GIÀ ordinata da `deriveParete` (`posizione, created_at, id`): qui si
  // taglia soltanto al superset tablet — l'ordine è la mappa mentale del muro fisico e non si tocca.
  const piano = pianoParete(parete.length)
  const visibili = parete.slice(0, piano.mostrate)

  return (
    <div className="ua-stanza-parete">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div
            style={{
              fontSize: tipografia.size.label,
              fontWeight: tipografia.weight.extrabold,
              letterSpacing: tipografia.tracking.label,
              textTransform: 'uppercase',
              color: 'var(--faint)',
            }}
          >
            Le cassette
          </div>
          {/* Il titolo È l'affordance verso la pagina intera (§6). La › resta fuori dal nome
              accessibile (`aria-hidden`): uno screen reader annuncia «La parete», non un
              carattere di punteggiatura letto a caso. */}
          <h1 style={{ margin: 0 }}>
            <button
              type="button"
              className="ua-parete-titolo"
              onClick={() => router.push('/cassette')}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: tipografia.size.largeTitle,
                fontWeight: tipografia.weight.extrabold,
                letterSpacing: tipografia.tracking.titoli,
                lineHeight: 1.1,
                color: 'var(--ink)',
                textAlign: 'left',
              }}
            >
              La parete
              <span aria-hidden="true"> ›</span>
            </button>
          </h1>
        </div>
        <TastoTondo glifo="☰" etichettaAria="Tutto il resto" onClick={() => router.push('/tutto-il-resto')} />
      </div>

      {parete.length === 0 ? (
        <div className="ua-stanza-parete-corpo">
          <Vuoto
            glifo="🗄️"
            titolo="La tua parete è vuota"
            guida="Crea la prima cassetta: da lì in poi ogni lavoro sa dove sta, nell'ordine del tuo muro."
            azione={{ etichetta: 'Crea la prima cassetta', onClick: () => router.push('/cassette') }}
          />
        </div>
      ) : (
        <div className="ua-stanza-parete-corpo">
          <div className="ds-parete">
            <div className="ds-parete-grid">
              {visibili.map((c, idx) => (
                // La cella-griglia avvolge la Cassetta: porta la classe di taglio mobile (il
                // superset è nel DOM, il CSS decide che cosa si vede) senza toccare il componente
                // ds condiviso — stessa figura di `.ds-cella-riordino` su `/cassette`.
                <div
                  key={c.id}
                  className={`ds-cella-parete-home${idx >= CAP_PARETE.mobile ? ' is-oltre-mobile' : ''}`}
                >
                  <Cassetta
                    id={c.id}
                    nome={c.nome}
                    colore={c.colore}
                    lavoro={c.lavoro}
                    stato="normale"
                    onTap={() => router.push(c.lavoro ? `/lavori/${c.lavoro.id}` : '/cassette')}
                  />
                </div>
              ))}
              {piano.tile && (
                // Tile «Tutte le cassette ›» → `/cassette` (navigazione, MAI sheet — D-8). Nome
                // accessibile stabile «Tutte le cassette»: i badge «+N» sono affordance visiva
                // (aria-hidden), diversi per viewport, e un numero letto sarebbe falso su metà dei
                // device. `is-solo-mobile` quando non c'è overflow tablet: là il tile non serve.
                <button
                  type="button"
                  className={`ds-tile-tutte${piano.oltreTablet === 0 ? ' is-solo-mobile' : ''}`}
                  aria-label="Tutte le cassette"
                  onClick={() => router.push('/cassette')}
                >
                  <span className="et">
                    Tutte le cassette
                    <span aria-hidden="true"> ›</span>
                  </span>
                  <span className="badge badge-mobile" aria-hidden="true">+{piano.oltreMobile}</span>
                  {piano.oltreTablet > 0 && (
                    <span className="badge badge-tablet" aria-hidden="true">+{piano.oltreTablet}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
