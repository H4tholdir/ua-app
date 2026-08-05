'use client'

// DS v3 §7.3 (Ondata B ②, Task 10 · P37/D211) — ChiHaPrescrittoSheet: il
// mini-foglio «Chi ha prescritto?» che sale SOPRA il Passo 1 quando il
// cliente scelto è un'entità (`studio_nome` presente) — mai un passo nuovo
// del wizard (vincolo di ondata: zero passi), e mai bloccante (W22): «Chiudi»
// (via di fuga di legge dello Sheet, §5.16) equivale a non aver scelto
// nessuno, esattamente come oggi prima di questo task.
//
// FONTE VISIVA: docs/design/mockups/2026-08-04-ondata-b-D-chi-ha-prescritto.html
// scena d1 (approvato). DUE SCOSTAMENTI DICHIARATI dal mockup, entrambi
// perché il mockup promette più di quanto i dati di questa ondata sappiano
// dire (vedi report task-10):
// 1. Nessuna riga è evidenziata come «proposta»/«l'ultimo che ha prescritto
//    qui»: `GET /api/clienti/[id]/studio-members` non porta né un ordine per
//    recenza né un conteggio prescrizioni, e un'evidenza verde senza un fatto
//    dietro sarebbe la bugia che l'intera ondata B esiste per chiudere
//    (0B-9: «una riga vuota è peggio di una riga che manca» — vale anche per
//    una riga sicura di sé che non lo è). Le righe sono tutte alla pari.
// 2. Il sottotitolo non nomina "prescrivono": `studio-members` elenca chi
//    RISULTA allo studio, non chi ha davvero scritto una prescrizione — dire
//    «prescrivono in tre» affermerebbe un fatto che non abbiamo.
//
// GATE (deciso in WizardNuovoLavoro.tsx, non qui): questo componente non
// decide MAI da solo se aprirsi. Il chiamante ha già interrogato
// `studio-members` e apre il foglio SOLO se la risposta ha almeno un
// elemento — uno studio "di uno solo" (studio_nome compilato ma nessun
// collega) si comporta come un dottore singolo: nessun foglio, nessuna
// domanda, la Dichiarazione ripiega sul nome del cliente esattamente come
// per un cliente senza studio_nome (stesso ripiego server-side,
// generate-ddc.ts:146 — l'unico dato che quel cliente porta È il nome della
// persona, quindi il ripiego è già la risposta corretta).
//
// IL CLIENTE TOCCATO (fix-review CRITICAL 1): `GET /studio-members` esclude
// per costruzione il cliente il cui tile è stato tappato (`.neq('id', id)`,
// route.ts:50) — senza intervento, chi tocca la riga di un medico non
// potrebbe MAI offrire SE STESSO come prescrittore. Il chiamante lo
// ANTEPONE a `medici` (`WizardNuovoLavoro.caricaStudioEApri`): `medici[0]`
// è quindi SEMPRE il cliente toccato quando il foglio arriva ad aprirsi.
// Questo componente non lo sa e non gli serve saperlo — tratta ogni riga
// allo stesso modo (v. punto 1 sopra), e proprio per questo il conteggio
// del sottotitolo (`medici.length`) diventa quello vero.
//
// STUDIO_NOME AUTORITATIVO: si legge da `medici[0].studio_nome` (il valore
// grezzo della riga DB), MAI da un'etichetta derivata altrove (es. il
// `label` del tile del Passo 1, che potrebbe un giorno guadagnare una
// decorazione e disallinearsi silenziosamente dalla ragione sociale vera).
// Tutti i membri restituiti hanno lo STESSO `studio_nome` per costruzione
// (la query di `route.ts:50` per gli "altri", l'assegnazione diretta del
// chiamante per il cliente anteposto).
//
// «È un altro»: fallback DICHIARATO (non il pattern NuovoDentistaSheet
// riusato as-is) — quel componente calcola `label = studio_nome ?? Dr.
// Cognome`, e qui `studio_nome` è SEMPRE compilato (lo stiamo preimpostando
// noi), quindi la sua label collasserebbe sempre sul nome dello STUDIO, mai
// sulla persona appena creata: esattamente il dato sbagliato per
// `richiedente_nome`. Il fallback onesto è un mini-form locale (Nome +
// Cognome, stesso vincolo MDR "obbligatori" di NuovoDentistaSheet) che POSTa
// allo stesso endpoint `/api/clienti` con `studio_nome` preimpostato — il
// nuovo medico «entra nello studio» (stessa riga DB, stesso raggruppamento
// per `studio-members`), e il nome scelto è quello appena digitato.

