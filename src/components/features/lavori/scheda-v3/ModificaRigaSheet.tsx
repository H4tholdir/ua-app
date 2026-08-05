'use client'

// Ondata 3a Task 3 — ModificaRigaSheet: lo `Sheet` di modifica per-riga della
// scheda-vista v3 (§3, `CardInfo` con righe editabili). Discriminato su
// `campo`: rende il controllo giusto e, al salvataggio, invia SEMPRE un PATCH
// `/api/lavori/{lavoroId}` con SOLO le chiavi pertinenti a quel campo — tutte
// e 4 (`note_interne`, `data_consegna_prevista`+`ora_consegna`, `tecnico_id`,
// `cliente_id`) sono nella allowlist di `PATCHABLE_FIELDS` (vedi
// `src/app/api/lavori/[id]/route.ts`). Aggiornamento ottimistico: `onSalvato(patch)`
// passa il patch grezzo al padre (Task 6, `SchedaLavoroV3`), che decide come
// applicarlo (stato locale per i campi scalari, `router.refresh()` per le FK
// — vedi piano §Task 6). Nessuna gestione di errore silenziosa: `onErrore`
// riceve sempre un messaggio in italiano, mai propagato lo `status`/l'oggetto
// errore grezzo (L6, coerente con `CardFasiV3`).

import { useEffect, useState, type ChangeEvent } from 'react'
import { Sheet } from '@/components/ds/Sheet'
import { CampoTesto, CampoData } from '@/components/ds/Campo'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TileScelta } from '@/components/ds/TileScelta'
import { ClienteComboBox } from '@/components/features/clienti/ClienteComboBox'
import { ModificaColoreSheet, type DatiColore } from './ModificaColoreSheet'
import { TavolozzaTinte, type CoppiaTinta } from '@/components/features/lavori/TavolozzaTinte'
import type { TintaManufatto } from '@/lib/domain/tinta'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'

// T7 (ondata B ③): `colore` è il quinto campo, e non passa dalla PATCH come
// gli altri quattro — porta con sé il gesto D212 (typo vs divergenza) e due
// rotte in più. Per questo il suo ramo vive in `ModificaColoreSheet.tsx` e
// questo componente gli cede il posto: un `Sheet` solo, mai due in catena
// (v. il cappello di quel file per il perché non si incatenano).
/**
 * I campi che si correggono dal foglietto, SENZA uscire dalla scheda.
 *
 * 🔑 QUI, E SOLO QUI (05/08/2026). Fino a oggi questo elenco era ricopiato
 * anche in `SchedaLavoroV3.tsx`, con un commento che la duplicazione la
 * dichiarava («i due si muovono insieme, o il foglio non sa che cosa rendere»)
 * senza chiuderla. È esportato perché **chi rende i campi è il proprietario
 * naturale dell'elenco**: `TITOLI` qui sotto è un `Record<Campo, string>`, e
 * un campo senza titolo non è un campo. Il chiamante lo importa.
 *
 * ⚠️ COSA PROTEGGEVA DAVVERO LA COPIA, misurato prima di toglierla: aggiungere
 * un campo al SOLO file che chiama dava `TS2719` («*two different types with
 * this name exist, but they are unrelated*»); aggiungerlo al SOLO file che
 * rende NON rompeva il collegamento — 5 valori restano un sottoinsieme di 6 —
 * e la protesta arrivava per rimbalzo da `TITOLI`. Cioè: **la rete era un
 * effetto collaterale di come è fatta un'altra cosa.** Bastava un
 * `Partial<Record<…>>` e un ramo irraggiungibile sarebbe passato in silenzio.
 *
 * ➡️ Chi aggiunge un campo tocca **questa riga sola**, e `TITOLI` lo obbliga a
 * dargli un titolo. Precedente ricalcato: `type DatiColore`, esportato da
 * `./ModificaColoreSheet` e importato qui sopra.
 */
export type Campo = 'consegna' | 'tecnico' | 'dentista' | 'note' | 'colore' | 'tinta'

const TITOLI: Record<Campo, string> = {
  consegna: 'Data di consegna',
  tecnico: 'Tecnico assegnato',
  dentista: 'Dentista',
  note: 'Note interne',
  colore: 'Colore',
  tinta: 'Tinta',
}

