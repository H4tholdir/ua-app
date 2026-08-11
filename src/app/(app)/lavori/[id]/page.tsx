import { notFound } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { SchedaLavoroV3 } from '@/components/features/lavori/scheda-v3/SchedaLavoroV3'
import { getSignedUrl } from '@/lib/storage/signed-url'
import { normalizzaPrescrizione } from '@/lib/domain/prescrizione-mapper'
import { caricaTinteScheda } from '@/lib/lavori/tinta-scheda'
// 🛑 UNA CHIAMATA SOLA, E IL RUOLO CI ENTRA DENTRO: `avvisoPerLaScheda` tiene il
//    cancello di ⚖️ D342 e la lettura nella stessa funzione, e pretende `ruolo`
//    come argomento obbligatorio. Questa pagina non decide più niente, quindi non
//    c'è più niente da sbagliare qui — e la decisione sta dove una prova la
//    esercita. NON si chiama `avvisiDaComunicare` da qui: sarebbe rifare il
//    cancello a mano (sentinella in `tests/unit/scheda-v3/scheda-avviso-dentista.test.tsx`).
// 🔄 FINO ALLA REVISIONE DEL TASK 6 QUI SI IMPORTAVA DALLA ROTTA, e non era
//    innocuo: era l'unico import **di valore** verso un `route.ts` in tutto
//    `src/` (gli altri undici sono `import type` e spariscono in compilazione), e
//    tirava nel grafo di questa pagina l'intero gestore della rotta —
//    `next/server`, csrf, `lab-guard`, `getServiceClient`. `route.ts` è un file
//    speciale di Next: qualunque effetto a livello di modulo ci finisse verrebbe
//    eseguito al render della pagina. L'elenco dei ruoli vive ora in un modulo
//    FOGLIA (`src/lib/avvisi/ruoli.ts`, nessun import), che la rotta ri-esporta.
import { avvisoPerLaScheda } from '@/lib/avvisi/queries'
import type { LavoroDettaglio, DichiarazioneConformita } from '@/types/domain'

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ consegna?: string }> }

