import { CLASSE_RISCHIO_TO_GRUPPO, type GruppoClassePsur } from '@/types/domain'

export interface StatoSorveglianza {
  tipoDocumento: 'PMS Report' | 'PSUR'
  cadenzaLabel: string
  scaduto: boolean
  alertLivello: 'nessuno' | 'info' | 'urgente'
}

const GIORNO_MS = 24 * 60 * 60 * 1000

export function getStatoSorveglianza(
  gruppoClasse: GruppoClassePsur,
  ultimaData: string | null,
  now: Date = new Date()
): StatoSorveglianza {
  if (gruppoClasse === 'classe_i') {
    const cadenzaLabel = 'Nessuna cadenza fissa (MDR Art. 85) — aggiornare quando necessario'
    if (!ultimaData) {
      return { tipoDocumento: 'PMS Report', cadenzaLabel, scaduto: false, alertLivello: 'info' }
    }
    const giorni = (now.getTime() - new Date(ultimaData).getTime()) / GIORNO_MS
    return {
      tipoDocumento: 'PMS Report',
      cadenzaLabel,
      scaduto: false,
      alertLivello: giorni > 365 ? 'info' : 'nessuno',
    }
  }

  const sogliaGiorni = gruppoClasse === 'classe_iia' ? 730 : 365
  const cadenzaLabel =
    gruppoClasse === 'classe_iia'
      ? 'Almeno ogni 2 anni (MDR Art. 86)'
      : 'Almeno annuale (MDR Art. 86)'

  if (!ultimaData) {
    return { tipoDocumento: 'PSUR', cadenzaLabel, scaduto: true, alertLivello: 'urgente' }
  }

  const giorni = (now.getTime() - new Date(ultimaData).getTime()) / GIORNO_MS
  const scaduto = giorni > sogliaGiorni
  return { tipoDocumento: 'PSUR', cadenzaLabel, scaduto, alertLivello: scaduto ? 'urgente' : 'nessuno' }
}

const ORDINE_GRUPPI: GruppoClassePsur[] = ['classe_i', 'classe_iia', 'classe_iib_iii']

export function rilevaGruppi(classiRischio: string[]): {
  gruppiRilevati: GruppoClassePsur[]
  nonClassificabili: number
} {
  const mappa = CLASSE_RISCHIO_TO_GRUPPO as Record<string, GruppoClassePsur | undefined>
  const gruppiTrovati = new Set<GruppoClassePsur>()
  let nonClassificabili = 0

  for (const classe of classiRischio) {
    const gruppo = Object.prototype.hasOwnProperty.call(mappa, classe) ? mappa[classe] : undefined
    if (gruppo) {
      gruppiTrovati.add(gruppo)
    } else {
      nonClassificabili++
    }
  }

  return {
    gruppiRilevati: ORDINE_GRUPPI.filter((g) => gruppiTrovati.has(g)),
    nonClassificabili,
  }
}