const MESSAGGIO_ERRORE = 'Non è stato possibile salvare la modifica. Riprova.'

// D251 — la tinta chiesta e NON registrata. La frase dice che cosa non c'è,
// perché «errore» non basta: chi deve correggere deve sapere COSA correggere.
// 🔑 Passa da `onErrore` (e non da un avviso quieto) di proposito: il rischio da
//    coprire è che l'utente legga «salvato» su un dato che non c'è, e l'avviso
//    normale è muto per progetto (`ds/Avviso.tsx` — «l'avviso normale resta muto»).
const MESSAGGIO_TINTA_SCARTATA =
  'La tinta non è stata registrata. Riprova, oppure controlla che sia adatta a questo tipo di lavoro.'

/** Forma di `valoreIniziale`/stato interno per `campo="consegna"` — rispecchia
 * di proposito i nomi delle colonne DB (`data_consegna_prevista`,
 * `ora_consegna`), così il patch finale è lo stato stesso, senza rimappature:
 * il chiamante (Task 6) passa direttamente i valori grezzi già presenti su
 * `lavoro`, senza dover costruire `Date`. */
type ValoreConsegna = {
  data_consegna_prevista: string | null
  ora_consegna: string | null
}

function normalizzaConsegna(v: unknown): ValoreConsegna {
  const obj = (v ?? {}) as Partial<ValoreConsegna>
  return {
    data_consegna_prevista: obj.data_consegna_prevista ?? null,
    ora_consegna: obj.ora_consegna ?? null,
  }
}

/** "2026-07-20" (data locale, stesso formato di `<input type="date">`) → `Date` locale. */
function parseDataISO(v: string): Date | null {
  const [anno, mese, giorno] = v.split('-').map(Number)
  if (!anno || !mese || !giorno) return null
  return new Date(anno, mese - 1, giorno)
}

/** `Date` locale → "2026-07-20", l'inverso di `parseDataISO`. */
function formattaDataISO(d: Date): string {
  const anno = String(d.getFullYear()).padStart(4, '0')
  const mese = String(d.getMonth() + 1).padStart(2, '0')
  const giorno = String(d.getDate()).padStart(2, '0')
  return `${anno}-${mese}-${giorno}`
}

interface TecnicoOpzione {
  id: string
  nome: string
  cognome: string
}

/**
 * ModificaRigaSheet — lo `Sheet` di modifica di UNA riga della scheda-vista
 * (§3). `campo` sceglie il ramo di render; `salva(patch)` è l'unica via
 * verso il backend, condivisa da tutti e 4 i rami (niente logica PATCH
 * duplicata per campo).
 */
