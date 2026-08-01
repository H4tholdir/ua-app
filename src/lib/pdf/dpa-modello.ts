// src/lib/pdf/dpa-modello.ts

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
