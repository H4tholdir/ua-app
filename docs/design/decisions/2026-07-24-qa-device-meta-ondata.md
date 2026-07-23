# Verbale — QA device di metà ondata (Task 15, riserva FE R8)

**Data:** 24/07/2026 (sera) · **Tester:** Francesco Formicola, Xiaomi (Android, Chrome)
**Build:** worktree `redesign-parete-home` @ `1655517` servita in rete locale (`next start :3020`)
**Esito:** ⚠️ PASS PARZIALE — gesti e meccaniche ok, fix-list su proporzioni/estetica home e regressioni.

## Checklist del piano

| Punto | Esito |
|---|---|
| Swipe pile ↔ parete con parete piena | ✅ ok |
| Drag cassetta in stanza (auto-scroll, drop) | ✅ ok — ❌ MA i suoni stacco/riaggancio NON si sentono |
| Tastiera ricerca in-home: nessun cambio stanza | ✅ ok (non riprodotto sul suo device) |
| Linguetta: appare/si ritira/apprende | ✅ ok |

## Fix-list ratificata da Francesco (ordine suo)

1. **Suoni assenti nel drag** (stacco/riaggancio non udibili su device) — investigare sblocco
   AudioContext/preload nella home embedded; i file sono i SUOI wav ratificati (`ee4da5e`).
2. **Focus ricerca — direttiva NUOVA:** su dispositivi MOBILI il focus automatico sulla barra
   di ricerca entrando nella stanza parete NON deve avvenire; da desktop è accettabile.
3. **(a) Zona bassa della home spropositata:** puntini + TastoPiù + etichetta «Nuovo lavoro»
   occupano ~30% dello schermo, comprimono le stanze (pile scrollate e parete): da ricompattare —
   la stanza deve respirare, il piede deve rimpicciolirsi.
4. **(b) Intestazione della parete sparita in stanza:** ripristinare l'intestazione della stanza
   («Le cassette» + contesto) — era stata soppressa insieme all'header di pagina (Task 12).
5. **(c) Barra grigia laterale fissa nella home** = scrollbar dello scroll interno delle pile
   (`.ua-stanza-pile-scroll`): nasconderla (scrollbar invisibile, scroll resta).
6. **(d) Impostazione pagina /cassette:** Francesco: «la pagina delle cassette è totalmente
   differente da come è adesso nella pwa come impostazione e voglio che sia mantenuta» —
   ⚠️ DA CHIARIRE l'estensione esatta (lettura proposta: proporzioni/figura delle cassette
   come l'attuale produzione — tozze, non allungate — e struttura di pagina invariata;
   rete/gancetto/targa ratificati restano). In attesa della sua conferma.
7. **(e) Clip verticale:** alcune cassette toccano/clippano il gancio della riga sottostante
   (il tile reale supera lo spazio utile della traccia 176 − zona gancio): rivedere l'accoppiata
   altezza-tile/traccia coi valori misurati, senza rompere lo snap (`hook ≡ 10 mod 44`).
8. **(f) Back sbagliato dalla scheda lavoro:** tap cassetta → scheda lavoro → indietro torna
   alla HOME invece che alla pagina/stanza cassette da cui si era partiti — violazione della
   direttiva permanente «Back = pagina precedente» (22/07): correggere la provenienza.

## Incidente di processo (fuori codice)

Un subagent revisore ha cancellato con `rm -rf` troppo largo la cartella `.playwright-mcp/` in
«SOFTWARE FILIPPO» (screenshot/istantanee di sessioni passate, mag-lug 2026, non versionati,
irrecuperabili). Nessun impatto su codice/mockup/verbali (tutti nel repo). CONTROMISURA ATTUATA
E TESTATA: hook `rm-guard` (PreToolUse su Bash) che BLOCCA cancellazioni ricorsive fuori dalle
aree temporanee, per sessione principale e subagent — commit `8b8dd40` su main + settings del
worktree e della cartella padre. Regola operativa: cancellare solo file propri, per percorso
esplicito; cancellazioni ricorsive solo su richiesta esplicita di Francesco.

## Prossimi passi

Fix 1-5, 7, 8 in lavorazione subito (subagent + review); fix 6 dopo il chiarimento.
Ri-collaudo device di Francesco sulla build corretta PRIMA di passare al Task 16.

## Addendum — Intervista post-QA (24/07 sera, decisioni ratificate)

1. **Lo swipe dalla home porta alla PAGINA /cassette vera** (non più stanza/widget): assetto
   completo della pagina (titolo, tasto menu, barra ricerca, griglia centrata, NIENTE tasto
   nuovo lavoro), con tutte le decisioni ratificate (rete P44, gancetti, targa). Il gesto
   SEGUE IL DITO (pannello fisico già montato, zero loading); al completamento si aggiorna
   solo l'indirizzo a /cassette (History API shallow) — il back del telefono torna alla home.
   La D2 originale («stanza parete embedded senza header») è SUPERATA da questa decisione.
2. **Home lato pile: NIENTE scroll** — tutto visibile a occhio, si lavora senza scrollare.
   Lo scroll interno resta solo come rete di sicurezza invisibile (scrollbar nascosta).
3. **Inviti in home: linguetta + puntini** (entrambi restano).
4. **Piede**: compatto in home; ASSENTE nel lato cassette (niente TastoPiù/etichetta lì).
