'use client'

// DS v3 §5.16/§7.3 (Ondata 2, Task 10) — CatalogoTipiSheet: il catalogo
// COMPLETO dei tipi di lavoro, aperto da «＋ Un altro tipo» al Passo 2 del
// wizard. Lista dei 38 tipi raggruppata per famiglia macro in ordine canonico
// (header = LABEL_MACRO, ordine di prima comparsa in TIPI_LAVORO — vedi
// FAMIGLIE_ORDINE sotto), RigaCerca in testa
// (stessa `cercaTipiLavoro` del passo — contains accent/case-insensitive su
// label + aliases + label macro: 'cappetta' → corona_zirconia), e in fondo
// «Non lo trovi? Descrivilo» → CampoTesto → `onScegli({kind:'libero', testo})`
// SOLO se il testo non è vuoto (spec §3: il testo libero non genera mai tipi,
// produce macro 'altro' + descrizione a valle — qui esce solo il testo).
//
// Le voci sono righe-bottone a piena larghezza (H ≥ 44px, touch target §12),
// non TileScelta: dentro uno sheet che scrolla la griglia 2×2 sarebbe rumore —
// il catalogo è una LISTA da scorrere/cercare, non una scelta fra 4 evidenze.

import { useMemo, useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { RigaCerca } from '@/components/ds/RigaCerca'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { tipografia, raggio, spazio } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'
import {
  TIPI_LAVORO,
  LABEL_MACRO,
  labelTipo,
  cercaTipiLavoro,
  type TipoLavoro,
} from '@/lib/domain/tipi-lavoro'
import type { TipoDispositivo } from '@/types/domain'
import type { TipoScelto } from './WizardNuovoLavoro'

// «Ordine canonico» delle famiglie = ordine di PRIMA COMPARSA in TIPI_LAVORO
// (fix round Task 10: stessa nozione del test 'query vuota → ordine canonico'
// di tipi-lavoro.test — la tabella ratificata §3.2 è la fonte, NON l'ordine
// delle chiavi di LABEL_MACRO/MACRO_SLUGS). 'altro' non ha voci in tabella:
// accodato per completezza — oggi il suo gruppo resta vuoto e non si mostra,
// ma se un domani la tabella ne avesse una non sparirebbe in silenzio.
const FAMIGLIE_ORDINE: TipoDispositivo[] = (() => {
  const ordine = [...new Set(TIPI_LAVORO.map((t) => t.macro))]
  if (!ordine.includes('altro')) ordine.push('altro')
  return ordine
})()

export function CatalogoTipiSheet(props: {
  aperto: boolean
  onChiudi: () => void
  onScegli: (t: TipoScelto) => void
}) {
  const { aperto, onChiudi, onScegli } = props
  // null = riga di ricerca chiusa (§5.13, stesso pattern di PassoDentista).
  const [query, setQuery] = useState<string | null>(null)
  // null = «Descrivilo» chiuso; stringa = campo aperto col testo corrente.
  const [descrizione, setDescrizione] = useState<string | null>(null)

  const risultati = useMemo(
    () => (query === null ? TIPI_LAVORO : cercaTipiLavoro(query)),
    [query]
  )

  // Gruppi per macro in ordine canonico (FAMIGLIE_ORDINE, prima comparsa in
  // TIPI_LAVORO); dentro ogni gruppo l'ordine canonico è preservato dal filter.
  // Le famiglie senza voci (o svuotate dalla ricerca) NON mostrano l'header.
  const gruppi = useMemo(
    () =>
      FAMIGLIE_ORDINE
        .map((macro) => ({ macro, tipi: risultati.filter((t) => t.macro === macro) }))
        .filter((g) => g.tipi.length > 0),
    [risultati]
  )

  function reset() {
    setQuery(null)
    setDescrizione(null)
  }

  function chiudi() {
    reset()
    onChiudi()
  }

  function scegliTipo(t: TipoLavoro) {
    reset()
    onScegli({ kind: 'catalogo', tipoId: t.id })
  }

  function confermaDescrizione() {
    const testo = (descrizione ?? '').trim()
    if (!testo) return // SOLO se testo non vuoto (brief) — il tasto è comunque disabled
    reset()
    onScegli({ kind: 'libero', testo })
  }

  return (
    <Sheet aperto={aperto} onChiudi={chiudi} titolo="Tutti i tipi di lavoro">
      {/* Ricerca in testa (brief): apre il CampoTesto sopra la lista, la lista
          si rifiltra live — mai una vista separata. */}
      {query === null ? (
        <RigaCerca totale={TIPI_LAVORO.length} cosa="tipi di lavoro" onApri={() => setQuery('')} />
      ) : (
        <CampoTesto label="Cerca" valore={query} onCambia={setQuery} placeholder="Cerca un tipo di lavoro…" autoFocus />
      )}

      {gruppi.map((g) => (
        <GruppoFamiglia key={g.macro} macro={g.macro} tipi={g.tipi} onScegli={scegliTipo} />
      ))}

      {/* «Non lo trovi? Descrivilo» — SEMPRE in fondo, anche a ricerca vuota:
          è proprio quando la ricerca non trova nulla che serve. */}
      {descrizione === null ? (
        <VoceDescrivilo onApri={() => setDescrizione('')} />
      ) : (
        <div>
          <CampoTesto
            label="Descrizione"
            valore={descrizione}
            onCambia={setDescrizione}
            placeholder="es. Riparazione gancio fuso"
            autoFocus
          />
          <div style={{ marginTop: spazio.m }}>
            <TastoSecondario onClick={confermaDescrizione} disabled={!descrizione.trim()}>
              Usa questa descrizione
            </TastoSecondario>
          </div>
        </div>
      )}
    </Sheet>
  )
}

/** Un gruppo-famiglia: header h3 MAIUSC (label §4.1, a11y: navigazione screen
 *  reader fra famiglie — il titolo dello Sheet è h2) + righe tipo impilate. */
function GruppoFamiglia(props: {
  macro: TipoDispositivo
  tipi: TipoLavoro[]
  onScegli: (t: TipoLavoro) => void
}) {
  const { macro, tipi, onScegli } = props
  return (
    <div>
      <h3 style={stileHeaderFamiglia}>{LABEL_MACRO[macro]}</h3>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tipi.map((t) => (
          <RigaTipo key={t.id} tipo={t} onClick={() => onScegli(t)} />
        ))}
      </div>
    </div>
  )
}

