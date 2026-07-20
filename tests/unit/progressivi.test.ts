// @vitest-environment node
// generaProgressivo — l'anno della serie è OBBLIGATORIO e viene dal chiamante
// (fix date fiscali 20/07): mai ricalcolato qui, la divergenza numero/serie a
// capodanno è esattamente il bug chiuso (riserva panel backend #1).
import { describe, it, expect, vi } from 'vitest'
import { generaProgressivo } from '../../src/lib/db/progressivi'

describe('generaProgressivo — anno esplicito (fix date fiscali)', () => {
  it("passa alla RPC ESATTAMENTE l'anno ricevuto dal chiamante", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 7, error: null })
    const n = await generaProgressivo({ rpc } as never, 'lab-1', 'fattura', 2027)
    expect(n).toBe(7)
    expect(rpc).toHaveBeenCalledWith('genera_progressivo', {
      p_laboratorio_id: 'lab-1', p_tipo: 'fattura', p_anno: 2027,
    })
  })
  it('errore RPC → throw con tipo nel messaggio', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    await expect(generaProgressivo({ rpc } as never, 'lab-1', 'ddc', 2026)).rejects.toThrow(/ddc.*boom/)
  })
})
