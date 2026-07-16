import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { verificaFirmaRicevuta } from '@/lib/fattura/ricevute/verifica-firma'

const fx = (n: string) => readFileSync(`tests/fixtures/ricevute-sdi/${n}`)

// Modalità FALLBACK (spike Task 6, docs/superpowers/specs/2026-07-16-spike-xades-esito.md
// §Sintesi + §7, panel advisor 3/3): né xml-crypto né xadesjs supportano il transform
// xmldsig-filter2 usato dai messaggi SdI reali. `verificaFirmaRicevuta` ritorna quindi
// SEMPRE 'fallita', qualunque sia l'input (quarantena-all). Questi test verificano il
// contratto fail-closed del fallback: mai throw, mai 'valida'.
describe('verificaFirmaRicevuta (fallback quarantena-all)', () => {
  it('fallback quarantena-all: anche una firma autentica risulta fallita finché la verifica reale non è attiva', async () => {
    // ufficiale-RC-v1.0.xml è realmente firmato XAdES-BES (vedi spike esito §1.1).
    const esito = await verificaFirmaRicevuta(fx('ufficiale-RC-v1.0.xml'))
    expect(esito).toBe('fallita')
  })

  it('XML senza firma → fallita', async () => {
    const esito = await verificaFirmaRicevuta(fx('rc-valida.xml'))
    expect(esito).toBe('fallita')
  })

  it('buffer spazzatura → fallita, mai throw', async () => {
    await expect(verificaFirmaRicevuta(Buffer.from('non sono XML'))).resolves.toBe('fallita')
  })

  it('buffer vuoto → fallita, mai throw', async () => {
    await expect(verificaFirmaRicevuta(Buffer.alloc(0))).resolves.toBe('fallita')
  })

  it('XML malformato → fallita, mai throw', async () => {
    await expect(verificaFirmaRicevuta(fx('malformata.xml'))).resolves.toBe('fallita')
  })

  it('payload XXE → fallita, mai throw (nessuna risoluzione entità)', async () => {
    await expect(verificaFirmaRicevuta(fx('xxe-payload.xml'))).resolves.toBe('fallita')
  })

  it('trustAnchorPem iniettato ma inutilizzato nel fallback → comunque fallita', async () => {
    const esito = await verificaFirmaRicevuta(fx('ufficiale-RC-v1.0.xml'), 'not-a-real-pem')
    expect(esito).toBe('fallita')
  })
})
