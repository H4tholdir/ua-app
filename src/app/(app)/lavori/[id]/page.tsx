import { notFound } from 'next/navigation'
import { getLabContext } from '@/lib/supabase/lab-context'
import { getServiceClient } from '@/lib/supabase/server-service'
import { SchedaLavoroV3 } from '@/components/features/lavori/scheda-v3/SchedaLavoroV3'
import { getSignedUrl } from '@/lib/storage/signed-url'
import { normalizzaPrescrizione } from '@/lib/domain/prescrizione-mapper'
import { caricaTinteScheda } from '@/lib/lavori/tinta-scheda'
import { avvisiDaComunicare } from '@/lib/avvisi/queries'
// 🛑 IL CANCELLO PER RUOLO SI LEGGE DA DOVE VIVE, e non se ne tiene una copia:
//    `@/lib/avvisi/ruoli` è un modulo FOGLIA — nessun import, quindi lo possono
//    leggere il server, il browser e una prova. Due elenchi di permessi divergono:
//    in questa casa è già successo con `admin_sistema`, dimenticato per giorni pur
//    essendo usato 15 volte.
// 🔄 FINO ALLA REVISIONE DEL TASK 6 QUESTA RIGA IMPORTAVA DALLA ROTTA, e non era
//    innocuo: era l'unico import **di valore** verso un `route.ts` in tutto
//    `src/` (gli altri undici sono `import type` e spariscono in compilazione), e
//    tirava nel grafo di questa pagina l'intero gestore della rotta —
//    `next/server`, csrf, `lab-guard`, `getServiceClient`. `route.ts` è un file
//    speciale di Next: qualunque effetto a livello di modulo ci finisse verrebbe
//    eseguito al render della pagina. Ora l'elenco vive in un modulo FOGLIA
//    (`src/lib/avvisi/ruoli.ts`, nessun import), che la rotta ri-esporta.
import { puoVedereAvviso } from '@/lib/avvisi/ruoli'
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
  // 🛑 FAIL-CLOSED SENZA UN SECONDO RAMO: un ruolo assente, nuovo o scritto male
  //    non è un caso a parte — `includes()` risponde `false` e non si legge
  //    niente. Un ramo in più per «ruolo sconosciuto» sarebbe un posto in più
  //    dove sbagliare il verso del confronto.
  // 🔑 E IL CANCELLO STA QUI, NON NELLA SCHEDA: deciderlo dal server è
  //    STRETTAMENTE MEGLIO, perché l'identificativo dell'avviso non entra nemmeno
  //    nella pagina di chi non potrebbe chiuderlo. (Prima della revisione del Task
  //    6 era anche l'unica strada possibile — la costante viveva nella rotta, e un
  //    componente client non poteva importarla; ora `@/lib/avvisi/ruoli` è una
  //    foglia leggibile da entrambe le parti, quindi la scelta è di merito.)
  // ⚠️ **LIMITE DICHIARATO, e nessuna prova lo copre oggi:** questo ternario è la
  //    sola riga del cancello che nessuna prova esercita a runtime — capovolgerlo
  //    lascerebbe verdi tutte le prove unitarie, perché questo file è un
  //    componente server asincrono che nessuna di esse rende. Il predicato **è**
  //    provato contro i cinque ruoli veri (`tests/unit/avvisi-ruoli.test.ts`); il
  //    suo *uso* qui lo prova solo il giro sul banco del **Task 10**.
  const mostraIlPromemoria = puoVedereAvviso(context.ruolo)

  // 🔑 La lettura entra NEL `Promise.all` che c'era già: è indipendente dalla
  //    firma degli allegati, quindi non costa un millisecondo in più di attesa.
  //    ⚠️ `caricaTinteScheda` qui sopra resta invece un `await` in fila per conto
  //    suo — inefficienza preesistente, fuori da questo mandato: riferita, non
  //    spostata (R-E2).
  const [signedDdcUrl, , avvisiAperti] = await Promise.all([
    lavoroDettaglio.ddc?.storage_path_pdf
      ? getSignedUrl(svc, 'documenti', lavoroDettaglio.ddc.storage_path_pdf, 3600)
      : Promise.resolve(null),
    Promise.all(
      lavoroDettaglio.immagini.map(async (img) => {
        const signedImgUrl = await getSignedUrl(svc, 'documenti', img.storage_path, 3600)
        if (signedImgUrl) img.url = signedImgUrl
      })
    ),
    mostraIlPromemoria
      ? avvisiDaComunicare(svc, { lavoroId: id, laboratorioId: context.laboratorioId })
      : Promise.resolve([]),
  ])
  if (signedDdcUrl && lavoroDettaglio.ddc) lavoroDettaglio.ddc.pdf_url = signedDdcUrl

  // ⚠️ UNO SOLO, ANCHE QUANDO SONO DUE — e il fatto è vero, non teorico:
  //    `correggi_e_riemetti_atomica` fa un `INSERT` incondizionato, quindi due
  //    riemissioni non comunicate lasciano DUE righe aperte sullo stesso lavoro.
  //    Si mostra la **più vecchia** (la lettura ordina crescente): due righe
  //    identiche sulla stessa carta non direbbero niente a nessuno, e chiudendo
  //    la prima la riga ricompare per la seconda — che è la verità, non un
  //    difetto: il promemoria non si spegne da solo finché un obbligo resta.
  lavoroDettaglio.avvisoDaComunicare = avvisiAperti[0] ?? null

  return (
    <div data-ds="v3" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <SchedaLavoroV3 lavoro={lavoroDettaglio} ruolo={context.ruolo} apriConsegna={consegna === '1'} />
    </div>
  )
}
