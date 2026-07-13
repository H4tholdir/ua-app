'use client'

// Ondata 3a Task 6 — SchedaLavoroV3: il corpo client della scheda-vista v3.
// Orchestra i pezzi dei Task 1-5 (pill di stato, CardFasiV3, ModificaRigaSheet,
// MenuSchedaSheet, DocumentiSheet) attorno ai componenti DS v3 (TastoTondo,
// TastoPrimario, TastoSecondario, CardInfo/RigaDato, PillTempo, Avviso) più
// `NotaLaboratorio` (locale a questo file — vedi nota sotto). Nessuna nuova
// API, nessun editing avanzato: le voci pesanti del menu e la scheda di
// fabbricazione restano dei rami già esistenti (§3, §7.1).
//
// Aggiornamento ottimistico (piano §Task 6): `lavoroLocale` parte dai props;
// `onSalvato(patch)` di ModificaRigaSheet fonde il patch nello stato locale per
// i campi SCALARI (note_interne, data/ora consegna). Per le FOREIGN KEY
// (cliente_id, tecnico_id) il nome mostrato vive in un join lato server — non lo
// si ricostruisce a mano: si chiama `router.refresh()` così la pagina rilegge i
// join. Il merge locale del FK grezzo è innocuo (nessuno lo legge prima del
// refresh) e tiene la funzione una sola riga.
//
// Nota su AvvisiProvider: NON è montato nel layout `(app)` (solo catalogo e
// wizard lo montano), e questo componente è renderizzato da solo anche nei test.
// Quindi si auto-avvolge: `SchedaLavoroV3 = <AvvisiProvider><Corpo/></...>`, e
// il Corpo consuma `useAvvisi()` per gli errori (L6).
//
// Nota su `note_interne` (fix round — decisione Francesco 13/07: "3a pulita
// ora, nota-dentista in 3b"): lo schema NON ha un campo di testo libero "nota
// del dentista" (esiste solo `richiedente_nome`, un nome). L'unico testo
// libero sul lavoro è `note_interne`, la nota PRIVATA del laboratorio
// («visibile solo al laboratorio» — vedi TabDati.tsx). La prima versione di
// questo file la mostrava dentro `NotaDentista` (§5.23) con
// `dottore={clienteDisplay(...)}`: attribuiva al dentista una nota che il
// dentista non ha mai scritto — misattribuzione corretta qui. `NotaLaboratorio`
// (sotto) la mostra onestamente come nota del LAB, senza alcun nome di dottore,
// tap → apre lo stesso `ModificaRigaSheet campo="note"` delle altre righe. Il
// componente DS `NotaDentista` resta nel codebase intatto per la Ondata 3b,
// quando arriverà un vero campo `note_dentista` autografo dal portale.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { AvvisiProvider, useAvvisi } from '@/components/ds/Avviso'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { CardInfo, RigaDato } from '@/components/ds/CardInfo'
import { PillTempo } from '@/components/ds/Pill'
import { CardFasiV3 } from './CardFasiV3'
import { ModificaRigaSheet } from './ModificaRigaSheet'
import { MenuSchedaSheet } from './MenuSchedaSheet'
import { DocumentiSheet } from './DocumentiSheet'
import { RifacimentoButton } from '@/components/features/lavori/RifacimentoButton'
import { SegnalaProblemaSheet } from '@/components/features/lavori/SegnalaProblemaSheet'
import { AnnullaConsegnaBanner } from '@/components/features/lavori/AnnullaConsegnaBanner'
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

/** Consegna imminente (oggi o domani) o già scaduta → valore in rosso (§5.10:
 * `urgente` riservato SOLO alla consegna imminente, mai altri significati). */
function consegnaImminente(data: string, oggi: Date): boolean {
  const [y, m, d] = data.split('-').map(Number)
  if (!y || !m || !d) return false
  const target = new Date(y, m - 1, d).getTime()
  const oggiZero = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate()).getTime()
  return Math.round((target - oggiZero) / MS_GIORNO) <= 1
}

export function SchedaLavoroV3(props: { lavoro: LavoroDettaglio; ruolo?: string | null }) {
  return (
    <AvvisiProvider>
      <SchedaLavoroV3Corpo {...props} />
    </AvvisiProvider>
  )
}

