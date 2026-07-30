'use client'

// DS v3 §5.38 — CartaAlbum: la carta delle foto sulla scheda del lavoro e sulla
// modifica. Sostituisce FotoStrip (§5.33), che era l'unico blocco della pagina
// SENZA titolo. Non è uno strato: è contenuto di pagina, e il `Tab` la
// attraversa — nessuna trappola del focus (§5.38, ed è l'unica delle cinque
// sezioni dell'ondata (b) in cui la risposta è «niente»).
//
// CONTRATTO SICUREZZA (G5 · D75). `url` è SEMPRE una signed URL generata
// server-side al render (pattern B5, lib/storage/signed-url.ts). Qui entra in
// UN SOLO POSTO: il `src` di un `<img>`. Mai in `title`, `href`, `download`,
// `aria-label`, `data-*`, appunti o testo — e nessuna callback riceve la foto
// intera: chi deve dire «questa» dice l'INDICE. La prova che lo sorveglia
// (sentinella cercata in tutto l'HTML reso, per POSTO e non per conteggio) sta
// in tests/unit/ds-v3/componenti/CartaAlbum.test.tsx.
//
// ORDINE. L'unica fonte è `src/lib/domain/categorie-foto.ts`:
// `raggruppaPerCategoria` ordina GIÀ dentro di sé (gruppi nell'ordine di D71,
// dentro il gruppo per `created_at` con `id` come spareggio). 🛑 Qui non si
// riordina niente, o due ordini si contenderebbero la stessa lista. Il
// contatore «n di m» si conta dalla POSIZIONE nell'elenco ordinato appiattito,
// MAI dalla colonna `ordine` — che in banca dati è ambigua (schema DEFAULT 1,
// l'insert scrive 0) e che questa superficie non legge.
//
// `indiceAperto` — SCELTA DICHIARATA, non prescritta. La §5.38 (che è la legge)
// non nomina mai questa prop: esiste solo nella riga di firma del piano. Qui
// vale la lettura piana: se il chiamante lo passa, decide lui quale foto è la
// grande (è così che la carta segue il visore mentre si sfoglia); se non lo
// passa, la carta tiene la sua scelta interna. Nessun effetto, nessuna
// risincronizzazione: chi apre il visore ha già l'indice in mano, ed è suo.
// Un indice fuori dall'elenco si ripiega sulla prima foto — in T12 una foto
// eliminata può lasciare indietro un indice vecchio, e leggere `undefined`
// sarebbe una schermata bianca al posto di una carta.
// 🛑 LA CONSEGUENZA, PER CHI MONTA LA CARTA (T10): finché `indiceAperto` è
// definito, toccare una miniatura NON sposta la foto grande — la scelta
// interna c'è, ma il valore del chiamante la copre. In pratica la carta sta
// sotto un visore a tutto schermo proprio mentre quella prop è definita,
// quindi nessuno può toccarla; ma è un'ipotesi su COME viene usata, non una
// proprietà del componente. Se un chiamante la tiene definita a visore chiuso,
// deve aggiornarla lui a ogni scelta. C'è una prova che lo fissa.

