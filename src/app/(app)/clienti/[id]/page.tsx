import { notFound } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PortaleLinkButtons } from '@/components/features/clienti/PortaleLinkButtons'
import { PortaleFatturazioneCard } from '@/components/features/clienti/PortaleFatturazioneCard'
import { ClienteModificaButton } from '@/components/features/clienti/ClienteModificaButton'

type PageProps = { params: Promise<{ id: string }> }

type ClienteDettaglio = {
  id: string
  studio_nome: string | null
  nome: string
  cognome: string
  telefono: string | null
  email: string | null
  partita_iva: string | null
  codice_fiscale: string | null
  codice_sdi: string | null
  pec: string | null
  indirizzo: string | null
  cap: string | null
  citta: string | null
  provincia: string | null
  paese: string
  listino_numero: number
  sconto_percentuale: number
  modalita_pagamento: string | null
  non_soggetto_fe: boolean
  portale_token: string
  portale_fatturazione_attiva: boolean
  portale_pin_hash: string | null
  note: string | null
}

/** Le due sole colonne del registro DPA che la scheda mostra.
 *  Entrambe `null` per lo schema (`data_processing_agreements` ammette righe
 *  senza emissione), quindi entrambe si controllano prima di stampare qualcosa:
 *  il vincolo `dpa_emissione_coerente` le tiene già insieme in banca dati, ma
 *  una riga a metà non deve poter arrivare al lettore come «Invalid Date». */
