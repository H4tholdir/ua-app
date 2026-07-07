import type { GruppoClassePsur } from '@/types/domain'

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
