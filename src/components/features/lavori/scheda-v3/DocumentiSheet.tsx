'use client'

// Ondata 3a Task 5 — DocumentiSheet: hub download della scheda-vista v3.
// Ogni voce è un link `<a href download>` verso un endpoint API ESISTENTE
// (nessuna nuova route, YAGNI): Scheda di Fabbricazione, IFU, Etichetta e
// Ricevuta di Consegna sono generatori on-demand (già usati altrove — vedi
// `src/app/(app)/lavori/[id]/page.tsx:133` per lo stesso pattern
// `href + download`). La DdC invece NON ha un generatore on-demand: il PDF è
// già in storage al momento della consegna (`generate-ddc` gira dentro
// `orchestrate.ts`), e i chiamanti esistenti (`page.tsx`, `TabDocumenti.tsx`)
// lo aprono via URL firmata (`ddc.pdf_url`, `target="_blank"`, MAI
// `download` — cross-origin, l'attributo verrebbe ignorato). Questo
// componente riceve quindi `lavoro.ddcUrl` (opzionale — Task 6 dovrà
// valorizzarlo quando disponibile) invece di ricostruire un endpoint
// inventato: senza URL firmata la voce DdC resta assente anche se
// `haDdc` è true, perché un link senza `href` reale sarebbe dato finto.
//
// Il Pacchetto Consegna MDR non è un link: apre `PacchettoConsegnaSheet` via
// stato locale (Task 6/7 lo montano nella pagina, ma qui — dove il download
// hub vive — l'apertura è un bottone per non collidere con le query
// `getByRole('link', ...)` dei test sulle voci sopra).

import { useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { PacchettoConsegnaSheet } from '@/components/features/lavori/PacchettoConsegnaSheet'
import { spazio, tipografia, raggio } from '@/design-system/v3/tokens'

export interface DocumentiSheetLavoro {
  id: string
  numero_lavoro: string
  cliente_display: string
  haFasi: boolean
  haDdc: boolean
  /** URL firmata del PDF DdC già generato (storage) — assente finché Task 6
   * non la valorizza. Senza URL la voce DdC non compare, anche se `haDdc`. */
  ddcUrl?: string
}

type VoceDownload = {
  chiave: string
  etichetta: string
  href: string
}

/** Le 4 voci sempre-endpoint-esistente, guidate da un array (nessun blocco
 * copiato 4 volte) — Scheda di Fabbricazione e DdC hanno condizioni proprie,
 * gestite dal chiamante di `costruisciVociDownload`. */
function costruisciVociDownload(lavoro: DocumentiSheetLavoro): VoceDownload[] {
  const base = `/api/lavori/${lavoro.id}`
  const voci: VoceDownload[] = []

  if (lavoro.haFasi) {
    voci.push({
      chiave: 'scheda-fabbricazione',
      etichetta: 'Scheda di Fabbricazione',
      href: `${base}/scheda-fabbricazione`,
    })
  }

  voci.push(
    { chiave: 'ifu', etichetta: 'IFU — Istruzioni per l\'Uso', href: `${base}/ifu` },
    { chiave: 'etichetta', etichetta: 'Etichetta Dispositivo', href: `${base}/etichetta` },
    { chiave: 'ricevuta-consegna', etichetta: 'Ricevuta di Consegna', href: `${base}/ricevuta-consegna` }
  )

  return voci
}

/**
 * DocumentiSheet — hub download della scheda-vista v3 (Task 5). Righe da
 * `costruisciVociDownload` (endpoint generatori on-demand, `download`) + una
 * voce DdC separata (URL firmata, `target="_blank"`, condizionata su
 * `haDdc && ddcUrl` — mai un href inventato) + il bottone che apre il
 * `PacchettoConsegnaSheet` (pacchetto MDR completo, stato locale).
 */
export function DocumentiSheet(props: { aperto: boolean; onChiudi: () => void; lavoro: DocumentiSheetLavoro }) {
  const { aperto, onChiudi, lavoro } = props
  const [pacchettoAperto, setPacchettoAperto] = useState(false)
  const vociDownload = costruisciVociDownload(lavoro)
  const mostraDdc = lavoro.haDdc && !!lavoro.ddcUrl

  return (
    <>
      <Sheet aperto={aperto} onChiudi={onChiudi} titolo="Documenti">
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {mostraDdc && (
            <a
              href={lavoro.ddcUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={rigaStile(false)}
            >
              <span style={{ flex: 1 }}>Scarica DdC</span>
              <span style={chevStile}>{'›'}</span>
            </a>
          )}
          {vociDownload.map((voce, indice) => (
            <a
              key={voce.chiave}
              href={voce.href}
              download
              style={rigaStile(indice === vociDownload.length - 1)}
            >
              <span style={{ flex: 1 }}>{voce.etichetta}</span>
              <span style={chevStile}>{'›'}</span>
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setPacchettoAperto(true)}
          style={bottonePacchettoStile}
        >
          Pacchetto Consegna MDR
        </button>
      </Sheet>

      <PacchettoConsegnaSheet
        lavoro={lavoro}
        isOpen={pacchettoAperto}
        onClose={() => setPacchettoAperto(false)}
      />
    </>
  )
}

function rigaStile(ultima: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: spazio.m,
    width: '100%',
    minHeight: 48,
    padding: `${spazio.xs + 4}px 0`,
    textDecoration: 'none',
    color: 'var(--ink)',
    fontFamily: tipografia.famiglia,
    fontSize: tipografia.size.body,
    fontWeight: tipografia.weight.bold,
    borderBottom: !ultima ? '1.5px solid var(--line)' : 'none',
  }
}

const chevStile = {
  color: 'var(--faint)',
  fontSize: 20,
  fontWeight: tipografia.weight.extrabold,
}

const bottonePacchettoStile = {
  marginTop: spazio.m,
  width: '100%',
  height: 44,
  borderRadius: raggio.riga,
  border: '1.5px solid var(--line)',
  background: 'none',
  color: 'var(--ink)',
  fontFamily: tipografia.famiglia,
  fontSize: tipografia.size.body,
  fontWeight: tipografia.weight.bold,
  cursor: 'pointer',
}
