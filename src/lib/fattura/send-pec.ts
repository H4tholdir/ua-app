import 'server-only'
import nodemailer from 'nodemailer'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getSignedUrl } from '@/lib/storage/signed-url'

// ─── Lab row con campi PEC SMTP (non ancora in domain.ts Laboratorio) ─────────
interface LabPecRow {
  id: string
  nome: string
  pec_host: string | null
  pec_port: number | null
  pec_user: string | null
  pec_smtp_configurata: boolean
  pec_vault_key_id: string | null
  pec_sdi_address: string | null
}

interface FatturaRow {
  id: string
  numero: string
  nome_file_xml: string | null
  xml_storage_path: string | null
  laboratorio_id: string
  data: string | null
  laboratorio: LabPecRow
}

export async function sendFatturaPEC(fattura_id: string): Promise<void> {
  const supabase = getServiceClient()

  // ── 1. Carica fattura con join laboratorio ───────────────────────────────
  const { data: fatturaRaw, error: fetchErr } = await supabase
    .from('fatture')
    .select(`
      id,
      numero,
      nome_file_xml,
      xml_storage_path,
      laboratorio_id,
      data,
      laboratorio:laboratori(
        id,
        nome,
        pec_host,
        pec_port,
        pec_user,
        pec_smtp_configurata,
        pec_vault_key_id,
        pec_sdi_address
      )
    `)
    .eq('id', fattura_id)
    .single()

  if (fetchErr || !fatturaRaw) {
    throw new Error(`Fattura non trovata: ${fetchErr?.message ?? 'null'}`)
  }

  // Supabase restituisce il join come array o oggetto — normalizziamo
  const fattura = fatturaRaw as unknown as FatturaRow
  const lab = Array.isArray(fattura.laboratorio)
    ? fattura.laboratorio[0]
    : fattura.laboratorio

  if (!lab) {
    throw new Error('Laboratorio non trovato per questa fattura')
  }

  // ── 2. Verifica XML generato ─────────────────────────────────────────────
  if (!fattura.xml_storage_path) {
    throw new Error('XML non generato — eseguire prima la generazione FatturaPA')
  }

  if (!fattura.nome_file_xml) {
    throw new Error('Nome file XML mancante')
  }

  // ── 3. Ottieni password PEC da Supabase Vault ────────────────────────────
  const { data: passwordRaw, error: rpcErr } = await supabase.rpc('get_pec_password', {
    p_lab_id: lab.id,
  })

  if (rpcErr || passwordRaw == null) {
    throw new Error(
      `PEC non configurata: impossibile recuperare la password dal Vault. ${rpcErr?.message ?? ''}`
    )
  }

  const password = String(passwordRaw)

  if (!lab.pec_host) {
    throw new Error('PEC non configurata: pec_host mancante nella configurazione laboratorio')
  }

  if (!lab.pec_user) {
    throw new Error('PEC non configurata: pec_user mancante nella configurazione laboratorio')
  }

  // ── 4. Scarica XML da Storage (SOLO signed URL — bucket privato, I-6) ────
  let xmlBuffer: ArrayBuffer
  try {
    const downloadUrl = await getSignedUrl(supabase, 'fatture-pdf', fattura.xml_storage_path, 60)
    if (!downloadUrl) throw new Error('URL XML non disponibile')

    const resp = await fetch(downloadUrl)
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`)
    xmlBuffer = await resp.arrayBuffer()
  } catch (err) {
    throw new Error(`Download XML fallito: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── 5. Crea transport SMTP PEC ───────────────────────────────────────────
  const transport = nodemailer.createTransport({
    host: lab.pec_host,
    port: lab.pec_port ?? 465,
    secure: true,
    auth: {
      user: lab.pec_user,
      pass: password,
    },
  })

  // ── 6. Invia a SDI via PEC ───────────────────────────────────────────────
  const info = await transport.sendMail({
    from: lab.pec_user,
    // D-6: destinatario dinamico — sdiNN comunicato da SdI dopo il primo invio,
    // fallback all'indirizzo generico se non ancora noto (Task 9, spec R1 §3.1).
    to: lab.pec_sdi_address ?? 'sdi01@pec.fatturapa.it',
    subject: `Fattura ${fattura.nome_file_xml}`,
    text: `Invio fattura elettronica ${fattura.numero} ai sensi delle normative vigenti.`,
    attachments: [
      {
        filename: fattura.nome_file_xml,
        content: Buffer.from(xmlBuffer),
        contentType: 'application/xml',
      },
    ],
  })

  // ⚠️ CONTRATTO (N10, test send-pec-invariante.test.ts): da qui in poi la mail
  // è PARTITA — questa funzione non deve MAI più lanciare. I chiamanti rilasciano
  // il claim anti-doppio-invio nel catch presumendo «throw = mail non partita»;
  // un throw qui causerebbe un secondo invio fiscale a SdI.

  // ── 7. Aggiorna stato fattura ─────────────────────────────────────────────
  // guardia D-7: mai regredire uno stato avanzato da una ricevuta; 0 righe =
  // riconciliazione già avvenuta, non è un errore.
  const now = new Date().toISOString()
  const { data: updated, error: updateErr } = await supabase
    .from('fatture')
    .update({
      stato_sdi: 'smtp_inviata',
      inviata_via: 'pec',
      inviata_at: now,
      smtp_inviata_at: now,
      pec_message_id: info.messageId,
    } as Record<string, unknown>)
    .eq('id', fattura_id)
    .eq('stato_sdi', 'generata')
    .select('id')

  if (updateErr) {
    // Non lanciamo eccezione: la mail è già stata inviata.
    // Loggiamo e continuiamo — un cron potrà recuperare lo stato.
    console.error(`[sendFatturaPEC] UPDATE stato_sdi fallito per fattura ${fattura_id}:`, updateErr.message)
  } else if (!updated || updated.length === 0) {
    // guardia D-7: 0 righe = una ricevuta SdI ha già fatto avanzare lo stato
    // oltre 'generata' (riconciliazione concorrente) — non è un errore, MAI
    // regredire lo stato scrivendo comunque. Solo log (contratto N10).
    console.error(`[sendFatturaPEC] UPDATE stato_sdi saltato per fattura ${fattura_id}: stato non più 'generata' (riconciliazione già avvenuta)`)
  }
}
