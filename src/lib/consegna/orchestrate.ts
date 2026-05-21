import 'server-only'
import { getServiceClient } from '@/lib/supabase/server-service'
import { precheckMDR } from './precheck'
import { generaProgressivo } from '@/lib/db/progressivi'
import { buildWhatsappMessage, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'
import type { ConsegnaResult, ConsegnaError, LavoroDettaglio } from '@/types/domain'

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
    // Recupera DdC esistente (se presente — può essere null durante fase stub)
    // TODO Task 14/15: quando i PDF reali saranno generati, questa query restituirà dati reali
    const { data: ddcRow } = await supabase
      .from('dichiarazioni_conformita')
      .select('numero_ddc, pdf_url')
      .eq('lavoro_id', lavoro_id)
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

    const ddcNumero = ddcRow?.numero_ddc ?? `DDC-${new Date().getFullYear()}-000`
    const ddcUrl = ddcRow?.pdf_url ?? ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buonoNumero = (lavoro as any)?.buono_numero ?? `BUO-${new Date().getFullYear()}-000`
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

    // ----------------------------------------------------------------
    // Step 6 — FatturaPA (non blocking — fire-and-forget con draft record)
    // ----------------------------------------------------------------
    // Il record draft viene creato PRIMA del fire-and-forget:
    // - se la generazione fallisce, il record rimane in stato 'draft' visibile in /fatture
    // - il titolare può ri-inviare manualmente senza perdita silenziosa
    const cliente = lavoro.cliente as unknown as {
      codice_sdi?: string | null
      pec?: string | null
      id?: string
    } | null

    if (cliente?.codice_sdi || cliente?.pec) {
      // Crea draft visibile — non attendiamo per non bloccare la risposta
      // Fire-and-forget avvolto in async IIFE per compatibilità PromiseLike Supabase
      ;(async () => {
        try {
          // Progressivo reale (fix review: draft con progressivo:0 e numero 'DA-GENERARE')
          const annoFattura = new Date().getFullYear()
          const progFattura = await generaProgressivo(supabase, laboratorio_id, 'fattura')
          const numeroDraft = `${annoFattura}-${String(progFattura).padStart(4, '0')}`

          const { data: draftFattura } = await supabase
            .from('fatture')
            .insert({
              laboratorio_id: laboratorio_id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cliente_id: (cliente as any)?.id ?? null,
              numero: numeroDraft,
              anno: annoFattura,
              progressivo: progFattura,
              data: new Date().toISOString().split('T')[0],
              tipo_documento: 'TD01',
              stato_sdi: 'draft',
              imponibile: 0,
              iva_importo: 0,
              bollo: 0,
              totale: 0,
            })
            .select('id')
            .single()

          if (!draftFattura?.id) return

          const { generaFatturaPA } = await import('@/lib/fattura/generate-xml')
          await generaFatturaPA(lavoro as LavoroDettaglio, draftFattura.id)
        } catch (err) {
          console.error('[CONSEGNA] FatturaPA failed — draft rimane in /fatture per retry:', err)
        }
      })()
    }

    // ----------------------------------------------------------------
    // Step 7 — Costruisci link WhatsApp (GDPR-safe: NO dati personali)
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
    // Step 8 — Auto-scarico materiali BOM (non-critical, fire-and-forget)
    // ----------------------------------------------------------------
    // Se errore → LOG ma NON blocca la consegna
    ;(async () => {
      try {
        const lavorazioniForScarico = lavoro.lavorazioni as Array<{
          id: string
          listino_id: string | null
          quantita: number
        }> | undefined

        if (!lavorazioniForScarico || lavorazioniForScarico.length === 0) return

        for (const lav of lavorazioniForScarico) {
          if (!lav.listino_id) continue

          // Carica BOM per questa lavorazione
          const { data: bomItems } = await supabase
            .from('listino_materiali_auto')
            .select('magazzino_id, listino_id, quantita_per_unita, unita_misura')
            .eq('listino_id', lav.listino_id)
            .eq('laboratorio_id', laboratorio_id)

          if (!bomItems || bomItems.length === 0) continue

          for (const bom of bomItems) {
            const quantita = Number(bom.quantita_per_unita) * Number(lav.quantita)

            // Inserisci in scarichi_magazzino (tracciabilità MDR)
            await supabase.from('scarichi_magazzino').insert({
              laboratorio_id: laboratorio_id,
              lavoro_id: lavoro_id,
              magazzino_id: bom.magazzino_id,
              listino_id: bom.listino_id,
              quantita,
              unita_misura: bom.unita_misura,
            })

            // Decrementa scorta_attuale
            const { data: mag } = await supabase
              .from('magazzino')
              .select('scorta_attuale')
              .eq('id', bom.magazzino_id)
              .eq('laboratorio_id', laboratorio_id)
              .single()

            if (mag) {
              const nuovaScorta = Math.max(0, Number(mag.scorta_attuale) - quantita)
              await supabase
                .from('magazzino')
                .update({ scorta_attuale: nuovaScorta })
                .eq('id', bom.magazzino_id)
                .eq('laboratorio_id', laboratorio_id)
            }
          }
        }
      } catch (err) {
        console.error('[CONSEGNA] Auto-scarico materiali failed (non-blocking):', err)
      }
    })()

    // ----------------------------------------------------------------
    // Step 9 — Restituisci ConsegnaResult
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
