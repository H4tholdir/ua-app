# Compito 7 — Le due schermate dell'anagrafica

> **Questo è il tuo mandato completo.** I valori esatti si usano **alla lettera**.

## Vincoli globali del progetto (valgono per ogni passo)

- **Ruoli: CINQUE** — `titolare`, `tecnico`, `front_desk`, `admin_rete`, `admin_sistema`. Mai `admin` nudo.
- **RLS:** `public.current_lab_id()`, **mai** `auth.current_lab_id()`.
- **Motion:** solo da token (`src/design-system/v3/motion.ts` per v3). Mai `duration` in linea.
- **Componenti:** superficie v3 → solo da `src/components/ds/`. **Mai** mischiare v3 e v2.3 nella stessa pagina.
- **Testo:** DS v3 §2.3 — niente gergo. «cellulare», «fisso», mai «numero di telefono mobile».
- **PATCH:** sempre **allowlist esplicita**, mai blocklist.
- **Commit:** `feat(ambito): …` / `fix(ambito): …`. Mai `--no-verify` senza motivo scritto nel messaggio.
- **Dopo ogni migration:** `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` → `npx tsc --noEmit` (**FASE 6b**).
- **FASE 7 a fine ondata:** `npx tsc --noEmit` · `npx vitest run` · `npx next build`. Tutti e tre.

---


⛔ **Non iniziare senza l'approvazione del compito 6.**

**File:**
- Modifica: `src/components/features/clienti/ClienteEditSheet.tsx` (`:15`, `:83`, `:132`, `:318-335`)
- Modifica: `src/components/features/wizard/NuovoDentistaSheet.tsx` (`:44`, `:74`, `:102-111`)

**Interfacce:**
- Consuma: `CampoTesto` con `aiuto` e `inputMode` (compito 5); l'allowlist (compito 3).

- [ ] **Passo 1 — Le prove sul wizard (D184)**

```tsx
// in tests/unit/NuovoDentistaSheet.test.tsx (il file esiste già)
it('D184 — chiede ENTRAMBI i numeri', () => {
  render(<NuovoDentistaSheet aperto onChiudi={() => {}} onCreato={() => {}} />)
  expect(screen.getByLabelText('Telefono dello studio')).toBeInTheDocument()
  expect(screen.getByLabelText('Cellulare WhatsApp')).toBeInTheDocument()
})

it('D184 — sotto il cellulare e scritto a che cosa serve', () => {
  render(<NuovoDentistaSheet aperto onChiudi={() => {}} onCreato={() => {}} />)
  const input = screen.getByLabelText('Cellulare WhatsApp')
  const idAiuto = input.getAttribute('aria-describedby')
  expect(document.getElementById(idAiuto!)?.textContent).toMatch(/consegna/i)
})

// 🔑 La prova che i due campi finiscono in DUE posti diversi: senza questa,
//    due campi che scrivono nella stessa colonna passerebbero.
it('i due numeri partono in due campi distinti del corpo della richiesta', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ id: 'x' }), { status: 201 }))
  render(<NuovoDentistaSheet aperto onChiudi={() => {}} onCreato={() => {}} />)
  await userEvent.type(screen.getByLabelText('Nome'), 'Mario')
  await userEvent.type(screen.getByLabelText('Cognome'), 'Rossi')
  await userEvent.type(screen.getByLabelText('Telefono dello studio'), '02 1234567')
  await userEvent.type(screen.getByLabelText('Cellulare WhatsApp'), '333 1234567')
  await userEvent.click(screen.getByRole('button', { name: /crea dentista/i }))
  const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
  expect(body.telefono).toBe('02 1234567')
  expect(body.cellulare_whatsapp).toBe('333 1234567')
})
```

- [ ] **Passo 2 — Rosso**

```bash
npx vitest run tests/unit/NuovoDentistaSheet.test.tsx
```

Atteso: **3 fallite**. ⚠️ Prove esistenti che cercano «Cellulare/WhatsApp» diventano rosse: **è il
cambiamento voluto** — quella etichetta stava su un campo che scriveva in `telefono`.

- [ ] **Passo 3 — Il wizard, da 4 campi a 5**

```tsx
      <CampoTesto label="Nome" valore={nome} onCambia={setNome} placeholder="Mario" autoFocus />
      <CampoTesto label="Cognome" valore={cognome} onCambia={setCognome} placeholder="Rossi" />
      <CampoTesto
        label="Telefono dello studio"
        valore={telefonoStudio}
        onCambia={setTelefonoStudio}
        placeholder="02 1234567"
        inputMode="tel"
      />
      <CampoTesto
        label="Cellulare WhatsApp"
        valore={cellulare}
        onCambia={setCellulare}
        placeholder="333 1234567"
        inputMode="tel"
        aiuto="Qui arrivano i messaggi di consegna. Dev'essere un cellulare, non il fisso."
      />
      <CampoTesto label="Studio" valore={studio} onCambia={setStudio} placeholder="Studio Rossi" />
```

Gli stati (riga 44) e l'invio (riga 74):

