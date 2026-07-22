'use client'

// Task 12 — CassettaSheet (§5.3, spec 2026-07-21-parete-cassette-design.md). Lo sheet che rende
// manipolabile una cassetta: rinomina, colore, «Sposta il lavoro in…», «Segna come libera»,
// «Sposta» (▲▼ posizione) e «Butta via». Si apre dal tap su una cassetta libera o dal long-press
// su una qualsiasi (§5.4). Nessun mockup dedicato: l'anatomia è tutta di componenti ds.
//
// «Una cosa alla volta»: ogni azione che COMMITTA (rinomina, colore, sposta-lavoro, segna-libera,
// butta-via) chiude lo sheet e fa rileggere la parete via `onCambiata` — così non resta mai una
// `cassetta` stantia montata mentre il muro è già cambiato sotto. L'UNICA eccezione è il riordino
// ▲▼: resta aperto (si sposta di un posto alla volta, il PareteClient POSTa la lista completa).
// Quali gesti COMMITTANO, però, lo decide questo sheet e non i suoi componenti: una faccia
// standard è un click, quindi committa; il colore custom arriva LIVE dal picker nativo, quindi
// resta in sospeso e lo committa un tasto (`scegliDaiSwatches` — review Task 12, Important 1).
//
// Contratti API verbatim dalle route:
//  • rinomina/colore → PATCH /api/cassette/[id] con UN SOLO campo per chiamata ({nome} XOR
//    {colore}). Accorparli è 422 (decisione Francesco 21/07: una chiamata = una RPC).
//  • sposta-lavoro → POST /api/lavori/[id]/cassetta {cassetta_id}; 409 {occupata} → riga bloccante.
//  • segna-libera → POST /api/lavori/[id]/cassetta con body il LETTERALE `null` (NON
//    {cassetta_id:null}, che è 422): libera la cassetta col motivo 'manuale'.
//  • butta-via → DELETE /api/cassette/[id]; su una cassetta occupata è disabilitata (409 lato
//    server) e lo si dice con una riga bloccante «Dentro c'è il n.{numero}».
//
// Dizionario (constraint 5): «Butta via», MAI «Elimina» — nell'etichetta E nel testo del dialog.

import { useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { ChipScelta } from '@/components/ds/ChipScelta'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { RigaBloccante } from '@/components/ds/RigaBloccante'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { spazio } from '@/design-system/v3/tokens'
import type { CassettaParete } from '@/lib/cassette/parco-shared'
import { SwatchesColore } from './SwatchesColore'

const ERRORE_NOME_OCCUPATO = 'Questo nome è già sulla parete'
const ERRORE_NOME_LUNGO = 'Il nome è troppo lungo (massimo 20 caratteri)'
const ERRORE_GENERICO = 'Non ci sono riuscito — riprova'

export function CassettaSheet(props: {
  cassetta: CassettaParete | null
  libere: CassettaParete[]
  posto: number
  totale: number
  aperto: boolean
  onChiudi: () => void
  onCambiata: () => void
  /** Riordino di UNA posizione: il PareteClient compone e POSTa la lista completa e risponde se
   *  il muro si è davvero mosso — l'annuncio `aria-live` dipende da questo esito. */
  onSposta: (direzione: 'su' | 'giu') => Promise<boolean>
}) {
  const { cassetta, libere, posto, totale, aperto, onChiudi, onCambiata, onSposta } = props

  const [nomeRinomina, setNomeRinomina] = useState(cassetta?.nome ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erroreRinomina, setErroreRinomina] = useState<string | null>(null)
  const [erroreAzione, setErroreAzione] = useState<string | null>(null)
  const [spostaBloccata, setSpostaBloccata] = useState<string | null>(null)
  const [annuncioSposta, setAnnuncioSposta] = useState('')
  const [chiediLibera, setChiediLibera] = useState(false)
  const [chiediButta, setChiediButta] = useState(false)
  // Colore custom IN SOSPESO (review Task 12, Important 1) — v. `scegliDaiSwatches`.
  const [colorePending, setColorePending] = useState<string | null>(null)

  // Reset in render-phase al cambio di cassetta (id), stesso pattern di ConfermaCassettaSheet:
  // NON un useEffect. Non si resetta sul solo `router.refresh()` di un riordino (l'id resta lo
  // stesso), così l'annuncio ▲▼ e il campo sopravvivono a uno spostamento.
  const [idPrec, setIdPrec] = useState<string | null>(cassetta?.id ?? null)
  if ((cassetta?.id ?? null) !== idPrec) {
    setIdPrec(cassetta?.id ?? null)
    setNomeRinomina(cassetta?.nome ?? '')
    setSalvando(false)
    setErroreRinomina(null)
    setErroreAzione(null)
    setSpostaBloccata(null)
    setAnnuncioSposta('')
    setChiediLibera(false)
    setChiediButta(false)
    setColorePending(null)
  }

  const occupata = !!cassetta?.lavoro
  const numero = cassetta?.lavoro?.numero ?? ''
  const nomeCassetta = cassetta?.nome ?? ''
  const nomeTrim = nomeRinomina.trim()
  const rinominaAbilitata = !!nomeTrim && nomeTrim !== nomeCassetta && !salvando
  // Stessa forma di `rinominaAbilitata`: si salva solo ciò che è davvero cambiato.
  const coloreAbilitato = !!colorePending && colorePending !== cassetta?.colore && !salvando

  async function salvaNome() {
    if (!cassetta || !rinominaAbilitata) return
    setSalvando(true)
    setErroreRinomina(null)
    try {
      const res = await fetch(`/api/cassette/${cassetta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeTrim }),
      })
      if (res.status === 200) {
        onCambiata()
        return
      }
      if (res.status === 422) {
        // Contratto route (PATCH /api/cassette/[id]): 422 {errore:'nome_non_valido'} = nome
        // fuori misura (1-20 char; qui il vuoto non parte mai, `rinominaAbilitata` lo blocca).
        // Un «riprova» cieco sarebbe un vicolo cieco: riprovare non accorcia il nome.
        const dati = (await res.json().catch(() => ({}))) as { errore?: string }
        setErroreRinomina(dati.errore === 'nome_non_valido' ? ERRORE_NOME_LUNGO : ERRORE_GENERICO)
        return
      }
      setErroreRinomina(res.status === 409 ? ERRORE_NOME_OCCUPATO : ERRORE_GENERICO)
    } catch {
      setErroreRinomina(ERRORE_GENERICO)
    } finally {
      setSalvando(false)
    }
  }

  async function scegliColore(colore: string) {
    if (!cassetta || salvando) return
    if (colore === cassetta.colore) return
    setSalvando(true)
    setErroreAzione(null)
    try {
      const res = await fetch(`/api/cassette/${cassetta.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colore }),
      })
      if (res.status === 200) {
        onCambiata()
        return
      }
      setErroreAzione(ERRORE_GENERICO)
    } catch {
      setErroreAzione(ERRORE_GENERICO)
    } finally {
      setSalvando(false)
    }
  }

  /** Ciò che arriva dai swatches NON è sempre una scelta conclusa (review Task 12, Important 1).
   *  Le 6 facce sì: un click è un valore discreto e finito, quindi si committa subito (una faccia
   *  = una PATCH = sheet chiuso, come tutte le altre azioni di questo sheet). Il custom no: il
   *  picker nativo emette valori LIVE mentre il cursore si trascina (React `onChange` = evento DOM
   *  `input`), e appenderci la PATCH significava salvare un colore intermedio a caso E chiudere lo
   *  sheet in faccia all'utente al primo pixel di movimento. Qui l'hex resta IN SOSPESO — visibile
   *  nello swatch, così la scelta si vede — e lo committa il tasto «Salva il colore», esattamente
   *  come il nome, che per la stessa ragione (input continuo, nessun commit proprio) ha «Salva il
   *  nome» invece di salvare a ogni tasto premuto. */
  function scegliDaiSwatches(colore: string) {
    if (colore.startsWith('#')) {
      setColorePending(colore)
      return
    }
    setColorePending(null)
    void scegliColore(colore)
  }

  async function spostaLavoroIn(destinazione: CassettaParete) {
    if (!cassetta?.lavoro || salvando) return
    setSalvando(true)
    setErroreAzione(null)
    setSpostaBloccata(null)
    try {
      const res = await fetch(`/api/lavori/${cassetta.lavoro.id}/cassetta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cassetta_id: destinazione.id }),
      })
      if (res.status === 200) {
        onCambiata()
        return
      }
      if (res.status === 409) {
        const dati = (await res.json().catch(() => ({}))) as { nome?: string | null }
        setSpostaBloccata(dati.nome ?? destinazione.nome)
        return
      }
      setErroreAzione(ERRORE_GENERICO)
    } catch {
      setErroreAzione(ERRORE_GENERICO)
    } finally {
      setSalvando(false)
    }
  }

  async function segnaComeLibera() {
    if (!cassetta?.lavoro) return
    setSalvando(true)
    setErroreAzione(null)
    try {
      const res = await fetch(`/api/lavori/${cassetta.lavoro.id}/cassetta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Liberazione: body il LETTERALE `null` (contratto route) — NON {cassetta_id:null}.
        body: JSON.stringify(null),
      })
      if (res.status === 200) {
        setChiediLibera(false)
        onCambiata()
        return
      }
      setChiediLibera(false)
      setErroreAzione(ERRORE_GENERICO)
    } catch {
      setChiediLibera(false)
      setErroreAzione(ERRORE_GENERICO)
    } finally {
      setSalvando(false)
    }
  }

  async function buttaVia() {
    if (!cassetta || occupata) return
    setSalvando(true)
    setErroreAzione(null)
    try {
      const res = await fetch(`/api/cassette/${cassetta.id}`, { method: 'DELETE' })
      if (res.status === 200) {
        setChiediButta(false)
        onCambiata()
        return
      }
      setChiediButta(false)
      setErroreAzione(ERRORE_GENERICO)
    } catch {
      setChiediButta(false)
      setErroreAzione(ERRORE_GENERICO)
    } finally {
      setSalvando(false)
    }
  }

  // L'annuncio (§5.4) parte SOLO a riordino avvenuto: una live region che dice «spostata al
  // posto 3» mentre la POST è fallita mentirebbe a chi non vede il muro — e il muro, al refresh,
  // resterebbe com'era. Il posto nuovo lo si calcola qui (di una posizione, sempre), la lista
  // completa la compone il PareteClient, che è l'unico a possedere `parete`.
  async function spostaPosizione(direzione: 'su' | 'giu') {
    if (salvando) return
    const nuovoPosto = direzione === 'su' ? posto - 1 : posto + 1
    setSalvando(true)
    setErroreAzione(null)
    try {
      const riuscito = await onSposta(direzione)
      if (riuscito) {
        setAnnuncioSposta(`${nomeCassetta} spostata al posto ${nuovoPosto}`)
        return
      }
      setAnnuncioSposta('')
      setErroreAzione(ERRORE_GENERICO)
    } finally {
      setSalvando(false)
    }
  }

  const puoSalire = posto > 1
  const puoScendere = posto < totale

  // Review finale whole-branch, Fix 1 — Sheet e DialogConferma ascoltano ENTRAMBI Esc su window:
  // con un dialog di conferma aperto, un solo Esc chiudeva dialog E sheet insieme (e lo scrim
  // dello sheet sotto un dialog distruttivo non deve comunque chiudere). La guardia vive qui,
  // nel compositore: i due componenti ds restano intatti (altre superfici li usano da soli).
  const dialogAperto = chiediLibera || chiediButta

  return (
    <>
      <Sheet aperto={aperto} onChiudi={() => { if (!dialogAperto) onChiudi() }} titolo={nomeCassetta}>
        {cassetta && (
          <>
            {occupata && (
              <p className="ds-sheet-info">
                n.{numero} · {cassetta.lavoro?.dentista}
              </p>
            )}

            {/* Rinomina — PATCH {nome}. Non un TastoPrimario (uno per schermata, §5.1): un
                TastoSecondario «Salva il nome», abilitato solo se il nome è cambiato. */}
            <div>
              <CampoTesto label="Nome" valore={nomeRinomina} onCambia={setNomeRinomina} />
              <div style={{ marginTop: spazio.s }}>
                <TastoSecondario onClick={salvaNome} disabled={!rinominaAbilitata}>
                  Salva il nome
                </TastoSecondario>
              </div>
              {erroreRinomina && (
                <p role="alert" className="ds-sheet-errore">
                  {erroreRinomina}
                </p>
              )}
            </div>

            {/* Colore — PATCH {colore}. Una faccia standard = un tap = una chiamata; il colore
                custom resta in sospeso e lo committa «Salva il colore» (v. `scegliDaiSwatches`):
                il picker nativo emette valori LIVE, salvarli tutti significherebbe scrivere un
                colore intermedio a caso e chiudere lo sheet a metà scelta. */}
            <div>
              <p className="ds-sheet-sezione">Colore</p>
              <div style={{ marginTop: 10 }}>
                <SwatchesColore
                  valore={colorePending ?? cassetta.colore}
                  onScegli={scegliDaiSwatches}
                  disabilitato={salvando}
                />
              </div>
              {colorePending && (
                <div style={{ marginTop: spazio.s }}>
                  <TastoSecondario
                    onClick={() => void scegliColore(colorePending)}
                    disabled={!coloreAbilitato}
                  >
                    Salva il colore
                  </TastoSecondario>
                </div>
              )}
            </div>

            {/* Sposta il lavoro in… (solo occupata, se ci sono cassette libere). */}
            {occupata && libere.length > 0 && (
              <div>
                <p className="ds-sheet-sezione">Sposta il lavoro in…</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                  {libere.map((l) => (
                    <ChipScelta key={l.id} selezionata={false} onClick={() => spostaLavoroIn(l)}>
                      {l.nome}
                    </ChipScelta>
                  ))}
                </div>
                {spostaBloccata && (
                  <div style={{ marginTop: spazio.s }}>
                    <RigaBloccante
                      cosa={`${spostaBloccata} è occupata`}
                      cosaFare="Scegline un'altra"
                      onTap={() => setSpostaBloccata(null)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Sposta (▲▼ posizione) — voce visibile di prim'ordine (§5.3: il long-press coi guanti
                è il gesto meno affidabile del banco). Riordino, non chiude lo sheet. */}
            {totale > 1 && (
              <div>
                <p className="ds-sheet-sezione">Sposta nel muro</p>
                <div className="ds-sposta-riga" style={{ marginTop: 10 }}>
                  {puoSalire && (
                    <TastoTondo glifo="▲" etichettaAria="Sposta su" onClick={() => spostaPosizione('su')} />
                  )}
                  {puoScendere && (
                    <TastoTondo glifo="▼" etichettaAria="Sposta giù" onClick={() => spostaPosizione('giu')} />
                  )}
                  <span className="ds-sposta-posto">
                    posto {posto} di {totale}
                  </span>
                </div>
                {/* aria-live: l'esito del riordino DETTO in parole (§5.4), non solo il movimento. */}
                <p role="status" aria-live="polite" className="ds-sheet-hint" style={{ minHeight: 18 }}>
                  {annuncioSposta}
                </p>
              </div>
            )}

            {/* Segna come libera (solo occupata) — la via d'uscita per il mondo fisico. */}
            {occupata && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <LinkQuieto onClick={() => setChiediLibera(true)}>Segna come libera</LinkQuieto>
              </div>
            )}

            {/* Butta via — attiva su libera (DialogConferma → DELETE); disabilitata su occupata
                (riga bloccante «Dentro c'è il n.{numero}» che porta a farla uscire). */}
            {occupata ? (
              <div>
                <p className="ds-sheet-disabilitata">Butta via</p>
                <div style={{ marginTop: spazio.s }}>
                  <RigaBloccante
                    cosa={`Dentro c'è il n.${numero}`}
                    cosaFare="Prima falla uscire"
                    onTap={() => setChiediLibera(true)}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <LinkQuieto onClick={() => setChiediButta(true)}>Butta via</LinkQuieto>
              </div>
            )}

            {erroreAzione && (
              <p role="alert" className="ds-sheet-errore" style={{ textAlign: 'center' }}>
                {erroreAzione}
              </p>
            )}
          </>
        )}
      </Sheet>

      {/* Conferma «Segna come libera» (occupata). */}
      <DialogConferma
        aperto={chiediLibera}
        titolo={`Il n.${numero} esce dalla ${nomeCassetta}?`}
        testo="Il caso esce senza consegna: la cassetta torna libera."
        etichettaDistruttiva="Sì, esce"
        etichettaSicura="Annulla"
        onConferma={segnaComeLibera}
        onAnnulla={() => setChiediLibera(false)}
      />

      {/* Conferma «Butta via» (libera). Dizionario: MAI «Elimina». */}
      <DialogConferma
        aperto={chiediButta}
        titolo={`Butto via la cassetta ${nomeCassetta}?`}
        testo="Sparisce dalla parete. È vuota, non perdi nessun lavoro."
        etichettaDistruttiva="Butta via"
        etichettaSicura="Tienila"
        onConferma={buttaVia}
        onAnnulla={() => setChiediButta(false)}
      />
    </>
  )
}
