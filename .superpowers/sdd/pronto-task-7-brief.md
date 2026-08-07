# BRIEF — Task 7 del piano «Torna a `pronto` col documento intatto»

**Piano:** `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md` (Task 7)
**Spec:** `docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md` — §0, §1, §2
**Ramo:** `intervento-post-consegna` (già in checkout, albero pulito). 🛑 **MAI un git worktree.**
**Base:** `2ede802d`. I Task **1-6 sono COMPLETI** e non si rifanno.

🛑 **QUESTO TASK NON HA MIGRATION.** Le RPC che ti servono **esistono già** nel database vero e sono
state provate sul catalogo vivo: `riporta_a_pronto_atomica` (la gemella che NON annulla la
dichiarazione), `riapri_lavoro_atomica`, `crea_rifacimento_atomico` con `p_evento_id` in coda.
Niente `date -u`, niente `db push`, niente FASE 6b.

⚠️ **PORTA UN EMENDAMENTO: il «Passo 4-bis» è nato eseguendo il Task 5** — nessuno lega l'evento al
lavoro, e tu l'evento giusto ce l'hai già in mano. Non è saltabile.

---

## 🔑 CIÒ CHE IL TASK 6 HA LASCIATO IN MANO A TE (misurato, non ricordato)

1. **`destinatario_errato` NON passa da `effettoDaMotivoEScelta`.** La sua azione vive nella riga
   **fissa** di `EFFETTI_PER_MOTIVO` (⚖️ D312), e vale `'torna_pronto'`. Lo smistamento su
   `effetto.azione === 'torna_pronto'` la raccoglie comunque — **ed è così che la prova ① del Task 10
   nascerà verde.** Non costruirgli un ramo suo.
2. **In `tests/unit/eventi-qualita-route.test.ts` c'è una prova che afferma `not.toHaveBeenCalled()`
   proprio su `destinatario_errato`** (intorno alle righe 845-865), col suo commento. Era vera al
   Task 6, perché lì la rotta smistava ancora solo `riapri_lavoro`. 🛑 **È il TUO perimetro: quella
   prova va CAMBIATA, non aggirata** — dopo di te quel motivo deve chiamare `riporta_a_pronto_atomica`.
   Rileggi anche l'intestazione del blocco (righe ~771-784): dice «GLI ALTRI OTTO MOTIVI NON la
   chiamano», e dopo di te non è più la frase giusta.
3. **`MOTIVI_CON_SCELTA` è una tupla letterale** (`as const satisfies readonly Motivo[]`), non
   un'annotazione `readonly Motivo[]`: il piano si contraddiceva e ha vinto la tupla. Se ci indicizzi
   sopra, tienilo presente.
4. **`AzioneAutomatica` ha ora TRE valori.** `provato:` in tutta `src/` esiste **un solo** punto di
   smistamento — `src/app/api/lavori/[id]/eventi-qualita/route.ts:384` — ed è un confronto col
   letterale, non uno `switch`. Nessun altro consumatore legge `.azione`.
5. **Il rinominare `riapertura` in `esito_azione` tocca anche il componente:**
   `src/components/features/lavori/scheda-v3/DevoIntervenire.tsx:106` (il tipo) e `:492-513` (i
   riquadri). `tsc` te lo dice se resti a metà — **ma i riquadri oggi si disegnano SOLO per
   `riapertura`, cioè solo per `riapri_lavoro`.** 🔑 Generalizzarne il disegno e scrivere i sei testi
   nuovi è il **Task 9**, non il tuo: tu porta il rinominare fino in fondo e **lascia il resto
   dichiarato**, non fatto a metà di nascosto.

---

## Task 7 — La rotta: le guardie, le due azioni nuove, e il nome onesto

**File:**
- Modifica: `src/app/api/lavori/[id]/eventi-qualita/route.ts`
- Prova: `tests/unit/api/` (segui il nome dei vicini)

**Interfacce:**
- Consuma: `effettoDaMotivoEScelta`, `richiedeScelta`, `MOTIVI_CON_SCELTA` (T6);
  `riporta_a_pronto_atomica` (T4); `crea_rifacimento_atomico(..., p_evento_id)` (T5).
- Produce: risposta `{ evento, proposta, effetto, esito_azione? }`, dove
  `esito_azione = { stato:'applicato', dichiarazione_assente?:boolean, dichiarazione_viva?:boolean, lavoro_nuovo?:{id,numero_lavoro} } | { stato:'non_applicabile', motivo } | { stato:'fallito', messaggio }`.

- [ ] **Passo 1 — le prove di rotta, prima**

