'use client'

// DS v3 §12.3 (Task 9) — HomeDesktop: la nav a 3 pannelli desktop (≥1024,
// mockup `home.html` `.desktop`) — nav 240px (`NavDesk`) · lista pila 400px ·
// scheda anteprima flessibile (`SchedaAnteprima`). Consuma l'ADR B6 (Candidato
// A — `docs/design/decisions/2026-07-12-spike-route-pannelli.md`): la
// selezione vive nell'URL (`?pila=`/`?lavoro=`), questo componente riceve solo
// DATI dal server (`dashboard/page.tsx`) — zero stato client duplicato.
//
// Show/hide CSS: HomeV3 monta con `className="ua-home-mobile"` (Task 7),
// questo componente si mostra SOLO da 1024 in su e nasconde la home mobile
// nello stesso breakpoint — un'unica regola, nessun doppio render lato server.
//
// Nota d'implementazione ADR (1): il contenitore scrollabile della lista porta
// `key={pilaSelezionata}` — rimonta (scrollTop 0) al cambio pila, resta
// stabile quando cambia solo `?lavoro=` (misurato nello spike: lo scrollTop
// sopravvive alla sola selezione lavoro).
//
// Ring di selezione (fix review finale item 1): il ring vive SUL nodo di
// `CardLavoro` che possiede lo sfondo opaco (prop `selezionato`) — un inset
// box-shadow su questo wrapper esterno non è MAI visibile, perché `CardLavoro`
// dipinge il proprio `background: var(--card)` sopra (le inset shadow si
// disegnano sotto i discendenti). Il wrapper qui sotto porta SOLO l'ombra
// ambiente quando la card è selezionata (`var(--sh-card)`, single-value —
// `none` in dark, innocuo da solo): combinata visivamente col ring single-value
// di `CardLavoro`, riproduce il mockup `home.html` riga 205 (light: ambiente +
// ring) / riga 219 (dark: SOLO ring). Quando non selezionata, l'ambiente vive
// già dentro `CardLavoro` (default `var(--sh-card)`) — il wrapper non aggiunge
// nulla.
//
// Riga 4 di CardLavoro (TastoConsegnaInline/Conferma): il mockup `home.html`
// `.lista-desk` NON la mostra — a 1280 l'azione CONSEGNA vive nella
// `SchedaAnteprima` (un solo posto, non duplicata nella card). Deviazione
// intenzionale dal pattern mobile (`PilaAperta`), fedele al mockup.
//
// Tastiera (ADR nota 4): un client component che fa `router.push` sugli
// STESSI URL dei `<Link>`/click — la history resta coerente per costruzione.
// `/` cerca un `<input type="text">` montato nel pannello lista (RigaCerca
// non è mai montata in questo pannello oggi — l'hook resta generico per
// quando lo sarà). L'ascolto è gated da `matchMedia('(min-width:1024px)')`:
// il componente resta montato (nascosto via CSS) anche sotto 1024, quindi
// senza il guard le scorciatoie (`n`, `/`, frecce) scatterebbero in modo
// invisibile su tablet/mobile. `Invio` si disattiva quando il focus è dentro
// una `CardLavoro` (`role="button" .ds-card-lavoro`): quell'elemento gestisce
// già da sé Invio/Spazio (apre la SELEZIONE, `?lavoro=`) — senza il guard il
// suo handler e questo listener globale (che apre `/lavori/{id}`) sparano
// entrambi sullo stesso Invio, con due `router.push` verso URL diversi nello
// stesso gesto (due voci di history per una pressione). Stesso hazard con
// `FlussoConsegna` aperto (Task 14): Invio sul «Consegna» del dialog
// scatenerebbe ANCHE il push a `/lavori/{id}` (smontando la home a metà
// flusso), e le frecce cambierebbero la selezione dietro il modal — il
// listener è disattivato in blocco finché il flusso di consegna è aperto.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavDesk } from '@/components/ds/NavDesk'
import { SchedaAnteprima } from '@/components/features/pile/SchedaAnteprima'
import { CardLavoro } from '@/components/ds/CardLavoro'
import { Vuoto } from '@/components/ds/Vuoto'
import { FlussoConsegna } from '@/components/features/lavori/consegna-v3/FlussoConsegna'
import { raggio, tipografia } from '@/design-system/v3/tokens'
// Da `pile-home-shared.ts` (Task 9), NON da `pile-home.ts`: quel file porta
// `import 'server-only'` e non può finire nel bundle client (v. nota in testa).
import { subMorph, type PileHome, type LavoroPila } from '@/lib/dashboard/pile-home-shared'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'
import type { Pila } from '@/lib/lavori/urgenza'

