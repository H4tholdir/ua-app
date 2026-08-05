'use client'

// Ondata 3a Task 6 — SchedaLavoroV3: il corpo client della scheda-vista v3.
// Orchestra i pezzi dei Task 1-5 (pill di stato, CardFasiV3, ModificaRigaSheet,
// MenuSchedaSheet, DocumentiSheet) attorno ai componenti DS v3 (TastoTondo,
// TastoPrimario, TastoSecondario, CardInfo/RigaDato, PillTempo, Avviso) più
// `NotaLaboratorio` (locale a questo file — vedi nota sotto). Nessuna nuova
// API, nessun editing avanzato: le voci pesanti del menu e la scheda di
// fabbricazione restano dei rami già esistenti (§3, §7.1).
//
// Aggiornamento ottimistico (piano §Task 6, fix round finale — bug FK-refresh):
// `lavoroLocale` parte dai props; `onSalvato(patch)` di ModificaRigaSheet fonde
// il patch nello stato locale per i campi SCALARI (note_interne, data/ora
// consegna). Per le FOREIGN KEY (cliente_id, tecnico_id) il nome mostrato vive
// in un join lato server — non lo si ricostruisce a mano: si chiama
// `router.refresh()` così la pagina rilegge i join. Il merge locale del FK
// grezzo resta innocuo per compatibilità, ma l'aggiornamento vero arriva da un
// confronto `props.lavoro !== lavoroPropPrecedente` fatto DURANTE il render
// (pattern "adjusting state" di React, non `useEffect` — vedi commento sopra
// `lavoroPropPrecedente` più sotto nel file): senza questo, `lavoroLocale`
// restava congelato al valore del mount e `router.refresh()` passava un
// `props.lavoro` fresco che il componente non leggeva mai — la scheda
// mostrava il vecchio tecnico/dentista fino a un ricaricamento manuale. Su un
// edit scalare `props.lavoro` non cambia reference (nessun refresh), quindi
// il confronto non scatta e non clobbera l'update ottimistico locale.
//
// Nota su AvvisiProvider: NON è montato nel layout `(app)` (solo catalogo e
// wizard lo montano), e questo componente è renderizzato da solo anche nei test.
// Quindi si auto-avvolge: `SchedaLavoroV3 = <AvvisiProvider><Corpo/></...>`, e
// il Corpo consuma `useAvvisi()` per gli errori (L6).
//
// Nota su `note_interne` (fix round — decisione Francesco 13/07: "3a pulita
// ora, nota-dentista in 3b"): l'unico testo libero sul lavoro era
// `note_interne`, la nota PRIVATA del laboratorio («visibile solo al
// laboratorio» — vedi TabDati.tsx). La prima versione di questo file la
// mostrava dentro `NotaDentista` (§5.23) con `dottore={clienteDisplay(...)}`:
// attribuiva al dentista una nota che il dentista non ha mai scritto —
// misattribuzione corretta qui. `NotaLaboratorio` (sotto) la mostra
// onestamente come nota del LAB, senza alcun nome di dottore, tap → apre lo
// stesso `ModificaRigaSheet campo="note"` delle altre righe.
//
// Ondata 3b: lo schema ha ora un vero campo `note_dentista` (autografo dal
// portale, separato da `note_interne`) — vedi `LavoroDettaglio` in
// `types/domain.ts`. `NotaDentista` (§5.23) lo rende in sola lettura (nessun
// `onEspandi`), attribuito via `clienteDisplay(lavoro.cliente)`, subito PRIMA
// del blocco `NotaLaboratorio` sotto. Nessuna misattribuzione qui: è proprio
// il testo scritto dal dentista.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { tornaIndietro } from '@/lib/nav/torna-indietro'
import { useNavigaDaOverlay } from '@/components/ds/useNavigaDaOverlay'
import { motion } from 'motion/react'
import { AvvisiProvider, useAvvisi } from '@/components/ds/Avviso'
import { initSuoni } from '@/design-system/v3/sound'
import { NotaDentista } from '@/components/ds/NotaDentista'
import { CartaAlbum } from '@/components/ds/CartaAlbum'
// T12 — i quattro strati dell'album. 🛑 Si montano FRATELLI, mai uno dentro i
// figli o le props dell'altro: gli eventi sintetici risalgono l'albero REACT,
// non il DOM, e un `Escape` da uno strato annidato collasserebbe anche quello
// che lo contiene (§1.5, e il contratto sta scritto in `VisoreFoto.tsx:33-35`).
// ⚠️ Il piano di T12 elencava «modifica VisoreFoto (aggancia menù e conferma)»:
// contraddice quel contratto, e si è seguito il contratto. Riferito (R-E2).
import { VisoreFoto, tondoVisore } from '@/components/ds/VisoreFoto'
import { TendinaMenu } from '@/components/ds/TendinaMenu'
import { FoglioConferma } from '@/components/ds/FoglioConferma'
import { FoglioCategoria } from '@/components/ds/FoglioCategoria'
import { isCategoriaFoto, type CategoriaFoto } from '@/lib/domain/categorie-foto'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { CardInfo, RigaDato, type TonoPastiglia } from '@/components/ds/CardInfo'
import { PillTempo } from '@/components/ds/Pill'
import { CardFasiV3 } from './CardFasiV3'
import { RigaLavoroDenti } from './RigaLavoroDenti'
import { ModificaRigaSheet, type Campo } from './ModificaRigaSheet'
import { MenuSchedaSheet } from './MenuSchedaSheet'
import { DocumentiSheet } from './DocumentiSheet'
import { DocumentiPannello } from './DocumentiPannello'
import { SchedaNavRail } from './SchedaNavRail'
import { RifacimentoButton } from '@/components/features/lavori/RifacimentoButton'
import { SegnalaProblemaSheet } from '@/components/features/lavori/SegnalaProblemaSheet'
import { AnnullaConsegnaBanner } from '@/components/features/lavori/AnnullaConsegnaBanner'
import { FlussoConsegna } from '@/components/features/lavori/consegna-v3/FlussoConsegna'
import { pillStatoScheda } from '@/lib/lavori/stato-pill'
import { derivaUrgenza } from '@/lib/lavori/urgenza'
import { derivaRigaColore } from '@/lib/lavori/colore-riga-scheda'
import type { EsitoColore } from './ModificaColoreSheet'
import { molla } from '@/design-system/v3/motion'
import { raggio, sopraFoto, spazio, tipografia } from '@/design-system/v3/tokens'
import type { LavoroDettaglio, MaterialeIncompletoDettaglio } from '@/types/domain'

const MOTIVO_LABEL: Record<MaterialeIncompletoDettaglio['motivo'], string> = {
  lotto_assente: 'nessun lotto disponibile in magazzino',
  bom_mancante: 'distinta base (BOM) non definita nel listino',
}

