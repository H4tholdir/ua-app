import { describe, it, expect } from 'vitest'
import { getLavoriTecnicoOggi } from '@/lib/dashboard/queries'

// Mock Supabase client
const makeSvc = (data: unknown) => ({
  from: () => ({
    select: () => ({
      eq: () => ({ eq: () => ({
        not: () => ({
          order: () => ({
            limit: () => ({ data, error: null })
          })
        })
      }) })
    })
  })
}) as unknown as import('@supabase/supabase-js').SupabaseClient

describe('getLavoriTecnicoOggi', () => {
  it('calcola completamento_perc reale da lavori_fasi', async () => {
    const mockData = [{
      id: 'abc',
      numero_lavoro: '2026/001',
      stato: 'in_lavorazione',
      priorita: 'normale',
      descrizione: 'Corona',
      data_consegna_prevista: '2026-05-23',
      ora_consegna: null,
      clienti: { nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' },
      lavori_fasi: [
        { id: '1', eseguita_at: '2026-05-22T10:00:00Z' },
        { id: '2', eseguita_at: null },
        { id: '3', eseguita_at: null },
        { id: '4', eseguita_at: null },
      ]
    }]
    const result = await getLavoriTecnicoOggi(makeSvc(mockData), 'lab-id', 'tech-id')
    expect(result[0].completamento_perc).toBe(25) // 1/4 = 25%
  })

  it('usa fallback da stato se nessuna fase', async () => {
    const mockData = [{
      id: 'xyz',
      numero_lavoro: '2026/002',
      stato: 'pronto',
      priorita: 'urgente',
      descrizione: 'Protesi',
      data_consegna_prevista: '2026-05-22',
      ora_consegna: '16:00',
      clienti: null,
      lavori_fasi: []
    }]
    const result = await getLavoriTecnicoOggi(makeSvc(mockData), 'lab-id', 'tech-id')
    expect(result[0].completamento_perc).toBe(90) // 'pronto' → 90
  })

  it('cliente_display usa studio_nome se disponibile', async () => {
    const mockData = [{
      id: 'ccc',
      numero_lavoro: '2026/003',
      stato: 'in_lavorazione',
      priorita: 'normale',
      descrizione: 'X',
      data_consegna_prevista: '2026-05-25',
      ora_consegna: null,
      clienti: { nome: 'Luigi', cognome: 'Bianchi', studio_nome: 'Studio Bianchi' },
      lavori_fasi: []
    }]
    const result = await getLavoriTecnicoOggi(makeSvc(mockData), 'lab-id', 'tech-id')
    expect(result[0].cliente_display).toBe('Studio Bianchi')
  })
})
