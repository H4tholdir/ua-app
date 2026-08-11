# Compito 3 — Le due allowlist

> **Questo è il tuo mandato completo.** I valori esatti (nomi, righe, codice) si usano **alla lettera**: sono stati verificati sul codice vero.

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


**File:**
- Modifica: `src/app/api/clienti/[id]/route.ts:16-23`
- Modifica: `src/app/api/clienti/route.ts:125`
- Crea: `tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts`

**Interfacce:**
- Consuma: la colonna del compito 1.
- Produce: `PATCHABLE_FIELDS_CLIENTE` contiene `'cellulare_whatsapp'`; il POST accetta il campo.

- [ ] **Passo 1 — La prova del VINCOLO, che è il punto (R-P1)**

Una prova che il campo si salva è metà. **Serve la prova che un campo FUORI allowlist NON si salva** —
altrimenti non si sta provando l'allowlist, si sta provando che l'oggetto passa.

```ts
// tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts
import { describe, it, expect } from 'vitest'
import { PATCHABLE_FIELDS_CLIENTE } from '@/app/api/clienti/[id]/route'

describe('allowlist PATCH cliente (P31, R-P6)', () => {
  it('contiene il campo nuovo — senza, la rotta scarta la chiave SENZA errore', () => {
    expect(PATCHABLE_FIELDS_CLIENTE).toContain('cellulare_whatsapp')
  })

  it('contiene ancora il telefono dello studio', () => {
    expect(PATCHABLE_FIELDS_CLIENTE).toContain('telefono')
  })

  // 🔑 IL VALORE CHE DEVE ESSERE RIFIUTATO — senza questa riga la prova
  //    sopra passerebbe anche con un'allowlist che accetta tutto.
  it('NON contiene un campo che non deve essere modificabile dal browser', () => {
    expect(PATCHABLE_FIELDS_CLIENTE).not.toContain('portale_token')
    expect(PATCHABLE_FIELDS_CLIENTE).not.toContain('laboratorio_id')
    expect(PATCHABLE_FIELDS_CLIENTE).not.toContain('id')
  })
})
```

- [ ] **Passo 2 — Rosso**

```bash
npx vitest run tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts
```

Atteso: **1 fallita** (`toContain('cellulare_whatsapp')`), **2 passate**. 🔑 **Che le altre due passino
già è informazione**: dicono che l'allowlist era sana prima, quindi la rossa isola il cambiamento.

- [ ] **Passo 3 — Aggiungi il campo all'allowlist**

```ts
export const PATCHABLE_FIELDS_CLIENTE = [
  'studio_nome', 'nome', 'cognome', 'telefono', 'cellulare_whatsapp', 'email',
  'partita_iva', 'codice_fiscale', 'codice_sdi', 'pec',
  'indirizzo', 'cap', 'citta', 'provincia', 'paese',
  'listino_numero', 'sconto_percentuale', 'tecnico_default_id',
  'modalita_pagamento', 'non_soggetto_fe', 'fatturare_al_paziente',
  'laboratorio_odontotecnico', 'iban', 'note',
] as const
```

- [ ] **Passo 4 — La creazione (POST)**

`src/app/api/clienti/route.ts:125`, subito dopo `telefono`:

```ts
    telefono: body.telefono ?? null,
    cellulare_whatsapp: body.cellulare_whatsapp ?? null,
```

- [ ] **Passo 5 — `CAMPI_ELENCO` NON si tocca, e la ragione va scritta**

`src/app/api/clienti/route.ts:9-17` — **si aggiunge solo un commento**, nessun campo:

```ts
/** I campi che questo ELENCO può mostrare. Vive in un posto solo perché serve
 *  due volte — per chiedere al database e per rispondere al browser — e due
 *  copie divergerebbero.
 *  🛑 `portale_token` NON è qui, e non ci torna: v. il commento in `select`.
 *  🛑 `cellulare_whatsapp` NON è qui, ed è una SCELTA (P31, spec §4.4):
 *     l'elenco mostra UN numero sotto ogni studio, ed è quello da CHIAMARE.
 *     Due numeri in una riga d'elenco sono rumore su una schermata fatta per
 *     TROVARE un cliente, non per contattarlo. Il cellulare si vede sulla
 *     scheda. Se un giorno servisse qui, questa riga è il punto da cambiare. */
```

- [ ] **Passo 6 — Verde, e la suite intera**

```bash
npx vitest run tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts && npx vitest run && npx tsc --noEmit
```

- [ ] **Passo 7 — Salva**

```bash
git add src/app/api/clienti tests/unit/clienti-cellulare-whatsapp-allowlist.test.ts
git commit -m "feat(api): P31 — il campo nuovo entra nelle allowlist, e quella dell'elenco porta la sua ragione"
```

---
