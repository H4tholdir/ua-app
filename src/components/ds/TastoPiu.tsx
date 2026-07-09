'use client'

// DS v3 §5.2 rev 2 (09/07 — variante B «il punto rosso» scelta da Francesco).
// FONTE DI VERITÀ visiva: docs/design/mockups/2026-07-09-tastopiu-v3-due-varianti.html
// classe `.tpB` (+ `.notte .tpB`) — questo componente ne è il porting fedele,
// nessun valore reinterpretato (decisione: docs/design/decisions/
// 2026-07-09-tastopiu-punto-rosso.md).

import { useState } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { spazio, tastoPiu, tipografia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

/**
 * TastoPiu — «il punto rosso» (§5.2 rev 2).
 *
 * Vive SOLO in basso al centro della home (L1: il "nuovo" si fa dalla home);
 * al tocco si preme, poi fa il morph continuo nel wizard (§8.3.2 — sotto-
 * progetto 3: qui c'è solo la pressione fisica).
 *
 * Anatomia (mockup `.tpB`, dentro una hit area invisibile Ø 110):
 * - ghiera Ø 92 tono-su-tono con la carta — il pulsante *affiora* dal fondo;
 * - solco: anello d'ombra vero (inset 11) fra ghiera e cappello;
 * - cappello bombato (inset 14) — l'unica parte che affonda;
 * - glifo + 42/350 in `var(--red)`: **il + rosso è l'unico rosso della home**.
 *
 * Pressed (valori dal mockup `:active`): il cappello affonda (translateY 2.5 +
 * scala .972, molla `press`), gradiente e ombra passano ai valori pressed, il
 * glifo scurisce (`var(--red-dark)` in light, `tastoPiu.piuPressedNotte` in dark);
 * la ghiera si assesta appena (ombra ridotta). Suono "tap" + vibrazione media.
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
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: spazio.sm }}>
      {/* Valori-legge del mockup via classi scoped (precedente PillVoce): le
          regole dark replicano `.notte .tpB` sotto [data-theme="dark"]. La
          cascata è la stessa del mockup: in dark la regola base notte (più
          specifica) vince sul pressed light — al pressed dark cambiano solo
          l'affondo del cappello e il colore del glifo, come da `.notte
          .tpB:active`. Il transform del cappello è di Motion (molla.press),
          MAI in transition CSS. */}
      <style>{`
        .ds-tastopiu:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
        .ds-tastopiu-ghiera {
          background: ${tastoPiu.ghiera};
          box-shadow: ${tastoPiu.ghieraOmbra};
          transition: ${tastoPiu.transizioneGhiera};
        }
        .ds-tastopiu--premuto .ds-tastopiu-ghiera {
          box-shadow: ${tastoPiu.ghieraOmbraPressed};
        }
        .ds-tastopiu-solco {
          background: ${tastoPiu.solco};
          box-shadow: ${tastoPiu.solcoOmbra};
        }
        .ds-tastopiu-cappello {
          background: ${tastoPiu.cappello};
          box-shadow: ${tastoPiu.cappelloOmbra};
          transition: ${tastoPiu.transizioneCappello};
        }
        .ds-tastopiu--premuto .ds-tastopiu-cappello {
          background: ${tastoPiu.cappelloPressed};
          box-shadow: ${tastoPiu.cappelloOmbraPressed};
        }
        .ds-tastopiu-piu {
          color: var(--red);
          text-shadow: ${tastoPiu.piuOmbra};
        }
        .ds-tastopiu--premuto .ds-tastopiu-piu {
          color: var(--red-dark);
        }
        [data-theme="dark"] [data-ds="v3"] .ds-tastopiu-ghiera {
          background: ${tastoPiu.ghieraNotte};
          box-shadow: ${tastoPiu.ghieraOmbraNotte};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-tastopiu-solco {
          background: ${tastoPiu.solcoNotte};
          box-shadow: ${tastoPiu.solcoOmbraNotte};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-tastopiu-cappello {
          background: ${tastoPiu.cappelloNotte};
          box-shadow: ${tastoPiu.cappelloOmbraNotte};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-tastopiu--premuto .ds-tastopiu-cappello {
          box-shadow: ${tastoPiu.cappelloOmbraPressedNotte};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-tastopiu-piu {
          text-shadow: none;
        }
        [data-theme="dark"] [data-ds="v3"] .ds-tastopiu--premuto .ds-tastopiu-piu {
          color: ${tastoPiu.piuPressedNotte};
        }
      `}</style>
      <motion.button
        type="button"
        className={premuto ? 'ds-tastopiu ds-tastopiu--premuto' : 'ds-tastopiu'}
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
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* Ghiera Ø 92 — ferma: si assesta solo la sua ombra (CSS), mai il transform. */}
        <span
          aria-hidden="true"
          data-parte="ghiera"
          className="ds-tastopiu-ghiera"
          style={{
            position: 'relative',
            width: 92,
            height: 92,
            borderRadius: '50%',
            display: 'block',
          }}
        >
          {/* Solco: anello d'ombra a inset 11 (Ø 70) fra ghiera e cappello. */}
          <span
            aria-hidden="true"
            data-parte="solco"
            className="ds-tastopiu-solco"
            style={{
              position: 'absolute',
              top: 11,
              left: 11,
              width: 70,
              height: 70,
              borderRadius: '50%',
            }}
          />
          {/* Cappello bombato a inset 14 (Ø 64) — l'unica parte che affonda.
              `premuto` viene dal gesture del bottone (hit area intera 110). */}
          <motion.span
            aria-hidden="true"
            data-parte="cappello"
            className="ds-tastopiu-cappello"
            animate={{ y: premuto ? 2.5 : 0, scale: premuto ? 0.972 : 1 }}
            transition={molla.press}
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {/* La firma: il + rosso UÀ, tratto sottile, inciso nella carta.
                translateY: correzione ottica RIDERIVATA per Plus Jakarta Sans
                (il mockup rendeva il + col font di fallback, dove -1px bastava;
                il + di PJS siede più in basso nel suo em box). -8.5px riproduce
                ESATTAMENTE la posizione dell'inchiostro del mockup approvato
                (centro ink a -2.25px dal centro del cappello — misura Playwright
                a dsf 2, report r4). */}
            <span
              data-parte="piu"
              className="ds-tastopiu-piu"
              style={{
                fontSize: 42,
                fontWeight: 350,
                lineHeight: 1,
                transform: 'translateY(-8.5px)',
                userSelect: 'none',
              }}
            >
              +
            </span>
          </motion.span>
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