type UltimaEmissioneDpa = {
  numero_dpa: string | null
  emesso_at: string | null
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '10px 0' }}>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--t2, #4A3D33)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
          color: 'var(--t1, #1C1916)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface, #E4DFD9)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: 'var(--sh-b, var(--sh-b))',
        marginBottom: '12px',
      }}
    >
      <h2
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--t2, #4A3D33)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          borderTop: '1px solid var(--elv, #EDEDEA)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default async function ClienteDettaglioPage({ params }: PageProps) {
  const { id } = await params

  const context = await getLabContext()
  if (!context?.laboratorioId) notFound()

  const svc = getServiceClient()
  const { data: cliente, error } = await svc
    .from('clienti')
    .select(`
      id, studio_nome, nome, cognome, telefono, email,
      partita_iva, codice_fiscale, codice_sdi, pec,
      indirizzo, cap, citta, provincia, paese,
      listino_numero, sconto_percentuale, modalita_pagamento,
      non_soggetto_fe, portale_token, portale_fatturazione_attiva, portale_pin_hash, note
    `)
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (error || !cliente) notFound()

  const c = cliente as unknown as ClienteDettaglio

  const nomeCompleto = `${c.cognome} ${c.nome}`
  const indirizzoCompleto = [c.indirizzo, c.cap, c.citta, c.provincia]
    .filter(Boolean)
    .join(', ') || null

  // ── L'ultima emissione del DPA per questo studio ────────────────────────────
  // 🛑 Il filtro `laboratorio_id` è ESPLICITO: il client di servizio aggira la
  //    RLS, quindi qui l'isolamento fra laboratori lo scrive questa riga e
  //    nessun altro (stessa regola di `generate-dpa.ts:116-120`).
  // 🔑 `numero_dpa NOT NULL` non è una cintura di troppo: il vincolo
  //    `dpa_emissione_coerente` ammette righe di registro SENZA emissione —
  //    tutte e sette le colonne a NULL — e quelle non hanno niente da mostrare.
  // 🔑 `deleted_at IS NULL` toglie le righe archiviate perché il loro PDF è
  //    sparito dall'archivio (`generate-dpa.ts:180-193`). Mostrarle
  //    smentirebbe la riga «ogni versione emessa resta conservata da UÀ».
  // 🛑 QUESTO LETTORE NON ENTRA nell'invariante a tre di `generate-dpa.ts:329-341`
  //    (guard di riuso · rilettura dopo 23505 · indice `dpa_emissione_viva_unica`),
  //    e non è una dimenticanza. Quei tre chiedono «esiste un'emissione
  //    RIUSABILE per QUESTI dati e QUESTA versione di modello?», e per questo
  //    filtrano anche su `payload_sha256`, `template_versione` e sullo STATO.
  //    Qui la domanda è un'altra — «qual è stata l'ULTIMA emissione per questo
  //    studio?» — ed è una domanda di STORIA: resta vera anche per un contratto
  //    poi revocato o scaduto, che UÀ conserva lo stesso. Allineare questo
  //    filtro a quello del guard farebbe sparire dalla scheda un'emissione che
  //    esiste davvero.
  const { data: emissioneRaw, error: erroreRegistro } = await svc
    .from('data_processing_agreements')
    .select('numero_dpa, emesso_at')
    .eq('laboratorio_id', context.laboratorioId)
    .eq('dentista_id', c.id)
    .not('numero_dpa', 'is', null)
    .is('deleted_at', null)
    .order('emesso_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // 🛑 Un guasto di LETTURA non è «non è mai stato emesso»: sono due fatti
  //    diversi e vanno detti diversi (stessa distinzione di
  //    `generate-dpa.ts:134-145`). Qui però NON si ferma la pagina — la scheda
  //    del cliente serve anche senza questa riga, e toglierla tutta per un
  //    dettaglio informativo sarebbe un danno più grande del difetto. Il fatto
  //    resta nei log, dove lo legge chi ripara.
  if (erroreRegistro) {
    console.error('ClienteDettaglioPage — registro DPA non leggibile:', c.id, erroreRegistro.message)
  }

  const ultimaEmissione = emissioneRaw as UltimaEmissioneDpa | null

  // 🛑 `timeZone: 'Europe/Rome'` NON è pignoleria — è il difetto già pagato in
  //    questa stessa ondata su `DpaTemplate.tsx:95-108`. Questo è un componente
  //    SERVER: la data la formatta la macchina, e in produzione la macchina gira
  //    a UTC. Senza fuso dichiarato, un contratto emesso alle 00:30 di Roma si
  //    mostra col giorno PRIMA — e a quel punto la scheda e il PDF, che il fuso
  //    ce l'ha, si contraddicono a vicenda.
  //    ⚠️ Invisibile a occhio in FASE 9: il collaudo gira da una macchina a Roma,
  //    dove il codice sbagliato dà la stessa risposta di quello giusto.
  const dataUltimaEmissione = ultimaEmissione?.emesso_at
    ? new Date(ultimaEmissione.emesso_at).toLocaleDateString('it-IT', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome',
      })
    : null

  const modButton = (
    <ClienteModificaButton
      cliente={{
        id: c.id,
        studio_nome: c.studio_nome,
        nome: c.nome,
        cognome: c.cognome,
        telefono: c.telefono,
        email: c.email,
        indirizzo: c.indirizzo,
        cap: c.cap,
        citta: c.citta,
        provincia: c.provincia,
        partita_iva: c.partita_iva,
        codice_fiscale: c.codice_fiscale,
        codice_sdi: c.codice_sdi,
        pec: c.pec,
        listino_numero: c.listino_numero,
        sconto_percentuale: c.sconto_percentuale,
        modalita_pagamento: c.modalita_pagamento,
        note: c.note,
      }}
    />
  )

  return (
    <PageWrapper>
      <AppHeader
        title={nomeCompleto}
        subtitle={c.studio_nome ?? undefined}
        backHref="/clienti"
        actions={modButton}
      />

      <div style={{ padding: '0 20px 32px' }}>
        {/* Anagrafica */}
        <SectionCard title="Anagrafica">
          <InfoRow label="Telefono" value={c.telefono} />
          <InfoRow label="Email" value={c.email} />
          <InfoRow label="Indirizzo" value={indirizzoCompleto} />
          <InfoRow label="Paese" value={c.paese !== 'IT' ? c.paese : null} />
        </SectionCard>

        {/* Dati fiscali */}
        <SectionCard title="Dati fiscali">
          <InfoRow label="Partita IVA" value={c.partita_iva} />
          <InfoRow label="Codice fiscale" value={c.codice_fiscale} />
          <InfoRow label="Codice SDI" value={c.codice_sdi} />
          <InfoRow label="PEC" value={c.pec} />
          {c.non_soggetto_fe && (
            <div style={{ padding: '10px 0' }}>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--amber, #FD7E14)',
                  background: 'hsl(28 100% 55% / 0.15)',
                  borderRadius: '6px',
                  padding: '3px 10px',
                }}
              >
                Non soggetto a fattura elettronica
              </span>
            </div>
          )}
        </SectionCard>

        {/* Commerciale */}
        <SectionCard title="Commerciale">
          <InfoRow label="Listino" value={`Listino ${c.listino_numero}`} />
          <InfoRow
            label="Sconto"
            value={c.sconto_percentuale > 0 ? `${c.sconto_percentuale}%` : null}
          />
          <InfoRow label="Modalità pagamento" value={c.modalita_pagamento} />
        </SectionCard>

        {/* Note */}
        {c.note && (
          <SectionCard title="Note">
            <div style={{ padding: '10px 0' }}>
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: 'var(--t1, #1C1916)',
                  margin: 0,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {c.note}
              </p>
            </div>
          </SectionCard>
        )}

        {/* Link portale + richiesta */}
        <SectionCard title="Portale dentista">
          <PortaleLinkButtons portaleToken={c.portale_token} clienteNome={`${c.cognome} ${c.nome}`.trim()} />
        </SectionCard>

        {/* Portale — fatturazione concordata (interruttore, PIN, rigenera link) */}
        <PortaleFatturazioneCard
          clienteId={c.id}
          attiva={c.portale_fatturazione_attiva}
          pinImpostato={c.portale_pin_hash != null}
        />

        {/* DPA GDPR Art. 28 */}
        <SectionCard title="Privacy — GDPR">
          <div style={{ padding: '12px 0' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--t2)', marginBottom: '10px', lineHeight: 1.5 }}>
              Accordo di Responsabile del Trattamento (DPA) ex Art. 28 GDPR — da firmare con lo studio dentistico.
            </p>
            {/* 🛑 NIENTE attributo `download` qui, ed è una rimozione voluta.
                Il nome del file lo decide la ROTTA, col suo `Content-Disposition`
                (`api/clienti/[id]/dpa/route.ts`): misurato sui tre motori —
                Chromium, Firefox e WebKit, cioè Safari, cioè l'iPhone — e tutti
                e tre salvano `DPA-2026-0007.pdf`. Concorde con lo HTML Standard,
                «getting the suggested filename»: il nome del `Content-Disposition`
                si prende al passo 2, l'attributo `download` si guarda solo dopo,
                ai passi 7-9. Quindi l'attributo era INERTE — ma prometteva un
                nome (`DPA-<nome dello studio>.pdf`) che non esiste più da
                nessuna parte, ed è una trappola per chi lo rilegge fra sei mesi. */}
            <a
              href={`/api/clienti/${c.id}/dpa`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '44px',
                padding: '0 18px',
                borderRadius: '10px',
                background: 'var(--primary, #D90012)',
                color: '#fff',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: 'var(--sh-red)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2v8M5 8l3 3 3-3M2 12v1a1 1 0 001 1h10a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Scarica DPA PDF
            </a>
            {ultimaEmissione?.numero_dpa && dataUltimaEmissione ? (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t2)', marginTop: '6px' }}>
                Ultima emissione: <strong>{ultimaEmissione.numero_dpa}</strong> — {dataUltimaEmissione}
              </p>
            ) : null}
            {/* 🔑 La promessa sulla conservazione entra QUI e non prima: fino al
                registro (D129/D130) `generateDpa()` rendeva un PDF al volo senza
                conservare niente, e scriverla allora sarebbe stata una frase
                falsa. Adesso ogni emissione lascia la sua riga e il suo file.
                🛑 E si dice «resta conservata», MAI «per 10 anni»: i dieci anni
                sono dell'Allegato XIII punto 4 MDR e riguardano la DICHIARAZIONE
                DI CONFORMITÀ, non questo contratto (D125/D126). */}
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t3)', marginTop: '6px' }}>
              Stampa e firma in duplice copia con lo studio: una copia al laboratorio, una allo studio.
              Ogni versione emessa resta conservata da UÀ.
            </p>
          </div>
        </SectionCard>
      </div>
    </PageWrapper>
  )
}