export default async function LavoroDettaglioPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { consegna } = await searchParams

  // Auth
  const context = await getLabContext()
  if (!context?.laboratorioId) notFound()

  const svc = getServiceClient()

  // Carica lavoro con tutti i join
  const { data: lavoro, error } = await svc
    .from('lavori')
    .select(`
      *,
      cliente:clienti(*),
      paziente:pazienti(*),
      tecnico:tecnici(*),
      lavorazioni:lavori_lavorazioni(*),
      appuntamenti:lavori_appuntamenti(*),
      immagini:lavori_immagini(*),
      fasi:lavori_fasi(*, fase:fasi_produzione(*)),
      materiali:lavori_materiali(*),
      ddc:dichiarazioni_conformita(*),
      denti:lavori_denti(*),
      prescrizione:lavori_prescrizioni(*),
      laboratorio:laboratori(nome, telefono)
    `)
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .neq('ddc.stato', 'annullata')
    .is('lavori_immagini.deleted_at', null)
    .single()

  if (error || !lavoro) {
    notFound()
  }

  const lavoroDettaglio = lavoro as unknown as LavoroDettaglio

  // Fix trasversale B5: le "public URL" salvate in DB sono rotte (bucket
  // documenti privato) — firma gli URL al momento del render, mai in anticipo.
  // Normalizzazione difensiva: PostgREST può restituire `dichiarazioni_conformita`
  // embedded come oggetto singolo o array a seconda della cardinalità inferita —
  // non assumere una forma specifica per questo confine esterno (mai verificato
  // empiricamente). Riassegna la proprietà così tutto il resto della pagina
  // (incluso il passaggio a TabDocumenti) vede sempre un oggetto singolo coerente.
  const ddcRaw = lavoroDettaglio.ddc as unknown as DichiarazioneConformita | DichiarazioneConformita[] | null
  lavoroDettaglio.ddc = Array.isArray(ddcRaw) ? (ddcRaw[0] ?? null) : ddcRaw

  // T7 (ondata B ③) — la scheda legge lo SNAPSHOT della prescrizione e il
  // COLORE VIVO, che è ciò che serve alla riga «Colore» (D225②).
  //
  // 🔑 Questa pagina NON passa dalla GET di `/api/lavori/[id]`: fa la sua
  //    query. I due embed che il Task 6 ha aggiunto alla rotta vanno quindi
  //    chiesti anche qui, o la scheda resta cieca — è la stessa asimmetria che
  //    ha tenuto la prescrizione fuori dalla scheda fino a oggi.
  // 🔑 `denti:lavori_denti(*)` è la STRADA DEL RITORNO del colore: dal Task 10
  //    `lavori.colore_dente` non ha più scrittori, e il colore vivo si legge
  //    dalle righe con la precedenza riga→caso di `@/lib/domain/colore-dente`.
  //    Nessun filtro `deleted_at`: quella colonna su `lavori_denti` non esiste
  //    (verificato su `database.types.ts`), e la GET della rotta la embedda
  //    allo stesso modo.
  // 🔑 `normalizzaPrescrizione` è la stessa funzione della rotta (modulo puro,
  //    Task 6): normalizza la forma array-vs-oggetto dell'embed E le guardie
  //    di dominio su `contenuto`/`divergenze`. Copiare qui un accesso diretto
  //    a `lavoro.prescrizione` sarebbe una seconda lettura dello stesso
  //    confine esterno, con le guardie in un posto solo.
  lavoroDettaglio.prescrizione = normalizzaPrescrizione(
    (lavoro as Record<string, unknown>).prescrizione
  )

  // D42 Task 7 (D247) — la tinta del manufatto, risolta col catalogo QUI.
  //
  // 🔑 `nome` e `hex` non vivono su `lavori`: lì c'è solo la coppia stabile
  //    (famiglia, codice), perché rinominare un'etichetta non deve invalidare i
  //    lavori che l'avevano scelta. Chi rende la schermata li risolve.
  // 🛑 La scheda NON interroga il catalogo dal client, e nemmeno il foglietto:
  //    le voci per la tavolozza (D247: la tinta si corregge sulla scheda)
  //    viaggiano da qui, dall'alto. Una seconda strada di lettura sarebbe una
  //    seconda verità.
  // 📮 AL TASK 8: `lavori/[id]/modifica/page.tsx` — che dichiara di replicare
  //    «FEDELMENTE il pattern dati» di questa pagina — chiama LA STESSA
  //    funzione, non ne scrive un'altra.
  const tinte = await caricaTinteScheda(svc, {
    tipo_dispositivo: lavoroDettaglio.tipo_dispositivo,
    tinta_famiglia: lavoroDettaglio.tinta_famiglia,
    tinta_codice: lavoroDettaglio.tinta_codice,
  })
  lavoroDettaglio.tinta = tinte.scelta
  lavoroDettaglio.tinteDisponibili = tinte.disponibili

  // ══ Task 6 «l'avviso al dentista» — CHI VEDE IL PROMEMORIA (⚖️ D342) ══════
  //
  // 🔑 «*La visibilità è un SOTTOINSIEME del permesso: nessuno vede un promemoria
  //    che non può chiudere*» (verbale, centoquarantottesima tornata). Un
  //    `admin_rete` che vedesse la riga toccherebbe un tasto che risponde 403.
  // 🛑 QUI NON C'È NESSUN CANCELLO DA LEGGERE, ED È IL PUNTO: il ruolo entra come
  //    argomento OBBLIGATORIO di `avvisoPerLaScheda`, che decide e legge dentro di
  //    sé. Non si può chiedere il promemoria senza dichiarare chi guarda — la
  //    chiusura è per COSTRUZIONE, e un ruolo assente non passa.
  // 🔄 FINO ALLA SECONDA REVISIONE DEL TASK 6 QUI C'ERA UN TERNARIO, e non era
  //    innocuo: `provato:` capovolgendolo, **tutte e 68 le prove restavano verdi**
  //    mentre a vedere la riga sarebbero rimasti solo i due ruoli che D342
  //    esclude. Questo file è un componente server asincrono che nessuna prova
  //    unitaria rende, quindi nessuna mutazione scritta QUI può diventare rossa.
  //    ➡️ La decisione è stata spostata dove una prova la esercita davvero
  //    (`tests/unit/avvisi-queries.test.ts`), e questa pagina si è fatta più
  //    stupida apposta.
  // 🔑 E la scelta «uno solo anche quando sono due» sta con lei, per la stessa
  //    ragione: era una riga di questa pagina, e nessuna prova la guardava.
  //
  // 🔑 La lettura entra NEL `Promise.all` che c'era già: è indipendente dalla
  //    firma degli allegati, quindi non costa un millisecondo in più di attesa.
  //    ⚠️ `caricaTinteScheda` qui sopra resta invece un `await` in fila per conto
  //    suo — inefficienza preesistente, fuori da questo mandato: riferita, non
  //    spostata (R-E2).
  const [signedDdcUrl, , avvisoDaMostrare] = await Promise.all([
    lavoroDettaglio.ddc?.storage_path_pdf
      ? getSignedUrl(svc, 'documenti', lavoroDettaglio.ddc.storage_path_pdf, 3600)
      : Promise.resolve(null),
    Promise.all(
      lavoroDettaglio.immagini.map(async (img) => {
        const signedImgUrl = await getSignedUrl(svc, 'documenti', img.storage_path, 3600)
        if (signedImgUrl) img.url = signedImgUrl
      })
    ),
    avvisoPerLaScheda({
      svc,
      lavoroId: id,
      laboratorioId: context.laboratorioId,
      ruolo: context.ruolo,
    }),
  ])
  if (signedDdcUrl && lavoroDettaglio.ddc) lavoroDettaglio.ddc.pdf_url = signedDdcUrl

  lavoroDettaglio.avvisoDaComunicare = avvisoDaMostrare

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <SchedaLavoroV3 lavoro={lavoroDettaglio} ruolo={context.ruolo} apriConsegna={consegna === '1'} />
    </div>
  )
}
