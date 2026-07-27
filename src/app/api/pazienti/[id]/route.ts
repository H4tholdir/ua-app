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
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const field of ALLOWED) {
    if (field in body) updates[field] = body[field]
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

    const codice = 'codice_paziente' in body
      ? (typeof body.codice_paziente === 'string' ? body.codice_paziente : null)
      : attuale.codice_paziente

    const spogliaCodice = (v: string | null | undefined) =>
      // Il cognome SALVATO specchia il codice VECCHIO (è l'invariante 2: sui
      // pazienti senza nome il codice vive dentro `cognome`); quello che
      // arriva dal body specchia semmai il NUOVO. Nessuno dei due vale come
      // cognome, quindi si spoglia contro entrambi — altrimenti rinominare il
      // codice trasforma il vecchio in un cognome e riapre la trappola 3.
      cognomeEffettivo(cognomeEffettivo(v, codice), attuale.codice_paziente)

    // `spogliaCodice` su ENTRAMBI i rami, non solo su quello che legge dal
    // DB: è la precondizione dichiarata nel JSDoc di `risolviNomePaziente`,
    // che da sola NON può difendere l'invariante 3. Sui pazienti creati dal
    // wizard senza nome il CODICE vive dentro `cognome` (invariante 2), e
    // trattarlo come un cognome vero lo farebbe vincere sul nome appena
    // digitato → «Pz-0042 Giuseppe» in targa. Vale anche per il valore che
    // arriva dal body: il client non è una fonte fidata.
    const coppia = risolviNomePaziente({
      cognome: spogliaCodice(
        'cognome' in body
          ? (typeof body.cognome === 'string' ? body.cognome : null)
          : attuale.cognome
      ),
      nome: 'nome' in body
        ? (typeof body.nome === 'string' ? body.nome : null)
        : attuale.nome,
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
