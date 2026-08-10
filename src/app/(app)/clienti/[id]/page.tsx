import { notFound } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PortaleLinkButtons } from '@/components/features/clienti/PortaleLinkButtons'
import { PortaleFatturazioneCard } from '@/components/features/clienti/PortaleFatturazioneCard'
import { ClienteModificaButton } from '@/components/features/clienti/ClienteModificaButton'
import { ScaricaDpaButton } from '@/components/features/clienti/ScaricaDpaButton'
import { BloccoAvvisoRicarica } from '@/components/feedback/BloccoAvvisoRicarica'
import { puoEmettereDpa } from '@/lib/pdf/permessi-dpa'
// Task 9 dell'ondata «l'avviso al dentista» — l'archivio delle comunicazioni
// (⚖️ D337 · D352). Il cancello di ruolo vive DENTRO `archivioPerSchedaCliente`
// (`src/lib/avvisi/queries.ts`): questa pagina non ripete `puoVedereArchivioCliente`
// a mano — lo propaga passando `context.ruolo`, stesso modello di `puoEmettere` qui
// sopra ma con la chiusura fail-closed dentro la lettura stessa, non nel JSX.
import { archivioPerSchedaCliente } from '@/lib/avvisi/queries'
import {
  nomiComunicatori,
  numeriLavoro,
  costruisciRigheArchivio,
  etichettaVisto,
  type RigaArchivioCliente,
} from '@/lib/avvisi/archivio'

type PageProps = { params: Promise<{ id: string }> }

