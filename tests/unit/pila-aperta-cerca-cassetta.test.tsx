import { describe, it, expect } from 'vitest'
import { filtraLavoriPila } from '@/components/features/pile/filtra-lavori-pila'

const lav = (over: Partial<{ numero: string; dentista: string; paziente: string; tipoLavoro: string; cassetta: string | null }>) => ({
  numero: '144', dentista: 'Dr.ssa Bianchi', paziente: 'PZ-0398', tipoLavoro: 'Ponte', cassetta: null, ...over,
})

describe('filtraLavoriPila — match su cassetta', () => {
  it('trova per numero cassetta', () => {
    const lista = [lav({ numero: '144', cassetta: 'C12' }), lav({ numero: '147' })]
    expect(filtraLavoriPila(lista as never, 'c12').map((l) => l.numero)).toEqual(['144'])
  })
  it('resta accent-insensitive sui campi esistenti', () => {
    const lista = [lav({ dentista: 'Dr. Esposìto' })]
    expect(filtraLavoriPila(lista as never, 'esposito')).toHaveLength(1)
  })
})
