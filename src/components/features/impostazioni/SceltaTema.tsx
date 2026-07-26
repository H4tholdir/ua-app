'use client'

// Riga «Tema» — /impostazioni → Aspetto. L'UNICO punto dell'app in cui si sceglie se
// l'app è chiara o scura: prima erano sette, con quattro regole diverse (v. spec
// docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md §3).
//
// Variante A ratificata (D8): righe col pallino, identiche a «La tua home», più una
// frase che dice sempre che cosa si sta seguendo adesso. Francesco preferisce la forma
// B (tre pulsanti), ma B esiste già pronta in v3 (ChipScelta) e qui andrebbe ricostruita
// a mano e buttata alla migrazione: arriverà gratis con l'ondata v3 di /impostazioni.
// Mockup: docs/design/mockups/2026-07-26-tema-impostazioni.html
//
// Pagina legacy v2.3: stile inline con CSS var + fallback, anatomia copiata da
// SceltaHome.tsx (t2 #4A3D33, t3 #6B5C51, primary #D90012). Niente v3 qui (regola di
// convivenza DS §14).
//
// Differenza da SceltaHome: NIENTE rete. La preferenza è locale al dispositivo — non
// passa dal server, non può fallire, non ha stato di salvataggio né rollback. Un
// laboratorio che usa il telefono in officina e il computer in ufficio può volerli
// diversi, e questa è la scelta giusta anche per questo.
import { useTheme } from '@/hooks/useTheme'
import type { ModoTema } from '@/lib/preferenze/tema'

const OPZIONI: ReadonlyArray<{ valore: ModoTema; etichetta: string; nota?: string }> = [
  { valore: 'sistema', etichetta: 'Automatico', nota: '— come il telefono' },
  { valore: 'chiaro', etichetta: 'Sempre chiaro' },
  { valore: 'scuro', etichetta: 'Sempre scuro' },
]

// La clausola «anche se il telefono è …» si dice SOLO quando il blocco diverge davvero
// dal telefono: appiccicarla sempre produrrebbe una frase falsa una volta su due.
function fraseDiStato(modo: ModoTema, sistemaScuro: boolean): string {
  if (modo === 'sistema') return `Ora segue il telefono: ${sistemaScuro ? 'scuro' : 'chiaro'}.`

  const bloccatoSuScuro = modo === 'scuro'
  if (bloccatoSuScuro === sistemaScuro) {
    return bloccatoSuScuro ? 'Bloccato sullo scuro.' : 'Bloccato sul chiaro.'
  }
  return bloccatoSuScuro
    ? 'Bloccato sullo scuro, anche se il telefono è chiaro.'
    : 'Bloccato sul chiaro, anche se il telefono è scuro.'
}

export function SceltaTema() {
  const { modo, sistemaScuro, impostaModo } = useTheme()

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
        Tema
      </p>

      <div role="radiogroup" aria-label="Tema" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {OPZIONI.map(({ valore, etichetta, nota }) => (
          <label
            key={valore}
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
              name="tema-pref"
              value={valore}
              checked={modo === valore}
              onChange={() => impostaModo(valore)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary, #D90012)', cursor: 'pointer' }}
            />
            <span>
              {etichetta}
              {nota && (
                <span style={{ color: 'var(--t3, #6B5C51)', marginLeft: '5px' }}>{nota}</span>
              )}
            </span>
          </label>
        ))}
      </div>

      {/* La frase c'è sempre: senza, «Automatico» non direbbe quale dei due si sta
          vedendo, e il blocco non direbbe se sta divergendo dal telefono. */}
      <p
        aria-live="polite"
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          color: 'var(--t3, #6B5C51)',
          margin: '6px 0 0 28px',
          lineHeight: 1.5,
        }}
      >
        {fraseDiStato(modo, sistemaScuro)}
      </p>
    </div>
  )
}