function SchedaLavoroV3Corpo(props: { lavoro: LavoroDettaglio; ruolo?: string | null }) {
  const { ruolo } = props
  const router = useRouter()
  const { errore } = useAvvisi()

  const [lavoroLocale, setLavoroLocale] = useState<LavoroDettaglio>(props.lavoro)
  const [campoAttivo, setCampoAttivo] = useState<Campo | null>(null)
  const [menuAperto, setMenuAperto] = useState(false)
  const [documentiAperto, setDocumentiAperto] = useState(false)
  const [segnalaAperto, setSegnalaAperto] = useState(false)

  const lavoro = lavoroLocale
  const oggi = new Date()
  const pill = pillStatoScheda(lavoro, oggi)
  const consegnabile = derivaUrgenza(lavoro, oggi).consegnabile
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

  return (
    <div
      className="scheda-v3-centrata"
      style={{ display: 'flex', flexDirection: 'column', gap: spazio.m, padding: `0 ${spazio.ml}px ${spazio.xl}px` }}
    >
      {/* Header (§3.1): back ‹ · n.{numero} + pill · menu ⋯ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: spazio.sm, paddingTop: spazio.m }}>
        <TastoTondo glifo="‹" etichettaAria="Torna ai lavori" onClick={() => router.push('/lavori')} />
        <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--ink)' }}>n.{lavoro.numero_lavoro}</span>
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
        <RigaDato chiave="Lavoro" valore={lavoro.descrizione} />
        <RigaEditabile
          chiave="Consegna"
          valore={formattaConsegna(lavoro.data_consegna_prevista, lavoro.ora_consegna)}
          urgente={consegnaImminente(lavoro.data_consegna_prevista, oggi)}
          ariaAzione="Modifica scadenza"
          onApri={() => setCampoAttivo('consegna')}
        />
        <RigaEditabile chiave="Tecnico" valore={tecnicoTesto} ariaAzione="Modifica tecnico" onApri={() => setCampoAttivo('tecnico')} />
      </CardInfo>

      {/* NotaLaboratorio — nota_interne del LAB, onesta (nessuna attribuzione
          al dentista), editabile al tap. Vedi nota in testa al file. Mostrata
          solo se presente — l'aggiunta di una prima nota da vuoto resta un
          follow-up (vedi report Task 6: le altre righe editabili hanno un
          "vuoto" testuale tipo "Non assegnato", la nota no). */}
      {lavoro.note_interne && (
        <NotaLaboratorio testo={lavoro.note_interne} onApri={() => setCampoAttivo('note')} />
      )}

      {/* Strip foto read-only (§7.4) */}
      {lavoro.immagini.length > 0 && (
        <div style={{ display: 'flex', gap: spazio.s, overflowX: 'auto', paddingBottom: 2 }} aria-label="Foto del lavoro">
          {lavoro.immagini.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element -- URL Storage firmata a dimensioni variabili (stessa scelta di TabImmagini.tsx), next/image non applicabile
            <img
              key={img.id}
              src={img.url}
              alt={img.descrizione ?? 'Foto del lavoro'}
              style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 12, objectFit: 'cover', background: 'var(--bg-deep)' }}
            />
          ))}
        </div>
      )}

      {/* CardFasiV3 (§5) — se ci sono fasi */}
      {lavoro.fasi.length > 0 && <CardFasiV3 lavoroId={lavoro.id} fasi={lavoro.fasi} onErrore={(msg) => errore(msg)} />}

      {/* CONSEGNA — mai nascosto, solo abilitato/disabilitato (§7.4) */}
      <TastoPrimario
        disabled={!consegnabile}
        motivoDisabilitato="Completa il controllo finale per consegnare"
        onClick={() => router.push(`/lavori/${lavoro.id}/consegna`)}
      >
        Consegna
      </TastoPrimario>

      {/* Rifacimento — riusa il meccanismo esistente (trigger + sheet motivo). */}
      {mostraRifacimento && (
        <RifacimentoButton lavoroId={lavoro.id} numeroLavoro={lavoro.numero_lavoro} />
      )}

      {/* Segnala problema — solo per il tecnico */}
      {ruolo === 'tecnico' && (
        <TastoSecondario onClick={() => setSegnalaAperto(true)}>Segnala problema</TastoSecondario>
      )}

      {/* ── Sheet montati ─────────────────────────────────────────────── */}
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

      <DocumentiSheet
        aperto={documentiAperto}
        onChiudi={() => setDocumentiAperto(false)}
        lavoro={{
          id: lavoro.id,
          numero_lavoro: lavoro.numero_lavoro,
          cliente_display: clienteDisplay(lavoro.cliente),
          haFasi: lavoro.fasi.length > 0,
          haDdc: !!lavoro.ddc,
          // La URL firmata è già valorizzata su `ddc.pdf_url` lato server
          // (page.tsx firma con getSignedUrl al render) — nessuna nuova fetch.
          ddcUrl: lavoro.ddc?.pdf_url ?? undefined,
        }}
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
 * accessibile è «Modifica scadenza» di proposito — evita di ripetere la parola
 * "Consegna", che altrimenti colliderebbe col nome del TastoPrimario CONSEGNA.
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
      onClick={onApri}
      aria-label={ariaAzione}
      style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
    >
      <RigaDato chiave={chiave} valore={valore} urgente={urgente} />
    </button>
  )
}
