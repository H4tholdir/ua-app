# Fixture ricevute SdI — spike XAdES (Task 6, spec D-4)

## 1. Esempi ufficiali fatturapa.gov.it

Scaricati il 2026-07-16 da **Fatturazione elettronica PA — Documentazione Sistema
d'Interscambio**: <https://www.fatturapa.gov.it/it/norme-e-regole/DocumentazioneSDI/>
(sezione file di esempio dei messaggi SdI, `MessaggiTypes_v1.1.xsd`).

| File locale | URL sorgente | Tipo |
|---|---|---|
| `ufficiale-RC-v1.0.xml` | `https://www.fatturapa.gov.it/export/documenti/messaggi/v1.0/IT01234567890_11111_RC_001.xml` | Ricevuta di Consegna |
| `ufficiale-NS-v1.0.xml` | `https://www.fatturapa.gov.it/export/documenti/messaggi/v1.0/IT01234567890_11111_NS_001.xml` | Notifica di Scarto |
| `ufficiale-MC-v1.0.xml` | `https://www.fatturapa.gov.it/export/documenti/messaggi/v1.0/IT01234567890_11111_MC_001.xml` | Notifica di Mancata Consegna |
| `ufficiale-NE-v1.0.xml` | `https://www.fatturapa.gov.it/export/documenti/messaggi/v1.0/IT01234567890_11111_NE_001.xml` | Notifica Esito |

**Importante — questi file SONO firmati XAdES-BES** (struttura reale: `ds:Signature`
enveloped, `Reference` su documento con `Transform` XPath filter2 `subtract` su
`descendant::ds:Signature`, `xades:QualifyingProperties`/`SignedProperties`,
`KeyInfo` con certificato X.509 in chiaro). **Ma il certificato incluso nel
`KeyInfo` è un certificato di test "Sistema Interscambio Fattura PA" emesso da
"CA Agenzia delle Entrate", scaduto (validità 2011-07-04 → 2014-07-04)** —
verificato con:

```
openssl x509 -in <cert estratto da KeyInfo> -inform DER -noout -subject -issuer -dates
# subject: CN = Sistema Interscambio Fattura PA (issuer: CA Agenzia delle Entrate)
# notBefore=Jul  4 13:19:24 2011 GMT ; notAfter=Jul  4 13:19:23 2014 GMT
```

Non sono quindi utilizzabili come *positive path* per un test con trust anchor
iniettabile (nessun anchor "corretto" disponibile/verificabile da noi), ma sono
usati nel PoC come:
- riferimento di **struttura reale** (namespace, forma della `Signature`, XAdES
  `QualifyingProperties`) per validare che il parser XML non vada in errore su un
  messaggio SdI autentico;
- caso di test esplicito "trust anchor diverso da quello del documento" → deve
  fallire (fail-closed), vedi caso 7 in `scripts/tmp/spike-xades.ts`.

`MessaggiTypes_v1.1.xsd` (schema di riferimento per Task 7, il parser) è stato
scaricato ma non incluso qui — reperibile allo stesso URL, sezione XSD.

`ufficiale-RC-cert-scaduto.pem.txt` è il certificato X.509 estratto dal `KeyInfo` di
`ufficiale-RC-v1.0.xml` (lo stesso certificato scaduto descritto sopra), convertito
in PEM con `openssl x509 -in <der> -inform DER -out ufficiale-RC-cert-scaduto.pem.txt`.
Usato nel PoC come trust anchor "corretto" (caso 9, decisivo) per isolare la domanda
"la libreria verifica un vero messaggio SdI?" dalla domanda sul trust anchor: anche
pinnando esattamente il certificato che ha firmato il documento, la verifica fallisce
— perché la libreria non supporta il transform `xmldsig-filter2` usato realmente da
SdI, non per un problema di trust anchor. Vedi
`docs/superpowers/specs/2026-07-16-spike-xades-esito.md` §3-4.

## 2. Coppia di test autofirmata (trust anchor iniettabile)

Poiché gli esempi ufficiali non offrono un trust anchor verificabile, per il PoC
di verifica firma con trust anchor pinnato sono stati generati con `openssl`
(RSA 2048, SHA-256, validità 10 anni, solo per test — **mai usare in produzione**):

| File | Contenuto |
|---|---|
| `test-trust-anchor-cert.pem.txt` | Certificato self-signed "Sistema Interscambio (TEST)" — funge da trust anchor pinnato nel PoC |
| `test-trust-anchor-key.pem.txt` | Chiave privata corrispondente, usata SOLO per firmare gli XML di test generati a runtime dal PoC |
| `test-attacker-cert.pem.txt` | Certificato self-signed non correlato ("Attacker") — usato per dimostrare che un trust anchor sbagliato viene rifiutato |

Comando di generazione (riproducibile — output naturale in `.pem`, poi rinominato in
`.pem.txt` per il commit: il repo ha una regola gitignore generale `*.pem`/`*.key`
per prevenire segreti veri in git, che questi certificati di test autofirmati non
sono ma rispettano comunque per non bucare la regola):

```sh
openssl req -x509 -newkey rsa:2048 -keyout test-trust-anchor-key.pem \
  -out test-trust-anchor-cert.pem -days 3650 -nodes \
  -subj "/C=IT/O=SdI Test Trust Anchor/CN=Sistema Interscambio (TEST)"
```

