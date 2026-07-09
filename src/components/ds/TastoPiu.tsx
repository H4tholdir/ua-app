'use client'

// DS v3 §5.2 rev (09/07 — decisione Francesco dal collaudo live: bocciato
// l'otturatore radiale, scelto un pulsante fisico analogico, riferimento un
// pulsante smart-home bianco) — TastoPiu vive SOLO in basso al centro della
// home (L1): è il modo in cui si apre un nuovo lavoro. Il morph di questo
// tasto dentro il wizard (coreografia §8.3.2) è del sotto-progetto 3 — qui
// c'è SOLO il comportamento fisico della pressione.

import { useState } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, materia, spazio, tipografia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

/**
 * TastoPiu — il pulsante fisico della home (§5.2 rev).
 *
 * Anatomia di legge: due corpi concentrici come un vero pulsante a membrana,
 * dentro una hit area invisibile Ø 110 (padding trasparente):
 * - ghiera (base) Ø 92, ferma, ombra ambiente morbida;
 * - solco: anello 2px a Ø ~76 fra ghiera e cappello;
 * - cappello (parte che si preme) Ø 68, leggermente bombato, glifo "+"
 *   sottile e quieto inciso a colore muted.
 *
 * Pressione fisica: SOLO il cappello affonda (translateY 2.5 + scala .97,
 * l'ombra a riposo si spegne e appare un affondo inset) — la ghiera resta
 * ferma. Molla `press`, suono "tap", vibrazione media. Nient'altro: non
 * anima da sola, non cambia forma qui.
 */
export function TastoPiu(props: { onClick: () => void; etichetta?: string }) {
  const { onClick, etichetta = 'Nuovo lavoro' } = props
  const [premuto, setPremuto] = useState(false)

  function handleClick() {
    suona('tap')
    vibra('medium')
    onClick()
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: spazio.s }}>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato, non dipende dal CSS del catalogo.
          Colori dark-aware via tecnica delle classi scoped (precedente
          PillVoce): i valori-legge non tokenizzati vengono da v3/tokens.ts,
          mai scritti qui come letterali. */}
      <style>{`
        .ds-tasto-piu:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
        .ds-tasto-piu-ghiera {
          background: var(--card);
          box-shadow: ${materia.ombraGhiera};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-tasto-piu-ghiera {
          box-shadow: none;
        }
        .ds-tasto-piu-solco {
          border: 2px solid ${materia.solcoTastoPiu};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-tasto-piu-solco {
          border-color: ${materia.solcoTastoPiuNotte};
        }
        .ds-tasto-piu-cappello {
          background: ${gradiente.tastoPiu};
          box-shadow: ${materia.luceCappello}, ${materia.ombraCappello};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-tasto-piu-cappello {
          background: var(--elv);
          border-top: 1px solid ${materia.bordoCappelloNotte};
          box-shadow: none;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-tasto-piu"
        onClick={handleClick}
        onTapStart={() => setPremuto(true)}
        onTap={() => setPremuto(false)}
        onTapCancel={() => setPremuto(false)}
        aria-label={etichetta}
        style={{
          position: 'relative',
          width: 110,
          height: 110,
          padding: 0,
          border: 'none',
          background: 'transparent',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Ghiera (base) Ø 92 — ferma, non riceve nessuna animazione. */}
        <span
          aria-hidden="true"
          data-parte="ghiera"
          className="ds-tasto-piu-ghiera"
          style={{
            position: 'relative',
            width: 92,
            height: 92,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Solco: anello sottile a Ø ~76 fra ghiera e cappello, centrato
              con margini (mai `transform`, riservato al cappello). */}
          <span
            aria-hidden="true"
            data-parte="solco"
            className="ds-tasto-piu-solco"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              marginTop: -38,
              marginLeft: -38,
              width: 76,
              height: 76,
              borderRadius: '50%',
              boxSizing: 'border-box',
            }}
          />
          {/* Cappello (parte che si preme) Ø 68 — l'unica parte che affonda.
              `premuto` viene dal gesture del bottone (hit area intera 110),
              non dal proprio pointer: la ghiera resta ferma. */}
          <motion.div
            aria-hidden="true"
            data-parte="cappello"
            className="ds-tasto-piu-cappello"
            animate={{ y: premuto ? 2.5 : 0, scale: premuto ? 0.97 : 1 }}
            transition={molla.press}
            style={{
              position: 'relative',
              width: 68,
              height: 68,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 40,
              fontWeight: 300,
              lineHeight: 1,
              color: 'var(--muted)',
              boxShadow: premuto ? materia.affondoCappello : undefined,
            }}
          >
            +
          </motion.div>
        </span>
      </motion.button>
      <span
        style={{
          fontSize: 17.5,
          fontWeight: tipografia.weight.extrabold,
          color: 'var(--ink)',
        }}
      >
        {etichetta}
      </span>
    </div>
  )
}
