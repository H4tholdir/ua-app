// Vitest global setup
import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('server-only', () => ({}))

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
