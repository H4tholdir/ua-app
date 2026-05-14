import 'server-only'
import nodemailer from 'nodemailer'
import { getServiceClient } from '@/lib/supabase/server-service'

// ─── Lab row con campi PEC SMTP (non ancora in domain.ts Laboratorio) ─────────
interface LabPecRow {
  id: string
  nome: string
  pec_host: string | null
  pec_port: number | null
  pec_user: string | null
  pec_smtp_configurata: boolean
  pec_vault_key_id: string | null
}

interface FatturaRow {
  id: string
  numero: string
  nome_file_xml: string | null
  xml_url: string | null
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
      xml_url,
      laboratorio_id,
      data,
      laboratorio:laboratori(
        id,
        nome,
        pec_host,
        pec_port,
        pec_user,
        pec_smtp_configurata,
        pec_vault_key_id
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
  if (!fattura.xml_url) {
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

  // ── 4. Scarica XML da Storage ─────────────────────────────────────────────
  // Usa signed URL (60s) per supportare bucket privati — non URL pubblico
  let xmlBuffer: ArrayBuffer
  try {
    // Ricava storage_path dal nome file e dal percorso standard
    const storagePath = fattura.nome_file_xml
      ? `${fattura.laboratorio_id}/${new Date(fattura.data ?? Date.now()).getFullYear()}/${fattura.nome_file_xml}`
      : null

    let downloadUrl = fattura.xml_url
    if (storagePath) {
      const { data: signed } = await supabase.storage
        .from('fatture-pdf')
        .createSignedUrl(storagePath, 60)
      if (signed?.signedUrl) downloadUrl = signed.signedUrl
    }

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
    to: 'sdi01@pec.fatturapa.it',
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

  // ── 7. Aggiorna stato fattura ─────────────────────────────────────────────
  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from('fatture')
    .update({
      stato_sdi: 'smtp_inviata',
      inviata_via: 'pec',
      inviata_at: now,
      smtp_inviata_at: now,
      pec_message_id: info.messageId,
    } as Record<string, unknown>)
    .eq('id', fattura_id)

  if (updateErr) {
    // Non lanciamo eccezione: la mail è già stata inviata.
    // Loggiamo e continuiamo — un cron potrà recuperare lo stato.
    console.error(`[sendFatturaPEC] UPDATE stato_sdi fallito per fattura ${fattura_id}:`, updateErr.message)
  }
}
