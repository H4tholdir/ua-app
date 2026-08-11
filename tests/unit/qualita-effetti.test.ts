import { describe, it, expect } from 'vitest'
import {
  effettoDaMotivo,
  effettoDaMotivoEScelta,
  EFFETTI_PER_MOTIVO,
  MOTIVI_CON_SCELTA,
} from '@/lib/qualita/effetti'
import type { Effetto } from '@/lib/qualita/effetti'
import { MOTIVI } from '@/lib/domain/qualita-costanti'
import type { Motivo } from '@/lib/domain/qualita-costanti'

/** 🔑 L'INGRESSO CONDIVISO DELLE INVARIANTI SUI TESTI — tredici righe: le NOVE
 *  della tabella fissa più i QUATTRO esiti risolti del bivio
 *  (`MOTIVI_CON_SCELTA` × `si_sistema`/`si_rifa`).
 *
 *  🛑 Sta qui, e non dentro le singole prove, per un difetto vero del 07/08: le
 *  due invarianti sui testi avevano ognuna il proprio elenco scritto a mano, e
 *  quando è arrivato il bivio ne è stato allargato **uno solo** — l'altra è
 *  rimasta a guardare la sola tabella fissa, verde e cieca, sei righe più
 *  sotto. Due elenchi che devono restare uguali sono un elenco che diverge.
 *  Chi aggiunge una porta d'uscita nuova a questo modulo la aggiunge QUI, e
 *  tutte le invarianti la vedono insieme. */
function tutteLeRighe(): ReadonlyArray<readonly [string, Effetto]> {
  return [
    ...MOTIVI.map((m) => [m, effettoDaMotivo(m)] as const),
    ...MOTIVI_CON_SCELTA.flatMap((m) =>
      (['si_sistema', 'si_rifa'] as const).map(
        (s) => [`${m} + ${s}`, effettoDaMotivoEScelta(m, s)] as const
      )
    ),
  ]
}

/**
 * L'ELENCO DEGLI EFFETTI DEI NOVE MOTIVI — D288, D290, D291, D292, D297, D298.
 *
 * 🔑 Questo è il PIANO OPERATIVO, e non è lo stesso di `classifica.ts`.
 * D288 lo dice per intero: «le due righe non erano in contraddizione, parlavano
 * di due piani diversi». `classifica()` risponde alla domanda della NORMA («è un
 * incidente? un reclamo? niente?»); questo modulo risponde alla domanda del
 * BANCO («che cosa succede adesso al lavoro e alla dichiarazione?»).
 *
 * 🛑 LA PROVA CHE CONTA PIÙ DI TUTTE È L'ULTIMA: l'elenco è completo per
 * costruzione, non perché qualcuno lo ha riletto. Un elenco scritto a mano
 * sembra completo e non lo è — in questo progetto è successo QUATTRO volte in
 * un giorno solo (handoff del 07/08, lezione 3). Qui la fonte è `MOTIVI`, che è
 * copiato alla lettera dal CHECK vivo in banca dati.
 */

