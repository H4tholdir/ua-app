# Compito 2 — Il prefisso, in un posto solo

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
- Modifica: `src/lib/consegna/whatsapp-template.ts` (aggiunta accanto a `buildWhatsappUrl`, riga 35)
- Crea: `tests/unit/numero-per-whatsapp.test.ts`

**Interfacce:**
- Produce: `export function numeroPerWhatsapp(grezzo: string | null | undefined): string | null`
  — restituisce **solo cifre in formato internazionale**, oppure `null` se non c'è un numero usabile.

- [ ] **Passo 1 — Scrivi le prove che falliscono**

```ts
// tests/unit/numero-per-whatsapp.test.ts
import { describe, it, expect } from 'vitest'
import { numeroPerWhatsapp } from '@/lib/consegna/whatsapp-template'

describe('numeroPerWhatsapp — prepara un numero per wa.me (P31, D182)', () => {
  it('il caso normale: cellulare italiano come lo scrive chiunque', () => {
    expect(numeroPerWhatsapp('333 1234567')).toBe('393331234567')
  })

  it("rispetta il + gia' presente", () => {
    expect(numeroPerWhatsapp('+39 333 1234567')).toBe('393331234567')
  })

  it('il fisso vero in banca dati', () => {
    expect(numeroPerWhatsapp('0976 71439')).toBe('39097671439')
  })

  it('un + straniero SI RISPETTA — non si italianizza', () => {
    expect(numeroPerWhatsapp('+33 6 12 34 56 78')).toBe('33612345678')
  })

  it('la forma internazionale con 00', () => {
    expect(numeroPerWhatsapp('00 39 333 1234567')).toBe('393331234567')
  })

  // 🔑 IL CASO CHE SMONTA «comincia per 39»: 391 e' un prefisso di
  //    cellulare italiano (Wind). 10 cifre -> e' NAZIONALE.
  it("un cellulare 391… senza prefisso e' NAZIONALE, non internazionale", () => {
    expect(numeroPerWhatsapp('391 2345678')).toBe('393912345678')
  })

  // ...e il verso opposto: 11 cifre che cominciano per 39 -> gia' internazionale
  it("un fisso gia' internazionale resta intatto", () => {
    expect(numeroPerWhatsapp('39 0976 71439')).toBe('39097671439')
  })

  it.each([null, undefined, '', '   ', '---', '()'])('senza un numero usabile da null: %s', (v) => {
    expect(numeroPerWhatsapp(v as string | null | undefined)).toBeNull()
  })
})
```

- [ ] **Passo 2 — Falle girare, devono fallire**

```bash
npx vitest run tests/unit/numero-per-whatsapp.test.ts
```

Atteso: **FAIL**, `numeroPerWhatsapp is not a function`.

- [ ] **Passo 3 — R-P4: abbozzo INERTE, e CONTA quante asserzioni si accendono**

Metti un abbozzo che non fa niente:

```ts
export function numeroPerWhatsapp(_grezzo: string | null | undefined): string | null {
  return null
}
```

```bash
npx vitest run tests/unit/numero-per-whatsapp.test.ts
```

**Scrivi il numero nel rapporto:** atteso **7 su 13** si accendono (le 6 del caso `null` passano già
con l'abbozzo — e questo è il punto: **un rosso da «funzione non trovata» non prova che le prove
provino qualcosa**).

- [ ] **Passo 4 — Scrivi la funzione**

```ts
/**
 * Prepara un numero per wa.me: solo cifre, in formato internazionale.
 *
 * 🔑 PERCHE' ESISTE (P31, D182). `buildWhatsappUrl` faceva solo
 * `replace(/\D/g,'')`, e NESSUN punto del programma aggiungeva il 39:
 * un cellulare italiano scritto come lo scrive chiunque («333 1234567»)
 * produceva un link senza prefisso paese.
 *
 * 🛑 LA SOGLIA DELLE 11 CIFRE non e' arbitraria: esiste un prefisso di
 * cellulare italiano che COMINCIA per 39 (391…, Wind), quindi
 * «comincia per 39» non basta a dire «e' gia' internazionale».
 * I numeri nazionali italiani non superano le 10 cifre, e i fissi
 * cominciano per 0, mai per 39.
 *
 * 🛑 COSA NON FA: non valida che il numero sia raggiungibile, non
 * distingue fisso da cellulare, non rifiuta niente. Prepara una stringa.
 * ⚠️ Un numero STRANIERO scritto SENZA il «+» viene trattato da
 * italiano: limitazione dichiarata (in banca dati non ci sono clienti
 * stranieri), e la strada e' chiedere il «+», non indovinare.
 */
export function numeroPerWhatsapp(grezzo: string | null | undefined): string | null {
  if (!grezzo) return null
  const conPiu = grezzo.trim().startsWith('+')
  const cifre = grezzo.replace(/\D/g, '')
  if (!cifre) return null

  if (conPiu) return cifre                                  // il paese e' dichiarato: si rispetta
  if (cifre.startsWith('00')) return cifre.slice(2)          // forma internazionale con 00
  if (cifre.startsWith('39') && cifre.length >= 11) return cifre  // gia' internazionale
  return `39${cifre}`                                        // nazionale italiano
}
```

- [ ] **Passo 5 — Verde**

```bash
npx vitest run tests/unit/numero-per-whatsapp.test.ts
```

Atteso: **13 passed**.

- [ ] **Passo 6 — `buildWhatsappUrl` usa la funzione nuova**

```ts
export function buildWhatsappUrl(message: string, phone?: string): string {
  const encoded = encodeURIComponent(message)
  const numero = numeroPerWhatsapp(phone)
  return numero ? `https://wa.me/${numero}?text=${encoded}` : `https://wa.me/?text=${encoded}`
}
```

🔑 **Si corregge ALLA FONTE**, non nei cinque chiamanti — è la forma della correzione di **P11**.

- [ ] **Passo 7 — Tutta la suite, non solo il file nuovo**

```bash
npx vitest run
```

⚠️ **Prove esistenti su `buildWhatsappUrl` possono diventare rosse**, ed è **atteso**: pretendevano il
numero senza prefisso. 🛑 **Prima di cambiarne una, leggila:** se afferma «il link contiene il numero
com'era scritto», stava **fotografando** il comportamento vecchio (lezione ④ della notte). Aggiornala
al comportamento voluto e **scrivi nel commit quante ne hai toccate**.

- [ ] **Passo 8 — Salva**

```bash
git add src/lib/consegna/whatsapp-template.ts tests/unit/numero-per-whatsapp.test.ts
git commit -m "feat(whatsapp): P31 — il prefisso internazionale lo mette UA', in un posto solo"
```

---