export function ModificaRigaSheet(props: {
  aperto: boolean
  onChiudi: () => void
  lavoroId: string
  campo: Campo
  valoreIniziale: unknown
  onSalvato: (patch: Record<string, unknown>) => void
  onErrore: (msg: string) => void
  /** Il corredo del ramo «colore» (T7): serve SOLO quando `campo === 'colore'`
   *  — quel ramo ha bisogno dello snapshot, del gettone di concorrenza e del
   *  nome del dentista, che gli altri quattro non usano. Assente altrove. */
  colore?: DatiColore
  /** Il corredo del ramo «tinta» (D42 T7, D247): le voci del catalogo — che
   *  arrivano dall'alto, lette dal server — e quella scelta ora. 🛑 Il foglietto
   *  NON interroga il catalogo: una seconda strada di lettura sarebbe una
   *  seconda verità. */
  tinta?: { disponibili: readonly TintaManufatto[]; scelta: CoppiaTinta }
}) {
  const { aperto, onChiudi, lavoroId, campo, onSalvato, onErrore } = props
  const [valore, setValore] = useState<unknown>(props.valoreIniziale)
  const [salvando, setSalvando] = useState(false)
  const [tecnici, setTecnici] = useState<TecnicoOpzione[]>([])

  // «tecnico»: la lista si carica on-open (non al mount) — lo sheet può
  // restare montato col padre mentre resta chiuso (§Task 6, un solo Sheet
  // condiviso per campo attivo).
  useEffect(() => {
    if (!aperto || campo !== 'tecnico') return
    let annullato = false
    fetch('/api/tecnici')
      .then((res) => (res.ok ? res.json() : { tecnici: [] }))
      .then((json) => {
        if (!annullato) setTecnici(json.tecnici ?? [])
      })
      .catch(() => {
        if (!annullato) setTecnici([])
      })
    return () => {
      annullato = true
    }
  }, [aperto, campo])

  /**
   * L'unica via verso il backend, condivisa da tutti i rami.
   *
   * @param patch ciò che si manda al server — SOLO chiavi in `PATCHABLE_FIELDS`,
   *   perché quelle fuori allowlist vengono scartate **senza errore**.
   * @param patchLocale ciò che si applica allo specchio della scheda. Di norma
   *   coincide col patch; il ramo «tinta» passa qualcosa di più (il nome e il
   *   pallino, che su `lavori` non esistono — li risolve il catalogo). Gli altri
   *   quattro rami non lo passano e si comportano esattamente come prima.
   */
  // ⚠️ La firma sta su tre righe per una ragione MECCANICA, non di stile: con i
  // due generic sulla stessa riga, il `>` del primo e il `<` del secondo
  // racchiudono la parola «Record», che è nell'elenco delle parole del software
  // vietate nella UI — e `check-ds-compliance.sh` ferma il commit. È un falso
  // positivo della stessa famiglia già dichiarata in quello script (i cast
  // `as X<…>`), non una copy vietata. Spezzare la riga costa nulla; ammorbidire
  // la guardia costerebbe la guardia.
  async function salva(
    patch: Record<string, unknown>,
    patchLocale?: Record<string, unknown>
  ) {
    setSalvando(true)
    try {
      const res = await fetch(`/api/lavori/${lavoroId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        onErrore(MESSAGGIO_ERRORE)
        return
      }
      // D251 — si legge ciò che il server ha FATTO, non ciò che gli è stato
      // chiesto. La lettura è DIFENSIVA e non può rompere un salvataggio
      // riuscito: `res.json()` lancia su un corpo vuoto, e un corpo illeggibile
      // non toglie nulla a una scrittura andata a buon fine.
      let risposta: Record<string, unknown> = {}
      try {
        risposta = (await res.json()) as Record<string, unknown>
      } catch {
        risposta = {}
      }
      if (risposta.tinta_scartata === true) {
        // 🛑 Nessuno specchio ottimistico e nessuna chiusura: la tinta NON è
        //    stata salvata. Applicare il patch qui mostrerebbe la tinta come
        //    registrata con l'avviso d'errore sopra — due cose che si
        //    contraddicono. La regola è quella di `handleColoreSalvato`: si
        //    applica ciò che è avvenuto, non ciò che si sperava.
        onErrore(MESSAGGIO_TINTA_SCARTATA)
        return
      }
      onSalvato(patchLocale ?? patch)
      onChiudi()
    } catch {
      onErrore(MESSAGGIO_ERRORE)
    } finally {
      setSalvando(false)
    }
  }

  // Il ramo «colore» monta il PROPRIO `Sheet` (titolo che cambia coi tre passi
  // del gesto D212). Il ritorno anticipato sta DOPO tutti gli hook, e l'ordine
  // resta stabile perché il chiamante rimonta questo componente a ogni
  // apertura (`key={campoAttivo}` in `SchedaLavoroV3`): `campo` non cambia mai
  // sotto la stessa istanza.
  if (campo === 'colore') {
    if (!props.colore) return null
    return (
      <ModificaColoreSheet
        aperto={aperto}
        onChiudi={onChiudi}
        lavoroId={lavoroId}
        titolo={TITOLI.colore}
        onErrore={onErrore}
        {...props.colore}
      />
    )
  }

  return (
    <Sheet aperto={aperto} onChiudi={onChiudi} titolo={TITOLI[campo]}>
      {campo === 'note' && (
        <>
          <CampoTesto
            label="Note interne"
            valore={String(valore ?? '')}
            onCambia={setValore as (v: string) => void}
          />
          <TastoPrimario
            disabled={salvando}
            onClick={() => salva({ note_interne: String(valore ?? '') })}
          >
            Salva
          </TastoPrimario>
        </>
      )}

      {campo === 'consegna' && (
        <RamoConsegna
          valore={normalizzaConsegna(valore)}
          onCambia={setValore}
          salvando={salvando}
          onSalva={salva}
        />
      )}

      {campo === 'tecnico' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spazio.sm }}>
          {tecnici.map((t) => (
            <TileScelta
              key={t.id}
              nome={`${t.nome} ${t.cognome}`}
              onClick={() => salva({ tecnico_id: t.id })}
            />
          ))}
        </div>
      )}

      {/* D42 T7 (D247) — la tinta si corregge QUI, senza cambiare pagina.
          La tavolozza è la stessa della pagina di modifica (T8): un componente
          solo, importato da due posti. */}
      {campo === 'tinta' && props.tinta && (
        <TavolozzaTinte
          tinte={props.tinta.disponibili}
          scelta={props.tinta.scelta}
          onScegli={(t) =>
            salva(
              // Al server SOLO le due chiavi in allowlist.
              { tinta_famiglia: t?.famiglia ?? null, tinta_codice: t?.codice ?? null },
              // Allo specchio locale anche il nome e il pallino: senza, la riga
              // della scheda mostrerebbe il nome VECCHIO accanto al codice nuovo.
              {
                tinta_famiglia: t?.famiglia ?? null,
                tinta_codice: t?.codice ?? null,
                tinta: t ? { famiglia: t.famiglia, codice: t.codice, nome: t.nome, hex: t.hex } : null,
              }
            )
          }
        />
      )}

      {campo === 'dentista' && (
        <ClienteComboBox
          value={String(valore ?? '')}
          onChange={(id) => {
            if (id) salva({ cliente_id: id })
          }}
        />
      )}
    </Sheet>
  )
}

/**
 * Ramo «consegna» — estratto in componente separato SOLO per tenere pulito
 * il corpo di `ModificaRigaSheet` (nessuna logica propria oltre al derive di
 * `Date | null` per `CampoData`): `CampoData` vuole un `Date`, la colonna DB è
 * una stringa "YYYY-MM-DD" — il parse/format vive qui, il resto (stato,
 * salvataggio) resta nel genitore.
 */
function RamoConsegna(props: {
  valore: ValoreConsegna
  onCambia: (v: ValoreConsegna) => void
  salvando: boolean
  onSalva: (patch: Record<string, unknown>) => void
}) {
  const { valore, onCambia, salvando, onSalva } = props
  const dataSelezionata = valore.data_consegna_prevista ? parseDataISO(valore.data_consegna_prevista) : null

  function handleOraCambia(e: ChangeEvent<HTMLInputElement>) {
    onCambia({ ...valore, ora_consegna: e.target.value })
  }

  return (
    <>
      <CampoData
        label="Data di consegna"
        valore={dataSelezionata}
        onCambia={(d) => onCambia({ ...valore, data_consegna_prevista: formattaDataISO(d) })}
      />
      <div>
        <label htmlFor="ora-consegna-input" style={stileLabelOra}>
          Ora di consegna
        </label>
        <input
          id="ora-consegna-input"
          type="time"
          value={valore.ora_consegna ?? ''}
          onChange={handleOraCambia}
          style={stileInputOra}
        />
      </div>
      <TastoPrimario
        disabled={salvando || !valore.data_consegna_prevista}
        onClick={() =>
          onSalva({
            data_consegna_prevista: valore.data_consegna_prevista,
            ora_consegna: valore.ora_consegna,
          })
        }
      >
        Salva
      </TastoPrimario>
    </>
  )
}

const stileLabelOra = {
  display: 'block',
  fontSize: tipografia.size.label,
  fontWeight: tipografia.weight.extrabold,
  textTransform: 'uppercase',
  letterSpacing: tipografia.tracking.label,
  color: 'var(--faint)',
  marginBottom: spazio.xs,
} as const

const stileInputOra = {
  display: 'block',
  boxSizing: 'border-box',
  width: '100%',
  height: 64,
  borderRadius: raggio.riga,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  color: 'var(--ink)',
  fontFamily: tipografia.famiglia,
  fontSize: 19,
  fontWeight: 700,
  padding: '0 20px',
} as const
