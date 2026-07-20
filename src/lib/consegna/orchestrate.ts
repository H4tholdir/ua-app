import 'server-only'
import { getServiceClient } from '@/lib/supabase/server-service'
import { precheckMDR } from './precheck'
import { isStatoConsegnabile } from './costanti'
import { buildWhatsappMessage, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'
import { triggerPushByRole } from '@/lib/notifications/trigger'
import type { ConsegnaResult, ConsegnaError, LavoroDettaglio } from '@/types/domain'
import { annoRoma } from '@/lib/utils/data-roma'

export async function orchestraConsegna(
  lavoro_id: string,
  laboratorio_id: string
): Promise<ConsegnaResult | ConsegnaError> {
  const startMs = Date.now()
  const supabase = getServiceClient()

  // ----------------------------------------------------------------
  // Step 0 — Acquisisci lock idempotente
  // ----------------------------------------------------------------
  let lockResult: { gia_consegnato?: boolean; gia_in_corso?: boolean; lock_acquisito?: boolean }

  try {
    const { data, error } = await supabase.rpc('consegna_lavoro_lock', {
      p_lavoro_id: lavoro_id,
      p_laboratorio_id: laboratorio_id,
    })

    if (error) {
      console.error('[CONSEGNA] Lock RPC error:', error)
      return {
        ok: false,
        tipo: 'errore_pdf',
        messaggio: 'Errore interno durante acquisizione lock.',
      }
    }

    lockResult = data as typeof lockResult
  } catch (err) {
    console.error('[CONSEGNA] Lock exception:', err)
    return {
      ok: false,
      tipo: 'errore_pdf',
      messaggio: 'Errore interno durante acquisizione lock.',
    }
  }

  // Già consegnato — percorso idempotente
  if (lockResult?.gia_consegnato) {
    // Recupera la DdC ATTIVA esistente (mai una annullata — riconsegna = DdC nuova)
    const { data: ddcRow } = await supabase
      .from('dichiarazioni_conformita')
      .select('numero_ddc, pdf_url')
      .eq('lavoro_id', lavoro_id)
      .neq('stato', 'annullata')
      .maybeSingle()

    const { data: lavoro } = await supabase
      .from('lavori')
      .select('numero_lavoro, buono_pdf_url, buono_numero, cliente:clienti(telefono, cognome, portale_token)')
      .eq('id', lavoro_id)
      .eq('laboratorio_id', laboratorio_id)
      .single()

    const clienteTel =
      (lavoro?.cliente as unknown as { telefono?: string } | null)?.telefono ?? ''
    const portaleToken =
      (lavoro?.cliente as unknown as { portale_token?: string } | null)?.portale_token ?? ''
    const numeroLavoro = (lavoro?.numero_lavoro as string | undefined) ?? lavoro_id
    const waMessage = buildWhatsappMessage({
      numeroLavoro,
      portalToken: portaleToken,
    })
    const waUrl = buildWhatsappUrl(waMessage, clienteTel || undefined)

    const ddcNumero = ddcRow?.numero_ddc ?? `DDC-${annoRoma()}-000`
    const ddcUrl = ddcRow?.pdf_url ?? ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buonoNumero = (lavoro as any)?.buono_numero ?? `BUO-${annoRoma()}-000`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buonoUrl = (lavoro as any)?.buono_pdf_url ?? ''

    return {
      ok: true,
      lavoro_id,
      numero_lavoro: numeroLavoro,
      ddc: { numero: ddcNumero, url: ddcUrl, signed_url: ddcUrl },
      buono: { numero: buonoNumero, url: buonoUrl, signed_url: buonoUrl },
      fattura: null,
      whatsapp_url: waUrl,
      tempo_ms: Date.now() - startMs,
    }
  }

  // Consegna già in corso su un'altra richiesta concorrente
  if (lockResult?.gia_in_corso) {
    return {
      ok: false,
      tipo: 'errore_pdf',
      messaggio: 'Consegna già in corso, attendi.',
    }
  }

  // Helper: rilascia il lock in caso di errore successivo
  const rilasciaLock = async () => {
    await supabase
      .from('lavori')
      .update({ consegna_in_corso: false })
      .eq('id', lavoro_id)
      .eq('laboratorio_id', laboratorio_id)
  }

  // Lock acquisito — procedi con il flusso
  try {
    // ----------------------------------------------------------------
    // Step 1 — Carica lavoro completo
    // ----------------------------------------------------------------
    const { data: lavoro, error: lavoroError } = await supabase
      .from('lavori')
      .select(`
        *,
        cliente:clienti(*),
        paziente:pazienti(*),
        lavorazioni:lavori_lavorazioni(*),
        materiali:lavori_materiali(*)
      `)
      .eq('id', lavoro_id)
      .eq('laboratorio_id', laboratorio_id)
      .is('deleted_at', null)
      .single()

    if (lavoroError || !lavoro) {
      await rilasciaLock()
      console.error('[CONSEGNA] Lavoro fetch error:', lavoroError)
      return {
        ok: false,
        tipo: 'errore_pdf',
        messaggio: 'Lavoro non trovato o eliminato.',
      }
    }

    // ----------------------------------------------------------------
    // Step 1.5 — Gate B1: solo stati consegnabili (E4, server-side)
    // ----------------------------------------------------------------
    if (!isStatoConsegnabile(lavoro.stato as string)) {
      await rilasciaLock()
      return {
        ok: false,
        tipo: 'stato_non_consegnabile',
        messaggio: `Il lavoro è in stato "${lavoro.stato}" e non può essere consegnato.`,
      }
    }

    // ----------------------------------------------------------------
    // Step 2 — Precheck MDR
    // ----------------------------------------------------------------
    const precheck = precheckMDR(lavoro as LavoroDettaglio)

    if (!precheck.ok) {
      await rilasciaLock()
      return {
        ok: false,
        tipo: 'precheck_fallito',
        messaggio: 'Dati MDR incompleti — correggi i campi segnalati.',
        errori_precheck: precheck.errori,
      }
    }

    // ----------------------------------------------------------------
    // Step 2.5 — Traccia materiali (BOM → lotti FEFO, MDR Allegato XIII)
    // ----------------------------------------------------------------
    // Deve avvenire PRIMA della generazione DdC: la DdC legge lavoro.materiali,
    // quindi la tracciabilità va risolta e scritta qui, non dopo la consegna
    // (bug originale B1 — vedi docs/superpowers/specs/2026-07-02-b1-tracciabilita-materiali-design.md)
    const { tracciaMaterialiLavoro } = await import('./traccia-materiali')
    const tracciamento = await tracciaMaterialiLavoro(supabase, lavoro as LavoroDettaglio, laboratorio_id)

    const { error: tracciabilitaUpdateError } = await supabase
      .from('lavori')
      .update({
        tracciabilita_materiali_ok: tracciamento.tracciabilitaOk,
        materiali_incompleti_dettaglio: tracciamento.dettaglio.length ? tracciamento.dettaglio : null,
      })
      .eq('id', lavoro_id)
      .eq('laboratorio_id', laboratorio_id)

    if (tracciabilitaUpdateError) {
      console.error('[CONSEGNA] Aggiornamento flag tracciabilità materiali fallito:', tracciabilitaUpdateError.message)
    }

    lavoro.materiali = tracciamento.materialiTracciati

    // ----------------------------------------------------------------
    // Step 3 — Genera DdC
    // ----------------------------------------------------------------
    const { generateDdC } = await import('@/lib/pdf/generate-ddc')
    let ddc: { numero: string; url: string }

    try {
      ddc = await generateDdC(lavoro as LavoroDettaglio)
    } catch (err) {
      await rilasciaLock()
      console.error('[CONSEGNA] generateDdC error:', err)
      return {
        ok: false,
        tipo: 'errore_pdf',
        messaggio: 'Errore durante la generazione della Dichiarazione di Conformità.',
      }
    }

    // ----------------------------------------------------------------
    // Step 4 — Genera Buono
    // ----------------------------------------------------------------
    const { generateBuono } = await import('@/lib/pdf/generate-buono')
    let buono: { numero: string; url: string }

    try {
      buono = await generateBuono(lavoro as LavoroDettaglio)
    } catch (err) {
      await rilasciaLock()
      console.error('[CONSEGNA] generateBuono error:', err)
      return {
        ok: false,
        tipo: 'errore_pdf',
        messaggio: 'Errore durante la generazione del buono di consegna.',
      }
    }

    // ----------------------------------------------------------------
    // Step 5 — Aggiorna stato lavoro (atomico)
    // ----------------------------------------------------------------
    const now = new Date().toISOString()

    const { error: updateError, count: updateCount } = await supabase
      .from('lavori')
      .update({
        stato: 'consegnato',
        consegna_in_corso: false,
        conformato: true,
        data_conformazione: now,
        data_consegna_effettiva: now,
        consegna_completata_at: now,
        consegna_precheck_passato_al_primo_tentativo: true,
      }, { count: 'exact' })
      .eq('id', lavoro_id)
      .eq('laboratorio_id', laboratorio_id)

    if (updateError) {
      // Il lock verrà rilasciato dal flag consegna_in_corso=false nell'update stesso,
      // ma poiché l'update è fallito lo rilasciamo esplicitamente
      await rilasciaLock()
      console.error('[CONSEGNA] Stato update error:', updateError)
      return {
        ok: false,
        tipo: 'errore_pdf',
        messaggio: 'Errore durante l\'aggiornamento dello stato del lavoro.',
      }
    }

    if (updateCount === 0) {
      await rilasciaLock()
      console.error('[CONSEGNA] Stato update affected 0 rows — tenant mismatch or row deleted')
      return {
        ok: false,
        tipo: 'errore_pdf',
        messaggio: 'Lavoro non trovato nel laboratorio corrente.',
      }
    }

    // Push notification — lavoro consegnato → front_desk (fire-and-forget safe)
    await triggerPushByRole(laboratorio_id, 'front_desk', {
      title: 'Lavoro consegnato',
      body: `${lavoro.numero_lavoro} — ${(lavoro.cliente as unknown as { cognome?: string } | null)?.cognome ?? 'Cliente'} è stato consegnato`,
      url: `/lavori/${lavoro_id}`,
    })

    // ----------------------------------------------------------------
    // Step 6 — Costruisci link WhatsApp (GDPR-safe: NO dati personali)
    // ----------------------------------------------------------------
    const clienteContattoRaw = lavoro.cliente as unknown as {
      telefono?: string | null
      portale_token?: string | null
    } | null

    const clienteTel = clienteContattoRaw?.telefono ?? ''
    const portaleToken = clienteContattoRaw?.portale_token ?? ''
    const waMessage = buildWhatsappMessage({
      numeroLavoro: lavoro.numero_lavoro as string,
      portalToken: portaleToken,
    })
    const waUrl = buildWhatsappUrl(waMessage, clienteTel || undefined)

    // ----------------------------------------------------------------
    // Step 7 — Restituisci ConsegnaResult
    // ----------------------------------------------------------------
    return {
      ok: true,
      lavoro_id,
      numero_lavoro: lavoro.numero_lavoro as string,
      ddc: { numero: ddc.numero, url: ddc.url, signed_url: ddc.url },
      buono: { numero: buono.numero, url: buono.url, signed_url: buono.url },
      fattura: null,
      whatsapp_url: waUrl,
      tempo_ms: Date.now() - startMs,
    }
  } catch (err) {
    // Catch-all globale — rilascia lock, restituisci errore generico
    await rilasciaLock()
    console.error('[CONSEGNA] Unhandled exception:', err)
    return {
      ok: false,
      tipo: 'errore_pdf',
      messaggio: 'Errore imprevisto durante la consegna.',
    }
  }
}
