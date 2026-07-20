// tests/unit/login-passkey-prefill.test.tsx
// A3 — il prefill dell'email da passkey locale (localStorage `ua_passkey_email`)
// non deve sovrascrivere un'email già digitata dall'utente. Su device
// condivisi in laboratorio, se l'utente inizia a digitare prima che la
// promise `isUserVerifyingPlatformAuthenticatorAvailable()` risolva, il
// prefill "secco" (`setEmail(savedEmail)`) cancellava quanto già scritto.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '@/app/(auth)/login/login-form'

const PASSKEY_EMAIL_KEY = 'ua_passkey_email'

const pushMock = vi.fn()
const prefetchMock = vi.fn()
const refreshMock = vi.fn()

// LoginForm usa useRouter()/useSearchParams() di next/navigation — fuori da
// un App Router reale vanno mockati (stesso pattern di
// tests/unit/LavoroFormClient.consegna-autosave.test.tsx).
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    prefetch: prefetchMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => new URLSearchParams(),
}))

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(res => {
    resolve = res
  })
  return { promise, resolve }
}

function mockPlatformAuthenticator(promise: Promise<boolean>) {
  Object.defineProperty(window, 'PublicKeyCredential', {
    configurable: true,
    writable: true,
    value: {
      isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(() => promise),
    },
  })
}

describe('A3 — guard prefill passkey (login-form)', () => {
  beforeEach(() => {
    localStorage.clear()
    pushMock.mockClear()
    prefetchMock.mockClear()
    refreshMock.mockClear()
  })

  afterEach(() => {
    // @ts-expect-error — pulizia mock test-only, non presente nel tipo Window
    delete window.PublicKeyCredential
  })

  it('non sovrascrive l\'email già digitata dall\'utente quando la promise risolve dopo', async () => {
    localStorage.setItem(PASSKEY_EMAIL_KEY, 'salvata@lab.it')
    const { promise, resolve } = createDeferred<boolean>()
    mockPlatformAuthenticator(promise)

    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Indirizzo email') as HTMLInputElement
    const user = userEvent.setup()

    // L'utente digita PRIMA che isUserVerifyingPlatformAuthenticatorAvailable() risolva
    await user.type(emailInput, 'mia@lab.it')
    expect(emailInput.value).toBe('mia@lab.it')

    // Ora la promise risolve — il prefill NON deve sovrascrivere quanto digitato
    resolve(true)

    await waitFor(() => {
      expect(document.querySelector('[aria-label="Accesso biometrico"]')).toBeInTheDocument()
    })

    expect(emailInput.value).toBe('mia@lab.it')
  })

  it('campo vuoto → dopo il resolve prende l\'email salvata e il flusso bio resta abilitato', async () => {
    localStorage.setItem(PASSKEY_EMAIL_KEY, 'salvata@lab.it')
    const { promise, resolve } = createDeferred<boolean>()
    mockPlatformAuthenticator(promise)

    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Indirizzo email') as HTMLInputElement
    expect(emailInput.value).toBe('')

    resolve(true)

    await waitFor(() => {
      expect(emailInput.value).toBe('salvata@lab.it')
    })

    expect(document.querySelector('[aria-label="Accesso biometrico"]')).toBeInTheDocument()
  })
})