```tsx
  const [telefonoStudio, setTelefonoStudio] = useState('')
  const [cellulare, setCellulare] = useState('')
```

```tsx
    if (telefonoStudio.trim()) body.telefono = telefonoStudio.trim()
    if (cellulare.trim()) body.cellulare_whatsapp = cellulare.trim()
```

🛑 **Entrambi restano facoltativi**: il vincolo di creazione è su nome e cognome, e questa ondata non
lo cambia.

- [ ] **Passo 3-bis — 🔴 FAR ARRIVARE IL CAMPO AL PANNELLO, o salvare lo CANCELLA**

🛑 **Aggiunto il 03/08 da un ritrovamento del compito 3.** Il pannello di modifica riceve il cliente da
una catena di **quattro** anelli, e **nessuno** nomina ancora il campo nuovo. Se resta così, il campo
nel pannello è vuoto e `ClienteEditSheet.tsx:132` salva `form.cellulare_whatsapp.trim() || null`:
**aprire il pannello per correggere l'email e premere Salva cancella il cellulare.**

**① La `select` della scheda** — `src/app/(app)/clienti/[id]/page.tsx:127-133`:

```ts
    .select(`
      id, studio_nome, nome, cognome, telefono, cellulare_whatsapp, email,
      partita_iva, codice_fiscale, codice_sdi, pec,
      indirizzo, cap, citta, provincia, paese,
      listino_numero, sconto_percentuale, modalita_pagamento,
      non_soggetto_fe, portale_token, portale_fatturazione_attiva, portale_pin_hash, note
    `)
```

**② Il tipo `ClienteDettaglio`** — stesso file, righe 15-39, subito dopo `telefono`:

```ts
  telefono: string | null
  cellulare_whatsapp: string | null
```

**③ L'oggetto passato al pannello** — stesso file, righe 258-270: accanto a `telefono: c.telefono`
aggiungi `cellulare_whatsapp: c.cellulare_whatsapp`.

**④ La `select` della GET del singolo cliente** — `src/app/api/clienti/[id]/route.ts:45-77`: aggiungi
`cellulare_whatsapp` subito dopo `telefono` nell'elenco delle colonne.

- [ ] **Passo 3-ter — La prova che il dato NON si perde**

🔑 **Questa prova vale più di quella che il campo si salva:** il caso distruttivo è **salvare senza
toccare il cellulare**.

```tsx
// in tests/unit/ClienteEditSheet.test.tsx (o il file di prova del pannello)
it('salvare senza toccare il cellulare NON lo cancella', async () => {
  const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
  render(<ClienteEditSheet aperto cliente={{ ...clienteBase, cellulare_whatsapp: '333 1234567' }} onChiudi={() => {}} />)
  await userEvent.clear(screen.getByLabelText('Email'))
  await userEvent.type(screen.getByLabelText('Email'), 'nuova@studio.it')
  await userEvent.click(screen.getByRole('button', { name: /salva/i }))
  const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)
  expect(body.cellulare_whatsapp).toBe('333 1234567')
})
```

- [ ] **Passo 4 — Il pannello di modifica**

Riga 15 (il tipo), 83 (lo stato iniziale), 132 (il salvataggio), 324-330 (i campi):

```tsx
  telefono: string | null
  cellulare_whatsapp: string | null
```

```tsx
    telefono: cliente.telefono ?? '',
    cellulare_whatsapp: cliente.cellulare_whatsapp ?? '',
```

```tsx
        telefono: form.telefono.trim() || null,
        cellulare_whatsapp: form.cellulare_whatsapp.trim() || null,
```

```tsx
                <FieldGroup label="Telefono dello studio">
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={set('telefono')}
                    placeholder="02 1234567"
                    style={inputStyle}
                  />
                </FieldGroup>
                <FieldGroup label="Cellulare WhatsApp">
                  <input
                    type="tel"
                    value={form.cellulare_whatsapp}
                    onChange={set('cellulare_whatsapp')}
                    placeholder="333 1234567"
                    style={inputStyle}
                  />
                </FieldGroup>
```

🛑 **L'esempio del telefono cambia da `+39 02 1234567` a `02 1234567`**: da D182 il prefisso lo mette
il programma, e suggerirlo insegnerebbe una regola che non serve più.
⚠️ **Questo pannello è v2.3, non v3** (usa `FieldGroup` e `inputStyle`, non `CampoTesto`): si resta su
v2.3, **mai** v3 per singolo componente. L'aiuto qui è una riga di testo con lo stile del file.

- [ ] **Passo 5 — Verde**

```bash
npx vitest run && npx tsc --noEmit
```

- [ ] **Passo 6 — Salva**

```bash
git add src/components/features/clienti/ClienteEditSheet.tsx src/components/features/wizard/NuovoDentistaSheet.tsx tests/unit/NuovoDentistaSheet.test.tsx
git commit -m "feat(clienti): P31 — le due schermate dell'anagrafica chiedono due numeri, e dicono a cosa servono"
```

---
