'use client'

// DS v3 §4.1/§5.28 (Task 8) — PilaAperta: la lista di legge quando si apre una
// pila da «Le pile» o dalla home (`/lavori?pila=…`). Header-morph statico (già
// «salito» a testata, MorphPila) + lista delle card, in ordine di arrivo
// (l'ordinamento è già deciso a monte da `mapPileHome`/`confrontaUrgenza`, qui
// si renderizza soltanto). Fonte visiva: mockup `pila-aperta.html`, frame 390.
//
// P3 — TastoConsegnaInline: SOLO sul primo lavoro consegnabile della pila
// rossa (mai più di uno, mai su altre pile) — responsabilità di questo
// componente, non di CardLavoro (che si limita a mostrarlo se richiesto).
// P4 — CTA «Conferma»: su OGNI card della pila blu (i lavori appena arrivati
// vanno confermati uno per uno).
//
// Cerca (§5.13): RigaCerca compare SOLO oltre 15 lavori — sotto quella soglia
// la lista intera è già leggibile in una schermata, cercare sarebbe un passo
// in più senza motivo. Il filtro è un contains normalizzato (NFD, senza
// accenti) su numero, dentista, paziente e tipo lavoro.
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MorphPila } from '@/components/ds/MorphPila'
import { CardLavoro } from '@/components/ds/CardLavoro'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { RigaCerca } from '@/components/ds/RigaCerca'
import { CampoTesto } from '@/components/ds/Campo'
import { Vuoto } from '@/components/ds/Vuoto'
import type { LavoroPila } from '@/lib/dashboard/pile-home'
import type { Pila } from '@/lib/lavori/urgenza'

const SOGLIA_CERCA = 15

const LABEL: Record<Pila, string> = {
  rossa: 'Da consegnare oggi', ambra: 'Sul banco', viola: 'Da rifare / In prova', blu: 'Appena arrivati',
}

// Stesse frasi di sollievo del sub a pila vuota (§5.7, `pile-home.ts`) — la
// pila vuota non si nasconde mai (L5), qui diventano il titolo di `Vuoto`.
const VUOTO: Record<Pila, { glifo: string; titolo: string; guida: string }> = {
  rossa: { glifo: '📦', titolo: 'Tutte consegnate ✓', guida: 'Nessuna consegna in sospeso in questo momento.' },
  // mockup stati-vuoti-errori.html — tazzina di caffè, coerente con «Goditi il caffè».
  ambra: { glifo: '☕', titolo: 'Niente sul banco', guida: 'Goditi il caffè. Al prossimo lavoro ci pensa UÀ.' },
  viola: { glifo: '🔄', titolo: 'Nessuna prova in giro', guida: 'Quando un lavoro va in prova, lo trovi qui.' },
  blu: { glifo: '📥', titolo: 'Nessun nuovo arrivo', guida: 'I lavori appena arrivati compaiono qui.' },
}

/** contains normalizzato: minuscolo + NFD senza diacritici (accent-insensitive). */
function normalizza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function PilaAperta(props: { pila: Pila; lista: LavoroPila[]; sub?: string }) {
  const { pila, lista, sub } = props
  const router = useRouter()
  const [cerca, setCerca] = useState<string | null>(null) // null = riga chiusa

  const filtrata = useMemo(() => {
    if (!cerca) return lista
    const q = normalizza(cerca)
    return lista.filter((l) => normalizza(`n.${l.numero} ${l.dentista} ${l.paziente} ${l.tipoLavoro}`).includes(q))
  }, [lista, cerca])

  const idPrimoConsegnabile = pila === 'rossa' ? lista.find((l) => l.consegnabile)?.id : undefined
  const vuoto = VUOTO[pila]

  return (
    <section style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: '8px 24px 40px' }}>
      <div style={{ marginBottom: 18 }}>
        <TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => router.push('/dashboard')} />
      </div>

      <MorphPila pila={pila} numero={lista.length} label={LABEL[pila]} sub={lista.length > 0 ? sub : undefined} />

      {lista.length === 0 ? (
        <Vuoto glifo={vuoto.glifo} titolo={vuoto.titolo} guida={vuoto.guida} />
      ) : (
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {lista.length > SOGLIA_CERCA && (cerca === null
            ? <RigaCerca totale={lista.length} cosa="lavori" onApri={() => setCerca('')} />
            : <CampoTesto label="Cerca" valore={cerca} onCambia={setCerca} autoFocus />)}

          {filtrata.map((l) => (
            <CardLavoro
              key={l.id}
              numero={l.numero}
              dentista={l.dentista}
              paziente={l.paziente}
              tipoLavoro={l.tipoLavoro}
              tempo={l.pill}
              onApri={() => router.push(`/lavori/${l.id}`)}
              onConsegna={l.id === idPrimoConsegnabile ? () => router.push(`/lavori/${l.id}/consegna`) : undefined}
              conferma={pila === 'blu' ? { onClick: () => router.push(`/lavori/${l.id}`) } : undefined}
            />
          ))}
        </div>
      )}
    </section>
  )
}
