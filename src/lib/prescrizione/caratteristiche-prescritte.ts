// src/lib/prescrizione/caratteristiche-prescritte.ts
//
// LA VOCE 6 dell'Allegato XIII punto 1 del Reg. (UE) 2017/745 — «le
// caratteristiche specifiche del prodotto indicate nella prescrizione» —
// scritta in italiano, per una persona.
//
// 🔴 IL FATTO CHE HA GENERATO QUESTO MODULO (misurato il 07/08/2026, D295).
//    `generate-ddc.ts:166` cablava `prescrizione_caratteristiche: null`, e la
//    riga del modello è condizionale (`DdcTemplate.tsx:442-447`): la voce 6 non
//    è MAI comparsa su nessuna dichiarazione emessa. Non mancava il dato —
//    `lavori_prescrizioni.contenuto` lo porta dall'ondata B — mancava il filo.
//
// 🔑 IL DOCUMENTO LO LEGGE UNA PERSONA. `{"colore":"A3","elementi":[26]}` non è
//    una caratteristica prescritta: è un oggetto. E siccome la dichiarazione si
//    conserva dieci anni (quindici per gli impiantabili) e la legge un
//    ispettore, la forma da macchina non è un dettaglio estetico — è un
//    documento che non dice ciò che deve dire.
//
// 🛑 IL VOCABOLARIO NON SI INVENTA QUI: è quello che l'utente vede GIÀ nella
//    carta «La prescrizione» del wizard (`FrameFatto.tsx:394-407`), cioè
//    «Elementi: denti 26, 27» e «Colore: A3». `etichettaDenti` viveva lì ed è
//    stata SPOSTATA qui — non ricopiata: ora ha due lettori (la carta e il
//    documento) e due copie diverge­rebbero alla prima revisione, con il
//    risultato che la schermata direbbe una cosa e la carta legale un'altra.

import type { PrescrizioneContenuto } from '@/types/domain'

/** Fra una caratteristica e l'altra. Punto mediano: separa senza sembrare una
 *  sottrazione (il trattino, su un foglio che porta anche codici colore come
 *  «A3-B2», si legge male) e senza spezzare la riga come farebbe un a capo. */
const SEPARATORE = ' · '

/** «dente 26» · «denti 26, 27, 31» — mai «1 elementi». Il singolare e il
 *  plurale sono la differenza fra una frase scritta da una persona e una
 *  scritta da un programma.
 *
 *  📌 Veniva da `FrameFatto.tsx` (wizard, carta «La prescrizione») e ci resta
 *     in uso: la stessa funzione, un posto solo. */
export function etichettaDenti(denti: number[]): string {
  return `${denti.length === 1 ? 'dente' : 'denti'} ${denti.join(', ')}`
}

/**
 * La frase della voce 6, o `null` quando non c'è NIENTE di prescritto da
 * riportare.
 *
 * 🔑 `null` NON è un errore, ed è il motivo per cui questa funzione non lancia
 *    e non ripiega su un testo di comodo: la voce 6 dice «indicate NELLA
 *    PRESCRIZIONE», quindi un lavoro senza prescrizione digitale non ha nulla
 *    da dichiarare lì, e il campo resta vuoto LEGITTIMAMENTE. Scriverci
 *    «nessuna caratteristica» sarebbe affermare che il medico non ne ha
 *    indicate — cosa che il laboratorio non sa.
 *    ⚠️ Il caso DIVERSO — la prescrizione c'è e le caratteristiche no — non si
 *    distingue da qui (qui arriva solo il contenuto): lo separa `precheckMDR`,
 *    che vede se la riga esiste, e lo dice con un avviso non bloccante.
 *
 * 🛑 IL COLORE RESTA COME DIGITATO (D210): niente `trim`, niente maiuscole. È
 *    il testo del medico, non un valore di catalogo — su un documento a valore
 *    legale «a3,5 » non si raddrizza in «A3.5», perché quella sarebbe una
 *    caratteristica che nessuno ha prescritto.
 *
 * 🛑 `tipo` NON ENTRA, ed è una scelta, non una dimenticanza: D213 dice che
 *    entra nello snapshot SOLO alla conferma di consegna, copiato da
 *    `lavori.tipo_dispositivo` — è quindi ciò che il laboratorio HA FATTO, non
 *    ciò che il medico ha PRESCRITTO. Stamparlo sotto «Caratteristiche
 *    prescritte» attribuirebbe al dentista una scelta che non è sua, e sarebbe
 *    comunque il doppione del §5 «Tipo dispositivo».
 */
export function caratteristichePrescritte(
  contenuto: PrescrizioneContenuto | null | undefined
): string | null {
  if (!contenuto) return null

  const pezzi: string[] = []

  // Le guardie a runtime restano anche se il tipo le promette: qui arriva un
  // `contenuto` che ha attraversato `normalizzaPrescrizione`, ma la funzione è
  // pura e pubblica — e ciò che finisce su una carta legale non si fida di una
  // promessa di compilazione.
  const elementi = contenuto.elementi
  if (Array.isArray(elementi) && elementi.length > 0) {
    pezzi.push(`Elementi: ${etichettaDenti(elementi)}`)
  }

  // Stessa regola di vuoto di `componiSnapshot` (`componi-snapshot.ts:41`): la
  // stringa VUOTA non è la trascrizione di niente. «Solo spazi» invece SI
  // preserva — giudicarlo vuoto richiederebbe il trim, che D210 vieta.
  const colore = contenuto.colore
  if (typeof colore === 'string' && colore !== '') {
    pezzi.push(`Colore: ${colore}`)
  }

  return pezzi.length > 0 ? pezzi.join(SEPARATORE) : null
}