type ClienteDettaglio = {
  id: string
  studio_nome: string | null
  nome: string
  cognome: string
  telefono: string | null
  cellulare_whatsapp: string | null
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

/**
 * Una riga dell'archivio «Comunicazioni» — Task 9, ⚖️ D337 · D336.
 *
 * 🛑 STESSA FORMA NEUTRA PER OGNI STATO, ED È IL PUNTO: la pastiglia di
 *    `comeLabel` usa SEMPRE `--elv`/`--t2` — mai `--amber` (l'unico colore di
 *    richiamo che questa pagina già conosce, sulla riga «Non soggetto a
 *    fattura elettronica» qui sopra), mai un rosso. ⚖️ D337 vieta un segnale
 *    d'allarme anche per una riga ancora `da_comunicare`: qui non c'è NESSUNA
 *    differenza di stile fra una riga aperta e una chiusa — solo il TESTO
 *    cambia (`riga.comeLabel`, `riga.quando`, `riga.chi`), mai il colore.
 *    Motivato nel resoconto del Task 9.
 */
function RigaComunicazione({ riga }: { riga: RigaArchivioCliente }) {
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: '1px solid var(--elv, #EDEDEA)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--t2, #4A3D33)',
            background: 'var(--elv, #EDEDEA)',
            borderRadius: '6px',
            padding: '3px 10px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {riga.comeLabel}
        </span>
        {riga.quando && (
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--t3, #6B5C51)' }}>
            {riga.quando}
          </span>
        )}
      </div>

      {/* ⚖️ D356 — il numero del lavoro, sullo stesso formato di
          `pazienti/[id]/page.tsx:63` (`#{numero_lavoro}`, senza etichetta
          aggiuntiva): la pagina gemella per anagrafica mostra i lavori
          esattamente così. `null` (lavoro non risolto: id orfano, lettura
          fallita) → niente riga, mai un crash. */}
      {riga.numeroLavoro && (
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--t3, #6B5C51)' }}>
          #{riga.numeroLavoro}
        </span>
      )}

      {riga.chi && (
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 600, color: 'var(--t1, #1C1916)' }}>
          {riga.chi}
        </span>
      )}

      {riga.campiDescritti.length > 0 && (
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--t2, #4A3D33)', lineHeight: 1.4 }}>
          Corretto: {riga.campiDescritti.join(', ')}
        </span>
      )}

      {/* ⚖️ D357 — le TRE forme (aperta/chiusa-non-vista/vista) le sceglie
          `etichettaVisto`, provata in `avvisi-archivio.test.ts`: questo
          componente non può portare una prova unitaria (componente SERVER
          asincrono), quindi la parola si decide dove una prova la esercita
          davvero. Lo STILE resta identico nelle tre forme (⚖️ D337). */}
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t3, #6B5C51)' }}>
        {etichettaVisto(riga)}
      </span>
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
      id, studio_nome, nome, cognome, telefono, cellulare_whatsapp, email,
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
  const [
    { data: emissioneRaw, error: erroreRegistro },
    { data: labFiscale, error: erroreLabFiscale },
    righeArchivioAvviso,
  ] = await Promise.all([
    svc
      .from('data_processing_agreements')
      .select('numero_dpa, emesso_at')
      .eq('laboratorio_id', context.laboratorioId)
      .eq('dentista_id', c.id)
      .not('numero_dpa', 'is', null)
      .is('deleted_at', null)
      .order('emesso_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // 🔑 I dati fiscali del LABORATORIO non stanno nel contesto: `lab-context.ts:19`
    //    porta solo `stato`, `trial_ends_at` e `nome`. Senza questa lettura la
    //    scheda non può sapere in anticipo che l'emissione fallirà, e il titolare
    //    di un laboratorio senza Partita IVA lo scoprirebbe premendo — su OGNI
    //    dentista, uno per uno.
    // 🛑 In PARALLELO, mai in fila: questa pagina si apre a ogni scheda dentista,
    //    e due andate e ritorni in sequenza si SOMMANO. Nessun `await` dentro
    //    l'array: le due partono entrambe prima che l'una risponda.
    svc
      .from('laboratori')
      .select('partita_iva, codice_fiscale')
      .eq('id', context.laboratorioId)
      .maybeSingle(),
    // Task 9 — l'archivio «Comunicazioni» (⚖️ D337 · D352). Il cancello di
    // ruolo vive DENTRO `archivioPerSchedaCliente`: per `admin_rete`/
    // `admin_sistema` questa promessa risolve a `[]` SENZA interrogare
    // `avvisi_dentista` (fail-closed, provato in `avvisi-queries.test.ts`).
    archivioPerSchedaCliente({ svc, clienteId: c.id, laboratorioId: context.laboratorioId, ruolo: context.ruolo }),
  ])

  // 🛑 Un guasto di LETTURA non è «non è mai stato emesso»: sono due fatti
  //    diversi e vanno detti diversi (stessa distinzione di
  //    `generate-dpa.ts:134-145`). Qui però NON si ferma la pagina — la scheda
  //    del cliente serve anche senza questa riga, e toglierla tutta per un
  //    dettaglio informativo sarebbe un danno più grande del difetto. Il fatto
  //    resta nei log, dove lo legge chi ripara.
  if (erroreRegistro) {
    console.error('ClienteDettaglioPage — registro DPA non leggibile:', c.id, erroreRegistro.message)
  }
  // 🛑 STESSA distinzione, e qui pesa ancora di più: «non sono riuscito a
  //    leggere» NON è «il dato non c'è». Se questo guasto si trasformasse in
  //    «Mancano i dati del tuo laboratorio», il titolare andrebbe in
  //    /impostazioni a cercare una Partita IVA che è già scritta lì. Sotto, la
  //    prevenzione si arrende: il tasto resta vivo e decide la rotta, che il
  //    controllo lo rifà comunque (D159 — la prevenzione non sostituisce il 422).
  if (erroreLabFiscale) {
    console.error('ClienteDettaglioPage — dati fiscali del laboratorio non leggibili:', context.laboratorioId, erroreLabFiscale.message)
  }

  // Task 9 — «chi» ha comunicato — e Task 9-ter (⚖️ D356) — «quale lavoro»:
  // due letture di supporto SU `utenti`/`lavori`, non su `avvisi_dentista`
  // (brief §1: «nessuna query nuova [sulla tabella]»).
  // 🛑 Sequenziali rispetto al `Promise.all` di sopra (dipendono dagli id
  //    appena letti: `comunicato_da`/`lavoro_id` di ogni riga, quindi non
  //    possono partire prima) ma IN PARALLELO fra loro — stessa regola «mai
  //    in fila» del `Promise.all` qui sopra: nessuna delle due dipende
  //    dall'altra.
  const [nomiComunicanti, numeriDeiLavori] = await Promise.all([
    nomiComunicatori(svc, righeArchivioAvviso.map((r) => r.comunicato_da), context.laboratorioId),
    numeriLavoro(svc, righeArchivioAvviso.map((r) => r.lavoro_id), context.laboratorioId),
  ])
  const righeComunicazioni = costruisciRigheArchivio(righeArchivioAvviso, nomiComunicanti, numeriDeiLavori)

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

  // ── Prevenire lo scarico che fallirebbe (D159) ──────────────────────────────
  // 🛑 `&&` e non `||`, IDENTICO a `validateDpaData` (`generate-dpa.ts:80,83`):
  //    ne basta UNO dei due perché l'emissione proceda, ed è per questo che il
  //    messaggio dice «la Partita IVA **o** il Codice Fiscale». Con `||` il tasto
  //    si spegnerebbe su dentisti che emetterebbero benissimo — un difetto che a
  //    occhio non si vede, perché il caso più comune (ha entrambi, o ha solo la
  //    Partita IVA) resta identico con tutti e due gli operatori.
  // ⚠️ `!erroreLabFiscale`: senza, un guasto di lettura diventerebbe un'accusa.
  const mancaLab = !erroreLabFiscale && !labFiscale?.partita_iva && !labFiscale?.codice_fiscale
  const mancaCliente = !c.partita_iva && !c.codice_fiscale
  // Il laboratorio VINCE sul cliente: lì si rimedia una volta per tutti gli
  // studi, qui solo per questo.
  const mancanzaDpa: 'laboratorio' | 'cliente' | null = mancaLab ? 'laboratorio' : mancaCliente ? 'cliente' : null

  // D158: chi non può emettere non vede il tasto — non lo vede SPENTO, non lo
  // vede affatto. Fino al 02/08/2026 questa pagina non guardava il ruolo, unica
  // fra le undici che lo guardano: un tecnico vedeva un tasto rosso che per lui
  // non si sarebbe acceso MAI, e premendolo riceveva un 403 in JSON a schermo.
  // 🛑 QUESTO È CORTESIA VISIVA, NON UN CONTROLLO DI SICUREZZA. La protezione
  //    vera è quella della rotta (`puoEmettereDpa` in `api/clienti/[id]/dpa`),
  //    che gira sul server a ogni richiesta. I due NON si sostituiscono: chi un
  //    giorno leggesse questa riga come «il permesso è già controllato» e
  //    togliesse quella della rotta aprirebbe l'emissione a chiunque.
  const puoEmettere = puoEmettereDpa(context.ruolo)

  const modButton = (
    <ClienteModificaButton
      cliente={{
        id: c.id,
        studio_nome: c.studio_nome,
        nome: c.nome,
        cognome: c.cognome,
        telefono: c.telefono,
        cellulare_whatsapp: c.cellulare_whatsapp,
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

        {/* Comunicazioni — l'archivio di ⚖️ D337 (Task 9): quando · come · chi ·
            se e quando l'ha aperta. Sola lettura, cancello di ruolo ⚖️ D352
            (`titolare` · `tecnico` · `front_desk`) dentro `archivioPerSchedaCliente`.
            🛑 La card resta SEMPRE a schermo, anche vuota — stesso modello della
            card DPA qui sotto (D160: «chi non vede il tasto vede comunque tutto
            il resto»): un archivio si CONSULTA, e una sezione che sparisce a
            seconda del ruolo rivelerebbe implicitamente che qualcosa esiste ma
            è nascosto. Un ruolo escluso e un archivio genuinamente vuoto
            mostrano perciò la STESSA schermata — di proposito, nessuna fuga di
            informazione su «c'è qualcosa che non puoi vedere». */}
        <SectionCard title="Comunicazioni">
          {righeComunicazioni.length === 0 ? (
            <div style={{ padding: '10px 0' }}>
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: 'var(--t2, #4A3D33)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                Nessuna comunicazione registrata per questo studio.
              </p>
            </div>
          ) : (
            righeComunicazioni.map((riga) => <RigaComunicazione key={riga.id} riga={riga} />)
          )}
        </SectionCard>

        {/* DPA GDPR Art. 28 */}
        <SectionCard title="Privacy — GDPR">
          <div style={{ padding: '12px 0' }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--t2)', marginBottom: '10px', lineHeight: 1.5 }}>
              Accordo di Responsabile del Trattamento (DPA) ex Art. 28 GDPR — da firmare con lo studio dentistico.
            </p>
            {/* 🛑 Qui NON c'è più una `<a href>`, ed è il cuore di P17: premere
                un collegamento era una NAVIGAZIONE, quindi un errore della rotta
                finiva a schermo come `{"error":"…"}` — titolo vuoto, zero
                elementi premibili, e in una PWA installata nemmeno un «indietro».
                📌 Il NOME DEL FILE resta una cosa del server, come prima: lo
                decide il `Content-Disposition` della rotta, e adesso è
                `ScaricaDpaButton` a rileggerlo (`nomeDaHeader`) — con `fetch` il
                file arriva grezzo su un indirizzo `blob:`, che di intestazioni
                non ne ha nessuna. La spiegazione per intero, col difetto già
                pagato che protegge (due emissioni dello stesso dentista, a un
                anno di distanza, con lo STESSO nome), vive lì e in una copia
                sola: non rimetterla qui.
                D158/D160: chi non può emettere non vede il tasto, ma vede tutto
                il resto — chi sta al banco deve poter rispondere allo studio al
                telefono («sì, risulta emesso il 12 marzo») senza riemetterlo. */}
            {puoEmettere && <ScaricaDpaButton clienteId={c.id} mancanza={mancanzaDpa} />}

            {/* 🛑 TRE casi, non due. Prima, se il registro non si leggeva, la riga
                spariva — identica a «mai emesso». Sono fatti OPPOSTI: uno dice
                «ho letto e non c'è», l'altro «non sono riuscito a leggere», e
                confonderli può far riemettere un contratto che esiste già. */}
            {erroreRegistro ? (
              /* 🔄 Il tasto «Ricarica» APPROVATO in D161 arriva qui il 02/08/2026:
                 il Task 4 aveva reso il blocco SENZA azione, e l'aveva riferito.
                 🔑 Il motivo del ritardo, e il motivo per cui adesso c'è un
                 componente in mezzo: questa pagina gira sul SERVER, e una
                 funzione (`onClick`) non attraversa il confine RSC. Il ponte
                 client sta in `BloccoAvvisoRicarica` — qui non cambia nient'altro
                 (stesso blocco, stesso tipo, stesse parole).
                 📌 Fuori da `puoEmettere` DI PROPOSITO: chi non emette vede tutto
                 il resto (D160), e rileggere un registro è innocuo per chiunque —
                 chi sta al banco deve poter riprovare senza chiamare il titolare. */
              <BloccoAvvisoRicarica
                tipo="attesa"
                titolo="Non riesco a leggere il registro"
                testo="Il contratto potrebbe essere già stato emesso: questa riga non fa fede."
              />
            ) : ultimaEmissione?.numero_dpa && dataUltimaEmissione ? (
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t2)', marginTop: '6px' }}>
                Ultima emissione: <strong>{ultimaEmissione.numero_dpa}</strong> — {dataUltimaEmissione}
              </p>
            ) : (
              /* 🛑 `--t1` e non `--t2`: questa riga NON c'era, e un testo NUOVO non
                 deve nascere col difetto che si è scelto di rimandare. `--t2` dà
                 4,45:1 sul fondo card scuro, sotto il minimo di 4,5 (P16, deferita
                 da D134 — la riga «Ultima emissione» qui sopra ci resta apposta). */
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: 'var(--t1, #1C1916)', marginTop: '6px' }}>
                Non ancora emesso per questo studio.
              </p>
            )}
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
