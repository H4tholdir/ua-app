'use client'

// P31 — D183 · D185. Il cellulare WhatsApp del cliente può mancare: il tasto
// che manda un messaggio (consegna, o un sollecito dallo scadenzario) non
// deve morire. Chiede il numero, lo SALVA in anagrafica, POI il chiamante
// apre WhatsApp.
//
// 🔄 D185 (03/08/2026): questo foglio nasce CONDIVISO — lo montano quattro
// schermate (consegna + tre punti dello scadenzario), non solo la consegna.
// Per questo vive in `features/clienti/` (è un pezzo di anagrafica) e NON
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
   *  sopra il campo, fedele al mockup approvato (D186): «Manca ancora un
   *  cellulare per Studio Piegari…». Generico apposta (mai "per lo"/"per il"):
   *  il nome è testo libero, l'articolo giusto in italiano dipende dal genere
   *  del nome e questo componente non può saperlo. */
  nomeDestinatario: string
  onChiudi: () => void
  onSalvato: (cellulare: string) => void
}) {
  const { aperto, clienteId, nomeDestinatario, onChiudi, onSalvato } = props
  const [cellulare, setCellulare] = useState('')
  const [invio, setInvio] = useState(false)
  const [guasto, setGuasto] = useState(false)

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
        Manca ancora un cellulare per <strong style={{ color: 'var(--ink)', fontWeight: tipografia.weight.extrabold }}>{nomeDestinatario}</strong>: il messaggio parte da qui.
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
