# Sessione attiva — punto di ripresa

🚪 **PUNTO DI RIPRESA — leggi prima questo:**
`docs/roadmap/2026-08-06-tinte-in-produzione-e-ondata-intervento-handoff.md` — **la §0 per prima**.

**Stato (06/08/2026, 11:45):** **`main` PUBBLICATO** (`affec7ae..1a2d1fc9`, 22 salvataggi), albero pulito,
**0 avanti a `origin/main`**. Le **tinte sono in produzione**. ⚠️ La CI era **in corso** alla chiusura
(run `31090252774`): **va verificata** con `gh run view 31090252774`, e poi il sito.

🔴 **La §0 in una frase — sei cose non fatte:** il **messaggio della riga bloccata** va in produzione
**senza spiegazione**, e **per scelta** (D261: dipende dall'ondata nuova) · il **gate L2 arretrato del
wizard** · **cinque ⚠️ deferiti** dal gate, di cui uno è una **decisione** (la route `/lavori/[id]/modifica`
monta **due design system insieme** → ondata di migrazione) · **D253 sul colore** sospesa fino a D254 ·
igiene invariata (**32 rami**, `.superpowers/sdd/` con 42 file) · i soliti di §0⑥.

✅ **Fatto oggi:** **D260** (rilievo chiuso su entrambi i gemelli) · **collaudo a schermo**, il primo mai
fatto, 4 su 4, col ramo **D117 acceso per la prima volta** · **gate L2** con **due difetti veri** chiusi
(un campo **irraggiungibile**; le righe a 43,5 invece di 44) · **T9** · **merge e push** ·
**D261-D262-D263**.

🆕 **IL LAVORO NUOVO — l'ondata «SI DEVE SEMPRE POTER INTERVENIRE» (D262+D263), da aprire CON PANEL.**
Si riapre il lavoro **dichiarando il motivo**, e **il motivo sceglie l'iter**. Materiale già scritto: la
**centosettesima tornata** del verbale, coi **sette casi**. 🛑 Primo nodo: il confine fra «difetto visto
dal laboratorio **prima** dell'applicazione» (rilavorazione) e «segnalato dal medico **dopo**» (reclamo, e
se c'è rischio **vigilanza Art. 87**). 🔴 E la finestra dei 10 minuti è un **residuo** di un'architettura
mai eseguita: `provato:` 0 insert su fatture in `orchestrate.ts`.

📌 **Misurato in chiusura:** `verify:full` **uscita 0** · **5069 passate | 19 saltate** (429 file).
📎 263 decisioni in centosette tornate; la prossima è **D264**.
