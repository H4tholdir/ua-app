// DS v3 §9 (Ondata 2, Task 13) — persistenza abbandono 24h del wizard «Nuovo
// lavoro». localStorage puro, nessuna rete: `StatoSalvato` porta SOLO campi
// serializzabili — niente `foto` (`File` non è serializzabile in JSON;
// perdita accettata e documentata, spec §9). Le funzioni sono pure verso
// l'esterno tranne l'I/O di `localStorage`, sempre in try/catch silenzioso
// (constraint §9: la persistenza è un bonus, mai un blocco alla creazione
// del lavoro — un browser con storage disabilitato/pieno deve comunque
// funzionare).

import type { StatoWizard, TipoScelto } from '@/components/features/wizard/WizardNuovoLavoro'

export type StatoSalvato = {
  v: 1
  salvatoA: number
  userId: string
  labId: string
  passo: StatoWizard['passo']
  cliente: StatoWizard['cliente']
  tipo: TipoScelto | null
  pz: string
  alias: string
  elemento: string
  colore: string
}

export const CHIAVE_WIZARD = 'ua:wizard-lavoro:v1'

const VENTIQUATTRO_ORE_MS = 24 * 60 * 60 * 1000

/** Scrive lo stato — try/catch silenzioso (quota superata, storage disabilitato, iframe sandboxato, ecc.). */
export function salvaStato(s: StatoSalvato): void {
  try {
    window.localStorage.setItem(CHIAVE_WIZARD, JSON.stringify(s))
  } catch {
    // silenzioso — vedi commento in testa al modulo.
  }
}

/**
 * Legge lo stato salvato, applicando le guardie di spec §9: `null` se la
 * chiave è assente, il JSON è rotto, la versione non è quella attesa (`v`),
 * sono passate più di 24h da `salvatoA`, oppure `userId`/`labId` non
 * coincidono con l'utente/lab correnti (guardia "dispositivo condiviso" — un
 * altro odontotecnico sullo stesso device non deve MAI vedere "Riprendo da
 * dove eri?" con i dati di qualcun altro). Se scaduto, la chiave viene anche
 * rimossa (non resta a marcire in localStorage).
 *
 * `ora` è iniettabile per testabilità (RED/GREEN deterministici); nel wizard
 * reale il chiamante passa `Date.now()` — è un timestamp epoch assoluto, non
 * una data di calendario: nessun problema di fuso orario (nota O1b non si
 * applica qui).
 */
export function leggiStato(userId: string, labId: string, ora: number = Date.now()): StatoSalvato | null {
  let grezzo: string | null
  try {
    grezzo = window.localStorage.getItem(CHIAVE_WIZARD)
  } catch {
    return null
  }
  if (!grezzo) return null

  let parsed: StatoSalvato
  try {
    parsed = JSON.parse(grezzo) as StatoSalvato
  } catch {
    return null
  }

  if (!parsed || parsed.v !== 1) return null

  if (ora - parsed.salvatoA > VENTIQUATTRO_ORE_MS) {
    azzeraStato()
    return null
  }

  if (parsed.userId !== userId || parsed.labId !== labId) return null

  return parsed
}

/** Rimuove la chiave — try/catch silenzioso, stesso principio di `salvaStato`. */
export function azzeraStato(): void {
  try {
    window.localStorage.removeItem(CHIAVE_WIZARD)
  } catch {
    // silenzioso — vedi commento in testa al modulo.
  }
}
