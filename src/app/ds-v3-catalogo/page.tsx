'use client'

// /ds-v3-catalogo — Catalogo DS v3 «Una cosa alla volta» (spec §14.2).
// UNICA pagina che monta data-ds="v3". Le sezioni dei componenti si aggiungono
// qui, task per task — il guscio (CatalogoShell) resta stabile.

import { useEffect, useState, useSyncExternalStore } from 'react'
import { motion } from 'motion/react'
import { initSuoni, suona } from '@/design-system/v3/sound'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'
import { molla } from '@/design-system/v3/motion'
import { SezioneCatalogo } from './CatalogoShell'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { PillTempo, PillStato } from '@/components/ds/Pill'
import { PillFase } from '@/components/ds/PillFase'
import { TastoPiu } from '@/components/ds/TastoPiu'
import { TileScelta, TileNuovo } from '@/components/ds/TileScelta'
import { RigaCerca } from '@/components/ds/RigaCerca'
import { Pila } from '@/components/ds/Pila'
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import { MorphPila } from '@/components/ds/MorphPila'
import { CardLavoro } from '@/components/ds/CardLavoro'
import { CardInfo, RigaDato } from '@/components/ds/CardInfo'
import { RigaFase } from '@/components/ds/RigaFase'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto, CampoNumero, CampoData } from '@/components/ds/Campo'
import { ChipScelta } from '@/components/ds/ChipScelta'
import { ProgressDots } from '@/components/ds/ProgressDots'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { AvvisiProvider, useAvvisi } from '@/components/ds/Avviso'
import { Skeleton } from '@/components/ds/Caricamento'
import { Vuoto } from '@/components/ds/Vuoto'
import { BarraMateriale } from '@/components/ds/BarraMateriale'
import { EroeTuttoAPosto } from '@/components/ds/EroeTuttoAPosto'
import { CardUAHaFatto } from '@/components/ds/CardUAHaFatto'
import { NotaDentista } from '@/components/ds/NotaDentista'
import { GiornoAgenda, RigaAgenda } from '@/components/ds/RigaAgenda'
import { PillVoce } from '@/components/ds/PillVoce'

// Il tema è stato ESTERNO: data-theme su <html>, posseduto da ThemeInitializer
// (root layout) che lo imposta prima dell'hydration. Lo leggiamo con
// useSyncExternalStore — niente stato locale che possa desincronizzarsi.
// SSR-safe: sul server vale il default chiaro, il client legge il DOM reale.
function sottoscriviTema(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}
const temaScuro = () => document.documentElement.getAttribute('data-theme') === 'dark'
const temaScuroServer = () => false

// Indice ancorato in testa alla pagina (§14.2): un'unica fonte per ordine +
// etichette, condivisa fra il <nav> e il test che conta le sezioni.
export const INDICE = [
  { id: 'tasto-primario', titolo: 'TastoPrimario' },
  { id: 'tasti-secondari', titolo: 'Tasti secondari e vie di fuga' },
  { id: 'tasto-piu', titolo: 'TastoPiu' },
  { id: 'pill', titolo: 'Pill' },
  { id: 'tile-avatar-cerca', titolo: 'Tile · Avatar · Cerca' },
  { id: 'pila-striscia', titolo: 'Pila · StrisciaStato' },
  { id: 'card-lavoro', titolo: 'CardLavoro' },
  { id: 'righe', titolo: 'CardInfo · RigaFase' },
  { id: 'sheet-dialog', titolo: 'Sheet · DialogConferma' },
  { id: 'avviso-skeleton-vuoto', titolo: 'Avviso · Skeleton · Vuoto' },
  { id: 'suoni', titolo: 'Suoni' },
  { id: 'campo', titolo: 'Campo' },
  { id: 'racconto', titolo: 'Il racconto' },
  { id: 'pill-voce', titolo: 'PillVoce' },
  { id: 'chip-scelta', titolo: 'ChipScelta' },
  { id: 'progress-dots', titolo: 'ProgressDots' },
] as const