// 🔄 05/08/2026 — l'elenco dei campi correggibili dal foglietto NON vive più
// qui: era ricopiato, e la copia è stata tolta. Ora si importa da chi lo rende
// (v. il cappello di `Campo` in `ModificaRigaSheet.tsx` per il perché è lui il
// proprietario, e per che cosa proteggeva davvero la copia).

const MS_GIORNO = 24 * 60 * 60 * 1000

/** studio_nome se c'è, altrimenti "nome cognome" — stessa etichetta usata da
 * SegnalaProblemaSheet/DocumentiSheet per il cliente. */
function clienteDisplay(cliente: LavoroDettaglio['cliente']): string {
  if (!cliente) return '—'
  return cliente.studio_nome?.trim() || `${cliente.nome} ${cliente.cognome}`.trim()
}

/** "2026-07-20" + "16:00" → "20 lug · 16:00" (data-only locale). */
function formattaConsegna(data: string, ora: string | null): string {
  const [y, m, d] = data.split('-').map(Number)
  if (!y || !m || !d) return data
  const testo = new Date(y, m - 1, d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  return ora ? `${testo} · ${ora.slice(0, 5)}` : testo
}

/** Copy del callout quando il TastoPrimario CONSEGNA è disabilitato, in base
 * allo stato (polish L1 — D6). Un lavoro GIÀ consegnato non deve invitare a
 * "Completa il controllo finale per consegnare": mostra invece la conferma di
 * consegna (con la data effettiva quando disponibile). */
function motivoConsegnaDisabilitato(lavoro: LavoroDettaglio): string {
  if (lavoro.stato === 'consegnato') {
    return lavoro.data_consegna_effettiva
      ? `Lavoro già consegnato il ${formattaConsegna(lavoro.data_consegna_effettiva.slice(0, 10), null)}`
      : 'Lavoro già consegnato'
  }
  return 'Completa il controllo finale per consegnare'
}

/** Consegna imminente (oggi o domani) o già scaduta → valore in rosso (§5.10:
 * `urgente` riservato SOLO alla consegna imminente, mai altri significati). */
function consegnaImminente(data: string, oggi: Date): boolean {
  const [y, m, d] = data.split('-').map(Number)
  if (!y || !m || !d) return false
  const target = new Date(y, m - 1, d).getTime()
  const oggiZero = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime()
  return Math.round((target - oggiZero) / MS_GIORNO) <= 1
}

export function SchedaLavoroV3(props: { lavoro: LavoroDettaglio; ruolo?: string | null; apriConsegna?: boolean }) {
  return (
    <AvvisiProvider>
      <SchedaLavoroV3Corpo {...props} />
    </AvvisiProvider>
  )
}

function SchedaLavoroV3Corpo(props: { lavoro: LavoroDettaglio; ruolo?: string | null; apriConsegna?: boolean }) {
  const { ruolo } = props
  const router = useRouter()
  // Navigazioni che partono da DENTRO un overlay v3 (o che ne chiudono uno nello stesso
  // gesto): mai `router.push` nudo — v. `useNavigaDaOverlay` e `storia-overlay.ts`.
  const navigaDaOverlay = useNavigaDaOverlay()
  const { errore } = useAvvisi()

  // Review finding G1 (fix-list FIX-G, chiuso su /dashboard con HomeV3.tsx) — questa scheda
  // è il root client SEMPRE montato di `/lavori/[id]` e renderizza `TastoTondo`/
  // `TastoPrimario`/`TastoSecondario` (`suona('tap')`) più `SchedaNavRail` e
  // `FrameConsegnato` nei propri discendenti (idem, `suona('tap')`/`suona('ua')`), senza che
  // nulla a monte chiamasse mai `initSuoni()`: primo tap muto, stesso bug di G1. Fix: stesso
  // schema di `HomeV3.tsx` — `initSuoni()` al mount di QUESTO componente, la superficie più a
  // monte della route. Idempotente (v. `initFatto` in `sound.ts`).
  useEffect(() => {
    initSuoni()
  }, [])

  const [lavoroLocale, setLavoroLocale] = useState<LavoroDettaglio>(props.lavoro)

  // Fix round (final review, bug FK-refresh): `router.refresh()` rilegge il
  // Server Component e passa un `props.lavoro` fresco coi JOIN aggiornati
  // (tecnico/cliente) — ma senza questa sincronizzazione `lavoroLocale`
  // restava congelato al valore del mount e la scheda mostrava il vecchio
  // nome finché non si ricaricava a mano. Un edit SCALARE (consegna/note) non
  // chiama `router.refresh()`, quindi il Server Component non rirende e
  // `props.lavoro` mantiene la STESSA reference → il confronto sotto non
  // scatta e l'update ottimistico scalare in `lavoroLocale` resta intatto. Un
  // edit FK, invece, fa girare `router.refresh()` → nuova reference di
  // `props.lavoro` coi join freschi → si risincronizza col dato autorevole.
  // Pattern "adjusting state while rendering" di React (NON `useEffect`: un
  // effetto qui violerebbe la regola lint `react-hooks/set-state-in-effect`
  // e aggiungerebbe un render extra dopo il mount):
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [lavoroPropPrecedente, setLavoroPropPrecedente] = useState(props.lavoro)
  if (props.lavoro !== lavoroPropPrecedente) {
    setLavoroPropPrecedente(props.lavoro)
    setLavoroLocale(props.lavoro)
  }

  // `lavoro`/`oggi`/`consegnabile` calcolati QUI, PRIMA di `consegnaAperta`
  // sotto (non dopo, come nella versione originale): il deep-link
  // `?consegna=1` deve poter leggere la stessa consegnabilità reale che
  // disabilita il TastoPrimario CONSEGNA, non aprirsi incondizionatamente.
  const lavoro = lavoroLocale
  const oggi = new Date()
  const consegnabile = derivaUrgenza(lavoro, oggi).consegnabile

  const [campoAttivo, setCampoAttivo] = useState<Campo | null>(null)
  const [menuAperto, setMenuAperto] = useState(false)
  const [documentiAperto, setDocumentiAperto] = useState(false)
  const [segnalaAperto, setSegnalaAperto] = useState(false)
  // Task 13 — la scheda apre FlussoConsegna IN PLACE (la vecchia pagina
  // `/consegna` muore al Task 15): `apriConsegna` (deep-link `?consegna=1`,
  // letto da page.tsx) auto-apre il flusso al mount.
  //
  // Fix review finale (finding IMPORTANTE): la vecchia pagina gated
  // lato server; qui `apriConsegna` da solo apriva incondizionatamente
  // il rito «Consegno?» anche su un lavoro NON consegnabile (es. già
  // consegnato) — un bookmark/deep-link stantio mostrava il rito e solo
  // il 422 del POST salvava l'utente. Si gate anche sul client con la
  // STESSA `consegnabile` che disabilita già il TastoPrimario sotto.
  const [consegnaAperta, setConsegnaAperta] = useState(Boolean(props.apriConsegna) && consegnabile)

  const pill = pillStatoScheda(lavoro, oggi)
  const mostraRifacimento = (['consegnato', 'pronto', 'sospeso'] as const).includes(
    lavoro.stato as 'consegnato' | 'pronto' | 'sospeso'
  )

  // ══ T12 — l'album: visore, tendina, conferma, correzione categoria ═══════
  //
  // 🔑 Quattro stati distinti e non uno solo «strato aperto»: la tendina vive
  //    SOPRA il visore (che resta aperto sotto), e la conferma sopra la
  //    tendina che si chiude. Un enum unico li renderebbe mutuamente esclusivi
  //    e il visore sparirebbe da sotto la conferma.
  const [visoreIndice, setVisoreIndice] = useState<number | null>(null)
  const [tendinaAperta, setTendinaAperta] = useState(false)
  const [confermaAperta, setConfermaAperta] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [categoriaIndice, setCategoriaIndice] = useState<number | null>(null)

  // 🛑 Le àncore del focus sono `useRef`, MAI letterali inline `{ current: x }`:
  //    l'effect del focus di `VisoreFoto`/`FoglioConferma`/`FoglioCategoria`
  //    dipende dall'IDENTITÀ del ref, e un letterale nuovo a ogni render
  //    strapperebbe il cursore all'utente a ogni rerender. È la trappola che
  //    T11 ha già pagato una volta.
  const ancoraVisoreRef = useRef<HTMLElement | null>(null)
  const ancoraTendinaRef = useRef<HTMLButtonElement | null>(null)
  const ancoraConfermaRef = useRef<HTMLElement | null>(null)
  const ancoraCategoriaRef = useRef<HTMLElement | null>(null)

  // D236 — l'album mostra SOLO le foto che hanno un indirizzo con cui mostrarle.
  // 🔑 Da quando `url` non è più una colonna, il tipo dice la verità: la firma
  //    la mette chi rende la pagina (`lavori/[id]/page.tsx:91`), e una riga che
  //    non ci è passata NON ha una URL. Prima il campo era `string` sempre, e una
  //    firma fallita arrivava qui come stringa vuota o vecchia: una miniatura
  //    rotta, indistinguibile da una foto persa.
  // 🛑 Lo scarto non è silenzioso: in sviluppo lo si dice, perché una foto che
  //    sparisce dall'album senza un perché è esattamente il difetto che questo
  //    controllo esiste per non nascondere.
  const fotoAlbum = useMemo(() => {
    const tutte = lavoro.immagini ?? []
    const mostrabili = tutte.filter((f): f is typeof f & { url: string } => typeof f.url === 'string' && f.url !== '')
    if (mostrabili.length !== tutte.length && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[SchedaLavoroV3] ${tutte.length - mostrabili.length} foto senza URL firmata: non sono mostrabili. ` +
          'Chi rende la pagina deve firmarle (v. page.tsx) — la riga esiste, manca il modo di vederla.'
      )
    }
    return mostrabili
  }, [lavoro.immagini])
  const fotoVisore = visoreIndice !== null ? fotoAlbum[visoreIndice] : undefined
  const fotoCategoria = categoriaIndice !== null ? fotoAlbum[categoriaIndice] : undefined
  // 🛑 Il server risponde 409 su lavoro consegnato (`[imgId]/route.ts:200`).
  //    Qui la voce si OMETTE, non si mostra spenta: una voce spenta invita
  //    comunque, e la carta non deve offrire un gesto che fallisce solo dopo
  //    il tocco.
  const eliminabile = lavoro.stato !== 'consegnato'

  /** L'elemento che ha aperto lo strato, catturato NEL GESTO.
   *
   *  ⚠️ Non è la cattura al montaggio che F-12 rifiuta: quella legge
   *  `document.activeElement` dentro l'overlay già aperto e prende quel che
   *  capita. Questa gira nell'handler del click, quando l'innesco è ancora
   *  montato e a fuoco.
   *  ⚠️ Ripiego dichiarato: `CartaAlbum` non espone il proprio innesco e
   *  passa solo l'indice (`CartaAlbum.tsx:66`), quindi il chiamante non ha un
   *  ref vero da dichiarare. Riferito come rilievo minore. */
  function catturaAncora(dove: React.MutableRefObject<HTMLElement | null>) {
    const attivo = document.activeElement
    dove.current = attivo instanceof HTMLElement && attivo !== document.body ? attivo : null
  }

  async function eliminaFotoCorrente() {
    if (!fotoVisore) return
    setEliminando(true)
    try {
      const res = await fetch(`/api/lavori/${lavoro.id}/immagini/${fotoVisore.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        // T8 (S7, D214) — il 409 «fonte in uso» porta la SUA frase, non
        // quella generica: dice perché non si può eliminare (è la fonte
        // della prescrizione di questo lavoro, o di un suo rifacimento) —
        // un messaggio su cui «riprova» non ha senso, perché riprovare non
        // cambia l'esito finché la foto resta collegata.
        // 🔑 Forma `{ error }` di QUESTA rotta (verificato leggendo
        //    `[imgId]/route.ts`: usa sempre la chiave inglese, non `errore`
        //    come alcune rotte più recenti). `.catch` copre sia un corpo
        //    non-JSON sia un 409 senza corpo leggibile — in entrambi i casi
        //    si ricade sul generico invece di un errore non gestito.
        if (res.status === 409) {
          const corpo = (await res.json().catch(() => ({}))) as { error?: string }
          // Gate L2 del 05/08 — il foglio di conferma si CHIUDE sul 409. Restare
          // aperto significherebbe offrire un ELIMINA rosso pienamente armato su
          // un'azione che, come dice il commento qui sopra, non può riuscire
          // finché la foto resta collegata: il messaggio spiega perché no, e il
          // tasto accanto continua a dire di sì. Il visore invece resta aperto —
          // la foto c'è ancora, ed è giusto vederla.
          setConfermaAperta(false)
          errore(corpo?.error || 'Non sono riuscita a eliminare la foto. Riprova.')
          return
        }
        errore('Non sono riuscita a eliminare la foto. Riprova.')
        return
      }
      // Prima si chiudono gli strati, poi si tocca la pagina sotto: un
      // aggiornamento con l'overlay ancora aperto lo lascerebbe appeso a una
      // foto che non c'è più.
      setConfermaAperta(false)
      setVisoreIndice(null)
      // Rimozione ottimistica dallo specchio locale + rilettura dal server.
      // 🔑 Sulla scheda i dati vengono da un componente server: senza il
      //    filtro locale la foto resterebbe a schermo fino al giro di rete, e
      //    senza il `refresh` lo specchio locale e il server divergerebbero.
      //    La riconciliazione `props.lavoro !== lavoroPropPrecedente` (sopra)
      //    riallinea quando il server risponde.
      setLavoroLocale((prev) => ({
        ...prev,
        immagini: (prev.immagini ?? []).filter((f) => f.id !== fotoVisore.id),
      }))
      router.refresh()
    } catch {
      errore('Non sono riuscita a eliminare la foto. Riprova.')
    } finally {
      setEliminando(false)
    }
  }

  async function correggiCategoria(categoria: CategoriaFoto) {
    const foto = fotoCategoria
    setCategoriaIndice(null)
    if (!foto || !isCategoriaFoto(categoria) || foto.categoria === categoria) return
    // Ottimistico: la pastiglia cambia subito, come ogni altra correzione della
    // scheda (direttiva «ogni campo si corregge, fino alla consegna»).
    setLavoroLocale((prev) => ({
      ...prev,
      immagini: (prev.immagini ?? []).map((f) => (f.id === foto.id ? { ...f, categoria } : f)),
    }))
    try {
      const res = await fetch(`/api/lavori/${lavoro.id}/immagini/${foto.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria }),
      })
      if (!res.ok) {
        errore('Non sono riuscita a cambiare la categoria. Riprova.')
        setLavoroLocale((prev) => ({
          ...prev,
          immagini: (prev.immagini ?? []).map((f) => (f.id === foto.id ? { ...f, categoria: foto.categoria } : f)),
        }))
        return
      }
      router.refresh()
    } catch {
      errore('Non sono riuscita a cambiare la categoria. Riprova.')
    }
  }

  // Aggiornamento ottimistico: scalari nel merge locale, FK via router.refresh.
  //
  // 🔑 PERCHÉ LA TINTA NON RICHIEDE IL GIRO AL SERVER, benché arrivi da un
  //    catalogo come le due FK qui sotto: il foglietto passa già l'esito
  //    RISOLTO (`tinta: {nome, hex}`), quindi lo specchio locale è completo. E
  //    `tinteDisponibili` non va rilette perché la famiglia dipende dal
  //    `tipo_dispositivo`, che da questo foglietto non si tocca: le voci della
  //    tavolozza non possono cambiare per effetto di questo gesto. Se un domani
  //    il tipo diventasse correggibile da qui, questa riga smette di valere.
  function handleSalvato(patch: Record<string, unknown>) {
    setLavoroLocale((prev) => ({ ...prev, ...patch }))
    if ('cliente_id' in patch || 'tecnico_id' in patch) router.refresh()
  }

  // `valoreIniziale` giusto per il campo attualmente aperto (ModificaRigaSheet
  // si monta fresco per apertura — key su `campoAttivo` — quindi legge SEMPRE il
  // valore corrente di `lavoroLocale`).
  function valoreInizialePer(campo: Campo): unknown {
    switch (campo) {
      case 'consegna':
        return { data_consegna_prevista: lavoro.data_consegna_prevista, ora_consegna: lavoro.ora_consegna }
      case 'tecnico':
        return lavoro.tecnico_id ?? ''
      case 'dentista':
        return lavoro.cliente_id ?? ''
      case 'note':
        return lavoro.note_interne ?? ''
      case 'colore':
        // Il ramo «colore» non legge `valoreIniziale`: il suo corredo viaggia
        // intero nella prop `colore` (serve anche il trascritto e il gettone).
        return undefined
      case 'tinta':
        // Come il colore: il corredo del ramo «tinta» viaggia nella sua prop
        // (servono le voci del catalogo, non un valore solo).
        return undefined
    }
  }

  const pazienteTesto = lavoro.paziente_nome_snapshot ?? '—'
  const tecnicoTesto = lavoro.tecnico
    ? `${lavoro.tecnico.nome} ${lavoro.tecnico.cognome}`.trim()
    : 'Non assegnato'

  // ══ T7 (ondata B ③) — la riga «Colore» (D225②, vincolo 0B-5) ═════════════
  // I cinque esiti della riga stanno in `derivaRigaColore` (modulo puro): qui
  // si passano solo i quattro fatti che li decidono.
  //
  // 🔑 `congelata` si legge da `ddc`, e si può: la query di `page.tsx` filtra
  //    `.neq('ddc.stato','annullata')`, quindi una `ddc` presente È una
  //    dichiarazione ATTIVA — lo stesso fatto su cui le due rotte della
  //    prescrizione rispondono `congelata` (v. `correggi_typo`, V8). La riga
  //    smette allora di offrire il tocco invece di offrirne uno che tornerà
  //    sempre con un 409: una voce spenta invita comunque.
  // 🔑 `denti` e `prescrizione` sono EMBED OPZIONALI: `undefined` quando la
  //    query non li chiede. La derivazione li tratta come «nessun colore» e
  //    la riga sparisce — mai una riga vuota per un embed dimenticato.
  const rigaColore = derivaRigaColore({
    denti: lavoro.denti,
    caso: { colore_scala: lavoro.colore_scala, colore_codice: lavoro.colore_codice },
    prescrizione: lavoro.prescrizione,
    congelata: lavoro.ddc !== null,
  })

  // ══ D42 Task 7 — la riga «Tinta» (D247) ═════════════════════════════════
  //
  // 🔑 Nessun modulo di derivazione come per il colore: gli stati qui sono DUE
  //    (c'è / non c'è) più il congelamento, e la tinta non ha né provenienza né
  //    divergenza — inventare un `derivaRigaTinta` per due rami sarebbe
  //    impalcatura. Se un giorno arrivassero gli stati intermedi, il posto è
  //    accanto a `derivaRigaColore` (`lib/lavori/colore-riga-scheda.ts`).
  // 🛑 `nome` e `hex` NON stanno su `lavori`: li risolve il server col catalogo
  //    (`caricaTinteScheda`) e arrivano già pronti su `lavoro.tinta`. La scheda
  //    non interroga il catalogo dal client.
  // 🔑 `congelata` come per il colore: una DdC presente è una dichiarazione
  //    ATTIVA (la query filtra le annullate), e da lì in poi il dato è chiuso —
  //    la riga smette di offrire il tocco invece di offrirne uno che tornerà 409.
  const rigaTinta = lavoro.tinta
    ? {
        modificabile: lavoro.ddc === null,
        valore: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: spazio.s }}>
            {/* 🔵 D114 — il pallino c'è solo dove è onesto: su «Trasparente» e
                sui glitter `hex` è NULL in catalogo. Il nome c'è sempre, quindi
                il colore non è mai l'unica fonte d'informazione.
                ⚠️ `background` porta UN DATO, non un colore di marca: la regola
                «mai hex inline» riguarda i colori del sistema grafico. */}
            {lavoro.tinta.hex ? (
              <span
                data-pallino-tinta
                aria-hidden
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: raggio.pill,
                  background: lavoro.tinta.hex,
                  boxShadow: 'inset 0 0 0 1px var(--line)',
                }}
              />
            ) : null}
            {lavoro.tinta.nome}
          </span>
        ),
      }
    : null

  /**
   * L'esito del foglio «Colore», applicato allo specchio locale in UN SOLO
   * `setState`. Ogni chiave è indipendente perché una via può riuscire a metà
   * (registro scritto, colore vivo no): si applica ciò che è AVVENUTO, non
   * ciò che si sperava — chi legge la riga subito dopo deve vedere il vero.
   *
   * 🛑 `updatedAt` è il gettone di concorrenza: si tiene aggiornato o il gesto
   *    successivo prenderebbe un 409 immeritato. Stringa opaca, mai una `Date`.
   */
  function handleColoreSalvato(esito: EsitoColore) {
    setLavoroLocale((prev) => {
      const prossimo: LavoroDettaglio = { ...prev }
      if (esito.colore) {
        prossimo.colore_scala = esito.colore.scala
        prossimo.colore_codice = esito.colore.codice
      }
      if (esito.updatedAt) prossimo.updated_at = esito.updatedAt
      if (esito.trascritto !== undefined && prev.prescrizione) {
        prossimo.prescrizione = {
          ...prev.prescrizione,
          contenuto: { ...prev.prescrizione.contenuto, colore: esito.trascritto },
        }
      }
      if (esito.divergenza && prossimo.prescrizione) {
        // Voce ottimistica: basta a far passare la riga allo stato
        // «divergente» (prescritto E realizzato). Il `router.refresh()` qui
        // sotto rilegge subito quella VERA, con chi e quando dal server.
        prossimo.prescrizione = {
          ...prossimo.prescrizione,
          divergenze: [
            ...prossimo.prescrizione.divergenze,
            {
              campo: 'colore',
              motivo: 'altro',
              nota: null,
              utente_id: null,
              registrata_at: new Date().toISOString(),
            },
          ],
        }
      }
      return prossimo
    })
    // Le due rotte della prescrizione scrivono dove lo specchio locale non
    // arriva (il registro vero, chi e quando): si rilegge il server.
    if (esito.trascritto !== undefined || esito.divergenza) router.refresh()
  }

  // Dati documenti condivisi: stesso oggetto per il DocumentiSheet (mobile) e
  // per il DocumentiPannello (desktop, ≥1024). La URL firmata è già su
  // `ddc.pdf_url` (page.tsx firma al render) — nessuna fetch nuova.
  const documentiLavoro = {
    id: lavoro.id,
    numero_lavoro: lavoro.numero_lavoro,
    cliente_display: clienteDisplay(lavoro.cliente),
    haFasi: lavoro.fasi.length > 0,
    haDdc: !!lavoro.ddc,
    ddcUrl: lavoro.ddc?.pdf_url ?? undefined,
  }

  return (
    // Shell responsive (polish L1): <1024 colonna singola (mobile invariato /
    // tablet card centrata 640); ≥1024 rail di navigazione + stage 60/40
    // (variante V3 «Bilanciata»). Il layout a colonne è governato da ds-v3.css
    // (media query, non riproducibile inline).
    <div className="scheda-shell">
      <SchedaNavRail />

      <div className="scheda-stage scheda-v3-centrata">
        {/* ── Colonna principale ─────────────────────────────────────── */}
        <div className="scheda-col-main">
          {/* Header (§3.1): back ‹ · n.{numero} + pill · menu ⋯ */}
          <div className="scheda-testata">
            <TastoTondo glifo="‹" etichettaAria="Torna indietro" onClick={() => tornaIndietro(router)} />
            <span className="scheda-testata-titolo" style={{ fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)' }}>n.{lavoro.numero_lavoro}</span>
            <span className="scheda-testata-pill"><PillTempo famiglia={pill.famiglia}>{pill.testo}</PillTempo></span>
            <span style={{ flex: 1 }} />
            <TastoTondo glifo="⋯" etichettaAria="Apri menu" onClick={() => setMenuAperto(true)} />
          </div>

          {/* Banner annulla consegna (§11.1) — solo dopo una consegna effettiva. */}
          {lavoro.stato === 'consegnato' && lavoro.data_consegna_effettiva && (
            <AnnullaConsegnaBanner lavoroId={lavoro.id} dataConsegnaEffettiva={lavoro.data_consegna_effettiva} />
          )}

          {/* Tracciabilità materiali (MDR Allegato XIII, B1) — segnale sempre
              visibile, mai un toast auto-dismiss: derivato direttamente da
              `lavoro` (già presente sul prop, nessun nuovo dato da caricare). */}
          {!lavoro.tracciabilita_materiali_ok &&
            lavoro.materiali_incompleti_dettaglio &&
            lavoro.materiali_incompleti_dettaglio.length > 0 && (
              <AvvisoTracciabilita dettaglio={lavoro.materiali_incompleti_dettaglio} />
            )}

          {/* CardInfo — righe editabili come <button> (§3). Le righe con `campo`
              (dentista/consegna/tecnico) aprono ModificaRigaSheet; paziente e
              lavoro sono di sola lettura. */}
          <CardInfo>
            <RigaEditabile chiave="Dentista" valore={clienteDisplay(lavoro.cliente)} ariaAzione="Modifica dentista" onApri={() => setCampoAttivo('dentista')} />
            <RigaDato chiave="Paziente" valore={pazienteTesto} />
            <RigaLavoroDenti
              descrizione={lavoro.descrizione}
              denti={lavoro.denti_coinvolti ?? []}
              onApri={() => router.push(`/lavori/${lavoro.id}/modifica?tab=clinica`)}
            />
            {/* Colore (T7, D225②) — fra «Lavoro» e «Consegna», come la scena
                `scheda-colore` del mockup. Compare solo se un colore esiste
                davvero (vivo o trascritto); è tappabile solo dove il tocco può
                atterrare (v. `derivaRigaColore`).
                ✅ NODO SCIOLTO — D230 (gate L2, 05/08/2026). Con questa riga la
                carta arriva a SEI righe: §5.10 ne fissava cinque, e ha vinto la
                carta che Francesco ha approvato (D225②) invece della regola
                scritta prima di vederla. La spec è emendata e l'avviso di
                sviluppo che questa carta stampava a ogni render non c'è più. */}
            {rigaColore &&
              (rigaColore.modificabile ? (
                <RigaEditabile
                  chiave="Colore"
                  valore={rigaColore.valore}
                  sub={rigaColore.sub}
                  pastiglia={rigaColore.pastiglia}
                  ariaAzione="Modifica colore"
                  onApri={() => setCampoAttivo('colore')}
                />
              ) : (
                <RigaDato
                  chiave="Colore"
                  valore={rigaColore.valore}
                  sub={rigaColore.sub}
                  pastiglia={rigaColore.pastiglia}
                />
              ))}
            {/* Tinta (D42 T7, D247) — subito sotto il gemello «Colore», perché
                sono la stessa domanda su due materiali diversi. Compare SOLO
                se una tinta c'è davvero: una riga vuota su una scheda è rumore.
                🔄 D247 — NON è muta: si preme e apre il foglietto QUI, come la
                riga «Colore». Una tinta ferma accanto a un colore che si preme
                sarebbe l'unica riga morta della carta, e il rischio non è che
                l'utente non sappia come fare — è che provi, non succeda niente,
                e concluda che l'app è rotta. */}
            {rigaTinta &&
              (rigaTinta.modificabile ? (
                <RigaEditabile
                  chiave="Tinta"
                  valore={rigaTinta.valore}
                  ariaAzione="Modifica tinta"
                  onApri={() => setCampoAttivo('tinta')}
                />
              ) : (
                <RigaDato chiave="Tinta" valore={rigaTinta.valore} />
              ))}
            <RigaEditabile
              chiave="Consegna"
              valore={formattaConsegna(lavoro.data_consegna_prevista, lavoro.ora_consegna)}
              urgente={consegnaImminente(lavoro.data_consegna_prevista, oggi)}
              ariaAzione="Modifica consegna"
              onApri={() => setCampoAttivo('consegna')}
            />
            <RigaEditabile chiave="Tecnico" valore={tecnicoTesto} ariaAzione="Modifica tecnico" onApri={() => setCampoAttivo('tecnico')} />
          </CardInfo>

          {/* NotaDentista (§5.23) — nota autografa del dentista dal portale
              (Ondata 3b), sola lettura (nessun `onEspandi`). Attribuita via
              `clienteDisplay`, mai confusa con `note_interne` del lab sotto. */}
          {lavoro.note_dentista ? (
            <NotaDentista citazione={lavoro.note_dentista} dottore={clienteDisplay(lavoro.cliente)} />
          ) : null}

          {/* NotaLaboratorio — nota_interne del LAB, onesta (nessuna
              attribuzione al dentista), editabile al tap. Se assente si mostra
              l'affordance «aggiungi la prima nota» (polish L1 — D10). */}
          {lavoro.note_interne ? (
            <NotaLaboratorio testo={lavoro.note_interne} onApri={() => setCampoAttivo('note')} />
          ) : (
            <NotaLaboratorioVuota onApri={() => setCampoAttivo('note')} />
          )}

          {/* Carta album (§5.38 — componente ds CartaAlbum). Sostituisce la
              vecchia FotoStrip (§5.33, superata dalla spec il 30/07/2026): non
              più una striscia muta, ma una carta col suo titolo «Foto».
              `categoria`/`created_at` vengono diretti da `LavoroImmagine`
              (types/domain.ts) — lo stesso tipo che il server firma in
              `lavori/[id]/page.tsx`, nessuna trasformazione qui.
              ✅ T12 li ha collegati: «⤢ Apri» apre il visore, la pastiglia
              apre il foglio della categoria. I quattro strati NON stanno qui
              dentro — si montano fratelli, in coda al componente (§1.5). */}
          <CartaAlbum
            foto={fotoAlbum}
            indiceAperto={visoreIndice ?? undefined}
            onApri={(i) => {
              catturaAncora(ancoraVisoreRef)
              setVisoreIndice(i)
            }}
            onCorreggiCategoria={(i) => {
              catturaAncora(ancoraCategoriaRef)
              setCategoriaIndice(i)
            }}
          />

          {/* CardFasiV3 (§5) — se ci sono fasi */}
          {lavoro.fasi.length > 0 && <CardFasiV3 lavoroId={lavoro.id} fasi={lavoro.fasi} onErrore={(msg) => errore(msg)} />}
        </div>

        {/* ── Colonna azioni/documenti (a destra su desktop, in coda su
            mobile) ───────────────────────────────────────────────────── */}
        <div className="scheda-col-side">
          <div className="scheda-azioni">
            {/* CONSEGNA — mai nascosto, solo abilitato/disabilitato (§7.4) */}
            <TastoPrimario
              disabled={!consegnabile}
              motivoDisabilitato={motivoConsegnaDisabilitato(lavoro)}
              onClick={() => setConsegnaAperta(true)}
            >
              Consegna
            </TastoPrimario>

            {/* Rifacimento — riusa il meccanismo esistente (trigger + sheet). */}
            {mostraRifacimento && (
              <RifacimentoButton lavoroId={lavoro.id} numeroLavoro={lavoro.numero_lavoro} />
            )}

            {/* Segnala problema — solo per il tecnico */}
            {ruolo === 'tecnico' && (
              <TastoSecondario onClick={() => setSegnalaAperto(true)}>Segnala problema</TastoSecondario>
            )}
          </div>

          {/* Documenti — pannello a mattonelle SOLO desktop (≥1024). Su
              mobile/tablet i documenti restano nel bottom-sheet (menu ⋯). */}
          <DocumentiPannello lavoro={documentiLavoro} />
        </div>
      </div>

      {/* ── Sheet montati (fuori dalla griglia) ────────────────────────── */}
      {campoAttivo && (
        <ModificaRigaSheet
          key={campoAttivo}
          aperto
          onChiudi={() => setCampoAttivo(null)}
          lavoroId={lavoro.id}
          campo={campoAttivo}
          valoreIniziale={valoreInizialePer(campoAttivo)}
          onSalvato={handleSalvato}
          onErrore={(msg) => errore(msg)}
          colore={
            rigaColore
              ? {
                  // Il valore VIVO, non quello mostrato: sullo stato
                  // «divergente» senza colore vivo la riga mostra «—», che nel
                  // campo di testo sarebbe un valore da cancellare a mano.
                  valoreIniziale: rigaColore.stato === 'divergente' && rigaColore.valore === '—'
                    ? ''
                    : rigaColore.valore,
                  trascritto: rigaColore.trascritto,
                  dentista: clienteDisplay(lavoro.cliente),
                  // Da uno scostamento GIÀ a registro il gesto D212 non si
                  // ripresenta: la sua domanda («era scritto così?») è già
                  // stata fatta e risposta. Si va dritti al motivo.
                  giaDivergente: rigaColore.stato === 'divergente',
                  // 🛑 Il gettone è `lavori.updated_at` COSÌ COM'È — mai
                  //    ricostruito con `new Date()`: `timestamptz` ha i
                  //    microsecondi, `Date` di JS no, e un riparsing renderebbe
                  //    il 409 permanente.
                  updatedAt: lavoro.updated_at,
                  onSalvato: handleColoreSalvato,
                }
              : undefined
          }
          tinta={
            lavoro.tinteDisponibili && lavoro.tinteDisponibili.length > 0
              ? {
                  disponibili: lavoro.tinteDisponibili,
                  scelta: lavoro.tinta
                    ? { famiglia: lavoro.tinta.famiglia, codice: lavoro.tinta.codice }
                    : null,
                }
              : undefined
          }
        />
      )}

      <MenuSchedaSheet
        aperto={menuAperto}
        onChiudi={() => setMenuAperto(false)}
        lavoroId={lavoro.id}
        onApriDocumenti={() => {
          setMenuAperto(false)
          setDocumentiAperto(true)
        }}
      />

      {/* FlussoConsegna (Task 12/13) — il rito della consegna IN PLACE, mai
          più una navigazione a `/lavori/{id}/consegna` (pagina morta al Task
          15). `onConsegnato` fa `router.refresh()` (rilegge i join freschi);
          `onFrameChiuso` chiude E fa refresh (riserva UX #2: al back dalla
          scheda lo sheet non deve riaprirsi da solo) — `refresh` non tocca la
          history, quindi lì la chiusura è IN LOCO e l'entry dell'overlay va
          consumata normalmente. `onRisolvi` invece cambia pagina: NAVIGA PRIMA
          (`navigaDaOverlay`, che cede l'entry alla navigazione e la sostituisce)
          e chiude dopo — col vecchio `router.push` nudo il `history.back()`
          della chiusura si mangiava la navigazione e il CTA primario finiva per
          comportarsi come un annulla (D-2, riprodotto in browser il 26/07). */}
      <FlussoConsegna
        lavoroId={lavoro.id}
        numero={lavoro.numero_lavoro}
        dentista={clienteDisplay(lavoro.cliente)}
        descrizione={lavoro.descrizione}
        aperto={consegnaAperta}
        onChiudi={() => setConsegnaAperta(false)}
        onConsegnato={() => router.refresh()}
        onFrameChiuso={() => {
          setConsegnaAperta(false)
          router.refresh()
        }}
        onRisolvi={(route) => {
          navigaDaOverlay(`/lavori/${lavoro.id}/modifica?tab=${route}`)
          setConsegnaAperta(false)
        }}
      />

      <DocumentiSheet
        aperto={documentiAperto}
        onChiudi={() => setDocumentiAperto(false)}
        lavoro={documentiLavoro}
      />

      {ruolo === 'tecnico' && (
        <SegnalaProblemaSheet
          lavoroId={lavoro.id}
          numeroLavoro={lavoro.numero_lavoro}
          clienteDisplay={clienteDisplay(lavoro.cliente)}
          isOpen={segnalaAperto}
          onClose={() => setSegnalaAperto(false)}
        />
      )}

      {/* ══ T12 — i quattro strati dell'album, FRATELLI fra loro (§1.5) ══════
          🛑 Nessuno è figlio o prop di un altro: `azioni` riceve SOLO il tondo
          ⋯, e la tendina che ne esce sta qui accanto, non lì dentro.

          🔴 E SI MONTANO SEMPRE, pilotati da `aperto` — mai dentro una
          condizione che segue l'apertura. Trovato al collaudo nel browser il
          02/08: con `{fotoVisore && <VisoreFoto…>}` il visore si apriva e si
          RICHIUDEVA da solo in un battito. Il ciclo di vita dell'overlay
          finiva legato all'apertura, e in sviluppo React monta ogni componente
          due volte: entra nella storia → `pushState`, pulizia → `history.back()`,
          entra di nuovo → `pushState`; il `popstate` del back, che è asincrono,
          arrivava DOPO e `storia-overlay.ts:101` lo leggeva come un «indietro»
          dell'utente. 🔑 Gli overlay v3 rendono `null` da soli quando sono
          chiusi (`VisoreFoto.tsx:142`): montarli sempre non costa niente e
          toglie di mezzo l'intero problema. La condizione qui sotto è
          sull'ESISTENZA delle foto, che cambia solo quando l'album si svuota. */}
      {fotoAlbum.length > 0 && (
        <VisoreFoto
          aperto={visoreIndice !== null}
          foto={fotoAlbum}
          indice={visoreIndice ?? 0}
          onIndice={(i) => setVisoreIndice(i)}
          onChiudi={() => setVisoreIndice(null)}
          onCorreggiCategoria={() => {
            catturaAncora(ancoraCategoriaRef)
            setCategoriaIndice(visoreIndice)
          }}
          ancoraFocus={ancoraVisoreRef}
          azioni={
            <button
              ref={ancoraTendinaRef}
              type="button"
              className="ds-visore-tondo"
              onClick={() => setTendinaAperta(true)}
              aria-label="Altre cose da fare su questa foto"
              // I due che `TastoTondo` non ha, ed è la ragione per cui questo
              // innesco è un `<button>` scritto qui invece di quel componente.
              aria-haspopup="menu"
              aria-expanded={tendinaAperta}
              // Il ⋯ si scurisce mentre la tendina è aperta: si vede da dove è
              // uscita. 🛑 NON è l'unica fonte di quello stato — su una
              // radiografia la differenza con la faccia normale vale 1,02:1,
              // cioè è invisibile: quella vera è `aria-expanded` qui sopra.
              style={{
                ...tondoVisore,
                background: tendinaAperta ? sopraFoto.facciaAttiva : sopraFoto.faccia,
              }}
            >
              <span aria-hidden="true">⋯</span>
            </button>
          }
        />
      )}

      <TendinaMenu
        aperta={tendinaAperta && visoreIndice !== null}
        onChiudi={() => setTendinaAperta(false)}
        etichettaAria="Cose da fare su questa foto"
        ancora={ancoraTendinaRef}
        voci={
          eliminabile
            ? [
                {
                  id: 'elimina',
                  distruttiva: true,
                  icona: (
                    <>
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                    </>
                  ),
                  testo: 'Elimina foto',
                  onScegli: () => {
                    // L'àncora della conferma è il ⋯, non la voce: la voce
                    // smonta con la tendina, e un nodo staccato non riceve il
                    // focus (C-12).
                    ancoraConfermaRef.current = ancoraTendinaRef.current
                    setTendinaAperta(false)
                    setConfermaAperta(true)
                  },
                },
              ]
            : []
        }
      />

      {fotoAlbum.length > 0 && (
        <FoglioConferma
          aperto={confermaAperta}
          titolo="Elimini questa foto?"
          /* 🛑 Testo VERBATIM di §5.42, e il `<strong>` è dove la spec lo vuole:
             la clausola che pesa è «e dall'archivio» (D61). La stesura del
             29/07 diceva «il file resta conservato» ed è FALSA da D61.
             🛑 Mai «elimina definitivamente»: `v3/dizionario.ts:25` lo vieta. */
          testo={
            <>
              Sparisce dalla scheda <strong>e dall’archivio</strong>: non si recupera. Resta annotato chi
              l’ha eliminata e quando.
            </>
          }
          etichettaDistruttiva="Elimina"
          etichettaSicura="Annulla"
          distruttivaDisabilitata={eliminando}
          /* Ripiego sulla prima: a conferma chiusa questo valore non si vede
             (il componente rende `null`), ma la prop è obbligatoria e montare
             sempre è ciò che tiene lontano il difetto di sopra. */
          foto={fotoVisore ?? fotoAlbum[0]}
          ancoraFocus={ancoraConfermaRef}
          onConferma={eliminaFotoCorrente}
          onAnnulla={() => setConfermaAperta(false)}
        />
      )}

      {fotoAlbum.length > 0 && (
        <FoglioCategoria
          aperto={categoriaIndice !== null}
          quante={1}
          anteprime={fotoCategoria ? [fotoCategoria.url] : []}
          scelta={
            fotoCategoria && isCategoriaFoto(fotoCategoria.categoria) ? fotoCategoria.categoria : undefined
          }
          ancoraFocus={ancoraCategoriaRef}
          onScegli={correggiCategoria}
          onChiudi={() => setCategoriaIndice(null)}
        />
      )}
    </div>
  )
}

/**
 * NotaLaboratorio — card piccola per `note_interne` (fix round, decisione
 * Francesco: "3a pulita ora, nota-dentista in 3b"). Etichetta caption "Note
 * (laboratorio)" + testo multi-riga: MAI un nome di dottore accanto, a
 * differenza di `NotaDentista` (§5.23, quello resta per la vera nota
 * autografa del dentista in 3b). Tap → `onApri` (apre `ModificaRigaSheet
 * campo="note"`, stesso `campoAttivo` delle altre righe editabili) con
 * `whileTap`/`molla.press` come le altre superfici tappabili DS v3.
 */
function NotaLaboratorio(props: { testo: string; onApri: () => void }) {
  const { testo, onApri } = props
  return (
    <motion.button
      type="button"
      className="ds-tap-v3"
      onClick={onApri}
      whileTap={{ scale: 0.99 }}
      transition={molla.press}
      aria-label="Modifica nota del laboratorio"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spazio.xs,
        width: '100%',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: raggio.tile,
        padding: '14px 20px',
        background: 'var(--card)',
        boxShadow: 'var(--sh-card)',
      }}
    >
      <span
        style={{
          fontSize: tipografia.size.caption,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: tipografia.tracking.caption,
          textTransform: 'uppercase',
          color: 'var(--faint)',
        }}
      >
        Note (laboratorio)
      </span>
      <span
        style={{
          fontSize: tipografia.size.callout,
          fontWeight: tipografia.weight.semibold,
          color: 'var(--ink)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {testo}
      </span>
    </motion.button>
  )
}

/**
 * NotaLaboratorioVuota — affordance empty-state per la PRIMA nota del
 * laboratorio (polish L1 — D10). Prima, dalla scheda non si poteva aggiungere
 * una nota da zero: la card compariva solo se `note_interne` era già presente.
 * Stesso guscio di `NotaLaboratorio`, ma con un invito rosso all'azione; tap →
 * apre `ModificaRigaSheet campo="note"`.
 */
function NotaLaboratorioVuota(props: { onApri: () => void }) {
  return (
    <motion.button
      type="button"
      className="ds-tap-v3"
      onClick={props.onApri}
      whileTap={{ scale: 0.99 }}
      transition={molla.press}
      aria-label="Aggiungi la prima nota del laboratorio"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spazio.xs,
        width: '100%',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: raggio.tile,
        padding: '14px 20px',
        background: 'var(--card)',
        boxShadow: 'var(--sh-card)',
      }}
    >
      <span
        style={{
          fontSize: tipografia.size.caption,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: tipografia.tracking.caption,
          textTransform: 'uppercase',
          color: 'var(--faint)',
        }}
      >
        Note (laboratorio)
      </span>
      <span style={{ fontSize: tipografia.size.callout, fontWeight: tipografia.weight.bold, color: 'var(--red)' }}>
        + Aggiungi la prima nota
      </span>
    </motion.button>
  )
}

/**
 * AvvisoTracciabilita — callout MDR (Allegato XIII, tracciabilità
 * materiali/lotti). A differenza di `Avviso` (ds/Avviso, toast portalato,
 * auto-dismiss dopo 4s) questo è un blocco STATICO nel flusso della card:
 * il segnale di non-conformità deve restare visibile finché il dato non è
 * risolto, non sparire da solo. `role="alert"` + colori ambra (§DS v3 —
 * stessa famiglia di `IconaFamiglia` tipo "errore/attenzione"). Elenca ogni
 * materiale incompleto col motivo (stesso mapping/dettaglio della v2.3
 * `TracciabilitaMaterialiBanner` — nessuna perdita di segnale nel passaggio
 * a v3, anzi: qui il dato arriva già dentro `lavoro`, zero prop aggiuntive).
 */
function AvvisoTracciabilita(props: { dettaglio: MaterialeIncompletoDettaglio[] }) {
  const { dettaglio } = props
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spazio.xs,
        borderRadius: raggio.riga,
        padding: `${spazio.sm}px ${spazio.m}px`,
        background: 'var(--amber-tint)',
        border: '1px solid var(--amber)',
      }}
    >
      <span
        style={{
          fontSize: tipografia.size.callout,
          fontWeight: tipografia.weight.bold,
          color: 'var(--ink)',
        }}
      >
        Tracciabilità materiali incompleta
      </span>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {dettaglio.map((item, i) => (
          <li
            key={`${item.magazzino_id ?? 'bom'}-${i}`}
            style={{ fontSize: tipografia.size.caption, color: 'var(--muted)' }}
          >
            {item.nome_materiale} — {MOTIVO_LABEL[item.motivo]}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * RigaEditabile — una RigaDato avvolta in un `<button>` che apre l'editor
 * (§3). L'`ariaAzione` dà al bottone un nome accessibile d'azione («Modifica
 * …») invece della concatenazione chiave+valore: chiarisce allo screen reader
 * che è un controllo di modifica, non solo un dato. Per «Consegna» l'etichetta
 * accessibile è «Modifica consegna» (polish L1, WCAG 2.5.3 label-in-name: il
 * nome accessibile DEVE contenere il testo visibile "Consegna"). I test di
 * quella riga la selezionano col nome esatto «Modifica consegna» per non
 * collidere col TastoPrimario CONSEGNA (nome «Consegna»).
 */
function RigaEditabile(props: {
  chiave: string
  /** `ReactNode` e non `string` (D42 T7): la riga «Tinta» porta un pallino
   *  accanto al nome, e `RigaDato.valore` — dove questo finisce — è già un
   *  `ReactNode` (`ds/CardInfo.tsx:56`). Le altre righe passano una stringa e
   *  non cambiano di una virgola. */
  valore: ReactNode
  ariaAzione: string
  urgente?: boolean
  /** Sottotitolo 14/500 muted sotto il valore (§5.10). T7: è così che la riga
   *  «Colore» dice «scelto dal laboratorio» o «prescritto: A3». */
  sub?: string
  /** Pastiglia di provenienza (§5.10, emendamento 04/08/2026). */
  pastiglia?: { testo: string; tono: TonoPastiglia }
  onApri: () => void
}) {
  const { chiave, valore, ariaAzione, urgente, sub, pastiglia, onApri } = props
  return (
    <button
      type="button"
      className="ds-tap-v3"
      onClick={onApri}
      aria-label={ariaAzione}
      style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
    >
      <RigaDato chiave={chiave} valore={valore} urgente={urgente} sub={sub} pastiglia={pastiglia} />
    </button>
  )
}
