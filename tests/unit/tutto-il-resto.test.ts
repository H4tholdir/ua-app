import { describe, it, expect } from 'vitest'
import { componiSezioni } from '@/lib/dashboard/tutto-il-resto'

const DATI = { dentisti: ['Esposito', 'Bianchi', 'Russo', 'Verdi'], fattureDaSistemare: 0, materialiRossi: 0, consegneOggi: 2, prossimaOra: '16:00', persone: ['Francesco', 'Ciro', 'Salvatore'] }

describe('Tutto il resto — le 9 voci chiuse di §6.1, nell ordine di legge', () => {
  it('titolare: 8 voci (niente rete), ordine §6.1, href reali', () => {
    const sezioni = componiSezioni('titolare', DATI)
    expect(sezioni.map((s) => s.nome)).toEqual(['Dentisti', 'Fatture', 'Magazzino', 'Agenda', 'Documenti e qualità', 'Persone', 'Listino', 'Il mio laboratorio'])
    expect(sezioni.map((s) => s.href)).toEqual(['/clienti', '/fatture', '/magazzino', '/agenda', '/qualita', '/tecnici', '/listino', '/impostazioni'])
  })
  it('admin_rete: compare «La mia rete» prima di «Il mio laboratorio»', () => {
    const nomi = componiSezioni('admin_rete', DATI).map((s) => s.nome)
    expect(nomi).toContain('La mia rete')
    expect(nomi.indexOf('La mia rete')).toBe(nomi.length - 2)
  })
  it('sub in parole del banco, dai dati veri', () => {
    const s = componiSezioni('titolare', DATI)
    expect(s[0].sub).toBe('Esposito, Bianchi, Russo e Verdi')
    expect(s[1].sub).toBe('Tutto a posto questo mese ✓')
    expect(s[3].sub).toBe('Oggi 2 consegne · la prossima alle 16:00')
    expect(componiSezioni('titolare', { ...DATI, fattureDaSistemare: 1 })[1].sub).toBe('1 fattura da sistemare')
    expect(componiSezioni('titolare', { ...DATI, materialiRossi: 0 })[2].sub).toBe('Tutto rifornito ✓')
  })
})

describe('Tutto il resto — voce condizionale «I lavori» (§7, Task 15)', () => {
  it("homePref='parete' → «I lavori» come prima voce (la via alle pile per chi le esclude dalla home)", () => {
    const s = componiSezioni('titolare', DATI, 'parete')
    expect(s[0]).toEqual({ chiave: 'lavori', emoji: '📋', nome: 'I lavori', sub: 'Le quattro pile', href: '/dashboard?stanza=pile' })
  })

  it("homePref='pile' o 'due_stanze' → nessuna voce «I lavori» (le pile sono già in home)", () => {
    for (const pref of ['pile', 'due_stanze'] as const) {
      expect(componiSezioni('titolare', DATI, pref).map((v) => v.chiave)).not.toContain('lavori')
    }
  })

  it('homePref assente (chiamata a 2 argomenti) → nessuna «I lavori», ordine legacy invariato', () => {
    const nomi = componiSezioni('titolare', DATI).map((s) => s.nome)
    expect(nomi).not.toContain('I lavori')
    expect(nomi[0]).toBe('Dentisti')
  })
})
