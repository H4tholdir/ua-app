// Parser puro (nessuna I/O) per le ricevute PEC del Sistema di Interscambio (SdI).
//
// Fixture di riferimento: tests/fixtures/ricevute-sdi/ — root element e nomi
// campo verificati sugli esempi UFFICIALI fatturapa.gov.it (ufficiale-{RC,NS,MC,
// NE,DT,AT}-v1.0.xml) e su MessaggiTypes_v1.1.xsd. Vedi README nella cartella
// fixture per la provenienza.
//
// XXE-safety: il DOCTYPE non fa MAI parte dello schema SdI reale, quindi
// qualsiasi `<!DOCTYPE` / `<!ENTITY` nel documento è trattato come non valido e
// rigettato PRIMA di invocare il parser XML (difesa primaria). In aggiunta,
// `processEntities: false` impedisce comunque a fast-xml-parser di risolvere
// entità esterne/custom (difesa in profondità — la libreria stessa rifiuta le
// entità esterne quando l'opzione è attiva).

import { XMLParser, XMLValidator } from 'fast-xml-parser'

export type TipoRicevutaSdI = 'RC' | 'NS' | 'MC' | 'NE' | 'DT' | 'AT'

export interface RicevutaSdIParsed {
  tipo: TipoRicevutaSdI
  nomeFileFattura: string // <NomeFile> dentro l'XML — chiave di match
  identificativoSdI: string
  dataOraRicezione: string | null
  esitoCommittente: 'EC01' | 'EC02' | null // solo NE
  listaErrori: Array<{ codice: string; descrizione: string }> // solo NS
}

export class RicevutaNonValidaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RicevutaNonValidaError'
  }
}

/** Size cap applicato PRIMA di qualsiasi parsing — anti-DoS. */
const MAX_SIZE_BYTES = 1_048_576

/**
 * Namespace canonico dei messaggi SdI, pinnato dagli esempi UFFICIALI
 * fatturapa.gov.it (tests/fixtures/ricevute-sdi/ufficiale-*.xml: tutti e 6 i
 * tipi dichiarano `xmlns:types="http://www.fatturapa.gov.it/sdi/messaggi/v1.0"`
 * sul root). Il root element DEVE essere qualificato esattamente con questo
 * namespace: local name giusto ma namespace assente/diverso/prefix non
 * dichiarato → RicevutaNonValidaError (fail-closed, anti-spoofing).
 */
const SDI_MESSAGGI_NAMESPACE = 'http://www.fatturapa.gov.it/sdi/messaggi/v1.0'

/**
 * Root element (local name, senza prefisso di namespace) → tipo ricevuta.
 * Nomi verificati sulle fixture ufficiali fatturapa.gov.it e su
 * MessaggiTypes_v1.1.xsd (RicevutaConsegna, NotificaScarto,
 * NotificaMancataConsegna, NotificaEsito, NotificaDecorrenzaTermini,
 * AttestazioneTrasmissioneFattura sono i soli 6 tipi di messaggio SdI verso il
 * trasmittente/ricevente).
 */
const ROOT_ELEMENT_TO_TIPO: Record<string, TipoRicevutaSdI> = {
  RicevutaConsegna: 'RC',
  NotificaScarto: 'NS',
  NotificaMancataConsegna: 'MC',
  NotificaEsito: 'NE',
  NotificaDecorrenzaTermini: 'DT',
  AttestazioneTrasmissioneFattura: 'AT',
}

const DOCTYPE_OR_ENTITY_RE = /<!\s*(DOCTYPE|ENTITY)\b/i

type XmlNode = Record<string, unknown>

function asText(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value.trim() === '' ? null : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  // Elemento con soli attributi/figli (oggetto) non è un valore testuale valido.
  return null
}

function requireText(node: XmlNode, field: string): string {
  const value = asText(node[field])
  if (value === null) {
    throw new RicevutaNonValidaError(`campo obbligatorio mancante: ${field}`)
  }
  return value
}

function optionalText(node: XmlNode, field: string): string | null {
  return asText(node[field])
}

function extractListaErrori(node: XmlNode): Array<{ codice: string; descrizione: string }> {
  const listaErrori = node.ListaErrori as XmlNode | undefined
  if (!listaErrori || typeof listaErrori !== 'object') return []

  const errori = listaErrori.Errore
  const arr = Array.isArray(errori) ? errori : errori !== undefined ? [errori] : []

  return arr.map((raw, i) => {
    const errore = raw as XmlNode
    const codice = asText(errore?.Codice)
    const descrizione = asText(errore?.Descrizione)
    if (codice === null || descrizione === null) {
      throw new RicevutaNonValidaError(`ListaErrori[${i}]: Codice/Descrizione mancante`)
    }
    return { codice, descrizione }
  })
}

function extractEsitoCommittente(node: XmlNode): 'EC01' | 'EC02' | null {
  const esitoCommittente = node.EsitoCommittente as XmlNode | undefined
  if (!esitoCommittente || typeof esitoCommittente !== 'object') return null

  const esito = asText(esitoCommittente.Esito)
  if (esito !== 'EC01' && esito !== 'EC02') {
    throw new RicevutaNonValidaError(`EsitoCommittente/Esito non valido: ${esito ?? '(mancante)'}`)
  }
  return esito
}

