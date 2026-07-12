'use client'

// Home v3 (§7.1 + rev. 3.1) — UNA composizione per tutti i ruoli, cambia solo il
// perimetro dati (deciso server-side). Eyebrow+saluto · StrisciaStato · 4 Pile ·
// TastoPiù. NIENT'ALTRO, per legge. No-scroll: il frame è 100dvh a <768 e la
// fascia pile assorbe lo slack; scala device-corti (≤700px) da §7.1 rev. 3.1.
import { useRouter } from 'next/navigation'
import { Pila as PilaCard } from '@/components/ds/Pila'
import { TastoPiu } from '@/components/ds/TastoPiu'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import { tipografia } from '@/design-system/v3/tokens'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'
import type { Pila } from '@/lib/lavori/urgenza'

const ORDINE: Array<{ pila: Pila; tipo: 'daConsegnare' | 'sulBanco' | 'daRifareInProva' | 'appenaArrivati' }> = [
  { pila: 'rossa', tipo: 'daConsegnare' },
  { pila: 'ambra', tipo: 'sulBanco' },
  { pila: 'viola', tipo: 'daRifareInProva' },
  { pila: 'blu', tipo: 'appenaArrivati' },
]

export function HomeV3(props: { nome: string; eyebrow: string; saluto: string; pile: PileHome; segnale: SegnaleStriscia }) {
  const { nome, eyebrow, saluto, pile, segnale } = props
  const router = useRouter()
  const bancoLibero = ORDINE.every(({ pila }) => pile.liste[pila].length === 0)

  return (
    // "ua-home-mobile" (Task 9): HomeDesktop la nasconde da 1024 in su via CSS
    // (`.ua-home-mobile { display: none }` dentro il suo `@media (min-width:1024px)`).
    // `<section>`, non `<main>` (fix review finale item 5): `(app)/layout.tsx`
    // porta già il proprio `<main id="main-content">` (SkipToContent, §a11y) —
    // due `<main>` annidati sono HTML non valido (un solo landmark main per
    // documento). L'aria resta intatta: nessun ruolo/aria-* qui dipendeva dal
    // tag `main`.
    <section className="ua-home ua-home-mobile">
      <style>{`
        .ua-home { position: relative; z-index: 1; width: 100%; max-width: 480px; margin: 0 auto;
                   padding: 24px; display: flex; flex-direction: column; min-height: 100dvh; }
        .ua-home .pile { flex: 1; display: flex; flex-direction: column; gap: 16px; justify-content: center; margin-top: 16px; }
        .ua-home .foot { margin-top: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        @media (max-width: 767px) { .ua-home { height: 100dvh; overflow: hidden; } } /* §3.3 no-scroll */
        @media (max-height: 700px) { /* §7.1 rev. 3.1 — scala device-corti */
          .ua-home { padding: 14px 24px; }
          .ua-home .striscia-slot { margin-top: 10px; }
          .ua-home .pile { gap: 10px; margin-top: 10px; }
          .ua-home .pile .ds-pila { padding: 14px 18px; }
          .ua-home .pile .ds-pila-num { font-size: 42px; }
          .ua-home .foot { margin-top: 10px; gap: 6px; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: tipografia.size.label, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.label, textTransform: 'uppercase', color: 'var(--faint)' }}>{eyebrow}</div>
          <h1 style={{ fontSize: tipografia.size.largeTitle, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.titoli, lineHeight: 1.1, marginTop: 6, color: 'var(--ink)' }}>
            {saluto},<br />{nome}
          </h1>
        </div>
        <TastoTondo glifo="☰" etichettaAria="Tutto il resto" onClick={() => router.push('/tutto-il-resto')} />
      </div>

      <div className="striscia-slot" style={{ marginTop: 16 }}>
        <StrisciaStato attenzione={segnale.attenzione} forte={segnale.forte} azione={segnale.azione}>
          {segnale.testo}
        </StrisciaStato>
      </div>

      {bancoLibero ? (
        <div className="pile" style={{ alignItems: 'center', textAlign: 'center', gap: 14 }}>
          {/* mockup stati-vuoti-errori.html riga ~218 — icona NEUTRA (mai tint di stato),
              vassoio/banco vuoto line-SVG, stroke 1.7 var(--faint), fill none. */}
          <span
            aria-hidden
            style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)' }}
          >
            <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="var(--faint)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13h4l1.5 2.5h7L17 13h4" />
              <path d="M3 13V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
              <path d="M3 13v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
            </svg>
          </span>
          <div style={{ fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)' }}>Il banco è libero</div>
          <div style={{ fontSize: 16, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', maxWidth: 300, lineHeight: 1.4 }}>Quando arriva un lavoro, lo vedi qui.</div>
        </div>
      ) : (
        <div className="pile">
          {ORDINE.map(({ pila, tipo }) => (
            <PilaCard key={pila} tipo={tipo} numero={pile.liste[pila].length} sub={pile.sub[pila]} onClick={() => router.push(`/lavori?pila=${pila}`)} />
          ))}
        </div>
      )}

      <div className="foot">
        <TastoPiu onClick={() => router.push('/lavori/nuovo')} />
      </div>
    </section>
  )
}