const LABEL: Record<Pila, string> = {
  rossa: 'Da consegnare oggi', ambra: 'Sul banco', viola: 'Da rifare / In prova', blu: 'Appena arrivati',
}
const COLORE: Record<Pila, string> = {
  rossa: 'var(--red)', ambra: 'var(--amber)', viola: 'var(--purple)', blu: 'var(--blue)',
}
// Stesse frasi di sollievo di `PilaAperta.tsx` (§5.7) — pila vuota, mai nascosta (L5).
const VUOTO: Record<Pila, { glifo: string; titolo: string; guida: string }> = {
  rossa: { glifo: '📦', titolo: 'Tutte consegnate ✓', guida: 'Nessuna consegna in sospeso in questo momento.' },
  ambra: { glifo: '☕', titolo: 'Niente sul banco', guida: 'Goditi il caffè. Al prossimo lavoro ci pensa UÀ.' },
  viola: { glifo: '🔄', titolo: 'Nessuna prova in giro', guida: 'Quando un lavoro va in prova, lo trovi qui.' },
  blu: { glifo: '📥', titolo: 'Nessun nuovo arrivo', guida: 'I lavori appena arrivati compaiono qui.' },
}

export function HomeDesktop(props: {
  pile: PileHome
  pilaSelezionata: Pila
  lavoroSelezionato: LavoroPila | null
  segnale: SegnaleStriscia
  identita?: { nome: string; lab: string } | null
}) {
  const { pile, pilaSelezionata, lavoroSelezionato, segnale, identita } = props
  const router = useRouter()
  const listaRef = useRef<HTMLDivElement>(null)
  // Task 14 — flusso di consegna POSSEDUTO da questo host (riserva arch #5),
  // stesso pattern di `PilaAperta`/`PilaSplit`: nessun `onConsegnato`, refresh
  // SOLO alla chiusura del frame (mai a metà countdown).
  const [consegnaId, setConsegnaId] = useState<string | null>(null)

  const lista = pile.liste[pilaSelezionata]
  const conteggi: Record<Pila, number> = { rossa: pile.liste.rossa.length, ambra: pile.liste.ambra.length, viola: pile.liste.viola.length, blu: pile.liste.blu.length }
  const sub = subMorph(pilaSelezionata, pile, new Date())
  const vuoto = VUOTO[pilaSelezionata]
  // Nessuna selezione esplicita (`?lavoro=`) → il primo della pila (mockup: n.147 preselezionato).
  const schedaLavoro = lavoroSelezionato ?? lista[0] ?? null
  const lavoroInConsegna = consegnaId ? lista.find((l) => l.id === consegnaId) ?? null : null

  useEffect(() => {
    // v. nota in testa al file: sotto 1024 il componente resta montato ma
    // nascosto via CSS — senza questo guard le scorciatoie sarebbero attive
    // (e invisibili) anche su tablet/mobile.
    const mq = window.matchMedia('(min-width: 1024px)')

    function onKeyDown(evento: KeyboardEvent) {
      if (!mq.matches) return
      // FlussoConsegna aperto (Task 14): il modal possiede la tastiera — v.
      // nota in testa al file (Invio duplicato sul «Consegna» del dialog,
      // frecce che cambiano selezione dietro il modal).
      if (consegnaId) return
      // Guardia modificatori (review Task 9): cmd/ctrl/alt+tasto sono
      // scorciatoie del browser/OS (cmd+n = nuova finestra, ctrl+/ …) —
      // le nostre valgono SOLO per il tasto nudo.
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return
      const target = evento.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        if (lista.length === 0) return
        evento.preventDefault()
        const indiceCorrente = schedaLavoro ? lista.findIndex((l) => l.id === schedaLavoro.id) : -1
        const prossimoIndice = evento.key === 'ArrowDown'
          ? Math.min(indiceCorrente + 1, lista.length - 1)
          : Math.max(indiceCorrente - 1, 0)
        const prossimo = lista[Math.max(prossimoIndice, 0)]
        if (prossimo) router.push(`/dashboard?pila=${pilaSelezionata}&lavoro=${prossimo.id}`)
        return
      }
      if (evento.key === 'Enter') {
        // CardLavoro (`role="button"`) gestisce già da sé Invio quando è lei
        // il target — non duplicare la navigazione (v. nota in testa al file).
        if (target?.closest('.ds-card-lavoro')) return
        if (schedaLavoro) router.push(`/lavori/${schedaLavoro.id}`)
        return
      }
      if (evento.key === 'n') {
        router.push('/lavori/nuovo')
        return
      }
      if (evento.key === '/') {
        const campo = listaRef.current?.querySelector<HTMLInputElement>('input[type="text"]')
        if (campo) { evento.preventDefault(); campo.focus() }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lista, schedaLavoro, pilaSelezionata, router, consegnaId])

  return (
    <div className="ua-home-desk">
      <style>{`
        .ua-home-desk { display: none }
        @media (min-width: 1024px) {
          .ua-home-desk { display: grid; grid-template-columns: 240px 400px 1fr; height: 100dvh; overflow: hidden }
          .ua-home-mobile { display: none }
        }
      `}</style>

      <NavDesk conteggi={conteggi} pilaSelezionata={pilaSelezionata} segnale={segnale} identita={identita} />

      <section
        key={pilaSelezionata}
        ref={listaRef}
        style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, letterSpacing: '-0.01em', color: COLORE[pilaSelezionata] }}>
            {LABEL[pilaSelezionata]}
          </span>
          {sub && <span style={{ fontSize: 14.5, fontWeight: tipografia.weight.semibold, color: 'var(--muted)' }}>{sub}</span>}
        </div>

        {lista.length === 0 ? (
          <Vuoto glifo={vuoto.glifo} titolo={vuoto.titolo} guida={vuoto.guida} />
        ) : (
          lista.map((l) => {
            const selezionato = schedaLavoro?.id === l.id
            return (
              // Wrapper — SOLO l'ombra ambiente quando selezionata (v. nota in
              // testa al file); il ring vive su `CardLavoro` (prop `selezionato`).
              <div key={l.id} style={{ borderRadius: raggio.card, boxShadow: selezionato ? 'var(--sh-card)' : undefined }}>
                <CardLavoro
                  numero={l.numero}
                  cassetta={l.cassetta}
                  dentista={l.dentista}
                  paziente={l.paziente}
                  tipoLavoro={l.tipoLavoro}
                  tempo={l.pill}
                  selezionato={selezionato}
                  onApri={() => router.push(`/dashboard?pila=${pilaSelezionata}&lavoro=${l.id}`)}
                />
              </div>
            )
          })
        )}
      </section>

      <section style={{ overflowY: 'auto' }}>
        {schedaLavoro
          ? <SchedaAnteprima lavoro={schedaLavoro} onConsegna={() => setConsegnaId(schedaLavoro.id)} />
          : <Vuoto glifo={vuoto.glifo} titolo={vuoto.titolo} guida={vuoto.guida} />}
      </section>

      {lavoroInConsegna && (
        <FlussoConsegna
          lavoroId={lavoroInConsegna.id}
          numero={lavoroInConsegna.numero}
          dentista={lavoroInConsegna.dentista}
          descrizione={lavoroInConsegna.tipoLavoro}
          aperto
          onChiudi={() => setConsegnaId(null)}
          onFrameChiuso={() => { setConsegnaId(null); router.refresh() }}
          onRisolvi={(route) => { setConsegnaId(null); router.push(`/lavori/${lavoroInConsegna.id}/modifica?tab=${route}`) }}
        />
      )}
    </div>
  )
}