/** Una voce del catalogo: riga-bottone piena larghezza, H ≥ 44 (touch §12). */
function RigaTipo(props: { tipo: TipoLavoro; onClick: () => void }) {
  const { tipo, onClick } = props

  function handleClick() {
    vibra('selection') // selezione fra opzioni esistenti, come TileScelta — MAI suona()
    onClick()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9). */}
      <style>{`
        .ds-riga-tipo:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <button type="button" className="ds-riga-tipo" onClick={handleClick} style={stileRigaTipo}>
        {labelTipo(tipo)}
      </button>
    </>
  )
}

/** La riga finale «Non lo trovi? Descrivilo» — apre il CampoTesto. */
function VoceDescrivilo(props: { onApri: () => void }) {
  const { onApri } = props
  return (
    <>
      <style>{`
        .ds-descrivilo:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <button type="button" className="ds-descrivilo" onClick={onApri} style={stileDescrivilo}>
        Non lo trovi? <span style={{ color: 'var(--ink)', fontWeight: tipografia.weight.bold }}>Descrivilo</span>
      </button>
    </>
  )
}

const stileHeaderFamiglia = {
  margin: 0, // è un h3: azzera il margine UA, lo spazio lo dà marginBottom
  fontSize: tipografia.size.label,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: tipografia.tracking.label,
  textTransform: 'uppercase',
  color: 'var(--faint)',
  marginBottom: spazio.xs,
} as const

const stileRigaTipo = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minHeight: 52, // ≥ 44 (touch target §12)
  padding: `0 ${spazio.xs}px`,
  border: 'none',
  background: 'transparent',
  borderRadius: raggio.riga,
  color: 'var(--ink)',
  fontSize: tipografia.size.body,
  fontWeight: tipografia.weight.bold,
  textAlign: 'left',
  cursor: 'pointer',
} as const

const stileDescrivilo = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  width: '100%',
  minHeight: 52, // ≥ 44 (touch target §12)
  border: 'none',
  background: 'transparent',
  color: 'var(--muted)',
  fontSize: tipografia.size.body,
  fontWeight: tipografia.weight.semibold,
  cursor: 'pointer',
} as const
