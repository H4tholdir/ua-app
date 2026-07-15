// tests/unit/invio-claim.test.ts
// N10: helper claim anti-doppio-invio + messaggi 409 per stato.
import { describe, it, expect, vi } from 'vitest'
import { claimInvioPec, releaseInvioPec, messaggioStatoNonInviabile, RUOLI_INVIO_PEC } from '@/lib/fattura/invio-claim'

type MockResult = { data: unknown; error: unknown }

function updateChain(result: MockResult, updatePayloads: unknown[]) {
  const c: Record<string, unknown> = {}
  c.update = (payload: unknown) => { updatePayloads.push(payload); return c }
  for (const m of ['eq', 'is']) c[m] = () => c
  c.select = async () => result
  ;(c as { then: unknown }).then = (resolve: (v: MockResult) => void) => resolve(result)
  return c
}

function svcWith(result: MockResult, updatePayloads: unknown[] = []) {
  return { from: () => updateChain(result, updatePayloads) } as never
}

describe('claimInvioPec', () => {
  it('1 riga aggiornata → claimed true', async () => {
    const res = await claimInvioPec(svcWith({ data: [{ id: 'f1' }], error: null }), 'f1', 'lab-1')
    expect(res).toEqual({ claimed: true, error: null })
  })
  it('0 righe → claimed false, nessun errore', async () => {
    const res = await claimInvioPec(svcWith({ data: [], error: null }), 'f1', 'lab-1')
    expect(res).toEqual({ claimed: false, error: null })
  })
  it('errore Postgres → claimed false + error valorizzato', async () => {
    const res = await claimInvioPec(svcWith({ data: null, error: { message: 'boom' } }), 'f1', 'lab-1')
    expect(res.claimed).toBe(false)
    expect(res.error).toBe('boom')
  })
  it('il claim scrive smtp_inviata_at (timestamp ISO)', async () => {
    const payloads: Array<Record<string, unknown>> = []
    await claimInvioPec(svcWith({ data: [{ id: 'f1' }], error: null }, payloads), 'f1', 'lab-1')
    expect(typeof payloads[0].smtp_inviata_at).toBe('string')
  })
})

describe('releaseInvioPec', () => {
  it('azzera smtp_inviata_at e non lancia neanche su errore', async () => {
    const payloads: Array<Record<string, unknown>> = []
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(releaseInvioPec(svcWith({ data: null, error: { message: 'rete' } }, payloads), 'f1', 'lab-1')).resolves.toBeUndefined()
    expect(payloads[0]).toEqual({ smtp_inviata_at: null })
    errSpy.mockRestore()
  })
})

describe('messaggioStatoNonInviabile', () => {
  it('draft TD04 → messaggio resume nota di credito', () => {
    expect(messaggioStatoNonInviabile('draft', 'TD04')).toBe(
      "Nota di credito incompleta — riapri l'emissione dalla fattura originale per completarla"
    )
  })
  it('draft TD01 → genera prima la fattura', () => {
    expect(messaggioStatoNonInviabile('draft', 'TD01')).toBe('XML non ancora generato — genera prima la fattura')
  })
  it('smtp_inviata/pec_consegnata/ricevuta_sdi/accettata → già inviata', () => {
    for (const s of ['smtp_inviata', 'pec_consegnata', 'ricevuta_sdi', 'accettata']) {
      expect(messaggioStatoNonInviabile(s, 'TD01')).toBe('Fattura già inviata a SdI')
    }
  })
  it('rifiutata/scaduta → non re-inviabile', () => {
    for (const s of ['rifiutata', 'scaduta']) {
      expect(messaggioStatoNonInviabile(s, 'TD01')).toBe('Stato non re-inviabile — richiede intervento dedicato')
    }
  })
})

describe('RUOLI_INVIO_PEC', () => {
  it('esattamente titolare e front_desk', () => {
    expect([...RUOLI_INVIO_PEC]).toEqual(['titolare', 'front_desk'])
  })
})
