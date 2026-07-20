'use client'

// DS v3 §4.1 (Task 9) — PilaSplit: la colonna sinistra+destra del regime 768
// di `/lavori` (mockup `pila-aperta.html` `.split`, 768-1023): sinistra
// `--bg-deep` con `MorphPila` + la lista (stesso pattern P3/P4 di
// `PilaAperta.tsx` — TastoConsegnaInline SOLO sul primo consegnabile della
// pila rossa, «Conferma» su ogni card della pila blu), destra `SchedaAnteprima`
// del lavoro selezionato (`?lavoro=`, o il primo della pila).
//
// File non elencato nel piano del Task 9 (che nomina solo NavDesk/HomeDesktop/
// SchedaAnteprima): necessario per il vincolo RSC — `lavori/page.tsx` resta un
// Server Component (redirect, fetch dati), quindi non può passare closure
// (`onClick`/`onApri`) ai Client Component figli. Stesso schema già in uso per
// `PilaAperta`/`LePile`: un Client Component che riceve solo DATI dal server e
// possiede i propri handler via `useRouter()`.
//
// Ring di selezione: stesso schema di `HomeDesktop.tsx` (v. nota lì, fix
// review finale item 1) — il ring vive su `CardLavoro` (prop `selezionato`,
// sul nodo che possiede lo sfondo), il wrapper qui sotto porta SOLO l'ombra
// ambiente quando selezionata.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MorphPila } from '@/components/ds/MorphPila'
import { CardLavoro } from '@/components/ds/CardLavoro'
import { Vuoto } from '@/components/ds/Vuoto'
import { SchedaAnteprima } from './SchedaAnteprima'
import { FlussoConsegna } from '@/components/features/lavori/consegna-v3/FlussoConsegna'
import { ConfermaCassettaSheet } from '@/components/features/pile/ConfermaCassettaSheet'
import { raggio } from '@/design-system/v3/tokens'
// Da `pile-home-shared.ts` come i fratelli client (review Task 9): il type-only
// da `pile-home.ts` (server-only) è innocuo a runtime ma incoerente col confine
// client/server tracciato nel Task 9.
import type { LavoroPila } from '@/lib/dashboard/pile-home-shared'
import type { Pila } from '@/lib/lavori/urgenza'

const LABEL: Record<Pila, string> = {
  rossa: 'Da consegnare oggi', ambra: 'Sul banco', viola: 'Da rifare / In prova', blu: 'Appena arrivati',
}
// Stesse frasi di sollievo di `PilaAperta.tsx` (§5.7) — pila vuota, mai nascosta (L5).
const VUOTO: Record<Pila, { glifo: string; titolo: string; guida: string }> = {
  rossa: { glifo: '📦', titolo: 'Tutte consegnate ✓', guida: 'Nessuna consegna in sospeso in questo momento.' },
  ambra: { glifo: '☕', titolo: 'Niente sul banco', guida: 'Goditi il caffè. Al prossimo lavoro ci pensa UÀ.' },
  viola: { glifo: '🔄', titolo: 'Nessuna prova in giro', guida: 'Quando un lavoro va in prova, lo trovi qui.' },
  blu: { glifo: '📥', titolo: 'Nessun nuovo arrivo', guida: 'I lavori appena arrivati compaiono qui.' },
}

export function PilaSplit(props: { pila: Pila; lista: LavoroPila[]; sub?: string; lavoroSelezionato: LavoroPila | null; cassetteSuggerite?: string[] }) {
  const { pila, lista, sub, lavoroSelezionato, cassetteSuggerite } = props
  const router = useRouter()
  // Task 14 — flusso di consegna POSSEDUTO da questo host (riserva arch #5),
  // stesso pattern di `PilaAperta`: nessun `onConsegnato`, refresh SOLO alla
  // chiusura del frame.
  const [consegnaId, setConsegnaId] = useState<string | null>(null)
  // Task 5 (A14) — sheet «In che cassetta lo metti?» sul Conferma della pila
  // blu, stesso schema di `consegnaId`.
  const [confermaId, setConfermaId] = useState<string | null>(null)

  const idPrimoConsegnabile = pila === 'rossa' ? lista.find((l) => l.consegnabile)?.id : undefined
  const schedaLavoro = lavoroSelezionato ?? lista[0] ?? null
  const lavoroInConsegna = consegnaId ? lista.find((l) => l.id === consegnaId) ?? null : null
  const lavoroInConferma = confermaId ? lista.find((l) => l.id === confermaId) ?? null : null
  const vuoto = VUOTO[pila]

  return (
    <div className="ua-lavori-split">
      <style>{`
        .ua-lavori-split { display: none }
        @media (min-width: 768px) and (max-width: 1023px) {
          .ua-lavori-mobile { display: none }
          .ua-lavori-split { display: grid; grid-template-columns: 360px 1fr; height: 100dvh; overflow: hidden }
        }
      `}</style>

      <section key={pila} style={{ background: 'var(--bg-deep)', padding: '28px 22px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        <MorphPila pila={pila} numero={lista.length} label={LABEL[pila]} sub={lista.length > 0 ? sub : undefined} />

        {lista.length === 0 ? (
          <Vuoto glifo={vuoto.glifo} titolo={vuoto.titolo} guida={vuoto.guida} />
        ) : (
          lista.map((l) => {
            const selezionato = schedaLavoro?.id === l.id
            return (
              <div key={l.id} style={{ borderRadius: raggio.card, boxShadow: selezionato ? 'var(--sh-card)' : undefined }}>
                <CardLavoro
                  numero={l.numero}
                  cassetta={l.cassetta}
                  dentista={l.dentista}
                  paziente={l.paziente}
                  tipoLavoro={l.tipoLavoro}
                  tempo={l.pill}
                  selezionato={selezionato}
                  onApri={() => router.push(`/lavori?pila=${pila}&lavoro=${l.id}`)}
                  {...(pila === 'blu'
                    ? { conferma: { onClick: () => setConfermaId(l.id) } }
                    : { onConsegna: l.id === idPrimoConsegnabile ? () => setConsegnaId(l.id) : undefined })}
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

      {/* Stessa nota di `PilaAperta.tsx`: `lavoro` è un oggetto letterale
          fresco a ogni render di questo host, ma il reset dentro
          `ConfermaCassettaSheet` è chiavato su `lavoro.id`, non sulla
          reference — un rirender dell'host con lo STESSO lavoro (qualunque
          ne sia la causa) non tocca la selezione in corso. */}
      <ConfermaCassettaSheet
        aperto={confermaId !== null}
        onChiudi={() => setConfermaId(null)}
        lavoro={lavoroInConferma ? { id: lavoroInConferma.id, numero: lavoroInConferma.numero, tipoLavoro: lavoroInConferma.tipoLavoro, dentista: lavoroInConferma.dentista } : null}
        suggerite={cassetteSuggerite ?? []}
        onConfermato={(id) => { setConfermaId(null); router.push(`/lavori/${id}`) }}
      />
    </div>
  )
}
