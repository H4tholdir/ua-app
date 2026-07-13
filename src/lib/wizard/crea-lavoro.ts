// DS v3 §7.3/§7 (Ondata 2, Task 12) — crea-lavoro: orchestrazione client-safe
// della creazione del lavoro dal wizard. NIENTE `server-only` qui (a
// differenza di dati-wizard.ts): gira nel browser, chiamata dal «Continua»
// del Passo 3 (PassoPaziente → WizardNuovoLavoro).
//
// Sequenza fail-soft (spec §7): 5 passi, i primi 3 SONO il percorso primario
// (BLOCCANTI — un fallimento a uno qualsiasi di questi ferma tutto, nessuna
// chiamata successiva, `lavoro: null`); gli ultimi 2 sono accessori
// (elemento/colore, foto) e possono fallire SENZA invalidare il lavoro già
// creato — l'esito riporta quali sono andati storti in `accessoriFalliti`,
// il chiamante li segnala (Avviso) ma non blocca mai l'utente.
//
// 1. GET  /api/pazienti?cliente_id=X       — riusa l'id se codice_paziente === pz
// 2. POST /api/pazienti                    — SOLO se nessun match al passo 1
// 3. POST /api/lavori                      — il lavoro vero e proprio
// 4. PATCH /api/lavori/[id]                — SOLO se elemento e/o colore presenti
// 5. POST /api/lavori/[id]/immagini        — SOLO se una foto è presente
//
// DEVIAZIONE dal contratto letterale del piano (verificata leggendo il
// codice reale di `src/app/api/pazienti/route.ts` PRIMA di scrivere, come
// richiesto dal brief): il piano diceva `POST /api/pazienti {..., nome_cognome:
// alias||pz}`, ma la route NON legge `body.nome_cognome` (lo scarta in
// silenzio — non è nella whitelist di `insertData`) e la colonna
// `pazienti.nome_cognome` è `NOT NULL` senza default. Il trigger DB
// `sync_paziente_nome_cognome` (002_fase2_schema.sql) la valorizza SOLO se
// `nome` E `cognome` sono ENTRAMBI non-null — quindi un POST con solo
// `codice_paziente` violerebbe il vincolo NOT NULL e fallirebbe con 500
// (bloccante, per giunta senza un motivo comprensibile). Mapping adattato:
// `nome: ''` (stringa vuota — non-null, soddisfa il trigger senza inventare
// un nome, coerente col principio GDPR "nessun nome richiesto" del Passo 3)
// e `cognome: alias || pz` (il valore visibile). FrameFatto mostra `pz`
// (il codice), MAI `nome_cognome`, quindi lo spazio finale che il trigger
// produce (`upper(cognome) || ' ' || upper(nome)`) resta un dettaglio
// cosmetico del campo interno, invisibile in UI.
//
// isoDataLocale è duplicata da dati-wizard.ts (Task 7): quel file è
// `server-only`, non importabile da qui. Stessa convenzione W7 (mai
// `toISOString().split('T')[0]`, che usa il fuso UTC).

import { trovaTipo, labelTipo } from '@/lib/domain/tipi-lavoro'
import type { TipoScelto } from '@/components/features/wizard/WizardNuovoLavoro'
import type { TipoDispositivo, ClasseRischio } from '@/types/domain'

export type EsitoCreazione = {
  lavoro: { id: string; numero_lavoro: string } | null
  accessoriFalliti: Array<'dettagli' | 'foto'>
}

const ESITO_BLOCCANTE: EsitoCreazione = { lavoro: null, accessoriFalliti: [] }

