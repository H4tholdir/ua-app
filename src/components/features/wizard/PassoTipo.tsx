'use client'

// DS v3 §7.3/§5.12/§5.13/§5.15 (Ondata 2, Task 10) — PassoTipo: il Passo 2 del
// wizard «Nuovo lavoro». Copy VERBATIM da wizard.html:295-345 (frame «Passo 2 ·
// tipo lavoro»): domanda «Che lavoro è?», hint, griglia 4 tile + «＋ Un altro
// tipo», RigaCerca, PillVoce.
//
// Struttura speculare a PassoDentista (Task 8) — stessa griglia §5.12, stessa
// UX di ricerca §5.13 (query null = chiusa), stessa PillVoce §5.15 in fondo.
// Differenze:
//   - i 4 tile vengono da `topTipi` (Task 7: tipi con count>0 per frequenza
//     desc, completati dai CANONICI_DAY1) — qui si risolve solo l'id con
//     `trovaTipo` e si scarta in silenzio un id ignoto (difensivo: topTipi
//     viene dal server, TIPI_LAVORO è la fonte di verità client);
//   - il tile porta un glifo line-SVG di famiglia (GLIFI_FAMIGLIA, §4.4),
//     MAI un avatar né emoji;
//   - «＋ Un altro tipo» non crea nulla: apre il catalogo completo
//     (CatalogoTipiSheet), che condivide `onScegli` — scelta dal catalogo e
//     scelta dal tile passano dallo STESSO contratto TipoScelto;
//   - la ricerca del passo usa `cercaTipiLavoro` (alias inclusi: 'cappetta'
//     trova Corona zirconia), non un filtro locale sulla label.
//
// RATIFICA FRANCESCO (Task 10b): il nome del tile è su DUE RIGHE — riga1 +
// riga2 dalla tassonomia (`t.tile.riga1`/`t.tile.riga2`, es. «Corona» /
// «su impianto»), via la prop `nomeRiga2` di TileScelta (§5.12). Per i tipi a
// nome singolo (es. «Riparazione») `riga2` è assente → TileScelta ricade sul
// comportamento una-riga esistente, invariato.

import { useMemo, useState } from 'react'
import { tipografia } from '@/design-system/v3/tokens'
import { TileScelta, TileNuovo } from '@/components/ds/TileScelta'
import { RigaCerca } from '@/components/ds/RigaCerca'
import { CampoTesto } from '@/components/ds/Campo'
import { PillVoce } from '@/components/ds/PillVoce'
import {
  TIPI_LAVORO,
  LABEL_MACRO,
  trovaTipo,
  cercaTipiLavoro,
  type TipoLavoro,
} from '@/lib/domain/tipi-lavoro'
import { GLIFI_FAMIGLIA } from './glifi-famiglie'
import { CatalogoTipiSheet } from './CatalogoTipiSheet'
import type { TipoScelto } from './WizardNuovoLavoro'

const MAX_TILE = 4

export function PassoTipo(props: {
  topTipi: string[]
  frequenze: Record<string, number>
  onScegli: (t: TipoScelto) => void
}) {
  const { topTipi, frequenze, onScegli } = props
  // null = riga di ricerca chiusa (§5.13, stesso pattern di PassoDentista).
  const [query, setQuery] = useState<string | null>(null)
  const [catalogoAperto, setCatalogoAperto] = useState(false)

  // Id → TipoLavoro, scartando in silenzio id ignoti (vedi commento in testa).
  const inEvidenza = useMemo(
    () =>
      topTipi
        .map(trovaTipo)
        .filter((t): t is TipoLavoro => t !== undefined)
        .slice(0, MAX_TILE),
    [topTipi]
  )

  const risultatiRicerca = useMemo(() => {
    if (query === null) return []
    return cercaTipiLavoro(query)
  }, [query])

  function tile(t: TipoLavoro) {
    const count = frequenze[t.id] ?? 0
    return (
      <TileScelta
        key={t.id}
        nome={t.tile.riga1}
        nomeRiga2={t.tile.riga2}
        sotto={count > 0 ? `${count} · 30gg` : LABEL_MACRO[t.macro]}
        glifo={GLIFI_FAMIGLIA[t.macro]}
        onClick={() => onScegli({ kind: 'catalogo', tipoId: t.id })}
      />
    )
  }

  return (
    <div>
      <h1 style={stileDomanda}>Che lavoro è?</h1>
      <p style={stileHint}>Tocca il tipo. Poi ci pensa UÀ a stimare i tempi.</p>

      {query === null ? (
        <>
          <div style={stileGriglia}>
            {inEvidenza.map(tile)}
            <div style={{ gridColumn: '1 / -1' }}>
              <TileNuovo etichetta="＋ Un altro tipo" onClick={() => setCatalogoAperto(true)} />
            </div>
          </div>
          {/* wizard.html:121 .riga-cerca margin-top:15px — il componente non lo porta con sé. */}
          <div style={{ marginTop: 15 }}>
            <RigaCerca totale={TIPI_LAVORO.length} cosa="tipi di lavoro" onApri={() => setQuery('')} />
          </div>
        </>
      ) : (
        <div style={{ marginTop: 22 }}>
          <CampoTesto label="Cerca" valore={query} onCambia={setQuery} placeholder="Cerca un tipo di lavoro…" autoFocus />
          <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 15 }}>
            {risultatiRicerca.map(tile)}
          </div>
        </div>
      )}

      {/* wizard.html:337 .pv-wrap margin-top:22px — sempre in fondo al passo (§5.15). */}
      <div style={{ marginTop: 22 }}>
        <PillVoce onTesto={(testo) => setQuery(testo)} />
      </div>

      <CatalogoTipiSheet
        aperto={catalogoAperto}
        onChiudi={() => setCatalogoAperto(false)}
        onScegli={(t) => {
          setCatalogoAperto(false)
          onScegli(t)
        }}
      />
    </div>
  )
}

// Domanda (§4.1, token `question`) + hint — VERBATIM wizard.html:304-305.
const stileDomanda = {
  fontSize: tipografia.size.question,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: tipografia.tracking.titoli,
  lineHeight: 1.08,
  color: 'var(--ink)',
} as const

const stileHint = {
  fontSize: tipografia.size.callout,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--muted)',
  marginTop: 10,
} as const

// Griglia 2 colonne, gap 15, marginTop 22 — letterale (wizard.html:98).
const stileGriglia = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15,
  marginTop: 22,
} as const
