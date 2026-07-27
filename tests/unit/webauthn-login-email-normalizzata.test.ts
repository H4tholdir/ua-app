// Il difetto: l'email dell'accesso con passkey veniva confrontata LETTERA PER LETTERA
// (`users.find(u => u.email === email)`), e il client la spedisce esattamente come è stata
// digitata (`login-form.tsx` non fa né trim né toLowerCase). Chi scriveva `Mario@Studio.it`, o si
// portava dietro lo spazio che la tastiera del telefono aggiunge dopo il suggerimento, riceveva
// 404 «Nessuna credenziale registrata» pur avendo la passkey registrata e funzionante.
//
// Perché faceva danno più di quanto sembri: la password continuava a funzionare, quindi la
// persona concludeva che fosse rotta la biometria e smetteva di usarla.
//
// Misurato il 28/07/2026: in `auth.users` le email sono TUTTE minuscole (7 su 7) — GoTrue
// normalizza server-side. Quindi normalizzare l'ingresso non può perdere corrispondenze: può
// solo trovarne di più.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockListUsers, mockFrom, mockStoreChallenge } = vi.hoisted(() => ({
  mockListUsers: vi.fn(),
  mockFrom: vi.fn(),
  mockStoreChallenge: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    auth: { admin: { listUsers: mockListUsers } },
    from: mockFrom,
  }),
}))
vi.mock('@/lib/webauthn/challenge', () => ({
  storeChallenge: mockStoreChallenge,
  consumeChallenge: vi.fn(),
}))
vi.mock('@simplewebauthn/server', () => ({
  generateAuthenticationOptions: async () => ({ challenge: 'sfida-finta' }),
  verifyAuthenticationResponse: vi.fn(),
}))

import { POST as optionsPOST } from '../../src/app/api/auth/webauthn/login/options/route'
import { POST as verifyPOST } from '../../src/app/api/auth/webauthn/login/verify/route'

const EMAIL_CANONICA = 'titolare@ua-test.local'

function richiestaOptions(email: string) {
  return new Request('http://localhost/api/auth/webauthn/login/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

function richiestaVerify(email: string) {
  return new Request('http://localhost/api/auth/webauthn/login/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, challengeId: 'c1', response: { id: 'cred-1' } }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Come in banca dati: l'email è memorizzata in minuscolo.
  mockListUsers.mockResolvedValue({ data: { users: [{ id: 'u1', email: EMAIL_CANONICA }] }, error: null })
  mockStoreChallenge.mockResolvedValue('challenge-1')
  mockFrom.mockImplementation(() => ({
    select: () => ({
      eq: () => ({
        // login/options: elenco credenziali dell'utente
        then: undefined,
        data: [{ credential_id: 'cred-1', transports: ['internal'] }],
        error: null,
        // login/verify: seconda .eq() + .single()
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
    }),
  }))
})

describe('accesso con passkey — l’email si normalizza, non si confronta lettera per lettera', () => {
  it('email digitata con le MAIUSCOLE: trova comunque l’utente', async () => {
    const res = await optionsPOST(richiestaOptions('Titolare@UA-Test.Local'))
    expect(res.status).toBe(200)
  })

  it('email con spazi davanti e dietro (tastiera del telefono): trova comunque l’utente', async () => {
    const res = await optionsPOST(richiestaOptions('  titolare@ua-test.local  '))
    expect(res.status).toBe(200)
  })

  it('email esatta: continua a funzionare come prima', async () => {
    const res = await optionsPOST(richiestaOptions(EMAIL_CANONICA))
    expect(res.status).toBe(200)
  })

  it('email di un utente che NON esiste: resta 404 — la normalizzazione non rende permissivi', async () => {
    const res = await optionsPOST(richiestaOptions('NessunoQui@altrove.it'))
    expect(res.status).toBe(404)
  })

  it('anche la verifica normalizza: con le maiuscole supera la ricerca dell’utente', async () => {
    const res = await verifyPOST(richiestaVerify('Titolare@UA-Test.Local'))
    const body = await res.json()
    // Se la normalizzazione manca, si ferma prima con «Utente non trovato».
    // Con la normalizzazione arriva al passo dopo, dove la credenziale finta non c'è.
    expect(body.error).toBe('Credenziale non trovata')
  })

  it('la verifica di un utente inesistente resta «Utente non trovato»', async () => {
    const res = await verifyPOST(richiestaVerify('nessuno@altrove.it'))
    const body = await res.json()
    expect(body.error).toBe('Utente non trovato')
  })
})
