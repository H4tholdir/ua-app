// src/lib/pdf/dpa-modello.ts

import { improntaPayload } from '@/lib/pdf/generate-ddc'
import type { Laboratorio, Cliente } from '@/types/domain'

/** sha-256 del testo reso con la fixture fissa di `tests/unit/dpa-modello.test.ts`.
 *  NON è una firma del documento: è l'impronta della FORMA del testo, e serve a
 *  distinguere due modelli diversi. Si aggiorna quando la prova diventa rossa,
 *  cioè quando il testo di `DpaTemplate.tsx` è cambiato. */
export const IMPRONTA_TESTO_DPA = '8d98dbeebfef2cf3c884f66149804f9654e030b9283c1f9d6a254a5b7ef64ef5'

/** Revisione LEGGIBILE del modello, per gli umani. Si alza a mano quando il testo
 *  cambia in modo sostanziale — ma NON è ciò che garantisce la correttezza del
 *  registro: quella la garantisce l'impronta qui sopra.
 *  v2 = riscrittura del 03/08/2026 (D126). */
const REVISIONE_LEGGIBILE_DPA = 'v2'

/** Versione del modello **così come finisce in banca dati**, nella colonna
 *  `template_versione`.
 *
 *  🔑 Porta dentro le prime otto cifre dell'impronta del testo, e non è
 *  ornamento — è **D133 (03/08/2026)**. La prova rende VISIBILE un cambio di
 *  testo, ma da sola non IMPEDISCE di dimenticare di alzare la revisione: chi
 *  chiude il rosso incollando la nuova impronta ottiene un verde senza aver
 *  toccato `v2`. E la conseguenza non è cosmetica: il registro direbbe `v2` su
 *  un testo che `v2` non è più, e l'indice `dpa_emissione_viva_unica` — che
 *  confronta proprio `template_versione` — vedrebbe stessa versione e stessi
 *  dati e **NON riemetterebbe**: il dentista resterebbe col contratto vecchio
 *  mentre il laboratorio crede di avergli mandato quello nuovo. È esattamente il
 *  guasto che la riscrittura del contratto (D126) doveva chiudere.
 *
 *  Con l'impronta attaccata, la versione cambia **da sola** quando cambia il
 *  testo: dimenticare di alzare `v2` diventa **innocuo**.
 *  *(È la lezione di D120, i 211 scatti dei mockup mai salvati: una promessa che
 *  dipende da un gesto umano ripetuto è una promessa che salta.)*
 *
 *  ⚠️ **Deterministica:** si compone da due LETTERALI di questo file, mai da un
 *  render fatto a tempo di esecuzione. Due macchine producono lo stesso valore.
 */
export const VERSIONE_MODELLO_DPA = `dpa-${REVISIONE_LEGGIBILE_DPA}+${IMPRONTA_TESTO_DPA.slice(0, 8)}`

/** I soli dati che il modello STAMPA. Numero e data di emissione sono
 *  deliberatamente FUORI: sono attributi dell'emissione, non del contenuto —
 *  se entrassero, l'impronta cambierebbe ogni giorno e nascerebbe
 *  un'emissione a ogni scarico in un giorno diverso (spec §5).
 *
 *  ⚠️ Il Pick qui sotto riprende la forma del tipo `DpaData` accettato da
 *  `DpaTemplate.tsx` (10 campi lab, 9 cliente), prescritto testualmente dal
 *  brief del Task 3. **Non torna** contro ciò che il template STAMPA davvero
 *  in JSX: `lab.codice_fiscale`, `cliente.cap` e `cliente.provincia` sono
 *  accettati dal tipo ma non compaiono in nessun `<Text>` del template
 *  (verificato riga per riga in `DpaTemplate.tsx` il 03/08/2026, Task 3).
 *  Segnalato a chi possiede il piano — v. `docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md`,
 *  Task 3 (e, se ancora presente, `.superpowers/sdd/task-3-report.md` §2, NON
 *  tracciato da git) — e NON corretto qui: cambiare l'insieme dei campi qui è
 *  una decisione sul confine di "sostanziale" che tocca anche i Task 4-9 che
 *  consumano questa impronta. */
export interface DatiSostanzialiDpa {
  lab: Pick<Laboratorio, 'ragione_sociale' | 'nome' | 'partita_iva' | 'codice_fiscale' | 'indirizzo' | 'cap' | 'citta' | 'provincia' | 'prrc_nome' | 'codice_itca'>
  cliente: Pick<Cliente, 'studio_nome' | 'nome' | 'cognome' | 'partita_iva' | 'codice_fiscale' | 'indirizzo' | 'cap' | 'citta' | 'provincia'>
}

export function datiSostanzialiDpa(lab: Laboratorio, cliente: Cliente): DatiSostanzialiDpa {
  return {
    lab: {
      ragione_sociale: lab.ragione_sociale, nome: lab.nome, partita_iva: lab.partita_iva,
      codice_fiscale: lab.codice_fiscale, indirizzo: lab.indirizzo, cap: lab.cap,
      citta: lab.citta, provincia: lab.provincia, prrc_nome: lab.prrc_nome, codice_itca: lab.codice_itca,
    },
    cliente: {
      studio_nome: cliente.studio_nome, nome: cliente.nome, cognome: cliente.cognome,
      partita_iva: cliente.partita_iva, codice_fiscale: cliente.codice_fiscale,
      indirizzo: cliente.indirizzo, cap: cliente.cap, citta: cliente.citta, provincia: cliente.provincia,
    },
  }
}

export function improntaDpa(lab: Laboratorio, cliente: Cliente): string {
  return improntaPayload(datiSostanzialiDpa(lab, cliente))
}