describe('effettoDaMotivo — l\'elenco degli effetti (D288-D298)', () => {
  describe('le righe che l\'app esegue DA SOLA — oggi DUE, non più una', () => {
    it('«ho sbagliato a premere consegna» ripristina tutto, e porta l\'azione automatica (D288)', () => {
      const e = effettoDaMotivo('errore_registrazione')
      expect(e.lavoro).toBe('ripristina_tutto')
      expect(e.documento).toBe('annulla')
      expect(e.azione).toBe('riapri_lavoro')
    })

    // ⚖️ D312 (07/08/2026) — QUESTA RIGA DICEVA «è l'UNICO dei nove», ed era vero
    // finché la transizione «pronto col documento intatto» non esisteva. Il
    // PRONTO-4 l'ha costruita (`riporta_a_pronto_atomica`), quindi «persona
    // sbagliata» smette di essere un descrittore e prende la sua azione.
    // 🔑 L'ordine atteso NON è alfabetico: è quello di `MOTIVI`
    // (`qualita-costanti.ts:21-31`), dove `destinatario_errato` è la quarta voce
    // e `errore_registrazione` l'ottava — `filter` conserva quell'ordine.
    it('sono DUE i motivi con un\'azione automatica, e gli altri sette non fanno niente da soli (D312)', () => {
      const conAzione = MOTIVI.filter((m) => effettoDaMotivo(m).azione !== null)
      expect(conAzione).toEqual(['destinatario_errato', 'errore_registrazione'])
    })
  })

  describe('le righe decise, che però una scelta o un altro compito devono ancora eseguire', () => {
    it('«persona sbagliata»: il lavoro torna pronto, il documento RESTA VALIDO, e ora l\'azione c\'è (D291 · D312)', () => {
      const e = effettoDaMotivo('destinatario_errato')
      expect(e.lavoro).toBe('torna_pronto')
      expect(e.documento).toBe('resta_valido')
      // ⚖️ D312 — QUI C'ERA `toBeNull()`, con accanto tre righe di commento che
      // dicevano «la transizione "pronto col documento intatto" NON ESISTE
      // ancora». 🛑 Quel testo è SCADUTO dal PRONTO-4, che ha costruito
      // `riporta_a_pronto_atomica`: ripristina il lavoro e lascia viva la
      // dichiarazione, che è esattamente ciò che questa riga chiede.
      // 🔑 Resta vero il motivo per cui NON può essere `riapri_lavoro`:
      // `riapri_lavoro_atomica` annulla SEMPRE la dichiarazione
      // (20260806210400:138-140). L'azione è l'altra.
      expect(e.azione).toBe('torna_pronto')
    })

    it('«difetto di lavorazione» e «difetto del materiale» chiedono una scelta, e il documento la segue (D290, D297, D298)', () => {
      for (const m of ['difetto_lavorazione', 'difetto_materiale'] as const) {
        const e = effettoDaMotivo(m)
        expect(e.lavoro, m).toBe('scelta_richiesta')
        expect(e.documento, m).toBe('segue_la_scelta')
        expect(e.azione, m).toBeNull()
      }
    })

    // ⚖️ D299 — «si riconsegna» voleva dire la CARTA, non il pezzo. La spec e D288
    // si contraddicevano; Francesco: «il lavoro resta consegnato, si rifà solo la
    // carta». 🛑 Questa prova è anche il PERIMETRO del Task 5: se un giorno la
    // riemissione facesse rientrare il lavoro, si accenderebbe qui.
    it('«dato sbagliato sul documento»: il lavoro RESTA CONSEGNATO, si rifà solo la carta (D299)', () => {
      const e = effettoDaMotivo('errore_dato_dichiarazione')
      expect(e.lavoro).toBe('resta_consegnato')
      expect(e.documento).toBe('riemetti')
      // 🛑 E non porta azione automatica: la riemissione è il Task 5, e non passa
      // da `riapri_lavoro_atomica` — che riporterebbe il lavoro a `pronto`.
      expect(e.azione).toBeNull()
    })

    it('«modifica chiesta dal medico»: lavoro NUOVO, non un rientro — e il documento resta valido', () => {
      const e = effettoDaMotivo('modifica_clinica_richiesta')
      expect(e.lavoro).toBe('lavoro_nuovo')
      expect(e.documento).toBe('resta_valido')
    })

    it('«prezzo o quantità»: non si tocca niente, né il lavoro né il documento', () => {
      const e = effettoDaMotivo('errore_prezzo_quantita')
      expect(e.lavoro).toBe('resta_consegnato')
      expect(e.documento).toBe('resta_valido')
    })
  })

  describe('le righe che dichiarano di NON sapere — e lo dicono invece di indovinare', () => {
    it('«reso senza difetto» dipende dal perché, su entrambi i piani (D292)', () => {
      const e = effettoDaMotivo('reso_senza_difetto')
      expect(e.lavoro).toBe('dipende_dal_perche')
      expect(e.documento).toBe('dipende_dal_perche')
      expect(e.azione).toBeNull()
    })

    it('«altro» non fa niente in automatico, e non indovina', () => {
      const e = effettoDaMotivo('altro')
      expect(e.lavoro).toBe('nessuno')
      expect(e.documento).toBe('nessuno')
      expect(e.azione).toBeNull()
    })
  })

  describe('l\'elenco non può perdere una riga in silenzio', () => {
    it('copre TUTTI e nove i motivi del vocabolario, e nessuno in più', () => {
      expect(Object.keys(EFFETTI_PER_MOTIVO).sort()).toEqual([...MOTIVI].sort())
    })

    // 🔴 SECONDO EMENDAMENTO DEL 07/08, e l'ha trovato la REVISIONE: questa
    // invariante è la GEMELLA di quella di D301/D302 poco sotto, e mentre
    // l'altra veniva allargata ai testi risolti questa è rimasta cieca — sei
    // righe più su, dentro lo stesso `describe`. Erano due elenchi scritti a
    // mano sullo stesso ingresso, e ne è stato aggiornato uno solo.
    // 🔑 Per questo l'ingresso ora è UNO SOLO e vive in `tutteLeRighe()`: due
    // elenchi che devono restare uguali sono un elenco che diverge.
    it('ogni riga porta un perché in parole comuni e la decisione che la regge', () => {
      const righe = tutteLeRighe()
      expect(righe).toHaveLength(13)
      for (const [dove, e] of righe) {
        expect(e.perche.length, dove).toBeGreaterThan(40)
        expect(e.decisione, dove).toMatch(/D\d+|spec §/)
      }
    })

    // ⚖️ D301 e D302 (07/08/2026) — LE DUE PAROLE DI CASA, e questa prova esiste
    // perché senza rete rientrano da sole. Il file diceva «Il pezzo è
    // compromesso» e, in un'altra riga, «Il manufatto è a posto»: **due parole
    // per la stessa cosa dentro lo stesso file**, e nessuno se n'era accorto
    // finché Francesco non l'ha letto a schermo.
    // 🔴 EMENDAMENTO DEL 07/08 — L'INGRESSO DELLA GUARDIA ERA CIECO SUI TESTI
    // NUOVI. Scorrendo i soli `MOTIVI` e chiamando `effettoDaMotivo`, questa
    // prova guardava **la sola tabella fissa**: i due `perche` risolti li
    // produce `effettoDaMotivoEScelta`, quindi non venivano esaminati nemmeno
    // per sbaglio — sarebbero passati per non essere stati guardati.
    // 🛑 È la stessa famiglia dei falsi verdi già pagati in quest'ondata: *una
    // prova che non guarda la cosa non è una prova che la cosa sia giusta*.
    // Ora l'ingresso sono TREDICI testi: i nove della tabella più i quattro
    // esiti risolti (`MOTIVI_CON_SCELTA` × `si_sistema`/`si_rifa`), così il
    // divieto vale anche per chi scriverà la prossima frase.
    it('🛑 D301/D302 — nessun testo dice «pezzo» o «carta»: si dice MANUFATTO e DICHIARAZIONE', () => {
      const righe = tutteLeRighe()
      // 🔑 Il conteggio è parte della guardia: senza, un `MOTIVI_CON_SCELTA`
      // svuotato per sbaglio farebbe RESTRINGERE l'ingresso in silenzio, e la
      // prova tornerebbe verde proprio perché non guarda più niente.
      expect(righe).toHaveLength(13)
      for (const [dove, e] of righe) {
        const t = e.perche.toLowerCase()
        expect(t, `${dove} — «pezzo» è vietato (D301: si dice «manufatto»)`).not.toMatch(/\bpezzo\b/)
        expect(t, `${dove} — «carta» è vietata nelle etichette (D302: si dice «dichiarazione»)`).not.toMatch(/\bcarta\b/)
      }
    })

    it('un motivo fuori vocabolario non fa risalire il prototipo di Object', () => {
      // Stesso difetto già chiuso in `naturaDaMotivo` (qualita-costanti.ts): un
      // `Record` indicizzato senza guardia restituisce una FUNZIONE per
      // 'constructor', che poi viaggia come se fosse un effetto.
      // Forme censite: chiave del prototipo · stringa qualunque · assenza ·
      // tipo sbagliato. La firma vieta le ultime tre, ma la firma non gira a
      // runtime e questa funzione governa un'AZIONE, non solo un'etichetta.
      const veleni = ['constructor', '__proto__', 'toString', 'pippo', '', null, undefined, 7, {}]
      for (const veleno of veleni) {
        const e = effettoDaMotivo(veleno as Motivo)
        expect(e.azione, String(veleno)).toBeNull()
        expect(e.lavoro, String(veleno)).toBe('nessuno')
      }
    })
  })
})

