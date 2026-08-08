'use client'

// src/components/features/lavori/scheda-v3/DevoIntervenire.tsx
//
// Task 6 dell'ondata «si deve sempre poter intervenire».
// Mockup APPROVATO: docs/design/mockups/2026-08-07-devo-intervenire.html
// Verbale: D269 · D283 · D288 · D300-D303.
//
// 🔑 LA FORMA, e ogni pezzo ha la sua decisione dietro:
//   ① una RIGA sulla scheda, sempre presente su un lavoro consegnato — non per
//      dieci minuti (D269: la finestra è abolita);
//   ② la DOMANDA D'INGRESSO, parole di Francesco (D288): «vuoi reintervenire
//      sul lavoro o hai premuto questo tasto per sbaglio?». L'uscita **non
//      salva niente**;
//   ③ i nove motivi RAGGRUPPATI in cinque famiglie (D300);
//   ④ per otto motivi su nove, le quattro caselle della spec §5;
//   ⑤ la proposta **col suo perché** e un tasto per cambiarla (D267).
//
// 🛑 DUE «PER SBAGLIO» DIVERSI, e confonderli costerebbe: «hai premuto QUESTO
//    TASTO per sbaglio» è l'uscita del dialogo d'ingresso e **non salva
//    niente**; «ho sbagliato a premere CONSEGNA» è uno dei nove motivi e
//    **ripristina tutto**. Sono nominati diversamente apposta.
//
// 🛑 E IL PERCORSO CORTO CHIEDE, NON AFFERMA — Task A dell'atto unico
//    (08/08/2026, `docs/superpowers/plans/2026-08-08-correzione-e-riemissione-
//    atto-unico.md`). Fino a quel giorno `stato_dispositivo` era **cablato** a
//    `mai_uscito_dal_lab` su quel ramo: l'app dichiarava al posto della persona
//    che il manufatto non era mai uscito di qui. Su un manufatto uscito davvero
//    è una dichiarazione falsa — e quel motivo **annulla** il documento (D293 ·
//    Art. 21(2) MDR). Era anche la strada più CORTA per correggere un refuso,
//    cioè quella che le persone prendono.
//    ➡️ Adesso la stessa finestra — nessun tocco in più (D269) — pone la
//    domanda; chi risponde «sì, è uscito» non registra niente e torna
//    all'elenco con la strada scritta in cima (D262).
//
// 🛑 UN SOLO OVERLAY PER TUTTO IL PERCORSO, E NON È UNA SCELTA DI STILE: È UN
//    DIFETTO MISURATO IL 07/08 SULLO SCHERMO VERO, che quindici prove unitarie
//    verdi non avevano visto.
//    La prima stesura apriva la domanda d'ingresso come `DialogConferma` e poi,
//    sulla conferma, un `Sheet` separato. `provato:` sul browser il foglio **non
//    compariva mai** (`history.back` chiamata 1 volta, testo del foglio assente
//    a 60 ms e a 700 ms). Il motivo sta scritto in `storia-overlay.ts`: la pila
//    degli overlay tiene **una sola entry di history**, e chi esce per ultimo la
//    disfa con `history.back()`. Nello stesso commit React esegue PRIMA la
//    pulizia del dialogo (`esciOverlay` → pila vuota → `history.back()`) e POI
//    l'ingresso del foglio: il `popstate` che arriva subito dopo chiude il
//    foglio appena nato. È la famiglia di difetto che il progetto ha già pagato
//    con la navigazione dagli overlay.
//    ➡️ Il percorso vive in UN foglio solo, che cambia passo. Nessuna consegna
//    di testimone fra due overlay, quindi nessuna corsa da vincere.
//    ⚠️ Il `DialogConferma` del percorso corto resta, ma **SOPRA il foglio che
//    resta aperto** — ed è il caso che il modulo sostiene per costruzione
//    («finché sotto resta anche un solo overlay aperto, l'entry resta»).
//
// ⚖️ D301/D303 — qui parla il BANCO: si dice «manufatto». «Dispositivo» è la
//    parola della norma e arriva dal server, dentro il `perche` della proposta.

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ds/Sheet'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { ChipScelta } from '@/components/ds/ChipScelta'
import { CampoTesto } from '@/components/ds/Campo'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { useAvvisi } from '@/components/ds/Avviso'
import { useNavigaDaOverlay } from '@/components/ds/useNavigaDaOverlay'
import { OdontogrammaFDI } from '@/components/features/odontogramma/OdontogrammaFDI'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'
// 🔑 L'ELENCO DELLE VOCI CORREGGIBILI NON SI RICOPIA QUI: è quello del
//    contratto (`CAMPI_CORREGGIBILI_DOCUMENTO`). È sceso due volte in un giorno
//    — otto → sette (D319) → sei (D320) — e tutt'e due le volte un commento
//    vicino al codice è rimasto indietro. Le righe a schermo si generano da
//    lì, e `Record<CampoCorreggibile, …>` fa protestare `tsc` il giorno in cui
//    un nome entra o esce senza la sua riga.
import { CAMPI_CORREGGIBILI_DOCUMENTO, type CampoCorreggibile } from '@/lib/dichiarazione/correzioni'
import type { DenteNormalizzato } from '@/lib/domain/denti-validazione'
import { LABEL_MACRO, MACRO_SLUGS } from '@/lib/domain/tipi-lavoro'
import { nomePrescrittore } from '@/lib/consegna/prescrittore'
import { caratteristichePrescritte } from '@/lib/prescrizione/caratteristiche-prescritte'
import { testoVivo } from '@/lib/utils/testo'
import type { LavoroDettaglio, PrescrizioneContenuto, TipoDispositivo } from '@/types/domain'
import {
  ORIGINI_INFORMAZIONE,
  STATI_DISPOSITIVO,
  POTENZIALI_DI_DANNO,
} from '@/lib/domain/qualita-costanti'
import type {
  Motivo,
  OrigineInformazione,
  StatoDispositivo,
  PotenzialeDiDanno,
  Esito,
} from '@/lib/domain/qualita-costanti'
import {
  FAMIGLIE, MOTIVI_UI, motiviDellaFamiglia,
  DOMANDE, ORIGINE_UI, STATO_UI, DANNO_UI, ESITO_UI,
} from '@/lib/qualita/motivi-ui'
// 🔄 `effettoDaMotivo` NON SI IMPORTA PIÙ: era la fonte del testo del
//    `DialogConferma` del percorso corto, che ora porta la DOMANDA del Task A e
//    non più la descrizione dell'effetto. Il `perche` di quel motivo resta vivo
//    dov'era già: arriva dal server dentro `risposta.effetto.perche`, e si legge
//    sulla schermata d'esito.
import type { AzioneAutomatica } from '@/lib/qualita/effetti'

/** Le fasi del percorso. `chiuso` è lo stato a riposo: la riga sulla scheda.
 *
 *  🔄 `confermaSbaglio` SI CHIAMAVA COSÌ, e il nome è cambiato col Task A: quel
 *  passo non conferma più niente, **chiede**. Un nome che dice «conferma» sopra
 *  una domanda è il primo passo perché qualcuno la riscriva come conferma. */
type Fase =
  | 'chiuso' | 'domanda' | 'motivo' | 'domandaUscito'
  // ⚖️ D322, VARIANTE A — la correzione viene PRIMA delle quattro caselle di
  //    legge: `motivo → correzione → correzioneCampo* → dettagli → proposta`.
  //    🛑 E resta UN FOGLIO SOLO che cambia passo: mai un secondo overlay — la
  //    pila di `storia-overlay.ts` è già stata pagata una volta con un tasto
  //    «indietro» morto (v. il riquadro in testa al file).
  | 'correzione' | 'correzioneCampo'
  | 'dettagli' | 'proposta' | 'esito'

/** Il titolo del foglio cambia col passo: è UN foglio solo, e il titolo è la
 *  sola cosa che dice a che punto si è.
 *
 *  ⚠️ `correzioneCampo` è l'unico passo il cui titolo NON sta qui: dipende da
 *  quale delle sei voci si sta correggendo, e vive in `TITOLI_VOCE`. */
const TITOLI: Record<Fase, string> = {
  chiuso: '',
  domanda: 'Vuoi intervenire su questo lavoro?',
  motivo: 'Che cos\'è successo?',
  domandaUscito: 'Che cos\'è successo?',
  correzione: 'Che cosa c\'è di sbagliato?',
  correzioneCampo: '',
  dettagli: 'Qualche dettaglio',
  proposta: 'Ecco cosa ne penso',
  esito: 'Fatto',
}

// ══════════════════════════════════════════════════════════════════════════
//  LE SEI VOCI STAMPATE — Task D, «correggi e rifai la dichiarazione»
// ══════════════════════════════════════════════════════════════════════════

/** L'etichetta della riga a schermo. `Record<CampoCorreggibile, …>`: una voce
 *  senza etichetta non compila. */
const ETICHETTE_VOCE: Record<CampoCorreggibile, string> = {
  richiedente_nome: 'Chi ha prescritto',
  paziente_id: 'Paziente',
  tipo_dispositivo: 'Tipo di dispositivo',
  descrizione: 'Descrizione',
  denti_coinvolti: 'Denti',
  prescrizione_caratteristiche: 'Caratteristiche prescritte',
}

/** Il titolo del sotto-passo. Non è sempre l'etichetta: sul paziente si chiede
 *  **quale persona**, e la domanda lo deve dire (⚖️ D320). */
const TITOLI_VOCE: Record<CampoCorreggibile, string> = {
  richiedente_nome: 'Chi ha prescritto',
  paziente_id: 'Quale paziente?',
  tipo_dispositivo: 'Tipo di dispositivo',
  descrizione: 'Descrizione',
  denti_coinvolti: 'Denti',
  prescrizione_caratteristiche: 'Caratteristiche prescritte',
}

/**
 * 🔴 IL PEZZO CHE NESSUNO PASSAVA AL FOGLIO, e senza il quale il passo di
 * correzione non può esistere: **i valori stampati e il gettone di
 * concorrenza**.
 *
 * 🔑 PERCHÉ UN OGGETTO SOLO, COSTRUITO DA UNA FUNZIONE SOLA. Il contratto della
 * rotta è «*i valori che hai visto sono ancora quelli*», non «la riga non è
 * cambiata negli ultimi 200 ms»: valore mostrato e `updated_at` devono venire
 * dalla **stessa lettura**. Passandoli come sei proprietà sciolte, un domani
 * qualcuno ne rinfrescherebbe una sola. Qui la firma lo impedisce: si entra con
 * UN `lavoro` e si esce con tutto, gettone compreso.
 *
 * 🛑 `updatedAt` VIAGGIA COSÌ COM'È, sempre. Mai un `new Date(...)`, mai un
 * `.toISOString()` di ritorno: `timestamptz` ha i microsecondi, `Date` di JS no
 * — un solo riparsing tronca `.123456` a `.123`, il confronto non torna mai
 * uguale, e il risultato è un **409 permanente che nemmeno ricaricando si
 * sana** (stesso modello di `ModificaColoreSheet`, `…/denti:88-93`).
 */