Cinque righe della §4.4 della spec, ognuna col **valore che deve essere rifiutato** e il messaggio
atteso: ① motivo con scelta, `scelta` assente → **422** · ② motivo senza scelta, `scelta` presente →
**422** · ③ `scelta: 'forse'` → **422** · ④ `destinatario_errato` + `mai_uscito_dal_lab` → **422** ·
⑤ `difetto_lavorazione` + `si_sistema` su un lavoro **non consegnato** → **201** con
`esito_azione.stato === 'non_applicabile'` (🛑 è la riga che il piano dichiara **non provata**: se
esce diversa, **fermati e riferisci**, non aggiustare il codice per farla tornare).
Più: ⑥ `si_rifa` risponde **201** con `esito_azione.lavoro_nuovo.numero_lavoro` valorizzato ·
⑦ un secondo invio con lo stesso evento **non** crea un secondo lavoro (23505 tradotto).

- [ ] **Passo 2 — falle fallire e conta le asserzioni** (R-P4), poi implementa.

- [ ] **Passo 3 — la validazione, dopo quella del motivo e PRIMA dell'insert**

```typescript
  // ── il bivio (D304 · D305) ──────────────────────────────────────────────
  // 🛑 La guardia sta QUI e non nell'interfaccia: è la lezione pagata tre volte
  // il 07/08 — una coppia incoerente (motivo, azione) che arriva a un atto che
  // crea o sposta cose non si ferma con una schermata.
  const sceltaGrezza = corpo.scelta_intervento
  let scelta: Scelta | null = null
  if (richiedeScelta(motivo)) {
    if (!inVocabolario(SCELTE, sceltaGrezza)) {
      return err('Dicci come si procede: si sistema questo manufatto, oppure se ne fa uno nuovo?', 422)
    }
    scelta = sceltaGrezza
  } else if (sceltaGrezza !== undefined && sceltaGrezza !== null) {
    // Non si scarta in silenzio: è la classe di difetto «Salvato su un dato che
    // non c'è» — stesso trattamento già riservato a `natura` (:199-201).
    return err('Su questo motivo non c\'è nessuna scelta da fare: l\'effetto si ricava dal motivo stesso.', 422)
  }

  // 🛑 GEMELLA DELLA GUARDIA SU `errore_registrazione`: se il manufatto non è mai
  // uscito dal laboratorio, non può essere andato alla persona sbagliata — quel
  // caso è «ho premuto consegna per sbaglio», che ha il suo motivo e la sua
  // transizione (distruttiva, e per questo va scelta apposta).
  if (motivo === 'destinatario_errato' && statoDispositivo === 'mai_uscito_dal_lab') {
    return err('Se il manufatto non è mai uscito dal laboratorio non può essere andato alla persona sbagliata: se hai premuto «consegna» per errore, scegli quel motivo.', 422)
  }
```
con, in cima al file: `const SCELTE = ['si_sistema', 'si_rifa'] as const`.

- [ ] **Passo 4 — l'effetto risolto e le tre azioni**

`daScrivere.scelta_intervento = scelta` (solo quando non è `null`), e poi:

```typescript
  const effetto = effettoDaMotivoEScelta(motivo, scelta)

  let esitoAzione: EsitoAzione | undefined
  if (effetto.azione === 'riapri_lavoro') {
    esitoAzione = await chiamaRipristino(svc, 'riapri_lavoro_atomica', lavoro_id, context.laboratorioId, eventoId)
  } else if (effetto.azione === 'torna_pronto') {
    esitoAzione = await chiamaRipristino(svc, 'riporta_a_pronto_atomica', lavoro_id, context.laboratorioId, eventoId)
  } else if (effetto.azione === 'crea_rifacimento') {
    esitoAzione = await creaRifacimento(svc, context.laboratorioId, lavoro_id, eventoId, motivo)
  }
```
🛑 **Il campo di risposta si chiama `esito_azione`, e `riapertura` NON resta come sinonimo**: un nome
che dice «riapertura» su un'azione che **crea** un lavoro è un testo falso, cioè il difetto già chiuso
in `classifica.ts` il 07/08. Rinomina anche il tipo (`Riapertura` → `EsitoAzione`) e **aggiorna il
lettore in `DevoIntervenire.tsx`** — se resti a metà, `tsc` te lo dice (ed è il motivo per cui la
rinomina si fa qui e non «dopo»).

- [ ] **Passo 4-bis — 🔴 EMENDAMENTO (revisione del Task 5): NESSUNO LEGA L'EVENTO AL LAVORO**

