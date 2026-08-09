import { describe, it, expect } from 'vitest'
import { withRollback, skipIntegrationTests } from './helpers/pg-client'
import { COLONNE } from '@/lib/avvisi/queries'

// LE COLONNE CHE `src/lib/avvisi/queries.ts` CHIEDE ESISTONO DAVVERO.
// Nato dalla revisione del Task 6 dell'ondata «l'avviso al dentista».
//
// 🔴 IL BUCO CHE CHIUDE, e non è teorico. Le due letture ripiegano su una lista
//    vuota quando il banco risponde errore (`vuotoConNota`): è la scelta di
//    `caricaTinteScheda`, ed è giusta — far cadere la scheda intera sarebbe
//    peggio. Ma nessuna prova legava `COLONNE` allo schema, e `data as unknown as
//    AvvisoRiga[]` toglie a `tsc` ogni modo di accorgersi di un nome sbagliato.
//    ➡️ Il giorno in cui una colonna venisse rinominata, la lettura risponderebbe
//    errore, il promemoria **ex Art. 19 GDPR sparirebbe per sempre e in
//    silenzio**, e le dodici prove unitarie resterebbero **verdi**: interrogano un
//    finto, e un finto non ha uno schema da smentire.
//
// 🛑 SOLA LETTURA, ZERO RIGHE. `LIMIT 0` non ha bisogno che la tabella contenga
//    niente, quindi il `REVOKE` dell'`INSERT` su `avvisi_dentista` — la ragione
//    dichiarata nel Task 6 per non scrivere una prova d'integrazione — non
//    riguarda questo caso. E la transazione è comunque annullata.
//
// 🔑 PERCHÉ `pg` E NON IL CLIENT SUPABASE, che sarebbe la strada vera del codice.
//    `provato:` letto `.github/workflows/ci.yml` — il passo «Unit tests» riceve
//    `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
//    `SUPABASE_DB_URL`, e **NON** `SUPABASE_SERVICE_ROLE_KEY`. Una prova che
//    costruisse il client di servizio si sarebbe quindi **saltata in CI**, cioè
//    proprio il silenzio che questa prova esiste per rompere. `SUPABASE_DB_URL` è
//    il cancello che CI onora (D333), ed è quello di tutte le sorelle in questa
//    cartella. `COLONNE` è un semplice elenco di colonne: SQL e PostgREST
//    rifiutano gli stessi nomi.
//    ⚠️ Se un giorno `COLONNE` guadagnasse sintassi PostgREST (un alias, un
//    embed `cliente:clienti(*)`), questa prova diventerebbe rossa **con ragione**:
//    quel giorno la lettura non è più un elenco di colonne, e va ripensata.
//
// 🛑 E LE COLONNE SI IMPORTANO, NON SI RICOPIANO. Ribattere qui gli undici nomi
//    farebbe una prova che resta verde su `queries.ts` rinominato: proverebbe la
//    propria copia, non il codice.

describe.skipIf(skipIntegrationTests)('avvisi_dentista — le colonne che il codice chiede esistono', () => {
  it('la `select` di `queries.ts` gira sul banco vero, a zero righe', async () => {
    await withRollback(async (client) => {
      // Un nome sbagliato dentro COLONNE → 42703 «column … does not exist».
      const { rows } = await client.query(
        `SELECT ${COLONNE} FROM public.avvisi_dentista LIMIT 0`
      )
      expect(rows).toHaveLength(0)
    })
  })

  it('e anche i nomi dei FILTRI e degli ORDINAMENTI, che in `COLONNE` non ci sono tutti', async () => {
    // 🔑 `laboratorio_id` è l'unico identificativo che le due letture usano e che
    //    `COLONNE` non nomina — ed è quello che regge l'isolamento fra laboratori
    //    su una strada dove `service_role` scavalca la RLS. Se sparisse dallo
    //    schema, la query morirebbe e il ripiego la renderebbe muta.
    //    Gli altri (`lavoro_id`, `cliente_id`, `stato`, `created_at`, `id`) sono
    //    già dentro `COLONNE`: qui si prova che reggano anche come predicato e
    //    come criterio d'ordine, cioè nella posizione in cui il codice li mette.
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT ${COLONNE} FROM public.avvisi_dentista
          WHERE laboratorio_id = $1 AND lavoro_id = $1 AND cliente_id = $1
            AND stato = ANY($2::text[])
          ORDER BY created_at ASC, id ASC
          LIMIT 0`,
        ['00000000-0000-0000-0000-000000000000', ['da_comunicare']]
      )
      expect(rows).toHaveLength(0)
    })
  })

  it('l’elenco chiesto è TUTTA la tabella meno `laboratorio_id`, e l’omissione è dichiarata', async () => {
    // 🛑 IL VERSO OPPOSTO, e senza di lui la prova sopra sarebbe metà. Un nome
    //    TOLTO da `COLONNE` non fa fallire nessuna `select`: la lettura riesce e
    //    la riga arriva con un campo `undefined`, che `AvvisoRiga` promette
    //    presente. È il modo silenzioso di rompere il Task 9, che di queste
    //    colonne ha bisogno tutte («quando · come · chi · se l'ha aperta»).
    // 🔑 `laboratorio_id` è l'unica esclusa, di proposito: è un FILTRO, non un
    //    dato da mostrare — chi chiama le due letture il laboratorio ce l'ha già
    //    in mano, e rimandarglielo indietro non serve a nessuna schermata.
    // ⚠️ E se un giorno una migration aggiungesse una colonna a questa tabella,
    //    questa riga diventerà rossa: è voluto. Una colonna nuova che nessuna
    //    lettura chiede è una decisione, non un caso — la si prende guardando
    //    `queries.ts`, non lasciando che il dato resti invisibile.
    await withRollback(async (client) => {
      const { rows } = await client.query(
        `SELECT attname FROM pg_attribute
          WHERE attrelid = 'public.avvisi_dentista'::regclass
            AND attnum > 0 AND NOT attisdropped
          ORDER BY attnum`
      )
      const nelBanco = rows.map((r) => r.attname as string)
      const chieste = COLONNE.split(',').map((c) => c.trim())
      expect([...chieste].sort()).toEqual(nelBanco.filter((c) => c !== 'laboratorio_id').sort())
      expect(chieste).not.toContain('laboratorio_id')
    })
  })
})