export interface VociDocumento {
  /** Il gettone di concorrenza — `lavori.updated_at`, stringa opaca. */
  updatedAt: string
  /** Serve alla ricerca dei pazienti: `GET /api/pazienti` pretende lo studio. */
  clienteId: string | null
  /** La colonna. `null` quando il documento ripiega sul nome del dentista. */
  richiedenteNome: string | null
  /** Il nome che il documento STAMPA oggi, ripiego compreso (`generate-ddc:266-274`). */
  prescrittoreMostrato: string
  pazienteId: string | null
  /** Come il documento identifica il paziente oggi (`generate-ddc:304`). */
  pazienteMostrato: string
  tipoDispositivo: TipoDispositivo
  descrizione: string
  /** Le RIGHE vere dei denti, coi loro colori. `null` = l'embed non è stato
   *  chiesto, e allora quella voce non si corregge: mandare `{fdi, ruolo}` e
   *  basta cancellerebbe scala e codice di ogni dente che resta. */
  denti: DenteNormalizzato[] | null
  /** La colonna denormalizzata, cioè ciò che il documento stampa alla voce
   *  «Denti» (solo gli elementi). */
  dentiMostrati: string[]
  /** Il contenuto della prescrizione trascritta. `null` = non c'è, e la voce
   *  non si corregge (la rotta risponderebbe 422 dopo aver reso il PDF). */
  prescrizione: PrescrizioneContenuto | null
}

/** Compone le sei voci e il gettone **da una lettura sola** del lavoro. */
export function vociDelDocumento(lavoro: LavoroDettaglio): VociDocumento {
  return {
    updatedAt: lavoro.updated_at,
    clienteId: lavoro.cliente_id ?? null,
    richiedenteNome: lavoro.richiedente_nome,
    prescrittoreMostrato:
      nomePrescrittore(lavoro.richiedente_nome, `${lavoro.cliente?.cognome ?? ''} ${lavoro.cliente?.nome ?? ''}`) ?? '—',
    pazienteId: lavoro.paziente_id ?? null,
    pazienteMostrato:
      lavoro.paziente_nome_snapshot ?? lavoro.paziente?.nome_cognome ?? lavoro.paziente?.codice_paziente ?? '—',
    tipoDispositivo: lavoro.tipo_dispositivo,
    descrizione: lavoro.descrizione,
    denti: lavoro.denti
      ? lavoro.denti.map((d) => ({
          fdi: d.fdi, ruolo: d.ruolo, scala: d.scala, codice: d.codice,
          codice_collo: d.codice_collo, codice_corpo: d.codice_corpo,
          codice_incisale: d.codice_incisale, provenienza: d.provenienza,
        }))
      : null,
    dentiMostrati: lavoro.denti_coinvolti ?? [],
    prescrizione: lavoro.prescrizione?.contenuto ?? null,
  }
}

/** Una voce corretta: il carico da spedire e come si legge a schermo. */
interface VoceCorretta {
  /** La forma che il contratto vuole — 🔴 per i denti sono OGGETTI. */
  valore: unknown
  /** Come si legge nella riga «vecchio → nuovo». */
  mostrato: string
}

type Correzioni = Partial<Record<CampoCorreggibile, VoceCorretta>>

/** Il valore che il DOCUMENTO stampa oggi per quella voce. */
function valoreDiAdesso(voci: VociDocumento, campo: CampoCorreggibile): string {
  switch (campo) {
    case 'richiedente_nome': return voci.prescrittoreMostrato
    case 'paziente_id': return voci.pazienteMostrato
    case 'tipo_dispositivo': return LABEL_MACRO[voci.tipoDispositivo] ?? voci.tipoDispositivo
    case 'descrizione': return voci.descrizione
    case 'denti_coinvolti': return voci.dentiMostrati.length > 0 ? voci.dentiMostrati.join(', ') : '—'
    case 'prescrizione_caratteristiche': return caratteristichePrescritte(voci.prescrizione) ?? '—'
  }
}

/**
 * Le voci che da questo foglio NON si possono toccare, con la ragione già
 * scritta: si dice **prima**, non si scopre con un 422 dopo che il PDF è stato
 * reso e il progressivo bruciato.
 */
function perchePrecluso(voci: VociDocumento, campo: CampoCorreggibile): string | null {
  if (campo === 'denti_coinvolti' && voci.denti === null) {
    return 'I denti di questo lavoro non sono stati caricati: da qui non si correggono.'
  }
  if (campo === 'prescrizione_caratteristiche' && voci.prescrizione === null) {
    return 'Questo lavoro non ha una prescrizione trascritta: non c\'è niente da correggere qui.'
  }
  if (campo === 'paziente_id' && !voci.clienteId) {
    return 'Senza lo studio non si può cercare un\'altra persona.'
  }
  return null
}

/** I ruoli che l'odontogramma non sa mostrare. Si CONSERVANO com'erano:
 *  toglierli sarebbe cancellare un dato che nessuno ha chiesto di cambiare. */
const RUOLI_FUORI_ODONTOGRAMMA = ['escluso', 'incollato']

/**
 * Ricompone l'elenco dei denti nella forma della PENNA a partire dai tre
 * elenchi dell'odontogramma.
 *
 * 🔴 IL DENTE CHE RESTA PORTA CON SÉ IL SUO COLORE. La correzione SOSTITUISCE
 * l'elenco intero (`lavoro_denti_sostituisci_atomica`): mandare `{fdi, ruolo}`
 * e basta cancellerebbe scala, codice e le tre zone del ceramista su ogni dente
 * rimasto — un dato perso in silenzio, che è la famiglia di difetto che questo
 * progetto ha già pagato.
 */
function ricomponiDenti(
  originali: DenteNormalizzato[],
  selezionati: number[],
  mancanti: number[],
  impianti: number[]
): DenteNormalizzato[] {
  const perFdi = new Map(originali.map((d) => [d.fdi, d]))
  const messi = new Set<number>()
  const nuovi: DenteNormalizzato[] = []

  function aggiungi(fdi: number, ruolo: string) {
    // 🛑 `validaDenti` rifiuta un `fdi` ripetuto («la lista è un insieme»): un
    //    dente non può stare in due elenchi, e questa guardia è ciò che lo
    //    garantisce anche se l'odontogramma cambiasse idea.
    if (messi.has(fdi)) return
    messi.add(fdi)
    const vecchio = perFdi.get(fdi)
    nuovi.push(
      vecchio
        ? { ...vecchio, ruolo }
        : {
            fdi, ruolo, scala: null, codice: null, codice_collo: null,
            codice_corpo: null, codice_incisale: null, provenienza: 'prescritto',
          }
    )
  }

  for (const f of selezionati) aggiungi(f, 'elemento')
  for (const f of mancanti) aggiungi(f, 'mancante')
  for (const f of impianti) aggiungi(f, 'impianto')
  for (const d of originali) {
    if (!messi.has(d.fdi) && RUOLI_FUORI_ODONTOGRAMMA.includes(d.ruolo)) {
      messi.add(d.fdi)
      nuovi.push(d)
    }
  }

  return nuovi.sort((a, b) => a.fdi - b.fdi)
}

/**
 * Il messaggio che la rotta ha scritto, o quello di casa se il corpo è
 * illeggibile. 🛑 Non si sostituisce mai un messaggio del server con un
 * «qualcosa è andato storto»: quello del server dice **che cosa fare**.
 */
async function messaggioDiErrore(res: Response, difetto: string): Promise<string> {
  try {
    const b = (await res.json()) as { error?: unknown }
    if (typeof b.error === 'string' && b.error.length > 0) return b.error
  } catch { /* corpo illeggibile: resta il messaggio di casa */ }
  return difetto
}

/**
 * Come sopra, ma raccoglie anche il GETTONE che la rotta manda insieme
 * all'errore (⚖️ D323).
 *
 * 🛑 IL CORPO SI LEGGE UNA VOLTA SOLA, ed è la ragione per cui questa funzione
 * esiste invece di due chiamate in fila: `Response.json()` consuma il flusso,
 * e una seconda lettura lancerebbe. Chiamare `messaggioDiErrore` e poi cercare
 * `updated_at` sarebbe un difetto che si vede solo a runtime.
 */
async function esitoDiErrore(
  res: Response,
  difetto: string
): Promise<{ messaggio: string; updatedAt: string | null }> {
  try {
    const b = (await res.json()) as { error?: unknown; updated_at?: unknown }
    return {
      messaggio: typeof b.error === 'string' && b.error.length > 0 ? b.error : difetto,
      // 🛑 COSÌ COM'È: mai un `new Date(...)`. V. il riquadro su `VociDocumento`.
      updatedAt: typeof b.updated_at === 'string' && b.updated_at.length > 0 ? b.updated_at : null,
    }
  } catch {
    return { messaggio: difetto, updatedAt: null }
  }
}

/** Due elenchi di denti sono lo stesso elenco? Serve a rispondere alla domanda
 *  «*è ancora una correzione, se l'ho rimessa com'era?*» — no. */
function stessiDenti(a: DenteNormalizzato[], b: DenteNormalizzato[]): boolean {
  const canonico = (l: DenteNormalizzato[]) =>
    JSON.stringify([...l].sort((x, y) => x.fdi - y.fdi).map((d) => [
      d.fdi, d.ruolo, d.scala, d.codice, d.codice_collo, d.codice_corpo, d.codice_incisale, d.provenienza,
    ]))
  return canonico(a) === canonico(b)
}

interface Proposta {
  esito: Esito
  perche: string
  ramoIso: string | null
  termineOre: number | null
}

/**
 * 🔄 SI CHIAMAVA `Riapertura`, ed è stata rinominata col Task 7 insieme al campo
 * della risposta: da questo canale passano ora anche il ritorno «col documento
 * intatto» e la **creazione** di un lavoro nuovo. Chiamare «riapertura» un atto
 * che crea sarebbe un testo falso.
 *
 * ⚠️ **I RIQUADRI CHE LO DISEGNANO SONO ANCORA QUELLI DELLA SOLA RIAPERTURA**
 * (`:492-513` prima di questa modifica): dicono «il lavoro è tornato fra i
 * pronti», che su un rifacimento è **falso**, e non mostrano né
 * `dichiarazione_viva` né `lavoro_nuovo`. Generalizzare il disegno e scrivere i
 * sei testi (tre stati × due azioni nuove) è il **Task 9**, non questo: qui il
 * rinominare si porta a termine e il resto si **dichiara**, invece di farlo a
 * metà di nascosto.
 */
interface EsitoAzione {
  stato: 'applicato' | 'non_applicabile' | 'fallito'
  dichiarazione_assente?: boolean
  dichiarazione_viva?: boolean
  lavoro_nuovo?: { id: string; numero_lavoro: string }
  motivo?: string
  messaggio?: string
}

interface RispostaEvento {
  evento: { id: string }
  proposta: Proposta
  /** 🔑 `azione` è STRETTA all'unione vera, non `string` (spec §4.3, e la revisione
   *  del Task 7 lo aveva riferito come Minore). Serve a questo file: i riquadri
   *  d'esito si scelgono confrontandola, e con `string` un refuso — `'torna_pronta'`
   *  — sarebbe un ramo che non si accende mai, in silenzio. */
  effetto: { lavoro: string; documento: string; azione: AzioneAutomatica | null; perche: string }
  esito_azione?: EsitoAzione
}

