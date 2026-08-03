// tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts
import { describe, it, expect } from 'vitest'
import { PATCHABLE_FIELDS_CLIENTE } from '@/app/api/clienti/[id]/route'

describe('allowlist PATCH cliente (P31, R-P6)', () => {
  it('contiene il campo nuovo — senza, la rotta scarta la chiave SENZA errore', () => {
    expect(PATCHABLE_FIELDS_CLIENTE).toContain('cellulare_whatsapp')
  })

  it('contiene ancora il telefono dello studio', () => {
    expect(PATCHABLE_FIELDS_CLIENTE).toContain('telefono')
  })

  // 🔑 IL VALORE CHE DEVE ESSERE RIFIUTATO — senza questa riga la prova
  //    sopra passerebbe anche con un'allowlist che accetta tutto.
  it('NON contiene un campo che non deve essere modificabile dal browser', () => {
    expect(PATCHABLE_FIELDS_CLIENTE).not.toContain('portale_token')
    expect(PATCHABLE_FIELDS_CLIENTE).not.toContain('laboratorio_id')
    expect(PATCHABLE_FIELDS_CLIENTE).not.toContain('id')
  })
})
