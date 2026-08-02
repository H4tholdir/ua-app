'use client'

// UÀ — ScaricaDpaButton (P17, DS v2.3)
// Il tasto che scarica il contratto DPA, e che sa raccontare perché non ci
// riesce. Prima era un `<a href>` nudo: premerlo era una NAVIGAZIONE, quindi
// un errore della rotta finiva a schermo come `{"error":"…"}` — titolo vuoto,
// zero elementi premibili, e in una PWA installata nemmeno un «indietro».

import { useCallback, useState } from 'react'
import { BloccoAvviso } from '@/components/feedback/BloccoAvviso'
import { hapticLight } from '@/lib/feedback/haptic'

/** 🔄 CORRETTO il 02/08/2026 — rilievo dell'esecutore del Task 1 (R-E2).
 *  La prima stesura confrontava `codice: unknown` con stringhe scritte a mano:
 *  l'unione chiusa costruita nel Task 1 NON avrebbe protetto niente qui, e un
 *  refuso in `'LAB_DATI_FISCAL'` sarebbe compilato pulito, restituendo per
 *  sempre il messaggio di guasto generico. Ora i valori passano da una mappa
 *  verificata contro il tipo: il refuso non compila.
 *  ✅ `import type` è sicuro da un componente client: viene cancellato in
 *  compilazione, e `provato:` `errori-dpa.ts` non ha nemmeno `server-only`
 *  (`grep -c "server-only"` → 0).
 *  📌 Sta in testa e non a metà file (dov'era nel piano): un import in mezzo al
 *  codice funziona ma nasconde una dipendenza a chi apre il file. */
import type { CodiceDatiDpa } from '@/lib/pdf/errori-dpa'

const NOME_DI_RIPIEGO = 'contratto-dpa.pdf'

interface Props {
  clienteId: string
  /** `null` = i dati fiscali ci sono. Altrimenti di chi mancano — lo sa la
   *  pagina, che li ha già letti entrambi: così il titolare non prova nemmeno. */
  mancanza: 'laboratorio' | 'cliente' | null
}

type Esito = { titolo: string; testo: string; riprova: boolean; vaiAImpostazioni: boolean }

/** 🛑 Il nome del file viene SEMPRE dal server, mai costruito qui.
 *  `generate-dpa.ts` lo ricava dal numero progressivo, che è il nome VERO del
 *  documento — quello scritto nel registro e stampato dentro il PDF. Un nome
 *  costruito dal browser tornerebbe al difetto già pagato: due emissioni dello
 *  stesso dentista, a un anno di distanza, con lo stesso nome (Task 8 del
 *  01/08, `c1a1145d`).
 *  🔑 E qui serve DAVVERO leggerla: con un `<a href>` il nome lo sceglieva il
 *  browser dall'intestazione; con `fetch` il file arriva come dato grezzo, si
 *  apre su un indirizzo `blob:` che di intestazioni non ne ha nessuna, e senza
 *  questa riga il nome se lo inventerebbe il browser. */
function nomeDaHeader(intestazione: string | null): string {
  if (!intestazione) return NOME_DI_RIPIEGO
  // `filename="X"` oppure `filename=X`; RFC 5987 (`filename*=`) qui non serve —
  // i nostri nomi sono ASCII (DPA-AAAA-NNNN.pdf) — ma se arrivasse si ricade
  // sul ripiego invece di produrre spazzatura.
  const conApici = /filename="([^"]+)"/i.exec(intestazione)
  if (conApici?.[1]) return conApici[1]
  const nudo = /filename=([^;]+)/i.exec(intestazione)
  return nudo?.[1]?.trim() || NOME_DI_RIPIEGO
}

const CODICE = {
  labFiscali: 'LAB_DATI_FISCALI',
  clienteFiscali: 'CLIENTE_DATI_FISCALI',
  clienteAssente: 'CLIENTE_ASSENTE',
} as const satisfies Record<string, CodiceDatiDpa>

/** Dal codice/stato al messaggio. 🔑 MAI dal testo del messaggio: sarebbe la
 *  mappa fragile che `errori-dpa.ts` dichiara di aver evitato, un piano più su.
 *  ⚠️ Il parametro resta `unknown` DI PROPOSITO — arriva dalla rete, quindi non
 *  è verificato: è il CONFRONTO a essere tipizzato, non l'ingresso. */