/**
 * IL BIVIO DEI DUE DIFETTI — D304, sopra D290/D297/D298.
 *
 * 🔑 Due motivi su nove non hanno un effetto solo: hanno un BIVIO, e chi
 * registra lo sceglie. `effettoDaMotivo` restituisce la riga NON risolta —
 * quella che dichiara `scelta_richiesta` e non agisce; `effettoDaMotivoEScelta`
 * restituisce la riga RISOLTA. Le due convivono per disegno: la prima descrive
 * il motivo, la seconda descrive il motivo *più* la risposta.
 *
 * 🛑 E la scelta non si indovina: senza, la funzione torna alla riga non
 * risolta invece di scegliere un ramo per conto di chi non ha risposto.
 */
describe('effettoDaMotivoEScelta — il bivio dei due difetti (D304)', () => {
  it('difetto_lavorazione + si_sistema → il lavoro torna pronto, la dichiarazione resta valida', () => {
    const e = effettoDaMotivoEScelta('difetto_lavorazione', 'si_sistema')
    expect(e.lavoro).toBe('torna_pronto')
    expect(e.documento).toBe('resta_valido')
    expect(e.azione).toBe('torna_pronto')
  })

  it('difetto_materiale + si_rifa → nasce un lavoro nuovo, il vecchio resta consegnato', () => {
    const e = effettoDaMotivoEScelta('difetto_materiale', 'si_rifa')
    expect(e.lavoro).toBe('lavoro_nuovo')
    expect(e.documento).toBe('resta_valido')
    expect(e.azione).toBe('crea_rifacimento')
  })

  // ⚠️ QUESTA PROVA MISURA L'ESITO, NON LA CLAUSOLA — e il nome prometteva di
  // più, quindi la riga sta qui (revisione del 07/08). La mutazione «togli
  // `|| scelta === null`» **non fa fallire nessuna prova**, ed è corretto: senza
  // quella clausola l'esecuzione cade comunque in fondo, perché `null` non è né
  // `'si_sistema'` né `'si_rifa'`. La clausola è ridondante per comportamento e
  // scritta per intenzione — dice a chi legge che l'assenza di scelta è un caso
  // previsto, non un residuo. 🔑 Ciò che questa prova garantisce davvero, ed è
  // ciò che conta a schermo: senza scelta NON esce un ramo indovinato.
  it('senza scelta restituisce la riga NON risolta, e nessuna azione', () => {
    const e = effettoDaMotivoEScelta('difetto_lavorazione', null)
    expect(e.lavoro).toBe('scelta_richiesta')
    expect(e.azione).toBeNull()
  })

  it('una scelta su un motivo che non la ammette NON produce nessuna azione', () => {
    const e = effettoDaMotivoEScelta('errore_prezzo_quantita', 'si_rifa')
    expect(e).toEqual(effettoDaMotivo('errore_prezzo_quantita'))
    expect(e.azione).toBeNull()
  })

  it('una chiave del prototipo non risale a Object e non porta azioni', () => {
    const e = effettoDaMotivoEScelta('constructor' as never, 'si_rifa' as never)
    expect(e.azione).toBeNull()
    expect(typeof e.perche).toBe('string')
  })

  // 🔑 NON È COSMESI: `DevoIntervenire.tsx:468` stampa `effetto.perche`, e il
  // testo della riga non risolta (`effetti.ts:113`) è una DOMANDA APERTA. Senza
  // questa prova, la schermata finale richiederebbe una scelta già fatta.
  it('il testo risolto NON ripete la domanda a cui la persona ha già risposto', () => {
    const e = effettoDaMotivoEScelta('difetto_lavorazione', 'si_sistema')
    expect(e.perche).not.toMatch(/oppure se ne fa uno nuovo\?/)
  })

  // ⚖️ D312 — il TERZO motivo della spec §0, che non passa dal bivio: la sua
  // azione vive nella riga fissa, e questa prova la copre da entrambe le porte.
  it('«persona sbagliata» porta ORA la sua azione, e la porta anche senza scelta (D291 · D312)', () => {
    for (const e of [
      effettoDaMotivo('destinatario_errato'),
      effettoDaMotivoEScelta('destinatario_errato', null),
      effettoDaMotivoEScelta('destinatario_errato', 'si_rifa'), // una scelta che quel motivo non ammette
    ]) {
      expect(e.lavoro).toBe('torna_pronto')
      expect(e.documento).toBe('resta_valido')
      expect(e.azione).toBe('torna_pronto')
    }
  })
})
