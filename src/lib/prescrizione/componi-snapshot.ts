// componiSnapshot — compone il jsonb `p_prescrizione` per `lavoro_crea_atomico`
// (ondata B ②, spec V2/V3). Funzione PURA: il client manda dati grezzi, è il
// server che compone lo snapshot — il client non manda MAI testo MDR composto.
//
// La semantica dello snapshot, ed è vincolante:
// - chiave presente in `contenuto` = caratteristica TRASCRITTA dalla
//   prescrizione; l'assenza è un'informazione (V2) — MAI `colore: null`.
// - il colore resta COME DIGITATO (D210): nessun trim, nessun uppercase.
//   La fedeltà è il punto — è il testo del medico, non un valore di catalogo.
//   Unica eccezione: la stringa VUOTA, che non è una trascrizione di niente
//   («solo spazi» invece si preserva: giudicarlo vuoto richiederebbe il trim).
// - `elementi` = SOLO i denti con provenienza 'prescritto' (W20; il default
//   di `validaDenti` è 'prescritto'), nell'ordine d'ingresso.
// - `tipo` NON entra mai qui: entra SOLO alla conferma di consegna (D213).
// - ritorno `null` = NIENTE di prescritto → il chiamante OMETTE p_prescrizione
//   dalla chiamata RPC (M-T3-2: un jsonb 'null' NON è SQL NULL, e la RPC
//   inserirebbe una riga fantasma). `contenuto: {}` con numero presente è
//   invece una riga LEGITTIMA (M-T3-3): i due casi non si confondono.

export interface PrescrizioneInput {
  /** Testo del colore COME DIGITATO dall'addetta (D210) — mai normalizzato qui. */
  colore?: string
  /** ⚖️ D319 (08/08/2026) — QUESTA CHIAVE NON ALIMENTA PIÙ NESSUN DOCUMENTO.
   *  Il numero della prescrizione non è un contenuto dovuto dall'Allegato XIII
   *  punto 1 (che sulla prescrizione chiede il NOME di chi ha prescritto e le
   *  CARATTERISTICHE indicate nella prescrizione): è uscito dalla dichiarazione
   *  e dalle voci correggibili. Ciò che serviva davvero — ritrovare il foglio di
   *  carta del dentista — è il mestiere di `fonte_tipo`/`fonte_riferimento`.
   *
   *  🛑 RESTA ACCETTATA, e non è una svista: `POST /api/lavori` la valida e la
   *  scrive ancora su `lavori_prescrizioni` (`api/lavori/route.ts:234-240`), e
   *  il clone del rifacimento la propaga. Toglierla è un cambiamento di
   *  contratto pubblico, cioè una decisione a sé — RIFERITA (R-E2), non presa
   *  di nascosto dentro il compito che ha tolto il numero dal documento.
   *  ⚠️ Il wizard non la manda: non ha la casella, e da D319 non l'avrà. */
  numero_prescrizione?: string
}

export interface DentiInput {
  fdi: number
  provenienza?: string
}

export function componiSnapshot(
  denti: DentiInput[],
  p?: PrescrizioneInput
): { contenuto: Record<string, unknown>; numero_prescrizione: string | null } | null {
  const elementi = denti
    .filter((d) => (d.provenienza ?? 'prescritto') === 'prescritto')
    .map((d) => d.fdi)

  const contenuto: Record<string, unknown> = {}
  if (elementi.length > 0) contenuto.elementi = elementi
  if (p?.colore !== undefined && p.colore !== '') contenuto.colore = p.colore

  const numero =
    p?.numero_prescrizione !== undefined && p.numero_prescrizione !== ''
      ? p.numero_prescrizione
      : null

  // Niente di trascritto e nessun numero: NESSUNA riga (V2), non una vuota.
  if (Object.keys(contenuto).length === 0 && numero === null) return null

  return { contenuto, numero_prescrizione: numero }
}