const TINTE = {
  rossa: { bg: 'var(--red-tint)', ink: 'var(--red)' },
  blu: { bg: 'var(--blue-tint)', ink: 'var(--blue)' },
  viola: { bg: 'var(--purple-tint)', ink: 'var(--purple)' },
  ambra: { bg: 'var(--amber-tint)', ink: 'var(--amber)' },
  verde: { bg: 'var(--green-tint)', ink: 'var(--green)' },
} as const

/** Adesso, nella forma che il campo `datetime-local` sa mostrare.
 *
 *  ⚠️ La rotta legge questo momento sull'orologio di **Roma** (D286), non su
 *  quello del processo: qui si manda il valore locale del telefono e la
 *  conversione la fa il server, in un posto solo. */
function adessoLocale(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function DevoIntervenire(props: {
  lavoroId: string
  descrizione: string
  /** 🔑 OBBLIGATORIA, non facoltativa: senza, il passo di correzione non
   *  potrebbe mostrare nessun valore — e una proprietà facoltativa si dimentica
   *  in silenzio, mentre questa la pretende `tsc` a ogni chiamante. */
  documento: VociDocumento
}) {
  const { lavoroId, descrizione, documento: voci } = props
  const router = useRouter()
  const navigaDaOverlay = useNavigaDaOverlay()
  const { errore } = useAvvisi()

  const [fase, setFase] = useState<Fase>('chiuso')
  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [motivoLibero, setMotivoLibero] = useState('')
  const [origine, setOrigine] = useState<OrigineInformazione>('laboratorio_interno')
  const [conosciuto, setConosciuto] = useState(adessoLocale())
  const [statoDisp, setStatoDisp] = useState<StatoDispositivo>('consegnato_non_applicato')
  // 🛑 Spec §5 — «da valutare» è il valore d'apertura, e «no» NON è il percorso
  //    più rapido: le quattro pastiglie hanno lo stesso peso. Un default
  //    «nessuno» sarebbe un generatore silenzioso di sotto-classificazione,
  //    contro l'Art. 87(7).
  const [danno, setDanno] = useState<PotenzialeDiDanno>('da_valutare')
  const [risposta, setRisposta] = useState<RispostaEvento | null>(null)
  const [esitoScelto, setEsitoScelto] = useState<Esito | null>(null)
  const [cambiando, setCambiando] = useState(false)
  const [lavorando, setLavorando] = useState(false)
  const [confermata, setConfermata] = useState(false)
  const [daRinfrescare, setDaRinfrescare] = useState(false)
  /** La persona ha risposto «sì, è uscito» alla domanda del percorso corto:
   *  l'elenco dei motivi le mostra in cima la strada giusta (D262). */
  const [uscitoDichiarato, setUscitoDichiarato] = useState(false)

  // ── Task D: il passo di correzione (⚖️ D322) ───────────────────────────────
  const [correzioni, setCorrezioni] = useState<Correzioni>({})
  const [voceAperta, setVoceAperta] = useState<CampoCorreggibile | null>(null)
  /** 🛑 IL 409 CHIUDE IL TASTO, e non è pignoleria: la rotta rende e CARICA il
   *  PDF **prima** della transazione (suo commento: un conflitto «*lascia
   *  dietro di sé un file orfano e un numero bruciato*»). Col gettone stantìo
   *  ogni tocco in più brucia un altro progressivo e non può riuscire finché
   *  il foglio non si chiude — e chiudendolo la pagina si rinfresca. */
  const [conflitto, setConflitto] = useState<string | null>(null)
  /**
   * 🔴 L'EVENTO SOPRAVVIVE AL FALLIMENTO, ed è ciò che impedisce **un evento
   * orfano per tentativo**.
   *
   * Il fatto: dal passo delle quattro caselle, dopo un fallimento, l'unica
   * uscita era chiudere il foglio — e `ricomincia()` azzerava `risposta`. Al
   * tentativo dopo, `correggiERifai` non trovava più niente e **registrava un
   * secondo evento** per lo stesso fatto: due righe nel registro di qualità che
   * raccontano una cosa sola.
   *
   * 🔑 Perché riusarlo è legittimo, e non è un'opinione: la riemissione è una
   * transazione sola (`correggiERiemettiDdC`) e un suo fallimento **non lascia
   * nessuna dichiarazione annullata da questo evento** — la porta d'idempotenza
   * della rotta (`…/riemetti:275-315`) cerca proprio quella, e non la trova.
   * L'evento invece descrive un fatto che è **davvero** accaduto: il motivo,
   * dov'era il manufatto, quando lo si è saputo. Ripeterlo sarebbe un doppione;
   * buttarlo sarebbe cancellare una registrazione dovuta.
   *
   * 🛑 E SOPRAVVIVE ANCHE ALLA CHIUSURA DEL FOGLIO, che rinfresca la pagina.
   * Regge su due fatti, non su una speranza: ① `errore_dato_dichiarazione` ha
   * `azione: null` e `lavoro: 'resta_consegnato'` (`effetti.ts:112-115`) e la
   * rotta **non tocca `lavori.stato`** (suo cappello, D299) — quindi dopo il
   * rinfresco il lavoro è ancora `consegnato` e questo componente è ancora
   * montato (`SchedaLavoroV3.tsx:596`); ② lo stato locale di un componente
   * client sopravvive a `router.refresh()` — è il motivo per cui
   * `SchedaLavoroV3.tsx:174-190` deve risincronizzare `lavoroLocale` a mano.
   */
  const [eventoDaRiusare, setEventoDaRiusare] = useState<RispostaEvento | null>(null)
  /** L'esito della riemissione, quando è avvenuta. */
  const [riemissione, setRiemissione] = useState<{ numero: string | null; numeroSuperato: string | null } | null>(null)

  /**
   * ⚖️ D323 — IL GETTONE VIVE QUI E AVANZA A OGNI RISPOSTA CHE NE PORTA UNO.
   *
   * 🔑 PERCHÉ NON BASTA `voci.updatedAt`: la rotta restituisce `updated_at`
   * **sul successo** e **sul 409**, col commento che dice il perché — «*senza,
   * una seconda correzione di fila troverebbe sempre un conflitto*». Fino a oggi
   * il foglio li buttava tutti e due, e la seconda correzione di fila era un
   * conflitto garantito. Il modello in casa è `ModificaColoreSheet`, che il
   * gettone lo tiene in stato e lo fa avanzare.
   *
   * 🛑 E QUELLO DEI `props` VINCE QUANDO CAMBIA, sempre: arriva da una lettura
   * fresca del server insieme ai SEI VALORI mostrati, quindi valore mostrato e
   * gettone restano della stessa lettura — che è il contratto («*i valori che
   * hai visto sono ancora quelli*»). Questo componente resta montato attraverso
   * `router.refresh()`, quindi senza questa risincronizzazione il gettone
   * locale invecchierebbe: è lo stesso motivo per cui `SchedaLavoroV3` deve
   * risincronizzare `lavoroLocale` a mano.
   *
   * ⚠️ Il valore raccolto dal corpo di un 409 NON riapre il tasto da solo: resta
   * `conflitto`, e la via è «Ricarica e riprendi», che rinfresca la pagina e
   * porta valori **e** gettone nuovi. Adottarlo e basta vorrebbe dire ripremere
   * su sei valori che qualcun altro ha cambiato e che la persona non ha visto.
   *
   * 📌 LA FORMA È QUELLA GIÀ IN CASA: «adjusting state while rendering», lo
   * stesso schema con cui `SchedaLavoroV3.tsx:188-192` risincronizza
   * `lavoroLocale`. NON un `useEffect`: la regola `react-hooks/set-state-in-effect`
   * lo vieta, e aggiungerebbe un render in più a ogni montaggio.
   * https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
   */
  const [gettone, setGettone] = useState(voci.updatedAt)
  const [gettoneDeiProps, setGettoneDeiProps] = useState(voci.updatedAt)
  if (voci.updatedAt !== gettoneDeiProps) {
    setGettoneDeiProps(voci.updatedAt)
    setGettone(voci.updatedAt)
  }

  /** 🛑 IL RINFRESCO DELLA PAGINA SI FA ALLA CHIUSURA, MAI A FOGLIO APERTO —
   *  difetto MISURATO sullo schermo vero il 07/08 (FASE 9), e il giro nei dati
   *  era perfettamente riuscito mentre l'utente vedeva il foglio sparire.
   *  `router.refresh()` fa rirendere il Server Component: la scheda si ricostruisce
   *  e con lei questo componente, che perde lo stato locale — cioè il passo a cui
   *  si era arrivati. Chiamandolo dentro `registra()` la schermata finale non
   *  compariva MAI: la registrazione era salva, la valutazione depositata, e la
   *  persona restava senza nessuna conferma a schermo. È la §8.1 vista dall'altro
   *  lato — riuscire senza dirlo. */
  function ricomincia() {
    setFase('chiuso'); setMotivo(null); setMotivoLibero(''); setRisposta(null)
    setEsitoScelto(null); setCambiando(false); setConfermata(false)
    setOrigine('laboratorio_interno'); setStatoDisp('consegnato_non_applicato')
    setDanno('da_valutare'); setConosciuto(adessoLocale())
    setUscitoDichiarato(false)
    setCorrezioni({}); setVoceAperta(null); setRiemissione(null); setConflitto(null)
    // 🛑 `eventoDaRiusare` NON SI AZZERA QUI, ed è una riga assente apposta: è
    //    l'unica cosa che attraversa la chiusura del foglio. Azzerarlo insieme
    //    al resto è esattamente il difetto che si sta chiudendo — un evento
    //    orfano in più a ogni ritentativo. Lo azzera solo la riuscita.
    if (daRinfrescare) { setDaRinfrescare(false); router.refresh() }
  }

  /**
   * 🔴 «RICARICA E RIPRENDI» — e prima MENTIVA.
   *
   * Il tasto chiamava `ricomincia()`, che fa `setCorrezioni({})`: **cancellava
   * le correzioni appena digitate a mano**. Non riprendeva niente, azzerava — e
   * il costo vero di ogni conflitto era **un giro intero da ridigitare**, sulle
   * sei voci, al banco. Trovato da due advisor su tre, indipendentemente.
   *
   * 🔑 Quello che questo tasto deve fare è UNA cosa sola: rimettere la persona
   * davanti a valori FRESCHI tenendo il lavoro che ha già fatto. Quindi:
   *   · `correzioni` **restano** — è ciò che rende vero «riprendi»;
   *   · `conflitto` si spegne — o il tasto finale resta premuto a vuoto;
   *   · la pagina si rinfresca — ed è da lì che tornano i sei valori mostrati e
   *     il gettone, dalla **stessa** lettura;
   *   · `eventoDaRiusare` **resta** — la registrazione è già agli atti e
   *     rifarla sarebbe un doppione nel registro di qualità.
   *
   * 🛑 IL FOGLIO SI CHIUDE, e non è un ripiego: `router.refresh()` a foglio
   * aperto è un difetto MISURATO sullo schermo vero il 07/08 (v. il riquadro su
   * `ricomincia`). Chiudere costa tre tocchi per rientrare; ridigitare sei voci
   * ne costa molti di più.
   *
   * ⚠️ E l'altra uscita resta com'era: chiudere il foglio o rispondere «ho
   * premuto per sbaglio» passa da `ricomincia()`, che le correzioni le BUTTA.
   * È una rinuncia dichiarata, e portarsela dietro nell'intervento successivo
   * sarebbe lo stesso difetto al contrario.
   */
  function ricaricaERiprendi() {
    setConflitto(null)
    setFase('chiuso'); setMotivo(null); setMotivoLibero(''); setRisposta(null)
    setEsitoScelto(null); setCambiando(false); setConfermata(false)
    setVoceAperta(null); setRiemissione(null)
    setDaRinfrescare(false)
    router.refresh()
  }

  function scegliMotivo(m: Motivo) {
    setMotivo(m)
    // 🛑 «Ho premuto consegna per sbaglio» NON chiede le quattro caselle — la
    //    consegna non è avvenuta, quindi non c'è nessuna delle altre tre da
    //    rispondere — ma UNA la chiede: **dov'era il manufatto**. È l'unica che
    //    decide se quel motivo sia lecito, perché porta l'annullamento della
    //    dichiarazione (v. il riquadro sul `DialogConferma`).
    if (m === 'errore_registrazione') { setFase('domandaUscito'); return }
    setFase(m === 'errore_dato_dichiarazione' ? 'correzione' : 'dettagli')
  }

  /**
   * `statoDichiarato` ARRIVA DAL CHIAMANTE, e non è un dettaglio di firma.
   *
   * 🔴 Qui c'era `stato_dispositivo: sbaglio ? 'mai_uscito_dal_lab' : statoDisp`
   * — cioè, sul percorso corto, **il foglio affermava al posto della persona**
   * che il manufatto non era mai uscito dal laboratorio. Nessuno gliel'aveva
   * chiesto: la finestra che compariva era una conferma («Confermi? Il lavoro
   * torna fra i pronti»), non una domanda.
   * 🔑 Perché era grave: quel motivo riporta il lavoro fra i pronti **e annulla
   * la dichiarazione**. Su un manufatto uscito davvero è una dichiarazione
   * falsa (D293 · Art. 21(2) MDR) — ed era la strada **più corta** per
   * correggere un refuso, cioè quella che le persone prendono.
   * ➡️ Adesso il valore è la trascrizione di una risposta: il tasto che lo manda
   * dice «No, è sempre rimasto qui», e i due si leggono in una schermata sola.
   */
  async function registra(statoDichiarato: StatoDispositivo) {
    if (!motivo) return
    setLavorando(true)
    try {
      const dati = await depositaEvento(statoDichiarato)
      if (!dati) return
      accogliEvento(dati)
      // Il fatto è salvato. Sul percorso corto non c'è una proposta da
      // discutere: si mostra subito che cos'è successo.
      setFase(motivo === 'errore_registrazione' ? 'esito' : 'proposta')
    } finally {
      setLavorando(false)
    }
  }

  /**
   * La registrazione dell'evento, e **una sola composizione del suo corpo**.
   *
   * 🔑 ESTRATTA COL TASK D, e la ragione è che adesso ha DUE chiamanti: la
   * strada di sempre (`registra`) e il tocco finale della correzione
   * (`correggiERifai`), che deve depositare lo stesso evento e poi rifare la
   * carta. Ricopiare il corpo avrebbe creato due penne che divergono alla
   * prima revisione — la stessa famiglia di difetto che `motivi-ui.ts` e
   * `effetti.ts` esistono per evitare.
   */
  async function depositaEvento(statoDichiarato: StatoDispositivo): Promise<RispostaEvento | null> {
    if (!motivo) return null
    const sbaglio = motivo === 'errore_registrazione'
    const corpo: Record<string, unknown> = {
      motivo,
      origine_informazione: sbaglio ? 'laboratorio_interno' : origine,
      stato_dispositivo: statoDichiarato,
      conosciuto_il: sbaglio ? adessoLocale() : conosciuto,
    }
    // 🔑 Sul percorso corto `potenziale_di_danno` NON si manda: lo mette il
    //    database col suo default prudente. Mandare «nessuno» sarebbe
    //    affermare che non c'era pericolo — una risposta che nessuno ha dato.
    if (!sbaglio) corpo.potenziale_di_danno = danno
    if (motivo === 'altro') {
      corpo.motivo_libero = motivoLibero.trim()
      // Per «altro» la natura si CHIEDE (spec §5). Finché la schermata non la
      // chiede, si resta sul genere più prudente: nessuna esenzione.
      corpo.natura = 'difetto_fisico'
    }

    try {
      const res = await fetch(`/api/lavori/${lavoroId}/eventi-qualita`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      if (!res.ok) {
        errore(await messaggioDiErrore(res, 'Non sono riuscita a registrare: riprova fra un momento.'))
        return null
      }
      return (await res.json()) as RispostaEvento
    } catch {
      errore('Non sono riuscita a registrare: controlla la connessione e riprova.')
      return null
    }
  }

  function accogliEvento(dati: RispostaEvento) {
    setRisposta(dati)
    setEsitoScelto(dati.proposta.esito)
    setDaRinfrescare(true)
  }

  /**
   * ⚖️ D322 — IL TOCCO FINALE: **due chiamate in fila**, e la seconda non si fa
   * senza la prima.
   *
   * 🛑 L'EVENTO SI TIENE NELLO STATO E SI RIUSA. Se la riemissione fallisce e la
   * persona riprova, crearne uno nuovo lascerebbe eventi orfani in banca dati —
   * ed è anche ciò che rende utile la porta d'idempotenza della rotta, che dopo
   * un successo restituisce il successore invece di rifare tutto.
   *
   * 🛑 IL GETTONE VIAGGIA INTATTO: `voci.updatedAt` così com'è, mai riparsato.
   */
  async function correggiERifai() {
    if (!motivo) return
    setLavorando(true)
    try {
      let evento = risposta
      // 🔑 UN TENTATIVO PRECEDENTE È GIÀ COSTATO UNA REGISTRAZIONE: si riprende
      //    quella. `accogliEvento` la rimette anche nello stato vivo, perché
      //    `ricomincia()` aveva azzerato `esitoScelto` — e senza, la schermata
      //    della proposta non saprebbe più che cosa confermare.
      if (!evento && eventoDaRiusare) {
        evento = eventoDaRiusare
        accogliEvento(evento)
      }
      if (!evento) {
        evento = await depositaEvento(statoDisp)
        if (!evento) return
        accogliEvento(evento)
      }
      // 🛑 DA QUESTO ISTANTE L'EVENTO È SCRITTO IN BANCA DATI. Si mette da parte
      //    SUBITO, e non solo sul 409: qualunque esito diverso dalla riuscita
      //    (500, rete assente, corpo illeggibile) può portare la persona a
      //    chiudere il foglio, ed è lì che l'evento si perdeva.
      setEventoDaRiusare(evento)

      const carico: Record<string, unknown> = {}
      for (const [campo, voce] of Object.entries(correzioni)) carico[campo] = voce.valore

      try {
        const res = await fetch(`/api/lavori/${lavoroId}/dichiarazione/riemetti`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evento_id: evento.evento.id,
            correzioni: carico,
            // 🛑 IL GETTONE È QUELLO DELLO STATO, non `voci.updatedAt`: dopo una
            //    riemissione riuscita quello dei props è già vecchio finché la
            //    pagina non si rinfresca, e una seconda correzione di fila
            //    troverebbe un conflitto garantito (⚖️ D323).
            atteso_updated_at: gettone,
          }),
        })
        if (!res.ok) {
          // ⚖️ Passo 7 — GLI ERRORI SI LEGGONO. La rotta li scrive per chi sta
          //    al banco: il 422 nomina la casella svuotata col percorso dentro,
          //    il 409 dice che qualcuno ha toccato il lavoro. Sostituirli con
          //    «qualcosa è andato storto» butterebbe via l'unica cosa utile.
          const { messaggio, updatedAt } = await esitoDiErrore(res, 'Non sono riuscita a rifare la dichiarazione: riprova fra un momento.')
          // ⚖️ D323 — il 409 porta il gettone FRESCO: si raccoglie. Da solo non
          //    riapre il tasto (resta `conflitto`), ma è ciò che rende utile
          //    «Ricarica e riprendi» anche quando il rinfresco non porta niente
          //    di nuovo — senza, la ripresa ripartirebbe dal gettone scaduto.
          if (updatedAt) setGettone(updatedAt)
          if (res.status === 409) setConflitto(messaggio)
          errore(messaggio)
          return
        }
        const esito = (await res.json()) as { numero?: string | null; numero_superato?: string | null; updated_at?: string }
        // 🔑 IL GETTONE AVANZA: la rotta lo manda apposta, e il suo commento
        //    dice perché — «senza, una seconda correzione di fila troverebbe
        //    sempre un conflitto». La correzione ha appena scritto su `lavori`.
        if (typeof esito.updated_at === 'string' && esito.updated_at.length > 0) setGettone(esito.updated_at)
        setRiemissione({ numero: esito.numero ?? null, numeroSuperato: esito.numero_superato ?? null })
        // La carta è rifatta: quell'evento ha finito il suo lavoro e non va più
        // riusato. Il prossimo intervento è un fatto nuovo, e vuole la sua riga.
        setEventoDaRiusare(null)
        setFase('proposta')
      } catch {
        errore('Non sono riuscita a rifare la dichiarazione: controlla la connessione e riprova.')
      }
    } finally {
      setLavorando(false)
    }
  }

  async function confermaValutazione() {
    if (!risposta || !esitoScelto) return
    setLavorando(true)
    try {
      // 🔑 La giustificazione è il PERCHÉ della proposta, quando la si accetta:
      //    il vincolo di banca dati la pretende per «nessuna azione», e la
      //    frase giusta è quella che l'app ha mostrato e la persona ha
      //    confermato — non un testo inventato al momento del salvataggio.
      const giustificazione = esitoScelto === risposta.proposta.esito
        ? risposta.proposta.perche
        : `Valutazione corretta a mano. L'app proponeva: ${ESITO_UI[risposta.proposta.esito]}.`
      const res = await fetch(`/api/eventi-qualita/${risposta.evento.id}/valutazioni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ esito: esitoScelto, giustificazione }),
      })
      if (!res.ok) {
        errore('La registrazione è salva, ma la valutazione non è stata depositata: riprova.')
        return
      }
      setConfermata(true)
      setFase('esito')
      setDaRinfrescare(true)
    } catch {
      errore('La registrazione è salva, ma la valutazione non è stata depositata: riprova.')
    } finally {
      setLavorando(false)
    }
  }

  const etichettaMotivo = motivo ? MOTIVI_UI[motivo].etichetta : ''
  const puoContinuare = motivo !== 'altro' || motivoLibero.trim().length > 0

  // ── Task D ────────────────────────────────────────────────────────────────
  const correggendo = motivo === 'errore_dato_dichiarazione'
  const quanteCorrezioni = Object.keys(correzioni).length
  const titoloFoglio = fase === 'correzioneCampo' && voceAperta ? TITOLI_VOCE[voceAperta] : TITOLI[fase]

  /** Registra (o toglie) la correzione di una voce e torna all'elenco.
   *  🔑 `null` = «l'ho rimessa com'era»: **non è una correzione**, e la voce
   *  esce dall'elenco. Mandarla produrrebbe un documento identico a quello di
   *  oggi — cioè proprio ciò che il tasto spento dichiara inutile. */
  function chiudiVoce(campo: CampoCorreggibile, voce: VoceCorretta | null) {
    setCorrezioni((prev) => {
      const prossime = { ...prev }
      if (voce) prossime[campo] = voce
      else delete prossime[campo]
      return prossime
    })
    setVoceAperta(null)
    setFase('correzione')
  }

  return (
    <>
      {/* ① LA RIGA — dove oggi muore il conto alla rovescia. Dice DOVE si va,
          non cosa è vietato. */}
      <button
        type="button"
        onClick={() => setFase('domanda')}
        style={{
          display: 'flex', alignItems: 'center', gap: spazio.sm, width: '100%',
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: raggio.riga, padding: `${spazio.m}px`, textAlign: 'left',
          minHeight: 52, font: 'inherit', cursor: 'pointer',
        }}
      >
        <span aria-hidden style={{ fontSize: tipografia.size.heading, lineHeight: 1 }}>🛠</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: tipografia.size.body, fontWeight: tipografia.weight.bold, color: 'var(--ink)' }}>
            Devo intervenire
          </span>
          <span style={{ display: 'block', fontSize: tipografia.size.label, color: 'var(--muted)', marginTop: 2 }}>
            Il lavoro è consegnato: da qui si registra cos&apos;è successo
          </span>
        </span>
        <span aria-hidden style={{ color: 'var(--faint)', fontSize: tipografia.size.body }}>›</span>
      </button>

      {/* IL FOGLIO — UNO SOLO, che cambia passo. V. il riquadro in testa al file
          per il difetto misurato che ha imposto questa struttura. */}
      <Sheet aperto={fase !== 'chiuso'} onChiudi={ricomincia} titolo={titoloFoglio}>

      {/* ② LA DOMANDA D'INGRESSO (D288) — e l'uscita non salva niente. */}
      {fase === 'domanda' && (
        <>
          <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0, textAlign: 'center' }}>
            {descrizione}
          </p>
          <TastoPrimario onClick={() => setFase('motivo')}>Sì, devo intervenire</TastoPrimario>
          {/* 🔑 L'uscita sta INSIEME alla domanda, ed è la condizione ③ del panel:
              senza una via che non salva niente, chi ha aperto sul lavoro
              sbagliato non ha nessuna scelta giusta a schermo e prende il motivo
              più vicino. */}
          <TastoSecondario onClick={ricomincia}>No, ho premuto per sbaglio</TastoSecondario>
        </>
      )}

      {/* ③ I NOVE MOTIVI, IN CINQUE FAMIGLIE (D300) */}
      {fase === 'motivo' && (
        <>
        {/* ⚖️ D262 — UN RIFIUTO INDICA LA STRADA, NON SI LIMITA A VIETARE.
            Senza questa riga chi ha appena risposto «sì, è uscito» torna davanti
            allo stesso elenco che l'ha appena rimandato indietro, e prende il
            motivo più vicino: è così che una guardia su un campo produce un dato
            falso su un altro.
            🔑 Il nome del motivo si PRENDE da `MOTIVI_UI`, non si ricopia: se un
            giorno l'etichetta cambia, questa frase non resta a indicare una voce
            che a schermo non si chiama più così. */}
        {uscitoDichiarato && (
          <div style={{
            borderRadius: raggio.riga, padding: `13px ${spazio.m}px`,
            background: 'var(--blue-tint)',
          }}>
            <b style={{ display: 'block', fontSize: 15, color: 'var(--blue)', marginBottom: 3 }}>
              Allora la consegna è avvenuta davvero
            </b>
            <span style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.45 }}>
              Se il problema è un dato scritto sulla dichiarazione, scegli{' '}
              <b style={{ color: 'var(--ink)' }}>«{MOTIVI_UI.errore_dato_dichiarazione.etichetta}»</b>:
              {' '}si corregge il dato e si rifà il documento, e quello vecchio resta in archivio.
            </span>
          </div>
        )}
        <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0 }}>
          Scegli il motivo: da quello l&apos;app capisce cosa fare.
        </p>
        {FAMIGLIE.map((f) => (
          <div key={f.chiave}>
            <p style={{
              fontSize: tipografia.size.caption, letterSpacing: tipografia.tracking.caption,
              textTransform: 'uppercase', color: 'var(--faint)',
              fontWeight: tipografia.weight.extrabold, margin: `0 0 ${spazio.s}px`,
            }}>{f.etichetta}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.s }}>
              {motiviDellaFamiglia(f.chiave).map((m) => {
                const v = MOTIVI_UI[m]
                return (
                  <button
                    key={m} type="button" onClick={() => scegliMotivo(m)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 13, width: '100%',
                      background: 'var(--bg-deep)', border: '1px solid transparent',
                      borderRadius: raggio.riga, padding: `${spazio.sm}px ${spazio.m}px`,
                      textAlign: 'left', minHeight: 56, font: 'inherit', cursor: 'pointer',
                    }}
                  >
                    <span aria-hidden style={{
                      width: 34, height: 34, flex: 'none', borderRadius: 11,
                      display: 'grid', placeItems: 'center', fontSize: 16,
                      background: TINTE[v.tinta].bg, color: TINTE[v.tinta].ink,
                    }}>{v.glifo}</span>
                    <span>
                      <span style={{ display: 'block', fontSize: tipografia.size.body, fontWeight: tipografia.weight.bold, color: 'var(--ink)', lineHeight: 1.25 }}>{v.etichetta}</span>
                      <span style={{ display: 'block', fontSize: 13.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.35 }}>{v.sottotitolo}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        </>
      )}

      {/* ③-ter IL PASSO DI CORREZIONE — ⚖️ D322, variante A: PRIMA delle quattro
          caselle. Mostra VALORI, non controlli: si tocca una riga, si corregge,
          si torna qui e la riga dice `vecchio → nuovo`. */}
      {fase === 'correzione' && (
        <>
          {/* IL NASTRO DEL PERCORSO — è l'elemento con cui il mockup approvato
              DICE la variante A: la correzione sta in mezzo, e dopo vengono
              ancora le quattro caselle di legge. Senza, chi legge non sa che
              il percorso non finisce qui. */}
          <NastroPercorso />
          <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0 }}>
            Tocca la riga da correggere. Niente viene salvato finché non premi il tasto in fondo.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.s }}>
            {CAMPI_CORREGGIBILI_DOCUMENTO.map((campo) => (
              <RigaVoce
                key={campo}
                etichetta={ETICHETTE_VOCE[campo]}
                adesso={valoreDiAdesso(voci, campo)}
                corretta={correzioni[campo]}
                precluso={perchePrecluso(voci, campo)}
                // ⚖️ D320 — la riga del paziente non apre un campo di testo:
                //    apre un elenco di persone. La marca lo dice PRIMA del tocco.
                marca={campo === 'paziente_id' ? 'altra persona' : undefined}
                onApri={() => { setVoceAperta(campo); setFase('correzioneCampo') }}
              />
            ))}
          </div>

          {/* ⚖️ D316 · D320 — «Da qui non si corregge» nomina DUE cose, e ognuna
              porta la sua destinazione: un rifiuto indica la strada (D262).
              🛑 Si naviga con `useNavigaDaOverlay`, mai `router.push` nudo: da
              dentro un overlay v3 un `push` impila la pagina nuova sopra
              l'entry del foglio e la lascia sepolta — difetto già pagato. */}
          <div style={{ borderRadius: raggio.riga, padding: `14px ${spazio.m}px`, background: 'var(--bg-deep)' }}>
            <p style={{
              fontSize: tipografia.size.caption, letterSpacing: tipografia.tracking.caption,
              textTransform: 'uppercase', fontWeight: tipografia.weight.extrabold,
              color: 'var(--faint)', margin: `0 0 ${spazio.s}px`,
            }}>Da qui non si corregge</p>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: `0 0 ${spazio.s}px`, lineHeight: 1.5 }}>
              Se è sbagliato un dato del <b style={{ color: 'var(--ink)' }}>laboratorio</b> — ragione sociale,
              indirizzo, partita IVA, luogo di fabbricazione — si corregge in{' '}
              <LinkQuieto onClick={() => navigaDaOverlay('/impostazioni')}>Impostazioni</LinkQuieto>, e vale
              per tutte le dichiarazioni da lì in avanti.
            </p>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              Se il <b style={{ color: 'var(--ink)' }}>nome del paziente</b> è scritto male, si corregge in{' '}
              <LinkQuieto onClick={() => navigaDaOverlay(voci.pazienteId ? `/pazienti/${voci.pazienteId}` : '/pazienti')}>
                Anagrafica
              </LinkQuieto>{' '}
              — così vale per tutti i suoi lavori. Poi torni qui e rifai la dichiarazione. Da questo foglio
              si cambia <b style={{ color: 'var(--ink)' }}>quale persona</b> è, non come si chiama.
            </p>
          </div>

          <TastoPrimario
            onClick={() => setFase('dettagli')}
            disabled={quanteCorrezioni === 0}
            motivoDisabilitato="Tocca una riga e correggi almeno un dato: senza una correzione, il documento nuovo sarebbe identico a quello di oggi."
          >
            Continua
          </TastoPrimario>
          {quanteCorrezioni > 0 && (
            <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0, textAlign: 'center' }}>
              Hai corretto <b style={{ color: 'var(--ink)' }}>{quanteCorrezioni} dat{quanteCorrezioni === 1 ? 'o' : 'i'}</b>.
              {' '}Restano da rispondere le quattro domande di legge.
            </p>
          )}
        </>
      )}

      {/* ③-quater IL SOTTO-PASSO DI UNA VOCE — `key` sulla voce: si rimonta
          fresco a ogni apertura, così non porta dentro lo stato di quella
          precedente. */}
      {fase === 'correzioneCampo' && voceAperta && (
        <PassoVoce
          key={voceAperta}
          campo={voceAperta}
          voci={voci}
          corrente={correzioni[voceAperta]}
          onIndietro={() => { setVoceAperta(null); setFase('correzione') }}
          onConferma={(voce) => chiudiVoce(voceAperta, voce)}
        />
      )}

      {/* ④ LE QUATTRO CASELLE (spec §5) */}
      {fase === 'dettagli' && (
        <>
        <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0 }}>
          {etichettaMotivo}. Serve alla legge, non a noi.
        </p>

        {motivo === 'altro' && (
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: tipografia.size.label, fontWeight: tipografia.weight.bold, color: 'var(--muted)', marginBottom: spazio.s }}>
              Di che cosa si tratta?
            </span>
            <input
              value={motivoLibero}
              onChange={(e) => setMotivoLibero(e.target.value)}
              maxLength={1000}
              style={{
                width: '100%', border: '1px solid var(--line)', background: 'var(--card)',
                borderRadius: 14, padding: `13px ${spazio.m}px`, font: 'inherit',
                fontSize: 16, color: 'var(--ink)', minHeight: 48,
              }}
            />
          </label>
        )}

        <GruppoChip
          domanda={DOMANDE.origine}
          voci={ORIGINI_INFORMAZIONE}
          etichette={ORIGINE_UI}
          scelta={origine}
          onScegli={setOrigine}
        />

        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: tipografia.size.label, fontWeight: tipografia.weight.bold, color: 'var(--muted)', marginBottom: spazio.s }}>
            {DOMANDE.conosciuto}
          </span>
          <input
            type="datetime-local" value={conosciuto}
            onChange={(e) => setConosciuto(e.target.value)}
            style={{
              width: '100%', border: '1px solid var(--line)', background: 'var(--card)',
              borderRadius: 14, padding: `13px ${spazio.m}px`, font: 'inherit',
              fontSize: 16, color: 'var(--ink)', minHeight: 48,
            }}
          />
        </label>

        <GruppoChip
          domanda={DOMANDE.stato}
          voci={STATI_DISPOSITIVO}
          etichette={STATO_UI}
          scelta={statoDisp}
          onScegli={setStatoDisp}
        />

        <GruppoChip
          domanda={DOMANDE.danno}
          voci={POTENZIALI_DI_DANNO}
          etichette={DANNO_UI}
          scelta={danno}
          onScegli={setDanno}
        />

        {/* 🔴 LA VIA D'USCITA DAL CONFLITTO — senza, da qui non si torna
            indietro: il tasto è spento e l'unico gesto rimasto è chiudere il
            foglio, che è proprio il gesto che perdeva la registrazione.
            🛑 QUI NON SI RACCONTA LA CAUSA, e non è timidezza: la rotta manda
            **sei** 409 diversi (gettone stantìo · nessuna dichiarazione viva ·
            registrazione già consumata · dichiarazione già superata · numero
            già usato · registrazione già usata altrove) e li distingue **solo
            a parole**, senza un codice leggibile a macchina. Scriverne una
            causa qui vorrebbe dire dirla falsa sugli altri cinque rami — cioè
            rifare, un piano più in là, l'errore del commento sulle tinte.
            ➡️ La causa la dice il messaggio della rotta, che si mostra
            **com'è scritto**; questo riquadro aggiunge solo ciò che è vero su
            tutti e sei: questo tentativo non ha rifatto il documento, e la
            registrazione non si ripete. */}
        {correggendo && conflitto && (
          <>
            <Esito tono="attesa" titolo="Questo tentativo non è riuscito">
              {conflitto}
              <span style={{ display: 'block', marginTop: 6 }}>
                Quello che hai segnalato resta registrato: riprendendo da qui non se ne registra
                una seconda. Anche le correzioni che hai scritto restano: non devi ridigitarle.
              </span>
            </Esito>
            {/* 🔴 CHIAMA `ricaricaERiprendi`, NON `ricomincia`: il secondo fa
                `setCorrezioni({})`, cioè cancella le correzioni appena digitate.
                Il tasto prometteva una ripresa e faceva un azzeramento. */}
            <TastoSecondario onClick={ricaricaERiprendi}>Ricarica e riprendi</TastoSecondario>
          </>
        )}

        {/* ⚖️ D322 — IL TASTO FINALE DICE QUELLO CHE FA, mai «Salva». Su questo
            motivo è QUI che parte l'atto unico: due chiamate in fila, la
            registrazione e la riemissione. Sugli altri otto motivi la riga
            resta esattamente quella di prima. */}
        <TastoPrimario
          onClick={() => { if (!lavorando) void (correggendo ? correggiERifai() : registra(statoDisp)) }}
          disabled={lavorando || !puoContinuare || conflitto !== null}
          motivoDisabilitato={
            lavorando ? 'Sto registrando…'
              : conflitto ?? 'Scrivi in due parole di cosa si tratta'
          }
        >
          {lavorando ? 'Un attimo…' : correggendo ? 'Correggi e rifai la dichiarazione' : 'Continua'}
        </TastoPrimario>
        {correggendo && !lavorando && conflitto === null && (
          <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0, textAlign: 'center' }}>
            La dichiarazione di oggi resta in archivio come superata: non sparisce.
          </p>
        )}
        </>
      )}

      {/* ⑤ LA PROPOSTA, COL SUO PERCHÉ — e si può cambiare (D267) */}
      {fase === 'proposta' && (
        <>{risposta && (
          <>
            {/* 🔑 LA CARTA NUOVA SI ANNUNCIA SUBITO, prima della valutazione:
                l'atto unico è già avvenuto, e tacerlo qui sarebbe «riuscire
                senza dirlo». La classificazione ISO resta una decisione a
                parte, e la si prende sotto. */}
            <RiquadroRiemissione riemissione={riemissione} />
            <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0 }}>
              Se non ti torna, cambiala: decidi tu.
            </p>
            <div style={{
              borderRadius: raggio.tile, padding: spazio.m,
              background: risposta.proposta.ramoIso ? 'var(--red-tint)' : 'var(--green-tint)',
            }}>
              <p style={{
                fontSize: tipografia.size.caption, letterSpacing: tipografia.tracking.caption,
                textTransform: 'uppercase', fontWeight: tipografia.weight.extrabold,
                color: risposta.proposta.ramoIso ? 'var(--red)' : 'var(--green)', margin: `0 0 6px`,
              }}>Per la legge è</p>
              <p style={{ fontSize: 19, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)', margin: 0 }}>
                {ESITO_UI[esitoScelto ?? risposta.proposta.esito]}
              </p>
              <p style={{ fontSize: 14.5, color: 'var(--muted)', margin: `${spazio.s}px 0 0`, lineHeight: 1.45 }}>
                {risposta.proposta.perche}
              </p>
              {!cambiando && (
                <div style={{ marginTop: spazio.sm }}>
                  <TastoSecondario onClick={() => setCambiando(true)}>Non è così — cambia</TastoSecondario>
                </div>
              )}
              {cambiando && (
                <div style={{ marginTop: spazio.sm, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {(Object.keys(ESITO_UI) as Esito[]).map((e) => (
                    <ChipScelta key={e} selezionata={esitoScelto === e} onClick={() => setEsitoScelto(e)}>
                      {ESITO_UI[e]}
                    </ChipScelta>
                  ))}
                </div>
              )}
            </div>

            {/* 🔑 L'ALTRO PIANO, e i due non si mescolano (D288): sopra che cosa
                dice la NORMA, qui che cosa succede al LAVORO. */}
            <div style={{ borderRadius: 16, padding: `13px ${spazio.m}px`, background: 'var(--bg-deep)' }}>
              <b style={{ display: 'block', fontSize: 15, color: 'var(--ink)', marginBottom: 3 }}>E sul lavoro</b>
              <span style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                {risposta.effetto.perche}
              </span>
            </div>

            <TastoPrimario
              onClick={() => { if (!lavorando) void confermaValutazione() }}
              disabled={lavorando}
              motivoDisabilitato="Sto salvando…"
            >
              {lavorando ? 'Un attimo…' : 'Registra'}
            </TastoPrimario>
          </>
        )}</>
      )}

      {/* ⑥ GLI ESITI — anche quelli che non sono un successo (R10) */}
      {fase === 'esito' && (
        <>{risposta && (
          <>
            <Esito tono="ok" titolo={confermata ? 'Registrato e valutato' : 'Registrato'}>
              {confermata
                ? 'La registrazione e la valutazione sono agli atti.'
                : 'La registrazione è agli atti.'}
            </Esito>
            <RiquadroRiemissione riemissione={riemissione} />
            {/* 🔴 QUESTO BLOCCO ERA UN TESTO FALSO, e l'ha trovato la revisione del
                Task 7. Diceva «La dichiarazione è stata annullata» **proprio sul ramo
                che la tiene viva**: il ternario guardava `dichiarazione_assente`, che
                su `torna_pronto` non arriva affatto (la rotta manda `dichiarazione_viva`),
                quindi cadeva sempre nel ramo «annullata». 🛑 È l'inversione esatta di
                D293 e dell'Art. 21(2) MDR — e la porta era già aperta, perché
                `destinatario_errato` non ha nessun cancello a monte.
                📌 I testi sono quelli **già ratificati** nel Passo 5 del Task 9: qui si
                chiude la bugia, non si progetta la schermata. Al Task 9 restano
                l'inversione dell'ordine (l'esito sopra la conferma) e la via per
                **aprire** il lavoro nuovo. */}
            {risposta.esito_azione?.stato === 'applicato' && (
              risposta.effetto.azione === 'crea_rifacimento' ? (
                <Esito
                  tono="ok"
                  titolo={
                    risposta.esito_azione.lavoro_nuovo
                      ? `È nato il lavoro ${risposta.esito_azione.lavoro_nuovo.numero_lavoro}`
                      : 'È nato un lavoro nuovo'
                  }
                >
                  Questo resta consegnato con la sua dichiarazione.
                </Esito>
              ) : risposta.effetto.azione === 'torna_pronto' ? (
                <Esito tono="ok" titolo="Il lavoro è tornato fra i pronti">
                  {risposta.esito_azione.dichiarazione_viva === false
                    ? 'Su questo lavoro non c\'era una dichiarazione valida: quando lo riconsegnerai ne verrà emessa una nuova.'
                    : 'La dichiarazione resta valida.'}
                </Esito>
              ) : (
                <Esito tono="ok" titolo="Il lavoro è tornato fra i pronti">
                  {risposta.esito_azione.dichiarazione_assente
                    ? 'Non c\'era nessuna dichiarazione da annullare.'
                    : 'La dichiarazione è stata annullata.'}
                </Esito>
              )
            )}
            {/* 🛑 «Non applicabile» NON è un guasto: il lavoro non era da
                riportare indietro. Trattarlo come errore insegnerebbe a
                ignorare gli avvisi. */}
            {risposta.esito_azione?.stato === 'non_applicabile' && (
              risposta.effetto.azione === 'crea_rifacimento' ? (
                <Esito tono="attesa" titolo="Non c'era niente da rifare su questo lavoro">
                  La registrazione è salva.
                </Esito>
              ) : (
                <Esito tono="attesa" titolo="Il lavoro non era da riportare indietro">
                  Era già fra i pronti, o non è più consegnato. La registrazione è salva.
                </Esito>
              )
            )}
            {/* 🛑 IL GUASTO VERO, e questa riga è la ragione per cui la rotta
                distingue tre esiti invece di un sì/no: senza, «registrato»
                sembrerebbe «fatto tutto». */}
            {risposta.esito_azione?.stato === 'fallito' && (
              risposta.effetto.azione === 'crea_rifacimento' ? (
                <Esito tono="guasto" titolo="Ma il lavoro nuovo non è stato creato">
                  {risposta.esito_azione.messaggio ?? 'Crealo dalla scheda, oppure riprova fra un momento.'}
                </Esito>
              ) : (
                <Esito tono="guasto" titolo="Ma il lavoro non è tornato indietro">
                  {risposta.esito_azione.messaggio ?? 'Riportalo tu fra quelli pronti, oppure riprova fra un momento.'}
                </Esito>
              )
            )}
            <TastoPrimario onClick={ricomincia}>Ho capito</TastoPrimario>
          </>
        )}</>
      )}
      </Sheet>

      {/* ③-bis IL PERCORSO CORTO — il DialogConferma sta SOPRA il foglio, che
          resta aperto: è il caso che `storia-overlay.ts` sostiene per
          costruzione, non una seconda consegna di testimone.

          🔴 ERA UNA CONFERMA, ED È DIVENTATO UNA DOMANDA (Task A dell'atto
          unico). Il difetto, misurato: `stato_dispositivo` era cablato a
          `mai_uscito_dal_lab` su questo percorso, quindi **l'app affermava al
          posto della persona** che il manufatto non era mai uscito — e la
          guardia della rotta che rifiuta quel motivo su un manufatto uscito
          (`eventi-qualita/route.ts:246`) non poteva accendersi mai da qui.
          🛑 ZERO TOCCHI IN PIÙ (D269): la finestra c'era già, cambia solo che
          cosa chiede. L'`occhiello` «Confermi?» è stato tolto perché era
          proprio la parola della conferma.
          ⚠️ COSTO DICHIARATO: Esc, tocco sullo scrim e gesto «indietro»
          finiscono sullo STESSO `onAnnulla` del tasto «Sì, è uscito» — il
          componente di sistema espone due callback, non tre, e cambiarne il
          contratto è fuori da questo mandato. Chi esce senza rispondere vede
          quindi anche l'avviso in cima all'elenco. Non si scrive niente. */}
      <DialogConferma
        aperto={fase === 'domandaUscito'}
        titolo="Il manufatto è uscito dal laboratorio?"
        testo="Con questo motivo il lavoro torna fra quelli pronti e la dichiarazione già emessa viene annullata — non superata: annullata. Va bene solo se il manufatto non è mai uscito di qui."
        centraTesto
        primarioSopra
        etichettaDistruttiva={lavorando ? 'Un attimo…' : 'No, è sempre rimasto qui'}
        etichettaSicura="Sì, è uscito"
        onConferma={() => { if (!lavorando) void registra('mai_uscito_dal_lab') }}
        onAnnulla={() => { setUscitoDichiarato(true); setFase('motivo') }}
      />
    </>
  )
}

/** ⚖️ D322, variante A — i quattro passi, con dov'è adesso in evidenza. */
function NastroPercorso() {
  const passi = ['Motivo', 'Che cosa c\'è di sbagliato', 'Le quattro caselle', 'Esito']
  const qui = 1
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {passi.map((passo, i) => (
        <span key={passo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span aria-hidden style={{ color: 'var(--line)' }}>›</span>}
          <span
            aria-current={i === qui ? 'step' : undefined}
            style={{
              fontSize: 12, fontWeight: tipografia.weight.bold, whiteSpace: 'nowrap',
              borderRadius: 999, padding: '5px 10px',
              background: i === qui ? 'var(--ink)' : 'var(--bg-deep)',
              color: i === qui ? 'var(--bg)' : 'var(--faint)',
            }}
          >{passo}</span>
        </span>
      ))}
    </div>
  )
}

/** Il riquadro della carta nuova. `null` finché non è avvenuta: si annuncia
 *  ciò che È SUCCESSO, mai ciò che si sperava. */
function RiquadroRiemissione(props: { riemissione: { numero: string | null; numeroSuperato: string | null } | null }) {
  const { riemissione } = props
  if (!riemissione) return null
  return (
    <Esito
      tono="ok"
      titolo={riemissione.numero ? `Dichiarazione rifatta — n. ${riemissione.numero}` : 'Dichiarazione rifatta'}
    >
      {riemissione.numeroSuperato
        ? `La n. ${riemissione.numeroSuperato} resta in archivio come superata: non è stata annullata.`
        : 'Quella di prima resta in archivio come superata: non è stata annullata.'}
    </Esito>
  )
}

/**
 * Una riga del passo di correzione: **mostra il valore, non un controllo**.
 * Corretta, dice `vecchio → nuovo` e porta la pastiglia «Da rifare».
 *
 * 🛑 Preclusa, NON è un bottone e porta la sua ragione: un bersaglio che si può
 * premere e non fa niente è peggio di un bersaglio che non c'è.
 */
function RigaVoce(props: {
  etichetta: string
  adesso: string
  corretta?: VoceCorretta
  precluso: string | null
  marca?: string
  onApri: () => void
}) {
  const { etichetta, adesso, corretta, precluso, marca, onApri } = props

  const corpo = (
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{
        display: 'block', fontSize: tipografia.size.label, fontWeight: tipografia.weight.bold,
        color: 'var(--muted)',
      }}>{etichetta}</span>
      <span style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 6,
        fontSize: 16.5, fontWeight: tipografia.weight.bold, color: 'var(--ink)',
        lineHeight: 1.3, marginTop: 2, overflowWrap: 'anywhere',
      }}>
        {corretta ? (
          <>
            <span style={{ color: 'var(--muted)', textDecoration: 'line-through', fontWeight: tipografia.weight.semibold }}>
              {adesso}
            </span>
            <span aria-hidden style={{ color: 'var(--faint)' }}>→</span>
            <span>{corretta.mostrato}</span>
          </>
        ) : (
          <span>{adesso}</span>
        )}
        {marca && !corretta && (
          <span style={{
            fontSize: 11.5, fontWeight: tipografia.weight.extrabold, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--purple)', background: 'var(--purple-tint)',
            borderRadius: 999, padding: '3px 9px',
          }}>{marca}</span>
        )}
      </span>
      {corretta && (
        <span style={{
          display: 'inline-block', marginTop: 6, fontSize: 11.5,
          fontWeight: tipografia.weight.extrabold, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--blue)', background: 'var(--card)',
          borderRadius: 999, padding: '3px 9px',
        }}>Da rifare</span>
      )}
      {precluso && (
        <span style={{ display: 'block', fontSize: 13.5, color: 'var(--faint)', marginTop: 4, lineHeight: 1.4 }}>
          {precluso}
        </span>
      )}
    </span>
  )

  const stile = {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
    // 🔄 QUI C'ERA UN COMMENTO CHE DICEVA IL FALSO, e va detto per intero perché
    //    un commento sbagliato è peggio di un commento assente: viene *citato*.
    //    Sosteneva che in tema scuro `--bg-deep` risolvesse a un tono **più
    //    chiaro** del `--card` del foglio, e quindi che la riga restasse
    //    visibile. `provato:` `src/app/ds-v3.css:52` — in scuro `--bg-deep` è
    //    `#100E0B`, cioè più SCURO sia del `--card` del pannello (`#211D18`)
    //    sia del fondo pagina (`#171411`): la riga non sale, **scende**.
    // 🛑 QUESTA TINTA NON È VERIFICATA, e questo commento non finge il
    //    contrario. La regola di casa è due righe sopra il token
    //    (`ds-v3.css:50`, «*Dark — elevazione = superficie più chiara, MAI
    //    ombre*») ed è già registrata come esito di un gate L2 in
    //    `Sheet.tsx:499-501`; il mockup approvato scrive `--elv` sulle
    //    superfici premibili dentro il foglio.
    // ➡️ Cambiare la tinta è materia del GATE ESTETICO L2 (D245), non di questa
    //    riga: chi ci arriva deve trovare un ❌ da valutare, non una verifica
    //    che qualcuno dichiara di aver già fatto.
    background: corretta ? 'var(--blue-tint)' : 'var(--bg-deep)',
    border: '1px solid transparent', borderRadius: raggio.riga,
    padding: `13px ${spazio.m}px`, textAlign: 'left' as const,
    minHeight: 60, font: 'inherit',
  }

  if (precluso) {
    return <div style={{ ...stile, opacity: 0.72 }}>{corpo}</div>
  }

  return (
    <button type="button" onClick={onApri} style={{ ...stile, cursor: 'pointer' }}>
      {corpo}
      <span aria-hidden style={{ color: 'var(--faint)', fontSize: 17, flex: 'none' }}>›</span>
    </button>
  )
}

/** Il tasto «‹ Torna all'elenco» dei sotto-passi. Bersaglio ≥ 44 px. */
function TornaAllElenco(props: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
        background: 'transparent', border: 'none', padding: 0, font: 'inherit',
        fontSize: 14.5, fontWeight: tipografia.weight.bold, color: 'var(--muted)',
        minHeight: 44, cursor: 'pointer',
      }}
    >
      <span aria-hidden>‹</span> Torna all&apos;elenco
    </button>
  )
}

