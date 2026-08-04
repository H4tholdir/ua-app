// src/lib/domain/prescrizione-mapper.ts
//
// normalizzaPrescrizione — la lettura dell'embed `lavori_prescrizioni` per
// GET /api/lavori/[id] (ondata B, Task 6). Funzione PURA, sul modello di
// `risolviColore` (colore-dente.ts): vive fuori dalla route così da essere
// testabile senza montare la catena Supabase, e riusabile da chi altro
// leggerà lo stesso embed (T7 — la scheda).
//
// 🔴 LA FORMA DELL'EMBED NON È SCONTATA, ed è il motivo per cui questa
// funzione esiste invece di un accesso diretto a `lavoro.prescrizione`.
// `lavori_prescrizioni` porta `UNIQUE(lavoro_id)` (20260804150306:48) — una
// riga per lavoro, sempre — ma la FK usata per l'embed
// (`prescrizione:lavori_prescrizioni(*)`) è COMPOSITA
// (lavoro_id, laboratorio_id) → lavori(id, laboratorio_id)
// (20260804150306:51-52), e lo UNIQUE non copre la coppia esatta: i tipi
// generati marcano perciò la relazione `isOneToOne: false`
// (database.types.ts:3421-3426), quindi l'ATTESA è che PostgREST restituisca
// l'embed come ARRAY (0 o 1 elementi), non un oggetto singolo — stesso caso
// già gestito, con la STESSA riserva, per `ddc:dichiarazioni_conformita(*)`
// in `lavori/[id]/page.tsx:51-55`: «mai verificato empiricamente». Qui non è
// stato verificato nemmeno a banco (R-P1: non provato, quindi non marcato
// come fatto) — per questo la funzione normalizza ENTRAMBE le forme, non
// solo quella attesa: se PostgREST sorprendesse restituendo un oggetto
// singolo, il risultato resta corretto lo stesso. Questa funzione normalizza
// QUALUNQUE forma arrivi (array, oggetto, null, undefined, o un valore del
// tutto inatteso) in un `LavoroPrescrizione | undefined` — `undefined`
// quando il lavoro non ha ancora una trascrizione, MAI un oggetto vuoto (V2:
// l'assenza è un'informazione, non un default silenzioso).
//
// 🔑 GUARDIA RUNTIME SOLO SU `fonte_tipo`. I tipi generati lo dichiarano
// `string | null` (più largo del dominio — R27, prescrizione-costanti.ts:6-13:
// i client Supabase di questo repo non passano il generico <Database>),
// mentre il CHECK di tabella (20260804150306:31) impedisce già in banca dati
// qualunque valore fuori dalle 4 forme di D202. Un valore fuori unione qui è
// quindi un IMPOSSIBILE DIFESO, non un caso atteso a monte: si registra con
// `console.warn` (stessa spia di annulla-consegna/route.ts:84) e si legge
// come `null` — la stessa forma legittima di V7 ("in attesa di conferma
// scritta") — MAI un cast cieco che propaghi un valore fuori dizionario a
// valle.
//
// `contenuto` e `divergenze` NON hanno una guardia equivalente: sono scritti
// SOLO dalle RPC `lavoro_crea_atomico` / `lavoro_prescrizione_*`
// (`lavori_prescrizioni` è REVOKE ALL, service_role compreso —
// 20260804150306:79), e `divergenze` è validata voce per voce all'INSERT da
// `lavoro_prescrizione_registra_divergenza` (campo/motivo,
// 20260804211256:77-83). Un cast diretto sul valore jsonb è quindi una scelta
// dichiarata — il perimetro scrivibile è già chiuso a monte — non una svista.

import type { Divergenza, LavoroPrescrizione, PrescrizioneContenuto } from '@/types/domain'
import { isFonteTipo } from './prescrizione-costanti'

export function normalizzaPrescrizione(raw: unknown): LavoroPrescrizione | undefined {
  const riga = Array.isArray(raw) ? raw[0] : raw

  if (riga === null || riga === undefined || typeof riga !== 'object') {
    return undefined
  }

  const r = riga as Record<string, unknown>

  let fonte_tipo: LavoroPrescrizione['fonte_tipo'] = null
  const fonteGrezza = r.fonte_tipo
  if (fonteGrezza !== null && fonteGrezza !== undefined) {
    if (isFonteTipo(fonteGrezza)) {
      fonte_tipo = fonteGrezza
    } else {
      console.warn(
        '[normalizzaPrescrizione] fonte_tipo fuori dal dizionario chiuso (D202) — letto come null:',
        fonteGrezza
      )
    }
  }

  return {
    id: r.id as string,
    laboratorio_id: r.laboratorio_id as string,
    lavoro_id: r.lavoro_id as string,
    contenuto: (r.contenuto ?? {}) as PrescrizioneContenuto,
    divergenze: (r.divergenze ?? []) as Divergenza[],
    fonte_tipo,
    fonte_immagine_id: (r.fonte_immagine_id as string | null) ?? null,
    fonte_riferimento: (r.fonte_riferimento as string | null) ?? null,
    numero_prescrizione: (r.numero_prescrizione as string | null) ?? null,
    confermata_da: (r.confermata_da as string | null) ?? null,
    confermata_at: (r.confermata_at as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }
}
