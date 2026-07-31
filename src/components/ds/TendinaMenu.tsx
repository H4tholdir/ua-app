'use client'

// DS v3 §5.40 — TendinaMenu: la tendina ancorata ai tre puntini del visore,
// variante M2 (D78, scelta di Francesco contro la raccomandazione, coi due
// costi dichiarati). È il secondo dei quattro strati sopra la pagina.
//
// ── Perché questo componente esiste, e cosa gli tocca pagare ───────────────
// In casa NON esisteva: l'app usa fogli, non tendine. Quindi qui si rifà da
// zero ciò che `Sheet` ha già — ruoli, tastiera, portale, storia, blocco dello
// scorrimento — ed è esattamente uno dei due costi che D78 aveva dichiarato.
//
// ── La voce distruttiva va IN FONDO, e la ragione NON è il pollice (D78) ───
// La mitigazione della scelta M2 è la POSIZIONE: il fondo è il punto più
// lontano dal dito che ha appena toccato il ⋯, quindi il più difficile da
// centrare per sbaglio. 🛑 NON è «in fondo c'è il pollice»: ancorata sotto il
// ⋯, questa tendina vive nel terzo ALTO dello schermo (il suo fondo sta a
// ~220px su 844), cioè lontanissimo dal pollice. Quella ragione era scritta in
// una stesura precedente della spec, è FALSA, ed è stata tolta: una ragione
// sbagliata incisa in una spec viene ricitata.
// 🔑 E la posizione la decide QUESTO componente, non il chiamante: la voce si
// dichiara (`distruttiva: true`) e finisce in fondo da sé. Se dipendesse
// dall'ordine dell'array, la mitigazione dipenderebbe da chi chiama — cioè non
// sarebbe una mitigazione.
//
// ── `MenuVoce` NON si riusa, ed è misurato (F-6) ───────────────────────────
// `src/components/ds/MenuVoce.tsx` è un `<button>` SENZA `role="menuitem"`, e
// il chevron lo mostra sempre quando non è `disabled` — anche sulla variante
// distruttiva, dove la sua stessa legge visiva (mockup `scheda-lavoro.html`,
// `.menu-voce.butta`) non ce l'ha. Ha quattro siti veri e non si tocca da qui:
// l'anatomia di §5.34 si COPIA (min-height 56, icona Ø38 raggio 11, testo
// body/700, separatore 1.5 `var(--line)`).
// 🔑 E i separatori li mette il CONTENITORE, che conosce la posizione — è la
// riga che MenuVoce si è scritta in testa, e il contenitore qui siamo noi.
//
// ── `Tab` CHIUDE: qui la trappola del focus NON ci va (§1.6, D85) ──────────
// Questo pannello è `role="menu"` e NON porta `aria-modal`: nel modello del
// menù un solo elemento sta nella sequenza del `Tab`, e a muoversi fra le voci
// sono ↑ e ↓. Incollarci sopra la trappola dei tre dialoghi sarebbe montare due
// modelli diversi sullo stesso pannello. 🔑 E l'`Escape` regge lo stesso per
// costruzione: il ⋯ vive dentro `VisoreFoto`, che la trappola ce l'ha — dopo il
// `Tab` il focus è dentro lo strato di sotto, mai sul `body`.
//
// ── Blocca lo scorrimento SEMPRE, anche se sotto blocca già il visore (D84) ─
// Il contatore di `blocca-scorrimento.ts` regge due bloccanti sovrapposti per
// costruzione. La vecchia riga «non blocca, lo blocca già il visore» legava la
// correttezza di questo componente a CHI C'È SOTTO: un componente che blocca
// a volte è un componente che indovina.
//
// ── L'ombra è una DEROGA DICHIARATA a §3 (D88) ─────────────────────────────
// «L'elevazione è una superficie più chiara, mai un'ombra; nessuna shadow in
// dark» presuppone una superficie d'app di luminanza NOTA da cui affiorare.
// Sotto questa tendina c'è una fotografia qualunque — una radiografia bianca,
// una guida colore sovraesposta — e nessun «più chiaro» si stacca da entrambe.
// Seconda eccezione del sistema dopo l'alone della ghiera di `TastoPiu`.
//
// ── Il pressed passa dal CSS, e la ragione è tecnica ───────────────────────
// §5.40 dice «la voce si scurisce di un tono, `molla.press`». Motion NON
// interpola le variabili CSS, e la «REGOLA MOTION — ASSOLUTA» vieta di
// inventare un colore intermedio che nessun token esprime: il cambio di faccia
// sta quindi in `:active` (istantaneo, nessuna durata inventata) e usa i token
// di casa. In tutto il DS v3 il pressed animato da Motion è sempre geometrico
// (`y`/`scale`), mai un colore — e §5.40 qui non chiede nessuno spostamento.

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { istantaneo, molla, useReducedMotion } from '@/design-system/v3/motion'
import { raggio, sopraFoto, spazio, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'
import { entraOverlay, esciOverlay } from '@/components/ds/storia-overlay'
import { bloccaScorrimento } from '@/components/ds/blocca-scorrimento'
import { useTapScrim } from '@/components/ds/useTapScrim'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'

const LARGHEZZA = 260
const ALTEZZA_VOCE = 56
const LATO_ICONA = 38
const RAGGIO_ICONA = raggio.riga - 7 // = 11, §5.34. Mai l'11 nudo: `raggio` non ce l'ha.
const LINEA = 1.5

export type VoceTendina = {
  /** Chiave stabile della voce: l'ordine a schermo NON è quello dell'array
   *  (la distruttiva va in fondo), quindi l'indice non farebbe da chiave. */
  id: string
  /** I `<path>` grezzi: il tag `<svg>` con stroke e linecap vive una volta
   *  sola, qui dentro (stesso schema di `MenuVoce`). */
  icona: ReactNode
  testo: string
  /** Si DICHIARA, non si posiziona: il componente la mette in fondo da sé. */
  distruttiva?: boolean
  disabled?: boolean
  onScegli: () => void
}

export function TendinaMenu(props: {
  aperta: boolean
  voci: VoceTendina[]
  onChiudi: () => void
  /** Il nome del pannello, in parole del banco: questo componente non ha testo
   *  proprio, nemmeno per i lettori di schermo. */
  etichettaAria: string
  /** Il ⋯ da cui la tendina è uscita: ne decide la POSIZIONE e riceve indietro
   *  il focus alla chiusura. Uno solo, non due props: sono lo stesso elemento. */
  ancora: RefObject<HTMLElement | null>
}) {
  const { aperta, voci, onChiudi, etichettaAria, ancora } = props
  const reduced = useReducedMotion()
  const vociRef = useRef<Array<HTMLButtonElement | null>>([])
  const [posizione, setPosizione] = useState<{ top: number; right: number } | null>(null)

  const viva = aperta && voci.length > 0

  // Le voci NON distruttive nell'ordine del chiamante, le distruttive in fondo
  // nel loro. `filter` è stabile, quindi l'ordine relativo non si perde.
  const ordinate = [...voci.filter((v) => !v.distruttiva), ...voci.filter((v) => v.distruttiva)]

  // `onChiudi` è quasi sempre una chiusura inline ricreata a ogni render del
  // chiamante: se gli effect ne dipendessero, si ri-registrerebbero a ogni
  // render invece che una volta per apertura (modello `VisoreFoto.tsx:105-117`).
  const onChiudiRef = useRef(onChiudi)
  useEffect(() => {
    onChiudiRef.current = onChiudi
  }, [onChiudi])

  useEffect(() => {
    if (!viva) return
    // 🛑 `'uaSheet'` e non una marca nuova: `Marca` è un'unione chiusa e non
    // esportata, e senza registrarsi «indietro» chiuderebbe IL VISORE invece
    // del menù.
    const token = entraOverlay('uaSheet', () => onChiudiRef.current())
    return () => esciOverlay(token)
  }, [viva])

  useEffect(() => {
    if (!viva) return
    return bloccaScorrimento()
  }, [viva])

  // La misura si prende PRIMA del paint: con un `useEffect` normale la tendina
  // comparirebbe per un fotogramma nel suo ripiego e poi salterebbe al suo posto.
  useIsomorphicLayoutEffect(() => {
    const tondo = viva ? ancora.current : null
    if (!tondo) {
      setPosizione(null)
      return
    }
    const r = tondo.getBoundingClientRect()
    setPosizione({
      top: r.bottom + spazio.m,
      // Allineata al bordo destro DEL ⋯ (non dello schermo): è da lì che esce,
      // ed è lì che `transformOrigin: '100% 0'` la fa crescere.
      right: window.innerWidth - r.right,
    })
  }, [viva, ancora])

  useEffect(() => {
    if (!viva) return
    // Catturato all'apertura: se il ref si svuotasse nel frattempo, la cleanup
    // non avrebbe più nessuno a cui restituire il focus (stessa scelta di
    // `trappolaFocus`, che qui NON si usa — v. il commento di testa).
    const tondo = ancora.current
    if (!tondo && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[TendinaMenu] `ancora.current` è vuoto all\'apertura: la tendina non sa dove ancorarsi e alla chiusura il focus non tornerà a nessuno (§5.40).'
      )
    }
    vociRef.current[0]?.focus()
    return () => {
      tondo?.focus()
    }
  }, [viva, ancora])

  useEffect(() => {
    if (!viva) return
    // 🛑 In CATTURA: `scroll` non risale l'albero, quindi un ascolto in risalita
    // non vedrebbe MAI muoversi un antenato. Su questa superficie non si accende
    // (il ⋯ vive nel capo fisso del visore, e il corpo è bloccato): resta come
    // rete per il giorno in cui la tendina venisse ancorata a qualcosa che
    // scorre davvero — una tendina ancorata non insegue il suo àncora.
    const alloScorrimento = () => onChiudiRef.current()
    window.addEventListener('scroll', alloScorrimento, true)
    return () => window.removeEventListener('scroll', alloScorrimento, true)
  }, [viva])

  const tapVelo = useTapScrim(viva, () => onChiudiRef.current())

  if (typeof document === 'undefined') return null
  if (!viva) return null

  function vai(indice: number) {
    const bottoni = vociRef.current
    // 🛑 Senza avvolgere (§5.40): ai capi ci si ferma, non si riparte dall'altro.
    const limite = Math.min(Math.max(indice, 0), bottoni.length - 1)
    bottoni[limite]?.focus()
  }

  function indiceCorrente(): number {
    const trovato = vociRef.current.findIndex((el) => el === document.activeElement)
    return trovato < 0 ? 0 : trovato
  }

  function scegli(v: VoceTendina) {
    // Nessun suono: il ⋯ è un `TastoTondo` che suona già per conto suo, e §9.2
    // vieta più di un suono per gesto.
    vibra('light')
    v.onScegli()
    onChiudi()
  }

  function alTasto(evento: React.KeyboardEvent<HTMLDivElement>) {
    // Si ferma qui: in `src/` ci sono nove ascoltatori su `window`, e un
    // `Escape` risalito fin lì collasserebbe gli strati tutti insieme (§1.5).
    if (evento.key === 'Escape') {
      evento.stopPropagation()
      onChiudi()
      return
    }
    if (evento.key === 'Tab') {
      // Il `preventDefault` è la metà che conta: senza, il browser sposterebbe
      // comunque il focus per conto suo dopo che noi l'abbiamo riportato al ⋯.
      evento.preventDefault()
      evento.stopPropagation()
      ancora.current?.focus()
      onChiudi()
      return
    }
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      evento.stopPropagation()
      vai(indiceCorrente() + 1)
      return
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      evento.stopPropagation()
      vai(indiceCorrente() - 1)
      return
    }
    if (evento.key === 'Home') {
      evento.preventDefault()
      evento.stopPropagation()
      vai(0)
      return
    }
    if (evento.key === 'End') {
      evento.preventDefault()
      evento.stopPropagation()
      vai(vociRef.current.length - 1)
    }
  }

  // §1.9 — sotto «riduci movimento» si cambia la TRANSIZIONE, MAI il bersaglio:
  // `scale` e `opacity` restano dentro `animate`, o resterebbero congelate
  // dov'erano (difetto D1/D2 del 26/07).
  // 🛑 E qui la forma è PER CHIAVE, non l'intera transizione — è la differenza
  // col vicino, ed è voluta: §5.40 dice «`scale` resta nel bersaglio con
  // `istantaneo`; resta la SOLA DISSOLVENZA», quindi l'`opacity` continua ad
  // arrivare con la molla. `VisoreFoto` può sostituire la transizione INTERA
  // (`VisoreFoto.tsx:182-186`) solo perché §5.39 vuole istantanee TUTTE le sue
  // chiavi. Sostituirla intera anche qui spegnerebbe la dissolvenza, che la
  // spec chiede espressamente di tenere (idioma in `v3/motion.ts:20`).
  const transizione = reduced ? { ...molla.smooth, scale: istantaneo } : molla.smooth

  // Ripiego dichiarato: senza àncora la posizione non è calcolabile, e una
  // tendina che si pianta a caso in mezzo allo schermo sarebbe peggio. Il
  // difetto vero (l'àncora mancante) è già stato detto in console, sopra.
  const posto = posizione ?? { top: spazio.m, right: spazio.m }

  const overlay = (
    <div
      data-ds="v3"
      className="ds-tendina-radice"
      style={{ position: 'fixed', inset: 0, zIndex: 1020, background: 'transparent' }}
    >
      <style>{`
        .ds-tendina-voce:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
        .ds-tendina-voce:not(:disabled):active { background: var(--bg-deep); }
        .ds-tendina-voce.ds-tendina-butta:not(:disabled):active { background: var(--red-tint); }
      `}</style>

      {/* Il velo non si vede: esiste per raccogliere il tocco FUORI. Il gesto si
          ferma dove nasce (§1.4), e la difesa dal ghost click di Chrome Android
          è quella di casa (`useTapScrim`). */}
      <div
        className="ds-tendina-velo"
        aria-hidden="true"
        onPointerDown={tapVelo.onPointerDown}
        onClick={tapVelo.onClick}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      />

      <motion.div
        role="menu"
        aria-label={etichettaAria}
        className="ds-tendina-pannello"
        onKeyDown={alTasto}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transizione}
        style={{
          position: 'fixed',
          top: posto.top,
          right: posto.right,
          width: LARGHEZZA,
          borderRadius: raggio.tasto,
          background: 'var(--elv)',
          boxShadow: sopraFoto.ombraPannello,
          padding: `${spazio.s}px ${spazio.m}px`,
          // Cresce dall'angolo da cui è uscita: il ⋯, in alto a destra.
          transformOrigin: '100% 0',
        }}
      >
        {ordinate.map((v, i) => {
          // La linea di sotto sta su tutte tranne l'ultima, e la distruttiva ci
          // aggiunge la PROPRIA linea di sopra a `spazio.xs` di distanza: sono
          // due tratti staccati, non un doppione.
          // 🔑 Non è una scelta mia: è ciò che fa il contenitore vero di casa
          // (`MenuSchedaSheet.tsx:162-164`) ed è la legge visiva di §5.34
          // (`scheda-lavoro.html:232` + `:241`), che §5.40 vuole «verbatim».
          const separatore = i < ordinate.length - 1 && !v.distruttiva
          return (
            <button
              key={v.id}
              ref={(el) => {
                vociRef.current[i] = el
              }}
              type="button"
              role="menuitem"
              className={`ds-tendina-voce${v.distruttiva ? ' ds-tendina-butta' : ''}`}
              disabled={v.disabled}
              onClick={() => scegli(v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spazio.m,
                width: '100%',
                minHeight: ALTEZZA_VOCE,
                padding: `${spazio.s}px 0`,
                // borderStyle (non `border` shorthand): jsdom/cssstyle serializza
                // `border: 'none'` come `borderTop === 'medium'` — stesso quirk
                // già dichiarato in `MenuVoce.tsx:37-41`.
                borderStyle: 'none',
                background: 'none',
                color: v.distruttiva ? 'var(--red)' : 'var(--ink)',
                fontFamily: tipografia.famiglia,
                fontSize: tipografia.size.body,
                fontWeight: tipografia.weight.bold,
                textAlign: 'left',
                cursor: v.disabled ? 'default' : 'pointer',
                opacity: v.disabled ? 0.6 : 1,
                ...(separatore
                  ? {
                      borderBottomStyle: 'solid' as const,
                      borderBottomWidth: LINEA,
                      borderBottomColor: 'var(--line)',
                    }
                  : {}),
                ...(v.distruttiva
                  ? {
                      borderTopStyle: 'solid' as const,
                      borderTopWidth: LINEA,
                      borderTopColor: 'var(--line)',
                      marginTop: spazio.xs,
                      paddingTop: spazio.m,
                    }
                  : {}),
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  width: LATO_ICONA,
                  height: LATO_ICONA,
                  borderRadius: RAGGIO_ICONA,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: v.distruttiva ? 'var(--red-tint)' : 'var(--bg-deep)',
                  color: v.distruttiva ? 'var(--red)' : 'var(--muted)',
                }}
              >
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  {v.icona}
                </svg>
              </span>

              <span style={{ flex: 1 }}>{v.testo}</span>

              {/* Il chevron dice «di qui si va da un'altra parte»: non sta sulla
                  voce distruttiva (mockup §5.34 `.menu-voce.butta`, e le colonne
                  M1 e M2 concordi) né su una voce spenta. */}
              {!v.disabled && !v.distruttiva && (
                <span aria-hidden="true" style={{ color: 'var(--faint)', fontSize: 20, fontWeight: tipografia.weight.extrabold }}>{'›'}</span>
              )}
            </button>
          )
        })}
      </motion.div>
    </div>
  )

  return createPortal(overlay, document.body)
}
