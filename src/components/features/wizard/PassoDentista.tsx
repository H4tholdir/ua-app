'use client'

// DS v3 §7.3/§5.12/§5.13/§5.15 (Task 8) — PassoDentista: il Passo 1 del wizard
// «Nuovo lavoro». Copy e valori VERBATIM da wizard.html:244-293 (frame «Passo
// 1 · dentista»): domanda, hint, griglia tile, RigaCerca.
//
// Griglia (§5.12: 2 colonne, gap 15, marginTop 22 — wizard.html:98). Mostra al
// massimo 4 TileScelta (i dentisti arrivano già ordinati per count30 desc da
// `aggregaDatiWizard`, qui si slice-a soltanto) + un TileNuovo a piena
// larghezza (`gridColumn: '1 / -1'`, wizard.html:99).
//
// Ricerca (§5.13): stessa UX di `PilaAperta` (Task 8 precedente) — `query`
// null = riga chiusa, stringa (anche vuota) = modalità ricerca aperta.
// `normalizza()` (decisione W5, `@/lib/domain/tipi-lavoro`) fa il contains
// accent/case-insensitive; i risultati sono TileScelta a piena larghezza,
// impilati (non nella griglia 2 colonne, wizard.html non la disegna ma
// PillVoce/CampoTesto §5.27 vivono SOLO in colonna singola).
//
// PillVoce sempre in fondo (§5.15, ogni passo del wizard): `onTesto` apre la
// ricerca già compilata con il trascritto — parlare "Esposito" deve filtrare
// subito, non solo popolare un campo chiuso.

import { useMemo, useState } from 'react'
import { normalizza } from '@/lib/domain/tipi-lavoro'
import { tipografia } from '@/design-system/v3/tokens'
import { TileScelta, TileNuovo } from '@/components/ds/TileScelta'
import { RigaCerca } from '@/components/ds/RigaCerca'
import { CampoTesto } from '@/components/ds/Campo'
import { PillVoce } from '@/components/ds/PillVoce'
import type { DentistaWizard } from '@/lib/wizard/dati-wizard'

const MAX_TILE = 4

export function PassoDentista(props: {
  dentisti: DentistaWizard[]
  onScegli: (d: { id: string; label: string }) => void
  onNuovoDentista: () => void
}) {
  const { dentisti, onScegli, onNuovoDentista } = props
  // null = riga di ricerca chiusa (§5.13, stesso pattern di PilaAperta/Task 8).
  const [query, setQuery] = useState<string | null>(null)

  const inEvidenza = dentisti.slice(0, MAX_TILE)

  const risultatiRicerca = useMemo(() => {
    if (query === null) return []
    const q = normalizza(query.trim())
    if (!q) return dentisti
    return dentisti.filter((d) => normalizza(d.label).includes(q))
  }, [dentisti, query])

  function tile(d: DentistaWizard) {
    return (
      <TileScelta
        key={d.id}
        nome={d.label}
        sotto={`${d.count30} lavori · 30gg`}
        avatar={d.label}
        onClick={() => onScegli({ id: d.id, label: d.label })}
      />
    )
  }

  return (
    <div>
      <h1 style={stileDomanda}>Per quale dentista?</h1>
      <p style={stileHint}>Tocca chi te l&apos;ha portato. I più frequenti stanno in alto.</p>

      {query === null ? (
        <>
          <div style={stileGriglia}>
            {inEvidenza.map(tile)}
            <div style={{ gridColumn: '1 / -1' }}>
              <TileNuovo etichetta="＋ Nuovo dentista" onClick={onNuovoDentista} />
            </div>
          </div>
          {/* wizard.html:120 .riga-cerca margin-top:15px — il componente non lo porta con sé. */}
          <div style={{ marginTop: 15 }}>
            <RigaCerca totale={dentisti.length} cosa="dentisti" onApri={() => setQuery('')} />
          </div>
        </>
      ) : (
        <div style={{ marginTop: 22 }}>
          <CampoTesto label="Cerca" valore={query} onCambia={setQuery} placeholder="Cerca dentista…" autoFocus />
          <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 15 }}>
            {risultatiRicerca.map(tile)}
          </div>
        </div>
      )}

      {/* wizard.html:135 .pv-wrap margin-top:22px — sempre in fondo al passo (§5.15). */}
      <div style={{ marginTop: 22 }}>
        <PillVoce onTesto={(testo) => setQuery(testo)} />
      </div>
    </div>
  )
}

// Domanda (§4.1, token `question`) + hint — VERBATIM wizard.html:94-95.
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

// Griglia 2 colonne, gap 15, marginTop 22 — letterale (wizard.html:98, fuori
// dalla scala `spazio` come già `ALTEZZA_CAMPO` in Campo.tsx).
const stileGriglia = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 15,
  marginTop: 22,
} as const
