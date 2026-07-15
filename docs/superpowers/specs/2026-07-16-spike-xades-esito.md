# Spike XAdES — esito (Task 6, spec D-4)

> **Data:** 2026-07-16 · **Owner:** Francesco Formicola · **Percorso:** Riconciliazioni R1b (fatture)
> **Spec:** `docs/superpowers/specs/2026-07-15-riconciliazioni-ricevute-pec-design.md` §D-4/§4.2
> **Timebox:** ~35 minuti stimati, ~70 effettivi (il primo esito "promettente" con
> `xml-crypto" non reggeva a un test più stringente — vedi §3, caso 9 — e la verifica
> di quel dubbio ha richiesto tempo extra, comunque contenuto rispetto a un'implementazione
> completa).
> 🛑 **Esito da presentare a Francesco prima di procedere ai Task 7-8.**

---

## Sintesi

**FALLBACK dichiarato (D-4): `verificaFirma` ritorna sempre `fallita`. Tutte le
ricevute SdI restano in quarantena; le transizioni di stato avvengono SOLO via
override manuale del `titolare`.** La pipeline resta comunque completa e sicura
(nessun bypass, nessun default a `valida`): parsing ricevute (Task 7) e matching
possono procedere invariati, semplicemente ogni evento resta "in attesa di conferma
manuale" invece di applicarsi in automatico.

**Motivo, in una frase:** i messaggi SdI reali sono firmati con il transform XML-DSig
`http://www.w3.org/2002/06/xmldsig-filter2` (XPath Filter 2.0, `Filter="subtract"`),
che **né `xml-crypto` né `xadesjs`/`xmldsigjs` implementano** — verificato leggendo i
sorgenti di entrambe le librerie (nessuna registra un transform per quell'URI) — e un
tentativo di transform custom minimale scritto per colmare il gap **non riproduce il
digest atteso** sull'esempio ufficiale SdI (caso 9 del PoC, la prova decisiva).
Implementare correttamente la semantica "subtract" di XPath Filter 2.0 (che opera su
node-set, non su sottoalberi DOM) richiede lavoro non banale, fuori scope per questo
spike timeboxed.

**Nota importante — cosa questo spike NON dimostra**: non dimostra che sia
impossibile in assoluto verificare XAdES-BES di SdI in Node. Dimostra che le due
librerie candidate valutate non lo fanno out-of-the-box, e che il gap preciso è
circoscritto (un transform, non l'intero XML-DSig). È un'informazione azionabile per
chi riprenderà il problema in Task 8 (vedi §6).

---

## 1. Fixture procurate

### 1.1 Esempi ufficiali fatturapa.gov.it

Scaricati da **Documentazione Sistema d'Interscambio**
(`https://www.fatturapa.gov.it/it/norme-e-regole/DocumentazioneSDI/`), sezione file di
esempio dei messaggi v1.0: RC, NS, MC, NE. Salvati in
`tests/fixtures/ricevute-sdi/ufficiale-{RC,NS,MC,NE}-v1.0.xml` (dettaglio URL e
provenienza in `tests/fixtures/ricevute-sdi/README.md`).

Questi esempi **sono realmente firmati XAdES-BES** (struttura enveloped completa:
`ds:Signature`, tre `Reference` — documento whole-document `URI=""`,
`SignedProperties`, `KeyInfo` — `xades:QualifyingProperties`). Il certificato nel
`KeyInfo` è un certificato di **test** "Sistema Interscambio Fattura PA" (CA: "CA
Agenzia delle Entrate"), **scaduto** (2011-07-04 → 2014-07-04, verificato con
`openssl x509 -noout -dates`) — non un trust anchor di produzione. È stato comunque
estratto in `ufficiale-RC-cert-scaduto.pem.txt` e usato come trust anchor "corretto" nel
test decisivo (§3, caso 9): pinnare esattamente il certificato firmante isola la
domanda "la libreria processa un vero messaggio SdI?" da qualunque dubbio sul trust
anchor.

**Rilevanza dell'anno del certificato**: l'esempio è vecchio (2011-2014), ma è
**quello attualmente pubblicato** sul sito ufficiale (scaricato oggi, 2026-07-16) come
riferimento della struttura dei messaggi SdI — non c'è evidenza che la convenzione di
firma (in particolare l'uso di `xmldsig-filter2`) sia cambiata nelle versioni più
recenti delle specifiche tecniche SdI (v1.8.1 attuale). Da riconfermare con un esempio
più recente/reale in Task 8, se disponibile.

### 1.2 Coppia di test autofirmata (trust anchor iniettabile)

Generata con `openssl` (RSA 2048, SHA-256, self-signed, solo per test):
`tests/fixtures/ricevute-sdi/test-trust-anchor-{cert,key}.pem.txt` +
`test-attacker-cert.pem.txt` (certificato non correlato, per il test di pinning; estensione
`.pem.txt` invece di `.pem`/`.key` per rispettare la regola gitignore repo-wide
`*.pem`/`*.key` — vedi `tests/fixtures/ricevute-sdi/README.md`). Usata
per dimostrare che il *meccanismo* di verifica (pinning, fail-closed, anti-wrapping)
funziona correttamente quando il transform usato è quello standard
(`enveloped-signature`, supportato nativamente) — vedi §2.

---

## 2. Cosa FUNZIONA (il meccanismo, isolato dal problema del transform)

Con un XML-DSig enveloped "da manuale" (transform `enveloped-signature`, quello che
si ottiene di default componendo una firma con `xml-crypto` stesso), tutti i requisiti
D-4 sono soddisfatti e verificati empiricamente nel PoC (`scripts/tmp/spike-xades.ts`,
casi 1-6 e 8):

| Requisito D-4 | Evidenza |
|---|---|
| Trust anchor pinnato (mai truststore di sistema) | `new SignedXml({ publicCert: trustAnchorPem })` senza passare `getCertFromKeyInfo`: resta `noop` di default (`node_modules/xml-crypto/lib/signed-xml.js:112`), quindi `checkSignature` usa solo `publicCert` (riga 242). **Verificato empiricamente, non solo per lettura del sorgente**: caso 2 del PoC firma con il trust anchor corretto ma verifica con un certificato diverso → rifiutato, pur avendo il documento un `KeyInfo` "valido" al suo interno. |
| Qualsiasi errore → `fallita` | `try { ... } catch { return false }` totale. Nessun ramo ritorna `true` di default — confermato anche dal caso 9 (eccezione "canonicalization algorithm not supported" → catturata → `false`, non propagata, non bypassata). |
| Difesa signature wrapping | Doppia guardia: esattamente un `ds:Signature` nel documento; la `Reference` documento deve avere `URI=""` (whole-document). Caso 8: firma crittograficamente **valida** ma con `Reference` per ID invece che whole-document → **rifiutata comunque** dalla policy, indipendentemente dalla sua validità crittografica. |

Questa parte dello spike è un risultato solido e riusabile: se/quando il gap del
transform (§3-4) verrà chiuso, il resto del meccanismo non va ripensato.

---

## 3. Il gap che ha determinato il fallback — output PoC reale

File: `scripts/tmp/spike-xades.ts`, eseguito con `npx tsx scripts/tmp/spike-xades.ts`:

```
=== Spike XAdES — risultati PoC (xml-crypto) ===

[OK] 1. firma valida + trust anchor corretto — atteso=true ottenuto=true
[OK] 2. firma valida ma trust anchor sbagliato (pinning) — atteso=false ottenuto=false
[OK] 3. contenuto manomesso dopo la firma — atteso=false ottenuto=false
[OK] 4. signature wrapping (radice avvolta da elemento estraneo) — atteso=false ottenuto=false
[OK] 5. XML malformato/troncato (fail-closed su eccezione) — atteso=false ottenuto=false
[OK] 6. XML senza firma — atteso=false ottenuto=false
[OK] 7. esempio ufficiale fatturapa.gov.it (trust anchor diverso) — atteso=false ottenuto=false
[OK] 8. firma valida ma Reference per ID invece di whole-document (rifiutata da policy anti-wrapping) — atteso=false ottenuto=false
[OK] 9. DECISIVO: esempio ufficiale + trust anchor = il SUO stesso certificato firmante (transform xmldsig-filter2 non supportato) — atteso=false ottenuto=false

Esito complessivo: TUTTI I CASI COME ATTESO
```

**Caso 9 è quello decisivo.** A differenza del caso 7 (trust anchor volutamente
sbagliato — un fallimento "atteso e banale"), nel caso 9 il trust anchor è **esatto**
(il certificato reale che ha firmato quel documento, estratto dal suo stesso
`KeyInfo`). Se `xml-crypto` gestisse correttamente il transform usato da SdI, questo
caso dovrebbe risultare `true`. Risulta invece `false`, e ispezionando l'eccezione
sottostante (non mostrata nell'output riassuntivo, catturata da `verificaFirmaXml`,
ma riprodotta isolatamente durante lo spike):

```
checkSignature THREW: canonicalization algorithm
'http://www.w3.org/2002/06/xmldsig-filter2' is not supported
```

Confermato leggendo `node_modules/xml-crypto/lib/signed-xml.js` (`CanonicalizationAlgorithms`
di default: `c14n`, `c14n#WithComments`, `exc-c14n#`, `exc-c14n#WithComments`,
`enveloped-signature` — nessun `filter2`).

**Tentativo di colmare il gap** (documentato per chi riprenderà il problema, non
incluso nel PoC finale): registrare un transform custom su
`sig.CanonicalizationAlgorithms['http://www.w3.org/2002/06/xmldsig-filter2']` che
rimuove dal DOM clonato i nodi `ds:Signature` discendenti (stessa logica di
`EnvelopedSignature`, dopo aver validato che l'espressione XPath dichiarata nel
documento sia esattamente `/descendant::ds:Signature` con `Filter="subtract"` e
prefisso `ds` risolto al namespace XML-DSig — validazione fatta con successo).
**Anche con questa patch, il digest calcolato non combacia con quello atteso**
(`ds:Reference[@Id='reference-document']/ds:DigestValue`). Ipotesi più probabile: la
vera semantica "subtract" di XPath Filter 2.0 opera sul **node-set** (l'espressione
`/descendant::ds:Signature` seleziona solo i nodi elemento `Signature`, non
necessariamente l'intero sottoalbero nella stessa forma in cui la rimozione DOM lo
produce) seguita da una canonicalizzazione Canonical-XML *del node-set risultante*
— un procedimento diverso, e più delicato, della manipolazione dell'albero DOM seguita
da serializzazione. Non risolto entro il timebox.

`xadesjs`/`xmldsigjs` (secondo candidato, valutato via lettura sorgenti —
`node_modules/xmldsigjs/build/cjs/xml/transform.registry.js`) registra solo `Base64`,
`C14N`, `C14NWithComments`, `EnvelopedSignature`, `ExcC14N`, `ExcC14NWithComments`.
Esiste una classe `XmlDsigXPathTransform` (`xml/transforms/xpath.js`) ma implementa
**XPath Filter 1.0** (`http://www.w3.org/TR/1999/REC-xpath-19991116`, semantica
diversa) e **non è nemmeno registrata di default** nel transform registry. Nessun
supporto a `xmldsig-filter2` in nessuna delle due librerie.

---

## 4. Perché il fallback, non un terzo tentativo

- Il brief chiedeva di valutare in ordine `xml-crypto` poi `xadesjs`: fatto, nessuna
  delle due copre lo scenario reale.
- Implementare da zero la semantica esatta di XPath Filter 2.0 "subtract" a livello
  di node-set (non di sottoalbero DOM) è un lavoro di canonicalizzazione XML
  specialistico — esattamente il tipo di codice dove un bug silenzioso è pericoloso
  (potrebbe validare digest sbagliati o, peggio, essere aggirabile). Non è
  ragionevole scriverlo "a spanne" dentro un timebox di spike per un componente che
  D-4 vuole fail-closed by design.
- Il fallback è esplicitamente prima previsto dal brief come esito legittimo, non un
  fallimento dello spike: la pipeline (Task 7 parsing/matching) non è bloccata, solo
  le transizioni automatiche restano sospese fino a override titolare.

---

## 5. Limiti noti / cose scoperte utili per Task 7-8

1. **`@xmldom/xmldom` è un parser permissivo, non sempre fail-fast** su XML
   troncato/malformato: logga warning/error su console e prova un recupero parziale
   del DOM invece di lanciare sempre un'eccezione pulita. Nel PoC il fail-closed
   funziona comunque (passa attraverso il fallimento a valle della verifica
   strutturale/crittografica), ma **Task 7 non deve affidarsi solo a verifica-firma**
   per respingere XML strutturalmente anomalo — la validazione contro
   `MessaggiTypes_v1.1.xsd` (già prevista in spec) resta necessaria in ogni caso.
2. **Nessun rischio XXE aggiuntivo da `@xmldom/xmldom`**: verificato che non risolve
   entità esterne per default (`<!ENTITY xxe SYSTEM "file:///etc/passwd">` produce
   `entity not found`, non il contenuto del file). Il parser applicativo di Task 7
   deve comunque disabilitare esplicitamente DTD/`processEntities` per difesa in
   profondità, come già previsto in spec.
3. **Il gap è isolato e noto**: solo il transform `xmldsig-filter2` sulla reference
   whole-document. Le reference `SignedProperties` e `KeyInfo` dell'esempio ufficiale
   (canonicalizzate con semplice C14N, non filter2) **validano correttamente** nel
   PoC (verificato isolatamente durante lo spike, non incluso nell'output finale per
   restare nello scope dei 9 casi documentati) — rafforza l'ipotesi che il problema
   sia specificamente nella semantica del transform, non in tutta la libreria.
4. **Trust anchor di produzione non ancora disponibile** (indipendente dal fallback):
   il certificato SdI/Sogei reale da pinnare, con procedura di rotazione documentata
   (D-4), resta da reperire da fonte ufficiale/assistenza SdI.

---

## 6. Prossimi passi

- **Task 7 (parser ricevute):** procede invariato. Nessun impatto — il parsing non
  dipende dalla verifica firma.
- **Task 8 (verifica-firma):** con il fallback attivo, l'implementazione minima è
  `verificaFirma() → 'fallita'` sempre, con audit trail e messaggistica UI chiara
  ("firma non verificata — contenuto potenzialmente contraffatto", già previsto in
  §4.4 della design spec per la quarantena). **Rivalutare la verifica reale è un
  lavoro separato**, non timeboxed come spike, che dovrebbe:
  - o implementare correttamente XPath Filter 2.0 "subtract" a livello di node-set
    (possibile ma richiede test approfonditi contro più esempi reali, non solo uno);
  - o cercare una terza libreria/servizio che supporti nativamente `xmldsig-filter2`
    (es. verificare se esistono binding Node per librerie Java/.NET mature su XAdES,
    a costo di una dipendenza più pesante o di un sidecar — da valutare se vale la
    complessità operativa rispetto al fallback permanente);
  - o, se SdI in produzione firma diversamente da questo esempio (§1.1, nota sulla
    rilevanza dell'anno), riconfermare con un esempio più recente prima di investire
    ulteriore lavoro sul filter2.
- Il meccanismo di pinning/fail-closed/anti-wrapping (§2) resta valido e riusabile
  indipendentemente da quale libreria/implementazione risolverà il gap del transform.
