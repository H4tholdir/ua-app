// DS v3 §7.3/§7 (Ondata 2, Task 12) — crea-lavoro: orchestrazione client-safe
// della creazione del lavoro dal wizard. NIENTE `server-only` qui (a
// differenza di dati-wizard.ts): gira nel browser, chiamata dal «Continua»
// del Passo 3 (PassoPaziente → WizardNuovoLavoro).
//
// Sequenza fail-soft (spec §7): 4 passi, i primi 3 SONO il percorso primario
// (BLOCCANTI — un fallimento a uno qualsiasi di questi ferma tutto, nessuna
// chiamata successiva, `lavoro: null`); l'ultimo è accessorio (la foto) e può
// fallire SENZA invalidare il lavoro già creato — l'esito riporta cosa è
// andato storto in `accessoriFalliti`, il chiamante lo segnala (Avviso) ma non
// blocca mai l'utente.
//
// 1. GET  /api/pazienti?cliente_id=X       — riusa l'id se codice_paziente === pz
// 2. POST /api/pazienti                    — SOLO se nessun match al passo 1
// 3. POST /api/lavori                      — il lavoro, i denti e il colore INSIEME
// 4. POST /api/lavori/[id]/immagini        — SOLO se una foto è presente
//
// 🔴 IL PASSO «PATCH dettagli» NON ESISTE PIÙ (Task 11). Fino al Task 10 il
// wizard creava il lavoro e poi mandava `denti_coinvolti`/`colore_dente` con
// una PATCH fail-soft. Dal Task 10 quei nomi sono fuori da `PATCHABLE_FIELDS`
// e `src/app/api/lavori/[id]/route.ts` scarta le chiavi fuori allowlist SENZA
// errore: il server avrebbe risposto 200, l'utente avrebbe letto «Fatto!» e il
// dato non ci sarebbe stato. Ora denti e colore viaggiano dentro il POST e
// nascono nella STESSA transazione del lavoro (`lavoro_crea_atomico`): o ci
// sono tutti, o non c'è nemmeno il lavoro. È il rischio R1 della spec §4 —
// un colore perso in silenzio produce una Dichiarazione di Conformità priva di
// un contenuto obbligatorio dell'Allegato XIII.
//
// DEVIAZIONE dal contratto letterale del piano (verificata leggendo il
// codice reale di `src/app/api/pazienti/route.ts` PRIMA di scrivere, come
// richiesto dal brief): il piano diceva `POST /api/pazienti {..., nome_cognome:
// alias||pz}`, ma la route NON legge `body.nome_cognome` (lo scarta in
// silenzio — non è nella whitelist di `insertData`) e la colonna
// `pazienti.nome_cognome` è `NOT NULL` senza default. Il trigger DB
// `sync_paziente_nome_cognome` (002_fase2_schema.sql) la valorizza SOLO se
// `nome` E `cognome` sono ENTRAMBI non-null — quindi un POST con solo
// `codice_paziente` violerebbe il vincolo NOT NULL e fallirebbe con 500
// (bloccante, per giunta senza un motivo comprensibile). Mapping adattato:
// `nome: ''` (stringa vuota — non-null, soddisfa il trigger senza inventare
// un nome, coerente col principio GDPR "nessun nome richiesto" del Passo 3)
// e `cognome: alias || pz` (il valore visibile). FrameFatto mostra `pz`
// (il codice), MAI `nome_cognome`, quindi lo spazio finale che il trigger
// produce (`upper(cognome) || ' ' || upper(nome)`) resta un dettaglio
// cosmetico del campo interno, invisibile in UI.
//
// isoDataLocale è duplicata da dati-wizard.ts (Task 7): quel file è
// `server-only`, non importabile da qui. Stessa convenzione W7 (mai
// `toISOString().split('T')[0]`, che usa il fuso UTC).

