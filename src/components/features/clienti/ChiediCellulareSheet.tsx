'use client'

// P31 — D183 · D185. Il cellulare WhatsApp del cliente può mancare: il tasto
// che manda un messaggio (consegna, o un sollecito dallo scadenzario) non
// deve morire. Chiede il numero, lo SALVA in anagrafica, POI il chiamante
// apre WhatsApp.
//
// 🔄 D185 (03/08/2026), numero aggiornato da D187 (03/08/2026): questo foglio
// nasce CONDIVISO — lo montano CINQUE punti di montaggio (consegna +
// accettazione + tre punti dello scadenzario), non solo la consegna. Numero
// verificato sul codice (censimento import di questo componente): non è più
// "quattro" da quando D187 ha aggiunto il punto dell'accettazione in
// ingresso (`TabAccettazione.tsx`) — v. anche il commento della prop
// `nomeDestinatario` qui sotto, che già diceva "cinque". Per questo vive in
// `features/clienti/` (è un pezzo di anagrafica) e NON
// sa nulla di "consegna" o "sollecito": riceve `clienteId` e restituisce il
// cellulare salvato con `onSalvato`, il chiamante decide come usarlo.
//
// 🛑 L'ORDINE È VINCOLANTE (D183). Salvare dopo l'invio separerebbe due fatti
// che devono restare insieme: se il salvataggio fallisce dopo che WhatsApp è
// già partito, alla consegna/sollecito successivo il programma richiederebbe
// di nuovo lo stesso numero. Qui si salva PRIMA (`await fetch` risolto,
// `res.ok` verificato) e SOLO allora si chiama `onSalvato`, che è quanto il
// chiamante userà per aprire WhatsApp.
//
// Componenti: SOLO da `src/components/ds/` (v3). `Sheet` porta con sé
// `data-ds="v3"` sul proprio portale (v. Sheet.tsx) — è per questo che può
// montare da una pagina v2.3 (i tre punti dello scadenzario) senza mischiare
// i due design system nella stessa pagina: il suo DOM vive fuori dallo scope
// della pagina che lo apre. `TastoPrimario`, invece, NON si auto-scopa — resta
// dentro questo foglio (che eredita `data-ds="v3"` dal portale di `Sheet`), e
// NON viene riusato come tasto-trigger nelle pagine v2.3: lì il trigger resta
// uno stile locale del chiamante (§14 DS v3 — migrazione per route, mai per
// componente).
import { useState } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { tipografia } from '@/design-system/v3/tokens'

export function ChiediCellulareSheet(props: {
  aperto: boolean
  clienteId: string
  /** Nome di chi riceverà il messaggio (dentista/studio) — riga di contesto
   *  sopra il campo. D187 (03/08/2026): l'ordine torna a quello del mockup
   *  approvato («Per lo Studio Piegari manca ancora un cellulare…»), ma senza
   *  «di consegna» — D185 ha allargato questo foglio anche ai solleciti di
   *  pagamento, e «messaggio di consegna» sarebbe falso in tre dei cinque
   *  punti di montaggio. Il nome va fra virgolette («…») invece che dopo un
   *  articolo del tipo "per lo"/"per il": resta generico apposta, perché è
   *  testo libero (nome di studio o "nome cognome" del dentista) e l'articolo
   *  giusto in italiano dipende dal genere del nome, cosa che questo
   *  componente non può sapere. */
  nomeDestinatario: string
  onChiudi: () => void
  onSalvato: (cellulare: string) => void
}) {
  const { aperto, clienteId, nomeDestinatario, onChiudi, onSalvato } = props
  const [cellulare, setCellulare] = useState('')
  const [invio, setInvio] = useState(false)
  const [guasto, setGuasto] = useState(false)

  // 🔴 R1 (revisione finale ramo, 03/08/2026) — questo foglio è montato
  // INCONDIZIONATAMENTE dai chiamanti (§ commento in cima): non si smonta mai,
  // quindi il suo stato sopravvive alla chiusura. Sul percorso di successo di
  // `salvaEInvia` `setInvio(false)` non veniva MAI chiamato (viveva solo nei
  // due rami di errore sotto): il tasto restava disabilitato con «Un
  // attimo…» per sempre alla riapertura successiva. Si azzera quando `aperto`
  // torna falso — copre lo stesso salvataggio andato a buon fine E, in più,
  // il campo che altrimenti si ripresenterebbe già scritto dalla volta
  // precedente (nessuno dei cinque chiamanti smonta mai questo componente per
  // farlo da solo).
  //
  // Pattern "adjusting state when a prop changes" (React docs), NON un
  // `useEffect`: si azzera IN RENDER confrontando `aperto` con l'ultimo
  // valore visto, evitando sia il giro di render in più che un effect
  // introdurrebbe sia l'errore lint `react-hooks/set-state-in-effect`
  // (chiamare `setState` dentro un effect senza un evento esterno reale).
  const [apertoVisto, setApertoVisto] = useState(aperto)
  if (aperto !== apertoVisto) {
    setApertoVisto(aperto)
    if (!aperto) {
      setCellulare('')
      setInvio(false)
      setGuasto(false)
    }
  }

  async function salvaEInvia() {
    if (!cellulare.trim()) return
    setInvio(true)
    setGuasto(false)
    try {
      const res = await fetch(`/api/clienti/${clienteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cellulare_whatsapp: cellulare.trim() }),
      })
      if (!res.ok) {
        setGuasto(true)
        setInvio(false)
        return
      }
      // 🛑 onSalvato PRIMA di ogni reset locale: è qui che il chiamante apre
      // WhatsApp — l'ordine salva→apri (D183) è già garantito dall'await sopra.
      onSalvato(cellulare.trim())
    } catch {
      setGuasto(true)
      setInvio(false)
    }
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo="Il cellulare per WhatsApp">
      <p style={{ fontSize: 15.5, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', lineHeight: 1.4, margin: 0 }}>
        Per «<strong style={{ color: 'var(--ink)', fontWeight: tipografia.weight.extrabold }}>{nomeDestinatario}</strong>» manca ancora un cellulare: il messaggio parte da qui.
      </p>
      <CampoTesto
        label="Cellulare WhatsApp"
        valore={cellulare}
        onCambia={setCellulare}
        placeholder="333 1234567"
        inputMode="tel"
        aiuto="È il numero a cui UÀ manda i messaggi di consegna su WhatsApp — ci vuole un cellulare, non il fisso dello studio."
        autoFocus
      />
      {guasto && (
        <p role="alert" style={{ margin: 0, fontSize: 14.5, fontWeight: tipografia.weight.semibold, color: 'var(--red)' }}>
          Non sono riuscita a salvare il numero. Riprova.
        </p>
      )}
      <TastoPrimario
        onClick={() => void salvaEInvia()}
        disabled={invio || !cellulare.trim()}
        motivoDisabilitato={invio ? 'Un attimo…' : 'Scrivi il cellulare'}
      >
        Salva e apri WhatsApp
      </TastoPrimario>
    </Sheet>
  )
}
