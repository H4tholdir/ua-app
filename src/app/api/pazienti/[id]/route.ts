import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { risolviNomePaziente, cognomeEffettivo } from '@/lib/domain/nome-paziente-scrittura'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const guard = assertLabOperativo(context, 'PATCH')
  if (guard) return guard
  const svc = getServiceClient()

  const body = await req.json()

  // Allowlist — solo campi sicuri da modificare.
  // `nome` e `cognome` sono DELIBERATAMENTE fuori da questo ciclo: hanno un
  // ramo proprio qui sotto, perché non si possono scrivere grezzi.
  const ALLOWED = ['codice_paziente', 'note', 'anamnesi', 'asl', 'sesso', 'data_nascita'] as const

  // Una stringa vuota non è un valore per queste due colonne: `data_nascita`
  // è di tipo data e `sesso` ammette solo 'M' o 'F'. Il pannello di modifica
  // manda `''` quando il campo è assente sul paziente (ed è il caso normale
  // per i pazienti creati dal wizard), e l'aggiornamento falliva in silenzio.
  // Le colonne di testo — note, anamnesi, asl — restano com'erano: lì `''` è
  // innocuo e distinguerlo da null sarebbe una decisione a sé.
  const VUOTO_VALE_NULL = new Set<string>(['data_nascita', 'sesso'])

  // 🟠 ALTO 1 — il codice paziente normalizzato (stringa o null) deve essere
  // LO STESSO valore sia per la colonna `codice_paziente` sia per la regola
  // del nome qui sotto: prima divergevano (la regola vedeva solo stringhe,
  // la colonna riceveva il valore grezzo), e un codice non-stringa restava
  // scritto grezzo mentre la regola lo trattava come assente. Calcolato una
  // volta sola, fuori dal ciclo dell'allowlist, così alimenta entrambi.
  const codiceDalBody = 'codice_paziente' in body
    ? (typeof body.codice_paziente === 'string' ? body.codice_paziente : null)
    : undefined

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of ALLOWED) {
    if (field === 'codice_paziente') {
      if (codiceDalBody !== undefined) updates.codice_paziente = codiceDalBody
      continue
    }
    if (field in body) {
      const v = body[field]
      updates[field] =
        VUOTO_VALE_NULL.has(field) && typeof v === 'string' && v.trim() === '' ? null : v
    }
  }

  // Rettifica di nome e cognome (G4 — Art. 16 GDPR: un cognome scritto male
  // finisce in `dichiarazioni_conformita.paziente_nome`, che si conserva 10
  // anni; senza questa via non era correggibile da nessuna parte).
  //
  // 🛑 Perché NON basta metterli nell'allowlist: il trigger
  // `sync_paziente_nome_cognome` è `BEFORE INSERT OR UPDATE`. Il pannello di
  // modifica invia l'intero form a ogni salvataggio, quindi due caselle
  // lasciate vuote scriverebbero `('', '')` → il trigger comporrebbe `' '`
  // (uno spazio) → `precheck.ts:40-43` si ferma lì (`''` non è nullish),
  // non arriva mai a `codice_paziente` → elemento 4 dell'Allegato XIII
  // fallito → CONSEGNA BLOCCATA, da un salvataggio che sembra un no-op.
  // La regola §5 va applicata anche qui, sui valori RISULTANTI (body sopra
  // riga corrente), non solo su quelli inviati.
  if ('nome' in body || 'cognome' in body) {
    const { data: attuale, error: letturaError } = await svc
      .from('pazienti')
      .select('nome, cognome, codice_paziente')
      .eq('id', id)
      .eq('laboratorio_id', context.laboratorioId)
      .single()

    // Distingui il guasto vero (query fallita) dalla riga assente: senza
    // questo controllo un errore momentaneo del DB si travestiva da
    // «Paziente non trovato» — 404, non 500 — e l'utente lo leggeva come «il
    // paziente non c'è più». `PGRST116` di PostgREST è la sola forma in cui
    // "nessuna riga" arriva anche come errore da `.single()`: quella resta
    // un 404 vero, non un guasto.
    if (letturaError && letturaError.code !== 'PGRST116') {
      // G9 — mai il testo grezzo del DB al client.
      console.error('PATCH /api/pazienti/[id] — lettura riga corrente fallita:', letturaError.message)
      return NextResponse.json({ error: 'Non è stato possibile aggiornare il paziente' }, { status: 500 })
    }

    if (!attuale) {
      return NextResponse.json({ error: 'Paziente non trovato' }, { status: 404 })
    }

    const codice = codiceDalBody !== undefined ? codiceDalBody : attuale.codice_paziente

    const coppia = risolviNomePaziente({
      // Ogni valore si spoglia contro il codice che SPECCHIA: quello dal body
      // può ripetere il codice nuovo, quello salvato ripete il vecchio
      // (invariante 2). Spogliare contro entrambi cancellerebbe un cognome
      // VERO che coincide con uno dei due — verificato: «Rossi» come codice
      // paziente, poi corretto in «PZ-0042», faceva sparire il cognome.
      cognome: 'cognome' in body
        ? cognomeEffettivo(typeof body.cognome === 'string' ? body.cognome : null, codice)
        : cognomeEffettivo(attuale.cognome, attuale.codice_paziente),
      nome: 'nome' in body ? (typeof body.nome === 'string' ? body.nome : null) : attuale.nome,
      codice,
    })

    if (!coppia) {
      return NextResponse.json({ error: 'Serve almeno il codice paziente' }, { status: 422 })
    }

    updates.cognome = coppia.cognome
    updates.nome = coppia.nome
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'Nessun campo da aggiornare' }, { status: 400 })
  }

  const { error } = await svc
    .from('pazienti')
    .update(updates)
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)

  if (error) {
    // G9 — mai il testo grezzo del DB al client (nomi di vincoli, di
    // colonne, di indici: superficie di ricognizione gratuita).
    console.error('PATCH /api/pazienti/[id] — aggiornamento fallito:', error.message)
    return NextResponse.json({ error: 'Non è stato possibile aggiornare il paziente' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  // Solo titolare o admin_rete possono archiviare pazienti
  if (context.ruolo !== 'titolare' && context.ruolo !== 'admin_rete') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
  }
  const guard = assertLabOperativo(context, 'DELETE')
  if (guard) return guard
  const svc = getServiceClient()

  // Verifica che il paziente appartenga al lab e non sia già archiviato
  const { data: existing } = await svc
    .from('pazienti')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .eq('archiviato', false)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Paziente non trovato' }, { status: 404 })
  }

  // Soft-delete: imposta archiviato = true
  const { error: deleteError } = await svc
    .from('pazienti')
    .update({ archiviato: true })
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)

  if (deleteError) {
    // G9 — mai il testo grezzo del DB al client (nomi di vincoli, di
    // colonne, di indici: superficie di ricognizione gratuita).
    console.error('DELETE /api/pazienti/[id] — archiviazione fallita:', deleteError.message)
    return NextResponse.json({ error: 'Non è stato possibile archiviare il paziente' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