import { trovaTipo, labelTipo } from '@/lib/domain/tipi-lavoro'
import { isFdiValido } from '@/lib/domain/denti-fdi-dominio'
import type { TipoScelto, ColoreOrigine } from '@/components/features/wizard/WizardNuovoLavoro'
import type { TipoDispositivo, ClasseRischio } from '@/types/domain'

/**
 * Ciò che può andare perso SENZA portarsi via il lavoro. Nell'ordine in cui
 * compare nella schermata («Elemento», «Colore», la foto), che è anche l'ordine
 * in cui le tre cose si perdono.
 *
 * · `'elementi'` = la casella «Elemento» conteneva qualcosa che non è un dente
 *   (v. `mappaElementi`);
 * · `'colore'` = il codice digitato non è in catalogo — al banco si scrive
 *   «A3,5» con la virgola, e «A3,5» non esiste («A3.5» sì). Il server lo scarta
 *   e crea comunque il lavoro (`risolviColoreCaso`), poi lo DICE nella risposta
 *   con `colore_scartato`;
 * · `'foto'` = il caricamento dell'immagine è fallito.
 *
 * Nessuno dei tre invalida il lavoro; tutti e tre si correggono dalla scheda, e
 * tutti e tre si DICONO — fallire in silenzio è il difetto, fallire
 * visibilmente è la cura (decisione di Francesco, 27/07/2026).
 *
 * 🔑 UNA SOLA CASA per l'unione: `FrameFatto` ne deriva le etichette con un
 * `Record<AccessorioFallito, string>`, quindi un quarto membro aggiunto qui
 * SPEGNE la compilazione finché non ha la sua frase. Fino al 28/07/2026
 * l'unione era ricopiata a mano in tre file, e il colore mancava da tutti e
 * tre: è così che un dato smette di salvarsi in silenzio.
 */
export type AccessorioFallito = 'elementi' | 'colore' | 'foto'

/**
 * Il PERCHÉ di un blocco, quando ha un nome ed è raccontabile all'utente.
 *
 * 🛑 Non è un `AccessorioFallito` e non deve diventarlo: un accessorio è ciò
 * che si perde SENZA portarsi via il lavoro (v. il commento sopra), mentre un
 * codice occupato ferma tutto — il lavoro non nasce. Vivono in due campi
 * diversi perché sono due fatti diversi.
 *
 * 🔑 Perché un campo e non un testo: il testo cambia (D36 l'ha già cambiato
 * una volta, T15 lo cambierà ancora). Chi decide sul testo decide su qualcosa
 * che è progettato per cambiare.
 */
export type MotivoBloccante = 'codice_gia_in_uso'

export type EsitoCreazione = {
  lavoro: { id: string; numero_lavoro: string } | null
  accessoriFalliti: AccessorioFallito[]
  /**
   * Assente = «bloccato, e non ho niente di meglio da dire»: è il valore di
   * riposo, e vive in `ESITO_BLOCCANTE` qui sotto — che è una costante SOLA,
   * restituita da sei punti diversi. FACOLTATIVO apposta: i chiamanti che
   * confrontano l'esito per intero (sei `toEqual` in `crea-lavoro.test.ts`)
   * restano validi e diventano una guardia in più — con `toEqual` una
   * proprietà definita di troppo fa cadere l'asserzione, quindi un motivo che
   * trapelasse sul percorso generico si vedrebbe subito.
   */
  motivo?: MotivoBloccante
}

const ESITO_BLOCCANTE: EsitoCreazione = { lavoro: null, accessoriFalliti: [], motivo: undefined }