const NON_SI_SVUOTA = 'Questa voce non si può svuotare: sul documento diventerebbe un\'informazione mancante.'

/**
 * Il sotto-passo di UNA voce. Ogni ramo risponde a due domande sole: **che
 * cosa si manda** (la forma che il contratto vuole) e **è ancora una
 * correzione** (no, se il valore è tornato quello di prima).
 */
function PassoVoce(props: {
  campo: CampoCorreggibile
  voci: VociDocumento
  corrente?: VoceCorretta
  onIndietro: () => void
  onConferma: (voce: VoceCorretta | null) => void
}) {
  const { campo, voci, corrente, onIndietro, onConferma } = props

  // ── I tre testi (`richiedente_nome`, `descrizione`) e il colore ───────────
  const originaleTesto = campo === 'descrizione' ? voci.descrizione : (voci.richiedenteNome ?? '')
  const [testo, setTesto] = useState<string>(
    corrente && (campo === 'descrizione' || campo === 'richiedente_nome') ? String(corrente.valore) : originaleTesto
  )

  // ── Il tipo di dispositivo — vocabolario CHIUSO ───────────────────────────
  const [tipo, setTipo] = useState<TipoDispositivo>(
    corrente && campo === 'tipo_dispositivo' ? (corrente.valore as TipoDispositivo) : voci.tipoDispositivo
  )

  // ── Il paziente — si sceglie una PERSONA, non si scrive un nome (D320) ────
  const [cerca, setCerca] = useState('')
  const [trovati, setTrovati] = useState<{ id: string; codice_paziente: string | null; alias: string | null }[]>([])
  const [scelto, setScelto] = useState<{ id: string; mostrato: string } | null>(
    corrente && campo === 'paziente_id' ? { id: corrente.valore as string, mostrato: corrente.mostrato } : null
  )

  // ── I denti — il carico della PENNA, oggetti `{fdi, ruolo, …}` ────────────
  const dentiOriginali = voci.denti ?? []
  const [sel, setSel] = useState<number[]>(() => dentiOriginali.filter((d) => d.ruolo === 'elemento').map((d) => d.fdi))
  const [man, setMan] = useState<number[]>(() => dentiOriginali.filter((d) => d.ruolo === 'mancante').map((d) => d.fdi))
  const [imp, setImp] = useState<number[]>(() => dentiOriginali.filter((d) => d.ruolo === 'impianto').map((d) => d.fdi))

  // ── Le caratteristiche prescritte — DUE caselle, `elementi` e `colore` ────
  const elementiOriginali = voci.prescrizione?.elementi ?? []
  const coloreOriginale = voci.prescrizione?.colore ?? ''
  const [elementi, setElementi] = useState<number[]>(() => [...elementiOriginali])
  const [colore, setColore] = useState(coloreOriginale)

  const q = cerca.trim()
  useEffect(() => {
    // 🔑 IL VUOTO SI DERIVA, NON SI SCRIVE (v. `risultati` più sotto): uno
    //    `setTrovati([])` sincrono nel corpo dell'effetto accende
    //    `react-hooks/set-state-in-effect` e fa un render in più per niente.
    if (campo !== 'paziente_id' || !voci.clienteId || q.length < 2) return
    let annullato = false
    // 🛑 Una LETTURA, non una scrittura: il Passo 5 («niente si salva prima del
    //    tocco finale») parla di ciò che si scrive. Cercare una persona non
    //    tocca niente.
    fetch(`/api/pazienti?cliente_id=${encodeURIComponent(voci.clienteId)}&q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : { pazienti: [] }))
      .then((j) => { if (!annullato) setTrovati(j.pazienti ?? []) })
      .catch(() => { if (!annullato) setTrovati([]) })
    return () => { annullato = true }
  }, [campo, voci.clienteId, q])

  /** Sotto i due caratteri non si mostra niente: è un DERIVATO della ricerca,
   *  non uno stato da azzerare a mano. */
  const risultati = q.length >= 2 ? trovati : []

  /** Che cosa si manda, e se è ancora una correzione. `null` = non lo è. */
  function componi(): VoceCorretta | null {
    switch (campo) {
      case 'richiedente_nome':
      case 'descrizione': {
        const vivo = testoVivo(testo)
        if (vivo === null || vivo === testoVivo(originaleTesto)) return null
        return { valore: testo, mostrato: vivo }
      }
      case 'tipo_dispositivo':
        if (tipo === voci.tipoDispositivo) return null
        return { valore: tipo, mostrato: LABEL_MACRO[tipo] }
      case 'paziente_id':
        if (!scelto || scelto.id === voci.pazienteId) return null
        return { valore: scelto.id, mostrato: scelto.mostrato }
      case 'denti_coinvolti': {
        const nuovi = ricomponiDenti(dentiOriginali, sel, man, imp)
        if (nuovi.length === 0 || stessiDenti(nuovi, dentiOriginali)) return null
        const elencati = nuovi.filter((d) => d.ruolo === 'elemento').map((d) => String(d.fdi))
        return { valore: nuovi, mostrato: elencati.length > 0 ? elencati.join(', ') : '—' }
      }
      case 'prescrizione_caratteristiche': {
        // 🔑 SI MANDANO SOLO LE SOTTO-CHIAVI CAMBIATE: la penna scrive una
        //    `jsonb_set` alla volta, quindi correggere il colore non cancella
        //    gli elementi. E ogni sotto-chiave mandata dev'essere non vuota —
        //    la voce 6 dell'Allegato XIII è un contenuto dovuto.
        const sotto: Record<string, unknown> = {}
        if (testoVivo(colore) !== testoVivo(coloreOriginale)) {
          if (testoVivo(colore) === null) return null
          sotto.colore = colore
        }
        if (JSON.stringify([...elementi].sort((a, b) => a - b)) !== JSON.stringify([...elementiOriginali].sort((a, b) => a - b))) {
          if (elementi.length === 0) return null
          sotto.elementi = [...elementi].sort((a, b) => a - b)
        }
        if (Object.keys(sotto).length === 0) return null
        const fuso = { ...(voci.prescrizione ?? {}), ...sotto } as PrescrizioneContenuto
        return { valore: sotto, mostrato: caratteristichePrescritte(fuso) ?? '—' }
      }
    }
  }

  /** Il perché il tasto è spento — 🛑 si dice PRIMA, non si scopre con un 422. */
  function perche(): string | null {
    switch (campo) {
      case 'richiedente_nome':
      case 'descrizione':
        return testoVivo(testo) === null ? NON_SI_SVUOTA : null
      case 'paziente_id':
        return !scelto || scelto.id === voci.pazienteId ? 'Scegli una persona diversa da quella di adesso.' : null
      case 'denti_coinvolti':
        return ricomponiDenti(dentiOriginali, sel, man, imp).length === 0
          ? 'Un elenco di denti vuoto non si può mandare: il documento resterebbe senza.'
          : null
      case 'prescrizione_caratteristiche': {
        if (testoVivo(colore) !== testoVivo(coloreOriginale) && testoVivo(colore) === null) return NON_SI_SVUOTA
        if (elementi.length === 0 && elementiOriginali.length > 0) return NON_SI_SVUOTA
        return null
      }
      case 'tipo_dispositivo':
        return null
    }
  }

  const spento = perche()

  return (
    <>
      <TornaAllElenco onClick={onIndietro} />

      {(campo === 'richiedente_nome' || campo === 'descrizione') && (
        <>
          <CampoTesto label="Come deve dire il documento" valore={testo} onCambia={setTesto} />
          <p style={{ fontSize: 13.5, color: 'var(--faint)', margin: 0 }}>
            Adesso dice: <b style={{ color: 'var(--muted)' }}>{valoreDiAdesso(voci, campo)}</b>
          </p>
          {campo === 'richiedente_nome' && voci.richiedenteNome === null && (
            <p style={{ fontSize: 13.5, color: 'var(--faint)', margin: 0, lineHeight: 1.45 }}>
              Qui non c&apos;è ancora nessun nome scritto: sulla dichiarazione compare quello del dentista.
            </p>
          )}
        </>
      )}

      {campo === 'tipo_dispositivo' && (
        <>
          <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0 }}>
            Le voci sono queste: sul documento non ne può comparire un&apos;altra.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {MACRO_SLUGS.map((s) => (
              <ChipScelta key={s} selezionata={tipo === s} onClick={() => setTipo(s)}>
                {LABEL_MACRO[s]}
              </ChipScelta>
            ))}
          </div>
        </>
      )}

      {campo === 'paziente_id' && (
        <>
          <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
            Da qui si cambia <b style={{ color: 'var(--ink)' }}>la persona</b>. Per correggere come è scritto un
            nome si va in Anagrafica.
          </p>
          <CampoTesto label="Cerca per cognome o codice" valore={cerca} onCambia={setCerca} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {risultati.map((p) => {
              const mostrato = p.alias ?? p.codice_paziente ?? '—'
              const eQuelloDiAdesso = p.id === voci.pazienteId
              return (
                <button
                  key={p.id} type="button"
                  onClick={() => setScelto({ id: p.id, mostrato })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                    background: 'var(--bg-deep)', borderRadius: 16, minHeight: 56,
                    border: `1px solid ${scelto?.id === p.id ? 'var(--ink)' : 'transparent'}`,
                    padding: `12px ${spazio.m}px`, font: 'inherit', textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 16, fontWeight: tipografia.weight.bold, color: 'var(--ink)' }}>
                      {mostrato}
                    </span>
                    <span style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                      {p.codice_paziente ?? '—'}{eQuelloDiAdesso ? ' · è quello di adesso' : ''}
                    </span>
                  </span>
                </button>
              )
            })}
            {q.length >= 2 && risultati.length === 0 && (
              <p style={{ fontSize: 13.5, color: 'var(--faint)', margin: 0 }}>
                Nessuna persona trovata in questo studio.
              </p>
            )}
          </div>
        </>
      )}

      {campo === 'denti_coinvolti' && (
        <>
          <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
            Sul documento compaiono gli <b style={{ color: 'var(--ink)' }}>elementi</b>. Il colore già segnato su
            un dente resta dov&apos;è.
          </p>
          <OdontogrammaFDI
            selezionati={sel} mancanti={man} impianti={imp}
            onSelezionati={setSel} onMancanti={setMan} onImpianti={setImp}
          />
        </>
      )}

      {campo === 'prescrizione_caratteristiche' && (
        <>
          <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0, lineHeight: 1.45 }}>
            Sono le caratteristiche <b style={{ color: 'var(--ink)' }}>indicate dal medico</b> nella prescrizione:
            sul documento compaiono in una riga sola.
          </p>
          <div style={{ borderRadius: raggio.riga, padding: `14px ${spazio.m}px`, background: 'var(--bg-deep)' }}>
            <p style={{
              fontSize: tipografia.size.caption, letterSpacing: tipografia.tracking.caption,
              textTransform: 'uppercase', fontWeight: tipografia.weight.extrabold,
              color: 'var(--faint)', margin: `0 0 ${spazio.s}px`,
            }}>Elementi</p>
            {/* 🔴 NON È UN CAMPO DI TESTO, e il mockup lo disegnava così: sul
                contratto `elementi` è una lista di NUMERI di dente
                (`PrescrizioneContenuto.elementi: number[]`). Un testo qui
                prenderebbe **422 a ogni invio** — `normalizzaContenuto` scarta
                un `elementi` che non sia un array di numeri e `validaCorrezioni`
                rifiuta ciò che è stato scartato. V. il resoconto, §6.
                🔑 Sulla prescrizione esistono SOLO gli elementi: segnare un
                dente come mancante o impianto qui vuol dire toglierlo. */}
            <OdontogrammaFDI
              selezionati={elementi} mancanti={[]} impianti={[]}
              onSelezionati={setElementi} onMancanti={() => {}} onImpianti={() => {}}
            />
            <div style={{ height: 12 }} />
            <CampoTesto label="Colore" valore={colore} onCambia={setColore} />
          </div>
          <div style={{ borderRadius: 16, padding: `12px ${spazio.m}px`, background: 'var(--amber-tint)' }}>
            <b style={{ display: 'block', fontSize: 14.5, color: 'var(--ink)', marginBottom: 3 }}>
              Una casella non si può svuotare
            </b>
            <span style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.45 }}>
              Se una caratteristica non va più indicata, non si cancella da qui: sul documento è un contenuto
              dovuto, e toglierla lo farebbe uscire monco.
            </span>
          </div>
        </>
      )}

      <TastoPrimario
        onClick={() => onConferma(componi())}
        disabled={spento !== null}
        motivoDisabilitato={spento ?? undefined}
      >
        Usa questo
      </TastoPrimario>
    </>
  )
}

/** Un gruppo di pastiglie: una domanda, e le sue risposte tutte dello stesso
 *  peso. 🛑 Nessuna è «la più rapida» — v. il riquadro su `danno`. */
function GruppoChip<T extends string>(props: {
  domanda: string
  voci: readonly T[]
  etichette: Record<T, string>
  scelta: T
  onScegli: (v: T) => void
}) {
  const { domanda, voci, etichette, scelta, onScegli } = props
  return (
    <div>
      <p style={{
        fontSize: tipografia.size.label, fontWeight: tipografia.weight.bold,
        color: 'var(--muted)', margin: `0 0 ${spazio.s}px`,
      }}>{domanda}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {voci.map((v) => (
          <ChipScelta key={v} selezionata={scelta === v} onClick={() => onScegli(v)}>
            {etichette[v]}
          </ChipScelta>
        ))}
      </div>
    </div>
  )
}

const TONI = {
  ok: { bg: 'var(--green-tint)', ink: 'var(--green)' },
  attesa: { bg: 'var(--amber-tint)', ink: 'var(--amber)' },
  guasto: { bg: 'var(--red-tint)', ink: 'var(--red)' },
} as const

function Esito(props: { tono: keyof typeof TONI; titolo: string; children: React.ReactNode }) {
  const { tono, titolo, children } = props
  return (
    <div style={{ borderRadius: raggio.riga, padding: `15px ${spazio.m}px`, background: TONI[tono].bg }}>
      <b style={{ display: 'block', fontSize: 16, marginBottom: 4, color: TONI[tono].ink }}>{titolo}</b>
      <span style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.45 }}>{children}</span>
    </div>
  )
}