function esitoDa(stato: number, codice: unknown): Esito {
  if (stato === 401) {
    return { titolo: 'Sessione scaduta', testo: 'Rientra e riprova: la tua sessione non è più valida.', riprova: false, vaiAImpostazioni: false }
  }
  if (stato === 403) {
    return { titolo: 'Non puoi emettere questo documento', testo: 'Il contratto lo emette il titolare del laboratorio.', riprova: false, vaiAImpostazioni: false }
  }
  if (codice === CODICE.labFiscali) {
    return { titolo: 'Mancano i dati del tuo laboratorio', testo: 'Senza Partita IVA il contratto non si può emettere per nessuno studio.', riprova: false, vaiAImpostazioni: true }
  }
  if (codice === CODICE.clienteFiscali) {
    // 🛑 QUI NON CI VA NESSUN TASTO, ed è una decisione — non una dimenticanza.
    //    Il disegno approvato ne prevedeva uno, «Aggiungi il dato», e in
    //    produzione sarebbe stato MORTO: la modifica del dentista è un pannello
    //    dentro `ClienteModificaButton` con uno `useState` suo
    //    (`ClienteModificaButton.tsx:11`), montato nell'intestazione della
    //    pagina — non ha nessun indirizzo, quindi da qui non si apre. L'`href="#"`
    //    del mockup era linguaggio da mockup.
    //    ➡️ **D165**: il tasto si toglie e il testo manda al «Modifica» che è già
    //    in cima a questa stessa schermata, a due dita di distanza. La pagina di
    //    modifica del dentista si costruirà a parte — voce **P30** della roadmap,
    //    fuori dal perimetro di P17. Il debito ha un numero e una destinazione.
    //    📌 Il rimando «in alto in questa schermata» è vero perché questo tasto
    //    vive SOLO nella scheda dentista (`clienti/[id]/page.tsx`), e la frase
    //    esce sia dalla prevenzione (`MANCANZA.cliente`, all'apertura) sia dal
    //    422 vivo. Chi un giorno montasse questo componente altrove deve
    //    riscrivere questa riga: è un rimando SPAZIALE, e si sposta con lui.
    return {
      titolo: 'Manca un dato dello studio',
      testo: 'Per emettere il contratto serve la Partita IVA o il Codice Fiscale del dentista. Il dato si aggiunge dal tasto Modifica, in alto in questa schermata.',
      riprova: false,
      vaiAImpostazioni: false,
    }
  }
  if (codice === CODICE.clienteAssente) {
    return { titolo: 'Questo studio non risulta più', testo: 'Potrebbe essere stato cancellato. Torna all\'elenco dei dentisti.', riprova: false, vaiAImpostazioni: false }
  }
  return { titolo: 'Non è stato possibile preparare il documento', testo: 'Non dipende dai tuoi dati. Se succede di nuovo, segnalacelo.', riprova: true, vaiAImpostazioni: false }
}

const MANCANZA: Record<'laboratorio' | 'cliente', Esito> = {
  laboratorio: esitoDa(422, CODICE.labFiscali),
  cliente: esitoDa(422, CODICE.clienteFiscali),
}

const stileTasto = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  height: '44px',
  padding: '0 18px',
  borderRadius: '10px',
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 700,
  fontSize: '14px',
  border: 0,
} as const

export function ScaricaDpaButton({ clienteId, mancanza }: Props) {
  const [inCorso, setInCorso] = useState(false)
  const [esito, setEsito] = useState<Esito | null>(null)

  const scarica = useCallback(async () => {
    // Due pressioni rapide devono chiamare la rotta UNA volta: ogni emissione
    // lascia una riga nel registro.
    if (inCorso || mancanza) return
    hapticLight()
    setInCorso(true)
    setEsito(null)
    try {
      const risposta = await fetch(`/api/clienti/${clienteId}/dpa`)
      if (!risposta.ok) {
        // A4: il corpo può NON essere JSON (pagina d'errore della piattaforma).
        let codice: unknown = null
        try {
          codice = (await risposta.json())?.codice ?? null
        } catch {
          codice = null
        }
        setEsito(esitoDa(risposta.status, codice))
        return
      }
      const blob = await risposta.blob()
      const nome = nomeDaHeader(risposta.headers.get('content-disposition'))
      const url = URL.createObjectURL(blob)
      const ancora = document.createElement('a')
      ancora.href = url
      ancora.download = nome
      document.body.appendChild(ancora)
      ancora.click()
      ancora.remove()
      URL.revokeObjectURL(url)
    } catch {
      setEsito({ titolo: 'Non è stato possibile preparare il documento', testo: 'Controlla la connessione e riprova.', riprova: true, vaiAImpostazioni: false })
    } finally {
      setInCorso(false)
    }
  }, [clienteId, inCorso, mancanza])

  const inerte = Boolean(mancanza) || inCorso
  const mostrato = mancanza ? MANCANZA[mancanza] : esito

  return (
    <>
      <button
        type="button"
        onClick={scarica}
        // 🛑 `aria-disabled`, NON `disabled`: quest'ultimo toglierebbe il tasto
        //    dalla navigazione da tastiera e dai lettori di schermo, proprio
        //    quando accanto c'è il messaggio che spiega come rimediare.
        aria-disabled={inerte || undefined}
        style={{
          ...stileTasto,
          background: inCorso ? 'var(--t3, #6B5C51)' : mancanza ? 'transparent' : 'var(--primary, #D90012)',
          color: mancanza ? 'var(--t1, #1C1916)' : '#fff',
          border: mancanza ? '1px solid var(--t3, #6B5C51)' : 0,
          boxShadow: inerte ? 'none' : 'var(--sh-red)',
          cursor: inCorso ? 'progress' : mancanza ? 'not-allowed' : 'pointer',
        }}
      >
        {inCorso ? (
          <>
            {/* 📌 Il segno è FERMO, e non è una dimenticanza: il mockup
                approvato non ha nessuna animazione (`grep keyframes` →
                nessuna riga). Non «ripararlo» aggiungendo una rotazione. */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.6" strokeOpacity=".35" />
              <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            Preparo il documento…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v8M5 8l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Scarica DPA PDF
          </>
        )}
      </button>

      {mostrato && (
        <BloccoAvviso
          tipo={mostrato.riprova ? 'guasto' : 'attesa'}
          titolo={mostrato.titolo}
          testo={mostrato.testo}
          azione={
            mostrato.vaiAImpostazioni
              ? { etichetta: 'Completa i dati del laboratorio', href: '/impostazioni' }
              : mostrato.riprova
                ? { etichetta: 'Riprova', onClick: () => void scarica() }
                : undefined
          }
        />
      )}
    </>
  )
}
