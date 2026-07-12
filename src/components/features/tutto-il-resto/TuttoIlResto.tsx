'use client'

// DS v3 §6.1/§6.2 (Task 10) — ☰ «Tutto il resto»: la pagina (NON drawer) con
// le 9 card-sezione. Fonte visiva: mockup `tutto-il-resto.html`, frame 390 —
// card 22, padding 15/16, chip Ø46 `--bg-deep`, nome 17.5/700, sub 14/500
// muted a 1 riga con ellissi, chevron «›» faint.
//
// A ≥1024 la pagina non esiste (§12.3): le 9 voci vivono nella nav laterale
// (HomeDesktop/NavDesk, Task 9). Stesso schema show/hide CSS di
// HomeV3/HomeDesktop — niente doppio render lato server, un'unica regola in
// un `<style>` scoped a questo componente.
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { raggio, tipografia } from '@/design-system/v3/tokens'
import type { Sezione } from '@/lib/dashboard/tutto-il-resto'

export function TuttoIlResto(props: { sezioni: Sezione[] }) {
  const { sezioni } = props
  const router = useRouter()

  return (
    <>
      {/* Show/hide CSS: NIENTE `display` inline sui root `.ua-tir-mobile`/
          `.ua-tir-desk` — uno stile inline batte sempre una regola di
          stylesheet, media query o no (misurato: con `display: 'flex'`
          inline il `@media (min-width:1024px) { .ua-tir-mobile{display:none} }`
          sotto non aveva alcun effetto). Stesso schema di HomeV3/HomeDesktop:
          il layout del root vive SOLO nella classe. */}
      <style>{`
        .ua-tir-mobile {
          position: relative; z-index: 1; width: 100%; max-width: 480px; margin: 0 auto;
          padding: 24px 24px 40px; display: flex; flex-direction: column;
        }
        .ua-tir-desk { display: none }
        .ua-tir-sez:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
        @media (min-width: 1024px) {
          .ua-tir-mobile { display: none }
          .ua-tir-desk {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 14px; text-align: center; min-height: 100vh; padding: 40px;
            position: relative; z-index: 1;
          }
        }
      `}</style>

      {/* `<section>`, non `<main>` (fix review finale item 5): `(app)/layout.tsx`
          porta già il proprio `<main id="main-content">` — due `<main>`
          annidati sono HTML non valido. Aria intatta: nessuna dipendenza da
          questo tag altrove. */}
      <section className="ua-tir-mobile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => router.push('/dashboard')} />
          <h1 style={{ fontSize: 27, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--ink)' }}>Tutto il resto</h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
          {sezioni.map((s) => (
            <Link
              key={s.chiave}
              href={s.href}
              aria-label={s.nome}
              className="ds-card ua-tir-sez"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                textAlign: 'left',
                textDecoration: 'none',
                borderRadius: raggio.tile,
                padding: '15px 16px',
                fontFamily: 'var(--font-v3)',
                background: 'var(--card)',
                boxShadow: 'var(--sh-card)',
              }}
            >
              <span
                aria-hidden="true"
                style={{ flex: 'none', width: 46, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', fontSize: 24, lineHeight: 1 }}
              >
                {s.emoji}
              </span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 17.5, fontWeight: 700, color: 'var(--ink)' }}>{s.nome}</span>
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</span>
              </span>
              <span aria-hidden="true" style={{ flex: 'none', fontSize: 22, fontWeight: 700, color: 'var(--faint)', lineHeight: 1 }}>›</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ≥1024 — nota quieta (§12.3): «Tutto il resto» non è una pagina a desktop. */}
      <div className="ua-tir-desk">
        <div aria-hidden="true" style={{ width: 64, height: 64, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)', fontSize: 30, lineHeight: 1 }}>☰</div>
        <div style={{ fontSize: 19, fontWeight: tipografia.weight.bold, color: 'var(--muted)', maxWidth: 340, lineHeight: 1.4 }}>
          Su desktop <b style={{ color: 'var(--ink)', fontWeight: tipografia.weight.extrabold }}>«Tutto il resto»</b> non è una pagina:<br />le sue voci sono nella nav a sinistra.
        </div>
      </div>
    </>
  )
}
