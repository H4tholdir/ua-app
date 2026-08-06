'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  LavoroDettaglio,
  LavoroLavorazione,
  LavoroFase,
  LavoroImmagine,
} from '@/types/domain'
import { useLavoroForm } from '@/hooks/useLavoroForm'
import { idrataColoreScheda } from '@/lib/domain/colore-dente'
import { LavoroFormShell, type TabId } from './form/LavoroFormShell'
import { TabDati } from './form/TabDati'
import { TabLavorazioni } from './form/TabLavorazioni'
import { TabClinica } from './form/TabClinica'
import { TabProduzione } from './form/TabProduzione'
import { TabDate } from './form/TabDate'
import { TabImmagini } from './form/TabImmagini'
import { TabDocumenti } from './form/TabDocumenti'
import { TabAccettazione } from './form/TabAccettazione'
import { TabProve } from './TabProve'
import { PacchettoConsegnaSheet } from './PacchettoConsegnaSheet'
import { SegnalaProblemaSheet } from './SegnalaProblemaSheet'
import { AvvisiProvider } from '@/components/ds/Avviso'

interface LavoroFormClientProps {
  lavoro: LavoroDettaglio
  ruolo?: string | null
  defaultTab?: TabId
  bridged?: boolean
}

/**
 * `AvvisiProvider` **NON** è montato nel layout `(app)` — solo catalogo e wizard
 * lo montano — e questo form è renderizzato da solo anche nelle prove. Quindi si
 * auto-avvolge, **stesso pattern di `SchedaLavoroV3`** (che lo documenta in
 * testa al suo file): il Corpo consuma `useAvvisi()` per gli errori (L6).
 * Serve a `TabImmagini`, dove un caricamento rifiutato deve dire **cosa** è
 * successo e **cosa fare** — prima quella frase esisteva ma non si leggeva.
 */
export function LavoroFormClient(props: LavoroFormClientProps) {
  return (
    <AvvisiProvider>
      <LavoroFormClientCorpo {...props} />
    </AvvisiProvider>
  )
}