`provato:` il trigger `assert_same_lab_rifacimento` guarda **solo** `lavoro_originale_id` e
`lavoro_nuovo_id`, **mai** `evento_id`. La FK composita difende il caso «evento di un altro
laboratorio»; **non** difende «evento dello stesso laboratorio ma di un ALTRO lavoro», che passa in
silenzio. E si aggrava: `rifacimento_evento_unique` a quel punto **brucia quell'evento**, così un
rifacimento legittimo successivo su di esso uscirebbe `23505`.
➡️ **Questa rotta è l'ultimo punto in cui l'identificativo giusto può essere garantito**, e ce l'ha
già in mano: l'evento lo ha appena inserito lei, su questo lavoro. Passa **quello**, mai un valore
che arriva dal corpo della richiesta.

- [ ] **Passo 5 — `creaRifacimento`, con l'idempotenza tradotta**

```typescript
/**
 * Crea il rifacimento (D306). **NON è fail-soft** sul lavoro nuovo: se non nasce,
 * l'utente deve saperlo. È fail-soft SOLO sul trasferimento della cassetta (D309),
 * come già fa il percorso HTTP esistente — un cassetto non spostato non annulla un
 * lavoro già creato.
 */
async function creaRifacimento(
  svc: ReturnType<typeof getServiceClient>,
  laboratorio_id: string, lavoro_id: string, evento_id: string, motivo: Motivo
): Promise<EsitoAzione> {
  try {
    const { data, error } = await svc.rpc('crea_rifacimento_atomico', {
      p_lavoro_originale_id: lavoro_id,
      p_motivo: motivo,               // 'difetto_lavorazione' | 'difetto_materiale' — il CHECK li accetta da T3
      p_rilevato_in: 'post_consegna', // l'unico valore vero qui: il problema è emerso dopo la consegna
      p_costo_interno: null,
      p_note: null,
      p_evento_id: evento_id,
    })
    if (error) {
      // 23505 = questo evento ha già il suo rifacimento (T3). Non è un guasto: è
      // il secondo tocco, o il ritentativo dopo un timeout. Si restituisce quello
      // che c'è invece di crearne un altro e bruciare un progressivo.
      if (error.code === '23505') {
        const { data: gia } = await svc
          .from('lavori_rifacimenti')
          .select('lavoro_nuovo:lavori!lavori_rifacimenti_lavoro_nuovo_id_fkey(id, numero_lavoro)')
          .eq('laboratorio_id', laboratorio_id)
          .eq('evento_id', evento_id)
          .maybeSingle()
        const nuovo = (gia as { lavoro_nuovo?: { id: string; numero_lavoro: string } } | null)?.lavoro_nuovo
        if (nuovo) return { stato: 'applicato', lavoro_nuovo: nuovo }
      }
      console.error('[EVENTI-QUALITA] crea_rifacimento_atomico fallita:', error)
      return { stato: 'fallito', messaggio: MESSAGGIO_RIFACIMENTO_FALLITO }
    }
    const r = data as { lavoro_nuovo_id?: string; numero_lavoro?: string }
    if (!r?.lavoro_nuovo_id || !r?.numero_lavoro) {
      console.error('[EVENTI-QUALITA] crea_rifacimento_atomico: risposta inattesa', data)
      return { stato: 'fallito', messaggio: MESSAGGIO_RIFACIMENTO_FALLITO }
    }
    await trasferisciCassetta(svc, laboratorio_id, lavoro_id, r.lavoro_nuovo_id) // D309, fail-soft
    return { stato: 'applicato', lavoro_nuovo: { id: r.lavoro_nuovo_id, numero_lavoro: r.numero_lavoro } }
  } catch (e) {
    console.error('[EVENTI-QUALITA] crea_rifacimento_atomico — eccezione:', e)
    return { stato: 'fallito', messaggio: MESSAGGIO_RIFACIMENTO_FALLITO }
  }
}

const MESSAGGIO_RIFACIMENTO_FALLITO =
  'La registrazione è salva, ma il lavoro nuovo non è stato creato: crealo dalla scheda, oppure riprova fra un momento.'
```
🛑 **`trasferisciCassetta` NON si riscrive**: la funzione esiste in
`src/app/api/lavori/[id]/rifacimento/route.ts` (`trasferisciCassettaAlRifacimento`). **Estraila** in
un modulo condiviso — `src/lib/rifacimento/cassetta.ts` — e falla importare da **entrambe** le rotte. *(da creare)*
Due copie sono «le liste scritte due volte» in forma di codice, e il difetto è che i due percorsi che
creano lo stesso oggetto **divergerebbero**.

- [ ] **Passo 6 — verde + `tsc` + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx vitest run tests/unit/api 2>&1 | tail -8 && npx tsc --noEmit > /tmp/tsc.log 2>&1; echo "uscita=$?"
git add -A && git commit -m "feat(qualita): la rotta deriva il bivio, chiama le due azioni nuove e dice l'esito vero"
```

---

