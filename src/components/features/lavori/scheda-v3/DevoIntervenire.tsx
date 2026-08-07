'use client'

// src/components/features/lavori/scheda-v3/DevoIntervenire.tsx
//
// Task 6 dell'ondata «si deve sempre poter intervenire».
// Mockup APPROVATO: docs/design/mockups/2026-08-07-devo-intervenire.html
// Verbale: D269 · D283 · D288 · D300-D303.
//
// 🔑 LA FORMA, e ogni pezzo ha la sua decisione dietro:
//   ① una RIGA sulla scheda, sempre presente su un lavoro consegnato — non per
//      dieci minuti (D269: la finestra è abolita);
//   ② un DIALOGO d'ingresso, parole di Francesco (D288): «vuoi reintervenire
//      sul lavoro o hai premuto questo tasto per sbaglio?». 🛑 È un dialogo e
//      non un foglio: per una conferma PRIMA di un atto conseguente il foglio a
//      scomparsa è lo strumento sbagliato — si chiude anche per sbaglio,
//      trascinandolo. L'uscita **non salva niente**;
//   ③ un FOGLIO coi nove motivi RAGGRUPPATI in cinque famiglie (D300);
//   ④ per otto motivi su nove, le quattro caselle della spec §5;
//   ⑤ la proposta **col suo perché** e un tasto per cambiarla (D267).
//
// 🛑 DUE «PER SBAGLIO» DIVERSI, e confonderli costerebbe: «hai premuto QUESTO
//    TASTO per sbaglio» è l'uscita del dialogo d'ingresso e **non salva
//    niente**; «ho sbagliato a premere CONSEGNA» è uno dei nove motivi e
//    **ripristina tutto**. Sono nominati diversamente apposta.
//
// ⚖️ D301/D303 — qui parla il BANCO: si dice «manufatto». «Dispositivo» è la
//    parola della norma e arriva dal server, dentro il `perche` della proposta.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ds/Sheet'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { ChipScelta } from '@/components/ds/ChipScelta'
import { useAvvisi } from '@/components/ds/Avviso'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'
import {
  ORIGINI_INFORMAZIONE,
  STATI_DISPOSITIVO,
  POTENZIALI_DI_DANNO,
} from '@/lib/domain/qualita-costanti'
import type {
  Motivo,
  OrigineInformazione,
  StatoDispositivo,
  PotenzialeDiDanno,
  Esito,
} from '@/lib/domain/qualita-costanti'
import {
  FAMIGLIE, MOTIVI_UI, motiviDellaFamiglia,
  DOMANDE, ORIGINE_UI, STATO_UI, DANNO_UI, ESITO_UI,
} from '@/lib/qualita/motivi-ui'
import { effettoDaMotivo } from '@/lib/qualita/effetti'

/** Le fasi del percorso. `chiuso` è lo stato a riposo: la riga sulla scheda. */
type Fase = 'chiuso' | 'domanda' | 'motivo' | 'confermaSbaglio' | 'dettagli' | 'proposta' | 'esito'

interface Proposta {
  esito: Esito
  perche: string
  ramoIso: string | null
  termineOre: number | null
}

interface Riapertura {
  stato: 'applicato' | 'non_applicabile' | 'fallito'
  dichiarazione_assente?: boolean
  motivo?: string
  messaggio?: string
}

interface RispostaEvento {
  evento: { id: string }
  proposta: Proposta
  effetto: { lavoro: string; documento: string; azione: string | null; perche: string }
  riapertura?: Riapertura
}

const TINTE = {
  rossa: { bg: 'var(--red-tint)', ink: 'var(--red)' },
  blu: { bg: 'var(--blue-tint)', ink: 'var(--blue)' },
  viola: { bg: 'var(--purple-tint)', ink: 'var(--purple)' },
  ambra: { bg: 'var(--amber-tint)', ink: 'var(--amber)' },
  verde: { bg: 'var(--green-tint)', ink: 'var(--green)' },
} as const