function LavoroFormClientCorpo({
  lavoro,
  ruolo,
  defaultTab,
  bridged,
}: LavoroFormClientProps) {
  const router = useRouter()

  // ═══ IL COLORE VIENE DALLE RIGHE, NON DALLE COLONNE ═══════════════════════
  // Dal Task 10 `lavori.colore_dente`/`colore_collo`/`colore_corpo`/
  // `colore_incisale` non hanno più alcuno scrittore: le due RPC atomiche
  // denormalizzano soltanto i tre `denti_*`. Idratare il form da quelle colonne
  // significherebbe mostrare l'ultimo valore ricevuto prima di quel deploy —
  // l'utente correggerebbe il colore, lo salverebbe davvero in `lavori_denti`,
  // e alla ricarica lo vedrebbe tornare indietro.
  // La precedenza riga → caso è quella del Task 2 (`risolviColore`), una sola
  // per wizard, scheda e Dichiarazione: due letture divergenti dello stesso
  // fatto clinico sono la classe di difetto già pagata con `numero_cassetta`.
  // ⚠️ Il resto del form NON cambia, e la grafica nemmeno: `TabClinica` legge
  // ancora le stesse quattro chiavi.
  const lavoroIdratato = {
    ...lavoro,
    ...idrataColoreScheda(lavoro.denti, {
      colore_scala: lavoro.colore_scala,
      colore_codice: lavoro.colore_codice,
    }),
  }

  // Stato form campi Lavoro (colonne tabella)
  const { data, update, save, saving, saved, saveError, avvisi, isDirty } = useLavoroForm(lavoroIdratato)

  // Stato relazioni join — separate dal hook (non sono colonne di lavori)
  const [lavorazioni, setLavorazioni] = useState<LavoroLavorazione[]>(
    lavoro.lavorazioni ?? []
  )
  const [fasi, setFasi] = useState<LavoroFase[]>(lavoro.fasi ?? [])
  // Contatore richieste in-flight per fase (stesso pattern di CicloComboBox/
  // ClienteComboBox) — un doppio tap rapido sulla stessa fase genera 2 PATCH;
  // se la prima risponde in ritardo (es. errore di rete) il suo rollback non
  // deve sovrascrivere l'update già confermato dalla seconda, più recente.
  const updateFaseRequestIdRef = useRef<Record<string, number>>({})
  const [immagini, setImmagini] = useState<LavoroImmagine[]>(lavoro.immagini ?? [])

  // Stato bottom sheet Pacchetto Consegna MDR
  const [pacchettoOpen, setPacchettoOpen] = useState(false)

  // Stato bottom sheet Segnala Problema
  const [segnalaOpen, setSegnalaOpen] = useState(false)

  // Stato segnalazione locale (per aggiornamento ottimistico risolta)
  const [segnalazioneRisolta, setSegnalazioneRisolta] = useState(
    lavoro.segnalazione_risolta
  )
  const [risolvendo, setRisolvendo] = useState(false)

  async function handleSegnaRisolta() {
    setRisolvendo(true)
    try {
      const res = await fetch(`/api/lavori/${lavoro.id}/segnala/risolvi`, {
        method: 'PATCH',
      })
      if (res.ok) {
        setSegnalazioneRisolta(true)
        router.refresh()
      }
    } finally {
      setRisolvendo(false)
    }
  }

  async function handleUpdateFase(id: string, updates: Partial<LavoroFase>) {
    const previous = fasi.find((f) => f.id === id)
    const thisRequest = (updateFaseRequestIdRef.current[id] ?? 0) + 1
    updateFaseRequestIdRef.current[id] = thisRequest

    setFasi((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)))

    try {
      const res = await fetch(`/api/lavori/${lavoro.id}/fasi/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (updateFaseRequestIdRef.current[id] !== thisRequest) return
      if (!res.ok && previous) {
        setFasi((prev) => prev.map((f) => (f.id === id ? previous : f)))
      }
    } catch {
      if (updateFaseRequestIdRef.current[id] !== thisRequest) return
      if (previous) {
        setFasi((prev) => prev.map((f) => (f.id === id ? previous : f)))
      }
    }
  }

  function handleAddImmagine(img: LavoroImmagine) {
    setImmagini((prev) => [...prev, img])
  }

  return (
    <div>
      <LavoroFormShell defaultTab={defaultTab}>
        {(activeTab) => {
          switch (activeTab) {
            case 'dati':
              return (
                <TabDati
                  data={data}
                  onChange={update}
                  cicloId={data.ciclo_id ?? lavoro.ciclo_id ?? ''}
                  onCicloChange={(id) => update({ ciclo_id: id || null })}
                />
              )

            case 'accettazione':
              return (
                <TabAccettazione
                  data={data}
                  onChange={update}
                  clienteCellulare={lavoro.cliente?.cellulare_whatsapp ?? null}
                  clienteId={lavoro.cliente?.id ?? ''}
                  clienteNome={
                    lavoro.cliente
                      ? (lavoro.cliente.studio_nome ??
                          `${lavoro.cliente.nome} ${lavoro.cliente.cognome}`.trim())
                      : ''
                  }
                  numeroLavoro={lavoro.numero_lavoro}
                  labNome={lavoro.laboratorio?.nome ?? null}
                  labTelefono={lavoro.laboratorio?.telefono ?? null}
                />
              )

            case 'lavorazioni':
              return (
                <TabLavorazioni
                  lavorazioni={lavorazioni}
                  lavoro_id={lavoro.id}
                  onChange={setLavorazioni}
                />
              )

            case 'clinica':
              return <TabClinica data={data} onChange={update} tinte={lavoro.tinteDisponibili} />

            case 'produzione':
              return (
                <TabProduzione
                  fasi={fasi}
                  onUpdateFase={handleUpdateFase}
                  hasCiclo={!!(data.ciclo_id ?? lavoro.ciclo_id)}
                />
              )

            case 'prove':
              return (
                <TabProve
                  lavoroId={lavoro.id}
                  statoLavoro={data.stato ?? lavoro.stato}
                  onProvaInviata={() => router.refresh()}
                  onRientroRegistrato={() => router.refresh()}
                />
              )

            case 'date':
              return (
                <TabDate
                  data={data}
                  onChange={update}
                  appuntamenti={lavoro.appuntamenti ?? []}
                />
              )

            case 'immagini':
              return (
                <TabImmagini
                  immagini={immagini}
                  lavoro_id={lavoro.id}
                  onAdd={handleAddImmagine}
                />
              )

            case 'documenti':
              return (
                <TabDocumenti
                  ddc={lavoro.ddc ?? null}
                  lavoro_id={lavoro.id}
                />
              )

            default:
              return null
          }
        }}
      </LavoroFormShell>

      {/* Banner segnalazione non risolta — visibile al titolare/admin_rete */}
      {lavoro.segnalazione_tipo && !segnalazioneRisolta &&
        (ruolo === 'titolare' || ruolo === 'admin_rete') && (
          <div style={{
            margin: '0 20px 12px',
            padding: '12px 14px',
            borderRadius: '14px',
            background: 'rgba(217,0,18,.06)',
            border: '1px solid rgba(217,0,18,.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>⚠</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-v3, sans-serif)',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--primary, #D90012)',
                margin: 0,
              }}>
                Problema segnalato
              </p>
              {lavoro.segnalazione_nota && (
                <p style={{
                  fontFamily: 'var(--font-v3, sans-serif)',
                  fontSize: 12,
                  color: 'var(--t2, #4A3D33)',
                  margin: '2px 0 0',
                  fontStyle: 'italic',
                }}>
                  &ldquo;{lavoro.segnalazione_nota}&rdquo;
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={risolvendo}
              onClick={handleSegnaRisolta}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary, #D90012)',
                color: '#fff',
                fontFamily: 'var(--font-v3, sans-serif)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: risolvendo ? 'not-allowed' : 'pointer',
                minHeight: '32px',
              }}
              aria-busy={risolvendo}
            >
              {risolvendo ? '...' : 'Segna risolta'}
            </button>
          </div>
        )}

      {/* Pulsante segnala problema — solo tecnico */}
      {ruolo === 'tecnico' && (
        <div style={{ padding: '0 20px 4px' }}>
          <button
            type="button"
            onClick={() => setSegnalaOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '13px 16px',
              margin: '0 0 10px',
              border: '1px solid rgba(217,0,18,.18)',
              borderRadius: '14px',
              background: 'rgba(217,0,18,.07)',
              color: 'var(--primary, #D90012)',
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label="Segnala un problema al titolare"
          >
            <span aria-hidden="true">⚠</span>
            Segnala problema al titolare
          </button>
        </div>
      )}

      {/* ═══ BARRA AZIONI FISSA IN FONDO — una COLONNA dal 06/08/2026 ═════════
          Era una riga con i due riquadri (errore e avvisi) appesi sopra in
          `position: absolute`, a quote calcolate a mano (72px, e 132px quando
          c'erano tutti e due). 🔴 Il collaudo a schermo del 06/08 ha mostrato
          che cosa fa un riquadro fuori dal flusso: si stampa SOPRA il modulo.
          Misurato a 390×844 — il riquadro 620→700, l'etichetta «Priorità»
          633→651: coperta per intero. Referto:
          `docs/design/screenshots/2026-08-06-tinte/README.md` §2.
          ✅ Ora i riquadri stanno DENTRO la barra, nel flusso: la barra cresce
          verso l'alto e nessuno copre nessuno. Le quote a mano spariscono — e
          con loro il difetto che tornava ogni volta che si aggiungeva un terzo
          riquadro. */}
      <div
        style={{
          position: 'sticky',
          bottom: '72px', // sopra BottomNavPill
          left: 0,
          right: 0,
          padding: '12px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'linear-gradient(to top, var(--bg, #F4F0E7) 60%, transparent)',
          zIndex: 10,
        }}
      >
        {/* D42 T8 (D251 · D248) — QUELLO CHE IL SERVER HA FATTO, detto a parole.
            Tre casi, tutti additivi e tutti su un salvataggio RIUSCITO: la tinta
            tolta dal cambio di tipo (D117), la tinta o il colore chiesti e non
            registrabili.
            🛑 Riquadro DISTINTO da quello rosso dell'errore, e non è cosmesi: il
            salvataggio è andato a buon fine, e vestirlo da errore manderebbe
            l'utente a ripetere un gesto già riuscito. Tono ambra = «guarda, è
            successo qualcosa», non «hai sbagliato».
            🔑 `role="status"` e non `role="alert"`: non interrompe, si legge.
            🔴 IL FONDO È PIENO, e non è un dettaglio estetico: era un velo ambra
            al 10%, quindi il testo sottostante TRASPARIVA e le due scritte si
            mescolavano — a schermo si leggeva «Ho tolto la tinta» con dentro le
            lettere di «PRIORITÀ». Il velo resta identico (il tono non cambia),
            ma ora poggia sul fondo pagina invece che sul vuoto. */}
        {avvisi.length > 0 && (
          <div
            role="status"
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background:
                'linear-gradient(rgba(212,168,67,0.10), rgba(212,168,67,0.10)), var(--bg, #F4F0E7)',
              border: '1px solid rgba(212,168,67,0.35)',
              color: 'var(--ink, #1A1A1A)',
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {avvisi.map((a) => (
              <p key={a} style={{ margin: 0 }}>{a}</p>
            ))}
          </div>
        )}

        {/* ═══ IL MOTIVO SI VEDE SEMPRE, NON SOLO A FORM PULITO ══════════════
            Qui c'era `saveError && !isDirty`, e quella condizione non era
            «difficile»: era IRRAGGIUNGIBILE. `setIsDirty(false)` avviene SOLO
            dopo un salvataggio riuscito (`useLavoroForm.ts:365-366`), e
            `save()` azzera `saveError` in apertura (riga 250) — quindi «c'è un
            errore E il form è pulito» non capita mai. In più il tasto qui sotto
            si mostra `isDirty`: le due condizioni si escludono per costruzione.
            Risultato trovato al collaudo del 28/07: chi salva vede solo
            «⚠ Errore — riprova» e non sa MAI che gli basta toccare un dente. Le
            tre frasi dell'ondata passano tutte di qui
            (`useLavoroForm.ts:141,162,279`).
            🔑 E resta visibile MENTRE si corregge, di proposito: un messaggio
            che dice «seleziona almeno un dente» e si dissolve al primo tocco
            toglie l'istruzione nell'istante in cui serve. Se ne va col
            salvataggio successivo, che riparte da `setSaveError(null)`.
            🔴 Fondo pieno e posizione nel flusso per la stessa ragione del
            riquadro qui sopra: la forma era identica, e il censimento del 06/08
            l'ha VERIFICATO invece di supporlo (è la lezione di D260). */}
        {saveError && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: '10px 14px',
              borderRadius: '10px',
              background:
                'linear-gradient(rgba(217,0,18,0.08), rgba(217,0,18,0.08)), var(--bg, #F4F0E7)',
              border: '1px solid rgba(217,0,18,0.25)',
              color: 'var(--primary, #D90012)',
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {saveError}
          </p>
        )}

        {/* 🛑 I TASTI RESTANO AFFIANCATI: impilare i riquadri non deve impilare
            anche loro, o a 390px si mangerebbero il modulo. È la guardia ⑤ di
            `tests/unit/lavoro-form-avviso-non-copre.test.tsx`. */}
        <div style={{ display: 'flex', gap: '10px' }}>
        {/* Pulsante Salva — visibile solo se dirty */}
        {isDirty && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save(lavoro.id)}
            style={{
              flex: 1,
              height: '52px',
              borderRadius: '14px',
              border: 'none',
              background: saving ? 'var(--elv, #EDEDEA)' : 'var(--surface, #E4DFD9)',
              color: saving ? 'var(--t2, #4A3D33)' : 'var(--t1, #1C1916)',
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '15px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow:
                'var(--sh-b, var(--sh-b))',
              transition: 'background var(--tr)',
            }}
            aria-busy={saving}
            aria-label={saving ? 'Salvataggio in corso...' : 'Salva modifiche'}
          >
            {saving ? 'Salvataggio...' : saved ? '✓ Salvato' : saveError ? '⚠ Errore — riprova' : 'Salva'}
          </button>
        )}


        {/* Pulsante Documenti MDR */}
        <button
          type="button"
          onClick={() => setPacchettoOpen(true)}
          aria-label="Apri pacchetto documenti MDR"
          style={{
            flex: '0 0 auto',
            height: '52px',
            padding: '0 16px',
            borderRadius: '14px',
            border: '1.5px solid rgba(0,0,0,.10)',
            background: 'var(--elv, #EDEDEA)',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'var(--font-v3, sans-serif)',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Pacchetto Documenti MDR"
        >
          📦
        </button>

        {/* Pulsante CONSEGNA — salva prima se dirty */}
        {!bridged && (
          <button
            type="button"
            onClick={async () => {
              if (isDirty) {
                // save() rilancia l'errore di rete/API dopo aver impostato
                // saveError (vedi useLavoroForm.ts). Se l'autosave fallisce
                // NON dobbiamo navigare: il precheck MDR in /consegna legge
                // i dati direttamente dal DB server-side (CLAUDE.md), quindi
                // procedere con modifiche non salvate significherebbe
                // eseguire il precheck su dati stale. isDirty resta true in
                // questo caso, quindi il pulsante Salva mostra già
                // "⚠ Errore — riprova" — l'utente resta sulla pagina con
                // feedback visibile invece di un blocco silenzioso.
                try {
                  await save(lavoro.id)
                } catch {
                  return
                }
              }
              router.push(`/lavori/${lavoro.id}?consegna=1`)
            }}
            style={{
              flex: isDirty ? '0 0 auto' : 1,
              height: '52px',
              padding: '0 24px',
              borderRadius: '14px',
              border: 'none',
              background: 'var(--gold, #D4A843)',
              color: 'var(--t1, #1C1916)',
              fontFamily: 'var(--font-v3, sans-serif)',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              letterSpacing: '0.04em',
              boxShadow: '0 0 20px hsl(43 65% 55% / 0.4)',
              whiteSpace: 'nowrap',
            }}
            aria-label="Vai alla consegna del lavoro"
          >
            CONSEGNA
            <span aria-hidden="true" style={{ marginLeft: '6px' }}>
              →
            </span>
          </button>
        )}
        </div>
      </div>

      {/* Bottom sheet Pacchetto Consegna MDR */}
      <PacchettoConsegnaSheet
        lavoro={{
          id: lavoro.id,
          numero_lavoro: lavoro.numero_lavoro,
          cliente_display: lavoro.cliente
            ? `${lavoro.cliente.studio_nome ?? ''} ${lavoro.cliente.cognome} ${lavoro.cliente.nome}`.trim()
            : lavoro.numero_lavoro,
        }}
        isOpen={pacchettoOpen}
        onClose={() => setPacchettoOpen(false)}
      />

      {/* Bottom sheet Segnala Problema (solo tecnico) */}
      {ruolo === 'tecnico' && (
        <SegnalaProblemaSheet
          lavoroId={lavoro.id}
          numeroLavoro={lavoro.numero_lavoro}
          clienteDisplay={
            lavoro.cliente
              ? (lavoro.cliente.studio_nome ??
                  `${lavoro.cliente.nome} ${lavoro.cliente.cognome}`.trim())
              : lavoro.numero_lavoro
          }
          isOpen={segnalaOpen}
          onClose={() => setSegnalaOpen(false)}
          onSegnalato={() => router.refresh()}
        />
      )}
    </div>
  )
}