// Simula le fasi di un lavoro reale (§5.11): 2 già fatte, la prossima (con
// PillFase), 1 futura — stato locale solo per rendere la spunta viva nel
// catalogo, non un pattern da riusare a monte.
const FASI_INIZIALI = [
  { nome: 'Impronta digitale', fatto: true, chiQuando: 'Francesco · lun 09:12' },
  { nome: 'Ceratura', fatto: true, chiQuando: 'Francesco · lun 15:40' },
  { nome: 'Colata', fatto: false },
  { nome: 'Rifinitura', fatto: false },
]

// Demo di §9.1: bottone SEMPLICE per l'audizione dei suoni — NON un
// TastoSecondario, che suonerebbe il suo tap built-in prima dell'onClick
// (tap+fatta insieme, tap due volte…), sporcando l'audizione e contraddicendo
// la regola «mai più di uno per gesto». Chrome del catalogo: stessa geometria
// dei tasti secondari, classe `catalogo-interattivo` per l'anello focus di
// legge (constraint 9), target ≥44px.
function TastoSuono(props: { etichetta: string; onSuona: () => void }) {
  const { etichetta, onSuona } = props
  return (
    <button
      type="button"
      className="catalogo-interattivo"
      onClick={onSuona}
      style={{
        height: 58,
        borderRadius: raggio.riga,
        border: '1px solid var(--line)',
        background: 'var(--card)',
        color: 'var(--ink)',
        fontSize: tipografia.size.body,
        fontWeight: tipografia.weight.bold,
        padding: '0 24px',
        cursor: 'pointer',
      }}
    >
      {etichetta}
    </button>
  )
}

// Demo di §5.18: chiama useAvvisi(), quindi deve stare DENTRO AvvisiProvider
// — per questo è un componente a sé e non inline nel JSX della sezione.
function DemoAvvisi() {
  const { avvisa, errore } = useAvvisi()
  return (
    <div style={{ display: 'flex', gap: spazio.m, flexWrap: 'wrap' }}>
      <TastoSecondario onClick={() => avvisa('Ho aggiornato lo stato di n.147.')}>
        Mostra un avviso
      </TastoSecondario>
      <TastoSecondario
        onClick={() =>
          errore('Non sono riuscita a salvare. Controlla la connessione e riprova.', {
            azione: { etichetta: 'Riprova', onClick: () => {} },
          })
        }
      >
        Mostra un errore
      </TastoSecondario>
    </div>
  )
}

