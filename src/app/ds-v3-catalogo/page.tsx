'use client'

// /ds-v3-catalogo — Catalogo DS v3 «Una cosa alla volta» (spec §14.2).
// UNICA pagina che monta data-ds="v3". Le sezioni dei componenti si aggiungono
// qui, task per task — il guscio (CatalogoShell) resta stabile.

import { useEffect, useSyncExternalStore } from 'react'
import { motion } from 'motion/react'
import { initSuoni } from '@/design-system/v3/sound'
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

export default function CatalogoPage() {
  const scuro = useSyncExternalStore(sottoscriviTema, temaScuro, temaScuroServer)

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

      {/* Le sezioni dei componenti arrivano qui, una per task (contratto §14.2). */}
      <SezioneCatalogo titolo="TastoPrimario" spec="§5.1 — il tasto fisico">
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

      <SezioneCatalogo titolo="Tasti secondari e vie di fuga" spec="§5.3, §5.6, §5.5">
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

      <SezioneCatalogo titolo="Pill" spec="§5.9 PillTempo/PillStato, §5.4 PillFase">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              PillTempo — quattro famiglie colore
            </p>
            <div style={{ display: 'flex', gap: spazio.s, flexWrap: 'wrap' }}>
              <PillTempo famiglia="red">OGGI · 15:00</PillTempo>
              <PillTempo famiglia="amber">DOMANI · 09:00</PillTempo>
              <PillTempo famiglia="blue">LUN · 10:30</PillTempo>
              <PillTempo famiglia="green">TRA 3 GIORNI</PillTempo>
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

      <SezioneCatalogo titolo="TastoPiu" spec="§5.2 — l'otturatore della home">
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
            Vive SOLO in basso al centro della home (L1). Il morph nel wizard
            (§8.3.2) è del sotto-progetto 3: qui c&apos;è solo la pressione fisica —
            provala dal vivo, non si vede in uno screenshot statico.
          </p>
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo titolo="Tile · Avatar · Cerca" spec="§5.12 TileScelta/TileNuovo, §5.14 Avatar, §5.13 RigaCerca">
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
        </div>
      </SezioneCatalogo>

      <SezioneCatalogo titolo="Pila · StrisciaStato" spec="§5.7 le tre pile di legge, §5.24 StrisciaStato">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.l }}>
          <div>
            <p
              style={{
                fontSize: tipografia.size.caption,
                color: 'var(--muted)',
                margin: `0 0 ${spazio.s}px`,
              }}
            >
              Le tre pile — sempre queste, sempre in quest&apos;ordine (L1)
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
              StrisciaStato — rassicurazione e attenzione
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
              <StrisciaStato>
                Hai già consegnato{' '}
                <strong style={{ color: 'var(--ink)' }}>4 lavori</strong> oggi
              </StrisciaStato>
              <StrisciaStato attenzione onClick={() => {}}>
                Firma il DdC di n.144 →
              </StrisciaStato>
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
            (vibrazione, mai suono). Il morph pila→lista (§8.3.1) è del sotto-progetto 3 — qui c&apos;è
            solo la card.
          </p>
        </div>
      </SezioneCatalogo>
    </div>
  )
}