/** Adesso, nella forma che il campo `datetime-local` sa mostrare.
 *
 *  ⚠️ La rotta legge questo momento sull'orologio di **Roma** (D286), non su
 *  quello del processo: qui si manda il valore locale del telefono e la
 *  conversione la fa il server, in un posto solo. */
function adessoLocale(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function DevoIntervenire(props: { lavoroId: string; descrizione: string }) {
  const { lavoroId, descrizione } = props
  const router = useRouter()
  const { errore } = useAvvisi()

  const [fase, setFase] = useState<Fase>('chiuso')
  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [motivoLibero, setMotivoLibero] = useState('')
  const [origine, setOrigine] = useState<OrigineInformazione>('laboratorio_interno')
  const [conosciuto, setConosciuto] = useState(adessoLocale())
  const [statoDisp, setStatoDisp] = useState<StatoDispositivo>('consegnato_non_applicato')
  // 🛑 Spec §5 — «da valutare» è il valore d'apertura, e «no» NON è il percorso
  //    più rapido: le quattro pastiglie hanno lo stesso peso. Un default
  //    «nessuno» sarebbe un generatore silenzioso di sotto-classificazione,
  //    contro l'Art. 87(7).
  const [danno, setDanno] = useState<PotenzialeDiDanno>('da_valutare')
  const [risposta, setRisposta] = useState<RispostaEvento | null>(null)
  const [esitoScelto, setEsitoScelto] = useState<Esito | null>(null)
  const [cambiando, setCambiando] = useState(false)
  const [lavorando, setLavorando] = useState(false)
  const [confermata, setConfermata] = useState(false)

  function ricomincia() {
    setFase('chiuso'); setMotivo(null); setMotivoLibero(''); setRisposta(null)
    setEsitoScelto(null); setCambiando(false); setConfermata(false)
    setOrigine('laboratorio_interno'); setStatoDisp('consegnato_non_applicato')
    setDanno('da_valutare'); setConosciuto(adessoLocale())
  }

  function scegliMotivo(m: Motivo) {
    setMotivo(m)
    // 🛑 «Ho premuto consegna per sbaglio» NON chiede le quattro caselle: la
    //    consegna non è avvenuta, quindi non c'è un «dov'era il manufatto» da
    //    rispondere. E l'app non lascia nemmeno sceglierlo — la rotta rifiuta
    //    quel motivo con qualunque stato diverso da «mai uscito», perché
    //    annullerebbe la dichiarazione di un manufatto uscito davvero.
    setFase(m === 'errore_registrazione' ? 'confermaSbaglio' : 'dettagli')
  }

  async function registra() {
    if (!motivo) return
    setLavorando(true)
    try {
      const sbaglio = motivo === 'errore_registrazione'
      const corpo: Record<string, unknown> = {
        motivo,
        origine_informazione: sbaglio ? 'laboratorio_interno' : origine,
        // 🛑 Fissato, non chiesto: v. `scegliMotivo`.
        stato_dispositivo: sbaglio ? 'mai_uscito_dal_lab' : statoDisp,
        conosciuto_il: sbaglio ? adessoLocale() : conosciuto,
      }
      // 🔑 Sul percorso corto `potenziale_di_danno` NON si manda: lo mette il
      //    database col suo default prudente. Mandare «nessuno» sarebbe
      //    affermare che non c'era pericolo — una risposta che nessuno ha dato.
      if (!sbaglio) corpo.potenziale_di_danno = danno
      if (motivo === 'altro') {
        corpo.motivo_libero = motivoLibero.trim()
        // Per «altro» la natura si CHIEDE (spec §5). Finché la schermata non la
        // chiede, si resta sul genere più prudente: nessuna esenzione.
        corpo.natura = 'difetto_fisico'
      }

      const res = await fetch(`/api/lavori/${lavoroId}/eventi-qualita`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      if (!res.ok) {
        let messaggio = 'Non sono riuscita a registrare: riprova fra un momento.'
        try {
          const b = (await res.json()) as { error?: unknown }
          if (typeof b.error === 'string' && b.error.length > 0) messaggio = b.error
        } catch { /* corpo illeggibile: resta il messaggio di casa */ }
        errore(messaggio)
        return
      }
      const dati = (await res.json()) as RispostaEvento
      setRisposta(dati)
      setEsitoScelto(dati.proposta.esito)
      // Il fatto è salvato. Sul percorso corto non c'è una proposta da
      // discutere: si mostra subito che cos'è successo.
      setFase(sbaglio ? 'esito' : 'proposta')
      router.refresh()
    } catch {
      errore('Non sono riuscita a registrare: controlla la connessione e riprova.')
    } finally {
      setLavorando(false)
    }
  }

  async function confermaValutazione() {
    if (!risposta || !esitoScelto) return
    setLavorando(true)
    try {
      // 🔑 La giustificazione è il PERCHÉ della proposta, quando la si accetta:
      //    il vincolo di banca dati la pretende per «nessuna azione», e la
      //    frase giusta è quella che l'app ha mostrato e la persona ha
      //    confermato — non un testo inventato al momento del salvataggio.
      const giustificazione = esitoScelto === risposta.proposta.esito
        ? risposta.proposta.perche
        : `Valutazione corretta a mano. L'app proponeva: ${ESITO_UI[risposta.proposta.esito]}.`
      const res = await fetch(`/api/eventi-qualita/${risposta.evento.id}/valutazioni`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ esito: esitoScelto, giustificazione }),
      })
      if (!res.ok) {
        errore('La registrazione è salva, ma la valutazione non è stata depositata: riprova.')
        return
      }
      setConfermata(true)
      setFase('esito')
      router.refresh()
    } catch {
      errore('La registrazione è salva, ma la valutazione non è stata depositata: riprova.')
    } finally {
      setLavorando(false)
    }
  }

  const etichettaMotivo = motivo ? MOTIVI_UI[motivo].etichetta : ''
  const puoContinuare = motivo !== 'altro' || motivoLibero.trim().length > 0

  return (
    <>
      {/* ① LA RIGA — dove oggi muore il conto alla rovescia. Dice DOVE si va,
          non cosa è vietato. */}
      <button
        type="button"
        onClick={() => setFase('domanda')}
        style={{
          display: 'flex', alignItems: 'center', gap: spazio.sm, width: '100%',
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: raggio.riga, padding: `${spazio.m}px`, textAlign: 'left',
          minHeight: 52, font: 'inherit', cursor: 'pointer',
        }}
      >
        <span aria-hidden style={{ fontSize: tipografia.size.heading, lineHeight: 1 }}>🛠</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: tipografia.size.body, fontWeight: tipografia.weight.bold, color: 'var(--ink)' }}>
            Devo intervenire
          </span>
          <span style={{ display: 'block', fontSize: tipografia.size.label, color: 'var(--muted)', marginTop: 2 }}>
            Il lavoro è consegnato: da qui si registra cos&apos;è successo
          </span>
        </span>
        <span aria-hidden style={{ color: 'var(--faint)', fontSize: tipografia.size.body }}>›</span>
      </button>

      {/* ② LA DOMANDA D'INGRESSO (D288) — e l'uscita non salva niente. */}
      <DialogConferma
        aperto={fase === 'domanda'}
        occhiello="Un momento"
        titolo="Vuoi intervenire su questo lavoro?"
        testo={descrizione}
        centraTesto
        primarioSopra
        etichettaDistruttiva="Sì, devo intervenire"
        etichettaSicura="No, ho premuto per sbaglio"
        onConferma={() => setFase('motivo')}
        onAnnulla={ricomincia}
      />

      {/* ③ I NOVE MOTIVI, IN CINQUE FAMIGLIE (D300) */}
      <Sheet aperto={fase === 'motivo'} onChiudi={ricomincia} titolo="Che cos'è successo?">
        <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0 }}>
          Scegli il motivo: da quello l&apos;app capisce cosa fare.
        </p>
        {FAMIGLIE.map((f) => (
          <div key={f.chiave}>
            <p style={{
              fontSize: tipografia.size.caption, letterSpacing: tipografia.tracking.caption,
              textTransform: 'uppercase', color: 'var(--faint)',
              fontWeight: tipografia.weight.extrabold, margin: `0 0 ${spazio.s}px`,
            }}>{f.etichetta}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.s }}>
              {motiviDellaFamiglia(f.chiave).map((m) => {
                const v = MOTIVI_UI[m]
                return (
                  <button
                    key={m} type="button" onClick={() => scegliMotivo(m)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 13, width: '100%',
                      background: 'var(--bg-deep)', border: '1px solid transparent',
                      borderRadius: raggio.riga, padding: `${spazio.sm}px ${spazio.m}px`,
                      textAlign: 'left', minHeight: 56, font: 'inherit', cursor: 'pointer',
                    }}
                  >
                    <span aria-hidden style={{
                      width: 34, height: 34, flex: 'none', borderRadius: 11,
                      display: 'grid', placeItems: 'center', fontSize: 16,
                      background: TINTE[v.tinta].bg, color: TINTE[v.tinta].ink,
                    }}>{v.glifo}</span>
                    <span>
                      <span style={{ display: 'block', fontSize: tipografia.size.body, fontWeight: tipografia.weight.bold, color: 'var(--ink)', lineHeight: 1.25 }}>{v.etichetta}</span>
                      <span style={{ display: 'block', fontSize: 13.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.35 }}>{v.sottotitolo}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </Sheet>

      {/* ③-bis IL PERCORSO CORTO — nessuna delle quattro caselle si chiede. */}
      <DialogConferma
        aperto={fase === 'confermaSbaglio'}
        occhiello="Confermi?"
        titolo="Il lavoro torna fra i pronti"
        testo={effettoDaMotivo('errore_registrazione').perche}
        centraTesto
        primarioSopra
        etichettaDistruttiva={lavorando ? 'Un attimo…' : 'Sì, riportalo indietro'}
        etichettaSicura="Annulla"
        onConferma={() => { if (!lavorando) void registra() }}
        onAnnulla={() => setFase('motivo')}
      />

      {/* ④ LE QUATTRO CASELLE (spec §5) */}
      <Sheet aperto={fase === 'dettagli'} onChiudi={ricomincia} titolo="Qualche dettaglio">
        <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0 }}>
          {etichettaMotivo}. Serve alla legge, non a noi.
        </p>

        {motivo === 'altro' && (
          <label style={{ display: 'block' }}>
            <span style={{ display: 'block', fontSize: tipografia.size.label, fontWeight: tipografia.weight.bold, color: 'var(--muted)', marginBottom: spazio.s }}>
              Di che cosa si tratta?
            </span>
            <input
              value={motivoLibero}
              onChange={(e) => setMotivoLibero(e.target.value)}
              maxLength={1000}
              style={{
                width: '100%', border: '1px solid var(--line)', background: 'var(--card)',
                borderRadius: 14, padding: `13px ${spazio.m}px`, font: 'inherit',
                fontSize: 16, color: 'var(--ink)', minHeight: 48,
              }}
            />
          </label>
        )}

        <GruppoChip
          domanda={DOMANDE.origine}
          voci={ORIGINI_INFORMAZIONE}
          etichette={ORIGINE_UI}
          scelta={origine}
          onScegli={setOrigine}
        />

        <label style={{ display: 'block' }}>
          <span style={{ display: 'block', fontSize: tipografia.size.label, fontWeight: tipografia.weight.bold, color: 'var(--muted)', marginBottom: spazio.s }}>
            {DOMANDE.conosciuto}
          </span>
          <input
            type="datetime-local" value={conosciuto}
            onChange={(e) => setConosciuto(e.target.value)}
            style={{
              width: '100%', border: '1px solid var(--line)', background: 'var(--card)',
              borderRadius: 14, padding: `13px ${spazio.m}px`, font: 'inherit',
              fontSize: 16, color: 'var(--ink)', minHeight: 48,
            }}
          />
        </label>

        <GruppoChip
          domanda={DOMANDE.stato}
          voci={STATI_DISPOSITIVO}
          etichette={STATO_UI}
          scelta={statoDisp}
          onScegli={setStatoDisp}
        />

        <GruppoChip
          domanda={DOMANDE.danno}
          voci={POTENZIALI_DI_DANNO}
          etichette={DANNO_UI}
          scelta={danno}
          onScegli={setDanno}
        />

        <TastoPrimario
          onClick={() => { if (!lavorando) void registra() }}
          disabled={lavorando || !puoContinuare}
          motivoDisabilitato={lavorando ? 'Sto registrando…' : 'Scrivi in due parole di cosa si tratta'}
        >
          {lavorando ? 'Un attimo…' : 'Continua'}
        </TastoPrimario>
      </Sheet>

      {/* ⑤ LA PROPOSTA, COL SUO PERCHÉ — e si può cambiare (D267) */}
      <Sheet aperto={fase === 'proposta'} onChiudi={ricomincia} titolo="Ecco cosa ne penso">
        {risposta && (
          <>
            <p style={{ fontSize: tipografia.size.callout, color: 'var(--muted)', margin: 0 }}>
              Se non ti torna, cambiala: decidi tu.
            </p>
            <div style={{
              borderRadius: raggio.tile, padding: spazio.m,
              background: risposta.proposta.ramoIso ? 'var(--red-tint)' : 'var(--green-tint)',
            }}>
              <p style={{
                fontSize: tipografia.size.caption, letterSpacing: tipografia.tracking.caption,
                textTransform: 'uppercase', fontWeight: tipografia.weight.extrabold,
                color: risposta.proposta.ramoIso ? 'var(--red)' : 'var(--green)', margin: `0 0 6px`,
              }}>Per la legge è</p>
              <p style={{ fontSize: 19, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)', margin: 0 }}>
                {ESITO_UI[esitoScelto ?? risposta.proposta.esito]}
              </p>
              <p style={{ fontSize: 14.5, color: 'var(--muted)', margin: `${spazio.s}px 0 0`, lineHeight: 1.45 }}>
                {risposta.proposta.perche}
              </p>
              {!cambiando && (
                <div style={{ marginTop: spazio.sm }}>
                  <TastoSecondario onClick={() => setCambiando(true)}>Non è così — cambia</TastoSecondario>
                </div>
              )}
              {cambiando && (
                <div style={{ marginTop: spazio.sm, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {(Object.keys(ESITO_UI) as Esito[]).map((e) => (
                    <ChipScelta key={e} selezionata={esitoScelto === e} onClick={() => setEsitoScelto(e)}>
                      {ESITO_UI[e]}
                    </ChipScelta>
                  ))}
                </div>
              )}
            </div>

            {/* 🔑 L'ALTRO PIANO, e i due non si mescolano (D288): sopra che cosa
                dice la NORMA, qui che cosa succede al LAVORO. */}
            <div style={{ borderRadius: 16, padding: `13px ${spazio.m}px`, background: 'var(--bg-deep)' }}>
              <b style={{ display: 'block', fontSize: 15, color: 'var(--ink)', marginBottom: 3 }}>E sul lavoro</b>
              <span style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.45 }}>
                {risposta.effetto.perche}
              </span>
            </div>

            <TastoPrimario
              onClick={() => { if (!lavorando) void confermaValutazione() }}
              disabled={lavorando}
              motivoDisabilitato="Sto salvando…"
            >
              {lavorando ? 'Un attimo…' : 'Registra'}
            </TastoPrimario>
          </>
        )}
      </Sheet>

      {/* ⑥ GLI ESITI — anche quelli che non sono un successo (R10) */}
      <Sheet aperto={fase === 'esito'} onChiudi={ricomincia} titolo="Fatto">
        {risposta && (
          <>
            <Esito tono="ok" titolo={confermata ? 'Registrato e valutato' : 'Registrato'}>
              {confermata
                ? 'La registrazione e la valutazione sono agli atti.'
                : 'La registrazione è agli atti.'}
            </Esito>
            {risposta.riapertura?.stato === 'applicato' && (
              <Esito tono="ok" titolo="Il lavoro è tornato fra i pronti">
                {risposta.riapertura.dichiarazione_assente
                  ? 'Non c\'era nessuna dichiarazione da annullare.'
                  : 'La dichiarazione è stata annullata.'}
              </Esito>
            )}
            {/* 🛑 «Non applicabile» NON è un guasto: il lavoro non era da
                riportare indietro. Trattarlo come errore insegnerebbe a
                ignorare gli avvisi. */}
            {risposta.riapertura?.stato === 'non_applicabile' && (
              <Esito tono="attesa" titolo="Il lavoro non era da riportare indietro">
                Era già fra i pronti, o non è più consegnato. La registrazione è salva.
              </Esito>
            )}
            {/* 🛑 IL GUASTO VERO, e questa riga è la ragione per cui la rotta
                distingue tre esiti invece di un sì/no: senza, «registrato»
                sembrerebbe «fatto tutto». */}
            {risposta.riapertura?.stato === 'fallito' && (
              <Esito tono="guasto" titolo="Ma il lavoro non è tornato indietro">
                {risposta.riapertura.messaggio ?? 'Riportalo tu fra quelli pronti, oppure riprova fra un momento.'}
              </Esito>
            )}
            <TastoPrimario onClick={ricomincia}>Chiudi</TastoPrimario>
          </>
        )}
      </Sheet>
    </>
  )
}

/** Un gruppo di pastiglie: una domanda, e le sue risposte tutte dello stesso
 *  peso. 🛑 Nessuna è «la più rapida» — v. il riquadro su `danno`. */
function GruppoChip<T extends string>(props: {
  domanda: string
  voci: readonly T[]
  etichette: Record<T, string>
  scelta: T
  onScegli: (v: T) => void
}) {
  const { domanda, voci, etichette, scelta, onScegli } = props
  return (
    <div>
      <p style={{
        fontSize: tipografia.size.label, fontWeight: tipografia.weight.bold,
        color: 'var(--muted)', margin: `0 0 ${spazio.s}px`,
      }}>{domanda}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {voci.map((v) => (
          <ChipScelta key={v} selezionata={scelta === v} onClick={() => onScegli(v)}>
            {etichette[v]}
          </ChipScelta>
        ))}
      </div>
    </div>
  )
}

const TONI = {
  ok: { bg: 'var(--green-tint)', ink: 'var(--green)' },
  attesa: { bg: 'var(--amber-tint)', ink: 'var(--amber)' },
  guasto: { bg: 'var(--red-tint)', ink: 'var(--red)' },
} as const

function Esito(props: { tono: keyof typeof TONI; titolo: string; children: React.ReactNode }) {
  const { tono, titolo, children } = props
  return (
    <div style={{ borderRadius: raggio.riga, padding: `15px ${spazio.m}px`, background: TONI[tono].bg }}>
      <b style={{ display: 'block', fontSize: 16, marginBottom: 4, color: TONI[tono].ink }}>{titolo}</b>
      <span style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.45 }}>{children}</span>
    </div>
  )
}