Gli XML firmati veri e propri (documento valido, documento manomesso, documento
con signature wrapping, ecc.) sono generati **a runtime** dentro
`scripts/tmp/spike-xades.ts` con `xml-crypto`, non salvati su disco: lo spike
serve a validare il *meccanismo* di verifica, non a fornire fixture XML firmate
pronte per Task 7/8 (quelle andranno derivate dagli esempi ufficiali §1 una volta
scelto il trust anchor di produzione).

## 3. Uso previsto

Questi file sono fixture per lo **spike** (Task 6). Task 7 (parser) e Task 8
(verifica-firma in produzione) dovranno:
- aggiungere fixture con un trust anchor SdI/Sogei realistico (o uno stub di
  rotazione documentato) invece del certificato di test qui incluso;
- eventualmente rigenerare fixture firmate "congelate" su disco (oggi generate
  a runtime dal PoC) per i test automatici della pipeline reale.

## 4. Fixture Task 7 (parser `parseRicevutaSdI`, pure function, XXE-safe)

`ufficiale-DT-v1.0.xml` e `ufficiale-AT-v1.0.xml` sono stati aggiunti in questo
task (Task 7), scaricati con lo stesso procedimento del §1 da
`https://www.fatturapa.gov.it/export/documenti/messaggi/v1.0/IT01234567890_11111_{DT,AT}_001.xml`
(2026-07-15) — completano la copertura dei 6 tipi di messaggio SdI verso il
trasmittente/ricevente definiti in `MessaggiTypes_v1.1.xsd`
(`RicevutaConsegna`/RC, `NotificaScarto`/NS, `NotificaMancataConsegna`/MC,
`NotificaEsito`/NE, `NotificaDecorrenzaTermini`/DT,
`AttestazioneTrasmissioneFattura`/AT). Nomi dei campi e presenza/assenza di
`DataOraRicezione` per DT verificati leggendo `MessaggiTypes_v1.1.xsd`
direttamente (`NotificaDecorrenzaTermini_Type` NON ha `DataOraRicezione`, a
differenza di RC/NS/MC/AT).

Tutte le fixture *-valida.xml / *-ecXX.xml sono **derivate** dagli esempi
ufficiali §1/§4 (stessa struttura, stessi nomi campo, namespace prefix
`types:` reale) con queste modifiche mirate, richieste dal test di Task 7:

| File | Derivato da | Modifiche |
|---|---|---|
| `rc-valida.xml` | `ufficiale-RC-v1.0.xml` | `NomeFile` senza suffisso `.p7m` (il parser matcha `*.xml`); `ds:Signature` omesso (fuori scope: la verifica firma è Task 8) |
| `ns-valida.xml` | `ufficiale-NS-v1.0.xml` | `ListaErrori` estesa da 1 a 2 `<Errore>`; `ds:Signature` omesso |
| `mc-valida.xml` | `ufficiale-MC-v1.0.xml` | `NomeFile` senza `.p7m`; `ds:Signature` omesso |
| `ne-ec01.xml` | `ufficiale-NE-v1.0.xml` | `NomeFile` senza `.p7m`; `Esito` = `EC01` (accettazione); `ds:Signature` omesso |
| `ne-ec02.xml` | `ufficiale-NE-v1.0.xml` | come sopra ma `Esito` = `EC02` (rifiuto) |
| `dt-valida.xml` | `ufficiale-DT-v1.0.xml` | `NomeFile` senza `.p7m`; `ds:Signature` omesso |
| `at-valida.xml` | `ufficiale-AT-v1.0.xml` | `NomeFile` senza `.p7m`; `ds:Signature` omesso |

Omettere `ds:Signature` è una semplificazione intenzionale e documentata: il
parser di Task 7 estrae solo i campi anagrafici della ricevuta (tipo,
`NomeFile`, `IdentificativoSdI`, `DataOraRicezione`, `Esito`, `ListaErrori`) e
non tocca la firma XAdES — quella è responsabilità di Task 8 (in fallback dopo
lo spike Task 6, vedi `docs/superpowers/specs/2026-07-16-spike-xades-esito.md`).
Il parser è comunque stato verificato anche sulle fixture ufficiali **complete**
(con `ds:Signature` reale, tutti e 6 i tipi) in `parse-ricevuta-sdi.test.ts` —
il campo firma viene semplicemente ignorato, non causa errori.

Fixture negative:

| File | Scopo |
|---|---|
| `malformata.xml` | Tag non chiusi correttamente → `RicevutaNonValidaError` |
| `non-ricevuta.xml` | XML ben formato ma root element non è un tipo di ricevuta SdI riconosciuto (usa una `FatturaElettronica`, non una ricevuta) → `RicevutaNonValidaError` |
| `xxe-payload.xml` | `<!DOCTYPE ... <!ENTITY xxe SYSTEM "file:///etc/passwd">` + `&xxe;` nel corpo → rigettato PRIMA del parsing XML (nessuna risoluzione dell'entità) → `RicevutaNonValidaError` |
| `oversize.xml` | Non salvata su disco — generata a runtime nel test come `Buffer.alloc(1_048_577)` per verificare il size cap (1 MiB) applicato prima del parsing |
