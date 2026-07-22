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

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { tornaIndietro } from '@/lib/nav/torna-indietro'
import { motion } from 'motion/react'
import { AvvisiProvider, useAvvisi } from '@/components/ds/Avviso'
import { NotaDentista } from '@/components/ds/NotaDentista'
import { FotoStrip } from '@/components/ds/FotoStrip'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { CardInfo, RigaDato } from '@/components/ds/CardInfo'
import { PillTempo } from '@/components/ds/Pill'
import { CardFasiV3 } from './CardFasiV3'
import { RigaLavoroDenti } from './RigaLavoroDenti'
import { ModificaRigaSheet } from './ModificaRigaSheet'
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
import { molla } from '@/design-system/v3/motion'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import type { LavoroDettaglio, MaterialeIncompletoDettaglio } from '@/types/domain'

const MOTIVO_LABEL: Record<MaterialeIncompletoDettaglio['motivo'], string> = {
  lotto_assente: 'nessun lotto disponibile in magazzino',
  bom_mancante: 'distinta base (BOM) non definita nel listino',
}

type Campo = 'consegna' | 'tecnico' | 'dentista' | 'note'

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
  const { errore } = useAvvisi()

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

  // Aggiornamento ottimistico: scalari nel merge locale, FK via router.refresh.
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
    }
  }

  const pazienteTesto = lavoro.paziente_nome_snapshot ?? '—'
  const tecnicoTesto = lavoro.tecnico
    ? `${lavoro.tecnico.nome} ${lavoro.tecnico.cognome}`.trim()
    : 'Non assegnato'

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
          <div style={{ display: 'flex', alignItems: 'center', gap: spazio.sm, paddingTop: spazio.m }}>
            <TastoTondo glifo="‹" etichettaAria="Torna indietro" onClick={() => tornaIndietro(router)} />
            <span style={{ fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)' }}>n.{lavoro.numero_lavoro}</span>
            <PillTempo famiglia={pill.famiglia}>{pill.testo}</PillTempo>
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

          {/* Strip foto read-only (§5.33 — componente ds FotoStrip) */}
          <FotoStrip foto={lavoro.immagini.map((img) => ({ id: img.id, url: img.url, alt: img.descrizione ?? undefined }))} />

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
          scheda lo sheet non deve riaprirsi da solo). `onRisolvi` chiude il
          flusso PRIMA del push verso il tab di modifica pertinente. */}
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
          setConsegnaAperta(false)
          router.push(`/lavori/${lavoro.id}/modifica?tab=${route}`)
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
  valore: string
  ariaAzione: string
  urgente?: boolean
  onApri: () => void
}) {
  const { chiave, valore, ariaAzione, urgente, onApri } = props
  return (
    <button
      type="button"
      className="ds-tap-v3"
      onClick={onApri}
      aria-label={ariaAzione}
      style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
    >
      <RigaDato chiave={chiave} valore={valore} urgente={urgente} />
    </button>
  )
}
