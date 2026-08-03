// ═══════════════════════════════════════════════════════════════════════════
// P18 — IL COLLEGAMENTO CHE IL LABORATORIO MANDA AL DENTISTA NON DIPENDE DA DOVE
//       IL LABORATORIO STA NAVIGANDO
//
// IL DIFETTO. `PortaleLinkButtons` costruiva l'indirizzo così:
//     typeof window !== 'undefined' ? window.location.origin : 'https://uachelab.com'
// Il server stampa SEMPRE `uachelab.com`, il browser stampa l'origine VERA. React
// se ne accorge all'idratazione, dice «*the server rendered text didn't match*» e
// RIGENERA il sottoalbero: per un istante il link è uno, dopo è un altro.
//
// 🔑 MA IL DIFETTO GROSSO NON È L'IDRATAZIONE — È CHE IL LINK PUÒ ESSERE SBAGLIATO.
//    Se il laboratorio apre l'app da un indirizzo di rete locale, da un'anteprima
//    o da un dominio di prova, il collegamento che **copia e manda al dentista**
//    porta quell'origine lì. Il dentista riceve un indirizzo che dal suo studio
//    non esiste.
//
// 🔑 E C'ERA GIÀ UNA DISCORDANZA IN CASA, che questa prova chiude: il link mandato
//    per WhatsApp (`src/lib/consegna/whatsapp-template.ts:22`) usa
//    `NEXT_PUBLIC_APP_URL`, quello del bottone usava l'origine della finestra.
//    **Due indirizzi diversi per la stessa cosa**, a seconda di come lo mandi.
//
// PERCHÉ LA PROVA È SCRITTA COSÌ. Non guarda l'avvertimento di React (in questo
// ambiente di prova `window` esiste sempre, quindi il ramo «server» non si
// percorrerebbe mai e la prova sarebbe verde per finta). Guarda il COMPORTAMENTO:
// si finge che il laboratorio stia navigando da un indirizzo di rete locale, e si
// pretende che il link **non cambi**. Col codice di prima diventa rossa.
// ═══════════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PortaleLinkButtons } from '@/components/features/clienti/PortaleLinkButtons'

const TOKEN = 'tok-di-prova-123'

/** Si finge che il laboratorio abbia aperto l'app da un altro indirizzo. */
function navigaDa(origine: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, origin: origine, href: `${origine}/clienti/1` },
  })
}

describe('P18 — il link al dentista non dipende da dove naviga il laboratorio', () => {
  const origineVera = window.location
  let appUrlPrima: string | undefined

  beforeEach(() => {
    appUrlPrima = process.env.NEXT_PUBLIC_APP_URL
    process.env.NEXT_PUBLIC_APP_URL = 'https://uachelab.com'
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: origineVera })
    if (appUrlPrima === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = appUrlPrima
  })

  it("dall'indirizzo di rete locale del banco, il link resta quello pubblico", () => {
    // Il caso vero: il titolare apre UÀ dal tablet, sulla rete del laboratorio.
    navigaDa('http://192.168.1.5:3000')
    render(<PortaleLinkButtons portaleToken={TOKEN} clienteNome="Dott. Prova" />)
    expect(screen.getByText(`https://uachelab.com/richiedi/${TOKEN}`)).toBeTruthy()
  })

  it("da un'anteprima di rilascio, il link resta quello pubblico", () => {
    // L'altro caso vero: un'anteprima Vercel, dove le due origini NON coincidono.
    navigaDa('https://ua-app-git-prova.vercel.app')
    render(<PortaleLinkButtons portaleToken={TOKEN} clienteNome="Dott. Prova" />)
    expect(screen.getByText(`https://uachelab.com/richiedi/${TOKEN}`)).toBeTruthy()
  })

  it('non mostra MAI l\'origine da cui si sta navigando', () => {
    navigaDa('http://192.168.1.5:3000')
    const { container } = render(<PortaleLinkButtons portaleToken={TOKEN} />)
    expect(container.textContent).not.toContain('192.168.1.5')
  })

  it('segue la variabile d\'ambiente, così in sviluppo il link è provabile', () => {
    // 🔑 Serve a chi sviluppa: con `NEXT_PUBLIC_APP_URL=http://localhost:3000`
    //    (come dice `.env.example`) il link copiato si può davvero aprire.
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    navigaDa('http://192.168.1.5:3000')
    render(<PortaleLinkButtons portaleToken={TOKEN} />)
    expect(screen.getByText(`http://localhost:3000/richiedi/${TOKEN}`)).toBeTruthy()
  })

  it('senza variabile d\'ambiente ricade su uachelab.com, come gli altri sette punti', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    navigaDa('http://192.168.1.5:3000')
    render(<PortaleLinkButtons portaleToken={TOKEN} />)
    expect(screen.getByText(`https://uachelab.com/richiedi/${TOKEN}`)).toBeTruthy()
  })
})