import { useId, useState } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { raggio, sopraFoto, spazio, testoSuFaccia, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'
import { etichettaCategoria, raggruppaPerCategoria } from '@/lib/domain/categorie-foto'

/** Il minimo che la carta deve sapere di una foto. `nome_file` non compare in
 *  nessun punto del reso: l'`alt` è l'ETICHETTA della categoria (§5.38), mai il
 *  nome del file — che è dato del paziente quanto la foto stessa. */
export type FotoAlbum = {
  id: string
  url: string
  categoria: string
  created_at: string
  nome_file: string | null
}

const MINIATURA = 60
const RAGGIO_MINIATURA = raggio.riga - 6 // = 12, §5.38. Mai il 12 nudo: `raggio` non ce l'ha.

export function CartaAlbum(props: {
  foto: FotoAlbum[]
  indiceAperto?: number
  onApri: (indice: number) => void
  onCorreggiCategoria: (indice: number) => void
}) {
  const { foto, indiceAperto, onApri, onCorreggiCategoria } = props
  // Gli hook stanno prima del `return null` di §5.38 — non per scelta di stile:
  // le Regole degli Hook non ammettono un'uscita anticipata sopra di loro.
  const idBase = useId()
  const [indiceInterno, setIndiceInterno] = useState(0)

  const gruppi = raggruppaPerCategoria(foto)
  // L'elenco appiattito È l'ordine mostrato: un solo ordinamento, quello di
  // `raggruppaPerCategoria`. Gli indici delle callback sono posizioni QUI.
  const ordinate = gruppi.flatMap((g) => g.foto)

  const richiesto = indiceAperto ?? indiceInterno
  const indiceMostrato = richiesto >= 0 && richiesto < ordinate.length ? richiesto : 0

  if (foto.length === 0) return null

  const corrente = ordinate[indiceMostrato]
  // Le DUE funzioni di §5.38 si usano entrambe: cercare l'etichetta dentro
  // `gruppi` darebbe lo stesso valore, ma con un ripiego che non può mai
  // scattare — `corrente` viene da quei gruppi. Il ripiego che serve davvero
  // (categoria sconosciuta → valore grezzo) sta dentro `etichettaCategoria`.
  const etichettaCorrente = etichettaCategoria(corrente.categoria)
  const totale = ordinate.length

  // Ogni gruppo porta la posizione della sua prima foto nell'elenco appiattito:
  // è così che una miniatura conosce il proprio indice globale. La somma si
  // rifà per ogni gruppo invece di trascinare un contatore: su sei gruppi al
  // massimo (G6, elenco chiuso) il costo è nullo, e un contatore riassegnato
  // dentro il render è ciò che `react-hooks/immutability` vieta.
  const blocchi = gruppi.map((g, i) => ({
    ...g,
    inizio: gruppi.slice(0, i).reduce((n, p) => n + p.foto.length, 0),
  }))

  function scegli(indice: number) {
    vibra('selection')
    setIndiceInterno(indice)
  }

  function apri() {
    vibra('light')
    onApri(indiceMostrato)
  }

  return (
    <section
      aria-labelledby={`${idBase}-titolo`}
      style={{
        borderRadius: raggio.card,
        background: 'var(--card)',
        boxShadow: 'var(--sh-card)',
        padding: `${spazio.m}px ${spazio.ml}px`,
      }}
    >
      {/* Le misure che una media query decide e l'anello focus-visible di legge
          (constraint 9): il componente li porta con sé ovunque venga montato. */}
      <style>{`
        .ds-album-grande { aspect-ratio: 4 / 3; }
        @media (min-width: 768px) {
          .ds-album-grande { aspect-ratio: 16 / 9; }
        }
        .ds-album-grande:focus-visible,
        .ds-album-etichetta:focus-visible,
        .ds-album-mini:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: spazio.sm, marginBottom: 10 }}>
        <h3
          id={`${idBase}-titolo`}
          style={{
            margin: 0,
            fontSize: tipografia.size.caption,
            fontWeight: tipografia.weight.bold,
            letterSpacing: tipografia.tracking.caption,
            textTransform: 'uppercase',
            color: 'var(--faint)',
          }}
        >
          Foto
        </h3>
        <span
          style={{
            fontSize: 13,
            fontWeight: tipografia.weight.semibold,
            color: 'var(--muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {totale} foto
        </span>
      </div>

      <motion.button
        type="button"
        className="ds-album-grande"
        onClick={apri}
        aria-label={`Apri la foto grande: ${etichettaCorrente}, ${indiceMostrato + 1} di ${totale}`}
        whileTap={{ y: 2 }}
        transition={molla.press}
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
          padding: 0,
          border: 'none',
          overflow: 'hidden',
          borderRadius: raggio.riga,
          background: 'var(--bg-deep)',
          cursor: 'pointer',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL Storage firmata a dimensioni variabili (stessa scelta di FotoStrip.tsx e TabImmagini.tsx), next/image non applicabile */}
        <img
          src={corrente.url}
          alt={etichettaCorrente}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 10,
            bottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 32,
            padding: `0 ${spazio.sm}px`,
            borderRadius: raggio.pill,
            background: sopraFoto.faccia,
            color: testoSuFaccia,
            fontFamily: tipografia.famiglia,
            fontSize: tipografia.size.caption,
            fontWeight: tipografia.weight.bold,
          }}
        >
          ⤢ Apri
        </span>
      </motion.button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: spazio.sm, marginTop: 2 }}>
        {/* D70: la categoria si corregge dal visore O DALL'ALBUM — quindi qui
            l'etichetta è un COMANDO, con la sua altezza di tocco e un nome
            proprio, non un testo muto. */}
        <motion.button
          type="button"
          className="ds-album-etichetta"
          onClick={() => onCorreggiCategoria(indiceMostrato)}
          aria-label={`Cambia la categoria: ${etichettaCorrente}`}
          whileTap={{ y: 2 }}
          transition={molla.press}
          style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 44,
            padding: 0,
            border: 'none',
            background: 'none',
            color: 'var(--ink)',
            fontFamily: tipografia.famiglia,
            fontSize: tipografia.size.body,
            fontWeight: tipografia.weight.bold,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          {etichettaCorrente}
        </motion.button>
        <span
          style={{
            fontSize: 13,
            fontWeight: tipografia.weight.semibold,
            color: 'var(--muted)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {indiceMostrato + 1} di {totale}
        </span>
      </div>

      <div
        className="ds-album-gruppi"
        style={{ display: 'flex', gap: spazio.sm + 2, overflowX: 'auto', marginTop: spazio.sm, paddingBottom: 2 }}
      >
        {blocchi.map((g) => (
          <div key={g.categoria} role="group" aria-labelledby={`${idBase}-gr-${g.categoria}`} style={{ flex: 'none' }}>
            <div
              id={`${idBase}-gr-${g.categoria}`}
              className="ds-album-gr-et"
              style={{
                marginBottom: 5,
                fontSize: tipografia.size.caption, // 12,5 e non 11 — D87: 11 è sotto il minimo di §4.1
                fontWeight: tipografia.weight.extrabold,
                letterSpacing: '0.1em', // §5.38 verbatim; `tracking` non ha questo passo
                textTransform: 'uppercase',
                color: 'var(--faint)',
              }}
            >
              {g.etichetta}
            </div>
            <div className="ds-album-gr-foto" style={{ display: 'flex', gap: spazio.s }}>
              {g.foto.map((f, i) => {
                const indice = g.inizio + i
                const scelta = indice === indiceMostrato
                return (
                  <motion.button
                    key={f.id}
                    type="button"
                    className="ds-album-mini"
                    onClick={() => scegli(indice)}
                    aria-label={`${g.etichetta}, ${indice + 1} di ${totale}`}
                    // Mai `aria-current="false"`: l'attributo o c'è o non c'è.
                    aria-current={scelta ? 'true' : undefined}
                    whileTap={{ y: 2 }}
                    transition={molla.press}
                    style={{
                      flex: 'none',
                      width: MINIATURA,
                      height: MINIATURA,
                      padding: 0,
                      border: 'none',
                      overflow: 'hidden',
                      borderRadius: RAGGIO_MINIATURA,
                      background: 'var(--bg-deep)',
                      // L'anello sta FUORI (non `inset`): l'immagine riempie il
                      // bottone ed è opaca, un anello interno resterebbe sotto.
                      // È la seconda fonte dello stato accanto ad `aria-current`
                      // — il colore non basta mai (G4). Le non scelte NON si
                      // spengono: `sopraFoto.miniaturaSpenta` è della fascia del
                      // VISORE (§5.39), e il mockup A1 qui non le smorza.
                      boxShadow: scelta ? '0 0 0 2px var(--ink)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- come sopra: URL Storage firmata */}
                    <img
                      src={f.url}
                      alt={g.etichetta}
                      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </motion.button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