import { useState, type CSSProperties } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { LinkQuieto } from '@/components/ds/LinkQuieto'
import { Avatar } from '@/components/ds/Avatar'
import { useAvvisi } from '@/components/ds/Avviso'
import { vibra } from '@/design-system/v3/haptic'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'

export type MembroStudio = { id: string; nome: string; cognome: string; studio_nome: string | null }

/** «Cognome Nome» — STESSO ordine del placeholder già in produzione
 *  (TabDati.tsx:309, "Dott. Cognome Nome") e della chip-shortcut
 *  (TabDati.tsx:241, `${cognome} ${nome.charAt(0)}.`). Qui si usa il nome
 *  PER INTERO (non abbreviato): questo foglio ha spazio per una riga intera,
 *  e un nome completo è il fallimento migliore su un documento a valore
 *  legale — la DIVERGENZA dalla forma abbreviata di TabDati è dichiarata nel
 *  report (R-E2: due superfici che scrivono lo stesso campo con convenzioni
 *  diverse è un'incoerenza da segnalare, non da correggere qui). Ciò che
 *  conta è che display e valore salvato siano LA STESSA stringa. */
function nomeCompleto(m: MembroStudio): string {
  return `${m.cognome} ${m.nome}`.trim()
}

/**
 * ChiHaPrescrittoSheet — il mini-foglio D211 (P37).
 *
 * `medici` arriva GIÀ CARICATO dal chiamante (niente fetch qui: la decisione
 * "apro il foglio?" richiede il risultato PRIMA di montare il foglio stesso —
 * v. commento in testa al file). Sempre non vuoto quando `aperto` è vero
 * (contratto del chiamante); questo componente non filtra né ordina.
 */