export default function CatalogoPage() {
  const scuro = useSyncExternalStore(sottoscriviTema, temaScuro, temaScuroServer)
  const [fasi, setFasi] = useState(FASI_INIZIALI)
  const [sheetAperto, setSheetAperto] = useState(false)
  const [dialogAperto, setDialogAperto] = useState(false)
  const [sheetCampiAperto, setSheetCampiAperto] = useState(false)
  const [nomePaziente, setNomePaziente] = useState('')
  const [importo, setImporto] = useState('')
  const [dataConsegna, setDataConsegna] = useState<Date | null>(null)
  const [testoVoce, setTestoVoce] = useState('')
  const [chipTipo, setChipTipo] = useState<'corona' | 'ponte' | null>('corona')
  const [passoDemo, setPassoDemo] = useState<1 | 2 | 3>(1)

  useEffect(() => {
    initSuoni()
  }, [])

  function alternaTema() {
    // Stesso meccanismo dell'app (admin-nav/useTheme): si scrive sul DOM,
    // la UI segue via subscription — mai il contrario.
    if (temaScuro()) {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }

  return (
    <div
      data-ds="v3"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-v3)',
        padding: spazio.l,
      }}
    >
      {/* Anello focus di legge (constraint 9): 2px --blue, offset 2.
          Classe riusabile per tutto il chrome interattivo del catalogo. */}
      <style>{`
        [data-ds="v3"] .catalogo-interattivo:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spazio.m,
          marginBottom: spazio.xl,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: tipografia.size.title,
              fontWeight: tipografia.weight.extrabold,
              letterSpacing: tipografia.tracking.titoli,
              margin: 0,
            }}
          >
            Catalogo DS v3 — Una cosa alla volta
          </h1>
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: `${spazio.xs}px 0 0`,
            }}
          >
            Verifica su 3 viewport: mobile 390px · tablet 768px · desktop 1280px
          </p>
        </div>
        <motion.button
          type="button"
          className="catalogo-interattivo"
          onClick={alternaTema}
          whileTap={{ scale: 0.96 }}
          transition={molla.press}
          aria-pressed={scuro}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: `0 ${spazio.m}px`,
            borderRadius: raggio.pill,
            border: '1px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--ink)',
            fontSize: tipografia.size.callout,
            fontWeight: tipografia.weight.semibold,
            cursor: 'pointer',
          }}
        >
          Tema: {scuro ? 'scuro' : 'chiaro'}
        </motion.button>
      </header>

      {/* Indice ancorato — ordine di legge §14.2: Tasti → Pill → Tile/Avatar/Cerca →
          Pila/Striscia → CardLavoro → Righe → Sheet/Dialog → Avviso/Skeleton/Vuoto →
          Suoni → Campi → Racconto → PillVoce. Ogni voce punta all'id della SezioneCatalogo. */}
      <nav
        aria-label="Indice del catalogo"
        style={{
          marginBottom: spazio.xl,
          padding: spazio.l,
          borderRadius: raggio.card,
          background: 'var(--card)',
          border: '1px solid var(--line)',
        }}
      >
        <p
          style={{
            fontSize: tipografia.size.caption,
            letterSpacing: tipografia.tracking.caption,
            color: 'var(--muted)',
            margin: `0 0 ${spazio.s}px`,
          }}
        >
          Indice
        </p>
        <ol
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: spazio.s,
            margin: 0,
            padding: 0,
            listStyle: 'none',
          }}
        >
          {INDICE.map(({ id, titolo }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="catalogo-interattivo"
                style={{
                  display: 'inline-block',
                  padding: `${spazio.xs}px ${spazio.s}px`,
                  borderRadius: raggio.pill,
                  border: '1px solid var(--line)',
                  color: 'var(--blue)',
                  fontSize: tipografia.size.callout,
                  fontWeight: tipografia.weight.semibold,
                  textDecoration: 'none',
                }}
              >
                {titolo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Le sezioni dei componenti arrivano qui, una per task (contratto §14.2). */}
      <SezioneCatalogo id="tasto-primario" titolo="TastoPrimario" spec="§5.1 — il tasto fisico">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <TastoPrimario onClick={() => {}}>Consegna</TastoPrimario>
          <TastoPrimario disabled motivoDisabilitato="Completa il controllo finale per consegnare">
            Consegna
          </TastoPrimario>
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Corsa, molla di pressione, suono e vibrazione sono comportamenti fisici: provali dal
            vivo con un tocco reale, non si vedono in uno screenshot statico.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="tasti-secondari" titolo="Tasti secondari e vie di fuga" spec="§5.3, §5.6, §5.5">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
            <TastoSecondario onClick={() => {}}>Apri il lavoro</TastoSecondario>
            <TastoSecondario disabled onClick={() => {}}>
              Apri il lavoro
            </TastoSecondario>
          </div>

          <div style={{ display: 'flex', gap: spazio.m }}>
            <TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => {}} />
            <TastoTondo glifo="⋯" etichettaAria="Menu" onClick={() => {}} />
          </div>

          <LinkQuieto onClick={() => {}}>Aspetta, annulla la consegna</LinkQuieto>

          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            TastoTondo è riservato a back/menu nell&apos;header — nient&apos;altro. LinkQuieto è
            riservato alle vie di fuga (L6): mai per un&apos;azione che conta.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="tasto-piu" titolo="TastoPiu" spec="§5.2 rev 2 — «il punto rosso»">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <TastoPiu onClick={() => {}} />
          <TastoPiu onClick={() => {}} etichetta="Nuova scheda" />
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            «Il punto rosso» — la ghiera affiora dalla carta, il cappello
            affonda al tocco e il + rosso è l&apos;unico rosso della home (L1).
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="pill" titolo="Pill" spec="§5.9 PillTempo/PillStato, §5.4 PillFase">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              PillTempo — cinque famiglie colore
            </p>
            <div style={{ display: 'flex', gap: spazio.s, flexWrap: 'wrap' }}>
              <PillTempo famiglia="red">OGGI · 15:00</PillTempo>
              <PillTempo famiglia="amber">DOMANI · 09:00</PillTempo>
              <PillTempo famiglia="blue">LUN · 10:30</PillTempo>
              <PillTempo famiglia="green">TRA 3 GIORNI</PillTempo>
              <PillTempo famiglia="purple">IN PROVA</PillTempo>
            </div>
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              PillStato — vocabolario chiuso, tutti gli stati
            </p>
            <div style={{ display: 'flex', gap: spazio.s, flexWrap: 'wrap' }}>
              <PillStato stato="DA CONSEGNARE" />
              <PillStato stato="STA PER FINIRE" />
              <PillStato stato="IN FORNO" />
              <PillStato stato="IN RIFINITURA" />
              <PillStato stato="DA INCASSARE" />
              <PillStato stato="APPENA ARRIVATO" />
              <PillStato stato="PRONTA ✓" />
              <PillStato stato="CONSEGNATO ✓" />
              <PillStato stato="INCASSATA ✓" />
              <PillStato stato="INVIATA ✓" />
              <PillStato stato="IN PROVA" />
              <PillStato stato="FERMO" />
            </div>
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              PillFase — chiude una fase del lavoro
            </p>
            <PillFase onClick={() => {}} />
          </div>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="tile-avatar-cerca" titolo="Tile · Avatar · Cerca" spec="§5.12 TileScelta/TileNuovo, §5.14 Avatar, §5.13 RigaCerca">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 15,
            }}
          >
            <TileScelta
              nome="Studio Bianchi"
              sotto="12 lavori a giugno"
              avatar="Studio Bianchi"
              onClick={() => {}}
            />
            <TileScelta
              nome="Dr. Ferraro"
              sotto="9 lavori a giugno"
              avatar="Dr. Ferraro"
              onClick={() => {}}
            />
            <TileScelta
              nome="Dr.ssa Colombo"
              sotto="6 lavori a giugno"
              avatar="Dr.ssa Colombo"
              onClick={() => {}}
            />
            <TileScelta
              nome="Studio Russo"
              sotto="4 lavori a giugno"
              avatar="Studio Russo"
              onClick={() => {}}
            />
            <TileNuovo etichetta="Nuovo dentista" onClick={() => {}} />
          </div>
          <RigaCerca totale={14} cosa="dentisti" onApri={() => {}} />
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Il colore dell&apos;avatar è deterministico dal nome (§5.14): stesso nome, stesso
            colore, senza stato. TileScelta è una selezione (vibrazione, mai suono); TileNuovo e
            RigaCerca aprono qualcos&apos;altro.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 15,
            }}
          >
            <TileScelta
              nome="Abutment"
              nomeRiga2="personalizzato"
              sotto="3 · 30gg"
              glifo={
                // Glifo line-SVG (§4.4), MAI emoji — path Corona riusato da
                // GLIFI_FAMIGLIA/wizard.html:311 (segnaposto generico anche
                // qui: il refinement per-tipo è backlog).
                <svg
                  viewBox="0 0 24 24"
                  width="32"
                  height="32"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ color: 'var(--blue)' }}
                >
                  <path d="M4.5 8.5l3.4 3.2L12 5.5l4.1 6.2 3.4-3.2-1.6 8.5H6.1l-1.6-8.5z" />
                  <path d="M6.5 20h11" />
                </svg>
              }
              onClick={() => {}}
            />
          </div>
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Variante due-righe (`nomeRiga2`, ratificata da Francesco): riga1 + riga2 dalla
            tassonomia (Passo 2 del wizard «Nuovo lavoro»), stesso stile 17.5/700 per riga.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="pila-striscia" titolo="Pila · StrisciaStato" spec="§5.7 le quattro pile di legge (rev. 3.1), §5.24 StrisciaStato, §5.28 MorphPila">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              Le quattro pile — sempre queste, sempre in quest&apos;ordine (L1)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
              <Pila
                tipo="daConsegnare"
                numero={3}
                sub="n.147 Studio Bianchi — corona"
                onClick={() => {}}
              />
              <Pila tipo="sulBanco" numero={5} sub="n.152 Rossi — ponte" onClick={() => {}} />
              <Pila
                tipo="daRifareInProva"
                numero={1}
                sub="n.145 torna lunedì"
                onClick={() => {}}
              />
              <Pila
                tipo="appenaArrivati"
                numero={2}
                sub="n.158 Studio Verdi — impronta"
                onClick={() => {}}
              />
            </div>
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              Pila vuota — numero 0, mai nascosta (L5: il sollievo si mostra)
            </p>
            <Pila tipo="daConsegnare" numero={0} sub="Tutte consegnate ✓" onClick={() => {}} />
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              StrisciaStato — serena e allerta con CTA mai troncata
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
              <StrisciaStato forte="Tutto a posto:">
                2 consegne oggi, la prossima alle 16:00
              </StrisciaStato>
              <StrisciaStato
                attenzione
                forte="Fattura n.139"
                azione={{ etichetta: 'Sistemala ›', href: '#' }}
              >
                scartata
              </StrisciaStato>
            </div>
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              MorphPila — testata della lista aperta (§5.28), le quattro famiglie
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
              <MorphPila pila="rossa" numero={2} label="Da consegnare oggi" sub="2 lavori · il più vicino alle 16:00" />
              <MorphPila pila="ambra" numero={4} label="Sul banco" sub="4 lavori · il più vicino venerdì 10" />
              <MorphPila pila="viola" numero={1} label="Da rifare / In prova" sub="1 lavoro · torna lunedì 13" />
              <MorphPila pila="blu" numero={3} label="Appena arrivati" sub="3 lavori · l'ultimo stamattina" />
            </div>
          </div>

          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Pila è il componente più sacro dell&apos;app: tap su tutta la card = selezione
            (vibrazione, mai suono). MorphPila è lo stato finale del morph pila→lista (§8.3.1,
            sotto-progetto 3): qui è statico, l&apos;animazione condivisa arriva con la scheda.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="card-lavoro" titolo="CardLavoro" spec="§5.8 — la card nelle liste">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <CardLavoro
            numero="147"
            dentista="Studio Bianchi"
            paziente="PZ-1042"
            tipoLavoro="Corona ceramica"
            tempo={{ testo: 'OGGI · 15:00', famiglia: 'red' }}
            onApri={() => {}}
            onConsegna={() => {}}
          />
          <CardLavoro
            numero="152"
            dentista="Dr. Rossi"
            paziente="PZ-1078"
            tipoLavoro="Ponte 3 elementi"
            tempo={{ testo: 'GIOVEDÌ', famiglia: 'amber' }}
            onApri={() => {}}
          />
          <CardLavoro
            numero="158"
            dentista="Studio Verdi"
            paziente="PZ-1103"
            tipoLavoro="Impronta digitale"
            tempo={{ testo: 'APPENA ARRIVATO', famiglia: 'blue' }}
            onApri={() => {}}
          />
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            TastoConsegnaInline compare SOLO sul primo elemento della pila rossa
            (responsabilità del chiamante). `paziente` è sempre uno pseudonimo
            PZ-xxxx: la card non conosce mai un nome reale.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="righe" titolo="CardInfo · RigaFase" spec="§5.10 CardInfo/RigaDato, §5.11 RigaFase/CheckTondo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              CardInfo — 5 RigheDato, una urgente
            </p>
            <CardInfo>
              <RigaDato chiave="Consegna" valore="Domani · 09:00" urgente />
              <RigaDato chiave="Dentista" valore="Dr. Neri" sub="Studio ortodontico Neri" />
              <RigaDato chiave="Paziente" valore="PZ-1042" />
              <RigaDato chiave="Materiale" valore="Zirconia A2" sub="Disco Ø 98" />
              <RigaDato chiave="Tipo lavoro" valore="Corona ceramica" />
            </CardInfo>
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              RigaFase — le fasi di n.147, una spunta per volta
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {fasi.map((fase, indice) => {
                const prossima = !fase.fatto && fasi.slice(0, indice).every((f) => f.fatto)
                return (
                  <RigaFase
                    key={fase.nome}
                    nome={fase.nome}
                    fatto={fase.fatto}
                    chiQuando={fase.chiQuando}
                    prossima={prossima}
                    onFatta={
                      prossima
                        ? () => {
                            setFasi((correnti) =>
                              correnti.map((f) => (f.nome === fase.nome ? { ...f, fatto: true } : f))
                            )
                          }
                        : undefined
                    }
                  />
                )
              })}
            </div>
          </div>

          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Prova dal vivo il tocco su FATTA ✓: il cerchio si riempie con la coreografia
            spuntaFatta (molla.bouncy) e la riga si assesta con molla.snappy — non si vedono in
            uno screenshot statico.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="sheet-dialog" titolo="Sheet · DialogConferma" spec="§5.16 Sheet, §5.17 DialogConferma">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <div style={{ display: 'flex', gap: spazio.m, flexWrap: 'wrap' }}>
            <TastoSecondario onClick={() => setSheetAperto(true)}>Apri lo sheet</TastoSecondario>
            <TastoSecondario onClick={() => setDialogAperto(true)}>Butta via il lavoro</TastoSecondario>
          </div>
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Sheet: sale dal basso con molla.smooth, grabber, scrim e LinkQuieto «Chiudi» sempre
            in fondo — mai una X come unica uscita. DialogConferma: l&apos;unica card centrata
            ammessa, riservata alle conferme distruttive con l&apos;oggetto esplicito nel testo.
          </p>
        </div>

        <Sheet aperto={sheetAperto} onChiudi={() => setSheetAperto(false)} titolo="Dettagli lavoro n.147">
          <RigaDato chiave="Dentista" valore="Studio Bianchi" />
          <RigaDato chiave="Paziente" valore="PZ-1042" />
          <RigaDato chiave="Consegna" valore="Domani · 09:00" urgente />
        </Sheet>

        <DialogConferma
          aperto={dialogAperto}
          titolo="Sei sicuro?"
          testo="Butto via il lavoro n.148 di Studio Bianchi?"
          etichettaSicura="No, tienilo"
          etichettaDistruttiva="Sì, buttalo via"
          onAnnulla={() => setDialogAperto(false)}
          onConferma={() => setDialogAperto(false)}
        />
      </SezioneCatalogo>

      <SezioneCatalogo id="avviso-skeleton-vuoto" titolo="Avviso · Skeleton · Vuoto" spec="§5.18 Avviso, §5.25 Caricamento, §5.26 Vuoto">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              Avviso — normale sparisce da solo dopo 4s (sospeso su hover/focus), errore resta
              finché non lo chiudi
            </p>
            <AvvisiProvider>
              <DemoAvvisi />
            </AvvisiProvider>
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              Skeleton — stessa geometria di CardLavoro (niente spinner)
            </p>
            <Skeleton altezze={[24, 20, 17]} />
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              Vuoto — mai una pagina bianca
            </p>
            <Vuoto
              glifo="☕"
              titolo="Nessun lavoro sul banco"
              guida="Goditi il caffè: qui non c'è niente da fare adesso."
            />
          </div>

          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            L&apos;avviso di errore suona («errore.wav») alla comparsa — l&apos;unico suono di
            questo componente. Lo Skeleton mostra «Un attimo…» solo oltre i 3s: provalo dal vivo,
            non si vede in uno screenshot statico.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="suoni" titolo="Suoni" spec="§9.1 — la palette, cinque suoni, chiusa">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
            <TastoSuono etichetta="Tap" onSuona={() => suona('tap')} />
            <p style={{ fontSize: tipografia.size.caption, color: 'var(--muted)', margin: 0 }}>
              Suona ogni volta che premi un tasto fisico, dal più semplice bottone alla spunta di
              una fase: quasi impercettibile, è il tocco di legno di ogni gesto.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
            <TastoSuono etichetta="Fatta" onSuona={() => suona('fatta')} />
            <p style={{ fontSize: tipografia.size.caption, color: 'var(--muted)', margin: 0 }}>
              Suona quando segni una fase del lavoro come fatta.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
            <TastoSuono etichetta="UÀ — la firma" onSuona={() => suona('ua')} />
            <p style={{ fontSize: tipografia.size.caption, color: 'var(--muted)', margin: 0 }}>
              Suona alla consegna di un lavoro — la firma sonora di UÀ, due note calde che
              salgono: l&apos;unico suono della palette, più lungo di tutti gli altri.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
            <TastoSuono etichetta="Errore" onSuona={() => suona('errore')} />
            <p style={{ fontSize: tipografia.size.caption, color: 'var(--muted)', margin: 0 }}>
              Suona quando qualcosa non va a buon fine, come un tentativo di scrittura che
              fallisce — un tonfo smorzato, mai squillante.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
            <TastoSuono etichetta="Arrivo" onSuona={() => suona('arrivo')} />
            <p style={{ fontSize: tipografia.size.caption, color: 'var(--muted)', margin: 0 }}>
              Suona quando arriva un lavoro nuovo o un messaggio dal portale del dentista.
            </p>
          </div>

          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Cinque suoni, palette chiusa (§9.1): mai uno fuori da questi, mai più di uno per
            gesto. UÀ e Arrivo non hanno un altro innesco nel catalogo — qui sono gli unici punti
            per ascoltarli entrambi.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo id="campo" titolo="Campo" spec="§5.27 — CampoTesto, CampoNumero, CampoData">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <TastoSecondario onClick={() => setSheetCampiAperto(true)}>
            Apri la scheda nuovo lavoro
          </TastoSecondario>
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            I tre campi vivono SOLO dentro wizard e sheet (§5.27), mai in una lista o in una
            card di sola lettura: qui sono dentro uno sheet demo, come da regola d&apos;uso.
            CampoData non mostra mai un calendario a griglia come impostazione predefinita — solo
            scelte rapide, più «Scegli…» per il calendario nativo del telefono.
          </p>
        </div>

        <Sheet
          aperto={sheetCampiAperto}
          onChiudi={() => setSheetCampiAperto(false)}
          titolo="Nuovo lavoro"
        >
          <CampoTesto
            label="Nome paziente"
            valore={nomePaziente}
            onCambia={setNomePaziente}
            placeholder="Es. PZ-1042"
          />
          <CampoNumero label="Importo" valore={importo} onCambia={setImporto} suffisso="€" />
          <CampoData label="Consegna" valore={dataConsegna} onCambia={setDataConsegna} />
        </Sheet>
      </SezioneCatalogo>

      <SezioneCatalogo
        id="racconto"
        titolo="Il racconto"
        spec="§5.20 BarraMateriale, §5.21 EroeTuttoAPosto, §5.22 CardUAHaFatto, §5.23 NotaDentista, §5.19 GiornoAgenda/RigaAgenda"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              BarraMateriale — le tre soglie di legge (verde · ambra · rosso)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
              <BarraMateriale
                nome="Zirconia A2"
                quantita="68%"
                percento={68}
                nota="Scorta abbondante"
              />
              <BarraMateriale
                nome="Resina B1"
                quantita="28%"
                percento={28}
                nota="Valuta un ordine entro la settimana"
              />
              <BarraMateriale
                nome="Dischi ceramici"
                quantita="8%"
                percento={8}
                nota="Rimangono 2 dischi"
                onRiordina={() => {}}
              />
            </div>
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              EroeTuttoAPosto — il sollievo si mostra (L5)
            </p>
            <EroeTuttoAPosto
              titolo="Fatture: tutto a posto"
              righe={['12 fatture inviate questo mese', '€3.240 incassati']}
            />
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              CardUAHaFatto — dopo una consegna multipla
            </p>
            <CardUAHaFatto
              voci={[
                { nome: 'DdC firmato e archiviato', sub: 'n.147 · Studio Bianchi' },
                { nome: 'Fattura inviata ✓', sub: 'n.147 · SDI' },
                { nome: 'WhatsApp inviato al paziente', sub: 'Link ritiro' },
              ]}
            />
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              NotaDentista — l&apos;unico residuo del mondo-chat
            </p>
            <NotaDentista
              citazione="Il colore deve essere leggermente più chiaro rispetto al campione"
              dottore="Dr. Marchetti"
              onEspandi={() => {}}
            />
          </div>

          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              GiornoAgenda · RigaAgenda — OGGI, una consegna e un ritiro
            </p>
            <GiornoAgenda etichetta="OGGI" oggi>
              <RigaAgenda
                orario="09:00"
                cosa="Consegna corona ceramica"
                sub="Studio Bianchi · n.147"
                tipo="CONSEGNA"
                onClick={() => {}}
              />
              <RigaAgenda
                orario="14:30"
                cosa="Ritiro impronte digitali"
                sub="Dr.ssa Greco"
                tipo="RITIRO"
              />
            </GiornoAgenda>
          </div>

          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Le soglie di BarraMateriale sono decise internamente dal componente, mai passate dal
            chiamante. RIORDINA compare SOLO sotto il 15% e solo se il chiamante passa
            `onRiordina`. NotaDentista è l&apos;unico posto dell&apos;app che assomiglia a una
            chat — non lo diventa mai.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo
        id="pill-voce"
        titolo="PillVoce"
        spec="§5.15 rev 2 — «la pill di carta»: l'input vocale, progressive enhancement"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m, maxWidth: 360 }}>
          <PillVoce onTesto={setTestoVoce} />
          {testoVoce && (
            <p style={{ fontSize: tipografia.size.callout, color: 'var(--ink)', margin: 0 }}>
              Ho capito: <strong>{testoVoce}</strong>
            </p>
          )}
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Si mostra solo se il browser ha il riconoscimento vocale (Web Speech API) — niente
            qui è un problema, è la pill che sceglie di non esistere. Vive in fondo a ogni passo
            del wizard (sotto-progetto 3): qui è isolata per provarla dal vivo con un tocco reale.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo
        id="chip-scelta"
        titolo="ChipScelta"
        spec="§5.31 — chip di decisione rapida del wizard, un solo posto per l'anatomia (W2)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <div style={{ display: 'flex', gap: spazio.s, flexWrap: 'wrap' }}>
            <ChipScelta selezionata={chipTipo === 'corona'} onClick={() => setChipTipo('corona')}>
              Corona
            </ChipScelta>
            <ChipScelta selezionata={chipTipo === 'ponte'} onClick={() => setChipTipo('ponte')}>
              Ponte
            </ChipScelta>
          </div>
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Non selezionata: faccia var(--card) + ombra press. Selezionata: sfondo
            var(--green-tint), testo var(--green) e un check disegnato (SVG, mai solo
            colore — L3), SENZA ombra. CampoData (§5.27, sezione «Campo» qui sopra) la
            usa già per Oggi/Domani/Lun/Scegli…: questa è l&apos;unica anatomia, non una
            copia.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo
        id="progress-dots"
        titolo="ProgressDots"
        spec="§5.32 — testata dei 3 passi di scelta del wizard (dentista → tipo lavoro → paziente)"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <ProgressDots passo={passoDemo} />
          <div style={{ display: 'flex', gap: spazio.s }}>
            <TastoSecondario onClick={() => setPassoDemo(1)}>Passo 1</TastoSecondario>
            <TastoSecondario onClick={() => setPassoDemo(2)}>Passo 2</TastoSecondario>
            <TastoSecondario onClick={() => setPassoDemo(3)}>Passo 3</TastoSecondario>
          </div>
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            3 dot Ø 11, gap 8: quelli prima del passo attuale sono verdi (fatti), quello
            attuale è largo 30px e rosso (l&apos;unico rosso sanzionato dei passi di
            scelta, §7.3), quelli dopo restano neutri. Un solo elemento con role
            «img» racconta il passo a uno screen reader — i tre dot sono decorativi.
          </p>
        </div>
      </SezioneCatalogo>

      <footer
        style={{
          marginTop: spazio.xl,
          padding: `${spazio.l}px 0`,
          textAlign: 'center',
          fontSize: tipografia.size.caption,
          color: 'var(--muted)',
        }}
      >
        DS v3 «Una cosa alla volta» — catalogo componenti · luglio 2026
      </footer>
    </div>
  )
}
