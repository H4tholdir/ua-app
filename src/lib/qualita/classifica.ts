// src/lib/qualita/classifica.ts
//
// Il motore che, dai fatti di un evento (`eventi_qualita`), PROPONE una
// classificazione (spec §6). Funzione pura, senza database: chi conferma
// resta un giudizio umano — «l'app propone, una persona conferma» (§6).
//
// 🛑 D276 (06/08/2026) — NESSUN MOTIVO SALTA LA FILA. Il test dell'incidente
// (①) sta SEMPRE prima delle esenzioni (①-bis), qualunque sia `natura`. Un
// piano precedente faceva uscire prima i tre motivi «non è un problema del
// dispositivo»: un evento marcato «richiesta clinica nuova» sarebbe uscito
// con «nessuna azione» ANCHE con un danno accertato su una persona, e
// l'obbligo di segnalazione sarebbe sparito. Vedi spec §6, riquadro D276.

import type {
  Natura,
  OrigineInformazione,
  StatoDispositivo,
  PotenzialeDiDanno,
  Esito,
} from '@/lib/domain/qualita-costanti'

export interface FattiEvento {
  natura: Natura
  origine: OrigineInformazione
  statoDispositivo: StatoDispositivo
  potenzialeDiDanno: PotenzialeDiDanno
}

export interface Proposta {
  esito: Esito
  perche: string
  ramoIso: '8.3.2' | '8.3.3' | null
  termineOre: number | null
}

export function classifica(f: FattiEvento): Proposta {
  // 🛑 D276 — NESSUN MOTIVO SALTA LA FILA. Il test dell'incidente sta PRIMA di ogni
  // esenzione: qui c'era l'uscita anticipata dei tre motivi «non è un problema del
  // dispositivo», e faceva sparire un danno accertato dietro un «nessuna azione».
  // ① IL TEST DELL'INCIDENTE VIENE PRIMA — invertirlo nasconde l'obbligo dell'Art. 88 (D268)
  if (f.potenzialeDiDanno !== 'nessuno') {
    if (f.potenzialeDiDanno === 'accertato')
      return { esito: 'incidente_grave', perche: 'Ci sono state conseguenze accertate sulla salute: va valutata la segnalazione all\'autorità.', ramoIso: '8.3.3', termineOre: 15 * 24 }
    return { esito: 'incidente', perche: 'C\'è un potenziale di danno da valutare: prima di parlare di reclamo va escluso l\'incidente.', ramoIso: '8.3.3', termineOre: null }
  }

  // ①-bis — SOLO ORA le esenzioni (D276): non sono problemi del dispositivo, quindi
  // non entrano nei conteggi del rapporto periodico (D273). Ma ci si arriva solo dopo
  // che l'incidente è stato escluso, mai prima.
  if (f.natura === 'nuova_esigenza_clinica')
    return { esito: 'nessuna_azione', perche: 'Il medico chiede una cosa nuova: il dispositivo era conforme alla prescrizione con cui è stato fatto. Serve una prescrizione nuova, non una correzione.', ramoIso: null, termineOre: null }
  if (f.natura === 'commerciale' || f.natura === 'errore_registrazione')
    return { esito: 'nessuna_azione', perche: 'Non tocca il dispositivo né il documento sanitario.', ramoIso: null, termineOre: null }

  // ② e ③ — coinvolgimento, poi conseguenze (che qui sono già escluse)
  const uscito = f.statoDispositivo !== 'mai_uscito_dal_lab'
  if (uscito && f.origine !== 'laboratorio_interno')
    return { esito: 'reclamo', perche: 'Il dispositivo aveva lasciato il laboratorio e la segnalazione arriva da fuori: per la norma è un reclamo, anche se non è ancora stato applicato.', ramoIso: '8.3.3', termineOre: null }

  return { esito: 'non_conformita_interna', perche: uscito
    ? 'Ce ne siamo accorti noi, a dispositivo già uscito.'
    : 'Ce ne siamo accorti noi, prima che uscisse.', ramoIso: uscito ? '8.3.3' : '8.3.2', termineOre: null }
}
