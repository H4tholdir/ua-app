'use client'

// DS v3 §12.3 (Task 9) — SchedaAnteprima: il pannello destro della nav a 3
// pannelli (1280, `home.html` `.scheda-desk`) e della colonna destra dello
// split 768 (`pila-aperta.html` `.scheda`). Anteprima READ-ONLY del lavoro
// selezionato: header n.{numero} + PillTempo · CardInfo/RigaDato (dati del
// lavoro) · card «Le fasi» (RigaFase senza chi·quando — la scheda piena con
// chi/quando arriva in Ondata 3, deviazione dichiarata in PR) · TastoPrimario
// CONSEGNA (§5.1: MAI nascosto — disabled + callout finché non consegnabile)
// · LinkQuieto «Apri la scheda completa» verso `/lavori/{id}` (P1/deep-link).
//
// GDPR: `lavoro.paziente` arriva già pseudonimizzato (PZ-xxxx) da `pile-home.ts`
// — questo componente lo mostra invariato, non lo trasforma mai.

import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { CardInfo, RigaDato } from '@/components/ds/CardInfo'
import { RigaFase } from '@/components/ds/RigaFase'
import { PillTempo } from '@/components/ds/Pill'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { tipografia } from '@/design-system/v3/tokens'
// Da `pile-home-shared.ts` (Task 9), NON da `pile-home.ts`: quel file porta
// `import 'server-only'` e non può finire nel bundle client — questo
// componente è `'use client'` e chiama `giornoBreve` a runtime nel browser.
import { giornoBreve, type LavoroPila } from '@/lib/dashboard/pile-home-shared'

const TITOLO_SEZIONE: CSSProperties = {
  fontSize: tipografia.size.caption,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: tipografia.tracking.caption,
  textTransform: 'uppercase',
  color: 'var(--faint)',
  marginBottom: 4,
}

function maiuscolaIniziale(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function SchedaAnteprima(props: { lavoro: LavoroPila }) {
  const { lavoro } = props
  const router = useRouter()
  const oggi = new Date()

  const giorno = giornoBreve(lavoro.consegna.data, oggi)
  const ora = lavoro.consegna.ora ? lavoro.consegna.ora.slice(0, 5) : null
  const consegnaValore = ora ? `${maiuscolaIniziale(giorno)} · ${ora}` : maiuscolaIniziale(giorno)
  const consegnaUrgente = giorno === 'oggi' || giorno === 'domani'

  return (
    <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 27, fontWeight: tipografia.weight.extrabold, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          n.{lavoro.numero}
        </span>
        <PillTempo famiglia={lavoro.pill.famiglia}>{lavoro.pill.testo}</PillTempo>
      </div>

      <div>
        <div style={TITOLO_SEZIONE}>Il lavoro</div>
        <CardInfo>
          <RigaDato chiave="Dentista" valore={lavoro.dentista} />
          <RigaDato chiave="Paziente" valore={lavoro.paziente} />
          <RigaDato chiave="Lavoro" valore={lavoro.tipoLavoro} />
          <RigaDato chiave="Consegna" valore={consegnaValore} urgente={consegnaUrgente} />
          {lavoro.tecnico && <RigaDato chiave="Tecnico" valore={lavoro.tecnico} />}
        </CardInfo>
      </div>

      <div>
        <div style={TITOLO_SEZIONE}>Le fasi</div>
        <CardInfo>
          {lavoro.fasi.map((f) => (
            <RigaFase key={f.nome} nome={f.nome} fatto={f.fatta} />
          ))}
        </CardInfo>
      </div>

      <div style={{ maxWidth: 340 }}>
        <TastoPrimario
          disabled={!lavoro.consegnabile}
          motivoDisabilitato="Completa il controllo finale per consegnare"
          onClick={() => router.push(`/lavori/${lavoro.id}/consegna`)}
        >
          Consegna
        </TastoPrimario>
      </div>

      <div>
        <LinkQuieto href={`/lavori/${lavoro.id}`}>Apri la scheda completa</LinkQuieto>
      </div>
    </div>
  )
}
