'use client'

// Task 14 — StanzaParete: la seconda stanza della home (spec 2026-07-21-parete-cassette-design.md
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
// ── Cap anti-sfondamento (riserva ux B2) ──────────────────────────────────────────────────
// La home non scorre (§3.3): la stanza mostra le prime `capN` cassette per posizione e basta.
// Il resto del muro si raggiunge da «La parete ›». Il Task 15 aggiunge la tile finale
// «Tutte le cassette ›» col badge e deriva `capN` dal viewport; qui `capN` è già un ingresso,
// così quel task cambia UN valore e non questa anatomia.
import { useRouter } from 'next/navigation'
import { Cassetta } from '@/components/ds/Cassetta'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { Vuoto } from '@/components/ds/Vuoto'
import { tipografia } from '@/design-system/v3/tokens'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

/** Quante cassette entrano nella stanza home senza farla scorrere: 2 righe da 3 (mockup
 *  ratificato). Il Task 15 lo deriva dal viewport — v. nota di testa. */
export const CAP_PARETE_HOME = 6

export function StanzaParete(props: { parete: CassettaParete[]; capN: number }) {
  const { parete, capN } = props
  const router = useRouter()

  // La parete arriva GIÀ ordinata da `deriveParete` (`posizione, created_at, id`): qui si
  // taglia soltanto: l'ordine è la mappa mentale del muro fisico e non si tocca.
  const visibili = parete.slice(0, capN)

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
              {visibili.map((c) => (
                <Cassetta
                  key={c.id}
                  id={c.id}
                  nome={c.nome}
                  colore={c.colore}
                  lavoro={c.lavoro}
                  stato="normale"
                  onTap={() => router.push(c.lavoro ? `/lavori/${c.lavoro.id}` : '/cassette')}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
