# BRIEF — Task 8 del piano «Torna a `pronto` col documento intatto»

**Piano:** `docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md` (Task 8)
**Spec:** `docs/superpowers/specs/2026-08-07-torna-a-pronto-documento-intatto-design.md` — **§1 e §1.1
per prime**: sono il difetto che questo compito esiste per chiudere, e portano il testo di **D308**.
**Ramo:** `intervento-post-consegna` (già in checkout, albero pulito). 🛑 **MAI un git worktree.**
**Base:** `59e1628e`. I Task **1-7 sono COMPLETI** e non si rifanno.

🛑 **QUESTO TASK NON HA MIGRATION.** Niente `date -u`, niente `db push`, niente FASE 6b.

## 🔴 PERCHÉ QUESTO COMPITO È URGENTE, e non solo dovuto

La revisione del Task 7 ha misurato che **la porta che questo compito chiude è aperta ADESSO da TRE
motivi**, non più da uno: da quando i tre percorsi «torna a `pronto`» funzionano, un lavoro può tornare
fra quelli pronti **con la sua dichiarazione ancora viva**, e da lì la PATCH lascia cambiare
`paziente_id`, `cliente_id`, `richiedente_nome`, `tipo_dispositivo`, `descrizione` — cioè le voci che
sono **stampate sul documento già consegnato**.
➡️ **Un dispositivo può uscire accompagnato da una dichiarazione che nomina un'altra persona, e ogni
controllo resta verde**: `precheckMDR` misura il lavoro vivo e non guarda mai la dichiarazione, e
`generateDdC` trova quella viva e restituisce quella senza rigenerare nulla.
**Art. 21(2) MDR:** la dichiarazione è messa a disposizione di **un determinato paziente**, identificato
per nome o codice. **L'identità è la cosa che non può divergere.**

## 🔑 CIÒ CHE I COMPITI PRECEDENTI TI LASCIANO IN MANO (misurato, non ricordato)

1. **Il predicato «esiste una dichiarazione viva» ESISTE GIÀ** ed è `stato <> 'annullata'`
   (`supabase/migrations/20260807182614_*.sql:92-94`). 🛑 **Usa quello, mai un elenco di stati
   enumerati**: due definizioni della stessa cosa divergono, ed è la riga 22 della coda di ROADMAP
   («le liste scritte due volte»). Se ti serve in TypeScript, la forma è la stessa: *diverso da
   annullata*, non *uguale a uno di questi*.
2. **Nessun nome esce dall'allowlist.** `PATCHABLE_FIELDS` non perde chiavi: si **aggiunge un cancello**
   sopra cinque di esse. 🔑 La ragione sta in `CLAUDE.md` §9: una chiave tolta dall'allowlist viene
   **scartata in silenzio** e l'utente legge «Salvato» su un dato che non c'è.
3. **Il rifiuto DEVE nominare la strada giusta**, non solo vietare: la riemissione esiste già ed è il
   motivo `errore_dato_dichiarazione` del foglio «Devo intervenire». È l'idioma già in casa — la
   guardia di `errore_registrazione` (`eventi-qualita/route.ts`) rifiuta **e nomina il motivo**.
   ⚖️ **D262: «la PWA non dà blocchi, dà aiuti.»**
4. **Il confine è più largo del perimetro dell'ondata, ed è deliberato** (spec §1.1): la regola vale per
   **ogni** lavoro con dichiarazione viva, non solo per quelli tornati a `pronto` da qui.
5. ⚠️ **Non contraddice la direttiva del 27/07** («ogni campo si corregge fino alla consegna»): il
   confine di quella finestra lo ha fissato il panel normativo del 29/07 e **si aggancia all'emissione
   della dichiarazione**. Con una dichiarazione viva la finestra è chiusa **per quelle cinque voci
   soltanto**; ogni altro campo resta correggibile. Scrivilo nel commento, o la prossima persona lo
   leggerà come una violazione della direttiva.

---

## Task 8 — D308: i campi stampati non si correggono di nascosto

**File:**
- Modifica: `src/app/api/lavori/[id]/route.ts`
- Prova: le prove della PATCH (segui i vicini)

**Interfacce:**
- Consuma: nulla. Produce: **422** su cinque campi quando esiste una dichiarazione viva.

🔑 **Perché questo task è dentro quest'ondata e non è fuori tema:** senza, la transizione di T4 apre la
strada per cui un manufatto esce con una dichiarazione che nomina **un'altra persona** — l'annullamento
del documento era anche il meccanismo che faceva arrivare le correzioni sulla carta (§1 della spec).

- [ ] **Passo 1 — la prova, prima**

Su un lavoro **con** dichiarazione viva: ① `PATCH { descrizione: 'x' }` → **422**, e il messaggio
**nomina il percorso** («Devo intervenire» → «dato sbagliato sulla dichiarazione») · ② `PATCH { note:
'x' }` sullo **stesso** lavoro → **200** (la finestra si chiude su cinque voci, non su tutto) ·
③ su un lavoro **senza** dichiarazione viva, `PATCH { descrizione: 'x' }` → **200**.

- [ ] **Passo 2 — il codice**, dopo aver letto la riga del lavoro e prima di applicare l'aggiornamento:

```typescript
/**
 * ⚖️ D308 — I CINQUE CAMPI STAMPATI NON SI CORREGGONO FINCHÉ LA DICHIARAZIONE È VIVA.
 *
 * 🔑 Il fatto che l'ha generata: togliere l'annullamento della dichiarazione (per
 * non cancellare la prova di una consegna avvenuta, D293) ha spento il meccanismo
 * che faceva arrivare le correzioni sul documento. Senza questo cancello, un
 * manufatto può uscire con una dichiarazione che nomina un'altra persona, e ogni
 * controllo resta verde: precheckMDR misura il lavoro vivo, mai la dichiarazione,
 * e generateDdC restituisce quella già emessa.
 *
 * 🛑 NON è un blocco cieco (D262: la PWA dà aiuti, non blocchi): il messaggio
 * nomina il percorso che RIEMETTE, costruito ieri e già provato.
 */
const CAMPI_STAMPATI = ['paziente_id', 'cliente_id', 'richiedente_nome', 'tipo_dispositivo', 'descrizione'] as const

// … dentro la PATCH, dopo aver caricato il lavoro:
const toccati = CAMPI_STAMPATI.filter((c) => c in aggiornamenti)
if (toccati.length > 0) {
  const { count } = await svc
    .from('dichiarazioni_conformita')
    .select('id', { count: 'exact', head: true })
    .eq('lavoro_id', lavoro_id)
    .eq('laboratorio_id', context.laboratorioId)
    .neq('stato', 'annullata')
  if ((count ?? 0) > 0) {
    return err(
      'Questo dato è già stampato sulla dichiarazione consegnata, e cambiarlo qui la lascerebbe indietro. Per correggerlo apri «Devo intervenire» e scegli «dato sbagliato sulla dichiarazione»: l\'app rifà il documento e conserva quello vecchio.',
      422
    )
  }
}
```
⚠️ **`count` con `head: true` non porta righe**: è il modo giusto di chiedere «ce n'è almeno una»
senza scaricare la dichiarazione intera.

- [ ] **Passo 3 — verde + salva**

```bash
cd "/Users/hatholdir/Downloads/SOFTWARE FILIPPO/ua-app" && npx vitest run 2>&1 | tail -8
git add -A && git commit -m "feat(lavori): i cinque campi stampati si correggono riemettendo, non di nascosto (D308)"
```

---

