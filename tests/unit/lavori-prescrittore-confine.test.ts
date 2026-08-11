// D242 — IL CONFINE: `''` non entra in banca dati come nome del prescrittore.
//
// 🔑 Perché la correzione sta QUI e non nella schermata. `TabDati.tsx:283`
// (il gettone «+ Nuovo») scrive `richiedente_nome: ''`, e quel valore arriva
// intatto all'UPDATE perché la PATCH copia i campi in allowlist così come
// sono (`route.ts:418-421`). Normalizzando al confine, la schermata può
// scrivere quello che vuole: `''` e `'   '` diventano `null`, cioè l'UNICA
// ortografia di «non c'è» che i documenti sanno leggere.
// 🛑 La schermata NON è stata toccata di proposito: `null` è già inerte lì
// (`:242` confronta `=== chipLabel`, `:310` fa `?? ''`), e toccare l'UI
// aprirebbe il gate estetico L2 su un rilascio che non ne ha bisogno.
//
// 📌 `istituzione_sanitaria` viaggia con lui: è il campo gemello nato con P37,
// oggi SENZA lettori nei documenti — qui è prevenzione dichiarata, non un fix.
//
// ═══ FORME D'INPUT ENUMERATE (R-P4) ═══════════════════════════════════════
//  ① '' → null            ② '   ' → null        ③ 'Dott. Bianchi' → resta
//  ④ '  Dott. B.  ' → trimmato                  ⑤ null → null (ripensamento)
//  ⑥ chiave assente → non compare nel payload (nessuna scrittura fantasma)
//  ⑦ valore NON stringa → passa com'è: la normalizzazione non inventa un tipo
//     (chi manda un numero incontra il database, come prima)
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST } from '../../src/app/api/lavori/route'
import { PATCH } from '../../src/app/api/lavori/[id]/route'

const LAB_ID = 'lab-1'
const UTENTE_ROW = {
  laboratorio_id: LAB_ID,
  ruolo: 'titolare',
  laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}
const ESITO_OK = { esito: 'ok', id: 'lavoro-1', numero_lavoro: '2026/0042', stato: 'ricevuto' }
const CORPO_BASE = {
  cliente_id: 'cliente-1',
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona 14',
  data_consegna_prevista: '2026-08-30',
}

function singolo(data: unknown) {
  return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data, error: null }) }) }) }) }
}

/** Il `p_lavoro` passato a `lavoro_crea_atomico`: è ciò che finisce sulla riga. */
function lavoroRpc(): Record<string, unknown> {
  const chiamata = mockRpc.mock.calls.find((c) => c[0] === 'lavoro_crea_atomico')
  if (!chiamata) throw new Error('lavoro_crea_atomico non è mai stata chiamata')
  return (chiamata[1] as Record<string, unknown>).p_lavoro as Record<string, unknown>
}

async function postConCorpo(extra: Record<string, unknown>) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return singolo(UTENTE_ROW)
    if (table === 'clienti') return singolo({ laboratorio_id: LAB_ID })
    throw new Error(`Tabella inattesa: ${table}`)
  })
  return POST(
    new Request('http://localhost/api/lavori', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
      body: JSON.stringify({ ...CORPO_BASE, ...extra }),
    }),
  )
}

let updatePayload: Record<string, unknown> | null = null

async function patchConCorpo(body: Record<string, unknown>) {
  updatePayload = null
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID, laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
    }
    // D308 — il cancello sui cinque campi stampati conta le dichiarazioni vive.
    // Su questo lavoro non ce n'è nessuna: il cancello resta un no-op e queste
    // prove continuano a misurare ciò che misuravano (la normalizzazione D242
    // di `richiedente_nome`, che sta PRIMA del cancello).
    if (table === 'dichiarazioni_conformita') {
      return { select: () => ({ eq: () => ({ eq: () => ({ neq: async () => ({ count: 0, error: null }) }) }) }) }
    }
    return {
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { incluso_in_fattura: false }, error: null }) }) }) }) }),
      update: (p: Record<string, unknown>) => {
        updatePayload = p
        return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'lav-1', numero_lavoro: 'x', stato: 'pronto', updated_at: 'x' }, error: null }) }) }) }) }
      },
    }
  })
  return PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockRpc.mockResolvedValue({ data: ESITO_OK, error: null })
})

describe('POST /api/lavori — il prescrittore vuoto non entra', () => {
  it('① stringa vuota → NULL sulla riga (è `null` che fa scattare il ripiego sul cliente)', async () => {
    const res = await postConCorpo({ richiedente_nome: '' })
    expect(res.status).toBe(201)
    expect(lavoroRpc().richiedente_nome).toBeNull()
  })

  it('② soli spazi → NULL', async () => {
    const res = await postConCorpo({ richiedente_nome: '   ' })
    expect(res.status).toBe(201)
    expect(lavoroRpc().richiedente_nome).toBeNull()
  })

  it('③ un nome vero passa intatto', async () => {
    await postConCorpo({ richiedente_nome: 'Dott. Bianchi' })
    expect(lavoroRpc().richiedente_nome).toBe('Dott. Bianchi')
  })

  it('④ un nome con spazi intorno arriva trimmato', async () => {
    await postConCorpo({ richiedente_nome: '  Dott. Bianchi  ' })
    expect(lavoroRpc().richiedente_nome).toBe('Dott. Bianchi')
  })

  it('📌 istituzione_sanitaria, campo gemello: stessa regola', async () => {
    await postConCorpo({ istituzione_sanitaria: '  ' })
    expect(lavoroRpc().istituzione_sanitaria).toBeNull()
  })
})

describe('PATCH /api/lavori/[id] — la correzione dalla scheda passa dallo stesso confine', () => {
  it('① stringa vuota (il gettone «+ Nuovo» di TabDati) → NULL', async () => {
    const res = await patchConCorpo({ richiedente_nome: '' })
    expect(res.status).toBe(200)
    expect(updatePayload).toHaveProperty('richiedente_nome', null)
  })

  it('② soli spazi → NULL', async () => {
    await patchConCorpo({ richiedente_nome: '   ' })
    expect(updatePayload).toHaveProperty('richiedente_nome', null)
  })

  it('③ un nome vero passa intatto', async () => {
    await patchConCorpo({ richiedente_nome: 'Dott. Bianchi' })
    expect(updatePayload).toHaveProperty('richiedente_nome', 'Dott. Bianchi')
  })

  it('④ un nome con spazi intorno arriva trimmato', async () => {
    await patchConCorpo({ richiedente_nome: '  Dott. Bianchi  ' })
    expect(updatePayload).toHaveProperty('richiedente_nome', 'Dott. Bianchi')
  })

  it('⑤ null resta null: il ripensamento continua a funzionare', async () => {
    await patchConCorpo({ richiedente_nome: null })
    expect(updatePayload).toHaveProperty('richiedente_nome', null)
  })

  it('⑥ chiave assente → nessuna scrittura del campo', async () => {
    await patchConCorpo({ descrizione: 'Corona 14 rifatta' })
    expect(updatePayload).not.toHaveProperty('richiedente_nome')
  })

  it('⑦ valore non stringa: la normalizzazione non inventa un tipo, passa com\'è', async () => {
    await patchConCorpo({ richiedente_nome: 42 })
    expect(updatePayload).toHaveProperty('richiedente_nome', 42)
  })

  it('📌 istituzione_sanitaria, campo gemello: stessa regola', async () => {
    await patchConCorpo({ istituzione_sanitaria: '  ' })
    expect(updatePayload).toHaveProperty('istituzione_sanitaria', null)
  })
})