/** 'YYYY-MM-DD' locale — vedi nota in testa al file (mai toISOString). */
export function isoDataLocale(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

/**
 * Nessun campione storico possibile per un tipo "descritto a mano" (nessun
 * id di catalogo su cui `calcolaGiorniPerTipo`, Task 6, possa aver aggregato
 * nulla): valore di 7 giorni ratificato da Francesco. Usato anche come rete
 * di sicurezza difensiva se un id di catalogo scelto non fosse (più)
 * presente in `giorniPerTipo`.
 */
export const GIORNI_FALLBACK_LIBERO = 7

/** Etichetta del tipo per la UI ("Lavoro" in FrameFatto) e come `descrizione` del POST. */
export function descrizioneTipo(tipo: TipoScelto): string {
  if (tipo.kind === 'libero') return tipo.testo
  const t = trovaTipo(tipo.tipoId)
  return t ? labelTipo(t) : tipo.tipoId
}

/**
 * Stima giorni/daStoria per il tipo scelto (Task 6/7, `dati.giorniPerTipo`
 * indicizza SOLO gli id di catalogo — un tipo libero non ha e non può avere
 * una voce). Pura: nessuna chiamata a rete, usata sia per calcolare
 * `dataConsegna` PRIMA di chiamare `creaLavoroDaWizard` sia per la frase di
 * FrameFatto (stesso `giorni`/`daStoria`, un'unica fonte di verità).
 */
export function stimaGiorni(
  tipo: TipoScelto,
  giorniPerTipo: Record<string, { giorni: number; daStoria: boolean }>
): { giorni: number; daStoria: boolean } {
  if (tipo.kind === 'libero') return { giorni: GIORNI_FALLBACK_LIBERO, daStoria: false }
  return giorniPerTipo[tipo.tipoId] ?? { giorni: GIORNI_FALLBACK_LIBERO, daStoria: false }
}

function datiPerTipo(tipo: TipoScelto): { tipo_dispositivo: TipoDispositivo; descrizione: string; classe_rischio: ClasseRischio } | null {
  if (tipo.kind === 'libero') {
    return { tipo_dispositivo: 'altro', descrizione: tipo.testo, classe_rischio: 'classe_i' }
  }
  const t = trovaTipo(tipo.tipoId)
  if (!t) return null
  return { tipo_dispositivo: t.macro, descrizione: labelTipo(t), classe_rischio: t.classeRischio }
}

type PazienteRiga = { id: string; codice_paziente: string | null }

/**
 * creaLavoroDaWizard — sequenza fail-soft del Passo 3 (spec §7). Ritorna
 * SEMPRE l'esito parziale, mai un throw: il chiamante (WizardNuovoLavoro)
 * decide cosa fare con `lavoro: null` (bloccante, resta al Passo 3) o con
 * `accessoriFalliti` non vuoto (il lavoro esiste, si segnala e si prosegue).
 */
export async function creaLavoroDaWizard(input: {
  cliente: { id: string }
  tipo: TipoScelto
  pz: string
  alias: string
  elemento: string
  colore: string
  foto: File | null
  dataConsegna: Date
}): Promise<EsitoCreazione> {
  const { cliente, tipo, pz, alias, elemento, colore, foto, dataConsegna } = input

  // Passi 1-2: risolvi (o crea) il paziente. Qualunque fallimento qui è
  // BLOCCANTE (spec §7: il paziente fa parte del percorso primario) — nessun
  // POST /api/lavori viene tentato.
  let pazienteId: string
  try {
    const resGet = await fetch(`/api/pazienti?cliente_id=${encodeURIComponent(cliente.id)}`, {
      credentials: 'same-origin',
    })
    if (!resGet.ok) return ESITO_BLOCCANTE
    const datiGet = (await resGet.json()) as { pazienti: PazienteRiga[] }
    const esistente = datiGet.pazienti.find((p) => p.codice_paziente === pz)

    if (esistente) {
      pazienteId = esistente.id
    } else {
      const resPost = await fetch('/api/pazienti', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          codice_paziente: pz,
          // Vedi nota in testa al file: mapping adattato al contratto reale
          // (nome_cognome NOT NULL, valorizzato dal trigger SOLO se nome+
          // cognome sono entrambi non-null).
          nome: '',
          cognome: alias || pz,
        }),
      })
      if (!resPost.ok) return ESITO_BLOCCANTE
      const datiPost = (await resPost.json()) as { paziente: { id: string } }
      pazienteId = datiPost.paziente.id
    }
  } catch {
    return ESITO_BLOCCANTE
  }

  // Passo 3: il lavoro vero e proprio. Fallimento = BLOCCANTE, anche se
  // elemento/colore/foto sono presenti (nessuna PATCH/immagini senza un
  // lavoro creato con successo).
  const corpo = datiPerTipo(tipo)
  if (!corpo) return ESITO_BLOCCANTE

  let lavoro: { id: string; numero_lavoro: string }
  try {
    const res = await fetch('/api/lavori', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: cliente.id,
        paziente_id: pazienteId,
        tipo_dispositivo: corpo.tipo_dispositivo,
        descrizione: corpo.descrizione,
        data_consegna_prevista: isoDataLocale(dataConsegna),
        classe_rischio: corpo.classe_rischio,
      }),
    })
    if (!res.ok) return ESITO_BLOCCANTE
    const dati = (await res.json()) as { lavoro: { id: string; numero_lavoro: string } }
    lavoro = { id: dati.lavoro.id, numero_lavoro: dati.lavoro.numero_lavoro }
  } catch {
    return ESITO_BLOCCANTE
  }

  // Da qui in poi il lavoro ESISTE: ogni fallimento è fail-soft, mai bloccante.
  const accessoriFalliti: Array<'dettagli' | 'foto'> = []

  // Passo 4: elemento/colore (SOLO se almeno uno dei due è stato compilato).
  if (elemento || colore) {
    try {
      const res = await fetch(`/api/lavori/${lavoro.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denti_coinvolti: elemento.split(/[,\s]+/).filter(Boolean),
          colore_dente: colore,
        }),
      })
      if (!res.ok) accessoriFalliti.push('dettagli')
    } catch {
      accessoriFalliti.push('dettagli')
    }
  }

  // Passo 5: foto dell'impronta.
  if (foto) {
    try {
      const fd = new FormData()
      fd.append('file', foto)
      fd.append('descrizione', 'impronta')
      const res = await fetch(`/api/lavori/${lavoro.id}/immagini`, {
        method: 'POST',
        credentials: 'same-origin',
        body: fd,
      })
      if (!res.ok) accessoriFalliti.push('foto')
    } catch {
      accessoriFalliti.push('foto')
    }
  }

  return { lavoro, accessoriFalliti }
}
