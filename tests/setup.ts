// Vitest global setup
import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('server-only', () => ({}))