/**
 * Parsa una ricevuta SdI (RC/NS/MC/NE/DT/AT) in un buffer XML XXE-safe.
 * Pure function: nessun accesso a filesystem/rete, nessun side effect.
 *
 * @throws {RicevutaNonValidaError} XML oversize, malformato, non è una
 *   ricevuta SdI riconosciuta, o manca un campo chiave.
 */
export function parseRicevutaSdI(xml: Buffer): RicevutaSdIParsed {
  if (!Buffer.isBuffer(xml)) {
    throw new RicevutaNonValidaError('input non valido: atteso Buffer')
  }

  // Size cap PRIMA di qualsiasi parsing.
  if (xml.length > MAX_SIZE_BYTES) {
    throw new RicevutaNonValidaError(`oversize: ${xml.length} byte (limite ${MAX_SIZE_BYTES})`)
  }

  const text = xml.toString('utf-8')

  // XXE hardening primario: nessuna ricevuta SdI reale contiene un DOCTYPE.
  // Rigetta prima ancora di invocare il parser XML — l'entità non viene mai
  // valutata né risolta.
  if (DOCTYPE_OR_ENTITY_RE.test(text)) {
    throw new RicevutaNonValidaError('XML non valido: DOCTYPE/ENTITY non ammessi (XXE)')
  }

  if (XMLValidator.validate(text) !== true) {
    throw new RicevutaNonValidaError('XML malformato')
  }

  const parser = new XMLParser({
    // Attributi necessari per leggere le dichiarazioni xmlns sul root e
    // validare il namespace (vedi sotto). I campi estratti restano testuali.
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // Il prefisso del root NON viene rimosso: serve per risolverlo alla sua
    // dichiarazione xmlns e confrontare l'URI con SDI_MESSAGGI_NAMESPACE.
    // I campi figli nei messaggi SdI reali sono non qualificati (verificato
    // sulle fixture ufficiali), quindi restano accessibili per nome semplice.
    removeNSPrefix: false,
    processEntities: false, // XXE hardening secondario (difesa in profondità)
    ignoreDeclaration: true,
    ignorePiTags: true,
    parseTagValue: false, // mai coercizione numerica: preserva zeri iniziali (es. Codice "00100")
    isArray: (tagName) => tagName === 'Errore',
  })

  let parsed: unknown
  try {
    parsed = parser.parse(text)
  } catch (err) {
    throw new RicevutaNonValidaError(
      `XML non parsabile: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new RicevutaNonValidaError('XML non valido: documento vuoto')
  }

  const rootKeys = Object.keys(parsed as XmlNode)
  const rootKey = rootKeys[0]
  if (!rootKey) {
    throw new RicevutaNonValidaError('XML non valido: nessun elemento root')
  }

  const root = (parsed as XmlNode)[rootKey] as XmlNode
  if (typeof root !== 'object' || root === null) {
    throw new RicevutaNonValidaError('XML non valido: struttura ricevuta assente')
  }

  // Risolvi il prefisso del root alla sua dichiarazione xmlns (che per il root
  // può stare SOLO sul root stesso — non esistono antenati) e valida che il
  // namespace sia ESATTAMENTE quello canonico SdI. Fail-closed: root senza
  // namespace, con namespace diverso, o con prefix non dichiarato → errore.
  const colonIdx = rootKey.indexOf(':')
  const rootPrefix = colonIdx >= 0 ? rootKey.slice(0, colonIdx) : null
  const rootLocalName = colonIdx >= 0 ? rootKey.slice(colonIdx + 1) : rootKey
  const xmlnsAttr = rootPrefix !== null ? `@_xmlns:${rootPrefix}` : '@_xmlns'
  const rootNamespace = asText(root[xmlnsAttr])
  if (rootNamespace !== SDI_MESSAGGI_NAMESPACE) {
    throw new RicevutaNonValidaError(
      `namespace root non valido: atteso ${SDI_MESSAGGI_NAMESPACE}, trovato ${rootNamespace ?? '(nessuno/prefix non dichiarato)'}`
    )
  }

  const tipo = ROOT_ELEMENT_TO_TIPO[rootLocalName]
  if (!tipo) {
    throw new RicevutaNonValidaError(
      `documento non è una ricevuta SdI riconosciuta (root: ${rootLocalName})`
    )
  }

  const nomeFileFattura = requireText(root, 'NomeFile')
  const identificativoSdI = requireText(root, 'IdentificativoSdI')
  const dataOraRicezione = optionalText(root, 'DataOraRicezione')
  const esitoCommittente = extractEsitoCommittente(root)
  const listaErrori = extractListaErrori(root)

  return {
    tipo,
    nomeFileFattura,
    identificativoSdI,
    dataOraRicezione,
    esitoCommittente,
    listaErrori,
  }
}
