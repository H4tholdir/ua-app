// I tipi generati espongono le nuove colonne fatture per TD04.
import { describe, it, expect } from 'vitest'
import type { Database } from '@/types/database.types'

describe('schema TD04', () => {
  it('fatture Row espone i campi di collegamento nota di credito', () => {
    type Row = Database['public']['Tables']['fatture']['Row']
    const sample: Pick<Row, 'fattura_collegata_id' | 'collegata_numero' | 'collegata_data' | 'causale_storno' | 'stornata_at'> = {
      fattura_collegata_id: null, collegata_numero: null, collegata_data: null,
      causale_storno: null, stornata_at: null,
    }
    expect(sample).toBeTruthy()
  })
})
