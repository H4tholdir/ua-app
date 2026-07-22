'use client'

// «Persone» v3 (Task 11, ondata A mini-triage) — migrazione integrale della
// route /tecnici a v3 (spec v3 §14: migrazione per route, mai per
// componente). Sostituisce integralmente la lista card v2.3 di
// tecnici/page.tsx (avatar-sigla quadrato, PRRC chip fatta a mano, link
// «Produttività» sempre visibile) — quel link torna via lo Sheet persona
// (Task 12), non qui.
//
// Chrome pagina-lista v3 (NASCE QUI): header `‹` + h1 + container 480
// centrato, IDENTICO nell'anatomia a `TuttoIlResto.tsx:52-55` (Task 10) —
// stesso `TastoTondo`, stessa tipografia h1 27/800 tracking −.02em `--ink`.
// Non è ancora un componente ds condiviso: la regola informale del repo è
// «tre usi prima di astrarre» — con una sola pagina-lista precedente
// (Tutto il resto) e questa, siamo a due. La promozione a
// `src/components/ds/ChromePaginaLista.tsx` (o simile) è rimandata a ondata
// B, quando una terza pagina-lista lo richiederà.
//
// Nessun regime desktop dedicato in quest'ondata (a differenza di
// TuttoIlResto/HomeDesktop): a ≥1024 la pagina resta la stessa colonna
// centrata a 480px (spec §14, brief Task 11).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { tornaIndietro } from '@/lib/nav/torna-indietro'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { Avatar } from '@/components/ds/Avatar'
import { PillTempo } from '@/components/ds/Pill'
import { Vuoto } from '@/components/ds/Vuoto'
import { raggio } from '@/design-system/v3/tokens'
import { SchedaPersonaSheet } from './SchedaPersonaSheet'
import { InvitoPersonaSheet } from './InvitoPersonaSheet'

export type TecnicoRow = {
  id: string
  nome: string
  cognome: string
  sigla: string | null
  qualifica: string | null
  prrc: boolean
  compenso_base: number | null
  tipo_compenso: string | null
}

export function PersoneV3(props: { tecnici: TecnicoRow[]; ruolo: string; meseLabel: string }) {
  const { tecnici, ruolo, meseLabel } = props
  const router = useRouter()

  // Sheet persona (Task 12): il tap riga apre `SchedaPersonaSheet`, montato
  // sempre (`aperto`/`persona` ne governano la visibilità) — stesso schema
  // di `ConfermaCassettaSheet`/`PilaAperta`. `personaSelezionata` è l'oggetto
  // pieno risolto per id: `SchedaPersonaSheet` chiave il proprio reset su
  // `persona.id`, NON sulla reference (finding di review di quest'ondata) —
  // per questo l'host può ricostruirlo ad ogni render senza perdere stato.
  const [personaAperta, setPersonaAperta] = useState<string | null>(null)
  const personaSelezionata = tecnici.find((t) => t.id === personaAperta) ?? null

  // Sheet invito (Task 13): SOLO `ruolo === 'titolare'` — parità con la
  // vecchia pagina v2.3 (nessun `admin_rete` qui, a differenza della card
  // cedolini sotto). Il CTA «+ Invita una persona» è l'UNICO entry point
  // rimasto: il vecchio bottone header di `InvitaCollaboratoreSheet` (v2.3)
  // è morto con la migrazione a v3 e il componente legacy è stato rimosso
  // (orfano, vedi corpo del commit).
  const mostraInvito = ruolo === 'titolare'
  const [invitoAperto, setInvitoAperto] = useState(false)

  // Card cedolini SOLO titolare/admin_rete, e solo se il lab ha tecnici
  // (brief §Card cedolini): nessun CSV da scaricare per un lab vuoto.
  const mostraCedolini = (ruolo === 'titolare' || ruolo === 'admin_rete') && tecnici.length > 0

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 24px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => tornaIndietro(router, '/tutto-il-resto')} />
        <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--ink)' }}>Persone</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        {mostraCedolini && (
          <div
            style={{
              borderRadius: raggio.tile,
              background: 'var(--card)',
              boxShadow: 'var(--sh-card)',
              padding: '15px 16px',
            }}
          >
            <p style={{ fontSize: 17.5, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>I cedolini</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', margin: '2px 0 12px' }}>{meseLabel}</p>
            <TastoSecondario onClick={() => window.location.assign('/api/tecnici/cedolini-batch')}>
              Scarica (CSV)
            </TastoSecondario>
          </div>
        )}

        {mostraInvito && (
          <TastoSecondario onClick={() => setInvitoAperto(true)}>+ Invita una persona</TastoSecondario>
        )}

        {tecnici.length === 0 ? (
          <Vuoto
            glifo="👥"
            titolo="Nessuna persona"
            guida="Invita un collaboratore per assegnargli i lavori."
          />
        ) : (
          tecnici.map((tecnico) => {
            const nomeCompleto = `${tecnico.nome} ${tecnico.cognome}`
            // Dizionario: «Tecnico» quando la qualifica non è compilata —
            // mai una riga vuota sotto il nome.
            const qualifica = tecnico.qualifica || 'Tecnico'
            return (
              <button
                key={tecnico.id}
                type="button"
                aria-label={`Apri ${nomeCompleto}`}
                onClick={() => setPersonaAperta(tecnico.id)}
                className="ds-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  borderRadius: raggio.tile,
                  padding: '15px 16px',
                  fontFamily: 'var(--font-v3)',
                  background: 'var(--card)',
                  boxShadow: 'var(--sh-card)',
                  cursor: 'pointer',
                }}
              >
                <Avatar nome={nomeCompleto} diametro={46} />
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span
                    style={{
                      fontSize: 17.5,
                      fontWeight: 700,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {nomeCompleto}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>{qualifica}</span>
                </span>
                {tecnico.prrc && <PillTempo famiglia="green">PRRC ✓</PillTempo>}
                <span aria-hidden="true" style={{ flex: 'none', fontSize: 22, fontWeight: 700, color: 'var(--faint)', lineHeight: 1 }}>
                  ›
                </span>
              </button>
            )
          })
        )}
      </div>

      <SchedaPersonaSheet
        aperto={!!personaAperta}
        persona={personaSelezionata}
        ruolo={ruolo}
        onChiudi={() => setPersonaAperta(null)}
      />

      {mostraInvito && (
        <InvitoPersonaSheet aperto={invitoAperto} onChiudi={() => setInvitoAperto(false)} />
      )}
    </div>
  )
}
