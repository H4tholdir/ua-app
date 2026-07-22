// Vitest global setup
import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { MotionGlobalConfig } from 'motion/react'

vi.mock('server-only', () => ({}))

// Flake di classe (diagnosi .superpowers/sdd/diagnosi-flake-vitest.md): sotto contesa
// multi-worker gli spring/exit di motion girano su rAF in tempo REALE — i waitFor di
// uscita e i render pesanti sforano i timeout per puro tempo di parete. Con
// skipAnimations enter/exit sono istantanei per TUTTA la suite: nessun test qui
// asserisce animazioni motion in volo (censimento 22/07 — se un giorno servirà,
// quel file rimetterà il flag a false nel proprio beforeAll/afterAll; deroga
// sicura SOLO finché il pool resta `forks` + `isolate: true`, altrimenti il
// toggle leakerebbe sugli altri file dello stesso worker).
MotionGlobalConfig.skipAnimations = true

// jsdom non implementa window.matchMedia — mock necessario per useReducedMotion
// Guard per @vitest-environment node che non ha window
if (typeof window !== 'undefined') Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