/** 'YYYY-MM-DD' locale — vedi nota in testa al file (mai toISOString). */
export function isoDataLocale(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

/**
 * Nessun campione storico possibile per un tipo "descritto a mano" (nessun
 * id di catalogo su cui `calcolaGiorniPerTipo`, Task 6, possa aver aggregato
 * nulla): valore di 7 giorni ratificato da Francesco. Usato anche come rete
 * di sicurezza difensiva se un id di catalogo scelto non fosse (più)
 * presente in `giorniPerTipo`.
 */
export const GIORNI_FALLBACK_LIBERO = 7

/** Etichetta del tipo per la UI ("Lavoro" in FrameFatto) e come `descrizione` del POST. */
export function descrizioneTipo(tipo: TipoScelto): string {
  if (tipo.kind === 'libero') return tipo.testo
  const t = trovaTipo(tipo.tipoId)
  return t ? labelTipo(t) : tipo.tipoId
}

/**
 * Stima giorni/daStoria per il tipo scelto (Task 6/7, `dati.giorniPerTipo`
 * indicizza SOLO gli id di catalogo — un tipo libero non ha e non può avere
 * una voce). Pura: nessuna chiamata a rete, usata sia per calcolare
 * `dataConsegna` PRIMA di chiamare `creaLavoroDaWizard` sia per la frase di
 * FrameFatto (stesso `giorni`/`daStoria`, un'unica fonte di verità).
 */
export function stimaGiorni(
  tipo: TipoScelto,
  giorniPerTipo: Record<string, { giorni: number; daStoria: boolean }>
): { giorni: number; daStoria: boolean } {
  if (tipo.kind === 'libero') return { giorni: GIORNI_FALLBACK_LIBERO, daStoria: false }
  return giorniPerTipo[tipo.tipoId] ?? { giorni: GIORNI_FALLBACK_LIBERO, daStoria: false }
}

function datiPerTipo(tipo: TipoScelto): { tipo_dispositivo: TipoDispositivo; descrizione: string; classe_rischio: ClasseRischio } | null {
  if (tipo.kind === 'libero') {
    return { tipo_dispositivo: 'altro', descrizione: tipo.testo, classe_rischio: 'classe_i' }
  }
  const t = trovaTipo(tipo.tipoId)
  if (!t) return null
  return { tipo_dispositivo: t.macro, descrizione: labelTipo(t), classe_rischio: t.classeRischio }
}

type PazienteRiga = { id: string; codice_paziente: string | null }

/** Due cifre esatte, dopo aver tolto i punti. Mai un troncamento: «2.66» esce. */
const RE_DUE_CIFRE = /^\d{2}$/

/**
 * mappaElementi — dalla casella di testo libero «Elemento» ai numeri FDI che il
 * POST vuole.
 *
 * 🔑 QUESTA È LA FORMA CHE IL WIZARD RACCOGLIE DAVVERO, non quella che sarebbe
 * comodo avere. `PassoPaziente.tsx:83-90` è una casella di testo con segnaposto
 * «es. 2.6», non un odontogramma: l'odontotecnico digita «2.6, 2.7 3.1» oppure
 * «26 27», di fretta e al banco. La selezione dente-per-dente è ondata (b).
 *
 * Regole, tutte figlie di un vincolo reale:
 * · il punto della notazione FDI è cosmetico → si toglie («2.6» e «26» sono lo
 *   stesso dente);
 * · due cifre ESATTE, poi `isFdiValido` (l'insieme dei 52 codici non è un
 *   intervallo: 19, 20, 29… non esistono);
 * · **deduplica silenziosa.** Chi scrive «2.6, 26» ha scritto un dente due
 *   volte, non ha perso un dato. Senza questa riga il POST risponderebbe 422
 *   «dente ripetuto» e l'odontotecnico perderebbe il LAVORO per una ripetizione;
 * · ciò che non si capisce finisce in `scartati` e RISALE al chiamante. Non si
 *   passa al server (sarebbe un 422 e quindi nessun lavoro) e non si butta in
 *   silenzio (sarebbe la classe di difetto che questa ondata esiste per
 *   uccidere): si crea il lavoro e si dice cosa non si è capito.
 */
export function mappaElementi(testo: string): { denti: number[]; scartati: string[] } {
  const denti: number[] = []
  const scartati: string[] = []
  const visti = new Set<number>()

  for (const pezzo of testo.split(/[,\s]+/).filter(Boolean)) {
    const cifre = pezzo.replace(/\./g, '')
    if (!RE_DUE_CIFRE.test(cifre)) {
      scartati.push(pezzo)
      continue
    }
    const fdi = Number(cifre)
    if (!isFdiValido(fdi)) {
      scartati.push(pezzo)
      continue
    }
    if (visti.has(fdi)) continue
    visti.add(fdi)
    denti.push(fdi)
  }

  return { denti, scartati }
}

/**
 * Il motivo dichiarato dalla rotta, se ce n'è uno che sappiamo raccontare.
 *
 * 🛑 Un motivo che non conosciamo vale quanto nessun motivo: si torna al testo
 * generico. Chi non riceve la parola non la inventa — stessa regola di
 * `colore_scartato === true` più sotto, e per la stessa ragione: un messaggio
 * preciso che compare quando non c'entra è peggio di uno vago.
 */
async function motivoDalCorpo(res: Response): Promise<MotivoBloccante | null> {
  try {
    const corpo = (await res.json()) as { motivo?: unknown }
    return corpo?.motivo === 'codice_gia_in_uso' ? 'codice_gia_in_uso' : null
  } catch {
    return null
  }
}

/**
 * creaLavoroDaWizard — sequenza fail-soft del Passo 3 (spec §7). Ritorna
 * SEMPRE l'esito parziale, mai un throw: il chiamante (WizardNuovoLavoro)
 * decide cosa fare con `lavoro: null` (bloccante, resta al Passo 3) o con
 * `accessoriFalliti` non vuoto (il lavoro esiste, si segnala e si prosegue).
 */
export async function creaLavoroDaWizard(input: {
  cliente: { id: string }
  tipo: TipoScelto
  pz: string
  alias: string
  elemento: string
  colore: string
  // Ondata B ②/T1 — assente o 'prescrizione' = il colore è trascrizione del
  // foglio (D223: scrivere È trascrivere); 'lab' = sganciato, scelta di
  // laboratorio, quindi NIENTE da trascrivere anche se `colore` è compilato.
  coloreOrigine?: ColoreOrigine
  foto: File | null
  dataConsegna: Date
}): Promise<EsitoCreazione> {
  const { cliente, tipo, pz, alias, elemento, colore, coloreOrigine, foto, dataConsegna } = input

  // Passi 1-2: risolvi (o crea) il paziente. Qualunque fallimento qui è
  // BLOCCANTE (spec §7: il paziente fa parte del percorso primario) — nessun
  // POST /api/lavori viene tentato.
  let pazienteId: string
  try {
    const resGet = await fetch(`/api/pazienti?cliente_id=${encodeURIComponent(cliente.id)}`, {
      credentials: 'same-origin',
    })
    if (!resGet.ok) return ESITO_BLOCCANTE
    const datiGet = (await resGet.json()) as { pazienti: PazienteRiga[] }
    const esistente = datiGet.pazienti.find((p) => p.codice_paziente === pz)

    if (esistente) {
      pazienteId = esistente.id
    } else {
      const resPost = await fetch('/api/pazienti', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          codice_paziente: pz,
          // Vedi nota in testa al file: mapping adattato al contratto reale
          // (nome_cognome NOT NULL, valorizzato dal trigger SOLO se nome+
          // cognome sono entrambi non-null).
          nome: '',
          cognome: alias || pz,
        }),
      })
      // Z1 (30/07) — «codice occupato» e «guasto» smettono di essere la stessa
      // cosa. Resta bloccante in entrambi i casi (il lavoro non nasce), ma il
      // primo ha un nome, e il wizard può dire cosa fare invece di «Riprova»
      // — che era un anello chiuso, perché `pz` non si ricalcola mai
      // (`WizardNuovoLavoro.tsx:258`).
      //
      // 🔑 Si guarda `motivo`, MAI il testo della risposta: il testo è
      // ratificato e progettato per cambiare (D36 oggi, T15 domani), il motivo
      // no.
      // 🛑 Il corpo si legge SOLO su un 409 dichiarato, e la lettura è
      // protetta: `.json()` su una risposta fallita può sollevare (un 502 di
      // un proxy non è JSON). In quel caso si degrada al blocco generico —
      // mai un'eccezione che risale, mai un motivo inventato.
      if (!resPost.ok) {
        if (resPost.status === 409) {
          const motivo = await motivoDalCorpo(resPost)
          if (motivo) return { ...ESITO_BLOCCANTE, motivo }
        }
        return ESITO_BLOCCANTE
      }
      const datiPost = (await resPost.json()) as { paziente: { id: string } }
      pazienteId = datiPost.paziente.id
    }
  } catch {
    return ESITO_BLOCCANTE
  }

  // Passo 3: il lavoro, i suoi denti e il suo colore. Fallimento = BLOCCANTE
  // (nessuna immagine senza un lavoro creato con successo).
  const corpo = datiPerTipo(tipo)
  if (!corpo) return ESITO_BLOCCANTE

  const { denti, scartati } = mappaElementi(elemento)

  // 🔑 IL COLORE È UNO SOLO E VALE PER TUTTO IL CASO. La casella «Colore» di
  // `PassoPaziente.tsx:91-98` è una sola per l'intero lavoro: va quindi nel
  // DEFAULT DI CASO (`lavori.colore_scala`/`colore_codice`), non stampato su
  // ogni dente. Stamparlo per-dente asserirebbe una prescrizione dente-per-
  // dente che l'odontotecnico non ha mai dato, e alla prima correzione dalla
  // scheda (Task 12) le righe farebbero ombra al caso — la precedenza
  // riga→caso di `src/lib/domain/colore-dente.ts` legge la riga per prima.
  // Due sorgenti dello stesso fatto clinico: la classe di difetto già pagata
  // con `numero_cassetta`.
  //
  // La SCALA non si manda: l'interfaccia non la chiede e il client non la può
  // inventare. La deduce il server dal catalogo `colori_dentali` (i 48 codici
  // sono distinti fra le tre scale). Il `.trim().toUpperCase()` qui costa nulla,
  // ma NON è lì che sta la garanzia: `lavori_colore_caso_fk` morde nel database,
  // quindi normalizzazione e degradazione vivono nel POST /api/lavori.
  const coloreCodice = colore.trim().toUpperCase()

  // La trascrizione della prescrizione (Task 1, gate D216 — server GIÀ pronto,
  // `route.ts:211-245`). GREZZA (D210): `colore` qui è la variabile COME
  // DIGITATA, non `coloreCodice` — un colore fuori catalogo si scarta dal
  // CASO (sopra) ma resta trascritto (fatto del censimento). La chiave
  // `prescrizione` parte SOLO se c'è qualcosa da dire: `coloreOrigine`
  // assente o `'prescrizione'` (D223: scrivere È trascrivere) E il colore non
  // è vuoto DOPO trim (M-T5-4 — "solo spazi" è trattato come vuoto qui,
  // gate client-side, indipendente da come il server tratterebbe la stringa
  // se la ricevesse). `'lab'` = sganciato: niente da trascrivere, anche a
  // colore compilato — ma `colore_codice` (sopra) viaggia comunque, in
  // ENTRAMBI gli esiti dello sgancio (task-1-brief.md riga 7).
  //
  // Il wizard oggi non ha una casella per `numero_prescrizione`: la chiave
  // resta fuori da questo corpo (non si inventa un campo che non esiste).
  const trascriviPrescrizione = coloreOrigine !== 'lab' && colore.trim() !== ''

  let lavoro: { id: string; numero_lavoro: string }
  let coloreScartato = false
  try {
    const res = await fetch('/api/lavori', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: cliente.id,
        paziente_id: pazienteId,
        tipo_dispositivo: corpo.tipo_dispositivo,
        descrizione: corpo.descrizione,
        data_consegna_prevista: isoDataLocale(dataConsegna),
        classe_rischio: corpo.classe_rischio,
        // Chiavi OMESSE quando non c'è nulla da dire: `denti: null` sarebbe un
        // 422 («presente ma non è una lista»), e una lista vuota un viaggio a
        // vuoto. Chi non ha denti da mandare non manda la chiave.
        ...(denti.length > 0
          ? {
              denti: denti.map((fdi) => ({
                fdi,
                // Costanti, non scelte dell'utente — e la ragione va scritta:
                // il wizard è l'ACCETTAZIONE di ciò che il dentista ha
                // prescritto (`PassoDentista` sceglie il dentista, il Passo 3
                // registra la prescrizione). «mancante», «impianto» e
                // «eseguito» non hanno alcun comando in questa schermata: si
                // dichiarano dalla scheda. Le due RPC hanno già gli stessi
                // default (`COALESCE(d->>'ruolo','elemento')` e
                // `COALESCE(d->>'provenienza','prescritto')`): si mandano
                // espliciti perché il corpo dica cosa sta affermando.
                ruolo: 'elemento',
                provenienza: 'prescritto',
              })),
            }
          : {}),
        ...(coloreCodice ? { colore_codice: coloreCodice } : {}),
        ...(trascriviPrescrizione ? { prescrizione: { colore } } : {}),
      }),
    })
    if (!res.ok) return ESITO_BLOCCANTE
    const dati = (await res.json()) as {
      lavoro: { id: string; numero_lavoro: string }
      colore_scartato?: boolean
    }
    lavoro = { id: dati.lavoro.id, numero_lavoro: dati.lavoro.numero_lavoro }
    // `=== true` e non un troncamento a booleano: chi non riceve la parola non
    // la inventa. Una risposta che non nomina il campo (server più vecchio, o
    // una versione in cache) NON deve produrre un allarme — un avviso che
    // compare quando non serve si impara a ignorare.
    coloreScartato = dati.colore_scartato === true
  } catch {
    return ESITO_BLOCCANTE
  }

  // Da qui in poi il lavoro ESISTE. Denti e colore sono già dentro, nella sua
  // stessa transazione: non possono più fallire da soli. Resta da dire ciò che
  // NON si è potuto mandare — e la foto.
  const accessoriFalliti: AccessorioFallito[] = []
  if (scartati.length > 0) accessoriFalliti.push('elementi')
  // Il colore non ha fatto fallire niente (regola dura), ma non è stato
  // registrato: senza questa riga l'utente legge «Fatto!» e non sa di dover
  // correggere. È il rilievo M2 della revisione pre-merge dell'ondata (a).
  if (coloreScartato) accessoriFalliti.push('colore')

  // Passo 4: foto dell'impronta.
  //
  // T11-bis: la rotta (`route.ts:97-103`) pretende `categoria`, validata con
  // `isCategoriaFoto`, e rifiuta con 422 chi manda ancora il vecchio
  // `descrizione` (era la forma pre-D73). Questa è letteralmente la foto
  // dell'impronta (`PassoPaziente.tsx` — «Aggiungi la foto dell'impronta»),
  // quindi il valore è una delle categorie ratificate, non un ripiego.
  // 🔑 D97 lo lascia a 'impronta': l'ambiguità «impronta o prescrizione?» è
  //    dell'ALTRO punto (FrameFatto), non di questo.
  if (foto) {
    try {
      const fd = new FormData()
      fd.append('file', foto)
      fd.append('categoria', 'impronta')
      const res = await fetch(`/api/lavori/${lavoro.id}/immagini`, {
        method: 'POST',
        credentials: 'same-origin',
        body: fd,
      })
      if (!res.ok) accessoriFalliti.push('foto')
    } catch {
      accessoriFalliti.push('foto')
    }
  }

  return { lavoro, accessoriFalliti }
}
