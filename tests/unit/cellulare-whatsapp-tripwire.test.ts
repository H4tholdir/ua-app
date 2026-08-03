// tests/unit/cellulare-whatsapp-tripwire.test.ts
//
// TRIPWIRE (euristica onesta — NON una garanzia/enforcement forte).
//
// P31/Task 7 ha aggiunto la colonna `clienti.cellulare_whatsapp` e l'ha
// collegata ai quattro anelli che portano dalla lista clienti fino al
// pannello di modifica. Tre di quei quattro anelli sono già protetti da
// `tsc`: il campo è OBBLIGATORIO in `ClienteEditData` (tipo del pannello,
// `ClienteEditSheet.tsx`) e nell'oggetto che
// `src/app/(app)/clienti/[id]/page.tsx` passa a `ClienteModificaButton` —
// toglierlo da lì non compila (provato: `TS2741`).
//
// Il quarto anello — la stringa del `.select()` che carica il cliente da
// Supabase, in `page.tsx` — NON è protetto da niente: il legame fra quella
// stringa e il tipo `ClienteDettaglio` è spezzato dal doppio cast
// `cliente as unknown as ClienteDettaglio` (page.tsx, ~riga 142). E la prova
// unitaria del pannello (`ClienteEditSheet.test.tsx`) costruisce l'oggetto
// cliente A MANO, bypassando questa pagina: non se ne accorgerebbe nemmeno
// lei. Stessa forma di rischio, per simmetria, sulla select GET di
// `src/app/api/clienti/[id]/route.ts` (non è sul percorso di lettura del
// pannello, ma è un'altra fonte che legge il cliente senza passare da un tipo
// verificato dal compilatore).
//
// Che cosa succede se qualcuno toglie `cellulare_whatsapp` da una di queste
// due select:
// - `tsc` non se ne accorge (il cast in page.tsx lo zittisce; la select GET
//   della rotta non è tipata contro `ClienteDettaglio`);
// - il campo arriva VUOTO al pannello di modifica;
// - `ClienteEditSheet.tsx` salva `form.cellulare_whatsapp.trim() || null` —
//   quindi aprire il pannello per correggere un ALTRO campo (es. l'email)
//   CANCELLA il cellulare del cliente, in silenzio, perché il form riparte da
//   un valore vuoto che poi si salva come `null`.
//
// Questo NON è un enforcement forte: è pattern-matching su una regex
// ristretta alla forma `.from('clienti').select(\`...\`)`, aggirabile
// riscrivendo la query in una forma diversa (es. `.select('*')`, o
// costruendo la stringa altrove). Un enforcement forte (tipizzare il
// risultato della query invece di affidarsi al doppio cast) è fuori mandato
// per questo compito — vedi `.superpowers/sdd/p31-compito-7-report.md`.
// Questo test è un guard-rail economico, non un compilatore.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '../..')

// Cattura SOLO la select del cliente (`.from('clienti').select(\`...\`)`), non
// le altre query dello stesso file (es. data_processing_agreements,
// laboratori, tecnici, o la select più stretta che PATCH usa su
// portale_pin_hash): il match è ristretto alla coppia from('clienti') +
// select immediatamente successiva, con corpo fra backtick.
const CLIENTE_SELECT_PATTERN = /\.from\(\s*['"]clienti['"]\s*\)\s*\.select\(\s*`([\s\S]*?)`\s*\)/

function estraiSelectCliente(relFile: string): string {
  const src = readFileSync(path.join(ROOT, relFile), 'utf-8')
  const match = src.match(CLIENTE_SELECT_PATTERN)
  if (!match) {
    throw new Error(
      `${relFile}: non trovo più una ".from('clienti').select(\`...\`)" da leggere. ` +
        'Il tripwire non può controllare cellulare_whatsapp se la query ha cambiato forma ' +
        '(es. select su una riga sola, apici invece di backtick, o spostata altrove): ' +
        'aggiorna CLIENTE_SELECT_PATTERN in questo file, non ignorare il fallimento.'
    )
  }
  return match[1]
}

describe('TRIPWIRE — cellulare_whatsapp nella select del cliente (P31/Task 7)', () => {
  it("src/app/(app)/clienti/[id]/page.tsx: la select del cliente include cellulare_whatsapp", () => {
    const selectBody = estraiSelectCliente('src/app/(app)/clienti/[id]/page.tsx')
    expect(
      selectBody,
      "src/app/(app)/clienti/[id]/page.tsx: la select del cliente NON include più " +
        'cellulare_whatsapp. tsc non se ne accorge (il doppio cast ' +
        '`cliente as unknown as ClienteDettaglio` lo zittisce): il campo arriverebbe ' +
        'VUOTO al pannello di modifica, e ClienteEditSheet.tsx salva ' +
        '`form.cellulare_whatsapp.trim() || null` — aprire il pannello per correggere ' +
        "un altro campo (es. l'email) CANCELLEREBBE il cellulare del cliente in " +
        'silenzio. Rimetti cellulare_whatsapp nella select.'
    ).toMatch(/\bcellulare_whatsapp\b/)
  })

  it('src/app/api/clienti/[id]/route.ts: la select GET del cliente include cellulare_whatsapp', () => {
    const selectBody = estraiSelectCliente('src/app/api/clienti/[id]/route.ts')
    expect(
      selectBody,
      'src/app/api/clienti/[id]/route.ts: la select GET del cliente NON include più ' +
        'cellulare_whatsapp. Questa rotta non è sul percorso di lettura del pannello di ' +
        'modifica (quello passa da page.tsx), ma è la stessa forma di rischio: se il ' +
        'campo sparisce da qui, ogni consumer che legge il cliente da questa API riceve ' +
        'un cellulare vuoto senza che tsc se ne accorga. Rimettilo nella select.'
    ).toMatch(/\bcellulare_whatsapp\b/)
  })
})

describe('TRIPWIRE — ha i denti (non è un test vacuo)', () => {
  it('individua cellulare_whatsapp dentro una select sintetica di clienti', () => {
    const fixture = "svc.from('clienti').select(`id, nome, cellulare_whatsapp`).eq('id', id)"
    const match = fixture.match(CLIENTE_SELECT_PATTERN)
    expect(match).not.toBeNull()
    expect(match?.[1]).toMatch(/cellulare_whatsapp/)
  })

  it('NON trova cellulare_whatsapp se la select sintetica non lo contiene', () => {
    const fixture = "svc.from('clienti').select(`id, nome, telefono`).eq('id', id)"
    const match = fixture.match(CLIENTE_SELECT_PATTERN)
    expect(match).not.toBeNull()
    expect(match?.[1]).not.toMatch(/cellulare_whatsapp/)
  })

  it("NON confonde la select di clienti con quella di un'altra tabella (es. laboratori)", () => {
    const fixture = "svc.from('laboratori').select(`partita_iva, cellulare_whatsapp`)"
    expect(fixture.match(CLIENTE_SELECT_PATTERN)).toBeNull()
  })
})