export function ChiHaPrescrittoSheet(props: {
  aperto: boolean
  medici: MembroStudio[]
  onScelto: (richiedenteNome: string, istituzioneSanitaria: string) => void
  onChiudi: () => void
}) {
  const { aperto, medici, onScelto, onChiudi } = props
  const { errore } = useAvvisi()

  const studioNome = medici[0]?.studio_nome ?? ''

  const [modoAggiungi, setModoAggiungi] = useState(false)
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [vincolo, setVincolo] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  function resetForm() {
    setModoAggiungi(false)
    setNome('')
    setCognome('')
    setVincolo(null)
    setInvio(false)
  }

  function chiudi() {
    resetForm()
    onChiudi()
  }

  function scegli(m: MembroStudio) {
    vibra('selection')
    onScelto(nomeCompleto(m), studioNome)
  }

  // MINOR 7 (fix-review): «È un altro» torna una porta A DOPPIO SENSO — si
  // esce dal mini-form senza creare nulla e senza chiudere il foglio.
  // `vincolo` si azzera (un errore mostrato prima di uscire non deve
  // ricomparire "stantio" se si rientra); nome/cognome digitati RESTANO
  // (nessuna ragione di buttare via ciò che si è già scritto, nel caso si
  // torni qui una seconda volta).
  function tornaAllElenco() {
    setVincolo(null)
    setModoAggiungi(false)
  }

  async function aggiungi() {
    const nomeOk = nome.trim()
    const cognomeOk = cognome.trim()
    if (!nomeOk || !cognomeOk) {
      setVincolo('Nome e cognome sono obbligatori')
      return
    }
    setVincolo(null)
    setInvio(true)

    try {
      const res = await fetch('/api/clienti', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeOk, cognome: cognomeOk, studio_nome: studioNome }),
      })
      if (!res.ok) {
        errore('Non sono riuscita ad aggiungere il medico. Riprova.')
        setInvio(false)
        return
      }
      // Nome COME DIGITATO (nomeOk/cognomeOk), non una rilettura dal server —
      // stessa ragione di `nomeCompleto` sopra: la riga richiede la persona,
      // e la persona l'ha appena scritta chi sta al banco.
      onScelto(`${cognomeOk} ${nomeOk}`, studioNome)
    } catch {
      errore('Non sono riuscita ad aggiungere il medico. Riprova.')
      setInvio(false)
    }
  }

  const sottotitolo =
    medici.length === 1
      ? `Da ${studioNome} risulta un medico. Sulla Dichiarazione va il nome della persona, non dello studio.`
      : `Da ${studioNome} risultano ${medici.length} medici. Sulla Dichiarazione va il nome della persona, non dello studio.`

  return (
    <Sheet aperto={aperto} onChiudi={chiudi} titolo="Chi ha prescritto?">
      {modoAggiungi ? (
        <>
          <CampoTesto label="Nome" valore={nome} onCambia={setNome} placeholder="Mario" autoFocus />
          <CampoTesto label="Cognome" valore={cognome} onCambia={setCognome} placeholder="Rossi" />
          {vincolo && (
            <p role="alert" style={stileVincolo}>
              {vincolo}
            </p>
          )}
          <TastoPrimario onClick={aggiungi} disabled={invio} motivoDisabilitato="Un attimo…">
            Aggiungi allo studio
          </TastoPrimario>
          {/* MINOR 7 (fix-review): senza questo, «È un altro» era una porta a
              senso unico — chi lo apriva per sbaglio (o cambia idea) non
              poteva più tornare a scegliere dalla lista senza chiudere
              l'intero foglio. `LinkQuieto`, non un tasto fisico: è una via
              di fuga (§5.5), non un'azione che conta. */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <LinkQuieto onClick={tornaAllElenco}>Torna all&apos;elenco</LinkQuieto>
          </div>
        </>
      ) : (
        <>
          <p style={stileSotto}>{sottotitolo}</p>
          <div>
            {medici.map((m) => (
              // IMPORTANT 3 (fix-review) — `ds-medico-riga` è la classe-aggancio
              // per il rimedio ratificato al gate L2 (22/07/2026, ds-v3.css:90-94):
              // in dark, faccia `--card` + `--sh-press: none` dentro un pannello
              // anch'esso `--card` rendeva la riga invisibile (restava solo il
              // testo) — stesso difetto già chiuso per `.ds-chip-scelta`/
              // `.ds-tasto-tondo`, qui esteso alle righe di questo foglio.
              // `ds-tap-v3` = l'anello di messa a fuoco del DS (D4): senza,
              // navigando da tastiera queste righe avevano il solo outline
              // nativo del browser. Il polish D4 l'aveva esteso alle «voci
              // degli sheet» — queste sono nate dopo e ne erano rimaste fuori
              // (gate L2 del 05/08).
              <button key={m.id} type="button" onClick={() => scegli(m)} className="ds-medico-riga ds-tap-v3" style={stileMedico}>
                <Avatar nome={nomeCompleto(m)} diametro={46} />
                <span style={stileMedicoNome}>{nomeCompleto(m)}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: spazio.s, display: 'flex', justifyContent: 'center' }}>
            <LinkQuieto onClick={() => setModoAggiungi(true)}>È un altro: lo aggiungo allo studio</LinkQuieto>
          </div>
        </>
      )}
    </Sheet>
  )
}

const stileSotto: CSSProperties = {
  fontSize: tipografia.size.callout,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--muted)',
  lineHeight: 1.4,
  margin: 0,
}

// wizard.html:.medico — riga 60 min-height, radius 18 (raggio.riga), bordo
// hairline `--line`, ombra di pressione (stessa materia degli altri
// controlli premibili dello sheet). Tutte le righe hanno LO STESSO stile
// (nessuna evidenziata come "proposta" — v. commento in testa al file).
const stileMedico: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: spazio.m,
  minHeight: 60,
  textAlign: 'left',
  background: 'var(--card)',
  border: '1.5px solid var(--line)',
  borderRadius: raggio.riga,
  boxShadow: 'var(--sh-press)',
  padding: '10px 16px',
  marginBottom: spazio.s,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const stileMedicoNome: CSSProperties = {
  fontSize: 17,
  fontWeight: tipografia.weight.extrabold,
  color: 'var(--ink)',
}

const stileVincolo: CSSProperties = {
  fontSize: tipografia.size.callout,
  fontWeight: tipografia.weight.bold,
  color: 'var(--red)',
  margin: 0,
}
