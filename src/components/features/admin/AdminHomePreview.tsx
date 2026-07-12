'use client'

// Ondata 1 ADDENDUM — anteprima Home v3 in sola lettura per l'admin_sistema
// (`/admin/labs/[id]/live`). NON è HomeV3: quella naviga (`/lavori?pila=…`,
// `/lavori/nuovo`, `/tutto-il-resto`) verso route gate-ate per titolare/
// tecnico/front_desk/admin_rete — un admin_sistema che ci finisse dentro
// verrebbe rediretto a `/login` (vedi guardia in `(app)/dashboard/page.tsx`).
// Questo componente riusa gli stessi dati (`getPileHome`, `getSegnaleStriscia`)
// e riusa `Pila` TALE E QUALE (§5.7) — non `MorphPila` — perché il punto di
// questa pagina è mostrare all'admin esattamente ciò che vede il titolare
// (stesse card, stessa carta/ombra/colore), non una variante flat che il
// titolare non vede mai in home. `Pila` richiede `onClick`: qui è un no-op
// (`() => {}`) e l'intero stack pile vive dentro un contenitore `inert`
// (attributo HTML nativo, non un trucco ARIA) — un elemento `inert` non è
// focalizzabile né riceve eventi puntatore/tastiera per specifica, quindi
// `whileTap`/`vibra('selection')` di `Pila` non scattano mai: le card
// restano visivamente IDENTICHE a Home v3 ma davvero non tappabili, senza
// il falso affordance che un `onClick` no-op da solo lascerebbe (bottone
// ancora focalizzabile/premibile che "non fa nulla" invece di non essere
// affatto raggiungibile). La striscia è montata con `azione={null}` sempre,
// a prescindere da cosa calcoli `getSegnaleStriscia` (che punta a route
// tenant come `/fatture/[id]`) — a differenza delle pile, qui non serve
// alcun contenitore `inert`: `StrisciaStato` non renderizza affatto il
// `<Link>` della CTA quando `azione` è `null` (non lo nasconde, lo omette).
// Niente TastoTondo (☰ → `/tutto-il-resto`) né TastoPiù (→ `/lavori/nuovo`).
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import { Pila as PilaCard, type TipoPila } from '@/components/ds/Pila'
import { tipografia } from '@/design-system/v3/tokens'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'
import type { Pila } from '@/lib/lavori/urgenza'

// Stesso ordine/stessa mappa pila→tipo di `HomeV3.tsx` (§7.1 rev. 3.1) —
// duplicata qui come già avviene per costanti equivalenti altrove nel
// codebase (es. `LABEL` in `PilaAperta.tsx`/`PilaSplit.tsx`).
const ORDINE: Array<{ pila: Pila; tipo: TipoPila }> = [
  { pila: 'rossa', tipo: 'daConsegnare' },
  { pila: 'ambra', tipo: 'sulBanco' },
  { pila: 'viola', tipo: 'daRifareInProva' },
  { pila: 'blu', tipo: 'appenaArrivati' },
]

function nessunaAzione() {
  // no-op intenzionale: vedi commento di testa del file. `Pila` non ha una
  // prop `onClick?` opzionale — la firma la richiede — quindi qui basta non
  // fare nulla; l'`inert` del contenitore (sotto) è ciò che impedisce
  // davvero che questa funzione venga mai invocata da input reale.
}

/**
 * AdminHomePreview — Home v3 letta da fuori, senza poterla toccare.
 * `pile`/`segnale` sono il risultato REALE di `getPileHome`/`getSegnaleStriscia`
 * col perimetro titolare (nessun `tecnicoId`), esattamente come vede il
 * titolare vero su `/dashboard` — cambia solo l'assenza totale di interazione.
 *
 * Le quattro pile restano SEMPRE visibili coi loro conteggi reali, zero
 * incluso (L5, §5.7: "il sollievo si mostra, non si nasconde") — a
 * differenza di `HomeV3`, che a banco libero sostituisce lo stack con un
 * unico blocco "Il banco è libero": qui, per una vista amministrativa di
 * sola lettura, i quattro conteggi effettivi (anche se tutti a zero) sono
 * l'informazione più utile, non un'esperienza da addolcire.
 */
export function AdminHomePreview(props: { nome: string; eyebrow: string; saluto: string; pile: PileHome; segnale: SegnaleStriscia }) {
  const { nome, eyebrow, saluto, pile, segnale } = props

  return (
    <section aria-label="Anteprima Home — sola lettura" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <div>
        <div style={{ fontSize: tipografia.size.label, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.label, textTransform: 'uppercase', color: 'var(--faint)' }}>
          {eyebrow}
        </div>
        <h1 style={{ fontSize: tipografia.size.largeTitle, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.titoli, lineHeight: 1.1, marginTop: 6, color: 'var(--ink)' }}>
          {saluto},<br />{nome}
        </h1>
      </div>

      <div style={{ marginTop: 16 }}>
        {/* azione SEMPRE null qui: il segnale reale può portare una CTA verso
            una route tenant (es. `/fatture/[id]`) — in questa vista quella CTA
            non deve mai comparire, si legge solo lo stato. */}
        <StrisciaStato attenzione={segnale.attenzione} forte={segnale.forte} azione={null}>
          {segnale.testo}
        </StrisciaStato>
      </div>

      {/* `inert` è un attributo HTML standard (React 19 lo passa attraverso),
          non una prop custom: disattiva pointer/tastiera/focus sull'intero
          sottoalbero per specifica, senza toccare la resa visiva. */}
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }} inert>
        {ORDINE.map(({ pila, tipo }) => (
          <PilaCard key={pila} tipo={tipo} numero={pile.liste[pila].length} sub={pile.sub[pila]} onClick={nessunaAzione} />
        ))}
      </div>
    </section>
  )
}
