'use client'

// Riga «La tua home» (Task 17) — /impostazioni → Aspetto. Tre radio per scegliere la forma
// della home: le due stanze (pile + parete), solo le pile, solo la parete. Al cambio, PATCH
// /api/impostazioni/preferenze {home} (contratto: route.ts — validazione stretta isHomePref,
// 422 fuori enum, 500 su RPC in errore).
//
// Pagina legacy v2.3: stile inline con CSS var + fallback, coerente con impostazioni/page.tsx e
// AttivaAccessoRapido.tsx (t2 #4A3D33, t3 #6B5C51, success #16A34A, primary #D90012). Niente v3
// qui (regola convivenza DS §14). Niente animazioni (coerente con le altre righe della pagina).
//
// La radio NON deve MAI mentire sullo stato SALVATO (constraint d'ondata #4): il valore è
// ottimistico durante il salvataggio, ma un esito non-ok (o un fetch che rigetta) riporta la
// selezione al valore precedente confermato — l'utente deve capire che la scelta NON è passata.
import { useState, useCallback } from 'react'
import type { HomePref } from '@/lib/preferenze/home'

const OPZIONI: ReadonlyArray<{ valore: HomePref; etichetta: string }> = [
  { valore: 'due_stanze', etichetta: 'Le due stanze — pile e parete' },
  { valore: 'pile', etichetta: 'Solo le pile — che cosa urge' },
  { valore: 'parete', etichetta: 'Solo la parete — dove stanno' },
]

type Stato = { tipo: 'idle' } | { tipo: 'salvataggio' } | { tipo: 'ok' } | { tipo: 'errore' }

export function SceltaHome({ iniziale }: { iniziale: HomePref }) {
  // `valore` = ciò che la radio mostra; `confermato` = l'ultimo valore che il server ha salvato
  // (il punto di ritorno se il PATCH fallisce). Restano allineati tranne durante un salvataggio.
  const [valore, setValore] = useState<HomePref>(iniziale)
  const [confermato, setConfermato] = useState<HomePref>(iniziale)
  const [stato, setStato] = useState<Stato>({ tipo: 'idle' })

  const scegli = useCallback(async (next: HomePref) => {
    if (next === confermato && stato.tipo !== 'errore') return
    setValore(next) // ottimistico
    setStato({ tipo: 'salvataggio' })
    try {
      const res = await fetch('/api/impostazioni/preferenze', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home: next }),
      })
      if (res.ok) {
        setConfermato(next)
        setStato({ tipo: 'ok' })
      } else {
        setValore(confermato) // la radio torna al valore davvero salvato: non mente
        setStato({ tipo: 'errore' })
      }
    } catch {
      setValore(confermato)
      setStato({ tipo: 'errore' })
    }
  }, [confermato, stato.tipo])

  return (
    <div style={{ padding: '10px 0 4px' }}>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--t2, #4A3D33)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: '0 0 10px',
        }}
      >
        La tua home
      </p>

      <div role="radiogroup" aria-label="La tua home" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {OPZIONI.map(({ valore: v, etichetta }) => (
          <label
            key={v}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minHeight: '44px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              color: 'var(--t1, #1C1916)',
            }}
          >
            <input
              type="radio"
              name="home-pref"
              value={v}
              checked={valore === v}
              onChange={() => scegli(v)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary, #D90012)', cursor: 'pointer' }}
            />
            <span>{etichetta}</span>
          </label>
        ))}
      </div>

      {/* Avvertenza quieta sotto la terza opzione: chi sceglie «solo la parete» non perde le pile. */}
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          color: 'var(--t3, #6B5C51)',
          margin: '6px 0 0 28px',
          lineHeight: 1.5,
        }}
      >
        Le pile restano raggiungibili da ☰ → I lavori.
      </p>

      {stato.tipo === 'ok' && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--success, #16A34A)',
            margin: '10px 0 0',
          }}
        >
          Salvato.
        </p>
      )}
      {stato.tipo === 'errore' && (
        <p
          role="alert"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--primary, #D90012)',
            margin: '10px 0 0',
          }}
        >
          Non è stato possibile salvare la scelta. Riprova.
        </p>
      )}
    </div>
  )
}
